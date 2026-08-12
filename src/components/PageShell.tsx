import { Link } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import type { ReactNode } from "react";
import { AppNavigation } from "./AppNavigation";
import { BrandLogo } from "./BrandLogo";

export function PageShell({
  title,
  subtitle,
  back,
  actions,
  children,
  wide = true,
}: {
  title: string;
  subtitle?: string;
  back?: string;
  actions?: ReactNode;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="app-frame">
      <AppNavigation />
      <div className="app-content">
        <div className={wide ? "page-container" : "page-container page-container-narrow"}>
          <header className="page-header">
            <div className="flex min-w-0 items-center gap-3">
              {back && (
                <Link
                  to={back}
                  className="icon-button"
                  aria-label="ย้อนกลับ"
                >
                  <ChevronLeft size={19} />
                </Link>
              )}
              <div className="min-w-0">
                <p className="page-kicker">DAY NERAMIT OPERATIONS</p>
                <h1 className="page-title">{title}</h1>
                {subtitle && <p className="page-subtitle">{subtitle}</p>}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {actions}
              <BrandLogo size={44} className="rounded-xl border border-gold/20 lg:hidden" />
            </div>
          </header>
          <main className="page-main">{children}</main>
        </div>
      </div>
    </div>
  );
}
