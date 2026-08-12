// Auto-crop uploaded QR code images: trim white/transparent margins,
// snap to square, and normalize to a clean PNG on white background.
export async function autoCropQr(file: File): Promise<File> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = reject;
      el.src = url;
    });
    const w = img.naturalWidth, h = img.naturalHeight;
    const src = document.createElement("canvas");
    src.width = w; src.height = h;
    const sctx = src.getContext("2d")!;
    sctx.drawImage(img, 0, 0);
    const { data } = sctx.getImageData(0, 0, w, h);

    // A pixel counts as QR ink if it's non-transparent AND fairly dark.
    const isInk = (i: number) => {
      const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
      if (a < 32) return false;
      const l = (r + g + b) / 3;
      return l < 160;
    };
    let minX = w, minY = h, maxX = -1, maxY = -1;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (isInk((y * w + x) * 4)) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    if (maxX < 0) return file; // nothing detected — keep original

    // Small padding, then square it.
    const padPct = 0.03;
    const cw = maxX - minX + 1, ch = maxY - minY + 1;
    const side = Math.max(cw, ch);
    const pad = Math.round(side * padPct);
    const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
    const size = side + pad * 2;
    let sx = Math.round(cx - size / 2);
    let sy = Math.round(cy - size / 2);
    sx = Math.max(0, Math.min(w - size, sx));
    sy = Math.max(0, Math.min(h - size, sy));
    const clipped = Math.min(size, w - sx, h - sy);

    const out = document.createElement("canvas");
    const target = Math.min(1024, Math.max(512, clipped));
    out.width = target; out.height = target;
    const octx = out.getContext("2d")!;
    octx.fillStyle = "#ffffff";
    octx.fillRect(0, 0, target, target);
    octx.imageSmoothingEnabled = true;
    octx.imageSmoothingQuality = "high";
    octx.drawImage(src, sx, sy, clipped, clipped, 0, 0, target, target);

    const blob: Blob = await new Promise((res) => out.toBlob((b) => res(b!), "image/png", 0.95));
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + "-qr.png", { type: "image/png" });
  } finally {
    URL.revokeObjectURL(url);
  }
}
