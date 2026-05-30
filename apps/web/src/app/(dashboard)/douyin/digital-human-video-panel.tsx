"use client";

import {
  type DigitalHumanFigureType,
  type DigitalHumanTemplatePageInfo,
  type DigitalHumanTemplateRecord,
  type DigitalHumanTemplateTagGroupRecord,
  type DouyinDigitalHumanCustomPersonRecord,
  type DouyinDigitalHumanScriptTemplateRecord,
  type DouyinDigitalHumanVideoWorkRecord,
} from "../../../services/works";
import { type OptionalDateFormatter } from "../xiaohongshu/shared-types";

type PersonalScriptTemplateSort = "UPDATED_DESC" | "UPDATED_ASC" | "NAME_ASC" | "NAME_DESC";
type PersonalScriptTemplateFilter = "ALL" | "SELF" | "SHARED";
type PersonalScriptTemplateArchiveFilter = "ACTIVE" | "ARCHIVED" | "ALL";
type PersonalScriptTemplateGovernanceFilter = "ALL" | "NEED_NOTE" | "READONLY_SHARED" | "SHARED_ACTIVE" | "ARCHIVED";
type ScriptTemplateCategory = "general" | "brand_promo" | "activity_promo" | "knowledge" | "live_warmup" | "selling";

type DigitalHumanEditorDiffEntry = {
  key: string;
  label: string;
  currentValue: string;
  selectedValue: string;
};

export interface DigitalHumanVideoPanelProps {
  templateCountLabel: string;
  workCountLabel: string;
  personSource: "COMMON" | "CUSTOM";
  templateTagGroups: DigitalHumanTemplateTagGroupRecord[];
  activeTagId?: string;
  isTemplateLoading?: boolean;
  templateSearch: string;
  templateScopeFilter: "ALL" | "FAVORITES" | "RECENT";
  filteredTemplates: DigitalHumanTemplateRecord[];
  availableCustomPersons: DouyinDigitalHumanCustomPersonRecord[];
  selectedTemplateId: string;
  selectedTemplate?: DigitalHumanTemplateRecord;
  selectedCustomPersonId: string;
  selectedCustomPerson?: DouyinDigitalHumanCustomPersonRecord;
  selectedFigureType: DigitalHumanFigureType;
  selectedFigure?: DigitalHumanTemplateRecord["figures"][number];
  title: string;
  script: string;
  speechRate: string;
  pitch: string;
  volume: string;
  backgroundColor: string;
  subtitleEnabled: boolean;
  subtitleTextColor: string;
  subtitleStrokeColor: string;
  screenWidth: string;
  screenHeight: string;
  scriptTemplateVisibility: "SELF" | "SHARED";
  scriptTemplateCategory: ScriptTemplateCategory;
  personalScriptTemplateNote: string;
  showScriptTemplateManager: boolean;
  personalScriptTemplateSearch: string;
  personalScriptTemplateFilter: PersonalScriptTemplateFilter;
  personalScriptTemplateArchiveFilter: PersonalScriptTemplateArchiveFilter;
  personalScriptTemplateCategoryFilter: ScriptTemplateCategory | "ALL";
  personalScriptTemplateGovernanceFilter: PersonalScriptTemplateGovernanceFilter;
  personalScriptTemplateSort: PersonalScriptTemplateSort;
  selectedPersonalScriptTemplateId: string;
  filteredPersonalScriptTemplates: DouyinDigitalHumanScriptTemplateRecord[];
  personalScriptTemplateName: string;
  selectedPersonalScriptTemplate?: DouyinDigitalHumanScriptTemplateRecord;
  selectedPersonalScriptTemplateEditable: boolean;
  selectedPersonalScriptTemplateArchived: boolean;
  scriptTemplateSaveScopeLabel: string;
  isReadonlySharedScriptTemplate: boolean;
  scriptActionMessage: string;
  editorActionMessage: string;
  personalTemplateGovernanceSummary: {
    total: number;
    shared: number;
    sharedActive: number;
    archived: number;
    missingNotes: number;
    readonlyShared: number;
  };
  selectedTemplateAuditMessages: string[];
  selectedWork?: DouyinDigitalHumanVideoWorkRecord;
  editorDiffs: DigitalHumanEditorDiffEntry[];
  recentTemplates: DigitalHumanTemplateRecord[];
  isSelectedTemplateFavorite: boolean;
  isSubmitting: boolean;
  canEdit: boolean;
  scriptPresets: ReadonlyArray<{ key: string; label: string; content: string }>;
  scriptTemplateCategories: Array<{ value: ScriptTemplateCategory; label: string }>;
  templatePageInfo?: DigitalHumanTemplatePageInfo;
  formatDateTime: OptionalDateFormatter;
  onPersonSourceChange: (value: "COMMON" | "CUSTOM") => void;
  onTemplateTagChange: (tagId: string) => Promise<void>;
  onTemplateSearchChange: (value: string) => void;
  onTemplateScopeFilterChange: (value: "ALL" | "FAVORITES" | "RECENT") => void;
  onSelectedTemplateChange: (templateId: string) => void;
  onSelectedCustomPersonChange: (customPersonId: string) => void;
  onSelectedFigureTypeChange: (figureType: DigitalHumanFigureType) => void;
  onTitleChange: (value: string) => void;
  onScriptChange: (value: string | ((current: string) => string)) => void;
  onSpeechRateChange: (value: string) => void;
  onPitchChange: (value: string) => void;
  onVolumeChange: (value: string) => void;
  onBackgroundColorChange: (value: string) => void;
  onSubtitleEnabledChange: (value: boolean) => void;
  onSubtitleTextColorChange: (value: string) => void;
  onSubtitleStrokeColorChange: (value: string) => void;
  onScreenWidthChange: (value: string) => void;
  onScreenHeightChange: (value: string) => void;
  onScriptTemplateVisibilityChange: (value: "SELF" | "SHARED") => void;
  onScriptTemplateCategoryChange: (value: ScriptTemplateCategory) => void;
  onPersonalScriptTemplateNoteChange: (value: string) => void;
  onShowScriptTemplateManagerChange: (value: boolean | ((current: boolean) => boolean)) => void;
  onPersonalScriptTemplateSearchChange: (value: string) => void;
  onPersonalScriptTemplateFilterChange: (value: PersonalScriptTemplateFilter) => void;
  onPersonalScriptTemplateArchiveFilterChange: (value: PersonalScriptTemplateArchiveFilter) => void;
  onPersonalScriptTemplateCategoryFilterChange: (value: ScriptTemplateCategory | "ALL") => void;
  onPersonalScriptTemplateGovernanceFilterChange: (value: PersonalScriptTemplateGovernanceFilter) => void;
  onPersonalScriptTemplateSortChange: (value: PersonalScriptTemplateSort) => void;
  onSelectedPersonalScriptTemplateChange: (value: string) => void;
  onPersonalScriptTemplateNameChange: (value: string) => void;
  onToggleFavoriteTemplate: (templateId: string, nextFavorite: boolean) => Promise<boolean>;
  onCopyScript: () => Promise<void> | void;
  onExportScript: () => void;
  onSaveCurrentScriptTemplate: () => Promise<void> | void;
  onApplyPersonalScriptTemplate: () => void;
  onRenamePersonalScriptTemplate: () => Promise<void> | void;
  onUpdatePersonalScriptTemplateCategory: () => Promise<void> | void;
  onUpdatePersonalScriptTemplateNote: () => Promise<void> | void;
  onOverwritePersonalScriptTemplate: () => Promise<void> | void;
  onToggleSharedPersonalScriptTemplate: () => Promise<void> | void;
  onToggleArchivePersonalScriptTemplate: () => Promise<void> | void;
  onDuplicatePersonalScriptTemplate: () => Promise<void> | void;
  onDeletePersonalScriptTemplate: () => Promise<void> | void;
  onLoadMoreTemplates?: () => Promise<void>;
  onSubmitCurrentVideo: () => void;
  getFigureTypeLabel: (type?: DigitalHumanFigureType) => string;
  getScriptTemplateCategoryLabel: (value?: string) => string;
  getScriptTemplateArchiveLabel: (isArchived?: boolean) => string;
}

export function DigitalHumanVideoPanel(props: DigitalHumanVideoPanelProps) {
  const selectedPersonName =
    props.personSource === "CUSTOM"
      ? props.selectedCustomPerson?.name || "未选择定制数字人"
      : props.selectedTemplate?.name || "未选择模板";
  const selectedPersonAudioText =
    props.personSource === "CUSTOM"
      ? props.selectedCustomPerson?.audioManId
        ? `已返回克隆音色 ID：${props.selectedCustomPerson.audioManId}`
        : "当前定制数字人未返回克隆音色，将按蝉镜默认语音策略提交"
      : props.selectedTemplate?.audioName
        ? `默认音色：${props.selectedTemplate.audioName}`
        : "请选择模板";
  const selectedPersonSummary =
    props.personSource === "CUSTOM"
      ? "成功定制的数字人会自动带入推荐画布尺寸，并按当前已知训练能力收敛参数；当前先按半身形态提交。"
      : props.selectedTemplate?.tagNames?.join(" / ") || "支持按标签筛选蝉镜公共数字人模板。";

  return (
    <article className="light-data-panel report-editor-panel report-editor-panel--compact" style={{ marginTop: 20 }}>
      <div className="report-editor-head">
        <div>
          <strong>数字人视频</strong>
          <p>基于已选模板填写脚本与参数，提交后系统会调用蝉镜创建数字人视频任务。</p>
        </div>
        <div className="report-editor-actions">
          <span className={`archive-pill ${props.filteredTemplates.length ? "status-ready" : "status-in_progress"}`}>{props.templateCountLabel}</span>
          <span className="archive-pill status-ready">{props.workCountLabel}</span>
        </div>
      </div>

      <div className="personal-grid">
        <label className="field">
          <span>数字人来源</span>
          <select value={props.personSource} onChange={(event) => props.onPersonSourceChange(event.target.value as "COMMON" | "CUSTOM")}>
            <option value="COMMON">公共模板</option>
            <option value="CUSTOM">我的定制数字人</option>
          </select>
        </label>
        {props.personSource === "COMMON" ? (
          <>
            <label className="field">
              <span>模板标签</span>
              <select
                value={props.activeTagId || ""}
                onChange={(event) => {
                  void props.onTemplateTagChange(event.target.value);
                }}
                disabled={props.isTemplateLoading}
              >
                <option value="">全部标签</option>
                {props.templateTagGroups.flatMap((group) =>
                  group.tagList.map((tag) => (
                    <option key={tag.id} value={String(tag.id)}>
                      {group.name} / {tag.name}
                    </option>
                  )),
                )}
              </select>
            </label>
            <label className="field">
              <span>模板搜索</span>
              <input
                value={props.templateSearch}
                onChange={(event) => props.onTemplateSearchChange(event.target.value)}
                placeholder="搜索模板名、音色或标签"
              />
            </label>
            <label className="field">
              <span>模板范围</span>
              <select value={props.templateScopeFilter} onChange={(event) => props.onTemplateScopeFilterChange(event.target.value as "ALL" | "FAVORITES" | "RECENT")}>
                <option value="ALL">全部模板</option>
                <option value="FAVORITES">仅看收藏</option>
                <option value="RECENT">最近使用</option>
              </select>
            </label>
            <label className="field">
              <span>数字人模板</span>
              <select value={props.selectedTemplateId} onChange={(event) => props.onSelectedTemplateChange(event.target.value)}>
                {props.filteredTemplates.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
          </>
        ) : (
          <>
            <label className="field">
              <span>定制数字人</span>
              <select value={props.selectedCustomPersonId} onChange={(event) => props.onSelectedCustomPersonChange(event.target.value)}>
                {props.availableCustomPersons.length ? null : <option value="">暂无可用于视频创建的定制数字人</option>}
                {props.availableCustomPersons.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>训练状态</span>
              <input
                value={props.selectedCustomPerson ? `${props.selectedCustomPerson.progress}% / ${props.selectedCustomPerson.status}` : "暂无可选定制数字人"}
                readOnly
              />
            </label>
            <label className="field">
              <span>可用数量</span>
              <input value={`${props.availableCustomPersons.length} 个成功定制数字人`} readOnly />
            </label>
            <label className="field">
              <span>训练类型</span>
              <input
                value={
                  props.selectedCustomPerson?.trainType === "both"
                    ? "形象 + 音色"
                    : props.selectedCustomPerson?.trainType === "figure"
                      ? "仅形象"
                      : "服务端未返回"
                }
                readOnly
              />
            </label>
            <label className="field">
              <span>数字人 ID</span>
              <input value={props.selectedCustomPerson?.personId || props.selectedCustomPerson?.id || ""} readOnly placeholder="提交后会带入蝉镜数字人 ID" />
            </label>
            <label className="field">
              <span>输出能力</span>
              <input
                value={
                  props.selectedCustomPerson?.support4k
                    ? `支持 4K${props.selectedCustomPerson.width4k && props.selectedCustomPerson.height4k ? ` / ${props.selectedCustomPerson.width4k} x ${props.selectedCustomPerson.height4k}` : ""}`
                    : "默认按 1080p 提交"
                }
                readOnly
              />
            </label>
          </>
        )}
        <label className="field">
          <span>形象类型</span>
          <select
            value={props.personSource === "CUSTOM" ? "sit_body" : props.selectedFigureType}
            onChange={(event) => props.onSelectedFigureTypeChange(event.target.value as DigitalHumanFigureType)}
            disabled={props.personSource === "CUSTOM"}
          >
            {props.personSource === "COMMON" ? (
              (props.selectedTemplate?.figures || []).map((item) => (
                <option key={item.type} value={item.type}>
                  {props.getFigureTypeLabel(item.type)}
                </option>
              ))
            ) : (
              <option value="sit_body">半身</option>
            )}
          </select>
        </label>
        <label className="field">
          <span>作品标题</span>
          <input value={props.title} onChange={(event) => props.onTitleChange(event.target.value)} placeholder="例如：新品活动数字人口播" />
        </label>
        <label className="field field-full">
          <span>口播脚本</span>
          <textarea
            className="composer-form-textarea"
            value={props.script}
            onChange={(event) => props.onScriptChange(event.target.value)}
            placeholder="请输入适合 15-60 秒数字人口播的视频脚本。"
          />
        </label>
        <div className="field field-full">
          <span>脚本快捷模板</span>
          <div className="strategy-inline-actions" style={{ marginTop: 8, flexWrap: "wrap" }}>
            {props.scriptPresets.map((preset) => (
              <button
                key={preset.key}
                type="button"
                className="secondary-button"
                onClick={() => props.onScriptChange((current) => (current.trim() ? `${current.trim()}\n\n${preset.content}` : preset.content))}
              >
                {preset.label}
              </button>
            ))}
            <button type="button" className="secondary-button" onClick={() => props.onScriptChange("")}>
              清空脚本
            </button>
            <button type="button" className="secondary-button" onClick={() => void props.onCopyScript()}>
              复制脚本
            </button>
            <button type="button" className="secondary-button" onClick={props.onExportScript}>
              导出脚本
            </button>
            <select
              value={props.scriptTemplateVisibility}
              onChange={(event) => props.onScriptTemplateVisibilityChange(event.target.value as "SELF" | "SHARED")}
              style={{ minWidth: 180 }}
            >
              <option value="SELF">保存到个人模板</option>
              <option value="SHARED">保存到团队共享模板</option>
            </select>
            <select
              value={props.scriptTemplateCategory}
              onChange={(event) => props.onScriptTemplateCategoryChange(event.target.value as ScriptTemplateCategory)}
              style={{ minWidth: 180 }}
            >
              {props.scriptTemplateCategories.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
            <button type="button" className="secondary-button" onClick={() => void props.onSaveCurrentScriptTemplate()}>
              保存脚本模板
            </button>
            <button type="button" className="secondary-button" onClick={() => props.onShowScriptTemplateManagerChange((current) => !current)}>
              {props.showScriptTemplateManager ? "收起模板资产" : "展开模板资产"}
            </button>
            <button type="button" className="primary-button" onClick={props.onSubmitCurrentVideo} disabled={!props.canEdit || props.isSubmitting}>
              提交数字人视频
            </button>
          </div>
          <small className="personal-meta">可先插入一版基础结构，再按实际产品和场景补充细节，并选择保存范围与模板分类。</small>
          <small className="personal-meta">当前保存目标：{props.scriptTemplateSaveScopeLabel} / {props.getScriptTemplateCategoryLabel(props.scriptTemplateCategory)}</small>
          <textarea
            className="composer-form-textarea"
            value={props.personalScriptTemplateNote}
            onChange={(event) => props.onPersonalScriptTemplateNoteChange(event.target.value.slice(0, 200))}
            placeholder="可填写适用场景、口径提醒、开头钩子建议等协作备注，最多 200 字。"
            style={{ marginTop: 8, minHeight: 88 }}
          />
          <small className="personal-meta">协作备注会随脚本模板一起保存，并进入模板搜索与预览摘要。</small>
          {!props.showScriptTemplateManager ? (
            <small className="personal-meta">创建区默认只保留高频操作；如需共享、归档、治理脚本模板，再展开模板资产区。</small>
          ) : null}
          {props.isReadonlySharedScriptTemplate ? (
            <small className="personal-meta">当前选中的是他人共享模板，另存副本会默认保存到你的个人模板，避免直接覆盖团队资产。</small>
          ) : null}
          {props.scriptActionMessage ? <small className="personal-meta">{props.scriptActionMessage}</small> : null}
          {props.editorActionMessage ? <small className="personal-meta">{props.editorActionMessage}</small> : null}
        </div>
        {props.showScriptTemplateManager ? (
          <div className="field field-full">
            <span>脚本模板资产</span>
            <div className="strategy-inline-actions" style={{ marginTop: 8, flexWrap: "wrap" }}>
              <input
                value={props.personalScriptTemplateSearch}
                onChange={(event) => props.onPersonalScriptTemplateSearchChange(event.target.value)}
                placeholder="搜索模板名称、备注或脚本内容"
                style={{ minWidth: 240 }}
              />
              <select
                value={props.personalScriptTemplateFilter}
                onChange={(event) => props.onPersonalScriptTemplateFilterChange(event.target.value as PersonalScriptTemplateFilter)}
                style={{ minWidth: 180 }}
              >
                <option value="ALL">全部模板</option>
                <option value="SELF">仅看个人模板</option>
                <option value="SHARED">仅看团队共享</option>
              </select>
              <select
                value={props.personalScriptTemplateArchiveFilter}
                onChange={(event) => props.onPersonalScriptTemplateArchiveFilterChange(event.target.value as PersonalScriptTemplateArchiveFilter)}
                style={{ minWidth: 180 }}
              >
                <option value="ACTIVE">仅看生效中</option>
                <option value="ARCHIVED">仅看已归档</option>
                <option value="ALL">全部状态</option>
              </select>
              <select
                value={props.personalScriptTemplateCategoryFilter}
                onChange={(event) => props.onPersonalScriptTemplateCategoryFilterChange(event.target.value as ScriptTemplateCategory | "ALL")}
                style={{ minWidth: 180 }}
              >
                <option value="ALL">全部分类</option>
                {props.scriptTemplateCategories.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
              <select
                value={props.personalScriptTemplateGovernanceFilter}
                onChange={(event) => props.onPersonalScriptTemplateGovernanceFilterChange(event.target.value as PersonalScriptTemplateGovernanceFilter)}
                style={{ minWidth: 180 }}
              >
                <option value="ALL">全部治理视图</option>
                <option value="NEED_NOTE">只看缺备注</option>
                <option value="READONLY_SHARED">只看只读共享</option>
                <option value="SHARED_ACTIVE">只看生效共享</option>
                <option value="ARCHIVED">只看归档资产</option>
              </select>
              <select
                value={props.personalScriptTemplateSort}
                onChange={(event) => props.onPersonalScriptTemplateSortChange(event.target.value as PersonalScriptTemplateSort)}
                style={{ minWidth: 180 }}
              >
                <option value="UPDATED_DESC">最近更新优先</option>
                <option value="UPDATED_ASC">最早更新优先</option>
                <option value="NAME_ASC">名称 A-Z</option>
                <option value="NAME_DESC">名称 Z-A</option>
              </select>
              <select
                value={props.selectedPersonalScriptTemplateId}
                onChange={(event) => props.onSelectedPersonalScriptTemplateChange(event.target.value)}
                style={{ minWidth: 240 }}
              >
                <option value="">选择脚本模板</option>
                {props.filteredPersonalScriptTemplates.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.isShared ? `[共享]` : `[个人]`} [{props.getScriptTemplateArchiveLabel(item.isArchived)}] {props.getScriptTemplateCategoryLabel(item.category)} / {item.name}
                  </option>
                ))}
              </select>
              <input
                value={props.personalScriptTemplateName}
                onChange={(event) => props.onPersonalScriptTemplateNameChange(event.target.value)}
                placeholder="编辑模板名称"
                style={{ minWidth: 220 }}
              />
              <select
                value={props.scriptTemplateCategory}
                onChange={(event) => props.onScriptTemplateCategoryChange(event.target.value as ScriptTemplateCategory)}
                style={{ minWidth: 180 }}
              >
                {props.scriptTemplateCategories.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
              <button type="button" className="secondary-button" onClick={props.onApplyPersonalScriptTemplate}>
                套用模板
              </button>
              <button type="button" className="secondary-button" disabled={!props.selectedPersonalScriptTemplateEditable} onClick={() => void props.onRenamePersonalScriptTemplate()}>
                重命名模板
              </button>
              <button type="button" className="secondary-button" disabled={!props.selectedPersonalScriptTemplateEditable} onClick={() => void props.onUpdatePersonalScriptTemplateCategory()}>
                更新分类
              </button>
              <button type="button" className="secondary-button" disabled={!props.selectedPersonalScriptTemplateEditable} onClick={() => void props.onUpdatePersonalScriptTemplateNote()}>
                更新备注
              </button>
              <button type="button" className="secondary-button" disabled={!props.selectedPersonalScriptTemplateEditable} onClick={() => void props.onOverwritePersonalScriptTemplate()}>
                用当前脚本覆盖
              </button>
              <button type="button" className="secondary-button" disabled={!props.selectedPersonalScriptTemplateEditable} onClick={() => void props.onToggleSharedPersonalScriptTemplate()}>
                {props.selectedPersonalScriptTemplate?.isShared ? "取消团队共享" : "设为团队共享"}
              </button>
              <button type="button" className="secondary-button" disabled={!props.selectedPersonalScriptTemplateEditable} onClick={() => void props.onToggleArchivePersonalScriptTemplate()}>
                {props.selectedPersonalScriptTemplateArchived ? "恢复模板" : "归档模板"}
              </button>
              <button type="button" className="secondary-button" onClick={() => void props.onDuplicatePersonalScriptTemplate()}>
                {props.isReadonlySharedScriptTemplate ? "保存为我的副本" : "另存为副本"}
              </button>
              <button type="button" className="secondary-button" disabled={!props.selectedPersonalScriptTemplateEditable} onClick={() => void props.onDeletePersonalScriptTemplate()}>
                删除模板
              </button>
            </div>
            <small className="personal-meta">
              当前已切到服务端持久化，支持个人模板与团队共享模板两种资产形态，并可直接搜索、排序、归档、恢复、切换共享状态、更新备注、另存副本或用当前脚本覆盖更新模板。
            </small>
            <div className="strategy-grid" style={{ marginTop: 12 }}>
              <div className="entity-card personal-card">
                <strong>模板总数</strong>
                <p className="personal-meta">{props.personalTemplateGovernanceSummary.total} 条</p>
              </div>
              <div className="entity-card personal-card">
                <strong>生效共享</strong>
                <p className="personal-meta">{props.personalTemplateGovernanceSummary.sharedActive} 条共享中</p>
              </div>
              <div className="entity-card personal-card">
                <strong>待补备注</strong>
                <p className="personal-meta">{props.personalTemplateGovernanceSummary.missingNotes} 条建议补协作说明</p>
              </div>
              <div className="entity-card personal-card">
                <strong>只读共享</strong>
                <p className="personal-meta">{props.personalTemplateGovernanceSummary.readonlyShared} 条建议另存副本</p>
              </div>
            </div>
            <small className="personal-meta">
              当前筛选结果 {props.filteredPersonalScriptTemplates.length} / {props.selectedPersonalScriptTemplate ? props.filteredPersonalScriptTemplates.length : props.filteredPersonalScriptTemplates.length} 条。
            </small>
            {props.selectedPersonalScriptTemplate ? (
              <div className="entity-card personal-card" style={{ marginTop: 12 }}>
                <strong>{props.selectedPersonalScriptTemplate.name}</strong>
                <p className="personal-meta">
                  {props.selectedPersonalScriptTemplate.isShared ? "团队共享模板" : "个人模板"}
                  {" · "}
                  {props.getScriptTemplateArchiveLabel(props.selectedPersonalScriptTemplate.isArchived)}
                  {" · "}
                  {props.getScriptTemplateCategoryLabel(props.selectedPersonalScriptTemplate.category)}
                  {" · "}
                  {props.selectedPersonalScriptTemplateEditable ? "可编辑" : "只读"}
                  {" · "}
                  最近更新：{props.formatDateTime(props.selectedPersonalScriptTemplate.updatedAt)} · 脚本字数：
                  {props.selectedPersonalScriptTemplate.content.trim().length}
                </p>
                {props.isReadonlySharedScriptTemplate ? (
                  <p className="personal-meta">当前模板来自团队共享区，你可以直接套用，也可以保存为自己的副本后再重命名、改分类或覆盖内容。</p>
                ) : null}
                {props.selectedPersonalScriptTemplate.note ? (
                  <p className="personal-meta">协作备注：{props.selectedPersonalScriptTemplate.note}</p>
                ) : (
                  <p className="personal-meta">协作备注：暂无，可补充适用场景、节奏提醒或禁用说法。</p>
                )}
                {props.selectedTemplateAuditMessages.length ? (
                  <div style={{ marginTop: 8 }}>
                    {props.selectedTemplateAuditMessages.map((message) => (
                      <p key={message} className="personal-meta">{`审计提示：${message}`}</p>
                    ))}
                  </div>
                ) : (
                  <p className="personal-meta">审计提示：当前模板信息较完整，可直接复用或继续沉淀。</p>
                )}
                <p style={{ marginTop: 8, whiteSpace: "pre-wrap" }}>
                  {props.selectedPersonalScriptTemplate.content.trim().slice(0, 180)}
                  {props.selectedPersonalScriptTemplate.content.trim().length > 180 ? "..." : ""}
                </p>
              </div>
            ) : null}
          </div>
        ) : null}
        <label className="field">
          <span>语速</span>
          <input value={props.speechRate} onChange={(event) => props.onSpeechRateChange(event.target.value)} />
        </label>
        <label className="field">
          <span>音调</span>
          <input value={props.pitch} onChange={(event) => props.onPitchChange(event.target.value)} />
        </label>
        <label className="field">
          <span>音量</span>
          <input value={props.volume} onChange={(event) => props.onVolumeChange(event.target.value)} />
        </label>
        <label className="field">
          <span>背景色</span>
          <input value={props.backgroundColor} onChange={(event) => props.onBackgroundColorChange(event.target.value)} />
        </label>
        <label className="field">
          <span>画布宽度</span>
          <input value={props.screenWidth} onChange={(event) => props.onScreenWidthChange(event.target.value)} />
        </label>
        <label className="field">
          <span>画布高度</span>
          <input value={props.screenHeight} onChange={(event) => props.onScreenHeightChange(event.target.value)} />
        </label>
        <label className="field">
          <span>字幕开关</span>
          <select value={props.subtitleEnabled ? "yes" : "no"} onChange={(event) => props.onSubtitleEnabledChange(event.target.value === "yes")}>
            <option value="yes">开启</option>
            <option value="no">关闭</option>
          </select>
        </label>
        <label className="field">
          <span>字幕颜色</span>
          <input value={props.subtitleTextColor} onChange={(event) => props.onSubtitleTextColorChange(event.target.value)} />
        </label>
        <label className="field">
          <span>描边颜色</span>
          <input value={props.subtitleStrokeColor} onChange={(event) => props.onSubtitleStrokeColorChange(event.target.value)} />
        </label>
      </div>

      <div className="personal-grid" style={{ marginTop: 16 }}>
        <div className="entity-card personal-card">
          <strong>{selectedPersonName}</strong>
          <p className="personal-meta">
            {selectedPersonAudioText}
          </p>
          <p className="panel-subtext">{selectedPersonSummary}</p>
          {props.personSource === "COMMON" && props.selectedTemplate?.audioPreview ? (
            <audio controls preload="none" src={props.selectedTemplate.audioPreview} style={{ width: "100%", marginTop: 12 }} />
          ) : null}
          {props.personSource === "CUSTOM" && props.selectedCustomPerson?.previewVideoUrl ? (
            <video controls preload="metadata" src={props.selectedCustomPerson.previewVideoUrl} style={{ width: "100%", borderRadius: 16, marginTop: 12, background: "#0f1525" }} />
          ) : (
            <p className="panel-subtext" style={{ marginTop: 12 }}>
              {props.personSource === "CUSTOM" ? "当前定制数字人暂无预览视频。" : "当前模板暂无音色试听链接。"}
            </p>
          )}
          {props.personSource === "COMMON" && props.selectedTemplate?.id ? (
            <div className="strategy-inline-actions" style={{ marginTop: 12 }}>
              <button
                type="button"
                className="secondary-button"
                onClick={() => void props.onToggleFavoriteTemplate(props.selectedTemplate!.id, !props.isSelectedTemplateFavorite)}
              >
                {props.isSelectedTemplateFavorite ? "取消收藏" : "收藏模板"}
              </button>
            </div>
          ) : null}
        </div>
        <div className="entity-card personal-card">
          <strong>{props.personSource === "CUSTOM" ? props.getFigureTypeLabel(props.selectedFigureType) : props.selectedFigure ? props.getFigureTypeLabel(props.selectedFigure.type) : "形象预览"}</strong>
          <p className="personal-meta">
            {props.personSource === "CUSTOM"
              ? `${props.selectedCustomPerson?.width || 720} x ${props.selectedCustomPerson?.height || 1280}`
              : props.selectedFigure
                ? `${props.selectedFigure.width} x ${props.selectedFigure.height}`
                : "待选择"}
          </p>
          {(props.personSource === "CUSTOM" ? props.selectedCustomPerson?.coverImageUrl : props.selectedFigure?.cover) ? (
            <img
              src={props.personSource === "CUSTOM" ? props.selectedCustomPerson?.coverImageUrl : props.selectedFigure?.cover}
              alt={selectedPersonName}
              style={{ width: "100%", borderRadius: 16, marginTop: 12 }}
            />
          ) : (
            <p className="panel-subtext">{props.personSource === "CUSTOM" ? "当前定制数字人暂无封面图。" : "当前模板暂无封面图。"}</p>
          )}
          {(props.personSource === "CUSTOM" ? props.selectedCustomPerson?.previewVideoUrl : props.selectedFigure?.previewVideoUrl) ? (
            <video
              controls
              preload="metadata"
              src={props.personSource === "CUSTOM" ? props.selectedCustomPerson?.previewVideoUrl : props.selectedFigure?.previewVideoUrl}
              style={{ width: "100%", borderRadius: 16, marginTop: 12, background: "#0f1525" }}
            />
          ) : null}
        </div>
        <div className="entity-card personal-card">
          <strong>配置提醒</strong>
          <p className="panel-subtext">请先在个人中心的第三方平台里配置蝉镜凭证，格式为 `appId::secretKey`。</p>
          <p className="panel-subtext">模板、作品列表和找回动作都会直接走蝉镜 OpenAPI。</p>
          <p className="panel-subtext">
            {props.personSource === "CUSTOM"
              ? "这里只展示训练成功的定制数字人；若刚完成训练但列表未刷新，可回到“定制数字人”点刷新。"
              : "如果模板较多，可先按标签筛选，再用关键词搜索模板名、音色或标签。"}
          </p>
          <p className="panel-subtext">
            {props.personSource === "CUSTOM"
              ? "定制数字人当前会默认按半身提交；若未返回 4K 能力，后端会阻止超出 1080p 的画布尺寸。"
              : "常用模板可加入收藏，最近点过的模板会自动进入“最近使用”。"}
          </p>
        </div>
      </div>

      {props.selectedWork ? (
        <div className="report-inline-tip" style={{ marginTop: 16 }}>
          {props.editorDiffs.length ? (
            <>
              <strong>与当前选中作品相比，已修改参数：</strong>
              {" "}
              {props.editorDiffs.map((item) => item.label).join("、")}
            </>
          ) : (
            <>当前创建区参数与选中作品一致，可直接提交重做或继续修改。</>
          )}
        </div>
      ) : null}

      {props.recentTemplates.length ? (
        <div className="strategy-inline-actions" style={{ marginTop: 16, flexWrap: "wrap" }}>
          <span className="panel-subtext">最近使用：</span>
          {props.recentTemplates.map((item) => (
            <button
              key={item.id}
              type="button"
              className="secondary-button"
              onClick={() => props.onSelectedTemplateChange(item.id)}
            >
              {item.name}
            </button>
          ))}
        </div>
      ) : null}

      {props.onLoadMoreTemplates && props.templatePageInfo && props.templatePageInfo.page < props.templatePageInfo.totalPage ? (
        <div className="strategy-inline-actions" style={{ marginTop: 16 }}>
          <button
            type="button"
            className="secondary-button"
            onClick={() => void props.onLoadMoreTemplates?.()}
            disabled={props.isTemplateLoading}
          >
            {props.isTemplateLoading ? "加载中..." : "继续加载模板"}
          </button>
          <span className="panel-subtext">
            当前第 {props.templatePageInfo.page}/{props.templatePageInfo.totalPage} 页，每页 {props.templatePageInfo.size} 条
          </span>
        </div>
      ) : null}
    </article>
  );
}
