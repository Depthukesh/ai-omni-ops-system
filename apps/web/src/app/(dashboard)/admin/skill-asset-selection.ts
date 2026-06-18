type SkillAssetSelectionDraft = {
  referenceAssetKeys: string[];
  scriptAssetKeys: string[];
  hasReferenceAssetSelection: boolean;
  hasScriptAssetSelection: boolean;
};

type ReferenceLikeAsset = {
  referenceKey: string;
};

type ScriptLikeAsset = {
  scriptKey: string;
};

export function resolveEffectiveInheritedReferenceKeys(options: {
  draft?: SkillAssetSelectionDraft;
  activeReferenceAssets: ReferenceLikeAsset[];
}) {
  return options.draft?.hasReferenceAssetSelection
    ? options.draft.referenceAssetKeys
    : options.activeReferenceAssets.map((item) => item.referenceKey);
}

export function resolveEffectiveInheritedScriptKeys(options: {
  draft?: SkillAssetSelectionDraft;
  activeScriptAssets: ScriptLikeAsset[];
}) {
  return options.draft?.hasScriptAssetSelection
    ? options.draft.scriptAssetKeys
    : options.activeScriptAssets.map((item) => item.scriptKey);
}

export function buildInheritedAssetSourceSummary(options: {
  hasPrimaryRelation: boolean;
  assetSourceLabel: string;
  assetCount: number;
  selectedCount: number;
  hasExplicitSelection: boolean;
  assetType: "References" | "Scripts";
}) {
  if (!options.hasPrimaryRelation) {
    return `当前技能尚未绑定能力包，暂无可继承 ${options.assetType} 资产`;
  }

  return `${options.assetSourceLabel} / ${options.assetCount} 项 / ${options.hasExplicitSelection ? `已选 ${options.selectedCount} 项` : "默认全继承"}`;
}

export function buildInheritedAssetCardSummary(options: {
  hasExplicitSelection: boolean;
  assetType: "References" | "Scripts";
}) {
  if (options.assetType === "References") {
    return options.hasExplicitSelection
      ? "当前技能已从所属能力包资产中选择子集；保存后会随技能说明一起持久化。"
      : "当前技能默认继承所属能力包中的全部 References 资产；勾选后可收口为技能级选择。";
  }

  return options.hasExplicitSelection
    ? "当前技能已从所属能力包脚本中选择子集；保存后会随技能说明一起持久化。"
    : "当前技能默认继承所属能力包中的全部 Scripts 资产；勾选后可收口为技能级选择。";
}

export function toggleInheritedAssetKeys(options: {
  currentKeys: string[];
  targetKey: string;
  checked: boolean;
}) {
  return options.checked
    ? Array.from(new Set([...options.currentKeys, options.targetKey]))
    : options.currentKeys.filter((item) => item !== options.targetKey);
}
