import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { ChanjingOpenApiService } from "../works/chanjing-open-api.service";
import { ThirdPartyPlatformsController } from "./third-party-platforms.controller";
import { ThirdPartyPlatformsService } from "./third-party-platforms.service";
import { VolcengineSpeechService } from "./volcengine-speech.service";

@Module({
  imports: [AuthModule],
  controllers: [ThirdPartyPlatformsController],
  providers: [ThirdPartyPlatformsService, ChanjingOpenApiService, VolcengineSpeechService],
  exports: [ThirdPartyPlatformsService, VolcengineSpeechService],
})
export class ThirdPartyPlatformsModule {}
