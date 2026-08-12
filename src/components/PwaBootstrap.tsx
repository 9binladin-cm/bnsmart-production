import { useEffect } from "react";
import { registerServiceWorker } from "@/lib/pwa";

/** Mounts once in the root route and owns the only SW registration call. */
export function PwaBootstrap() {
  useEffect(() => {
    void registerServiceWorker();
  }, []);
  return null;
}
