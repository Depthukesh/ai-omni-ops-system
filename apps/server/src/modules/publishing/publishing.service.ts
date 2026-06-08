import { BadRequestException, Inject, Injectable, NotFoundException, ServiceUnavailableException } from "@nestjs/common";
import { TaskStatus, type Prisma } from "@prisma/client";
import { createId, database } from "../../common/mock-data";
import { AppConfigService } from "../../config/app-config.service";
import { PrismaService } from "../../prisma/prisma.service";
import { BrandsService } from "../brands/brands.service";
import { WorksService, type DouyinPublishableWorkRecord, type XiaohongshuPublishableWorkRecord } from "../works/works.service";

const DRAFT_SESSION_EXPIRE_MS = 24 * 60 * 60 * 1000;
const MOBILE_DRAFT_TASK_TYPE = "XHS_PUBLISH_MOBILE_DRAFT";
const DESKTOP_DRAFT_TASK_TYPE = "XHS_PUBLISH_DESKTOP_DRAFT";
const DOUYIN_MOBILE_PUBLISH_TASK_TYPE = "DOUYIN_PUBLISH_MOBILE_HANDOFF";
const DOUYIN_DESKTOP_PUBLISH_TASK_TYPE = "DOUYIN_PUBLISH_DESKTOP_AUTOFILL";

export type CreateMobileDraftSessionPayload = {
  accountId?: string;
};

export type CompleteMobileDraftSessionPayload = {
  result?: "SUCCESS" | "FAILED";
  note?: string;
};

export type PublishWechatArticlePayload = {
  mode?: "PUBLISH_ARTICLE";
};

export type PublishWechatWorkflowPayload = {
  mode?: "PUBLISH_WORKFLOW";
};

export type RetryWechatWorkflowPublishPayload = {
  mode?: "RETRY_PUBLISH_WORKFLOW";
};

type BaseDraftTaskInput = {
  sessionToken: string;
  platform: "XIAOHONGSHU";
  mode: "SAVE_DRAFT";
  workId: string;
  workKind: XiaohongshuPublishableWorkRecord["workKind"];
  noteCategory: XiaohongshuPublishableWorkRecord["noteCategory"];
  noteType: XiaohongshuPublishableWorkRecord["noteType"];
  accountId?: string;
  accountName?: string;
  accountLink?: string;
  title: string;
  content: string;
  imageUrls: string[];
  coverImageUrl?: string;
  hashtags: string[];
  sourceLabel: string;
  createdAt: string;
  expiresAt: string;
};

type MobileDraftTaskInput = BaseDraftTaskInput & {
  channel: "MOBILE_QR";
};

type DesktopDraftTaskInput = BaseDraftTaskInput & {
  channel: "BROWSER_EXTENSION";
};

type DouyinMobilePublishTaskInput = {
  sessionToken: string;
  channel: "MOBILE_QR";
  platform: "DOUYIN";
  mode: "PUBLISH_VIDEO";
  workId: string;
  workKind: DouyinPublishableWorkRecord["workKind"];
  accountId?: string;
  accountName?: string;
  accountLink?: string;
  title: string;
  content: string;
  videoUrl: string;
  coverImageUrl?: string;
  hashtags: string[];
  sourceLabel: string;
  createdAt: string;
  expiresAt: string;
};

type DouyinDesktopPublishTaskInput = {
  sessionToken: string;
  channel: "BROWSER_EXTENSION";
  platform: "DOUYIN";
  mode: "PREPARE_PUBLISH";
  workId: string;
  workKind: DouyinPublishableWorkRecord["workKind"];
  accountId?: string;
  accountName?: string;
  accountLink?: string;
  title: string;
  content: string;
  videoUrl: string;
  coverImageUrl?: string;
  hashtags: string[];
  sourceLabel: string;
  createdAt: string;
  expiresAt: string;
};

type DraftTaskOutput = {
  status: "QUEUED" | "SUCCESS" | "FAILED";
  completedAt?: string;
  note?: string;
};

@Injectable()
export class PublishingService {
  constructor(
    @Inject(AppConfigService)
    private readonly appConfigService: AppConfigService,
    @Inject(PrismaService)
    private readonly prismaService: PrismaService,
    @Inject(BrandsService)
    private readonly brandsService: BrandsService,
    @Inject(WorksService)
    private readonly worksService: WorksService,
  ) {}

  async createXiaohongshuMobileDraftSession(brandId: string, workId: string, payload: CreateMobileDraftSessionPayload) {
    const work = await this.worksService.getXiaohongshuPublishableWork(brandId, workId);
    await this.assertDraftImagesAccessible(work);
    const archive = await this.brandsService.getArchive(brandId);
    const xhsAccounts = archive.platformAccounts.filter((item) => item.platform === "XIAOHONGSHU");
    const selectedAccount = payload.accountId
      ? xhsAccounts.find((item) => item.id === payload.accountId)
      : xhsAccounts[0];

    const sessionToken = createSessionToken();
    const createdAt = new Date();
    const expiresAt = new Date(createdAt.getTime() + DRAFT_SESSION_EXPIRE_MS);
    const taskTitle = `手机扫码接力保存小红书草稿：${work.title}`;
    const inputJson: MobileDraftTaskInput = {
      sessionToken,
      channel: "MOBILE_QR",
      platform: "XIAOHONGSHU",
      mode: "SAVE_DRAFT",
      workId: work.id,
      workKind: work.workKind,
      noteCategory: work.noteCategory,
      noteType: work.noteType,
      accountId: selectedAccount?.id,
      accountName: selectedAccount?.accountName || undefined,
      accountLink: selectedAccount?.accountLink,
      title: work.title,
      content: work.content,
      imageUrls: work.allImageUrls,
      coverImageUrl: work.coverImageUrl,
      hashtags: work.hashtags,
      sourceLabel: work.sourceLabel,
      createdAt: createdAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
    };

    const task = await this.createDraftTask({
      brandId,
      userId: await this.getBrandOwnerUserId(brandId),
      taskTitle,
      taskType: MOBILE_DRAFT_TASK_TYPE,
      inputJson,
    });

    return {
      task: this.mapTaskSummary(task),
      session: this.buildMobileSessionResponse(task.id, inputJson, "QUEUED"),
    };
  }

  async createXiaohongshuDesktopDraftSession(brandId: string, workId: string, payload: CreateMobileDraftSessionPayload) {
    const work = await this.worksService.getXiaohongshuPublishableWork(brandId, workId);
    await this.assertDraftImagesAccessible(work);
    const archive = await this.brandsService.getArchive(brandId);
    const xhsAccounts = archive.platformAccounts.filter((item) => item.platform === "XIAOHONGSHU");
    const selectedAccount = payload.accountId
      ? xhsAccounts.find((item) => item.id === payload.accountId)
      : xhsAccounts[0];

    const sessionToken = createSessionToken();
    const createdAt = new Date();
    const expiresAt = new Date(createdAt.getTime() + DRAFT_SESSION_EXPIRE_MS);
    const taskTitle = `电脑端一键保存小红书草稿：${work.title}`;
    const inputJson: DesktopDraftTaskInput = {
      sessionToken,
      channel: "BROWSER_EXTENSION",
      platform: "XIAOHONGSHU",
      mode: "SAVE_DRAFT",
      workId: work.id,
      workKind: work.workKind,
      noteCategory: work.noteCategory,
      noteType: work.noteType,
      accountId: selectedAccount?.id,
      accountName: selectedAccount?.accountName || undefined,
      accountLink: selectedAccount?.accountLink,
      title: work.title,
      content: work.content,
      imageUrls: work.allImageUrls,
      coverImageUrl: work.coverImageUrl,
      hashtags: work.hashtags,
      sourceLabel: work.sourceLabel,
      createdAt: createdAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
    };

    const task = await this.createDraftTask({
      brandId,
      userId: await this.getBrandOwnerUserId(brandId),
      taskTitle,
      taskType: DESKTOP_DRAFT_TASK_TYPE,
      inputJson,
    });

    return {
      task: this.mapTaskSummary(task),
      session: this.buildDesktopSessionResponse(task.id, inputJson, "QUEUED"),
    };
  }

  async createDouyinMobilePublishSession(brandId: string, workId: string, payload: CreateMobileDraftSessionPayload) {
    const work = await this.worksService.getDouyinPublishableWork(brandId, workId);
    await this.assertDouyinVideoAccessible(work);
    const archive = await this.brandsService.getArchive(brandId);
    const douyinAccounts = archive.platformAccounts.filter((item) => item.platform === "DOUYIN");
    const selectedAccount = payload.accountId
      ? douyinAccounts.find((item) => item.id === payload.accountId)
      : douyinAccounts[0];

    const sessionToken = createSessionToken("dy_publish");
    const createdAt = new Date();
    const expiresAt = new Date(createdAt.getTime() + DRAFT_SESSION_EXPIRE_MS);
    const taskTitle = `手机接力发布抖音视频：${work.title}`;
    const inputJson: DouyinMobilePublishTaskInput = {
      sessionToken,
      channel: "MOBILE_QR",
      platform: "DOUYIN",
      mode: "PUBLISH_VIDEO",
      workId: work.id,
      workKind: work.workKind,
      accountId: selectedAccount?.id,
      accountName: selectedAccount?.accountName || undefined,
      accountLink: selectedAccount?.accountLink,
      title: work.title,
      content: work.content,
      videoUrl: work.videoUrl,
      coverImageUrl: work.coverImageUrl,
      hashtags: work.hashtags,
      sourceLabel: work.sourceLabel,
      createdAt: createdAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
    };

    const task = await this.createDraftTask({
      brandId,
      userId: await this.getBrandOwnerUserId(brandId),
      taskTitle,
      taskType: DOUYIN_MOBILE_PUBLISH_TASK_TYPE,
      inputJson,
    });

    return {
      task: this.mapTaskSummary(task),
      session: this.buildDouyinMobileSessionResponse(task.id, inputJson, "QUEUED"),
    };
  }

  async createDouyinDesktopPublishSession(brandId: string, workId: string, payload: CreateMobileDraftSessionPayload) {
    const work = await this.worksService.getDouyinPublishableWork(brandId, workId);
    await this.assertDouyinVideoAccessible(work);
    const archive = await this.brandsService.getArchive(brandId);
    const douyinAccounts = archive.platformAccounts.filter((item) => item.platform === "DOUYIN");
    const selectedAccount = payload.accountId
      ? douyinAccounts.find((item) => item.id === payload.accountId)
      : douyinAccounts[0];

    const sessionToken = createSessionToken("dy_desktop");
    const createdAt = new Date();
    const expiresAt = new Date(createdAt.getTime() + DRAFT_SESSION_EXPIRE_MS);
    const taskTitle = `电脑端辅助发布抖音视频：${work.title}`;
    const inputJson: DouyinDesktopPublishTaskInput = {
      sessionToken,
      channel: "BROWSER_EXTENSION",
      platform: "DOUYIN",
      mode: "PREPARE_PUBLISH",
      workId: work.id,
      workKind: work.workKind,
      accountId: selectedAccount?.id,
      accountName: selectedAccount?.accountName || undefined,
      accountLink: selectedAccount?.accountLink,
      title: work.title,
      content: work.content,
      videoUrl: work.videoUrl,
      coverImageUrl: work.coverImageUrl,
      hashtags: work.hashtags,
      sourceLabel: work.sourceLabel,
      createdAt: createdAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
    };

    const task = await this.createDraftTask({
      brandId,
      userId: await this.getBrandOwnerUserId(brandId),
      taskTitle,
      taskType: DOUYIN_DESKTOP_PUBLISH_TASK_TYPE,
      inputJson,
    });

    return {
      task: this.mapTaskSummary(task),
      session: this.buildDouyinDesktopSessionResponse(task.id, inputJson, "QUEUED"),
    };
  }

  async getXiaohongshuMobileDraftSession(token: string) {
    const task = await this.findDraftTaskByToken(token, MOBILE_DRAFT_TASK_TYPE);
    const inputJson = this.readMobileDraftTaskInput(task.inputJson);
    const outputJson = this.readDraftTaskOutput(task.outputJson);
    const taskStatus = mapPublishTaskStatus(task.taskStatus, outputJson?.status);
    return {
      session: this.buildMobileSessionResponse(task.id, inputJson, taskStatus, outputJson),
    };
  }

  async getXiaohongshuDesktopDraftSession(token: string) {
    const task = await this.findDraftTaskByToken(token, DESKTOP_DRAFT_TASK_TYPE);
    const inputJson = this.readDesktopDraftTaskInput(task.inputJson);
    const outputJson = this.readDraftTaskOutput(task.outputJson);
    const taskStatus = mapPublishTaskStatus(task.taskStatus, outputJson?.status);
    return {
      session: this.buildDesktopSessionResponse(task.id, inputJson, taskStatus, outputJson),
    };
  }

  async getDouyinMobilePublishSession(token: string) {
    const task = await this.findDraftTaskByToken(token, DOUYIN_MOBILE_PUBLISH_TASK_TYPE);
    const inputJson = this.readDouyinMobilePublishTaskInput(task.inputJson);
    const outputJson = this.readDraftTaskOutput(task.outputJson);
    const taskStatus = mapPublishTaskStatus(task.taskStatus, outputJson?.status);
    return {
      session: this.buildDouyinMobileSessionResponse(task.id, inputJson, taskStatus, outputJson),
    };
  }

  async getDouyinDesktopPublishSession(token: string) {
    const task = await this.findDraftTaskByToken(token, DOUYIN_DESKTOP_PUBLISH_TASK_TYPE);
    const inputJson = this.readDouyinDesktopPublishTaskInput(task.inputJson);
    const outputJson = this.readDraftTaskOutput(task.outputJson);
    const taskStatus = mapPublishTaskStatus(task.taskStatus, outputJson?.status);
    return {
      session: this.buildDouyinDesktopSessionResponse(task.id, inputJson, taskStatus, outputJson),
    };
  }

  async getMobilePublishSession(token: string) {
    const task = await this.findAnyMobileTaskByToken(token);
    const outputJson = this.readDraftTaskOutput(task.outputJson);
    const taskStatus = mapPublishTaskStatus(task.taskStatus, outputJson?.status);
    if (task.taskType === DOUYIN_MOBILE_PUBLISH_TASK_TYPE) {
      return {
        session: this.buildDouyinMobileSessionResponse(task.id, this.readDouyinMobilePublishTaskInput(task.inputJson), taskStatus, outputJson),
      };
    }
    return {
      session: this.buildMobileSessionResponse(task.id, this.readMobileDraftTaskInput(task.inputJson), taskStatus, outputJson),
    };
  }

  async completeXiaohongshuMobileDraftSession(token: string, payload: CompleteMobileDraftSessionPayload) {
    const task = await this.findDraftTaskByToken(token, MOBILE_DRAFT_TASK_TYPE);
    return this.completeDraftTask(task, payload, MOBILE_DRAFT_TASK_TYPE, (taskId, taskInput, taskStatus, outputJson) =>
      this.buildMobileSessionResponse(taskId, this.readMobileDraftTaskInput(taskInput), taskStatus, outputJson),
    );
  }

  async completeXiaohongshuDesktopDraftSession(token: string, payload: CompleteMobileDraftSessionPayload) {
    const task = await this.findDraftTaskByToken(token, DESKTOP_DRAFT_TASK_TYPE);
    return this.completeDraftTask(task, payload, DESKTOP_DRAFT_TASK_TYPE, (taskId, taskInput, taskStatus, outputJson) =>
      this.buildDesktopSessionResponse(taskId, this.readDesktopDraftTaskInput(taskInput), taskStatus, outputJson),
    );
  }

  async completeDouyinMobilePublishSession(token: string, payload: CompleteMobileDraftSessionPayload) {
    const task = await this.findDraftTaskByToken(token, DOUYIN_MOBILE_PUBLISH_TASK_TYPE);
    return this.completeDraftTask(task, payload, DOUYIN_MOBILE_PUBLISH_TASK_TYPE, (taskId, taskInput, taskStatus, outputJson) =>
      this.buildDouyinMobileSessionResponse(taskId, this.readDouyinMobilePublishTaskInput(taskInput), taskStatus, outputJson),
    );
  }

  async completeDouyinDesktopPublishSession(token: string, payload: CompleteMobileDraftSessionPayload) {
    const task = await this.findDraftTaskByToken(token, DOUYIN_DESKTOP_PUBLISH_TASK_TYPE);
    return this.completeDraftTask(task, payload, DOUYIN_DESKTOP_PUBLISH_TASK_TYPE, (taskId, taskInput, taskStatus, outputJson) =>
      this.buildDouyinDesktopSessionResponse(taskId, this.readDouyinDesktopPublishTaskInput(taskInput), taskStatus, outputJson),
    );
  }

  async completeMobilePublishSession(token: string, payload: CompleteMobileDraftSessionPayload) {
    const task = await this.findAnyMobileTaskByToken(token);
    if (task.taskType === DOUYIN_MOBILE_PUBLISH_TASK_TYPE) {
      return this.completeDraftTask(task, payload, DOUYIN_MOBILE_PUBLISH_TASK_TYPE, (taskId, taskInput, taskStatus, outputJson) =>
        this.buildDouyinMobileSessionResponse(taskId, this.readDouyinMobilePublishTaskInput(taskInput), taskStatus, outputJson),
      );
    }
    return this.completeDraftTask(task, payload, MOBILE_DRAFT_TASK_TYPE, (taskId, taskInput, taskStatus, outputJson) =>
      this.buildMobileSessionResponse(taskId, this.readMobileDraftTaskInput(taskInput), taskStatus, outputJson),
    );
  }

  async publishWechatArticleToOfficialAccount(brandId: string, draftId: string, _payload: PublishWechatArticlePayload = {}) {
    const result = await this.worksService.publishWechatArticleDraft(brandId, draftId);
    return {
      task: {
        id: result.item.publishTaskId || "",
        taskStatus: result.item.publishStatus === "PUBLISHED" ? "SUCCESS" : "FAILED",
        taskTitle: `发布公众号文章：${result.item.title}`,
      },
      item: result.item,
    };
  }

  async publishWechatWorkflowToOfficialAccount(
    brandId: string,
    workflowId: string,
    _payload: PublishWechatWorkflowPayload = {},
  ) {
    const result = await this.worksService.publishWechatWorkflow(brandId, workflowId);
    return {
      task: {
        id: result.item.publishConfig?.publishTaskId || "",
        taskStatus: result.item.status === "PUBLISHED" ? "SUCCESS" : "FAILED",
        taskTitle: `发布公众号工作流：${result.item.title}`,
      },
      item: result.item,
      draft: result.draft,
    };
  }

  async retryWechatWorkflowPublishToOfficialAccount(
    brandId: string,
    historyId: string,
    _payload: RetryWechatWorkflowPublishPayload = {},
  ) {
    const result = await this.worksService.retryWechatPublishHistoryItem(brandId, historyId);
    return {
      task: {
        id: result.item.publishConfig?.publishTaskId || "",
        taskStatus: result.item.status === "PUBLISHED" ? "SUCCESS" : "FAILED",
        taskTitle: `重试发布公众号工作流：${result.item.title}`,
      },
      item: result.item,
      draft: result.draft,
    };
  }

  private async completeDraftTask(
    task: {
      id: string;
      taskStatus: string;
      inputJson?: unknown;
      outputJson?: unknown;
    },
    payload: CompleteMobileDraftSessionPayload,
    taskType: string,
    buildSession: (
      taskId: string,
      taskInput: unknown,
      taskStatus: "QUEUED" | "SUCCESS" | "FAILED",
      outputJson?: DraftTaskOutput,
    ) => Record<string, unknown>,
  ) {
    const nextResult = payload.result === "FAILED" ? "FAILED" : "SUCCESS";
    const nextOutput: DraftTaskOutput = {
      status: nextResult,
      completedAt: new Date().toISOString(),
      note: payload.note?.trim() || undefined,
    };

    if (await this.prismaService.canUseDatabase()) {
      const updated = await this.prismaService.task.update({
        where: { id: task.id },
        data: {
          taskStatus: nextResult === "SUCCESS" ? TaskStatus.SUCCESS : TaskStatus.FAILED,
          finishedAt: new Date(),
          errorMessage: nextResult === "FAILED" ? nextOutput.note || buildDraftFailureMessage(taskType) : null,
          outputJson: nextOutput as Prisma.InputJsonValue,
        },
      });
      return {
        task: this.mapTaskSummary(updated),
        session: buildSession(updated.id, updated.inputJson, nextResult, nextOutput),
      };
    }

    const target = database.tasks.find((item) => item.id === task.id && item.taskType === taskType);
    if (!target) {
      throw new NotFoundException("发布任务不存在");
    }
    target.taskStatus = nextResult;
    target.finishedAt = nextOutput.completedAt;
    target.errorMessage = nextResult === "FAILED" ? nextOutput.note || buildDraftFailureMessage(taskType) : undefined;
    target.outputJson = nextOutput;
    target.updatedAt = new Date().toISOString();
    return {
      task: this.mapTaskSummary(target),
      session: buildSession(target.id, target.inputJson, nextResult, nextOutput),
    };
  }

  private async createDraftTask(params: {
    brandId: string;
    userId: string;
    taskTitle: string;
    taskType: string;
    inputJson: MobileDraftTaskInput | DesktopDraftTaskInput | DouyinMobilePublishTaskInput | DouyinDesktopPublishTaskInput;
  }) {
    const channel = asRecord(params.inputJson)?.channel;
    const modelName = channel === "BROWSER_EXTENSION" ? "browser-extension-autofill" : "mobile-qr-handoff";
    if (await this.prismaService.canUseDatabase()) {
      return this.prismaService.task.create({
        data: {
          userId: params.userId,
          brandId: params.brandId,
          taskType: params.taskType,
          taskTitle: params.taskTitle,
          taskStatus: TaskStatus.QUEUED,
          modelName,
          pointsCost: 0,
          inputJson: params.inputJson as Prisma.InputJsonValue,
        },
      });
    }

    const now = new Date().toISOString();
    const record = {
      id: createId("tsk"),
      userId: params.userId,
      brandId: params.brandId,
      taskType: params.taskType,
      taskTitle: params.taskTitle,
      taskStatus: "QUEUED" as const,
      modelName,
      pointsCost: 0,
      inputJson: params.inputJson,
      createdAt: now,
      updatedAt: now,
    };
    database.tasks.unshift(record);
    return record;
  }

  private async findDraftTaskByToken(token: string, taskType: string) {
    if (await this.prismaService.canUseDatabase()) {
      const candidates = await this.prismaService.task.findMany({
        where: { taskType },
        orderBy: { createdAt: "desc" },
        take: 300,
      });
      const matched = candidates.find((item) => {
        const inputJson = asRecord(item.inputJson);
        return String(inputJson?.sessionToken ?? "").trim() === token;
      });
      if (!matched) {
        throw new NotFoundException("手机接力会话不存在或已失效");
      }
      return matched;
    }

    const matched = database.tasks.find((item) => {
      if (item.taskType !== taskType) {
        return false;
      }
      const inputJson = asRecord(item.inputJson);
      return String(inputJson?.sessionToken ?? "").trim() === token;
    });
    if (!matched) {
      throw new NotFoundException("手机接力会话不存在或已失效");
    }
    return matched;
  }

  private async findAnyMobileTaskByToken(token: string) {
    const mobileTaskTypes = [DOUYIN_MOBILE_PUBLISH_TASK_TYPE, MOBILE_DRAFT_TASK_TYPE];
    if (await this.prismaService.canUseDatabase()) {
      const candidates = await this.prismaService.task.findMany({
        where: {
          taskType: {
            in: mobileTaskTypes,
          },
        },
        orderBy: { createdAt: "desc" },
        take: 400,
      });
      const matched = candidates.find((item) => {
        const inputJson = asRecord(item.inputJson);
        return String(inputJson?.sessionToken ?? "").trim() === token;
      });
      if (!matched) {
        throw new NotFoundException("手机接力会话不存在或已失效");
      }
      return matched;
    }

    const matched = database.tasks.find((item) => {
      if (!mobileTaskTypes.includes(item.taskType)) {
        return false;
      }
      const inputJson = asRecord(item.inputJson);
      return String(inputJson?.sessionToken ?? "").trim() === token;
    });
    if (!matched) {
      throw new NotFoundException("手机接力会话不存在或已失效");
    }
    return matched;
  }

  private buildMobileSessionResponse(
    taskId: string,
    inputJson: MobileDraftTaskInput,
    taskStatus: "QUEUED" | "SUCCESS" | "FAILED",
    outputJson?: DraftTaskOutput,
  ) {
    const mobileApiBaseUrl = this.resolveMobileApiBaseUrl();
    const mobileApiOrigin = mobileApiBaseUrl.replace(/\/api$/, "");
    return {
      taskId,
      token: inputJson.sessionToken,
      platform: inputJson.platform,
      mode: inputJson.mode,
      channel: inputJson.channel,
      status: taskStatus,
      title: inputJson.title,
      content: inputJson.content,
      imageUrls: inputJson.imageUrls.map((item) => this.toMobileAccessibleUrl(item, mobileApiOrigin)),
      coverImageUrl: inputJson.coverImageUrl ? this.toMobileAccessibleUrl(inputJson.coverImageUrl, mobileApiOrigin) : undefined,
      hashtags: inputJson.hashtags,
      accountId: inputJson.accountId,
      accountName: inputJson.accountName,
      accountLink: inputJson.accountLink,
      workId: inputJson.workId,
      workKind: inputJson.workKind,
      noteCategory: inputJson.noteCategory,
      noteType: inputJson.noteType,
      sourceLabel: inputJson.sourceLabel,
      createdAt: inputJson.createdAt,
      expiresAt: inputJson.expiresAt,
      apiBaseUrl: mobileApiBaseUrl,
      mobileUrl: `${this.resolveMobileWebBaseUrl()}/publish/mobile/${encodeURIComponent(inputJson.sessionToken)}?v=${encodeURIComponent(inputJson.createdAt)}`,
      openAppUrl: "xhsdiscover://",
      completedAt: outputJson?.completedAt,
      note: outputJson?.note,
      accessHint: buildAccessHint(this.resolveMobileWebBaseUrl()),
    };
  }

  private buildDouyinMobileSessionResponse(
    taskId: string,
    inputJson: DouyinMobilePublishTaskInput,
    taskStatus: "QUEUED" | "SUCCESS" | "FAILED",
    outputJson?: DraftTaskOutput,
  ) {
    const mobileApiBaseUrl = this.resolveMobileApiBaseUrl();
    const mobileApiOrigin = mobileApiBaseUrl.replace(/\/api$/, "");
    return {
      taskId,
      token: inputJson.sessionToken,
      platform: inputJson.platform,
      mode: inputJson.mode,
      channel: inputJson.channel,
      status: taskStatus,
      title: inputJson.title,
      content: inputJson.content,
      videoUrl: this.toMobileAccessibleUrl(inputJson.videoUrl, mobileApiOrigin),
      coverImageUrl: inputJson.coverImageUrl ? this.toMobileAccessibleUrl(inputJson.coverImageUrl, mobileApiOrigin) : undefined,
      hashtags: inputJson.hashtags,
      accountId: inputJson.accountId,
      accountName: inputJson.accountName,
      accountLink: inputJson.accountLink,
      workId: inputJson.workId,
      workKind: inputJson.workKind,
      sourceLabel: inputJson.sourceLabel,
      createdAt: inputJson.createdAt,
      expiresAt: inputJson.expiresAt,
      apiBaseUrl: mobileApiBaseUrl,
      mobileUrl: `${this.resolveMobileWebBaseUrl()}/publish/mobile/${encodeURIComponent(inputJson.sessionToken)}?v=${encodeURIComponent(inputJson.createdAt)}`,
      openAppUrl: "snssdk1128://feed",
      completedAt: outputJson?.completedAt,
      note: outputJson?.note,
      accessHint: buildAccessHint(this.resolveMobileWebBaseUrl()),
    };
  }

  private buildDesktopSessionResponse(
    taskId: string,
    inputJson: DesktopDraftTaskInput,
    taskStatus: "QUEUED" | "SUCCESS" | "FAILED",
    outputJson?: DraftTaskOutput,
  ) {
    return {
      taskId,
      token: inputJson.sessionToken,
      platform: inputJson.platform,
      mode: inputJson.mode,
      channel: inputJson.channel,
      status: taskStatus,
      title: inputJson.title,
      content: inputJson.content,
      imageUrls: inputJson.imageUrls,
      coverImageUrl: inputJson.coverImageUrl,
      hashtags: inputJson.hashtags,
      accountId: inputJson.accountId,
      accountName: inputJson.accountName,
      accountLink: inputJson.accountLink,
      workId: inputJson.workId,
      workKind: inputJson.workKind,
      noteCategory: inputJson.noteCategory,
      noteType: inputJson.noteType,
      sourceLabel: inputJson.sourceLabel,
      createdAt: inputJson.createdAt,
      expiresAt: inputJson.expiresAt,
      creatorUrl: "https://creator.xiaohongshu.com/publish/publish",
      launchStrategy: "BROWSER_EXTENSION_AUTOFILL",
      completedAt: outputJson?.completedAt,
      note: outputJson?.note,
      accessHint: "请先在当前浏览器安装 AI 全域运营草稿扩展，并登录小红书创作者中心。",
    };
  }

  private buildDouyinDesktopSessionResponse(
    taskId: string,
    inputJson: DouyinDesktopPublishTaskInput,
    taskStatus: "QUEUED" | "SUCCESS" | "FAILED",
    outputJson?: DraftTaskOutput,
  ) {
    return {
      taskId,
      token: inputJson.sessionToken,
      platform: inputJson.platform,
      mode: inputJson.mode,
      channel: inputJson.channel,
      status: taskStatus,
      title: inputJson.title,
      content: inputJson.content,
      videoUrl: inputJson.videoUrl,
      coverImageUrl: inputJson.coverImageUrl,
      hashtags: inputJson.hashtags,
      accountId: inputJson.accountId,
      accountName: inputJson.accountName,
      accountLink: inputJson.accountLink,
      workId: inputJson.workId,
      workKind: inputJson.workKind,
      sourceLabel: inputJson.sourceLabel,
      createdAt: inputJson.createdAt,
      expiresAt: inputJson.expiresAt,
      creatorUrl: "https://creator.douyin.com/creator-micro/content/upload?enter_from=dou_web",
      launchStrategy: "BROWSER_EXTENSION_AUTOFILL",
      completedAt: outputJson?.completedAt,
      note: outputJson?.note,
      accessHint: "请先在当前浏览器安装 AI 全域运营抖音发布扩展，并确认浏览器已登录抖音创作者中心。",
    };
  }

  private readMobileDraftTaskInput(value: unknown): MobileDraftTaskInput {
    const record = asRecord(value);
    if (!record || record.channel !== "MOBILE_QR" || record.platform !== "XIAOHONGSHU") {
      throw new BadRequestException("发布任务数据无效");
    }
    return {
      sessionToken: String(record.sessionToken ?? "").trim(),
      channel: "MOBILE_QR",
      platform: "XIAOHONGSHU",
      mode: "SAVE_DRAFT",
      workId: String(record.workId ?? "").trim(),
      workKind: record.workKind === "REWRITE" ? "REWRITE" : "ORIGINAL",
      noteCategory: record.noteCategory === "二创" ? "二创" : "原创",
      noteType: "图文",
      accountId: readOptionalString(record.accountId),
      accountName: readOptionalString(record.accountName),
      accountLink: readOptionalString(record.accountLink),
      title: String(record.title ?? "").trim(),
      content: String(record.content ?? "").trim(),
      imageUrls: normalizeStringArray(record.imageUrls, [], 12),
      coverImageUrl: readOptionalString(record.coverImageUrl),
      hashtags: normalizeStringArray(record.hashtags, [], 12),
      sourceLabel: String(record.sourceLabel ?? "").trim(),
      createdAt: readOptionalString(record.createdAt) || new Date().toISOString(),
      expiresAt: readOptionalString(record.expiresAt) || new Date(Date.now() + DRAFT_SESSION_EXPIRE_MS).toISOString(),
    };
  }

  private readDesktopDraftTaskInput(value: unknown): DesktopDraftTaskInput {
    const record = asRecord(value);
    if (!record || record.channel !== "BROWSER_EXTENSION" || record.platform !== "XIAOHONGSHU") {
      throw new BadRequestException("发布任务数据无效");
    }
    return {
      sessionToken: String(record.sessionToken ?? "").trim(),
      channel: "BROWSER_EXTENSION",
      platform: "XIAOHONGSHU",
      mode: "SAVE_DRAFT",
      workId: String(record.workId ?? "").trim(),
      workKind: record.workKind === "REWRITE" ? "REWRITE" : "ORIGINAL",
      noteCategory: record.noteCategory === "二创" ? "二创" : "原创",
      noteType: "图文",
      accountId: readOptionalString(record.accountId),
      accountName: readOptionalString(record.accountName),
      accountLink: readOptionalString(record.accountLink),
      title: String(record.title ?? "").trim(),
      content: String(record.content ?? "").trim(),
      imageUrls: normalizeStringArray(record.imageUrls, [], 12),
      coverImageUrl: readOptionalString(record.coverImageUrl),
      hashtags: normalizeStringArray(record.hashtags, [], 12),
      sourceLabel: String(record.sourceLabel ?? "").trim(),
      createdAt: readOptionalString(record.createdAt) || new Date().toISOString(),
      expiresAt: readOptionalString(record.expiresAt) || new Date(Date.now() + DRAFT_SESSION_EXPIRE_MS).toISOString(),
    };
  }

  private readDouyinMobilePublishTaskInput(value: unknown): DouyinMobilePublishTaskInput {
    const record = asRecord(value);
    if (!record || record.channel !== "MOBILE_QR" || record.platform !== "DOUYIN") {
      throw new BadRequestException("发布任务数据无效");
    }
    const videoUrl = String(record.videoUrl ?? "").trim();
    if (!videoUrl) {
      throw new BadRequestException("当前抖音发布任务缺少视频地址");
    }
    return {
      sessionToken: String(record.sessionToken ?? "").trim(),
      channel: "MOBILE_QR",
      platform: "DOUYIN",
      mode: "PUBLISH_VIDEO",
      workId: String(record.workId ?? "").trim(),
      workKind:
        record.workKind === "DIGITAL_HUMAN"
          ? "DIGITAL_HUMAN"
          : record.workKind === "VIDEO_DIRECT"
            ? "VIDEO_DIRECT"
            : "VIDEO_STORYBOARD",
      accountId: readOptionalString(record.accountId),
      accountName: readOptionalString(record.accountName),
      accountLink: readOptionalString(record.accountLink),
      title: String(record.title ?? "").trim(),
      content: String(record.content ?? "").trim(),
      videoUrl,
      coverImageUrl: readOptionalString(record.coverImageUrl),
      hashtags: normalizeStringArray(record.hashtags, [], 12),
      sourceLabel: String(record.sourceLabel ?? "").trim(),
      createdAt: readOptionalString(record.createdAt) || new Date().toISOString(),
      expiresAt: readOptionalString(record.expiresAt) || new Date(Date.now() + DRAFT_SESSION_EXPIRE_MS).toISOString(),
    };
  }

  private readDouyinDesktopPublishTaskInput(value: unknown): DouyinDesktopPublishTaskInput {
    const record = asRecord(value);
    if (!record || record.channel !== "BROWSER_EXTENSION" || record.platform !== "DOUYIN") {
      throw new BadRequestException("发布任务数据无效");
    }
    const videoUrl = String(record.videoUrl ?? "").trim();
    if (!videoUrl) {
      throw new BadRequestException("当前抖音发布任务缺少视频地址");
    }
    return {
      sessionToken: String(record.sessionToken ?? "").trim(),
      channel: "BROWSER_EXTENSION",
      platform: "DOUYIN",
      mode: "PREPARE_PUBLISH",
      workId: String(record.workId ?? "").trim(),
      workKind:
        record.workKind === "DIGITAL_HUMAN"
          ? "DIGITAL_HUMAN"
          : record.workKind === "VIDEO_DIRECT"
            ? "VIDEO_DIRECT"
            : "VIDEO_STORYBOARD",
      accountId: readOptionalString(record.accountId),
      accountName: readOptionalString(record.accountName),
      accountLink: readOptionalString(record.accountLink),
      title: String(record.title ?? "").trim(),
      content: String(record.content ?? "").trim(),
      videoUrl,
      coverImageUrl: readOptionalString(record.coverImageUrl),
      hashtags: normalizeStringArray(record.hashtags, [], 12),
      sourceLabel: String(record.sourceLabel ?? "").trim(),
      createdAt: readOptionalString(record.createdAt) || new Date().toISOString(),
      expiresAt: readOptionalString(record.expiresAt) || new Date(Date.now() + DRAFT_SESSION_EXPIRE_MS).toISOString(),
    };
  }

  private readDraftTaskOutput(value: unknown): DraftTaskOutput | undefined {
    const record = asRecord(value);
    if (!record) {
      return undefined;
    }
    const status = record.status === "FAILED" ? "FAILED" : record.status === "SUCCESS" ? "SUCCESS" : "QUEUED";
    return {
      status,
      completedAt: readOptionalString(record.completedAt),
      note: readOptionalString(record.note),
    };
  }

  private mapTaskSummary(task: {
    id: string;
    userId: string;
    brandId?: string | null;
    taskType: string;
    taskTitle?: string | null;
    taskStatus: string;
    modelName?: string | null;
    pointsCost: number;
    errorMessage?: string | null;
    startedAt?: Date | string | null;
    finishedAt?: Date | string | null;
    createdAt: Date | string;
    updatedAt: Date | string;
  }) {
    return {
      id: task.id,
      userId: task.userId,
      brandId: task.brandId ?? undefined,
      taskType: task.taskType,
      taskTitle: task.taskTitle ?? "",
      taskStatus: task.taskStatus,
      modelName: task.modelName ?? "",
      pointsCost: task.pointsCost,
      errorMessage: task.errorMessage ?? undefined,
      startedAt: normalizeDateString(task.startedAt),
      finishedAt: normalizeDateString(task.finishedAt),
      createdAt: normalizeDateString(task.createdAt) || new Date().toISOString(),
      updatedAt: normalizeDateString(task.updatedAt) || new Date().toISOString(),
    };
  }

  private async getBrandOwnerUserId(brandId: string) {
    if (await this.prismaService.canUseDatabase()) {
      const brand = await this.prismaService.brand.findUnique({
        where: { id: brandId },
        select: { ownerUserId: true },
      });
      if (!brand) {
        throw new NotFoundException("品牌不存在");
      }
      return brand.ownerUserId;
    }

    const brand = database.brands.find((item) => item.id === brandId);
    if (!brand) {
      throw new NotFoundException("品牌不存在");
    }
    return brand.ownerUserId;
  }

  private resolveMobileWebBaseUrl() {
    return this.appConfigService.getWebPublicBaseUrl();
  }

  private resolveMobileApiBaseUrl() {
    return this.appConfigService.getPublicApiBaseUrl();
  }

  private toMobileAccessibleUrl(url: string, mobileApiOrigin: string) {
    const raw = String(url || "").trim();
    if (!raw) {
      return raw;
    }

    try {
      const parsed = new URL(raw);
      if (parsed.hostname === "127.0.0.1" || parsed.hostname === "localhost") {
        const target = new URL(mobileApiOrigin);
        parsed.protocol = target.protocol;
        parsed.hostname = target.hostname;
        parsed.port = target.port;
        return parsed.toString();
      }
      return parsed.toString();
    } catch {
      return raw;
    }
  }

  private async assertDraftImagesAccessible(work: XiaohongshuPublishableWorkRecord) {
    const imageUrls = Array.isArray(work.allImageUrls) ? work.allImageUrls.filter(Boolean) : [];
    if (!imageUrls.length) {
      throw new BadRequestException("当前作品没有可发布的配图，请先重新生成图片后再发布。");
    }

    const invalidUrls: string[] = [];
    for (const url of imageUrls.slice(0, 4)) {
      const ok = await this.checkRemoteAssetAccessible(url);
      if (!ok) {
        invalidUrls.push(url);
      }
    }
    if (invalidUrls.length) {
      throw new BadRequestException("当前作品的历史配图已失效，无法一键发布。请先重新生成该作品图片，或编辑后重新创作一版。");
    }
  }

  private async checkRemoteAssetAccessible(url: string) {
    const raw = String(url || "").trim();
    if (!raw) {
      return false;
    }
    const methods: Array<"HEAD" | "GET"> = ["HEAD", "GET"];
    for (const method of methods) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 12000);
      try {
        const response = await fetch(raw, {
          method,
          signal: controller.signal,
        });
        if (response.ok) {
          return true;
        }
        if (method === "HEAD" && (response.status === 403 || response.status === 405)) {
          continue;
        }
        return false;
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          throw new ServiceUnavailableException("发布前校验配图超时，请稍后重试。");
        }
        if (method === "GET") {
          throw new ServiceUnavailableException("发布前校验配图失败，请检查网络后重试。");
        }
      } finally {
        clearTimeout(timer);
      }
    }
    return false;
  }

  private async assertDouyinVideoAccessible(work: DouyinPublishableWorkRecord) {
    const videoUrl = String(work.videoUrl || "").trim();
    if (!videoUrl) {
      throw new BadRequestException("当前作品还没有可发布的视频，请先完成视频生成后再发布。");
    }
    const videoAccessible = await this.checkRemoteAssetAccessible(videoUrl);
    if (!videoAccessible) {
      throw new BadRequestException("当前作品的视频地址已失效，暂时无法接力发布。请重新生成视频后再试。");
    }
  }
}

function createSessionToken(prefix = "xhs_draft") {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function asRecord(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function readOptionalString(value: unknown) {
  const text = String(value ?? "").trim();
  return text || undefined;
}

function normalizeStringArray(raw: unknown, fallback: string[] = [], limit = 12) {
  const values = Array.isArray(raw)
    ? raw.map((item) => String(item ?? "").trim()).filter(Boolean)
    : [];
  return (values.length ? values : fallback).slice(0, limit);
}

function normalizeDateString(value: Date | string | null | undefined) {
  if (!value) {
    return undefined;
  }
  return typeof value === "string" ? value : value.toISOString();
}

function mapPublishTaskStatus(taskStatus: string, outputStatus?: DraftTaskOutput["status"]) {
  if (outputStatus === "SUCCESS") {
    return "SUCCESS";
  }
  if (outputStatus === "FAILED") {
    return "FAILED";
  }
  if (taskStatus === "SUCCESS") {
    return "SUCCESS";
  }
  if (taskStatus === "FAILED" || taskStatus === "CANCELLED") {
    return "FAILED";
  }
  return "QUEUED";
}

function buildAccessHint(baseUrl: string) {
  if (/127\.0\.0\.1|localhost/.test(baseUrl)) {
    return "当前二维码仍指向本机地址。若要让手机扫码访问，请把 WEB_PUBLIC_BASE_URL 配成电脑的局域网地址。";
  }
  return "请确保手机和电脑在同一局域网，扫码后即可打开接力页。";
}

function buildDraftFailureMessage(taskType: string) {
  if (taskType === DESKTOP_DRAFT_TASK_TYPE) {
    return "电脑端一键发布到草稿箱失败";
  }
  if (taskType === DOUYIN_DESKTOP_PUBLISH_TASK_TYPE) {
    return "电脑端辅助发布抖音失败";
  }
  if (taskType === DOUYIN_MOBILE_PUBLISH_TASK_TYPE) {
    return "手机接力发布抖音失败";
  }
  return "手机接力保存草稿失败";
}
