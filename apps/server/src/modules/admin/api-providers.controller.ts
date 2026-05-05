import { Body, Controller, Delete, Get, Param, Patch, Post } from "@nestjs/common";
import {
  ApiProvidersService,
  type CreateApiProviderPayload,
  type UpdateApiProviderPayload,
} from "./api-providers.service";

@Controller("admin/api-providers")
export class ApiProvidersController {
  constructor(private readonly apiProvidersService: ApiProvidersService) {}

  @Get()
  listProviders() {
    return this.apiProvidersService.listProviders();
  }

  @Post()
  createProvider(@Body() payload: CreateApiProviderPayload) {
    return this.apiProvidersService.createProvider(payload);
  }

  @Patch(":id")
  updateProvider(@Param("id") id: string, @Body() payload: UpdateApiProviderPayload) {
    return this.apiProvidersService.updateProvider(id, payload);
  }

  @Patch(":id/archive")
  archiveProvider(@Param("id") id: string) {
    return this.apiProvidersService.archiveProvider(id);
  }

  @Delete(":id")
  deleteProvider(@Param("id") id: string) {
    return this.apiProvidersService.deleteProvider(id);
  }
}
