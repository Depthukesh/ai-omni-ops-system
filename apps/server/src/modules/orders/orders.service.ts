import { Injectable, NotFoundException } from "@nestjs/common";
import { MembershipLevel, OrderStatus, Prisma } from "@prisma/client";
import { createId, database } from "../../common/mock-data";
import { PrismaService } from "../../prisma/prisma.service";

export type CreateOrderPayload = {
  userId?: string;
  orderType: string;
  membership?: "FREE" | "BASIC" | "PRO" | "ENTERPRISE";
  pointsAmount?: number;
  amountYuan: number;
};

@Injectable()
export class OrdersService {
  constructor(private readonly prismaService: PrismaService) {}

  async listOrders() {
    if (await this.prismaService.canUseDatabase()) {
      const userId = await this.getDefaultUserId();
      const orders = await this.prismaService.membershipOrder.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
      });

      return orders.map((item) => this.mapOrder(item));
    }

    return [...database.orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async listAdminOrders() {
    if (await this.prismaService.canUseDatabase()) {
      const orders = await this.prismaService.membershipOrder.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: {
              nickname: true,
              mobile: true,
              membership: true,
              pointsBalance: true,
            },
          },
        },
      });

      return orders.map((item) => ({
        ...this.mapOrder(item),
        user: item.user,
      }));
    }

    return [...database.orders]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((item) => ({
        ...item,
        user: this.getMockUserSnapshot(item.userId),
      }));
  }

  async getOrderById(id: string) {
    if (await this.prismaService.canUseDatabase()) {
      const order = await this.prismaService.membershipOrder.findUnique({
        where: { id },
        include: {
          user: {
            select: {
              nickname: true,
              mobile: true,
              membership: true,
              pointsBalance: true,
            },
          },
        },
      });

      if (!order) {
        throw new NotFoundException("订单不存在");
      }

      return {
        ...this.mapOrder(order),
        user: order.user,
      };
    }

    const order = database.orders.find((item) => item.id === id);
    if (!order) {
      throw new NotFoundException("订单不存在");
    }

    return {
      ...order,
      user: this.getMockUserSnapshot(order.userId),
    };
  }

  async getOrderStatus(id: string) {
    const order = await this.getOrderById(id);
    return {
      id: order.id,
      orderNo: order.orderNo,
      orderStatus: order.orderStatus,
      paidAt: order.paidAt,
      updatedAt: order.updatedAt,
    };
  }

  async createOrder(payload: CreateOrderPayload) {
    if (await this.prismaService.canUseDatabase()) {
      const userId = payload.userId ?? (await this.getDefaultUserId());

      const order = await this.prismaService.membershipOrder.create({
        data: {
          userId,
          orderNo: this.createOrderNo(payload.orderType),
          orderType: payload.orderType,
          orderStatus: OrderStatus.PENDING,
          membership: payload.membership,
          pointsAmount: payload.pointsAmount,
          amountYuan: new Prisma.Decimal(payload.amountYuan),
          metaJson: {
            source: "manual-create",
          },
        },
      });

      return this.mapOrder(order);
    }

    const now = new Date().toISOString();
    const order = {
      id: createId("ord"),
      userId: payload.userId ?? database.users[0].id,
      orderNo: this.createOrderNo(payload.orderType),
      orderType: payload.orderType,
      orderStatus: "PENDING" as const,
      membership: payload.membership,
      pointsAmount: payload.pointsAmount,
      amountYuan: payload.amountYuan,
      createdAt: now,
      updatedAt: now,
    };

    database.orders.unshift(order);
    return order;
  }

  async markPaid(id: string) {
    if (await this.prismaService.canUseDatabase()) {
      const existing = await this.prismaService.membershipOrder.findUnique({
        where: { id },
      });

      if (!existing) {
        throw new NotFoundException("订单不存在");
      }

      if (existing.orderStatus === OrderStatus.PAID) {
        return this.mapOrder(existing);
      }

      if (existing.orderStatus === OrderStatus.CANCELLED) {
        return this.mapOrder(existing);
      }

      const paidAt = new Date();
      const order = await this.prismaService.$transaction(async (tx) => {
        const updatedOrder = await tx.membershipOrder.update({
          where: { id },
          data: {
            orderStatus: OrderStatus.PAID,
            paidAt,
          },
        });

        if (updatedOrder.orderType === "MEMBERSHIP_PURCHASE" && updatedOrder.membership) {
          await tx.user.update({
            where: { id: updatedOrder.userId },
            data: {
              membership: updatedOrder.membership as MembershipLevel,
            },
          });
        }

        if (updatedOrder.orderType === "POINTS_RECHARGE" && updatedOrder.pointsAmount) {
          const user = await tx.user.findUnique({
            where: { id: updatedOrder.userId },
            select: { pointsBalance: true },
          });

          if (!user) {
            throw new NotFoundException("用户不存在");
          }

          const balanceAfter = user.pointsBalance + updatedOrder.pointsAmount;

          await tx.user.update({
            where: { id: updatedOrder.userId },
            data: {
              pointsBalance: balanceAfter,
            },
          });

          await tx.pointLedger.create({
            data: {
              userId: updatedOrder.userId,
              changeType: "POINTS_RECHARGE",
              pointsDelta: updatedOrder.pointsAmount,
              balanceAfter,
              description: `订单 ${updatedOrder.orderNo} 充值到账`,
            },
          });
        }

        return updatedOrder;
      });

      return this.mapOrder(order);
    }

    const order = database.orders.find((item) => item.id === id);
    if (!order) {
      throw new NotFoundException("订单不存在");
    }

    if (order.orderStatus === "PAID") {
      return order;
    }

    const now = new Date().toISOString();
    order.orderStatus = "PAID";
    order.paidAt = now;
    order.updatedAt = now;

    const user = database.users.find((item) => item.id === order.userId);
    if (user && order.orderType === "MEMBERSHIP_PURCHASE" && order.membership) {
      user.membership = order.membership;
    }

    if (user && order.orderType === "POINTS_RECHARGE" && order.pointsAmount) {
      user.pointsBalance += order.pointsAmount;
      database.pointLedgers.unshift({
        id: createId("ptl"),
        userId: user.id,
        changeType: "POINTS_RECHARGE",
        pointsDelta: order.pointsAmount,
        balanceAfter: user.pointsBalance,
        description: `订单 ${order.orderNo} 充值到账`,
        createdAt: now,
      });
    }

    return order;
  }

  async cancelOrder(id: string) {
    if (await this.prismaService.canUseDatabase()) {
      const existing = await this.prismaService.membershipOrder.findUnique({
        where: { id },
      });

      if (!existing) {
        throw new NotFoundException("订单不存在");
      }

      if (existing.orderStatus !== OrderStatus.PENDING) {
        return this.mapOrder(existing);
      }

      const order = await this.prismaService.membershipOrder.update({
        where: { id },
        data: {
          orderStatus: OrderStatus.CANCELLED,
        },
      });

      return this.mapOrder(order);
    }

    const order = database.orders.find((item) => item.id === id);
    if (!order) {
      throw new NotFoundException("订单不存在");
    }

    if (order.orderStatus !== "PENDING") {
      return order;
    }

    order.orderStatus = "CANCELLED";
    order.updatedAt = new Date().toISOString();
    return order;
  }

  private async getDefaultUserId() {
    const user = await this.prismaService.user.findFirst({
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException("当前数据库中不存在可绑定的用户");
    }

    return user.id;
  }

  private createOrderNo(orderType: string) {
    const prefix = orderType === "POINTS_RECHARGE" ? "PO" : "MO";
    const stamp = new Date().toISOString().replace(/\D/g, "").slice(0, 14);
    return `${prefix}${stamp}`;
  }

  private getMockUserSnapshot(userId: string) {
    const user = database.users.find((item) => item.id === userId);
    return {
      nickname: user?.nickname ?? "未知用户",
      mobile: user?.mobile ?? "",
      membership: user?.membership ?? "FREE",
      pointsBalance: user?.pointsBalance ?? 0,
    };
  }

  private mapOrder(item: {
    id: string;
    userId: string;
    orderNo: string;
    orderType: string;
    orderStatus: OrderStatus;
    membership: string | null;
    pointsAmount: number | null;
    amountYuan: Prisma.Decimal;
    paidAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: item.id,
      userId: item.userId,
      orderNo: item.orderNo,
      orderType: item.orderType,
      orderStatus: item.orderStatus,
      membership: item.membership ?? undefined,
      pointsAmount: item.pointsAmount ?? undefined,
      amountYuan: Number(item.amountYuan),
      paidAt: item.paidAt?.toISOString(),
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    };
  }
}
