import { Module } from "@nestjs/common";
import { SkillsPromptsModule } from "../admin/skills-prompts.module";
import { AuthModule } from "../auth/auth.module";
import { UserSkillsController } from "./user-skills.controller";
import { UserSkillsService } from "./user-skills.service";

@Module({
  imports: [AuthModule, SkillsPromptsModule],
  controllers: [UserSkillsController],
  providers: [UserSkillsService],
  exports: [UserSkillsService],
})
export class UserSkillsModule {}
