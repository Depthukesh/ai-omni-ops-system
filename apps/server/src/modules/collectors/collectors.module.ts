import { Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/prisma.module";
import { SchedulerModule } from "../scheduler/scheduler.module";
import { CollectorsController } from "./collectors.controller";
import { DailyHotspotsController } from "./daily-hotspots.controller";
import { CollectorsService } from "./collectors.service";

@Module({
  imports: [PrismaModule, SchedulerModule],
  controllers: [CollectorsController, DailyHotspotsController],
  providers: [CollectorsService],
  exports: [CollectorsService],
})
export class CollectorsModule {}
