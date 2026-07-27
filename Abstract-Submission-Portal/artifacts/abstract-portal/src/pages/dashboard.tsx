import React, { useState } from "react";
import { useMutation, useQueryClient as useTanstackQC } from "@tanstack/react-query";
import { Link } from "wouter";
import { useAuth } from "@/context/useAuth";
import {
  useGetDashboardStats,
  getGetDashboardStatsQueryKey,
  useGetRecentActivity,
  getGetRecentActivityQueryKey,
  useGetReviewerWorkload,
  getGetReviewerWorkloadQueryKey,
  useListAbstracts,
  getListAbstractsQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/status-badge";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { FileText, Users, Clock, CheckCircle, Activity, UserCog, Globe, ChevronsUpDown, Check, ArrowRight, Plus, Droplets, Sparkles, TrendingUp, Eye, Pencil } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { COUNTRIES } from "@/lib/countries";
import { cn } from "@/lib/utils";

export default function Dashboard() {
  const { user } = useAuth();
  const isAuthor = user?.role === "author";
  const [countryFilter, setCountryFilter] = useState("");
  const [countryOpen, setCountryOpen] = useState(false);

  const { data: stats, isLoading: statsLoading } = useGetDashboardStats(
    { country: countryFilter || undefined },
    {
      query: {
        enabled: !isAuthor,
        queryKey: getGetDashboardStatsQueryKey({ country: countryFilter || undefined }),
      },
    }
  );

  const { data: recentActivity, isLoading: activityLoading } = useGetRecentActivity(
    { limit: 5 },
    {
      query: {
        enabled: user?.role === "admin",
        queryKey: getGetRecentActivityQueryKey({ limit: 5 }),
      },
    }
  );

  const { data: workload, isLoading: workloadLoading } = useGetReviewerWorkload(
    { country: countryFilter || undefined },
    {
      query: {
        enabled: user?.role === "admin" || user?.role === "reviewer" || user?.role === "reviewer_admin",
        queryKey: getGetReviewerWorkloadQueryKey({ country: countryFilter || undefined }),
      },
    }
  );

  const tanstackQC = useTanstackQC();
  const closeReviews = useMutation({
    mutationFn: async (reviewerId: number) => {
      const res = await fetch("/api/admin/close-reviews", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewerId }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? res.statusText);
      return res.json() as Promise<{ closed: number; reviewer: string }>;
    },
    onSuccess: () => {
      tanstackQC.invalidateQueries({ queryKey: getGetReviewerWorkloadQueryKey({ country: countryFilter || undefined }) });
    },
  });

  const { data: myAbstracts, isLoading: abstractsLoading } = useListAbstracts(
    { authorId: user?.id },
    {
      query: {
        enabled: isAuthor,
        queryKey: getListAbstractsQueryKey({ authorId: user?.id }),
      },
    }
  );



  if (isAuthor) {
    if (abstractsLoading) {
      return (
        <div className="flex-1 overflow-auto">
          <div className="p-6 space-y-6 max-w-5xl mx-auto">
            <Skeleton className="h-40 w-full rounded-2xl" />
            <div className="grid grid-cols-3 gap-4">
              <Skeleton className="h-28 rounded-xl" />
              <Skeleton className="h-28 rounded-xl" />
              <Skeleton className="h-28 rounded-xl" />
            </div>
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
        </div>
      );
    }

    const total = myAbstracts?.length ?? 0;
    const drafts = myAbstracts?.filter((a) => a.status === "draft") ?? [];
    const inProgress = myAbstracts?.filter((a) => a.status === "submitted" || a.status === "under_review") ?? [];
    const accepted = myAbstracts?.filter((a) => a.status === "accepted") ?? [];
    const rejected = myAbstracts?.filter((a) => a.status === "rejected") ?? [];

    const trackLabels: Record<string, string> = {
      "System Reforms and Investment Fiches": "System Reforms",
      "Country Transformation Snapshots": "Country Snapshots",
      "Youth Led Innovations": "Youth Innovations",
    };

    const statusConfig: Record<string, { label: string; color: string; bg: string; dot: string }> = {
      draft:        { label: "Draft",        color: "text-gray-600",   bg: "bg-gray-100",   dot: "bg-gray-400" },
      submitted:    { label: "Submitted",    color: "text-blue-700",   bg: "bg-blue-50",    dot: "bg-blue-500" },
      under_review: { label: "Under Review", color: "text-amber-700",  bg: "bg-amber-50",   dot: "bg-amber-500" },
      accepted:     { label: "Accepted",     color: "text-emerald-700",bg: "bg-emerald-50", dot: "bg-emerald-500" },
      rejected:     { label: "Rejected",     color: "text-red-700",    bg: "bg-red-50",     dot: "bg-red-400" },
      on_hold:      { label: "On Hold",      color: "text-orange-700", bg: "bg-orange-50",  dot: "bg-orange-400" },
    };

    const firstName = user.name.split(" ")[0];
    const greeting = (() => {
      const h = new Date().getHours();
      if (h < 12) return "Good morning";
      if (h < 17) return "Good afternoon";
      return "Good evening";
    })();

    return (
      <div className="flex-1 overflow-auto bg-gradient-to-br from-slate-50 to-white min-h-screen">
        <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-5">

          {/* Hero Banner */}
          <div className="relative rounded-2xl overflow-hidden" style={{ background: "linear-gradient(135deg, #015845 0%, #01734f 50%, #0381ED 100%)" }}>
            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
            <div className="relative px-8 py-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2 mb-1">
                  <Droplets className="h-4 w-4 text-white/70" />
                  <span className="text-white/70 text-sm font-medium tracking-wide uppercase">Africa Water and Sanitation Systems Leadership Symposium 2026</span>
                </div>
                <h1 className="text-3xl font-bold text-white leading-tight">
                  {greeting}, {firstName} 👋
                </h1>
                <p className="text-white/70 text-sm max-w-md">
                  Track your submissions to the Africa Water and Sanitation Systems Leadership Symposium below.
                </p>
              </div>
              <div className="flex-shrink-0" />
            </div>
          </div>

          {/* Stat Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              {
                label: "Total",
                value: total,
                icon: FileText,
                iconBg: "bg-[#015845]/10",
                iconColor: "text-[#015845]",
                border: "border-[#015845]/20",
              },
              {
                label: "In Progress",
                value: inProgress.length,
                icon: Clock,
                iconBg: "bg-amber-100",
                iconColor: "text-amber-600",
                border: "border-amber-200",
              },
              {
                label: "Accepted",
                value: accepted.length,
                icon: CheckCircle,
                iconBg: "bg-emerald-100",
                iconColor: "text-emerald-600",
                border: "border-emerald-200",
              },
              {
                label: "Drafts",
                value: drafts.length,
                icon: Pencil,
                iconBg: "bg-gray-100",
                iconColor: "text-gray-500",
                border: "border-gray-200",
              },
            ].map(({ label, value, icon: Icon, iconBg, iconColor, border }) => (
              <div key={label} className={`bg-white rounded-xl border-2 ${border} p-5 flex items-center gap-4 shadow-sm`}>
                <div className={`${iconBg} p-3 rounded-xl flex-shrink-0`}>
                  <Icon className={`h-5 w-5 ${iconColor}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground leading-none">{value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Submission Journey */}
          {total > 0 && (
            <div className="bg-white rounded-xl border border-border shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="h-4 w-4 text-[#015845]" />
                <h2 className="font-semibold text-sm text-foreground">Submission Journey</h2>
              </div>
              <div className="flex items-center gap-1 overflow-x-auto pb-1">
                {[
                  { key: "draft", label: "Draft", count: drafts.length },
                  { key: "submitted", label: "Submitted", count: myAbstracts?.filter(a => a.status === "submitted").length ?? 0 },
                  { key: "under_review", label: "Under Review", count: myAbstracts?.filter(a => a.status === "under_review").length ?? 0 },
                  { key: "accepted", label: "Accepted", count: accepted.length },
                  { key: "on_hold", label: "On Hold", count: myAbstracts?.filter(a => a.status === "on_hold").length ?? 0 },
                ].map((step, i, arr) => {
                  const cfg = statusConfig[step.key];
                  const active = step.count > 0;
                  return (
                    <React.Fragment key={step.key}>
                      <div className={`flex flex-col items-center gap-1.5 min-w-[72px] ${active ? "opacity-100" : "opacity-40"}`}>
                        <div className={`h-9 w-9 rounded-full flex items-center justify-center font-bold text-sm ${active ? cfg.bg + " " + cfg.color : "bg-gray-100 text-gray-400"} border-2 ${active ? "border-current" : "border-gray-200"}`}>
                          {step.count}
                        </div>
                        <span className="text-xs text-center text-muted-foreground leading-tight whitespace-nowrap">{step.label}</span>
                      </div>
                      {i < arr.length - 1 && (
                        <div className="flex-1 h-0.5 bg-gradient-to-r from-gray-200 to-gray-200 rounded-full min-w-[12px]" />
                      )}
                    </React.Fragment>
                  );
                })}
                {rejected.length > 0 && (
                  <>
                    <div className="flex-1 h-0.5 bg-gray-200 rounded-full min-w-[12px]" />
                    <div className="flex flex-col items-center gap-1.5 min-w-[72px]">
                      <div className="h-9 w-9 rounded-full flex items-center justify-center font-bold text-sm bg-red-50 text-red-600 border-2 border-red-200">
                        {rejected.length}
                      </div>
                      <span className="text-xs text-center text-muted-foreground leading-tight">Rejected</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Submissions List */}
          <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[#015845]" />
                <h2 className="font-semibold text-foreground">My Submissions</h2>
                {total > 0 && <span className="bg-[#015845]/10 text-[#015845] text-xs font-semibold px-2 py-0.5 rounded-full">{total}</span>}
              </div>
              <Link href="/abstracts">
                <Button variant="ghost" size="sm" className="text-[#015845] hover:text-[#015845] hover:bg-[#015845]/10 gap-1 text-xs">
                  View all <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </div>

            {myAbstracts && myAbstracts.length > 0 ? (
              <div className="divide-y divide-border">
                {myAbstracts.slice(0, 6).map((abstract) => {
                  const cfg = statusConfig[abstract.status] ?? statusConfig.draft;
                  const track = trackLabels[abstract.track] ?? abstract.track;
                  return (
                    <Link key={abstract.id} href={`/abstracts/${abstract.id}`}>
                      <div className="group flex items-start gap-4 px-6 py-4 hover:bg-slate-50/80 transition-colors cursor-pointer">
                        <div className={`mt-0.5 h-2 w-2 rounded-full flex-shrink-0 ${cfg.dot}`} />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground text-sm leading-snug group-hover:text-[#015845] transition-colors line-clamp-1">
                            {abstract.title}
                          </p>
                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-md">{track}</span>
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-md ${cfg.bg} ${cfg.color}`}>
                              {cfg.label}
                            </span>
                            {abstract.reviewers && abstract.reviewers.length > 0 && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Eye className="h-3 w-3" /> {abstract.reviewers.length} reviewer{abstract.reviewers.length !== 1 ? "s" : ""}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex-shrink-0 text-right">
                          <p className="text-xs text-muted-foreground whitespace-nowrap">
                            {new Date(abstract.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                          </p>
                          <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-[#015845] mt-1.5 ml-auto transition-colors" />
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                <div className="h-14 w-14 rounded-full bg-[#015845]/10 flex items-center justify-center mb-4">
                  <FileText className="h-7 w-7 text-[#015845]" />
                </div>
                <h3 className="font-semibold text-foreground mb-1">No submissions yet</h3>
                <p className="text-sm text-muted-foreground mb-5 max-w-xs">
                  Start by submitting your work to one of the three open calls for the 2026 Symposium.
                </p>
                <Link href="/abstracts">
                  <Button style={{ background: "#015845" }} className="text-white hover:opacity-90 gap-2">
                    <Plus className="h-4 w-4" /> View My Submissions
                  </Button>
                </Link>
              </div>
            )}
          </div>

          {/* Call Type Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                title: "System Reforms & Investment Fiches",
                desc: "Reform initiatives and investment fiches to mobilise partnerships and finance for system-level change.",
                color: "#015845",
                light: "#015845/10",
              },
              {
                title: "Country Transformation Snapshots",
                desc: "Two-page case studies highlighting inspiring national reforms in Africa's water and sanitation sectors.",
                color: "#0381ED",
                light: "#0381ED/10",
              },
              {
                title: "Youth Led Innovations",
                desc: "Promising youth-led innovations in the water and sanitation sector from across the continent.",
                color: "#7c3aed",
                light: "violet-100",
              },
            ].map(({ title, desc, color }) => (
              <div key={title} className="bg-white rounded-xl border border-border shadow-sm p-5 flex flex-col gap-3">
                <div className="h-1 w-10 rounded-full" style={{ background: color }} />
                <p className="font-semibold text-sm text-foreground leading-snug">{title}</p>
                <p className="text-xs text-muted-foreground leading-relaxed flex-1">{desc}</p>
                <Link href="/abstracts">
                  <Button variant="ghost" size="sm" className="text-xs gap-1 px-0 hover:bg-transparent font-semibold" style={{ color }}>
                    View submissions <ArrowRight className="h-3 w-3" />
                  </Button>
                </Link>
              </div>
            ))}
          </div>

        </div>
      </div>
    );
  }

  if (statsLoading || activityLoading || workloadLoading) {
    return (
      <div className="flex-1 overflow-auto bg-gradient-to-br from-slate-50 to-white p-4 sm:p-6">
        <div className="max-w-7xl mx-auto space-y-5">
          <Skeleton className="h-36 w-full rounded-2xl" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1,2,3,4].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Skeleton className="h-72 rounded-xl" />
            <Skeleton className="h-72 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  const isReviewer = user?.role === "reviewer";

  const trackData = stats?.byTrack.map((t) => ({ name: t.track.split(" ").slice(0, 2).join(" "), count: t.count })) || [];

  const statusColors: Record<string, string> = {
    draft: "#9ca3af",
    submitted: "#3b82f6",
    under_review: "#f59e0b",
    accepted: "#10b981",
    rejected: "#ef4444",
    on_hold: "#f97316",
  };

  const statusData = stats
    ? [
        { name: "Draft", value: stats.byStatus.draft, fill: statusColors.draft },
        { name: "Submitted", value: stats.byStatus.submitted, fill: statusColors.submitted },
        { name: "Under Review", value: stats.byStatus.under_review, fill: statusColors.under_review },
        { name: "Accepted", value: stats.byStatus.accepted, fill: statusColors.accepted },
        { name: "Rejected", value: stats.byStatus.rejected, fill: statusColors.rejected },
        { name: "On Hold", value: stats.byStatus.on_hold, fill: statusColors.on_hold },
      ].filter((d) => d.value > 0)
    : [];

  const countryData =
    stats?.byCountry
      ?.filter((c) => c.country)
      .map((c) => ({ name: c.country, count: c.count })) || [];

  const myWorkload = isReviewer ? workload?.find((rw) => rw.userId === user?.id) : null;

  if (isReviewer) {
    const firstName = user?.name?.split(" ")[0] ?? "Reviewer";
    const greeting = (() => {
      const h = new Date().getHours();
      if (h < 12) return "Good morning";
      if (h < 17) return "Good afternoon";
      return "Good evening";
    })();
    const pending = myWorkload?.pendingCount ?? 0;
    const completed = myWorkload?.completedCount ?? 0;
    const total = pending + completed;
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

    return (
      <div className="flex-1 overflow-auto bg-gradient-to-br from-slate-50 to-white min-h-screen">
        <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-5">

          {/* Reviewer Hero */}
          <div className="relative rounded-2xl overflow-hidden" style={{ background: "linear-gradient(135deg, #0381ED 0%, #015845 100%)" }}>
            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 80% 50%, white 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
            <div className="relative px-8 py-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2 mb-1">
                  <Eye className="h-4 w-4 text-white/70" />
                  <span className="text-white/70 text-sm font-medium tracking-wide uppercase">Reviewer Portal</span>
                </div>
                <h1 className="text-3xl font-bold text-white leading-tight">
                  {greeting}, {firstName}
                </h1>
                <p className="text-white/70 text-sm">
                  You have <span className="text-white font-semibold">{pending} pending</span> {pending === 1 ? "submission" : "submissions"} waiting for your review.
                </p>
              </div>
              <div className="flex-shrink-0">
                <Link href="/reviews">
                  <Button className="bg-white text-[#0381ED] hover:bg-white/90 font-semibold shadow-lg px-6 py-5 rounded-xl gap-2">
                    <FileText className="h-4 w-4" />
                    My Review Queue
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          {/* Review Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border-2 border-amber-200 p-5 flex items-center gap-4 shadow-sm">
              <div className="bg-amber-100 p-3 rounded-xl flex-shrink-0">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground leading-none">{pending}</p>
                <p className="text-xs text-muted-foreground mt-1">Pending Reviews</p>
              </div>
            </div>
            <div className="bg-white rounded-xl border-2 border-emerald-200 p-5 flex items-center gap-4 shadow-sm">
              <div className="bg-emerald-100 p-3 rounded-xl flex-shrink-0">
                <CheckCircle className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground leading-none">{completed}</p>
                <p className="text-xs text-muted-foreground mt-1">Completed Reviews</p>
              </div>
            </div>
            <div className="bg-white rounded-xl border-2 border-[#0381ED]/20 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-muted-foreground font-medium">Completion Rate</p>
                <p className="text-lg font-bold text-[#0381ED]">{pct}%</p>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: "#0381ED" }} />
              </div>
              <p className="text-xs text-muted-foreground mt-2">{completed} of {total} reviews complete</p>
            </div>
          </div>

          {/* All Reviewers Table */}
          {workload && workload.length > 0 && (
            <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
              <div className="flex items-center gap-2 px-6 py-4 border-b border-border" style={{ background: "#f0f7ff" }}>
                <Users className="h-4 w-4 text-[#0381ED]" />
                <h2 className="font-semibold text-sm text-foreground">Review Team Workload</h2>
              </div>
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/50">
                    <TableHead className="pl-6">Reviewer</TableHead>
                    <TableHead className="text-right">Pending</TableHead>
                    <TableHead className="text-right">Completed</TableHead>
                    <TableHead className="text-right pr-6">Progress</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {workload.map((rw) => {
                    const rwTotal = rw.pendingCount + rw.completedCount;
                    const rwPct = rwTotal > 0 ? Math.round((rw.completedCount / rwTotal) * 100) : 0;
                    const isMe = rw.userId === user?.id;
                    return (
                      <TableRow key={rw.userId} className={isMe ? "bg-[#0381ED]/5" : ""}>
                        <TableCell className="pl-6">
                          <div className="flex items-center gap-2">
                            {isMe && <div className="h-1.5 w-1.5 rounded-full bg-[#0381ED]" />}
                            <div>
                              <p className="font-medium text-sm">{rw.name}{isMe && <span className="ml-1.5 text-xs text-[#0381ED] font-normal">(you)</span>}</p>
                              {rw.expertise && <p className="text-xs text-muted-foreground truncate max-w-[180px]">{rw.expertise}</p>}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={`font-semibold text-sm ${rw.pendingCount > 0 ? "text-amber-600" : "text-muted-foreground"}`}>
                            {rw.pendingCount}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="text-sm text-emerald-600 font-medium">{rw.completedCount}</span>
                        </TableCell>
                        <TableCell className="pr-6">
                          <div className="flex items-center justify-end gap-2">
                            <div className="h-1.5 w-20 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${rwPct}%`, background: rwPct === 100 ? "#10b981" : "#0381ED" }} />
                            </div>
                            <span className="text-xs text-muted-foreground w-8 text-right">{rwPct}%</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Submission Status Summary */}
          {statusData.length > 0 && (
            <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
              <div className="flex items-center gap-2 px-6 py-4 border-b border-border">
                <TrendingUp className="h-4 w-4 text-[#015845]" />
                <h2 className="font-semibold text-sm text-foreground">Submission Status Overview</h2>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {statusData.map((s) => (
                    <div key={s.name} className="flex items-center gap-3 p-3 rounded-lg bg-slate-50">
                      <div className="h-3 w-3 rounded-full flex-shrink-0" style={{ background: s.fill }} />
                      <div>
                        <p className="text-lg font-bold text-foreground leading-none">{s.value}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{s.name}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Country Chart */}
          {countryData.length > 0 && (
            <div className="bg-white rounded-xl border border-border shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <Globe className="h-4 w-4 text-[#015845]" />
                <h2 className="font-semibold text-sm text-foreground">Submissions by Country</h2>
                <span className="text-xs text-muted-foreground">(top {countryData.length})</span>
              </div>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={countryData} margin={{ top: 10, right: 20, left: 0, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} angle={-35} textAnchor="end" interval={0} />
                  <YAxis axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip cursor={{ fill: "rgba(1,88,69,0.06)" }} contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb" }} />
                  <Bar dataKey="count" fill="#0381ED" radius={[4, 4, 0, 0]} barSize={22} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto bg-gradient-to-br from-slate-50 to-white min-h-screen">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-5">

        {/* Admin Hero */}
        <div className="relative rounded-2xl overflow-hidden" style={{ background: "linear-gradient(135deg, #015845 0%, #01734f 40%, #0381ED 100%)" }}>
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
          <div className="relative px-8 py-7 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 mb-1">
                <Droplets className="h-4 w-4 text-white/70" />
                <span className="text-white/70 text-sm font-medium tracking-wide uppercase">Admin Dashboard</span>
              </div>
              <h1 className="text-2xl font-bold text-white">Africa Water and Sanitation Systems Leadership Symposium 2026</h1>
              <p className="text-white/70 text-sm">Manage submissions, reviewers, and the full review lifecycle.</p>
            </div>
            <div className="flex items-center gap-3">
              <Popover open={countryOpen} onOpenChange={setCountryOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={countryOpen}
                    className="bg-white/15 border-white/30 text-white hover:bg-white/25 gap-2 font-normal"
                  >
                    <Globe className="h-4 w-4" />
                    {countryFilter || "Filter by Country"}
                    <ChevronsUpDown className="ml-1 h-3 w-3 opacity-70" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[220px] p-0" align="end">
                  <Command>
                    <CommandInput placeholder="Search countries..." />
                    <CommandList>
                      <CommandEmpty>No country found.</CommandEmpty>
                      <CommandGroup>
                        <CommandItem value="" onSelect={() => { setCountryFilter(""); setCountryOpen(false); }}>
                          <Check className={cn("mr-2 h-4 w-4", !countryFilter ? "opacity-100" : "opacity-0")} />
                          All Countries
                        </CommandItem>
                        {COUNTRIES.map((country) => (
                          <CommandItem key={country} value={country} onSelect={(val) => { setCountryFilter(val); setCountryOpen(false); }}>
                            <Check className={cn("mr-2 h-4 w-4", countryFilter === country ? "opacity-100" : "opacity-0")} />
                            {country}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>

        {/* Admin Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total Abstracts", value: stats?.totalAbstracts ?? 0, sub: `${stats?.byStatus.draft ?? 0} draft`, icon: FileText, iconBg: "bg-[#015845]/10", iconColor: "text-[#015845]", border: "border-[#015845]/20" },
            { label: "Accepted", value: stats?.byStatus.accepted ?? 0, sub: `${stats?.byStatus.on_hold ?? 0} on hold`, icon: CheckCircle, iconBg: "bg-emerald-100", iconColor: "text-emerald-600", border: "border-emerald-200" },
            { label: "Under Review", value: stats?.byStatus.under_review ?? 0, sub: `${stats?.byStatus.submitted ?? 0} awaiting assignment`, icon: Clock, iconBg: "bg-amber-100", iconColor: "text-amber-600", border: "border-amber-200" },
            { label: "Pending Reviews", value: stats?.pendingReviews ?? 0, sub: `${stats?.completedReviews ?? 0} completed`, icon: Users, iconBg: "bg-[#0381ED]/10", iconColor: "text-[#0381ED]", border: "border-[#0381ED]/20" },
          ].map(({ label, value, sub, icon: Icon, iconBg, iconColor, border }) => (
            <div key={label} className={`bg-white rounded-xl border-2 ${border} p-5 flex items-center gap-4 shadow-sm`}>
              <div className={`${iconBg} p-3 rounded-xl flex-shrink-0`}>
                <Icon className={`h-5 w-5 ${iconColor}`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground leading-none">{value}</p>
                <p className="text-xs text-muted-foreground mt-1">{label}</p>
                {sub && <p className="text-[10px] text-muted-foreground/70 mt-0.5">{sub}</p>}
              </div>
            </div>
          ))}
        </div>

        {/* Status Badges Row */}
        {statusData.length > 0 && (
          <div className="bg-white rounded-xl border border-border shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-4 w-4 text-[#015845]" />
              <h2 className="font-semibold text-sm text-foreground">Submission Pipeline</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {statusData.map((s) => (
                <div key={s.name} className="flex flex-col items-center gap-1 p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="h-2.5 w-2.5 rounded-full" style={{ background: s.fill }} />
                  <p className="text-xl font-bold text-foreground">{s.value}</p>
                  <p className="text-xs text-muted-foreground text-center">{s.name}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Country Filter Snapshot */}
        {countryFilter && stats && (
          <div className="bg-white rounded-xl border-2 border-[#015845]/30 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <Globe className="h-4 w-4 text-[#015845]" />
              <h2 className="font-semibold text-sm text-foreground">Country Snapshot: {countryFilter}</h2>
              <span className="text-xs text-muted-foreground">({stats.totalAbstracts} submission{stats.totalAbstracts !== 1 ? "s" : ""})</span>
            </div>
            {stats.totalAbstracts === 0 ? (
              <p className="text-sm text-muted-foreground">No submissions found from this country.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {(Object.entries(stats.byStatus) as [string, number][])
                  .filter(([, count]) => count > 0)
                  .map(([status, count]) => (
                    <div key={status} className="flex flex-col items-center p-3 bg-slate-50 rounded-lg border">
                      <span className="text-2xl font-bold text-foreground">{count}</span>
                      <StatusBadge status={status as Parameters<typeof StatusBadge>[0]["status"]} />
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-border shadow-sm p-5">
            <h2 className="font-semibold text-sm text-foreground mb-4">Submissions by Track</h2>
            {trackData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={trackData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                  <YAxis axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip cursor={{ fill: "rgba(1,88,69,0.06)" }} contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb" }} />
                  <Bar dataKey="count" fill="#015845" radius={[4, 4, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">No data available</div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-border shadow-sm p-5">
            <h2 className="font-semibold text-sm text-foreground mb-4">Status Breakdown</h2>
            {statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={statusData} layout="vertical" margin={{ top: 5, right: 20, left: 50, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                  <XAxis type="number" axisLine={false} tickLine={false} allowDecimals={false} />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={90} tick={{ fontSize: 11 }} />
                  <Tooltip cursor={{ fill: "rgba(3,129,237,0.06)" }} contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb" }} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">No data available</div>
            )}
          </div>
        </div>

        {/* Country Chart */}
        {countryData.length > 0 && (
          <div className="bg-white rounded-xl border border-border shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <Globe className="h-4 w-4 text-[#015845]" />
              <h2 className="font-semibold text-sm text-foreground">Submissions by Country</h2>
              <span className="text-xs text-muted-foreground">(top {countryData.length})</span>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={countryData} margin={{ top: 10, right: 20, left: 0, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} angle={-35} textAnchor="end" interval={0} />
                <YAxis axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip cursor={{ fill: "rgba(1,88,69,0.06)" }} contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb" }} />
                <Bar dataKey="count" fill="#0381ED" radius={[4, 4, 0, 0]} barSize={22} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Bottom: Activity + Reviewer Workload */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Activity */}
          <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 px-6 py-4 border-b border-border" style={{ background: "#f8fffe" }}>
              <Activity className="h-4 w-4 text-[#015845]" />
              <h2 className="font-semibold text-sm text-foreground">Recent Activity</h2>
            </div>
            <div className="divide-y divide-border">
              {recentActivity && recentActivity.length > 0 ? (
                recentActivity.slice(0, 6).map((log) => (
                  <div key={log.id} className="flex items-start gap-3 px-6 py-3 hover:bg-slate-50/50 transition-colors">
                    <div className="h-7 w-7 rounded-full bg-[#015845]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <UserCog className="h-3.5 w-3.5 text-[#015845]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm leading-snug">
                        <span className="font-medium">{log.userName}</span>{" "}
                        <span className="text-muted-foreground">{log.action.replace(/_/g, " ")}</span>
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {log.entityType} #{log.entityId} · {new Date(log.createdAt).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-muted-foreground text-sm">
                  No recent activity.
                </div>
              )}
            </div>
          </div>

          {/* Reviewer Workload */}
          <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 px-6 py-4 border-b border-border" style={{ background: "#f0f7ff" }}>
              <Users className="h-4 w-4 text-[#0381ED]" />
              <h2 className="font-semibold text-sm text-foreground">Reviewer Workload</h2>
            </div>
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/50">
                  <TableHead className="pl-6 text-xs">Reviewer</TableHead>
                  <TableHead className="text-right text-xs">Pending</TableHead>
                  <TableHead className="text-right text-xs">Done</TableHead>
                  <TableHead className="text-right pr-6 text-xs">Progress</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {workload && workload.length > 0 ? workload.slice(0, 6).map((rw) => {
                  const rwTotal = rw.pendingCount + rw.completedCount;
                  const rwPct = rwTotal > 0 ? Math.round((rw.completedCount / rwTotal) * 100) : 0;
                  const isClosing = closeReviews.isPending && closeReviews.variables === rw.userId;
                  return (
                    <TableRow key={rw.userId}>
                      <TableCell className="pl-6 py-3">
                        <p className="font-medium text-sm">{rw.name}</p>
                        {rw.expertise && <p className="text-xs text-muted-foreground truncate max-w-[140px]">{rw.expertise}</p>}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={`font-semibold text-sm ${rw.pendingCount > 0 ? "text-amber-600" : "text-muted-foreground"}`}>{rw.pendingCount}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="text-sm text-emerald-600 font-medium">{rw.completedCount}</span>
                      </TableCell>
                      <TableCell className="pr-6">
                        <div className="flex items-center justify-end gap-2">
                          <div className="h-1.5 w-16 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${rwPct}%`, background: rwPct === 100 ? "#10b981" : "#0381ED" }} />
                          </div>
                          <span className="text-xs text-muted-foreground w-8 text-right">{rwPct}%</span>
                          {user?.role === "admin" && rw.pendingCount > 0 && (
                            <button
                              disabled={isClosing}
                              title={`Administratively close ${rw.pendingCount} pending review(s) for ${rw.name}`}
                              className="ml-1 text-xs px-2 py-0.5 rounded border border-amber-300 text-amber-700 bg-amber-50 hover:bg-amber-100 disabled:opacity-50 whitespace-nowrap"
                              onClick={() => {
                                if (window.confirm(`Close ${rw.pendingCount} pending review(s) for ${rw.name}?\n\nThis will mark them as administratively completed. Use this for finalised abstracts where the reviewer's input is no longer needed.`)) {
                                  closeReviews.mutate(rw.userId);
                                }
                              }}
                            >
                              {isClosing ? "Closing…" : "Close"}
                            </button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                }) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground text-sm">
                      No reviewer data available.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>

      </div>
    </div>
  );
}
