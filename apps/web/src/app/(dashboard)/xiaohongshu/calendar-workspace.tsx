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
  selectedCalendarItem?: XiaohongshuMarketingCalendarItem;
  calendarItemDraft: XiaohongshuMarketingCalendarItem | null;
  isEditingCalendarItem: boolean;
  isSavingCalendarItem: boolean;
  onRefresh: AsyncAction;
  onGenerate: AsyncAction;
  onOpenDetail: (itemId: string) => void;
  onCloseDetail: () => void;
  onStartEditDetail: () => void;
  onCancelEditDetail: () => void;
  onSaveDetail: AsyncAction;
  onDetailFieldChange: (
    field:
      | "date"
      | "topicName"
      | "productName"
      | "noteType"
      | "targetAudience"
      | "contentGoal"
      | "expressionFocus"
      | "topicContent"
      | "bodyStructure"
      | "coverFormat"
      | "imageBrief",
    value: string,
  ) => void;
  onDetailListFieldChange: (field: "noteKeywords" | "titleDirections" | "coverKeywords", value: string) => void;
  formatCalendarWeekday: (value: string) => string;
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
    selectedCalendarItem,
    calendarItemDraft,
    isEditingCalendarItem,
    isSavingCalendarItem,
    onRefresh,
    onGenerate,
    onOpenDetail,
    onCloseDetail,
    onStartEditDetail,
    onCancelEditDetail,
    onSaveDetail,
    onDetailFieldChange,
    onDetailListFieldChange,
    formatCalendarWeekday,
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
            {isGeneratingCalendar ? "提交中..." : isCalendarTaskActive ? "后台生成中..." : latestCalendar ? "重新生成日历" : "生成营销日历"}
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

        {!canGenerateCalendar ? <div className="report-inline-tip">请先完成品牌增长报告、半年营销规划和小红书营销策划方案，再开始生成营销日历。</div> : null}
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
          {["周一", "周二", "周三", "周四", "周五", "周六", "周日"].map((label) => (
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
            const hasInteractiveTopic = Boolean(cell.item);

            return (
              <article
                className={cellClasses}
                key={cell.date}
                aria-label={`${cell.date} ${cell.lunarLabel}${cell.isRestDay ? " 休" : ""}`}
                onClick={cell.item ? () => onOpenDetail(cell.item!.id) : undefined}
                onKeyDown={
                  cell.item
                    ? (event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          onOpenDetail(cell.item!.id);
                        }
                      }
                    : undefined
                }
                role={hasInteractiveTopic ? "button" : undefined}
                tabIndex={hasInteractiveTopic ? 0 : undefined}
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
                      <span className="calendar-month-entry__weekday">{formatCalendarWeekday(cell.item.date)}</span>
                      <p className="calendar-month-entry__title">{cell.item.topicName}</p>
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

      {isCalendarDetailOpen && selectedCalendarItem ? (
        <div className="media-preview-overlay" onClick={onCloseDetail}>
          <div className="media-preview-dialog calendar-detail-dialog" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="media-preview-close" onClick={onCloseDetail}>
              关闭
            </button>
            <article className="entity-card personal-card calendar-detail-card calendar-detail-card--plain">
              <div className="calendar-detail-header">
                <div>
                  <strong>{isEditingCalendarItem ? calendarItemDraft?.topicName || selectedCalendarItem.topicName : selectedCalendarItem.topicName}</strong>
                  <p className="personal-meta">{formatCalendarDate(selectedCalendarItem.date)}</p>
                </div>
                <div className="calendar-detail-actions">
                  {isEditingCalendarItem ? (
                    <>
                      <button type="button" className="secondary-button" onClick={onCancelEditDetail} disabled={isSavingCalendarItem}>
                        取消
                      </button>
                      <button type="button" className="primary-button" onClick={() => void onSaveDetail()} disabled={isSavingCalendarItem}>
                        {isSavingCalendarItem ? "保存中..." : "保存修改"}
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
                    value={isEditingCalendarItem ? calendarItemDraft?.date || "" : selectedCalendarItem.date}
                    editing={isEditingCalendarItem}
                    onChange={(value) => onDetailFieldChange("date", value)}
                  />
                  <DetailField
                    label="植入产品"
                    value={isEditingCalendarItem ? calendarItemDraft?.productName || "" : selectedCalendarItem.productName || ""}
                    editing={isEditingCalendarItem}
                    onChange={(value) => onDetailFieldChange("productName", value)}
                  />
                  <DetailField
                    label="适合人群"
                    value={isEditingCalendarItem ? calendarItemDraft?.targetAudience || "" : selectedCalendarItem.targetAudience || ""}
                    editing={isEditingCalendarItem}
                    multiline
                    onChange={(value) => onDetailFieldChange("targetAudience", value)}
                  />
                  <DetailField
                    label="表达重点"
                    value={isEditingCalendarItem ? calendarItemDraft?.expressionFocus || "" : selectedCalendarItem.expressionFocus || ""}
                    editing={isEditingCalendarItem}
                    multiline
                    onChange={(value) => onDetailFieldChange("expressionFocus", value)}
                  />
                  <DetailField
                    label="选题内容"
                    value={isEditingCalendarItem ? calendarItemDraft?.topicContent || "" : selectedCalendarItem.topicContent || ""}
                    editing={isEditingCalendarItem}
                    multiline
                    onChange={(value) => onDetailFieldChange("topicContent", value)}
                  />
                  <DetailField
                    label="标题方向"
                    value={
                      isEditingCalendarItem
                        ? (calendarItemDraft?.titleDirections || []).join("\n")
                        : formatCalendarListValue(selectedCalendarItem.titleDirections)
                    }
                    editing={isEditingCalendarItem}
                    multiline
                    onChange={(value) => onDetailListFieldChange("titleDirections", value)}
                  />
                  <DetailField
                    label="正文结构"
                    value={isEditingCalendarItem ? calendarItemDraft?.bodyStructure || "" : selectedCalendarItem.bodyStructure || ""}
                    editing={isEditingCalendarItem}
                    multiline
                    onChange={(value) => onDetailFieldChange("bodyStructure", value)}
                  />
                </div>

                <div className="calendar-detail-plain-column">
                  <DetailField
                    label="选题名称"
                    value={isEditingCalendarItem ? calendarItemDraft?.topicName || "" : selectedCalendarItem.topicName}
                    editing={isEditingCalendarItem}
                    multiline
                    onChange={(value) => onDetailFieldChange("topicName", value)}
                  />
                  <DetailField
                    label="笔记类型"
                    value={isEditingCalendarItem ? calendarItemDraft?.noteType || "" : selectedCalendarItem.noteType || ""}
                    editing={isEditingCalendarItem}
                    onChange={(value) => onDetailFieldChange("noteType", value)}
                  />
                  <DetailField
                    label="内容目的"
                    value={isEditingCalendarItem ? calendarItemDraft?.contentGoal || "" : selectedCalendarItem.contentGoal || ""}
                    editing={isEditingCalendarItem}
                    multiline
                    onChange={(value) => onDetailFieldChange("contentGoal", value)}
                  />
                  <DetailField
                    label="笔记关键词"
                    value={
                      isEditingCalendarItem
                        ? (calendarItemDraft?.noteKeywords || []).join("\n")
                        : formatCalendarListValue(selectedCalendarItem.noteKeywords)
                    }
                    editing={isEditingCalendarItem}
                    multiline
                    onChange={(value) => onDetailListFieldChange("noteKeywords", value)}
                  />
                  <DetailField
                    label="封面形式"
                    value={isEditingCalendarItem ? calendarItemDraft?.coverFormat || "" : selectedCalendarItem.coverFormat || ""}
                    editing={isEditingCalendarItem}
                    onChange={(value) => onDetailFieldChange("coverFormat", value)}
                  />
                  <DetailField
                    label="封面关键词"
                    value={
                      isEditingCalendarItem
                        ? (calendarItemDraft?.coverKeywords || []).join("\n")
                        : formatCalendarListValue(selectedCalendarItem.coverKeywords)
                    }
                    editing={isEditingCalendarItem}
                    multiline
                    onChange={(value) => onDetailListFieldChange("coverKeywords", value)}
                  />
                  <DetailField
                    label="封面及配图说明"
                    value={isEditingCalendarItem ? calendarItemDraft?.imageBrief || "" : selectedCalendarItem.imageBrief || ""}
                    editing={isEditingCalendarItem}
                    multiline
                    onChange={(value) => onDetailFieldChange("imageBrief", value)}
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
