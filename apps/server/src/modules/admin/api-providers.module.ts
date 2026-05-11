import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { ApiProvidersController } from "./api-providers.controller";
import { ApiProvidersService } from "./api-providers.service";

@Module({
  imports: [AuthModule],
  controllers: [ApiProvidersController],
  providers: [ApiProvidersService],
  exports: [ApiProvidersService],
})
export class ApiProvidersModule {}
