import { Module } from "@nestjs/common";
import { ApiProvidersModule } from "../admin/api-providers.module";
import { SkillsPromptsModule } from "../admin/skills-prompts.module";
import { AuthModule } from "../auth/auth.module";
import { UserSkillsController } from "./user-skills.controller";
import { UserSkillsService } from "./user-skills.service";

@Module({
  imports: [AuthModule, SkillsPromptsModule, ApiProvidersModule],
  controllers: [UserSkillsController],
  providers: [UserSkillsService],
  exports: [UserSkillsService],
})
export class UserSkillsModule {}
