import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { SystemUpdateController } from "./system-update.controller";
import { SystemUpdateService } from "./system-update.service";

@Module({
  imports: [AuthModule],
  controllers: [SystemUpdateController],
  providers: [SystemUpdateService],
  exports: [SystemUpdateService],
})
export class SystemUpdateModule {}
