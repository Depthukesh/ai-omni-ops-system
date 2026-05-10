"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { login, readAuthSession } from "../../../services/auth";

export default function LoginPage() {
  const router = useRouter();
  const [nextPath, setNextPath] = useState("/personal-center");
  const [isRouteReady, setIsRouteReady] = useState(false);
  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const next = new URLSearchParams(window.location.search).get("next");
      setNextPath(resolveNextPath(next));
    }
    setIsRouteReady(true);
  }, []);

  useEffect(() => {
    if (!isRouteReady) {
      return;
    }
    if (readAuthSession()?.accessToken) {
      router.replace(nextPath);
    }
  }, [isRouteReady, nextPath, router]);

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
      router.replace(nextPath);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "登录失败，请稍后重试");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="page-shell">
      <section className="panel" style={{ maxWidth: 440, margin: "48px auto", width: "100%" }}>
        <div className="panel-header">
          <div>
            <h1>登录</h1>
            <p className="panel-subtext">接入真实多用户登录态，支持个人中心、品牌切换和任务隔离。</p>
          </div>
        </div>
        <form className="form-grid" onSubmit={handleSubmit}>
          <label className="field">
            <span>账号</span>
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
          <button type="submit" className="primary-button" disabled={isSubmitting}>
            {isSubmitting ? "登录中..." : "登录并进入工作台"}
          </button>
        </form>
        <div className="auth-footnote">
          还没有账号？<Link href={`/?mode=register&next=${encodeURIComponent(nextPath)}`}>去注册</Link>
        </div>
      </section>
    </main>
  );
}

function resolveNextPath(value: string | null) {
  if (!value || !value.startsWith("/")) {
    return "/personal-center";
  }
  return value;
}
