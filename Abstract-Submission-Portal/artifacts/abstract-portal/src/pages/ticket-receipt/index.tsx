import { useEffect, useState } from "react";
import { useParams, useLocation, useSearch } from "wouter";
import { TicketReceiptView, type AttendeeRecord } from "@/components/ticket-receipt-view";

export default function TicketReceipt() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const search = useSearch();
  const [attendee, setAttendee] = useState<AttendeeRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const statusOverride = (() => {
    const sp = new URLSearchParams(search);
    return sp.get("statusOverride") ?? undefined;
  })();

  useEffect(() => {
    fetch(`/api/tickets/attendees/${params.id}`, { credentials: "include" })
      .then((r) => r.json() as Promise<AttendeeRecord & { error?: string }>)
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setAttendee(data);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", fontFamily: "Inter, sans-serif", color: "#6b7280" }}>
        Loading receipt…
      </div>
    );
  }

  if (error || !attendee) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", fontFamily: "Inter, sans-serif", gap: 12 }}>
        <p style={{ color: "#dc2626", fontWeight: 600 }}>{error || "Attendee not found"}</p>
        <button onClick={() => navigate("/ticket-check")} style={{ padding: "8px 16px", borderRadius: 6, border: "1px solid #d1d5db", cursor: "pointer", fontSize: 13 }}>
          ← Back to Dashboard
        </button>
      </div>
    );
  }

  const d = attendee.rawData ?? {};
  const firstName = d.FIRST_NAME ?? "";
  const lastName = d.LAST_NAME ?? "";
  const fullName = attendee.name || `${firstName} ${lastName}`.trim() || attendee.email;

  return (
    <>
      <style>{`
        @page { size: A4; margin: 0; }
        @media print {
          body { background: #fff !important; }
          .no-print { display: none !important; }
          .receipt-page {
            width: 210mm !important;
            min-height: 297mm !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            margin: 0 !important;
          }
        }
      `}</style>

      {/* Print bar */}
      <div className="no-print" style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb", padding: "10px 24px", display: "flex", alignItems: "center", gap: 10 }}>
        <button
          onClick={() => navigate("/ticket-check")}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 6, border: "1px solid #d1d5db", background: "#fff", cursor: "pointer", fontSize: 13, color: "#374151", fontFamily: "Inter, sans-serif" }}
        >
          ← Back
        </button>
        <span style={{ flex: 1, fontSize: 13, color: "#6b7280", fontFamily: "Inter, sans-serif" }}>
          Receipt for <strong style={{ color: "#111827" }}>{fullName}</strong>
          {statusOverride && (
            <span style={{ marginLeft: 8, fontSize: 11, background: "#ecfdf5", color: "#015845", padding: "2px 8px", borderRadius: 12, border: "1px solid #d1fae5", fontWeight: 600 }}>
              Status: {statusOverride}
            </span>
          )}
        </span>
        <button
          onClick={() => window.print()}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 18px", borderRadius: 6, border: "none", background: "#015845", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "Inter, sans-serif" }}
        >
          ⬇ Download / Print PDF
        </button>
      </div>

      {/* Page wrapper */}
      <div style={{ background: "#eef2f7", minHeight: "calc(100vh - 49px)", padding: "32px 16px 48px", display: "flex", justifyContent: "center" }}>
        <div className="receipt-page" style={{ boxShadow: "0 4px 24px rgba(0,0,0,0.12)", borderRadius: 4, overflow: "hidden" }}>
          <TicketReceiptView attendee={attendee} overrides={statusOverride ? { status: statusOverride } : {}} />
        </div>
      </div>
    </>
  );
}
