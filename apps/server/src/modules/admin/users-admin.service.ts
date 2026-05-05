import { Injectable, NotFoundException } from "@nestjs/common";
import { MembershipLevel, Prisma, UserStatus } from "@prisma/client";
import { createId, database } from "../../common/mock-data";
import { PrismaService } from "../../prisma/prisma.service";

export type UpdateAdminUserPayload = {
  membership?: "FREE" | "BASIC" | "PRO" | "ENTERPRISE";
  pointsDelta?: number;
};

@Injectable()
export class UsersAdminService {
  constructor(private readonly prismaService: PrismaService) {}

  async listUsers() {
    if (await this.prismaService.canUseDatabase()) {
      const users = await this.prismaService.user.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          _count: {
            select: {
              brands: true,
              tasks: true,
              orders: true,
            },
          },
        },
      });

      return users.map((user) => ({
        id: user.id,
        mobile: user.mobile,
        email: user.email ?? "",
        nickname: user.nickname ?? "",
        status: user.status,
        membership: user.membership,
        pointsBalance: user.pointsBalance,
        brandCount: user._count.brands,
        taskCount: user._count.tasks,
        orderCount: user._count.orders,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      }));
    }

    return database.users.map((user) => ({
      id: user.id,
      mobile: user.mobile,
      email: user.email,
      nickname: user.nickname,
      status: user.status,
      membership: user.membership,
      pointsBalance: user.pointsBalance,
      brandCount: database.brands.filter((item) => item.ownerUserId === user.id).length,
      taskCount: database.tasks.filter((item) => item.userId === user.id).length,
      orderCount: database.orders.filter((item) => item.userId === user.id).length,
      createdAt: "2026-04-30T10:00:00.000Z",
      updatedAt: new Date().toISOString(),
    }));
  }

  async updateUser(userId: string, payload: UpdateAdminUserPayload) {
    if (await this.prismaService.canUseDatabase()) {
      const user = await this.prismaService.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new NotFoundException("用户不存在");
      }

      const nextPointsBalance = user.pointsBalance + (payload.pointsDelta ?? 0);
      const updated = await this.prismaService.$transaction(async (tx) => {
        const nextUser = await tx.user.update({
          where: { id: userId },
          data: {
            membership: payload.membership ? (payload.membership as MembershipLevel) : undefined,
            pointsBalance: payload.pointsDelta !== undefined ? nextPointsBalance : undefined,
          },
        });

        if (payload.pointsDelta && payload.pointsDelta !== 0) {
          await tx.pointLedger.create({
            data: {
              userId: userId,
              changeType: "ADMIN_ADJUST",
              pointsDelta: payload.pointsDelta,
              balanceAfter: nextPointsBalance,
              description: "后台调整用户点数",
            },
          });
        }

        return nextUser;
      });

      const counts = await this.prismaService.user.findUnique({
        where: { id: userId },
        include: {
          _count: {
            select: {
              brands: true,
              tasks: true,
              orders: true,
            },
          },
        },
      });

      if (!counts) {
        throw new NotFoundException("用户不存在");
      }

      return {
        id: updated.id,
        mobile: updated.mobile,
        email: updated.email ?? "",
        nickname: updated.nickname ?? "",
        status: updated.status,
        membership: updated.membership,
        pointsBalance: updated.pointsBalance,
        brandCount: counts._count.brands,
        taskCount: counts._count.tasks,
        orderCount: counts._count.orders,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      };
    }

    const user = database.users.find((item) => item.id === userId);
    if (!user) {
      throw new NotFoundException("用户不存在");
    }

    if (payload.membership) {
      user.membership = payload.membership;
    }

    if (payload.pointsDelta) {
      user.pointsBalance += payload.pointsDelta;
      database.pointLedgers.unshift({
        id: createId("ptl"),
        userId: user.id,
        changeType: "ADMIN_ADJUST",
        pointsDelta: payload.pointsDelta,
        balanceAfter: user.pointsBalance,
        description: "后台调整用户点数",
        createdAt: new Date().toISOString(),
      });
    }

    return {
      id: user.id,
      mobile: user.mobile,
      email: user.email,
      nickname: user.nickname,
      status: user.status,
      membership: user.membership,
      pointsBalance: user.pointsBalance,
      brandCount: database.brands.filter((item) => item.ownerUserId === user.id).length,
      taskCount: database.tasks.filter((item) => item.userId === user.id).length,
      orderCount: database.orders.filter((item) => item.userId === user.id).length,
      createdAt: "2026-04-30T10:00:00.000Z",
      updatedAt: new Date().toISOString(),
    };
  }
}
