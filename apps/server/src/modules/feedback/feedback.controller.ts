import { Body, Controller, Get, Headers, Param, Post, Query } from "@nestjs/common";
import { AuthService } from "../auth/auth.service";
import { FeedbackService, type SubmitTaskFeedbackPayload } from "./feedback.service";

@Controller("feedback")
export class FeedbackController {
  constructor(
    private readonly feedbackService: FeedbackService,
    private readonly authService: AuthService,
  ) {}

  @Post("tasks/:taskId")
  async submitTaskFeedback(
    @Param("taskId") taskId: string,
    @Body() payload: SubmitTaskFeedbackPayload,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers, { fallbackToDefaultUser: true });
    return this.feedbackService.submitTaskFeedback(taskId, payload, auth);
  }

  @Get("summary")
  async getFeedbackSummary(
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Query("timeRange") timeRange?: string,
    @Query("skillId") skillId?: string,
    @Query("promptId") promptId?: string,
    @Query("limit") limit?: string,
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers, { fallbackToDefaultUser: true });
    return this.feedbackService.getFeedbackSummary(auth, {
      timeRange,
      skillId,
      promptId,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get("analysis")
  async getFeedbackAnalysis(
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Query("timeRange") timeRange?: string,
    @Query("skillId") skillId?: string,
    @Query("promptId") promptId?: string,
    @Query("limit") limit?: string,
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers, { fallbackToDefaultUser: true });
    return this.feedbackService.getFeedbackAnalysis(auth, {
      timeRange,
      skillId,
      promptId,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get("optimization-suggestions")
  async getPromptOptimizationSuggestions(
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Query("timeRange") timeRange?: string,
    @Query("skillId") skillId?: string,
    @Query("promptId") promptId?: string,
    @Query("limit") limit?: string,
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers, { fallbackToDefaultUser: true });
    return this.feedbackService.getPromptOptimizationSuggestions(auth, {
      timeRange,
      skillId,
      promptId,
      limit: limit ? Number(limit) : undefined,
    });
  }
}
