import { Injectable, NotFoundException } from "@nestjs/common";
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

type UserSkillProfileRow = {
  id: string;
  userId: string;
  brandId?: string | null;
  baseSkillId: string;
  displayName?: string | null;
  defaultModel?: string | null;
  description?: string | null;
  lastResetAt?: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
};

type UserPromptOverrideRow = {
  id: string;
  userId: string;
  brandId?: string | null;
  baseSkillId: string;
  basePromptId: string;
  content?: string | null;
  modelName?: string | null;
  temperature?: number | null;
  maxTokens?: number | null;
  createdAt: Date | string;
  updatedAt: Date | string;
};

type UserSkillResetLogRow = {
  id: string;
  userId: string;
  brandId?: string | null;
  baseSkillId: string;
  resetType: string;
  promptIdsJson?: unknown;
  createdAt: Date | string;
};

const LEGACY_IMAGE_GENERATION_DEFAULT_MODEL = "provider_runtime_image_generation::gpt-image-2";
const RIGHT_CODES_IMAGE_GENERATION_DEFAULT_MODEL = "provider_runtime_image_generation_right_codes::gpt-image-2";

type MockUserSkillProfileRecord = {
  id: string;
  userId: string;
  brandId?: string;
  baseSkillId: string;
  displayName?: string;
  defaultModel?: string;
  description?: string;
  lastResetAt?: string;
  createdAt: string;
  updatedAt: string;
};

type MockUserPromptOverrideRecord = {
  id: string;
  userId: string;
  brandId?: string;
  baseSkillId: string;
  basePromptId: string;
  content?: string;
  modelName?: string;
  temperature?: number;
  maxTokens?: number;
  createdAt: string;
  updatedAt: string;
};

type MockUserSkillResetLogRecord = {
  id: string;
  userId: string;
  brandId?: string;
  baseSkillId: string;
  resetType: string;
  promptIds: string[];
  createdAt: string;
};

const mockUserSkillProfiles: MockUserSkillProfileRecord[] = [];
const mockUserPromptOverrides: MockUserPromptOverrideRecord[] = [];
const mockUserSkillResetLogs: MockUserSkillResetLogRecord[] = [];

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
    const context = this.assertUserContext(auth);
    const baseSkills = await this.skillsPromptsService.listSkills();
    const basePrompts = await this.skillsPromptsService.listPrompts();
    const profiles = await this.listSkillProfiles(context.userId, context.brandId);
    const promptOverrides = await this.listPromptOverrides(context.userId, context.brandId);
    const resetLogs = await this.listResetLogs(context.userId, context.brandId);

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
    const context = this.assertUserContext(auth);
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
      await this.ensureUserSkillTablesReady();
      const existingProfileRows = await this.prismaService.$queryRaw<UserSkillProfileRow[]>`
        SELECT *
        FROM "UserSkillProfile"
        WHERE "userId" = ${context.userId}
          AND "brandId" IS NOT DISTINCT FROM ${context.brandId ?? null}
          AND "baseSkillId" = ${skillId}
        LIMIT 1
      `;
      const existingProfile = existingProfileRows[0];

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

        if (existingProfile && !hasEffectiveSkillOverride) {
          await this.prismaService.$executeRaw`
            DELETE FROM "UserSkillProfile"
            WHERE "id" = ${existingProfile.id}
          `;
        } else if (existingProfile) {
          await this.prismaService.$executeRaw`
            UPDATE "UserSkillProfile"
            SET
              "displayName" = ${normalizedProfileData.displayName},
              "defaultModel" = ${normalizedProfileData.defaultModel},
              "description" = ${normalizedProfileData.description},
              "updatedAt" = CURRENT_TIMESTAMP
            WHERE "id" = ${existingProfile.id}
          `;
        } else if (hasEffectiveSkillOverride) {
          await this.prismaService.$executeRaw`
            INSERT INTO "UserSkillProfile" (
              "id",
              "userId",
              "brandId",
              "baseSkillId",
              "displayName",
              "defaultModel",
              "description"
            )
            VALUES (
              ${createId("usp")},
              ${context.userId},
              ${context.brandId ?? null},
              ${skillId},
              ${normalizedProfileData.displayName},
              ${normalizedProfileData.defaultModel},
              ${normalizedProfileData.description}
            )
          `;
        }
      }

      for (const promptOverride of requestedPromptOverrides) {
        const existingOverrideRows = await this.prismaService.$queryRaw<UserPromptOverrideRow[]>`
          SELECT *
          FROM "UserPromptOverride"
          WHERE "userId" = ${context.userId}
            AND "brandId" IS NOT DISTINCT FROM ${context.brandId ?? null}
            AND "basePromptId" = ${promptOverride.promptId}
          LIMIT 1
        `;
        const existingOverride = existingOverrideRows[0];
        const normalizedOverrideData = {
          baseSkillId: skillId,
          content: toSqlNullable(normalizeOptionalText(promptOverride.content)),
          modelName: toSqlNullable(this.normalizeModelSelectionValue(promptOverride.modelName, modelSelectionResolver)),
          temperature: toSqlNullable(normalizeOptionalNumber(promptOverride.temperature)),
          maxTokens: toSqlNullable(normalizeOptionalInt(promptOverride.maxTokens)),
        };
        const hasEffectivePromptOverride = Object.entries(normalizedOverrideData)
          .some(([key, value]) => key !== "baseSkillId" && value !== null && value !== undefined);
        if (existingOverride && !hasEffectivePromptOverride) {
          await this.prismaService.$executeRaw`
            DELETE FROM "UserPromptOverride"
            WHERE "id" = ${existingOverride.id}
          `;
        } else if (existingOverride) {
          await this.prismaService.$executeRaw`
            UPDATE "UserPromptOverride"
            SET
              "baseSkillId" = ${normalizedOverrideData.baseSkillId},
              "content" = ${normalizedOverrideData.content},
              "modelName" = ${normalizedOverrideData.modelName},
              "temperature" = ${normalizedOverrideData.temperature},
              "maxTokens" = ${normalizedOverrideData.maxTokens},
              "updatedAt" = CURRENT_TIMESTAMP
            WHERE "id" = ${existingOverride.id}
          `;
        } else if (hasEffectivePromptOverride) {
          await this.prismaService.$executeRaw`
            INSERT INTO "UserPromptOverride" (
              "id",
              "userId",
              "brandId",
              "baseSkillId",
              "basePromptId",
              "content",
              "modelName",
              "temperature",
              "maxTokens"
            )
            VALUES (
              ${createId("upo")},
              ${context.userId},
              ${context.brandId ?? null},
              ${normalizedOverrideData.baseSkillId},
              ${promptOverride.promptId},
              ${normalizedOverrideData.content},
              ${normalizedOverrideData.modelName},
              ${normalizedOverrideData.temperature},
              ${normalizedOverrideData.maxTokens}
            )
          `;
        }
      }
    } else {
      const now = new Date().toISOString();
      const existingProfile = mockUserSkillProfiles.find(
        (item) =>
          item.userId === context.userId
          && item.brandId === context.brandId
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
          mockUserSkillProfiles.splice(mockUserSkillProfiles.indexOf(existingProfile), 1);
        } else if (existingProfile) {
          existingProfile.displayName = normalizeOptionalText(payload.displayName) ?? undefined;
          existingProfile.defaultModel = this.normalizeModelSelectionValue(payload.defaultModel, modelSelectionResolver) ?? undefined;
          existingProfile.description = normalizeOptionalText(payload.description) ?? undefined;
          existingProfile.updatedAt = now;
        } else if (hasEffectiveSkillOverride) {
          mockUserSkillProfiles.push({
            id: createId("usp"),
            userId: context.userId,
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
        const existingOverride = mockUserPromptOverrides.find(
          (item) =>
            item.userId === context.userId
            && item.brandId === context.brandId
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
          mockUserPromptOverrides.splice(mockUserPromptOverrides.indexOf(existingOverride), 1);
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
          mockUserPromptOverrides.push({
            id: createId("upo"),
            userId: context.userId,
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
    return value === LEGACY_IMAGE_GENERATION_DEFAULT_MODEL
      ? RIGHT_CODES_IMAGE_GENERATION_DEFAULT_MODEL
      : value;
  }


  async resetUserSkill(skillId: string, auth: RequestAuthContext) {
    const context = this.assertUserContext(auth);
    const skill = await this.skillsPromptsService.getSkillById(skillId);
    if (!skill) {
      throw new NotFoundException("技能不存在");
    }
    const basePrompts = await this.skillsPromptsService.listPrompts();
    const promptIds = this.skillsPromptsService.resolvePromptIdsForSkill(skill, basePrompts);
    const now = new Date();

    if (await this.prismaService.canUseDatabase()) {
      await this.ensureUserSkillTablesReady();
      await this.prismaService.$executeRaw`
        DELETE FROM "UserSkillProfile"
        WHERE "userId" = ${context.userId}
          AND "brandId" IS NOT DISTINCT FROM ${context.brandId ?? null}
          AND "baseSkillId" = ${skillId}
      `;
      await this.prismaService.$executeRaw`
        DELETE FROM "UserPromptOverride"
        WHERE "userId" = ${context.userId}
          AND "brandId" IS NOT DISTINCT FROM ${context.brandId ?? null}
          AND "baseSkillId" = ${skillId}
      `;
      await this.prismaService.$executeRaw`
        INSERT INTO "UserSkillResetLog" (
          "id",
          "userId",
          "brandId",
          "baseSkillId",
          "resetType",
          "promptIdsJson",
          "createdAt"
        )
        VALUES (
          ${createId("usrst")},
          ${context.userId},
          ${context.brandId ?? null},
          ${skillId},
          ${"RESET_TO_PLATFORM"},
          ${JSON.stringify(promptIds)},
          ${now}
        )
      `;
    } else {
      for (let index = mockUserSkillProfiles.length - 1; index >= 0; index -= 1) {
        const item = mockUserSkillProfiles[index];
        if (item.userId === context.userId && item.brandId === context.brandId && item.baseSkillId === skillId) {
          mockUserSkillProfiles.splice(index, 1);
        }
      }
      for (let index = mockUserPromptOverrides.length - 1; index >= 0; index -= 1) {
        const item = mockUserPromptOverrides[index];
        if (item.userId === context.userId && item.brandId === context.brandId && item.baseSkillId === skillId) {
          mockUserPromptOverrides.splice(index, 1);
        }
      }
      mockUserSkillResetLogs.unshift({
        id: createId("usrst"),
        userId: context.userId,
        brandId: context.brandId,
        baseSkillId: skillId,
        resetType: "RESET_TO_PLATFORM",
        promptIds,
        createdAt: now.toISOString(),
      });
    }

    return this.getUserSkill(skillId, auth);
  }

  private async listSkillProfiles(userId: string, brandId?: string) {
    if (await this.prismaService.canUseDatabase()) {
      await this.ensureUserSkillTablesReady();
      const rows = await this.prismaService.$queryRaw<UserSkillProfileRow[]>`
        SELECT *
        FROM "UserSkillProfile"
        WHERE "userId" = ${userId}
          AND "brandId" IS NOT DISTINCT FROM ${brandId ?? null}
      `;
      return rows.map((item) => this.normalizeSkillProfileRow(item));
    }

    return mockUserSkillProfiles
      .filter((item) => item.userId === userId && item.brandId === brandId)
      .map((item) => ({ ...item }));
  }

  private async listPromptOverrides(userId: string, brandId?: string) {
    if (await this.prismaService.canUseDatabase()) {
      await this.ensureUserSkillTablesReady();
      const rows = await this.prismaService.$queryRaw<UserPromptOverrideRow[]>`
        SELECT *
        FROM "UserPromptOverride"
        WHERE "userId" = ${userId}
          AND "brandId" IS NOT DISTINCT FROM ${brandId ?? null}
      `;
      return rows.map((item) => this.normalizePromptOverrideRow(item));
    }

    return mockUserPromptOverrides
      .filter((item) => item.userId === userId && item.brandId === brandId)
      .map((item) => ({ ...item }));
  }

  private async listResetLogs(userId: string, brandId?: string) {
    if (await this.prismaService.canUseDatabase()) {
      await this.ensureUserSkillTablesReady();
      const rows = await this.prismaService.$queryRaw<UserSkillResetLogRow[]>`
        SELECT *
        FROM "UserSkillResetLog"
        WHERE "userId" = ${userId}
          AND "brandId" IS NOT DISTINCT FROM ${brandId ?? null}
        ORDER BY "createdAt" DESC
      `;
      return rows.map((item) => this.normalizeResetLogRow(item));
    }

    return mockUserSkillResetLogs
      .filter((item) => item.userId === userId && item.brandId === brandId)
      .map((item) => ({ ...item }));
  }

  private buildUserSkillRecord(
    baseSkill: SkillConfigRecord,
    basePrompts: PromptTemplateRecord[],
    profiles: UserSkillProfileRow[],
    promptOverrides: UserPromptOverrideRow[],
    resetLogs: UserSkillResetLogRow[],
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
        const override = promptOverrides.find((item) => item.basePromptId === promptId);
        const effectivePrompt: PromptTemplateRecord = {
          ...basePrompt,
          content: resolvePromptFallbackContent(promptId, override?.content ?? basePrompt.content),
          modelName: this.normalizeImageGenerationModelValue(override?.modelName ?? basePrompt.modelName) || "",
          temperature: override?.temperature ?? basePrompt.temperature,
          maxTokens: override?.maxTokens ?? basePrompt.maxTokens,
          updatedAt: normalizeDate(override?.updatedAt ?? basePrompt.updatedAt),
        };
        return {
          id: promptId,
          isCustomized: hasPromptOverride(override),
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

  private async ensureUserSkillTablesReady() {
    await this.prismaService.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "UserSkillProfile" (
        "id" TEXT PRIMARY KEY,
        "userId" TEXT NOT NULL,
        "brandId" TEXT NULL,
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
      ALTER TABLE "UserSkillProfile" ADD COLUMN IF NOT EXISTS "displayName" TEXT NULL
    `);
    await this.prismaService.$executeRawUnsafe(`
      ALTER TABLE "UserSkillProfile" ADD COLUMN IF NOT EXISTS "defaultModel" TEXT NULL
    `);
    await this.prismaService.$executeRawUnsafe(`
      ALTER TABLE "UserSkillProfile" ADD COLUMN IF NOT EXISTS "description" TEXT NULL
    `);
    await this.prismaService.$executeRawUnsafe(`
      ALTER TABLE "UserSkillProfile" ADD COLUMN IF NOT EXISTS "lastResetAt" TIMESTAMPTZ NULL
    `);
    await this.prismaService.$executeRawUnsafe(`
      ALTER TABLE "UserSkillProfile" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    `);
    await this.prismaService.$executeRawUnsafe(`
      ALTER TABLE "UserSkillProfile" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    `);
    await this.prismaService.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "UserPromptOverride" (
        "id" TEXT PRIMARY KEY,
        "userId" TEXT NOT NULL,
        "brandId" TEXT NULL,
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
      ALTER TABLE "UserPromptOverride" ADD COLUMN IF NOT EXISTS "basePromptId" TEXT NOT NULL DEFAULT ''
    `);
    await this.prismaService.$executeRawUnsafe(`
      ALTER TABLE "UserPromptOverride" ADD COLUMN IF NOT EXISTS "baseSkillId" TEXT NOT NULL DEFAULT ''
    `);
    await this.prismaService.$executeRawUnsafe(`
      ALTER TABLE "UserPromptOverride" ADD COLUMN IF NOT EXISTS "content" TEXT NULL
    `);
    await this.prismaService.$executeRawUnsafe(`
      ALTER TABLE "UserPromptOverride" ADD COLUMN IF NOT EXISTS "modelName" TEXT NULL
    `);
    await this.prismaService.$executeRawUnsafe(`
      ALTER TABLE "UserPromptOverride" ADD COLUMN IF NOT EXISTS "temperature" DOUBLE PRECISION NULL
    `);
    await this.prismaService.$executeRawUnsafe(`
      ALTER TABLE "UserPromptOverride" ADD COLUMN IF NOT EXISTS "maxTokens" INTEGER NULL
    `);
    await this.prismaService.$executeRawUnsafe(`
      ALTER TABLE "UserPromptOverride" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    `);
    await this.prismaService.$executeRawUnsafe(`
      ALTER TABLE "UserPromptOverride" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    `);
    await this.prismaService.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "UserSkillResetLog" (
        "id" TEXT PRIMARY KEY,
        "userId" TEXT NOT NULL,
        "brandId" TEXT NULL,
        "baseSkillId" TEXT NOT NULL,
        "resetType" TEXT NOT NULL,
        "promptIdsJson" JSONB NULL,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await this.prismaService.$executeRawUnsafe(`
      ALTER TABLE "UserSkillResetLog" ADD COLUMN IF NOT EXISTS "resetType" TEXT NOT NULL DEFAULT 'RESET_TO_PLATFORM'
    `);
    await this.prismaService.$executeRawUnsafe(`
      ALTER TABLE "UserSkillResetLog" ADD COLUMN IF NOT EXISTS "promptIdsJson" JSONB NULL
    `);
    await this.prismaService.$executeRawUnsafe(`
      ALTER TABLE "UserSkillResetLog" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    `);
    await this.prismaService.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "UserSkillProfile_user_brand_skill_idx"
      ON "UserSkillProfile" ("userId", "brandId", "baseSkillId")
    `);
    await this.prismaService.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "UserPromptOverride_user_brand_skill_idx"
      ON "UserPromptOverride" ("userId", "brandId", "baseSkillId")
    `);
    await this.prismaService.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "UserPromptOverride_user_brand_prompt_idx"
      ON "UserPromptOverride" ("userId", "brandId", "basePromptId")
    `);
    await this.prismaService.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "UserSkillResetLog_user_brand_skill_idx"
      ON "UserSkillResetLog" ("userId", "brandId", "baseSkillId", "createdAt" DESC)
    `);

    await this.backfillLegacyImageGenerationUserOverrides();
  }

  private async backfillLegacyImageGenerationUserOverrides() {
    for (const skillId of ["skill_xhs_original_image_generation", "skill_xhs_rewrite_image_generation"]) {
      await this.prismaService.$executeRaw`
        UPDATE "UserSkillProfile"
        SET "defaultModel" = ${RIGHT_CODES_IMAGE_GENERATION_DEFAULT_MODEL}
        WHERE "baseSkillId" = ${skillId}
          AND "defaultModel" = ${LEGACY_IMAGE_GENERATION_DEFAULT_MODEL}
      `;
    }

    for (const promptId of ["prompt_xhs_original_image_generation", "prompt_xhs_rewrite_image_generation"]) {
      await this.prismaService.$executeRaw`
        UPDATE "UserPromptOverride"
        SET "modelName" = ${RIGHT_CODES_IMAGE_GENERATION_DEFAULT_MODEL}
        WHERE "basePromptId" = ${promptId}
          AND "modelName" = ${LEGACY_IMAGE_GENERATION_DEFAULT_MODEL}
      `;
    }
  }

  private assertUserContext(auth?: RequestAuthContext) {
    if (!auth?.userId) {
      throw new NotFoundException("当前登录上下文不存在");
    }
    return {
      userId: auth.userId,
      brandId: auth.brandId,
    };
  }

  private normalizeSkillProfileRow(row: {
    id: string;
    userId: string;
    brandId?: string | null;
    baseSkillId: string;
    displayName?: string | null;
    defaultModel?: string | null;
    description?: string | null;
    lastResetAt?: Date | string | null;
    createdAt: Date | string;
    updatedAt: Date | string;
  }): UserSkillProfileRow {
    return {
      id: row.id,
      userId: row.userId,
      brandId: row.brandId || undefined,
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
    userId: string;
    brandId?: string | null;
    baseSkillId: string;
    basePromptId: string;
    content?: string | null;
    modelName?: string | null;
    temperature?: number | null;
    maxTokens?: number | null;
    createdAt: Date | string;
    updatedAt: Date | string;
  }): UserPromptOverrideRow {
    return {
      id: row.id,
      userId: row.userId,
      brandId: row.brandId || undefined,
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
    userId: string;
    brandId?: string | null;
    baseSkillId: string;
    resetType: string;
    promptIdsJson?: unknown;
    createdAt: Date | string;
  }): UserSkillResetLogRow {
    return {
      id: row.id,
      userId: row.userId,
      brandId: row.brandId || undefined,
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

function hasSkillProfileOverride(profile?: UserSkillProfileRow) {
  if (!profile) {
    return false;
  }
  return Boolean(profile.displayName || profile.defaultModel || profile.description);
}

function hasPromptOverride(override?: UserPromptOverrideRow) {
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
