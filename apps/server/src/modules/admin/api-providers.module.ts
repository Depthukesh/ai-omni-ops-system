import { Module } from "@nestjs/common";
import { ApiProvidersController } from "./api-providers.controller";
import { ApiProvidersService } from "./api-providers.service";

@Module({
  controllers: [ApiProvidersController],
  providers: [ApiProvidersService],
})
export class ApiProvidersModule {}
