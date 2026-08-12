import {
  FileEdit,
  ClipboardCheck,
  FileText,
  Wrench,
  Truck,
  CheckCircle2,
  XCircle,
  type LucideIcon,
} from "lucide-react";

export type JobStatus =
  | "draft"
  | "assessed"
  | "quoted"
  | "in_progress"
  | "delivered"
  | "completed"
  | "cancelled";

export const JOB_STATUS_META: Record<
  JobStatus,
  { label: string; icon: LucideIcon; className: string }
> = {
  draft:       { label: "ร่าง",         icon: FileEdit,      className: "bg-muted text-muted-foreground" },
  assessed:    { label: "ประเมินแล้ว",   icon: ClipboardCheck, className: "bg-blue-500/20 text-blue-300 border border-blue-500/40" },
  quoted:      { label: "เสนอราคาแล้ว",  icon: FileText,      className: "bg-purple-500/20 text-purple-300 border border-purple-500/40" },
  in_progress: { label: "กำลังทำ",      icon: Wrench,        className: "bg-yellow-500/20 text-yellow-300 border border-yellow-500/40" },
  delivered:   { label: "ส่งมอบแล้ว",    icon: Truck,         className: "bg-teal-500/20 text-teal-300 border border-teal-500/40" },
  completed:   { label: "เสร็จสิ้น",      icon: CheckCircle2,  className: "bg-green-500/20 text-green-300 border border-green-500/40" },
  cancelled:   { label: "ยกเลิก",       icon: XCircle,       className: "bg-red-500/20 text-red-300 border border-red-500/40" },
};

export function StatusBadge({ status, size = "sm" }: { status?: string | null; size?: "sm" | "md" }) {
  const key = (status ?? "draft") as JobStatus;
  const meta = JOB_STATUS_META[key] ?? JOB_STATUS_META.draft;
  const Icon = meta.icon;
  const pad = size === "md" ? "px-2.5 py-1 text-xs" : "px-2 py-0.5 text-[10px]";
  const iconSize = size === "md" ? 12 : 10;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full ${pad} font-medium ${meta.className}`}>
      <Icon size={iconSize} /> {meta.label}
    </span>
  );
}
