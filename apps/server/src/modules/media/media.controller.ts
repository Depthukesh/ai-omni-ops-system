import { Body, Controller, Get, Post } from "@nestjs/common";
import { MediaService, type CreateMediaPayload } from "./media.service";

@Controller("media")
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Get()
  list() {
    return this.mediaService.listMedia();
  }

  @Post()
  create(@Body() payload: CreateMediaPayload) {
    return this.mediaService.createMedia(payload);
  }
}
