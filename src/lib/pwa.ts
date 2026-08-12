/**
 * Single guarded service-worker registrar.
 *
 * The service worker must never register in dev, in an iframe, or in a Lovable
 * preview host — a browser-held worker there would keep serving stale HTML and
 * deleted chunks. In any refused context we actively unregister /sw.js so a
 * previously installed worker is cleaned up.
 */
const SW_URL = "/sw.js";

function isPreviewHost(hostname: string): boolean {
  return (
    hostname.startsWith("id-preview--") ||
    hostname.startsWith("preview--") ||
    hostname === "lovableproject.com" ||
    hostname.endsWith(".lovableproject.com") ||
    hostname === "lovableproject-dev.com" ||
    hostname.endsWith(".lovableproject-dev.com") ||
    hostname === "beta.lovable.dev" ||
    hostname.endsWith(".beta.lovable.dev")
  );
}

async function unregisterAppServiceWorkers(): Promise<void> {
  if (!("serviceWorker" in navigator)) return;
  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.allSettled(
      registrations
        .filter((registration) => {
          const scriptUrl =
            registration.active?.scriptURL ??
            registration.waiting?.scriptURL ??
            registration.installing?.scriptURL ??
            "";
          return scriptUrl.endsWith(SW_URL);
        })
        .map((registration) => registration.unregister()),
    );
  } catch {
    // Nothing actionable — never block the app on service-worker cleanup.
  }
}

export async function registerServiceWorker(): Promise<void> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

  const inIframe = window.self !== window.top;
  const swOff = new URL(window.location.href).searchParams.get("sw") === "off";
  const refused =
    !import.meta.env.PROD || inIframe || swOff || isPreviewHost(window.location.hostname);

  if (refused) {
    await unregisterAppServiceWorkers();
    return;
  }

  try {
    await navigator.serviceWorker.register(SW_URL, { scope: "/" });
  } catch (error) {
    console.error("Service worker registration failed", error);
  }
}
