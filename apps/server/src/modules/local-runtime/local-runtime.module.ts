import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { LocalRuntimeController } from "./local-runtime.controller";
import { LocalRuntimeService } from "./local-runtime.service";

@Module({
  imports: [AuthModule],
  controllers: [LocalRuntimeController],
  providers: [LocalRuntimeService],
  exports: [LocalRuntimeService],
})
export class LocalRuntimeModule {}
