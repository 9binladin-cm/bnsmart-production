import { BRAND_LOGO_URL } from "@/lib/brand";
import { DOC_LABELS, SERVICE_ICONS, bankLogoByName, fmtBaht, fmtDateEN, fmtDateTH, getDocTypeConfig } from "@/lib/doc-utils";

export type DocVisibility = {
  services?: boolean;
  issuer?: boolean;
  customer?: boolean;
  items?: boolean;
  notes?: boolean;
  totals?: boolean;
  contact?: boolean;
  payment_terms?: boolean;
  bank?: boolean;
  qr?: boolean;
  signature?: boolean;
  footer_banner?: boolean;
};

export type DocData = {
  doc_type: string;
  doc_no?: string;
  language: "th" | "en";
  theme: "gold" | "dark";
  issue_date: string;
  due_date?: string;
  profile: any;
  customer?: any;
  items: { title: string; description?: string; quantity: number; unit: string; unit_price: number }[];
  notes?: string;
  payment_terms?: string;
  vat?: boolean;
  logo_url?: string;
  qr_url?: string;
  signature_url?: string;
  warranty_days?: number;
  services?: string[]; // enabled service keys
  visibility?: DocVisibility;
};

const T = (lang: "th" | "en", docType: string) => {
  const cfg = getDocTypeConfig(docType);
  return {
    date: cfg.labels.date[lang],
    due: lang === "th" ? "ครบกำหนด" : "Due Date",
    issuer: cfg.labels.issuer[lang],
    customer: lang === "th" ? "ข้อมูลลูกค้า" : "Customer",
    name: lang === "th" ? "ชื่อ" : "Name",
    phone: lang === "th" ? "เบอร์โทร" : "Phone",
    address: lang === "th" ? "ที่อยู่" : "Address",
    itemsTitle: cfg.labels.itemsTitle[lang],
    no_col: lang === "th" ? "ลำดับ" : "No.",
    item: lang === "th" ? "รายการ" : "Description",
    detail: lang === "th" ? "รายละเอียด" : "Detail",
    qty: lang === "th" ? "จำนวน" : "Qty",
    unit: lang === "th" ? "หน่วย" : "Unit",
    price: lang === "th" ? "ราคาต่อหน่วย" : "Unit Price",
    amount: lang === "th" ? "จำนวนเงิน" : "Amount",
    baht_head: lang === "th" ? "(บาท)" : "(THB)",
    sub: lang === "th" ? "รวมราคาสินค้า/บริการ" : "Subtotal",
    vat: lang === "th" ? "ภาษีมูลค่าเพิ่ม 7%" : "VAT 7%",
    total: lang === "th" ? "รวมเป็นเงินทั้งสิ้น" : "Grand Total",
    contact: lang === "th" ? "ช่องทางการติดต่อ" : "Contact",
    paymentTerms: lang === "th" ? "เงื่อนไขการชำระเงิน" : "Payment Terms",
    notes: lang === "th" ? "หมายเหตุ" : "Notes",
    signer: cfg.labels.signer[lang],
    warranty: lang === "th" ? "ระยะเวลารับประกัน" : "Warranty Period",
    days: lang === "th" ? "วัน" : "days",
  };
};

export function DocumentPreview({ data }: { data: DocData }) {
  const L = T(data.language, data.doc_type);
  const cfg = getDocTypeConfig(data.doc_type);
  const label = DOC_LABELS[data.doc_type]?.[data.language] ?? data.doc_type;
  const subtotal = data.items.reduce((s, i) => s + i.quantity * i.unit_price, 0);
  const vat = data.vat ? subtotal * 0.07 : 0;
  const total = subtotal + vat;
  const fmtDate = data.language === "th" ? fmtDateTH : fmtDateEN;
  const logo = data.logo_url || BRAND_LOGO_URL;
  const name = data.language === "th" ? data.profile.display_name_th : data.profile.display_name_en;
  // Merge: doc-type defaults → user overrides. Sections disabled by the doc-type
  // standard (e.g. "bank" on a warranty) can still be turned back on explicitly.
  const v: DocVisibility = { ...cfg.defaultSections, ...(data.visibility ?? {}) };
  const services = SERVICE_ICONS.filter((s) => (data.services ?? SERVICE_ICONS.map((x) => x.key)).includes(s.key));
  const bankLogo = bankLogoByName(data.profile.bank_name);

  const GOLD = "#c9a24a";
  const GOLD_LIGHT = "#e8c877";
  const DARK = "#0d0b08";

  return (
    <div
      id="doc-page"
      className="doc-a4"
      style={{
        width: "210mm",
        minHeight: "297mm",
        background: "#ffffff",
        color: "#1a1608",
        fontFamily: "'Kanit', sans-serif",
        fontSize: "12px",
        lineHeight: 1.5,
        boxSizing: "border-box",
        overflow: "hidden",
        position: "relative",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Dark header banner */}
      <div style={{
        background: `linear-gradient(135deg, ${DARK} 0%, #1a1610 50%, ${DARK} 100%)`,
        padding: "16mm 14mm 10mm",
        color: "#fff",
        position: "relative",
      }}>
        {/* corner gold accents */}
        <div style={{ position: "absolute", top: 0, left: 0, width: 90, height: 90, background: `linear-gradient(135deg, ${GOLD} 0%, transparent 60%)`, opacity: 0.4 }} />
        <div style={{ position: "absolute", top: 0, right: 0, width: 90, height: 90, background: `linear-gradient(225deg, ${GOLD} 0%, transparent 60%)`, opacity: 0.4 }} />

        <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 16, alignItems: "center", position: "relative" }}>
          <div style={{ display: "flex", gap: 14, alignItems: "center", minWidth: 0 }}>
            <img src={logo} alt="" crossOrigin="anonymous" style={{ width: 92, height: 92, objectFit: "contain" }} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 26, fontWeight: 900, color: GOLD_LIGHT, letterSpacing: 1, lineHeight: 1 }}>{name}</div>
              <div style={{ marginTop: 4, fontSize: 11, letterSpacing: 2, color: "#e0d4a6", opacity: 0.9 }}>
                — {data.profile.tagline || "SMART REPAIR & RENOVATION"} —
              </div>
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 34, fontWeight: 900, color: "#fff", lineHeight: 1 }}>{label}</div>
            <div style={{ marginTop: 10, display: "inline-flex", gap: 8, alignItems: "center", background: "rgba(201,162,74,0.15)", border: `1px solid ${GOLD}`, borderRadius: 6, padding: "4px 10px" }}>
              <span style={{ color: GOLD_LIGHT, fontSize: 14 }}>📅</span>
              <div style={{ textAlign: "left", color: "#f5e9c8" }}>
                <div style={{ fontSize: 10, opacity: 0.85 }}>{L.date}</div>
                <div style={{ fontSize: 12, fontWeight: 700 }}>{fmtDate(data.issue_date)}</div>
              </div>
            </div>
            {data.doc_no && <div style={{ marginTop: 4, fontSize: 10, color: "#e0d4a6" }}>No. {data.doc_no}</div>}
          </div>
        </div>

        {/* Service icons row */}
        {v.services && services.length > 0 && (
          <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: `repeat(${services.length}, 1fr)`, gap: 8, position: "relative" }}>
            {services.map((s) => (
              <div key={s.key} style={{ textAlign: "center" }}>
                <div style={{ fontSize: 22, color: GOLD_LIGHT }}>{s.icon}</div>
                <div style={{ fontSize: 10, color: "#f0e2b8", marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* bottom gold flourish */}
        <div style={{ position: "absolute", bottom: -1, left: 0, right: 0, height: 6, background: `linear-gradient(90deg, transparent, ${GOLD} 20%, ${GOLD_LIGHT} 50%, ${GOLD} 80%, transparent)` }} />
      </div>

      <div style={{ padding: "8mm 12mm 12mm" }}>
        {/* Info cards */}
        {(v.issuer || v.customer) && (
          <div style={{ display: "grid", gridTemplateColumns: v.issuer && v.customer ? "1fr 1fr" : "1fr", gap: 10, marginTop: 4 }}>
            {v.issuer && (
              <div style={infoCard(GOLD)}>
                <div style={cardHeader(GOLD)}>👤 {L.issuer}</div>
                <div style={{ padding: "8px 12px 10px" }}>
                  <div style={{ fontWeight: 800, fontSize: 13, color: DARK }}>{name}</div>
                  <div style={{ fontSize: 11, color: "#4a3d1e", marginTop: 2 }}>{data.profile.tagline}</div>
                  <div style={{ marginTop: 6, fontSize: 11, display: "grid", gap: 3 }}>
                    {data.profile.phone && <div>📞 {data.profile.phone}</div>}
                    {data.profile.email && <div>✉ {data.profile.email}</div>}
                    {data.profile.address && <div>📍 {data.profile.address}</div>}
                  </div>
                </div>
              </div>
            )}
            {v.customer && data.customer && (
              <div style={infoCard(GOLD)}>
                <div style={cardHeader(GOLD)}>👤 {L.customer}</div>
                <div style={{ padding: "8px 12px 10px", fontSize: 11.5, display: "grid", gap: 4 }}>
                  <Field label={L.name} value={data.customer.name} />
                  <Field label={L.phone} value={data.customer.phone} />
                  <Field label={L.address} value={data.customer.address} />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Items */}
        {v.items && data.items.length > 0 && (
          <div style={{ marginTop: 12, border: `1px solid ${GOLD}`, borderRadius: 8, overflow: "hidden" }}>
            <div style={{ background: DARK, color: "#fff", padding: "8px 14px", fontWeight: 800, fontSize: 13 }}>
              📋 {L.itemsTitle}
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11.5 }}>
              <thead>
                <tr style={{ background: "#f4e3b3", color: "#5a4211" }}>
                  <th style={thStyle}>{L.no_col}</th>
                  <th style={{ ...thStyle, textAlign: "left" }}>{L.item}</th>
                  <th style={{ ...thStyle, textAlign: "left" }}>{L.detail}</th>
                  <th style={thStyle}>{L.qty}</th>
                  <th style={thStyle}>{L.unit}</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>{L.price}<br/><span style={{ fontWeight: 400, fontSize: 9 }}>{L.baht_head}</span></th>
                  <th style={{ ...thStyle, textAlign: "right" }}>{L.amount}<br/><span style={{ fontWeight: 400, fontSize: 9 }}>{L.baht_head}</span></th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((it, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #ecdfba", background: i % 2 === 0 ? "#fff" : "#fbf5e4" }}>
                    <td style={{ ...tdStyle, textAlign: "center", width: 36 }}>{i + 1}</td>
                    <td style={{ ...tdStyle, fontWeight: 600 }}>{it.title}</td>
                    <td style={{ ...tdStyle, whiteSpace: "pre-wrap", color: "#5a4a20" }}>{it.description ?? ""}</td>
                    <td style={{ ...tdStyle, textAlign: "center", width: 44 }}>{it.quantity}</td>
                    <td style={{ ...tdStyle, textAlign: "center", width: 50 }}>{it.unit}</td>
                    <td style={{ ...tdStyle, textAlign: "right", width: 80 }}>{fmtBaht(it.unit_price)}</td>
                    <td style={{ ...tdStyle, textAlign: "right", width: 84, fontWeight: 700 }}>{fmtBaht(it.quantity * it.unit_price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Notes + Totals row */}
        {(v.notes || v.totals) && (
          <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: v.notes && v.totals ? "1fr 1fr" : "1fr", gap: 10 }}>
            {v.notes && data.notes && (
              <div style={infoCard(GOLD)}>
                <div style={cardHeader(GOLD)}>📝 {L.notes}</div>
                <div style={{ padding: "8px 12px 10px", fontSize: 11, whiteSpace: "pre-wrap", color: "#3a2f18" }}>{data.notes}</div>
              </div>
            )}
            {v.totals && data.items.length > 0 && (
              <div style={{ borderRadius: 8, overflow: "hidden", border: `1px solid ${GOLD}` }}>
                <TotalRow label={L.sub} value={fmtBaht(subtotal)} bg="#faf3dc" />
                {data.vat && <TotalRow label={L.vat} value={fmtBaht(vat)} bg="#f4e8bd" />}
                <div style={{ background: DARK, color: GOLD_LIGHT, padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 14, fontWeight: 800 }}>{L.total}</span>
                  <span style={{ fontSize: 20, fontWeight: 900 }}>{fmtBaht(total)}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Warranty note */}
        {data.doc_type === "warranty" && data.warranty_days && (
          <div style={{ ...infoCard(GOLD), marginTop: 10, padding: "10px 14px" }}>
            <b style={{ color: DARK }}>{L.warranty}:</b> {data.warranty_days} {L.days}
          </div>
        )}

        {/* Contact + Payment Terms */}
        {(v.contact || v.payment_terms) && (
          <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: v.contact && v.payment_terms ? "1fr 1fr" : "1fr", gap: 10 }}>
            {v.contact && (
              <div style={infoCard(GOLD)}>
                <div style={cardHeader(GOLD)}>📇 {L.contact}</div>
                <div style={{ padding: "8px 12px 10px", fontSize: 11, display: "grid", gap: 3 }}>
                  {data.profile.phone && <div>📞 {data.profile.phone}</div>}
                  {data.profile.email && <div>✉ {data.profile.email}</div>}
                  {data.profile.address && <div>📍 {data.profile.address}</div>}
                  {data.profile.facebook && <div>ⓕ Facebook / {data.profile.facebook}</div>}
                  {data.profile.line_id && <div>ⓛ LINE / {data.profile.line_id}</div>}
                </div>
              </div>
            )}
            {v.payment_terms && data.payment_terms && (
              <div style={infoCard(GOLD)}>
                <div style={cardHeader(GOLD)}>📄 {L.paymentTerms}</div>
                <div style={{ padding: "8px 12px 10px", fontSize: 11, whiteSpace: "pre-wrap", color: "#3a2f18" }}>{data.payment_terms}</div>
              </div>
            )}
          </div>
        )}

        {/* Bank + QR */}
        {(v.bank || v.qr) && (
          <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: v.bank && v.qr ? "1fr auto" : "1fr", gap: 10, alignItems: "stretch" }}>
            {v.bank && (
              <div style={infoCard(GOLD)}>
                <div style={cardHeader(GOLD)}>🏦 {data.language === "th" ? "ช่องทางชำระเงิน" : "Payment"}</div>
                <div style={{ padding: "10px 14px", display: "flex", gap: 12, alignItems: "center" }}>
                  <img src={bankLogo} alt="bank" crossOrigin="anonymous" style={{ width: 56, height: 56, objectFit: "contain" }} />
                  <div style={{ fontSize: 11.5 }}>
                    <div style={{ fontWeight: 800, color: DARK }}>{data.profile.bank_name}</div>
                    <div>เลขที่บัญชี: <b>{data.profile.bank_account_no}</b></div>
                    <div>ชื่อบัญชี: <b>{data.profile.bank_account_name}</b></div>
                  </div>
                </div>
              </div>
            )}
            {v.qr && data.qr_url && (
              <div style={{ ...infoCard(GOLD), padding: 6, textAlign: "center", width: 132 }}>
                <img src={data.qr_url} alt="QR" crossOrigin="anonymous" style={{ width: 118, height: 118, objectFit: "contain", display: "block", margin: "0 auto", background: "#fff" }} />
                <div style={{ fontSize: 9, marginTop: 2, color: "#5a4a20" }}>สแกนเพื่อชำระเงิน</div>
              </div>
            )}
          </div>
        )}

        {/* Signature */}
        {v.signature && (
          <div style={{ marginTop: 18, textAlign: "center" }}>
            <div style={{ fontSize: 11, color: "#5a4a20" }}>{L.signer}</div>
            {data.signature_url && (
              <img
                src={data.signature_url}
                alt="sig"
                crossOrigin="anonymous"
                style={{ height: 80, maxWidth: 240, objectFit: "contain", margin: "4px auto 0", display: "block" }}
              />
            )}
            <div style={{ margin: "6px auto 0", width: 240, borderTop: `1px solid ${DARK}`, paddingTop: 4, fontWeight: 800, color: DARK }}>
              ({name})
            </div>
            <div style={{ fontSize: 10, color: "#5a4a20" }}>{L.signer}</div>
          </div>
        )}
      </div>

      {/* Footer banner */}
      {v.footer_banner && (
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0, height: 22,
          background: `linear-gradient(135deg, ${DARK} 0%, #1a1610 50%, ${DARK} 100%)`,
          borderTop: `3px solid ${GOLD}`,
        }}>
          <div style={{ height: "100%", background: `linear-gradient(90deg, ${GOLD} 0%, transparent 30%, transparent 70%, ${GOLD} 100%)`, opacity: 0.5 }} />
        </div>
      )}
    </div>
  );
}

const thStyle: React.CSSProperties = { padding: "8px 6px", fontWeight: 700, fontSize: 11, textAlign: "center", borderBottom: "1px solid #d9c78a" };
const tdStyle: React.CSSProperties = { padding: "8px 8px", verticalAlign: "top" };

const infoCard = (gold: string): React.CSSProperties => ({
  border: `1px solid ${gold}`,
  borderRadius: 8,
  overflow: "hidden",
  background: "#fff",
});

const cardHeader = (gold: string): React.CSSProperties => ({
  padding: "6px 12px",
  fontWeight: 800,
  fontSize: 12,
  color: "#3a2f18",
  borderBottom: `1px solid ${gold}`,
  background: "linear-gradient(180deg, #fdf6df, #f7ebc4)",
});

function Field({ label, value }: { label: string; value?: string }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "70px 10px 1fr", gap: 4 }}>
      <span style={{ color: "#7a6633" }}>{label}</span>
      <span>:</span>
      <span style={{ fontWeight: 600 }}>{value || "-"}</span>
    </div>
  );
}

function TotalRow({ label, value, bg }: { label: string; value: string; bg: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 14px", background: bg, fontSize: 12 }}>
      <span>{label}</span><span style={{ fontWeight: 700 }}>{value}</span>
    </div>
  );
}
