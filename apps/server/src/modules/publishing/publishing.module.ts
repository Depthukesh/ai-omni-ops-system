import { Module } from "@nestjs/common";
import { BrandsModule } from "../brands/brands.module";
import { WorksModule } from "../works/works.module";
import { PublishingController } from "./publishing.controller";
import { PublishingService } from "./publishing.service";

@Module({
  imports: [BrandsModule, WorksModule],
  controllers: [PublishingController],
  providers: [PublishingService],
  exports: [PublishingService],
})
export class PublishingModule {}
