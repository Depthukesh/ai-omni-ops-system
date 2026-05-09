import { Body, Controller, Get, Headers, Param, Patch, Post } from "@nestjs/common";
import { ADMIN_ROLE_GROUPS, requireAdminRoles } from "../admin/admin-access";
import { AuthService } from "../auth/auth.service";
import { OrdersService, type CreateOrderPayload } from "./orders.service";

@Controller("orders")
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly authService: AuthService,
  ) {}

  @Get("admin/list")
  async listAdmin(@Headers() headers: Record<string, string | string[] | undefined>) {
    await requireAdminRoles(this.authService, headers, ADMIN_ROLE_GROUPS.orderAdminRead);
    return this.ordersService.listAdminOrders();
  }

  @Get()
  async list(@Headers() headers: Record<string, string | string[] | undefined>) {
    const auth = await this.authService.resolveRequestAuthContext(headers, { fallbackToDefaultUser: true });
    return this.ordersService.listOrders(auth);
  }

  @Get(":id")
  async getById(@Param("id") id: string, @Headers() headers: Record<string, string | string[] | undefined>) {
    const auth = await this.authService.resolveRequestAuthContext(headers, { fallbackToDefaultUser: true });
    return this.ordersService.getOrderById(id, auth);
  }

  @Get(":id/status")
  async getStatus(@Param("id") id: string, @Headers() headers: Record<string, string | string[] | undefined>) {
    const auth = await this.authService.resolveRequestAuthContext(headers, { fallbackToDefaultUser: true });
    return this.ordersService.getOrderStatus(id, auth);
  }

  @Post()
  async create(@Body() payload: CreateOrderPayload, @Headers() headers: Record<string, string | string[] | undefined>) {
    const auth = await this.authService.resolveRequestAuthContext(headers, { fallbackToDefaultUser: true });
    return this.ordersService.createOrder(payload, auth);
  }

  @Patch(":id/pay")
  async markPaid(@Param("id") id: string, @Headers() headers: Record<string, string | string[] | undefined>) {
    const auth = await this.authService.resolveRequestAuthContext(headers, { fallbackToDefaultUser: true });
    return this.ordersService.markPaid(id, auth);
  }

  @Patch(":id/cancel")
  async cancel(@Param("id") id: string, @Headers() headers: Record<string, string | string[] | undefined>) {
    const auth = await this.authService.resolveRequestAuthContext(headers, { fallbackToDefaultUser: true });
    return this.ordersService.cancelOrder(id, auth);
  }
}
