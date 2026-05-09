"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { readAuthSession, register, sendRegisterEmailCode } from "../../../services/auth";

export default function RegisterPage() {
  const router = useRouter();
  const [nextPath, setNextPath] = useState("/personal-center");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [emailCode, setEmailCode] = useState("");
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");
  const [notice, setNotice] = useState("");
  const [devPreviewCode, setDevPreviewCode] = useState("");
  const [lastCodeEmail, setLastCodeEmail] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const next = new URLSearchParams(window.location.search).get("next");
      setNextPath(resolveNextPath(next));
    }

    if (readAuthSession()?.accessToken) {
      router.replace(nextPath);
    }
  }, [nextPath, router]);

  useEffect(() => {
    if (countdown <= 0) {
      return undefined;
    }
    const timer = window.setTimeout(() => {
      setCountdown((value) => Math.max(0, value - 1));
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [countdown]);

  const normalizedEmail = useMemo(() => email.trim().toLowerCase(), [email]);

  useEffect(() => {
    if (!lastCodeEmail) {
      return;
    }
    if (normalizedEmail === lastCodeEmail) {
      return;
    }
    setDevPreviewCode("");
    setEmailCode("");
    setLastCodeEmail("");
  }, [lastCodeEmail, normalizedEmail]);

  async function handleSendCode() {
    if (!normalizedEmail) {
      setErrorMessage("请先输入邮箱");
      return;
    }
    setIsSendingCode(true);
    setErrorMessage("");
    setNotice("");
    setDevPreviewCode("");
    try {
      const response = await sendRegisterEmailCode({
        email: normalizedEmail,
      });
      setNotice(response.message);
      setDevPreviewCode(response.devPreviewCode || "");
      setLastCodeEmail(response.email);
      if (response.devPreviewCode) {
        setEmailCode(response.devPreviewCode);
      }
      setCountdown(60);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "发送验证码失败，请稍后重试");
    } finally {
      setIsSendingCode(false);
    }
  }

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
    if (!emailCode.trim()) {
      setErrorMessage("请输入邮箱验证码");
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
    setNotice("");
    try {
      await register({
        mobile: mobile.trim(),
        email: normalizedEmail,
        emailCode: emailCode.trim(),
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
    <main className="page-shell">
      <section className="panel auth-panel" style={{ maxWidth: 520, margin: "48px auto", width: "100%" }}>
        <div className="panel-header">
          <div>
            <h1>注册</h1>
            <p className="panel-subtext">手机号必填，注册前需完成邮箱验证码校验。注册成功后直接进入个人中心工作区。</p>
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
            <span>邮箱验证码</span>
            <div className="inline-action-field">
              <input
                value={emailCode}
                onChange={(event) => setEmailCode(event.target.value)}
                placeholder="请输入 6 位验证码"
                inputMode="numeric"
                autoComplete="one-time-code"
              />
              <button type="button" className="secondary-button" onClick={() => void handleSendCode()} disabled={isSendingCode || countdown > 0}>
                {isSendingCode ? "发送中..." : countdown > 0 ? `${countdown}s 后重发` : "发送验证码"}
              </button>
            </div>
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
          {notice ? <p className="success-text">{notice}</p> : null}
          {devPreviewCode ? <p className="field-hint">开发态验证码：`{devPreviewCode}`，已自动填入当前邮箱的验证码输入框。</p> : null}
          {errorMessage ? <p className="error-text">{errorMessage}</p> : null}
          <button type="submit" className="primary-button" disabled={isSubmitting}>
            {isSubmitting ? "注册中..." : "完成注册并进入工作台"}
          </button>
        </form>
        <div className="auth-footnote">
          已有账号？<Link href={`/login?next=${encodeURIComponent(nextPath)}`}>去登录</Link>
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
