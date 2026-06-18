import type {
  ModuleDefinitionRecord,
  PromptTemplateRecord,
  SkillAssetBindingRecord,
  SkillConfigRecord,
  SkillPackageDetailRecord,
  SkillPackageModuleRecord,
  SkillPackageSkillRecord,
} from "../../../services/admin";

export function resolveActiveSkillRelations(options: {
  activeSkillLeaf?: { skillSlug?: string; promptScene?: string };
  activeSkillConfig?: SkillConfigRecord;
  skillAssetBindings: SkillAssetBindingRecord[];
  skillPackageSkills: SkillPackageSkillRecord[];
  skillPackageModules: SkillPackageModuleRecord[];
  skillPackageDetailMap: Record<string, SkillPackageDetailRecord>;
  modules: ModuleDefinitionRecord[];
  prompts: PromptTemplateRecord[];
}) {
  const activeSkillBindings = options.skillAssetBindings.filter(
    (item) =>
      (options.activeSkillLeaf?.skillSlug && item.skillSlug === options.activeSkillLeaf.skillSlug)
      || (options.activeSkillLeaf?.promptScene && item.promptScene === options.activeSkillLeaf.promptScene),
  );
  const activeExactPromptBinding = activeSkillBindings.find(
    (item) => item.promptScene === options.activeSkillLeaf?.promptScene,
  );
  const activePrimaryPromptBinding = activeSkillBindings.find((item) => item.isPrimary) || activeSkillBindings[0];
  const resolvedActivePromptScene =
    activeExactPromptBinding?.promptScene
    || activePrimaryPromptBinding?.promptScene
    || options.activeSkillLeaf?.promptScene;
  const activePromptConfig = resolvedActivePromptScene
    ? options.prompts.find((item) => item.scene === resolvedActivePromptScene)
    : undefined;

  const activeSkillModuleKeys = Array.from(new Set(activeSkillBindings.flatMap((item) => item.moduleKeys)));
  const activeSkillPackageKeys = Array.from(new Set(activeSkillBindings.flatMap((item) => item.packageKeys)));
  const activeSkillModules = options.modules.filter((item) => activeSkillModuleKeys.includes(item.moduleKey));
  const activeSkillModuleLabel = activeSkillModules.length
    ? activeSkillModules.map((item) => item.moduleName).join(" / ")
    : activeSkillModuleKeys.length
      ? activeSkillModuleKeys.join(" / ")
      : "-";

  const activeSkillPackageNames = Array.from(
    new Set([
      ...options.skillPackageSkills
        .filter((item) => activeSkillPackageKeys.includes(item.packageKey))
        .map((item) => item.packageName),
      ...options.skillPackageModules
        .filter((item) => activeSkillPackageKeys.includes(item.packageKey))
        .map((item) => item.packageName),
      ...activeSkillBindings.flatMap((item) => item.packageNames),
    ]),
  );
  const activeSkillPackageLabel = activeSkillPackageNames.length ? activeSkillPackageNames.join(" / ") : "-";
  const activeSkillBindingLabel =
    activeSkillBindings[0]?.remarks
    || (activeSkillPackageNames.length || activeSkillModules.length ? "已建立技能归属映射" : "暂未建立技能归属映射");

  const activeSkillSlug = options.activeSkillConfig?.slug;
  const activeSkillRelations = activeSkillSlug
    ? options.skillPackageSkills.filter((item) => item.skillSlug === activeSkillSlug && item.enabled)
    : [];
  const activePrimarySkillRelation =
    activeSkillRelations.find((item) => activeSkillPackageKeys.includes(item.packageKey))
    || activeSkillRelations[0];
  const activeSkillPackageDetail = activePrimarySkillRelation
    ? options.skillPackageDetailMap[activePrimarySkillRelation.packageId]
    : undefined;
  const activeSkillFlow = activePrimarySkillRelation
    ? options.skillPackageSkills
        .filter((item) => item.packageKey === activePrimarySkillRelation.packageKey && item.enabled)
        .sort((left, right) => left.sortOrder - right.sortOrder)
    : [];
  const activeSkillFlowIndex = activePrimarySkillRelation
    ? activeSkillFlow.findIndex((item) => item.id === activePrimarySkillRelation.id)
    : -1;
  const upstreamSkillNames =
    activeSkillFlowIndex > 0
      ? activeSkillFlow.slice(0, activeSkillFlowIndex).map((item) => item.skillName || item.skillSlug)
      : [];
  const downstreamSkillNames =
    activeSkillFlowIndex >= 0
      ? activeSkillFlow.slice(activeSkillFlowIndex + 1).map((item) => item.skillName || item.skillSlug)
      : [];
  const activeOutputSummary = downstreamSkillNames.length
    ? `当前技能输出将继续传递给：${downstreamSkillNames.join(" -> ")}`
    : "当前技能输出为能力包终态输出，或进入人工审核 / 发布环节。";
  const activeReferenceAssets = activeSkillPackageDetail?.references || [];
  const activeScriptAssets = activeSkillPackageDetail?.scripts || [];
  const activeSkillAssetSourceLabel = activePrimarySkillRelation?.packageName || activeSkillPackageLabel;

  return {
    activeSkillBindings,
    activeExactPromptBinding,
    activePrimaryPromptBinding,
    resolvedActivePromptScene,
    activePromptConfig,
    activeSkillModuleKeys,
    activeSkillPackageKeys,
    activeSkillModules,
    activeSkillModuleLabel,
    activeSkillPackageNames,
    activeSkillPackageLabel,
    activeSkillBindingLabel,
    activeSkillRelations,
    activePrimarySkillRelation,
    activeSkillPackageDetail,
    activeSkillFlow,
    activeSkillFlowIndex,
    upstreamSkillNames,
    downstreamSkillNames,
    activeOutputSummary,
    activeReferenceAssets,
    activeScriptAssets,
    activeSkillAssetSourceLabel,
  };
}
