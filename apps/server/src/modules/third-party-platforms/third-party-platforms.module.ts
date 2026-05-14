import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { ThirdPartyPlatformsController } from "./third-party-platforms.controller";
import { ThirdPartyPlatformsService } from "./third-party-platforms.service";

@Module({
  imports: [AuthModule],
  controllers: [ThirdPartyPlatformsController],
  providers: [ThirdPartyPlatformsService],
  exports: [ThirdPartyPlatformsService],
})
export class ThirdPartyPlatformsModule {}
