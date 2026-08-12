import { Link, useRouterState } from "@tanstack/react-router";
import {
  CalendarDays, ClipboardCheck, FileText, LayoutDashboard, ListChecks,
  ReceiptText, Settings, Users, BriefcaseBusiness, PackageSearch,
  Bot, ShieldCheck, ChartNoAxesCombined, WalletCards,
} from "lucide-react";
import { BrandLogo } from "./BrandLogo";

type AppRoute = "/" | "/bookings" | "/customers" | "/surveys" | "/quotations" | "/jobs" | "/documents" | "/checklist" | "/settings" | "/materials" | "/engineering" | "/finance" | "/warranty" | "/reports";
type NavItem = { to: AppRoute; label: string; icon: typeof LayoutDashboard; badge?: string };

const primaryItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/bookings", label: "Booking", icon: CalendarDays },
  { to: "/customers", label: "Customer", icon: Users },
  { to: "/surveys", label: "สำรวจหน้างาน", icon: ClipboardCheck },
  { to: "/quotations", label: "Quotation", icon: ReceiptText },
  { to: "/jobs", label: "Job", icon: BriefcaseBusiness },
] as const satisfies readonly NavItem[];

const intelligenceItems = [
  { to: "/materials", label: "Material Intelligence", icon: PackageSearch, badge: "NEW" },
  { to: "/engineering", label: "AI Engineering", icon: Bot, badge: "PRO" },
] as const satisfies readonly NavItem[];

const secondaryItems = [
  { to: "/finance", label: "Receipt / Payment", icon: WalletCards },
  { to: "/warranty", label: "Warranty", icon: ShieldCheck },
  { to: "/reports", label: "Report & KPI", icon: ChartNoAxesCombined },
  { to: "/documents", label: "เอกสาร", icon: FileText },
  { to: "/checklist", label: "Checklist", icon: ListChecks },
  { to: "/settings", label: "ตั้งค่า", icon: Settings },
] as const satisfies readonly NavItem[];

function NavLink({ to, label, icon: Icon, compact = false, badge }: NavItem & { compact?: boolean }) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const active = to === "/" ? pathname === "/" : pathname === to || pathname.startsWith(`${to}/`);
  return <Link to={to} className={compact ? `nav-mobile-item ${active ? "is-active" : ""}` : `nav-rail-item ${active ? "is-active" : ""}`} aria-current={active ? "page" : undefined}>
    <Icon size={compact ? 20 : 18} strokeWidth={1.8} aria-hidden="true" />
    <span>{label}</span>{badge && !compact && <em className="ml-auto rounded-md bg-gold px-1.5 py-0.5 text-[9px] not-italic text-black">{badge}</em>}
  </Link>;
}

export function AppNavigation() {
  return <>
    <aside className="app-sidebar hidden lg:flex">
      <div className="brand-panel"><BrandLogo size={74} className="brand-panel-logo"/><div className="min-w-0"><p className="brand-panel-name">DAY NERAMIT</p><p className="brand-panel-tagline">SMART REPAIR & RENOVATION</p></div></div>
      <nav className="mt-7 space-y-1" aria-label="เมนูหลัก">{primaryItems.map(item=><NavLink key={item.to} {...item}/>)}</nav>
      <div className="nav-rail-separator"/><nav className="space-y-1" aria-label="ระบบอัจฉริยะ">{intelligenceItems.map(item=><NavLink key={item.to} {...item}/>)}</nav>
      <div className="nav-rail-separator"/><nav className="space-y-1 overflow-y-auto" aria-label="เมนูรอง">{secondaryItems.map(item=><NavLink key={item.to} {...item}/>)}</nav>
      <Link to="/engineering" className="ai-mode-card mt-auto"><span className="ai-mode-kicker">AI POWERED</span><strong>จอมยุทธ์ Mode</strong><span>Evidence-First Engineering</span></Link>
    </aside>
    <nav className="mobile-bottom-nav lg:hidden" aria-label="เมนูมือถือ">{[primaryItems[0],primaryItems[1],primaryItems[3],primaryItems[5],intelligenceItems[1]].map(item=><NavLink key={item.to} {...item} compact/>)}</nav>
  </>;
}
