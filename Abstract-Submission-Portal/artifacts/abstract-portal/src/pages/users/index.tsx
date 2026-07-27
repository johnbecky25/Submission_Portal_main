import React, { useState } from "react";
import { useAuth } from "@/context/useAuth";
import { useListUsers, getListUsersQueryKey, useUpdateUser } from "@workspace/api-client-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Search, UserPlus, Pencil, Trash2, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type NewUserForm = { name: string; email: string; role: "author" | "reviewer" | "admin" | "reviewer_admin"; expertise: string };
type EditUserForm = { id: number; name: string; email: string; role: "author" | "reviewer" | "admin" | "reviewer_admin"; expertise: string };

export default function Users() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialog, setEditDialog] = useState<EditUserForm | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{ id: number; name: string } | null>(null);
  const [newUser, setNewUser] = useState<NewUserForm>({ name: "", email: "", role: "author", expertise: "" });
  const [addError, setAddError] = useState("");
  const [editError, setEditError] = useState("");
  const [resendDialogOpen, setResendDialogOpen] = useState(false);

  const queryParams = roleFilter !== "all" ? { role: roleFilter as any } : {};
  const { data: users, isLoading } = useListUsers(queryParams, {
    query: { enabled: user?.role === "admin" || user?.role === "reviewer_admin", queryKey: getListUsersQueryKey(queryParams) },
  });

  const updateUserMutation = useUpdateUser();

  const createUserMutation = useMutation({
    mutationFn: (data: NewUserForm) => customFetch("/api/users", { method: "POST", body: JSON.stringify(data), credentials: "include" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
      toast({ title: "User created — a welcome email with login credentials has been sent." });
      setAddDialogOpen(false);
      setNewUser({ name: "", email: "", role: "author", expertise: "" });
      setAddError("");
    },
    onError: (err: any) => setAddError(err?.data?.error || err?.message || "Failed to create user"),
  });

  const deleteUserMutation = useMutation({
    mutationFn: (id: number) => customFetch(`/api/users/${id}`, { method: "DELETE", credentials: "include" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
      toast({ title: "User deleted" });
      setDeleteDialog(null);
    },
    onError: (err: any) => {
      toast({ title: "Failed to delete user", description: err?.data?.error || err?.message, variant: "destructive" });
      setDeleteDialog(null);
    },
  });

  const resendPortalLinkMutation = useMutation({
    mutationFn: () => customFetch("/api/users/resend-portal-link", { method: "POST", credentials: "include" }),
    onSuccess: (data: any) => {
      toast({ title: `Portal link sent to ${data.sent} author${data.sent !== 1 ? "s" : ""}${data.failed > 0 ? ` (${data.failed} failed)` : ""}` });
      setResendDialogOpen(false);
    },
    onError: (err: any) => {
      toast({ title: "Failed to send emails", description: err?.data?.error || err?.message, variant: "destructive" });
      setResendDialogOpen(false);
    },
  });

  const handleAddUser = (e: React.FormEvent) => { e.preventDefault(); setAddError(""); createUserMutation.mutate(newUser); };

  const handleEditSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editDialog) return;
    setEditError("");
    updateUserMutation.mutate(
      { id: editDialog.id, data: { name: editDialog.name, role: editDialog.role, expertise: editDialog.expertise || null } },
      {
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() }); setEditDialog(null); toast({ title: "Profile updated" }); },
        onError: (err: any) => setEditError(err?.data?.error || err?.message || "Failed to update user"),
      }
    );
  };

  const filteredUsers = users?.filter((u) => {
    if (search && !u.name.toLowerCase().includes(search.toLowerCase()) && !u.email.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const roleBadgeClass = (role: string) =>
    role === "admin" || role === "reviewer_admin" ? "bg-primary/10 text-primary border-primary/20" :
    role === "reviewer" ? "bg-amber-100 text-amber-800 border-amber-200" :
    "bg-blue-100 text-blue-800 border-blue-200";

  const roleLabel = (role: string) =>
    role === "reviewer_admin" ? "Reviewer / Admin" :
    role === "admin" ? "Admin" :
    role === "reviewer" ? "Reviewer" : "Author";

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-5">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-foreground">User Management</h1>
          <p className="text-muted-foreground mt-0.5 text-sm">Manage portal users, roles, and profiles</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          {/* Resend Portal Link Dialog */}
          <Dialog open={resendDialogOpen} onOpenChange={setResendDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2 w-full sm:w-auto border-[#0381ED] text-[#0381ED] hover:bg-[#0381ED]/10">
                <Send className="h-4 w-4" /> Resend Portal Link to Authors
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="font-serif">Resend Portal Sign-In Link</DialogTitle>
                <DialogDescription>
                  This will send a corrected sign-in link email to <strong>all authors</strong> in the system. Use this if authors received an incorrect portal link and need to be notified of the correct one.
                </DialogDescription>
              </DialogHeader>
              <div className="py-2 text-sm text-muted-foreground">
                Each author will receive an email with the updated portal link and a note explaining that a previous email contained an incorrect link.
              </div>
              <DialogFooter className="gap-2 pt-2">
                <Button variant="outline" onClick={() => setResendDialogOpen(false)}>Cancel</Button>
                <Button
                  disabled={resendPortalLinkMutation.isPending}
                  onClick={() => resendPortalLinkMutation.mutate()}
                  style={{ background: "#0381ED" }} className="text-white hover:opacity-90"
                >
                  {resendPortalLinkMutation.isPending ? "Sending..." : "Send to All Authors"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={addDialogOpen} onOpenChange={(open) => { setAddDialogOpen(open); setAddError(""); }}>
            <DialogTrigger asChild>
              <Button style={{ background: "#015845" }} className="gap-2 text-white hover:opacity-90 w-full sm:w-auto">
                <UserPlus className="h-4 w-4" /> Add User
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="font-serif">Add New User</DialogTitle>
                <DialogDescription>Create a new account. A secure temporary password will be emailed to the user.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAddUser} className="space-y-4 py-2">
                <div className="space-y-1.5">
                  <Label>Full Name</Label>
                  <Input placeholder="Dr. Jane Doe" value={newUser.name} onChange={(e) => setNewUser((p) => ({ ...p, name: e.target.value }))} required />
                </div>
                <div className="space-y-1.5">
                  <Label>Email</Label>
                  <Input type="email" placeholder="jane.doe@organisation.org" value={newUser.email} onChange={(e) => setNewUser((p) => ({ ...p, email: e.target.value }))} required />
                </div>
                <div className="space-y-1.5">
                  <Label>Role</Label>
                  <Select value={newUser.role} onValueChange={(v: "author" | "reviewer" | "admin" | "reviewer_admin") => setNewUser((p) => ({ ...p, role: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="author">Author</SelectItem>
                      <SelectItem value="reviewer">Reviewer</SelectItem>
                      <SelectItem value="admin">Administrator</SelectItem>
                      <SelectItem value="reviewer_admin">Reviewer + Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {(newUser.role === "reviewer" || newUser.role === "author" || newUser.role === "reviewer_admin") && (
                  <div className="space-y-1.5">
                    <Label>Areas of Expertise <span className="text-muted-foreground font-normal text-xs">(Optional)</span></Label>
                    <Input placeholder="e.g. Water Systems, Policy Reform" value={newUser.expertise} onChange={(e) => setNewUser((p) => ({ ...p, expertise: e.target.value }))} />
                  </div>
                )}
                {addError && <p className="text-sm text-destructive font-medium">{addError}</p>}
                <DialogFooter className="pt-2">
                  <Button type="button" variant="outline" onClick={() => setAddDialogOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={createUserMutation.isPending} style={{ background: "#015845" }} className="text-white hover:opacity-90">
                    {createUserMutation.isPending ? "Creating..." : "Create User"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editDialog} onOpenChange={(open) => { if (!open) { setEditDialog(null); setEditError(""); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif">Edit User Profile</DialogTitle>
            <DialogDescription>Update the profile details for this user.</DialogDescription>
          </DialogHeader>
          {editDialog && (
            <form onSubmit={handleEditSave} className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label>Full Name</Label>
                <Input value={editDialog.name} onChange={(e) => setEditDialog((p) => p ? { ...p, name: e.target.value } : p)} required />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input type="email" value={editDialog.email} onChange={(e) => setEditDialog((p) => p ? { ...p, email: e.target.value } : p)} required />
              </div>
              <div className="space-y-1.5">
                <Label>Role</Label>
                <Select value={editDialog.role} onValueChange={(v: "author" | "reviewer" | "admin" | "reviewer_admin") => setEditDialog((p) => p ? { ...p, role: v } : p)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="author">Author</SelectItem>
                    <SelectItem value="reviewer">Reviewer</SelectItem>
                    <SelectItem value="admin">Administrator</SelectItem>
                    <SelectItem value="reviewer_admin">Reviewer + Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Areas of Expertise</Label>
                <Input placeholder="e.g. Water Systems, Policy Reform" value={editDialog.expertise} onChange={(e) => setEditDialog((p) => p ? { ...p, expertise: e.target.value } : p)} />
              </div>
              {editError && <p className="text-sm text-destructive font-medium">{editError}</p>}
              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={() => { setEditDialog(null); setEditError(""); }}>Cancel</Button>
                <Button type="submit" disabled={updateUserMutation.isPending} style={{ background: "#015845" }} className="text-white hover:opacity-90">
                  {updateUserMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={!!deleteDialog} onOpenChange={(open) => { if (!open) setDeleteDialog(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-serif">Delete User</DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete <strong>{deleteDialog?.name}</strong>? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 pt-2">
            <Button variant="outline" onClick={() => setDeleteDialog(null)}>Cancel</Button>
            <Button variant="destructive" disabled={deleteUserMutation.isPending} onClick={() => deleteDialog && deleteUserMutation.mutate(deleteDialog.id)}>
              {deleteUserMutation.isPending ? "Deleting..." : "Delete User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card className="border-border">
        <CardContent className="p-3 sm:p-4 border-b flex flex-col sm:flex-row gap-3 items-stretch sm:items-center bg-muted/20">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search by name or email..." className="pl-9 bg-background w-full" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-full sm:w-[180px] bg-background"><SelectValue placeholder="Role" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="author">Author</SelectItem>
              <SelectItem value="reviewer">Reviewer</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="reviewer_admin">Reviewer + Admin</SelectItem>
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
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
            ))
          ) : filteredUsers?.length ? (
            filteredUsers.map((u) => {
              const isSelf = u.id === user?.id;
              return (
                <div key={u.id} className="p-4 flex items-start gap-3">
                  <div
                    className="h-9 w-9 rounded-full flex items-center justify-center font-bold text-xs uppercase flex-shrink-0 text-white"
                    style={{ background: (u.role === "admin" || u.role === "reviewer_admin") ? "#015845" : u.role === "reviewer" ? "#f59e0b" : "#0381ED" }}
                  >
                    {u.name.slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm">{u.name}{isSelf && <span className="ml-1 text-xs text-muted-foreground">(you)</span>}</p>
                      <Badge variant="outline" className={roleBadgeClass(u.role)}>{roleLabel(u.role)}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{u.email}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span>{u.abstractCount} submissions</span>
                      {u.reviewCount > 0 && <span>{u.reviewCount} reviews</span>}
                    </div>
                    {u.expertise && <p className="text-xs text-muted-foreground mt-0.5 truncate">{u.expertise}</p>}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button
                      variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground"
                      onClick={() => setEditDialog({ id: u.id, name: u.name, email: u.email, role: u.role as any, expertise: u.expertise || "" })}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost" size="icon" className="h-8 w-8 text-destructive"
                      disabled={isSelf}
                      onClick={() => !isSelf && setDeleteDialog({ id: u.id, name: u.name })}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-8 text-center text-muted-foreground text-sm">No users found.</div>
          )}
        </div>

        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Expertise</TableHead>
                <TableHead className="text-right">Submissions</TableHead>
                <TableHead className="text-right">Reviews</TableHead>
                <TableHead className="w-[120px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-5 w-8 ml-auto" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-5 w-8 ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-20 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : filteredUsers?.length ? (
                filteredUsers.map((u) => {
                  const isSelf = u.id === user?.id;
                  return (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">
                        {u.name}{isSelf && <span className="ml-2 text-xs text-muted-foreground">(you)</span>}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{u.email}</TableCell>
                      <TableCell><Badge variant="outline" className={roleBadgeClass(u.role)}>{roleLabel(u.role)}</Badge></TableCell>
                      <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">{u.expertise || <span className="text-muted-foreground/40">—</span>}</TableCell>
                      <TableCell className="text-right">{u.abstractCount}</TableCell>
                      <TableCell className="text-right">{u.reviewCount}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            onClick={() => setEditDialog({ id: u.id, name: u.name, email: u.email, role: u.role as any, expertise: u.expertise || "" })}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                            disabled={isSelf} onClick={() => !isSelf && setDeleteDialog({ id: u.id, name: u.name })}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">No users found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
