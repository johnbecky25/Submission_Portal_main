import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/context/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, Search, ChevronRight, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

type Assignment = {
  assignmentId: number;
  abstractId: number;
  abstractTitle: string;
  abstractTrack: string | null;
  abstractStatus: string | null;
  reviewId: number | null;
  score: number | null;
  recommendation: string | null;
  reviewStatus: "pending" | "completed" | null;
  reviewCreatedAt: string | null;
};

function TrackBadge({ track }: { track?: string | null }) {
  if (!track) return null;
  let label = track;
  let color = "bg-purple-100 text-purple-800 border-purple-200";
  if (track.includes("Youth")) { label = "Youth Innovations"; color = "bg-teal-100 text-teal-800 border-teal-200"; }
  else if (track.includes("Country")) { label = "Country Snapshots"; color = "bg-indigo-100 text-indigo-800 border-indigo-200"; }
  else if (track.includes("System")) { label = "System Reforms"; color = "bg-violet-100 text-violet-800 border-violet-200"; }
  return (
    <Badge variant="outline" className={`${color} text-xs font-medium`}>{label}</Badge>
  );
}

function QueueStatusBadge({ status }: { status: "pending" | "completed" | null }) {
  if (!status || status === "pending") {
    return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-xs">Pending</Badge>;
  }
  return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">Completed</Badge>;
}

export default function Reviews() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [startingId, setStartingId] = useState<number | null>(null);

  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 500);
    return () => clearTimeout(timer);
  }, [search]);

  const isReviewerRole = user?.role === "reviewer" || user?.role === "reviewer_admin" || user?.role === "admin";

  const { data: assignments, isLoading } = useQuery<Assignment[]>({
    queryKey: ["reviewer-assignments", user?.id],
    queryFn: async () => {
      const url = user?.role === "admin"
        ? "/api/reviewer/assignments"
        : `/api/reviewer/assignments?reviewerId=${user!.id}`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load review queue");
      return res.json();
    },
    enabled: isReviewerRole && !!user?.id,
  });

  const startReviewMutation = useMutation({
    mutationFn: async (abstractId: number) => {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ abstractId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error ?? "Failed to start review");
      }
      return res.json() as Promise<{ id: number }>;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["reviewer-assignments"] });
      setLocation(`/reviews/${data.id}`);
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
    onSettled: () => setStartingId(null),
  });

  const filtered = assignments?.filter((a) => {
    if (statusFilter !== "all") {
      const resolved = a.reviewStatus ?? "pending";
      if (resolved !== statusFilter) return false;
    }
    if (debouncedSearch && !a.abstractTitle.toLowerCase().includes(debouncedSearch.toLowerCase())) return false;
    return true;
  });

  const handleAction = (a: Assignment) => {
    if (a.reviewId) {
      setLocation(`/reviews/${a.reviewId}`);
    } else {
      setStartingId(a.abstractId);
      startReviewMutation.mutate(a.abstractId);
    }
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl sm:text-3xl font-serif font-bold text-foreground">Review Queue</h1>
        <p className="text-muted-foreground mt-0.5 text-sm">Manage your assigned reviews</p>
      </div>

      <Card className="border-border">
        <CardContent className="p-3 sm:p-4 border-b flex flex-col sm:flex-row gap-3 items-stretch sm:items-center bg-muted/20">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by title..."
              className="pl-9 bg-background w-full"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[180px] bg-background">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
          {assignments && (
            <span className="text-sm text-muted-foreground shrink-0">
              {assignments.length} assigned
            </span>
          )}
        </CardContent>

        {/* Mobile card list */}
        <div className="md:hidden divide-y divide-border">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="p-4 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/3" />
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
            ))
          ) : filtered?.length ? (
            filtered.map((a) => (
              <div
                key={a.assignmentId}
                className="p-4 hover:bg-muted/20 transition-colors flex items-start gap-3 cursor-pointer"
                onClick={() => handleAction(a)}
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-foreground line-clamp-2">{a.abstractTitle}</p>
                  <div className="flex flex-wrap items-center gap-2 mt-1.5">
                    <QueueStatusBadge status={a.reviewStatus} />
                    {a.abstractStatus && <StatusBadge status={a.abstractStatus} />}
                    <TrackBadge track={a.abstractTrack} />
                    {a.score !== null && (
                      <span className="text-xs font-medium text-[#015845]">Score: {a.score}</span>
                    )}
                    {a.recommendation && (
                      <span className="text-xs text-muted-foreground capitalize">{a.recommendation}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-2 text-xs"
                    disabled={startingId === a.abstractId}
                    onClick={(e) => { e.stopPropagation(); handleAction(a); }}
                  >
                    {startingId === a.abstractId ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : a.reviewStatus === "completed" ? "View" : a.reviewId ? "Continue" : "Start"}
                  </Button>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-muted-foreground text-sm">No assigned reviews found.</div>
          )}
        </div>

        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Submission Title</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Submission Status</TableHead>
                <TableHead>Review Status</TableHead>
                <TableHead className="text-right">Score</TableHead>
                <TableHead className="text-right">Recommendation</TableHead>
                <TableHead className="w-[110px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-28 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-24 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-5 w-8 ml-auto" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-5 w-16 ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-20" /></TableCell>
                  </TableRow>
                ))
              ) : filtered?.length ? (
                filtered.map((a) => (
                  <TableRow
                    key={a.assignmentId}
                    className="hover:bg-muted/20 cursor-pointer"
                    onClick={() => handleAction(a)}
                  >
                    <TableCell className="font-medium max-w-xs truncate">{a.abstractTitle}</TableCell>
                    <TableCell><TrackBadge track={a.abstractTrack} /></TableCell>
                    <TableCell>
                      {a.abstractStatus ? <StatusBadge status={a.abstractStatus} /> : <span className="text-muted-foreground text-sm">—</span>}
                    </TableCell>
                    <TableCell><QueueStatusBadge status={a.reviewStatus} /></TableCell>
                    <TableCell className="text-right font-medium">{a.score !== null ? a.score : "-"}</TableCell>
                    <TableCell className="text-right capitalize">{a.recommendation || "-"}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 px-3"
                        disabled={startingId === a.abstractId}
                        onClick={(e) => { e.stopPropagation(); handleAction(a); }}
                      >
                        {startingId === a.abstractId ? (
                          <><Loader2 className="h-3 w-3 animate-spin mr-1" /> Starting…</>
                        ) : a.reviewStatus === "completed" ? "View" : a.reviewId ? "Continue" : "Start Review"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                    No assigned reviews found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
