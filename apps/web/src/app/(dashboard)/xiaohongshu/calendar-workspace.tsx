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
  resolvedCalendarMonth: string;
  activeCalendarMonthIndex: number;
  calendarMonthKeys: string[];
  calendarMonthMatrix: Array<XiaohongshuMarketingCalendarItem | null>;
  isCalendarDetailOpen: boolean;
  selectedCalendarItem?: XiaohongshuMarketingCalendarItem;
  onRefresh: AsyncAction;
  onGenerate: AsyncAction;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onOpenDetail: (itemId: string) => void;
  onCloseDetail: () => void;
  getTaskStatusClass: (status?: XiaohongshuMarketingCalendarTaskRecord["taskStatus"]) => string;
  formatDateTime: OptionalDateFormatter;
  formatCalendarMonthLabel: (value: string) => string;
  formatCalendarDay: (value: string) => string;
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
    resolvedCalendarMonth,
    activeCalendarMonthIndex,
    calendarMonthKeys,
    calendarMonthMatrix,
    isCalendarDetailOpen,
    selectedCalendarItem,
    onRefresh,
    onGenerate,
    onPrevMonth,
    onNextMonth,
    onOpenDetail,
    onCloseDetail,
    getTaskStatusClass,
    formatDateTime,
    formatCalendarMonthLabel,
    formatCalendarDay,
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
            <p>按月查看营销日历；点击任一日期卡片后，在弹窗中查看当天的完整选题详情。</p>
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
        {!canGenerateCalendar ? <div className="report-inline-tip">请先完成品牌增长报告、全年营销规划和小红书营销策划方案，再开始生成营销日历。</div> : null}
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
            <div className="calendar-month-toolbar">
              <div>
                <span>月历视图</span>
                <strong>{formatCalendarMonthLabel(resolvedCalendarMonth)}</strong>
              </div>
              <div className="strategy-inline-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={onPrevMonth}
                  disabled={activeCalendarMonthIndex <= 0}
                >
                  上个月
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={onNextMonth}
                  disabled={activeCalendarMonthIndex >= calendarMonthKeys.length - 1}
                >
                  下个月
                </button>
              </div>
            </div>
            <div className="calendar-weekdays">
              {["一", "二", "三", "四", "五", "六", "日"].map((weekday) => (
                <span key={weekday}>{weekday}</span>
              ))}
            </div>
            <div className="calendar-grid calendar-grid--month">
              {calendarMonthMatrix.map((cell, index) =>
                cell ? (
                  <article
                    className="entity-card personal-card calendar-card calendar-card--month calendar-card--interactive"
                    key={cell.date}
                    onClick={() => onOpenDetail(cell.id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        onOpenDetail(cell.id);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="calendar-card-date">
                      <strong>{formatCalendarDay(cell.date)}</strong>
                      <span>{formatCalendarWeekday(cell.date)}</span>
                    </div>
                    <div className="calendar-card-body">
                      <p className="calendar-card-festival">{getCalendarFestivalLabel(cell.date)}</p>
                      <p className="calendar-card-topic">{cell.topicName}</p>
                    </div>
                  </article>
                ) : (
                  <div className="calendar-card calendar-card--empty" key={`empty-${index}`} />
                ),
              )}
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
            <article className="entity-card personal-card">
              <div className="entity-card-head">
                <div>
                  <strong>{selectedCalendarItem.topicName}</strong>
                  <p className="personal-meta">{formatCalendarDate(selectedCalendarItem.date)}</p>
                </div>
              </div>
              <div className="personal-grid">
                <div>
                  <span>日期</span>
                  <strong>{formatCalendarDate(selectedCalendarItem.date)}</strong>
                </div>
                <div>
                  <span>选题名称</span>
                  <strong>{selectedCalendarItem.topicName}</strong>
                </div>
                <div>
                  <span>植入产品</span>
                  <strong>{formatCalendarOptionalValue(selectedCalendarItem.productName)}</strong>
                </div>
                <div>
                  <span>适合人群</span>
                  <strong>{formatCalendarOptionalValue(selectedCalendarItem.targetAudience)}</strong>
                </div>
                <div>
                  <span>内容目的</span>
                  <strong>{formatCalendarOptionalValue(selectedCalendarItem.contentGoal)}</strong>
                </div>
                <div>
                  <span>表达重点</span>
                  <strong>{formatCalendarOptionalValue(selectedCalendarItem.expressionFocus)}</strong>
                </div>
                <div className="field-full">
                  <span>选题内容</span>
                  <strong>{formatCalendarOptionalValue(selectedCalendarItem.topicContent)}</strong>
                </div>
                <div className="field-full">
                  <span>标题方向</span>
                  <strong>{formatCalendarListValue(selectedCalendarItem.titleDirections)}</strong>
                </div>
                <div className="field-full">
                  <span>正文结构</span>
                  <strong>{formatCalendarOptionalValue(selectedCalendarItem.bodyStructure)}</strong>
                </div>
                <div>
                  <span>封面形式</span>
                  <strong>{formatCalendarOptionalValue(selectedCalendarItem.coverFormat)}</strong>
                </div>
                <div>
                  <span>封面关键词</span>
                  <strong>{formatCalendarListValue(selectedCalendarItem.coverKeywords)}</strong>
                </div>
                <div className="field-full">
                  <span>封面及配图说明</span>
                  <strong>{formatCalendarOptionalValue(selectedCalendarItem.imageBrief)}</strong>
                </div>
              </div>
            </article>
          </div>
        </div>
      ) : null}
    </article>
  );
}
