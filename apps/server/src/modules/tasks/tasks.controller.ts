import { Body, Controller, Get, Headers, Param, Patch, Post } from "@nestjs/common";
import { AuthService } from "../auth/auth.service";
import { TasksService, type CreateTaskPayload } from "./tasks.service";

@Controller("tasks")
export class TasksController {
  constructor(
    private readonly tasksService: TasksService,
    private readonly authService: AuthService,
  ) {}

  @Get()
  async list(@Headers() headers: Record<string, string | string[] | undefined>) {
    const auth = await this.authService.resolveRequestAuthContext(headers, { fallbackToDefaultUser: true });
    return this.tasksService.listTasks(auth);
  }

  @Post()
  async create(@Body() payload: CreateTaskPayload, @Headers() headers: Record<string, string | string[] | undefined>) {
    const auth = await this.authService.resolveRequestAuthContext(headers, { fallbackToDefaultUser: true });
    return this.tasksService.createTask(payload, auth);
  }

  @Patch(":id/retry")
  async retry(@Param("id") id: string, @Headers() headers: Record<string, string | string[] | undefined>) {
    const auth = await this.authService.resolveRequestAuthContext(headers, { fallbackToDefaultUser: true });
    return this.tasksService.retryTask(id, auth);
  }
}
