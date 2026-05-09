import { UnauthorizedException } from "@nestjs/common";
import { SystemRole } from "@prisma/client";
import { AuthService } from "../auth/auth.service";

export type AdminSystemRole = "SUPER_ADMIN" | "ADMIN_OPERATOR" | "FINANCE_OPERATOR" | "SUPPORT_OPERATOR";

export const ADMIN_ROLE_GROUPS = {
  allAdmin: [
    SystemRole.SUPER_ADMIN,
    SystemRole.ADMIN_OPERATOR,
    SystemRole.FINANCE_OPERATOR,
    SystemRole.SUPPORT_OPERATOR,
  ] as AdminSystemRole[],
  operatorWrite: [SystemRole.SUPER_ADMIN, SystemRole.ADMIN_OPERATOR] as AdminSystemRole[],
  financeWrite: [SystemRole.SUPER_ADMIN, SystemRole.FINANCE_OPERATOR] as AdminSystemRole[],
  supportRead: [SystemRole.SUPER_ADMIN, SystemRole.ADMIN_OPERATOR, SystemRole.SUPPORT_OPERATOR] as AdminSystemRole[],
  orderAdminRead: [
    SystemRole.SUPER_ADMIN,
    SystemRole.ADMIN_OPERATOR,
    SystemRole.FINANCE_OPERATOR,
    SystemRole.SUPPORT_OPERATOR,
  ] as AdminSystemRole[],
} as const;

export async function requireAdminRoles(
  authService: AuthService,
  headers: Record<string, string | string[] | undefined>,
  allowedRoles: readonly AdminSystemRole[],
) {
  const auth = await authService.resolveRequestAuthContext(headers);
  if (!auth?.userId) {
    throw new UnauthorizedException("请先登录后台账号");
  }

  const role = auth.systemRole;
  if (!role || role === "USER" || !allowedRoles.includes(role as AdminSystemRole)) {
    throw new UnauthorizedException("当前后台角色无权访问该能力");
  }

  return auth;
}
