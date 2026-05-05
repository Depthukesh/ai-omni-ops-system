import { Body, Controller, Get, Post, Query, Res } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { AuthService, type FeishuAppConfigPayload, type LoginPayload, type RegisterPayload } from "./auth.service";

@Controller("auth")
export class AuthController {
  // Temporary direct construction to bypass unstable runtime injection in start:dev.
  private readonly authService = new AuthService(new PrismaService());

  @Post("login")
  login(@Body() payload: LoginPayload) {
    return this.authService.login(payload);
  }

  @Post("register")
  register(@Body() payload: RegisterPayload) {
    return this.authService.register(payload);
  }

  @Get("profile")
  profile() {
    return this.authService.getProfile();
  }

  @Get("point-ledgers")
  pointLedgers() {
    return this.authService.getPointLedgers();
  }

  @Get("feishu/oauth/start")
  feishuOauthStart(@Query("userId") userId?: string, @Query("returnUrl") returnUrl?: string) {
    return this.authService.getFeishuOauthStart(userId, returnUrl);
  }

  @Get("feishu/app-config")
  feishuAppConfig(@Query("userId") userId?: string) {
    return this.authService.getFeishuAppConfig(userId);
  }

  @Post("feishu/app-config")
  upsertFeishuAppConfig(@Body() payload: FeishuAppConfigPayload, @Query("userId") userId?: string) {
    return this.authService.upsertFeishuAppConfig(payload, userId);
  }

  @Get("feishu/oauth/status")
  feishuOauthStatus(@Query("userId") userId?: string) {
    return this.authService.getFeishuOauthStatus(userId);
  }

  @Get("feishu/oauth/callback")
  async feishuOauthCallback(@Query("code") code: string, @Query("state") state: string, @Res() response: { redirect(url: string): unknown }) {
    const redirectUrl = await this.authService.handleFeishuOauthCallback(code, state);
    return response.redirect(redirectUrl);
  }
}
