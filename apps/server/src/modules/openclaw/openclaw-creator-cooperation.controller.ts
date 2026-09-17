import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Query,
  UnauthorizedException,
} from "@nestjs/common";
import { AuthService } from "../auth/auth.service";
import { OpenClawCreatorCooperationService } from "./openclaw-creator-cooperation.service";

type HeadersMap = Record<string, string | string[] | undefined>;

@Controller("openclaw/brands/:brandId/creator-cooperations")
export class OpenClawCreatorCooperationController {
  constructor(
    private readonly authService: AuthService,
    private readonly openClawCreatorCooperationService: OpenClawCreatorCooperationService,
  ) {}

  @Get("matching")
  async listMatchingWorkspace(
    @Headers() headers: HeadersMap,
    @Param("brandId") brandId: string,
    @Query("workspaceScope") workspaceScope?: string,
    @Query("limit") limit?: string,
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    if (!auth) {
      throw new UnauthorizedException("登录态已失效");
    }
    await this.authService.assertBrandPermission(brandId, "brandGrowth.report.topicLibrary", "view", auth);
    return this.openClawCreatorCooperationService.listMatchingWorkspace(
      brandId,
      workspaceScope || "creator_cooperation",
      limit ? Number(limit) : undefined,
    );
  }

  @Post("matching")
  async createMatchingRecords(
    @Headers() headers: HeadersMap,
    @Param("brandId") brandId: string,
    @Body()
    payload?: {
      workspaceScope?: string;
      items?: Array<{
        sourceProfileId?: string;
        creatorId?: string;
        recommendedReason?: string;
      }>;
    },
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    if (!auth) {
      throw new UnauthorizedException("登录态已失效");
    }
    await this.authService.assertBrandPermission(brandId, "brandGrowth.report.topicLibrary", "edit", auth);
    const items = await this.openClawCreatorCooperationService.createMatchingRecords({
      brandId,
      workspaceScope: payload?.workspaceScope || "creator_cooperation",
      createdByUserId: auth.userId,
      items: payload?.items,
    });
    const workspace = await this.openClawCreatorCooperationService.listMatchingWorkspace(brandId, payload?.workspaceScope || "creator_cooperation");
    return {
      items,
      workspace,
    };
  }

  @Post("matching/delete-batch")
  async deleteMatchingRecords(
    @Headers() headers: HeadersMap,
    @Param("brandId") brandId: string,
    @Body()
    payload?: {
      workspaceScope?: string;
      recordIds?: string[];
    },
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    if (!auth) {
      throw new UnauthorizedException("登录态已失效");
    }
    await this.authService.assertBrandPermission(brandId, "brandGrowth.report.topicLibrary", "edit", auth);
    const deletedCount = await this.openClawCreatorCooperationService.deleteMatchingRecords(
      brandId,
      payload?.workspaceScope || "creator_cooperation",
      Array.isArray(payload?.recordIds) ? payload?.recordIds : [],
    );
    const workspace = await this.openClawCreatorCooperationService.listMatchingWorkspace(brandId, payload?.workspaceScope || "creator_cooperation");
    return {
      deletedCount,
      workspace,
    };
  }

  @Post("matching/add-to-tracking")
  async addMatchingRecordsToTracking(
    @Headers() headers: HeadersMap,
    @Param("brandId") brandId: string,
    @Body()
    payload?: {
      workspaceScope?: string;
      recordIds?: string[];
    },
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    if (!auth) {
      throw new UnauthorizedException("登录态已失效");
    }
    await this.authService.assertBrandPermission(brandId, "brandGrowth.report.topicLibrary", "edit", auth);
    const items = await this.openClawCreatorCooperationService.moveMatchesToTracking({
      brandId,
      workspaceScope: payload?.workspaceScope || "creator_cooperation",
      createdByUserId: auth.userId,
      recordIds: Array.isArray(payload?.recordIds) ? payload.recordIds : [],
    });
    const matchingWorkspace = await this.openClawCreatorCooperationService.listMatchingWorkspace(brandId, payload?.workspaceScope || "creator_cooperation");
    const trackingWorkspace = await this.openClawCreatorCooperationService.listTrackingWorkspace(brandId, payload?.workspaceScope || "creator_cooperation");
    return {
      items,
      matchingWorkspace,
      trackingWorkspace,
    };
  }

  @Get("tracking")
  async listTrackingWorkspace(
    @Headers() headers: HeadersMap,
    @Param("brandId") brandId: string,
    @Query("workspaceScope") workspaceScope?: string,
    @Query("limit") limit?: string,
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    if (!auth) {
      throw new UnauthorizedException("登录态已失效");
    }
    await this.authService.assertBrandPermission(brandId, "brandGrowth.report.topicLibrary", "view", auth);
    return this.openClawCreatorCooperationService.listTrackingWorkspace(
      brandId,
      workspaceScope || "creator_cooperation",
      limit ? Number(limit) : undefined,
    );
  }

  @Post("tracking")
  async createTrackingRecords(
    @Headers() headers: HeadersMap,
    @Param("brandId") brandId: string,
    @Body()
    payload?: {
      workspaceScope?: string;
      items?: Array<{
        sourceProfileId?: string;
        creatorId?: string;
      }>;
    },
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    if (!auth) {
      throw new UnauthorizedException("登录态已失效");
    }
    await this.authService.assertBrandPermission(brandId, "brandGrowth.report.topicLibrary", "edit", auth);
    const items = await this.openClawCreatorCooperationService.createTrackingRecords({
      brandId,
      workspaceScope: payload?.workspaceScope || "creator_cooperation",
      createdByUserId: auth.userId,
      items: payload?.items,
    });
    const workspace = await this.openClawCreatorCooperationService.listTrackingWorkspace(brandId, payload?.workspaceScope || "creator_cooperation");
    return {
      items,
      workspace,
    };
  }

  @Delete("tracking/:trackingId")
  async deleteTrackingRecord(
    @Headers() headers: HeadersMap,
    @Param("brandId") brandId: string,
    @Param("trackingId") trackingId: string,
    @Query("workspaceScope") workspaceScope?: string,
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    if (!auth) {
      throw new UnauthorizedException("登录态已失效");
    }
    await this.authService.assertBrandPermission(brandId, "brandGrowth.report.topicLibrary", "edit", auth);
    const item = await this.openClawCreatorCooperationService.deleteTrackingRecord(
      brandId,
      workspaceScope || "creator_cooperation",
      trackingId,
    );
    const workspace = await this.openClawCreatorCooperationService.listTrackingWorkspace(brandId, workspaceScope || "creator_cooperation");
    return {
      item,
      workspace,
    };
  }

  @Get("tracking/:trackingId/works")
  async listTrackingWorks(
    @Headers() headers: HeadersMap,
    @Param("brandId") brandId: string,
    @Param("trackingId") trackingId: string,
    @Query("workspaceScope") workspaceScope?: string,
    @Query("limit") limit?: string,
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    if (!auth) {
      throw new UnauthorizedException("登录态已失效");
    }
    await this.authService.assertBrandPermission(brandId, "brandGrowth.report.topicLibrary", "view", auth);
    return this.openClawCreatorCooperationService.listTrackingWorkWorkspace(
      brandId,
      workspaceScope || "creator_cooperation",
      trackingId,
      limit ? Number(limit) : undefined,
    );
  }

  @Post("tracking/:trackingId/works")
  async createTrackingWork(
    @Headers() headers: HeadersMap,
    @Param("brandId") brandId: string,
    @Param("trackingId") trackingId: string,
    @Body()
    payload?: {
      workspaceScope?: string;
      douyinWorkUrl?: string;
      refreshIntervalDays?: number;
      resultEvaluation?: string;
      nextAction?: string;
    },
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    if (!auth) {
      throw new UnauthorizedException("登录态已失效");
    }
    await this.authService.assertBrandPermission(brandId, "brandGrowth.report.topicLibrary", "edit", auth);
    const item = await this.openClawCreatorCooperationService.createTrackingWork({
      brandId,
      workspaceScope: payload?.workspaceScope || "creator_cooperation",
      trackingId,
      createdByUserId: auth.userId,
      douyinWorkUrl: payload?.douyinWorkUrl,
      refreshIntervalDays: payload?.refreshIntervalDays,
      resultEvaluation: payload?.resultEvaluation,
      nextAction: payload?.nextAction,
    });
    const workspace = await this.openClawCreatorCooperationService.listTrackingWorkWorkspace(
      brandId,
      payload?.workspaceScope || "creator_cooperation",
      trackingId,
    );
    return {
      item,
      workspace,
    };
  }

  @Patch("tracking/:trackingId/works/:workId")
  async updateTrackingWork(
    @Headers() headers: HeadersMap,
    @Param("brandId") brandId: string,
    @Param("trackingId") trackingId: string,
    @Param("workId") workId: string,
    @Body()
    payload?: {
      workspaceScope?: string;
      douyinWorkUrl?: string;
      refreshIntervalDays?: number;
      resultEvaluation?: string;
      nextAction?: string;
      refreshNow?: boolean;
    },
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    if (!auth) {
      throw new UnauthorizedException("登录态已失效");
    }
    await this.authService.assertBrandPermission(brandId, "brandGrowth.report.topicLibrary", "edit", auth);
    const item = await this.openClawCreatorCooperationService.updateTrackingWork({
      brandId,
      workspaceScope: payload?.workspaceScope || "creator_cooperation",
      trackingId,
      workId,
      douyinWorkUrl: payload?.douyinWorkUrl,
      refreshIntervalDays: payload?.refreshIntervalDays,
      resultEvaluation: payload?.resultEvaluation,
      nextAction: payload?.nextAction,
      refreshNow: payload?.refreshNow,
    });
    const workspace = await this.openClawCreatorCooperationService.listTrackingWorkWorkspace(
      brandId,
      payload?.workspaceScope || "creator_cooperation",
      trackingId,
    );
    return {
      item,
      workspace,
    };
  }

  @Delete("tracking/:trackingId/works/:workId")
  async deleteTrackingWork(
    @Headers() headers: HeadersMap,
    @Param("brandId") brandId: string,
    @Param("trackingId") trackingId: string,
    @Param("workId") workId: string,
    @Query("workspaceScope") workspaceScope?: string,
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    if (!auth) {
      throw new UnauthorizedException("登录态已失效");
    }
    await this.authService.assertBrandPermission(brandId, "brandGrowth.report.topicLibrary", "edit", auth);
    const item = await this.openClawCreatorCooperationService.deleteTrackingWork(
      brandId,
      workspaceScope || "creator_cooperation",
      trackingId,
      workId,
    );
    const workspace = await this.openClawCreatorCooperationService.listTrackingWorkWorkspace(
      brandId,
      workspaceScope || "creator_cooperation",
      trackingId,
    );
    return {
      item,
      workspace,
    };
  }
}
