import React, { useState, useEffect, useRef } from "react";
import { useParams, Link } from "wouter";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  useGetAbstract,
  getGetAbstractQueryKey,
  useUpdateAbstract,
  useUpdateAbstractStatus,
  useSubmitAbstract,
  useDeleteAbstract,
  useListUsers,
  getListUsersQueryKey,
  useAssignReviewers,
  useAutoAssignReviewers,
  useGetAbstractFieldValues,
  getGetAbstractFieldValuesQueryKey,
  useListFormFields,
  getListFormFieldsQueryKey,
  useSaveAbstractFieldValues,
  useListMessages,
  getListMessagesQueryKey,
  useSendMessage,
  useMarkMessageRead,
  useGetSpeaker,
  getGetSpeakerQueryKey,
  useRegisterSpeaker,
  useUpdateSpeaker,
  useListAbstractVersions,
  getListAbstractVersionsQueryKey,
  type AbstractFieldValue,
  type FormField as CustomFormField,
  type Message,
  type Speaker,
  type AbstractVersion,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/status-badge";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Edit,
  Send,
  Save,
  Wand2,
  UserPlus,
  CheckCircle,
  XCircle,
  FileEdit,
  PauseCircle,
  ChevronsUpDown,
  Check,
  FileText,
  Download,
  Upload,
  X,
  MessageSquare,
  History,
  Mic,
  ChevronDown,
  ChevronUp,
  Star,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { COUNTRIES } from "@/lib/countries";
import { cn, getApiErrorMessage } from "@/lib/utils";

const editSchema = z.object({
  title: z.string().min(5),
  track: z.string().min(1),
  content: z.string().min(50),
  keywords: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
});

const statusSchema = z.object({
  status: z.enum(["under_review", "accepted", "rejected", "on_hold"]),
  note: z.string().optional(),
});

export default function AbstractDetail() {
  const { id } = useParams();
  const abstractId = parseInt(id || "0", 10);
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isEditing, setIsEditing] = useState(false);
  const [isTitleEditing, setIsTitleEditing] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [countryOpen, setCountryOpen] = useState(false);
  const [customFieldValues, setCustomFieldValues] = useState<Record<number, string>>({});
  const [fileUploadState, setFileUploadState] = useState<"idle" | "uploading" | "done" | "error">("idle");
  const [fileUploadProgress, setFileUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [feedbackFile, setFeedbackFile] = useState<File | null>(null);
  const [feedbackFileUploading, setFeedbackFileUploading] = useState(false);
  const [messageInput, setMessageInput] = useState("");
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [isRegisterSpeakerOpen, setIsRegisterSpeakerOpen] = useState(false);
  const [speakerFormData, setSpeakerFormData] = useState({
    name: "", email: "", organization: "", jobTitle: "", phone: "", country: "",
    biography: "", dietaryRequirements: "", accessibilityNeeds: "", recordingConsent: false,
  });
  const setSF = (k: string, v: string | boolean) => setSpeakerFormData(f => ({ ...f, [k]: v }));
  const [speakerActionLoading, setSpeakerActionLoading] = useState(false);
  const [activeSection, setActiveSection] = useState<"content" | "feedback" | "messages">("content");

  const { data: abstract, isLoading } = useGetAbstract(abstractId, {
    query: {
      enabled: !!abstractId,
      queryKey: getGetAbstractQueryKey(abstractId),
    },
  });

  const { data: fieldValues } = useGetAbstractFieldValues(abstractId, {
    query: {
      enabled: !!abstractId,
      queryKey: getGetAbstractFieldValuesQueryKey(abstractId),
    },
  });

  const { data: reviewersList } = useListUsers(
    { role: "reviewer" },
    {
      query: {
        enabled: user?.role === "admin" && !!abstractId,
        queryKey: getListUsersQueryKey({ role: "reviewer" }),
      },
    }
  );

  const { data: allFormFields } = useListFormFields({
    query: { queryKey: getListFormFieldsQueryKey() },
  });
  const activeFormFields = allFormFields?.filter((f) => f.active);

  const { data: messages } = useListMessages(abstractId, {
    query: { enabled: !!abstractId, queryKey: getListMessagesQueryKey(abstractId), refetchInterval: 10000 },
  });

  const { data: speaker } = useGetSpeaker(abstractId, {
    query: { enabled: !!abstractId, queryKey: getGetSpeakerQueryKey(abstractId) },
  });

  const { data: versions } = useListAbstractVersions(abstractId, {
    query: { enabled: !!abstractId, queryKey: getListAbstractVersionsQueryKey(abstractId) },
  });

  const saveFieldValuesMutation = useSaveAbstractFieldValues();

  useEffect(() => {
    if (fieldValues) {
      const initial: Record<number, string> = {};
      for (const fv of fieldValues) {
        initial[fv.fieldId] = fv.value || "";
      }
      setCustomFieldValues(initial);
    }
  }, [fieldValues]);

  const setCustomValue = (fieldId: number, value: string) => {
    setCustomFieldValues((prev) => ({ ...prev, [fieldId]: value }));
  };

  const onSaveCustomFields = async () => {
    const values = Object.entries(customFieldValues)
      .filter(([, val]) => val !== "" && val !== undefined)
      .map(([fieldId, value]) => ({ fieldId: parseInt(fieldId), value }));
    try {
      await saveFieldValuesMutation.mutateAsync({ id: abstractId, data: { values } });
      queryClient.invalidateQueries({ queryKey: getGetAbstractFieldValuesQueryKey(abstractId) });
      toast({ title: "Custom fields saved" });
    } catch (err) {
      toast({ title: "Failed to save custom fields", description: getApiErrorMessage(err), variant: "destructive" });
    }
  };

  const updateMutation = useUpdateAbstract();
  const submitMutation = useSubmitAbstract();
  const statusMutation = useUpdateAbstractStatus();
  const autoAssignMutation = useAutoAssignReviewers();
  const assignMutation = useAssignReviewers();
  const sendMessageMutation = useSendMessage();
  const markReadMutation = useMarkMessageRead();
  const registerSpeakerMutation = useRegisterSpeaker();
  const updateSpeakerMutation = useUpdateSpeaker();

  const editForm = useForm<z.infer<typeof editSchema>>({
    resolver: zodResolver(editSchema),
    values: {
      title: abstract?.title || "",
      track: abstract?.track || "",
      content: abstract?.content || "",
      keywords: abstract?.keywords || "",
      country: abstract?.country || "",
    },
  });

  const statusForm = useForm<z.infer<typeof statusSchema>>({
    resolver: zodResolver(statusSchema),
    defaultValues: { status: "under_review", note: "" },
  });

  const [selectedReviewerIds, setSelectedReviewerIds] = useState<number[]>([]);

  if (isLoading || !abstract)
    return (
      <div className="p-4 sm:p-6 md:p-8 max-w-5xl mx-auto">
        <Skeleton className="h-96 w-full" />
      </div>
    );

  const isAdmin = user?.role === "admin";
  const isReviewer = user?.role === "reviewer";
  const isAuthor = user?.role === "author" && user?.id === abstract.authorId;

  const submissionCode = `AWS-${new Date(abstract.createdAt).getFullYear()}-${String(abstract.id).padStart(4, "0")}`;
  const isDraft = abstract.status === "draft";
  const isSubmitted = abstract.status === "submitted";
  const isOnHold = abstract.status === "on_hold";
  const isAccepted = abstract.status === "accepted";
  const canEditFull = isAdmin || (isAuthor && (isDraft || isSubmitted || isOnHold || isAccepted));
  const canEditTitle = canEditFull || isReviewer;

  const handleFileReplace = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileUploadState("uploading");
    setFileUploadProgress(0);
    try {
      const urlRes = await fetch("/api/storage/uploads/request-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
      });
      if (!urlRes.ok) throw new Error("Failed to get upload URL");
      const { uploadURL, objectPath } = await urlRes.json();
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", uploadURL);
        xhr.setRequestHeader("Content-Type", file.type);
        xhr.upload.onprogress = (ev) => {
          if (ev.lengthComputable) setFileUploadProgress(Math.round((ev.loaded / ev.total) * 100));
        };
        xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error("Upload failed")));
        xhr.onerror = () => reject(new Error("Network error"));
        xhr.send(file);
      });
      await fetch(`/api/abstracts/${abstractId}/attachments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ fileObjectPath: objectPath, fileOriginalName: file.name }),
      });
      queryClient.invalidateQueries({ queryKey: getGetAbstractQueryKey(abstractId) });
      setFileUploadState("done");
      toast({ title: "Document added successfully" });
    } catch (err) {
      setFileUploadState("error");
      toast({ title: "File upload failed", description: (err as Error).message, variant: "destructive" });
    }
    e.target.value = "";
  };

  const onDeleteAttachment = async (fileId: number) => {
    try {
      const res = await fetch(`/api/abstracts/${abstractId}/attachments/${fileId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to remove attachment");
      queryClient.invalidateQueries({ queryKey: getGetAbstractQueryKey(abstractId) });
      toast({ title: "Attachment removed" });
    } catch (err) {
      toast({ title: "Failed to remove attachment", description: (err as Error).message, variant: "destructive" });
    }
  };

  const onSaveEdit = (data: z.infer<typeof editSchema>) => {
    updateMutation.mutate(
      { id: abstractId, data },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetAbstractQueryKey(abstractId) });
          setIsEditing(false);
          toast({ title: "Changes saved" });
        },
      }
    );
  };

  const onSubmitDraft = async () => {
    const missingRequired = activeFormFields?.filter(
      (f: CustomFormField) => f.required && (!customFieldValues[f.id] || customFieldValues[f.id].trim() === "")
    );
    if (missingRequired && missingRequired.length > 0) {
      toast({
        title: "Required fields missing",
        description: `Please fill in: ${missingRequired.map((f: CustomFormField) => f.label).join(", ")}`,
        variant: "destructive",
      });
      return;
    }

    const fieldValuesToSave = Object.entries(customFieldValues)
      .filter(([, val]) => val !== "" && val !== undefined)
      .map(([fieldId, value]) => ({ fieldId: parseInt(fieldId), value }));

    if (fieldValuesToSave.length > 0) {
      try {
        await saveFieldValuesMutation.mutateAsync({ id: abstractId, data: { values: fieldValuesToSave } });
        queryClient.invalidateQueries({ queryKey: getGetAbstractFieldValuesQueryKey(abstractId) });
      } catch (err) {
        toast({ title: "Failed to save required fields before submit", description: getApiErrorMessage(err), variant: "destructive" });
        return;
      }
    }

    submitMutation.mutate(
      { id: abstractId },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetAbstractQueryKey(abstractId) });
          toast({ title: "Submission sent for review" });
        },
        onError: (err: unknown) => {
          toast({ title: "Failed to submit", description: getApiErrorMessage(err), variant: "destructive" });
        },
      }
    );
  };

  const onChangeStatus = async (data: z.infer<typeof statusSchema>) => {
    let feedbackFileObjectPath: string | null = null;
    let feedbackFileName: string | null = null;

    if (feedbackFile) {
      setFeedbackFileUploading(true);
      try {
        const urlRes = await fetch("/api/storage/uploads/request-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ name: feedbackFile.name, size: feedbackFile.size, contentType: feedbackFile.type }),
        });
        if (!urlRes.ok) throw new Error("Failed to get upload URL");
        const { uploadURL, objectPath } = await urlRes.json();
        await fetch(uploadURL, {
          method: "PUT",
          headers: { "Content-Type": feedbackFile.type },
          body: feedbackFile,
        });
        feedbackFileObjectPath = objectPath;
        feedbackFileName = feedbackFile.name;
      } catch (err) {
        setFeedbackFileUploading(false);
        toast({ title: "Feedback file upload failed", description: (err as Error).message, variant: "destructive" });
        return;
      }
      setFeedbackFileUploading(false);
    }

    statusMutation.mutate(
      { id: abstractId, data: { ...data, feedbackFileObjectPath, feedbackFileName } as typeof data },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetAbstractQueryKey(abstractId) });
          setIsStatusDialogOpen(false);
          setFeedbackFile(null);
          toast({ title: "Status updated" });
        },
        onError: (err) => {
          toast({ title: "Failed to update status", description: getApiErrorMessage(err), variant: "destructive" });
        },
      }
    );
  };

  const onAutoAssign = () => {
    autoAssignMutation.mutate(
      { id: abstractId },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetAbstractQueryKey(abstractId) });
          toast({ title: "Reviewers automatically assigned" });
        },
      }
    );
  };

  const onAssignReviewers = () => {
    if (selectedReviewerIds.length === 0) return;
    assignMutation.mutate(
      { id: abstractId, data: { reviewerIds: selectedReviewerIds } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetAbstractQueryKey(abstractId) });
          setIsAssignDialogOpen(false);
          toast({ title: "Reviewers assigned" });
        },
      }
    );
  };

  const onSendMessage = async () => {
    const content = messageInput.trim();
    if (!content) return;
    try {
      await sendMessageMutation.mutateAsync({ id: abstractId, data: { content } });
      setMessageInput("");
      queryClient.invalidateQueries({ queryKey: getListMessagesQueryKey(abstractId) });
    } catch (err) {
      toast({ title: "Failed to send message", description: getApiErrorMessage(err), variant: "destructive" });
    }
  };

  const onRegisterSpeaker = async () => {
    if (!speakerFormData.name.trim() || !speakerFormData.email.trim()) {
      toast({ title: "Name and email are required", variant: "destructive" }); return;
    }
    try {
      await registerSpeakerMutation.mutateAsync({
        id: abstractId,
        data: { ...speakerFormData } as Parameters<typeof registerSpeakerMutation.mutateAsync>[0]["data"],
      });
      queryClient.invalidateQueries({ queryKey: getGetSpeakerQueryKey(abstractId) });
      setIsRegisterSpeakerOpen(false);
      setSpeakerFormData({ name: "", email: "", organization: "", jobTitle: "", phone: "", country: "", biography: "", dietaryRequirements: "", accessibilityNeeds: "", recordingConsent: false });
      toast({
        title: isAdmin || isReviewer ? "Speaker registered & confirmed" : "Registration submitted",
        description: isAdmin || isReviewer
          ? "A welcome email with portal access has been sent."
          : "Your registration is pending approval from the organizers. You'll receive an email once confirmed.",
      });
    } catch (err) {
      toast({ title: "Failed to register speaker", description: getApiErrorMessage(err), variant: "destructive" });
    }
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-5xl mx-auto space-y-5">
      <Dialog open={isRegisterSpeakerOpen} onOpenChange={setIsRegisterSpeakerOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Register Speaker</DialogTitle>
            <DialogDescription>
              {isAdmin || isReviewer
                ? "Register a speaker directly — they'll receive a welcome email with portal access immediately."
                : "Register yourself or a co-presenter as the speaker for this submission. The registration will be reviewed by the organizers."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Full Name <span className="text-red-500">*</span></label>
                <Input className="mt-1" value={speakerFormData.name} onChange={(e) => setSF("name", e.target.value)} placeholder="e.g. Dr. Jane Smith" />
              </div>
              <div>
                <label className="text-sm font-medium">Email Address <span className="text-red-500">*</span></label>
                <Input className="mt-1" type="email" value={speakerFormData.email} onChange={(e) => setSF("email", e.target.value)} placeholder="speaker@example.com" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Organization</label>
                <Input className="mt-1" value={speakerFormData.organization} onChange={(e) => setSF("organization", e.target.value)} placeholder="University / Company" />
              </div>
              <div>
                <label className="text-sm font-medium">Job Title / Designation</label>
                <Input className="mt-1" value={speakerFormData.jobTitle} onChange={(e) => setSF("jobTitle", e.target.value)} placeholder="e.g. Senior Researcher" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Phone Number</label>
                <Input className="mt-1" value={speakerFormData.phone} onChange={(e) => setSF("phone", e.target.value)} placeholder="+1 555 000 0000" />
              </div>
              <div>
                <label className="text-sm font-medium">Country</label>
                <Input className="mt-1" value={speakerFormData.country} onChange={(e) => setSF("country", e.target.value)} placeholder="e.g. Kenya" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Biography</label>
              <Textarea className="mt-1" rows={3} value={speakerFormData.biography} onChange={(e) => setSF("biography", e.target.value)} placeholder="Brief professional bio for the conference programme…" />
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2 border-t">
              <div>
                <label className="text-sm font-medium">Dietary Requirements</label>
                <Input className="mt-1" value={speakerFormData.dietaryRequirements} onChange={(e) => setSF("dietaryRequirements", e.target.value)} placeholder="e.g. Vegetarian, Halal…" />
              </div>
              <div>
                <label className="text-sm font-medium">Accessibility Needs</label>
                <Input className="mt-1" value={speakerFormData.accessibilityNeeds} onChange={(e) => setSF("accessibilityNeeds", e.target.value)} placeholder="Any accessibility requirements…" />
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <Checkbox
                id="recording-consent-reg"
                checked={speakerFormData.recordingConsent}
                onCheckedChange={(v) => setSF("recordingConsent", !!v)}
              />
              <label htmlFor="recording-consent-reg" className="text-sm text-gray-700 leading-snug cursor-pointer">
                I consent to this session being recorded and the recording being shared publicly after the event.
              </label>
            </div>
          </div>
          <DialogFooter className="mt-2">
            <Button variant="ghost" onClick={() => setIsRegisterSpeakerOpen(false)}>Cancel</Button>
            <Button
              onClick={onRegisterSpeaker}
              disabled={registerSpeakerMutation.isPending}
              className="bg-[#015845] hover:bg-[#015845]/90 text-white"
            >
              <Mic className="h-4 w-4 mr-2" />
              {isAdmin || isReviewer ? "Register & Send Welcome Email" : "Submit Registration"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/abstracts"
          className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Submissions
        </Link>

        <div className="flex flex-wrap items-center gap-2">
          {canEditFull && !isEditing && (
            <Button variant="outline" onClick={() => setIsEditing(true)}>
              <Edit className="h-4 w-4 mr-2" /> Edit
            </Button>
          )}

          {isAuthor && isDraft && !isEditing && (
            <Button onClick={onSubmitDraft} disabled={submitMutation.isPending}>
              <Send className="h-4 w-4 mr-2" /> Submit Now
            </Button>
          )}

          {isAuthor && (isOnHold || isAccepted) && !isEditing && (
            <>
              <label className={`inline-flex items-center gap-2 h-9 px-4 rounded-md border border-input bg-background text-sm font-medium shadow-xs cursor-pointer transition-colors hover:bg-accent hover:text-accent-foreground ${fileUploadState === "uploading" ? "opacity-60 pointer-events-none" : ""}`}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,image/*"
                  className="hidden"
                  onChange={handleFileReplace}
                  disabled={fileUploadState === "uploading"}
                />
                <Upload className="h-4 w-4" />
                {fileUploadState === "uploading" ? `Uploading… ${fileUploadProgress}%` : "Add Document"}
              </label>
              <Button onClick={onSubmitDraft} disabled={submitMutation.isPending}>
                <Send className="h-4 w-4 mr-2" /> Resubmit
              </Button>
            </>
          )}

          {(isAdmin || isReviewer || isAuthor) && !speaker && (
            <Button
              variant="outline"
              className="border-[#015845] text-[#015845] hover:bg-[#015845]/10"
              onClick={() => setIsRegisterSpeakerOpen(true)}
            >
              <Mic className="h-4 w-4 mr-2" /> Register Speaker
            </Button>
          )}

          {isAdmin && (
            <Dialog open={isStatusDialogOpen} onOpenChange={(open) => { setIsStatusDialogOpen(open); if (open) statusForm.reset({ status: "under_review", note: "" }); }}>
              <DialogTrigger asChild>
                <Button variant="outline">Change Status</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Change Submission Status</DialogTitle>
                  <DialogDescription>Update the lifecycle status and optionally add a note or rejection reason.</DialogDescription>
                </DialogHeader>
                <Form {...statusForm}>
                  <form onSubmit={statusForm.handleSubmit(onChangeStatus)} className="space-y-4 pt-4">
                    <FormField
                      control={statusForm.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>New Status</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select status" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="under_review">Under Review</SelectItem>
                              <SelectItem value="accepted">Accepted</SelectItem>
                              <SelectItem value="rejected">Rejected</SelectItem>
                              <SelectItem value="on_hold">On Hold</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={statusForm.control}
                      name="note"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Note (Optional)</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Reason for change..." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="space-y-1">
                      <p className="text-sm font-medium">Attach PDF (Optional)</p>
                      <label className={`flex items-center gap-2 cursor-pointer w-fit text-sm px-3 py-2 rounded-md border transition-colors ${feedbackFile ? "border-blue-400 bg-blue-50 text-blue-700" : "border-border hover:bg-muted/50"}`}>
                        <input
                          type="file"
                          accept=".pdf,application/pdf"
                          className="hidden"
                          onChange={(e) => setFeedbackFile(e.target.files?.[0] ?? null)}
                        />
                        <Upload className="h-4 w-4" />
                        {feedbackFile ? feedbackFile.name : "Choose PDF…"}
                      </label>
                      {feedbackFile && (
                        <button type="button" onClick={() => setFeedbackFile(null)} className="text-xs text-muted-foreground hover:text-destructive">
                          Remove
                        </button>
                      )}
                    </div>
                    <DialogFooter>
                      <Button type="submit" disabled={statusMutation.isPending || feedbackFileUploading}>
                        {feedbackFileUploading ? "Uploading…" : statusMutation.isPending ? "Saving…" : "Update Status"}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {isAuthor && isOnHold && (
        <div className="rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 flex gap-3 items-start">
          <PauseCircle className="h-5 w-5 text-orange-500 shrink-0 mt-0.5" />
          <div className="text-sm text-orange-800">
            <p className="font-semibold mb-1">Revision requested</p>
            <p className="mb-2">Your submission has been placed on hold pending revisions. Use the buttons above to update your submission:</p>
            <ul className="list-disc list-inside space-y-0.5">
              <li><strong>Add Document</strong> — attach a revised or additional file (PDF, DOCX, etc.) to your submission.</li>
              <li><strong>Resubmit</strong> — once your changes are ready, click this to send it back for review. Your original submission number will be kept.</li>
            </ul>
          </div>
        </div>
      )}

      {isAuthor && isAccepted && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 flex gap-3 items-start">
          <CheckCircle className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-semibold mb-1">Corrections allowed</p>
            <p className="mb-2">Your submission has been accepted. If you need to submit a corrected version, use the buttons above:</p>
            <ul className="list-disc list-inside space-y-0.5">
              <li><strong>Add Document</strong> — attach a corrected or supplementary file to your submission.</li>
              <li><strong>Resubmit</strong> — after making your changes, click this to re-send. Your submission ID will be preserved.</li>
            </ul>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
        <div className="lg:col-span-2 space-y-6">
          {isEditing ? (
            <Card className="border-border shadow-sm">
              <CardHeader>
                <CardTitle>Edit Submission</CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...editForm}>
                  <form onSubmit={editForm.handleSubmit(onSaveEdit)} className="space-y-4">
                    <FormField
                      control={editForm.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Title</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={editForm.control}
                        name="track"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Submission Type</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="System Reforms and Investment Fiches">
                                  System Reforms and Investment Fiches
                                </SelectItem>
                                <SelectItem value="Country Transformation Snapshots">
                                  Country Transformation Snapshots
                                </SelectItem>
                                <SelectItem value="Youth Led Innovations">Youth Led Innovations</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={editForm.control}
                        name="keywords"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Keywords</FormLabel>
                            <FormControl>
                              <Input {...field} value={field.value || ""} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={editForm.control}
                      name="country"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Country</FormLabel>
                          <Popover open={countryOpen} onOpenChange={setCountryOpen}>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  role="combobox"
                                  className={cn(
                                    "w-full justify-between font-normal",
                                    !field.value && "text-muted-foreground"
                                  )}
                                >
                                  {field.value || "Select country..."}
                                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-full p-0" align="start">
                              <Command>
                                <CommandInput placeholder="Search countries..." />
                                <CommandList>
                                  <CommandEmpty>No country found.</CommandEmpty>
                                  <CommandGroup>
                                    {COUNTRIES.map((country) => (
                                      <CommandItem
                                        key={country}
                                        value={country}
                                        onSelect={(val) => {
                                          field.onChange(val);
                                          setCountryOpen(false);
                                        }}
                                      >
                                        <Check
                                          className={cn(
                                            "mr-2 h-4 w-4",
                                            field.value === country ? "opacity-100" : "opacity-0"
                                          )}
                                        />
                                        {country}
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={editForm.control}
                      name="content"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Content</FormLabel>
                          <FormControl>
                            <Textarea className="min-h-[300px]" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <div className="flex justify-end gap-2 pt-4">
                      <Button type="button" variant="ghost" onClick={() => setIsEditing(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={updateMutation.isPending}>
                        Save Changes
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-border shadow-sm">
              <CardHeader className="pb-4">
                {!isTitleEditing && (
                  <span className="font-mono text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded inline-block mb-2">
                    {submissionCode}
                  </span>
                )}
                <div className="flex justify-between items-start gap-4">
                  {isTitleEditing ? (
                    <div className="flex-1 flex items-center gap-2">
                      <Input
                        className="text-lg font-semibold"
                        value={titleDraft}
                        onChange={(e) => setTitleDraft(e.target.value)}
                        autoFocus
                      />
                      <Button
                        size="sm"
                        disabled={updateMutation.isPending || titleDraft.trim().length < 5}
                        onClick={() => {
                          updateMutation.mutate(
                            { id: abstractId, data: { title: titleDraft.trim() } },
                            {
                              onSuccess: () => {
                                queryClient.invalidateQueries({ queryKey: getGetAbstractQueryKey(abstractId) });
                                setIsTitleEditing(false);
                                toast({ title: "Title updated" });
                              },
                            }
                          );
                        }}
                      >
                        <Save className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setIsTitleEditing(false)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2 flex-1">
                      <h1 className="text-2xl font-serif font-bold leading-tight break-words">{abstract.title}</h1>
                      {canEditTitle && !isEditing && (
                        <button
                          className="mt-1 text-muted-foreground hover:text-foreground transition-colors shrink-0"
                          title="Edit title"
                          onClick={() => { setTitleDraft(abstract.title); setIsTitleEditing(true); }}
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  )}
                  <StatusBadge status={abstract.status} className="shrink-0 text-sm py-1 px-3" />
                </div>
                <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground mt-2">
                  <span>
                    <span className="font-medium text-foreground mr-1">Submission Type:</span> {abstract.track}
                  </span>
                  <span>
                    <span className="font-medium text-foreground mr-1">Author:</span> {abstract.authorName}
                  </span>
                  {abstract.country && (
                    <span>
                      <span className="font-medium text-foreground mr-1">Country:</span>{" "}
                      {abstract.country}
                    </span>
                  )}
                  {abstract.keywords && (
                    <span>
                      <span className="font-medium text-foreground mr-1">Keywords:</span> {abstract.keywords}
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="prose dark:prose-invert max-w-none prose-p:leading-relaxed [overflow-wrap:break-word] [word-break:break-word]">
                  {abstract.content.split("\n\n").map((para, i) => (
                    <p key={i} className="mb-4 text-foreground/90 break-words">
                      {para}
                    </p>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="border-border shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Attached Documents</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Legacy single-file (for older submissions) */}
              {abstract.fileObjectPath && (
                <div className="flex items-center gap-3 p-3 rounded-lg border border-green-200 bg-green-50">
                  <FileText className="h-5 w-5 text-green-600 shrink-0" />
                  <span className="text-sm font-medium text-green-800 flex-1 truncate">
                    {abstract.fileOriginalName || "Uploaded document"}
                  </span>
                  <a
                    href={`/api/abstracts/${abstractId}/file`}
                    download={abstract.fileOriginalName || "submission_file"}
                    className="inline-flex items-center gap-1 text-xs font-medium text-green-700 hover:text-green-900 transition-colors"
                  >
                    <Download className="h-3.5 w-3.5" /> Download
                  </a>
                </div>
              )}

              {/* New-style attachments */}
              {abstract.attachments && abstract.attachments.length > 0 && abstract.attachments.map((att) => (
                <div key={att.id} className="flex items-center gap-3 p-3 rounded-lg border border-green-200 bg-green-50">
                  <FileText className="h-5 w-5 text-green-600 shrink-0" />
                  <span className="text-sm font-medium text-green-800 flex-1 truncate">{att.fileOriginalName}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    <a
                      href={`/api/abstracts/${abstractId}/attachments/${att.id}/download`}
                      download={att.fileOriginalName}
                      className="inline-flex items-center gap-1 text-xs font-medium text-green-700 hover:text-green-900 transition-colors"
                    >
                      <Download className="h-3.5 w-3.5" /> Download
                    </a>
                    {(isAuthor || isAdmin) && canEditFull && (
                      <button
                        onClick={() => onDeleteAttachment(att.id)}
                        className="text-muted-foreground hover:text-destructive transition-colors"
                        title="Remove attachment"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {!abstract.fileObjectPath && (!abstract.attachments || abstract.attachments.length === 0) && (
                <p className="text-sm text-muted-foreground">No documents attached yet.</p>
              )}

              {/* Admin feedback file */}
              {abstract.adminFeedbackFileName && (
                <div className="flex items-center gap-3 rounded-md border border-blue-200 bg-blue-50 px-3 py-2">
                  <FileText className="h-4 w-4 text-blue-600 shrink-0" />
                  <span className="text-sm text-blue-800 flex-1 truncate">{abstract.adminFeedbackFileName}</span>
                  <a
                    href={`/api/abstracts/${abstractId}/feedback-file`}
                    download={abstract.adminFeedbackFileName}
                    className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:text-blue-900 transition-colors shrink-0"
                  >
                    <Download className="h-3.5 w-3.5" /> Download Feedback
                  </a>
                </div>
              )}

              {/* Admin-only upload (authors use the action bar buttons above) */}
              {isAdmin && canEditFull && (
                <div className="space-y-2 pt-1">
                  <label className={`flex items-center gap-2 cursor-pointer w-fit text-sm font-medium px-3 py-2 rounded-md border transition-colors ${fileUploadState === "uploading" ? "border-blue-300 bg-blue-50 text-blue-600" : "border-border hover:bg-muted/50"}`}>
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,image/*"
                      className="hidden"
                      onChange={handleFileReplace}
                      disabled={fileUploadState === "uploading"}
                    />
                    <Upload className="h-4 w-4" />
                    {fileUploadState === "uploading" ? `Uploading… ${fileUploadProgress}%` : "Add Document"}
                  </label>
                  {fileUploadState === "uploading" && (
                    <div className="mt-2 w-48 h-1.5 bg-blue-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${fileUploadProgress}%` }} />
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {activeFormFields && activeFormFields.length > 0 && isDraft && (isAuthor || isAdmin) ? (
            <Card className="border-border shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Additional Information</CardTitle>
                <CardDescription>
                  Complete or update the fields below. Required fields must be filled before submitting.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {activeFormFields.map((field: CustomFormField) => (
                  <div key={field.id} className="space-y-2">
                    <label className="text-sm font-medium leading-none">
                      {field.label}
                      {field.required && <span className="text-destructive ml-1">*</span>}
                    </label>
                    {field.type === "text" && (
                      <Input
                        placeholder={field.label}
                        value={customFieldValues[field.id] || ""}
                        onChange={(e) => setCustomValue(field.id, e.target.value)}
                      />
                    )}
                    {field.type === "number" && (
                      <Input
                        type="number"
                        placeholder={field.label}
                        value={customFieldValues[field.id] || ""}
                        onChange={(e) => setCustomValue(field.id, e.target.value)}
                      />
                    )}
                    {field.type === "textarea" && (
                      <Textarea
                        placeholder={field.label}
                        value={customFieldValues[field.id] || ""}
                        onChange={(e) => setCustomValue(field.id, e.target.value)}
                        className="min-h-[100px]"
                      />
                    )}
                    {field.type === "dropdown" && field.options && (
                      <Select
                        value={customFieldValues[field.id] || ""}
                        onValueChange={(val) => setCustomValue(field.id, val)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={`Select ${field.label}`} />
                        </SelectTrigger>
                        <SelectContent>
                          {(field.options as string[]).map((opt: string) => (
                            <SelectItem key={opt} value={opt}>
                              {opt}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    {field.type === "checkbox" && (
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id={`field-${field.id}`}
                          checked={customFieldValues[field.id] === "true"}
                          onCheckedChange={(checked) =>
                            setCustomValue(field.id, checked ? "true" : "false")
                          }
                        />
                        <label htmlFor={`field-${field.id}`} className="text-sm text-muted-foreground cursor-pointer">
                          {field.label}
                        </label>
                      </div>
                    )}
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onSaveCustomFields}
                  disabled={saveFieldValuesMutation.isPending}
                >
                  <Save className="h-4 w-4 mr-2" /> Save Fields
                </Button>
              </CardContent>
            </Card>
          ) : fieldValues && fieldValues.length > 0 ? (
            <Card className="border-border shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Additional Information</CardTitle>
                <CardDescription>Custom fields submitted with this abstract</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {fieldValues.map((fv: AbstractFieldValue) => (
                  <div key={fv.id} className="flex flex-col gap-0.5">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      {fv.fieldLabel}
                    </span>
                    <span className="text-sm">
                      {fv.value === "true" ? "Yes" : fv.value === "false" ? "No" : fv.value}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}

          {!isDraft && abstract.reviews && abstract.reviews.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-serif font-bold pt-4">Reviews & Feedback</h2>
              <div className="space-y-4">
                {abstract.reviews.map((review) => (
                  <Card key={review.id} className="border-border bg-muted/10">
                    <CardHeader className="py-4">
                      <div className="flex justify-between items-center">
                        <div className="font-medium">
                          {review.reviewerName === "Review Committee"
                            ? "Review Committee Feedback"
                            : <>Review by{" "}{isAdmin || isAuthor ? review.reviewerName : `Reviewer #${review.reviewerId}`}</>}
                        </div>
                        <div className="flex items-center gap-3">
                          {review.score && (
                            <span className="px-2 py-1 bg-primary/10 text-primary font-bold rounded-md text-sm">
                              Score: {review.score}/10
                            </span>
                          )}
                          {review.recommendation === "accept" && (
                            <span className="text-green-600 flex items-center text-sm font-medium">
                              <CheckCircle className="w-4 h-4 mr-1" /> Accept
                            </span>
                          )}
                          {review.recommendation === "reject" && (
                            <span className="text-red-600 flex items-center text-sm font-medium">
                              <XCircle className="w-4 h-4 mr-1" /> Reject
                            </span>
                          )}
                          {review.recommendation === "revise" && (
                            <span className="text-amber-600 flex items-center text-sm font-medium">
                              <FileEdit className="w-4 h-4 mr-1" /> Revise
                            </span>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    {review.comments && (
                      <CardContent className="pt-0 text-sm">
                        <p className="whitespace-pre-wrap">{review.comments}</p>
                      </CardContent>
                    )}
                  </Card>
                ))}
              </div>
            </div>
          )}

          <Card className="border-border shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-[#0381ED]" /> Messages
                {messages && messages.length > 0 && (
                  <span className="ml-auto text-xs text-muted-foreground font-normal">
                    {messages.length} message{messages.length !== 1 ? "s" : ""}
                  </span>
                )}
              </CardTitle>
              <CardDescription>
                {isAdmin ? "Communicate with the author about this submission." : "Ask questions or correspond with the review committee."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {messages && messages.length > 0 ? (
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                  {(messages as Message[]).map((msg) => {
                    const isMine = msg.senderId === user?.id;
                    return (
                      <div key={msg.id} className={`flex flex-col gap-1 ${isMine ? "items-end" : "items-start"}`}>
                        <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${isMine ? "bg-[#0381ED] text-white rounded-br-sm" : "bg-muted rounded-bl-sm"}`}>
                          {msg.content}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
                          <span className="font-medium">{msg.senderName}</span>
                          <span>·</span>
                          <span>{new Date(msg.createdAt).toLocaleString()}</span>
                          {!isMine && !msg.readAt && (
                            <button
                              className="text-[#0381ED] hover:underline"
                              onClick={() => {
                                markReadMutation.mutate(
                                  { id: abstractId, messageId: msg.id },
                                  { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListMessagesQueryKey(abstractId) }) }
                                );
                              }}
                            >
                              Mark read
                            </button>
                          )}
                          {msg.readAt && <span className="text-green-500">✓ Read</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No messages yet. Start the conversation below.</p>
              )}

              <div className="flex gap-2 pt-2 border-t">
                <Input
                  placeholder="Type a message…"
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSendMessage(); } }}
                  className="flex-1"
                />
                <Button
                  size="icon"
                  onClick={onSendMessage}
                  disabled={sendMessageMutation.isPending || !messageInput.trim()}
                  className="bg-[#0381ED] hover:bg-[#0381ED]/90 shrink-0"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-lg">Metadata</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <span className="text-muted-foreground block mb-1">Submitted On</span>
                <span className="font-medium">
                  {abstract.submittedAt
                    ? new Date(abstract.submittedAt).toLocaleString()
                    : "Not submitted"}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block mb-1">Last Updated</span>
                <span className="font-medium">{new Date(abstract.updatedAt).toLocaleString()}</span>
              </div>
              <div>
                <span className="text-muted-foreground block mb-1">Author Email</span>
                <span className="font-medium">{abstract.authorEmail}</span>
              </div>
              {abstract.country && (
                <div>
                  <span className="text-muted-foreground block mb-1">Country</span>
                  <span className="font-medium">{abstract.country}</span>
                </div>
              )}
              {abstract.averageScore !== null && abstract.averageScore !== undefined && (
                <div className="p-3 bg-primary/5 rounded-md border border-primary/10 mt-4">
                  <span className="text-muted-foreground block mb-1">Average Score</span>
                  <span className="font-bold text-2xl text-primary">
                    {abstract.averageScore.toFixed(1)}{" "}
                    <span className="text-sm font-normal text-muted-foreground">/ 10</span>
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {(isAdmin || isReviewer || isAuthor) && (
            <Card className="border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Mic className="h-4 w-4 text-[#015845]" /> Speaker Registration
                  {speaker && (
                    <span className={`text-xs font-normal px-2 py-0.5 rounded-full ${
                      (speaker as Speaker & { status: string }).status === "confirmed" ? "bg-green-100 text-green-700" :
                      (speaker as Speaker & { status: string }).status === "pending" ? "bg-yellow-100 text-yellow-700" :
                      (speaker as Speaker & { status: string }).status === "declined" ? "bg-red-100 text-red-700" :
                      "bg-blue-100 text-blue-700"
                    }`}>
                      {(speaker as Speaker & { status: string }).status === "confirmed" ? "✓ Confirmed" :
                       (speaker as Speaker & { status: string }).status === "pending" ? "⏳ Pending Approval" :
                       (speaker as Speaker & { status: string }).status === "declined" ? "✗ Declined" : "Invited"}
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {speaker ? (
                  <div className="space-y-3 text-sm">
                    <div>
                      <div className="font-semibold text-base">{(speaker as Speaker).name}</div>
                      {(speaker as Speaker).jobTitle && <div className="text-muted-foreground">{(speaker as Speaker).jobTitle}</div>}
                      {(speaker as Speaker).organization && <div className="text-muted-foreground">{(speaker as Speaker).organization}</div>}
                      <div className="text-muted-foreground">{(speaker as Speaker).email}</div>
                    </div>

                    {(speaker as Speaker & { status: string }).status === "pending" && (
                      (isAdmin || isReviewer) ? (
                        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <p className="text-xs text-yellow-800 font-medium mb-3">This speaker registration requires approval before they get portal access.</p>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              disabled={speakerActionLoading}
                              className="bg-green-600 hover:bg-green-700 text-white"
                              onClick={async () => {
                                setSpeakerActionLoading(true);
                                try {
                                  const res = await fetch(`/api/abstracts/${abstractId}/speaker/approve`, { method: "POST", credentials: "include" });
                                  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Failed");
                                  queryClient.invalidateQueries({ queryKey: getGetSpeakerQueryKey(abstractId) });
                                  toast({ title: "Speaker approved", description: "Welcome email with portal link sent." });
                                } catch (e) {
                                  toast({ title: "Failed to approve", description: (e as Error).message, variant: "destructive" });
                                } finally { setSpeakerActionLoading(false); }
                              }}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" /> Approve & Send Welcome Email
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={speakerActionLoading}
                              className="border-red-300 text-red-600 hover:bg-red-50"
                              onClick={async () => {
                                setSpeakerActionLoading(true);
                                try {
                                  const res = await fetch(`/api/abstracts/${abstractId}/speaker/reject`, { method: "POST", credentials: "include" });
                                  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Failed");
                                  queryClient.invalidateQueries({ queryKey: getGetSpeakerQueryKey(abstractId) });
                                  toast({ title: "Registration declined" });
                                } catch (e) {
                                  toast({ title: "Failed", description: (e as Error).message, variant: "destructive" });
                                } finally { setSpeakerActionLoading(false); }
                              }}
                            >
                              <XCircle className="h-4 w-4 mr-1" /> Decline
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-xs text-yellow-800">
                          ⏳ Your registration is pending approval from the organizers. You'll receive an email once confirmed with your speaker portal link.
                        </div>
                      )
                    )}

                    {(speaker as Speaker & { status: string }).status === "confirmed" && (
                      <div className="space-y-2">
                        {(isAdmin || isReviewer) && (speaker as Speaker & { status: string; portalToken?: string }).portalToken && (
                          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                            <p className="text-xs text-green-700 font-medium mb-1">✓ Speaker has portal access</p>
                            <p className="text-xs text-green-600 break-all font-mono">
                              {`${window.location.origin}/speaker/${(speaker as Speaker & { status: string; portalToken?: string }).portalToken}`}
                            </p>
                          </div>
                        )}
                        {isAuthor && (
                          <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-xs text-green-800">
                            ✓ Confirmed! The speaker has received their portal access link by email.
                          </div>
                        )}
                        <div className="pt-1 flex flex-wrap gap-2 text-xs">
                          <span className={`px-2 py-0.5 rounded-full ${(speaker as Speaker).biography ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                            {(speaker as Speaker).biography ? "✓ Bio" : "✗ Bio missing"}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full ${(speaker as Speaker).photoObjectPath ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                            {(speaker as Speaker).photoObjectPath ? "✓ Photo" : "✗ Photo missing"}
                          </span>
                        </div>
                      </div>
                    )}

                    {(speaker as Speaker & { status: string }).status === "declined" && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-xs text-red-800 mb-2">This speaker registration was declined by the organizers.</p>
                        {isAuthor && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-red-300 text-red-600 hover:bg-red-50"
                            disabled={speakerActionLoading}
                            onClick={async () => {
                              setSpeakerActionLoading(true);
                              try {
                                const res = await fetch(`/api/abstracts/${abstractId}/speaker`, { method: "DELETE", credentials: "include" });
                                if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Failed");
                                queryClient.invalidateQueries({ queryKey: getGetSpeakerQueryKey(abstractId) });
                                toast({ title: "Registration removed", description: "You can now submit a new registration." });
                              } catch (e) {
                                toast({ title: "Failed", description: (e as Error).message, variant: "destructive" });
                              } finally { setSpeakerActionLoading(false); }
                            }}
                          >
                            Remove & Re-register
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground py-2">
                    {isAdmin || isReviewer
                      ? "No speaker registered yet. Use 'Register Speaker' in the action bar above."
                      : "Register yourself or a co-presenter as the speaker using the 'Register Speaker' button above."}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {versions && versions.length > 0 && (
            <Card className="border-border">
              <CardHeader className="pb-3 cursor-pointer" onClick={() => setShowVersionHistory((v) => !v)}>
                <CardTitle className="text-base flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <History className="h-4 w-4 text-muted-foreground" /> Version History
                    <span className="text-xs font-normal text-muted-foreground">({versions.length})</span>
                  </span>
                  {showVersionHistory ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </CardTitle>
              </CardHeader>
              {showVersionHistory && (
                <CardContent className="space-y-3 pt-0">
                  {(versions as AbstractVersion[]).map((v) => (
                    <div key={v.id} className="text-sm border-l-2 border-muted pl-3 py-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-[#015845]">v{v.version}</span>
                        <span className="text-xs text-muted-foreground">{new Date(v.createdAt).toLocaleDateString()}</span>
                      </div>
                      <div className="text-muted-foreground text-xs mt-0.5 truncate">{v.title}</div>
                      {v.snapshotReason && <div className="text-xs text-muted-foreground/70 mt-0.5 italic">{v.snapshotReason}</div>}
                    </div>
                  ))}
                </CardContent>
              )}
            </Card>
          )}

          {(isAdmin || user?.role === "reviewer") && (
            <Card className="border-border">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg">Assigned Reviewers</CardTitle>
                <ReviewerBadge count={abstract.reviewers?.length || 0} />
              </CardHeader>
              <CardContent>
                {abstract.reviewers && abstract.reviewers.length > 0 ? (
                  <ul className="space-y-3 mt-4">
                    {abstract.reviewers.map((r) => (
                      <li key={r.userId} className="flex justify-between items-center text-sm">
                        <div>
                          <p className="font-medium">{r.name}</p>
                          {r.expertise && (
                            <p className="text-xs text-muted-foreground truncate max-w-[150px]">
                              {r.expertise}
                            </p>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground py-4 text-center">No reviewers assigned</p>
                )}

                {isAdmin && abstract.status !== "draft" && (
                  <div className="mt-6 pt-4 border-t space-y-3">
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={onAutoAssign}
                      disabled={autoAssignMutation.isPending}
                    >
                      <Wand2 className="h-4 w-4 mr-2" /> Auto-Assign
                    </Button>

                    <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
                      <DialogTrigger asChild>
                        <Button variant="secondary" className="w-full">
                          <UserPlus className="h-4 w-4 mr-2" /> Manual Assign
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Assign Reviewers</DialogTitle>
                        </DialogHeader>
                        <div className="py-4 space-y-4">
                          {reviewersList?.map((reviewer) => {
                            const isAssigned = abstract.reviewers?.some((r) => r.userId === reviewer.id);
                            return (
                              <div key={reviewer.id} className="flex items-center space-x-3">
                                <input
                                  type="checkbox"
                                  id={`reviewer-${reviewer.id}`}
                                  disabled={isAssigned}
                                  checked={isAssigned || selectedReviewerIds.includes(reviewer.id)}
                                  onChange={(e) => {
                                    if (e.target.checked)
                                      setSelectedReviewerIds([...selectedReviewerIds, reviewer.id]);
                                    else
                                      setSelectedReviewerIds(
                                        selectedReviewerIds.filter((id) => id !== reviewer.id)
                                      );
                                  }}
                                  className="w-4 h-4 rounded border-gray-300"
                                />
                                <label
                                  htmlFor={`reviewer-${reviewer.id}`}
                                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                >
                                  {reviewer.name} {isAssigned && "(Assigned)"}
                                  <span className="block text-xs text-muted-foreground font-normal mt-0.5">
                                    {reviewer.expertise || "No expertise listed"} • {reviewer.reviewCount}{" "}
                                    reviews
                                  </span>
                                </label>
                              </div>
                            );
                          })}
                        </div>
                        <DialogFooter>
                          <Button onClick={onAssignReviewers} disabled={assignMutation.isPending}>
                            Assign Selected
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function ReviewerBadge({ count }: { count: number }) {
  return (
    <span className="bg-muted text-foreground px-2 py-0.5 rounded-full text-xs font-medium">
      {count}
    </span>
  );
}
