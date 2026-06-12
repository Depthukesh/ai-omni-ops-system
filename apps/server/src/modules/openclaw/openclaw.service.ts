import { BadRequestException, Injectable, UnauthorizedException } from "@nestjs/common";
import { AuthService, type RequestAuthContext } from "../auth/auth.service";
import {
  type BrandBusinessKnowledgeBaseFileRecord,
  type BrandBusinessKnowledgeBaseRecord,
  BrandsService,
} from "../brands/brands.service";
import { CollectorsService } from "../collectors/collectors.service";
import { OpenClawInstallationService } from "./openclaw-installation.service";
import { PublishingService } from "../publishing/publishing.service";
import { ReportsService } from "../reports/reports.service";
import { TasksService } from "../tasks/tasks.service";
import { UserSkillsService } from "../user-skills/user-skills.service";
import { WorksService } from "../works/works.service";

type HeadersMap = Record<string, string | string[] | undefined>;

type OpenClawResultStatus = "COMPLETED" | "IN_PROGRESS" | "ACTION_REQUIRED";

type OpenClawNextAction = {
  label: string;
  action: "open_page" | "check_status" | "continue_in_chat" | "retry" | "confirm";
  target?: string;
};

type OpenClawSummaryResponse<TData> = {
  status: "success";
  title: string;
  summary: string;
  highlights: string[];
  data: TData;
  links: Array<{ label: string; url: string }>;
  entry?: { label: string; url: string };
  resultStatus: OpenClawResultStatus;
  resource?: {
    kind: string;
    primaryId?: string;
    relatedIds: string[];
  };
  nextActions: OpenClawNextAction[];
  allowed: boolean;
  requiresConfirmation: boolean;
};

type TaskRecord = {
  id: string;
  brandId?: string;
  taskType: string;
  taskTitle: string;
  taskStatus: string;
  errorMessage?: string;
  createdAt: string;
};

type OpenClawMcpToolDefinition = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
};

const OPENCLAW_MCP_SERVER_INFO = {
  name: "ai-omni-ops-openclaw-mcp-http",
  version: "0.2.0",
};

const OPENCLAW_MCP_TOOLS: OpenClawMcpToolDefinition[] = [
  {
    name: "get_current_brand_context",
    description: "获取当前登录账号的默认品牌、角色和权限摘要。",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "get_brand_products",
    description: "查看当前品牌可用于内容生成的产品清单。",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "integer", minimum: 1, maximum: 50 },
      },
      additionalProperties: false,
    },
  },
  {
    name: "get_platform_accounts",
    description: "查看当前品牌的平台账号清单，可按平台筛选。",
    inputSchema: {
      type: "object",
      properties: {
        platform: { type: "string", description: "可选：XIAOHONGSHU、DOUYIN、VIDEO_CHANNEL、WECHAT_OA。" },
        limit: { type: "integer", minimum: 1, maximum: 50 },
      },
      additionalProperties: false,
    },
  },
  {
    name: "get_task_detail",
    description: "查看指定任务的详细状态、输入和输出摘要。",
    inputSchema: {
      type: "object",
      properties: {
        taskId: { type: "string" },
      },
      required: ["taskId"],
      additionalProperties: false,
    },
  },
  {
    name: "cancel_task",
    description: "取消指定任务，仅支持排队中或运行中的任务。",
    inputSchema: {
      type: "object",
      properties: {
        taskId: { type: "string" },
      },
      required: ["taskId"],
      additionalProperties: false,
    },
  },
  {
    name: "retry_task",
    description: "重试指定任务，把任务重新放回排队状态。",
    inputSchema: {
      type: "object",
      properties: {
        taskId: { type: "string" },
      },
      required: ["taskId"],
      additionalProperties: false,
    },
  },
  {
    name: "get_recent_tasks_summary",
    description: "汇总当前品牌最近任务状态，可按时间范围和任务类型筛选。",
    inputSchema: {
      type: "object",
      properties: {
        timeRange: { type: "string", description: "可选，例如 7d、30d、90d。" },
        taskTypes: { type: "array", items: { type: "string" }, description: "可选任务类型数组。" },
      },
      additionalProperties: false,
    },
  },
  {
    name: "get_failed_tasks_summary",
    description: "汇总当前品牌最近失败任务及主要失败原因。",
    inputSchema: {
      type: "object",
      properties: {
        timeRange: { type: "string", description: "可选，例如 7d、30d、90d。" },
        taskTypes: { type: "array", items: { type: "string" }, description: "可选任务类型数组。" },
      },
      additionalProperties: false,
    },
  },
  {
    name: "get_recent_knowledge_files",
    description: "查看当前品牌最近新增的知识资料和处理状态。",
    inputSchema: {
      type: "object",
      properties: {
        timeRange: { type: "string" },
        knowledgeBaseId: { type: "string" },
        limit: { type: "integer", minimum: 1, maximum: 50 },
      },
      additionalProperties: false,
    },
  },
  {
    name: "get_skill_config_summary",
    description: "查看当前品牌技能配置摘要，可按 skillKey 定位单个技能。",
    inputSchema: {
      type: "object",
      properties: {
        skillKey: { type: "string" },
      },
      additionalProperties: false,
    },
  },
  {
    name: "get_wechat_article_drafts",
    description: "查看当前品牌最近生成的公众号文章草稿和任务状态。",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "integer", minimum: 1, maximum: 20 },
      },
      additionalProperties: false,
    },
  },
  {
    name: "get_wechat_official_accounts",
    description: "查看当前品牌已配置的公众号账号列表，供发布时选择。",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "get_wechat_workflow_sessions",
    description: "查看当前品牌最近的公众号排版工作流会话，供确认发布对象。",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "integer", minimum: 1, maximum: 20 },
      },
      additionalProperties: false,
    },
  },
  {
    name: "get_wechat_publish_history",
    description: "查看当前品牌最近的公众号发布历史和结果。",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "integer", minimum: 1, maximum: 20 },
      },
      additionalProperties: false,
    },
  },
  {
    name: "get_wechat_workflow_preferences",
    description: "查看当前品牌公众号工作流的默认作者、主题色和默认输入方式等偏好。",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "get_wechat_workflow_session_detail",
    description: "查看指定公众号工作流会话的完整详情，包括发布配置和检查项。",
    inputSchema: {
      type: "object",
      properties: {
        workflowId: { type: "string" },
      },
      required: ["workflowId"],
      additionalProperties: false,
    },
  },
  {
    name: "check_wechat_workflow_publish_readiness",
    description: "重新计算指定公众号工作流的发布确认状态，返回是否已具备正式发布条件。",
    inputSchema: {
      type: "object",
      properties: {
        workflowId: { type: "string" },
      },
      required: ["workflowId"],
      additionalProperties: false,
    },
  },
  {
    name: "get_wechat_publish_history_detail",
    description: "查看指定公众号发布历史记录的详细结果和失败原因。",
    inputSchema: {
      type: "object",
      properties: {
        historyId: { type: "string" },
      },
      required: ["historyId"],
      additionalProperties: false,
    },
  },
  {
    name: "publish_wechat_article",
    description: "把指定公众号草稿正式发布到公众号账号。",
    inputSchema: {
      type: "object",
      properties: {
        draftId: { type: "string" },
      },
      required: ["draftId"],
      additionalProperties: false,
    },
  },
  {
    name: "create_xiaohongshu_mobile_draft_session",
    description: "为指定小红书图文作品创建手机扫码接力草稿会话，便于在手机端保存到小红书草稿箱。",
    inputSchema: {
      type: "object",
      properties: {
        workId: { type: "string" },
        accountId: { type: "string" },
      },
      required: ["workId"],
      additionalProperties: false,
    },
  },
  {
    name: "create_xiaohongshu_desktop_draft_session",
    description: "为指定小红书图文作品创建电脑端草稿会话，便于通过浏览器扩展自动填充保存草稿。",
    inputSchema: {
      type: "object",
      properties: {
        workId: { type: "string" },
        accountId: { type: "string" },
      },
      required: ["workId"],
      additionalProperties: false,
    },
  },
  {
    name: "create_douyin_mobile_publish_session",
    description: "为指定抖音视频作品创建手机接力发布会话，便于在手机端继续完成发布。",
    inputSchema: {
      type: "object",
      properties: {
        workId: { type: "string" },
        accountId: { type: "string" },
      },
      required: ["workId"],
      additionalProperties: false,
    },
  },
  {
    name: "create_douyin_desktop_publish_session",
    description: "为指定抖音视频作品创建电脑端发布会话，便于通过浏览器扩展自动填充发布信息。",
    inputSchema: {
      type: "object",
      properties: {
        workId: { type: "string" },
        accountId: { type: "string" },
      },
      required: ["workId"],
      additionalProperties: false,
    },
  },
  {
    name: "publish_wechat_workflow",
    description: "把指定公众号工作流正式发布到公众号账号。",
    inputSchema: {
      type: "object",
      properties: {
        workflowId: { type: "string" },
      },
      required: ["workflowId"],
      additionalProperties: false,
    },
  },
  {
    name: "retry_wechat_publish_history",
    description: "重试一次失败或待处理的公众号发布历史记录。",
    inputSchema: {
      type: "object",
      properties: {
        historyId: { type: "string" },
      },
      required: ["historyId"],
      additionalProperties: false,
    },
  },
  {
    name: "get_design_workspace_options",
    description: "查看设计工作台可用模块、设计类型、产品、营销日历和模型选项。",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "get_recent_design_works",
    description: "查看当前品牌最近的设计工作台生成记录和状态。",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "integer", minimum: 1, maximum: 20 },
      },
      additionalProperties: false,
    },
  },
  {
    name: "create_design_work",
    description: "在网站设计工作台中直接创建一个设计任务。",
    inputSchema: {
      type: "object",
      properties: {
        module: { type: "string", description: "必填：image、html、deck、video。" },
        designType: { type: "string" },
        title: { type: "string" },
        calendarItemId: { type: "string" },
        productId: { type: "string" },
        injectBrandProfile: { type: "boolean" },
        modelSelection: { type: "string" },
        spec: { type: "string" },
        additionalInstruction: { type: "string" },
      },
      required: ["module"],
      additionalProperties: false,
    },
  },
  {
    name: "get_latest_brand_growth_report_summary",
    description: "获取当前品牌最新品牌增长报告摘要。",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "create_brand_growth_report",
    description: "触发当前品牌的品牌增长报告生成任务。",
    inputSchema: {
      type: "object",
      properties: {
        goal: { type: "string" },
        timeRange: { type: "string" },
      },
      additionalProperties: false,
    },
  },
  {
    name: "create_half_year_marketing_plan",
    description: "触发当前品牌的半年营销规划生成任务。",
    inputSchema: {
      type: "object",
      properties: {
        planningYear: { type: "string" },
        focus: { type: "string" },
      },
      additionalProperties: false,
    },
  },
  {
    name: "create_knowledge_base",
    description: "为当前品牌创建业务知识库。",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string" },
        description: { type: "string" },
      },
      required: ["name"],
      additionalProperties: false,
    },
  },
  {
    name: "upload_knowledge_base_files",
    description: "向指定知识库上传资料，支持按知识库 ID 或名称定位。",
    inputSchema: {
      type: "object",
      properties: {
        knowledgeBaseId: { type: "string" },
        knowledgeBaseName: { type: "string" },
        items: {
          type: "array",
          minItems: 1,
          items: {
            type: "object",
            properties: {
              title: { type: "string" },
              description: { type: "string" },
              sourceName: { type: "string" },
              fileUrl: { type: "string" },
              priority: { type: "integer" },
            },
            required: ["fileUrl"],
            additionalProperties: false,
          },
        },
      },
      required: ["items"],
      additionalProperties: false,
    },
  },
  {
    name: "get_douyin_original_copy_options",
    description: "查看抖音原创文案可用的选题库、营销日历和文案类型选项。",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "get_recent_douyin_original_copies",
    description: "查看当前品牌最近生成的抖音原创文案结果和状态。",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "integer", minimum: 1, maximum: 20 },
      },
      additionalProperties: false,
    },
  },
  {
    name: "create_douyin_original_copy",
    description: "基于选题库或营销日历触发抖音原创文案生成。",
    inputSchema: {
      type: "object",
      properties: {
        copyType: { type: "string", description: "必填：VIEWPOINT、STORY、PROCESS、KNOWLEDGE、PLOT_SALES、SEEDING、LOCAL_SALES。" },
        topicId: { type: "string" },
        calendarItemId: { type: "string" },
        injectMarketingPlan: { type: "boolean" },
        userRequirement: { type: "string" },
      },
      required: ["copyType"],
      additionalProperties: false,
    },
  },
  {
    name: "get_douyin_remix_copy_options",
    description: "查看抖音二创文案可用的素材库、产品和营销策划选项。",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "get_recent_douyin_remix_copies",
    description: "查看当前品牌最近生成的抖音二创文案结果和状态。",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "integer", minimum: 1, maximum: 20 },
      },
      additionalProperties: false,
    },
  },
  {
    name: "create_douyin_remix_copy",
    description: "基于素材库视频触发抖音二创文案生成。",
    inputSchema: {
      type: "object",
      properties: {
        materialId: { type: "string", description: "必填：素材库中的视频素材 ID。" },
        injectBrandProfile: { type: "boolean" },
        productId: { type: "string" },
        injectMarketingPlan: { type: "boolean" },
        userRequirement: { type: "string" },
      },
      required: ["materialId"],
      additionalProperties: false,
    },
  },
  {
    name: "get_xiaohongshu_material_library_items",
    description: "查看当前品牌素材库里可用于小红书二创的对标作品。",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "integer", minimum: 1, maximum: 30 },
      },
      additionalProperties: false,
    },
  },
  {
    name: "get_xiaohongshu_marketing_calendar_options",
    description: "查看当前品牌最近一期小红书营销日历选题，可直接拿到 calendarItemId 供后续创作使用。",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "integer", minimum: 1, maximum: 30 },
      },
      additionalProperties: false,
    },
  },
  {
    name: "get_xiaohongshu_original_reference_templates",
    description: "查看小红书原创笔记参考模板分类和模板项，可按分类筛选。",
    inputSchema: {
      type: "object",
      properties: {
        categoryId: { type: "string" },
        limit: { type: "integer", minimum: 1, maximum: 50 },
      },
      additionalProperties: false,
    },
  },
  {
    name: "get_recent_xiaohongshu_original_works",
    description: "查看当前品牌最近生成的小红书原创笔记结果和状态。",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "integer", minimum: 1, maximum: 20 },
      },
      additionalProperties: false,
    },
  },
  {
    name: "create_xiaohongshu_rewrite_note",
    description: "基于素材库中的对标作品触发小红书二创图文生成。",
    inputSchema: {
      type: "object",
      properties: {
        sourceMaterialId: { type: "string", description: "素材库作品 ID。" },
        productId: { type: "string" },
        accountRole: { type: "string", description: "可选：BRAND、STAFF、TALENT。" },
        includeMarketingPlan: { type: "boolean" },
        additionalInstruction: { type: "string", description: "补充创作要求。" },
      },
      required: ["sourceMaterialId"],
      additionalProperties: false,
    },
  },
  {
    name: "create_xiaohongshu_original_note",
    description: "触发小红书原创图文生成。",
    inputSchema: {
      type: "object",
      properties: {
        calendarItemId: { type: "string", description: "可选。来自小红书营销日历的选题 ID。" },
        customTopicName: { type: "string", description: "可选。自定义选题名称。" },
        topic: { type: "string", description: "兼容旧写法，等同于 customTopicName。" },
        productId: { type: "string" },
        accountRole: { type: "string", description: "可选：BRAND、STAFF、TALENT。" },
        imageCount: { type: "integer", minimum: 2, maximum: 10 },
        includeMarketingPlan: { type: "boolean" },
        additionalInstruction: { type: "string", description: "补充创作要求。" },
        styleHint: { type: "string", description: "兼容旧写法，等同于 additionalInstruction。" },
      },
      additionalProperties: false,
    },
  },
  {
    name: "create_wechat_article",
    description: "触发公众号文章草稿生成。",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string" },
        summary: { type: "string" },
        content: { type: "string" },
        author: { type: "string" },
        styleHint: { type: "string" },
      },
      additionalProperties: false,
    },
  },
];

@Injectable()
export class OpenClawService {
  constructor(
    private readonly authService: AuthService,
    private readonly tasksService: TasksService,
    private readonly brandsService: BrandsService,
    private readonly collectorsService: CollectorsService,
    private readonly publishingService: PublishingService,
    private readonly reportsService: ReportsService,
    private readonly userSkillsService: UserSkillsService,
    private readonly worksService: WorksService,
    private readonly openClawInstallationService: OpenClawInstallationService,
  ) {}

  async getCurrentBrandContext(headers: HeadersMap) {
    const auth = await this.requireAuth(headers);
    const me = await this.authService.getMe(auth);
    const currentBrandId = me.currentBrandId;
    if (!currentBrandId) {
      throw new UnauthorizedException("当前账号没有可用品牌");
    }

    const currentBrand = me.brands.find((item) => item.id === currentBrandId);
    const access = await this.authService.assertBrandAccess(currentBrandId, auth);

    return this.buildSummaryResponse({
      title: "当前品牌上下文",
      summary: `当前默认品牌为 ${currentBrand?.brandName ?? currentBrandId}，你在该品牌下具备 ${access.role} 权限。`,
      highlights: [
        `当前品牌：${currentBrand?.brandName ?? currentBrandId}`,
        `当前角色：${access.role}`,
        `可访问品牌数：${me.brands.length}`,
      ],
      data: {
        user: {
          id: me.user.id,
          nickname: me.user.nickname,
          mobile: me.user.mobile,
        },
        brand: {
          id: currentBrandId,
          name: currentBrand?.brandName ?? "",
          industry: currentBrand?.industry ?? "",
          isDefault: true,
        },
        member: {
          role: access.role,
          isOwner: access.isOwner,
          permissions: access.permissions,
        },
      },
      links: [],
    });
  }

  async getBrandProducts(
    headers: HeadersMap,
    options?: {
      limit?: number;
    },
  ) {
    const auth = await this.requireAuth(headers);
    const brandId = await this.requireCurrentBrandId(auth);
    await this.authService.assertBrandAccess(brandId, auth);

    const archive = await this.brandsService.getArchive(brandId);
    const items = archive.products
      .slice(0, this.normalizeLimit(options?.limit))
      .map((item) => ({
        id: item.id,
        productName: item.productName,
        usageScenario: item.usageScenario,
        targetAudience: item.targetAudience,
        differentiators: item.differentiators,
        imageUrl: item.imageUrl,
      }));

    return this.buildSummaryResponse({
      title: "品牌产品清单",
      summary: items.length
        ? `当前品牌共有 ${archive.products.length} 个产品可用于内容生成。`
        : "当前品牌还没有可用产品，可直接按品牌通用内容生成。",
      highlights: items.length
        ? items.slice(0, 3).map((item) => `${item.productName}${item.targetAudience ? `｜${item.targetAudience}` : ""}`)
        : ["产品数：0"],
      data: {
        total: archive.products.length,
        items,
      },
      links: [{ label: "打开品牌档案", url: "/brand-growth/archive" }],
    });
  }

  async getPlatformAccounts(
    headers: HeadersMap,
    options?: {
      platform?: string;
      limit?: number;
    },
  ) {
    const auth = await this.requireAuth(headers);
    const brandId = await this.requireCurrentBrandId(auth);
    await this.authService.assertBrandAccess(brandId, auth);

    const archive = await this.brandsService.getArchive(brandId);
    const normalizedPlatform = this.normalizePlatformType(options?.platform);
    const scopedAccounts = archive.platformAccounts.filter((item) => (normalizedPlatform ? item.platform === normalizedPlatform : true));
    const items = scopedAccounts.slice(0, this.normalizeLimit(options?.limit));

    return this.buildSummaryResponse({
      title: "品牌平台账号清单",
      summary: items.length
        ? `当前返回 ${items.length} 个${normalizedPlatform ? `${normalizedPlatform} ` : ""}平台账号。`
        : normalizedPlatform
          ? `当前品牌下没有 ${normalizedPlatform} 平台账号。`
          : "当前品牌下还没有配置平台账号。",
      highlights: items.length
        ? items.slice(0, 5).map((item) => `${item.platform}｜${item.accountName || item.id}`)
        : ["账号数：0"],
      data: {
        total: scopedAccounts.length,
        platform: normalizedPlatform,
        items: items.map((item) => ({
          id: item.id,
          platform: item.platform,
          accountName: item.accountName,
          accountLink: item.accountLink,
        })),
      },
      links: [{ label: "打开品牌档案", url: "/brand-growth/archive" }],
    });
  }

  async getRecentTasksSummary(
    headers: HeadersMap,
    options?: {
      timeRange?: string;
      taskTypes?: string[];
    },
  ) {
    const auth = await this.requireAuth(headers);
    const brandId = await this.requireCurrentBrandId(auth);
    await this.authService.assertBrandAccess(brandId, auth);

    const tasks = await this.loadTasks(auth);
    const filteredTasks = this.filterTasks(tasks, brandId, options?.timeRange, options?.taskTypes);
    const total = filteredTasks.length;
    const completed = filteredTasks.filter((item) => item.taskStatus === "SUCCESS").length;
    const running = filteredTasks.filter((item) => item.taskStatus === "RUNNING" || item.taskStatus === "QUEUED").length;
    const failed = filteredTasks.filter((item) => item.taskStatus === "FAILED").length;
    const topTaskTypes = this.buildTopCounts(filteredTasks.map((item) => item.taskType), 3);
    const topFailedTaskTypes = this.buildTopCounts(
      filteredTasks.filter((item) => item.taskStatus === "FAILED").map((item) => item.taskType),
      3,
    );
    const resolvedTimeRange = this.normalizeTimeRange(options?.timeRange);

    return this.buildSummaryResponse({
      title: `最近 ${resolvedTimeRange.label}任务摘要`,
      summary: `最近 ${resolvedTimeRange.label}共有 ${total} 个任务，${completed} 个已完成，${running} 个进行中，${failed} 个失败。`,
      highlights: [
        topTaskTypes.length ? `高频任务类型：${topTaskTypes.map((item) => `${item.label}(${item.count})`).join("、")}` : "最近暂无任务记录",
        failed ? `失败任务主要集中在：${topFailedTaskTypes.map((item) => `${item.label}(${item.count})`).join("、")}` : "最近没有失败任务",
      ],
      data: {
        counts: {
          total,
          completed,
          running,
          failed,
        },
        topTaskTypes,
        topFailedTaskTypes,
        recentTasks: filteredTasks.slice(0, 5).map((item) => ({
          id: item.id,
          taskType: item.taskType,
          taskTitle: item.taskTitle,
          taskStatus: item.taskStatus,
          createdAt: item.createdAt,
        })),
      },
      links: [{ label: "打开任务中心", url: "/brand-growth/tasks" }],
    });
  }

  async getTaskDetail(
    headers: HeadersMap,
    options?: {
      taskId?: string;
    },
  ) {
    const auth = await this.requireAuth(headers);
    const taskId = String(options?.taskId || "").trim();
    if (!taskId) {
      throw new BadRequestException("请提供 taskId");
    }

    const task = await this.findTaskById(auth, taskId);
    return this.buildSummaryResponse({
      title: "任务详情",
      summary: `任务“${task.taskTitle || task.id}”当前状态为 ${this.formatTaskStatus(task.taskStatus)}。`,
      highlights: [
        `任务类型：${task.taskType}`,
        `任务状态：${this.formatTaskStatus(task.taskStatus)}`,
        task.errorMessage ? `失败原因：${this.normalizeFailureReason(task.errorMessage)}` : "失败原因：无",
      ],
      data: task,
      links: [{ label: "打开任务中心", url: "/brand-growth/tasks" }],
    });
  }

  async cancelTask(
    headers: HeadersMap,
    options?: {
      taskId?: string;
    },
  ) {
    const auth = await this.requireAuth(headers);
    const taskId = String(options?.taskId || "").trim();
    if (!taskId) {
      throw new BadRequestException("请提供 taskId");
    }

    const task = await this.tasksService.cancelTask(taskId, auth) as Record<string, unknown>;
    return this.buildSummaryResponse({
      title: "任务已取消",
      summary: `已取消任务 ${taskId}。`,
      highlights: [
        `任务状态：${this.formatTaskStatus(this.readStringField(task, "taskStatus"))}`,
        `任务类型：${this.readStringField(task, "taskType") || "未知"}`,
      ],
      data: task,
      links: [{ label: "打开任务中心", url: "/brand-growth/tasks" }],
    });
  }

  async retryTask(
    headers: HeadersMap,
    options?: {
      taskId?: string;
    },
  ) {
    const auth = await this.requireAuth(headers);
    const taskId = String(options?.taskId || "").trim();
    if (!taskId) {
      throw new BadRequestException("请提供 taskId");
    }

    const task = await this.tasksService.retryTask(taskId, auth) as Record<string, unknown>;
    return this.buildSummaryResponse({
      title: "任务已重新排队",
      summary: `已将任务 ${taskId} 重新放回排队。`,
      highlights: [
        `任务状态：${this.formatTaskStatus(this.readStringField(task, "taskStatus"))}`,
        `任务类型：${this.readStringField(task, "taskType") || "未知"}`,
      ],
      data: task,
      links: [{ label: "打开任务中心", url: "/brand-growth/tasks" }],
    });
  }

  async getFailedTasksSummary(
    headers: HeadersMap,
    options?: {
      timeRange?: string;
      taskTypes?: string[];
    },
  ) {
    const auth = await this.requireAuth(headers);
    const brandId = await this.requireCurrentBrandId(auth);
    await this.authService.assertBrandAccess(brandId, auth);

    const tasks = await this.loadTasks(auth);
    const failedTasks = this
      .filterTasks(tasks, brandId, options?.timeRange, options?.taskTypes)
      .filter((item) => item.taskStatus === "FAILED");
    const resolvedTimeRange = this.normalizeTimeRange(options?.timeRange);
    const topReasons = this.buildTopCounts(
      failedTasks.map((item) => this.normalizeFailureReason(item.errorMessage)),
      3,
    );

    return this.buildSummaryResponse({
      title: `最近 ${resolvedTimeRange.label}失败任务摘要`,
      summary: failedTasks.length
        ? `最近 ${resolvedTimeRange.label}失败任务主要集中在 ${topReasons.map((item) => item.label).join("、")} 等问题。`
        : `最近 ${resolvedTimeRange.label}没有失败任务。`,
      highlights: failedTasks.length
        ? topReasons.map((item) => `${item.label}：${item.count} 次`)
        : ["失败任务数：0"],
      data: {
        failedCount: failedTasks.length,
        topReasons,
        items: failedTasks.slice(0, 10).map((item) => ({
          id: item.id,
          taskType: item.taskType,
          taskTitle: item.taskTitle,
          errorMessage: item.errorMessage ?? "未记录失败原因",
          createdAt: item.createdAt,
        })),
      },
      links: [{ label: "打开任务中心", url: "/brand-growth/tasks" }],
    });
  }

  async getRecentKnowledgeFiles(
    headers: HeadersMap,
    options?: {
      timeRange?: string;
      knowledgeBaseId?: string;
      limit?: number;
    },
  ) {
    const auth = await this.requireAuth(headers);
    const brandId = await this.requireCurrentBrandId(auth);
    await this.authService.assertBrandPermission(brandId, "brandGrowth.library.businessAssets", "view", auth);

    const knowledgeBases = await this.brandsService.listBusinessKnowledgeBases(brandId);
    const scopedKnowledgeBases = options?.knowledgeBaseId
      ? knowledgeBases.filter((item) => item.id === options.knowledgeBaseId)
      : knowledgeBases;
    const resolvedTimeRange = this.normalizeTimeRange(options?.timeRange);
    const allFiles = await Promise.all(
      scopedKnowledgeBases.map(async (knowledgeBase) => {
        const files = await this.brandsService.listBusinessKnowledgeBaseFiles(brandId, knowledgeBase.id);
        return files.map((file) => ({
          ...file,
          knowledgeBaseId: knowledgeBase.id,
          knowledgeBaseName: knowledgeBase.name,
        }));
      }),
    );
    const mergedFiles = allFiles
      .flat()
      .filter((item) => this.isAfterTimeRange(item.uploadedAt, resolvedTimeRange.since))
      .sort((left, right) => new Date(right.uploadedAt).getTime() - new Date(left.uploadedAt).getTime());
    const limit = this.normalizeLimit(options?.limit);
    const limitedFiles = mergedFiles.slice(0, limit);
    const completed = mergedFiles.filter((item) => item.status === "INDEXED").length;
    const syncing = mergedFiles.filter((item) => item.status === "PENDING").length;
    const failed = mergedFiles.filter((item) => item.status === "FAILED").length;

    return this.buildSummaryResponse({
      title: `最近 ${resolvedTimeRange.label}知识资料摘要`,
      summary: `最近 ${resolvedTimeRange.label}新增了 ${mergedFiles.length} 份资料，其中 ${completed} 份已完成处理，${syncing} 份处理中，${failed} 份失败。`,
      highlights: [
        `知识库数量：${scopedKnowledgeBases.length}`,
        mergedFiles.length ? `最近资料：${limitedFiles.map((item) => item.title).slice(0, 3).join("、")}` : "最近没有新增资料",
      ],
      data: {
        knowledgeBaseCount: scopedKnowledgeBases.length,
        counts: {
          total: mergedFiles.length,
          completed,
          syncing,
          failed,
        },
        items: limitedFiles.map((item) => ({
          id: item.id,
          title: item.title,
          knowledgeBaseId: item.knowledgeBaseId,
          knowledgeBaseName: item.knowledgeBaseName,
          status: item.status,
          chunkCount: item.chunkCount,
          uploadedAt: item.uploadedAt,
          updatedAt: item.updatedAt,
        })),
      },
      links: [{ label: "打开知识库", url: "/brand-growth/business-assets" }],
    });
  }

  async getSkillConfigSummary(
    headers: HeadersMap,
    options?: {
      skillKey?: string;
    },
  ) {
    const auth = await this.requireAuth(headers);
    const brandId = await this.requireCurrentBrandId(auth);
    await this.authService.assertBrandAccess(brandId, auth);

    const skills = await this.userSkillsService.listUserSkills({ ...auth, brandId });
    const normalizedSkillKey = String(options?.skillKey || "").trim().toLowerCase();
    const matchedSkills = normalizedSkillKey
      ? skills.filter((item) => this.matchesSkillKey(item, normalizedSkillKey))
      : skills;
    const customizedCount = matchedSkills.filter((item) => item.isCustomized).length;

    if (normalizedSkillKey && !matchedSkills.length) {
      return this.buildSummaryResponse({
        title: "技能配置摘要",
        summary: `当前品牌下没有找到与“${options?.skillKey}”匹配的技能配置。`,
        highlights: [`当前品牌技能数：${skills.length}`],
        data: {
          total: skills.length,
          matched: 0,
          items: [],
        },
        links: [{ label: "打开技能中心", url: "/skills" }],
      });
    }

    const items = matchedSkills.slice(0, 10).map((item) => ({
      id: item.id,
      name: item.effectiveSkill.name,
      slug: item.baseSkill.slug,
      category: item.effectiveSkill.category,
      status: item.effectiveSkill.status,
      provider: item.effectiveSkill.provider,
      defaultModel: item.effectiveSkill.defaultModel,
      isCustomized: item.isCustomized,
      lastResetAt: item.lastResetAt,
      promptCount: item.prompts.length,
    }));

    return this.buildSummaryResponse({
      title: "技能配置摘要",
      summary: normalizedSkillKey
        ? `${items[0]?.name || options?.skillKey} 当前${items[0]?.status === "ACTIVE" ? "已启用" : "未启用"}，${items[0]?.isCustomized ? "存在品牌级定制" : "沿用平台基线配置"}。`
        : `当前品牌共关联 ${matchedSkills.length} 个技能，其中 ${customizedCount} 个存在品牌级定制。`,
      highlights: items.length
        ? items.slice(0, 3).map((item) => `${item.name}：${item.isCustomized ? "已定制" : "基线配置"} / ${item.status}`)
        : ["暂无可用技能配置"],
      data: {
        total: matchedSkills.length,
        customizedCount,
        items,
      },
      links: [{ label: "打开技能中心", url: "/skills" }],
    });
  }

  async getWechatArticleDrafts(
    headers: HeadersMap,
    options?: {
      limit?: number;
    },
  ) {
    const auth = await this.requireAuth(headers);
    const brandId = await this.requireCurrentBrandId(auth);
    await this.authService.assertBrandPermission(brandId, "wechat.original", "view", auth);

    const drafts = await this.worksService.listWechatArticleDrafts(brandId);
    const items = drafts.items.slice(0, this.normalizeLimit(options?.limit));
    return this.buildSummaryResponse({
      title: "公众号文章草稿",
      summary: items.length
        ? `当前品牌最近共有 ${drafts.items.length} 篇公众号草稿，下面返回最新 ${items.length} 篇。`
        : "当前品牌还没有公众号文章草稿。",
      highlights: items.length
        ? items.slice(0, 5).map((item) => `${item.title}｜${item.publishStatus || item.taskStatus || "待处理"}`)
        : ["草稿数：0"],
      data: {
        total: drafts.items.length,
        items,
      },
      links: [{ label: "打开公众号结果", url: "/wechat" }],
    });
  }

  async getWechatOfficialAccounts(headers: HeadersMap) {
    const auth = await this.requireAuth(headers);
    const brandId = await this.requireCurrentBrandId(auth);
    await this.authService.assertBrandPermission(brandId, "wechat.original", "view", auth);

    const accounts = await this.worksService.listWechatOfficialAccounts(brandId);
    return this.buildSummaryResponse({
      title: "公众号账号列表",
      summary: accounts.items.length
        ? `当前品牌已配置 ${accounts.items.length} 个公众号账号，可用于正式发布。`
        : "当前品牌还没有配置公众号账号。",
      highlights: accounts.items.length
        ? accounts.items.slice(0, 5).map((item) => `${item.accountName}｜${item.isDefault ? "默认账号" : "可选账号"}`)
        : ["公众号账号数：0"],
      data: accounts,
      links: [{ label: "打开公众号配置", url: "/wechat" }],
    });
  }

  async getWechatWorkflowSessions(
    headers: HeadersMap,
    options?: {
      limit?: number;
    },
  ) {
    const auth = await this.requireAuth(headers);
    const brandId = await this.requireCurrentBrandId(auth);
    await this.authService.assertBrandPermission(brandId, "wechat.original", "view", auth);

    const sessions = await this.worksService.listWechatWorkflowSessions(brandId);
    const items = sessions.items.slice(0, this.normalizeLimit(options?.limit));
    return this.buildSummaryResponse({
      title: "公众号工作流会话",
      summary: items.length
        ? `当前品牌最近共有 ${sessions.items.length} 个公众号工作流会话，下面返回最新 ${items.length} 个。`
        : "当前品牌还没有公众号工作流会话。",
      highlights: items.length
        ? items.slice(0, 5).map((item) => `${item.title}｜${item.status}`)
        : ["工作流会话数：0"],
      data: {
        total: sessions.items.length,
        items,
      },
      links: [{ label: "打开公众号工作流", url: "/wechat" }],
    });
  }

  async getWechatPublishHistory(
    headers: HeadersMap,
    options?: {
      limit?: number;
    },
  ) {
    const auth = await this.requireAuth(headers);
    const brandId = await this.requireCurrentBrandId(auth);
    await this.authService.assertBrandPermission(brandId, "wechat.original", "view", auth);

    const history = await this.worksService.listWechatPublishHistory(brandId);
    const items = history.items.slice(0, this.normalizeLimit(options?.limit));
    return this.buildSummaryResponse({
      title: "公众号发布历史",
      summary: items.length
        ? `当前品牌最近共有 ${history.items.length} 条公众号发布历史，下面返回最新 ${items.length} 条。`
        : "当前品牌还没有公众号发布历史。",
      highlights: items.length
        ? items.slice(0, 5).map((item) => `${item.workflowTitle}｜${item.status}`)
        : ["发布历史数：0"],
      data: {
        total: history.items.length,
        items,
      },
      links: [{ label: "打开公众号发布记录", url: "/wechat" }],
    });
  }

  async getWechatWorkflowPreferences(headers: HeadersMap) {
    const auth = await this.requireAuth(headers);
    const brandId = await this.requireCurrentBrandId(auth);
    await this.authService.assertBrandPermission(brandId, "wechat.original", "view", auth);

    const preference = await this.worksService.getWechatWorkflowPreferences(brandId);
    return this.buildSummaryResponse({
      title: "公众号工作流偏好",
      summary: preference.item.initialized
        ? "当前品牌已完成公众号工作流基础偏好配置。"
        : "当前品牌尚未完成公众号工作流基础偏好配置。",
      highlights: [
        `默认作者：${preference.item.defaultAuthor || "未设置"}`,
        `默认主题色：${preference.item.defaultThemeColor || "未设置"}`,
        `默认输入方式：${preference.item.defaultInputType || "未设置"}`,
      ],
      data: preference,
      links: [{ label: "打开公众号配置", url: "/wechat" }],
    });
  }

  async getWechatWorkflowSessionDetail(
    headers: HeadersMap,
    options?: {
      workflowId?: string;
    },
  ) {
    const auth = await this.requireAuth(headers);
    const brandId = await this.requireCurrentBrandId(auth);
    await this.authService.assertBrandPermission(brandId, "wechat.original", "view", auth);

    const workflowId = String(options?.workflowId || "").trim();
    if (!workflowId) {
      throw new BadRequestException("请提供 workflowId");
    }

    const session = await this.worksService.getWechatWorkflowSession(brandId, workflowId);
    return this.buildSummaryResponse({
      title: "公众号工作流详情",
      summary: `公众号工作流“${session.item.title}”当前状态为 ${session.item.status}。`,
      highlights: [
        `当前步骤：${session.item.currentStep}`,
        `发布就绪：${session.item.publishConfig?.ready ? "是" : "否"}`,
        `账号：${session.item.accountName || "未指定"}`,
      ],
      data: session,
      links: [{ label: "打开公众号工作流", url: "/wechat" }],
    });
  }

  async checkWechatWorkflowPublishReadiness(
    headers: HeadersMap,
    options?: {
      workflowId?: string;
    },
  ) {
    const auth = await this.requireAuth(headers);
    const brandId = await this.requireCurrentBrandId(auth);
    await this.authService.assertBrandPermission(brandId, "wechat.original", "edit", auth);

    const workflowId = String(options?.workflowId || "").trim();
    if (!workflowId) {
      throw new BadRequestException("请提供 workflowId");
    }

    const session = await this.worksService.updateWechatWorkflowPublishConfirm(brandId, workflowId, {});
    return this.buildSummaryResponse({
      title: "公众号发布确认结果",
      summary: session.item.publishConfig?.ready
        ? `公众号工作流 ${workflowId} 已具备正式发布条件。`
        : `公众号工作流 ${workflowId} 还未具备正式发布条件。`,
      highlights: session.item.publishConfig?.checklist?.length
        ? session.item.publishConfig.checklist
        : ["暂无发布检查项"],
      data: session,
      links: [{ label: "打开公众号工作流", url: "/wechat" }],
    });
  }

  async getWechatPublishHistoryDetail(
    headers: HeadersMap,
    options?: {
      historyId?: string;
    },
  ) {
    const auth = await this.requireAuth(headers);
    const brandId = await this.requireCurrentBrandId(auth);
    await this.authService.assertBrandPermission(brandId, "wechat.original", "view", auth);

    const historyId = String(options?.historyId || "").trim();
    if (!historyId) {
      throw new BadRequestException("请提供 historyId");
    }

    const history = await this.worksService.getWechatPublishHistoryItem(brandId, historyId);
    return this.buildSummaryResponse({
      title: "公众号发布历史详情",
      summary: `发布记录“${history.item.workflowTitle}”当前状态为 ${history.item.status}。`,
      highlights: [
        `工作流：${history.item.workflowTitle}`,
        `账号：${history.item.accountName || "未指定"}`,
        history.item.errorDetail ? `失败原因：${history.item.errorDetail}` : "失败原因：无",
      ],
      data: history,
      links: [{ label: "打开公众号发布记录", url: "/wechat" }],
    });
  }

  async publishWechatArticle(
    headers: HeadersMap,
    options?: {
      draftId?: string;
    },
  ) {
    const auth = await this.requireAuth(headers);
    const brandId = await this.requireCurrentBrandId(auth);
    await this.authService.assertBrandPermission(brandId, "wechat.original", "edit", auth);

    const draftId = String(options?.draftId || "").trim();
    if (!draftId) {
      throw new BadRequestException("请提供 draftId");
    }

    const result = await this.publishingService.publishWechatArticleToOfficialAccount(brandId, draftId);
    return this.buildSummaryResponse({
      title: "公众号草稿已提交发布",
      summary: `已提交公众号草稿 ${draftId} 的正式发布。`,
      highlights: [
        `草稿：${draftId}`,
        `任务状态：${this.readNestedStringField(result as Record<string, unknown>, ["task", "taskStatus"]) || "未知"}`,
        `标题：${this.readNestedStringField(result as Record<string, unknown>, ["item", "title"]) || "未命名草稿"}`,
      ],
      data: result,
      links: [{ label: "打开公众号发布记录", url: "/wechat" }],
    });
  }

  async createXiaohongshuMobileDraftSession(
    headers: HeadersMap,
    options?: {
      workId?: string;
      accountId?: string;
    },
  ) {
    const auth = await this.requireAuth(headers);
    const brandId = await this.requireCurrentBrandId(auth);
    const workId = String(options?.workId || "").trim();
    if (!workId) {
      throw new BadRequestException("请提供 workId");
    }
    await this.assertXiaohongshuPublishPermission(brandId, workId, auth);

    const result = await this.publishingService.createXiaohongshuMobileDraftSession(brandId, workId, {
      accountId: String(options?.accountId || "").trim() || undefined,
    });
    const mobileUrl = this.readNestedStringField(result as Record<string, unknown>, ["session", "mobileUrl"]);
    const accountName = this.readNestedStringField(result as Record<string, unknown>, ["session", "accountName"]) || "未指定账号";
    const title = this.readNestedStringField(result as Record<string, unknown>, ["session", "title"]) || "未命名作品";
    const sessionToken = this.readNestedStringField(result as Record<string, unknown>, ["session", "token"]) || "未返回";
    const expiresAt = this.readNestedStringField(result as Record<string, unknown>, ["session", "expiresAt"]) || "未返回";
    const accessHint = this.readNestedStringField(result as Record<string, unknown>, ["session", "accessHint"]) || "请在手机端打开接力页完成保存。";

    return this.buildSummaryResponse({
      title: "已创建小红书手机草稿接力",
      summary: `已为作品 ${workId} 创建手机扫码接力草稿会话，请在过期前打开接力页完成保存。`,
      highlights: [
        `作品标题：${title}`,
        `发布账号：${accountName}`,
        `会话令牌：${sessionToken}`,
        `过期时间：${expiresAt}`,
        accessHint,
      ],
      data: result,
      links: [
        ...(mobileUrl ? [{ label: "打开手机接力页", url: mobileUrl }] : []),
        { label: "打开作品工作台", url: "/personal-center/works" },
      ],
      resultStatus: "IN_PROGRESS",
      resourceKind: "publish_session",
      nextActions: [
        ...(mobileUrl ? [{ label: "打开手机接力页", action: "open_page" as const, target: mobileUrl }] : []),
        { label: "回到对话继续确认结果", action: "continue_in_chat" as const, target: workId },
      ],
    });
  }

  async createXiaohongshuDesktopDraftSession(
    headers: HeadersMap,
    options?: {
      workId?: string;
      accountId?: string;
    },
  ) {
    const auth = await this.requireAuth(headers);
    const brandId = await this.requireCurrentBrandId(auth);
    const workId = String(options?.workId || "").trim();
    if (!workId) {
      throw new BadRequestException("请提供 workId");
    }
    await this.assertXiaohongshuPublishPermission(brandId, workId, auth);

    const result = await this.publishingService.createXiaohongshuDesktopDraftSession(brandId, workId, {
      accountId: String(options?.accountId || "").trim() || undefined,
    });
    const creatorUrl = this.readNestedStringField(result as Record<string, unknown>, ["session", "creatorUrl"]);
    const accountName = this.readNestedStringField(result as Record<string, unknown>, ["session", "accountName"]) || "未指定账号";
    const title = this.readNestedStringField(result as Record<string, unknown>, ["session", "title"]) || "未命名作品";
    const sessionToken = this.readNestedStringField(result as Record<string, unknown>, ["session", "token"]) || "未返回";
    const expiresAt = this.readNestedStringField(result as Record<string, unknown>, ["session", "expiresAt"]) || "未返回";
    const accessHint = this.readNestedStringField(result as Record<string, unknown>, ["session", "accessHint"]) || "请在电脑端打开创作者中心并使用浏览器扩展接力。";

    return this.buildSummaryResponse({
      title: "已创建小红书电脑端草稿接力",
      summary: `已为作品 ${workId} 创建电脑端草稿接力，请在浏览器中打开创作者中心并完成自动填充。`,
      highlights: [
        `作品标题：${title}`,
        `发布账号：${accountName}`,
        `会话令牌：${sessionToken}`,
        `过期时间：${expiresAt}`,
        accessHint,
      ],
      data: result,
      links: [
        ...(creatorUrl ? [{ label: "打开小红书创作者中心", url: creatorUrl }] : []),
        { label: "打开作品工作台", url: "/personal-center/works" },
      ],
      resultStatus: "IN_PROGRESS",
      resourceKind: "publish_session",
      nextActions: [
        ...(creatorUrl ? [{ label: "打开创作者中心", action: "open_page" as const, target: creatorUrl }] : []),
        { label: "回到对话继续确认结果", action: "continue_in_chat" as const, target: workId },
      ],
    });
  }

  async createDouyinMobilePublishSession(
    headers: HeadersMap,
    options?: {
      workId?: string;
      accountId?: string;
    },
  ) {
    const auth = await this.requireAuth(headers);
    const brandId = await this.requireCurrentBrandId(auth);
    const workId = String(options?.workId || "").trim();
    if (!workId) {
      throw new BadRequestException("请提供 workId");
    }
    await this.assertDouyinPublishPermission(brandId, workId, auth);

    const result = await this.publishingService.createDouyinMobilePublishSession(brandId, workId, {
      accountId: String(options?.accountId || "").trim() || undefined,
    });
    const mobileUrl = this.readNestedStringField(result as Record<string, unknown>, ["session", "mobileUrl"]);
    const accountName = this.readNestedStringField(result as Record<string, unknown>, ["session", "accountName"]) || "未指定账号";
    const title = this.readNestedStringField(result as Record<string, unknown>, ["session", "title"]) || "未命名作品";
    const sessionToken = this.readNestedStringField(result as Record<string, unknown>, ["session", "token"]) || "未返回";
    const expiresAt = this.readNestedStringField(result as Record<string, unknown>, ["session", "expiresAt"]) || "未返回";
    const accessHint = this.readNestedStringField(result as Record<string, unknown>, ["session", "accessHint"]) || "请在手机端打开接力页继续完成抖音发布。";

    return this.buildSummaryResponse({
      title: "已创建抖音手机发布接力",
      summary: `已为作品 ${workId} 创建手机发布接力会话，请在手机端继续完成抖音发布。`,
      highlights: [
        `作品标题：${title}`,
        `发布账号：${accountName}`,
        `会话令牌：${sessionToken}`,
        `过期时间：${expiresAt}`,
        accessHint,
      ],
      data: result,
      links: [
        ...(mobileUrl ? [{ label: "打开手机发布页", url: mobileUrl }] : []),
        { label: "打开作品工作台", url: "/personal-center/works" },
      ],
      resultStatus: "IN_PROGRESS",
      resourceKind: "publish_session",
      nextActions: [
        ...(mobileUrl ? [{ label: "打开手机发布页", action: "open_page" as const, target: mobileUrl }] : []),
        { label: "回到对话继续确认结果", action: "continue_in_chat" as const, target: workId },
      ],
    });
  }

  async createDouyinDesktopPublishSession(
    headers: HeadersMap,
    options?: {
      workId?: string;
      accountId?: string;
    },
  ) {
    const auth = await this.requireAuth(headers);
    const brandId = await this.requireCurrentBrandId(auth);
    const workId = String(options?.workId || "").trim();
    if (!workId) {
      throw new BadRequestException("请提供 workId");
    }
    await this.assertDouyinPublishPermission(brandId, workId, auth);

    const result = await this.publishingService.createDouyinDesktopPublishSession(brandId, workId, {
      accountId: String(options?.accountId || "").trim() || undefined,
    });
    const creatorUrl = this.readNestedStringField(result as Record<string, unknown>, ["session", "creatorUrl"]);
    const accountName = this.readNestedStringField(result as Record<string, unknown>, ["session", "accountName"]) || "未指定账号";
    const title = this.readNestedStringField(result as Record<string, unknown>, ["session", "title"]) || "未命名作品";
    const sessionToken = this.readNestedStringField(result as Record<string, unknown>, ["session", "token"]) || "未返回";
    const expiresAt = this.readNestedStringField(result as Record<string, unknown>, ["session", "expiresAt"]) || "未返回";
    const accessHint = this.readNestedStringField(result as Record<string, unknown>, ["session", "accessHint"]) || "请在电脑端打开抖音创作者中心并使用浏览器扩展接力。";

    return this.buildSummaryResponse({
      title: "已创建抖音电脑端发布接力",
      summary: `已为作品 ${workId} 创建电脑端发布接力，请在创作者中心完成自动填充后继续发布。`,
      highlights: [
        `作品标题：${title}`,
        `发布账号：${accountName}`,
        `会话令牌：${sessionToken}`,
        `过期时间：${expiresAt}`,
        accessHint,
      ],
      data: result,
      links: [
        ...(creatorUrl ? [{ label: "打开抖音创作者中心", url: creatorUrl }] : []),
        { label: "打开作品工作台", url: "/personal-center/works" },
      ],
      resultStatus: "IN_PROGRESS",
      resourceKind: "publish_session",
      nextActions: [
        ...(creatorUrl ? [{ label: "打开创作者中心", action: "open_page" as const, target: creatorUrl }] : []),
        { label: "回到对话继续确认结果", action: "continue_in_chat" as const, target: workId },
      ],
    });
  }

  async publishWechatWorkflow(
    headers: HeadersMap,
    options?: {
      workflowId?: string;
    },
  ) {
    const auth = await this.requireAuth(headers);
    const brandId = await this.requireCurrentBrandId(auth);
    await this.authService.assertBrandPermission(brandId, "wechat.original", "edit", auth);

    const workflowId = String(options?.workflowId || "").trim();
    if (!workflowId) {
      throw new BadRequestException("请提供 workflowId");
    }

    const result = await this.publishingService.publishWechatWorkflowToOfficialAccount(brandId, workflowId);
    return this.buildSummaryResponse({
      title: "公众号工作流已提交发布",
      summary: `已提交公众号工作流 ${workflowId} 的正式发布。`,
      highlights: [
        `工作流：${workflowId}`,
        `任务状态：${this.readNestedStringField(result as Record<string, unknown>, ["task", "taskStatus"]) || "未知"}`,
        `标题：${this.readNestedStringField(result as Record<string, unknown>, ["item", "title"]) || "未命名工作流"}`,
      ],
      data: result,
      links: [{ label: "打开公众号发布记录", url: "/wechat" }],
    });
  }

  async retryWechatPublishHistory(
    headers: HeadersMap,
    options?: {
      historyId?: string;
    },
  ) {
    const auth = await this.requireAuth(headers);
    const brandId = await this.requireCurrentBrandId(auth);
    await this.authService.assertBrandPermission(brandId, "wechat.original", "edit", auth);

    const historyId = String(options?.historyId || "").trim();
    if (!historyId) {
      throw new BadRequestException("请提供 historyId");
    }

    const result = await this.publishingService.retryWechatWorkflowPublishToOfficialAccount(brandId, historyId);
    return this.buildSummaryResponse({
      title: "公众号发布已重试",
      summary: `已重试公众号发布历史 ${historyId}。`,
      highlights: [
        `发布历史：${historyId}`,
        `任务状态：${this.readNestedStringField(result as Record<string, unknown>, ["task", "taskStatus"]) || "未知"}`,
        `标题：${this.readNestedStringField(result as Record<string, unknown>, ["item", "title"]) || "未命名发布项"}`,
      ],
      data: result,
      links: [{ label: "打开公众号发布记录", url: "/wechat" }],
    });
  }

  async getDesignWorkspaceOptions(headers: HeadersMap) {
    const auth = await this.requireAuth(headers);
    const brandId = await this.requireCurrentBrandId(auth);
    await this.authService.assertBrandPermission(brandId, "personalCenter.works", "view", auth);

    const workspace = await this.worksService.getDesignWorkspaceOptions(brandId);
    return this.buildSummaryResponse({
      title: "设计工作台可用选项",
      summary: `当前品牌支持 ${Object.keys(workspace.moduleOptions).length} 个设计模块，可直接在对话里确认模块、设计类型、产品和营销日历后发起任务。`,
      highlights: [
        `营销日历选项：${workspace.calendarOptions.length}`,
        `产品选项：${workspace.productOptions.length}`,
        `推荐模块：${Object.entries(workspace.moduleOptions).map(([key, value]) => `${key}(${value.types.length})`).join("、")}`,
      ],
      data: {
        brandId: workspace.brandId,
        brandName: workspace.brandName,
        brandProfileSummary: workspace.brandProfileSummary,
        calendarOptions: workspace.calendarOptions.slice(0, 20),
        productOptions: workspace.productOptions.slice(0, 20),
        brandOptions: workspace.brandOptions,
        moduleOptions: workspace.moduleOptions,
      },
      links: [{ label: "打开设计工作台", url: "/personal-center/works" }],
    });
  }

  async getRecentDesignWorks(
    headers: HeadersMap,
    options?: {
      limit?: number;
    },
  ) {
    const auth = await this.requireAuth(headers);
    const brandId = await this.requireCurrentBrandId(auth);
    await this.authService.assertBrandPermission(brandId, "personalCenter.works", "view", auth);

    const history = await this.worksService.listDesignHistory(brandId);
    const items = history.items.slice(0, this.normalizeLimit(options?.limit));
    return this.buildSummaryResponse({
      title: "最近设计工作台结果",
      summary: items.length
        ? `当前品牌最近共有 ${history.items.length} 条设计记录，下面返回最新 ${items.length} 条。`
        : "当前品牌还没有设计工作台生成记录。",
      highlights: items.length
        ? items.slice(0, 5).map((item) => `${item.title}｜${item.module}｜${this.formatTaskStatus(item.taskStatus)}`)
        : ["设计记录数：0"],
      data: {
        total: history.items.length,
        items,
      },
      links: [{ label: "打开设计工作台", url: "/personal-center/works" }],
    });
  }

  async createDesignWork(
    headers: HeadersMap,
    options?: {
      module?: string;
      designType?: string;
      title?: string;
      calendarItemId?: string;
      productId?: string;
      injectBrandProfile?: boolean;
      modelSelection?: string;
      spec?: string;
      additionalInstruction?: string;
    },
  ) {
    const auth = await this.requireAuth(headers);
    const brandId = await this.requireCurrentBrandId(auth);
    await this.authService.assertBrandPermission(brandId, "personalCenter.works", "edit", auth);

    const module = this.normalizeDesignModule(options?.module);
    if (!module) {
      throw new BadRequestException("请提供有效的设计模块：image、html、deck、video");
    }

    const result = await this.worksService.generateDesignWork(brandId, {
      module,
      designType: String(options?.designType || "").trim() || undefined,
      title: String(options?.title || "").trim() || undefined,
      calendarItemId: String(options?.calendarItemId || "").trim() || undefined,
      productId: String(options?.productId || "").trim() || undefined,
      injectBrandProfile: typeof options?.injectBrandProfile === "boolean" ? options.injectBrandProfile : undefined,
      modelSelection: String(options?.modelSelection || "").trim() || undefined,
      spec: String(options?.spec || "").trim() || undefined,
      additionalInstruction: String(options?.additionalInstruction || "").trim() || undefined,
    }, auth);

    return this.buildSummaryResponse({
      title: "设计任务已受理",
      summary: `已在网站设计工作台中创建 ${module} 设计任务。`,
      highlights: [
        `模块：${module}`,
        options?.designType ? `设计类型：${options.designType}` : "设计类型：按默认技能生成",
        options?.productId ? `产品：${options.productId}` : "产品：未指定",
      ],
      data: result,
      links: [{ label: "打开设计工作台", url: "/personal-center/works" }],
    });
  }

  async getXiaohongshuMarketingCalendarOptions(
    headers: HeadersMap,
    options?: {
      limit?: number;
    },
  ) {
    const auth = await this.requireAuth(headers);
    const brandId = await this.requireCurrentBrandId(auth);
    await this.authService.assertBrandPermission(brandId, "xiaohongshu.original", "view", auth);

    const workspace = await this.reportsService.getXiaohongshuMarketingCalendarWorkspace(brandId);
    const latest = workspace.latest;
    const items = (latest?.items || []).slice(0, this.normalizeLimit(options?.limit)).map((item) => ({
      id: item.id,
      date: item.date,
      topicName: item.topicName,
      productName: item.productName,
      noteType: item.noteType,
      targetAudience: item.targetAudience,
      contentGoal: item.contentGoal,
      expressionFocus: item.expressionFocus,
      topicContent: item.topicContent,
      noteKeywords: item.noteKeywords,
      titleDirections: item.titleDirections,
    }));

    return this.buildSummaryResponse({
      title: "小红书营销日历选题",
      summary: latest
        ? `当前最近一期小红书营销日历共有 ${latest.items.length} 个可选选题，可直接拿 item.id 作为 calendarItemId 发起创作。`
        : "当前品牌还没有可用的小红书营销日历，请先生成营销日历。",
      highlights: items.length
        ? items.slice(0, 5).map((item) => `${item.date}｜${item.topicName}`)
        : ["暂无可用选题"],
      data: {
        latestReportId: latest?.id,
        latestReportTitle: latest?.title,
        generatedAt: latest?.generatedAt,
        total: latest?.items.length || 0,
        items,
      },
      links: [{ label: "打开小红书工作区", url: "/xiaohongshu" }],
    });
  }

  async getDouyinOriginalCopyOptions(headers: HeadersMap) {
    const auth = await this.requireAuth(headers);
    const brandId = await this.requireCurrentBrandId(auth);
    await this.authService.assertBrandPermission(brandId, "douyin.original", "view", auth);

    const workspace = await this.reportsService.getDouyinOriginalCopyWorkspace(brandId);
    return this.buildSummaryResponse({
      title: "抖音原创文案选项",
      summary: `当前品牌可用 ${workspace.topicOptions.length} 个选题、${workspace.calendarOptions.length} 个营销日历项，可在对话中选定文案类型后直接生成。`,
      highlights: [
        `选题库：${workspace.topicOptions.length}`,
        `营销日历：${workspace.calendarOptions.length}`,
        workspace.hasMarketingPlan ? `营销策划：已配置《${workspace.marketingPlanTitle || "抖音营销策划"}》` : "营销策划：未配置",
      ],
      data: {
        copyTypes: [
          { value: "VIEWPOINT", label: "聊观点" },
          { value: "STORY", label: "讲故事" },
          { value: "PROCESS", label: "晒过程" },
          { value: "KNOWLEDGE", label: "教知识" },
          { value: "PLOT_SALES", label: "剧情带货" },
          { value: "SEEDING", label: "种草类" },
          { value: "LOCAL_SALES", label: "同城带货" },
        ],
        calendarOptions: workspace.calendarOptions.slice(0, 20),
        topicOptions: workspace.topicOptions.slice(0, 30),
        hasMarketingPlan: workspace.hasMarketingPlan,
        marketingPlanTitle: workspace.marketingPlanTitle,
        latestTask: workspace.latestTask,
      },
      links: [{ label: "打开抖音原创文案", url: "/douyin" }],
    });
  }

  async getRecentDouyinOriginalCopies(
    headers: HeadersMap,
    options?: {
      limit?: number;
    },
  ) {
    const auth = await this.requireAuth(headers);
    const brandId = await this.requireCurrentBrandId(auth);
    await this.authService.assertBrandPermission(brandId, "douyin.original", "view", auth);

    const workspace = await this.reportsService.getDouyinOriginalCopyWorkspace(brandId);
    const items = workspace.history.slice(0, this.normalizeLimit(options?.limit));
    return this.buildSummaryResponse({
      title: "最近抖音原创文案结果",
      summary: items.length
        ? `当前品牌最近共有 ${workspace.history.length} 条抖音原创文案结果，下面返回最新 ${items.length} 条。`
        : "当前品牌还没有抖音原创文案结果。",
      highlights: items.length
        ? items.slice(0, 5).map((item) => `${item.title}｜${item.copyTypeLabel}`)
        : ["原创文案数：0"],
      data: {
        total: workspace.history.length,
        latestTask: workspace.latestTask,
        items,
      },
      links: [{ label: "打开抖音原创文案", url: "/douyin" }],
    });
  }

  async createDouyinOriginalCopy(
    headers: HeadersMap,
    options?: {
      copyType?: string;
      topicId?: string;
      calendarItemId?: string;
      injectMarketingPlan?: boolean;
      userRequirement?: string;
    },
  ) {
    const auth = await this.requireAuth(headers);
    const brandId = await this.requireCurrentBrandId(auth);
    await this.authService.assertBrandPermission(brandId, "douyin.original", "edit", auth);

    const copyType = this.normalizeDouyinOriginalCopyType(options?.copyType);
    if (!copyType) {
      throw new BadRequestException("请提供有效的抖音原创文案类型");
    }

    const workspace = await this.reportsService.generateDouyinOriginalCopy(brandId, {
      copyType,
      topicId: String(options?.topicId || "").trim() || undefined,
      calendarItemId: String(options?.calendarItemId || "").trim() || undefined,
      injectMarketingPlan: typeof options?.injectMarketingPlan === "boolean" ? options.injectMarketingPlan : false,
      userRequirement: String(options?.userRequirement || "").trim() || undefined,
    });

    return this.buildSummaryResponse({
      title: "抖音原创文案任务已受理",
      summary: `已为当前品牌发起 ${copyType} 类型的抖音原创文案任务。`,
      highlights: [
        `文案类型：${copyType}`,
        options?.topicId ? `选题：${options.topicId}` : "选题：未指定",
        options?.calendarItemId ? `营销日历：${options.calendarItemId}` : "营销日历：未指定",
      ],
      data: {
        latestTask: workspace.latestTask,
        latest: workspace.latest,
      },
      links: [{ label: "打开抖音原创文案", url: "/douyin" }],
    });
  }

  async getDouyinRemixCopyOptions(headers: HeadersMap) {
    const auth = await this.requireAuth(headers);
    const brandId = await this.requireCurrentBrandId(auth);
    await this.authService.assertBrandPermission(brandId, "douyin.remix", "view", auth);

    const workspace = await this.reportsService.getDouyinRemixCopyWorkspace(brandId);
    return this.buildSummaryResponse({
      title: "抖音二创文案选项",
      summary: `当前品牌可用 ${workspace.materialOptions.length} 条素材和 ${workspace.productOptions.length} 个产品，可在对话中确认后直接生成抖音二创文案。`,
      highlights: [
        `素材库：${workspace.materialOptions.length}`,
        `产品选项：${workspace.productOptions.length}`,
        workspace.hasMarketingPlan ? `营销策划：已配置《${workspace.marketingPlanTitle || "抖音营销策划"}》` : "营销策划：未配置",
      ],
      data: {
        materialOptions: workspace.materialOptions.slice(0, 30),
        productOptions: workspace.productOptions.slice(0, 20),
        hasMarketingPlan: workspace.hasMarketingPlan,
        marketingPlanTitle: workspace.marketingPlanTitle,
        latestTask: workspace.latestTask,
      },
      links: [{ label: "打开抖音二创文案", url: "/douyin" }],
    });
  }

  async getRecentDouyinRemixCopies(
    headers: HeadersMap,
    options?: {
      limit?: number;
    },
  ) {
    const auth = await this.requireAuth(headers);
    const brandId = await this.requireCurrentBrandId(auth);
    await this.authService.assertBrandPermission(brandId, "douyin.remix", "view", auth);

    const workspace = await this.reportsService.getDouyinRemixCopyWorkspace(brandId);
    const items = workspace.history.slice(0, this.normalizeLimit(options?.limit));
    return this.buildSummaryResponse({
      title: "最近抖音二创文案结果",
      summary: items.length
        ? `当前品牌最近共有 ${workspace.history.length} 条抖音二创文案结果，下面返回最新 ${items.length} 条。`
        : "当前品牌还没有抖音二创文案结果。",
      highlights: items.length
        ? items.slice(0, 5).map((item) => `${item.title}｜${item.sourceMaterialTitle}`)
        : ["二创文案数：0"],
      data: {
        total: workspace.history.length,
        latestTask: workspace.latestTask,
        items,
      },
      links: [{ label: "打开抖音二创文案", url: "/douyin" }],
    });
  }

  async createDouyinRemixCopy(
    headers: HeadersMap,
    options?: {
      materialId?: string;
      injectBrandProfile?: boolean;
      productId?: string;
      injectMarketingPlan?: boolean;
      userRequirement?: string;
    },
  ) {
    const auth = await this.requireAuth(headers);
    const brandId = await this.requireCurrentBrandId(auth);
    await this.authService.assertBrandPermission(brandId, "douyin.remix", "edit", auth);

    const materialId = String(options?.materialId || "").trim();
    if (!materialId) {
      throw new BadRequestException("请提供 materialId");
    }

    const workspace = await this.reportsService.generateDouyinRemixCopy(brandId, {
      materialId,
      injectBrandProfile: typeof options?.injectBrandProfile === "boolean" ? options.injectBrandProfile : false,
      productId: String(options?.productId || "").trim() || undefined,
      injectMarketingPlan: typeof options?.injectMarketingPlan === "boolean" ? options.injectMarketingPlan : false,
      userRequirement: String(options?.userRequirement || "").trim() || undefined,
    });

    return this.buildSummaryResponse({
      title: "抖音二创文案任务已受理",
      summary: "已为当前品牌发起抖音二创文案任务。",
      highlights: [
        `素材：${materialId}`,
        typeof options?.injectBrandProfile === "boolean" ? `植入品牌资料：${options.injectBrandProfile ? "是" : "否"}` : "植入品牌资料：默认关闭",
        options?.productId ? `产品：${options.productId}` : "产品：未指定",
      ],
      data: {
        latestTask: workspace.latestTask,
        latest: workspace.latest,
      },
      links: [{ label: "打开抖音二创文案", url: "/douyin" }],
    });
  }

  async getXiaohongshuMaterialLibraryItems(
    headers: HeadersMap,
    options?: {
      limit?: number;
    },
  ) {
    const auth = await this.requireAuth(headers);
    const brandId = await this.requireCurrentBrandId(auth);
    await this.authService.assertBrandPermission(brandId, "xiaohongshu.remix", "view", auth);

    const workspace = await this.collectorsService.getXiaohongshuWorkspace(brandId);
    const materials = workspace.benchmarkNotes
      .filter((item) => item.isInMaterialLibrary)
      .sort((left, right) => this.getTimestamp(right.materialAddedAt || right.collectedAt) - this.getTimestamp(left.materialAddedAt || left.collectedAt));
    const items = materials.slice(0, this.normalizeLimit(options?.limit));

    return this.buildSummaryResponse({
      title: "小红书二创素材库",
      summary: items.length
        ? `当前品牌素材库中有 ${materials.length} 条可用于二创的对标作品。`
        : "当前品牌素材库里还没有可用于二创的作品，请先把对标作品加入素材库。",
      highlights: items.length
        ? items.slice(0, 5).map((item) => `${item.title}｜${item.nickname || "未命名作者"}`)
        : ["素材数：0"],
      data: {
        total: materials.length,
        items: items.map((item) => ({
          id: item.id,
          title: item.title,
          nickname: item.nickname,
          noteUrl: item.noteUrl,
          sourceUrl: item.sourceUrl,
          noteType: item.noteType,
          likeCount: item.likeCount,
          collectCount: item.collectCount,
          commentCount: item.commentCount,
          materialAddedAt: item.materialAddedAt,
          collectedAt: item.collectedAt,
        })),
      },
      links: [{ label: "打开素材库", url: "/xiaohongshu" }],
    });
  }

  async getXiaohongshuOriginalReferenceTemplates(
    headers: HeadersMap,
    options?: {
      categoryId?: string;
      limit?: number;
    },
  ) {
    const auth = await this.requireAuth(headers);
    const brandId = await this.requireCurrentBrandId(auth);
    await this.authService.assertBrandPermission(brandId, "xiaohongshu.original", "view", auth);

    const templates = await this.worksService.listXiaohongshuOriginalReferenceTemplates();
    const filteredItems = templates.items
      .filter((item) => (options?.categoryId ? item.categoryId === options.categoryId : true))
      .slice(0, this.normalizeLimit(options?.limit));

    return this.buildSummaryResponse({
      title: "小红书原创参考模板",
      summary: filteredItems.length
        ? `当前返回 ${filteredItems.length} 个原创参考模板，可作为后续生成时的风格参考。`
        : options?.categoryId
          ? `未找到分类 ${options.categoryId} 下的参考模板。`
          : "当前没有可用的原创参考模板。",
      highlights: filteredItems.length
        ? filteredItems.slice(0, 5).map((item) => `${item.categoryLabel}｜${item.title}`)
        : ["模板数：0"],
      data: {
        generatedAt: templates.generatedAt,
        categories: templates.categories,
        total: options?.categoryId ? filteredItems.length : templates.items.length,
        items: filteredItems,
      },
      links: [{ label: "打开小红书工作区", url: "/xiaohongshu" }],
    });
  }

  async getRecentXiaohongshuOriginalWorks(
    headers: HeadersMap,
    options?: {
      limit?: number;
    },
  ) {
    const auth = await this.requireAuth(headers);
    const brandId = await this.requireCurrentBrandId(auth);
    await this.authService.assertBrandPermission(brandId, "xiaohongshu.original", "view", auth);

    const workspace = await this.worksService.listXiaohongshuOriginalWorks(brandId);
    const items = workspace.items.slice(0, this.normalizeLimit(options?.limit));

    return this.buildSummaryResponse({
      title: "最近小红书原创笔记结果",
      summary: items.length
        ? `当前品牌最近共有 ${workspace.items.length} 条原创笔记结果，下面返回最新 ${items.length} 条。`
        : "当前品牌还没有原创笔记结果。",
      highlights: items.length
        ? items.slice(0, 5).map((item) => `${item.title}｜${this.formatTaskStatus(item.taskStatus)}`)
        : ["作品数：0"],
      data: {
        total: workspace.items.length,
        items: items.map((item) => ({
          id: item.id,
          taskId: item.taskId,
          title: item.title,
          taskStatus: item.taskStatus,
          accountRole: item.accountRole,
          productName: item.productName,
          customTopicName: item.customTopicName,
          calendarLabel: item.calendarLabel,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
        })),
      },
      links: [{ label: "打开小红书工作区", url: "/xiaohongshu" }],
    });
  }

  async createBrandGrowthReport(
    headers: HeadersMap,
    options?: {
      goal?: string;
      timeRange?: string;
    },
  ) {
    const auth = await this.requireAuth(headers);
    const brandId = await this.requireCurrentBrandId(auth);
    await this.authService.assertBrandPermission(brandId, "brandGrowth.report.growthReport", "edit", auth);

    const workspace = await this.reportsService.generateGrowthReport(brandId);
    const latestTask = workspace.latestTask;

    return this.buildSummaryResponse({
      title: "品牌增长报告已受理",
      summary: latestTask
        ? `已为当前品牌发起品牌增长报告任务，当前状态为 ${this.formatTaskStatus(latestTask.taskStatus)}。`
        : "已为当前品牌发起品牌增长报告任务。",
      highlights: [
        options?.goal ? `目标：${options.goal}` : "默认按当前品牌上下文生成",
        options?.timeRange ? `时间范围：${options.timeRange}` : "时间范围：系统默认",
      ],
      data: {
        task: latestTask
          ? {
              id: latestTask.id,
              taskType: latestTask.taskType,
              taskTitle: latestTask.taskTitle,
              taskStatus: latestTask.taskStatus,
              phaseText: latestTask.phaseText,
              createdAt: latestTask.createdAt,
            }
          : undefined,
        latestReportId: workspace.latest?.id,
      },
      links: [{ label: "打开完整报告", url: "/brand-growth/reports" }],
    });
  }

  async getLatestBrandGrowthReportSummary(headers: HeadersMap) {
    const auth = await this.requireAuth(headers);
    const brandId = await this.requireCurrentBrandId(auth);
    await this.authService.assertBrandPermission(brandId, "brandGrowth.report.growthReport", "view", auth);

    const workspace = await this.reportsService.getGrowthReportWorkspace(brandId);
    const latestReport = workspace.latest;
    const latestTask = workspace.latestTask;

    if (!latestReport) {
      return this.buildSummaryResponse({
        title: "品牌增长报告最新摘要",
        summary: latestTask
          ? `当前品牌最近一次品牌增长报告任务状态为 ${this.formatTaskStatus(latestTask.taskStatus)}，暂未生成可读报告。`
          : "当前品牌还没有品牌增长报告。",
        highlights: latestTask
          ? [
              `最近任务：${latestTask.taskTitle}`,
              `任务状态：${this.formatTaskStatus(latestTask.taskStatus)}`,
              `历史报告数：${workspace.history.length}`,
            ]
          : ["历史报告数：0", "建议先发起一次品牌增长报告"],
        data: {
          historyCount: workspace.history.length,
          latestTask: latestTask
            ? {
                id: latestTask.id,
                taskType: latestTask.taskType,
                taskTitle: latestTask.taskTitle,
                taskStatus: latestTask.taskStatus,
                createdAt: latestTask.createdAt,
                updatedAt: latestTask.updatedAt,
              }
            : undefined,
          report: undefined,
        },
        links: [{ label: "打开完整报告", url: "/brand-growth/reports" }],
      });
    }

    return this.buildSummaryResponse({
      title: "品牌增长报告最新摘要",
      summary: latestReport.summary || `最近一份品牌增长报告为“${latestReport.title}”。`,
      highlights: [
        `生成时间：${latestReport.generatedAt}`,
        `分析覆盖：商品 ${latestReport.metrics.productCount} / 品牌内容 ${latestReport.metrics.brandNoteCount} / 竞品内容 ${latestReport.metrics.benchmarkNoteCount}`,
        latestReport.opportunities[0] ? `优先机会：${latestReport.opportunities[0]}` : "已生成可读摘要",
      ],
      data: {
        historyCount: workspace.history.length,
        report: {
          id: latestReport.id,
          title: latestReport.title,
          summary: latestReport.summary,
          generatedAt: latestReport.generatedAt,
          diagnosis: latestReport.diagnosis.slice(0, 3),
          opportunities: latestReport.opportunities.slice(0, 5),
          nextActions: latestReport.nextActions.slice(0, 5),
          metrics: latestReport.metrics,
        },
        latestTask: latestTask
          ? {
              id: latestTask.id,
              taskType: latestTask.taskType,
              taskTitle: latestTask.taskTitle,
              taskStatus: latestTask.taskStatus,
              phaseText: latestTask.phaseText,
              createdAt: latestTask.createdAt,
              updatedAt: latestTask.updatedAt,
            }
          : undefined,
      },
      links: [{ label: "打开完整报告", url: "/brand-growth/reports" }],
    });
  }

  async createHalfYearMarketingPlan(
    headers: HeadersMap,
    options?: {
      planningYear?: string;
      focus?: string;
    },
  ) {
    const auth = await this.requireAuth(headers);
    const brandId = await this.requireCurrentBrandId(auth);
    await this.authService.assertBrandPermission(brandId, "brandGrowth.report.halfYearMarketingPlan", "edit", auth);

    const workspace = await this.reportsService.generateAnnualMarketingPlan(brandId);
    const latestTask = workspace.latestTask;

    return this.buildSummaryResponse({
      title: "半年营销规划已受理",
      summary: latestTask
        ? `已为当前品牌发起半年营销规划任务，当前状态为 ${this.formatTaskStatus(latestTask.taskStatus)}。`
        : "已为当前品牌发起半年营销规划任务。",
      highlights: [
        options?.planningYear ? `规划年份：${options.planningYear}` : "规划年份：按系统默认周期生成",
        options?.focus ? `规划重点：${options.focus}` : "规划重点：基于品牌增长报告自动推导",
      ],
      data: {
        task: latestTask
          ? {
              id: latestTask.id,
              taskType: latestTask.taskType,
              taskTitle: latestTask.taskTitle,
              taskStatus: latestTask.taskStatus,
              phaseText: latestTask.phaseText,
              createdAt: latestTask.createdAt,
            }
          : undefined,
        latestPlanId: workspace.latest?.id,
        sourceReportId: workspace.latest?.sourceReportId,
      },
      links: [{ label: "打开半年营销规划", url: "/brand-growth/half-year-marketing-plan" }],
    });
  }

  async createKnowledgeBase(
    headers: HeadersMap,
    options?: {
      name?: string;
      description?: string;
    },
  ) {
    const auth = await this.requireAuth(headers);
    const brandId = await this.requireCurrentBrandId(auth);
    await this.authService.assertBrandPermission(brandId, "brandGrowth.library.businessAssets", "edit", auth);

    const normalizedName = String(options?.name || "").trim() || "品牌知识库";
    const knowledgeBases = await this.brandsService.createBusinessKnowledgeBase(brandId, {
      name: normalizedName,
      description: String(options?.description || "").trim() || undefined,
    });
    const createdKnowledgeBase =
      [...knowledgeBases]
        .filter((item) => item.name === normalizedName)
        .sort((left, right) => this.getTimestamp(right.updatedAt) - this.getTimestamp(left.updatedAt))[0]
      ?? this.pickLatestKnowledgeBase(knowledgeBases);

    return this.buildSummaryResponse({
      title: "知识库已创建",
      summary: createdKnowledgeBase
        ? `已为当前品牌创建知识库“${createdKnowledgeBase.name}”。`
        : `已为当前品牌创建知识库“${normalizedName}”。`,
      highlights: [
        `知识库总数：${knowledgeBases.length}`,
        createdKnowledgeBase?.description ? `说明：${createdKnowledgeBase.description}` : "说明：未填写",
      ],
      data: {
        knowledgeBase: createdKnowledgeBase
          ? {
              id: createdKnowledgeBase.id,
              name: createdKnowledgeBase.name,
              description: createdKnowledgeBase.description,
              syncStatus: createdKnowledgeBase.syncStatus,
              documentCount: createdKnowledgeBase.documentCount,
              chunkCount: createdKnowledgeBase.chunkCount,
              updatedAt: createdKnowledgeBase.updatedAt,
            }
          : undefined,
        total: knowledgeBases.length,
      },
      links: [{ label: "打开知识库", url: "/brand-growth/business-assets" }],
    });
  }

  async uploadKnowledgeBaseFiles(
    headers: HeadersMap,
    options?: {
      knowledgeBaseId?: string;
      knowledgeBaseName?: string;
      items?: Array<{
        title?: string;
        description?: string;
        sourceName?: string;
        fileUrl?: string;
        priority?: number;
      }>;
    },
  ) {
    const auth = await this.requireAuth(headers);
    const brandId = await this.requireCurrentBrandId(auth);
    await this.authService.assertBrandPermission(brandId, "brandGrowth.library.businessAssets", "edit", auth);

    const knowledgeBases = await this.brandsService.listBusinessKnowledgeBases(brandId);
    const targetKnowledgeBase = this.resolveKnowledgeBaseTarget(
      knowledgeBases,
      options?.knowledgeBaseId,
      options?.knowledgeBaseName,
    );
    const normalizedItems = (options?.items ?? [])
      .map((item) => {
        const fileUrl = String(item.fileUrl || "").trim();
        if (!fileUrl) {
          return undefined;
        }
        const title = String(item.title || "").trim() || this.deriveKnowledgeFileTitle(fileUrl);
        return {
          title,
          description: String(item.description || "").trim() || undefined,
          sourceName: String(item.sourceName || "").trim() || undefined,
          fileUrl,
          priority: Number.isFinite(item.priority) ? Number(item.priority) : undefined,
        };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item));

    if (!normalizedItems.length) {
      throw new BadRequestException("请至少提供一份可上传的资料链接");
    }

    const beforeFiles = await this.brandsService.listBusinessKnowledgeBaseFiles(brandId, targetKnowledgeBase.id);
    const beforeFileIds = new Set(beforeFiles.map((item) => item.id));
    const files = await this.brandsService.createBusinessKnowledgeBaseFiles(brandId, targetKnowledgeBase.id, {
      items: normalizedItems,
    });
    const createdFiles = files.filter((item) => !beforeFileIds.has(item.id));
    const returnedFiles = createdFiles.length ? createdFiles : files.slice(0, normalizedItems.length);

    return this.buildSummaryResponse({
      title: "知识资料上传已受理",
      summary: `已向知识库“${targetKnowledgeBase.name}”提交 ${normalizedItems.length} 份资料。`,
      highlights: [
        `目标知识库：${targetKnowledgeBase.name}`,
        `本次资料数：${normalizedItems.length}`,
        returnedFiles.length ? `资料标题：${returnedFiles.map((item) => item.title).slice(0, 3).join("、")}` : "资料已提交，等待处理",
      ],
      data: {
        knowledgeBase: {
          id: targetKnowledgeBase.id,
          name: targetKnowledgeBase.name,
        },
        counts: {
          uploaded: normalizedItems.length,
          created: createdFiles.length,
          total: files.length,
        },
        items: returnedFiles.slice(0, 10).map((item) => ({
          id: item.id,
          title: item.title,
          sourceName: item.sourceName,
          fileUrl: item.fileUrl,
          status: item.status,
          chunkCount: item.chunkCount,
          uploadedAt: item.uploadedAt,
        })),
      },
      links: [{ label: "打开知识库", url: "/brand-growth/business-assets" }],
    });
  }

  async createXiaohongshuOriginalNote(
    headers: HeadersMap,
    options?: {
      calendarItemId?: string;
      customTopicName?: string;
      topic?: string;
      accountRole?: string;
      imageCount?: number;
      includeMarketingPlan?: boolean;
      additionalInstruction?: string;
      styleHint?: string;
      productId?: string;
    },
  ) {
    const auth = await this.requireAuth(headers);
    const brandId = await this.requireCurrentBrandId(auth);
    const access = await this.authService.assertBrandPermission(brandId, "xiaohongshu.original", "edit", auth);

    const result = await this.worksService.generateXiaohongshuOriginalNote(
      brandId,
      {
        calendarItemId: String(options?.calendarItemId || "").trim() || undefined,
        customTopicName: String(options?.customTopicName || options?.topic || "").trim() || "品牌内容创作",
        productId: options?.productId,
        accountRole: this.normalizeOriginalAccountRole(options?.accountRole),
        imageCount: this.normalizeImageCount(options?.imageCount),
        additionalInstruction: String(options?.additionalInstruction || options?.styleHint || "").trim() || undefined,
        includeMarketingPlan: typeof options?.includeMarketingPlan === "boolean" ? options.includeMarketingPlan : false,
      },
      auth,
      access.role,
    ) as Record<string, unknown>;

    return this.buildSummaryResponse({
      title: "小红书原创图文任务已受理",
      summary: "已为当前品牌发起小红书原创图文任务。",
      highlights: [
        options?.calendarItemId
          ? `营销日历选题：${options.calendarItemId}`
          : `自定义选题：${String(options?.customTopicName || options?.topic || "").trim() || "品牌内容创作"}`,
        options?.productId ? `产品：${options.productId}` : "产品：未指定",
        options?.accountRole ? `账号人设：${options.accountRole}` : "账号人设：系统默认",
        options?.additionalInstruction || options?.styleHint
          ? `补充要求：${String(options?.additionalInstruction || options?.styleHint || "").trim()}`
          : "补充要求：使用系统默认策略",
      ],
      data: {
        taskId: this.readStringField(result, "taskId")
          || this.readNestedStringField(result, ["task", "id"])
          || this.readNestedStringField(result, ["item", "taskId"]),
        workId: this.readNestedStringField(result, ["item", "id"]),
        result,
      },
      links: [{ label: "打开作品结果", url: "/xiaohongshu" }],
    });
  }

  async createXiaohongshuRewriteNote(
    headers: HeadersMap,
    options?: {
      sourceMaterialId?: string;
      productId?: string;
      accountRole?: string;
      includeMarketingPlan?: boolean;
      additionalInstruction?: string;
    },
  ) {
    const auth = await this.requireAuth(headers);
    const brandId = await this.requireCurrentBrandId(auth);
    const access = await this.authService.assertBrandPermission(brandId, "xiaohongshu.remix", "edit", auth);

    const sourceMaterialId = String(options?.sourceMaterialId || "").trim();
    if (!sourceMaterialId) {
      throw new BadRequestException("请提供 sourceMaterialId");
    }

    const result = await this.worksService.generateXiaohongshuRewriteNote(
      brandId,
      {
        sourceMaterialId,
        productId: options?.productId,
        accountRole: this.normalizeOriginalAccountRole(options?.accountRole),
        includeMarketingPlan: typeof options?.includeMarketingPlan === "boolean" ? options.includeMarketingPlan : false,
        additionalInstruction: String(options?.additionalInstruction || "").trim() || undefined,
      },
      auth,
      access.role,
    ) as Record<string, unknown>;

    return this.buildSummaryResponse({
      title: "小红书二创图文任务已受理",
      summary: "已为当前品牌发起小红书二创图文任务。",
      highlights: [
        `素材：${sourceMaterialId}`,
        options?.productId ? `产品：${options.productId}` : "产品：未指定",
        options?.accountRole ? `账号人设：${options.accountRole}` : "账号人设：系统默认",
      ],
      data: {
        taskId: this.readStringField(result, "taskId")
          || this.readNestedStringField(result, ["task", "id"])
          || this.readNestedStringField(result, ["item", "taskId"]),
        workId: this.readNestedStringField(result, ["item", "id"]),
        result,
      },
      links: [{ label: "打开作品结果", url: "/xiaohongshu" }],
    });
  }

  async createWechatArticle(
    headers: HeadersMap,
    options?: {
      title?: string;
      summary?: string;
      content?: string;
      author?: string;
      styleHint?: string;
    },
  ) {
    const auth = await this.requireAuth(headers);
    const brandId = await this.requireCurrentBrandId(auth);
    await this.authService.assertBrandPermission(brandId, "wechat.original", "edit", auth);

    const title = String(options?.title || "").trim() || "公众号文章草稿";
    const summary = String(options?.summary || "").trim() || "围绕品牌当前重点生成公众号文章摘要。";
    const content = [String(options?.content || "").trim(), String(options?.styleHint || "").trim()]
      .filter(Boolean)
      .join("\n\n") || "请围绕品牌当前重点生成公众号文章内容。";

    const result = await this.worksService.generateWechatArticleDraft(
      brandId,
      {
        title,
        summary,
        author: String(options?.author || "").trim() || undefined,
        content,
      },
      auth,
    ) as Record<string, unknown>;

    return this.buildSummaryResponse({
      title: "公众号文章任务已受理",
      summary: `已为当前品牌发起公众号文章生成任务，标题为“${title}”。`,
      highlights: [
        `标题：${title}`,
        options?.styleHint ? `补充要求：${options.styleHint}` : "补充要求：使用系统默认策略",
      ],
      data: {
        draftId: this.readStringField(result, "id"),
        taskId: this.readStringField(result, "taskId"),
        result,
      },
      links: [{ label: "打开公众号结果", url: "/wechat" }],
    });
  }

  async handleMcpRpcRequest(headers: HeadersMap, message?: Record<string, unknown>) {
    const method = String(message?.method || "").trim();
    const id = message?.id;
    if (!method) {
      return this.buildJsonRpcError(id, -32600, "Invalid Request");
    }

    if (method === "notifications/initialized") {
      return {};
    }

    if (method === "initialize") {
      return this.buildJsonRpcResult(id, {
        protocolVersion: "2024-11-05",
        capabilities: {
          tools: {},
        },
        serverInfo: OPENCLAW_MCP_SERVER_INFO,
      });
    }

    if (method === "ping") {
      return this.buildJsonRpcResult(id, {});
    }

    if (method === "tools/list") {
      return this.buildJsonRpcResult(id, {
        tools: OPENCLAW_MCP_TOOLS,
      });
    }

    if (method === "tools/call") {
      const params = (message?.params && typeof message.params === "object" && !Array.isArray(message.params))
        ? message.params as Record<string, unknown>
        : {};
      const toolName = String(params.name || "").trim();
      const toolArgs = this.readToolArguments(params.arguments ?? params.args);
      if (!toolName) {
        return this.buildToolErrorResult(id, "缺少工具名称");
      }
      try {
        const payload = await this.handleToolCall(headers, toolName, toolArgs);
        return this.buildJsonRpcResult(id, {
          content: [
            {
              type: "text",
              text: JSON.stringify(payload, null, 2),
            },
          ],
          isError: false,
        });
      } catch (error) {
        const details = error && typeof error === "object"
          ? {
              message: error instanceof Error ? error.message : String(error),
            }
          : undefined;
        return this.buildToolErrorResult(id, error instanceof Error ? error.message : "工具调用失败", details);
      }
    }

    return this.buildJsonRpcError(id, -32601, `Method not found: ${method}`);
  }

  private async requireAuth(headers: HeadersMap): Promise<RequestAuthContext> {
    const installAuth = await this.openClawInstallationService.resolveInstallToken(headers);
    const auth = installAuth ?? await this.authService.resolveRequestAuthContext(headers);
    if (!auth?.userId) {
      throw new UnauthorizedException("请先登录");
    }
    return auth;
  }

  private async requireCurrentBrandId(auth: RequestAuthContext) {
    if (auth.brandId) {
      return auth.brandId;
    }
    const brands = await this.authService.getBrands(auth);
    if (!brands.currentBrandId) {
      throw new UnauthorizedException("当前账号没有可用品牌");
    }
    return brands.currentBrandId;
  }

  private normalizeTimeRange(timeRange?: string) {
    const normalized = String(timeRange || "7d").trim().toLowerCase();
    const mapping: Record<string, number> = {
      "7d": 7,
      "14d": 14,
      "30d": 30,
      "90d": 90,
    };
    const days = mapping[normalized] ?? 7;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    return {
      raw: normalized,
      label: `${days} 天`,
      since,
    };
  }

  private normalizeLimit(limit?: number) {
    if (!Number.isFinite(limit) || Number(limit) <= 0) {
      return 10;
    }
    return Math.min(50, Math.floor(Number(limit)));
  }

  private normalizePlatformType(platform?: string) {
    const normalized = String(platform || "").trim().toUpperCase();
    if (normalized === "XIAOHONGSHU" || normalized === "DOUYIN" || normalized === "VIDEO_CHANNEL" || normalized === "WECHAT_OA") {
      return normalized;
    }
    return undefined;
  }

  private normalizeDesignModule(module?: string): "image" | "html" | "deck" | "video" | undefined {
    const normalized = String(module || "").trim().toLowerCase();
    if (normalized === "image" || normalized === "html" || normalized === "deck" || normalized === "video") {
      return normalized;
    }
    return undefined;
  }

  private normalizeDouyinOriginalCopyType(value?: string) {
    const normalized = String(value || "").trim().toUpperCase();
    if (
      normalized === "VIEWPOINT"
      || normalized === "STORY"
      || normalized === "PROCESS"
      || normalized === "KNOWLEDGE"
      || normalized === "PLOT_SALES"
      || normalized === "SEEDING"
      || normalized === "LOCAL_SALES"
    ) {
      return normalized as "VIEWPOINT" | "STORY" | "PROCESS" | "KNOWLEDGE" | "PLOT_SALES" | "SEEDING" | "LOCAL_SALES";
    }
    return undefined;
  }

  private normalizeOriginalAccountRole(value?: string): "BRAND" | "STAFF" | "TALENT" | undefined {
    const normalized = String(value || "").trim().toUpperCase();
    if (normalized === "BRAND" || normalized === "STAFF" || normalized === "TALENT") {
      return normalized;
    }
    return undefined;
  }

  private normalizeImageCount(value?: number) {
    if (!Number.isFinite(value)) {
      return undefined;
    }
    return Math.min(Math.max(Math.floor(Number(value)), 2), 10);
  }

  private filterTasks(tasks: TaskRecord[], brandId: string, timeRange?: string, taskTypes?: string[]) {
    const { since } = this.normalizeTimeRange(timeRange);
    const normalizedTaskTypes = new Set((taskTypes ?? []).map((item) => item.trim()).filter(Boolean));
    return tasks.filter((item) => {
      if (item.brandId !== brandId) {
        return false;
      }
      if (new Date(item.createdAt).getTime() < since.getTime()) {
        return false;
      }
      if (normalizedTaskTypes.size && !normalizedTaskTypes.has(item.taskType)) {
        return false;
      }
      return true;
    });
  }

  private buildTopCounts(items: string[], limit: number) {
    const counter = new Map<string, number>();
    for (const item of items.map((value) => value.trim()).filter(Boolean)) {
      counter.set(item, (counter.get(item) ?? 0) + 1);
    }
    return [...counter.entries()]
      .sort((left, right) => right[1] - left[1])
      .slice(0, limit)
      .map(([label, count]) => ({ label, count }));
  }

  private normalizeFailureReason(errorMessage?: string) {
    const message = String(errorMessage || "").trim();
    if (!message) {
      return "未记录失败原因";
    }
    if (/timeout|超时/i.test(message)) {
      return "执行超时";
    }
    if (/权限|unauthorized|forbidden/i.test(message)) {
      return "权限不足";
    }
    if (/上传|文件|资料/i.test(message)) {
      return "资料或文件处理异常";
    }
    if (/image|图片|封面|配图/i.test(message)) {
      return "图片生成异常";
    }
    if (/publish|发布|公众号/i.test(message)) {
      return "发布链路异常";
    }
    return message.length > 32 ? `${message.slice(0, 32)}...` : message;
  }

  private isAfterTimeRange(value: string, since: Date) {
    const timestamp = new Date(value).getTime();
    if (!Number.isFinite(timestamp)) {
      return false;
    }
    return timestamp >= since.getTime();
  }

  private buildSummaryResponse<TData>(payload: {
    title: string;
    summary: string;
    highlights: string[];
    data: TData;
    links: Array<{ label: string; url: string }>;
    resultStatus?: OpenClawResultStatus;
    resourceKind?: string;
    nextActions?: OpenClawNextAction[];
  }): OpenClawSummaryResponse<TData> {
    const entry = payload.links[0];
    const resource = this.buildResourceReference(payload.resourceKind, payload.data, entry?.url);
    const resultStatus = payload.resultStatus || this.inferResultStatus(payload.title, payload.summary, payload.highlights);
    const nextActions = payload.nextActions || this.buildNextActions(resultStatus, entry, resource);
    return {
      status: "success",
      title: payload.title,
      summary: payload.summary,
      highlights: payload.highlights,
      data: payload.data,
      links: payload.links,
      entry,
      resultStatus,
      resource,
      nextActions,
      allowed: true,
      requiresConfirmation: resultStatus === "ACTION_REQUIRED",
    };
  }

  private inferResultStatus(title: string, summary: string, highlights: string[]): OpenClawResultStatus {
    const text = [title, summary, ...highlights].join(" ").trim();
    if (/还未具备|未具备|缺少|请先|确认未完成|待确认|未完成/.test(text)) {
      return "ACTION_REQUIRED";
    }
    if (/已受理|已提交|排队|处理中|运行中|重新放回排队|重新排队|已提交发布/.test(text)) {
      return "IN_PROGRESS";
    }
    return "COMPLETED";
  }

  private buildResourceReference<TData>(
    resourceKind: string | undefined,
    data: TData,
    entryUrl?: string,
  ) {
    const relatedIds = this.collectCandidateIds(data);
    const primaryId = relatedIds[0];
    return {
      kind: resourceKind || this.inferResourceKind(entryUrl),
      primaryId,
      relatedIds,
    };
  }

  private inferResourceKind(entryUrl?: string) {
    const url = String(entryUrl || "").trim().toLowerCase();
    if (!url) {
      return "generic";
    }
    if (url.includes("/wechat")) {
      return "wechat";
    }
    if (url.includes("/xiaohongshu")) {
      return "xiaohongshu";
    }
    if (url.includes("/douyin")) {
      return "douyin";
    }
    if (url.includes("/personal-center/works")) {
      return "design_work";
    }
    if (url.includes("/brand-growth/business-assets")) {
      return "knowledge_base";
    }
    if (url.includes("/brand-growth/reports")) {
      return "report";
    }
    if (url.includes("/brand-growth/tasks")) {
      return "task";
    }
    if (url.includes("/skills")) {
      return "skill";
    }
    return "generic";
  }

  private buildNextActions(
    resultStatus: OpenClawResultStatus,
    entry: { label: string; url: string } | undefined,
    resource?: { kind: string; primaryId?: string; relatedIds: string[] },
  ): OpenClawNextAction[] {
    const actions: OpenClawNextAction[] = [];
    if (entry) {
      actions.push({
        label: entry.label,
        action: "open_page",
        target: entry.url,
      });
    }

    if (resultStatus === "IN_PROGRESS" && resource?.primaryId) {
      actions.push({
        label: "继续查看状态",
        action: "check_status",
        target: resource.primaryId,
      });
    }

    if (resultStatus === "ACTION_REQUIRED") {
      actions.push({
        label: "继续补充信息",
        action: "continue_in_chat",
        target: resource?.primaryId,
      });
      actions.push({
        label: "确认后再执行",
        action: "confirm",
        target: resource?.primaryId,
      });
    }

    if (resultStatus === "COMPLETED" && resource?.primaryId) {
      actions.push({
        label: "需要时可重试或继续",
        action: "retry",
        target: resource.primaryId,
      });
    }

    return actions;
  }

  private collectCandidateIds(value: unknown): string[] {
    const candidates = [
      this.readCandidateId(value, ["taskId"]),
      this.readCandidateId(value, ["workId"]),
      this.readCandidateId(value, ["draftId"]),
      this.readCandidateId(value, ["workflowId"]),
      this.readCandidateId(value, ["historyId"]),
      this.readCandidateId(value, ["reportId"]),
      this.readCandidateId(value, ["knowledgeBaseId"]),
      this.readCandidateId(value, ["item", "id"]),
      this.readCandidateId(value, ["task", "id"]),
      this.readCandidateId(value, ["item", "taskId"]),
      this.readCandidateId(value, ["latestTask", "id"]),
      this.readCandidateId(value, ["latest", "id"]),
      this.readCandidateId(value, ["id"]),
    ].filter((item): item is string => Boolean(item));
    return Array.from(new Set(candidates));
  }

  private readCandidateId(value: unknown, path: string[]): string | undefined {
    let current: unknown = value;
    for (const segment of path) {
      if (!current || typeof current !== "object" || Array.isArray(current)) {
        return undefined;
      }
      current = (current as Record<string, unknown>)[segment];
    }
    const normalized = String(current || "").trim();
    return normalized || undefined;
  }

  private async loadTasks(auth: RequestAuthContext): Promise<TaskRecord[]> {
    return (await this.tasksService.listTasks(auth)) as unknown as TaskRecord[];
  }

  private async findTaskById(auth: RequestAuthContext, taskId: string) {
    const tasks = await this.loadTasks(auth);
    const task = tasks.find((item) => item.id === taskId);
    if (!task) {
      throw new BadRequestException("未找到指定任务，或当前账号无权访问该任务");
    }
    return task;
  }

  private pickLatestKnowledgeBase(knowledgeBases: BrandBusinessKnowledgeBaseRecord[]) {
    return [...knowledgeBases].sort((left, right) => this.getTimestamp(right.updatedAt) - this.getTimestamp(left.updatedAt))[0];
  }

  private resolveKnowledgeBaseTarget(
    knowledgeBases: BrandBusinessKnowledgeBaseRecord[],
    knowledgeBaseId?: string,
    knowledgeBaseName?: string,
  ) {
    if (!knowledgeBases.length) {
      throw new BadRequestException("当前品牌下还没有知识库，请先创建知识库");
    }

    const normalizedId = String(knowledgeBaseId || "").trim();
    if (normalizedId) {
      const matchedById = knowledgeBases.find((item) => item.id === normalizedId);
      if (!matchedById) {
        throw new BadRequestException("未找到指定的知识库");
      }
      return matchedById;
    }

    const normalizedName = String(knowledgeBaseName || "").trim().toLowerCase();
    if (normalizedName) {
      const matchedByName = knowledgeBases.find((item) => item.name.trim().toLowerCase() === normalizedName);
      if (!matchedByName) {
        throw new BadRequestException("未找到指定名称的知识库");
      }
      return matchedByName;
    }

    if (knowledgeBases.length === 1) {
      return knowledgeBases[0];
    }

    throw new BadRequestException("当前品牌存在多个知识库，请补充 knowledgeBaseId 或 knowledgeBaseName");
  }

  private deriveKnowledgeFileTitle(fileUrl: string) {
    const normalizedUrl = String(fileUrl || "").trim();
    const fileName = normalizedUrl.split("?")[0]?.split("/").filter(Boolean).pop() || "";
    return fileName || "未命名资料";
  }

  private getTimestamp(value?: string) {
    const timestamp = new Date(String(value || "")).getTime();
    return Number.isFinite(timestamp) ? timestamp : 0;
  }

  private matchesSkillKey(
    skill: Awaited<ReturnType<UserSkillsService["listUserSkills"]>>[number],
    skillKey: string,
  ) {
    const candidates = [
      skill.id,
      skill.baseSkill.id,
      skill.baseSkill.slug,
      skill.baseSkill.name,
      skill.effectiveSkill.name,
    ];
    return candidates.some((item) => String(item || "").trim().toLowerCase() === skillKey);
  }

  private formatTaskStatus(status?: string) {
    switch (String(status || "").toUpperCase()) {
      case "QUEUED":
        return "排队中";
      case "RUNNING":
        return "执行中";
      case "SUCCESS":
        return "已完成";
      case "FAILED":
        return "失败";
      case "CANCELLED":
        return "已取消";
      default:
        return status || "未知";
    }
  }

  private readStringField(record: Record<string, unknown>, key: string) {
    const value = record[key];
    return typeof value === "string" ? value : undefined;
  }

  private readNestedStringField(record: Record<string, unknown>, path: string[]) {
    let current: unknown = record;
    for (const key of path) {
      if (!current || typeof current !== "object" || Array.isArray(current)) {
        return undefined;
      }
      current = (current as Record<string, unknown>)[key];
    }
    return typeof current === "string" ? current : undefined;
  }

  private async assertXiaohongshuPublishPermission(brandId: string, workId: string, auth: RequestAuthContext) {
    const work = await this.worksService.getXiaohongshuPublishableWork(brandId, workId);
    await this.authService.assertBrandPermission(
      brandId,
      work.workKind === "REWRITE" ? "xiaohongshu.remix" : "xiaohongshu.original",
      "edit",
      auth,
    );
    return work;
  }

  private async assertDouyinPublishPermission(brandId: string, workId: string, auth: RequestAuthContext) {
    const work = await this.worksService.getDouyinPublishableWork(brandId, workId);
    const permissionKey = work.workKind === "DIGITAL_HUMAN"
      ? "douyin.digitalHuman"
      : work.workKind === "VIDEO_DIRECT"
        ? "douyin.videoDirect"
        : "douyin.video";
    await this.authService.assertBrandPermission(brandId, permissionKey, "edit", auth);
    return work;
  }

  private readToolArguments(value: unknown) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return {};
    }
    return value as Record<string, unknown>;
  }

  private async handleToolCall(headers: HeadersMap, toolName: string, toolArgs: Record<string, unknown>) {
    switch (toolName) {
      case "get_current_brand_context":
        return this.getCurrentBrandContext(headers);
      case "get_task_detail":
        return this.getTaskDetail(headers, {
          taskId: typeof toolArgs.taskId === "string" ? toolArgs.taskId : undefined,
        });
      case "cancel_task":
        return this.cancelTask(headers, {
          taskId: typeof toolArgs.taskId === "string" ? toolArgs.taskId : undefined,
        });
      case "retry_task":
        return this.retryTask(headers, {
          taskId: typeof toolArgs.taskId === "string" ? toolArgs.taskId : undefined,
        });
      case "get_brand_products":
        return this.getBrandProducts(headers, {
          limit: typeof toolArgs.limit === "number" ? toolArgs.limit : undefined,
        });
      case "get_platform_accounts":
        return this.getPlatformAccounts(headers, {
          platform: typeof toolArgs.platform === "string" ? toolArgs.platform : undefined,
          limit: typeof toolArgs.limit === "number" ? toolArgs.limit : undefined,
        });
      case "get_recent_tasks_summary":
        return this.getRecentTasksSummary(headers, {
          timeRange: typeof toolArgs.timeRange === "string" ? toolArgs.timeRange : undefined,
          taskTypes: Array.isArray(toolArgs.taskTypes)
            ? toolArgs.taskTypes.map((item) => String(item || "").trim()).filter(Boolean)
            : undefined,
        });
      case "get_failed_tasks_summary":
        return this.getFailedTasksSummary(headers, {
          timeRange: typeof toolArgs.timeRange === "string" ? toolArgs.timeRange : undefined,
          taskTypes: Array.isArray(toolArgs.taskTypes)
            ? toolArgs.taskTypes.map((item) => String(item || "").trim()).filter(Boolean)
            : undefined,
        });
      case "get_recent_knowledge_files":
        return this.getRecentKnowledgeFiles(headers, {
          timeRange: typeof toolArgs.timeRange === "string" ? toolArgs.timeRange : undefined,
          knowledgeBaseId: typeof toolArgs.knowledgeBaseId === "string" ? toolArgs.knowledgeBaseId : undefined,
          limit: typeof toolArgs.limit === "number" ? toolArgs.limit : undefined,
        });
      case "get_skill_config_summary":
        return this.getSkillConfigSummary(headers, {
          skillKey: typeof toolArgs.skillKey === "string" ? toolArgs.skillKey : undefined,
        });
      case "get_wechat_article_drafts":
        return this.getWechatArticleDrafts(headers, {
          limit: typeof toolArgs.limit === "number" ? toolArgs.limit : undefined,
        });
      case "get_wechat_official_accounts":
        return this.getWechatOfficialAccounts(headers);
      case "get_wechat_workflow_sessions":
        return this.getWechatWorkflowSessions(headers, {
          limit: typeof toolArgs.limit === "number" ? toolArgs.limit : undefined,
        });
      case "get_wechat_publish_history":
        return this.getWechatPublishHistory(headers, {
          limit: typeof toolArgs.limit === "number" ? toolArgs.limit : undefined,
        });
      case "get_wechat_workflow_preferences":
        return this.getWechatWorkflowPreferences(headers);
      case "get_wechat_workflow_session_detail":
        return this.getWechatWorkflowSessionDetail(headers, {
          workflowId: typeof toolArgs.workflowId === "string" ? toolArgs.workflowId : undefined,
        });
      case "check_wechat_workflow_publish_readiness":
        return this.checkWechatWorkflowPublishReadiness(headers, {
          workflowId: typeof toolArgs.workflowId === "string" ? toolArgs.workflowId : undefined,
        });
      case "get_wechat_publish_history_detail":
        return this.getWechatPublishHistoryDetail(headers, {
          historyId: typeof toolArgs.historyId === "string" ? toolArgs.historyId : undefined,
        });
      case "publish_wechat_article":
        return this.publishWechatArticle(headers, {
          draftId: typeof toolArgs.draftId === "string" ? toolArgs.draftId : undefined,
        });
      case "create_xiaohongshu_mobile_draft_session":
        return this.createXiaohongshuMobileDraftSession(headers, {
          workId: typeof toolArgs.workId === "string" ? toolArgs.workId : undefined,
          accountId: typeof toolArgs.accountId === "string" ? toolArgs.accountId : undefined,
        });
      case "create_xiaohongshu_desktop_draft_session":
        return this.createXiaohongshuDesktopDraftSession(headers, {
          workId: typeof toolArgs.workId === "string" ? toolArgs.workId : undefined,
          accountId: typeof toolArgs.accountId === "string" ? toolArgs.accountId : undefined,
        });
      case "create_douyin_mobile_publish_session":
        return this.createDouyinMobilePublishSession(headers, {
          workId: typeof toolArgs.workId === "string" ? toolArgs.workId : undefined,
          accountId: typeof toolArgs.accountId === "string" ? toolArgs.accountId : undefined,
        });
      case "create_douyin_desktop_publish_session":
        return this.createDouyinDesktopPublishSession(headers, {
          workId: typeof toolArgs.workId === "string" ? toolArgs.workId : undefined,
          accountId: typeof toolArgs.accountId === "string" ? toolArgs.accountId : undefined,
        });
      case "publish_wechat_workflow":
        return this.publishWechatWorkflow(headers, {
          workflowId: typeof toolArgs.workflowId === "string" ? toolArgs.workflowId : undefined,
        });
      case "retry_wechat_publish_history":
        return this.retryWechatPublishHistory(headers, {
          historyId: typeof toolArgs.historyId === "string" ? toolArgs.historyId : undefined,
        });
      case "get_design_workspace_options":
        return this.getDesignWorkspaceOptions(headers);
      case "get_recent_design_works":
        return this.getRecentDesignWorks(headers, {
          limit: typeof toolArgs.limit === "number" ? toolArgs.limit : undefined,
        });
      case "create_design_work":
        return this.createDesignWork(headers, {
          module: typeof toolArgs.module === "string" ? toolArgs.module : undefined,
          designType: typeof toolArgs.designType === "string" ? toolArgs.designType : undefined,
          title: typeof toolArgs.title === "string" ? toolArgs.title : undefined,
          calendarItemId: typeof toolArgs.calendarItemId === "string" ? toolArgs.calendarItemId : undefined,
          productId: typeof toolArgs.productId === "string" ? toolArgs.productId : undefined,
          injectBrandProfile: typeof toolArgs.injectBrandProfile === "boolean" ? toolArgs.injectBrandProfile : undefined,
          modelSelection: typeof toolArgs.modelSelection === "string" ? toolArgs.modelSelection : undefined,
          spec: typeof toolArgs.spec === "string" ? toolArgs.spec : undefined,
          additionalInstruction: typeof toolArgs.additionalInstruction === "string" ? toolArgs.additionalInstruction : undefined,
        });
      case "get_douyin_original_copy_options":
        return this.getDouyinOriginalCopyOptions(headers);
      case "get_recent_douyin_original_copies":
        return this.getRecentDouyinOriginalCopies(headers, {
          limit: typeof toolArgs.limit === "number" ? toolArgs.limit : undefined,
        });
      case "create_douyin_original_copy":
        return this.createDouyinOriginalCopy(headers, {
          copyType: typeof toolArgs.copyType === "string" ? toolArgs.copyType : undefined,
          topicId: typeof toolArgs.topicId === "string" ? toolArgs.topicId : undefined,
          calendarItemId: typeof toolArgs.calendarItemId === "string" ? toolArgs.calendarItemId : undefined,
          injectMarketingPlan: typeof toolArgs.injectMarketingPlan === "boolean" ? toolArgs.injectMarketingPlan : undefined,
          userRequirement: typeof toolArgs.userRequirement === "string" ? toolArgs.userRequirement : undefined,
        });
      case "get_douyin_remix_copy_options":
        return this.getDouyinRemixCopyOptions(headers);
      case "get_recent_douyin_remix_copies":
        return this.getRecentDouyinRemixCopies(headers, {
          limit: typeof toolArgs.limit === "number" ? toolArgs.limit : undefined,
        });
      case "create_douyin_remix_copy":
        return this.createDouyinRemixCopy(headers, {
          materialId: typeof toolArgs.materialId === "string" ? toolArgs.materialId : undefined,
          injectBrandProfile: typeof toolArgs.injectBrandProfile === "boolean" ? toolArgs.injectBrandProfile : undefined,
          productId: typeof toolArgs.productId === "string" ? toolArgs.productId : undefined,
          injectMarketingPlan: typeof toolArgs.injectMarketingPlan === "boolean" ? toolArgs.injectMarketingPlan : undefined,
          userRequirement: typeof toolArgs.userRequirement === "string" ? toolArgs.userRequirement : undefined,
        });
      case "get_xiaohongshu_marketing_calendar_options":
        return this.getXiaohongshuMarketingCalendarOptions(headers, {
          limit: typeof toolArgs.limit === "number" ? toolArgs.limit : undefined,
        });
      case "get_xiaohongshu_material_library_items":
        return this.getXiaohongshuMaterialLibraryItems(headers, {
          limit: typeof toolArgs.limit === "number" ? toolArgs.limit : undefined,
        });
      case "get_xiaohongshu_original_reference_templates":
        return this.getXiaohongshuOriginalReferenceTemplates(headers, {
          categoryId: typeof toolArgs.categoryId === "string" ? toolArgs.categoryId : undefined,
          limit: typeof toolArgs.limit === "number" ? toolArgs.limit : undefined,
        });
      case "get_recent_xiaohongshu_original_works":
        return this.getRecentXiaohongshuOriginalWorks(headers, {
          limit: typeof toolArgs.limit === "number" ? toolArgs.limit : undefined,
        });
      case "get_latest_brand_growth_report_summary":
        return this.getLatestBrandGrowthReportSummary(headers);
      case "create_brand_growth_report":
        return this.createBrandGrowthReport(headers, {
          goal: typeof toolArgs.goal === "string" ? toolArgs.goal : undefined,
          timeRange: typeof toolArgs.timeRange === "string" ? toolArgs.timeRange : undefined,
        });
      case "create_half_year_marketing_plan":
        return this.createHalfYearMarketingPlan(headers, {
          planningYear: typeof toolArgs.planningYear === "string" ? toolArgs.planningYear : undefined,
          focus: typeof toolArgs.focus === "string" ? toolArgs.focus : undefined,
        });
      case "create_knowledge_base":
        return this.createKnowledgeBase(headers, {
          name: typeof toolArgs.name === "string" ? toolArgs.name : undefined,
          description: typeof toolArgs.description === "string" ? toolArgs.description : undefined,
        });
      case "upload_knowledge_base_files":
        return this.uploadKnowledgeBaseFiles(headers, {
          knowledgeBaseId: typeof toolArgs.knowledgeBaseId === "string" ? toolArgs.knowledgeBaseId : undefined,
          knowledgeBaseName: typeof toolArgs.knowledgeBaseName === "string" ? toolArgs.knowledgeBaseName : undefined,
          items: Array.isArray(toolArgs.items)
            ? toolArgs.items.map((item) => {
                const record = item && typeof item === "object" && !Array.isArray(item)
                  ? item as Record<string, unknown>
                  : {};
                return {
                  title: typeof record.title === "string" ? record.title : undefined,
                  description: typeof record.description === "string" ? record.description : undefined,
                  sourceName: typeof record.sourceName === "string" ? record.sourceName : undefined,
                  fileUrl: typeof record.fileUrl === "string" ? record.fileUrl : undefined,
                  priority: typeof record.priority === "number" ? record.priority : undefined,
                };
              })
            : undefined,
        });
      case "create_xiaohongshu_original_note":
        return this.createXiaohongshuOriginalNote(headers, {
          calendarItemId: typeof toolArgs.calendarItemId === "string" ? toolArgs.calendarItemId : undefined,
          customTopicName: typeof toolArgs.customTopicName === "string" ? toolArgs.customTopicName : undefined,
          topic: typeof toolArgs.topic === "string" ? toolArgs.topic : undefined,
          accountRole: typeof toolArgs.accountRole === "string" ? toolArgs.accountRole : undefined,
          imageCount: typeof toolArgs.imageCount === "number" ? toolArgs.imageCount : undefined,
          includeMarketingPlan: typeof toolArgs.includeMarketingPlan === "boolean" ? toolArgs.includeMarketingPlan : undefined,
          additionalInstruction: typeof toolArgs.additionalInstruction === "string" ? toolArgs.additionalInstruction : undefined,
          styleHint: typeof toolArgs.styleHint === "string" ? toolArgs.styleHint : undefined,
          productId: typeof toolArgs.productId === "string" ? toolArgs.productId : undefined,
        });
      case "create_xiaohongshu_rewrite_note":
        return this.createXiaohongshuRewriteNote(headers, {
          sourceMaterialId: typeof toolArgs.sourceMaterialId === "string" ? toolArgs.sourceMaterialId : undefined,
          productId: typeof toolArgs.productId === "string" ? toolArgs.productId : undefined,
          accountRole: typeof toolArgs.accountRole === "string" ? toolArgs.accountRole : undefined,
          includeMarketingPlan: typeof toolArgs.includeMarketingPlan === "boolean" ? toolArgs.includeMarketingPlan : undefined,
          additionalInstruction: typeof toolArgs.additionalInstruction === "string" ? toolArgs.additionalInstruction : undefined,
        });
      case "create_wechat_article":
        return this.createWechatArticle(headers, {
          title: typeof toolArgs.title === "string" ? toolArgs.title : undefined,
          summary: typeof toolArgs.summary === "string" ? toolArgs.summary : undefined,
          content: typeof toolArgs.content === "string" ? toolArgs.content : undefined,
          author: typeof toolArgs.author === "string" ? toolArgs.author : undefined,
          styleHint: typeof toolArgs.styleHint === "string" ? toolArgs.styleHint : undefined,
        });
      default:
        throw new BadRequestException(`未知工具：${toolName}`);
    }
  }

  private buildJsonRpcResult(id: unknown, result: Record<string, unknown>) {
    return {
      jsonrpc: "2.0",
      id: id ?? null,
      result,
    };
  }

  private buildJsonRpcError(id: unknown, code: number, message: string, data?: unknown) {
    return {
      jsonrpc: "2.0",
      id: id ?? null,
      error: {
        code,
        message,
        ...(data === undefined ? {} : { data }),
      },
    };
  }

  private buildToolErrorResult(id: unknown, message: string, details?: unknown) {
    return this.buildJsonRpcResult(id, {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            status: "error",
            message,
            ...(details === undefined ? {} : { details }),
          }, null, 2),
        },
      ],
      isError: true,
    });
  }
}
