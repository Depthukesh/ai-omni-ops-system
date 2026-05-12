import { Body, Controller, Get, Headers, Post } from "@nestjs/common";
import { AuthService } from "../auth/auth.service";
import { MediaService, type CreateMediaPayload } from "./media.service";

@Controller("media")
export class MediaController {
  constructor(
    private readonly mediaService: MediaService,
    private readonly authService: AuthService,
  ) {}

  @Get()
  async list(@Headers() headers: Record<string, string | string[] | undefined>) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    return this.mediaService.listMedia(auth);
  }

  @Post()
  async create(@Body() payload: CreateMediaPayload, @Headers() headers: Record<string, string | string[] | undefined>) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    return this.mediaService.createMedia(payload, auth);
  }
}
