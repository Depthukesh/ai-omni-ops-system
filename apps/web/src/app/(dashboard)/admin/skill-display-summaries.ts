import type {
  KnowledgeBaseFileRecord,
  KnowledgeBaseRecord,
  PromptTemplateRecord,
  SkillConfigRecord,
} from "../../../services/admin";

type DatabaseInputSummaryConfig = {
  parameterType: "INJECT_TOGGLE" | "SELECT_CHOICE";
  parameterKey: string;
  parameterLabel: string;
  selectedValue: string;
};

type KnowledgeInputSummaryConfig = {
  knowledgeBaseName: string;
  targetContentLabel: string;
};

type CustomInputSummaryConfig = {
  label: string;
  inputType: "SELECT" | "TEXT" | "FILE";
};

type SkillDisplayDraft = {
  status: SkillConfigRecord["status"];
  defaultModel: string;
  pointsCost: string;
  databaseInputs: DatabaseInputSummaryConfig[];
  knowledgeInputs: KnowledgeInputSummaryConfig[];
  customInputs: CustomInputSummaryConfig[];
};

type PromptDisplayDraft = {
  status: PromptTemplateRecord["status"];
  modelName: string;
};

type DatabaseSelectValueOption = {
  value: string;
  label: string;
};

type KnowledgeBaseSummaryRecord = {
  value: string;
  label: string;
  documentCount: number;
};

export function resolveSkillDisplaySummaries(options: {
  knowledgeBases: KnowledgeBaseRecord[];
  knowledgeBaseFiles: KnowledgeBaseFileRecord[];
  activeSkillDraft?: SkillDisplayDraft;
  activePromptDraft?: PromptDisplayDraft;
  activeSkillConfig?: SkillConfigRecord;
  activePromptConfig?: PromptTemplateRecord;
  databaseParameterSummary: string[];
  getDatabaseSelectValueOptions: (parameterKey: string, currentValue?: string) => DatabaseSelectValueOption[];
  formatDateTime: (value: string) => string;
}) {
  const activeKnowledgeBaseSummary = options.knowledgeBases
    .filter((item) => item.status === "ACTIVE")
    .slice(0, 6)
    .map((item) => item.name);
  const activeKnowledgeBaseRecords: KnowledgeBaseSummaryRecord[] = options.knowledgeBases
    .filter((item) => item.status !== "DISABLED")
    .map((item) => ({ value: item.id, label: item.name, documentCount: item.documentCount }));
  const activeKnowledgeBaseOptions = activeKnowledgeBaseRecords.map((item) => ({ value: item.value, label: item.label }));
  const knowledgeBaseFileCountMap = options.knowledgeBaseFiles.reduce<Record<string, number>>((accumulator, item) => {
    if (item.status === "FAILED") {
      return accumulator;
    }
    accumulator[item.knowledgeBaseId] = (accumulator[item.knowledgeBaseId] || 0) + 1;
    return accumulator;
  }, {});
  const knowledgeBaseSyncSummary = activeKnowledgeBaseRecords
    .slice(0, 6)
    .map((item) => `${item.label} ${knowledgeBaseFileCountMap[item.value] || 0} 项`);
  const databaseInputSummary = (options.activeSkillDraft?.databaseInputs || [])
    .map((item) => {
      if (item.parameterType === "INJECT_TOGGLE") {
        return `${item.parameterLabel || item.parameterKey}：${item.selectedValue === "INJECT" ? "植入" : "不植入"}`;
      }
      const matchedOption = options.getDatabaseSelectValueOptions(item.parameterKey, item.selectedValue)
        .find((option) => option.value === item.selectedValue);
      return `${item.parameterLabel || item.parameterKey}：${matchedOption?.label || "未选择"}`;
    })
    .join(" / ");
  const databaseParameterSyncSummary = options.databaseParameterSummary.join(" / ");
  const knowledgeInputSummary = (options.activeSkillDraft?.knowledgeInputs || [])
    .map((item) => `${item.knowledgeBaseName || "未选择知识库"}：${item.targetContentLabel || "整库检索"}`)
    .join(" / ");
  const customInputSummary = (options.activeSkillDraft?.customInputs || [])
    .map((item) => `${item.label || "未命名参数"}（${item.inputType === "SELECT" ? "下拉" : item.inputType === "FILE" ? "上传" : "输入"}）`)
    .join(" / ");
  const skillCenterStatus = options.activePromptDraft?.status || options.activeSkillDraft?.status || "DRAFT";
  const skillCenterModel = options.activePromptDraft?.modelName || options.activeSkillDraft?.defaultModel || "";
  const skillCenterPointsCost = options.activeSkillDraft?.pointsCost || `${options.activeSkillConfig?.pointsCost || 180}`;
  const skillCenterUpdatedAt = options.activePromptConfig?.updatedAt || options.activeSkillConfig?.updatedAt;
  const skillCenterUpdatedAtLabel = skillCenterUpdatedAt ? options.formatDateTime(skillCenterUpdatedAt) : "自动更新";

  return {
    activeKnowledgeBaseSummary,
    activeKnowledgeBaseRecords,
    activeKnowledgeBaseOptions,
    knowledgeBaseFileCountMap,
    knowledgeBaseSyncSummary,
    databaseInputSummary,
    databaseParameterSyncSummary,
    knowledgeInputSummary,
    customInputSummary,
    skillCenterStatus,
    skillCenterModel,
    skillCenterPointsCost,
    skillCenterUpdatedAt,
    skillCenterUpdatedAtLabel,
  };
}
