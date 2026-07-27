import { useState, useEffect, useRef } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, Download, Loader2, UserCircle2, X, ChevronDown, ChevronUp } from "lucide-react";
import { TicketReceiptView, type AttendeeRecord, type ReceiptOverrides } from "./ticket-receipt-view";

interface SearchResult {
  id: number;
  email: string;
  name: string;
  ticketType: string;
  registrationStatus: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
}

const STATUS_OPTIONS = [
  "PAID",
  "FREE TICKET",
  "COMPLIMENTARY",
  "PENDING",
  "UNPAID",
];

function field(label: string, value: string, onChange: (v: string) => void, placeholder?: string) {
  return (
    <div className="flex flex-col gap-1">
      <Label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</Label>
      <Input
        className="h-8 text-xs"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? label}
      />
    </div>
  );
}

export function ReceiptGeneratorDialog({ open, onClose }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [attendee, setAttendee] = useState<AttendeeRecord | null>(null);
  const [loadingAttendee, setLoadingAttendee] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [editOpen, setEditOpen] = useState(true);
  const [overrides, setOverrides] = useState<ReceiptOverrides>({});
  const searchRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults([]);
      setSelectedId(null);
      setAttendee(null);
      setOverrides({});
      setShowResults(false);
      setEditOpen(true);
    }
  }, [open]);

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      setShowResults(false);
      return;
    }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/tickets/attendees/search?q=${encodeURIComponent(query)}`, { credentials: "include" });
        const data = await res.json() as SearchResult[];
        setResults(Array.isArray(data) ? data : []);
        setShowResults(true);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 280);
    return () => clearTimeout(t);
  }, [query]);

  const selectAttendee = async (r: SearchResult) => {
    setShowResults(false);
    setQuery(r.name || r.email);
    setSelectedId(r.id);
    setAttendee(null);
    setOverrides({});
    setLoadingAttendee(true);
    try {
      const res = await fetch(`/api/tickets/attendees/${r.id}`, { credentials: "include" });
      const data = await res.json() as AttendeeRecord;
      setAttendee(data);
      const d = data.rawData ?? {};
      const firstName = d.FIRST_NAME ?? "";
      const lastName = d.LAST_NAME ?? "";
      setOverrides({
        name: data.name || `${firstName} ${lastName}`.trim() || data.email,
        email: data.email,
        phone: d.MOBILE_NO ?? "",
        company: d.COMPANY_NAME ?? "",
        designation: d.DESIGNATION ?? "",
        country: d.COUNTRY ?? "",
        ticketClass: data.ticketType || d.TICKET_CLASS || "Standard",
        orderId: d.ORDER_ID ?? `ORD-${data.id}`,
        ticketId: d.TICKET_ID ?? `TKT-${data.id}`,
        amount: d.AMOUNT_COLLECTED ?? "0",
        quantity: "1",
        status: data.registrationStatus || d.PAYMENT_STATUS || "",
      });
    } catch {
      setAttendee(null);
    } finally {
      setLoadingAttendee(false);
    }
  };

  const set = (key: keyof ReceiptOverrides) => (val: string) =>
    setOverrides((prev) => ({ ...prev, [key]: val }));

  const handleDownload = async () => {
    // Capture from the full-scale hidden element, NOT from the zoomed preview
    const el = document.getElementById("receipt-pdf-source");
    if (!el || !attendee) return;
    setDownloading(true);
    try {
      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
        width: el.scrollWidth,
        height: el.scrollHeight,
      });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
      const pageW = pdf.internal.pageSize.getWidth();
      const imgH = (canvas.height * pageW) / canvas.width;
      pdf.addImage(imgData, "PNG", 0, 0, pageW, imgH);
      const safeName = (overrides.name ?? attendee.name ?? "receipt").replace(/[^a-z0-9]/gi, "_");
      pdf.save(`receipt_${safeName}.pdf`);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className="p-0 gap-0 overflow-hidden"
        style={{ maxWidth: 980, width: "96vw", maxHeight: "94vh", display: "flex", flexDirection: "column" }}
      >
        {/* ── Header ── */}
        <DialogHeader className="px-5 pt-4 pb-3 border-b flex-shrink-0">
          <DialogTitle className="text-base font-semibold flex items-center gap-2">
            <Download className="h-4 w-4 text-[#015845]" />
            Generate Receipt
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            Search for a delegate, edit any field, then download the PDF.
          </p>
        </DialogHeader>

        {/* ── Search bar ── */}
        <div className="px-5 pt-3 pb-3 border-b flex-shrink-0">
          <div className="flex gap-3 items-center">
            <div className="relative flex-1" ref={searchRef}>
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              {searching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground animate-spin" />}
              <Input
                className="pl-9 pr-9 h-9"
                placeholder="Type name or email…"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  if (!e.target.value) { setAttendee(null); setSelectedId(null); setOverrides({}); }
                }}
                autoFocus
              />
              {query && !searching && (
                <button
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => { setQuery(""); setAttendee(null); setSelectedId(null); setResults([]); setOverrides({}); }}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
              {showResults && results.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border rounded-lg shadow-lg overflow-hidden">
                  {results.map((r) => (
                    <button
                      key={r.id}
                      className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted/60 text-left transition-colors"
                      onClick={() => selectAttendee(r)}
                    >
                      <UserCircle2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium truncate">{r.name || r.email}</div>
                        <div className="text-xs text-muted-foreground truncate">{r.email}</div>
                      </div>
                      {r.ticketType && <Badge variant="outline" className="text-xs flex-shrink-0">{r.ticketType}</Badge>}
                      {r.registrationStatus && (
                        <Badge variant="outline" className={`text-xs flex-shrink-0 ${r.registrationStatus.toLowerCase().includes("paid") ? "bg-green-50 text-green-700 border-green-200" : ""}`}>
                          {r.registrationStatus}
                        </Badge>
                      )}
                    </button>
                  ))}
                </div>
              )}
              {showResults && results.length === 0 && query.length >= 2 && !searching && (
                <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border rounded-lg shadow-lg px-3 py-4 text-sm text-muted-foreground text-center">
                  No attendees found matching "{query}"
                </div>
              )}
            </div>

            {attendee && (
              <Button
                className="h-9 bg-[#015845] hover:bg-[#014a3a] text-white flex-shrink-0 gap-2"
                onClick={handleDownload}
                disabled={downloading}
              >
                {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                {downloading ? "Generating…" : "Download PDF"}
              </Button>
            )}
          </div>
        </div>

        {/* ── Edit panel (collapsible) ── */}
        {attendee && (
          <div className="border-b flex-shrink-0 bg-slate-50">
            <button
              className="w-full flex items-center justify-between px-5 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
              onClick={() => setEditOpen((v) => !v)}
            >
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-[#015845] inline-block" />
                Edit Receipt Fields
              </span>
              {editOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>

            {editOpen && (
              <div className="px-5 pb-4 grid grid-cols-4 gap-x-4 gap-y-3">
                {field("Full Name", overrides.name ?? "", set("name"))}
                {field("Email", overrides.email ?? "", set("email"))}
                {field("Phone", overrides.phone ?? "", set("phone"))}
                {field("Country", overrides.country ?? "", set("country"))}
                {field("Company / Organisation", overrides.company ?? "", set("company"))}
                {field("Designation", overrides.designation ?? "", set("designation"))}
                {field("Ticket Class", overrides.ticketClass ?? "", set("ticketClass"))}
                {field("Order ID", overrides.orderId ?? "", set("orderId"))}
                {field("Ticket ID", overrides.ticketId ?? "", set("ticketId"))}
                {field("Unit Amount (€)", overrides.amount ?? "", set("amount"), "e.g. 500")}

                {/* Quantity — multiplies unit amount to get grand total */}
                <div className="flex flex-col gap-1">
                  <Label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Quantity</Label>
                  <Input
                    className="h-8 text-xs"
                    type="number"
                    min={1}
                    step={1}
                    value={overrides.quantity ?? "1"}
                    onChange={(e) => set("quantity")(String(Math.max(1, parseInt(e.target.value) || 1)))}
                    placeholder="1"
                  />
                  {(() => {
                    const qty = Math.max(1, parseInt(overrides.quantity ?? "1") || 1);
                    const unit = parseFloat(overrides.amount ?? "0") || 0;
                    if (qty > 1 && unit > 0) {
                      const total = (unit * qty).toLocaleString("en-EU", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                      return <span className="text-[10px] text-[#015845] font-semibold">Grand total: €{total}</span>;
                    }
                    return null;
                  })()}
                </div>

                {/* Payment status select */}
                <div className="flex flex-col gap-1">
                  <Label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Payment Status</Label>
                  <Select
                    value={overrides.status ?? ""}
                    onValueChange={set("status")}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Select status…" />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((s) => (
                        <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Hidden full-scale receipt — used only for PDF capture (no zoom/transform) ── */}
        {attendee && !loadingAttendee && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: "-9999px",
              width: 794,
              pointerEvents: "none",
            }}
            aria-hidden="true"
          >
            <div id="receipt-pdf-source">
              <TicketReceiptView attendee={attendee} overrides={overrides} />
            </div>
          </div>
        )}

        {/* ── Preview (zoomed for display) ── */}
        <div className="flex-1 overflow-auto bg-[#eef2f7] min-h-0" ref={previewRef}>
          {!attendee && !loadingAttendee && (
            <div className="flex flex-col items-center justify-center h-full py-16 text-muted-foreground gap-3">
              <Search className="h-10 w-10 opacity-20" />
              <p className="text-sm">Search for a delegate above to preview their receipt</p>
            </div>
          )}
          {loadingAttendee && (
            <div className="flex items-center justify-center h-full py-16 text-muted-foreground gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm">Loading attendee…</span>
            </div>
          )}
          {attendee && !loadingAttendee && (
            <div className="py-6 px-4 flex justify-center">
              <div style={{ zoom: 0.74, transformOrigin: "top center" }}>
                <div style={{ boxShadow: "0 4px 24px rgba(0,0,0,0.12)", borderRadius: 4, overflow: "hidden" }}>
                  <TicketReceiptView attendee={attendee} overrides={overrides} />
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
