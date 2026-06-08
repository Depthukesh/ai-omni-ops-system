"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getSkillPackageKnowledgeSpaces,
  getSkillPackageModules,
  getSkillPackageSkills,
  skillPackageKnowledgeSpaceSeed,
  skillPackageModuleSeed,
  skillPackageSkillSeed,
  type KnowledgeBaseRecord,
  type ModuleDefinitionRecord,
  type SkillAssetBindingRecord,
  type SkillConfigRecord,
  type SkillPackageKnowledgeSpaceRecord,
  type SkillPackageModuleRecord,
  type SkillPackageRecord,
  type SkillPackageSkillRecord,
} from "../../../services/admin";

type GovernanceSectionKey = "moduleRelations" | "skillRelations" | "knowledgeRelations";

type SkillPackageGovernanceOverviewPanelProps = {
  modules: ModuleDefinitionRecord[];
  skills: SkillConfigRecord[];
  skillPackages: SkillPackageRecord[];
  skillAssetBindings: SkillAssetBindingRecord[];
  knowledgeBases: KnowledgeBaseRecord[];
  dataSource: "api" | "seed";
  onNotice: (message: string) => void;
  onError: (message: string) => void;
  onOpenSection: (section: GovernanceSectionKey) => void;
};

export function SkillPackageGovernanceOverviewPanel(props: SkillPackageGovernanceOverviewPanelProps) {
  const [moduleRelations, setModuleRelations] = useState<SkillPackageModuleRecord[]>(skillPackageModuleSeed);
  const [skillRelations, setSkillRelations] = useState<SkillPackageSkillRecord[]>(skillPackageSkillSeed);
  const [knowledgeRelations, setKnowledgeRelations] = useState<SkillPackageKnowledgeSpaceRecord[]>(skillPackageKnowledgeSpaceSeed);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    void loadOverviewData();
  }, [props.dataSource]);

  async function loadOverviewData() {
    if (props.dataSource === "seed") {
      setModuleRelations(skillPackageModuleSeed);
      setSkillRelations(skillPackageSkillSeed);
      setKnowledgeRelations(skillPackageKnowledgeSpaceSeed);
      return;
    }

    setIsLoading(true);
    try {
      const [nextModuleRelations, nextSkillRelations, nextKnowledgeRelations] = await Promise.all([
        getSkillPackageModules(),
        getSkillPackageSkills(),
        getSkillPackageKnowledgeSpaces(),
      ]);
      setModuleRelations(nextModuleRelations);
      setSkillRelations(nextSkillRelations);
      setKnowledgeRelations(nextKnowledgeRelations);
    } catch (error) {
      const message = error instanceof Error ? error.message : "读取关系治理总览失败";
      props.onError(`读取关系治理总览失败：${message}`);
      setModuleRelations(skillPackageModuleSeed);
      setSkillRelations(skillPackageSkillSeed);
      setKnowledgeRelations(skillPackageKnowledgeSpaceSeed);
    } finally {
      setIsLoading(false);
    }
  }

  const moduleOverview = useMemo(() => {
    const unresolvedPackageKeys = new Set<string>();
    let missingRelationCount = 0;
    let duplicateRelationCount = 0;
    let invalidDefaultCount = 0;
    let driftCount = 0;
    const items = props.modules
      .map((module) => {
        const declaredPackageKeys = Array.from(new Set(module.defaultSkillPackages.map((item) => String(item || "").trim()).filter(Boolean)));
        const targetRelations = moduleRelations.filter((item) => item.moduleKey === module.moduleKey);
        const relationDefaultKeys = Array.from(
          new Set(
            targetRelations
              .filter((item) => item.enabled && item.isDefault && item.bindingType === "DEFAULT")
              .map((item) => item.packageKey),
          ),
        );
        const existingKeys = new Set(targetRelations.map((item) => item.packageKey));
        const missingKeys = declaredPackageKeys.filter((item) => !existingKeys.has(item));
        const unresolvedKeys = missingKeys.filter((packageKey) => !props.skillPackages.some((item) => item.packageKey === packageKey));
        unresolvedKeys.forEach((item) => unresolvedPackageKeys.add(item));
        const duplicateKeys = Array.from(new Set(targetRelations.map((item) => item.packageKey))).filter(
          (packageKey) => targetRelations.filter((item) => item.packageKey === packageKey).length > 1,
        );
        const invalidDefaults = targetRelations.filter((item) => item.enabled && item.isDefault && item.bindingType !== "DEFAULT");
        const hasDrift = declaredPackageKeys.join("|") !== relationDefaultKeys.join("|");
        if (!missingKeys.length && !duplicateKeys.length && !invalidDefaults.length && !hasDrift) {
          return null;
        }
        missingRelationCount += missingKeys.length;
        duplicateRelationCount += duplicateKeys.length;
        invalidDefaultCount += invalidDefaults.length;
        driftCount += Number(hasDrift);
        return {
          moduleKey: module.moduleKey,
          moduleName: module.moduleName,
          missingKeys,
          unresolvedKeys,
          duplicateKeys,
          invalidDefaults,
          hasDrift,
        };
      })
      .filter(Boolean) as Array<{
      moduleKey: string;
      moduleName: string;
      missingKeys: string[];
      unresolvedKeys: string[];
      duplicateKeys: string[];
      invalidDefaults: SkillPackageModuleRecord[];
      hasDrift: boolean;
    }>;

    return {
      itemCount: items.length,
      missingRelationCount,
      duplicateRelationCount,
      invalidDefaultCount,
      driftCount,
      unresolvedPackageKeys: Array.from(unresolvedPackageKeys),
      items,
    };
  }, [moduleRelations, props.modules, props.skillPackages]);

  const skillOverview = useMemo(() => {
    const unresolvedPackageKeys = new Set<string>();
    let missingRelationCount = 0;
    let duplicateRelationCount = 0;
    let invalidDefaultCount = 0;
    let primaryMismatchCount = 0;
    const items = props.skills
      .map((skill) => {
        const bindingEntries = props.skillAssetBindings.filter((item) => item.skillId === skill.id || item.skillSlug === skill.slug);
        const desiredPackageKeys = Array.from(new Set(bindingEntries.flatMap((item) => item.packageKeys).filter(Boolean)));
        const primaryPackageKeys = Array.from(
          new Set(
            bindingEntries
              .filter((item) => item.isPrimary || item.bindingType === "PRIMARY")
              .flatMap((item) => item.packageKeys)
              .filter(Boolean),
          ),
        );
        const targetRelations = skillRelations.filter((item) => item.skillId === skill.id);
        const existingKeys = new Set(targetRelations.map((item) => item.packageKey));
        const missingKeys = desiredPackageKeys.filter((item) => !existingKeys.has(item));
        const unresolvedKeys = missingKeys.filter((packageKey) => !props.skillPackages.some((item) => item.packageKey === packageKey));
        unresolvedKeys.forEach((item) => unresolvedPackageKeys.add(item));
        const duplicateKeys = Array.from(new Set(targetRelations.map((item) => item.packageKey))).filter(
          (packageKey) => targetRelations.filter((item) => item.packageKey === packageKey).length > 1,
        );
        const invalidDefaults = targetRelations.filter((item) => item.enabled && item.isDefault && item.bindingType !== "DEFAULT");
        const relationDefaultKeys = Array.from(
          new Set(targetRelations.filter((item) => item.enabled && item.isDefault).map((item) => item.packageKey)),
        );
        const hasMismatch = primaryPackageKeys.join("|") !== relationDefaultKeys.join("|");
        if (!missingKeys.length && !duplicateKeys.length && !invalidDefaults.length && !hasMismatch && primaryPackageKeys.length <= 1) {
          return null;
        }
        missingRelationCount += missingKeys.length;
        duplicateRelationCount += duplicateKeys.length;
        invalidDefaultCount += invalidDefaults.length;
        primaryMismatchCount += Number(hasMismatch || primaryPackageKeys.length > 1);
        return {
          skillId: skill.id,
          skillName: skill.name,
          missingKeys,
          unresolvedKeys,
          duplicateKeys,
          invalidDefaults,
          primaryPackageKeys,
          relationDefaultKeys,
          hasMismatch,
        };
      })
      .filter(Boolean) as Array<{
      skillId: string;
      skillName: string;
      missingKeys: string[];
      unresolvedKeys: string[];
      duplicateKeys: string[];
      invalidDefaults: SkillPackageSkillRecord[];
      primaryPackageKeys: string[];
      relationDefaultKeys: string[];
      hasMismatch: boolean;
    }>;

    return {
      itemCount: items.length,
      missingRelationCount,
      duplicateRelationCount,
      invalidDefaultCount,
      primaryMismatchCount,
      unresolvedPackageKeys: Array.from(unresolvedPackageKeys),
      items,
    };
  }, [props.skillAssetBindings, props.skillPackages, props.skills, skillRelations]);

  const knowledgeOverview = useMemo(() => {
    const unresolvedKnowledgeBaseIds = new Set<string>();
    let missingRelationCount = 0;
    let duplicateRelationCount = 0;
    let requiredOverrideCount = 0;
    let mismatchCount = 0;
    const items = props.skillPackages
      .map((skillPackage) => {
        const declaredKnowledgeBaseIds = Array.from(new Set(skillPackage.defaultKnowledgeSpaceIds.filter(Boolean)));
        const targetRelations = knowledgeRelations.filter((item) => item.packageId === skillPackage.id);
        const existingIds = new Set(targetRelations.map((item) => item.knowledgeBaseId));
        const missingIds = declaredKnowledgeBaseIds.filter((item) => !existingIds.has(item));
        const unresolvedIds = missingIds.filter((knowledgeBaseId) => !props.knowledgeBases.some((item) => item.id === knowledgeBaseId));
        unresolvedIds.forEach((item) => unresolvedKnowledgeBaseIds.add(item));
        const duplicateIds = Array.from(new Set(targetRelations.map((item) => item.knowledgeBaseId))).filter(
          (knowledgeBaseId) => targetRelations.filter((item) => item.knowledgeBaseId === knowledgeBaseId).length > 1,
        );
        const requiredOverrides = targetRelations.filter((item) => item.enabled && item.isRequired && item.relationType !== "DEFAULT");
        const relationDefaultIds = Array.from(
          new Set(targetRelations.filter((item) => item.enabled && item.relationType === "DEFAULT").map((item) => item.knowledgeBaseId)),
        );
        const hasMismatch = declaredKnowledgeBaseIds.join("|") !== relationDefaultIds.join("|");
        if (!missingIds.length && !duplicateIds.length && !requiredOverrides.length && !hasMismatch) {
          return null;
        }
        missingRelationCount += missingIds.length;
        duplicateRelationCount += duplicateIds.length;
        requiredOverrideCount += requiredOverrides.length;
        mismatchCount += Number(hasMismatch);
        return {
          packageId: skillPackage.id,
          packageName: skillPackage.packageName,
          missingIds,
          unresolvedIds,
          duplicateIds,
          requiredOverrides,
          hasMismatch,
        };
      })
      .filter(Boolean) as Array<{
      packageId: string;
      packageName: string;
      missingIds: string[];
      unresolvedIds: string[];
      duplicateIds: string[];
      requiredOverrides: SkillPackageKnowledgeSpaceRecord[];
      hasMismatch: boolean;
    }>;

    return {
      itemCount: items.length,
      missingRelationCount,
      duplicateRelationCount,
      requiredOverrideCount,
      mismatchCount,
      unresolvedKnowledgeBaseIds: Array.from(unresolvedKnowledgeBaseIds),
      items,
    };
  }, [knowledgeRelations, props.knowledgeBases, props.skillPackages]);

  const totalIssues =
    moduleOverview.itemCount +
    skillOverview.itemCount +
    knowledgeOverview.itemCount;

  return (
    <div className="admin-user-management" style={{ marginTop: 24 }}>
      <section className="entity-card admin-user-filter-card">
        <div className="admin-user-filter-head">
          <div>
            <span className="archive-pill status-ready">治理总览</span>
            <h3>能力包关系异常治理总览</h3>
            <p>把模块绑定、技能绑定、知识关系三类真源冲突集中展示，先看风险，再跳到对应关系面板收口。</p>
          </div>
          <div className="admin-user-filter-summary">
            <div>
              <span>总异常项</span>
              <strong>{totalIssues}</strong>
            </div>
            <div>
              <span>模块绑定</span>
              <strong>{moduleOverview.itemCount}</strong>
            </div>
            <div>
              <span>技能绑定</span>
              <strong>{skillOverview.itemCount}</strong>
            </div>
            <div>
              <span>知识关系</span>
              <strong>{knowledgeOverview.itemCount}</strong>
            </div>
          </div>
        </div>

        <div className="admin-user-filter-actions">
          <button type="button" className="secondary-button" onClick={() => void loadOverviewData()} disabled={isLoading}>
            {isLoading ? "刷新中..." : "刷新总览"}
          </button>
          <button type="button" className="primary-button" onClick={() => props.onOpenSection("moduleRelations")}>
            去模块绑定
          </button>
          <button type="button" className="primary-button" onClick={() => props.onOpenSection("skillRelations")}>
            去技能绑定
          </button>
          <button type="button" className="primary-button" onClick={() => props.onOpenSection("knowledgeRelations")}>
            去知识关系
          </button>
        </div>

        <div style={{ display: "grid", gap: 16, marginTop: 16 }}>
          <GovernanceOverviewSection
            title="模块绑定真源"
            description="关系表是模块与能力包的正式真源，重点看摘要漂移、默认关系缺口与重复挂载。"
            badge="MP"
            metricLines={[
              `待处理模块：${moduleOverview.itemCount}`,
              `缺失默认关系：${moduleOverview.missingRelationCount}`,
              `重复挂载：${moduleOverview.duplicateRelationCount}`,
              `默认标记异常：${moduleOverview.invalidDefaultCount}`,
              `摘要漂移：${moduleOverview.driftCount}`,
              `未识别能力包：${moduleOverview.unresolvedPackageKeys.length}`,
            ]}
            unresolvedLine={moduleOverview.unresolvedPackageKeys.length ? `未识别：${moduleOverview.unresolvedPackageKeys.join(" / ")}` : undefined}
            actionLabel="打开模块绑定治理"
            onAction={() => props.onOpenSection("moduleRelations")}
            items={moduleOverview.items.map((item) => ({
              key: item.moduleKey,
              title: item.moduleName,
              detail: [
                item.missingKeys.length ? `待补齐默认关系：${item.missingKeys.join(" / ")}` : "",
                item.duplicateKeys.length ? `重复挂载：${item.duplicateKeys.join(" / ")}` : "",
                item.invalidDefaults.length ? `默认标记异常：${item.invalidDefaults.map((entry) => `${entry.packageName} (${entry.bindingType})`).join(" / ")}` : "",
                item.hasDrift ? "摘要与关系表默认挂载存在漂移，建议按关系真源覆盖摘要。" : "",
              ].filter(Boolean),
            }))}
          />

          <GovernanceOverviewSection
            title="技能绑定真源"
            description="技能资产绑定是技能与能力包关系的上游真源，重点看主绑定漂移、缺失关系和重复记录。"
            badge="SK"
            metricLines={[
              `待处理技能：${skillOverview.itemCount}`,
              `缺失技能关系：${skillOverview.missingRelationCount}`,
              `重复关系：${skillOverview.duplicateRelationCount}`,
              `默认标记异常：${skillOverview.invalidDefaultCount}`,
              `主绑定不一致：${skillOverview.primaryMismatchCount}`,
              `未识别能力包：${skillOverview.unresolvedPackageKeys.length}`,
            ]}
            unresolvedLine={skillOverview.unresolvedPackageKeys.length ? `未识别：${skillOverview.unresolvedPackageKeys.join(" / ")}` : undefined}
            actionLabel="打开技能绑定治理"
            onAction={() => props.onOpenSection("skillRelations")}
            items={skillOverview.items.map((item) => ({
              key: item.skillId,
              title: item.skillName,
              detail: [
                item.missingKeys.length ? `待补齐关系：${item.missingKeys.join(" / ")}` : "",
                item.primaryPackageKeys.length ? `主绑定：${item.primaryPackageKeys.join(" / ")}` : "主绑定：未配置",
                item.hasMismatch ? `关系表默认挂载：${item.relationDefaultKeys.join(" / ") || "未配置"}` : "",
                item.duplicateKeys.length ? `重复关系：${item.duplicateKeys.join(" / ")}` : "",
                item.invalidDefaults.length ? `默认标记异常：${item.invalidDefaults.map((entry) => `${entry.packageName} (${entry.bindingType})`).join(" / ")}` : "",
              ].filter(Boolean),
            }))}
          />

          <GovernanceOverviewSection
            title="知识关系真源"
            description="能力包默认知识空间是知识关系真源，重点看缺失挂载、默认知识漂移和强制覆盖关系。"
            badge="KS"
            metricLines={[
              `待处理能力包：${knowledgeOverview.itemCount}`,
              `缺失知识关系：${knowledgeOverview.missingRelationCount}`,
              `重复知识挂载：${knowledgeOverview.duplicateRelationCount}`,
              `强制覆盖关系：${knowledgeOverview.requiredOverrideCount}`,
              `默认知识漂移：${knowledgeOverview.mismatchCount}`,
              `未识别知识库：${knowledgeOverview.unresolvedKnowledgeBaseIds.length}`,
            ]}
            unresolvedLine={
              knowledgeOverview.unresolvedKnowledgeBaseIds.length
                ? `未识别：${knowledgeOverview.unresolvedKnowledgeBaseIds.join(" / ")}`
                : undefined
            }
            actionLabel="打开知识关系治理"
            onAction={() => props.onOpenSection("knowledgeRelations")}
            items={knowledgeOverview.items.map((item) => ({
              key: item.packageId,
              title: item.packageName,
              detail: [
                item.missingIds.length ? `待补齐知识关系：${item.missingIds.join(" / ")}` : "",
                item.duplicateIds.length ? `重复知识挂载：${item.duplicateIds.join(" / ")}` : "",
                item.requiredOverrides.length
                  ? `强制覆盖关系：${item.requiredOverrides.map((entry) => `${entry.knowledgeBaseName || entry.knowledgeBaseId} (${entry.relationType})`).join(" / ")}`
                  : "",
                item.hasMismatch ? "默认知识空间与关系表默认项不一致，建议按默认知识真源收口。" : "",
              ].filter(Boolean),
            }))}
          />
        </div>
      </section>
    </div>
  );
}

function GovernanceOverviewSection(props: {
  title: string;
  description: string;
  badge: string;
  metricLines: string[];
  unresolvedLine?: string;
  actionLabel: string;
  onAction: () => void;
  items: Array<{ key: string; title: string; detail: string[] }>;
}) {
  return (
    <section className="entity-card" style={{ padding: 16, display: "grid", gap: 12 }}>
      <div style={{ display: "grid", gap: 8, gridTemplateColumns: "minmax(0, 1fr) auto" }}>
        <div>
          <span className="archive-pill status-ready">{props.badge}</span>
          <strong style={{ display: "block", marginTop: 8 }}>{props.title}</strong>
          <p className="personal-meta" style={{ marginTop: 4 }}>{props.description}</p>
        </div>
        <div style={{ display: "flex", alignItems: "start" }}>
          <button type="button" className="secondary-button" onClick={props.onAction}>
            {props.actionLabel}
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
        {props.metricLines.map((line) => (
          <div key={line} className="entity-card" style={{ padding: 12 }}>
            <span className="personal-meta">{line.split("：")[0]}</span>
            <strong style={{ display: "block", marginTop: 4 }}>{line.split("：").slice(1).join("：")}</strong>
          </div>
        ))}
      </div>

      {props.unresolvedLine ? (
        <div className="entity-card" style={{ padding: 12 }}>
          <p className="personal-meta">{props.unresolvedLine}</p>
        </div>
      ) : null}

      {props.items.length ? (
        <div style={{ display: "grid", gap: 8 }}>
          {props.items.slice(0, 6).map((item) => (
            <div key={item.key} className="entity-card" style={{ padding: 12, display: "grid", gap: 6 }}>
              <strong>{item.title}</strong>
              {item.detail.map((detail) => (
                <p key={detail} className="personal-meta">{detail}</p>
              ))}
            </div>
          ))}
          {props.items.length > 6 ? (
            <div className="entity-card" style={{ padding: 12 }}>
              <p className="personal-meta">其余 {props.items.length - 6} 条异常可进入对应关系面板继续处理。</p>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="entity-card" style={{ padding: 12 }}>
          <p className="personal-meta">当前这类关系没有明显异常，可以继续维护其他治理项。</p>
        </div>
      )}
    </section>
  );
}
