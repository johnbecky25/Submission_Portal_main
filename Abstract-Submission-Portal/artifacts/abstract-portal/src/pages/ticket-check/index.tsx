import React, { useState, useRef, useCallback, useEffect } from "react";
import { useLocation } from "wouter";
import { ReceiptGeneratorDialog } from "@/components/receipt-generator-dialog";
import {
  useGetTicketSummary,
  useUploadTicketCsv,
  useSyncTicketsFromDrive,
  getGetTicketSummaryQueryKey,
  useGetDashboardSpeakerPaymentStats,
  getGetDashboardSpeakerPaymentStatsQueryKey,
} from "@workspace/api-client-react";
import type {
  TicketSummaryPortalUsersWithTicketItem,
  TicketSummaryPortalUsersWithoutTicketItem,
  TicketAttendeeRow,
  TicketSummaryByTicketTypeItem,
  TicketSummaryByStatusItem,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import {
  Upload, CheckCircle2, XCircle, AlertCircle, Download, Search, FileSpreadsheet,
  ChevronDown, ChevronUp, RefreshCw, TicketCheck as TicketCheckIcon, Users, Clock, CloudUpload,
  Link as LinkIcon, FileText, Zap, Copy, ExternalLink,
} from "lucide-react";

type CsvRow = Record<string, string>;
type SectionKey = "matched" | "no_ticket" | "csv_only";

function parseCSV(text: string): CsvRow[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const headers = parseCSVLine(lines[0]);
  return lines.slice(1).map((line) => {
    const vals = parseCSVLine(line);
    const row: CsvRow = {};
    headers.forEach((h, i) => { row[h.trim()] = (vals[i] ?? "").trim(); });
    return row;
  });
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let cur = "";
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuote && line[i + 1] === '"') { cur += '"'; i++; }
      else { inQuote = !inQuote; }
    } else if (c === "," && !inQuote) {
      result.push(cur); cur = "";
    } else { cur += c; }
  }
  result.push(cur);
  return result;
}

function guessEmailColumn(headers: string[]): string {
  const candidates = ["email", "e-mail", "email address", "attendee email", "registrant email"];
  return headers.find((h) => candidates.includes(h.toLowerCase())) ?? headers[0] ?? "";
}
function guessNameColumn(headers: string[]): string {
  const candidates = ["name", "full name", "attendee name", "first name", "firstname"];
  return headers.find((h) => candidates.includes(h.toLowerCase())) ?? "";
}
function guessTicketTypeColumn(headers: string[]): string {
  const candidates = ["ticket type", "ticket", "ticket name", "pass type", "category"];
  return headers.find((h) => candidates.includes(h.toLowerCase())) ?? "";
}
function guessStatusColumn(headers: string[]): string {
  const candidates = ["status", "registration status", "order status"];
  return headers.find((h) => candidates.includes(h.toLowerCase())) ?? "";
}
function guessPaymentStatusColumn(headers: string[]): string {
  const candidates = ["payment status", "payment_status", "pay status", "payment", "pay_status"];
  return headers.find((h) => candidates.includes(h.toLowerCase())) ?? "";
}

function downloadCSV(rows: { name: string; email: string; role?: string; ticketType?: string; registrationStatus?: string; status?: string }[], filename: string) {
  const headers = ["Name", "Email", "Role", "Ticket Type", "Registration Status", "Status"];
  const lines = [
    headers.join(","),
    ...rows.map((r) =>
      [r.name, r.email, r.role ?? "", r.ticketType ?? "", r.registrationStatus ?? "", r.status ?? ""]
        .map((v) => `"${(v ?? "").replace(/"/g, '""')}"`)
        .join(",")
    ),
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}

const MATCH_COLORS = ["#015845", "#ef4444", "#f59e0b"];
const TICKET_COLORS = ["#0381ED", "#015845", "#f59e0b", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316"];
const NONE_VALUE = "__none__";

const roleBadge = (role?: string) => {
  if (!role) return null;
  const color =
    role === "admin" || role === "reviewer_admin"
      ? "bg-primary/10 text-primary border-primary/20"
      : role === "reviewer"
      ? "bg-amber-100 text-amber-800 border-amber-200"
      : "bg-muted text-muted-foreground";
  const label =
    role === "reviewer_admin" ? "Rev/Admin" :
    role === "admin" ? "Admin" :
    role === "reviewer" ? "Reviewer" : "Author";
  return <Badge variant="outline" className={`text-xs ${color}`}>{label}</Badge>;
};

type WithAttendeeId = TicketSummaryPortalUsersWithTicketItem & { attendeeId?: number };

export default function TicketCheck() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const isAdmin = user?.role === "admin" || user?.role === "reviewer_admin";
  const [showReceiptDialog, setShowReceiptDialog] = useState(false);

  const { data: summary, isLoading, isFetching } = useGetTicketSummary({
    query: { enabled: !!user, queryKey: getGetTicketSummaryQueryKey(), refetchInterval: 30000 }
  });

  const { data: speakerPayment, refetch: refetchSpeakerPayment, isFetching: speakerPaymentFetching } = useGetDashboardSpeakerPaymentStats({
    query: { enabled: !!user && isAdmin, queryKey: getGetDashboardSpeakerPaymentStatsQueryKey(), refetchInterval: 30000 },
  });

  const uploadMutation = useUploadTicketCsv();
  const driveMutation = useSyncTicketsFromDrive();

  // Zoho state
  type ZohoStatus = { connected: boolean; portalSlug?: string; eventId?: string; zohoDomain?: string; webhookToken?: string; lastSyncedAt?: string | null };
  const [zohoStatus, setZohoStatus] = useState<ZohoStatus | null>(null);
  const [zohoSyncing, setZohoSyncing] = useState(false);
  const [zohoForm, setZohoForm] = useState({ portalSlug: "", eventId: "", clientId: "", clientSecret: "", zohoDomain: "zoho.com" });
  const [zohoSaving, setZohoSaving] = useState(false);

  useEffect(() => {
    if (!isAdmin) return;
    fetch("/api/zoho/status", { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then((data: ZohoStatus | null) => { if (data) setZohoStatus(data); })
      .catch(() => {});
    // Handle OAuth redirect back
    const params = new URLSearchParams(window.location.search);
    if (params.get("zoho_connected") === "1") {
      toast({ title: "Zoho Backstage connected!" });
      navigate("/ticket-check");
    }
    if (params.get("zoho_error")) {
      toast({ title: `Zoho error: ${params.get("zoho_error")}`, variant: "destructive" });
      navigate("/ticket-check");
    }
  }, [isAdmin]);

  const handleZohoSaveAndConnect = async () => {
    setZohoSaving(true);
    try {
      const r = await fetch("/api/zoho/config", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(zohoForm),
      });
      if (!r.ok) { const j = await r.json() as { error?: string }; throw new Error(j.error ?? "Failed"); }
      window.location.href = "/api/zoho/oauth/start";
    } catch (e: unknown) {
      toast({ title: e instanceof Error ? e.message : "Failed to save config", variant: "destructive" });
      setZohoSaving(false);
    }
  };

  const handleZohoSync = async () => {
    setZohoSyncing(true);
    try {
      const r = await fetch("/api/zoho/sync", { method: "POST", credentials: "include" });
      const j = await r.json() as { ok?: boolean; count?: number; error?: string };
      if (!r.ok) throw new Error(j.error ?? "Sync failed");
      toast({ title: `Synced ${j.count ?? 0} attendees from Zoho Backstage` });
      queryClient.invalidateQueries({ queryKey: getGetTicketSummaryQueryKey() });
      const statusRes = await fetch("/api/zoho/status", { credentials: "include" });
      if (statusRes.ok) setZohoStatus(await statusRes.json() as ZohoStatus);
    } catch (e: unknown) {
      toast({ title: e instanceof Error ? e.message : "Sync failed", variant: "destructive" });
    } finally {
      setZohoSyncing(false);
    }
  };

  const handleZohoDisconnect = async () => {
    await fetch("/api/zoho/disconnect", { method: "POST", credentials: "include" });
    setZohoStatus(s => s ? { ...s, connected: false } : s);
    toast({ title: "Zoho Backstage disconnected" });
  };

  // Upload state
  const [showUpload, setShowUpload] = useState(false);
  const [uploadTab, setUploadTab] = useState<"file" | "drive" | "zoho">("file");
  // File upload
  const [csvRows, setCsvRows] = useState<CsvRow[]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [fileName, setFileName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Shared column mapping
  const [emailCol, setEmailCol] = useState("");
  const [nameCol, setNameCol] = useState("");
  const [ticketTypeCol, setTicketTypeCol] = useState("");
  const [statusCol, setStatusCol] = useState("");
  const [paymentStatusCol, setPaymentStatusCol] = useState("");
  // Drive state
  const [driveUrl, setDriveUrl] = useState("");
  const [driveHeaders, setDriveHeaders] = useState<string[]>([]);
  const [driveRowCount, setDriveRowCount] = useState(0);
  const [driveFetching, setDriveFetching] = useState(false);
  const [driveError, setDriveError] = useState("");

  // Table section state
  const [search, setSearch] = useState("");
  const [collapsed, setCollapsed] = useState<Record<SectionKey, boolean>>({ matched: false, no_ticket: true, csv_only: true });
  const toggleSection = (key: SectionKey) => setCollapsed((p) => ({ ...p, [key]: !p[key] }));

  const handleFile = useCallback((file: File) => {
    if (!file.name.endsWith(".csv")) {
      toast({ title: "Please upload a CSV file", variant: "destructive" });
      return;
    }
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const rows = parseCSV(text);
      if (rows.length === 0) {
        toast({ title: "CSV appears empty or invalid", variant: "destructive" });
        return;
      }
      const headers = Object.keys(rows[0]);
      setCsvRows(rows);
      setCsvHeaders(headers);
      setEmailCol(guessEmailColumn(headers));
      setNameCol(guessNameColumn(headers));
      setTicketTypeCol(guessTicketTypeColumn(headers));
      setStatusCol(guessStatusColumn(headers));
    };
    reader.readAsText(file);
  }, [toast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const resetUploadState = () => {
    setCsvRows([]); setCsvHeaders([]); setFileName("");
    setEmailCol(""); setNameCol(""); setTicketTypeCol(""); setStatusCol(""); setPaymentStatusCol("");
    if (fileInputRef.current) fileInputRef.current.value = "";
    setDriveHeaders([]); setDriveRowCount(0); setDriveError("");
  };

  const handleSubmit = () => {
    if (!emailCol || csvRows.length === 0) return;
    uploadMutation.mutate(
      { data: { fileName, emailCol, nameCol, ticketTypeCol, statusCol, paymentStatusCol, rows: csvRows } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetTicketSummaryQueryKey() });
          setShowUpload(false);
          resetUploadState();
          toast({ title: "CSV uploaded and saved successfully" });
        },
        onError: () => toast({ title: "Upload failed", variant: "destructive" }),
      }
    );
  };

  const handleFetchDriveHeaders = async () => {
    if (!driveUrl.trim()) return;
    setDriveFetching(true);
    setDriveError("");
    setDriveHeaders([]);
    try {
      const res = await fetch(`/api/tickets/drive-headers?url=${encodeURIComponent(driveUrl.trim())}`, { credentials: "include" });
      const json = await res.json() as { headers?: string[]; rowCount?: number; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Failed to fetch");
      const headers = json.headers ?? [];
      setDriveHeaders(headers);
      setDriveRowCount(json.rowCount ?? 0);
      setEmailCol(guessEmailColumn(headers));
      setNameCol(guessNameColumn(headers));
      setTicketTypeCol(guessTicketTypeColumn(headers));
      setStatusCol(guessStatusColumn(headers));
      setPaymentStatusCol(guessPaymentStatusColumn(headers));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to fetch columns";
      setDriveError(msg);
    } finally {
      setDriveFetching(false);
    }
  };

  const handleDriveSync = () => {
    if (!driveUrl.trim() || !emailCol) return;
    driveMutation.mutate(
      { data: { driveUrl: driveUrl.trim(), emailCol, nameCol, ticketTypeCol, statusCol, paymentStatusCol } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetTicketSummaryQueryKey() });
          setShowUpload(false);
          resetUploadState();
          toast({ title: "Synced from Google Drive successfully" });
        },
        onError: (e: unknown) => {
          const msg = e instanceof Error ? e.message : "Sync failed";
          toast({ title: msg, variant: "destructive" });
        },
      }
    );
  };

  const handleReSyncDrive = async () => {
    if (!hasSummary || !summary.sync?.driveUrl) return;

    // If the stored mapping has no paymentStatusCol, fetch live headers and auto-detect it
    let resolvedPaymentStatusCol = summary.sync.paymentStatusCol ?? "";
    if (!resolvedPaymentStatusCol) {
      try {
        const res = await fetch(
          `/api/tickets/drive-headers?url=${encodeURIComponent(summary.sync.driveUrl)}`,
          { credentials: "include" }
        );
        const json = await res.json() as { headers?: string[]; error?: string };
        if (res.ok && json.headers) {
          resolvedPaymentStatusCol = guessPaymentStatusColumn(json.headers);
        }
      } catch {
        // silently fall through with empty string — sync will still run
      }
    }

    driveMutation.mutate(
      {
        data: {
          driveUrl: summary.sync.driveUrl,
          emailCol: summary.sync.emailCol,
          nameCol: summary.sync.nameCol ?? "",
          ticketTypeCol: summary.sync.ticketTypeCol ?? "",
          statusCol: summary.sync.statusCol ?? "",
          paymentStatusCol: resolvedPaymentStatusCol,
        }
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetTicketSummaryQueryKey() });
          toast({ title: "Re-synced from Google Drive" });
        },
        onError: (e: unknown) => {
          const msg = e instanceof Error ? e.message : "Re-sync failed";
          toast({ title: msg, variant: "destructive" });
        },
      }
    );
  };

  const hasSummary = summary && typeof summary === "object" && "totalAttendees" in summary;

  type WithSpeakerFlag = TicketSummaryPortalUsersWithoutTicketItem & { isSpeaker?: boolean };

  const speakerNoTicketCount = hasSummary
    ? (summary.portalUsersWithoutTicket as WithSpeakerFlag[]).filter((r) => r.isSpeaker === true).length
    : 0;

  const matchPieData = hasSummary ? [
    { name: "With ticket", value: summary.matched },
    { name: "No ticket", value: summary.noTicket },
    { name: "Ticket only", value: summary.csvOnly },
  ] : [];

  const filteredWithTicket: TicketSummaryPortalUsersWithTicketItem[] = hasSummary
    ? summary.portalUsersWithTicket.filter((r: TicketSummaryPortalUsersWithTicketItem) =>
        !search || r.name.toLowerCase().includes(search.toLowerCase()) || r.email.toLowerCase().includes(search.toLowerCase()))
    : [];
  const filteredNoTicket: WithSpeakerFlag[] = hasSummary
    ? (summary.portalUsersWithoutTicket as WithSpeakerFlag[]).filter((r) =>
        r.isSpeaker === true &&
        (!search || r.name.toLowerCase().includes(search.toLowerCase()) || r.email.toLowerCase().includes(search.toLowerCase())))
    : [];
  const filteredCsvOnly: TicketAttendeeRow[] = hasSummary
    ? summary.attendeesNotInPortal.filter((r: TicketAttendeeRow) =>
        !search || r.name.toLowerCase().includes(search.toLowerCase()) || r.email.toLowerCase().includes(search.toLowerCase()))
    : [];

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-foreground">Ticket Dashboard</h1>
          <p className="text-muted-foreground mt-0.5 text-sm">
            Cross-reference Zoho Backstage attendees with portal users
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hasSummary ? (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-full">
              <Clock className="h-3.5 w-3.5" />
              Last synced {new Date(summary.sync!.syncedAt).toLocaleString()}
            </div>
          ) : null}
          {isAdmin && zohoStatus?.connected ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handleZohoSync}
              disabled={zohoSyncing}
              className="border-[#015845] text-[#015845] hover:bg-green-50"
              title="Fetch latest attendees from Zoho Backstage"
            >
              <Zap className={`h-3.5 w-3.5 mr-1.5 ${zohoSyncing ? "animate-pulse" : ""}`} />
              {zohoSyncing ? "Syncing…" : "Sync Zoho"}
            </Button>
          ) : null}
          {hasSummary && summary.sync?.driveUrl && isAdmin ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handleReSyncDrive}
              disabled={driveMutation.isPending}
              title="Re-fetch from Google Drive and update the dashboard"
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${driveMutation.isPending ? "animate-spin" : ""}`} />
              Re-sync Drive
            </Button>
          ) : null}
          {hasSummary && isAdmin ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowReceiptDialog(true)}
              className="border-[#015845] text-[#015845] hover:bg-green-50"
            >
              <FileText className="h-3.5 w-3.5 mr-1.5" />
              Generate Receipt
            </Button>
          ) : null}
          {isAdmin && (
            <Button
              onClick={() => { setShowUpload((v) => !v); resetUploadState(); }}
              style={{ background: showUpload ? undefined : "#015845" }}
              variant={showUpload ? "outline" : "default"}
              className={showUpload ? "" : "text-white"}
              size="sm"
            >
              <CloudUpload className="h-4 w-4 mr-1.5" />
              {showUpload ? "Cancel" : hasSummary ? "Update" : "Import"}
            </Button>
          )}
          {hasSummary ? (
            <Button variant="ghost" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: getGetTicketSummaryQueryKey() })} disabled={isFetching}>
              <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
            </Button>
          ) : null}
        </div>
      </div>

      {/* Upload Panel */}
      {showUpload && isAdmin ? (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Import Attendee Data</CardTitle>
            <CardDescription>Upload a CSV file or link a Google Drive file. The data is saved to the database and persists across sessions.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Tab switcher */}
            <div className="flex gap-1 p-1 bg-muted rounded-lg w-fit">
              <button
                onClick={() => setUploadTab("file")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${uploadTab === "file" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                <FileSpreadsheet className="h-3.5 w-3.5" /> Upload CSV file
              </button>
              <button
                onClick={() => setUploadTab("drive")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${uploadTab === "drive" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                <LinkIcon className="h-3.5 w-3.5" /> Google Drive link
              </button>
              <button
                onClick={() => setUploadTab("zoho")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${uploadTab === "zoho" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                <Zap className="h-3.5 w-3.5" /> Zoho Backstage
              </button>
            </div>

            {/* File upload tab */}
            {uploadTab === "file" ? (
              <div className="space-y-4">
                <div
                  className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 hover:bg-background/50 transition-colors"
                  onDrop={handleDrop}
                  onDragOver={(e) => e.preventDefault()}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-7 w-7 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm font-medium">{fileName || "Drop CSV here or click to browse"}</p>
                  <p className="text-xs text-muted-foreground mt-1">{csvRows.length > 0 ? `${csvRows.length} rows detected` : "Supports Zoho Backstage attendee export (.csv)"}</p>
                  <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
                </div>
                {csvHeaders.length > 0 ? (
                  <div className="space-y-3">
                    <p className="text-sm font-medium">Map CSV columns</p>
                    <ColumnMapper headers={csvHeaders} emailCol={emailCol} nameCol={nameCol} ticketTypeCol={ticketTypeCol} statusCol={statusCol} paymentStatusCol={paymentStatusCol} setEmailCol={setEmailCol} setNameCol={setNameCol} setTicketTypeCol={setTicketTypeCol} setStatusCol={setStatusCol} setPaymentStatusCol={setPaymentStatusCol} />
                    <Button style={{ background: "#015845" }} className="text-white" disabled={!emailCol || uploadMutation.isPending} onClick={handleSubmit}>
                      {uploadMutation.isPending ? "Saving…" : `Save & Cross-Reference (${csvRows.length} rows)`}
                    </Button>
                  </div>
                ) : null}
              </div>
            ) : uploadTab === "drive" ? (
              /* Google Drive tab */
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Google Drive share link</label>
                  <p className="text-xs text-muted-foreground">
                    In Google Drive: right-click the CSV → <strong>Share</strong> → set to <strong>"Anyone with the link"</strong> → copy link.
                  </p>
                  <div className="flex gap-2">
                    <Input
                      className="flex-1 font-mono text-xs"
                      placeholder="https://drive.google.com/file/d/..."
                      value={driveUrl}
                      onChange={(e) => { setDriveUrl(e.target.value); setDriveHeaders([]); setDriveError(""); }}
                    />
                    <Button variant="outline" onClick={handleFetchDriveHeaders} disabled={!driveUrl.trim() || driveFetching}>
                      {driveFetching ? <RefreshCw className="h-4 w-4 animate-spin" /> : "Fetch columns"}
                    </Button>
                  </div>
                  {driveError ? <p className="text-xs text-destructive flex items-center gap-1"><XCircle className="h-3.5 w-3.5" /> {driveError}</p> : null}
                </div>
                {driveHeaders.length > 0 ? (
                  <div className="space-y-3">
                    <p className="text-sm font-medium">Columns detected — <span className="text-muted-foreground font-normal">{driveRowCount} rows</span></p>
                    <ColumnMapper headers={driveHeaders} emailCol={emailCol} nameCol={nameCol} ticketTypeCol={ticketTypeCol} statusCol={statusCol} paymentStatusCol={paymentStatusCol} setEmailCol={setEmailCol} setNameCol={setNameCol} setTicketTypeCol={setTicketTypeCol} setStatusCol={setStatusCol} setPaymentStatusCol={setPaymentStatusCol} />
                    <Button style={{ background: "#015845" }} className="text-white" disabled={!emailCol || driveMutation.isPending} onClick={handleDriveSync}>
                      {driveMutation.isPending ? "Syncing…" : `Sync & Save (${driveRowCount} rows)`}
                    </Button>
                    <p className="text-xs text-muted-foreground">The link is saved — use <strong>Re-sync Drive</strong> anytime to refresh the data.</p>
                  </div>
                ) : null}
              </div>
            ) : (
              /* Zoho Backstage tab */
              <div className="space-y-5">
                {zohoStatus?.connected ? (
                  /* ── Connected state ── */
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                      <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-emerald-900">Connected to Zoho Backstage</p>
                        <p className="text-xs text-emerald-700 truncate">Event: {zohoStatus.eventId} · Portal: {zohoStatus.portalSlug}</p>
                        {zohoStatus.lastSyncedAt && (
                          <p className="text-xs text-emerald-600">Last synced {new Date(zohoStatus.lastSyncedAt).toLocaleString()}</p>
                        )}
                      </div>
                      <Button variant="outline" size="sm" onClick={handleZohoDisconnect} className="text-red-600 border-red-200 hover:bg-red-50 flex-shrink-0">Disconnect</Button>
                    </div>

                    <div className="space-y-1.5">
                      <p className="text-sm font-medium flex items-center gap-1.5"><Zap className="h-4 w-4 text-[#015845]" /> Sync attendees now</p>
                      <p className="text-xs text-muted-foreground">Fetches every attendee from Zoho Backstage and updates the dashboard. Run after bulk changes.</p>
                      <Button style={{ background: "#015845" }} className="text-white mt-1" onClick={handleZohoSync} disabled={zohoSyncing}>
                        {zohoSyncing ? <><RefreshCw className="h-4 w-4 mr-1.5 animate-spin" />Syncing…</> : <><Zap className="h-4 w-4 mr-1.5" />Sync from Zoho now</>}
                      </Button>
                    </div>

                    {zohoStatus.webhookToken && (
                      <div className="space-y-1.5">
                        <p className="text-sm font-medium">Webhook URL <span className="text-xs font-normal text-muted-foreground">(real-time updates)</span></p>
                        <p className="text-xs text-muted-foreground">Paste this URL in <strong>Zoho Backstage → Settings → Webhooks</strong>. Zoho will call it instantly on every registration, cancellation, or check-in.</p>
                        <div className="flex gap-2 items-center">
                          <code className="flex-1 text-[11px] bg-muted px-3 py-2 rounded-lg border truncate">
                            {window.location.origin}/api/zoho/webhook?token={zohoStatus.webhookToken}
                          </code>
                          <Button variant="outline" size="sm" onClick={() => {
                            void navigator.clipboard.writeText(`${window.location.origin}/api/zoho/webhook?token=${zohoStatus.webhookToken}`);
                            toast({ title: "Webhook URL copied" });
                          }}><Copy className="h-3.5 w-3.5" /></Button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  /* ── Setup form ── */
                  <div className="space-y-4">
                    <div className="flex items-start gap-3 px-4 py-3 bg-blue-50 border border-blue-100 rounded-xl">
                      <Zap className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-blue-800">
                        Connect your Zoho Backstage event for real-time attendee sync. Cancellations, new registrations, and check-ins will update automatically via webhooks — no more manual exports.
                        {" "}<a href="https://api-console.zoho.com" target="_blank" rel="noopener noreferrer" className="underline font-medium inline-flex items-center gap-0.5">Get credentials <ExternalLink className="h-3 w-3" /></a>
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-medium">Client ID</label>
                        <Input placeholder="1000.XXXXXXXXXX..." value={zohoForm.clientId} onChange={e => setZohoForm(f => ({ ...f, clientId: e.target.value }))} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium">Client Secret</label>
                        <Input type="password" placeholder="••••••••••••" value={zohoForm.clientSecret} onChange={e => setZohoForm(f => ({ ...f, clientSecret: e.target.value }))} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium">Portal slug</label>
                        <Input placeholder="yourportal" value={zohoForm.portalSlug} onChange={e => setZohoForm(f => ({ ...f, portalSlug: e.target.value }))} />
                        <p className="text-[10px] text-muted-foreground">From your Backstage URL: backstage.zoho.com/site/<strong>yourportal</strong>/…</p>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium">Event ID</label>
                        <Input placeholder="3000000012345" value={zohoForm.eventId} onChange={e => setZohoForm(f => ({ ...f, eventId: e.target.value }))} />
                        <p className="text-[10px] text-muted-foreground">From your Backstage URL: …/events/<strong>3000000012345</strong></p>
                      </div>
                      <div className="space-y-1 sm:col-span-2">
                        <label className="text-xs font-medium">Zoho data centre</label>
                        <select className="w-full border rounded-md px-3 py-2 text-sm bg-background" value={zohoForm.zohoDomain} onChange={e => setZohoForm(f => ({ ...f, zohoDomain: e.target.value }))}>
                          <option value="zoho.com">Global (zoho.com)</option>
                          <option value="zoho.eu">Europe (zoho.eu)</option>
                          <option value="zoho.in">India (zoho.in)</option>
                          <option value="zoho.com.au">Australia (zoho.com.au)</option>
                          <option value="zoho.jp">Japan (zoho.jp)</option>
                        </select>
                      </div>
                    </div>

                    <Button
                      style={{ background: "#015845" }} className="text-white"
                      disabled={!zohoForm.clientId || !zohoForm.clientSecret || !zohoForm.portalSlug || !zohoForm.eventId || zohoSaving}
                      onClick={handleZohoSaveAndConnect}
                    >
                      {zohoSaving ? <><RefreshCw className="h-4 w-4 mr-1.5 animate-spin" />Saving…</> : <><ExternalLink className="h-4 w-4 mr-1.5" />Save & Connect to Zoho</>}
                    </Button>
                    <p className="text-xs text-muted-foreground">You'll be redirected to Zoho to authorise access, then brought back here.</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}

      {/* Loading */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground gap-2">
          <RefreshCw className="h-4 w-4 animate-spin" /> Loading dashboard…
        </div>
      ) : null}

      {/* Empty state */}
      {!isLoading && !hasSummary && !showUpload ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center gap-4">
            <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center">
              <TicketCheckIcon className="h-7 w-7 text-muted-foreground" />
            </div>
            <div>
              <p className="font-semibold text-foreground">No ticket data yet</p>
              <p className="text-sm text-muted-foreground mt-1">Upload a Zoho Backstage CSV to see the dashboard</p>
            </div>
            {isAdmin && (
              <Button style={{ background: "#015845" }} className="text-white" onClick={() => setShowUpload(true)}>
                <CloudUpload className="h-4 w-4 mr-1.5" /> Upload CSV
              </Button>
            )}
          </CardContent>
        </Card>
      ) : null}

      {/* Dashboard */}
      {hasSummary ? (
        <>
          {/* Ticket coverage stat cards */}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-2 px-0.5">Ticket Coverage</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <StatCard
                label="Total Attendees"
                value={summary.totalAttendees}
                icon={<Users className="h-5 w-5 text-[#0381ED]" />}
                color="blue"
              />
              <StatCard
                label="With Ticket"
                value={summary.matched}
                pct={summary.matched + summary.noTicket > 0 ? Math.round((summary.matched / (summary.matched + summary.noTicket)) * 100) : 0}
                icon={<CheckCircle2 className="h-5 w-5 text-[#015845]" />}
                color="green"
                sub={`${summary.matched + summary.noTicket > 0 ? Math.round(summary.matched / (summary.matched + summary.noTicket) * 100) : 0}% of portal users`}
              />
              <StatCard
                label="Speakers No Ticket"
                value={speakerNoTicketCount}
                icon={<XCircle className="h-5 w-5 text-red-500" />}
                color="red"
                sub="Reviewers without a ticket"
              />
              <StatCard
                label="Ticket Only"
                value={summary.csvOnly}
                icon={<AlertCircle className="h-5 w-5 text-amber-500" />}
                color="amber"
                sub="Not in portal"
              />
            </div>
          </div>

          {/* Speaker payment metrics */}
          {isAdmin && speakerPayment && !speakerPayment.noSyncYet && (() => {
            const paidCount = speakerPayment.byPaymentStatus.find(g => g.paymentStatus === "paid")?.count ?? 0;
            const unpaidCount = speakerPayment.byPaymentStatus.find(g => g.paymentStatus === "unpaid")?.count ?? 0;
            return (
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-2 px-0.5">Speaker Payments</p>
                <div className="grid grid-cols-2 gap-4">
                  <StatCard
                    label="Speakers Paid"
                    value={paidCount}
                    icon={<CheckCircle2 className="h-5 w-5 text-[#015845]" />}
                    color="green"
                    sub="Ticket payment confirmed"
                  />
                  <StatCard
                    label="Speakers Not Paid"
                    value={unpaidCount}
                    icon={<XCircle className="h-5 w-5 text-red-500" />}
                    color="red"
                    sub="Ticket payment outstanding"
                  />
                </div>
              </div>
            );
          })()}

          {/* Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Match breakdown donut */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Portal User Coverage</CardTitle>
                <CardDescription className="text-xs">Ticket status breakdown</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={matchPieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value" paddingAngle={2}>
                      {matchPieData.map((_entry, i) => (
                        <Cell key={i} fill={MATCH_COLORS[i]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => [`${v} people`, ""]} />
                    <Legend formatter={(value: string) => <span className="text-xs text-foreground">{value}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Ticket type bar */}
            {summary.byTicketType.length > 0 ? (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">By Ticket Type</CardTitle>
                  <CardDescription className="text-xs">Attendee distribution</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={summary.byTicketType} layout="vertical" margin={{ left: 8, right: 16 }}>
                      <XAxis type="number" tick={{ fontSize: 11 }} />
                      <YAxis type="category" dataKey="ticketType" tick={{ fontSize: 11 }} width={120} />
                      <Tooltip />
                      <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                        {summary.byTicketType.map((_entry: TicketSummaryByTicketTypeItem, i: number) => (
                          <Cell key={i} fill={TICKET_COLORS[i % TICKET_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            ) : null}

            {/* Registration status */}
            {summary.byStatus.length > 0 ? (
              <Card className="md:col-span-2">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">By Registration Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-3">
                    {summary.byStatus.filter((s: TicketSummaryByStatusItem) => s.status && s.status.toLowerCase() !== "unknown").map((s: TicketSummaryByStatusItem, i: number) => (
                      <div key={s.status} className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-muted/30">
                        <div className="h-3 w-3 rounded-full" style={{ background: TICKET_COLORS[i % TICKET_COLORS.length] }} />
                        <span className="text-sm font-medium">{s.status}</span>
                        <Badge variant="outline" className="text-xs">{s.count}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : null}
          </div>

          {/* Tables */}
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Showing data from <strong>{summary.sync!.fileName}</strong> · {summary.totalAttendees} attendees
            </p>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input className="pl-8 h-9 w-56" placeholder="Search name or email…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>

          <ResultSection
            title="Portal users WITH a ticket"
            icon={<CheckCircle2 className="h-4 w-4 text-green-600" />}
            count={filteredWithTicket.length}
            color="green"
            open={!collapsed.matched}
            onToggle={() => toggleSection("matched")}
            onExport={() => downloadCSV(filteredWithTicket.map((r: TicketSummaryPortalUsersWithTicketItem) => ({ ...r, status: "matched" })), "with_ticket.csv")}
          >
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-xs">Name</TableHead>
                  <TableHead className="text-xs">Email</TableHead>
                  <TableHead className="text-xs">Role</TableHead>
                  {summary.sync!.ticketTypeCol && <TableHead className="text-xs">Ticket Type</TableHead>}
                  {summary.sync!.statusCol && <TableHead className="text-xs">Reg. Status</TableHead>}
                  <TableHead className="text-xs text-right">Submissions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(filteredWithTicket as WithAttendeeId[]).map((r) => (
                  <TableRow key={r.email}>
                    <TableCell className="text-sm font-medium py-2">{r.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground py-2">{r.email}</TableCell>
                    <TableCell className="py-2">{roleBadge(r.role)}</TableCell>
                    {summary.sync!.ticketTypeCol && <TableCell className="text-sm py-2">{r.ticketType || <span className="text-muted-foreground">—</span>}</TableCell>}
                    {summary.sync!.statusCol && (
                      <TableCell className="py-2">
                        {r.registrationStatus ? (
                          <Badge variant="outline" className={`text-xs ${r.registrationStatus.toLowerCase().includes("confirm") || r.registrationStatus.toLowerCase().includes("paid") ? "bg-green-50 text-green-700 border-green-200" : ""}`}>
                            {r.registrationStatus}
                          </Badge>
                        ) : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                    )}
                    <TableCell className="text-sm text-right py-2">
                      {r.abstractCount > 0 ? <Badge variant="outline" className="text-xs">{r.abstractCount}</Badge> : <span className="text-muted-foreground text-xs">—</span>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ResultSection>

          <ResultSection
            title="Speakers WITHOUT a ticket"
            description="Speakers (reviewer accounts) in the portal who have no ticket in the CSV"
            icon={<XCircle className="h-4 w-4 text-red-500" />}
            count={filteredNoTicket.length}
            color="red"
            open={!collapsed.no_ticket}
            onToggle={() => toggleSection("no_ticket")}
            onExport={() => downloadCSV(filteredNoTicket.map((r: TicketSummaryPortalUsersWithoutTicketItem) => ({ ...r, status: "no_ticket" })), "no_ticket.csv")}
          >
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-xs">Name</TableHead>
                  <TableHead className="text-xs">Email</TableHead>
                  <TableHead className="text-xs">Role</TableHead>
                  <TableHead className="text-xs text-right">Submissions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredNoTicket.map((r: TicketSummaryPortalUsersWithoutTicketItem) => (
                  <TableRow key={r.email}>
                    <TableCell className="text-sm font-medium py-2">{r.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground py-2">{r.email}</TableCell>
                    <TableCell className="py-2">{roleBadge(r.role)}</TableCell>
                    <TableCell className="text-sm text-right py-2">
                      {r.abstractCount > 0 ? <Badge variant="outline" className="text-xs">{r.abstractCount}</Badge> : <span className="text-muted-foreground text-xs">—</span>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ResultSection>

          <ResultSection
            title="Ticket buyers NOT in portal"
            description="These people bought a ticket but have no portal account"
            icon={<AlertCircle className="h-4 w-4 text-amber-500" />}
            count={filteredCsvOnly.length}
            color="amber"
            open={!collapsed.csv_only}
            onToggle={() => toggleSection("csv_only")}
            onExport={() => downloadCSV(filteredCsvOnly.map((r: TicketAttendeeRow) => ({ ...r, status: "csv_only" })), "ticket_only.csv")}
          >
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-xs">Name</TableHead>
                  <TableHead className="text-xs">Email</TableHead>
                  {summary.sync!.ticketTypeCol && <TableHead className="text-xs">Ticket Type</TableHead>}
                  {summary.sync!.statusCol && <TableHead className="text-xs">Reg. Status</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCsvOnly.map((r: TicketAttendeeRow) => (
                  <TableRow key={r.email}>
                    <TableCell className="text-sm font-medium py-2">{r.name || r.email}</TableCell>
                    <TableCell className="text-sm text-muted-foreground py-2">{r.email}</TableCell>
                    {summary.sync!.ticketTypeCol && <TableCell className="text-sm py-2">{r.ticketType || <span className="text-muted-foreground">—</span>}</TableCell>}
                    {summary.sync!.statusCol && <TableCell className="text-sm py-2">{r.registrationStatus || <span className="text-muted-foreground">—</span>}</TableCell>}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ResultSection>
        </>
      ) : null}

      <ReceiptGeneratorDialog open={showReceiptDialog} onClose={() => setShowReceiptDialog(false)} />
    </div>
  );
}

function ColumnMapper({ headers, emailCol, nameCol, ticketTypeCol, statusCol, paymentStatusCol, setEmailCol, setNameCol, setTicketTypeCol, setStatusCol, setPaymentStatusCol }: {
  headers: string[];
  emailCol: string; nameCol: string; ticketTypeCol: string; statusCol: string; paymentStatusCol: string;
  setEmailCol: (v: string) => void; setNameCol: (v: string) => void;
  setTicketTypeCol: (v: string) => void; setStatusCol: (v: string) => void; setPaymentStatusCol: (v: string) => void;
}) {
  const fields: { label: string; value: string; setter: (v: string) => void; required: boolean }[] = [
    { label: "Email *", value: emailCol, setter: setEmailCol, required: true },
    { label: "Name", value: nameCol, setter: setNameCol, required: false },
    { label: "Ticket type", value: ticketTypeCol, setter: setTicketTypeCol, required: false },
    { label: "Reg. Status", value: statusCol, setter: setStatusCol, required: false },
    { label: "Payment Status ★", value: paymentStatusCol, setter: setPaymentStatusCol, required: false },
  ];
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {fields.map(({ label, value, setter, required }) => {
        const selectValue = value || NONE_VALUE;
        const handleChange = (v: string) => setter(v === NONE_VALUE ? "" : v);
        return (
          <div key={label} className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</label>
            <Select value={selectValue} onValueChange={handleChange}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="(none)" /></SelectTrigger>
              <SelectContent>
                {!required && <SelectItem value={NONE_VALUE}>(none)</SelectItem>}
                {headers.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        );
      })}
    </div>
  );
}

function StatCard({ label, value, icon, color, sub, pct }: {
  label: string; value: number; icon: React.ReactNode;
  color: "blue" | "green" | "red" | "amber"; sub?: string; pct?: number;
}) {
  const bg = color === "blue" ? "bg-blue-50 border-blue-100" : color === "green" ? "bg-green-50 border-green-100" : color === "red" ? "bg-red-50 border-red-100" : "bg-amber-50 border-amber-100";
  return (
    <Card className={`border ${bg}`}>
      <CardContent className="pt-4 pb-4 px-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
            <p className="text-3xl font-bold text-foreground mt-1">{value.toLocaleString()}</p>
            {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
          </div>
          <div className="mt-0.5">{icon}</div>
        </div>
        {pct !== undefined ? (
          <div className="mt-3 h-1.5 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-[#015845] rounded-full transition-all" style={{ width: `${pct}%` }} />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function ResultSection({ title, description, icon, count, color, open, onToggle, onExport, children }: {
  title: string; description?: string; icon: React.ReactNode; count: number;
  color: "green" | "red" | "amber"; open: boolean; onToggle: () => void; onExport: () => void;
  children: React.ReactNode;
}) {
  const borderColor = color === "green" ? "border-green-200" : color === "red" ? "border-red-200" : "border-amber-200";
  const headerBg = color === "green" ? "bg-green-50" : color === "red" ? "bg-red-50" : "bg-amber-50";
  return (
    <Card className={`border ${borderColor}`}>
      <CardHeader className={`pb-2 pt-3 px-4 ${headerBg} cursor-pointer rounded-t-lg`} onClick={onToggle}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {icon}
            <CardTitle className="text-sm font-semibold">{title}</CardTitle>
            <Badge variant="outline" className="text-xs">{count}</Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={(e) => { e.stopPropagation(); onExport(); }} disabled={count === 0}>
              <Download className="h-3 w-3 mr-1" /> Export CSV
            </Button>
            {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </div>
        </div>
        {description && <p className="text-xs text-muted-foreground mt-0.5 ml-6">{description}</p>}
      </CardHeader>
      {open ? (
        <CardContent className="p-0">
          {count === 0
            ? <p className="text-sm text-muted-foreground text-center py-6">No records in this category.</p>
            : children}
        </CardContent>
      ) : null}
    </Card>
  );
}
