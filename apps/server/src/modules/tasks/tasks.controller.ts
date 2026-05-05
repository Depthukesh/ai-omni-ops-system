import { Body, Controller, Get, Param, Patch, Post } from "@nestjs/common";
import { TasksService, type CreateTaskPayload } from "./tasks.service";

@Controller("tasks")
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  list() {
    return this.tasksService.listTasks();
  }

  @Post()
  create(@Body() payload: CreateTaskPayload) {
    return this.tasksService.createTask(payload);
  }

  @Patch(":id/retry")
  retry(@Param("id") id: string) {
    return this.tasksService.retryTask(id);
  }
}
