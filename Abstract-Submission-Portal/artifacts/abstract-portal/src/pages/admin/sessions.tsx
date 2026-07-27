import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pencil, Trash2, Download, CalendarDays, UserPlus, X, Users, Mail, Search, List, Clock, MapPin, ChevronRight, SlidersHorizontal } from "lucide-react";

type SessionSpeaker = {
  id: number;
  sessionId: number;
  name: string;
  jobTitle: string | null;
  organization: string | null;
  roleInSession: string | null;
  displayOrder: number;
};

type RosterSpeaker = {
  id: number;
  name: string;
  email: string;
  organization: string | null;
  jobTitle: string | null;
  status: string;
};

type Session = {
  id: number;
  title: string;
  description: string | null;
  track: string;
  room: string | null;
  date: string | null;
  startTime: string | null;
  endTime: string | null;
  isBreak: boolean;
  displayOrder: number;
  sessionType: string;
  keyTakeaways: string | null;
  durationMinutes: number;
  status: string;
  internalNotes: string | null;
  avRequirements: string | null;
  abstractId: number | null;
  trackId: number | null;
  roomId: number | null;
};

async function apiReq<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(path, {
    method,
    credentials: "include",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? res.statusText);
  return res.json() as Promise<T>;
}

const SESSION_TYPES = ["presentation", "keynote", "panel", "workshop", "break", "networking"];

const TYPE_STYLES: Record<string, { pill: string; bar: string; label: string }> = {
  keynote:      { pill: "bg-purple-100 text-purple-700 border-purple-200",  bar: "bg-purple-500",  label: "Keynote" },
  presentation: { pill: "bg-blue-100 text-blue-700 border-blue-200",        bar: "bg-[#0381ED]",   label: "Presentation" },
  panel:        { pill: "bg-orange-100 text-orange-700 border-orange-200",  bar: "bg-orange-500",  label: "Panel" },
  workshop:     { pill: "bg-teal-100 text-teal-700 border-teal-200",        bar: "bg-teal-500",    label: "Workshop" },
  break:        { pill: "bg-gray-100 text-gray-500 border-gray-200",        bar: "bg-gray-300",    label: "Break" },
  networking:   { pill: "bg-green-100 text-green-700 border-green-200",     bar: "bg-green-500",   label: "Networking" },
};

const STATUS_STYLES: Record<string, { dot: string; text: string; bg: string }> = {
  draft:     { dot: "bg-gray-400",    text: "text-gray-600",  bg: "bg-gray-50 border-gray-200" },
  confirmed: { dot: "bg-[#0381ED]",   text: "text-blue-700",  bg: "bg-blue-50 border-blue-200" },
  published: { dot: "bg-[#015845]",   text: "text-green-700", bg: "bg-green-50 border-green-200" },
};

function fmt12(t: string | null) {
  if (!t) return null;
  const [h, m] = t.split(":").map(Number);
  if (isNaN(h) || isNaN(m)) return t;
  const ampm = h >= 12 ? "pm" : "am";
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, "0")}${ampm}`;
}

export default function AdminSessions() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: sessions = [], isLoading } = useQuery<Session[]>({
    queryKey: ["conf-sessions"],
    queryFn: () => apiReq("GET", "/api/conf/sessions"),
  });

  const [editSession, setEditSession] = useState<Session | null>(null);
  const [manageSpeakersFor, setManageSpeakersFor] = useState<Session | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");

  const updateMutation = useMutation({
    mutationFn: (data: { id: number } & Partial<Session>) =>
      apiReq("PUT", `/api/conf/sessions/${data.id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["conf-sessions"] });
      setEditSession(null);
      toast({ title: "Session updated" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiReq("DELETE", `/api/programme/sessions/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["conf-sessions"] });
      setDeleteId(null);
      toast({ title: "Session deleted" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const handleImport = async () => {
    setImportLoading(true);
    try {
      const result = await apiReq<{ created_sessions: number; created_speakers: number; skipped: number }>("POST", "/api/conf/import-approved");
      toast({ title: "Import complete", description: `${result.created_sessions} sessions, ${result.created_speakers} speakers created. ${result.skipped} skipped.` });
      qc.invalidateQueries({ queryKey: ["conf-sessions"] });
    } catch (e) {
      toast({ title: "Import failed", description: (e as Error).message, variant: "destructive" });
    } finally {
      setImportLoading(false);
    }
  };

  const handlePublishConfirmed = async () => {
    try {
      await apiReq("POST", "/api/conf/sessions/publish-confirmed");
      qc.invalidateQueries({ queryKey: ["conf-sessions"] });
      toast({ title: "All confirmed sessions published" });
    } catch (e) {
      toast({ title: "Error", description: (e as Error).message, variant: "destructive" });
    }
  };

  // Stats
  const stats = useMemo(() => ({
    total: sessions.length,
    draft: sessions.filter(s => s.status === "draft").length,
    confirmed: sessions.filter(s => s.status === "confirmed").length,
    published: sessions.filter(s => s.status === "published").length,
  }), [sessions]);

  // Filtered + grouped
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return sessions.filter(s => {
      if (filterStatus !== "all" && s.status !== filterStatus) return false;
      if (filterType !== "all" && s.sessionType !== filterType) return false;
      if (q && !s.title.toLowerCase().includes(q) && !(s.track ?? "").toLowerCase().includes(q) && !(s.room ?? "").toLowerCase().includes(q)) return false;
      return true;
    });
  }, [sessions, search, filterStatus, filterType]);

  const grouped = useMemo(() => {
    const map = new Map<string, Session[]>();
    for (const s of filtered) {
      const day = s.date ?? "Unscheduled";
      if (!map.has(day)) map.set(day, []);
      map.get(day)!.push(s);
    }
    return Array.from(map.entries()).sort(([a], [b]) => {
      if (a === "Unscheduled") return 1;
      if (b === "Unscheduled") return -1;
      return a.localeCompare(b);
    });
  }, [filtered]);

  return (
    <div className="p-4 sm:p-6 max-w-[1400px] mx-auto space-y-5">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <CalendarDays className="h-6 w-6 text-[#015845]" />
            Session Management
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">{sessions.length} sessions across {grouped.length} day{grouped.length !== 1 ? "s" : ""}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={handlePublishConfirmed}>
            Publish Confirmed
          </Button>
          <Button
            size="sm"
            onClick={handleImport}
            disabled={importLoading}
            className="text-white"
            style={{ background: "#015845" }}
          >
            <Download className="h-4 w-4 mr-1.5" />
            {importLoading ? "Importing…" : "Import Accepted Abstracts"}
          </Button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total", value: stats.total, color: "text-gray-700", bg: "bg-white" },
          { label: "Draft",     value: stats.draft,     color: "text-gray-500",  bg: "bg-gray-50" },
          { label: "Confirmed", value: stats.confirmed, color: "text-blue-700",  bg: "bg-blue-50" },
          { label: "Published", value: stats.published, color: "text-[#015845]", bg: "bg-green-50" },
        ].map(c => (
          <div key={c.label} className={`${c.bg} rounded-xl border border-border px-4 py-3 flex items-center justify-between`}>
            <span className="text-sm text-gray-500 font-medium">{c.label}</span>
            <span className={`text-2xl font-bold ${c.color}`}>{c.value}</span>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          <Input
            className="pl-9 h-9 text-sm"
            placeholder="Search sessions…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="h-9 text-sm w-36">
              <SlidersHorizontal className="h-3.5 w-3.5 mr-1.5 text-gray-400" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="published">Published</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="h-9 text-sm w-40">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {SESSION_TYPES.map(t => (
                <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-white shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50/80 border-b border-gray-100">
              <TableHead className="w-[38%] pl-5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Session</TableHead>
              <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Type</TableHead>
              <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</TableHead>
              <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Time</TableHead>
              <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Room</TableHead>
              <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Track</TableHead>
              <TableHead className="pr-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((__, j) => (
                    <TableCell key={j}><div className="h-4 bg-gray-100 rounded animate-pulse" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-16 text-gray-400">
                  <CalendarDays className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">{sessions.length === 0 ? "No sessions yet. Import accepted abstracts to get started." : "No sessions match your filters."}</p>
                </TableCell>
              </TableRow>
            ) : (
              grouped.map(([day, daySessions]) => (
                <React.Fragment key={day}>
                  {/* Day header row */}
                  <TableRow className="bg-gray-50/60 hover:bg-gray-50/60 border-t border-gray-100">
                    <TableCell colSpan={7} className="pl-5 py-2">
                      <span className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        <CalendarDays className="h-3.5 w-3.5 text-[#015845]" />
                        {day}
                        <span className="font-normal normal-case text-gray-400 ml-1">{daySessions.length} session{daySessions.length !== 1 ? "s" : ""}</span>
                      </span>
                    </TableCell>
                  </TableRow>

                  {/* Session rows */}
                  {daySessions.map(s => {
                    const typeStyle = TYPE_STYLES[s.sessionType] ?? TYPE_STYLES.presentation;
                    const statusStyle = STATUS_STYLES[s.status] ?? STATUS_STYLES.draft;
                    const timeStr = fmt12(s.startTime);
                    const endMin = s.startTime && s.durationMinutes
                      ? (() => {
                          const [h, m] = s.startTime.split(":").map(Number);
                          const total = h * 60 + m + s.durationMinutes;
                          return fmt12(`${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`);
                        })()
                      : null;

                    return (
                      <TableRow
                        key={s.id}
                        className="group border-b border-gray-50 hover:bg-blue-50/30 transition-colors"
                      >
                        {/* Title cell with colored left bar */}
                        <TableCell className="pl-0 py-3">
                          <div className="flex items-stretch gap-0">
                            <div className={`w-1 self-stretch rounded-r-full mr-4 shrink-0 ${typeStyle.bar}`} />
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-gray-900 line-clamp-2 leading-snug">{s.title}</p>
                              {s.abstractId && (
                                <span className="text-[11px] text-blue-500 mt-0.5 block">Abstract #{s.abstractId}</span>
                              )}
                            </div>
                          </div>
                        </TableCell>

                        {/* Type */}
                        <TableCell>
                          <span className={`inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-full border capitalize ${typeStyle.pill}`}>
                            {typeStyle.label}
                          </span>
                        </TableCell>

                        {/* Status */}
                        <TableCell>
                          <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full border capitalize ${statusStyle.bg} ${statusStyle.text}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${statusStyle.dot} shrink-0`} />
                            {s.status}
                          </span>
                        </TableCell>

                        {/* Time */}
                        <TableCell>
                          {timeStr ? (
                            <span className="inline-flex items-center gap-1 text-xs text-gray-700 bg-gray-100 px-2 py-0.5 rounded-md font-mono whitespace-nowrap">
                              <Clock className="h-3 w-3 text-gray-400" />
                              {timeStr}{endMin ? <><ChevronRight className="h-3 w-3 text-gray-300" />{endMin}</> : null}
                            </span>
                          ) : (
                            <span className="text-gray-300 text-xs">—</span>
                          )}
                        </TableCell>

                        {/* Room */}
                        <TableCell>
                          {s.room ? (
                            <span className="inline-flex items-center gap-1 text-xs text-gray-600">
                              <MapPin className="h-3 w-3 text-gray-400 shrink-0" />
                              {s.room}
                            </span>
                          ) : (
                            <span className="text-gray-300 text-xs">—</span>
                          )}
                        </TableCell>

                        {/* Track */}
                        <TableCell className="text-xs text-gray-500 max-w-[120px] truncate">
                          {s.track || <span className="text-gray-300">—</span>}
                        </TableCell>

                        {/* Actions */}
                        <TableCell className="pr-3">
                          <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              size="sm"
                              variant="ghost"
                              title="Manage speakers"
                              className="h-8 w-8 p-0 hover:bg-[#015845]/10 hover:text-[#015845]"
                              onClick={() => setManageSpeakersFor(s)}
                            >
                              <Users className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              title="Edit session"
                              className="h-8 w-8 p-0 hover:bg-blue-50 hover:text-blue-600"
                              onClick={() => setEditSession(s)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              title="Delete session"
                              className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-500"
                              onClick={() => setDeleteId(s.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </React.Fragment>
              ))
            )}
          </TableBody>
        </Table>

        {/* Footer count */}
        {filtered.length > 0 && (
          <div className="border-t border-gray-100 px-5 py-2.5 bg-gray-50/50 flex items-center justify-between">
            <span className="text-xs text-gray-400">
              Showing {filtered.length} of {sessions.length} session{sessions.length !== 1 ? "s" : ""}
            </span>
            {(search || filterStatus !== "all" || filterType !== "all") && (
              <button
                className="text-xs text-[#0381ED] hover:underline"
                onClick={() => { setSearch(""); setFilterStatus("all"); setFilterType("all"); }}
              >
                Clear filters
              </button>
            )}
          </div>
        )}
      </div>

      {editSession && (
        <SessionEditDialog
          session={editSession}
          onClose={() => setEditSession(null)}
          onSave={(updates) => updateMutation.mutate({ id: editSession.id, ...updates })}
          saving={updateMutation.isPending}
        />
      )}

      {manageSpeakersFor && (
        <SessionSpeakersDialog
          session={manageSpeakersFor}
          onClose={() => setManageSpeakersFor(null)}
        />
      )}

      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete session?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete the session and its speaker associations.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function SessionEditDialog({ session, onClose, onSave, saving }: {
  session: Session;
  onClose: () => void;
  onSave: (data: Partial<Session>) => void;
  saving: boolean;
}) {
  const [form, setForm] = useState({
    title: session.title,
    description: session.description ?? "",
    track: session.track,
    room: session.room ?? "",
    date: session.date ?? "",
    startTime: session.startTime ?? "",
    endTime: session.endTime ?? "",
    sessionType: session.sessionType,
    durationMinutes: String(session.durationMinutes),
    status: session.status,
    keyTakeaways: session.keyTakeaways ?? "",
    internalNotes: session.internalNotes ?? "",
    avRequirements: session.avRequirements ?? "",
  });

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Session</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div>
            <Label>Title</Label>
            <Input value={form.title} onChange={e => set("title", e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Session Type</Label>
              <Select value={form.sessionType} onValueChange={v => set("sessionType", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SESSION_TYPES.map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => set("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Track</Label>
              <Input value={form.track} onChange={e => set("track", e.target.value)} />
            </div>
            <div>
              <Label>Room</Label>
              <Input value={form.room} onChange={e => set("room", e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Day</Label>
              <Input placeholder="Day 1" value={form.date} onChange={e => set("date", e.target.value)} />
            </div>
            <div>
              <Label>Start Time</Label>
              <Input type="time" value={form.startTime} onChange={e => set("startTime", e.target.value)} />
            </div>
            <div>
              <Label>Duration (min)</Label>
              <Input type="number" value={form.durationMinutes} onChange={e => set("durationMinutes", e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Description</Label>
            <Textarea rows={3} value={form.description} onChange={e => set("description", e.target.value)} />
          </div>
          <div>
            <Label>Key Takeaways</Label>
            <Textarea rows={2} value={form.keyTakeaways} onChange={e => set("keyTakeaways", e.target.value)} />
          </div>
          <div>
            <Label>A/V Requirements</Label>
            <Input value={form.avRequirements} onChange={e => set("avRequirements", e.target.value)} />
          </div>
          <div>
            <Label>Internal Notes</Label>
            <Textarea rows={2} value={form.internalNotes} onChange={e => set("internalNotes", e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            disabled={saving}
            onClick={() => onSave({ ...form, durationMinutes: Number(form.durationMinutes) })}
            style={{ background: "#015845", color: "#fff" }}
          >
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SessionSpeakersDialog({ session, onClose }: { session: Session; onClose: () => void }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const qKey = ["conf-session-speakers", session.id];

  const { data: speakers = [], isLoading } = useQuery<SessionSpeaker[]>({
    queryKey: qKey,
    queryFn: () => apiReq("GET", `/api/conf/sessions/${session.id}/speakers`),
  });

  type AddMode = "manual" | "roster" | "invite";
  const [newForm, setNewForm] = useState({ name: "", jobTitle: "", organization: "", roleInSession: "Speaker" });
  const [adding, setAdding] = useState(false);
  const [addMode, setAddMode] = useState<AddMode>("roster");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<typeof newForm>>({});
  const [rosterSearch, setRosterSearch] = useState("");
  const [selectedRoster, setSelectedRoster] = useState<RosterSpeaker | null>(null);
  const [rosterRole, setRosterRole] = useState("Speaker");
  const [inviteForm, setInviteForm] = useState({ name: "", email: "", jobTitle: "", organization: "", roleInSession: "Speaker" });

  const { data: roster = [] } = useQuery<RosterSpeaker[]>({
    queryKey: ["conf-speakers-roster"],
    queryFn: () => apiReq("GET", "/api/conf/speakers"),
    enabled: adding && addMode === "roster",
  });

  const filteredRoster = roster.filter(s =>
    s.name.toLowerCase().includes(rosterSearch.toLowerCase()) ||
    (s.organization ?? "").toLowerCase().includes(rosterSearch.toLowerCase()) ||
    (s.jobTitle ?? "").toLowerCase().includes(rosterSearch.toLowerCase())
  );

  const addMutation = useMutation({
    mutationFn: (data: typeof newForm) => apiReq<SessionSpeaker>("POST", `/api/conf/sessions/${session.id}/speakers`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qKey });
      setNewForm({ name: "", jobTitle: "", organization: "", roleInSession: "Speaker" });
      setAdding(false);
      toast({ title: "Speaker added" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const inviteMutation = useMutation({
    mutationFn: (data: typeof inviteForm) =>
      apiReq<SessionSpeaker>("POST", `/api/conf/sessions/${session.id}/speakers/invite`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qKey });
      setInviteForm({ name: "", email: "", jobTitle: "", organization: "", roleInSession: "Speaker" });
      setAdding(false);
      toast({ title: "Invitation sent", description: "Speaker added and invitation email sent." });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const addFromRosterMutation = useMutation({
    mutationFn: (data: { name: string; jobTitle: string | null; organization: string | null; roleInSession: string }) =>
      apiReq<SessionSpeaker>("POST", `/api/conf/sessions/${session.id}/speakers`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qKey });
      setSelectedRoster(null);
      setRosterSearch("");
      setRosterRole("Speaker");
      setAdding(false);
      toast({ title: "Speaker added from roster" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<typeof newForm> }) =>
      apiReq<SessionSpeaker>("PATCH", `/api/conf/sessions/${session.id}/speakers/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qKey });
      setEditingId(null);
      toast({ title: "Speaker updated" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiReq("DELETE", `/api/conf/sessions/${session.id}/speakers/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qKey });
      toast({ title: "Speaker removed" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const startEdit = (sp: SessionSpeaker) => {
    setEditingId(sp.id);
    setEditForm({ name: sp.name, jobTitle: sp.jobTitle ?? "", organization: sp.organization ?? "", roleInSession: sp.roleInSession ?? "Speaker" });
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base leading-snug">
            Speakers — <span className="text-gray-500 font-normal line-clamp-1">{session.title}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-1">
          {isLoading && <p className="text-sm text-gray-400 text-center py-4">Loading…</p>}

          {speakers.length === 0 && !isLoading && (
            <p className="text-sm text-gray-400 text-center py-4">No speakers added yet.</p>
          )}

          {speakers.map(sp => (
            <div key={sp.id} className="rounded-lg border border-border bg-white px-4 py-3">
              {editingId === sp.id ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Full Name *</Label>
                      <Input
                        value={editForm.name ?? ""}
                        onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Role</Label>
                      <Input
                        value={editForm.roleInSession ?? ""}
                        onChange={e => setEditForm(f => ({ ...f, roleInSession: e.target.value }))}
                        className="h-8 text-sm"
                        placeholder="Speaker / Moderator"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Job Title</Label>
                      <Input
                        value={editForm.jobTitle ?? ""}
                        onChange={e => setEditForm(f => ({ ...f, jobTitle: e.target.value }))}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Organization</Label>
                      <Input
                        value={editForm.organization ?? ""}
                        onChange={e => setEditForm(f => ({ ...f, organization: e.target.value }))}
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end pt-1">
                    <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Cancel</Button>
                    <Button
                      size="sm"
                      disabled={updateMutation.isPending}
                      style={{ background: "#015845", color: "#fff" }}
                      onClick={() => updateMutation.mutate({ id: sp.id, data: editForm })}
                    >
                      {updateMutation.isPending ? "Saving…" : "Save"}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div
                    className="h-9 w-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                    style={{ background: "#EFF6FF", color: "#0381ED" }}
                  >
                    {sp.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{sp.name}</p>
                    <p className="text-xs text-gray-500 truncate">
                      {[sp.jobTitle, sp.organization].filter(Boolean).join(" · ")}
                      {sp.roleInSession && sp.roleInSession !== "Speaker" && (
                        <span className="ml-1 text-[#015845] font-medium">({sp.roleInSession})</span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => startEdit(sp)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                      onClick={() => deleteMutation.mutate(sp.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Add speaker panel */}
          {adding ? (
            <div className="rounded-lg border-2 border-dashed border-[#015845]/30 bg-[#015845]/5 p-4 space-y-3">
              {/* Mode tabs */}
              <div className="flex gap-1 p-1 bg-white rounded-md border border-[#015845]/20">
                {([
                  { key: "roster", icon: <List className="h-3.5 w-3.5" />, label: "From Roster" },
                  { key: "invite", icon: <Mail className="h-3.5 w-3.5" />, label: "Invite by Email" },
                  { key: "manual", icon: <UserPlus className="h-3.5 w-3.5" />, label: "Add Manually" },
                ] as const).map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setAddMode(tab.key)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded text-xs font-medium transition-colors ${
                      addMode === tab.key
                        ? "bg-[#015845] text-white shadow-sm"
                        : "text-gray-500 hover:text-[#015845] hover:bg-[#015845]/5"
                    }`}
                  >
                    {tab.icon}{tab.label}
                  </button>
                ))}
              </div>

              {/* From Roster mode */}
              {addMode === "roster" && (
                <div className="space-y-3">
                  {selectedRoster ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-3 p-2 rounded-md bg-white border border-[#015845]/30">
                        <div className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0" style={{ background: "#EFF6FF", color: "#0381ED" }}>
                          {selectedRoster.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate">{selectedRoster.name}</p>
                          <p className="text-xs text-gray-500 truncate">{[selectedRoster.jobTitle, selectedRoster.organization].filter(Boolean).join(" · ")}</p>
                        </div>
                        <button onClick={() => setSelectedRoster(null)} className="text-gray-400 hover:text-gray-600 shrink-0">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                      <div>
                        <Label className="text-xs">Role in session</Label>
                        <Input value={rosterRole} onChange={e => setRosterRole(e.target.value)} className="h-8 text-sm mt-1" placeholder="Speaker / Moderator" />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
                        <Input
                          value={rosterSearch}
                          onChange={e => setRosterSearch(e.target.value)}
                          className="h-8 text-sm pl-8"
                          placeholder="Search speakers…"
                        />
                      </div>
                      <div className="max-h-40 overflow-y-auto space-y-1 rounded-md border border-border bg-white p-1">
                        {filteredRoster.length === 0 && (
                          <p className="text-xs text-gray-400 text-center py-3">
                            {roster.length === 0 ? "No confirmed speakers in the roster yet." : "No matches found."}
                          </p>
                        )}
                        {filteredRoster.map(s => (
                          <button
                            key={s.id}
                            className="w-full flex items-center gap-2 rounded px-2 py-1.5 hover:bg-[#015845]/5 text-left transition-colors"
                            onClick={() => setSelectedRoster(s)}
                          >
                            <div className="h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0" style={{ background: "#EFF6FF", color: "#0381ED" }}>
                              {s.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold truncate">{s.name}</p>
                              <p className="text-xs text-gray-400 truncate">{[s.jobTitle, s.organization].filter(Boolean).join(" · ")}</p>
                            </div>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0 ${s.status === "confirmed" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                              {s.status}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="flex gap-2 justify-end">
                    <Button size="sm" variant="ghost" onClick={() => { setAdding(false); setSelectedRoster(null); setRosterSearch(""); }}>Cancel</Button>
                    <Button
                      size="sm"
                      disabled={!selectedRoster || addFromRosterMutation.isPending}
                      style={{ background: "#015845", color: "#fff" }}
                      onClick={() => selectedRoster && addFromRosterMutation.mutate({
                        name: selectedRoster.name,
                        jobTitle: selectedRoster.jobTitle,
                        organization: selectedRoster.organization,
                        roleInSession: rosterRole,
                      })}
                    >
                      {addFromRosterMutation.isPending ? "Adding…" : "Add to Session"}
                    </Button>
                  </div>
                </div>
              )}

              {/* Invite by email mode */}
              {addMode === "invite" && (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Full Name *</Label>
                      <Input value={inviteForm.name} onChange={e => setInviteForm(f => ({ ...f, name: e.target.value }))} className="h-8 text-sm" placeholder="Dr. Jane Smith" />
                    </div>
                    <div>
                      <Label className="text-xs">Email *</Label>
                      <Input type="email" value={inviteForm.email} onChange={e => setInviteForm(f => ({ ...f, email: e.target.value }))} className="h-8 text-sm" placeholder="jane@example.com" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Job Title</Label>
                      <Input value={inviteForm.jobTitle} onChange={e => setInviteForm(f => ({ ...f, jobTitle: e.target.value }))} className="h-8 text-sm" placeholder="Professor" />
                    </div>
                    <div>
                      <Label className="text-xs">Organization</Label>
                      <Input value={inviteForm.organization} onChange={e => setInviteForm(f => ({ ...f, organization: e.target.value }))} className="h-8 text-sm" placeholder="University of Nairobi" />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Role in session</Label>
                    <Input value={inviteForm.roleInSession} onChange={e => setInviteForm(f => ({ ...f, roleInSession: e.target.value }))} className="h-8 text-sm" placeholder="Keynote Speaker" />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>Cancel</Button>
                    <Button
                      size="sm"
                      disabled={!inviteForm.name || !inviteForm.email || inviteMutation.isPending}
                      style={{ background: "#0381ED", color: "#fff" }}
                      onClick={() => inviteMutation.mutate(inviteForm)}
                    >
                      <Mail className="h-3.5 w-3.5 mr-1.5" />
                      {inviteMutation.isPending ? "Sending…" : "Send Invitation"}
                    </Button>
                  </div>
                </div>
              )}

              {/* Add Manually mode */}
              {addMode === "manual" && (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Full Name *</Label>
                      <Input value={newForm.name} onChange={e => setNewForm(f => ({ ...f, name: e.target.value }))} className="h-8 text-sm" placeholder="Dr. Jane Smith" />
                    </div>
                    <div>
                      <Label className="text-xs">Role</Label>
                      <Input value={newForm.roleInSession} onChange={e => setNewForm(f => ({ ...f, roleInSession: e.target.value }))} className="h-8 text-sm" placeholder="Speaker / Moderator" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Job Title</Label>
                      <Input value={newForm.jobTitle} onChange={e => setNewForm(f => ({ ...f, jobTitle: e.target.value }))} className="h-8 text-sm" placeholder="CEO" />
                    </div>
                    <div>
                      <Label className="text-xs">Organization</Label>
                      <Input value={newForm.organization} onChange={e => setNewForm(f => ({ ...f, organization: e.target.value }))} className="h-8 text-sm" placeholder="UNICEF" />
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>Cancel</Button>
                    <Button
                      size="sm"
                      disabled={!newForm.name || addMutation.isPending}
                      style={{ background: "#015845", color: "#fff" }}
                      onClick={() => addMutation.mutate(newForm)}
                    >
                      {addMutation.isPending ? "Adding…" : "Add Speaker"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Button
              variant="outline"
              className="w-full border-dashed text-[#015845] hover:bg-[#015845]/5"
              onClick={() => setAdding(true)}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Add Speaker to Session
            </Button>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
