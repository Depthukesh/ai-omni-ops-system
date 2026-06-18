import {
  InstallSkillResult,
  SkillConfigRecord,
} from "../../../services/admin";
import type { SkillPackageFilterOption } from "./skill-asset-bindings";

export type InstallSkillDraft = {
  sourceType: InstallSkillResult["sourceType"];
  githubUrl: string;
  archiveFileName: string;
  archiveBase64: string;
  category: string;
  status: SkillConfigRecord["status"];
  provider: string;
  defaultModel: string;
  pointsCost: string;
  descriptionPrefix: string;
  moduleKey: "NONE" | string;
  packageKey: "NONE" | string;
  promptScene: string;
  bindingRemarks: string;
};

export function buildInstallSkillDraft(): InstallSkillDraft {
  return {
    sourceType: "GITHUB",
    githubUrl: "",
    archiveFileName: "",
    archiveBase64: "",
    category: "内容生产",
    status: "DRAFT",
    provider: "",
    defaultModel: "",
    pointsCost: "120",
    descriptionPrefix: "",
    moduleKey: "NONE",
    packageKey: "NONE",
    promptScene: "",
    bindingRemarks: "",
  };
}

export function readFileAsBase64(file: File) {
  return new Promise<string>((resolvePromise, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const raw = String(reader.result || "");
      const [, base64 = ""] = raw.split(",");
      resolvePromise(base64);
    };
    reader.onerror = () => reject(reader.error || new Error("读取压缩包失败"));
    reader.readAsDataURL(file);
  });
}

export function buildInstallSkillRequestPayload(draft: InstallSkillDraft, packageOption?: SkillPackageFilterOption) {
  return {
    sourceType: draft.sourceType,
    githubUrl: draft.sourceType === "GITHUB" ? draft.githubUrl.trim() : undefined,
    archiveFileName: draft.sourceType === "ZIP_UPLOAD" ? draft.archiveFileName : undefined,
    archiveBase64: draft.sourceType === "ZIP_UPLOAD" ? draft.archiveBase64 : undefined,
    category: draft.category.trim(),
    provider: draft.provider.trim(),
    defaultModel: draft.defaultModel.trim(),
    status: draft.status,
    pointsCost: Number(draft.pointsCost || 0),
    descriptionPrefix: draft.descriptionPrefix.trim() || undefined,
    packageId: draft.packageKey !== "NONE" ? packageOption?.packageId : undefined,
    packageKey: draft.packageKey !== "NONE" ? draft.packageKey : undefined,
    packageName: draft.packageKey !== "NONE" ? packageOption?.label || draft.packageKey : undefined,
    bindingRemarks: draft.bindingRemarks.trim() || undefined,
  };
}

export function resolveInstalledSkillPromptScene(draft: InstallSkillDraft, result: InstallSkillResult) {
  return draft.promptScene.trim() || result.initialPrompt?.scene || undefined;
}

export function resolveInstalledSkillBindingOptions(draft: InstallSkillDraft) {
  return {
    moduleKey: draft.moduleKey,
    packageKey: draft.packageKey,
    bindingRemarks: draft.bindingRemarks,
  };
}

export function buildInstallSkillNotice(options: {
  draft: InstallSkillDraft;
  result: InstallSkillResult;
}) {
  const parsedOverviewSummary = [
    options.result.parsedOverview.stepSummaries.length ? `解析步骤 ${options.result.parsedOverview.stepSummaries.length}` : "",
    options.result.parsedOverview.inputHints.length ? `输入要点 ${options.result.parsedOverview.inputHints.length}` : "",
    options.result.parsedOverview.outputHints.length ? `输出要点 ${options.result.parsedOverview.outputHints.length}` : "",
  ].filter(Boolean).join("，");

  const importedAssetsSummary =
    options.draft.packageKey !== "NONE" && options.result.importedAssets
      ? `，已导入能力包资产 ${options.result.importedAssets.importedReferenceCount}/${options.result.referenceFileCount} References，${options.result.importedAssets.importedScriptCount}/${options.result.scriptFileCount} Scripts`
      : options.draft.packageKey !== "NONE"
        ? "，能力包已绑定，资产导入结果待确认"
        : "";
  const inputSchema = options.result.skill.inputSchemaJson;
  const structuredInputsSummary = inputSchema
    ? `，结构化输入 ${inputSchema.databaseInputs.length}/${inputSchema.knowledgeInputs.length}/${inputSchema.customInputs.length}（数据库/知识库/自定义）`
    : "";

  return `技能已安装：${options.result.detectedSkillName}（References ${options.result.referenceFileCount}，Scripts ${options.result.scriptFileCount}${options.result.initialPrompt ? "，已生成初始提示词" : ""}${parsedOverviewSummary ? `，${parsedOverviewSummary}` : ""}${structuredInputsSummary}${importedAssetsSummary}）`;
}
