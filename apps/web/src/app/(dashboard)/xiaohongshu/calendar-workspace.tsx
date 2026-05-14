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
  onRefresh: AsyncAction;
  onGenerate: AsyncAction;
  onOpenDetail: (itemId: string) => void;
  onCloseDetail: () => void;
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
    onRefresh,
    onGenerate,
    onOpenDetail,
    onCloseDetail,
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
                <strong>{latestCalendar?.summary || "按真实日历卡片查看未来 7 天主题与日期安排"}</strong>
              </div>
              <div className="calendar-seven-day-legend">
                <span>点击单日卡片</span>
                <strong>查看完整选题、标题方向、正文结构和配图说明</strong>
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
                    <p className="calendar-card-festival">{getCalendarFestivalLabel(item.date) || "日常排期"}</p>
                    <p className="calendar-card-topic">{item.topicName}</p>
                    <p className="calendar-card-summary">{formatCalendarOptionalValue(item.contentGoal)}</p>
                    <div className="calendar-card-tags">
                      <span>{formatCalendarOptionalValue(item.noteType)}</span>
                      <span>{formatCalendarOptionalValue(item.productName || "未植入产品")}</span>
                    </div>
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
            <article className="entity-card personal-card calendar-detail-card">
              <div className="calendar-detail-hero">
                <div>
                  <p className="calendar-detail-eyebrow">{formatCalendarDate(selectedCalendarItem.date)}</p>
                  <strong>{selectedCalendarItem.topicName}</strong>
                  <p className="personal-meta">{formatCalendarOptionalValue(selectedCalendarItem.contentGoal)}</p>
                </div>
                <div className="calendar-detail-hero-tags">
                  <span>{formatCalendarOptionalValue(selectedCalendarItem.noteType)}</span>
                  <span>{getCalendarFestivalLabel(selectedCalendarItem.date) || "日常排期"}</span>
                </div>
              </div>

              <div className="calendar-detail-grid">
                <section className="calendar-detail-section">
                  <h4>基础信息</h4>
                  <div className="calendar-detail-info-grid">
                    <div>
                      <span>日期</span>
                      <strong>{formatCalendarDate(selectedCalendarItem.date)}</strong>
                    </div>
                    <div>
                      <span>植入产品</span>
                      <strong>{formatCalendarOptionalValue(selectedCalendarItem.productName)}</strong>
                    </div>
                    <div>
                      <span>笔记类型</span>
                      <strong>{formatCalendarOptionalValue(selectedCalendarItem.noteType)}</strong>
                    </div>
                    <div>
                      <span>适合人群</span>
                      <strong>{formatCalendarOptionalValue(selectedCalendarItem.targetAudience)}</strong>
                    </div>
                  </div>
                </section>

                <section className="calendar-detail-section">
                  <h4>选题策略</h4>
                  <div className="calendar-detail-stack">
                    <div>
                      <span>内容目的</span>
                      <strong>{formatCalendarOptionalValue(selectedCalendarItem.contentGoal)}</strong>
                    </div>
                    <div>
                      <span>表达重点</span>
                      <strong>{formatCalendarOptionalValue(selectedCalendarItem.expressionFocus)}</strong>
                    </div>
                    <div>
                      <span>选题内容</span>
                      <strong>{formatCalendarOptionalValue(selectedCalendarItem.topicContent)}</strong>
                    </div>
                  </div>
                </section>

                <section className="calendar-detail-section">
                  <h4>关键词与标题</h4>
                  <div className="calendar-detail-stack">
                    <div>
                      <span>笔记关键词</span>
                      <div className="calendar-detail-chip-row">
                        {selectedCalendarItem.noteKeywords?.length ? selectedCalendarItem.noteKeywords.map((keyword) => (
                          <em key={keyword}>{keyword}</em>
                        )) : <strong>未填写</strong>}
                      </div>
                    </div>
                    <div>
                      <span>标题方向</span>
                      <strong>{formatCalendarListValue(selectedCalendarItem.titleDirections)}</strong>
                    </div>
                    <div>
                      <span>正文结构</span>
                      <strong>{formatCalendarOptionalValue(selectedCalendarItem.bodyStructure)}</strong>
                    </div>
                  </div>
                </section>

                <section className="calendar-detail-section">
                  <h4>封面与配图</h4>
                  <div className="calendar-detail-stack">
                    <div>
                      <span>封面形式</span>
                      <strong>{formatCalendarOptionalValue(selectedCalendarItem.coverFormat)}</strong>
                    </div>
                    <div>
                      <span>封面关键词</span>
                      <div className="calendar-detail-chip-row">
                        {selectedCalendarItem.coverKeywords?.length ? selectedCalendarItem.coverKeywords.map((keyword) => (
                          <em key={keyword}>{keyword}</em>
                        )) : <strong>未填写</strong>}
                      </div>
                    </div>
                    <div>
                      <span>封面及配图说明</span>
                      <strong>{formatCalendarOptionalValue(selectedCalendarItem.imageBrief)}</strong>
                    </div>
                  </div>
                </section>
              </div>
            </article>
          </div>
        </div>
      ) : null}
    </article>
  );
}
