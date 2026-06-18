import type {
  SkillCenterLeafConfig,
  SkillCenterPrimaryConfig,
  SkillCenterSectionConfig,
} from "@shared/skill-center-manifest";
import type { SkillAssetBindingRecord } from "../../../services/admin";

export function countSkillCenterLeaves(tree: SkillCenterPrimaryConfig[]) {
  return tree.reduce(
    (total, primary) => total + primary.sections.reduce((sum, section) => sum + section.items.length, 0),
    0,
  );
}

export function filterSkillCenterTree(options: {
  tree: SkillCenterPrimaryConfig[];
  skillAssetBindings: SkillAssetBindingRecord[];
  keyword: string;
  moduleFilter: string;
  packageFilter: string;
}) {
  const normalizedKeyword = options.keyword.trim().toLowerCase();

  return options.tree
    .map((primary) => ({
      ...primary,
      sections: primary.sections
        .map((section) => ({
          ...section,
          items: section.items.filter((leaf) =>
            isSkillLeafVisible({
              leaf,
              skillAssetBindings: options.skillAssetBindings,
              keyword: normalizedKeyword,
              moduleFilter: options.moduleFilter,
              packageFilter: options.packageFilter,
            }),
          ),
        }))
        .filter((section) => section.items.length > 0),
    }))
    .filter((primary) => primary.sections.length > 0);
}

export function resolveActiveSkillSelection(options: {
  filteredSkillTree: SkillCenterPrimaryConfig[];
  activeSkillPrimaryId: string;
  activeSkillSectionId: string;
  activeSkillLeafId: string;
}) {
  const activeSkillPrimary =
    options.filteredSkillTree.find((item) => item.id === options.activeSkillPrimaryId) || options.filteredSkillTree[0];
  const activeSkillSection =
    activeSkillPrimary?.sections.find((item) => item.id === options.activeSkillSectionId) || activeSkillPrimary?.sections[0];
  const activeSkillLeaf =
    activeSkillSection?.items.find((item) => item.id === options.activeSkillLeafId) || activeSkillSection?.items[0];

  return {
    activeSkillPrimary,
    activeSkillSection,
    activeSkillLeaf,
  };
}

function isSkillLeafVisible(options: {
  leaf: SkillCenterLeafConfig;
  skillAssetBindings: SkillAssetBindingRecord[];
  keyword: string;
  moduleFilter: string;
  packageFilter: string;
}) {
  const bindings = options.skillAssetBindings.filter(
    (item) =>
      (options.leaf.skillSlug && item.skillSlug === options.leaf.skillSlug)
      || (options.leaf.promptScene && item.promptScene === options.leaf.promptScene),
  );
  const keywordMatched =
    !options.keyword
    || [
      options.leaf.label,
      options.leaf.description,
      options.leaf.skillSlug,
      options.leaf.promptScene,
      ...bindings.flatMap((item) => [...item.moduleKeys, ...item.packageKeys, ...item.packageNames]),
    ]
      .join(" ")
      .toLowerCase()
      .includes(options.keyword);
  const moduleMatched =
    options.moduleFilter === "ALL" || bindings.some((item) => item.moduleKeys.includes(options.moduleFilter));
  const packageMatched =
    options.packageFilter === "ALL" || bindings.some((item) => item.packageKeys.includes(options.packageFilter));

  return keywordMatched && moduleMatched && packageMatched;
}

export type {
  SkillCenterLeafConfig,
  SkillCenterPrimaryConfig,
  SkillCenterSectionConfig,
};
