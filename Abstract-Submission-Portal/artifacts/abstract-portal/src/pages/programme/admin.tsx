import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Plus, Pencil, Trash2, ChevronDown, ChevronRight, UserPlus, Upload, X, GripVertical, ExternalLink,
  Mail, Search, List, Clock, MapPin, Users, Coffee,
} from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Form, FormField, FormItem, FormLabel, FormControl, FormMessage,
} from "@/components/ui/form";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

type RosterSpeaker = {
  id: number;
  name: string;
  email: string;
  organization: string | null;
  jobTitle: string | null;
  status: string;
};

type ProgrammeSpeaker = {
  id: number;
  sessionId: number;
  name: string;
  jobTitle: string | null;
  organization: string | null;
  roleInSession: string | null;
  photoObjectPath: string | null;
  photoUrl: string | null;
  displayOrder: number;
};

type ProgrammeSession = {
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
  speakers: ProgrammeSpeaker[];
};

const sessionSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  track: z.string().min(1, "Track is required"),
  room: z.string().optional(),
  date: z.string().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  isBreak: z.boolean().default(false),
  displayOrder: z.coerce.number().default(0),
});

const speakerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  jobTitle: z.string().optional(),
  organization: z.string().optional(),
  roleInSession: z.string().default("Speaker"),
  displayOrder: z.coerce.number().default(0),
});

type SessionForm = z.infer<typeof sessionSchema>;
type SpeakerForm = z.infer<typeof speakerSchema>;

async function apiRequest<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(path, {
    method,
    credentials: "include",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? "Request failed");
  }
  return res.json();
}

const QUERY_KEY = ["programme-sessions"];

export default function ProgrammeAdminPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [expandedSessions, setExpandedSessions] = useState<Set<number>>(new Set());
  const [sessionDialog, setSessionDialog] = useState<{ open: boolean; session?: ProgrammeSession }>({ open: false });
  const [speakerDialog, setSpeakerDialog] = useState<{ open: boolean; sessionId?: number; speaker?: ProgrammeSpeaker }>({ open: false });
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; type: "session" | "speaker"; id: number; sessionId?: number }>({ open: false, type: "session", id: 0 });
  const [photoUploading, setPhotoUploading] = useState(false);
  const [addMode, setAddMode] = useState<"roster" | "invite" | "manual">("roster");
  const [rosterSearch, setRosterSearch] = useState("");
  const [selectedRoster, setSelectedRoster] = useState<RosterSpeaker | null>(null);
  const [rosterRole, setRosterRole] = useState("Speaker");
  const [inviteForm, setInviteForm] = useState({ name: "", email: "", jobTitle: "", organization: "", roleInSession: "Speaker" });

  const { data: sessions = [], isLoading } = useQuery<ProgrammeSession[]>({
    queryKey: QUERY_KEY,
    queryFn: () => apiRequest("GET", "/api/programme/sessions"),
  });

  const sessionForm = useForm<SessionForm>({ resolver: zodResolver(sessionSchema), defaultValues: { title: "", description: "", track: "General", room: "", date: "", startTime: "", endTime: "", isBreak: false, displayOrder: 0 } });
  const speakerForm = useForm<SpeakerForm>({ resolver: zodResolver(speakerSchema), defaultValues: { name: "", jobTitle: "", organization: "", roleInSession: "Speaker", displayOrder: 0 } });

  const createSession = useMutation({
    mutationFn: (data: SessionForm) => apiRequest<ProgrammeSession>("POST", "/api/programme/sessions", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: QUERY_KEY }); setSessionDialog({ open: false }); toast({ title: "Session created" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateSession = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<SessionForm> }) => apiRequest<ProgrammeSession>("PATCH", `/api/programme/sessions/${id}`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: QUERY_KEY }); setSessionDialog({ open: false }); toast({ title: "Session updated" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteSession = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/programme/sessions/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: QUERY_KEY }); toast({ title: "Session deleted" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const createSpeaker = useMutation({
    mutationFn: ({ sessionId, data }: { sessionId: number; data: SpeakerForm }) => apiRequest<ProgrammeSpeaker>("POST", `/api/programme/sessions/${sessionId}/speakers`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: QUERY_KEY }); setSpeakerDialog({ open: false }); toast({ title: "Speaker added" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateSpeaker = useMutation({
    mutationFn: ({ sessionId, speakerId, data }: { sessionId: number; speakerId: number; data: Partial<SpeakerForm> }) =>
      apiRequest<ProgrammeSpeaker>("PATCH", `/api/programme/sessions/${sessionId}/speakers/${speakerId}`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: QUERY_KEY }); setSpeakerDialog({ open: false }); toast({ title: "Speaker updated" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteSpeaker = useMutation({
    mutationFn: ({ sessionId, speakerId }: { sessionId: number; speakerId: number }) => apiRequest("DELETE", `/api/programme/sessions/${sessionId}/speakers/${speakerId}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: QUERY_KEY }); toast({ title: "Speaker removed" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const { data: roster = [] } = useQuery<RosterSpeaker[]>({
    queryKey: ["conf-speakers-roster"],
    queryFn: () => apiRequest("GET", "/api/conf/speakers"),
    enabled: speakerDialog.open && !speakerDialog.speaker && addMode === "roster",
  });

  const filteredRoster = roster.filter(s =>
    s.name.toLowerCase().includes(rosterSearch.toLowerCase()) ||
    (s.organization ?? "").toLowerCase().includes(rosterSearch.toLowerCase()) ||
    (s.jobTitle ?? "").toLowerCase().includes(rosterSearch.toLowerCase())
  );

  const inviteMutation = useMutation({
    mutationFn: (data: typeof inviteForm) =>
      apiRequest<ProgrammeSpeaker>("POST", `/api/conf/sessions/${speakerDialog.sessionId}/speakers/invite`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      setSpeakerDialog({ open: false });
      setInviteForm({ name: "", email: "", jobTitle: "", organization: "", roleInSession: "Speaker" });
      toast({ title: "Invitation sent", description: "Speaker added and invitation email sent." });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const addFromRosterMutation = useMutation({
    mutationFn: (data: { speakerId: number; name: string; jobTitle: string | null; organization: string | null; roleInSession: string }) =>
      apiRequest<ProgrammeSpeaker>("POST", `/api/programme/sessions/${speakerDialog.sessionId}/speakers`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      setSpeakerDialog({ open: false });
      setSelectedRoster(null);
      setRosterSearch("");
      setRosterRole("Speaker");
      toast({ title: "Speaker added from roster" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const handleSpeakerPhotoUpload = async (sessionId: number, speakerId: number, file: File) => {
    setPhotoUploading(true);
    try {
      const urlRes = await fetch("/api/storage/uploads/request-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
      });
      if (!urlRes.ok) throw new Error("Failed to get upload URL");
      const { uploadURL, objectPath } = await urlRes.json();
      const uploadRes = await fetch(uploadURL, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
      if (!uploadRes.ok) throw new Error("Upload failed");
      await apiRequest("POST", `/api/programme/sessions/${sessionId}/speakers/${speakerId}/photo`, { photoObjectPath: objectPath });
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast({ title: "Photo uploaded" });
    } catch (e) {
      toast({ title: "Photo upload failed", description: (e as Error).message, variant: "destructive" });
    } finally {
      setPhotoUploading(false);
    }
  };

  const openNewSession = () => {
    sessionForm.reset({ title: "", description: "", track: "General", room: "", date: "", startTime: "", endTime: "", isBreak: false, displayOrder: sessions.length });
    setSessionDialog({ open: true });
  };

  const openEditSession = (session: ProgrammeSession) => {
    sessionForm.reset({
      title: session.title, description: session.description ?? "", track: session.track,
      room: session.room ?? "", date: session.date ?? "", startTime: session.startTime ?? "",
      endTime: session.endTime ?? "", isBreak: session.isBreak, displayOrder: session.displayOrder,
    });
    setSessionDialog({ open: true, session });
  };

  const openNewSpeaker = (sessionId: number) => {
    speakerForm.reset({ name: "", jobTitle: "", organization: "", roleInSession: "Speaker", displayOrder: 0 });
    setSpeakerDialog({ open: true, sessionId });
  };

  const openEditSpeaker = (sessionId: number, speaker: ProgrammeSpeaker) => {
    speakerForm.reset({
      name: speaker.name, jobTitle: speaker.jobTitle ?? "", organization: speaker.organization ?? "",
      roleInSession: speaker.roleInSession ?? "Speaker", displayOrder: speaker.displayOrder,
    });
    setSpeakerDialog({ open: true, sessionId, speaker });
  };

  const onSessionSubmit = (data: SessionForm) => {
    if (sessionDialog.session) {
      updateSession.mutate({ id: sessionDialog.session.id, data });
    } else {
      createSession.mutate(data);
    }
  };

  const onSpeakerSubmit = (data: SpeakerForm) => {
    if (!speakerDialog.sessionId) return;
    if (speakerDialog.speaker) {
      updateSpeaker.mutate({ sessionId: speakerDialog.sessionId, speakerId: speakerDialog.speaker.id, data });
    } else {
      createSpeaker.mutate({ sessionId: speakerDialog.sessionId, data });
    }
  };

  const onDeleteConfirm = () => {
    if (deleteDialog.type === "session") {
      deleteSession.mutate(deleteDialog.id);
    } else if (deleteDialog.sessionId) {
      deleteSpeaker.mutate({ sessionId: deleteDialog.sessionId, speakerId: deleteDialog.id });
    }
    setDeleteDialog({ ...deleteDialog, open: false });
  };

  const toggleExpanded = (id: number) => {
    setExpandedSessions((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const publicUrl = `${window.location.origin}${import.meta.env.BASE_URL.replace(/\/$/, "")}/programme`;

  const [search, setSearch] = useState("");

  const totalSpeakers = useMemo(() => sessions.reduce((n, s) => n + s.speakers.length, 0), [sessions]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return sessions;
    return sessions.filter(s =>
      s.title.toLowerCase().includes(q) ||
      s.track.toLowerCase().includes(q) ||
      (s.room ?? "").toLowerCase().includes(q)
    );
  }, [sessions, search]);

  const grouped = useMemo(() => {
    const map = new Map<string, ProgrammeSession[]>();
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
    <div className="p-4 sm:p-6 max-w-[1300px] mx-auto space-y-5">

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Programme Manager</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage sessions and speakers for the public agenda page.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <a
            href="/programme"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[#0381ED] hover:underline"
          >
            <ExternalLink className="h-4 w-4" /> View Public Page
          </a>
          <Button size="sm" onClick={openNewSession} className="bg-[#015845] hover:bg-[#015845]/90 text-white">
            <Plus className="h-4 w-4 mr-1.5" /> Add Session
          </Button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          { label: "Sessions",        value: sessions.length,   color: "text-gray-700",   bg: "bg-white" },
          { label: "Speakers",        value: totalSpeakers,     color: "text-[#0381ED]",  bg: "bg-blue-50" },
          { label: "Days",            value: grouped.filter(([d]) => d !== "Unscheduled").length, color: "text-[#015845]", bg: "bg-green-50" },
        ].map(c => (
          <div key={c.label} className={`${c.bg} rounded-xl border border-border px-4 py-3 flex items-center justify-between`}>
            <span className="text-sm text-gray-500 font-medium">{c.label}</span>
            <span className={`text-2xl font-bold ${c.color}`}>{c.value}</span>
          </div>
        ))}
      </div>

      {/* Embed snippet */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm">
        <p className="font-semibold text-blue-800 mb-1">Embed on your website</p>
        <code className="block text-xs text-blue-700 bg-blue-100 rounded px-2 py-1.5 break-all select-all">
          {`<iframe src="${publicUrl}" width="100%" height="800" frameborder="0" style="border:none;"></iframe>`}
        </code>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
        <Input
          className="pl-9 h-9 text-sm"
          placeholder="Search sessions by title, track or room…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-white shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50/80 border-b border-gray-100">
              <TableHead className="w-8 pl-3" />
              <TableHead className="w-[40%] text-xs font-semibold text-gray-500 uppercase tracking-wide">Session</TableHead>
              <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Track</TableHead>
              <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Time</TableHead>
              <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Room</TableHead>
              <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Speakers</TableHead>
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
                  <GripVertical className="h-8 w-8 mx-auto mb-2 opacity-20" />
                  <p className="text-sm">{sessions.length === 0 ? "No sessions yet. Add your first session to get started." : "No sessions match your search."}</p>
                  {sessions.length === 0 && (
                    <Button variant="outline" size="sm" className="mt-3" onClick={openNewSession}>
                      <Plus className="h-4 w-4 mr-1.5" /> Add Session
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              grouped.map(([day, daySessions]) => (
                <React.Fragment key={day}>
                  {/* Day header */}
                  <TableRow className="bg-gray-50/60 hover:bg-gray-50/60 border-t border-gray-100">
                    <TableCell colSpan={7} className="pl-4 py-2">
                      <span className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        <Clock className="h-3.5 w-3.5 text-[#015845]" />
                        {day}
                        <span className="font-normal normal-case text-gray-400 ml-1">{daySessions.length} session{daySessions.length !== 1 ? "s" : ""}</span>
                      </span>
                    </TableCell>
                  </TableRow>

                  {daySessions.map(session => {
                    const expanded = expandedSessions.has(session.id);
                    const timeStr = session.startTime
                      ? `${session.startTime}${session.endTime ? ` – ${session.endTime}` : ""}`
                      : null;

                    return (
                      <React.Fragment key={session.id}>
                        <TableRow className={`group border-b border-gray-50 transition-colors ${session.isBreak ? "bg-gray-50/40 hover:bg-gray-100/40" : "hover:bg-blue-50/20"}`}>
                          {/* Expand toggle */}
                          <TableCell className="pl-3 pr-0 w-8">
                            <button
                              onClick={() => toggleExpanded(session.id)}
                              className="flex items-center justify-center h-6 w-6 rounded hover:bg-gray-200 text-gray-400 transition-colors"
                            >
                              {expanded
                                ? <ChevronDown className="h-4 w-4" />
                                : <ChevronRight className="h-4 w-4" />}
                            </button>
                          </TableCell>

                          {/* Title */}
                          <TableCell className="py-3">
                            <div className="flex items-center gap-2">
                              {session.isBreak && (
                                <Coffee className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                              )}
                              <div className="min-w-0">
                                <p className={`text-sm font-semibold line-clamp-2 leading-snug ${session.isBreak ? "text-gray-500" : "text-gray-900"}`}>
                                  {session.title}
                                </p>
                                {session.isBreak && (
                                  <span className="text-[11px] text-gray-400">Break / Transition</span>
                                )}
                              </div>
                            </div>
                          </TableCell>

                          {/* Track */}
                          <TableCell>
                            <span className="inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-full border bg-[#015845]/5 border-[#015845]/20 text-[#015845] truncate max-w-[110px]">
                              {session.track}
                            </span>
                          </TableCell>

                          {/* Time */}
                          <TableCell>
                            {timeStr ? (
                              <span className="inline-flex items-center gap-1 text-xs text-gray-700 bg-gray-100 px-2 py-0.5 rounded-md font-mono whitespace-nowrap">
                                <Clock className="h-3 w-3 text-gray-400" />
                                {timeStr}
                              </span>
                            ) : <span className="text-gray-300 text-xs">—</span>}
                          </TableCell>

                          {/* Room */}
                          <TableCell>
                            {session.room ? (
                              <span className="inline-flex items-center gap-1 text-xs text-gray-600">
                                <MapPin className="h-3 w-3 text-gray-400 shrink-0" />
                                {session.room}
                              </span>
                            ) : <span className="text-gray-300 text-xs">—</span>}
                          </TableCell>

                          {/* Speakers */}
                          <TableCell>
                            {session.speakers.length === 0 ? (
                              <span className="text-xs text-gray-300">None</span>
                            ) : (
                              <div className="flex items-center gap-1.5">
                                {/* Stacked avatars */}
                                <div className="flex -space-x-2">
                                  {session.speakers.slice(0, 3).map(sp => (
                                    <div
                                      key={sp.id}
                                      className="h-7 w-7 rounded-full border-2 border-white overflow-hidden bg-blue-100 flex items-center justify-center shrink-0"
                                      title={sp.name}
                                    >
                                      {sp.photoUrl
                                        ? <img src={sp.photoUrl} alt={sp.name} className="w-full h-full object-cover" />
                                        : <span className="text-[9px] font-bold text-blue-700">{sp.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}</span>
                                      }
                                    </div>
                                  ))}
                                  {session.speakers.length > 3 && (
                                    <div className="h-7 w-7 rounded-full border-2 border-white bg-gray-100 flex items-center justify-center shrink-0">
                                      <span className="text-[9px] font-bold text-gray-500">+{session.speakers.length - 3}</span>
                                    </div>
                                  )}
                                </div>
                                <span className="text-xs text-gray-500">{session.speakers.length}</span>
                              </div>
                            )}
                          </TableCell>

                          {/* Actions */}
                          <TableCell className="pr-3">
                            <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                size="sm" variant="ghost"
                                className="h-8 w-8 p-0 hover:bg-[#015845]/10 hover:text-[#015845]"
                                title="Add speaker"
                                onClick={() => { openNewSpeaker(session.id); if (!expanded) toggleExpanded(session.id); }}
                              >
                                <UserPlus className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                size="sm" variant="ghost"
                                className="h-8 w-8 p-0 hover:bg-blue-50 hover:text-blue-600"
                                title="Edit session"
                                onClick={() => openEditSession(session)}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                size="sm" variant="ghost"
                                className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-500"
                                title="Delete session"
                                onClick={() => setDeleteDialog({ open: true, type: "session", id: session.id })}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>

                        {/* Expanded speaker rows */}
                        {expanded && (
                          <TableRow className="bg-gray-50/60 hover:bg-gray-50/60 border-b border-gray-100">
                            <TableCell colSpan={7} className="pl-12 pr-4 py-3">
                              <div className="space-y-2">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
                                    <Users className="h-3.5 w-3.5" /> Speakers
                                  </span>
                                  <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => openNewSpeaker(session.id)}>
                                    <UserPlus className="h-3 w-3 mr-1" /> Add Speaker
                                  </Button>
                                </div>

                                {session.speakers.length === 0 ? (
                                  <p className="text-xs text-gray-400 py-1">No speakers added to this session yet.</p>
                                ) : (
                                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                    {session.speakers.map(sp => (
                                      <div key={sp.id} className="flex items-center gap-2.5 bg-white rounded-lg border border-border px-3 py-2 group/sp">
                                        {/* Avatar with upload */}
                                        <div className="relative h-9 w-9 shrink-0">
                                          <div className="h-9 w-9 rounded-full overflow-hidden bg-blue-100 flex items-center justify-center border border-blue-200">
                                            {sp.photoUrl
                                              ? <img src={sp.photoUrl} alt={sp.name} className="w-full h-full object-cover" />
                                              : <span className="text-xs font-bold text-blue-700">{sp.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}</span>
                                            }
                                          </div>
                                          <label className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-[#015845] flex items-center justify-center cursor-pointer opacity-0 group-hover/sp:opacity-100 transition-opacity">
                                            <input type="file" accept="image/*" className="hidden" disabled={photoUploading}
                                              onChange={e => { const f = e.target.files?.[0]; if (f) handleSpeakerPhotoUpload(session.id, sp.id, f); e.target.value = ""; }} />
                                            <Upload className="h-2.5 w-2.5 text-white" />
                                          </label>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <p className="text-sm font-medium truncate">{sp.name}</p>
                                          <p className="text-xs text-gray-500 truncate">
                                            {[sp.jobTitle, sp.organization].filter(Boolean).join(" · ")}
                                            {sp.roleInSession && sp.roleInSession !== "Speaker" && (
                                              <span className="ml-1 text-[#015845]">({sp.roleInSession})</span>
                                            )}
                                          </p>
                                        </div>
                                        <div className="flex items-center gap-0.5 opacity-0 group-hover/sp:opacity-100 transition-opacity shrink-0">
                                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 hover:text-blue-600" onClick={() => openEditSpeaker(session.id, sp)}>
                                            <Pencil className="h-3 w-3" />
                                          </Button>
                                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 hover:text-red-500" onClick={() => setDeleteDialog({ open: true, type: "speaker", id: sp.id, sessionId: session.id })}>
                                            <Trash2 className="h-3 w-3" />
                                          </Button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    );
                  })}
                </React.Fragment>
              ))
            )}
          </TableBody>
        </Table>

        {filtered.length > 0 && (
          <div className="border-t border-gray-100 px-5 py-2.5 bg-gray-50/50 flex items-center justify-between">
            <span className="text-xs text-gray-400">
              {filtered.length} of {sessions.length} session{sessions.length !== 1 ? "s" : ""}
            </span>
            {search && (
              <button className="text-xs text-[#0381ED] hover:underline" onClick={() => setSearch("")}>
                Clear search
              </button>
            )}
          </div>
        )}
      </div>

      {/* Session dialog */}
      <Dialog open={sessionDialog.open} onOpenChange={(open) => setSessionDialog({ open })}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{sessionDialog.session ? "Edit Session" : "Add Session"}</DialogTitle>
          </DialogHeader>
          <Form {...sessionForm}>
            <form onSubmit={sessionForm.handleSubmit(onSessionSubmit)} className="space-y-4 pt-2">
              <FormField control={sessionForm.control} name="isBreak" render={({ field }) => (
                <div className="flex items-center gap-2">
                  <Switch checked={field.value} onCheckedChange={field.onChange} id="isBreak" />
                  <Label htmlFor="isBreak" className="text-sm">This is a break / transition slot</Label>
                </div>
              )} />
              <FormField control={sessionForm.control} name="title" render={({ field }) => (
                <FormItem><FormLabel>Title *</FormLabel><FormControl><Input {...field} placeholder="e.g. Plenary 1: Human-Centered Data" /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={sessionForm.control} name="description" render={({ field }) => (
                <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea {...field} rows={3} placeholder="Short summary of the session…" /></FormControl><FormMessage /></FormItem>
              )} />
              <div className="grid grid-cols-2 gap-3">
                <FormField control={sessionForm.control} name="track" render={({ field }) => (
                  <FormItem><FormLabel>Track *</FormLabel><FormControl><Input {...field} placeholder="e.g. Plenary" /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={sessionForm.control} name="room" render={({ field }) => (
                  <FormItem><FormLabel>Room</FormLabel><FormControl><Input {...field} placeholder="e.g. Mega Ballroom" /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <FormField control={sessionForm.control} name="date" render={({ field }) => (
                  <FormItem><FormLabel>Date</FormLabel><FormControl><Input {...field} placeholder="e.g. Day 1" /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={sessionForm.control} name="startTime" render={({ field }) => (
                  <FormItem><FormLabel>Start</FormLabel><FormControl><Input {...field} placeholder="09:00" /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={sessionForm.control} name="endTime" render={({ field }) => (
                  <FormItem><FormLabel>End</FormLabel><FormControl><Input {...field} placeholder="10:30" /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <FormField control={sessionForm.control} name="displayOrder" render={({ field }) => (
                <FormItem><FormLabel>Order (lower = first)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <DialogFooter className="pt-2">
                <Button type="button" variant="ghost" onClick={() => setSessionDialog({ open: false })}>Cancel</Button>
                <Button type="submit" className="bg-[#015845] hover:bg-[#015845]/90 text-white" disabled={createSession.isPending || updateSession.isPending}>
                  {createSession.isPending || updateSession.isPending ? "Saving…" : sessionDialog.session ? "Save Changes" : "Create Session"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Speaker dialog */}
      <Dialog open={speakerDialog.open} onOpenChange={(open) => {
        setSpeakerDialog({ open });
        if (!open) { setSelectedRoster(null); setRosterSearch(""); setAddMode("roster"); }
      }}>
        <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
          <DialogHeader className="shrink-0">
            <DialogTitle>{speakerDialog.speaker ? "Edit Speaker" : "Add Speaker"}</DialogTitle>
          </DialogHeader>

          {/* ── EDIT mode: existing form ── */}
          {speakerDialog.speaker && (
            <Form {...speakerForm}>
              <form onSubmit={speakerForm.handleSubmit(onSpeakerSubmit)} className="overflow-y-auto flex-1 space-y-4 pt-2 pr-1">
                <FormField control={speakerForm.control} name="name" render={({ field }) => (
                  <FormItem><FormLabel>Full Name *</FormLabel><FormControl><Input {...field} placeholder="e.g. Dr. Jane Smith" /></FormControl><FormMessage /></FormItem>
                )} />
                <div className="grid grid-cols-2 gap-3">
                  <FormField control={speakerForm.control} name="jobTitle" render={({ field }) => (
                    <FormItem><FormLabel>Job Title</FormLabel><FormControl><Input {...field} placeholder="e.g. CEO" /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={speakerForm.control} name="organization" render={({ field }) => (
                    <FormItem><FormLabel>Organization</FormLabel><FormControl><Input {...field} placeholder="e.g. UNICEF" /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
                <FormField control={speakerForm.control} name="roleInSession" render={({ field }) => (
                  <FormItem><FormLabel>Role</FormLabel><FormControl><Input {...field} placeholder="Speaker / Moderator / Keynote Speaker" /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={speakerForm.control} name="displayOrder" render={({ field }) => (
                  <FormItem><FormLabel>Order (lower = first)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <DialogFooter className="pt-2">
                  <Button type="button" variant="ghost" onClick={() => setSpeakerDialog({ open: false })}>Cancel</Button>
                  <Button type="submit" className="bg-[#015845] hover:bg-[#015845]/90 text-white" disabled={updateSpeaker.isPending}>
                    {updateSpeaker.isPending ? "Saving…" : "Save Changes"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          )}

          {/* ── ADD mode: three-tab panel ── */}
          {!speakerDialog.speaker && (
            <div className="overflow-y-auto flex-1 space-y-4 pt-2 pr-1">
              {/* Mode tabs */}
              <div className="flex gap-1 p-1 bg-gray-100 rounded-md shrink-0">
                {([
                  { key: "roster" as const, icon: <List className="h-3.5 w-3.5" />, label: "From Roster" },
                  { key: "invite" as const, icon: <Mail className="h-3.5 w-3.5" />, label: "Invite by Email" },
                  { key: "manual" as const, icon: <UserPlus className="h-3.5 w-3.5" />, label: "Add Manually" },
                ]).map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setAddMode(tab.key)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded text-xs font-medium transition-colors ${
                      addMode === tab.key
                        ? "bg-[#015845] text-white shadow-sm"
                        : "text-gray-500 hover:text-[#015845] hover:bg-white"
                    }`}
                  >
                    {tab.icon}{tab.label}
                  </button>
                ))}
              </div>

              {/* From Roster */}
              {addMode === "roster" && (
                <div className="space-y-3">
                  {selectedRoster ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-[#015845]/5 border border-[#015845]/20">
                        <div className="h-9 w-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0" style={{ background: "#EFF6FF", color: "#0381ED" }}>
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
                        <Label className="text-sm">Role in session</Label>
                        <Input value={rosterRole} onChange={e => setRosterRole(e.target.value)} className="mt-1" placeholder="Speaker / Moderator / Keynote Speaker" />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                        <Input
                          value={rosterSearch}
                          onChange={e => setRosterSearch(e.target.value)}
                          className="pl-9"
                          placeholder="Search speakers by name, title or org…"
                        />
                      </div>
                      <div className="max-h-52 overflow-y-auto space-y-1 rounded-lg border border-border bg-gray-50 p-1">
                        {filteredRoster.length === 0 && (
                          <p className="text-xs text-gray-400 text-center py-4">
                            {roster.length === 0 ? "No confirmed speakers in the roster yet." : "No matches found."}
                          </p>
                        )}
                        {filteredRoster.map(s => (
                          <button
                            key={s.id}
                            className="w-full flex items-center gap-3 rounded-md px-3 py-2 hover:bg-white hover:shadow-sm text-left transition-all"
                            onClick={() => setSelectedRoster(s)}
                          >
                            <div className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0" style={{ background: "#EFF6FF", color: "#0381ED" }}>
                              {s.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold truncate">{s.name}</p>
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
                  <DialogFooter>
                    <Button variant="ghost" onClick={() => setSpeakerDialog({ open: false })}>Cancel</Button>
                    <Button
                      disabled={!selectedRoster || addFromRosterMutation.isPending}
                      className="bg-[#015845] hover:bg-[#015845]/90 text-white"
                      onClick={() => selectedRoster && addFromRosterMutation.mutate({
                        speakerId: selectedRoster.id,
                        name: selectedRoster.name,
                        jobTitle: selectedRoster.jobTitle,
                        organization: selectedRoster.organization,
                        roleInSession: rosterRole,
                      })}
                    >
                      {addFromRosterMutation.isPending ? "Adding…" : "Add to Session"}
                    </Button>
                  </DialogFooter>
                </div>
              )}

              {/* Invite by Email */}
              {addMode === "invite" && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-sm">Full Name *</Label>
                      <Input value={inviteForm.name} onChange={e => setInviteForm(f => ({ ...f, name: e.target.value }))} className="mt-1" placeholder="Dr. Jane Smith" />
                    </div>
                    <div>
                      <Label className="text-sm">Email *</Label>
                      <Input type="email" value={inviteForm.email} onChange={e => setInviteForm(f => ({ ...f, email: e.target.value }))} className="mt-1" placeholder="jane@example.com" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-sm">Job Title</Label>
                      <Input value={inviteForm.jobTitle} onChange={e => setInviteForm(f => ({ ...f, jobTitle: e.target.value }))} className="mt-1" placeholder="Professor" />
                    </div>
                    <div>
                      <Label className="text-sm">Organization</Label>
                      <Input value={inviteForm.organization} onChange={e => setInviteForm(f => ({ ...f, organization: e.target.value }))} className="mt-1" placeholder="University of Nairobi" />
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm">Role in session</Label>
                    <Input value={inviteForm.roleInSession} onChange={e => setInviteForm(f => ({ ...f, roleInSession: e.target.value }))} className="mt-1" placeholder="Keynote Speaker / Moderator" />
                  </div>
                  <DialogFooter>
                    <Button variant="ghost" onClick={() => setSpeakerDialog({ open: false })}>Cancel</Button>
                    <Button
                      disabled={!inviteForm.name || !inviteForm.email || inviteMutation.isPending}
                      style={{ background: "#0381ED", color: "#fff" }}
                      onClick={() => inviteMutation.mutate(inviteForm)}
                    >
                      <Mail className="h-4 w-4 mr-2" />
                      {inviteMutation.isPending ? "Sending…" : "Send Invitation"}
                    </Button>
                  </DialogFooter>
                </div>
              )}

              {/* Add Manually */}
              {addMode === "manual" && (
                <Form {...speakerForm}>
                  <form onSubmit={speakerForm.handleSubmit(onSpeakerSubmit)} className="space-y-4">
                    <FormField control={speakerForm.control} name="name" render={({ field }) => (
                      <FormItem><FormLabel>Full Name *</FormLabel><FormControl><Input {...field} placeholder="e.g. Dr. Jane Smith" /></FormControl><FormMessage /></FormItem>
                    )} />
                    <div className="grid grid-cols-2 gap-3">
                      <FormField control={speakerForm.control} name="jobTitle" render={({ field }) => (
                        <FormItem><FormLabel>Job Title</FormLabel><FormControl><Input {...field} placeholder="e.g. CEO" /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={speakerForm.control} name="organization" render={({ field }) => (
                        <FormItem><FormLabel>Organization</FormLabel><FormControl><Input {...field} placeholder="e.g. UNICEF" /></FormControl><FormMessage /></FormItem>
                      )} />
                    </div>
                    <FormField control={speakerForm.control} name="roleInSession" render={({ field }) => (
                      <FormItem><FormLabel>Role</FormLabel><FormControl><Input {...field} placeholder="Speaker / Moderator / Keynote Speaker" /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={speakerForm.control} name="displayOrder" render={({ field }) => (
                      <FormItem><FormLabel>Order (lower = first)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <DialogFooter>
                      <Button type="button" variant="ghost" onClick={() => setSpeakerDialog({ open: false })}>Cancel</Button>
                      <Button type="submit" className="bg-[#015845] hover:bg-[#015845]/90 text-white" disabled={createSpeaker.isPending}>
                        {createSpeaker.isPending ? "Adding…" : "Add Speaker"}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteDialog.type === "session" ? "Session" : "Speaker"}?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteDialog.type === "session"
                ? "This will permanently delete the session and all its speakers."
                : "This will remove the speaker from this session."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onDeleteConfirm} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
