"use client";

import type {
  AsyncAction,
  BrandGrowthReportPageKey,
  OptionalDateFormatter,
} from "./shared-types";
import type {
  AnnualMarketingPlanRow,
  AnnualMarketingPlanWorkspace,
  GrowthReportWorkspace,
  OpportunityInsightWorkspace,
  VisualGrowthReportWorkspace,
} from "../../../services/reports";

export interface BrandGrowthReportWorkspaceProps {
  activePage: BrandGrowthReportPageKey;
  reportWorkspace: GrowthReportWorkspace;
  opportunityInsightWorkspace: OpportunityInsightWorkspace;
  visualReportWorkspace: VisualGrowthReportWorkspace;
  annualMarketingPlanWorkspace: AnnualMarketingPlanWorkspace;
  reportMarkdownDraft: string;
  onReportMarkdownDraftChange: (value: string) => void;
  previewHtml: string;
  previewDocument: string;
  growthTaskStatusText: string;
  opportunityTaskStatusText: string;
  visualTaskStatusText: string;
  annualTaskStatusText: string;
  previewRows: AnnualMarketingPlanRow[];
  isHydrating: boolean;
  isGeneratingReport: boolean;
  isGeneratingOpportunityInsight: boolean;
  isGeneratingVisualReport: boolean;
  isGrowthReportTaskActive: boolean;
  isOpportunityInsightTaskActive: boolean;
  isVisualReportTaskActive: boolean;
  isAnnualMarketingPlanTaskActive: boolean;
  onGenerateReport: AsyncAction;
  onGenerateOpportunityInsight: AsyncAction;
  formatDateTime: OptionalDateFormatter;
}

export function BrandGrowthReportWorkspace(props: BrandGrowthReportWorkspaceProps) {
  if (props.activePage === "growthReport") {
    const latestReport = props.reportWorkspace.latest;
    const latestTask = props.reportWorkspace.latestTask;
    return (
      <article className="workspace-panel strategy-page-card">
        {!latestReport && props.isGrowthReportTaskActive ? (
          <article className="light-data-panel">
            <h3>品牌增长报告{latestTask?.taskStatus === "QUEUED" ? "排队中" : "生成中"}</h3>
            <p>当前任务已提交，正在后台调用模型生成。页面会自动刷新结果，无需停留在当前请求中等待。</p>
          </article>
        ) : latestReport ? (
          <article className="light-data-panel report-editor-panel">
            <div className="report-editor-head">
              <div>
                <strong>{latestReport.title}</strong>
                <p>Markdown 格式，可直接修改并保存这份品牌增长报告。</p>
              </div>
              <div className="report-editor-actions">
                <span className="archive-pill status-ready">{props.formatDateTime(latestReport.generatedAt)}</span>
                {props.growthTaskStatusText ? (
                  <span className="archive-pill status-pending">{props.growthTaskStatusText}</span>
                ) : null}
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => void props.onGenerateReport()}
                  disabled={props.isGeneratingReport || props.isHydrating || props.isGrowthReportTaskActive}
                >
                  {props.isGeneratingReport ? "提交中..." : props.isGrowthReportTaskActive ? "生成中..." : "重新生成"}
                </button>
              </div>
            </div>
            {latestTask?.taskStatus === "FAILED" && latestTask.errorMessage ? (
              <div className="visual-report-source-card">
                <span>最近失败原因</span>
                <strong>{latestTask.errorMessage}</strong>
                <p>请检查外部模型接口可用性，或重新点击生成品牌增长报告。</p>
              </div>
            ) : null}
            {props.isGrowthReportTaskActive ? (
              <div className="visual-report-source-card">
                <span>当前任务状态</span>
                <strong>{latestTask?.taskStatus === "QUEUED" ? "排队中" : "后台生成中"}</strong>
                <p>旧版报告仍可查看，完成后页面会自动刷新为最新结果。</p>
              </div>
            ) : null}
            <div className="report-editor-grid">
              <label className="report-editor-pane">
                <span>Markdown 编辑器</span>
                <textarea
                  className="report-markdown-textarea"
                  value={props.reportMarkdownDraft}
                  onChange={(event) => props.onReportMarkdownDraftChange(event.target.value)}
                  placeholder="这里显示并编辑品牌增长报告 Markdown 内容"
                />
              </label>
              <article className="report-editor-pane">
                <span>预览</span>
                <div className="generated-report-html" dangerouslySetInnerHTML={{ __html: props.previewHtml }} />
              </article>
            </div>
          </article>
        ) : (
          <article className="light-data-panel">
            <h3>当前还没有品牌增长报告</h3>
            <p>点击右上角“生成报告”后，会先提交后台任务；生成完成后，这里会自动进入 Markdown 编辑状态。</p>
          </article>
        )}
      </article>
    );
  }

  if (props.activePage === "opportunityInsight") {
    const latestTask = props.opportunityInsightWorkspace.latestTask;
    const brandAccountAnalysis = props.opportunityInsightWorkspace.brandAccountAnalysis;
    const competitorAccountAnalysis = props.opportunityInsightWorkspace.competitorAccountAnalysis;
    const commentInsightAnalysis = props.opportunityInsightWorkspace.commentInsightAnalysis;
    const finalOpportunityReport = props.opportunityInsightWorkspace.finalOpportunityReport;
    const awaitingConfirmationStep = props.opportunityInsightWorkspace.awaitingConfirmationStep ?? 1;
    const hasStepOneReports = Boolean(brandAccountAnalysis && competitorAccountAnalysis);
    const opportunityPrimaryActionLabel = props.isOpportunityInsightTaskActive
      ? "生成中..."
      : awaitingConfirmationStep === 2
        ? "开始第 2 步"
        : awaitingConfirmationStep === 3
          ? "开始第 3 步"
          : finalOpportunityReport
            ? "重新生成总报告"
            : "立刻机会洞察";
    const stepStatusText = finalOpportunityReport
      ? "全部完成"
      : awaitingConfirmationStep === 1
        ? "待启动第 1 步"
        : awaitingConfirmationStep === 2
          ? "等待确认进入第 2 步"
          : "等待确认进入第 3 步";

    return (
      <article className="workspace-panel strategy-page-card">
        {!hasStepOneReports && props.isOpportunityInsightTaskActive ? (
          <article className="light-data-panel">
            <h3>机会洞察第 1 步{latestTask?.taskStatus === "QUEUED" ? "排队中" : "生成中"}</h3>
            <p>当前正在并行生成品牌账号分析和竞品账号分析，完成后页面会自动刷新，无需手动停留等待。</p>
          </article>
        ) : (
          <article className="light-data-panel report-editor-panel">
            <div className="report-editor-head">
              <div>
                <strong>机会洞察</strong>
                <p>按 3 步推进、拆成 4 个技能：品牌账号分析、竞品账号分析、评论洞察分析、机会洞察总报告。</p>
              </div>
              <div className="report-editor-actions">
                {props.opportunityTaskStatusText ? (
                  <span className="archive-pill status-pending">{props.opportunityTaskStatusText}</span>
                ) : null}
                <span className="archive-pill status-ready">
                  {stepStatusText}
                </span>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => void props.onGenerateOpportunityInsight()}
                  disabled={props.isGeneratingOpportunityInsight || props.isHydrating || props.isOpportunityInsightTaskActive}
                >
                  {props.isGeneratingOpportunityInsight ? "提交中..." : opportunityPrimaryActionLabel}
                </button>
              </div>
            </div>

            <div className="card-grid">
              <article className="metric-card">
                <span>品牌账号分析</span>
                <strong>{brandAccountAnalysis ? "已完成" : "待生成"}</strong>
                <p>{brandAccountAnalysis?.summary || "输出小红书与抖音品牌账号定位、内容结构与增长信号。"}</p>
              </article>
              <article className="metric-card">
                <span>竞品账号分析</span>
                <strong>{competitorAccountAnalysis ? "已完成" : "待生成"}</strong>
                <p>{competitorAccountAnalysis?.summary || "输出竞品账号打法、内容节奏与差异化切口。"}</p>
              </article>
              <article className="metric-card">
                <span>评论洞察分析</span>
                <strong>{commentInsightAnalysis ? "已完成" : hasStepOneReports ? "待生成" : "待确认"}</strong>
                <p>{commentInsightAnalysis?.summary || (hasStepOneReports ? "第 1 步确认后，可继续生成评论洞察分析报告。" : "请先完成并确认第 1 步品牌账号分析与竞品账号分析。")}</p>
              </article>
              <article className="metric-card">
                <span>机会洞察总报告</span>
                <strong>{finalOpportunityReport ? "已完成" : commentInsightAnalysis ? "待生成" : "待确认"}</strong>
                <p>{finalOpportunityReport?.summary || (commentInsightAnalysis ? "第 2 步确认后，可继续整合资料生成机会洞察总报告。" : "请先完成评论洞察分析，再生成机会洞察总报告。")}</p>
              </article>
            </div>

            {latestTask?.taskStatus === "FAILED" && latestTask.errorMessage ? (
              <div className="visual-report-source-card">
                <span>最近失败原因</span>
                <strong>{latestTask.errorMessage}</strong>
                <p>请检查第 1 步品牌/竞品账号数据是否已采集，或确认模型接口可用后重新生成。</p>
              </div>
            ) : null}

            {props.isOpportunityInsightTaskActive ? (
              <div className="visual-report-source-card">
                <span>当前任务状态</span>
                <strong>{latestTask?.phaseText || (latestTask?.taskStatus === "QUEUED" ? "排队中" : "后台生成中")}</strong>
                <p>
                  {latestTask?.phaseIndex && latestTask?.phaseTotal
                    ? `当前进度 ${latestTask.phaseIndex}/${latestTask.phaseTotal}。`
                    : "后台会先完成品牌账号分析，再完成竞品账号分析。"}
                </p>
              </div>
            ) : null}

            <div className="visual-report-source-card">
              <span>流程说明</span>
              <strong>第 1 步并行生成 2 份分析报告，第 2 步和第 3 步都保留确认门</strong>
              <p>
                {finalOpportunityReport
                  ? "当前 4 个技能产物已全部生成完成，你可以直接复盘，也可以重新触发第 3 步刷新机会洞察总报告。"
                  : commentInsightAnalysis
                    ? "当前第 2 步已完成，可先人工确认评论洞察分析，再继续生成机会洞察总报告。"
                    : hasStepOneReports
                      ? "当前第 1 步已完成，可先人工确认品牌账号分析与竞品账号分析，再继续后续评论洞察分析。"
                      : "点击右上角“立刻机会洞察”后，将先生成品牌账号分析和竞品账号分析两份 HTML 报告。"}
              </p>
            </div>

            <div className="report-editor-grid">
              <article className="report-editor-pane">
                <span>品牌账号分析</span>
                {brandAccountAnalysis ? (
                  <>
                    <div className="report-editor-actions" style={{ justifyContent: "space-between", marginBottom: 12 }}>
                      <strong>{brandAccountAnalysis.title}</strong>
                      <span className="archive-pill status-ready">{props.formatDateTime(brandAccountAnalysis.generatedAt)}</span>
                    </div>
                    <iframe
                      title="品牌账号分析预览"
                      className="visual-report-preview-frame visual-report-preview-frame--single"
                      srcDoc={brandAccountAnalysis.htmlDocument}
                    />
                  </>
                ) : (
                  <div className="empty-state">品牌账号分析结果会在第 1 步完成后展示在这里。</div>
                )}
              </article>

              <article className="report-editor-pane">
                <span>竞品账号分析</span>
                {competitorAccountAnalysis ? (
                  <>
                    <div className="report-editor-actions" style={{ justifyContent: "space-between", marginBottom: 12 }}>
                      <strong>{competitorAccountAnalysis.title}</strong>
                      <span className="archive-pill status-ready">{props.formatDateTime(competitorAccountAnalysis.generatedAt)}</span>
                    </div>
                    <iframe
                      title="竞品账号分析预览"
                      className="visual-report-preview-frame visual-report-preview-frame--single"
                      srcDoc={competitorAccountAnalysis.htmlDocument}
                    />
                  </>
                ) : (
                  <div className="empty-state">竞品账号分析结果会在第 1 步完成后展示在这里。</div>
                )}
              </article>
            </div>

            <div className="report-editor-grid">
              <article className="report-editor-pane">
                <span>评论洞察分析</span>
                {commentInsightAnalysis ? (
                  <>
                    <div className="report-editor-actions" style={{ justifyContent: "space-between", marginBottom: 12 }}>
                      <strong>{commentInsightAnalysis.title}</strong>
                      <span className="archive-pill status-ready">{props.formatDateTime(commentInsightAnalysis.generatedAt)}</span>
                    </div>
                    <iframe
                      title="评论洞察分析预览"
                      className="visual-report-preview-frame visual-report-preview-frame--single"
                      srcDoc={commentInsightAnalysis.htmlDocument}
                    />
                  </>
                ) : (
                  <div className="empty-state">评论洞察分析会在第 2 步完成后展示在这里。</div>
                )}
              </article>

              <article className="report-editor-pane">
                <span>机会洞察总报告</span>
                {finalOpportunityReport ? (
                  <>
                    <div className="report-editor-actions" style={{ justifyContent: "space-between", marginBottom: 12 }}>
                      <strong>{finalOpportunityReport.title}</strong>
                      <span className="archive-pill status-ready">{props.formatDateTime(finalOpportunityReport.generatedAt)}</span>
                    </div>
                    <iframe
                      title="机会洞察总报告预览"
                      className="visual-report-preview-frame visual-report-preview-frame--single"
                      srcDoc={finalOpportunityReport.htmlDocument}
                    />
                  </>
                ) : (
                  <div className="empty-state">机会洞察总报告会在第 3 步完成后展示在这里。</div>
                )}
              </article>
            </div>
          </article>
        )}
      </article>
    );
  }

  if (props.activePage === "visualGrowthReport") {
    const sourceReport = props.reportWorkspace.latest;
    const latestVisualReport = props.visualReportWorkspace.latest;
    const latestVisualTask = props.visualReportWorkspace.latestTask;

    return (
      <article className="workspace-panel strategy-page-card">
        {!sourceReport ? (
          <article className="light-data-panel">
            <h3>请先生成品牌增长报告</h3>
            <p>当前可视化报告的输入来源是【品牌增长报告】，生成完成后才能继续生成这一板块。</p>
          </article>
        ) : props.isVisualReportTaskActive && !latestVisualReport ? (
          <article className="light-data-panel">
            <h3>品牌增长可视化报告{latestVisualTask?.taskStatus === "QUEUED" ? "排队中" : "生成中"}</h3>
            <p>
              当前任务已提交，正在后台调用模型生成。
              {latestVisualTask?.sourceReportTitle ? `输入来源：${latestVisualTask.sourceReportTitle}。` : ""}
            </p>
          </article>
        ) : latestVisualReport ? (
          <article className="light-data-panel report-editor-panel">
            <div className="report-editor-head">
              <div>
                <strong>{latestVisualReport.title}</strong>
                <p>调用 article-visual-report-designer，将品牌增长报告转成嵌入式可视化 HTML 报告。</p>
              </div>
              <div className="report-editor-actions">
                <span className="archive-pill status-ready">{props.formatDateTime(latestVisualReport.generatedAt)}</span>
                {props.visualTaskStatusText ? (
                  <span className="archive-pill status-pending">{props.visualTaskStatusText}</span>
                ) : null}
              </div>
            </div>
            <div className="visual-report-source-card">
              <span>输入来源</span>
              <strong>{latestVisualReport.sourceReportTitle || sourceReport.title}</strong>
              <p>{sourceReport.summary}</p>
            </div>
            {latestVisualTask?.taskStatus === "FAILED" && latestVisualTask.errorMessage ? (
              <div className="visual-report-source-card">
                <span>最近失败原因</span>
                <strong>{latestVisualTask.errorMessage}</strong>
                <p>请检查外部模型接口可用性，或重新点击生成可视化报告。</p>
              </div>
            ) : null}
            {props.isVisualReportTaskActive ? (
              <div className="visual-report-source-card">
                <span>当前任务状态</span>
                <strong>{latestVisualTask?.taskStatus === "QUEUED" ? "排队中" : "后台生成中"}</strong>
                <p>页面会自动刷新结果，无需停留在当前接口请求中等待。</p>
              </div>
            ) : null}
            <article className="report-editor-pane">
              <span>可视化报告</span>
              <iframe
                title="品牌增长可视化报告预览"
                className="visual-report-preview-frame visual-report-preview-frame--single"
                srcDoc={props.previewDocument}
              />
            </article>
          </article>
        ) : (
          <article className="light-data-panel">
            <h3>当前还没有品牌增长可视化报告</h3>
            <p>点击右上角“生成可视化报告”后，会调用 article-visual-report-designer 生成可直接预览的 HTML 报告。</p>
          </article>
        )}
      </article>
    );
  }

  const sourceReport = props.reportWorkspace.latest;
  const latestPlan = props.annualMarketingPlanWorkspace.latest;
  const latestAnnualTask = props.annualMarketingPlanWorkspace.latestTask;

  return (
    <article className="workspace-panel strategy-page-card">
      {!sourceReport ? (
        <article className="light-data-panel">
          <h3>请先生成品牌增长报告</h3>
          <p>当前半年营销规划的输入来源是【品牌增长报告】和【品牌商家建档】，需要先完成报告生成后才能继续。</p>
        </article>
      ) : props.isAnnualMarketingPlanTaskActive && !latestPlan ? (
        <article className="light-data-panel">
          <h3>半年营销规划{latestAnnualTask?.taskStatus === "QUEUED" ? "排队中" : "生成中"}</h3>
          <p>
            当前任务已提交，正在后台调用模型生成。
            {latestAnnualTask?.sourceReportTitle ? `输入来源：${latestAnnualTask.sourceReportTitle}。` : ""}
          </p>
        </article>
      ) : latestPlan ? (
        <article className="light-data-panel report-editor-panel">
          <div className="report-editor-head">
            <div>
              <strong>{latestPlan.title}</strong>
              <p>大模型先输出结构化 JSON，再由后端渲染为半年营销规划 HTML 表格。</p>
            </div>
            <div className="report-editor-actions">
              <span className="archive-pill status-ready">{props.formatDateTime(latestPlan.generatedAt)}</span>
              <span className="archive-pill status-pending">{latestPlan.planningYear || "周期未识别"}</span>
              {props.annualTaskStatusText ? (
                <span className="archive-pill status-pending">{props.annualTaskStatusText}</span>
              ) : null}
            </div>
          </div>
          <div className="visual-report-source-card">
            <span>输入来源</span>
            <strong>{latestPlan.sourceReportTitle || sourceReport.title}</strong>
            <p>{latestPlan.summary}</p>
          </div>
          {latestAnnualTask?.taskStatus === "FAILED" && latestAnnualTask.errorMessage ? (
            <div className="visual-report-source-card">
              <span>最近失败原因</span>
              <strong>{latestAnnualTask.errorMessage}</strong>
              <p>请检查外部模型接口可用性，或重新点击生成规划。</p>
            </div>
          ) : null}
          {props.isAnnualMarketingPlanTaskActive ? (
            <div className="visual-report-source-card">
              <span>当前任务状态</span>
              <strong>{latestAnnualTask?.taskStatus === "QUEUED" ? "排队中" : "后台生成中"}</strong>
              <p>页面会自动刷新结果，无需停留在当前接口请求中等待。</p>
            </div>
          ) : null}
          {latestPlan.planningFocus.length ? (
            <div className="strategy-chip-row">
              {latestPlan.planningFocus.map((item, index) => (
                <span key={`annual-focus-${index}`} className="filter-chip is-active">
                  {item}
                </span>
              ))}
            </div>
          ) : null}
          <div className="card-grid">
            <article className="metric-card">
              <span>规划周期</span>
              <strong>{latestPlan.planningYear || "未识别"}</strong>
              <p>按品牌增长报告的当前输入，输出未来半年的营销排期。</p>
            </article>
            <article className="metric-card">
              <span>规划条目</span>
              <strong>{latestPlan.items.length}</strong>
              <p>覆盖节日、节气与重点营销节点，便于后续拆解月度执行。</p>
            </article>
            <article className="metric-card">
              <span>平台矩阵</span>
              <strong>5 类</strong>
              <p>小红书、抖音、视频号、私域与线下门店统一联动。</p>
            </article>
          </div>
          <article
            className="light-data-panel"
            style={{ padding: 0, background: "transparent", border: "none", boxShadow: "none" }}
          >
            <div className="hotspot-list-head">
              <h3>规划条目预览</h3>
              <span className="archive-pill status-ready">共 {props.previewRows.length} 条</span>
            </div>
            {props.previewRows.length ? (
              <div className="hotspot-ranking-list">
                {props.previewRows.map((item, index) => (
                  <article key={`${item.month}-${item.node}-${index}`} className="hotspot-ranking-card">
                    <div className="hotspot-ranking-rank">{item.month}</div>
                    <div className="hotspot-ranking-body">
                      <strong>
                        {item.node} · {item.marketingTheme}
                      </strong>
                      <div className="hotspot-ranking-meta">
                        <span>{item.type}</span>
                        <span>{item.date}</span>
                        <span>{item.platforms.join("、")}</span>
                      </div>
                      <div className="note-description-inline">{item.strategy}</div>
                    </div>
                    <span className="archive-pill status-pending">{item.products.join("、") || "产品待定"}</span>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-state">当前规划结果还没有可展示的条目。</div>
            )}
          </article>
        </article>
      ) : (
        <article className="light-data-panel">
          <h3>当前还没有半年营销规划</h3>
          <p>点击右上角“生成规划”后，会根据【品牌商家建档】和【品牌增长报告】生成 JSON，再由后端渲染成 HTML 规划表。</p>
        </article>
      )}
    </article>
  );
}
