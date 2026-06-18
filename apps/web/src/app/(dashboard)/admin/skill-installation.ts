import type {
  createReferenceAsset,
  createScriptAsset,
  InstallSkillResult,
  SkillConfigRecord,
} from "../../../services/admin";

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

export type InstalledAssetsImportResult = {
  importedReferenceCount: number;
  importedScriptCount: number;
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

export function buildPackageIdFromKey(packageKey: string) {
  return `sp_${String(packageKey || "")
    .trim()
    .toLowerCase()
    .replace(/-/g, "_")}`;
}

export function buildInstallSkillRequestPayload(draft: InstallSkillDraft) {
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

export async function importInstalledAssetsToPackage(options: {
  packageKey: string;
  packageId: string;
  result: InstallSkillResult;
  createReferenceAsset: typeof createReferenceAsset;
  createScriptAsset: typeof createScriptAsset;
}): Promise<InstalledAssetsImportResult> {
  if (options.packageKey === "NONE") {
    return {
      importedReferenceCount: 0,
      importedScriptCount: 0,
    };
  }

  let importedReferenceCount = 0;
  let importedScriptCount = 0;

  for (const reference of options.result.references) {
    try {
      await options.createReferenceAsset(options.packageId, {
        referenceKey: reference.referenceKey,
        title: reference.title,
        sourceType: reference.sourceType,
        sourceUri: reference.sourceUri,
        usageNote: reference.usageNote,
        applicableScopes: reference.applicableScopes,
        sortOrder: reference.sortOrder,
      });
      importedReferenceCount += 1;
    } catch {
      // Duplicate keys or package state issues should not break the whole install flow.
    }
  }

  for (const script of options.result.scripts) {
    try {
      await options.createScriptAsset(options.packageId, {
        scriptKey: script.scriptKey,
        scriptName: script.scriptName,
        runtime: script.runtime,
        entry: script.entry,
        usageNote: script.usageNote,
        sortOrder: script.sortOrder,
      });
      importedScriptCount += 1;
    } catch {
      // Duplicate keys or package state issues should not break the whole install flow.
    }
  }

  return {
    importedReferenceCount,
    importedScriptCount,
  };
}

export function buildInstallSkillNotice(options: {
  draft: InstallSkillDraft;
  result: InstallSkillResult;
  importedAssets: InstalledAssetsImportResult;
}) {
  const parsedOverviewSummary = [
    options.result.parsedOverview.stepSummaries.length ? `解析步骤 ${options.result.parsedOverview.stepSummaries.length}` : "",
    options.result.parsedOverview.inputHints.length ? `输入要点 ${options.result.parsedOverview.inputHints.length}` : "",
    options.result.parsedOverview.outputHints.length ? `输出要点 ${options.result.parsedOverview.outputHints.length}` : "",
  ].filter(Boolean).join("，");

  return `技能已安装：${options.result.detectedSkillName}（References ${options.result.referenceFileCount}，Scripts ${options.result.scriptFileCount}${options.result.initialPrompt ? "，已生成初始提示词" : ""}${parsedOverviewSummary ? `，${parsedOverviewSummary}` : ""}${options.draft.packageKey !== "NONE" ? `，已导入能力包资产 ${options.importedAssets.importedReferenceCount}/${options.result.referenceFileCount} References，${options.importedAssets.importedScriptCount}/${options.result.scriptFileCount} Scripts` : ""}）`;
}
