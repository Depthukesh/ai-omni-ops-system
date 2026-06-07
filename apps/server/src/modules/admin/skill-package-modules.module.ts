import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { SkillPackageModulesController } from "./skill-package-modules.controller";
import { SkillPackageModulesService } from "./skill-package-modules.service";

@Module({
  imports: [AuthModule],
  controllers: [SkillPackageModulesController],
  providers: [SkillPackageModulesService],
  exports: [SkillPackageModulesService],
})
export class SkillPackageModulesModule {}
