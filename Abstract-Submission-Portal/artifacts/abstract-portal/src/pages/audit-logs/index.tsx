import React, { useState } from "react";
import { useAuth } from "@/context/useAuth";
import { useListAuditLogs, getListAuditLogsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

export default function AuditLogs() {
  const { user } = useAuth();
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [entityFilter, setEntityFilter] = useState<string>("");

  const queryParams = { ...(actionFilter !== "all" ? { action: actionFilter } : {}) };
  const { data: logs, isLoading } = useListAuditLogs(queryParams, {
    query: { enabled: user?.role === "admin", queryKey: getListAuditLogsQueryKey(queryParams) },
  });

  const filteredLogs = logs?.filter((log) => {
    if (entityFilter && !log.entityType.toLowerCase().includes(entityFilter.toLowerCase()) && !log.entityId.toString().includes(entityFilter)) return false;
    return true;
  });

  const uniqueActions = logs ? Array.from(new Set(logs.map((l) => l.action))) : [];

  const actionColor = (action: string) => {
    if (action.includes("create") || action.includes("submit")) return "bg-emerald-100 text-emerald-800";
    if (action.includes("delete")) return "bg-red-100 text-red-800";
    if (action.includes("update") || action.includes("status")) return "bg-blue-100 text-blue-800";
    return "bg-gray-100 text-gray-700";
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl sm:text-3xl font-serif font-bold text-foreground">Audit Logs</h1>
        <p className="text-muted-foreground mt-0.5 text-sm">System activity and modifications</p>
      </div>

      <Card className="border-border">
        <CardContent className="p-3 sm:p-4 border-b flex flex-col sm:flex-row gap-3 items-stretch sm:items-center bg-muted/20">
          <div className="flex-1 min-w-0">
            <Input
              placeholder="Filter by entity type or ID..."
              value={entityFilter}
              onChange={(e) => setEntityFilter(e.target.value)}
              className="bg-background w-full"
            />
          </div>
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="w-full sm:w-[180px] bg-background"><SelectValue placeholder="Action" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              {uniqueActions.map((action) => (
                <SelectItem key={action} value={action}>{action}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>

        {/* Mobile card list */}
        <div className="md:hidden divide-y divide-border">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="p-4 space-y-2">
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-3 w-2/3" />
                <Skeleton className="h-5 w-24 rounded-full" />
              </div>
            ))
          ) : filteredLogs?.length ? (
            filteredLogs.map((log) => (
              <div key={log.id} className="p-4 space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="secondary" className={`font-mono text-xs ${actionColor(log.action)}`}>{log.action}</Badge>
                  <span className="text-xs text-muted-foreground">{log.entityType} #{log.entityId}</span>
                </div>
                <p className="text-sm font-medium">{log.userName || `User ${log.userId}`}</p>
                {log.details && <p className="text-xs text-muted-foreground line-clamp-2">{log.details}</p>}
                <p className="text-xs text-muted-foreground font-mono">
                  {new Date(log.createdAt).toLocaleString()}
                </p>
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-muted-foreground text-sm">No audit logs found.</div>
          )}
        </div>

        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Entity Type</TableHead>
                <TableHead>Entity ID</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-24 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-12" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                  </TableRow>
                ))
              ) : filteredLogs?.length ? (
                filteredLogs.map((log) => (
                  <TableRow key={log.id} className="font-mono text-sm">
                    <TableCell className="text-muted-foreground whitespace-nowrap">{new Date(log.createdAt).toLocaleString()}</TableCell>
                    <TableCell className="font-sans font-medium text-foreground">{log.userName || `User ${log.userId}`}</TableCell>
                    <TableCell><Badge variant="secondary" className="font-mono text-xs">{log.action}</Badge></TableCell>
                    <TableCell>{log.entityType}</TableCell>
                    <TableCell>{log.entityId}</TableCell>
                    <TableCell className="text-muted-foreground truncate max-w-md">{log.details || "-"}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">No audit logs found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
