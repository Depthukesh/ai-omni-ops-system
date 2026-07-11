import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { ChanjingOpenApiService } from "../works/chanjing-open-api.service";
import { GlmOpenService } from "./glm-open.service";
import { ThirdPartyPlatformsController } from "./third-party-platforms.controller";
import { ThirdPartyPlatformsService } from "./third-party-platforms.service";
import { VolcengineMusicService } from "./volcengine-music.service";

@Module({
  imports: [AuthModule],
  controllers: [ThirdPartyPlatformsController],
  providers: [ThirdPartyPlatformsService, ChanjingOpenApiService, GlmOpenService, VolcengineMusicService],
  exports: [ThirdPartyPlatformsService, GlmOpenService, VolcengineMusicService],
})
export class ThirdPartyPlatformsModule {}
