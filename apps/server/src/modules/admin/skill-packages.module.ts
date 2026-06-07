import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { SkillPackagesController } from "./skill-packages.controller";
import { SkillPackagesService } from "./skill-packages.service";

@Module({
  imports: [AuthModule],
  controllers: [SkillPackagesController],
  providers: [SkillPackagesService],
  exports: [SkillPackagesService],
})
export class SkillPackagesModule {}
