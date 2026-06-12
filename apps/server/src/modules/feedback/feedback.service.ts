import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { createId, database } from "../../common/mock-data";
import { PrismaService } from "../../prisma/prisma.service";
import { AuthService, type RequestAuthContext } from "../auth/auth.service";

export type SubmitTaskFeedbackPayload = {
  rating: string;
  adopted?: boolean | null;
  comment?: string | null;
  feedbackTags?: string[];
  editedOutput?: Record<string, unknown> | null;
  workId?: string | null;
  skillId?: string | null;
  promptId?: string | null;
  promptVersion?: string | null;
};

export type FeedbackSummaryOptions = {
  timeRange?: string;
  skillId?: string;
  promptId?: string;
  limit?: number;
};

export type FeedbackAnalysisOptions = FeedbackSummaryOptions;

type FeedbackRecord = {
  id: string;
  userId: string;
  brandId?: string;
  taskId?: string;
  workId?: string;
  skillId?: string;
  promptId?: string;
  promptVersion?: string;
  rating: string;
  adopted?: boolean;
  feedbackTags: string[];
  comment?: string;
  editedOutput?: Record<string, unknown>;
  taskType?: string;
  taskTitle?: string;
  promptName?: string;
  modelName?: string;
  source: string;
  createdAt: string;
  updatedAt: string;
};

const mockFeedbackRecords: FeedbackRecord[] = [];

@Injectable()
export class FeedbackService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly authService: AuthService,
  ) {}

  async submitTaskFeedback(taskId: string, payload: SubmitTaskFeedbackPayload, auth?: RequestAuthContext) {
    const normalizedTaskId = String(taskId || "").trim();
    if (!normalizedTaskId) {
      throw new BadRequestException("请提供 taskId");
    }

    const userId = this.requireUserId(auth);
    const normalizedPayload = this.normalizeFeedbackPayload(payload);
    if (!normalizedPayload.rating) {
      throw new BadRequestException("请提供 rating");
    }

    const task = await this.findTaskOrThrow(normalizedTaskId);
    await this.assertTaskFeedbackAccess(task, auth);

    if (await this.prismaService.canUseDatabase()) {
      const record = await this.prismaService.aiResultFeedback.create({
        data: {
          userId,
          brandId: task.brandId ?? auth?.brandId ?? null,
          taskId: task.id,
          workId: normalizedPayload.workId,
          skillId: normalizedPayload.skillId,
          promptId: normalizedPayload.promptId,
          promptVersion: normalizedPayload.promptVersion,
          rating: normalizedPayload.rating,
          adopted: normalizedPayload.adopted,
          feedbackTagsJson: normalizedPayload.feedbackTags,
          comment: normalizedPayload.comment,
          editedOutputJson: normalizedPayload.editedOutput
            ? normalizedPayload.editedOutput as Prisma.InputJsonValue
            : Prisma.JsonNull,
          taskType: task.taskType,
          taskTitle: task.taskTitle,
          promptName: task.promptName,
          modelName: task.modelName,
          source: "USER",
        },
      });
      return this.toFeedbackRecord(record);
    }

    const now = new Date().toISOString();
    const record: FeedbackRecord = {
      id: createId("fbk"),
      userId,
      brandId: task.brandId ?? auth?.brandId ?? undefined,
      taskId: task.id,
      workId: normalizedPayload.workId ?? undefined,
      skillId: normalizedPayload.skillId ?? undefined,
      promptId: normalizedPayload.promptId ?? undefined,
      promptVersion: normalizedPayload.promptVersion ?? undefined,
      rating: normalizedPayload.rating,
      adopted: normalizedPayload.adopted ?? undefined,
      feedbackTags: normalizedPayload.feedbackTags,
      comment: normalizedPayload.comment ?? undefined,
      editedOutput: normalizedPayload.editedOutput ?? undefined,
      taskType: task.taskType,
      taskTitle: task.taskTitle ?? undefined,
      promptName: task.promptName ?? undefined,
      modelName: task.modelName ?? undefined,
      source: "USER",
      createdAt: now,
      updatedAt: now,
    };
    mockFeedbackRecords.unshift(record);
    return record;
  }

  async getFeedbackSummary(auth?: RequestAuthContext, options?: FeedbackSummaryOptions) {
    const userId = this.requireUserId(auth);
    const scopedBrandId = auth?.brandId ? String(auth.brandId).trim() : "";
    if (!scopedBrandId) {
      throw new BadRequestException("请先切换到目标品牌后再查看反馈摘要");
    }
    await this.authService.assertBrandAccess(scopedBrandId, auth);

    const since = this.resolveSinceDate(options?.timeRange);
    const normalizedSkillId = this.normalizeOptionalString(options?.skillId);
    const normalizedPromptId = this.normalizeOptionalString(options?.promptId);
    const limit = this.normalizeLimit(options?.limit);

    const items = await this.listFeedbackRecords({
      userId,
      brandId: scopedBrandId,
      since,
      skillId: normalizedSkillId ?? undefined,
      promptId: normalizedPromptId ?? undefined,
      limit,
    });

    const counts = {
      total: items.length,
      positive: items.filter((item) => item.rating === "positive").length,
      neutral: items.filter((item) => item.rating === "neutral").length,
      negative: items.filter((item) => item.rating === "negative").length,
      adopted: items.filter((item) => item.adopted === true).length,
    };
    const tagMap = new Map<string, number>();
    items.forEach((item) => {
      item.feedbackTags.forEach((tag) => {
        tagMap.set(tag, (tagMap.get(tag) || 0) + 1);
      });
    });
    const topTags = Array.from(tagMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([tag, count]) => ({ tag, count }));

    return {
      brandId: scopedBrandId,
      timeRange: options?.timeRange || "30d",
      filters: {
        skillId: normalizedSkillId ?? undefined,
        promptId: normalizedPromptId ?? undefined,
      },
      counts,
      topTags,
      items: items.slice(0, limit),
    };
  }

  async getFeedbackAnalysis(auth?: RequestAuthContext, options?: FeedbackAnalysisOptions) {
    const summary = await this.getFeedbackSummary(auth, {
      timeRange: options?.timeRange,
      skillId: options?.skillId,
      promptId: options?.promptId,
      limit: Math.max(options?.limit || 20, 20),
    });
    const negativeItems = summary.items.filter((item) => item.rating === "negative");
    const neutralItems = summary.items.filter((item) => item.rating === "neutral");
    const issuePatterns = this.buildIssuePatterns(negativeItems, neutralItems);
    const taskTypeMap = new Map<string, number>();
    negativeItems.forEach((item) => {
      const taskType = String(item.taskType || "").trim();
      if (taskType) {
        taskTypeMap.set(taskType, (taskTypeMap.get(taskType) || 0) + 1);
      }
    });
    const topNegativeTaskTypes = Array.from(taskTypeMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([taskType, count]) => ({ taskType, count }));

    return {
      ...summary,
      issuePatterns,
      topNegativeTaskTypes,
      recentNegativeItems: negativeItems.slice(0, 10).map((item) => ({
        id: item.id,
        taskId: item.taskId,
        taskTitle: item.taskTitle,
        taskType: item.taskType,
        promptId: item.promptId,
        promptVersion: item.promptVersion,
        comment: item.comment,
        feedbackTags: item.feedbackTags,
        createdAt: item.createdAt,
      })),
    };
  }

  async getPromptOptimizationSuggestions(auth?: RequestAuthContext, options?: FeedbackAnalysisOptions) {
    const analysis = await this.getFeedbackAnalysis(auth, {
      timeRange: options?.timeRange,
      skillId: options?.skillId,
      promptId: options?.promptId,
      limit: Math.max(options?.limit || 20, 20),
    });
    const suggestions = analysis.issuePatterns
      .slice(0, 5)
      .map((pattern, index) => this.buildOptimizationSuggestion(pattern, index + 1));

    if (!suggestions.length && analysis.counts.total) {
      suggestions.push({
        priority: "P2",
        title: "补充反馈样本后再优化提示词",
        reason: "当前已有反馈，但负向或中性问题样本不足，建议继续收集带标签和备注的反馈。",
        actions: [
          "要求在提交反馈时补充具体问题标签",
          "保留人工修改后的结果，便于后续对比",
          "优先绑定 skillId 和 promptId，避免优化目标过宽",
        ],
        sampleComments: [],
        sampleTaskTitles: [],
      });
    }

    return {
      brandId: analysis.brandId,
      timeRange: analysis.timeRange,
      filters: analysis.filters,
      counts: analysis.counts,
      issuePatterns: analysis.issuePatterns,
      suggestions,
    };
  }

  private async listFeedbackRecords(options: {
    userId: string;
    brandId: string;
    since: Date;
    skillId?: string;
    promptId?: string;
    limit: number;
  }) {
    if (await this.prismaService.canUseDatabase()) {
      const rows = await this.prismaService.aiResultFeedback.findMany({
        where: {
          brandId: options.brandId,
          createdAt: { gte: options.since },
          ...(options.skillId ? { skillId: options.skillId } : {}),
          ...(options.promptId ? { promptId: options.promptId } : {}),
        },
        orderBy: { createdAt: "desc" },
        take: Math.max(options.limit, 100),
      });
      return rows.map((item) => this.toFeedbackRecord(item));
    }

    return mockFeedbackRecords
      .filter((item) =>
        item.brandId === options.brandId
        && new Date(item.createdAt).getTime() >= options.since.getTime()
        && (!options.skillId || item.skillId === options.skillId)
        && (!options.promptId || item.promptId === options.promptId))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, Math.max(options.limit, 100));
  }

  private async findTaskOrThrow(taskId: string) {
    if (await this.prismaService.canUseDatabase()) {
      const task = await this.prismaService.task.findUnique({
        where: { id: taskId },
      });
      if (!task) {
        throw new NotFoundException("任务不存在");
      }
      return task;
    }

    const task = database.tasks.find((item) => item.id === taskId);
    if (!task) {
      throw new NotFoundException("任务不存在");
    }
    return {
      ...task,
      brandId: task.brandId ?? null,
      taskTitle: task.taskTitle ?? null,
      promptName: (task as { promptName?: string | null }).promptName ?? null,
      modelName: task.modelName ?? null,
    };
  }

  private async assertTaskFeedbackAccess(
    task: {
      userId: string;
      brandId?: string | null;
    },
    auth?: RequestAuthContext,
  ) {
    if (!auth?.userId) {
      throw new UnauthorizedException("请先登录");
    }
    if (task.brandId) {
      await this.authService.assertBrandAccess(task.brandId, auth);
      return;
    }
    if (task.userId !== auth.userId) {
      throw new UnauthorizedException("当前用户无权对该任务提交反馈");
    }
  }

  private normalizeFeedbackPayload(payload: SubmitTaskFeedbackPayload) {
    const normalizedRating = this.normalizeRating(payload.rating);
    return {
      rating: normalizedRating,
      adopted: typeof payload.adopted === "boolean" ? payload.adopted : null,
      comment: this.normalizeOptionalString(payload.comment),
      feedbackTags: (payload.feedbackTags || []).map((item) => String(item || "").trim()).filter(Boolean),
      editedOutput: payload.editedOutput && typeof payload.editedOutput === "object" && !Array.isArray(payload.editedOutput)
        ? payload.editedOutput
        : null,
      workId: this.normalizeOptionalString(payload.workId),
      skillId: this.normalizeOptionalString(payload.skillId),
      promptId: this.normalizeOptionalString(payload.promptId),
      promptVersion: this.normalizeOptionalString(payload.promptVersion),
    };
  }

  private buildIssuePatterns(negativeItems: FeedbackRecord[], neutralItems: FeedbackRecord[]) {
    const scopedItems = [...negativeItems, ...neutralItems];
    const issueMap = new Map<string, { tag: string; count: number; sampleComments: string[]; sampleTaskTitles: string[] }>();

    scopedItems.forEach((item) => {
      const tags = item.feedbackTags.length ? item.feedbackTags : ["未分类问题"];
      tags.forEach((tag) => {
        const normalizedTag = String(tag || "").trim();
        if (!normalizedTag) {
          return;
        }
        const existing = issueMap.get(normalizedTag) || {
          tag: normalizedTag,
          count: 0,
          sampleComments: [],
          sampleTaskTitles: [],
        };
        existing.count += 1;
        if (item.comment && existing.sampleComments.length < 3 && !existing.sampleComments.includes(item.comment)) {
          existing.sampleComments.push(item.comment);
        }
        if (item.taskTitle && existing.sampleTaskTitles.length < 3 && !existing.sampleTaskTitles.includes(item.taskTitle)) {
          existing.sampleTaskTitles.push(item.taskTitle);
        }
        issueMap.set(normalizedTag, existing);
      });
    });

    return Array.from(issueMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 8)
      .map((item) => ({
        tag: item.tag,
        count: item.count,
        focus: this.inferOptimizationFocus(item.tag),
        sampleComments: item.sampleComments,
        sampleTaskTitles: item.sampleTaskTitles,
      }));
  }

  private buildOptimizationSuggestion(
    pattern: {
      tag: string;
      count: number;
      focus: string;
      sampleComments: string[];
      sampleTaskTitles: string[];
    },
    rank: number,
  ) {
    return {
      priority: rank <= 2 ? "P1" : "P2",
      title: `围绕“${pattern.tag}”优化提示词`,
      reason: `最近该问题出现 ${pattern.count} 次，优化重点建议放在：${pattern.focus}。`,
      actions: this.buildOptimizationActions(pattern.tag),
      sampleComments: pattern.sampleComments,
      sampleTaskTitles: pattern.sampleTaskTitles,
    };
  }

  private inferOptimizationFocus(tag: string) {
    const normalized = String(tag || "").trim().toLowerCase();
    if (/(事实|错误|不准|偏差|幻觉|不准确)/.test(normalized)) {
      return "加强事实约束、来源引用和禁止臆测规则";
    }
    if (/(风格|品牌|调性|口吻|语气)/.test(normalized)) {
      return "加强品牌语气、禁用表达和风格示例";
    }
    if (/(结构|逻辑|层次|顺序)/.test(normalized)) {
      return "加强输出结构模板与段落顺序要求";
    }
    if (/(长度|太长|太短|啰嗦|精简)/.test(normalized)) {
      return "补充长度上下限和压缩规则";
    }
    if (/(重复|同质|没有新意|普通)/.test(normalized)) {
      return "加强差异化约束、角度限制和反重复要求";
    }
    return "结合问题标签补充更清晰的约束条件、样例和禁用规则";
  }

  private buildOptimizationActions(tag: string) {
    const normalized = String(tag || "").trim().toLowerCase();
    if (/(事实|错误|不准|偏差|幻觉|不准确)/.test(normalized)) {
      return [
        "在提示词中增加“不得臆测、信息不足时明确说明”的硬性约束",
        "要求输出前先校验关键事实、产品信息和品牌数据",
        "对高风险字段增加引用品牌档案或任务输入的要求",
      ];
    }
    if (/(风格|品牌|调性|口吻|语气)/.test(normalized)) {
      return [
        "在提示词中补充品牌语气、禁用词和示例表达",
        "要求先复述品牌定位，再执行正文生成",
        "把品牌差异点写成固定检查项，生成后逐项自检",
      ];
    }
    if (/(结构|逻辑|层次|顺序)/.test(normalized)) {
      return [
        "在提示词中指定输出结构和段落顺序",
        "补充每段的目标与字数范围",
        "增加“生成后自查逻辑是否完整”的步骤",
      ];
    }
    if (/(长度|太长|太短|啰嗦|精简)/.test(normalized)) {
      return [
        "增加正文、标题、摘要的长度范围约束",
        "要求删除无信息密度的套话和重复表述",
        "在生成结束后增加篇幅自检步骤",
      ];
    }
    if (/(重复|同质|没有新意|普通)/.test(normalized)) {
      return [
        "要求至少提供一个差异化切入角度",
        "加入“避免套模板句式”的反重复约束",
        "补充竞品区隔或平台风格化要求",
      ];
    }
    return [
      "把该问题标签写入提示词的显式检查项",
      "为该问题补充一组正反示例",
      "要求生成后按问题标签进行一次自检",
    ];
  }

  private normalizeRating(value: string) {
    const normalized = String(value || "").trim().toLowerCase();
    if (normalized === "positive" || normalized === "neutral" || normalized === "negative") {
      return normalized;
    }
    throw new BadRequestException("rating 仅支持 positive、neutral、negative");
  }

  private normalizeOptionalString(value: unknown) {
    if (typeof value !== "string") {
      return null;
    }
    const normalized = value.trim();
    return normalized || null;
  }

  private normalizeLimit(value?: number) {
    if (!Number.isFinite(value)) {
      return 20;
    }
    return Math.min(Math.max(Math.trunc(value as number), 1), 50);
  }

  private resolveSinceDate(timeRange?: string) {
    const normalized = String(timeRange || "30d").trim().toLowerCase();
    const matched = normalized.match(/^(\d+)\s*d$/);
    const days = matched ? Number(matched[1]) : 30;
    const safeDays = Number.isFinite(days) && days > 0 ? Math.min(days, 365) : 30;
    return new Date(Date.now() - safeDays * 24 * 60 * 60 * 1000);
  }

  private requireUserId(auth?: RequestAuthContext) {
    if (!auth?.userId) {
      throw new UnauthorizedException("请先登录");
    }
    return auth.userId;
  }

  private toFeedbackRecord(item: {
    id: string;
    userId: string;
    brandId: string | null;
    taskId: string | null;
    workId: string | null;
    skillId: string | null;
    promptId: string | null;
    promptVersion: string | null;
    rating: string;
    adopted: boolean | null;
    feedbackTagsJson: unknown;
    comment: string | null;
    editedOutputJson: unknown;
    taskType: string | null;
    taskTitle: string | null;
    promptName: string | null;
    modelName: string | null;
    source: string;
    createdAt: Date;
    updatedAt: Date;
  }): FeedbackRecord {
    return {
      id: item.id,
      userId: item.userId,
      brandId: item.brandId ?? undefined,
      taskId: item.taskId ?? undefined,
      workId: item.workId ?? undefined,
      skillId: item.skillId ?? undefined,
      promptId: item.promptId ?? undefined,
      promptVersion: item.promptVersion ?? undefined,
      rating: item.rating,
      adopted: item.adopted ?? undefined,
      feedbackTags: Array.isArray(item.feedbackTagsJson)
        ? item.feedbackTagsJson.map((tag) => String(tag || "").trim()).filter(Boolean)
        : [],
      comment: item.comment ?? undefined,
      editedOutput: item.editedOutputJson && typeof item.editedOutputJson === "object" && !Array.isArray(item.editedOutputJson)
        ? item.editedOutputJson as Record<string, unknown>
        : undefined,
      taskType: item.taskType ?? undefined,
      taskTitle: item.taskTitle ?? undefined,
      promptName: item.promptName ?? undefined,
      modelName: item.modelName ?? undefined,
      source: item.source,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    };
  }
}
