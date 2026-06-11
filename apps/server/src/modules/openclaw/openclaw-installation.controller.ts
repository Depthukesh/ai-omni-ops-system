import { Body, Controller, Delete, Headers, Param, Post, Get, UnauthorizedException } from "@nestjs/common";
import { AuthService } from "../auth/auth.service";
import { OpenClawInstallationService } from "./openclaw-installation.service";

type HeadersMap = Record<string, string | string[] | undefined>;

@Controller("openclaw")
export class OpenClawInstallationController {
  constructor(
    private readonly authService: AuthService,
    private readonly openClawInstallationService: OpenClawInstallationService,
  ) {}

  @Get("installation-hub")
  async getInstallationWorkspace(@Headers() headers: HeadersMap) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    if (!auth?.userId) {
      throw new UnauthorizedException("请先登录");
    }
    return this.openClawInstallationService.getInstallationWorkspace(auth);
  }

  @Post("installation-hub/tokens/rotate")
  async rotateInstallationToken(
    @Headers() headers: HeadersMap,
    @Body() payload?: { tokenName?: string; expiresInDays?: number },
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    if (!auth?.userId) {
      throw new UnauthorizedException("请先登录");
    }
    return this.openClawInstallationService.rotateInstallationToken(auth, payload);
  }

  @Delete("installation-hub/tokens/:tokenId")
  async revokeInstallationToken(
    @Headers() headers: HeadersMap,
    @Param("tokenId") tokenId: string,
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    if (!auth?.userId) {
      throw new UnauthorizedException("请先登录");
    }
    return this.openClawInstallationService.revokeInstallationToken(auth, tokenId);
  }
}
