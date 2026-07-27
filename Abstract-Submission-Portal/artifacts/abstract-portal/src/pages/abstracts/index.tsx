import React, { useState } from "react";
import { Link } from "wouter";
import { useAuth } from "@/context/useAuth";
import {
  useListAbstracts,
  getListAbstractsQueryKey,
  useBulkDownloadAbstracts,
  customFetch,
} from "@workspace/api-client-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { StatusBadge } from "@/components/status-badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Search, Download, Plus, FilterX, ChevronsUpDown, Check, FileArchive, ChevronRight, FileSpreadsheet, Trash2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { COUNTRIES } from "@/lib/countries";
import { cn } from "@/lib/utils";

const ABSTRACT_STATUSES = ["draft", "submitted", "under_review", "accepted", "rejected", "on_hold"] as const;

function toRefCode(id: number, createdAt: string | Date): string {
  const year = new Date(createdAt).getFullYear();
  return `AWS-${year}-${String(id).padStart(4, "0")}`;
}

export default function Abstracts() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [trackFilter, setTrackFilter] = useState<string>("all");
  const [countryFilter, setCountryFilter] = useState<string>("");
  const [countryOpen, setCountryOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [deleteDialog, setDeleteDialog] = useState<{ id: number; title: string } | null>(null);

  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 500);
    return () => clearTimeout(timer);
  }, [search]);

  const isReviewer = user?.role === "reviewer" || user?.role === "reviewer_admin";

  const queryParams = {
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
    ...(statusFilter !== "all" ? { status: statusFilter as any } : {}),
    ...(trackFilter !== "all" ? { track: trackFilter } : {}),
    ...(countryFilter ? { country: countryFilter } : {}),
    ...(user?.role === "author" ? { authorId: user.id } : {}),
    ...(isReviewer ? { reviewerId: user!.id } : {}),
  };

  const { data: abstracts, isLoading } = useListAbstracts(queryParams, {
    query: {
      queryKey: getListAbstractsQueryKey(queryParams),
      placeholderData: (prev: any) => prev,
    },
  });

  const bulkDownload = useBulkDownloadAbstracts();
  const [excelLoading, setExcelLoading] = React.useState(false);

  const deleteAbstractMutation = useMutation({
    mutationFn: (id: number) =>
      customFetch(`/api/abstracts/${id}`, { method: "DELETE", credentials: "include" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getListAbstractsQueryKey() });
      toast({ title: "Submission deleted" });
      setDeleteDialog(null);
    },
    onError: (err: any) => {
      toast({
        title: "Failed to delete submission",
        description: err?.data?.error || err?.message,
        variant: "destructive",
      });
      setDeleteDialog(null);
    },
  });

  const handleSelectAll = (checked: boolean) => {
    if (checked && abstracts) {
      setSelectedIds(new Set(abstracts.map((a) => a.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelect = (id: number, checked: boolean) => {
    const newSet = new Set(selectedIds);
    if (checked) newSet.add(id);
    else newSet.delete(id);
    setSelectedIds(newSet);
  };

  const handleBulkDownload = () => {
    if (selectedIds.size === 0) return;
    bulkDownload.mutate(
      { data: { abstractIds: Array.from(selectedIds) } },
      {
        onSuccess: (data: any) => {
          const blob = new Blob([data], { type: "text/csv" });
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.setAttribute("hidden", "");
          a.setAttribute("href", url);
          a.setAttribute("download", `submissions_export_${new Date().toISOString().split("T")[0]}.csv`);
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          toast({ title: "CSV export downloaded" });
        },
        onError: () => {
          toast({ title: "Export failed", variant: "destructive" });
        },
      }
    );
  };

  const handleExcelDownload = async () => {
    if (selectedIds.size === 0) return;
    setExcelLoading(true);
    try {
      const res = await fetch("/api/abstracts/bulk-download-excel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ abstractIds: Array.from(selectedIds) }),
      });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `submissions_export_${new Date().toISOString().split("T")[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast({ title: "Excel export downloaded" });
    } catch {
      toast({ title: "Excel export failed", variant: "destructive" });
    } finally {
      setExcelLoading(false);
    }
  };

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setTrackFilter("all");
    setCountryFilter("");
  };

  const isAdmin = user?.role === "admin";
  const isAuthor = user?.role === "author";

  const handleDownloadAllFiles = () => {
    const a = document.createElement("a");
    a.href = "/api/abstracts/files/bulk-download";
    a.download = "submissions_files.zip";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const hasActiveFilter = search || statusFilter !== "all" || trackFilter !== "all" || countryFilter;

  const trackShort = (track: string) => {
    if (track.includes("System Reforms")) return "System Reforms";
    if (track.includes("Country Transformation")) return "Country Snapshots";
    if (track.includes("Youth")) return "Youth Innovations";
    return track;
  };

  const adminReviewerColCount = 11;
  const authorColCount = 7;

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-5">
      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteDialog} onOpenChange={(open) => { if (!open) setDeleteDialog(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-serif">Delete Submission</DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete{" "}
              <strong className="text-foreground">"{deleteDialog?.title}"</strong>? This will also
              remove all reviews and reviewer assignments. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 pt-2">
            <Button variant="outline" onClick={() => setDeleteDialog(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteAbstractMutation.isPending}
              onClick={() => deleteDialog && deleteAbstractMutation.mutate(deleteDialog.id)}
            >
              {deleteAbstractMutation.isPending ? "Deleting..." : "Delete Submission"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-foreground flex items-baseline gap-2 flex-wrap">
            {isAuthor ? "My Submissions" : "All Submissions"}
            {abstracts !== undefined && (
              <span className="text-sm font-sans font-semibold px-2.5 py-0.5 rounded-full" style={{ background: "#01584515", color: "#015845" }}>
                {abstracts.length} {abstracts.length === 1 ? "submission" : "submissions"}
              </span>
            )}
          </h1>
          <p className="text-muted-foreground mt-0.5 text-sm">
            {isAuthor ? "Manage your submissions" : "Browse and manage conference submissions"}
          </p>
        </div>

        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          {(isAdmin || isReviewer) && (
            <Button variant="outline" size="sm" onClick={handleDownloadAllFiles} className="flex-1 sm:flex-none">
              <FileArchive className="h-4 w-4 mr-2" />
              <span className="hidden xs:inline">Download All Files</span>
              <span className="xs:hidden">Files</span>
            </Button>
          )}
          {(isAdmin || isReviewer) && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleBulkDownload}
              disabled={selectedIds.size === 0 || bulkDownload.isPending}
              className="flex-1 sm:flex-none"
            >
              <Download className="h-4 w-4 mr-2" />
              CSV ({selectedIds.size})
            </Button>
          )}
          {(isAdmin || isReviewer) && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleExcelDownload}
              disabled={selectedIds.size === 0 || excelLoading}
              className="flex-1 sm:flex-none border-green-600 text-green-700 hover:bg-green-50"
            >
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Excel ({selectedIds.size})
            </Button>
          )}
          {user?.role === "admin" && (
            <Link href="/abstracts/new" className="flex-1 sm:flex-none">
              <Button className="w-full" size="sm" style={{ background: "#015845" }}>
                <Plus className="h-4 w-4 mr-2" />
                Submit on Behalf
              </Button>
            </Link>
          )}
        </div>
      </div>

      <Card className="border-border">
        {/* Filters */}
        <CardContent className="p-3 sm:p-4 border-b flex flex-col sm:flex-row flex-wrap gap-3 items-stretch sm:items-center bg-muted/20">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by title or author..."
              className="pl-9 bg-background w-full"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[160px] bg-background">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {ABSTRACT_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={trackFilter} onValueChange={setTrackFilter}>
              <SelectTrigger className="w-full sm:w-[180px] bg-background">
                <SelectValue placeholder="Submission Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="System Reforms and Investment Fiches">System Reforms</SelectItem>
                <SelectItem value="Country Transformation Snapshots">Country Snapshots</SelectItem>
                <SelectItem value="Youth Led Innovations">Youth Innovations</SelectItem>
              </SelectContent>
            </Select>

            {!isAuthor && (
              <Popover open={countryOpen} onOpenChange={setCountryOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className={cn("w-full sm:w-[160px] justify-between font-normal bg-background", !countryFilter && "text-muted-foreground")}
                  >
                    {countryFilter || "All Countries"}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[220px] p-0" align="start">
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
            )}

            {hasActiveFilter && (
              <Button variant="ghost" size="icon" onClick={clearFilters} title="Clear filters">
                <FilterX className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardContent>

        {/* Mobile card list */}
        <div className="md:hidden divide-y divide-border">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="p-4 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
            ))
          ) : abstracts?.length ? (
            abstracts.map((abstract) => (
              <div key={abstract.id} className="p-4 hover:bg-muted/20 transition-colors flex items-start gap-3">
                {(isAdmin || isReviewer) && (
                  <div className="pt-1" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedIds.has(abstract.id)}
                      onCheckedChange={(checked) => handleSelect(abstract.id, checked as boolean)}
                    />
                  </div>
                )}
                <Link href={`/abstracts/${abstract.id}`} className="flex-1 min-w-0 flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-xs text-muted-foreground mb-0.5">{toRefCode(abstract.id, abstract.createdAt)}</p>
                    <p className="font-medium text-sm text-foreground line-clamp-2 leading-snug">{abstract.title}</p>
                    <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                      <StatusBadge status={abstract.status} />
                      <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                        {trackShort(abstract.track)}
                      </span>
                      {!isAuthor && abstract.authorName && (
                        <span className="text-xs text-muted-foreground">{abstract.authorName}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground">
                        {new Date(abstract.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                      </span>
                      {abstract.averageScore && (
                        <span className="text-xs font-medium text-[#015845]">★ {abstract.averageScore.toFixed(1)}</span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-1" />
                </Link>
                {(isAdmin || isReviewer) && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 flex-shrink-0"
                    onClick={() => setDeleteDialog({ id: abstract.id, title: abstract.title })}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-muted-foreground text-sm">
              No submissions found matching your filters.
            </div>
          )}
        </div>

        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                {(isAdmin || isReviewer) && (
                  <TableHead className="w-[40px] text-center">
                    <Checkbox
                      checked={abstracts?.length ? selectedIds.size === abstracts.length : false}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                )}
                <TableHead className="text-muted-foreground font-mono text-xs">Ref #</TableHead>
                <TableHead>Title</TableHead>
                {!isAuthor && <TableHead>Author</TableHead>}
                <TableHead>Submission Type</TableHead>
                {!isAuthor && <TableHead>Country</TableHead>}
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Reviewers</TableHead>
                <TableHead className="text-right">Score</TableHead>
                {(isAdmin || isReviewer) && <TableHead className="w-[60px]" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {(isAdmin || isReviewer) && <TableCell><Skeleton className="h-4 w-4" /></TableCell>}
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                    {!isAuthor && <TableCell><Skeleton className="h-5 w-24" /></TableCell>}
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    {!isAuthor && <TableCell><Skeleton className="h-5 w-20" /></TableCell>}
                    <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-5 w-8 ml-auto" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-5 w-8 ml-auto" /></TableCell>
                    {(isAdmin || isReviewer) && <TableCell><Skeleton className="h-8 w-8 ml-auto" /></TableCell>}
                  </TableRow>
                ))
              ) : abstracts?.length ? (
                abstracts.map((abstract) => (
                  <TableRow key={abstract.id} className="hover:bg-muted/20">
                    {(isAdmin || isReviewer) && (
                      <TableCell className="text-center">
                        <Checkbox
                          checked={selectedIds.has(abstract.id)}
                          onCheckedChange={(checked) => handleSelect(abstract.id, checked as boolean)}
                        />
                      </TableCell>
                    )}
                    <TableCell className="font-mono text-xs text-muted-foreground whitespace-nowrap">
                      {toRefCode(abstract.id, abstract.createdAt)}
                    </TableCell>
                    <TableCell className="font-medium max-w-md truncate">
                      <Link href={`/abstracts/${abstract.id}`} className="hover:underline text-primary">
                        {abstract.title}
                      </Link>
                    </TableCell>
                    {!isAuthor && <TableCell className="text-muted-foreground">{abstract.authorName}</TableCell>}
                    <TableCell>{abstract.track}</TableCell>
                    {!isAuthor && (
                      <TableCell className="text-muted-foreground">
                        {abstract.country || <span className="text-muted-foreground/40">—</span>}
                      </TableCell>
                    )}
                    <TableCell><StatusBadge status={abstract.status} /></TableCell>
                    <TableCell className="text-muted-foreground whitespace-nowrap">
                      {new Date(abstract.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">{abstract.reviewers?.length || 0}</TableCell>
                    <TableCell className="text-right font-medium">
                      {abstract.averageScore ? abstract.averageScore.toFixed(1) : "-"}
                    </TableCell>
                    {(isAdmin || isReviewer) && (
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => setDeleteDialog({ id: abstract.id, title: abstract.title })}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={isAuthor ? authorColCount : adminReviewerColCount}
                    className="h-32 text-center text-muted-foreground"
                  >
                    No submissions found matching your filters.
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
