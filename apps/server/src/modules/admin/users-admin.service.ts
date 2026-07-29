import { randomBytes, scryptSync } from "node:crypto";
import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { MembershipLevel, Prisma, SystemRole, UserStatus } from "@prisma/client";
import { createId, database } from "../../common/mock-data";
import { PrismaService } from "../../prisma/prisma.service";

export type AdminUserListQuery = {
  keyword?: string;
  membership?: "ALL" | "FREE" | "BASIC" | "PRO" | "ENTERPRISE";
  status?: "ALL" | "ACTIVE" | "DISABLED";
  systemRole?: "ALL" | "USER" | "SUPER_ADMIN" | "ADMIN_OPERATOR" | "FINANCE_OPERATOR" | "SUPPORT_OPERATOR";
  emailVerified?: "ALL" | "VERIFIED" | "UNVERIFIED";
};

export type AdminUserRecord = {
  id: string;
  mobile: string;
  email: string;
  nickname: string;
  avatarUrl: string;
  status: "ACTIVE" | "DISABLED";
  membership: "FREE" | "BASIC" | "PRO" | "ENTERPRISE";
  systemRole: "USER" | "SUPER_ADMIN" | "ADMIN_OPERATOR" | "FINANCE_OPERATOR" | "SUPPORT_OPERATOR";
  emailVerified: boolean;
  pointsBalance: number;
  brandCount: number;
  taskCount: number;
  orderCount: number;
  sessionCount: number;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string;
};

export type AdminUserDetailRecord = AdminUserRecord & {
  brandItems: Array<{
    id: string;
    brandName: string;
    relation: "OWNER" | "MEMBER";
    role: string;
  }>;
};

export type DeleteAdminUserResult = {
  id: string;
  nickname: string;
  mobile: string;
};

export type UpdateAdminUserPayload = {
  nickname?: string;
  mobile?: string;
  email?: string;
  avatarUrl?: string;
  status?: "ACTIVE" | "DISABLED";
  membership?: "FREE" | "BASIC" | "PRO" | "ENTERPRISE";
  systemRole?: "USER" | "SUPER_ADMIN" | "ADMIN_OPERATOR" | "FINANCE_OPERATOR" | "SUPPORT_OPERATOR";
  pointsBalance?: number;
  emailVerified?: boolean;
  password?: string;
};

type DatabaseUserListItem = Prisma.UserGetPayload<{
  include: {
    _count: {
      select: {
        tasks: true;
        orders: true;
      };
    };
    sessions: {
      select: {
        revokedAt: true;
        expiresAt: true;
      };
    };
    brands: {
      select: {
        id: true;
      };
    };
    brandMemberships: {
      select: {
        brandId: true;
      };
    };
  };
}>;

type DatabaseUserDetailItem = Prisma.UserGetPayload<{
  include: {
    _count: {
      select: {
        tasks: true;
        orders: true;
      };
    };
    sessions: {
      select: {
        revokedAt: true;
        expiresAt: true;
      };
    };
    brands: {
      select: {
        id: true;
        brandName: true;
      };
    };
    brandMemberships: {
      select: {
        brandId: true;
        role: true;
        brand: {
          select: {
            id: true;
            brandName: true;
          };
        };
      };
    };
  };
}>;

@Injectable()
export class UsersAdminService {
  constructor(private readonly prismaService: PrismaService) {}

  async listUsers(query: AdminUserListQuery = {}) {
    if (await this.prismaService.canUseDatabase()) {
      const users = await this.prismaService.user.findMany({
        where: this.buildDatabaseUserWhere(query),
        orderBy: { updatedAt: "desc" },
        include: {
          _count: {
            select: {
              tasks: true,
              orders: true,
            },
          },
          sessions: {
            select: {
              revokedAt: true,
              expiresAt: true,
            },
          },
          brands: {
            select: {
              id: true,
            },
          },
          brandMemberships: {
            select: {
              brandId: true,
            },
          },
        },
      });

      return users.map((user) => this.toAdminUserRecordFromDatabase(user));
    }

    return database.users
      .filter((user) => this.matchesSeedUserQuery(user, query))
      .map((user) => this.toAdminUserRecordFromSeed(user));
  }

  async getUserDetail(userId: string) {
    if (await this.prismaService.canUseDatabase()) {
      const user = await this.prismaService.user.findUnique({
        where: { id: userId },
        include: {
          _count: {
            select: {
              tasks: true,
              orders: true,
            },
          },
          sessions: {
            select: {
              revokedAt: true,
              expiresAt: true,
            },
          },
          brands: {
            select: {
              id: true,
              brandName: true,
            },
          },
          brandMemberships: {
            select: {
              brandId: true,
              role: true,
              brand: {
                select: {
                  id: true,
                  brandName: true,
                },
              },
            },
          },
        },
      });

      if (!user) {
        throw new NotFoundException("用户不存在");
      }

      return this.toAdminUserDetailFromDatabase(user);
    }

    const user = database.users.find((item) => item.id === userId);
    if (!user) {
      throw new NotFoundException("用户不存在");
    }

    return this.toAdminUserDetailFromSeed(user);
  }

  async updateUser(userId: string, payload: UpdateAdminUserPayload) {
    const normalized = this.normalizeUpdatePayload(payload);
    this.assertUpdatePayload(normalized);

    if (await this.prismaService.canUseDatabase()) {
      const user = await this.prismaService.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new NotFoundException("用户不存在");
      }

      if (normalized.mobile && normalized.mobile !== user.mobile) {
        const exists = await this.prismaService.user.findFirst({
          where: {
            mobile: normalized.mobile,
            NOT: { id: userId },
          },
          select: { id: true },
        });
        if (exists) {
          throw new ConflictException("该手机号已被其他账号使用");
        }
      }

      if (normalized.email !== undefined && normalized.email !== (user.email ?? "")) {
        if (normalized.email) {
          const exists = await this.prismaService.user.findFirst({
            where: {
              email: normalized.email,
              NOT: { id: userId },
            },
            select: { id: true },
          });
          if (exists) {
            throw new ConflictException("该邮箱已被其他账号使用");
          }
        }
      }

      const nextPointsBalance = normalized.pointsBalance ?? user.pointsBalance;
      const pointsDelta = nextPointsBalance - user.pointsBalance;
      const nextEmail = normalized.email !== undefined ? normalized.email || null : user.email;
      const emailChanged = normalized.email !== undefined && (normalized.email || null) !== user.email;
      const nextEmailVerifiedAt =
        normalized.emailVerified === true
          ? new Date()
          : normalized.emailVerified === false
            ? null
            : emailChanged
              ? null
              : undefined;

      if (normalized.emailVerified === true && !nextEmail) {
        throw new BadRequestException("需要先填写邮箱，才能标记为已验证");
      }

      const updated = await this.prismaService.$transaction(async (tx) => {
        const nextUser = await tx.user.update({
          where: { id: userId },
          data: {
            nickname: normalized.nickname,
            mobile: normalized.mobile,
            email: normalized.email !== undefined ? normalized.email || null : undefined,
            avatarUrl: normalized.avatarUrl !== undefined ? normalized.avatarUrl || null : undefined,
            status: normalized.status ? (normalized.status as UserStatus) : undefined,
            membership: normalized.membership ? (normalized.membership as MembershipLevel) : undefined,
            systemRole: normalized.systemRole ? (normalized.systemRole as SystemRole) : undefined,
            pointsBalance: normalized.pointsBalance !== undefined ? nextPointsBalance : undefined,
            emailVerifiedAt: nextEmailVerifiedAt,
            passwordHash: normalized.password ? this.hashPassword(normalized.password) : undefined,
          },
        });

        if (pointsDelta !== 0) {
          await tx.pointLedger.create({
            data: {
              userId: userId,
              changeType: "ADMIN_ADJUST",
              pointsDelta,
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
              tasks: true,
              orders: true,
            },
          },
          sessions: {
            select: {
              revokedAt: true,
              expiresAt: true,
            },
          },
          brands: {
            select: {
              id: true,
              brandName: true,
            },
          },
          brandMemberships: {
            select: {
              brandId: true,
              role: true,
              brand: {
                select: {
                  id: true,
                  brandName: true,
                },
              },
            },
          },
        },
      });

      if (!counts) {
        throw new NotFoundException("用户不存在");
      }

      return this.toAdminUserDetailFromDatabase({
        ...counts,
        ...updated,
      });
    }

    const user = database.users.find((item) => item.id === userId);
    if (!user) {
      throw new NotFoundException("用户不存在");
    }

    if (normalized.mobile && normalized.mobile !== user.mobile && database.users.some((item) => item.id !== userId && item.mobile === normalized.mobile)) {
      throw new ConflictException("该手机号已被其他账号使用");
    }

    if (
      normalized.email !== undefined &&
      normalized.email &&
      normalized.email !== user.email &&
      database.users.some((item) => item.id !== userId && item.email === normalized.email)
    ) {
      throw new ConflictException("该邮箱已被其他账号使用");
    }

    const nextPointsBalance = normalized.pointsBalance ?? user.pointsBalance;
    const pointsDelta = nextPointsBalance - user.pointsBalance;
    const emailChanged = normalized.email !== undefined && normalized.email !== user.email;
    const nextEmail = normalized.email !== undefined ? normalized.email : user.email;

    if (normalized.emailVerified === true && !nextEmail) {
      throw new BadRequestException("需要先填写邮箱，才能标记为已验证");
    }

    if (normalized.nickname !== undefined) {
      user.nickname = normalized.nickname;
    }
    if (normalized.mobile !== undefined) {
      user.mobile = normalized.mobile;
    }
    if (normalized.email !== undefined) {
      user.email = normalized.email;
    }
    if (normalized.avatarUrl !== undefined) {
      user.avatarUrl = normalized.avatarUrl || undefined;
    }
    if (normalized.status) {
      user.status = normalized.status;
    }
    if (normalized.membership) {
      user.membership = normalized.membership;
    }
    if (normalized.systemRole) {
      user.systemRole = normalized.systemRole;
    }
    if (normalized.password) {
      user.password = normalized.password;
    }
    if (normalized.emailVerified === true) {
      user.emailVerifiedAt = new Date().toISOString();
    } else if (normalized.emailVerified === false || emailChanged) {
      user.emailVerifiedAt = undefined;
    }

    if (normalized.pointsBalance !== undefined) {
      user.pointsBalance = nextPointsBalance;
    }

    if (pointsDelta !== 0) {
      database.pointLedgers.unshift({
        id: createId("ptl"),
        userId: user.id,
        changeType: "ADMIN_ADJUST",
        pointsDelta,
        balanceAfter: user.pointsBalance,
        description: "后台调整用户点数",
        createdAt: new Date().toISOString(),
      });
    }

    return this.toAdminUserDetailFromSeed(user);
  }

  async deleteUser(userId: string, operatorUserId: string) {
    if (userId === operatorUserId) {
      throw new BadRequestException("不能删除当前正在登录的后台账号");
    }

    if (await this.prismaService.canUseDatabase()) {
      const user = await this.prismaService.user.findUnique({
        where: { id: userId },
        include: {
          _count: {
            select: {
              brands: true,
            },
          },
        },
      });

      if (!user) {
        throw new NotFoundException("用户不存在");
      }

      if (user._count.brands > 0) {
        throw new BadRequestException("该账号仍拥有品牌，请先转移品牌归属后再删除");
      }

      await this.prismaService.user.delete({
        where: { id: userId },
      });

      return {
        id: user.id,
        nickname: user.nickname ?? "",
        mobile: user.mobile,
      };
    }

    const user = database.users.find((item) => item.id === userId);
    if (!user) {
      throw new NotFoundException("用户不存在");
    }

    if (database.brands.some((item) => item.ownerUserId === userId)) {
      throw new BadRequestException("该账号仍拥有品牌，请先转移品牌归属后再删除");
    }

    database.users = database.users.filter((item) => item.id !== userId);
    database.tasks = database.tasks.filter((item) => item.userId !== userId);
    database.media = database.media.filter((item) => item.userId !== userId);
    database.pointLedgers = database.pointLedgers.filter((item) => item.userId !== userId);
    database.orders = database.orders.filter((item) => item.userId !== userId);

    return {
      id: user.id,
      nickname: user.nickname,
      mobile: user.mobile,
    };
  }

  private buildDatabaseUserWhere(query: AdminUserListQuery): Prisma.UserWhereInput {
    const where: Prisma.UserWhereInput = {};
    const keyword = query.keyword?.trim();
    if (keyword) {
      where.OR = [
        { mobile: { contains: keyword } },
        { email: { contains: keyword } },
        { nickname: { contains: keyword } },
      ];
    }

    if (query.membership && query.membership !== "ALL") {
      where.membership = query.membership as MembershipLevel;
    }

    if (query.status && query.status !== "ALL") {
      where.status = query.status as UserStatus;
    }

    if (query.systemRole && query.systemRole !== "ALL") {
      where.systemRole = query.systemRole as SystemRole;
    }

    if (query.emailVerified === "VERIFIED") {
      where.emailVerifiedAt = { not: null };
    } else if (query.emailVerified === "UNVERIFIED") {
      where.emailVerifiedAt = null;
    }

    return where;
  }

  private matchesSeedUserQuery(user: (typeof database.users)[number], query: AdminUserListQuery) {
    const keyword = query.keyword?.trim().toLowerCase();
    if (keyword) {
      const hit = [user.mobile, user.email, user.nickname].some((value) => value?.toLowerCase().includes(keyword));
      if (!hit) {
        return false;
      }
    }

    if (query.membership && query.membership !== "ALL" && user.membership !== query.membership) {
      return false;
    }

    if (query.status && query.status !== "ALL" && user.status !== query.status) {
      return false;
    }

    if (query.systemRole && query.systemRole !== "ALL" && (user.systemRole ?? "USER") !== query.systemRole) {
      return false;
    }

    if (query.emailVerified === "VERIFIED" && !user.emailVerifiedAt) {
      return false;
    }

    if (query.emailVerified === "UNVERIFIED" && user.emailVerifiedAt) {
      return false;
    }

    return true;
  }

  private toAdminUserRecordFromDatabase(user: DatabaseUserListItem): AdminUserRecord {
    const now = Date.now();
    const activeSessionCount = user.sessions.filter((item) => !item.revokedAt && item.expiresAt.getTime() > now).length;
    const brandCount = new Set([...user.brands.map((item) => item.id), ...user.brandMemberships.map((item) => item.brandId)]).size;

    return {
      id: user.id,
      mobile: user.mobile,
      email: user.email ?? "",
      nickname: user.nickname ?? "",
      avatarUrl: user.avatarUrl ?? "",
      status: user.status,
      membership: user.membership,
      systemRole: user.systemRole,
      emailVerified: Boolean(user.emailVerifiedAt),
      pointsBalance: user.pointsBalance,
      brandCount,
      taskCount: user._count.tasks,
      orderCount: user._count.orders,
      sessionCount: activeSessionCount,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
      lastLoginAt: user.lastLoginAt?.toISOString() ?? "",
    };
  }

  private toAdminUserDetailFromDatabase(user: DatabaseUserDetailItem): AdminUserDetailRecord {
    const base = this.toAdminUserRecordFromDatabase(user);
    const brandItems = [
      ...user.brands.map((brand) => ({
        id: brand.id,
        brandName: brand.brandName,
        relation: "OWNER" as const,
        role: "OWNER",
      })),
      ...user.brandMemberships
        .filter((item) => !user.brands.some((brand) => brand.id === item.brandId))
        .map((item) => ({
          id: item.brand.id,
          brandName: item.brand.brandName,
          relation: "MEMBER" as const,
          role: item.role,
        })),
    ];

    return {
      ...base,
      brandItems,
    };
  }

  private toAdminUserRecordFromSeed(user: (typeof database.users)[number]): AdminUserRecord {
    const brandIds = new Set(database.brands.filter((item) => item.ownerUserId === user.id).map((item) => item.id));

    return {
      id: user.id,
      mobile: user.mobile,
      email: user.email,
      nickname: user.nickname,
      avatarUrl: user.avatarUrl ?? "",
      status: user.status,
      membership: user.membership,
      systemRole: user.systemRole ?? "USER",
      emailVerified: Boolean(user.emailVerifiedAt),
      pointsBalance: user.pointsBalance,
      brandCount: brandIds.size,
      taskCount: database.tasks.filter((item) => item.userId === user.id).length,
      orderCount: database.orders.filter((item) => item.userId === user.id).length,
      sessionCount: 0,
      createdAt: "2026-04-30T10:00:00.000Z",
      updatedAt: new Date().toISOString(),
      lastLoginAt: "",
    };
  }

  private toAdminUserDetailFromSeed(user: (typeof database.users)[number]): AdminUserDetailRecord {
    const base = this.toAdminUserRecordFromSeed(user);
    const brandItems = database.brands
      .filter((item) => item.ownerUserId === user.id)
      .map((item) => ({
        id: item.id,
        brandName: item.brandName,
        relation: "OWNER" as const,
        role: "OWNER",
      }));

    return {
      ...base,
      brandItems,
    };
  }

  private normalizeUpdatePayload(payload: UpdateAdminUserPayload) {
    return {
      nickname: payload.nickname?.trim(),
      mobile: payload.mobile?.trim(),
      email: payload.email !== undefined ? payload.email.trim() : undefined,
      avatarUrl: payload.avatarUrl !== undefined ? payload.avatarUrl.trim() : undefined,
      status: payload.status,
      membership: payload.membership,
      systemRole: payload.systemRole,
      pointsBalance: payload.pointsBalance,
      emailVerified: payload.emailVerified,
      password: payload.password?.trim(),
    };
  }

  private assertUpdatePayload(payload: ReturnType<UsersAdminService["normalizeUpdatePayload"]>) {
    if (payload.nickname !== undefined && payload.nickname.length === 0) {
      throw new BadRequestException("用户名不能为空");
    }

    if (payload.mobile !== undefined && !/^1\d{10}$/.test(payload.mobile)) {
      throw new BadRequestException("手机号格式不正确");
    }

    if (
      payload.email !== undefined &&
      payload.email.length > 0 &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)
    ) {
      throw new BadRequestException("邮箱格式不正确");
    }

    if (payload.pointsBalance !== undefined && (!Number.isInteger(payload.pointsBalance) || payload.pointsBalance < 0)) {
      throw new BadRequestException("积分余额必须是大于等于 0 的整数");
    }

    if (payload.password !== undefined && payload.password.length > 0 && payload.password.length < 6) {
      throw new BadRequestException("密码至少需要 6 位");
    }
  }

  private hashPassword(password: string) {
    const salt = randomBytes(16).toString("hex");
    const derived = scryptSync(password, salt, 64).toString("hex");
    return `scrypt$${salt}$${derived}`;
  }
}
