import React, { useState, useMemo } from "react";
import { Clock, MapPin, Download, Users, X, ChevronRight, Home, Menu, Calendar, Mic2 } from "lucide-react";
import faviconUrl from "@assets/favicon.png";
import heroBgUrl from "@assets/programme_hero_bg.jpg";

const NAV_ITEMS: { label: string; href: string; icon: typeof Home }[] = [
  { label: "Home", href: "https://www.africawatersystems.org/", icon: Home },
];

const SHOW_FEATURED_SPEAKERS = false;

type Lang = "en" | "fr";

const STRINGS = {
  en: {
    home: "Home",
    pdf: "PDF",
    downloadPdf: "Download PDF",
    conferenceDay: "Conference Day",
    conferenceDays: "Conference Days",
    programme: "Programme",
    heroSubtitle: "Africa Water and Sanitation Systems Leadership Symposium — Official Conference Schedule",
    day: "Day",
    allSessions: "All Sessions",
    sessionScheduled: "session",
    sessionsScheduled: "sessions",
    scheduledClickToView: "scheduled — click any session to view full details",
    noSessions: "No sessions scheduled yet.",
    concurrentSessions: "concurrent sessions",
    readMore: "Read more",
    speakers: "Speakers",
    moderator: "Moderator",
    featuredSpeakers: "Featured Speakers",
    featuredSpeakersSub: "Meet the leaders, innovators, and experts presenting at this year's symposium",
    footerTagline: "Leadership Symposium · Official Programme",
    sessionDescription: "Session Description",
    panelistsSpeakers: "Panelists / Speakers",
    noDetails: "No additional details available for this session.",
    close: "Close",
    loading: "Loading programme…",
  },
  fr: {
    home: "Accueil",
    pdf: "PDF",
    downloadPdf: "Télécharger le PDF",
    conferenceDay: "Jour de conférence",
    conferenceDays: "Jours de conférence",
    programme: "Programme",
    heroSubtitle: "Symposium de leadership sur les systèmes d'eau et d'assainissement en Afrique — Programme officiel de la conférence",
    day: "Jour",
    allSessions: "Toutes les sessions",
    sessionScheduled: "session",
    sessionsScheduled: "sessions",
    scheduledClickToView: "prévue(s) — cliquez sur une session pour voir tous les détails",
    noSessions: "Aucune session prévue pour le moment.",
    concurrentSessions: "sessions simultanées",
    readMore: "Lire la suite",
    speakers: "Intervenants",
    moderator: "Modérateur",
    featuredSpeakers: "Intervenants vedettes",
    featuredSpeakersSub: "Rencontrez les leaders, innovateurs et experts présents au symposium cette année",
    footerTagline: "Symposium de leadership · Programme officiel",
    sessionDescription: "Description de la session",
    panelistsSpeakers: "Panélistes / Intervenants",
    noDetails: "Aucun détail supplémentaire disponible pour cette session.",
    close: "Fermer",
    loading: "Chargement du programme…",
  },
} as const;

function LangToggle({ lang, setLang }: { lang: Lang; setLang: (l: Lang) => void }) {
  return (
    <div className="inline-flex items-center rounded-full p-0.5 border border-white/25 bg-white/10 text-[11px] font-bold">
      <button
        onClick={() => setLang("en")}
        className="px-2.5 py-1 rounded-full transition-all"
        style={lang === "en" ? { background: "#fff", color: "#0f3d2f" } : { color: "rgba(255,255,255,0.7)" }}
      >
        EN
      </button>
      <button
        onClick={() => setLang("fr")}
        className="px-2.5 py-1 rounded-full transition-all"
        style={lang === "fr" ? { background: "#fff", color: "#0f3d2f" } : { color: "rgba(255,255,255,0.7)" }}
      >
        FR
      </button>
    </div>
  );
}

type Speaker = {
  id: number;
  name: string;
  jobTitle: string | null;
  organization: string | null;
  roleInSession: string | null;
  photoUrl: string | null;
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
  speakers: Speaker[];
};

type TimeSlot = {
  time: string;
  sessions: Session[];
};

const TRACK_COLORS: Record<string, { bg: string; text: string; light: string }> = {
  Plenary:        { bg: "#015845", text: "#fff",     light: "#ECFDF5" },
  "Main Stage":   { bg: "#0381ED", text: "#fff",     light: "#EFF6FF" },
  "KSA Sessions": { bg: "#D97706", text: "#fff",     light: "#FFFBEB" },
  Community:      { bg: "#059669", text: "#fff",     light: "#F0FDF4" },
  Showcase:       { bg: "#7C3AED", text: "#fff",     light: "#F5F3FF" },
  General:        { bg: "#64748B", text: "#fff",     light: "#F8FAFC" },
};

function trackStyle(track: string) {
  return TRACK_COLORS[track] ?? { bg: "#015845", text: "#fff", light: "#ECFDF5" };
}

function parseDate(dateStr: string): Date | null {
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  if (iso) return new Date(+iso[1], +iso[2] - 1, +iso[3], 12, 0, 0);
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}

function formatDate(dateStr: string) {
  const d = parseDate(dateStr);
  if (!d) return dateStr;
  return d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

function shortDate(dateStr: string) {
  const d = parseDate(dateStr);
  if (!d) return dateStr;
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

function SpeakerChip({ speaker }: { speaker: Speaker }) {
  const [imgError, setImgError] = useState(false);
  const initials = speaker.name
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const isMod =
    speaker.roleInSession?.toLowerCase().includes("moderator") ||
    speaker.roleInSession?.toLowerCase().includes("chair") ||
    speaker.roleInSession?.toLowerCase().includes("facilitator");

  return (
    <div className="flex items-start gap-2" style={{ minWidth: 0, width: "100%" }}>
      <div
        className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center shrink-0 text-xs font-bold mt-0.5"
        style={{
          background: isMod ? "#EFF6FF" : "#F0FDF4",
          outline: `2px solid ${isMod ? "#0381ED" : "#015845"}`,
        }}
      >
        {speaker.photoUrl && !imgError ? (
          <img src={speaker.photoUrl} alt={speaker.name} className="w-full h-full object-cover" onError={() => setImgError(true)} />
        ) : (
          <span style={{ color: isMod ? "#0381ED" : "#015845" }}>{initials}</span>
        )}
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <p className="text-xs font-semibold text-gray-800 leading-tight">{speaker.name}</p>
        {speaker.jobTitle && (
          <p className="text-[10px] text-gray-500 leading-tight">{speaker.jobTitle}</p>
        )}
        {speaker.organization && (
          <p className="text-[10px] text-gray-400 leading-tight">{speaker.organization}</p>
        )}
        {isMod && speaker.roleInSession && (
          <p className="text-[9px] font-bold uppercase tracking-widest mt-0.5" style={{ color: "#0381ED" }}>
            {speaker.roleInSession}
          </p>
        )}
      </div>
    </div>
  );
}

function SpeakerAvatar({ speaker }: { speaker: Speaker }) {
  const [imgError, setImgError] = useState(false);
  const initials = speaker.name
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div
      className="w-16 h-16 md:w-20 md:h-20 rounded-full overflow-hidden flex items-center justify-center shrink-0 text-base font-bold"
      style={{ background: "#F0FDF4", outline: "3px solid #015845", outlineOffset: "2px" }}
    >
      {speaker.photoUrl && !imgError ? (
        <img src={speaker.photoUrl} alt={speaker.name} className="w-full h-full object-cover" onError={() => setImgError(true)} />
      ) : (
        <span style={{ color: "#015845" }}>{initials}</span>
      )}
    </div>
  );
}

function SpeakerCard({ speaker }: { speaker: Speaker }) {
  const [imgError, setImgError] = useState(false);
  const initials = speaker.name
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const isMod =
    speaker.roleInSession?.toLowerCase().includes("moderator") ||
    speaker.roleInSession?.toLowerCase().includes("chair") ||
    speaker.roleInSession?.toLowerCase().includes("facilitator");

  return (
    <div
      className="flex items-start gap-3 p-3 rounded-xl border"
      style={{ background: isMod ? "#EFF6FF" : "#F0FDF4", borderColor: isMod ? "#BFDBFE" : "#BBF7D0" }}
    >
      <div
        className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center shrink-0 text-sm font-bold"
        style={{
          background: isMod ? "#DBEAFE" : "#DCFCE7",
          outline: `2px solid ${isMod ? "#0381ED" : "#015845"}`,
        }}
      >
        {speaker.photoUrl && !imgError ? (
          <img src={speaker.photoUrl} alt={speaker.name} className="w-full h-full object-cover" onError={() => setImgError(true)} />
        ) : (
          <span style={{ color: isMod ? "#0381ED" : "#015845" }}>{initials}</span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-sm text-gray-900">{speaker.name}</p>
        {speaker.jobTitle && <p className="text-xs text-gray-600 mt-0.5">{speaker.jobTitle}</p>}
        {speaker.organization && <p className="text-xs text-gray-500">{speaker.organization}</p>}
        {speaker.roleInSession && (
          <span
            className="inline-block mt-1.5 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
            style={{
              background: isMod ? "#0381ED" : "#015845",
              color: "#fff",
            }}
          >
            {speaker.roleInSession}
          </span>
        )}
      </div>
    </div>
  );
}

function SessionModal({ session, onClose, lang }: { session: Session; onClose: () => void; lang: Lang }) {
  const t = STRINGS[lang];
  const ts = trackStyle(session.track);
  const moderators = session.speakers.filter(
    (s) =>
      s.roleInSession?.toLowerCase().includes("moderator") ||
      s.roleInSession?.toLowerCase().includes("chair") ||
      s.roleInSession?.toLowerCase().includes("facilitator")
  );
  const panelists = session.speakers.filter(
    (s) =>
      !s.roleInSession?.toLowerCase().includes("moderator") &&
      !s.roleInSession?.toLowerCase().includes("chair") &&
      !s.roleInSession?.toLowerCase().includes("facilitator")
  );

  React.useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: "rgba(0,0,0,0.55)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="relative bg-white w-full sm:max-w-2xl rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        style={{ maxHeight: "92vh" }}
      >
        {/* Modal header */}
        <div className="shrink-0">
          <div className="w-1 hidden" style={{ background: ts.bg }} />
          <div className="px-5 pt-5 pb-4 border-b border-gray-100">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span
                    className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase"
                    style={{ background: ts.light, color: ts.bg }}
                  >
                    {session.track}
                  </span>
                  {session.room && (
                    <span className="flex items-center gap-1 text-xs text-gray-500">
                      <MapPin className="h-3 w-3" />
                      {session.room}
                    </span>
                  )}
                  {session.startTime && (
                    <span className="flex items-center gap-1 text-xs text-gray-500">
                      <Clock className="h-3 w-3" />
                      {session.startTime}{session.endTime ? ` – ${session.endTime}` : ""}
                    </span>
                  )}
                </div>
                <h2 className="text-lg font-bold text-gray-900 leading-snug">{session.title}</h2>
              </div>
              <button
                onClick={onClose}
                className="shrink-0 p-1.5 rounded-full hover:bg-gray-100 transition-colors"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">
          {/* Description */}
          {session.description && (
            <div>
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">{t.sessionDescription}</h3>
              <div className="text-sm text-gray-700 leading-relaxed space-y-2">
                {session.description.split(/\n+/).map((para, i) => (
                  <p key={i}>{para}</p>
                ))}
              </div>
            </div>
          )}

          {/* Moderators */}
          {moderators.length > 0 && (
            <div>
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">
                {moderators[0].roleInSession ?? t.moderator}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {moderators.map((sp) => (
                  <SpeakerCard key={sp.id} speaker={sp} />
                ))}
              </div>
            </div>
          )}

          {/* Speakers / Panelists */}
          {panelists.length > 0 && (
            <div>
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3 flex items-center gap-1">
                <Users className="h-3 w-3" />
                {moderators.length > 0 ? t.panelistsSpeakers : t.speakers}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {panelists.map((sp) => (
                  <SpeakerCard key={sp.id} speaker={sp} />
                ))}
              </div>
            </div>
          )}

          {session.speakers.length === 0 && !session.description && (
            <p className="text-sm text-gray-400 text-center py-6">{t.noDetails}</p>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 px-5 py-3 border-t border-gray-100 bg-gray-50">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-200 transition-colors"
          >
            {t.close}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ProgrammePublicPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTrack, setActiveTrack] = useState("All");
  const [activeDate, setActiveDate] = useState<string | null>(null);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [lang, setLang] = useState<Lang>(() => {
    if (typeof window === "undefined") return "en";
    return (localStorage.getItem("programme-lang") as Lang) || "en";
  });
  const t = STRINGS[lang];

  const changeLang = (l: Lang) => {
    setLang(l);
    if (typeof window !== "undefined") localStorage.setItem("programme-lang", l);
  };

  React.useEffect(() => {
    let cancelled = false;

    const load = (isInitial = false) => {
      fetch("/api/programme/sessions", { credentials: "include", cache: "no-cache" })
        .then((r) => r.json())
        .then((data: Session[]) => {
          if (cancelled) return;
          setSessions(data);
          if (isInitial) {
            const dates = Array.from(new Set(data.filter((s) => s.date).map((s) => s.date as string))).sort();
            if (dates.length > 0) setActiveDate(dates[0]);
            setLoading(false);
          }
        })
        .catch(() => { if (isInitial && !cancelled) setLoading(false); });
    };

    load(true);

    const interval = setInterval(() => load(false), 30_000);

    const onVisible = () => { if (document.visibilityState === "visible") load(false); };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  const dates = useMemo(
    () => Array.from(new Set(sessions.filter((s) => s.date).map((s) => s.date as string))).sort(),
    [sessions]
  );

  const tracks = useMemo(() => {
    const set = new Set(sessions.filter((s) => !s.isBreak).map((s) => s.track));
    return Array.from(set);
  }, [sessions]);

  const speakers = useMemo(() => {
    const map = new Map<number, Speaker>();
    for (const s of sessions) {
      for (const sp of s.speakers) {
        if (!map.has(sp.id)) map.set(sp.id, sp);
      }
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [sessions]);

  const filtered = useMemo(() => {
    return sessions.filter((s) => {
      const dateOk = !activeDate || s.date === activeDate;
      const trackOk = activeTrack === "All" || s.isBreak || s.track === activeTrack;
      return dateOk && trackOk;
    });
  }, [sessions, activeDate, activeTrack]);

  const timeSlots = useMemo(() => {
    const map = new Map<string, Session[]>();
    for (const s of filtered) {
      const key = s.startTime ?? "__none__";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => (a === "__none__" ? 1 : b === "__none__" ? -1 : a.localeCompare(b)))
      .map(([time, sessions]) => ({ time: time === "__none__" ? "" : time, sessions })) as TimeSlot[];
  }, [filtered]);

  if (loading) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center gap-4"
        style={{ background: "linear-gradient(160deg, #012d23 0%, #015845 40%, #0262b8 100%)" }}
      >
        <img src={faviconUrl} alt="Logo" className="w-14 h-14 animate-pulse" />
        <p className="text-white/70 text-sm tracking-wide">{t.loading}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "#F0F4F8", fontFamily: "'Inter', sans-serif" }}>

      {/* ── HERO ───────────────────────────────────────────────────────────── */}
      <div
        className="relative overflow-hidden"
        style={{ minHeight: 300 }}
      >
        <img
          src={heroBgUrl}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "linear-gradient(160deg, rgba(1,45,35,0.72) 0%, rgba(1,88,69,0.65) 45%, rgba(2,98,184,0.62) 100%)",
          }}
        />
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.07]"
          style={{
            backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)",
            backgroundSize: "30px 30px",
          }}
        />

        {/* ── NAV ──────────────────────────────────────────────────────────── */}
        <div className="relative flex items-center justify-end gap-2 px-6 md:px-12 pt-6 pb-0 print:hidden">
          <nav className="hidden md:flex items-center gap-1">
            {NAV_ITEMS.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold text-white/85 hover:text-white hover:bg-white/10 transition-all"
              >
                <item.icon className="h-3.5 w-3.5" />
                {t.home}
              </a>
            ))}
            <button
              onClick={() => window.print()}
              className="ml-2 inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold border border-white/25 bg-white/10 text-white hover:bg-white/20 transition-all"
            >
              <Download className="h-3.5 w-3.5" />
              {t.pdf}
            </button>
            <LangToggle lang={lang} setLang={changeLang} />
          </nav>

          <div className="md:hidden flex items-center gap-2">
            <LangToggle lang={lang} setLang={changeLang} />
            <button
              onClick={() => setMobileMenuOpen((v) => !v)}
              className="inline-flex items-center justify-center w-10 h-10 rounded-full border border-white/25 bg-white/10 text-white"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="relative md:hidden px-6 pt-4 flex flex-col gap-1 print:hidden">
            {NAV_ITEMS.map((item) => (
              <a
                key={item.label}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-semibold text-white bg-white/10 hover:bg-white/20 transition-all"
              >
                <item.icon className="h-4 w-4" />
                {t.home}
              </a>
            ))}
            <button
              onClick={() => { window.print(); setMobileMenuOpen(false); }}
              className="flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-semibold text-white bg-white/10 hover:bg-white/20 transition-all"
            >
              <Download className="h-4 w-4" />
              {t.downloadPdf}
            </button>
          </div>
        )}

        <div className="relative max-w-5xl mx-auto px-6 md:px-12 pt-10 pb-10 text-center flex flex-col items-center">
          {activeDate && dates.length > 0 && (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 text-white/80 text-xs font-medium mb-5 backdrop-blur-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              {dates.length} {dates.length === 1 ? t.conferenceDay : t.conferenceDays}
            </div>
          )}
          <h1
            className="text-4xl md:text-6xl font-black text-white tracking-tight leading-none mb-4"
            style={{ fontFamily: "'Poppins', sans-serif" }}
          >
            {t.programme}
          </h1>
          <p className="text-white/60 text-base md:text-lg max-w-xl mx-auto">
            {t.heroSubtitle}
          </p>
        </div>
      </div>

      {/* ── DAY TABS ───────────────────────────────────────────────────────── */}
      {dates.length > 0 && (
        <div id="schedule" style={{ background: "#0f3d2f" }} className="print:hidden scroll-mt-4">
          <div className="max-w-5xl mx-auto px-4 md:px-12">
            <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide py-0">
              {dates.map((d, i) => (
                <button
                  key={d}
                  onClick={() => setActiveDate(d)}
                  className="flex-shrink-0 px-5 py-4 text-sm font-semibold transition-all border-b-2 whitespace-nowrap"
                  style={
                    activeDate === d
                      ? { color: "#fff", borderColor: "#0381ED", background: "transparent" }
                      : { color: "rgba(255,255,255,0.5)", borderColor: "transparent", background: "transparent" }
                  }
                >
                  {t.day} {i + 1}
                  <span className="block text-[10px] font-normal opacity-70 mt-0.5">{shortDate(d)}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── TRACK FILTER BAR ───────────────────────────────────────────────── */}
      {tracks.length > 1 && (
        <div className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm print:hidden">
          <div className="max-w-5xl mx-auto px-4 md:px-12 py-3 flex items-center gap-2 overflow-x-auto scrollbar-hide">
            <button
              onClick={() => setActiveTrack("All")}
              className="flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-semibold border transition-all"
              style={
                activeTrack === "All"
                  ? { background: "#015845", color: "#fff", borderColor: "#015845" }
                  : { background: "#fff", color: "#374151", borderColor: "#E5E7EB" }
              }
            >
              {t.allSessions}
            </button>
            {tracks.map((track) => {
              const ts = trackStyle(track);
              const isActive = activeTrack === track;
              return (
                <button
                  key={track}
                  onClick={() => setActiveTrack(track)}
                  className="flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-semibold border transition-all"
                  style={
                    isActive
                      ? { background: ts.bg, color: ts.text, borderColor: ts.bg }
                      : { background: "#fff", color: "#374151", borderColor: "#E5E7EB" }
                  }
                >
                  {track}
                </button>
              );
            })}
            <button
              onClick={() => window.print()}
              className="ml-auto flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-semibold border border-gray-300 text-gray-600 hover:bg-gray-50 transition-all sm:hidden"
            >
              <Download className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ── DATE HEADING ───────────────────────────────────────────────────── */}
      {activeDate && (
        <div className="max-w-5xl mx-auto px-4 md:px-12 pt-8 pb-2">
          <p className="text-lg font-bold text-gray-800">{formatDate(activeDate)}</p>
          <p className="text-sm text-gray-400 mt-0.5">
            {filtered.filter((s) => !s.isBreak).length}{" "}
            {filtered.filter((s) => !s.isBreak).length !== 1 ? t.sessionsScheduled : t.sessionScheduled}{" "}
            {t.scheduledClickToView}
          </p>
        </div>
      )}

      {/* ── TIMELINE ───────────────────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-4 md:px-12 py-6">
        {timeSlots.length === 0 && (
          <div className="text-center py-28">
            <div className="inline-flex flex-col items-center gap-3 text-gray-400">
              <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center">
                <Clock className="h-8 w-8 text-gray-300" />
              </div>
              <p className="text-sm font-medium">{t.noSessions}</p>
            </div>
          </div>
        )}

        <div className="space-y-0">
          {timeSlots.map(({ time, sessions: slotSessions }, slotIdx) => {
            const breaks = slotSessions.filter((s) => s.isBreak);
            const talks = slotSessions.filter((s) => !s.isBreak);

            return (
              <div key={slotIdx} className="flex gap-0 md:gap-6 mb-6">
                {/* Time column */}
                <div className="hidden md:flex flex-col items-end pt-1 w-28 shrink-0">
                  {time && (
                    <div
                      className="rounded-xl px-3 py-2 text-center text-xs font-bold whitespace-nowrap shadow-sm"
                      style={{ background: "#0f3d2f", color: "#fff" }}
                    >
                      {time}
                    </div>
                  )}
                </div>

                {/* Sessions column */}
                <div className="flex-1 min-w-0 space-y-2">
                  {/* Break rows */}
                  {breaks.map((session) => (
                    <div
                      key={session.id}
                      className="flex items-center gap-3 rounded-xl px-4 py-3 border"
                      style={{ background: "#EFF6FF", borderColor: "#BFDBFE" }}
                    >
                      {time && (
                        <span className="md:hidden text-xs font-bold rounded-lg px-2 py-1 shrink-0" style={{ background: "#0381ED", color: "#fff" }}>
                          {time}
                        </span>
                      )}
                      <span className="text-sm font-semibold text-blue-800">{session.title}</span>
                      {session.room && (
                        <span className="ml-auto text-xs text-blue-500 flex items-center gap-1 shrink-0">
                          <MapPin className="h-3 w-3" />
                          {session.room}
                        </span>
                      )}
                    </div>
                  ))}

                  {/* Concurrent sessions label */}
                  {talks.length > 1 && (
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                        {talks.length} {t.concurrentSessions}
                      </span>
                    </div>
                  )}

                  {/* Session cards */}
                  {talks.map((session) => {
                    const ts = trackStyle(session.track);
                    const moderators = session.speakers.filter(
                      (s) =>
                        s.roleInSession?.toLowerCase().includes("moderator") ||
                        s.roleInSession?.toLowerCase().includes("chair") ||
                        s.roleInSession?.toLowerCase().includes("facilitator")
                    );
                    const panelists = session.speakers.filter(
                      (s) =>
                        !s.roleInSession?.toLowerCase().includes("moderator") &&
                        !s.roleInSession?.toLowerCase().includes("chair") &&
                        !s.roleInSession?.toLowerCase().includes("facilitator")
                    );

                    return (
                      <div
                        key={session.id}
                        className="rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-all cursor-pointer group"
                        onClick={() => setSelectedSession(session)}
                        title="Click to view full details"
                      >
                        {/* Left accent bar */}
                        <div className="flex">
                          <div className="w-1 shrink-0" style={{ background: ts.bg }} />
                          <div className="flex-1 min-w-0">
                            {/* Card header */}
                            <div className="px-5 pt-4 pb-3">
                              <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span
                                    className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase"
                                    style={{ background: ts.light, color: ts.bg }}
                                  >
                                    {session.track}
                                  </span>
                                  {time && (
                                    <span className="md:hidden text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                                      {time}{session.endTime ? ` – ${session.endTime}` : ""}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-3 text-xs text-gray-400">
                                  {session.endTime && (
                                    <span className="hidden md:flex items-center gap-1">
                                      <Clock className="h-3 w-3" />
                                      {time} – {session.endTime}
                                    </span>
                                  )}
                                  {session.room && (
                                    <span className="flex items-center gap-1">
                                      <MapPin className="h-3 w-3" />
                                      {session.room}
                                    </span>
                                  )}
                                  <span className="flex items-center gap-1 text-gray-300 group-hover:text-gray-500 transition-colors">
                                    <ChevronRight className="h-3.5 w-3.5" />
                                  </span>
                                </div>
                              </div>

                              <h3 className="text-[15px] font-bold text-gray-900 leading-snug mb-1.5">
                                {session.title}
                              </h3>
                              {session.description && (
                                <p className="text-sm text-gray-500 leading-relaxed line-clamp-2">
                                  {session.description}
                                </p>
                              )}
                              {session.description && session.description.length > 120 && (
                                <button
                                  className="text-xs font-semibold mt-1 hover:underline"
                                  style={{ color: ts.bg }}
                                  onClick={(e) => { e.stopPropagation(); setSelectedSession(session); }}
                                >
                                  {t.readMore}
                                </button>
                              )}
                            </div>

                            {/* Speakers */}
                            {session.speakers.length > 0 && (
                              <div className="px-5 pb-4 pt-1">
                                <div className="pt-3 border-t border-gray-100">
                                  {moderators.length > 0 && (
                                    <div className="mb-3">
                                      <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-2">
                                        {moderators[0].roleInSession ?? t.moderator}
                                      </p>
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {moderators.map((sp) => (
                                          <SpeakerChip key={sp.id} speaker={sp} />
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  {panelists.length > 0 && (
                                    <div>
                                      {(moderators.length > 0 || session.speakers.length > 1) && (
                                        <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-2 flex items-center gap-1">
                                          <Users className="h-3 w-3" />
                                          {t.speakers}
                                        </p>
                                      )}
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {panelists.map((sp) => (
                                          <SpeakerChip key={sp.id} speaker={sp} />
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── SPEAKERS ───────────────────────────────────────────────────────── */}
      {SHOW_FEATURED_SPEAKERS && speakers.length > 0 && (
        <div id="speakers" className="mt-16 py-16 px-6 print:hidden scroll-mt-4" style={{ background: "#fff" }}>
          <div className="max-w-5xl mx-auto text-center">
            <h2
              className="text-2xl md:text-4xl font-black tracking-tight mb-3"
              style={{ fontFamily: "'Poppins', sans-serif", color: "#0f3d2f" }}
            >
              {t.featuredSpeakers}
            </h2>
            <p className="text-gray-500 text-sm md:text-base mb-10 max-w-xl mx-auto">
              {t.featuredSpeakersSub}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-6">
              {speakers.slice(0, 10).map((sp) => (
                <div key={sp.id} className="flex flex-col items-center text-center">
                  <SpeakerAvatar speaker={sp} />
                  <p className="mt-3 text-sm font-bold text-gray-900 leading-tight">{sp.name}</p>
                  {sp.jobTitle && <p className="text-xs text-gray-500 leading-tight mt-0.5">{sp.jobTitle}</p>}
                  {sp.organization && <p className="text-xs text-gray-400 leading-tight">{sp.organization}</p>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── FOOTER ─────────────────────────────────────────────────────────── */}
      <footer
        className="py-10 px-6 text-center print:hidden"
        style={{ background: "#012d23" }}
      >
        <div className="flex items-center justify-center gap-3 mb-2">
          <img src={faviconUrl} alt="" className="w-7 h-7" />
          <span className="font-bold text-white text-sm" style={{ fontFamily: "'Poppins', sans-serif" }}>
            Africa Water Systems
          </span>
        </div>
        <p className="text-white/40 text-xs">{t.footerTagline}</p>
      </footer>

      {/* ── SESSION DETAIL MODAL ────────────────────────────────────────────── */}
      {selectedSession && (
        <SessionModal session={selectedSession} onClose={() => setSelectedSession(null)} lang={lang} />
      )}

      <style>{`
        @media print {
          .print\\:hidden { display: none !important; }
          body { background: white; }
          .sticky { position: relative !important; }
        }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
