import { Body, Controller, Get, Param, Patch, Post } from "@nestjs/common";
import { OrdersService, type CreateOrderPayload } from "./orders.service";

@Controller("orders")
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get("admin/list")
  listAdmin() {
    return this.ordersService.listAdminOrders();
  }

  @Get()
  list() {
    return this.ordersService.listOrders();
  }

  @Get(":id")
  getById(@Param("id") id: string) {
    return this.ordersService.getOrderById(id);
  }

  @Get(":id/status")
  getStatus(@Param("id") id: string) {
    return this.ordersService.getOrderStatus(id);
  }

  @Post()
  create(@Body() payload: CreateOrderPayload) {
    return this.ordersService.createOrder(payload);
  }

  @Patch(":id/pay")
  markPaid(@Param("id") id: string) {
    return this.ordersService.markPaid(id);
  }

  @Patch(":id/cancel")
  cancel(@Param("id") id: string) {
    return this.ordersService.cancelOrder(id);
  }
}
