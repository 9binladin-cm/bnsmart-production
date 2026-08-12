const pad = (value: number) => String(value).padStart(2, "0");

export function toLocalInputValue(value?: string | Date | null): string {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function localInputToIso(value: string): string {
  const [datePart, timePart = "00:00"] = value.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute] = timePart.split(":").map(Number);
  const date = new Date(year, month - 1, day, hour, minute, 0, 0);
  if (Number.isNaN(date.getTime())) throw new Error("วันและเวลาไม่ถูกต้อง");
  return date.toISOString();
}

export function dateKey(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function formatThaiDateTime(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function formatThaiDate(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat("th-TH", { dateStyle: "medium" }).format(date);
}

function calendarStamp(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

export type CalendarEventInput = {
  id: string;
  title: string;
  startsAt: string;
  endsAt?: string | null;
  location?: string | null;
  notes?: string | null;
};

export function createGoogleCalendarUrl(event: CalendarEventInput): string {
  const start = new Date(event.startsAt);
  const end = event.endsAt ? new Date(event.endsAt) : new Date(start.getTime() + 60 * 60 * 1000);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${calendarStamp(start)}/${calendarStamp(end)}`,
    details: event.notes ?? "",
    location: event.location ?? "",
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function createIcsContent(event: CalendarEventInput): string {
  const start = new Date(event.startsAt);
  const end = event.endsAt ? new Date(event.endsAt) : new Date(start.getTime() + 60 * 60 * 1000);
  const escape = (text: string) => text.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "CALSCALE:GREGORIAN",
    "PRODID:-//Day Neramit//Booking Calendar//TH",
    "BEGIN:VEVENT",
    `UID:${event.id}@dayneramit`,
    `DTSTAMP:${calendarStamp(new Date())}`,
    `DTSTART:${calendarStamp(start)}`,
    `DTEND:${calendarStamp(end)}`,
    `SUMMARY:${escape(event.title)}`,
    event.location ? `LOCATION:${escape(event.location)}` : "",
    event.notes ? `DESCRIPTION:${escape(event.notes)}` : "",
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean).join("\r\n");
}

export function downloadCalendarEvent(event: CalendarEventInput): void {
  const blob = new Blob([createIcsContent(event)], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${event.title.replace(/[\\/:*?\"<>|]/g, "-")}.ics`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}


export async function openSystemCalendar(event: CalendarEventInput): Promise<"shared" | "downloaded"> {
  const content = createIcsContent(event);
  const safeName = `${event.title.replace(/[\\/:*?"<>|]/g, "-")}.ics`;
  const file = new File([content], safeName, { type: "text/calendar;charset=utf-8" });
  if (typeof navigator !== "undefined" && "share" in navigator && "canShare" in navigator) {
    try {
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: event.title,
          text: "เพิ่มนัดหมาย Day Neramit ลงในปฏิทิน",
          files: [file],
        });
        return "shared";
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return "shared";
      console.warn("calendar share failed; falling back to download", error);
    }
  }
  downloadCalendarEvent(event);
  return "downloaded";
}
