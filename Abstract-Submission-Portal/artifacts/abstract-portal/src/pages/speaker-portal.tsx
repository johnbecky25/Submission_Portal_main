import React, { useState, useEffect } from "react";
import { useRoute } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import faviconUrl from "@assets/favicon.png";

type Speaker = {
  id: number;
  speakerNumber: number | null;
  callCategory: string | null;
  name: string;
  email: string;
  organization: string | null;
  jobTitle: string | null;
  country: string | null;
  biography: string | null;
  linkedinUrl: string | null;
  twitterUrl: string | null;
  websiteUrl: string | null;
  dietaryRequirements: string | null;
  accessibilityNeeds: string | null;
  recordingConsent: boolean;
  status: string;
  portalToken: string;
};

type Session = {
  id: number;
  title: string;
  date: string | null;
  startTime: string | null;
  endTime: string | null;
  durationMinutes: number;
  track: string;
  room: string | null;
  sessionType: string;
};

type Material = {
  id: number;
  fileType: string | null;
  originalFilename: string | null;
  fileSizeKb: number | null;
  version: number;
  uploadedAt: string;
};

type Message = {
  id: number;
  sentBy: string;
  subject: string | null;
  body: string | null;
  sentAt: string;
  readAt: string | null;
};

type PortalData = {
  speaker: Speaker;
  sessions: Session[];
  materials: Material[];
  messages: Message[];
  settings: { eventName: string; materialsDeadline: string | null; eventDates: string | null };
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

function DeadlineBanner({ deadline }: { deadline: string | null }) {
  if (!deadline) return null;
  const d = new Date(deadline);
  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  const urgent = diffDays <= 3;
  const passed = diffDays < 0;

  return (
    <div className={`mb-6 px-5 py-3 rounded-xl text-sm font-medium flex items-center gap-3 ${
      passed ? "bg-red-50 border border-red-200 text-red-800" :
      urgent ? "bg-orange-50 border border-orange-200 text-orange-800" :
      "bg-blue-50 border border-blue-200 text-blue-800"
    }`}>
      <span className="text-lg">{passed ? "⏰" : urgent ? "⚠️" : "📅"}</span>
      <span>
        {passed
          ? `Materials deadline was ${d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })} — please contact us.`
          : `Materials deadline: ${d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })} — ${diffDays} day${diffDays !== 1 ? "s" : ""} remaining.`
        }
      </span>
    </div>
  );
}

type Tab = "sessions" | "profile" | "uploads" | "messages";

export default function SpeakerPortal() {
  const [, params] = useRoute("/speaker/:token");
  const token = params?.token ?? "";

  const { data, isLoading, error, refetch } = useQuery<PortalData>({
    queryKey: ["speaker-portal", token],
    queryFn: () => apiReq("GET", `/api/speaker-portal/${token}`),
    enabled: !!token,
    retry: false,
  });

  const [activeTab, setActiveTab] = useState<Tab>("sessions");
  const [profileSaved, setProfileSaved] = useState(false);
  const [photoError, setPhotoError] = useState(false);

  const headshotVersion = data?.materials?.find((m: Material) => m.fileType === "headshot")?.uploadedAt ?? null;

  useEffect(() => {
    if (headshotVersion) setPhotoError(false);
  }, [headshotVersion]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "linear-gradient(135deg, #015845 0%, #0381ED 100%)" }}>
        <p className="text-white text-lg">Loading your speaker portal…</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "linear-gradient(135deg, #015845 0%, #0381ED 100%)" }}>
        <div className="bg-white rounded-2xl p-10 max-w-md text-center shadow-xl">
          <div className="text-5xl mb-4">🔒</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Invalid Portal Link</h1>
          <p className="text-gray-500 text-sm">This speaker portal link is invalid or has expired. Please contact the conference organisers for a new link.</p>
        </div>
      </div>
    );
  }

  const { speaker, sessions, materials, messages, settings } = data;
  const unread = messages.filter(m => !m.readAt).length;

  const TABS: { id: Tab; label: string; extra?: string }[] = [
    { id: "sessions", label: "My Sessions" },
    { id: "profile", label: "Edit Profile" },
    { id: "uploads", label: "Upload Materials" },
    { id: "messages", label: "Messages", extra: unread > 0 ? String(unread) : undefined },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header style={{ background: "linear-gradient(135deg, #015845 0%, #0381ED 100%)" }} className="py-8 px-6 text-white">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <img src={faviconUrl} alt="AWS" className="h-10 w-10 rounded-lg flex-shrink-0" />
            <div>
              <p className="font-bold text-lg leading-tight">{settings.eventName}</p>
              {settings.eventDates && <p className="text-white/70 text-sm">{settings.eventDates}</p>}
            </div>
          </div>
          <div className="flex items-center gap-4 mt-2">
            <div className="h-16 w-16 rounded-full flex-shrink-0 bg-white/20 flex items-center justify-center text-white font-bold text-xl overflow-hidden border-2 border-white/30">
              {!photoError ? (
                <img
                  src={`/api/speaker-portal/${token}/photo${headshotVersion ? `?v=${new Date(headshotVersion).getTime()}` : ""}`}
                  alt=""
                  className="h-full w-full object-cover"
                  onError={() => setPhotoError(true)}
                />
              ) : (
                <span>{speaker.name.split(" ").map((p: string) => p[0]).slice(0, 2).join("").toUpperCase()}</span>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                {speaker.speakerNumber != null && (
                  <span className="text-xs bg-white/20 text-white px-2.5 py-0.5 rounded-full font-semibold">
                    Speaker #{speaker.speakerNumber}
                  </span>
                )}
                {speaker.callCategory && (
                  <span className="text-xs bg-white/10 text-white/90 px-2.5 py-0.5 rounded-full border border-white/25">
                    {speaker.callCategory}
                  </span>
                )}
              </div>
              <h1 className="text-3xl font-bold">Welcome, {speaker.name}</h1>
              <p className="text-white/70 mt-0.5 text-sm">
                {speaker.jobTitle && speaker.organization
                  ? `${speaker.jobTitle}, ${speaker.organization}`
                  : speaker.organization ?? speaker.jobTitle ?? "Speaker"}
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-8">
        <DeadlineBanner deadline={settings.materialsDeadline} />

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-6 overflow-x-auto">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 min-w-[100px] py-2 px-4 rounded-lg text-sm font-medium transition-all whitespace-nowrap flex items-center justify-center gap-2 ${
                activeTab === tab.id
                  ? "bg-white shadow-sm text-gray-900"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              {tab.label}
              {tab.extra && (
                <span className="bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {tab.extra}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Sessions Tab */}
        {activeTab === "sessions" && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Your Session{sessions.length !== 1 ? "s" : ""}</h2>
            {sessions.length === 0 ? (
              <div className="bg-white rounded-xl border p-8 text-center text-gray-400">
                <p>Your sessions are being scheduled. Check back soon.</p>
              </div>
            ) : sessions.map(s => (
              <div key={s.id} className="bg-white rounded-xl border shadow-sm p-5">
                <div className="flex items-start gap-3">
                  <div className="w-1 self-stretch rounded-full flex-shrink-0" style={{ background: "#0381ED" }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 capitalize">{s.sessionType}</span>
                      {s.track && <span className="text-xs text-gray-500">{s.track}</span>}
                    </div>
                    <h3 className="font-semibold text-gray-900 leading-snug">{s.title}</h3>
                    <div className="flex flex-wrap gap-4 mt-3 text-sm text-gray-600">
                      {s.date && <span>📅 {s.date}</span>}
                      {s.startTime && <span>🕐 {s.startTime}{s.endTime ? ` – ${s.endTime}` : ` (${s.durationMinutes} min)`}</span>}
                      {s.room && <span>📍 {s.room}</span>}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Profile Tab */}
        {activeTab === "profile" && (
          <ProfileForm
            speaker={speaker}
            token={token}
            onSaved={() => { setProfileSaved(true); refetch(); }}
            saved={profileSaved}
          />
        )}

        {/* Uploads Tab */}
        {activeTab === "uploads" && (
          <UploadsSection
            speaker={speaker}
            token={token}
            materials={materials}
            onUploaded={() => refetch()}
          />
        )}

        {/* Messages Tab */}
        {activeTab === "messages" && (
          <MessagesSection messages={messages} token={token} onSent={() => refetch()} />
        )}
      </div>
    </div>
  );
}

function ProfileForm({ speaker, token, onSaved, saved }: {
  speaker: Speaker;
  token: string;
  onSaved: () => void;
  saved: boolean;
}) {
  const [form, setForm] = useState({
    biography: speaker.biography ?? "",
    jobTitle: speaker.jobTitle ?? "",
    organization: speaker.organization ?? "",
    country: speaker.country ?? "",
    linkedinUrl: speaker.linkedinUrl ?? "",
    twitterUrl: speaker.twitterUrl ?? "",
    websiteUrl: speaker.websiteUrl ?? "",
    dietaryRequirements: speaker.dietaryRequirements ?? "",
    accessibilityNeeds: speaker.accessibilityNeeds ?? "",
    recordingConsent: speaker.recordingConsent,
  });

  const set = (k: string, v: string | boolean) => setForm(f => ({ ...f, [k]: v }));

  const mutation = useMutation({
    mutationFn: () => apiReq("POST", `/api/speaker-portal/${token}/update-profile`, form),
    onSuccess: onSaved,
  });

  return (
    <div className="bg-white rounded-xl border shadow-sm p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-5">Edit My Profile</h2>
      {saved && (
        <div className="mb-4 bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-3 text-sm">
          Profile updated successfully.
        </div>
      )}
      <div className="grid gap-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Job Title</label>
            <input className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.jobTitle} onChange={e => set("jobTitle", e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Organization</label>
            <input className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.organization} onChange={e => set("organization", e.target.value)} />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
          <input className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.country} onChange={e => set("country", e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Biography</label>
          <textarea className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" rows={5} value={form.biography} onChange={e => set("biography", e.target.value)} placeholder="Tell attendees about yourself…" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">LinkedIn URL</label>
            <input className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.linkedinUrl} onChange={e => set("linkedinUrl", e.target.value)} placeholder="https://linkedin.com/in/…" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">X / Twitter URL</label>
            <input className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.twitterUrl} onChange={e => set("twitterUrl", e.target.value)} placeholder="https://twitter.com/…" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
            <input className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.websiteUrl} onChange={e => set("websiteUrl", e.target.value)} placeholder="https://…" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Dietary Requirements</label>
            <input className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.dietaryRequirements} onChange={e => set("dietaryRequirements", e.target.value)} placeholder="e.g. vegetarian, halal…" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Accessibility Needs</label>
            <input className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.accessibilityNeeds} onChange={e => set("accessibilityNeeds", e.target.value)} placeholder="Any accessibility requirements…" />
          </div>
        </div>
        <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
          <input
            type="checkbox"
            id="recording-consent"
            className="mt-0.5 h-4 w-4 rounded"
            checked={form.recordingConsent}
            onChange={e => set("recordingConsent", e.target.checked)}
          />
          <label htmlFor="recording-consent" className="text-sm text-gray-700">
            I consent to my session being recorded and the recording being shared publicly after the event.
          </label>
        </div>
        <div className="flex justify-end">
          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            className="px-6 py-2 rounded-lg text-white font-medium text-sm disabled:opacity-60 transition"
            style={{ background: "#015845" }}
          >
            {mutation.isPending ? "Saving…" : "Save Profile"}
          </button>
        </div>
      </div>
    </div>
  );
}

function UploadsSection({ speaker, token, materials, onUploaded }: {
  speaker: Speaker;
  token: string;
  materials: Material[];
  onUploaded: () => void;
}) {
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const latestByType = materials.reduce<Record<string, Material>>((acc, m) => {
    const ft = m.fileType ?? "other";
    if (!acc[ft] || m.version > acc[ft]!.version) acc[ft] = m;
    return acc;
  }, {});

  const upload = async (fileType: string, file: File) => {
    setUploading(u => ({ ...u, [fileType]: true }));
    setErrors(e => ({ ...e, [fileType]: "" }));
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("fileType", fileType);
      const res = await fetch(`/api/speaker-portal/${token}/upload`, {
        method: "POST",
        credentials: "include",
        body: fd,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(err.error ?? "Upload failed");
      }
      onUploaded();
    } catch (e) {
      setErrors(err => ({ ...err, [fileType]: (e as Error).message }));
    } finally {
      setUploading(u => ({ ...u, [fileType]: false }));
    }
  };

  const UploadCard = ({ fileType, label, accept, hint }: { fileType: string; label: string; accept: string; hint: string }) => {
    const latest = latestByType[fileType];
    const isUploading = uploading[fileType];
    const err = errors[fileType];

    return (
      <div className="bg-white rounded-xl border shadow-sm p-5">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="font-semibold text-gray-900">{label}</h3>
            <p className="text-xs text-gray-500 mt-0.5">{hint}</p>
          </div>
          {latest && (
            <span className="text-xs bg-green-50 text-green-700 border border-green-200 rounded-full px-2 py-0.5">
              ✓ v{latest.version} uploaded
            </span>
          )}
        </div>

        {latest && (
          <div className="mb-3 p-3 bg-gray-50 rounded-lg text-xs text-gray-600">
            <strong>{latest.originalFilename}</strong>
            <span className="ml-2 text-gray-400">
              {latest.fileSizeKb && `${latest.fileSizeKb} KB · `}
              {new Date(latest.uploadedAt).toLocaleDateString()}
            </span>
          </div>
        )}

        <label className={`flex items-center justify-center w-full px-4 py-3 border-2 border-dashed rounded-lg text-sm font-medium cursor-pointer transition ${
          isUploading ? "opacity-50 cursor-not-allowed" : "hover:border-blue-400 hover:bg-blue-50"
        } border-gray-300`}>
          <input
            type="file"
            accept={accept}
            className="hidden"
            disabled={isUploading}
            onChange={e => {
              const f = e.target.files?.[0];
              if (f) upload(fileType, f);
              e.target.value = "";
            }}
          />
          {isUploading ? "Uploading…" : latest ? "Replace file" : "Choose file"}
        </label>

        {err && <p className="mt-2 text-xs text-red-600">{err}</p>}
      </div>
    );
  };

  const isD5 = speaker.callCategory === "D5";
  const isD6 = speaker.callCategory === "D6";

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-900">Upload Materials</h2>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-start gap-3 mb-3">
          <span className="text-blue-500 text-xl mt-0.5">📋</span>
          <div>
            <p className="text-sm font-semibold text-blue-900 mb-2">Presentation Slides Instructions</p>
            <ul className="space-y-1.5">
              {[
                "Please download the presentation template below",
                "Fill it with your presentation",
                "Upload it below in the Presentation Slides field",
                "Do not upload an unfilled template",
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-blue-800">
                  <span className="mt-1 w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
        {(isD5 || isD6) && (
          <a
            href={isD5 ? "/D5_Template.pptx" : "/D6_Template.pptx"}
            download
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition"
            style={{ background: "#0381ED" }}
          >
            ⬇ Download {isD5 ? "D5" : "D6"} Template
          </a>
        )}
      </div>

      <UploadCard
        fileType="headshot"
        label="Headshot Photo"
        accept=".jpg,.jpeg,.png"
        hint="Professional photo — JPG or PNG only"
      />
      <UploadCard
        fileType="slides"
        label="Presentation Slides"
        accept=".pdf,.ppt,.pptx"
        hint="PDF, PPT, or PPTX — max 100 MB"
      />
    </div>
  );
}

function MessagesSection({ messages, token, onSent }: { messages: Message[]; token: string; onSent: () => void }) {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [composeOpen, setComposeOpen] = useState(false);

  const send = useMutation({
    mutationFn: () => apiReq("POST", `/api/speaker-portal/${token}/message`, { subject: subject.trim() || undefined, body }),
    onSuccess: () => {
      setSubject("");
      setBody("");
      setComposeOpen(false);
      onSent();
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Messages</h2>
        <button
          onClick={() => setComposeOpen(v => !v)}
          className="text-sm px-4 py-1.5 rounded-lg font-medium text-white"
          style={{ background: "#0381ED" }}
        >
          {composeOpen ? "Cancel" : "✉ Send Message"}
        </button>
      </div>

      {composeOpen && (
        <div className="bg-white rounded-xl border shadow-sm p-5 space-y-3">
          <h3 className="font-semibold text-gray-800 text-sm">Send a message to the organising team</h3>
          <input
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
            placeholder="Subject (optional)"
            value={subject}
            onChange={e => setSubject(e.target.value)}
          />
          <textarea
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 resize-none"
            placeholder="Your message…"
            rows={4}
            value={body}
            onChange={e => setBody(e.target.value)}
          />
          {send.isError && (
            <p className="text-xs text-red-600">{(send.error as Error).message}</p>
          )}
          <div className="flex justify-end">
            <button
              disabled={!body.trim() || send.isPending}
              onClick={() => send.mutate()}
              className="px-5 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50"
              style={{ background: "#015845" }}
            >
              {send.isPending ? "Sending…" : "Send"}
            </button>
          </div>
        </div>
      )}

      {messages.length === 0 && !composeOpen ? (
        <div className="bg-white rounded-xl border p-8 text-center text-gray-400">
          <p>No messages yet.</p>
          <p className="text-xs mt-1">Use the button above to send a message to the organising team.</p>
        </div>
      ) : messages.map(m => {
        const fromOrganizer = m.sentBy === "organizer";
        return (
          <div key={m.id} className={`bg-white rounded-xl border shadow-sm p-5 ${!m.readAt && fromOrganizer ? "border-l-4 border-l-blue-500" : ""}`}>
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-semibold text-gray-900">{m.subject ?? "(No subject)"}</h3>
              <span className="text-xs text-gray-400">{new Date(m.sentAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
            </div>
            <p className="text-xs text-gray-500 mb-3">
              {fromOrganizer ? "From: Conference Organisers" : "Sent by you"}
            </p>
            <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{m.body}</div>
          </div>
        );
      })}
    </div>
  );
}
