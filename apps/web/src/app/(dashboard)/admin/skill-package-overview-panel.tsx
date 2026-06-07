"use client";

import { useMemo, useState } from "react";
import type { ModuleDefinitionRecord, SkillPackageRecord } from "../../../services/admin";

type SkillPackageOverviewPanelProps = {
  packages: SkillPackageRecord[];
  modules: ModuleDefinitionRecord[];
};

type OverviewFilters = {
  keyword: string;
  moduleKey: "ALL" | string;
  status: "ALL" | SkillPackageRecord["status"];
  scope: "ALL" | SkillPackageRecord["scope"];
};

const DEFAULT_FILTERS: OverviewFilters = {
  keyword: "",
  moduleKey: "ALL",
  status: "ALL",
  scope: "ALL",
};

export function SkillPackageOverviewPanel(props: SkillPackageOverviewPanelProps) {
  const [filters, setFilters] = useState<OverviewFilters>(DEFAULT_FILTERS);

  const moduleOptions = useMemo(() => {
    const moduleMap = new Map<string, string>();
    props.modules.forEach((item) => moduleMap.set(item.moduleKey, item.moduleName));
    props.packages.forEach((item) => {
      item.moduleSummaries?.forEach((summary) => {
        if (!moduleMap.has(summary.moduleKey)) {
          moduleMap.set(summary.moduleKey, summary.moduleName);
        }
      });
      item.moduleKeys.forEach((moduleKey) => {
        if (!moduleMap.has(moduleKey)) {
          moduleMap.set(moduleKey, moduleKey);
        }
      });
    });
    return Array.from(moduleMap.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((left, right) => left.label.localeCompare(right.label, "zh-CN"));
  }, [props.modules, props.packages]);

  const visiblePackages = useMemo(() => {
    return props.packages.filter((item) => {
      if (filters.status !== "ALL" && item.status !== filters.status) {
        return false;
      }
      if (filters.scope !== "ALL" && item.scope !== filters.scope) {
        return false;
      }
      if (filters.moduleKey !== "ALL") {
        const moduleKeys = new Set([...(item.moduleKeys || []), ...(item.moduleSummaries?.map((moduleItem) => moduleItem.moduleKey) || [])]);
        if (!moduleKeys.has(filters.moduleKey)) {
          return false;
        }
      }
      const keyword = filters.keyword.trim().toLowerCase();
      if (!keyword) {
        return true;
      }
      return [
        item.packageKey,
        item.packageName,
        item.description,
        item.moduleSummaries?.map((moduleItem) => moduleItem.moduleName).join(","),
        item.defaultProviderSummary?.providerName,
        item.defaultProviderSummary?.modelName,
      ].some((field) => String(field || "").toLowerCase().includes(keyword));
    });
  }, [filters, props.packages]);

  const selectedPackage = visiblePackages[0] || props.packages[0];

  return (
    <section className="entity-card admin-user-filter-card" style={{ marginBottom: 24 }}>
      <div className="admin-user-filter-head">
        <div>
          <span className="archive-pill status-ready">统一技能中心</span>
          <h3>能力包摘要视图</h3>
          <p>从能力包视角统一查看模块归属、默认执行模型、技能数和提示词数，先补齐列表面闭环。</p>
        </div>
        <div className="admin-user-filter-summary">
          <div>
            <span>能力包</span>
            <strong>{visiblePackages.length}</strong>
          </div>
          <div>
            <span>启用中</span>
            <strong>{visiblePackages.filter((item) => item.status === "ACTIVE").length}</strong>
          </div>
          <div>
            <span>提示词总数</span>
            <strong>{visiblePackages.reduce((sum, item) => sum + (item.promptCount || 0), 0)}</strong>
          </div>
        </div>
      </div>

      <div className="admin-user-filter-grid" style={{ marginBottom: 16 }}>
        <label>
          <span>关键词</span>
          <input
            value={filters.keyword}
            placeholder="能力包 / 模块 / 模型"
            onChange={(event) => setFilters((current) => ({ ...current, keyword: event.target.value }))}
          />
        </label>
        <label>
          <span>模块</span>
          <select value={filters.moduleKey} onChange={(event) => setFilters((current) => ({ ...current, moduleKey: event.target.value }))}>
            <option value="ALL">全部模块</option>
            {moduleOptions.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>状态</span>
          <select value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value as OverviewFilters["status"] }))}>
            <option value="ALL">全部</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="DRAFT">DRAFT</option>
            <option value="DISABLED">DISABLED</option>
            <option value="ARCHIVED">ARCHIVED</option>
          </select>
        </label>
        <label>
          <span>作用域</span>
          <select value={filters.scope} onChange={(event) => setFilters((current) => ({ ...current, scope: event.target.value as OverviewFilters["scope"] }))}>
            <option value="ALL">全部</option>
            <option value="PLATFORM">PLATFORM</option>
            <option value="BRAND">BRAND</option>
            <option value="USER">USER</option>
          </select>
        </label>
      </div>

      <div className="admin-user-layout">
        <article className="entity-card admin-user-list-card">
          <div className="entity-card-head">
            <div>
              <strong>能力包列表</strong>
              <p className="personal-meta">第一批先展示摘要，不在这里直接编辑正文资产。</p>
            </div>
          </div>
          <div className="admin-user-table-wrapper">
            <table className="admin-user-table">
              <thead>
                <tr>
                  <th>能力包</th>
                  <th>模块</th>
                  <th>技能数</th>
                  <th>提示词数</th>
                  <th>默认模型</th>
                  <th>版本</th>
                  <th>更新时间</th>
                </tr>
              </thead>
              <tbody>
                {visiblePackages.length ? (
                  visiblePackages.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <div className="admin-user-row-title">{item.packageName}</div>
                        <div className="admin-user-row-meta">{item.packageKey}</div>
                      </td>
                      <td>{(item.moduleSummaries || []).map((moduleItem) => moduleItem.moduleName).join(" / ") || item.moduleKeys.join(" / ") || "-"}</td>
                      <td>{item.skillCount || 0}</td>
                      <td>{item.promptCount || 0}</td>
                      <td>{item.defaultProviderSummary?.modelName || item.defaultProviderSummary?.providerName || "-"}</td>
                      <td>{item.currentVersionNumber || item.currentVersionId || "-"}</td>
                      <td>{formatDateTime(item.updatedAt)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} style={{ textAlign: "center", padding: "24px 12px", color: "var(--muted)" }}>
                      当前筛选条件下没有匹配的能力包。
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </article>

        <article className="entity-card admin-user-list-card">
          <div className="entity-card-head">
            <div>
              <strong>当前摘要</strong>
              <p className="personal-meta">{selectedPackage ? `${selectedPackage.packageName} 的统一技能中心摘要` : "暂无能力包摘要"}</p>
            </div>
          </div>
          {selectedPackage ? (
            <div className="admin-skill-simple-grid">
              <label className="admin-skill-field">
                <span>能力包名称</span>
                <input value={selectedPackage.packageName} readOnly />
              </label>
              <label className="admin-skill-field">
                <span>能力包标识</span>
                <input value={selectedPackage.packageKey} readOnly />
              </label>
              <label className="admin-skill-field">
                <span>状态</span>
                <input value={selectedPackage.status} readOnly />
              </label>
              <label className="admin-skill-field">
                <span>作用域</span>
                <input value={selectedPackage.scope} readOnly />
              </label>
              <label className="admin-skill-field admin-skill-field--wide">
                <span>所属模块</span>
                <input
                  value={(selectedPackage.moduleSummaries || []).map((item) => item.moduleName).join(" / ") || selectedPackage.moduleKeys.join(" / ") || "-"}
                  readOnly
                />
              </label>
              <label className="admin-skill-field">
                <span>技能数</span>
                <input value={String(selectedPackage.skillCount || 0)} readOnly />
              </label>
              <label className="admin-skill-field">
                <span>提示词数</span>
                <input value={String(selectedPackage.promptCount || 0)} readOnly />
              </label>
              <label className="admin-skill-field">
                <span>默认 Provider</span>
                <input value={selectedPackage.defaultProviderSummary?.providerName || "-"} readOnly />
              </label>
              <label className="admin-skill-field">
                <span>默认模型</span>
                <input value={selectedPackage.defaultProviderSummary?.modelName || "-"} readOnly />
              </label>
              <label className="admin-skill-field admin-skill-field--wide">
                <span>默认知识空间</span>
                <input value={selectedPackage.defaultKnowledgeSpaceIds.join(" / ") || "-"} readOnly />
              </label>
              <label className="admin-skill-field admin-skill-field--wide">
                <span>标签</span>
                <input value={selectedPackage.tags.join(" / ") || "-"} readOnly />
              </label>
              <label className="admin-skill-field admin-skill-field--full">
                <span>说明</span>
                <textarea value={selectedPackage.description || selectedPackage.remarks || "-"} readOnly />
              </label>
            </div>
          ) : (
            <div className="personal-meta">暂无可展示的能力包摘要。</div>
          )}
        </article>
      </div>
    </section>
  );
}

function formatDateTime(value?: string) {
  if (!value) {
    return "-";
  }
  try {
    return new Date(value).toLocaleString("zh-CN", { hour12: false });
  } catch {
    return value;
  }
}
