"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { login, readAuthSession } from "../../../services/auth";
import { AuthShell } from "../../../components/auth-shell";

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
      // #region debug-point A:login-submit-start
      fetch("http://127.0.0.1:7777/event", { method: "POST", body: JSON.stringify({ sessionId: "login-stuck", runId: "pre-fix", hypothesisId: "A", location: "login/page.tsx:45", msg: "[DEBUG] login submit started", data: { nextPath, account: account.trim(), hasPassword: Boolean(password) }, ts: Date.now() }) }).catch(() => {});
      // #endregion
      await login({
        account: account.trim(),
        password,
      });
      // #region debug-point C:login-submit-success
      fetch("http://127.0.0.1:7777/event", { method: "POST", body: JSON.stringify({ sessionId: "login-stuck", runId: "pre-fix", hypothesisId: "C", location: "login/page.tsx:51", msg: "[DEBUG] login resolved before router replace", data: { nextPath }, ts: Date.now() }) }).catch(() => {});
      // #endregion
      router.replace(nextPath);
    } catch (error) {
      // #region debug-point B:login-submit-error
      fetch("http://127.0.0.1:7777/event", { method: "POST", body: JSON.stringify({ sessionId: "login-stuck", runId: "pre-fix", hypothesisId: "B", location: "login/page.tsx:55", msg: "[DEBUG] login rejected", data: { message: error instanceof Error ? error.message : String(error) }, ts: Date.now() }) }).catch(() => {});
      // #endregion
      setErrorMessage(error instanceof Error ? error.message : "登录失败，请稍后重试");
    } finally {
      // #region debug-point E:login-submit-finally
      fetch("http://127.0.0.1:7777/event", { method: "POST", body: JSON.stringify({ sessionId: "login-stuck", runId: "pre-fix", hypothesisId: "E", location: "login/page.tsx:59", msg: "[DEBUG] login finally reached", data: { nextPath }, ts: Date.now() }) }).catch(() => {});
      // #endregion
      setIsSubmitting(false);
    }
  }

  return (
    <AuthShell
      badge="统一账号入口"
      title="登录后直接进入你的增长工作台"
      description="保持首页同一品牌调性，把账号、品牌切换、任务隔离和目标页面跳转统一收口到一个入口。"
      highlights={[
        { title: "统一身份", description: "同一个账号进入个人中心、品牌协作和内容工作台。" },
        { title: "目标回跳", description: "登录成功后自动回到你原本想进入的页面，不重新找入口。" },
        { title: "品牌隔离", description: "登录态和品牌上下文分层管理，减少多人协作时的串页风险。" },
      ]}
      footer={
        <div className="auth-footnote">
          还没有账号？<Link href={`/register?next=${encodeURIComponent(nextPath)}`}>去注册</Link>
        </div>
      }
    >
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
        <button type="submit" className="primary-button auth-panel-submit" disabled={isSubmitting}>
          {isSubmitting ? "登录中..." : "登录并进入工作台"}
        </button>
      </form>
    </AuthShell>
  );
}

function resolveNextPath(value: string | null) {
  if (!value || !value.startsWith("/")) {
    return "/personal-center";
  }
  return value;
}
