import Link from "next/link";
import type { ReactNode } from "react";

type AuthShellHighlight = {
  title: string;
  description: string;
};

type AuthShellProps = {
  badge: string;
  title: string;
  description: string;
  highlights: AuthShellHighlight[];
  children: ReactNode;
  footer?: ReactNode;
};

export function AuthShell({ badge, title, description, highlights, children, footer }: AuthShellProps) {
  return (
    <main className="auth-shell">
      <div className="auth-shell-grid">
        <section className="auth-brand-panel">
          <div className="auth-brand-top">
            <Link href="/" className="auth-brand-link">
              <span className="auth-brand-badge">17</span>
              <span className="auth-brand-copy">
                <strong>17ai.site</strong>
                <span>品牌 / 门店全域增长智能体</span>
              </span>
            </Link>
            <span className="auth-kicker">{badge}</span>
          </div>

          <div>
            <h1>{title}</h1>
            {description ? <p className="auth-brand-description">{description}</p> : null}
          </div>

          <div className="auth-highlight-list">
            {highlights.map((item) => (
              <article key={item.title} className="auth-highlight-item">
                <strong>{item.title}</strong>
                <span>{item.description}</span>
              </article>
            ))}
          </div>
        </section>

        <section className="auth-form-panel">
          <div className="auth-form-surface">
            {children}
            {footer}
          </div>
        </section>
      </div>
    </main>
  );
}
