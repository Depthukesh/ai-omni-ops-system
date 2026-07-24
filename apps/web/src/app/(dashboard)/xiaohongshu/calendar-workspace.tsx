"use client";

import { useEffect, useMemo, useState } from "react";
import { type XiaohongshuMarketingCalendarItem, type XiaohongshuMarketingCalendarRecord, type XiaohongshuMarketingCalendarTaskRecord } from "../../../services/reports";
import { type AsyncAction } from "./shared-types";
import { buildCalendarMonthMatrix, formatCalendarMonthLabel, getCalendarMonthKey } from "./calendar-helpers";

export interface CalendarWorkspaceProps {
  sectionLabel: string;
  sectionDescription: string;
  isLoading: boolean;
  isPublishing: boolean;
  isGeneratingCalendar: boolean;
  canGenerateCalendar: boolean;
  isCalendarTaskActive: boolean;
  latestCalendar?: XiaohongshuMarketingCalendarRecord;
  latestCalendarTask?: XiaohongshuMarketingCalendarTaskRecord;
  calendarTaskStatusText: string;
  calendarInlineError: string;
  calendarAllItems: XiaohongshuMarketingCalendarItem[];
  isCalendarDetailOpen: boolean;
  selectedCalendarDate?: string;
  selectedCalendarItem?: XiaohongshuMarketingCalendarItem;
  calendarItemDraft: XiaohongshuMarketingCalendarItem | null;
  isEditingCalendarItem: boolean;
  isSavingCalendarItem: boolean;
  canEditCalendar: boolean;
  onRefresh: AsyncAction;
  onGenerate: AsyncAction;
  onOpenDetail: (date: string, itemId?: string) => void;
  onCloseDetail: () => void;
  onStartEditDetail: () => void;
  onCancelEditDetail: () => void;
  onSaveDetail: AsyncAction;
  onDetailFieldChange: (path: string, value: string) => void;
  onDetailListFieldChange: (path: string, value: string) => void;
  formatCalendarDate: (value: string) => string;
  formatCalendarListValue: (value?: string[]) => string;
}

export function CalendarWorkspace(props: CalendarWorkspaceProps) {
  const {
    sectionLabel,
    sectionDescription,
    isLoading,
    isPublishing,
    isGeneratingCalendar,
    canGenerateCalendar,
    isCalendarTaskActive,
    latestCalendar,
    latestCalendarTask,
    calendarInlineError,
    calendarAllItems,
    isCalendarDetailOpen,
    selectedCalendarDate,
    selectedCalendarItem,
    calendarItemDraft,
    isEditingCalendarItem,
    isSavingCalendarItem,
    canEditCalendar,
    onRefresh,
    onGenerate,
    onOpenDetail,
    onCloseDetail,
    onStartEditDetail,
    onCancelEditDetail,
    onSaveDetail,
    onDetailFieldChange,
    onDetailListFieldChange,
    formatCalendarDate,
    formatCalendarListValue,
  } = props;

  const initialMonthKey = useMemo(() => {
    const latestMonthKey = getCalendarMonthKey(latestCalendar?.items?.[0]?.date);
    if (latestMonthKey) {
      return latestMonthKey;
    }

    const firstItemMonthKey = getCalendarMonthKey(calendarAllItems[0]?.date);
    if (firstItemMonthKey) {
      return firstItemMonthKey;
    }

    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
  }, [calendarAllItems, latestCalendar?.items]);

  const [visibleMonthKey, setVisibleMonthKey] = useState(initialMonthKey);
  const [showGregorianFestivals, setShowGregorianFestivals] = useState(false);
  const [showSolarTerms, setShowSolarTerms] = useState(false);
  const readonlyDetailItem = selectedCalendarItem || calendarItemDraft || buildEmptyCalendarItem(selectedCalendarDate || "");

  useEffect(() => {
    setVisibleMonthKey((current) => current || initialMonthKey);
  }, [initialMonthKey]);

  const monthCells = useMemo(() => buildCalendarMonthMatrix(visibleMonthKey, calendarAllItems), [calendarAllItems, visibleMonthKey]);

  function shiftMonth(offset: number) {
    const [yearText, monthText] = visibleMonthKey.split("-");
    const year = Number(yearText);
    const month = Number(monthText);
    if (!year || !month) {
      return;
    }

    const next = new Date(year, month - 1 + offset, 1);
    setVisibleMonthKey(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`);
  }

  return (
    <article className="workspace-panel strategy-page-card">
      <div className="strategy-card-toolbar">
        <div>
          <strong>{sectionLabel}</strong>
          <p className="panel-subtext">{sectionDescription}</p>
        </div>
        <div className="strategy-inline-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={() => void onRefresh()}
            disabled={isLoading || isPublishing || isGeneratingCalendar}
          >
            刷新结果
          </button>
          <button
            type="button"
            className="primary-button"
            onClick={() => void onGenerate()}
            disabled={isLoading || isPublishing || isGeneratingCalendar || !canGenerateCalendar || isCalendarTaskActive}
          >
            {isGeneratingCalendar ? "提交中..." : isCalendarTaskActive ? "后台生成中..." : latestCalendar ? "继续生成下一个7天" : "生成营销日历"}
          </button>
        </div>
      </div>

      <section className="calendar-month-shell">
        <div className="calendar-month-toolbar">
          <div className="calendar-month-toolbar__main">
            <div className="calendar-month-nav">
              <button type="button" className="calendar-nav-button" onClick={() => shiftMonth(-1)} aria-label="查看上个月">
                &lt;
              </button>
              <button type="button" className="calendar-nav-button" onClick={() => shiftMonth(1)} aria-label="查看下个月">
                &gt;
              </button>
            </div>
            <div className="calendar-month-toolbar__label">
              <strong>{formatCalendarMonthLabel(visibleMonthKey)}</strong>
            </div>
          </div>
          <div className="calendar-month-toolbar__filters">
            <button
              type="button"
              className={`calendar-filter-button ${showGregorianFestivals ? "is-active" : ""}`}
              onClick={() => setShowGregorianFestivals((current) => !current)}
              aria-pressed={showGregorianFestivals}
            >
              公历节日
            </button>
            <button
              type="button"
              className={`calendar-filter-button ${showSolarTerms ? "is-active" : ""}`}
              onClick={() => setShowSolarTerms((current) => !current)}
              aria-pressed={showSolarTerms}
            >
              节气
            </button>
          </div>
        </div>

        {!canGenerateCalendar ? <div className="report-inline-tip">请先补齐品牌背景资料、机会洞察总报告和品牌增长报告，再开始生成营销日历。</div> : null}
        {isCalendarTaskActive ? (
          <div className="report-inline-tip">
            {latestCalendarTask?.taskStatus === "QUEUED"
              ? "营销日历正在排队生成，页面会自动刷新结果。"
              : latestCalendarTask?.phaseText
                ? `${latestCalendarTask.phaseText}${latestCalendarTask.phaseIndex && latestCalendarTask.phaseTotal ? `（${latestCalendarTask.phaseIndex}/${latestCalendarTask.phaseTotal}）` : ""}`
                : "营销日历正在后台生成，完成后会自动刷新到列表中。"}
          </div>
        ) : null}
        {calendarInlineError ? <div className="report-inline-tip report-inline-tip--error">{calendarInlineError}</div> : null}
        {!calendarAllItems.length ? <div className="calendar-month-empty">当前还没有营销日历内容，先点击右上角按钮生成排期，月历仍可用于查看节日与节气。</div> : null}

        <div className="calendar-weekdays">
          {["周日", "周一", "周二", "周三", "周四", "周五", "周六"].map((label) => (
            <span key={label}>{label}</span>
          ))}
        </div>

        <div className="calendar-grid calendar-grid--month calendar-grid--month-view">
          {monthCells.map((cell) => {
            const cellClasses = [
              "calendar-month-cell",
              cell.inCurrentMonth ? "" : "is-outside-month",
              cell.isToday ? "is-today" : "",
              cell.isRestDay ? "is-rest-day" : "",
              selectedCalendarItem?.date === cell.date ? "is-selected" : "",
            ]
              .filter(Boolean)
              .join(" ");

            const festivalLabels = showGregorianFestivals ? cell.gregorianFestivals.slice(0, 2) : [];
            const canOpenDetail = Boolean(cell.item) || canEditCalendar;

            return (
              <article
                className={cellClasses}
                key={cell.date}
                aria-label={`${cell.date} ${cell.lunarLabel}${cell.isRestDay ? " 休" : ""}`}
                onClick={canOpenDetail ? () => onOpenDetail(cell.date, cell.item?.id) : undefined}
                onKeyDown={
                  canOpenDetail
                    ? (event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          onOpenDetail(cell.date, cell.item?.id);
                        }
                      }
                    : undefined
                }
                role={canOpenDetail ? "button" : undefined}
                tabIndex={canOpenDetail ? 0 : undefined}
              >
                <div className="calendar-month-cell__header">
                  <div className="calendar-month-cell__date">
                    <strong>{cell.inCurrentMonth ? cell.day : `${cell.month}/${cell.day}`}</strong>
                    <span>{cell.lunarLabel}</span>
                  </div>
                  {cell.isRestDay ? <span className="calendar-rest-badge">休</span> : null}
                </div>
                <div className="calendar-month-cell__body">
                  {festivalLabels.map((label) => (
                    <p key={`${cell.date}-${label}`} className="calendar-annotation calendar-annotation--festival">
                      {label}
                    </p>
                  ))}
                  {showSolarTerms && cell.solarTerm ? <p className="calendar-annotation calendar-annotation--solar">{cell.solarTerm}</p> : null}
                  {cell.item ? (
                    <div className="calendar-month-entry">
                      <p className="calendar-month-entry__title">{resolveCalendarItemTitle(cell.item)}</p>
                    </div>
                  ) : (
                    <div className="calendar-month-entry calendar-month-entry--placeholder" />
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {isCalendarDetailOpen && (selectedCalendarItem || calendarItemDraft || selectedCalendarDate) ? (
        <div className="media-preview-overlay" onClick={onCloseDetail}>
          <div className="media-preview-dialog calendar-detail-dialog" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="media-preview-close" onClick={onCloseDetail}>
              关闭
            </button>
            <article className="entity-card personal-card calendar-detail-card calendar-detail-card--plain">
              <div className="calendar-detail-header">
                <div>
                  <strong>
                    {resolveCalendarItemTitle(
                      isEditingCalendarItem
                        ? calendarItemDraft || selectedCalendarItem
                        : selectedCalendarItem || calendarItemDraft || undefined,
                    ) || "填写当天营销日历"}
                  </strong>
                  <p className="personal-meta">{formatCalendarDate((selectedCalendarItem?.date || calendarItemDraft?.date || selectedCalendarDate || "").trim())}</p>
                </div>
                <div className="calendar-detail-actions">
                  {isEditingCalendarItem ? (
                    <>
                      <button type="button" className="secondary-button" onClick={onCancelEditDetail} disabled={isSavingCalendarItem}>
                        取消
                      </button>
                      <button type="button" className="primary-button" onClick={() => void onSaveDetail()} disabled={isSavingCalendarItem}>
                        {isSavingCalendarItem ? "保存中..." : selectedCalendarItem ? "保存修改" : "保存当天内容"}
                      </button>
                    </>
                  ) : (
                    <button type="button" className="secondary-button" onClick={onStartEditDetail}>
                      编辑当天内容
                    </button>
                  )}
                </div>
              </div>

              <div className="calendar-detail-plain-grid">
                <div className="calendar-detail-plain-column">
                  <DetailField
                    label="日期"
                    value={isEditingCalendarItem ? calendarItemDraft?.date || "" : readonlyDetailItem.date}
                    editing={isEditingCalendarItem}
                    onChange={(value) => onDetailFieldChange("date", value)}
                  />
                  <DetailField
                    label="节日/节气"
                    value={isEditingCalendarItem ? calendarItemDraft?.festivalOrSolarTerm || "" : readonlyDetailItem.festivalOrSolarTerm || ""}
                    editing={isEditingCalendarItem}
                    onChange={(value) => onDetailFieldChange("festivalOrSolarTerm", value)}
                  />
                  <SectionLabel title="品牌营销板块" />
                  <DetailField
                    label="今日营销主题"
                    value={isEditingCalendarItem ? calendarItemDraft?.brandMarketing.theme || "" : readonlyDetailItem.brandMarketing.theme}
                    editing={isEditingCalendarItem}
                    onChange={(value) => onDetailFieldChange("brandMarketing.theme", value)}
                  />
                  <DetailField
                    label="营销主题说明"
                    value={isEditingCalendarItem ? calendarItemDraft?.brandMarketing.description || "" : readonlyDetailItem.brandMarketing.description}
                    editing={isEditingCalendarItem}
                    multiline
                    onChange={(value) => onDetailFieldChange("brandMarketing.description", value)}
                  />
                  <SectionLabel title="小红书品牌号" />
                  <DetailField
                    label="今日选题"
                    value={isEditingCalendarItem ? calendarItemDraft?.xiaohongshu.brandAccount.topic || "" : readonlyDetailItem.xiaohongshu.brandAccount.topic}
                    editing={isEditingCalendarItem}
                    onChange={(value) => onDetailFieldChange("xiaohongshu.brandAccount.topic", value)}
                  />
                  <DetailField
                    label="选题说明"
                    value={
                      isEditingCalendarItem
                        ? calendarItemDraft?.xiaohongshu.brandAccount.description || ""
                        : readonlyDetailItem.xiaohongshu.brandAccount.description
                    }
                    editing={isEditingCalendarItem}
                    multiline
                    onChange={(value) => onDetailFieldChange("xiaohongshu.brandAccount.description", value)}
                  />
                  <DetailField
                    label="作品类型"
                    value={isEditingCalendarItem ? calendarItemDraft?.xiaohongshu.brandAccount.contentType || "" : readonlyDetailItem.xiaohongshu.brandAccount.contentType}
                    editing={isEditingCalendarItem}
                    onChange={(value) => onDetailFieldChange("xiaohongshu.brandAccount.contentType", value)}
                  />
                  <DetailField
                    label="笔记关键词"
                    value={
                      isEditingCalendarItem
                        ? (calendarItemDraft?.xiaohongshu.brandAccount.noteKeywords || []).join("\n")
                        : formatCalendarListValue(readonlyDetailItem.xiaohongshu.brandAccount.noteKeywords)
                    }
                    editing={isEditingCalendarItem}
                    multiline
                    onChange={(value) => onDetailListFieldChange("xiaohongshu.brandAccount.noteKeywords", value)}
                  />
                  <DetailField
                    label="封面关键词"
                    value={
                      isEditingCalendarItem
                        ? (calendarItemDraft?.xiaohongshu.brandAccount.coverKeywords || []).join("\n")
                        : formatCalendarListValue(readonlyDetailItem.xiaohongshu.brandAccount.coverKeywords)
                    }
                    editing={isEditingCalendarItem}
                    multiline
                    onChange={(value) => onDetailListFieldChange("xiaohongshu.brandAccount.coverKeywords", value)}
                  />
                  <DetailField
                    label="标题建议"
                    value={
                      isEditingCalendarItem
                        ? (calendarItemDraft?.xiaohongshu.brandAccount.titleSuggestions || []).join("\n")
                        : formatCalendarListValue(readonlyDetailItem.xiaohongshu.brandAccount.titleSuggestions)
                    }
                    editing={isEditingCalendarItem}
                    multiline
                    onChange={(value) => onDetailListFieldChange("xiaohongshu.brandAccount.titleSuggestions", value)}
                  />
                  <DetailField
                    label="预期效果"
                    value={
                      isEditingCalendarItem
                        ? calendarItemDraft?.xiaohongshu.brandAccount.expectedPerformance || ""
                        : readonlyDetailItem.xiaohongshu.brandAccount.expectedPerformance
                    }
                    editing={isEditingCalendarItem}
                    multiline
                    onChange={(value) => onDetailFieldChange("xiaohongshu.brandAccount.expectedPerformance", value)}
                  />
                  <SectionLabel title="小红书员工号" />
                  <DetailField
                    label="今日选题"
                    value={isEditingCalendarItem ? calendarItemDraft?.xiaohongshu.employeeAccount.topic || "" : readonlyDetailItem.xiaohongshu.employeeAccount.topic}
                    editing={isEditingCalendarItem}
                    onChange={(value) => onDetailFieldChange("xiaohongshu.employeeAccount.topic", value)}
                  />
                  <DetailField
                    label="选题说明"
                    value={isEditingCalendarItem ? calendarItemDraft?.xiaohongshu.employeeAccount.description || "" : readonlyDetailItem.xiaohongshu.employeeAccount.description}
                    editing={isEditingCalendarItem}
                    multiline
                    onChange={(value) => onDetailFieldChange("xiaohongshu.employeeAccount.description", value)}
                  />
                  <DetailField
                    label="作品类型"
                    value={isEditingCalendarItem ? calendarItemDraft?.xiaohongshu.employeeAccount.contentType || "" : readonlyDetailItem.xiaohongshu.employeeAccount.contentType}
                    editing={isEditingCalendarItem}
                    onChange={(value) => onDetailFieldChange("xiaohongshu.employeeAccount.contentType", value)}
                  />
                  <DetailField
                    label="笔记关键词"
                    value={
                      isEditingCalendarItem
                        ? (calendarItemDraft?.xiaohongshu.employeeAccount.noteKeywords || []).join("\n")
                        : formatCalendarListValue(readonlyDetailItem.xiaohongshu.employeeAccount.noteKeywords)
                    }
                    editing={isEditingCalendarItem}
                    multiline
                    onChange={(value) => onDetailListFieldChange("xiaohongshu.employeeAccount.noteKeywords", value)}
                  />
                  <DetailField
                    label="封面关键词"
                    value={
                      isEditingCalendarItem
                        ? (calendarItemDraft?.xiaohongshu.employeeAccount.coverKeywords || []).join("\n")
                        : formatCalendarListValue(readonlyDetailItem.xiaohongshu.employeeAccount.coverKeywords)
                    }
                    editing={isEditingCalendarItem}
                    multiline
                    onChange={(value) => onDetailListFieldChange("xiaohongshu.employeeAccount.coverKeywords", value)}
                  />
                  <DetailField
                    label="标题建议"
                    value={
                      isEditingCalendarItem
                        ? (calendarItemDraft?.xiaohongshu.employeeAccount.titleSuggestions || []).join("\n")
                        : formatCalendarListValue(readonlyDetailItem.xiaohongshu.employeeAccount.titleSuggestions)
                    }
                    editing={isEditingCalendarItem}
                    multiline
                    onChange={(value) => onDetailListFieldChange("xiaohongshu.employeeAccount.titleSuggestions", value)}
                  />
                  <DetailField
                    label="预期效果"
                    value={
                      isEditingCalendarItem
                        ? calendarItemDraft?.xiaohongshu.employeeAccount.expectedPerformance || ""
                        : readonlyDetailItem.xiaohongshu.employeeAccount.expectedPerformance
                    }
                    editing={isEditingCalendarItem}
                    multiline
                    onChange={(value) => onDetailFieldChange("xiaohongshu.employeeAccount.expectedPerformance", value)}
                  />
                </div>

                <div className="calendar-detail-plain-column">
                  <SectionLabel title="抖音品牌号" />
                  <DouyinDetailFields
                    prefix="douyin.brandAccount"
                    block={isEditingCalendarItem ? calendarItemDraft?.douyin.brandAccount || readonlyDetailItem.douyin.brandAccount : readonlyDetailItem.douyin.brandAccount}
                    editing={isEditingCalendarItem}
                    onFieldChange={onDetailFieldChange}
                    onListFieldChange={onDetailListFieldChange}
                    formatCalendarListValue={formatCalendarListValue}
                  />
                  <SectionLabel title="抖音IP号" />
                  <DouyinDetailFields
                    prefix="douyin.ipAccount"
                    block={isEditingCalendarItem ? calendarItemDraft?.douyin.ipAccount || readonlyDetailItem.douyin.ipAccount : readonlyDetailItem.douyin.ipAccount}
                    editing={isEditingCalendarItem}
                    onFieldChange={onDetailFieldChange}
                    onListFieldChange={onDetailListFieldChange}
                    formatCalendarListValue={formatCalendarListValue}
                  />
                  <SectionLabel title="抖音员工号" />
                  <DouyinDetailFields
                    prefix="douyin.employeeAccount"
                    block={isEditingCalendarItem ? calendarItemDraft?.douyin.employeeAccount || readonlyDetailItem.douyin.employeeAccount : readonlyDetailItem.douyin.employeeAccount}
                    editing={isEditingCalendarItem}
                    onFieldChange={onDetailFieldChange}
                    onListFieldChange={onDetailListFieldChange}
                    formatCalendarListValue={formatCalendarListValue}
                  />
                  <SectionLabel title="朋友圈" />
                  <DetailField
                    label="今日选题"
                    value={isEditingCalendarItem ? calendarItemDraft?.moments.topic || "" : readonlyDetailItem.moments.topic}
                    editing={isEditingCalendarItem}
                    onChange={(value) => onDetailFieldChange("moments.topic", value)}
                  />
                  <DetailField
                    label="选题说明"
                    value={isEditingCalendarItem ? calendarItemDraft?.moments.description || "" : readonlyDetailItem.moments.description}
                    editing={isEditingCalendarItem}
                    multiline
                    onChange={(value) => onDetailFieldChange("moments.description", value)}
                  />
                  <DetailField
                    label="呈现形式"
                    value={isEditingCalendarItem ? calendarItemDraft?.moments.presentationFormat || "" : readonlyDetailItem.moments.presentationFormat}
                    editing={isEditingCalendarItem}
                    onChange={(value) => onDetailFieldChange("moments.presentationFormat", value)}
                  />
                </div>
              </div>
            </article>
          </div>
        </div>
      ) : null}
    </article>
  );
}

type DetailFieldProps = {
  label: string;
  value: string;
  editing: boolean;
  multiline?: boolean;
  onChange: (value: string) => void;
};

function DetailField(props: DetailFieldProps) {
  return (
    <div className="calendar-detail-row">
      <span>{props.label}</span>
      {props.editing ? (
        props.multiline ? (
          <textarea value={props.value} onChange={(event) => props.onChange(event.target.value)} rows={props.label === "选题名称" ? 3 : 5} />
        ) : (
          <input value={props.value} onChange={(event) => props.onChange(event.target.value)} />
        )
      ) : (
        <strong>{props.value?.trim() ? props.value : "未填写"}</strong>
      )}
    </div>
  );
}

function SectionLabel(props: { title: string }) {
  return <div className="calendar-detail-row"><span>{props.title}</span><strong> </strong></div>;
}

function DouyinDetailFields(props: {
  prefix: string;
  block: XiaohongshuMarketingCalendarItem["douyin"]["brandAccount"];
  editing: boolean;
  onFieldChange: (path: string, value: string) => void;
  onListFieldChange: (path: string, value: string) => void;
  formatCalendarListValue: (value?: string[]) => string;
}) {
  const { prefix, block, editing, onFieldChange, onListFieldChange, formatCalendarListValue } = props;
  return (
    <>
      <DetailField label="今日选题" value={block.topic} editing={editing} onChange={(value) => onFieldChange(`${prefix}.topic`, value)} />
      <DetailField label="选题说明" value={block.description} editing={editing} multiline onChange={(value) => onFieldChange(`${prefix}.description`, value)} />
      <DetailField label="作品类型" value={block.contentType} editing={editing} onChange={(value) => onFieldChange(`${prefix}.contentType`, value)} />
      <DetailField label="呈现形式" value={block.presentationFormat} editing={editing} onChange={(value) => onFieldChange(`${prefix}.presentationFormat`, value)} />
      <DetailField
        label="文案关键词"
        value={editing ? block.copyKeywords.join("\n") : formatCalendarListValue(block.copyKeywords)}
        editing={editing}
        multiline
        onChange={(value) => onListFieldChange(`${prefix}.copyKeywords`, value)}
      />
      <DetailField
        label="封面关键词"
        value={editing ? block.coverKeywords.join("\n") : formatCalendarListValue(block.coverKeywords)}
        editing={editing}
        multiline
        onChange={(value) => onListFieldChange(`${prefix}.coverKeywords`, value)}
      />
      <DetailField
        label="标题建议"
        value={editing ? block.titleSuggestions.join("\n") : formatCalendarListValue(block.titleSuggestions)}
        editing={editing}
        multiline
        onChange={(value) => onListFieldChange(`${prefix}.titleSuggestions`, value)}
      />
      <DetailField
        label="预期效果"
        value={block.expectedPerformance}
        editing={editing}
        multiline
        onChange={(value) => onFieldChange(`${prefix}.expectedPerformance`, value)}
      />
    </>
  );
}

function resolveCalendarItemTitle(item?: XiaohongshuMarketingCalendarItem | null) {
  if (!item) {
    return "未命名主题";
  }
  return (
    item.brandMarketing.theme
    || item.xiaohongshu.brandAccount.topic
    || item.douyin.brandAccount.topic
    || item.moments.topic
    || "未命名主题"
  );
}

function buildEmptyCalendarItem(date: string): XiaohongshuMarketingCalendarItem {
  return {
    id: date ? `cal_preview_${date.replace(/-/g, "")}` : "cal_preview_empty",
    date,
    festivalOrSolarTerm: "",
    brandMarketing: {
      theme: "",
      description: "",
    },
    xiaohongshu: {
      brandAccount: {
        topic: "",
        description: "",
        contentType: "",
        noteKeywords: [],
        coverKeywords: [],
        titleSuggestions: [],
        expectedPerformance: "",
      },
      employeeAccount: {
        topic: "",
        description: "",
        contentType: "",
        noteKeywords: [],
        coverKeywords: [],
        titleSuggestions: [],
        expectedPerformance: "",
      },
    },
    douyin: {
      brandAccount: {
        topic: "",
        description: "",
        contentType: "",
        presentationFormat: "",
        copyKeywords: [],
        coverKeywords: [],
        titleSuggestions: [],
        expectedPerformance: "",
      },
      ipAccount: {
        topic: "",
        description: "",
        contentType: "",
        presentationFormat: "",
        copyKeywords: [],
        coverKeywords: [],
        titleSuggestions: [],
        expectedPerformance: "",
      },
      employeeAccount: {
        topic: "",
        description: "",
        contentType: "",
        presentationFormat: "",
        copyKeywords: [],
        coverKeywords: [],
        titleSuggestions: [],
        expectedPerformance: "",
      },
    },
    moments: {
      topic: "",
      description: "",
      presentationFormat: "",
    },
  };
}
