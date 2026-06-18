import type {
  ModuleDefinitionRecord,
  SkillAssetBindingRecord,
  SkillPackageModuleRecord,
  SkillPackageSkillRecord,
} from "../../../services/admin";
import { skillAssetBindingSeed } from "../../../services/admin";

export type SkillFilterOption = {
  value: string;
  label: string;
};

export type SkillPackageFilterOption = SkillFilterOption & {
  packageId: string;
};

export function buildPackageIdFromKey(packageKey: string) {
  return `sp_${String(packageKey || "")
    .trim()
    .toLowerCase()
    .replace(/-/g, "_")}`;
}

export function buildSkillModuleFilterOptions(modules: ModuleDefinitionRecord[]): SkillFilterOption[] {
  return modules.map((item) => ({
    value: item.moduleKey,
    label: item.moduleName,
  }));
}

export function buildSkillPackageFilterOptions(options: {
  skillPackageModules: SkillPackageModuleRecord[];
  skillPackageSkills: SkillPackageSkillRecord[];
}): SkillPackageFilterOption[] {
  const packageMap = new Map<string, { label: string; packageId: string }>();

  options.skillPackageModules.forEach((item) => {
    packageMap.set(item.packageKey, {
      label: item.packageName,
      packageId: item.packageId,
    });
  });
  options.skillPackageSkills.forEach((item) => {
    packageMap.set(item.packageKey, {
      label: item.packageName,
      packageId: item.packageId,
    });
  });
  skillAssetBindingSeed.forEach((item) => {
    item.packageKeys.forEach((packageKey, index) => {
      if (!packageMap.has(packageKey)) {
        packageMap.set(packageKey, {
          label: item.packageNames[index] || packageKey,
          packageId: buildPackageIdFromKey(packageKey),
        });
      }
    });
  });

  return Array.from(packageMap.entries())
    .map(([value, meta]) => ({ value, label: meta.label, packageId: meta.packageId }))
    .sort((left, right) => left.label.localeCompare(right.label, "zh-CN"));
}

export function mergeSkillAssetBindings(
  records: SkillAssetBindingRecord[],
  skillPackageSkills: SkillPackageSkillRecord[] = [],
  skillPackageModules: SkillPackageModuleRecord[] = [],
) {
  return records.map((item) =>
    mergeSkillAssetBindingRecord(skillAssetBindingSeed, item, skillPackageSkills, skillPackageModules),
  );
}

export function mergeSkillAssetBindingRecord(
  existingList: SkillAssetBindingRecord[],
  incoming: SkillAssetBindingRecord,
  skillPackageSkills: SkillPackageSkillRecord[] = [],
  skillPackageModules: SkillPackageModuleRecord[] = [],
): SkillAssetBindingRecord {
  const matched =
    existingList.find((item) => incoming.id && item.id === incoming.id)
    || existingList.find((item) => incoming.skillSlug && item.skillSlug === incoming.skillSlug)
    || skillAssetBindingSeed.find((item) => incoming.skillSlug && item.skillSlug === incoming.skillSlug)
    || skillAssetBindingSeed.find((item) => incoming.promptScene && item.promptScene === incoming.promptScene);
  const resolvedSkillSlug = incoming.skillSlug || matched?.skillSlug;
  const relatedPackageBindings = resolvedSkillSlug
    ? skillPackageSkills.filter((item) => item.skillSlug === resolvedSkillSlug && item.enabled)
    : [];
  const packageNameMap = new Map<string, string>();
  matched?.packageKeys?.forEach((packageKey, index) => {
    packageNameMap.set(packageKey, matched.packageNames[index] || packageKey);
  });
  incoming.packageKeys?.forEach((packageKey, index) => {
    packageNameMap.set(packageKey, incoming.packageNames?.[index] || packageKey);
  });
  relatedPackageBindings.forEach((item) => {
    packageNameMap.set(item.packageKey, item.packageName);
  });
  const resolvedPackageKeys = Array.from(
    new Set([
      ...(incoming.packageKeys || []),
      ...relatedPackageBindings.map((item) => item.packageKey),
      ...(matched?.packageKeys || []),
    ]),
  );
  const derivedModuleKeys = relatedPackageBindings.flatMap((item) =>
    skillPackageModules
      .filter((relation) => relation.packageKey === item.packageKey && relation.enabled)
      .map((relation) => relation.moduleKey),
  );
  const resolvedModuleKeys = Array.from(
    new Set([...(incoming.moduleKeys || []), ...derivedModuleKeys, ...(matched?.moduleKeys || [])]),
  );

  return {
    id: incoming.id || matched?.id || `sab_${incoming.skillSlug || incoming.promptScene || Date.now()}`,
    skillId: incoming.skillId || matched?.skillId,
    skillSlug: incoming.skillSlug || matched?.skillSlug,
    skillName: incoming.skillName || matched?.skillName,
    promptId: incoming.promptId || matched?.promptId,
    promptScene: incoming.promptScene || matched?.promptScene,
    promptName: incoming.promptName || matched?.promptName,
    bindingType: incoming.bindingType || matched?.bindingType || "PRIMARY",
    isPrimary: incoming.isPrimary ?? matched?.isPrimary ?? true,
    sortOrder: incoming.sortOrder ?? matched?.sortOrder ?? 100,
    enabled: incoming.enabled ?? matched?.enabled ?? true,
    moduleKeys: resolvedModuleKeys,
    packageKeys: resolvedPackageKeys,
    packageNames: resolvedPackageKeys.map((packageKey) => packageNameMap.get(packageKey) || packageKey),
    remarks: incoming.remarks ?? matched?.remarks,
  };
}
