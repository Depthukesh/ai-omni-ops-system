"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { readAuthSession, register } from "../../../services/auth";
import { AuthShell } from "../../../components/auth-shell";

export default function RegisterPage() {
  const router = useRouter();
  const [nextPath, setNextPath] = useState("/personal-center");
  const [isRouteReady, setIsRouteReady] = useState(false);
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
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

  const normalizedEmail = useMemo(() => email.trim().toLowerCase(), [email]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!mobile.trim() || !/^1\d{10}$/.test(mobile.trim())) {
      setErrorMessage("请输入正确的手机号");
      return;
    }
    if (!normalizedEmail) {
      setErrorMessage("请输入邮箱");
      return;
    }
    if (!inviteCode.trim()) {
      setErrorMessage("请输入邀请码");
      return;
    }
    if (!password || password.length < 6) {
      setErrorMessage("密码至少 6 位");
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage("两次输入的密码不一致");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");
    try {
      await register({
        mobile: mobile.trim(),
        email: normalizedEmail,
        inviteCode: inviteCode.trim(),
        password,
        nickname: nickname.trim() || undefined,
      });
      router.replace(nextPath);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "注册失败，请稍后重试");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthShell
      badge="邀请码注册"
      title="把品牌协作、任务与资产统一接入一个账号体系"
      description="注册页沿用首页的品牌语言，但收口为更清晰的准入流程，保证用户第一次进入系统就知道规则。"
      highlights={[
        { title: "邀请码准入", description: "当前账号体系按邀请码开放，先保证品牌成员和协作边界明确。" },
        { title: "一次注册直达", description: "通过校验后直接进入工作台，不需要再重复登录。" },
        { title: "账号可持续扩展", description: "后续会员、积分、任务和团队页都会继续使用同一账户体系。" },
      ]}
      footer={
        <div className="auth-footnote">
          已有账号？<Link href={`/login?next=${encodeURIComponent(nextPath)}`}>去登录</Link>
        </div>
      }
    >
      <div className="panel-header">
        <div>
          <h1>注册</h1>
          <p className="panel-subtext">手机号和邀请码必填。邀请码验证通过后即可完成注册并直接进入个人中心工作区。</p>
        </div>
      </div>
      <form className="form-grid" onSubmit={handleSubmit}>
        <label className="field">
          <span>手机号</span>
          <input
            value={mobile}
            onChange={(event) => setMobile(event.target.value)}
            placeholder="请输入 11 位手机号"
            autoComplete="tel"
          />
        </label>
        <label className="field">
          <span>邮箱</span>
          <input
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              setErrorMessage("");
            }}
            placeholder="请输入常用邮箱"
            autoComplete="email"
          />
        </label>
        <label className="field">
          <span>邀请码</span>
          <input
            value={inviteCode}
            onChange={(event) => setInviteCode(event.target.value)}
            placeholder="请输入 6 位邀请码"
            autoComplete="off"
            spellCheck={false}
          />
        </label>
        <label className="field">
          <span>昵称</span>
          <input
            value={nickname}
            onChange={(event) => setNickname(event.target.value)}
            placeholder="可选，不填则系统自动生成"
            autoComplete="nickname"
          />
        </label>
        <label className="field">
          <span>密码</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="至少 6 位"
            autoComplete="new-password"
          />
        </label>
        <label className="field">
          <span>确认密码</span>
          <input
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            placeholder="请再次输入密码"
            autoComplete="new-password"
          />
        </label>
        <p className="field-hint">当前注册采用邀请码准入，邀请码一次性使用；没有邀请码的账号无法注册。</p>
        {errorMessage ? <p className="error-text">{errorMessage}</p> : null}
        <button type="submit" className="primary-button auth-panel-submit" disabled={isSubmitting}>
          {isSubmitting ? "注册中..." : "完成注册并进入工作台"}
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
