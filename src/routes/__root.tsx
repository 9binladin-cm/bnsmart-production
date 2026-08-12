import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { Toaster } from "@/components/ui/sonner";

import { supabase } from "@/integrations/supabase/client";
import { startReminderPoller } from "@/lib/reminders";
import { PwaBootstrap } from "@/components/PwaBootstrap";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="card-luxe max-w-md p-8 text-center">
        <h1 className="text-6xl font-bold text-gold">404</h1>
        <p className="mt-3 text-muted-foreground">ไม่พบหน้าที่คุณต้องการ</p>
        <a href="/" className="btn-gold mt-6 inline-block">กลับหน้าหลัก</a>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  useEffect(() => { reportLovableError(error, { boundary: "root" }); }, [error]);
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="card-luxe max-w-md p-8 text-center">
        <h2 className="text-xl font-semibold text-gold">โหลดหน้านี้ไม่สำเร็จ</h2>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <button
          onClick={() => { router.invalidate(); reset(); }}
          className="btn-gold mt-6"
        >ลองอีกครั้ง</button>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "theme-color", content: "#050505" },
      { title: "ช่างเดย์เนรมิตร — DayNeramit | Smart Repair & Renovation" },
      { name: "description", content: "Neramit Automation ประเมินหน้างาน สร้างเอกสาร นัดหมาย และเช็คลิสต์อุปกรณ์ ครบในแอปเดียว By ChangOnline" },
      { property: "og:title", content: "ช่างเดย์เนรมิตร — DayNeramit | Smart Repair & Renovation" },
      { property: "og:description", content: "Neramit Automation ประเมินหน้างาน สร้างเอกสาร นัดหมาย และเช็คลิสต์อุปกรณ์ ครบในแอปเดียว By ChangOnline" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "ช่างเดย์เนรมิตร — DayNeramit | Smart Repair & Renovation" },
      { name: "twitter:description", content: "Neramit Automation ประเมินหน้างาน สร้างเอกสาร นัดหมาย และเช็คลิสต์อุปกรณ์ ครบในแอปเดียว By ChangOnline" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/png", href: "/favicon.png" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Kanit:wght@300;400;500;600;700;800&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="th">
      <head><HeadContent /></head>
      <body>{children}<Scripts /></body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        router.invalidate();
        if (event !== "SIGNED_OUT") queryClient.invalidateQueries();
      }
    });
    startReminderPoller();
    return () => sub.subscription.unsubscribe();
  }, [router, queryClient]);
  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
      <PwaBootstrap />
      <Toaster position="top-center" richColors theme="dark" />
    </QueryClientProvider>
  );
}
