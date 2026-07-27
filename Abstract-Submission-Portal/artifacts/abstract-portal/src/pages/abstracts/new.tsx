import React, { useState } from "react";
import { useLocation } from "wouter";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  useCreateAbstract,
  useSubmitAbstract,
  getListAbstractsQueryKey,
  useListFormFields,
  useSaveAbstractFieldValues,
  useListUsers,
  getListUsersQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Save, Send, ChevronRight, ChevronsUpDown, Check, Upload, FileText, X, User, Globe, CheckCircle2, PlusCircle, ListChecks } from "lucide-react";
import { Link } from "wouter";
import { COUNTRIES } from "@/lib/countries";
import { cn, getApiErrorMessage } from "@/lib/utils";

const SUBMISSION_TYPES = [
  {
    id: "System Reforms and Investment Fiches",
    title: "Call for System Reforms and Investment Fiches",
    description:
      "The Africa Water and Sanitation Systems Leadership Symposium 2026 is launching a call for System Reforms and Investment Fiches. Through curated reform initiatives and targeted matchmaking, the Symposium will mobilise partnerships and finance for system-level change, generating concrete commitments that improve performance, resilience, and long-term sustainability across the sector.",
    guidance: "Focus on system-level change, partnerships, finance, and long-term sustainability impacts.",
  },
  {
    id: "Country Transformation Snapshots",
    title: "Call for Country Transformation Snapshots",
    description:
      "The Africa Water and Sanitation Systems Leadership Symposium 2026 is launching Country Transformation Snapshots, concise two-page case studies highlighting inspiring national reforms in Africa's water and sanitation sectors. Countries are invited to nominate and document reform initiatives that demonstrate systemic impact, measurable progress, and potential for replication.",
    guidance: "Keep your snapshot concise (two-page equivalent). Highlight measurable progress and replication potential.",
  },
  {
    id: "Youth Led Innovations",
    title: "Call for Youth Led Innovations",
    description:
      "The Africa Water and Sanitation Systems Leadership Symposium 2026 is launching a continental call to identify up to 20 promising Youth-led innovations in the water and sanitation sector. Selected innovators will gain high-level visibility, tailored coaching, and direct access to governments, utilities, regulators, and investors through pitching and matchmaking sessions at the Symposium.",
    guidance: "Applicants must be youth innovators (under 35). Describe your innovation, current traction, and scale-up plans.",
  },
] as const;

type SubmissionTypeId = (typeof SUBMISSION_TYPES)[number]["id"];

const SALUTATIONS = ["Mr.", "Mrs.", "Ms.", "Dr.", "Prof.", "Eng.", "Hon.", "Rev.", "Other"];

const abstractSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters"),
  track: z.string().min(1, "Submission type is required"),
  keywords: z.string().optional(),
  countries: z.array(z.string()).min(1, "Please select at least one country"),
  salutation: z.string().optional(),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Valid email required"),
  organization: z.string().min(1, "Organisation is required"),
  designation: z.string().min(1, "Designation is required"),
  phone: z.string().optional(),
});

export default function NewAbstract() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const [selectedType, setSelectedType] = useState<SubmissionTypeId | null>(null);
  const [countryOpen, setCountryOpen] = useState(false);
  const [customFieldValues, setCustomFieldValues] = useState<Record<number, string>>({});
  const [uploadedFiles, setUploadedFiles] = useState<Array<{ objectPath: string; originalName: string }>>([]);
  const [fileUploadState, setFileUploadState] = useState<"idle" | "uploading" | "done" | "error">("idle");
  const [fileUploadProgress, setFileUploadProgress] = useState(0);
  const [onBehalfOfAuthorId, setOnBehalfOfAuthorId] = useState<number | null>(null);
  const [authorSearch, setAuthorSearch] = useState("");
  const [authorPickerOpen, setAuthorPickerOpen] = useState(false);
  const [lastSubmitted, setLastSubmitted] = useState<{ title: string; authorName: string | null } | null>(null);

  const isAdmin = user?.role === "admin";
  const authorQueryParams = { role: "author" as any };
  const { data: authors } = useListUsers(authorQueryParams, {
    query: { enabled: isAdmin, queryKey: getListUsersQueryKey(authorQueryParams) },
  });

  const activeType = SUBMISSION_TYPES.find((t) => t.id === selectedType);

  const form = useForm<z.infer<typeof abstractSchema>>({
    resolver: zodResolver(abstractSchema),
    defaultValues: {
      title: "",
      track: selectedType ?? "",
      keywords: "",
      countries: [],
      salutation: "",
      firstName: "",
      lastName: "",
      email: user?.email ?? "",
      organization: "",
      designation: "",
      phone: "",
    },
  });

  const { data: allFormFields } = useListFormFields();
  const formFields = allFormFields?.filter((f) => f.active);

  const createMutation = useCreateAbstract();
  const submitMutation = useSubmitAbstract();
  const saveFieldValues = useSaveAbstractFieldValues();

  const handleSelectType = (typeId: SubmissionTypeId) => {
    setSelectedType(typeId);
    form.setValue("track", typeId);
    form.clearErrors("track");
    if (user?.email) form.setValue("email", user.email);
  };

  const setCustomValue = (fieldId: number, value: string) => {
    setCustomFieldValues((prev) => ({ ...prev, [fieldId]: value }));
  };

  const saveCustomFields = async (abstractId: number) => {
    const fieldValues = Object.entries(customFieldValues)
      .filter(([, val]) => val !== "" && val !== undefined)
      .map(([fieldId, value]) => ({ fieldId: parseInt(fieldId), value }));
    if (fieldValues.length === 0) return;
    return saveFieldValues.mutateAsync({ id: abstractId, data: { values: fieldValues } });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
        xhr.onerror = () => reject(new Error("Network error during upload"));
        xhr.send(file);
      });
      setUploadedFiles((prev) => [...prev, { objectPath, originalName: file.name }]);
      setFileUploadState("idle");
    } catch (err) {
      setFileUploadState("error");
      toast({ title: "File upload failed", description: (err as Error).message, variant: "destructive" });
    }
    e.target.value = "";
  };

  const saveAttachments = async (abstractId: number) => {
    for (const file of uploadedFiles) {
      await fetch(`/api/abstracts/${abstractId}/attachments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ fileObjectPath: file.objectPath, fileOriginalName: file.originalName }),
      });
    }
  };

  const buildAbstractPayload = (data: z.infer<typeof abstractSchema>) => ({
    title: data.title,
    content: "",
    track: data.track,
    keywords: data.keywords || undefined,
    country: data.countries.join(", "),
    salutation: data.salutation || undefined,
    firstName: data.firstName,
    lastName: data.lastName,
    organization: data.organization,
    designation: data.designation,
    phone: data.phone || undefined,
    ...(onBehalfOfAuthorId ? { onBehalfOfAuthorId } : {}),
  });

  const onSaveDraftDirect = () => {
    const data = form.getValues();
    if (!data.title || data.title.length < 5) {
      toast({ title: "Please enter a title (at least 5 characters) before saving.", variant: "destructive" });
      return;
    }
    createMutation.mutate(
      { data: { ...buildAbstractPayload(data), title: data.title, track: data.track || "draft" } },
      {
        onSuccess: async (newAbstract) => {
          try { await saveCustomFields(newAbstract.id); } catch {}
          await saveAttachments(newAbstract.id);
          queryClient.invalidateQueries({ queryKey: getListAbstractsQueryKey() });
          toast({ title: "Draft saved successfully" });
          setLocation("/abstracts");
        },
        onError: (err: unknown) => {
          toast({ title: "Error saving draft", description: getApiErrorMessage(err), variant: "destructive" });
        },
      }
    );
  };

  const resetFormForAnother = () => {
    form.reset({
      title: "",
      track: "",
      keywords: "",
      countries: [],
      salutation: "",
      firstName: "",
      lastName: "",
      email: onBehalfOfAuthorId
        ? (authors?.find((a) => a.id === onBehalfOfAuthorId)?.email ?? user?.email ?? "")
        : (user?.email ?? ""),
      organization: "",
      designation: "",
      phone: "",
    });
    setSelectedType(null);
    setCustomFieldValues({});
    setUploadedFiles([]);
    setFileUploadState("idle");
    setFileUploadProgress(0);
    setLastSubmitted(null);
  };

  const onSubmitFinal = async (data: z.infer<typeof abstractSchema>) => {
    const missingRequired = formFields?.filter(
      (f) => f.required && (!customFieldValues[f.id] || customFieldValues[f.id].trim() === "")
    );
    if (missingRequired && missingRequired.length > 0) {
      toast({
        title: "Required fields missing",
        description: `Please fill in: ${missingRequired.map((f) => f.label).join(", ")}`,
        variant: "destructive",
      });
      return;
    }

    const authorName = onBehalfOfAuthorId
      ? (authors?.find((a) => a.id === onBehalfOfAuthorId)?.name ?? null)
      : null;

    createMutation.mutate(
      { data: buildAbstractPayload(data) },
      {
        onSuccess: async (newAbstract) => {
          try { await saveCustomFields(newAbstract.id); } catch (fieldErr) {
            toast({ title: "Could not save required field values", description: getApiErrorMessage(fieldErr), variant: "destructive" });
            setLocation(`/abstracts/${newAbstract.id}`);
            return;
          }
          await saveAttachments(newAbstract.id);
          submitMutation.mutate(
            { id: newAbstract.id },
            {
              onSuccess: () => {
                queryClient.invalidateQueries({ queryKey: getListAbstractsQueryKey() });
                if (isAdmin) {
                  setLastSubmitted({ title: data.title, authorName });
                  form.reset({
                    title: "",
                    track: "",
                    keywords: "",
                    countries: [],
                    salutation: "",
                    firstName: "",
                    lastName: "",
                    email: onBehalfOfAuthorId
                      ? (authors?.find((a) => a.id === onBehalfOfAuthorId)?.email ?? user?.email ?? "")
                      : (user?.email ?? ""),
                    organization: "",
                    designation: "",
                    phone: "",
                  });
                  setSelectedType(null);
                  setCustomFieldValues({});
                  setUploadedFiles([]);
                  setFileUploadState("idle");
                  setFileUploadProgress(0);
                } else {
                  toast({ title: "Submission received!", description: "Your submission has been sent for review." });
                  setLocation("/abstracts");
                }
              },
              onError: (err: unknown) => {
                toast({ title: "Created but failed to submit", description: getApiErrorMessage(err), variant: "destructive" });
                setLocation(`/abstracts/${newAbstract.id}`);
              },
            }
          );
        },
        onError: (err: unknown) => {
          toast({ title: "Error creating submission", description: getApiErrorMessage(err), variant: "destructive" });
        },
      }
    );
  };

  const isPending = createMutation.isPending || submitMutation.isPending;

  if (!selectedType) {
    return (
      <div className="p-4 sm:p-6 md:p-8 max-w-6xl mx-auto space-y-6">
        <Link
          href="/abstracts"
          className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to My Submissions
        </Link>

        {lastSubmitted && (
          <div className="rounded-xl border border-green-200 bg-green-50 p-5 flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <CheckCircle2 className="h-6 w-6 text-green-600 flex-shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="font-semibold text-green-900 text-sm">Submission received</p>
                <p className="text-green-700 text-sm truncate">
                  <span className="font-medium">"{lastSubmitted.title}"</span>
                  {lastSubmitted.authorName && <> filed under <span className="font-medium">{lastSubmitted.authorName}</span></>}
                </p>
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              {lastSubmitted.authorName && (
                <Button
                  size="sm"
                  onClick={resetFormForAnother}
                  style={{ background: "#015845" }}
                  className="text-white hover:opacity-90 gap-1.5"
                >
                  <PlusCircle className="h-4 w-4" />
                  Another for {lastSubmitted.authorName.split(" ")[0]}
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={() => setLocation("/abstracts")}
                className="border-green-400 text-green-800 hover:bg-green-100 gap-1.5"
              >
                <ListChecks className="h-4 w-4" />
                View all
              </Button>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <h1 className="text-3xl font-serif font-bold tracking-tight text-foreground">Submission</h1>
          <p className="text-muted-foreground text-lg">
            Select the submission category that best describes your work.
          </p>
        </div>

        <div className="rounded-2xl overflow-hidden shadow-xl" style={{ background: "#015845" }}>
          <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-white/20">
            {SUBMISSION_TYPES.map((type) => (
              <button
                key={type.id}
                onClick={() => handleSelectType(type.id as SubmissionTypeId)}
                className="group text-left p-8 hover:bg-white/10 transition-all duration-200 focus:outline-none focus:bg-white/10"
              >
                <h2
                  className="font-serif font-bold text-xl leading-snug mb-6 group-hover:underline"
                  style={{ color: "#F5C842" }}
                >
                  {type.title}
                </h2>
                <p className="text-white/85 text-sm leading-relaxed mb-8">{type.description}</p>
                <div
                  className="inline-flex items-center gap-2 text-sm font-semibold group-hover:gap-3 transition-all"
                  style={{ color: "#F5C842" }}
                >
                  Apply for this call <ChevronRight className="h-4 w-4" />
                </div>
              </button>
            ))}
          </div>
        </div>

        <p className="text-center text-sm text-muted-foreground">
          Africa Water and Sanitation Systems Leadership Symposium 2026 — open calls
        </p>
      </div>
    );
  }

  const selectedCountries = form.watch("countries");

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white">
      <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-5">
        <button
          onClick={() => setSelectedType(null)}
          className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-1" /> Change submission type
        </button>

        <div className="space-y-1">
          <h1 className="text-3xl font-serif font-bold tracking-tight text-foreground">Submission</h1>
          <p className="text-muted-foreground">Complete the form below. You can save a draft at any time.</p>
        </div>

        {activeType && (
          <div
            className="rounded-xl p-5 border-l-4 space-y-1"
            style={{ background: "#015845", borderLeftColor: "#F5C842" }}
          >
            <p className="font-serif font-bold text-white text-base">{activeType.title}</p>
            <p className="text-white/70 text-sm leading-relaxed">{activeType.guidance}</p>
          </div>
        )}

        {isAdmin && (
          <div className="rounded-xl border-2 border-amber-300 bg-amber-50 p-5 space-y-3">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-full bg-amber-400 flex items-center justify-center flex-shrink-0">
                <User className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="font-semibold text-sm text-amber-900">Admin: Submit on behalf of an author</p>
                <p className="text-xs text-amber-700">Select the author whose account this submission will be filed under.</p>
              </div>
            </div>
            <Popover open={authorPickerOpen} onOpenChange={setAuthorPickerOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="w-full flex items-center justify-between rounded-md border border-amber-300 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                >
                  {onBehalfOfAuthorId
                    ? (() => { const a = authors?.find((a) => a.id === onBehalfOfAuthorId); return a ? `${a.name} — ${a.email}` : "Select author…"; })()
                    : <span className="text-muted-foreground">Search by name or email…</span>}
                  <ChevronsUpDown className="h-4 w-4 text-amber-500 ml-2 shrink-0" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="p-0 w-[var(--radix-popover-trigger-width)]" align="start">
                <Command>
                  <CommandInput
                    placeholder="Type name or paste email…"
                    value={authorSearch}
                    onValueChange={setAuthorSearch}
                  />
                  <CommandList>
                    <CommandEmpty>No matching authors found.</CommandEmpty>
                    <CommandGroup>
                      {authors
                        ?.filter((a) => {
                          const q = authorSearch.toLowerCase();
                          return !q || a.name.toLowerCase().includes(q) || a.email.toLowerCase().includes(q);
                        })
                        .map((a) => (
                          <CommandItem
                            key={a.id}
                            value={`${a.name} ${a.email}`}
                            onSelect={() => {
                              setOnBehalfOfAuthorId(a.id);
                              form.setValue("email", a.email);
                              setAuthorSearch("");
                              setAuthorPickerOpen(false);
                            }}
                          >
                            <Check className={cn("mr-2 h-4 w-4", onBehalfOfAuthorId === a.id ? "opacity-100" : "opacity-0")} />
                            <span className="font-medium">{a.name}</span>
                            <span className="ml-2 text-muted-foreground text-xs">{a.email}</span>
                          </CommandItem>
                        ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            {onBehalfOfAuthorId && (
              <p className="text-xs text-amber-700">
                Submitting as: <strong>{authors?.find((a) => a.id === onBehalfOfAuthorId)?.name}</strong>
              </p>
            )}
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmitFinal)} className="space-y-6">

            {/* Author Details */}
            <Card className="border-2 overflow-hidden" style={{ borderColor: "#015845" }}>
              <CardHeader className="pb-3" style={{ background: "linear-gradient(135deg, #015845 0%, #01734f 100%)" }}>
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center">
                    <User className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-white text-base">Author Details</CardTitle>
                    <CardDescription className="text-white/70 text-xs">Your contact information for this submission</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-5 space-y-4" style={{ background: "#f8fffe" }}>
                {/* Row 1: Salutation + First Name + Last Name */}
                <div className="grid grid-cols-1 md:grid-cols-[140px_1fr_1fr] gap-4">
                  <FormField
                    control={form.control}
                    name="salutation"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Salutation</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="focus:ring-[#015845] border-gray-200">
                              <SelectValue placeholder="Title" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {SALUTATIONS.map((s) => (
                              <SelectItem key={s} value={s}>{s}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name <span className="text-red-500">*</span></FormLabel>
                        <FormControl>
                          <Input placeholder="Enter your first name" className="focus-visible:ring-[#015845] border-gray-200" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Name <span className="text-red-500">*</span></FormLabel>
                        <FormControl>
                          <Input placeholder="Enter your last name" className="focus-visible:ring-[#015845] border-gray-200" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Row 2: Email + Organization */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email <span className="text-red-500">*</span></FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            readOnly
                            className="bg-gray-50 border-gray-200 text-muted-foreground cursor-not-allowed"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="organization"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Organisation <span className="text-red-500">*</span></FormLabel>
                        <FormControl>
                          <Input placeholder="Enter your organisation name" className="focus-visible:ring-[#015845] border-gray-200" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Row 3: Designation + Phone */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="designation"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Designation <span className="text-red-500">*</span></FormLabel>
                        <FormControl>
                          <Input placeholder="Enter your designation" className="focus-visible:ring-[#015845] border-gray-200" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone <span className="text-muted-foreground font-normal text-xs">(Optional)</span></FormLabel>
                        <FormControl>
                          <Input placeholder="Enter your phone number" className="focus-visible:ring-[#015845] border-gray-200" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Submission Details */}
            <Card className="border-2 overflow-hidden" style={{ borderColor: "#0381ED" }}>
              <CardHeader className="pb-3" style={{ background: "linear-gradient(135deg, #0381ED 0%, #0261b0 100%)" }}>
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center">
                    <FileText className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-white text-base">Submission Details</CardTitle>
                    <CardDescription className="text-white/70 text-xs">Title, country, and keywords for your submission</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-5 space-y-4" style={{ background: "#f0f7ff" }}>
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title <span className="text-red-500">*</span></FormLabel>
                      <FormControl>
                        <Input placeholder="Enter a clear, descriptive title" className="text-base focus-visible:ring-[#0381ED] border-gray-200" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Multi-country select */}
                <FormField
                  control={form.control}
                  name="countries"
                  render={() => (
                    <FormItem className="flex flex-col">
                      <FormLabel className="flex items-center gap-1">
                        <Globe className="h-3.5 w-3.5" />
                        Country / Countries <span className="text-red-500">*</span>
                      </FormLabel>
                      <Popover open={countryOpen} onOpenChange={setCountryOpen}>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={countryOpen}
                              className={cn(
                                "w-full justify-between font-normal min-h-[40px] h-auto border-gray-200 focus-visible:ring-[#0381ED]",
                                selectedCountries.length === 0 && "text-muted-foreground"
                              )}
                            >
                              <div className="flex flex-wrap gap-1 flex-1 text-left">
                                {selectedCountries.length === 0 ? (
                                  <span>Select countries...</span>
                                ) : (
                                  selectedCountries.map((c) => (
                                    <Badge
                                      key={c}
                                      variant="secondary"
                                      className="text-xs gap-1 pr-1"
                                      style={{ background: "#0381ED20", color: "#0381ED", borderColor: "#0381ED40" }}
                                    >
                                      {c}
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          const newVal = selectedCountries.filter((v) => v !== c);
                                          form.setValue("countries", newVal);
                                        }}
                                        className="hover:opacity-70"
                                      >
                                        <X className="h-3 w-3" />
                                      </button>
                                    </Badge>
                                  ))
                                )}
                              </div>
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-[320px] p-0" align="start">
                          <Command>
                            <CommandInput placeholder="Search countries..." />
                            <CommandList className="max-h-[260px]">
                              <CommandEmpty>No country found.</CommandEmpty>
                              <CommandGroup>
                                {COUNTRIES.map((country) => {
                                  const isSelected = selectedCountries.includes(country);
                                  return (
                                    <CommandItem
                                      key={country}
                                      value={country}
                                      onSelect={() => {
                                        const newVal = isSelected
                                          ? selectedCountries.filter((v) => v !== country)
                                          : [...selectedCountries, country];
                                        form.setValue("countries", newVal);
                                        form.clearErrors("countries");
                                      }}
                                    >
                                      <div className={cn(
                                        "mr-2 flex h-4 w-4 items-center justify-center rounded border",
                                        isSelected ? "border-[#0381ED] bg-[#0381ED]" : "border-gray-300"
                                      )}>
                                        {isSelected && <Check className="h-3 w-3 text-white" />}
                                      </div>
                                      {country}
                                    </CommandItem>
                                  );
                                })}
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
                  control={form.control}
                  name="keywords"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Keywords <span className="text-muted-foreground font-normal">(Optional)</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g. water governance, sanitation finance, youth innovation"
                          className="focus-visible:ring-[#0381ED] border-gray-200"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <input type="hidden" {...form.register("track")} />
              </CardContent>
            </Card>

            {/* Custom Fields */}
            {formFields && formFields.length > 0 && (
              <Card className="border-border">
                <CardHeader>
                  <CardTitle>Additional Information</CardTitle>
                  <CardDescription>Please complete the fields below as required.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {formFields.map((field) => (
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
                            {(field.options as string[]).map((opt) => (
                              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      {field.type === "checkbox" && (
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id={`field-${field.id}`}
                            checked={customFieldValues[field.id] === "true"}
                            onCheckedChange={(checked) => setCustomValue(field.id, checked ? "true" : "false")}
                          />
                          <label htmlFor={`field-${field.id}`} className="text-sm text-muted-foreground cursor-pointer">
                            {field.label}
                          </label>
                        </div>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* File Upload */}
            <Card className="border-border">
              <CardHeader>
                <CardTitle>Upload Documents</CardTitle>
                <CardDescription>
                  Attach one or more files (PDF, DOCX, PPT, or image, up to 20 MB each). All files will be submitted for review.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* List of already-queued files */}
                {uploadedFiles.map((f, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3 rounded-xl border-2" style={{ borderColor: "#015845", background: "#015845" + "0d" }}>
                    <FileText className="h-6 w-6 flex-shrink-0" style={{ color: "#015845" }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{f.originalName}</p>
                      <p className="text-xs text-muted-foreground">Ready to submit</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setUploadedFiles((prev) => prev.filter((_, i) => i !== idx))}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}

                {/* Upload trigger */}
                <label className={`flex items-center justify-center gap-2 border-2 border-dashed rounded-xl p-6 cursor-pointer transition-colors hover:bg-muted/40 ${fileUploadState === "uploading" ? "opacity-60 pointer-events-none" : ""}`} style={{ borderColor: "#015845" }}>
                  <div className="h-9 w-9 rounded-full flex items-center justify-center shrink-0" style={{ background: "#015845" + "1a" }}>
                    <Upload className="h-5 w-5" style={{ color: "#015845" }} />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-foreground">
                      {fileUploadState === "uploading" ? `Uploading… ${fileUploadProgress}%` : uploadedFiles.length > 0 ? "Add another file" : "Click to upload"}
                    </p>
                    <p className="text-xs text-muted-foreground">PDF, DOCX, PPT, or image, up to 20 MB</p>
                  </div>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,image/*"
                    onChange={handleFileChange}
                    className="hidden"
                    disabled={fileUploadState === "uploading"}
                  />
                </label>

                {fileUploadState === "uploading" && (
                  <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${fileUploadProgress}%`, background: "#015845" }} />
                  </div>
                )}
                {fileUploadState === "error" && (
                  <p className="text-xs text-destructive">Upload failed — please try again.</p>
                )}
              </CardContent>
            </Card>

            {/* Submit / Save */}
            <div className="flex flex-col sm:flex-row justify-between gap-3 pb-8">
              <Button
                type="button"
                variant="outline"
                onClick={onSaveDraftDirect}
                disabled={isPending}
                className="gap-2 border-[#015845] text-[#015845] hover:bg-[#015845]/10"
              >
                <Save className="h-4 w-4" /> Save Draft
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="gap-2 text-white font-semibold shadow-lg"
                style={{ background: "#015845" }}
              >
                <Send className="h-4 w-4" />
                {isPending ? "Submitting…" : "Submit"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
