import logoUrl from "@assets/favicon.png";

export interface AttendeeRecord {
  id: number;
  email: string;
  name: string;
  ticketType: string;
  registrationStatus: string;
  rawData: Record<string, string> | null;
  createdAt?: string;
}

export interface ReceiptOverrides {
  name?: string;
  email?: string;
  phone?: string;
  company?: string;
  designation?: string;
  country?: string;
  ticketClass?: string;
  orderId?: string;
  ticketId?: string;
  amount?: string;
  quantity?: string;
  status?: string;
}

interface Props {
  attendee: AttendeeRecord;
  overrides?: ReceiptOverrides;
}

const EVENT_NAME = "Africa Water & Sanitation Systems Leadership Symposium 2026";
const EVENT_SHORT = "AWS Leadership Symposium 2026";
const ORG_NAME = "Africa Water & Sanitation Systems";
const ORG_WEBSITE = "africawatersystems.org";

export function TicketReceiptView({ attendee, overrides = {} }: Props) {
  const d = attendee.rawData ?? {};

  const firstName = d.FIRST_NAME ?? "";
  const lastName = d.LAST_NAME ?? "";
  const fullName = overrides.name ?? (attendee.name || `${firstName} ${lastName}`.trim() || attendee.email);
  const email = overrides.email ?? attendee.email;
  const phone = overrides.phone ?? (d.MOBILE_NO ?? "");
  const company = overrides.company ?? (d.COMPANY_NAME ?? "");
  const designation = overrides.designation ?? (d.DESIGNATION ?? "");
  const country = overrides.country ?? (d.COUNTRY ?? "");
  const ticketClass = overrides.ticketClass ?? (attendee.ticketType || d.TICKET_CLASS || "Standard");
  const orderId = overrides.orderId ?? (d.ORDER_ID ?? `ORD-${attendee.id}`);
  const ticketId = overrides.ticketId ?? (d.TICKET_ID ?? `TKT-${attendee.id}`);

  const amountRaw = overrides.amount ?? (d.AMOUNT_COLLECTED ?? "0");
  const amount = parseFloat(amountRaw) || 0;
  const quantity = Math.max(1, parseInt(overrides.quantity ?? "1") || 1);
  const grandTotal = amount * quantity;

  const recordedStatus = attendee.registrationStatus || d.PAYMENT_STATUS || "";
  const status = overrides.status ?? recordedStatus;

  const receiptDate = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  const receiptNum = `RCT-${String(attendee.id).padStart(5, "0")}`;

  const isPaid = status.toLowerCase().includes("paid") || status.toLowerCase().includes("confirm") || status.toLowerCase() === "complimentary";
  const isFree = amount === 0 || status.toLowerCase() === "free" || status.toLowerCase() === "free ticket";
  const isComplimentary = status.toLowerCase() === "complimentary";
  const statusLabel = isComplimentary ? "COMPLIMENTARY" : isFree ? "FREE TICKET" : isPaid ? "PAID" : status.toUpperCase() || "PENDING";
  const statusColor = (isFree || isPaid) ? "#015845" : "#f59e0b";
  const statusBg = (isFree || isPaid) ? "#ecfdf5" : "#fffbeb";
  const statusBorder = (isFree || isPaid) ? "#6ee7b7" : "#fde68a";

  const fmtAmount = (v: number) =>
    `€${v.toLocaleString("en-EU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div
      id="receipt-print-area"
      style={{ width: 794, background: "#fff", fontFamily: "'Segoe UI', Inter, Arial, sans-serif", color: "#1a1a2e", overflow: "hidden" }}
    >
      {/* ── Header ────────────────────────────────────────────────── */}
      <div style={{ background: "linear-gradient(135deg, #014a3a 0%, #015845 55%, #017a5e 100%)", padding: "0 0 0 0" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "22px 36px 18px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 52, height: 52, borderRadius: 10, background: "rgba(255,255,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center", padding: 4, flexShrink: 0 }}>
              <img src={logoUrl} alt="AWS Logo" style={{ width: 44, height: 44, objectFit: "contain" }} />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: "#fff", letterSpacing: 0.2, lineHeight: 1.25 }}>{ORG_NAME}</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.65)", marginTop: 2 }}>{ORG_WEBSITE}</div>
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 28, fontWeight: 900, color: "#fff", letterSpacing: 5, lineHeight: 1 }}>RECEIPT</div>
            <div style={{ marginTop: 5, display: "inline-flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", letterSpacing: 0.5 }}>{receiptNum}</span>
              <span style={{ width: 4, height: 4, borderRadius: "50%", background: "rgba(255,255,255,0.35)", display: "inline-block" }} />
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.6)" }}>{receiptDate}</span>
            </div>
          </div>
        </div>
        <div style={{ background: "rgba(0,0,0,0.18)", padding: "9px 36px", borderTop: "1px solid rgba(255,255,255,0.1)" }}>
          <div style={{ fontSize: 11.5, fontWeight: 600, color: "rgba(255,255,255,0.85)", letterSpacing: 0.3 }}>{EVENT_NAME}</div>
        </div>
      </div>

      <div style={{ height: 3, background: "linear-gradient(90deg, #0381ED 0%, #015845 100%)" }} />

      {/* ── Body ──────────────────────────────────────────────────── */}
      <div style={{ padding: "26px 36px 24px", display: "flex", flexDirection: "column", gap: 18 }}>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          <div style={{ background: "#f8fafc", borderRadius: 8, padding: "14px 16px", border: "1px solid #e5e7eb" }}>
            <div style={{ fontSize: 9.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1.4, color: "#015845", marginBottom: 8 }}>Issued To</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#111827", marginBottom: 4, lineHeight: 1.3 }}>{fullName}</div>
            <div style={{ fontSize: 12, color: "#4b5563", lineHeight: 1.7 }}>
              {email}
              {phone && <><br />{phone}</>}
              {company && <><br />{company}</>}
              {designation && <><br /><span style={{ color: "#6b7280" }}>{designation}</span></>}
              {country && <><br />{country}</>}
            </div>
          </div>
          <div style={{ background: "#f8fafc", borderRadius: 8, padding: "14px 16px", border: "1px solid #e5e7eb" }}>
            <div style={{ fontSize: 9.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1.4, color: "#015845", marginBottom: 8 }}>Event Details</div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11.5 }}>
              <tbody>
                <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                  <td style={{ paddingBottom: 5, paddingRight: 12, color: "#9ca3af", fontWeight: 700, fontSize: 9.5, textTransform: "uppercase", letterSpacing: 0.8, whiteSpace: "nowrap", verticalAlign: "top", paddingTop: 0 }}>Event Name</td>
                  <td style={{ paddingBottom: 5, color: "#111827", fontWeight: 600, fontSize: 12, lineHeight: 1.4, verticalAlign: "top", paddingTop: 0 }}>Africa Water &amp; Sanitation Systems Leadership Symposium</td>
                </tr>
                <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                  <td style={{ paddingTop: 5, paddingBottom: 5, paddingRight: 12, color: "#9ca3af", fontWeight: 700, fontSize: 9.5, textTransform: "uppercase", letterSpacing: 0.8, whiteSpace: "nowrap", verticalAlign: "top" }}>Event Date</td>
                  <td style={{ paddingTop: 5, paddingBottom: 5, color: "#111827", fontWeight: 600, fontSize: 12, verticalAlign: "top" }}>17-Jul-26</td>
                </tr>
                <tr>
                  <td style={{ paddingTop: 5, paddingRight: 12, color: "#9ca3af", fontWeight: 700, fontSize: 9.5, textTransform: "uppercase", letterSpacing: 0.8, whiteSpace: "nowrap", verticalAlign: "top" }}>Venue</td>
                  <td style={{ paddingTop: 5, color: "#111827", fontWeight: 600, fontSize: 12, verticalAlign: "top" }}>Kigali Rwanda</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
          {[
            { label: "Order ID", value: orderId },
            { label: "Ticket ID", value: ticketId },
            { label: "Ticket Class", value: ticketClass },
            { label: "Receipt Date", value: receiptDate },
          ].map((cell, i) => (
            <div key={i} style={{ padding: "10px 14px", borderRight: i < 3 ? "1px solid #e5e7eb" : "none", background: i % 2 === 0 ? "#fff" : "#fafbfc" }}>
              <div style={{ fontSize: 9.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.9, color: "#9ca3af", marginBottom: 4 }}>{cell.label}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>{cell.value}</div>
            </div>
          ))}
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5, borderRadius: 8, overflow: "hidden" }}>
          <thead>
            <tr style={{ background: "#015845" }}>
              <th style={{ padding: "10px 14px", textAlign: "left", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "rgba(255,255,255,0.85)" }}>#</th>
              <th style={{ padding: "10px 14px", textAlign: "left", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "rgba(255,255,255,0.85)" }}>Description</th>
              <th style={{ padding: "10px 14px", textAlign: "right", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "rgba(255,255,255,0.85)" }}>Qty</th>
              <th style={{ padding: "10px 14px", textAlign: "right", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "rgba(255,255,255,0.85)" }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ background: "#fafbfc", borderBottom: "1px solid #e5e7eb" }}>
              <td style={{ padding: "12px 14px", color: "#6b7280", fontSize: 12 }}>01</td>
              <td style={{ padding: "12px 14px" }}>
                <div style={{ fontWeight: 700, color: "#111827", fontSize: 13 }}>Conference Ticket — {ticketClass}</div>
                <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>{EVENT_NAME}</div>
              </td>
              <td style={{ padding: "12px 14px", textAlign: "right", color: "#374151", fontSize: 12 }}>{quantity}</td>
              <td style={{ padding: "12px 14px", textAlign: "right", color: "#111827", fontWeight: 700, fontSize: 13 }}>
                {isFree ? <span style={{ color: "#015845" }}>Free</span> : fmtAmount(grandTotal)}
              </td>
            </tr>
          </tbody>
        </table>

        <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 16, alignItems: "start" }}>
          <div style={{ background: statusBg, border: `1px solid ${statusBorder}`, borderLeft: `5px solid ${statusColor}`, borderRadius: 8, padding: "16px 20px", display: "flex", flexDirection: "column", gap: 4 }}>
            <div style={{ fontSize: 9.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1.2, color: statusColor }}>Payment Status</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: statusColor, letterSpacing: 1.5 }}>{statusLabel}</div>
            {!isFree && status && (
              <div style={{ fontSize: 11.5, color: "#6b7280" }}>Registration status: {status}</div>
            )}
          </div>
          <div style={{ minWidth: 230 }}>
            {quantity > 1 && !isFree && (
              <div style={{ display: "flex", justifyContent: "space-between", padding: "7px 12px", borderBottom: "1px solid #f3f4f6", fontSize: 11.5, color: "#9ca3af" }}>
                <span>Unit price × {quantity}</span>
                <span>{fmtAmount(amount)} × {quantity}</span>
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", padding: "7px 12px", borderBottom: "1px solid #f3f4f6", fontSize: 12.5, color: "#4b5563" }}>
              <span>Subtotal</span>
              <span style={{ fontWeight: 600 }}>{isFree ? "Free" : fmtAmount(grandTotal)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "7px 12px", borderBottom: "1px solid #f3f4f6", fontSize: 11.5, color: "#9ca3af" }}>
              <span>Tax / VAT</span>
              <span>€0.00</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "11px 14px", background: "#015845", color: "#fff", borderRadius: 7, marginTop: 8, fontSize: 15, fontWeight: 800 }}>
              <span>Total</span>
              <span>{isFree ? "Free" : fmtAmount(grandTotal)}</span>
            </div>
          </div>
        </div>

        <div style={{ background: "#f0f9ff", border: "1px solid #bae6fd", borderLeft: "4px solid #0381ED", borderRadius: 7, padding: "11px 16px", fontSize: 12, color: "#374151", lineHeight: 1.65 }}>
          <strong style={{ color: "#0381ED" }}>Thank you for attending!</strong>
          {" "}This receipt confirms your registration for the <strong>{EVENT_NAME}</strong>.
          Please retain this document for your records. For enquiries, visit <strong>{ORG_WEBSITE}</strong>.
        </div>
      </div>

      {/* ── Footer ────────────────────────────────────────────────── */}
      <div style={{ background: "#f8fafc", borderTop: "1px solid #e5e7eb", padding: "11px 36px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <img src={logoUrl} alt="" style={{ width: 18, height: 18, objectFit: "contain", opacity: 0.7 }} />
          <span style={{ fontSize: 11.5, fontWeight: 700, color: "#015845" }}>{ORG_NAME}</span>
        </div>
        <div style={{ fontSize: 10.5, color: "#9ca3af" }}>{receiptNum} · {receiptDate}</div>
        <div style={{ fontSize: 11, fontWeight: 700, color: statusColor, background: statusBg, padding: "3px 11px", borderRadius: 20, letterSpacing: 0.5, textTransform: "uppercase", border: `1px solid ${statusBorder}` }}>{statusLabel}</div>
      </div>
    </div>
  );
}
