import { BRAND_LOGO_URL } from "@/lib/brand";

export function BrandLogo({ size = 48, className = "" }: { size?: number; className?: string }) {
  return (
    <img
      src={BRAND_LOGO_URL}
      alt="โลโก้ Day Neramit Smart Repair & Renovation"
      width={size}
      height={size}
      className={className}
      style={{ width: size, height: size, objectFit: "contain" }}
      loading="eager"
      decoding="async"
    />
  );
}
