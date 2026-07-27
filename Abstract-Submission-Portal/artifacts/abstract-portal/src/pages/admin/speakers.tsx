import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, Check, X, Send, FolderOpen, Bell, Download, Plus, CheckCircle, XCircle, Mic2, Eye, Linkedin, Twitter, Globe, Phone, MapPin, Building2, Briefcase, Paperclip, Trash2, RefreshCw, MoreHorizontal, Search, FileDown, Pencil } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

type SpeakerRow = {
  id: number;
  abstractId: number | null;
  speakerNumber: number | null;
  callCategory: string | null;
  name: string;
  email: string;
  organization: string | null;
  jobTitle: string | null;
  status: string;
  portalToken: string | null;
  hasBio: boolean;
  hasHeadshot: boolean;
  hasSlides: boolean;
  session: { title: string; status: string } | null;
};

type Material = {
  id: number;
  speakerId: number;
  fileType: string | null;
  originalFilename: string | null;
  storedFilename: string | null;
  filePath: string | null;
  fileSizeKb: number | null;
  version: number;
  uploadedAt: string;
};

type AbstractOption = {
  id: number;
  title: string;
  status: string;
};

type SpeakerDetail = {
  id: number;
  abstractId: number | null;
  callCategory: string | null;
  name: string;
  email: string;
  organization: string | null;
  jobTitle: string | null;
  biography: string | null;
  phone: string | null;
  country: string | null;
  gender: string | null;
  dietaryRequirements: string | null;
  accessibilityNeeds: string | null;
  recordingConsent: boolean | null;
  linkedinUrl: string | null;
  twitterUrl: string | null;
  websiteUrl: string | null;
  status: string;
  abstractTitle: string | null;
  headshot: { id: number; filename: string | null } | null;
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

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700 border border-yellow-200",
  invited: "bg-yellow-100 text-yellow-700 border border-yellow-200",
  confirmed: "bg-green-100 text-green-700",
  declined: "bg-red-100 text-red-700",
  withdrawn: "bg-gray-100 text-gray-500",
};

const STATUS_LABEL: Record<string, string> = {
  pending: "⏳ Pending",
  invited: "⏳ Pending",
  confirmed: "✓ Confirmed",
  declined: "✗ Declined",
  withdrawn: "Withdrawn",
};

function CheckCell({ value }: { value: boolean }) {
  return value
    ? <Check className="h-4 w-4 text-green-600 mx-auto" />
    : <X className="h-4 w-4 text-red-400 mx-auto" />;
}

export default function AdminSpeakers() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: speakers = [], isLoading } = useQuery<SpeakerRow[]>({
    queryKey: ["conf-speakers"],
    queryFn: () => apiReq("GET", "/api/conf/speakers"),
  });

  const [messageDialog, setMessageDialog] = useState<{ speaker: SpeakerRow } | null>(null);
  const [materialsDialog, setMaterialsDialog] = useState<{ speaker: SpeakerRow; materials: Material[] } | null>(null);
  const [addSpeakerOpen, setAddSpeakerOpen] = useState(false);
  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [detailSpeakerId, setDetailSpeakerId] = useState<number | null>(null);
  const [categoryFilter, setCategoryFilter] = useState("_all");
  const [statusFilter, setStatusFilter] = useState("_all");
  const [searchQuery, setSearchQuery] = useState("");
  const [changeStatusDialog, setChangeStatusDialog] = useState<{ speaker: SpeakerRow } | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{ speaker: SpeakerRow } | null>(null);
  const [editDialog, setEditDialog] = useState<{ speaker: SpeakerRow } | null>(null);

  const exportCSV = () => {
    const headers = ["#", "Name", "Email", "Organization", "Job Title", "Status", "Category", "Session", "Bio", "Headshot", "Slides"];
    const rows = sorted.map(s => [
      s.speakerNumber ?? "",
      s.name,
      s.email,
      s.organization ?? "",
      s.jobTitle ?? "",
      STATUS_LABEL[s.status] ?? s.status,
      s.callCategory ?? "",
      s.session?.title ?? "",
      s.hasBio ? "Yes" : "No",
      s.hasHeadshot ? "Yes" : "No",
      s.hasSlides ? "Yes" : "No",
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `speakers-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleApprove = async (speaker: SpeakerRow) => {
    if (!speaker.abstractId) return;
    setActionLoading(speaker.id);
    try {
      await apiReq("POST", `/api/abstracts/${speaker.abstractId}/speaker/approve`);
      qc.invalidateQueries({ queryKey: ["conf-speakers"] });
      toast({ title: "Speaker approved", description: `Welcome email sent to ${speaker.email}` });
    } catch (e) {
      toast({ title: "Error", description: (e as Error).message, variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (speaker: SpeakerRow) => {
    if (!speaker.abstractId) return;
    setActionLoading(speaker.id);
    try {
      await apiReq("POST", `/api/abstracts/${speaker.abstractId}/speaker/reject`);
      qc.invalidateQueries({ queryKey: ["conf-speakers"] });
      toast({ title: "Registration declined" });
    } catch (e) {
      toast({ title: "Error", description: (e as Error).message, variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  };

  const sendMessage = useMutation({
    mutationFn: ({ id, subject, body }: { id: number; subject: string; body: string }) =>
      apiReq("POST", `/api/conf/speakers/${id}/message`, { subject, body }),
    onSuccess: () => {
      setMessageDialog(null);
      toast({ title: "Message sent" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const sendReminder = async (id: number) => {
    try {
      await apiReq("GET", `/api/conf/speakers/${id}/send-reminder`);
      toast({ title: "Reminder sent" });
    } catch (e) {
      toast({ title: "Error", description: (e as Error).message, variant: "destructive" });
    }
  };

  const viewMaterials = async (speaker: SpeakerRow) => {
    try {
      const materials = await apiReq<Material[]>("GET", `/api/conf/speakers/${speaker.id}/materials`);
      setMaterialsDialog({ speaker, materials });
    } catch (e) {
      toast({ title: "Error", description: (e as Error).message, variant: "destructive" });
    }
  };

  const handleChangeStatus = async (speaker: SpeakerRow, newStatus: string) => {
    setActionLoading(speaker.id);
    try {
      await apiReq("PATCH", `/api/conf/speakers/${speaker.id}/status`, { status: newStatus });
      qc.invalidateQueries({ queryKey: ["conf-speakers"] });
      setChangeStatusDialog(null);
      toast({ title: "Status updated", description: `${speaker.name} → ${newStatus}` });
    } catch (e) {
      toast({ title: "Error", description: (e as Error).message, variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteSpeaker = async (speaker: SpeakerRow) => {
    setActionLoading(speaker.id);
    try {
      await apiReq("DELETE", `/api/conf/speakers/${speaker.id}`);
      qc.invalidateQueries({ queryKey: ["conf-speakers"] });
      setDeleteDialog(null);
      toast({ title: "Speaker deleted", description: `${speaker.name} has been permanently removed.` });
    } catch (e) {
      toast({ title: "Error", description: (e as Error).message, variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  };

  const pendingCount = speakers.filter(s => s.status === "pending" || s.status === "invited").length;
  const totalConfirmed = speakers.filter(s => s.status === "confirmed").length;
  const totalComplete = speakers.filter(s => s.hasBio && s.hasHeadshot && s.hasSlides).length;

  // Collect unique categories for filter dropdown
  const categories = Array.from(new Set(speakers.map(s => s.callCategory).filter(Boolean) as string[])).sort();

  const q = searchQuery.toLowerCase().trim();

  // Sort then filter
  const sorted = [...speakers]
    .sort((a, b) => {
      if (a.speakerNumber != null && b.speakerNumber != null) return a.speakerNumber - b.speakerNumber;
      if (a.speakerNumber != null) return -1;
      if (b.speakerNumber != null) return 1;
      return a.name.localeCompare(b.name);
    })
    .filter(s => categoryFilter === "_all" || s.callCategory === categoryFilter)
    .filter(s => statusFilter === "_all" || s.status === statusFilter)
    .filter(s => !q || s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q) || (s.organization ?? "").toLowerCase().includes(q));

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* ── Header ── */}
      <div className="flex items-start justify-between mb-4 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Mic2 className="h-6 w-6 text-[#015845]" />
            Speaker Management
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {speakers.length} total · {totalConfirmed} confirmed · {totalComplete} fully ready
            {pendingCount > 0 && (
              <span className="ml-2 font-semibold text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-full px-2 py-0.5 text-xs">
                {pendingCount} pending approval
              </span>
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-1.5" />
                Download ZIP
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => window.open("/api/conf/speakers/download-all", "_blank")}>
                <Download className="h-4 w-4 mr-2" />
                All (Photos + Slides)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => window.open("/api/conf/speakers/download-all?type=headshots", "_blank")}>
                <FileDown className="h-4 w-4 mr-2" />
                Headshots only
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => window.open("/api/conf/speakers/download-all?type=slides", "_blank")}>
                <Paperclip className="h-4 w-4 mr-2" />
                Slides only
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setBroadcastOpen(true)}
          >
            <Bell className="h-4 w-4 mr-1.5" />
            Broadcast
          </Button>
          <Button
            size="sm"
            style={{ background: "#015845", color: "#fff" }}
            onClick={() => setAddSpeakerOpen(true)}
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Add Speaker
          </Button>
        </div>
      </div>

      {/* ── Search / Filter / Export toolbar ── */}
      <div className="flex flex-wrap gap-2 mb-4 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          <Input
            className="pl-8 h-9 text-sm"
            placeholder="Search by name, email or organization…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40 h-9 text-sm">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">All Statuses</SelectItem>
            <SelectItem value="pending">⏳ Pending</SelectItem>
            <SelectItem value="confirmed">✓ Confirmed</SelectItem>
            <SelectItem value="declined">✗ Declined</SelectItem>
            <SelectItem value="withdrawn">Withdrawn</SelectItem>
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-44 h-9 text-sm">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">All Categories</SelectItem>
            <SelectItem value="D5">D5 — Youth Submission</SelectItem>
            <SelectItem value="D6">D6 — Country &amp; System Reforms</SelectItem>
            {categories.filter(c => c !== "D5" && c !== "D6").map(c => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={exportCSV} title="Export filtered list as CSV">
          <FileDown className="h-4 w-4 mr-1.5" />
          Export CSV
        </Button>
        {(searchQuery || statusFilter !== "_all" || categoryFilter !== "_all") && (
          <Button variant="ghost" size="sm" className="text-gray-400 hover:text-gray-600"
            onClick={() => { setSearchQuery(""); setStatusFilter("_all"); setCategoryFilter("_all"); }}>
            Clear filters
          </Button>
        )}
      </div>

      {pendingCount > 0 && (
        <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-xl flex items-center gap-3">
          <span className="text-2xl">⏳</span>
          <div>
            <p className="font-semibold text-yellow-800">{pendingCount} speaker registration{pendingCount > 1 ? "s" : ""} awaiting approval</p>
            <p className="text-sm text-yellow-700">Review and approve or decline using the action buttons. Approved speakers receive portal access and a welcome email automatically.</p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead className="w-10 text-center">#</TableHead>
              <TableHead>Speaker</TableHead>
              <TableHead>Session</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-center">Bio</TableHead>
              <TableHead className="text-center">Headshot</TableHead>
              <TableHead className="text-center">Slides</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={9} className="text-center py-8 text-gray-400">Loading…</TableCell></TableRow>
            ) : sorted.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-12 text-gray-400">
                  <p>No speakers yet.</p>
                  <p className="text-xs mt-1">Authors can register speakers from their abstract page, or use "Add Speaker" to register directly.</p>
                </TableCell>
              </TableRow>
            ) : sorted.map(s => (
              <TableRow key={s.id} className={`hover:bg-gray-50 ${s.status === "pending" ? "bg-yellow-50/50" : ""}`}>
                <TableCell className="text-center text-xs text-gray-400 font-mono">
                  {s.speakerNumber != null ? `#${s.speakerNumber}` : "—"}
                </TableCell>
                <TableCell>
                  <div>
                    <div className="font-medium text-gray-900">{s.name}</div>
                    <div className="text-xs text-gray-500">{s.email}</div>
                    {s.organization && <div className="text-xs text-gray-400">{s.organization}</div>}
                  </div>
                </TableCell>
                <TableCell className="max-w-[200px]">
                  {s.session ? (
                    <span className="text-sm text-gray-700 line-clamp-2">{s.session.title}</span>
                  ) : (
                    <span className="text-xs text-gray-400 italic">No session linked</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge className={`text-xs ${STATUS_COLORS[s.status] ?? "bg-gray-100 text-gray-700"}`}>
                    {STATUS_LABEL[s.status] ?? s.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  {s.callCategory ? (
                    <span className="text-xs font-mono bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.5 rounded">
                      {s.callCategory}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-300">—</span>
                  )}
                </TableCell>
                <TableCell className="text-center"><CheckCell value={s.hasBio} /></TableCell>
                <TableCell className="text-center"><CheckCell value={s.hasHeadshot} /></TableCell>
                <TableCell className="text-center"><CheckCell value={s.hasSlides} /></TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end items-center gap-1">
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="View details" onClick={() => setDetailSpeakerId(s.id)}>
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                    {(s.status === "pending" || s.status === "invited") && s.abstractId && (
                      <>
                        <Button
                          size="sm"
                          disabled={actionLoading === s.id}
                          className="bg-green-600 hover:bg-green-700 text-white h-7 px-2 text-xs"
                          onClick={() => handleApprove(s)}
                        >
                          <CheckCircle className="h-3 w-3 mr-1" /> Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={actionLoading === s.id}
                          className="border-red-300 text-red-600 hover:bg-red-50 h-7 px-2 text-xs"
                          onClick={() => handleReject(s)}
                        >
                          <XCircle className="h-3 w-3 mr-1" /> Decline
                        </Button>
                      </>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="More actions">
                          <MoreHorizontal className="h-3.5 w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onClick={() => setEditDialog({ speaker: s })}>
                          <Pencil className="h-3.5 w-3.5 mr-2 text-gray-500" /> Edit Speaker
                        </DropdownMenuItem>
                        {s.status !== "declined" && s.status !== "withdrawn" && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => setMessageDialog({ speaker: s })}>
                              <Send className="h-3.5 w-3.5 mr-2 text-gray-500" /> Send Message
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => viewMaterials(s)}>
                              <FolderOpen className="h-3.5 w-3.5 mr-2 text-gray-500" /> View Materials
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => sendReminder(s.id)}>
                              <Bell className="h-3.5 w-3.5 mr-2 text-gray-500" /> Send Reminder
                            </DropdownMenuItem>
                          </>
                        )}
                        {(s.status === "confirmed" || s.status === "declined") && (
                          <DropdownMenuItem onClick={() => setChangeStatusDialog({ speaker: s })} className="text-amber-700 focus:text-amber-700">
                            <RefreshCw className="h-3.5 w-3.5 mr-2" /> Change Status
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          disabled={actionLoading === s.id}
                          onClick={() => setDeleteDialog({ speaker: s })}
                          className="text-red-600 focus:text-red-600"
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete Speaker
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {messageDialog && (
        <MessageDialog
          speaker={messageDialog.speaker}
          onClose={() => setMessageDialog(null)}
          onSend={(subject, body) => sendMessage.mutate({ id: messageDialog.speaker.id, subject, body })}
          sending={sendMessage.isPending}
        />
      )}

      {materialsDialog && (
        <MaterialsDialog
          speaker={materialsDialog.speaker}
          materials={materialsDialog.materials}
          onClose={() => setMaterialsDialog(null)}
        />
      )}

      {editDialog && (
        <EditSpeakerDialog
          speaker={editDialog.speaker}
          onClose={() => setEditDialog(null)}
          onSaved={() => { setEditDialog(null); qc.invalidateQueries({ queryKey: ["conf-speakers"] }); }}
        />
      )}

      {addSpeakerOpen && (
        <AddSpeakerDialog
          onClose={() => setAddSpeakerOpen(false)}
          onCreated={() => {
            qc.invalidateQueries({ queryKey: ["conf-speakers"] });
            setAddSpeakerOpen(false);
            toast({ title: "Speaker registered", description: "Welcome email with portal link sent." });
          }}
        />
      )}

      {broadcastOpen && (
        <BroadcastDialog
          onClose={() => setBroadcastOpen(false)}
          onSent={() => {
            setBroadcastOpen(false);
            toast({ title: "Broadcast sent" });
          }}
        />
      )}

      {detailSpeakerId !== null && (
        <SpeakerDetailDialog
          speakerId={detailSpeakerId}
          onClose={() => setDetailSpeakerId(null)}
          onApproved={(id) => {
            const speaker = speakers.find(s => s.id === id);
            if (speaker) handleApprove(speaker);
            setDetailSpeakerId(null);
          }}
          onRejected={(id) => {
            const speaker = speakers.find(s => s.id === id);
            if (speaker) handleReject(speaker);
            setDetailSpeakerId(null);
          }}
        />
      )}

      {changeStatusDialog && (
        <ChangeStatusDialog
          speaker={changeStatusDialog.speaker}
          loading={actionLoading === changeStatusDialog.speaker.id}
          onClose={() => setChangeStatusDialog(null)}
          onConfirm={(newStatus) => handleChangeStatus(changeStatusDialog.speaker, newStatus)}
        />
      )}

      {deleteDialog && (
        <DeleteSpeakerDialog
          speaker={deleteDialog.speaker}
          loading={actionLoading === deleteDialog.speaker.id}
          onClose={() => setDeleteDialog(null)}
          onConfirm={() => handleDeleteSpeaker(deleteDialog.speaker)}
        />
      )}
    </div>
  );
}

function MessageDialog({ speaker, onClose, onSend, sending }: {
  speaker: SpeakerRow;
  onClose: () => void;
  onSend: (subject: string, body: string) => void;
  sending: boolean;
}) {
  const [subject, setSubject] = useState(`Message from the Africa Water and Sanitation Systems Leadership Symposium team`);
  const [body, setBody] = useState("");
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Message {speaker.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label>Subject</Label>
            <Input value={subject} onChange={e => setSubject(e.target.value)} />
          </div>
          <div>
            <Label>Message</Label>
            <Textarea rows={6} value={body} onChange={e => setBody(e.target.value)} placeholder="Write your message here…" />
          </div>
          <p className="text-xs text-gray-400">This message will be emailed to {speaker.email} and appear in their speaker portal inbox.</p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={sending || !subject || !body} onClick={() => onSend(subject, body)} style={{ background: "#0381ED", color: "#fff" }}>
            {sending ? "Sending…" : "Send Message"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MaterialsDialog({ speaker, materials, onClose }: {
  speaker: SpeakerRow;
  materials: Material[];
  onClose: () => void;
}) {
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Materials — {speaker.name}</DialogTitle>
        </DialogHeader>
        {materials.length === 0 ? (
          <p className="text-gray-400 py-4 text-center text-sm">No materials uploaded yet.</p>
        ) : (
          <div className="space-y-2">
            {materials.map(m => (
              <div key={m.id} className="flex items-center justify-between p-3 rounded-lg border bg-gray-50">
                <div>
                  <div className="font-medium text-sm">{m.originalFilename}</div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    <span className="capitalize">{m.fileType}</span> · v{m.version}
                    {m.fileSizeKb && ` · ${m.fileSizeKb} KB`}
                    · {new Date(m.uploadedAt).toLocaleDateString()}
                  </div>
                </div>
                <Button size="sm" variant="outline" onClick={() => window.open(`/api/conf/materials/${m.id}/download`, "_blank")}>
                  <Download className="h-3 w-3 mr-1" />
                  Download
                </Button>
              </div>
            ))}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SpeakerDetailDialog({ speakerId, onClose, onApproved, onRejected }: {
  speakerId: number;
  onClose: () => void;
  onApproved: (id: number) => void;
  onRejected: (id: number) => void;
}) {
  const { data: speaker, isLoading, error } = useQuery<SpeakerDetail>({
    queryKey: ["speaker-detail", speakerId],
    queryFn: () => apiReq("GET", `/api/conf/speakers/${speakerId}`),
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mic2 className="h-5 w-5 text-[#015845]" />
            Speaker Profile
          </DialogTitle>
          {speaker && (
            <DialogDescription>
              {speaker.status === "pending" && (
                <span className="inline-flex items-center gap-1 bg-yellow-100 text-yellow-800 text-xs font-medium px-2 py-0.5 rounded-full border border-yellow-200">
                  ⏳ Awaiting approval
                </span>
              )}
            </DialogDescription>
          )}
        </DialogHeader>

        {isLoading && (
          <div className="py-12 text-center text-gray-400 text-sm">Loading speaker details…</div>
        )}
        {error && (
          <div className="py-12 text-center text-red-500 text-sm">Failed to load speaker details.</div>
        )}

        {speaker && (
          <div className="space-y-5 py-1">
            {/* Header row: headshot + name/abstract */}
            <div className="flex gap-4 items-start">
              {speaker.headshot ? (
                <img
                  src={`/api/conf/speakers/${speakerId}/headshot`}
                  alt={speaker.name}
                  className="h-20 w-20 rounded-full object-cover border-2 border-[#015845]/30 flex-shrink-0"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              ) : (
                <div className="h-20 w-20 rounded-full bg-[#015845]/10 flex items-center justify-center text-[#015845] font-bold text-2xl flex-shrink-0">
                  {speaker.name.slice(0, 2).toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-gray-900">{speaker.name}</h3>
                {speaker.jobTitle && (
                  <p className="text-sm text-gray-600 flex items-center gap-1 mt-0.5">
                    <Briefcase className="h-3.5 w-3.5 text-gray-400" />
                    {speaker.jobTitle}
                  </p>
                )}
                {speaker.organization && (
                  <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5">
                    <Building2 className="h-3.5 w-3.5 text-gray-400" />
                    {speaker.organization}
                  </p>
                )}
                {speaker.abstractTitle && (
                  <div className="mt-2 px-3 py-1.5 bg-blue-50 border border-blue-100 rounded-lg">
                    <p className="text-xs text-blue-500 font-medium uppercase tracking-wide">Linked Submission</p>
                    <p className="text-sm text-blue-800 mt-0.5 line-clamp-2">{speaker.abstractTitle}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Contact info */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span className="text-gray-400 text-xs font-medium uppercase tracking-wide w-12">Email</span>
                <a href={`mailto:${speaker.email}`} className="text-[#0381ED] hover:underline truncate">{speaker.email}</a>
              </div>
              {speaker.phone && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Phone className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                  {speaker.phone}
                </div>
              )}
              {speaker.country && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <MapPin className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                  {speaker.country}
                </div>
              )}
              {speaker.gender && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Users className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                  {speaker.gender}
                </div>
              )}
            </div>

            {/* Bio */}
            {speaker.biography && (
              <div>
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1">Biography</p>
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{speaker.biography}</p>
              </div>
            )}

            {/* Social links */}
            {(speaker.linkedinUrl || speaker.twitterUrl || speaker.websiteUrl) && (
              <div className="flex items-center gap-3">
                {speaker.linkedinUrl && (
                  <a href={speaker.linkedinUrl} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-sm text-[#0381ED] hover:underline">
                    <Linkedin className="h-4 w-4" /> LinkedIn
                  </a>
                )}
                {speaker.twitterUrl && (
                  <a href={speaker.twitterUrl} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-sm text-[#0381ED] hover:underline">
                    <Twitter className="h-4 w-4" /> X / Twitter
                  </a>
                )}
                {speaker.websiteUrl && (
                  <a href={speaker.websiteUrl} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-sm text-[#0381ED] hover:underline">
                    <Globe className="h-4 w-4" /> Website
                  </a>
                )}
              </div>
            )}

            {/* Logistics */}
            {(speaker.dietaryRequirements || speaker.accessibilityNeeds) && (
              <div className="p-3 bg-gray-50 rounded-lg space-y-1 border">
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1.5">Logistics</p>
                {speaker.dietaryRequirements && (
                  <p className="text-sm text-gray-600"><span className="font-medium">Dietary:</span> {speaker.dietaryRequirements}</p>
                )}
                {speaker.accessibilityNeeds && (
                  <p className="text-sm text-gray-600"><span className="font-medium">Accessibility:</span> {speaker.accessibilityNeeds}</p>
                )}
                {speaker.recordingConsent !== null && (
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Recording consent:</span>{" "}
                    {speaker.recordingConsent ? "✓ Given" : "✗ Not given"}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        <DialogFooter className="gap-2 pt-2 border-t mt-2">
          <Button variant="outline" onClick={onClose}>Close</Button>
          {speaker?.status === "pending" && (
            <>
              <Button
                variant="outline"
                className="border-red-300 text-red-600 hover:bg-red-50"
                onClick={() => onRejected(speakerId)}
              >
                <XCircle className="h-4 w-4 mr-1.5" /> Decline
              </Button>
              <Button
                className="bg-green-600 hover:bg-green-700 text-white"
                onClick={() => onApproved(speakerId)}
              >
                <CheckCircle className="h-4 w-4 mr-1.5" /> Approve
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditSpeakerDialog({ speaker, onClose, onSaved }: {
  speaker: SpeakerRow;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const { data: detail, isLoading: detailLoading } = useQuery<SpeakerDetail>({
    queryKey: ["speaker-detail", speaker.id],
    queryFn: () => apiReq("GET", `/api/conf/speakers/${speaker.id}`),
  });
  const { data: abstracts = [] } = useQuery<AbstractOption[]>({
    queryKey: ["accepted-abstracts"],
    queryFn: () => fetch("/api/abstracts-without-speakers", { credentials: "include" }).then(r => r.json()) as Promise<AbstractOption[]>,
    staleTime: 0,
  });

  const [form, setForm] = useState<{
    name: string; email: string; organization: string; jobTitle: string; phone: string;
    country: string; biography: string; dietaryRequirements: string; accessibilityNeeds: string;
    recordingConsent: boolean; linkedinUrl: string; twitterUrl: string; websiteUrl: string;
  } | null>(null);
  const [abstractId, setAbstractId] = useState<string>("_none");
  const [callCategory, setCallCategory] = useState("_auto");
  const [saving, setSaving] = useState(false);

  // Populate form once detail loads — must be in useEffect to avoid React setState-during-render bugs
  useEffect(() => {
    if (!detail) return;
    setForm({
      name: detail.name ?? "",
      email: detail.email ?? "",
      organization: detail.organization ?? "",
      jobTitle: detail.jobTitle ?? "",
      phone: detail.phone ?? "",
      country: detail.country ?? "",
      biography: detail.biography ?? "",
      dietaryRequirements: detail.dietaryRequirements ?? "",
      accessibilityNeeds: detail.accessibilityNeeds ?? "",
      recordingConsent: detail.recordingConsent ?? false,
      linkedinUrl: detail.linkedinUrl ?? "",
      twitterUrl: detail.twitterUrl ?? "",
      websiteUrl: detail.websiteUrl ?? "",
    });
    setAbstractId(detail.abstractId ? String(detail.abstractId) : "_none");
    setCallCategory(detail.callCategory ?? speaker.callCategory ?? "_auto");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detail?.id]);

  const setF = (k: string, v: string | boolean) => setForm(f => f ? { ...f, [k]: v } : f);

  const handleSave = async () => {
    if (!form) return;
    if (!form.name || !form.email) { toast({ title: "Name and email are required", variant: "destructive" }); return; }
    setSaving(true);
    const body: Record<string, unknown> = {
      ...form,
      abstractId: abstractId !== "_none" ? Number(abstractId) : null,
      callCategory: callCategory !== "_auto" ? callCategory : null,
    };
    try {
      const r = await fetch(`/api/conf/speakers/${speaker.id}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!r.ok) {
        const data = await r.json().catch(() => ({})) as { error?: string };
        throw new Error(data.error ?? r.statusText);
      }
      toast({ title: "Speaker updated successfully" });
      onSaved();
    } catch (e) {
      toast({ title: "Failed to save", description: (e as Error).message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5 text-[#015845]" />
            Edit Speaker — {speaker.name}
          </DialogTitle>
        </DialogHeader>

        {detailLoading && <div className="py-12 text-center text-gray-400 text-sm">Loading…</div>}

        {form && (
          <div className="space-y-4 py-1">
            {/* Linked submission */}
            <div className="rounded-lg border border-blue-100 bg-blue-50 p-4 space-y-3">
              <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Linked Submission & Session</p>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Linked Submission</label>
                <Select value={abstractId} onValueChange={setAbstractId}>
                  <SelectTrigger className="bg-white text-sm">
                    <SelectValue placeholder="None (no linked submission)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">— None</SelectItem>
                    {abstracts.length === 0 && <SelectItem value="_empty" disabled>No submissions available</SelectItem>}
                    {abstracts.map(a => (
                      <SelectItem key={a.id} value={String(a.id)}>
                        #{a.id} [{a.status}] — {a.title.slice(0, 45)}{a.title.length > 45 ? "…" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-400 mt-1">The session is determined by whichever session is linked to the selected submission in the programme.</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Call Category</label>
                <Select value={callCategory} onValueChange={setCallCategory}>
                  <SelectTrigger className="bg-white text-sm">
                    <SelectValue placeholder="Auto (from abstract)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_auto">Auto (from abstract)</SelectItem>
                    <SelectItem value="D1">D1</SelectItem>
                    <SelectItem value="D2">D2</SelectItem>
                    <SelectItem value="D3">D3</SelectItem>
                    <SelectItem value="D4">D4</SelectItem>
                    <SelectItem value="D5">D5 — Youth Led Innovations</SelectItem>
                    <SelectItem value="D6">D6 — System Reforms &amp; Country Snapshots</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Core info */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Name *</label>
                <input className="w-full border rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#015845]/30" value={form.name} onChange={e => setF("name", e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Email *</label>
                <input className="w-full border rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#015845]/30" type="email" value={form.email} onChange={e => setF("email", e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Organization</label>
                <input className="w-full border rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#015845]/30" value={form.organization} onChange={e => setF("organization", e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Job Title</label>
                <input className="w-full border rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#015845]/30" value={form.jobTitle} onChange={e => setF("jobTitle", e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
                <input className="w-full border rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#015845]/30" value={form.phone} onChange={e => setF("phone", e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Country</label>
                <input className="w-full border rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#015845]/30" value={form.country} onChange={e => setF("country", e.target.value)} />
              </div>
            </div>

            {/* Biography */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Biography</label>
              <textarea className="w-full border rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#015845]/30 resize-y" rows={4} value={form.biography} onChange={e => setF("biography", e.target.value)} />
            </div>

            {/* Social */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">LinkedIn URL</label>
                <input className="w-full border rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#015845]/30" value={form.linkedinUrl} onChange={e => setF("linkedinUrl", e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Twitter / X URL</label>
                <input className="w-full border rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#015845]/30" value={form.twitterUrl} onChange={e => setF("twitterUrl", e.target.value)} />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Website URL</label>
                <input className="w-full border rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#015845]/30" value={form.websiteUrl} onChange={e => setF("websiteUrl", e.target.value)} />
              </div>
            </div>

            {/* Logistics */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Dietary Requirements</label>
                <input className="w-full border rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#015845]/30" value={form.dietaryRequirements} onChange={e => setF("dietaryRequirements", e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Accessibility Needs</label>
                <input className="w-full border rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#015845]/30" value={form.accessibilityNeeds} onChange={e => setF("accessibilityNeeds", e.target.value)} />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox id="edit-consent" checked={form.recordingConsent} onCheckedChange={v => setF("recordingConsent", !!v)} />
              <label htmlFor="edit-consent" className="text-sm text-gray-700">Recording consent given</label>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || !form} className="bg-[#015845] hover:bg-[#015845]/90 text-white">
            {saving ? "Saving…" : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const EMPTY_FORM = {
  name: "", email: "", organization: "", jobTitle: "", phone: "", country: "",
  biography: "", dietaryRequirements: "", accessibilityNeeds: "", recordingConsent: false,
};

function AddSpeakerDialog({ onClose, onCreated }: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const { toast } = useToast();
  const [form, setForm] = useState(EMPTY_FORM);
  const setF = (k: string, v: string | boolean) => setForm(f => ({ ...f, [k]: v }));
  const [abstractId, setAbstractId] = useState("_none");
  const [saving, setSaving] = useState(false);

  const { data: abstracts = [] } = useQuery<AbstractOption[]>({
    queryKey: ["accepted-abstracts"],
    queryFn: () => fetch("/api/abstracts-without-speakers", { credentials: "include" }).then(r => r.json()) as Promise<AbstractOption[]>,
    staleTime: 0,
  });

  const [callCategory, setCallCategory] = useState("_auto");

  const handleSubmit = async () => {
    if (!form.name || !form.email) { toast({ title: "Name and email are required", variant: "destructive" }); return; }
    setSaving(true);
    const resolvedAbstractId = abstractId !== "_none" ? Number(abstractId) : undefined;
    const resolvedCategory = callCategory !== "_auto" ? callCategory : undefined;
    try {
      await fetch(`/api/speakers`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          abstractId: resolvedAbstractId,
          callCategory: resolvedCategory,
        }),
      }).then(async r => {
        if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error ?? r.statusText);
        return r.json();
      });
      onCreated();
    } catch (e) {
      toast({ title: "Failed to register speaker", description: (e as Error).message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Speaker Directly</DialogTitle>
          <DialogDescription>
            Select a submission and fill in the speaker details. The speaker will be confirmed immediately and receive a welcome email with their portal link.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between">
                <Label>Linked Submission</Label>
                <span className="text-xs text-muted-foreground">Optional</span>
              </div>
              <Select value={abstractId} onValueChange={setAbstractId}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="No submission linked…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">No submission linked</SelectItem>
                  {abstracts.length === 0 && <SelectItem value="_empty" disabled>No submissions available</SelectItem>}
                  {abstracts.map(a => (
                    <SelectItem key={a.id} value={String(a.id)}>
                      #{a.id} [{a.status}] — {a.title.slice(0, 45)}{a.title.length > 45 ? "…" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <div className="flex items-center justify-between">
                <Label>Call Category</Label>
                <span className="text-xs text-muted-foreground">Optional</span>
              </div>
              <Select value={callCategory} onValueChange={setCallCategory}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Auto / track-derived…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_auto">Auto (derive from track)</SelectItem>
                  <SelectItem value="D1">D1</SelectItem>
                  <SelectItem value="D2">D2</SelectItem>
                  <SelectItem value="D3">D3</SelectItem>
                  <SelectItem value="D4">D4</SelectItem>
                  <SelectItem value="D5">D5 — Youth Led Innovations</SelectItem>
                  <SelectItem value="D6">D6 — System Reforms &amp; Country Snapshots</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Full Name <span className="text-red-500">*</span></Label>
              <Input className="mt-1" value={form.name} onChange={e => setF("name", e.target.value)} placeholder="Dr. Jane Smith" />
            </div>
            <div>
              <Label>Email <span className="text-red-500">*</span></Label>
              <Input className="mt-1" type="email" value={form.email} onChange={e => setF("email", e.target.value)} placeholder="speaker@example.com" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Organization</Label>
              <Input className="mt-1" value={form.organization} onChange={e => setF("organization", e.target.value)} />
            </div>
            <div>
              <Label>Job Title</Label>
              <Input className="mt-1" value={form.jobTitle} onChange={e => setF("jobTitle", e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Phone</Label>
              <Input className="mt-1" value={form.phone} onChange={e => setF("phone", e.target.value)} />
            </div>
            <div>
              <Label>Country</Label>
              <Input className="mt-1" value={form.country} onChange={e => setF("country", e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Biography</Label>
            <Textarea className="mt-1" rows={3} value={form.biography} onChange={e => setF("biography", e.target.value)} placeholder="Brief professional bio…" />
          </div>
          <div className="grid grid-cols-2 gap-3 pt-1 border-t">
            <div>
              <Label>Dietary Requirements</Label>
              <Input className="mt-1" value={form.dietaryRequirements} onChange={e => setF("dietaryRequirements", e.target.value)} />
            </div>
            <div>
              <Label>Accessibility Needs</Label>
              <Input className="mt-1" value={form.accessibilityNeeds} onChange={e => setF("accessibilityNeeds", e.target.value)} />
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <Checkbox
              id="rec-consent-add"
              checked={form.recordingConsent}
              onCheckedChange={v => setF("recordingConsent", !!v)}
            />
            <label htmlFor="rec-consent-add" className="text-sm text-gray-700 cursor-pointer">
              Speaker consents to session recording being shared publicly.
            </label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={saving} onClick={handleSubmit} style={{ background: "#015845", color: "#fff" }}>
            {saving ? "Registering…" : "Register & Send Welcome Email"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function BroadcastDialog({ onClose, onSent }: { onClose: () => void; onSent: () => void }) {
  const { toast } = useToast();
  const [category, setCategory] = useState("all");
  const [manualEmails, setManualEmails] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [attachment, setAttachment] = useState<File | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleSend = async () => {
    if (!subject.trim() || !body.trim()) {
      toast({ title: "Subject and message are required", variant: "destructive" });
      return;
    }
    setSending(true);
    try {
      const fd = new FormData();
      fd.append("category", category);
      if (category === "_manual") fd.append("manualEmails", manualEmails.trim());
      fd.append("subject", subject.trim());
      fd.append("body", body.trim());
      if (attachment) fd.append("attachment", attachment);
      const res = await fetch("/api/conf/speakers/broadcast", {
        method: "POST",
        credentials: "include",
        body: fd,
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? res.statusText);
      const { sent } = await res.json();
      toast({ title: `Broadcast sent to ${sent} speaker${sent !== 1 ? "s" : ""}` });
      onSent();
    } catch (e) {
      toast({ title: "Failed to send broadcast", description: (e as Error).message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const BROADCAST_CATEGORIES = [
    { value: "all", label: "All speakers" },
    { value: "D1", label: "D1" },
    { value: "D2", label: "D2" },
    { value: "D3", label: "D3" },
    { value: "D4", label: "D4" },
    { value: "D5", label: "D5 — Youth Led Innovations" },
    { value: "D6", label: "D6 — System Reforms & Country Snapshots" },
    { value: "_manual", label: "Specific email addresses…" },
  ];

  const selectedLabel = BROADCAST_CATEGORIES.find(c => c.value === category)?.label ?? category;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-4 w-4" /> Broadcast Message
          </DialogTitle>
          <DialogDescription>
            Send an email to a group of speakers via their portal. Use for logistics updates, reminders, or announcements.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div>
            <Label>Send to</Label>
            <Select value={category} onValueChange={v => { setCategory(v); setManualEmails(""); }}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BROADCAST_CATEGORIES.map(({ value, label }) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {category === "_manual" && (
              <Textarea
                className="mt-2"
                rows={3}
                value={manualEmails}
                onChange={e => setManualEmails(e.target.value)}
                placeholder="Enter email addresses separated by commas or new lines&#10;e.g. john@example.com, jane@example.com"
              />
            )}
          </div>
          <div>
            <Label>Subject</Label>
            <Input className="mt-1" value={subject} onChange={e => setSubject(e.target.value)} placeholder="e.g. Important logistics update" />
          </div>
          <div>
            <Label>Message</Label>
            <Textarea className="mt-1" rows={6} value={body} onChange={e => setBody(e.target.value)} placeholder="Write your message here…" />
          </div>
          <div>
            <Label>Attachment <span className="text-muted-foreground font-normal">(optional — PDF, DOCX, etc.)</span></Label>
            <div className="mt-1 flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.png,.jpg,.jpeg"
                className="hidden"
                onChange={e => setAttachment(e.target.files?.[0] ?? null)}
              />
              <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => fileInputRef.current?.click()}>
                <Paperclip className="h-4 w-4" />
                {attachment ? "Change file" : "Attach file"}
              </Button>
              {attachment && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="truncate max-w-[200px]">{attachment.name}</span>
                  <button type="button" className="hover:text-red-500" onClick={() => { setAttachment(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}>
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={sending || !subject.trim() || !body.trim()} onClick={handleSend} style={{ background: "#015845", color: "#fff" }}>
            {sending ? "Sending…" : `Send to ${selectedLabel}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ChangeStatusDialog({ speaker, loading, onClose, onConfirm }: {
  speaker: SpeakerRow;
  loading: boolean;
  onClose: () => void;
  onConfirm: (newStatus: string) => void;
}) {
  const [newStatus, setNewStatus] = useState<string>("pending");
  const statusOptions = [
    { value: "pending", label: "⏳ Pending — revert to awaiting approval" },
    { value: "confirmed", label: "✓ Confirmed — approve and restore portal access" },
    { value: "declined", label: "✗ Declined — reject registration" },
  ].filter(o => o.value !== speaker.status);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Change Speaker Status</DialogTitle>
          <DialogDescription>
            Current status: <strong>{STATUS_LABEL[speaker.status] ?? speaker.status}</strong> for <strong>{speaker.name}</strong>.
            {speaker.status === "confirmed" && " Changing away from Confirmed will immediately deactivate their portal link."}
          </DialogDescription>
        </DialogHeader>
        <div className="py-2">
          <Label className="mb-2 block text-sm">New status</Label>
          <Select value={newStatus} onValueChange={setNewStatus}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map(o => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            disabled={loading}
            onClick={() => onConfirm(newStatus)}
            style={{ background: "#015845", color: "#fff" }}
          >
            {loading ? "Saving…" : "Confirm Change"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeleteSpeakerDialog({ speaker, loading, onClose, onConfirm }: {
  speaker: SpeakerRow;
  loading: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Delete Speaker</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete <strong>{speaker.name}</strong>? This will permanently remove their record, all uploaded materials, and deactivate their portal link. <strong>This action cannot be undone.</strong>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            disabled={loading}
            variant="destructive"
            onClick={onConfirm}
          >
            {loading ? "Deleting…" : "Delete Speaker"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
