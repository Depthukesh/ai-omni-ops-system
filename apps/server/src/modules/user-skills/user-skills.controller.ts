import { Body, Controller, Get, Headers, Param, Patch, Post, UnauthorizedException } from "@nestjs/common";
import { AuthService } from "../auth/auth.service";
import { UserSkillsService, type UpdateUserSkillPayload } from "./user-skills.service";

@Controller("user-skills")
export class UserSkillsController {
  constructor(
    private readonly userSkillsService: UserSkillsService,
    private readonly authService: AuthService,
  ) {}

  @Get()
  async list(@Headers() headers: Record<string, string | string[] | undefined>) {
    const auth = await this.authService.resolveRequestAuthContext(headers, { fallbackToDefaultUser: true });
    if (!auth) {
      throw new UnauthorizedException("请先登录");
    }
    return this.userSkillsService.listUserSkills(auth);
  }

  @Get("editor-options")
  async editorOptions(@Headers() headers: Record<string, string | string[] | undefined>) {
    const auth = await this.authService.resolveRequestAuthContext(headers, { fallbackToDefaultUser: true });
    if (!auth) {
      throw new UnauthorizedException("请先登录");
    }
    return this.userSkillsService.getEditorOptions();
  }

  @Get(":skillId")
  async detail(
    @Param("skillId") skillId: string,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers, { fallbackToDefaultUser: true });
    if (!auth) {
      throw new UnauthorizedException("请先登录");
    }
    return this.userSkillsService.getUserSkill(skillId, auth);
  }

  @Patch(":skillId")
  async update(
    @Param("skillId") skillId: string,
    @Body() payload: UpdateUserSkillPayload,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers, { fallbackToDefaultUser: true });
    if (!auth) {
      throw new UnauthorizedException("请先登录");
    }
    return this.userSkillsService.updateUserSkill(skillId, payload, auth);
  }

  @Post(":skillId/reset")
  async reset(
    @Param("skillId") skillId: string,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers, { fallbackToDefaultUser: true });
    if (!auth) {
      throw new UnauthorizedException("请先登录");
    }
    return this.userSkillsService.resetUserSkill(skillId, auth);
  }
}
