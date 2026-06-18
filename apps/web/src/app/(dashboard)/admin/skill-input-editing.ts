import type { KnowledgeBaseFileRecord, KnowledgeBaseRecord } from "../../../services/admin";

type DatabaseInputConfig = {
  id: string;
  parameterType: "INJECT_TOGGLE" | "SELECT_CHOICE";
  parameterKey: string;
  parameterLabel: string;
  selectedValue: string;
  remarks: string;
};

type KnowledgeInputConfig = {
  id: string;
  knowledgeBaseId: string;
  knowledgeBaseName: string;
  targetContentId: string;
  targetContentLabel: string;
  remarks: string;
};

type CustomInputConfig = {
  id: string;
  inputType: "SELECT" | "TEXT" | "FILE";
  label: string;
  required: boolean;
  options: string[];
  placeholder: string;
  acceptedFileTypes: string;
  remarks: string;
};

type DatabaseParameterMeta = {
  value: string;
  label: string;
};

type DatabaseSelectOption = {
  value: string;
  label: string;
};

type KnowledgeContentOption = {
  value: string;
  label: string;
};

export function updateDatabaseInputConfigs(options: {
  items: DatabaseInputConfig[];
  inputId: string;
  patch: Partial<DatabaseInputConfig>;
  getDatabaseParameterMeta: (parameterType: DatabaseInputConfig["parameterType"], parameterKey: string) => DatabaseParameterMeta | undefined;
  getDatabaseSelectValueOptions: (parameterKey: string) => DatabaseSelectOption[];
}) {
  return options.items.map((item) => {
    if (item.id !== options.inputId) {
      return item;
    }
    const next = {
      ...item,
      ...options.patch,
    };
    if (options.patch.parameterKey) {
      const meta = options.getDatabaseParameterMeta(next.parameterType, options.patch.parameterKey);
      next.parameterLabel = meta?.label || options.patch.parameterKey;
      const selectOptions = next.parameterType === "SELECT_CHOICE"
        ? options.getDatabaseSelectValueOptions(options.patch.parameterKey)
        : [];
      if (next.parameterType === "SELECT_CHOICE" && !selectOptions.some((option) => option.value === next.selectedValue)) {
        next.selectedValue = selectOptions[0]?.value || "";
      }
    }
    return next;
  });
}

export function appendDatabaseInputConfig(options: {
  items: DatabaseInputConfig[];
  parameterType: DatabaseInputConfig["parameterType"];
  buildDatabaseInputConfig: (parameterType: DatabaseInputConfig["parameterType"]) => DatabaseInputConfig;
}) {
  return [...options.items, options.buildDatabaseInputConfig(options.parameterType)];
}

export function updateKnowledgeInputConfigs(options: {
  items: KnowledgeInputConfig[];
  inputId: string;
  patch: Partial<KnowledgeInputConfig>;
  knowledgeBases: KnowledgeBaseRecord[];
  knowledgeBaseFiles: KnowledgeBaseFileRecord[];
  getKnowledgeContentOptions: (
    knowledgeBaseId: string,
    knowledgeBaseFiles: KnowledgeBaseFileRecord[],
    currentValue?: string,
    currentLabel?: string,
  ) => KnowledgeContentOption[];
}) {
  return options.items.map((item) => {
    if (item.id !== options.inputId) {
      return item;
    }
    const next = { ...item, ...options.patch };
    if (Object.prototype.hasOwnProperty.call(options.patch, "knowledgeBaseId")) {
      const matched = options.knowledgeBases.find((entry) => entry.id === options.patch.knowledgeBaseId);
      next.knowledgeBaseName = matched?.name || "";
      const nextOptions = options.getKnowledgeContentOptions(options.patch.knowledgeBaseId || "", options.knowledgeBaseFiles);
      next.targetContentId = nextOptions[0]?.value || "";
      next.targetContentLabel = nextOptions[0]?.label || "";
    }
    if (Object.prototype.hasOwnProperty.call(options.patch, "targetContentId")) {
      const nextOptions = options.getKnowledgeContentOptions(
        next.knowledgeBaseId,
        options.knowledgeBaseFiles,
        options.patch.targetContentId,
        next.targetContentLabel,
      );
      const matchedOption = nextOptions.find((entry) => entry.value === (options.patch.targetContentId || ""));
      next.targetContentLabel = matchedOption?.label || "";
    }
    return next;
  });
}

export function appendKnowledgeInputConfig(options: {
  items: KnowledgeInputConfig[];
  knowledgeBases: KnowledgeBaseRecord[];
  knowledgeBaseFiles: KnowledgeBaseFileRecord[];
  buildKnowledgeInputConfig: (
    knowledgeBase?: KnowledgeBaseRecord,
    knowledgeBaseFiles?: KnowledgeBaseFileRecord[],
  ) => KnowledgeInputConfig;
}) {
  const defaultKnowledgeBase = options.knowledgeBases.find((item) => item.status !== "DISABLED");
  return [...options.items, options.buildKnowledgeInputConfig(defaultKnowledgeBase, options.knowledgeBaseFiles)];
}

export function updateCustomInputConfigs(options: {
  items: CustomInputConfig[];
  inputId: string;
  patch: Partial<CustomInputConfig>;
}) {
  return options.items.map((item) => (item.id === options.inputId ? { ...item, ...options.patch } : item));
}

export function appendCustomInputConfig(options: {
  items: CustomInputConfig[];
  inputType: CustomInputConfig["inputType"];
  buildCustomInputConfig: (inputType: CustomInputConfig["inputType"]) => CustomInputConfig;
}) {
  return [...options.items, options.buildCustomInputConfig(options.inputType)];
}

export function removeSkillInputConfigById<T extends { id: string }>(items: T[], inputId: string) {
  return items.filter((item) => item.id !== inputId);
}
