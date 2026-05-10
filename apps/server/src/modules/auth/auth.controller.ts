import { Body, Controller, Get, Headers, Param, Patch, Post, Query, Res } from "@nestjs/common";
import {
  AuthService,
  type ProfileAvatarUploadRecord,
  type FeishuAppConfigPayload,
  type LoginPayload,
  type RefreshSessionPayload,
  type RegisterPayload,
  type SwitchBrandPayload,
  type UploadProfileAvatarPayload,
  type UpdateProfilePayload,
} from "./auth.service";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("login")
  login(@Body() payload: LoginPayload) {
    return this.authService.login(payload);
  }

  @Post("register")
  register(@Body() payload: RegisterPayload) {
    return this.authService.register(payload);
  }

  @Post("refresh")
  refresh(@Body() payload: RefreshSessionPayload) {
    return this.authService.refreshSession(payload);
  }

  @Post("logout")
  async logout(@Headers() headers: Record<string, string | string[] | undefined>) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    return this.authService.logout(auth);
  }

  @Get("me")
  async me(@Headers() headers: Record<string, string | string[] | undefined>) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    return this.authService.getMe(auth);
  }

  @Get("brands")
  async brands(@Headers() headers: Record<string, string | string[] | undefined>) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    return this.authService.getBrands(auth);
  }

  @Patch("switch-brand")
  async switchBrand(
    @Body() payload: SwitchBrandPayload,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    return this.authService.switchBrand(payload, auth);
  }

  @Get("profile")
  async profile(@Headers() headers: Record<string, string | string[] | undefined>) {
    const auth = await this.authService.resolveRequestAuthContext(headers, { fallbackToDefaultUser: true });
    return this.authService.getProfile(auth);
  }

  @Patch("profile")
  async updateProfile(
    @Body() payload: UpdateProfilePayload,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers, { fallbackToDefaultUser: true });
    return this.authService.updateProfile(payload, auth);
  }

  @Post("profile/avatar")
  async uploadProfileAvatar(
    @Body() payload: UploadProfileAvatarPayload,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ): Promise<ProfileAvatarUploadRecord> {
    const auth = await this.authService.resolveRequestAuthContext(headers, { fallbackToDefaultUser: true });
    return this.authService.uploadProfileAvatar(payload, auth);
  }

  @Get("users/:userId/avatar/:fileName")
  async getProfileAvatar(
    @Param("userId") userId: string,
    @Param("fileName") fileName: string,
    @Res() response: { setHeader(name: string, value: string): unknown; send(body: Buffer): unknown },
  ) {
    const file = await this.authService.getProfileAvatar(userId, fileName);
    response.setHeader("Content-Type", file.contentType);
    return response.send(file.buffer);
  }

  @Get("point-ledgers")
  async pointLedgers(@Headers() headers: Record<string, string | string[] | undefined>) {
    const auth = await this.authService.resolveRequestAuthContext(headers, { fallbackToDefaultUser: true });
    return this.authService.getPointLedgers(auth);
  }

  @Get("feishu/oauth/start")
  async feishuOauthStart(
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Query("userId") userId?: string,
    @Query("returnUrl") returnUrl?: string,
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers, { fallbackToDefaultUser: true });
    return this.authService.getFeishuOauthStart(userId || auth?.userId, returnUrl);
  }

  @Get("feishu/app-config")
  async feishuAppConfig(
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Query("userId") userId?: string,
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers, { fallbackToDefaultUser: true });
    return this.authService.getFeishuAppConfig(userId || auth?.userId);
  }

  @Post("feishu/app-config")
  async upsertFeishuAppConfig(
    @Body() payload: FeishuAppConfigPayload,
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Query("userId") userId?: string,
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers, { fallbackToDefaultUser: true });
    return this.authService.upsertFeishuAppConfig(payload, userId || auth?.userId);
  }

  @Get("feishu/oauth/status")
  async feishuOauthStatus(
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Query("userId") userId?: string,
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers, { fallbackToDefaultUser: true });
    return this.authService.getFeishuOauthStatus(userId || auth?.userId);
  }

  @Get("feishu/oauth/callback")
  async feishuOauthCallback(@Query("code") code: string, @Query("state") state: string, @Res() response: { redirect(url: string): unknown }) {
    const redirectUrl = await this.authService.handleFeishuOauthCallback(code, state);
    return response.redirect(redirectUrl);
  }
}
