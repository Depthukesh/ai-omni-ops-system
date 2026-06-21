"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type MoreFeatureSectionItem = {
  key: "design" | "operations-prompt-center";
  label: string;
  href: string;
};

const MORE_FEATURE_SECTION_ITEMS: MoreFeatureSectionItem[] = [
  {
    key: "design",
    label: "设计",
    href: "/more-features/design",
  },
  {
    key: "operations-prompt-center",
    label: "运营提示词中心",
    href: "/more-features/operations-prompt-center",
  },
];

export function MoreFeaturesSectionSidebar() {
  const pathname = usePathname();

  return (
    <aside className="strategy-level-panel strategy-level-panel--directory">
      <div className="strategy-level-button-list">
        {MORE_FEATURE_SECTION_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.key}
              href={item.href}
              className={`strategy-level-button strategy-level-button--section ${isActive ? "is-active" : ""}`}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </aside>
  );
}
