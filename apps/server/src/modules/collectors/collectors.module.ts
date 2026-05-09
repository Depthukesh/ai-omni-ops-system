import { Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/prisma.module";
import { AuthModule } from "../auth/auth.module";
import { SchedulerModule } from "../scheduler/scheduler.module";
import { CollectorsController } from "./collectors.controller";
import { DailyHotspotsController } from "./daily-hotspots.controller";
import { CollectorsService } from "./collectors.service";

@Module({
  imports: [AuthModule, PrismaModule, SchedulerModule],
  controllers: [CollectorsController, DailyHotspotsController],
  providers: [CollectorsService],
  exports: [CollectorsService],
})
export class CollectorsModule {}
