import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { ModuleDefinitionsController } from "./module-definitions.controller";
import { ModuleDefinitionsService } from "./module-definitions.service";

@Module({
  imports: [AuthModule],
  controllers: [ModuleDefinitionsController],
  providers: [ModuleDefinitionsService],
  exports: [ModuleDefinitionsService],
})
export class ModuleDefinitionsModule {}
