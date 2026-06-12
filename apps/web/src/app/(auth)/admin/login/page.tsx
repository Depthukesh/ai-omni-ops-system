"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getMe, login, logout as logoutSession, readAuthSession } from "../../../../services/auth";
import { AuthShell } from "../../../../components/auth-shell";

const ADMIN_LOGIN_ROLES = new Set(["SUPER_ADMIN", "ADMIN_OPERATOR", "FINANCE_OPERATOR", "SUPPORT_OPERATOR"]);

export default function AdminLoginPage() {
  const router = useRouter();
  const [nextPath, setNextPath] = useState("/admin");
  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const next = new URLSearchParams(window.location.search).get("next");
      setNextPath(resolveNextPath(next));
    }

    if (readAuthSession()?.accessToken) {
      void verifyExistingAdmin();
    }
  }, []);

  async function verifyExistingAdmin() {
    try {
      const result = await getMe();
      if (ADMIN_LOGIN_ROLES.has(result.user.systemRole)) {
        router.replace(nextPath);
        return;
      }
      await logoutSession();
    } catch {
      await logoutSession();
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!account.trim() || !password) {
      setErrorMessage("请输入账号和密码");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");
    try {
      await login({
        account: account.trim(),
        password,
      });
      const result = await getMe();
      if (!ADMIN_LOGIN_ROLES.has(result.user.systemRole)) {
        await logoutSession();
        setErrorMessage("当前账号不是后台管理员角色，不能进入后台管理台");
        return;
      }
      router.replace(nextPath);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "后台登录失败，请稍后重试");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthShell
      badge="后台管理入口"
      title="后台继续保持高权限入口，但风格回到同一品牌系统"
      description="管理员登录页不做营销化包装，只统一品牌语言、信息层级和交互反馈，让前后台从入口开始就是同一套系统。"
      highlights={[
        { title: "角色校验", description: "仅允许后台角色进入管理台，避免普通账号误入后台。" },
        { title: "前后台分层", description: "前台用户体验统一，后台权限边界继续独立收口。" },
        { title: "后续统一壳层", description: "下一阶段后台管理页会继续按同一视觉基线收口。" },
      ]}
    >
      <div className="panel-header">
        <div>
          <h1>后台管理员登录</h1>
          <p className="panel-subtext">允许 `SUPER_ADMIN`、`ADMIN_OPERATOR`、`FINANCE_OPERATOR`、`SUPPORT_OPERATOR` 进入后台管理台。</p>
        </div>
      </div>
      <form className="form-grid" onSubmit={handleSubmit}>
        <label className="field">
          <span>管理员账号</span>
          <input
            value={account}
            onChange={(event) => setAccount(event.target.value)}
            placeholder="手机号 / 邮箱 / 昵称"
            autoComplete="username"
          />
        </label>
        <label className="field">
          <span>密码</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="请输入密码"
            autoComplete="current-password"
          />
        </label>
        {errorMessage ? <p className="error-text">{errorMessage}</p> : null}
        <button type="submit" className="primary-button auth-panel-submit" disabled={isSubmitting}>
          {isSubmitting ? "登录中..." : "登录后台管理台"}
        </button>
      </form>
    </AuthShell>
  );
}

function resolveNextPath(value: string | null) {
  if (!value || !value.startsWith("/admin")) {
    return "/admin";
  }
  return value;
}
