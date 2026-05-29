import { getStoredCurrentBrandId } from "./auth-session";
import { DEMO_BRAND_ID } from "./brand-growth";
import { jsonRequest, request } from "./http";

export type GrowthReportRecord = {
  id: string;
  title: string;
  summary: string;
  generatedAt: string;
  taskId?: string;
  mediaId?: string;
  reportMarkdown: string;
  htmlContent: string;
  diagnosis: string[];
  opportunities: string[];
  nextActions: string[];
  metrics: {
    productCount: number;
    platformAccountCount: number;
    competitorAccountCount: number;
    brandNoteCount: number;
    benchmarkNoteCount: number;
  };
};

export type GrowthReportWorkspace = {
  latest?: GrowthReportRecord;
  history: GrowthReportRecord[];
  latestTask?: GrowthReportTaskRecord;
};

export type VisualGrowthReportRecord = {
  id: string;
  title: string;
  summary: string;
  generatedAt: string;
  taskId?: string;
  mediaId?: string;
  sourceReportId?: string;
  sourceReportTitle?: string;
  htmlBody: string;
  htmlDocument: string;
};

export type VisualGrowthReportTaskRecord = {
  id: string;
  taskType: string;
  taskTitle: string;
  taskStatus: "PENDING" | "QUEUED" | "RUNNING" | "SUCCESS" | "FAILED" | "CANCELLED";
  modelName: string;
  pointsCost: number;
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  finishedAt?: string;
  errorMessage?: string;
  sourceReportId?: string;
  sourceReportTitle?: string;
  phase?: string;
  phaseText?: string;
  phaseIndex?: number;
  phaseTotal?: number;
};

export type GrowthReportTaskRecord = VisualGrowthReportTaskRecord;

export type VisualGrowthReportWorkspace = {
  latest?: VisualGrowthReportRecord;
  history: VisualGrowthReportRecord[];
  latestTask?: VisualGrowthReportTaskRecord;
};

export type AnnualMarketingPlanRow = {
  month: string;
  node: string;
  date: string;
  type: string;
  marketingTheme: string;
  platforms: string[];
  strategy: string;
  products: string[];
};

export type AnnualMarketingPlanRecord = {
  id: string;
  title: string;
  summary: string;
  generatedAt: string;
  taskId?: string;
  mediaId?: string;
  sourceReportId?: string;
  sourceReportTitle?: string;
  planningYear: string;
  planningFocus: string[];
  items: AnnualMarketingPlanRow[];
  htmlBody: string;
  htmlDocument: string;
};

export type AnnualMarketingPlanTaskRecord = {
  id: string;
  taskType: string;
  taskTitle: string;
  taskStatus: "PENDING" | "QUEUED" | "RUNNING" | "SUCCESS" | "FAILED" | "CANCELLED";
  modelName: string;
  pointsCost: number;
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  finishedAt?: string;
  errorMessage?: string;
  sourceReportId?: string;
  sourceReportTitle?: string;
};

export type XiaohongshuMarketingPlanTaskRecord = {
  id: string;
  taskType: string;
  taskTitle: string;
  taskStatus: "PENDING" | "QUEUED" | "RUNNING" | "SUCCESS" | "FAILED" | "CANCELLED";
  modelName: string;
  pointsCost: number;
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  finishedAt?: string;
  errorMessage?: string;
  sourceReportId?: string;
  sourceReportTitle?: string;
  phase?: string;
  phaseText?: string;
  phaseIndex?: number;
  phaseTotal?: number;
};

export type AnnualMarketingPlanWorkspace = {
  latest?: AnnualMarketingPlanRecord;
  history: AnnualMarketingPlanRecord[];
  latestTask?: AnnualMarketingPlanTaskRecord;
};

export type HalfYearMarketingPlanRow = AnnualMarketingPlanRow;
export type HalfYearMarketingPlanRecord = AnnualMarketingPlanRecord;
export type HalfYearMarketingPlanTaskRecord = AnnualMarketingPlanTaskRecord;
export type HalfYearMarketingPlanWorkspace = AnnualMarketingPlanWorkspace;

export type XiaohongshuMarketingPlanRecord = {
  id: string;
  title: string;
  summary: string;
  generatedAt: string;
  taskId?: string;
  mediaId?: string;
  sourceReportId?: string;
  sourceReportTitle?: string;
  sourceAnnualPlanId?: string;
  sourceAnnualPlanTitle?: string;
  reportMarkdown: string;
  htmlContent: string;
  modelName?: string;
};

export type XiaohongshuMarketingPlanWorkspace = {
  latest?: XiaohongshuMarketingPlanRecord;
  history: XiaohongshuMarketingPlanRecord[];
  latestTask?: XiaohongshuMarketingPlanTaskRecord;
};

export type DouyinMarketingPlanRecord = {
  id: string;
  title: string;
  summary: string;
  generatedAt: string;
  taskId?: string;
  mediaId?: string;
  sourceReportId?: string;
  sourceReportTitle?: string;
  sourceAnnualPlanId?: string;
  sourceAnnualPlanTitle?: string;
  reportMarkdown: string;
  htmlContent: string;
  modelName?: string;
};

export type DouyinMarketingPlanTaskRecord = XiaohongshuMarketingPlanTaskRecord;

export type DouyinMarketingPlanWorkspace = {
  latest?: DouyinMarketingPlanRecord;
  history: DouyinMarketingPlanRecord[];
  latestTask?: DouyinMarketingPlanTaskRecord;
};

export type DouyinHotTopicCandidateItem = {
  id: string;
  title: string;
  description?: string;
  checked?: boolean;
};

export type DouyinTopicLibraryItem = {
  id: string;
  topicContent: string;
  topicDescription: string;
  selectedAt: string;
  source?: "GENERATED" | "MANUAL";
  sourceDate?: string;
};

export type DouyinOriginalCopyType =
  | "VIEWPOINT"
  | "STORY"
  | "PROCESS"
  | "KNOWLEDGE"
  | "PLOT_SALES"
  | "SEEDING"
  | "LOCAL_SALES";

export type DouyinOriginalCopyCalendarOption = {
  id: string;
  label: string;
  date: string;
  topicName: string;
};

export type DouyinOriginalCopyRecord = {
  id: string;
  title: string;
  summary: string;
  generatedAt: string;
  taskId?: string;
  modelName?: string;
  copyType: DouyinOriginalCopyType;
  copyTypeLabel: string;
  content: string;
  topicId: string;
  topicContent: string;
  topicDescription?: string;
  calendarItemId?: string;
  calendarItemLabel?: string;
  injectMarketingPlan: boolean;
  marketingPlanTitle?: string;
};

export type DouyinHotTopicCandidatesRecord = {
  id: string;
  title: string;
  summary: string;
  generatedAt: string;
  taskId?: string;
  selectedDate: string;
  modelName?: string;
  items: DouyinHotTopicCandidateItem[];
  reportContent?: string;
};

export type DouyinHotTopicCandidatesTaskRecord = XiaohongshuMarketingPlanTaskRecord;
export type DouyinOriginalCopyTaskRecord = XiaohongshuMarketingPlanTaskRecord;

export type DouyinHotTopicCandidatesWorkspace = {
  selectedDate: string;
  availableDates: string[];
  latest?: DouyinHotTopicCandidatesRecord;
  history: DouyinHotTopicCandidatesRecord[];
  latestTask?: DouyinHotTopicCandidatesTaskRecord;
  topicLibrary: DouyinTopicLibraryItem[];
};

export type DouyinOriginalCopyWorkspace = {
  latest?: DouyinOriginalCopyRecord;
  history: DouyinOriginalCopyRecord[];
  latestTask?: DouyinOriginalCopyTaskRecord;
  calendarOptions: DouyinOriginalCopyCalendarOption[];
  topicOptions: DouyinTopicLibraryItem[];
  hasMarketingPlan: boolean;
  marketingPlanTitle?: string;
};

export type XiaohongshuMarketingCalendarItem = {
  id: string;
  date: string;
  topicName: string;
  productName?: string;
  noteType?: string;
  targetAudience?: string;
  contentGoal?: string;
  expressionFocus?: string;
  topicContent?: string;
  noteKeywords: string[];
  titleDirections: string[];
  bodyStructure?: string;
  coverFormat?: string;
  coverKeywords: string[];
  imageBrief?: string;
};

export type XiaohongshuMarketingCalendarRecord = {
  id: string;
  title: string;
  summary: string;
  generatedAt: string;
  taskId?: string;
  sourceReportId?: string;
  sourceReportTitle?: string;
  sourceAnnualPlanId?: string;
  sourceAnnualPlanTitle?: string;
  sourceMarketingPlanId?: string;
  sourceMarketingPlanTitle?: string;
  modelName?: string;
  items: XiaohongshuMarketingCalendarItem[];
};

export type XiaohongshuMarketingCalendarTaskRecord = XiaohongshuMarketingPlanTaskRecord;

export type XiaohongshuMarketingCalendarWorkspace = {
  latest?: XiaohongshuMarketingCalendarRecord;
  history: XiaohongshuMarketingCalendarRecord[];
  latestTask?: XiaohongshuMarketingCalendarTaskRecord;
};

export const growthReportSeed: GrowthReportWorkspace = {
  latest: {
    id: "ast_demo_growth_report_001",
    title: "武汉仟吉品牌增长报告",
    summary: "品牌线下基础较强，但公域内容供给和会员转化链路仍有明显提升空间。",
    generatedAt: "2026-05-01T10:00:00.000Z",
    taskId: "tsk_demo_001",
    mediaId: "med_demo_001",
    reportMarkdown: "# 武汉仟吉品牌增长报告\n\n品牌线下基础较强，但公域内容供给和会员转化链路仍有明显提升空间。",
    htmlContent:
      "<section><h1>武汉仟吉品牌增长报告</h1><p>品牌线下基础较强，但公域内容供给和会员转化链路仍有明显提升空间。</p></section>",
    diagnosis: [
      "品牌产品力和门店覆盖具备基础优势，但线上内容资产积累不足。",
      "小红书账号与竞品差距主要体现在持续更新频率和互动运营。",
      "经营数据与行业报告说明节日礼赠和门店转化是近期增长重点。",
    ],
    opportunities: [
      "围绕节日礼赠场景做爆款产品种草内容矩阵。",
      "用门店日常与新品体验提升用户评论互动率。",
      "把品牌报告、营销日历和原创笔记串成标准内容生产链路。",
    ],
    nextActions: [
      "完成小红书账号和品牌作品的固定周期采集。",
      "生成首版小红书营销策划方案并同步到营销日历。",
      "围绕核心产品完成原创笔记首轮投放测试。",
    ],
    metrics: {
      productCount: 2,
      platformAccountCount: 2,
      competitorAccountCount: 1,
      brandNoteCount: 1,
      benchmarkNoteCount: 1,
    },
  },
  history: [],
};

growthReportSeed.history = growthReportSeed.latest ? [growthReportSeed.latest] : [];

export const visualGrowthReportSeed: VisualGrowthReportWorkspace = {
  latest: undefined,
  history: [],
};

export const annualMarketingPlanSeed: AnnualMarketingPlanWorkspace = {
  latest: undefined,
  history: [],
};

export const halfYearMarketingPlanSeed = annualMarketingPlanSeed;

export const xiaohongshuMarketingPlanSeed: XiaohongshuMarketingPlanWorkspace = {
  latest: undefined,
  history: [],
};

export const douyinMarketingPlanSeed: DouyinMarketingPlanWorkspace = {
  latest: undefined,
  history: [],
};

export const douyinHotTopicCandidatesSeed: DouyinHotTopicCandidatesWorkspace = {
  selectedDate: "",
  availableDates: [],
  latest: undefined,
  history: [],
  topicLibrary: [],
};

export const douyinOriginalCopySeed: DouyinOriginalCopyWorkspace = {
  latest: undefined,
  history: [],
  calendarOptions: [],
  topicOptions: [],
  hasMarketingPlan: false,
};

function resolveBrandId(brandId?: string) {
  return getStoredCurrentBrandId(brandId || DEMO_BRAND_ID) || DEMO_BRAND_ID;
}

export async function getGrowthReportWorkspace(brandId?: string) {
  return request<GrowthReportWorkspace>(`/reports/brands/${resolveBrandId(brandId)}/growth-report`);
}

export async function generateGrowthReport(brandId?: string) {
  return jsonRequest<GrowthReportWorkspace>(`/reports/brands/${resolveBrandId(brandId)}/growth-report/generate`, "POST", {});
}

export async function updateGrowthReport(reportId: string, reportMarkdown: string, title?: string, brandId?: string) {
  return jsonRequest<GrowthReportWorkspace>(`/reports/brands/${resolveBrandId(brandId)}/growth-report/${reportId}`, "PATCH", {
    title,
    reportMarkdown,
  });
}

export async function getVisualGrowthReportWorkspace(brandId?: string) {
  return request<VisualGrowthReportWorkspace>(`/reports/brands/${resolveBrandId(brandId)}/visual-growth-report`);
}

export async function generateVisualGrowthReport(brandId?: string) {
  return jsonRequest<VisualGrowthReportWorkspace>(`/reports/brands/${resolveBrandId(brandId)}/visual-growth-report/generate`, "POST", {});
}

export async function updateVisualGrowthReport(reportId: string, htmlBody: string, title?: string, brandId?: string) {
  return jsonRequest<VisualGrowthReportWorkspace>(`/reports/brands/${resolveBrandId(brandId)}/visual-growth-report/${reportId}`, "PATCH", {
    title,
    htmlBody,
  });
}

export async function getHalfYearMarketingPlanWorkspace(brandId?: string) {
  return request<HalfYearMarketingPlanWorkspace>(`/reports/brands/${resolveBrandId(brandId)}/half-year-marketing-plan`);
}

export async function generateHalfYearMarketingPlan(brandId?: string) {
  return jsonRequest<HalfYearMarketingPlanWorkspace>(`/reports/brands/${resolveBrandId(brandId)}/half-year-marketing-plan/generate`, "POST", {});
}

export const getAnnualMarketingPlanWorkspace = getHalfYearMarketingPlanWorkspace;
export const generateAnnualMarketingPlan = generateHalfYearMarketingPlan;

export async function getXiaohongshuMarketingPlanWorkspace(brandId?: string) {
  return request<XiaohongshuMarketingPlanWorkspace>(`/reports/brands/${resolveBrandId(brandId)}/xiaohongshu-marketing-plan`);
}

export async function generateXiaohongshuMarketingPlan(brandId?: string) {
  return jsonRequest<XiaohongshuMarketingPlanWorkspace>(`/reports/brands/${resolveBrandId(brandId)}/xiaohongshu-marketing-plan/generate`, "POST", {});
}

export async function updateXiaohongshuMarketingPlan(
  reportId: string,
  reportMarkdown: string,
  title?: string,
  brandId?: string,
) {
  return jsonRequest<XiaohongshuMarketingPlanWorkspace>(`/reports/brands/${resolveBrandId(brandId)}/xiaohongshu-marketing-plan/${reportId}`, "PATCH", {
    title,
    reportMarkdown,
  });
}

export async function deleteXiaohongshuMarketingPlan(reportId: string, brandId?: string) {
  return request<XiaohongshuMarketingPlanWorkspace>(`/reports/brands/${resolveBrandId(brandId)}/xiaohongshu-marketing-plan/${reportId}`, {
    method: "DELETE",
  });
}

export async function getDouyinMarketingPlanWorkspace(brandId?: string) {
  return request<DouyinMarketingPlanWorkspace>(`/reports/brands/${resolveBrandId(brandId)}/douyin-marketing-plan`);
}

export async function generateDouyinMarketingPlan(brandId?: string) {
  return jsonRequest<DouyinMarketingPlanWorkspace>(`/reports/brands/${resolveBrandId(brandId)}/douyin-marketing-plan/generate`, "POST", {});
}

export async function updateDouyinMarketingPlan(
  reportId: string,
  reportMarkdown: string,
  title?: string,
  brandId?: string,
) {
  return jsonRequest<DouyinMarketingPlanWorkspace>(`/reports/brands/${resolveBrandId(brandId)}/douyin-marketing-plan/${reportId}`, "PATCH", {
    title,
    reportMarkdown,
  });
}

export async function deleteDouyinMarketingPlan(reportId: string, brandId?: string) {
  return request<DouyinMarketingPlanWorkspace>(`/reports/brands/${resolveBrandId(brandId)}/douyin-marketing-plan/${reportId}`, {
    method: "DELETE",
  });
}

export async function getDouyinHotTopicCandidatesWorkspace(brandId?: string, selectedDate?: string) {
  const suffix = selectedDate ? `?date=${encodeURIComponent(selectedDate)}` : "";
  return request<DouyinHotTopicCandidatesWorkspace>(`/reports/brands/${resolveBrandId(brandId)}/douyin-hot-topic-candidates${suffix}`);
}

export async function generateDouyinHotTopicCandidates(selectedDate?: string, brandId?: string) {
  return jsonRequest<DouyinHotTopicCandidatesWorkspace>(`/reports/brands/${resolveBrandId(brandId)}/douyin-hot-topic-candidates/generate`, "POST", {
    selectedDate,
  });
}

export async function updateDouyinTopicLibrary(items: DouyinTopicLibraryItem[], brandId?: string) {
  return jsonRequest<DouyinHotTopicCandidatesWorkspace>(`/reports/brands/${resolveBrandId(brandId)}/douyin-topic-library`, "PATCH", {
    items,
  });
}

export async function getDouyinOriginalCopyWorkspace(brandId?: string) {
  return request<DouyinOriginalCopyWorkspace>(`/reports/brands/${resolveBrandId(brandId)}/douyin-original-copy`);
}

export async function generateDouyinOriginalCopy(
  payload: {
    calendarItemId?: string;
    topicId: string;
    injectMarketingPlan: boolean;
    copyType: DouyinOriginalCopyType;
  },
  brandId?: string,
) {
  return jsonRequest<DouyinOriginalCopyWorkspace>(`/reports/brands/${resolveBrandId(brandId)}/douyin-original-copy/generate`, "POST", payload);
}

export async function getXiaohongshuMarketingCalendarWorkspace(brandId?: string) {
  return request<XiaohongshuMarketingCalendarWorkspace>(`/reports/brands/${resolveBrandId(brandId)}/xiaohongshu-marketing-calendar`);
}

export async function generateXiaohongshuMarketingCalendar(brandId?: string) {
  return jsonRequest<XiaohongshuMarketingCalendarWorkspace>(`/reports/brands/${resolveBrandId(brandId)}/xiaohongshu-marketing-calendar/generate`, "POST", {});
}

export async function updateXiaohongshuMarketingCalendar(
  reportId: string,
  items: XiaohongshuMarketingCalendarItem[],
  title?: string,
  brandId?: string,
) {
  return jsonRequest<XiaohongshuMarketingCalendarWorkspace>(`/reports/brands/${resolveBrandId(brandId)}/xiaohongshu-marketing-calendar/${reportId}`, "PATCH", {
    title,
    items,
  });
}
