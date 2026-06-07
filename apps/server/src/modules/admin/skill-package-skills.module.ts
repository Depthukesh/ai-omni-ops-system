import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { SkillPackageSkillsController } from "./skill-package-skills.controller";
import { SkillPackageSkillsService } from "./skill-package-skills.service";

@Module({
  imports: [AuthModule],
  controllers: [SkillPackageSkillsController],
  providers: [SkillPackageSkillsService],
  exports: [SkillPackageSkillsService],
})
export class SkillPackageSkillsModule {}
