import { Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/prisma.module";
import { AuthModule } from "../auth/auth.module";
import { SchedulerModule } from "../scheduler/scheduler.module";
import { ThirdPartyPlatformsModule } from "../third-party-platforms/third-party-platforms.module";
import { CollectorsController, DouyinCollectorsController, WechatCollectorsController } from "./collectors.controller";
import { DailyHotspotsController } from "./daily-hotspots.controller";
import { CollectorsService } from "./collectors.service";

@Module({
  imports: [AuthModule, PrismaModule, SchedulerModule, ThirdPartyPlatformsModule],
  controllers: [CollectorsController, DouyinCollectorsController, WechatCollectorsController, DailyHotspotsController],
  providers: [CollectorsService],
  exports: [CollectorsService],
})
export class CollectorsModule {}
