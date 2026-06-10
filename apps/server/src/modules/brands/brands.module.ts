import { Module } from "@nestjs/common";
import { KnowledgeBasesModule } from "../admin/knowledge-bases.module";
import { BrandsController } from "./brands.controller";
import { BrandsService } from "./brands.service";

@Module({
  imports: [KnowledgeBasesModule],
  controllers: [BrandsController],
  providers: [BrandsService],
  exports: [BrandsService],
})
export class BrandsModule {}
