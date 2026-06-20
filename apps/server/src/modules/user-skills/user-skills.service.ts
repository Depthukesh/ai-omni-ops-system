import { Injectable, InternalServerErrorException, NotFoundException } from "@nestjs/common";
import { createId, database, type PromptTemplateRecord, type SkillConfigRecord } from "../../common/mock-data";
import { resolvePromptFallbackContent } from "../../common/prompt-fallbacks";
import { PrismaService } from "../../prisma/prisma.service";
import { ApiProvidersService } from "../admin/api-providers.service";
import { SkillsPromptsService } from "../admin/skills-prompts.service";
import type { RequestAuthContext } from "../auth/auth.service";

export type UserSkillPromptRecord = {
  id: string;
  isCustomized: boolean;
  basePrompt: PromptTemplateRecord;
  effectivePrompt: PromptTemplateRecord;
};

export type UserSkillRecord = {
  id: string;
  brandId?: string;
  isCustomized: boolean;
  lastResetAt?: string;
  baseSkill: SkillConfigRecord;
  effectiveSkill: SkillConfigRecord & {
    name: string;
  };
  prompts: UserSkillPromptRecord[];
};

export type UserSkillEditorModelOption = {
  value: string;
  label: string;
  modelName: string;
  providerId: string;
  providerName: string;
};

export type UserSkillEditorOptions = {
  modelOptions: UserSkillEditorModelOption[];
};

export type UpdateUserSkillPayload = {
  displayName?: string | null;
  defaultModel?: string | null;
  description?: string | null;
  promptOverrides?: Array<{
    promptId: string;
    content?: string | null;
    modelName?: string | null;
    temperature?: number | null;
    maxTokens?: number | null;
  }>;
};

type BrandSkillProfileRow = {
  id: string;
  brandId: string;
  baseSkillId: string;
  displayName?: string | null;
  defaultModel?: string | null;
  description?: string | null;
  lastResetAt?: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
};

type BrandPromptOverrideRow = {
  id: string;
  brandId: string;
  baseSkillId: string;
  basePromptId: string;
  content?: string | null;
  modelName?: string | null;
  temperature?: number | null;
  maxTokens?: number | null;
  createdAt: Date | string;
  updatedAt: Date | string;
};

type BrandSkillResetLogRow = {
  id: string;
  brandId: string;
  baseSkillId: string;
  resetType: string;
  promptIdsJson?: unknown;
  createdAt: Date | string;
};

const LEGACY_IMAGE_GENERATION_DEFAULT_MODEL = "provider_runtime_image_generation::gpt-image-2";
const RIGHT_CODES_IMAGE_GENERATION_DEFAULT_MODEL = "provider_runtime_image_generation_right_codes::gpt-image-2";
const LEGACY_VIDEO_NOTE_DEFAULT_MODEL = "seedance";
const VOLCENGINE_VIDEO_NOTE_DEFAULT_MODEL = "doubao-seedance-2-0-260128";
const OPPORTUNITY_INSIGHT_PROMPT_IDS = new Set([
  "prompt_opportunity_insight_brand_account",
  "prompt_opportunity_insight_competitor_account",
  "prompt_opportunity_insight_comment",
  "prompt_opportunity_insight_final_report",
]);

type MockBrandSkillProfileRecord = {
  id: string;
  brandId: string;
  baseSkillId: string;
  displayName?: string;
  defaultModel?: string;
  description?: string;
  lastResetAt?: string;
  createdAt: string;
  updatedAt: string;
};

type MockBrandPromptOverrideRecord = {
  id: string;
  brandId: string;
  baseSkillId: string;
  basePromptId: string;
  content?: string;
  modelName?: string;
  temperature?: number;
  maxTokens?: number;
  createdAt: string;
  updatedAt: string;
};

type MockBrandSkillResetLogRecord = {
  id: string;
  brandId: string;
  baseSkillId: string;
  resetType: string;
  promptIds: string[];
  createdAt: string;
};

const mockBrandSkillProfiles: MockBrandSkillProfileRecord[] = [];
const mockBrandPromptOverrides: MockBrandPromptOverrideRecord[] = [];
const mockBrandSkillResetLogs: MockBrandSkillResetLogRecord[] = [];

@Injectable()
export class UserSkillsService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly skillsPromptsService: SkillsPromptsService,
    private readonly apiProvidersService: ApiProvidersService,
  ) {}

  async getEditorOptions() {
    const activeProviders = await this.apiProvidersService.listActiveProviders();
    const modelOptions = activeProviders.flatMap((item) => {
      const models = Array.from(
        new Set([item.defaultModel, ...item.modelWhitelist].map((modelName) => String(modelName || "").trim()).filter(Boolean)),
      );
      return models.map((modelName) => ({
        value: this.buildScopedModelValue(item.id, modelName),
        label: `${modelName} · ${item.name}`,
        modelName,
        providerId: item.id,
        providerName: item.name,
      }));
    });
    return {
      modelOptions: modelOptions.sort((a, b) => a.label.localeCompare(b.label, "zh-CN")),
    };
  }

  private buildScopedModelValue(providerId: string, modelName: string) {
    return `${providerId}::${modelName}`;
  }

  async listUserSkills(auth: RequestAuthContext) {
    const context = this.assertBrandContext(auth);
    const baseSkills = await this.skillsPromptsService.listSkills();
    const basePrompts = await this.skillsPromptsService.listPrompts();
    const profiles = await this.listSkillProfiles(context.brandId);
    const promptOverrides = await this.listPromptOverrides(context.brandId);
    const resetLogs = await this.listResetLogs(context.brandId);

    return baseSkills
      .map((skill) => this.buildUserSkillRecord(skill, basePrompts, profiles, promptOverrides, resetLogs))
      .sort((a, b) => {
        if (a.effectiveSkill.category !== b.effectiveSkill.category) {
          return a.effectiveSkill.category.localeCompare(b.effectiveSkill.category, "zh-CN");
        }
        return a.effectiveSkill.name.localeCompare(b.effectiveSkill.name, "zh-CN");
      });
  }

  async getUserSkill(skillId: string, auth: RequestAuthContext) {
    const skills = await this.listUserSkills(auth);
    const skill = skills.find((item) => item.id === skillId);
    if (!skill) {
      throw new NotFoundException("技能不存在");
    }
    return skill;
  }

  async updateUserSkill(skillId: string, payload: UpdateUserSkillPayload, auth: RequestAuthContext) {
    const context = this.assertBrandContext(auth);
    const baseSkills = await this.skillsPromptsService.listSkills();
    const basePrompts = await this.skillsPromptsService.listPrompts();
    const modelSelectionResolver = await this.createModelSelectionResolver();
    const baseSkill = baseSkills.find((item) => item.id === skillId);
    if (!baseSkill) {
      throw new NotFoundException("技能不存在");
    }

    const allowedPromptIds = new Set(this.skillsPromptsService.resolvePromptIdsForSkill(baseSkill, basePrompts));
    const requestedPromptOverrides = payload.promptOverrides || [];
    requestedPromptOverrides.forEach((item) => {
      if (!allowedPromptIds.has(item.promptId)) {
        throw new NotFoundException("技能关联提示词不存在");
      }
    });

    if (await this.prismaService.canUseDatabase()) {
      await this.ensureBrandSkillTablesReady();
      const relatedBasePrompts = basePrompts.filter((item) => allowedPromptIds.has(item.id));
      try {
        await this.persistBrandSkillOverrides(skillId, payload, requestedPromptOverrides, context, modelSelectionResolver);
      } catch (firstError) {
        await this.ensureRegistryEntriesForSkill(baseSkill, relatedBasePrompts);
        try {
          await this.persistBrandSkillOverrides(skillId, payload, requestedPromptOverrides, context, modelSelectionResolver);
        } catch (secondError) {
          throw new InternalServerErrorException(this.describeBrandSkillSaveError(secondError));
        }
      }
    } else {
      const now = new Date().toISOString();
      const existingProfile = mockBrandSkillProfiles.find(
        (item) =>
          item.brandId === context.brandId
          && item.baseSkillId === skillId,
      );
      const hasSkillOverridePayload = hasAnyDefinedValue([
        payload.displayName,
        payload.defaultModel,
        payload.description,
      ]);
      if (hasSkillOverridePayload) {
        const normalizedProfileData = {
          displayName: normalizeOptionalText(payload.displayName) ?? undefined,
          defaultModel: this.normalizeModelSelectionValue(payload.defaultModel, modelSelectionResolver) ?? undefined,
          description: normalizeOptionalText(payload.description) ?? undefined,
        };
        const hasEffectiveSkillOverride = Object.values(normalizedProfileData).some((value) => value !== undefined);
        if (existingProfile && !hasEffectiveSkillOverride) {
          mockBrandSkillProfiles.splice(mockBrandSkillProfiles.indexOf(existingProfile), 1);
        } else if (existingProfile) {
          existingProfile.displayName = normalizeOptionalText(payload.displayName) ?? undefined;
          existingProfile.defaultModel = this.normalizeModelSelectionValue(payload.defaultModel, modelSelectionResolver) ?? undefined;
          existingProfile.description = normalizeOptionalText(payload.description) ?? undefined;
          existingProfile.updatedAt = now;
        } else if (hasEffectiveSkillOverride) {
          mockBrandSkillProfiles.push({
            id: createId("usp"),
            brandId: context.brandId,
            baseSkillId: skillId,
            displayName: normalizeOptionalText(payload.displayName) ?? undefined,
            defaultModel: this.normalizeModelSelectionValue(payload.defaultModel, modelSelectionResolver) ?? undefined,
            description: normalizeOptionalText(payload.description) ?? undefined,
            createdAt: now,
            updatedAt: now,
          });
        }
      }

      for (const promptOverride of requestedPromptOverrides) {
        const existingOverride = mockBrandPromptOverrides.find(
          (item) =>
            item.brandId === context.brandId
            && item.basePromptId === promptOverride.promptId,
        );
        const normalizedOverrideData = {
          content: normalizeOptionalText(promptOverride.content) ?? undefined,
          modelName: this.normalizeModelSelectionValue(promptOverride.modelName, modelSelectionResolver) ?? undefined,
          temperature: normalizeOptionalNumber(promptOverride.temperature) ?? undefined,
          maxTokens: normalizeOptionalInt(promptOverride.maxTokens) ?? undefined,
        };
        const hasEffectivePromptOverride = Object.values(normalizedOverrideData).some((value) => value !== undefined);
        if (existingOverride && !hasEffectivePromptOverride) {
          mockBrandPromptOverrides.splice(mockBrandPromptOverrides.indexOf(existingOverride), 1);
          continue;
        }
        if (existingOverride) {
          existingOverride.baseSkillId = skillId;
          existingOverride.content = normalizedOverrideData.content;
          existingOverride.modelName = normalizedOverrideData.modelName;
          existingOverride.temperature = normalizedOverrideData.temperature;
          existingOverride.maxTokens = normalizedOverrideData.maxTokens;
          existingOverride.updatedAt = now;
        } else if (hasEffectivePromptOverride) {
          mockBrandPromptOverrides.push({
            id: createId("upo"),
            brandId: context.brandId,
            baseSkillId: skillId,
            basePromptId: promptOverride.promptId,
            content: normalizedOverrideData.content,
            modelName: normalizedOverrideData.modelName,
            temperature: normalizedOverrideData.temperature,
            maxTokens: normalizedOverrideData.maxTokens,
            createdAt: now,
            updatedAt: now,
          });
        }
      }
    }

    return this.getUserSkill(skillId, auth);
  }

  private async persistBrandSkillOverrides(
    skillId: string,
    payload: UpdateUserSkillPayload,
    requestedPromptOverrides: NonNullable<UpdateUserSkillPayload["promptOverrides"]>,
    context: {
      brandId: string;
    },
    modelSelectionResolver: {
      optionValueSet: Set<string>;
      labelToValueMap: Map<string, string>;
    },
  ) {
    const hasSkillOverridePayload = hasAnyDefinedValue([
      payload.displayName,
      payload.defaultModel,
      payload.description,
    ]);

    if (hasSkillOverridePayload) {
      const normalizedProfileData = {
        displayName: toSqlNullable(normalizeOptionalText(payload.displayName)),
        defaultModel: toSqlNullable(this.normalizeModelSelectionValue(payload.defaultModel, modelSelectionResolver)),
        description: toSqlNullable(normalizeOptionalText(payload.description)),
      };
      const hasEffectiveSkillOverride = Object.values(normalizedProfileData).some((value) => value !== null);

      await this.prismaService.$executeRaw`
        DELETE FROM "BrandSkillProfile"
        WHERE "brandId" = ${context.brandId}
          AND "baseSkillId" = ${skillId}
      `;

      if (hasEffectiveSkillOverride) {
        await this.prismaService.$executeRaw`
          INSERT INTO "BrandSkillProfile" (
            "id",
            "brandId",
            "baseSkillId",
            "displayName",
            "defaultModel",
            "description",
            "createdAt",
            "updatedAt"
          )
          VALUES (
            ${createId("usp")},
            ${context.brandId},
            ${skillId},
            ${normalizedProfileData.displayName},
            ${normalizedProfileData.defaultModel},
            ${normalizedProfileData.description},
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP
          )
        `;
      }
    }

    for (const promptOverride of requestedPromptOverrides) {
      const normalizedOverrideData = {
        baseSkillId: skillId,
        content: toSqlNullable(normalizeOptionalText(promptOverride.content)),
        modelName: toSqlNullable(this.normalizeModelSelectionValue(promptOverride.modelName, modelSelectionResolver)),
        temperature: toSqlNullable(normalizeOptionalNumber(promptOverride.temperature)),
        maxTokens: toSqlNullable(normalizeOptionalInt(promptOverride.maxTokens)),
      };
      const hasEffectivePromptOverride = Object.entries(normalizedOverrideData)
        .some(([key, value]) => key !== "baseSkillId" && value !== null && value !== undefined);

      await this.prismaService.$executeRaw`
        DELETE FROM "BrandPromptOverride"
        WHERE "brandId" = ${context.brandId}
          AND "basePromptId" = ${promptOverride.promptId}
      `;

      if (hasEffectivePromptOverride) {
        await this.prismaService.$executeRaw`
          INSERT INTO "BrandPromptOverride" (
            "id",
            "brandId",
            "baseSkillId",
            "basePromptId",
            "content",
            "modelName",
            "temperature",
            "maxTokens",
            "createdAt",
            "updatedAt"
          )
          VALUES (
            ${createId("upo")},
            ${context.brandId},
            ${normalizedOverrideData.baseSkillId},
            ${promptOverride.promptId},
            ${normalizedOverrideData.content},
            ${normalizedOverrideData.modelName},
            ${normalizedOverrideData.temperature},
            ${normalizedOverrideData.maxTokens},
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP
          )
        `;
      }
    }
  }

  private async createModelSelectionResolver() {
    const activeProviders = await this.apiProvidersService.listActiveProviders();
    const optionValueSet = new Set<string>();
    const labelToValueMap = new Map<string, string>();
    for (const provider of activeProviders) {
      const providerModels = Array.from(
        new Set([provider.defaultModel, ...provider.modelWhitelist].map((item) => String(item || "").trim()).filter(Boolean)),
      );
      for (const modelName of providerModels) {
        const value = this.buildScopedModelValue(provider.id, modelName);
        optionValueSet.add(value);
        labelToValueMap.set(`${modelName} · ${provider.name}`, value);
      }
    }
    return {
      optionValueSet,
      labelToValueMap,
    };
  }

  private normalizeModelSelectionValue(
    value: string | null | undefined,
    resolver: {
      optionValueSet: Set<string>;
      labelToValueMap: Map<string, string>;
    },
  ) {
    const normalized = normalizeOptionalText(value);
    if (!normalized) {
      return null;
    }
    if (resolver.optionValueSet.has(normalized)) {
      return normalized;
    }
    const normalizedFromLabel = resolver.labelToValueMap.get(normalized);
    if (normalizedFromLabel) {
      return normalizedFromLabel;
    }
    const separatorIndex = normalized.indexOf("::");
    if (separatorIndex > 0) {
      const fallbackModelName = normalized.slice(separatorIndex + 2).trim();
      return fallbackModelName || null;
    }
    return normalized;
  }

  private normalizeImageGenerationModelValue(value: string | undefined) {
    if (value === LEGACY_IMAGE_GENERATION_DEFAULT_MODEL) {
      return RIGHT_CODES_IMAGE_GENERATION_DEFAULT_MODEL;
    }
    if (value === LEGACY_VIDEO_NOTE_DEFAULT_MODEL) {
      return VOLCENGINE_VIDEO_NOTE_DEFAULT_MODEL;
    }
    return value;
  }

  private async ensureRegistryEntriesForSkill(
    baseSkill: SkillConfigRecord,
    basePrompts: PromptTemplateRecord[],
  ) {
    await this.prismaService.$executeRaw`
      INSERT INTO "SkillConfig" (
        "id",
        "name",
        "slug",
        "category",
        "status",
        "provider",
        "defaultModel",
        "pointsCost",
        "description",
        "updatedAt"
      )
      VALUES (
        ${baseSkill.id},
        ${baseSkill.name},
        ${baseSkill.slug},
        ${baseSkill.category},
        ${baseSkill.status},
        ${baseSkill.provider},
        ${baseSkill.defaultModel},
        ${baseSkill.pointsCost},
        ${baseSkill.description},
        ${new Date(baseSkill.updatedAt)}
      )
      ON CONFLICT ("id") DO NOTHING
    `;

    for (const prompt of basePrompts) {
      await this.prismaService.$executeRaw`
        INSERT INTO "PromptTemplate" (
          "id",
          "name",
          "scene",
          "version",
          "status",
          "modelName",
          "temperature",
          "maxTokens",
          "content",
          "updatedAt"
        )
        VALUES (
          ${prompt.id},
          ${prompt.name},
          ${prompt.scene},
          ${prompt.version},
          ${prompt.status},
          ${prompt.modelName},
          ${prompt.temperature},
          ${prompt.maxTokens},
          ${prompt.content},
          ${new Date(prompt.updatedAt)}
        )
        ON CONFLICT ("id") DO NOTHING
      `;
    }
  }

  private describeBrandSkillSaveError(error: unknown) {
    const rawMessage = error instanceof Error ? error.message : String(error || "未知错误");
    if (/violates foreign key constraint/i.test(rawMessage)) {
      return `保存技能配置失败：品牌技能库引用的平台技能或提示词基线缺失。${rawMessage}`;
    }
    if (/duplicate key value violates unique constraint/i.test(rawMessage)) {
      return `保存技能配置失败：线上存在重复的品牌技能覆盖记录。${rawMessage}`;
    }
    if (/column .* does not exist/i.test(rawMessage)) {
      return `保存技能配置失败：线上品牌技能表结构仍未补齐。${rawMessage}`;
    }
    return `保存技能配置失败：${rawMessage}`;
  }


  async resetUserSkill(skillId: string, auth: RequestAuthContext) {
    const context = this.assertBrandContext(auth);
    const skill = await this.skillsPromptsService.getSkillById(skillId);
    if (!skill) {
      throw new NotFoundException("技能不存在");
    }
    const basePrompts = await this.skillsPromptsService.listPrompts();
    const promptIds = this.skillsPromptsService.resolvePromptIdsForSkill(skill, basePrompts);
    const now = new Date();

    if (await this.prismaService.canUseDatabase()) {
      await this.ensureBrandSkillTablesReady();
      await this.prismaService.$executeRaw`
        DELETE FROM "BrandSkillProfile"
        WHERE "brandId" = ${context.brandId}
          AND "baseSkillId" = ${skillId}
      `;
      await this.prismaService.$executeRaw`
        DELETE FROM "BrandPromptOverride"
        WHERE "brandId" = ${context.brandId}
          AND (
            "baseSkillId" = ${skillId}
            OR "basePromptId" = ANY (${promptIds}::text[])
          )
      `;
      await this.prismaService.$executeRaw`
        INSERT INTO "BrandSkillResetLog" (
          "id",
          "brandId",
          "baseSkillId",
          "resetType",
          "promptIdsJson",
          "createdAt"
        )
        VALUES (
          ${createId("usrst")},
          ${context.brandId},
          ${skillId},
          ${"RESET_TO_PLATFORM"},
          ${JSON.stringify(promptIds)}::jsonb,
          ${now}
        )
      `;
    } else {
      for (let index = mockBrandSkillProfiles.length - 1; index >= 0; index -= 1) {
        const item = mockBrandSkillProfiles[index];
        if (item.brandId === context.brandId && item.baseSkillId === skillId) {
          mockBrandSkillProfiles.splice(index, 1);
        }
      }
      for (let index = mockBrandPromptOverrides.length - 1; index >= 0; index -= 1) {
        const item = mockBrandPromptOverrides[index];
        if (
          item.brandId === context.brandId
          && (
            item.baseSkillId === skillId
            || promptIds.includes(item.basePromptId)
          )
        ) {
          mockBrandPromptOverrides.splice(index, 1);
        }
      }
      mockBrandSkillResetLogs.unshift({
        id: createId("usrst"),
        brandId: context.brandId,
        baseSkillId: skillId,
        resetType: "RESET_TO_PLATFORM",
        promptIds,
        createdAt: now.toISOString(),
      });
    }

    return this.getUserSkill(skillId, auth);
  }

  private async listSkillProfiles(brandId: string) {
    if (await this.prismaService.canUseDatabase()) {
      await this.ensureBrandSkillTablesReady();
      const rows = await this.prismaService.$queryRaw<BrandSkillProfileRow[]>`
        SELECT *
        FROM "BrandSkillProfile"
        WHERE "brandId" = ${brandId}
      `;
      return rows.map((item) => this.normalizeSkillProfileRow(item));
    }

    return mockBrandSkillProfiles
      .filter((item) => item.brandId === brandId)
      .map((item) => ({ ...item }));
  }

  private async listPromptOverrides(brandId: string) {
    if (await this.prismaService.canUseDatabase()) {
      await this.ensureBrandSkillTablesReady();
      const rows = await this.prismaService.$queryRaw<BrandPromptOverrideRow[]>`
        SELECT *
        FROM "BrandPromptOverride"
        WHERE "brandId" = ${brandId}
      `;
      return rows.map((item) => this.normalizePromptOverrideRow(item));
    }

    return mockBrandPromptOverrides
      .filter((item) => item.brandId === brandId)
      .map((item) => ({ ...item }));
  }

  private async listResetLogs(brandId: string) {
    if (await this.prismaService.canUseDatabase()) {
      await this.ensureBrandSkillTablesReady();
      const rows = await this.prismaService.$queryRaw<BrandSkillResetLogRow[]>`
        SELECT *
        FROM "BrandSkillResetLog"
        WHERE "brandId" = ${brandId}
        ORDER BY "createdAt" DESC
      `;
      return rows.map((item) => this.normalizeResetLogRow(item));
    }

    return mockBrandSkillResetLogs
      .filter((item) => item.brandId === brandId)
      .map((item) => ({ ...item }));
  }

  private buildUserSkillRecord(
    baseSkill: SkillConfigRecord,
    basePrompts: PromptTemplateRecord[],
    profiles: BrandSkillProfileRow[],
    promptOverrides: BrandPromptOverrideRow[],
    resetLogs: BrandSkillResetLogRow[],
  ): UserSkillRecord {
    const profile = profiles.find((item) => item.baseSkillId === baseSkill.id);
    const latestResetLog = resetLogs.find((item) => item.baseSkillId === baseSkill.id);
    const promptIds = this.skillsPromptsService.resolvePromptIdsForSkill(baseSkill, basePrompts);
    const promptViews = promptIds
      .map((promptId) => {
        const basePrompt = basePrompts.find((item) => item.id === promptId);
        if (!basePrompt) {
          return undefined;
        }
        const override = pickEffectivePromptOverride(promptOverrides, promptId, baseSkill.id);
        const effectiveOverride = shouldIgnorePromptOverride(override, promptId) ? undefined : override;
        const effectivePrompt: PromptTemplateRecord = {
          ...basePrompt,
          content: resolvePromptFallbackContent(promptId, effectiveOverride?.content ?? basePrompt.content),
          modelName: this.normalizeImageGenerationModelValue(effectiveOverride?.modelName ?? basePrompt.modelName) || "",
          temperature: effectiveOverride?.temperature ?? basePrompt.temperature,
          maxTokens: effectiveOverride?.maxTokens ?? basePrompt.maxTokens,
          updatedAt: normalizeDate(effectiveOverride?.updatedAt ?? basePrompt.updatedAt),
        };
        return {
          id: promptId,
          isCustomized: hasPromptOverride(effectiveOverride),
          basePrompt,
          effectivePrompt,
        } satisfies UserSkillPromptRecord;
      })
      .filter((item): item is UserSkillPromptRecord => Boolean(item));

    const effectiveSkill: UserSkillRecord["effectiveSkill"] = {
      ...baseSkill,
      name: profile?.displayName?.trim() || baseSkill.name,
      defaultModel: this.normalizeImageGenerationModelValue(profile?.defaultModel?.trim() || baseSkill.defaultModel) || "",
      description: profile?.description?.trim() || baseSkill.description,
      updatedAt: normalizeDate(profile?.updatedAt ?? baseSkill.updatedAt),
    };

    return {
      id: baseSkill.id,
      brandId: normalizeOptionalText(profile?.brandId) || undefined,
      isCustomized: hasSkillProfileOverride(profile) || promptViews.some((item) => item.isCustomized),
      lastResetAt: normalizeDate(profile?.lastResetAt ?? latestResetLog?.createdAt) || undefined,
      baseSkill,
      effectiveSkill,
      prompts: promptViews,
    };
  }

  private async ensureBrandSkillTablesReady() {
    await this.prismaService.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "BrandSkillProfile" (
        "id" TEXT PRIMARY KEY,
        "brandId" TEXT NOT NULL,
        "baseSkillId" TEXT NOT NULL,
        "displayName" TEXT NULL,
        "defaultModel" TEXT NULL,
        "description" TEXT NULL,
        "lastResetAt" TIMESTAMPTZ NULL,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await this.prismaService.$executeRawUnsafe(`
      ALTER TABLE "BrandSkillProfile" ADD COLUMN IF NOT EXISTS "brandId" TEXT NOT NULL DEFAULT ''
    `);
    await this.prismaService.$executeRawUnsafe(`
      ALTER TABLE "BrandSkillProfile" ADD COLUMN IF NOT EXISTS "baseSkillId" TEXT NOT NULL DEFAULT ''
    `);
    await this.prismaService.$executeRawUnsafe(`
      ALTER TABLE "BrandSkillProfile" ADD COLUMN IF NOT EXISTS "displayName" TEXT NULL
    `);
    await this.prismaService.$executeRawUnsafe(`
      ALTER TABLE "BrandSkillProfile" ADD COLUMN IF NOT EXISTS "defaultModel" TEXT NULL
    `);
    await this.prismaService.$executeRawUnsafe(`
      ALTER TABLE "BrandSkillProfile" ADD COLUMN IF NOT EXISTS "description" TEXT NULL
    `);
    await this.prismaService.$executeRawUnsafe(`
      ALTER TABLE "BrandSkillProfile" ADD COLUMN IF NOT EXISTS "lastResetAt" TIMESTAMPTZ NULL
    `);
    await this.prismaService.$executeRawUnsafe(`
      ALTER TABLE "BrandSkillProfile" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    `);
    await this.prismaService.$executeRawUnsafe(`
      ALTER TABLE "BrandSkillProfile" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    `);
    await this.prismaService.$executeRawUnsafe(`
      ALTER TABLE "BrandSkillProfile" ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP
    `);
    await this.prismaService.$executeRawUnsafe(`
      ALTER TABLE "BrandSkillProfile" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP
    `);
    await this.prismaService.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "BrandPromptOverride" (
        "id" TEXT PRIMARY KEY,
        "brandId" TEXT NOT NULL,
        "baseSkillId" TEXT NOT NULL,
        "basePromptId" TEXT NOT NULL,
        "content" TEXT NULL,
        "modelName" TEXT NULL,
        "temperature" DOUBLE PRECISION NULL,
        "maxTokens" INTEGER NULL,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await this.prismaService.$executeRawUnsafe(`
      ALTER TABLE "BrandPromptOverride" ADD COLUMN IF NOT EXISTS "brandId" TEXT NOT NULL DEFAULT ''
    `);
    await this.prismaService.$executeRawUnsafe(`
      ALTER TABLE "BrandPromptOverride" ADD COLUMN IF NOT EXISTS "basePromptId" TEXT NOT NULL DEFAULT ''
    `);
    await this.prismaService.$executeRawUnsafe(`
      ALTER TABLE "BrandPromptOverride" ADD COLUMN IF NOT EXISTS "baseSkillId" TEXT NOT NULL DEFAULT ''
    `);
    await this.prismaService.$executeRawUnsafe(`
      ALTER TABLE "BrandPromptOverride" ADD COLUMN IF NOT EXISTS "content" TEXT NULL
    `);
    await this.prismaService.$executeRawUnsafe(`
      ALTER TABLE "BrandPromptOverride" ADD COLUMN IF NOT EXISTS "modelName" TEXT NULL
    `);
    await this.prismaService.$executeRawUnsafe(`
      ALTER TABLE "BrandPromptOverride" ADD COLUMN IF NOT EXISTS "temperature" DOUBLE PRECISION NULL
    `);
    await this.prismaService.$executeRawUnsafe(`
      ALTER TABLE "BrandPromptOverride" ADD COLUMN IF NOT EXISTS "maxTokens" INTEGER NULL
    `);
    await this.prismaService.$executeRawUnsafe(`
      ALTER TABLE "BrandPromptOverride" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    `);
    await this.prismaService.$executeRawUnsafe(`
      ALTER TABLE "BrandPromptOverride" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    `);
    await this.prismaService.$executeRawUnsafe(`
      ALTER TABLE "BrandPromptOverride" ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP
    `);
    await this.prismaService.$executeRawUnsafe(`
      ALTER TABLE "BrandPromptOverride" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP
    `);
    await this.prismaService.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "BrandSkillResetLog" (
        "id" TEXT PRIMARY KEY,
        "brandId" TEXT NOT NULL,
        "baseSkillId" TEXT NOT NULL,
        "resetType" TEXT NOT NULL,
        "promptIdsJson" JSONB NULL,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await this.prismaService.$executeRawUnsafe(`
      ALTER TABLE "BrandSkillResetLog" ADD COLUMN IF NOT EXISTS "brandId" TEXT NOT NULL DEFAULT ''
    `);
    await this.prismaService.$executeRawUnsafe(`
      ALTER TABLE "BrandSkillResetLog" ADD COLUMN IF NOT EXISTS "baseSkillId" TEXT NOT NULL DEFAULT ''
    `);
    await this.prismaService.$executeRawUnsafe(`
      ALTER TABLE "BrandSkillResetLog" ADD COLUMN IF NOT EXISTS "resetType" TEXT NOT NULL DEFAULT 'RESET_TO_PLATFORM'
    `);
    await this.prismaService.$executeRawUnsafe(`
      ALTER TABLE "BrandSkillResetLog" ADD COLUMN IF NOT EXISTS "promptIdsJson" JSONB NULL
    `);
    await this.prismaService.$executeRawUnsafe(`
      ALTER TABLE "BrandSkillResetLog" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    `);
    await this.prismaService.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "BrandSkillProfile_brand_skill_uidx"
      ON "BrandSkillProfile" ("brandId", "baseSkillId")
    `);
    await this.prismaService.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "BrandSkillProfile_brand_skill_idx"
      ON "BrandSkillProfile" ("brandId", "baseSkillId")
    `);
    await this.prismaService.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "BrandPromptOverride_brand_prompt_uidx"
      ON "BrandPromptOverride" ("brandId", "basePromptId")
    `);
    await this.prismaService.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "BrandPromptOverride_brand_skill_idx"
      ON "BrandPromptOverride" ("brandId", "baseSkillId")
    `);
    await this.prismaService.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "BrandPromptOverride_brand_prompt_idx"
      ON "BrandPromptOverride" ("brandId", "basePromptId")
    `);
    await this.prismaService.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "BrandSkillResetLog_brand_skill_idx"
      ON "BrandSkillResetLog" ("brandId", "baseSkillId", "createdAt" DESC)
    `);

    await this.syncGlobalGpt54BrandOverrides();
    await this.migrateLegacyUserSkillOverridesToBrandLayer();
    await this.backfillLegacyImageGenerationBrandOverrides();
    await this.backfillLegacyVideoNoteBrandOverrides();
  }

  private async syncGlobalGpt54BrandOverrides() {
    await this.prismaService.$executeRawUnsafe(`
      UPDATE "BrandSkillProfile"
      SET
        "defaultModel" = REPLACE("defaultModel", 'gpt-5.5', 'gpt-5.4'),
        "updatedAt" = CURRENT_TIMESTAMP
      WHERE POSITION('gpt-5.5' IN COALESCE("defaultModel", '')) > 0
    `);

    await this.prismaService.$executeRawUnsafe(`
      UPDATE "BrandPromptOverride"
      SET
        "modelName" = REPLACE("modelName", 'gpt-5.5', 'gpt-5.4'),
        "updatedAt" = CURRENT_TIMESTAMP
      WHERE POSITION('gpt-5.5' IN COALESCE("modelName", '')) > 0
    `);
  }

  private async migrateLegacyUserSkillOverridesToBrandLayer() {
    await this.prismaService.$executeRawUnsafe(`
      DO $$
      BEGIN
        IF to_regclass('"UserSkillProfile"') IS NOT NULL THEN
          INSERT INTO "BrandSkillProfile" (
            "id",
            "brandId",
            "baseSkillId",
            "displayName",
            "defaultModel",
            "description",
            "lastResetAt",
            "createdAt",
            "updatedAt"
          )
          SELECT
            src."id",
            src."brandId",
            src."baseSkillId",
            src."displayName",
            src."defaultModel",
            src."description",
            src."lastResetAt",
            src."createdAt",
            src."updatedAt"
          FROM (
            SELECT DISTINCT ON ("brandId", "baseSkillId")
              "id",
              "brandId",
              "baseSkillId",
              "displayName",
              "defaultModel",
              "description",
              "lastResetAt",
              "createdAt",
              "updatedAt"
            FROM "UserSkillProfile"
            WHERE COALESCE("brandId", '') <> ''
            ORDER BY "brandId", "baseSkillId", "updatedAt" DESC, "createdAt" DESC
          ) AS src
          LEFT JOIN "BrandSkillProfile" AS dst
            ON dst."brandId" = src."brandId"
           AND dst."baseSkillId" = src."baseSkillId"
          WHERE dst."id" IS NULL;
        END IF;
      END
      $$;
    `);

    await this.prismaService.$executeRawUnsafe(`
      DO $$
      BEGIN
        IF to_regclass('"UserPromptOverride"') IS NOT NULL THEN
          INSERT INTO "BrandPromptOverride" (
            "id",
            "brandId",
            "baseSkillId",
            "basePromptId",
            "content",
            "modelName",
            "temperature",
            "maxTokens",
            "createdAt",
            "updatedAt"
          )
          SELECT
            src."id",
            src."brandId",
            src."baseSkillId",
            src."basePromptId",
            src."content",
            src."modelName",
            src."temperature",
            src."maxTokens",
            src."createdAt",
            src."updatedAt"
          FROM (
            SELECT DISTINCT ON ("brandId", "basePromptId")
              "id",
              "brandId",
              "baseSkillId",
              "basePromptId",
              "content",
              "modelName",
              "temperature",
              "maxTokens",
              "createdAt",
              "updatedAt"
            FROM "UserPromptOverride"
            WHERE COALESCE("brandId", '') <> ''
            ORDER BY "brandId", "basePromptId", "updatedAt" DESC, "createdAt" DESC
          ) AS src
          LEFT JOIN "BrandPromptOverride" AS dst
            ON dst."brandId" = src."brandId"
           AND dst."basePromptId" = src."basePromptId"
          WHERE dst."id" IS NULL;
        END IF;
      END
      $$;
    `);

    await this.prismaService.$executeRawUnsafe(`
      DO $$
      BEGIN
        IF to_regclass('"UserSkillResetLog"') IS NOT NULL THEN
          INSERT INTO "BrandSkillResetLog" (
            "id",
            "brandId",
            "baseSkillId",
            "resetType",
            "promptIdsJson",
            "createdAt"
          )
          SELECT
            src."id",
            src."brandId",
            src."baseSkillId",
            src."resetType",
            src."promptIdsJson",
            src."createdAt"
          FROM (
            SELECT DISTINCT ON ("brandId", "baseSkillId")
              "id",
              "brandId",
              "baseSkillId",
              "resetType",
              "promptIdsJson",
              "createdAt"
            FROM "UserSkillResetLog"
            WHERE COALESCE("brandId", '') <> ''
            ORDER BY "brandId", "baseSkillId", "createdAt" DESC
          ) AS src
          LEFT JOIN "BrandSkillResetLog" AS dst
            ON dst."brandId" = src."brandId"
           AND dst."baseSkillId" = src."baseSkillId"
          WHERE dst."id" IS NULL;
        END IF;
      END
      $$;
    `);
  }

  private async backfillLegacyImageGenerationBrandOverrides() {
    for (const skillId of ["skill_xhs_original_image_generation", "skill_xhs_rewrite_image_generation"]) {
      await this.prismaService.$executeRaw`
        UPDATE "BrandSkillProfile"
        SET "defaultModel" = ${RIGHT_CODES_IMAGE_GENERATION_DEFAULT_MODEL}
        WHERE "baseSkillId" = ${skillId}
          AND "defaultModel" = ${LEGACY_IMAGE_GENERATION_DEFAULT_MODEL}
      `;
    }

    for (const promptId of ["prompt_xhs_original_image_generation", "prompt_xhs_rewrite_image_generation"]) {
      await this.prismaService.$executeRaw`
        UPDATE "BrandPromptOverride"
        SET "modelName" = ${RIGHT_CODES_IMAGE_GENERATION_DEFAULT_MODEL}
        WHERE "basePromptId" = ${promptId}
          AND "modelName" = ${LEGACY_IMAGE_GENERATION_DEFAULT_MODEL}
      `;
    }
  }

  private async backfillLegacyVideoNoteBrandOverrides() {
    await this.prismaService.$executeRaw`
      UPDATE "BrandSkillProfile"
      SET "defaultModel" = ${VOLCENGINE_VIDEO_NOTE_DEFAULT_MODEL}
      WHERE "baseSkillId" = ${"skill_xhs_video_note"}
        AND "defaultModel" = ${LEGACY_VIDEO_NOTE_DEFAULT_MODEL}
    `;

    await this.prismaService.$executeRaw`
      UPDATE "BrandPromptOverride"
      SET "modelName" = ${VOLCENGINE_VIDEO_NOTE_DEFAULT_MODEL}
      WHERE "basePromptId" = ${"prompt_xhs_video_note"}
        AND "modelName" = ${LEGACY_VIDEO_NOTE_DEFAULT_MODEL}
    `;
  }

  private assertBrandContext(auth?: RequestAuthContext) {
    if (!auth?.userId) {
      throw new NotFoundException("当前登录上下文不存在");
    }
    const brandId = String(auth.brandId || "").trim();
    if (!brandId) {
      throw new NotFoundException("请先选择品牌");
    }
    return {
      userId: auth.userId,
      brandId,
    };
  }

  private normalizeSkillProfileRow(row: {
    id: string;
    brandId: string;
    baseSkillId: string;
    displayName?: string | null;
    defaultModel?: string | null;
    description?: string | null;
    lastResetAt?: Date | string | null;
    createdAt: Date | string;
    updatedAt: Date | string;
  }): BrandSkillProfileRow {
    return {
      id: row.id,
      brandId: row.brandId,
      baseSkillId: row.baseSkillId,
      displayName: row.displayName || undefined,
      defaultModel: this.normalizeImageGenerationModelValue(row.defaultModel || undefined),
      description: row.description || undefined,
      lastResetAt: normalizeDate(row.lastResetAt) || undefined,
      createdAt: normalizeDate(row.createdAt),
      updatedAt: normalizeDate(row.updatedAt),
    };
  }

  private normalizePromptOverrideRow(row: {
    id: string;
    brandId: string;
    baseSkillId: string;
    basePromptId: string;
    content?: string | null;
    modelName?: string | null;
    temperature?: number | null;
    maxTokens?: number | null;
    createdAt: Date | string;
    updatedAt: Date | string;
  }): BrandPromptOverrideRow {
    return {
      id: row.id,
      brandId: row.brandId,
      baseSkillId: row.baseSkillId,
      basePromptId: row.basePromptId,
      content: row.content || undefined,
      modelName: this.normalizeImageGenerationModelValue(row.modelName || undefined),
      temperature: row.temperature ?? undefined,
      maxTokens: row.maxTokens ?? undefined,
      createdAt: normalizeDate(row.createdAt),
      updatedAt: normalizeDate(row.updatedAt),
    };
  }

  private normalizeResetLogRow(row: {
    id: string;
    brandId: string;
    baseSkillId: string;
    resetType: string;
    promptIdsJson?: unknown;
    createdAt: Date | string;
  }): BrandSkillResetLogRow {
    return {
      id: row.id,
      brandId: row.brandId,
      baseSkillId: row.baseSkillId,
      resetType: row.resetType,
      promptIdsJson: row.promptIdsJson,
      createdAt: normalizeDate(row.createdAt),
    };
  }
}

function normalizeOptionalText(value: unknown) {
  if (typeof value !== "string") {
    return value === null ? null : undefined;
  }
  const normalized = value.trim();
  return normalized ? normalized : null;
}

function normalizeOptionalNumber(value: unknown) {
  if (value === null) {
    return null;
  }
  if (value === undefined || value === "") {
    return undefined;
  }
  const normalized = Number(value);
  return Number.isFinite(normalized) ? normalized : undefined;
}

function normalizeOptionalInt(value: unknown) {
  const normalized = normalizeOptionalNumber(value);
  if (normalized === null || normalized === undefined) {
    return normalized;
  }
  return Math.round(normalized);
}

function toSqlNullable<T>(value: T | undefined) {
  return value === undefined ? null : value;
}

function isLegacyUnscopedSkillId(value: string | null | undefined) {
  return !String(value || "").trim();
}

function normalizeDate(value: Date | string | null | undefined) {
  if (!value) {
    return "";
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? String(value) : parsed.toISOString();
}

function hasAnyDefinedValue(values: unknown[]) {
  return values.some((value) => value !== undefined);
}

function hasSkillProfileOverride(profile?: BrandSkillProfileRow) {
  if (!profile) {
    return false;
  }
  return Boolean(profile.displayName || profile.defaultModel || profile.description);
}

function hasPromptOverride(override?: BrandPromptOverrideRow) {
  if (!override) {
    return false;
  }
  return Boolean(
    override.content !== undefined
      || override.modelName !== undefined
      || override.temperature !== undefined
      || override.maxTokens !== undefined,
  );
}

function pickEffectivePromptOverride(
  promptOverrides: BrandPromptOverrideRow[],
  promptId: string,
  baseSkillId: string,
) {
  const scopedOverride = promptOverrides.find((item) => item.basePromptId === promptId && item.baseSkillId === baseSkillId);
  if (scopedOverride) {
    return scopedOverride;
  }
  return promptOverrides.find((item) =>
    item.basePromptId === promptId
    && isLegacyUnscopedSkillId(item.baseSkillId)
    && !shouldIgnorePromptOverride(item, promptId),
  );
}

function shouldIgnorePromptOverride(override: BrandPromptOverrideRow | undefined, promptId: string) {
  return Boolean(
    override
    && OPPORTUNITY_INSIGHT_PROMPT_IDS.has(promptId)
    && isLegacyUnscopedSkillId(override.baseSkillId),
  );
}
