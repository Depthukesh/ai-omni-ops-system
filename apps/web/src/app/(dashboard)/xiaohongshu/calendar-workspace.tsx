"use client";

import { type XiaohongshuMarketingCalendarItem, type XiaohongshuMarketingCalendarRecord, type XiaohongshuMarketingCalendarTaskRecord } from "../../../services/reports";
import { type AsyncAction, type OptionalDateFormatter } from "./shared-types";

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
  getTaskStatusClass: (status?: XiaohongshuMarketingCalendarTaskRecord["taskStatus"]) => string;
  formatDateTime: OptionalDateFormatter;
  formatCalendarMonthDay: (value: string) => string;
  formatCalendarWeekday: (value: string) => string;
  getCalendarFestivalLabel: (value: string) => string;
  formatCalendarDate: (value: string) => string;
  formatCalendarOptionalValue: OptionalDateFormatter;
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
    calendarTaskStatusText,
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
    getTaskStatusClass,
    formatDateTime,
    formatCalendarMonthDay,
    formatCalendarWeekday,
    getCalendarFestivalLabel,
    formatCalendarDate,
    formatCalendarOptionalValue,
    formatCalendarListValue,
  } = props;

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
            {isGeneratingCalendar ? "提交中..." : isCalendarTaskActive ? "后台生成中..." : latestCalendar ? "生成接下来7天" : "一键生成"}
          </button>
        </div>
      </div>

      <article className="light-data-panel report-editor-panel report-editor-panel--compact">
        <div className="report-editor-head">
          <div>
            <strong>{latestCalendar?.title || "营销日历"}</strong>
            <p>按未来 7 天查看营销日历；点击任一日期卡片后，在详情面板中查看当天的完整执行方案。</p>
          </div>
          <div className="report-editor-actions">
            <span className={`archive-pill ${canGenerateCalendar ? "status-ready" : "status-in_progress"}`}>
              {canGenerateCalendar ? "已满足生成条件" : "等待前置输入"}
            </span>
            {latestCalendarTask ? (
              <span className={`archive-pill ${getTaskStatusClass(latestCalendarTask.taskStatus)}`}>{calendarTaskStatusText}</span>
            ) : null}
            {latestCalendar?.generatedAt ? (
              <span className="archive-pill status-ready">{formatDateTime(latestCalendar.generatedAt)}</span>
            ) : null}
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
        {!calendarAllItems.length ? (
          <div className="empty-state">当前还没有营销日历，点击右上角“一键生成”开始生成未来 7 天排期。</div>
        ) : (
          <div>
            <div className="calendar-seven-day-toolbar">
              <div>
                <span>未来 7 天日历</span>
                <strong>{latestCalendar?.summary || "点击单日卡片查看详情，并在详情弹窗中直接修改当天内容。"}</strong>
              </div>
            </div>
            <div className="calendar-grid calendar-grid--seven-day">
              {calendarAllItems.map((item) => (
                <article
                  className="entity-card personal-card calendar-card calendar-card--seven-day calendar-card--interactive"
                  key={item.id}
                  onClick={() => onOpenDetail(item.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onOpenDetail(item.id);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <div className="calendar-card-date">
                    <strong>{formatCalendarMonthDay(item.date)}</strong>
                    <span>{formatCalendarWeekday(item.date)}</span>
                  </div>
                  <div className="calendar-card-body">
                    <p className="calendar-card-topic">{item.topicName}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}
      </article>

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
