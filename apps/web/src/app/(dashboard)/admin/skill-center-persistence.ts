import type { PromptTemplateRecord, SkillConfigRecord } from "../../../services/admin";

type SkillDraftPatchShape = {
  status: SkillConfigRecord["status"];
  defaultModel: string;
  pointsCost: string;
  inputSchemaJson?: SkillConfigRecord["inputSchemaJson"];
};

type PromptDraftPatchShape = {
  status: PromptTemplateRecord["status"];
  modelName: string;
  temperature: string;
  maxTokens: string;
  content: string;
};

export function patchSkillDraftRecord<T>(options: {
  current: Record<string, T>;
  skillId: string;
  patch: Partial<T>;
  fallback: T;
}): Record<string, T> {
  return {
    ...options.current,
    [options.skillId]: {
      ...(options.current[options.skillId] || options.fallback),
      ...options.patch,
    },
  };
}

export function patchPromptDraftRecord<T>(options: {
  current: Record<string, T>;
  promptId: string;
  patch: Partial<T>;
  fallback: T;
}): Record<string, T> {
  return {
    ...options.current,
    [options.promptId]: {
      ...(options.current[options.promptId] || options.fallback),
      ...options.patch,
    },
  };
}

export function buildSkillConfigUpdatePayload<T extends SkillDraftPatchShape>(
  draft: T,
  composedDescription: string,
  inputSchemaJson?: SkillConfigRecord["inputSchemaJson"],
) {
  return {
    status: draft.status,
    defaultModel: draft.defaultModel,
    pointsCost: Number(draft.pointsCost || 0),
    description: composedDescription,
    inputSchemaJson: inputSchemaJson ?? draft.inputSchemaJson ?? null,
  };
}

export function buildPromptTemplateUpdatePayload<T extends PromptDraftPatchShape>(draft: T) {
  return {
    status: draft.status,
    modelName: draft.modelName,
    temperature: Number(draft.temperature || 0),
    maxTokens: Number(draft.maxTokens || 0),
    content: draft.content,
  };
}

export function applyUpdatedSkillRecord(list: SkillConfigRecord[], skillId: string, updated: SkillConfigRecord) {
  return list.map((item) => (item.id === skillId ? updated : item));
}

export function applySeedUpdatedSkillRecord(options: {
  list: SkillConfigRecord[];
  skillId: string;
  draft: SkillDraftPatchShape;
  description: string;
  updatedAt: string;
}) {
  return options.list.map((item) =>
    item.id === options.skillId
      ? {
          ...item,
          status: options.draft.status,
          defaultModel: options.draft.defaultModel,
          pointsCost: Number(options.draft.pointsCost || 0),
          description: options.description,
          inputSchemaJson: options.draft.inputSchemaJson ?? item.inputSchemaJson ?? null,
          updatedAt: options.updatedAt,
        }
      : item,
  );
}

export function applyUpdatedPromptRecord(list: PromptTemplateRecord[], promptId: string, updated: PromptTemplateRecord) {
  return list.map((item) => (item.id === promptId ? updated : item));
}

export function applySeedUpdatedPromptRecord(options: {
  list: PromptTemplateRecord[];
  promptId: string;
  draft: PromptDraftPatchShape;
  updatedAt: string;
}) {
  return options.list.map((item) =>
    item.id === options.promptId
      ? {
          ...item,
          status: options.draft.status,
          modelName: options.draft.modelName,
          temperature: Number(options.draft.temperature || 0),
          maxTokens: Number(options.draft.maxTokens || 0),
          content: options.draft.content,
          updatedAt: options.updatedAt,
        }
      : item,
  );
}

export function resolveSkillCenterSavePlan(options: {
  activeSkillId?: string;
  activePromptId?: string;
}) {
  return {
    shouldSaveSkill: Boolean(options.activeSkillId),
    shouldSavePrompt: Boolean(options.activePromptId),
    activeSkillId: options.activeSkillId || "",
    activePromptId: options.activePromptId || "",
  };
}
