"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getRegisterConfig, login, readAuthSession, register } from "../services/auth";

type AuthMode = "register" | "login";

export interface HomePageClientProps {
  initialMode: AuthMode;
  nextPath: string;
}

export function HomePageClient(props: HomePageClientProps) {
  const router = useRouter();
  const mode = props.initialMode;
  const nextPath = props.nextPath;
  const [account, setAccount] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [nickname, setNickname] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [inviteCodeRequired, setInviteCodeRequired] = useState(true);
  const normalizedEmail = useMemo(() => email.trim().toLowerCase(), [email]);

  useEffect(() => {
    if (readAuthSession()?.accessToken) {
      router.replace(nextPath);
    }
  }, [nextPath, router]);

  useEffect(() => {
    void getRegisterConfig().then((config) => {
      setInviteCodeRequired(config.inviteCodeRequired);
    }).catch(() => {
      setInviteCodeRequired(true);
    });
  }, []);

  useEffect(() => {
    setErrorMessage("");
  }, [mode]);

  async function handleLoginSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!account.trim() || !loginPassword) {
      setErrorMessage("请输入账号和密码");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");
    try {
      await login({
        account: account.trim(),
        password: loginPassword,
      });
      router.replace(nextPath);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "登录失败，请稍后重试");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRegisterSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!mobile.trim() || !/^1\d{10}$/.test(mobile.trim())) {
      setErrorMessage("请输入正确的手机号");
      return;
    }
    if (!normalizedEmail) {
      setErrorMessage("请输入邮箱");
      return;
    }
    if (inviteCodeRequired && !inviteCode.trim()) {
      setErrorMessage("请输入邀请码");
      return;
    }
    if (!registerPassword || registerPassword.length < 6) {
      setErrorMessage("密码至少 6 位");
      return;
    }
    if (registerPassword !== confirmPassword) {
      setErrorMessage("两次输入的密码不一致");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");
    try {
      await register({
        mobile: mobile.trim(),
        email: normalizedEmail,
        inviteCode: inviteCode.trim() || undefined,
        password: registerPassword,
        nickname: nickname.trim() || undefined,
      });
      router.replace(nextPath);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "注册失败，请稍后重试");
    } finally {
      setIsSubmitting(false);
    }
  }

  const registerHref = `/?mode=register&next=${encodeURIComponent(nextPath)}`;
  const loginHref = `/?mode=login&next=${encodeURIComponent(nextPath)}`;

  return (
    <main className="page-shell">
      <section className="panel auth-panel" style={{ maxWidth: 560, margin: "48px auto", width: "100%" }}>
        <div className="panel-header">
          <div>
            <span className="hero-badge">AI 全域运营系统</span>
            <h1>{mode === "register" ? (inviteCodeRequired ? "邀请制注册" : "开放注册") : "统一账号登录"}</h1>
            <p className="panel-subtext">
              {mode === "register"
                ? (inviteCodeRequired
                  ? "前台页面统一要求登录后访问。当前注册采用邀请码准入，邀请码验证通过后自动创建账号和默认品牌。"
                  : "当前运行态使用开放注册流程，注册成功后会自动创建默认品牌并进入工作台。")
                : "前台工作台统一使用同一套普通账号登录；后台管理台请使用管理员账号单独登录。"}
            </p>
          </div>
        </div>

        <div className="tab-switcher" aria-label="认证模式">
          <Link href={registerHref} className={`tab-button ${mode === "register" ? "is-active" : ""}`}>
            先注册
          </Link>
          <Link href={loginHref} className={`tab-button ${mode === "login" ? "is-active" : ""}`}>
            已有账号去登录
          </Link>
        </div>

        {mode === "register" ? (
          <form className="form-grid" onSubmit={handleRegisterSubmit}>
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
                onChange={(event) => setEmail(event.target.value)}
                placeholder="请输入常用邮箱"
                autoComplete="email"
              />
            </label>
            {inviteCodeRequired ? (
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
            ) : null}
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
                value={registerPassword}
                onChange={(event) => setRegisterPassword(event.target.value)}
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
            <p className="field-hint">
              {inviteCodeRequired ? "没有邀请码的用户无法注册；邀请码一次性使用，注册成功后下次可直接登录。" : "当前运行态使用开放注册流程。"}
            </p>
            {errorMessage ? <p className="error-text">{errorMessage}</p> : null}
            <button type="submit" className="primary-button" disabled={isSubmitting}>
              {isSubmitting ? "注册中..." : "完成注册并进入工作台"}
            </button>
          </form>
        ) : (
          <form className="form-grid" onSubmit={handleLoginSubmit}>
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
                value={loginPassword}
                onChange={(event) => setLoginPassword(event.target.value)}
                placeholder="请输入密码"
                autoComplete="current-password"
              />
            </label>
            {errorMessage ? <p className="error-text">{errorMessage}</p> : null}
            <button type="submit" className="primary-button" disabled={isSubmitting}>
              {isSubmitting ? "登录中..." : "登录并进入工作台"}
            </button>
          </form>
        )}

        <div className="auth-footnote">
          后台管理员请走 <Link href="/admin/login?next=%2Fadmin">后台登录入口</Link>
        </div>
      </section>
    </main>
  );
}
