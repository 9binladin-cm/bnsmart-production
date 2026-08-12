// Format numbers as Thai baht currency
export const fmtBaht = (n: number) =>
  new Intl.NumberFormat("th-TH", { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n);

export const fmtDateTH = (d: Date | string) => {
  const dt = typeof d === "string" ? new Date(d) : d;
  const yBE = dt.getFullYear() + 543;
  const months = ["มกราคม","กุมภาพันธ์","มีนาคม","เมษายน","พฤษภาคม","มิถุนายน","กรกฎาคม","สิงหาคม","กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม"];
  return `${dt.getDate()} ${months[dt.getMonth()]} ${yBE}`;
};

export const fmtDateEN = (d: Date | string) => {
  const dt = typeof d === "string" ? new Date(d) : d;
  return dt.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
};

export const DOC_LABELS: Record<string, { th: string; en: string }> = {
  assessment: { th: "สรุปการประเมินงาน", en: "Work Assessment" },
  quotation: { th: "ใบเสนอราคา", en: "Quotation" },
  receipt: { th: "ใบรับเงิน", en: "Payment Receipt" },
  daily_report: { th: "ใบรายงานประจำวัน", en: "Daily Report" },
  delivery: { th: "ใบส่งมอบงาน", en: "Delivery Note" },
  warranty: { th: "ใบรับประกัน", en: "Warranty Certificate" },
  tax_receipt: { th: "ใบเสร็จรับเงิน", en: "Tax Receipt" },
};

// Per-doc-type configuration: default section visibility + correct labels.
// Encodes professional standards so a warranty never renders with a payment
// channel, a receipt is signed by "ผู้รับเงิน", etc.
export type DocSectionKey =
  | "services" | "issuer" | "customer" | "items" | "notes" | "totals"
  | "contact" | "payment_terms" | "bank" | "qr" | "signature" | "footer_banner";

export type DocTypeConfig = {
  defaultSections: Record<DocSectionKey, boolean>;
  labels: {
    itemsTitle: { th: string; en: string };
    signer: { th: string; en: string };
    issuer: { th: string; en: string };
    date: { th: string; en: string };
  };
  docNoPrefix: string;
};

const S = (o: Partial<Record<DocSectionKey, boolean>> = {}): Record<DocSectionKey, boolean> => ({
  services: true, issuer: true, customer: true, items: true, notes: true, totals: true,
  contact: true, payment_terms: true, bank: true, qr: true, signature: true, footer_banner: true,
  ...o,
});

export const DOC_TYPE_CONFIG: Record<string, DocTypeConfig> = {
  quotation: {
    defaultSections: S(),
    labels: {
      itemsTitle: { th: "รายการเสนอราคา", en: "Quotation Items" },
      signer: { th: "ผู้เสนอราคา", en: "Authorized Signature" },
      issuer: { th: "ข้อมูลผู้เสนอราคา", en: "Issued By" },
      date: { th: "วันที่เสนอราคา", en: "Quotation Date" },
    },
    docNoPrefix: "QT",
  },
  receipt: {
    defaultSections: S({ payment_terms: false }),
    labels: {
      itemsTitle: { th: "รายการรับชำระ", en: "Received Items" },
      signer: { th: "ผู้รับเงิน", en: "Received By" },
      issuer: { th: "ข้อมูลผู้รับเงิน", en: "Received By" },
      date: { th: "วันที่รับเงิน", en: "Payment Date" },
    },
    docNoPrefix: "RC",
  },
  tax_receipt: {
    defaultSections: S({ payment_terms: false }),
    labels: {
      itemsTitle: { th: "รายการสินค้า/บริการ", en: "Items / Services" },
      signer: { th: "ผู้รับเงิน", en: "Received By" },
      issuer: { th: "ข้อมูลผู้ออกใบเสร็จ", en: "Issued By" },
      date: { th: "วันที่ออกใบเสร็จ", en: "Receipt Date" },
    },
    docNoPrefix: "TX",
  },
  warranty: {
    defaultSections: S({ payment_terms: false, bank: false, qr: false, totals: false }),
    labels: {
      itemsTitle: { th: "รายการที่รับประกัน", en: "Covered Items" },
      signer: { th: "ผู้รับประกัน", en: "Warrantor" },
      issuer: { th: "ข้อมูลผู้รับประกัน", en: "Warrantor" },
      date: { th: "วันที่ออกใบรับประกัน", en: "Issue Date" },
    },
    docNoPrefix: "WR",
  },
  delivery: {
    defaultSections: S({ payment_terms: false, bank: false, qr: false, totals: false }),
    labels: {
      itemsTitle: { th: "รายการที่ส่งมอบ", en: "Delivered Items" },
      signer: { th: "ผู้ส่งมอบงาน", en: "Delivered By" },
      issuer: { th: "ข้อมูลผู้ส่งมอบ", en: "Delivered By" },
      date: { th: "วันที่ส่งมอบ", en: "Delivery Date" },
    },
    docNoPrefix: "DL",
  },
  daily_report: {
    defaultSections: S({ payment_terms: false, bank: false, qr: false, totals: false }),
    labels: {
      itemsTitle: { th: "รายการงานที่ดำเนินการ", en: "Work Performed" },
      signer: { th: "ผู้รายงาน", en: "Reported By" },
      issuer: { th: "ข้อมูลผู้รายงาน", en: "Reported By" },
      date: { th: "วันที่รายงาน", en: "Report Date" },
    },
    docNoPrefix: "DR",
  },
  assessment: {
    defaultSections: S({ payment_terms: false, bank: false, qr: false, totals: false }),
    labels: {
      itemsTitle: { th: "รายการประเมินงาน", en: "Assessed Items" },
      signer: { th: "ผู้ประเมิน", en: "Assessed By" },
      issuer: { th: "ข้อมูลผู้ประเมิน", en: "Assessed By" },
      date: { th: "วันที่ประเมิน", en: "Assessment Date" },
    },
    docNoPrefix: "AS",
  },
};

export const getDocTypeConfig = (t: string): DocTypeConfig =>
  DOC_TYPE_CONFIG[t] ?? DOC_TYPE_CONFIG.quotation;

// Real Thai bank logos (public brand marks from Wikimedia Commons)
export const BANK_OPTIONS: { key: string; name: string; logo: string }[] = [
  { key: "SCB", name: "ธนาคารไทยพาณิชย์ (SCB)", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1c/Siam_Commercial_Bank.svg/240px-Siam_Commercial_Bank.svg.png" },
  { key: "KBANK", name: "ธนาคารกสิกรไทย (KBank)", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/09/Kasikornbank_logo.svg/240px-Kasikornbank_logo.svg.png" },
  { key: "BBL", name: "ธนาคารกรุงเทพ (BBL)", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/Bangkok_Bank_2023.svg/240px-Bangkok_Bank_2023.svg.png" },
  { key: "KTB", name: "ธนาคารกรุงไทย (KTB)", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/85/Krungthai_Bank_Logo.svg/240px-Krungthai_Bank_Logo.svg.png" },
  { key: "BAY", name: "ธนาคารกรุงศรีอยุธยา (BAY)", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a8/Bank_of_Ayudhya_%28Krungsri%29_2020.svg/240px-Bank_of_Ayudhya_%28Krungsri%29_2020.svg.png" },
  { key: "TTB", name: "ธนาคารทหารไทยธนชาต (ttb)", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/92/TMBThanachart_Bank_Logo.svg/240px-TMBThanachart_Bank_Logo.svg.png" },
  { key: "GSB", name: "ธนาคารออมสิน (GSB)", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/fd/Government_Savings_Bank_logo.svg/240px-Government_Savings_Bank_logo.svg.png" },
  { key: "BAAC", name: "ธ.ก.ส. (BAAC)", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/31/BAAC_new_logo.svg/240px-BAAC_new_logo.svg.png" },
  { key: "GHB", name: "ธนาคารอาคารสงเคราะห์ (GHB)", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b0/Government_Housing_Bank_logo.svg/240px-Government_Housing_Bank_logo.svg.png" },
  { key: "CIMB", name: "CIMB Thai", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/CIMB_Group_logo.svg/240px-CIMB_Group_logo.svg.png" },
  { key: "UOB", name: "UOB Thailand", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/UOBLogo.svg/240px-UOBLogo.svg.png" },
  { key: "LHB", name: "แลนด์ แอนด์ เฮ้าส์", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9f/LH_Bank_logo.svg/240px-LH_Bank_logo.svg.png" },
];

export const bankLogoByName = (name?: string): string => {
  if (!name) return BANK_OPTIONS[0].logo;
  const found = BANK_OPTIONS.find((b) => name.includes(b.key) || name.includes(b.name.split(" ")[0]) || b.name.includes(name));
  return found?.logo ?? BANK_OPTIONS[0].logo;
};

// Preset text blocks per field — user selects and can edit further
export const TEXT_PRESETS: Record<string, string[]> = {
  tagline: [
    "บริการติดตั้ง ซ่อมบำรุง ล้างแอร์ และงานระบบ",
    "Smart Repair & Renovation ครบวงจร",
    "ช่างมืออาชีพ รับประกันคุณภาพงาน",
    "ติดตั้ง ต่อเติม ปรับปรุงบ้าน ทุกงานช่าง",
  ],
  notes: [
    "• ราคานี้รวมค่าแรงและวัสดุอุปกรณ์แล้ว\n• ราคานี้ไม่รวมงานรื้อผนังที่ลูกค้าเปลี่ยนแปลงภายหลัง\n• กำหนดระยะเวลาดำเนินงานตามข้อตกลงหน้างาน\n• การรับประกันงาน 6 เดือน นับจากวันที่ส่งมอบงาน",
    "• ราคานี้ยังไม่รวมภาษีมูลค่าเพิ่ม 7%\n• ยืนราคา 30 วัน นับจากวันที่ออกเอกสาร\n• ค่าใช้จ่ายเพิ่มเติมนอกเหนือใบเสนอราคา จะแจ้งลูกค้าก่อนดำเนินการ",
    "• งานประกอบด้วยการติดตั้งและทดสอบระบบให้ใช้งานได้จริง\n• หลังส่งมอบงาน มีบริการหลังการขายตามระยะเวลารับประกัน",
  ],
  payment_terms: [
    "• มัดจำ 50% ก่อนเริ่มงาน\n• ชำระงวดที่ 2 จำนวน 50% เมื่อส่งมอบงาน\n• ชำระด้วยเงินสด / โอนเงินเข้าบัญชีที่กำหนด",
    "• มัดจำ 30% เมื่อยืนยันงาน\n• งวดที่ 2 อีก 40% เมื่อดำเนินงานครึ่งทาง\n• งวดสุดท้าย 30% เมื่อส่งมอบงานเรียบร้อย",
    "• ชำระเต็มจำนวนเมื่อส่งมอบงาน\n• รับชำระเงินสด, โอนธนาคาร, พร้อมเพย์",
  ],
  warranty_note: [
    "รับประกันงานติดตั้ง 6 เดือน นับจากวันที่ส่งมอบงาน",
    "รับประกันคุณภาพงาน 1 ปีเต็ม ครอบคลุมงานติดตั้งและวัสดุ",
    "รับประกัน 90 วัน สำหรับงานซ่อมบำรุงและปรับปรุง",
  ],
};

// Service categories that appear as icon row (like reference doc)
export const SERVICE_ICONS: { key: string; label: string; icon: string }[] = [
  { key: "air", label: "แอร์", icon: "❄" },
  { key: "cctv", label: "กล้องวงจรปิด", icon: "📹" },
  { key: "electric", label: "ไฟฟ้า", icon: "⚡" },
  { key: "plumbing", label: "ประปา", icon: "🚰" },
  { key: "renovate", label: "รีโนเวท", icon: "🏠" },
  { key: "paint", label: "ทาสี", icon: "🎨" },
];
