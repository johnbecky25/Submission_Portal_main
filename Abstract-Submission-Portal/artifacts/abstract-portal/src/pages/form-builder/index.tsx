import React, { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  useListFormFields,
  useCreateFormField,
  useUpdateFormField,
  useDeleteFormField,
  useReorderFormFields,
  getListFormFieldsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { getApiErrorMessage } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { Plus, Pencil, Trash2, ChevronUp, ChevronDown, GripVertical, Settings, Lock, Eye, EyeOff } from "lucide-react";

const BUILTIN_FIELDS = [
  { label: "Submission Title", type: "Short text", required: true },
  { label: "Submission Type / Track", type: "Dropdown", required: true },
  { label: "Submission Body", type: "Long text", required: true },
  { label: "Country of Affiliation", type: "Combobox", required: true },
  { label: "Keywords", type: "Short text", required: false },
] as const;

const FIELD_TYPES = [
  { value: "text", label: "Short Text" },
  { value: "textarea", label: "Long Text" },
  { value: "number", label: "Number" },
  { value: "dropdown", label: "Dropdown" },
  { value: "checkbox", label: "Checkbox" },
] as const;

const fieldSchema = z.object({
  label: z.string().min(1, "Label is required"),
  type: z.enum(["text", "textarea", "number", "dropdown", "checkbox"]),
  required: z.boolean(),
  optionsRaw: z.string().optional(),
});

type FieldFormData = z.infer<typeof fieldSchema>;

function parseOptions(raw: string | undefined): string[] | null {
  if (!raw || raw.trim() === "") return null;
  return raw
    .split("\n")
    .map((o) => o.trim())
    .filter(Boolean);
}

interface EditingField {
  id?: number;
  label?: string;
  type?: FieldFormData["type"];
  required?: boolean;
  optionsRaw?: string;
}

interface FieldDialogProps {
  open: boolean;
  onClose: () => void;
  defaultValues?: EditingField;
  mode: "create" | "edit";
}

function FieldDialog({ open, onClose, defaultValues, mode }: FieldDialogProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const createMutation = useCreateFormField();
  const updateMutation = useUpdateFormField();

  const form = useForm<FieldFormData>({
    resolver: zodResolver(fieldSchema),
    defaultValues: {
      label: defaultValues?.label || "",
      type: defaultValues?.type || "text",
      required: defaultValues?.required ?? false,
      optionsRaw: defaultValues?.optionsRaw || "",
    },
  });

  React.useEffect(() => {
    if (open) {
      form.reset({
        label: defaultValues?.label || "",
        type: defaultValues?.type || "text",
        required: defaultValues?.required ?? false,
        optionsRaw: defaultValues?.optionsRaw || "",
      });
    }
  }, [open]);

  const watchedType = form.watch("type");

  const onSubmit = (data: FieldFormData) => {
    const options = data.type === "dropdown" ? parseOptions(data.optionsRaw) : null;
    const payload = {
      label: data.label,
      type: data.type,
      required: data.required,
      options,
    };

    if (mode === "create") {
      createMutation.mutate(
        { data: payload },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListFormFieldsQueryKey() });
            toast({ title: "Field created" });
            onClose();
          },
          onError: (err: unknown) => {
            toast({ title: "Failed to create field", description: getApiErrorMessage(err), variant: "destructive" });
          },
        }
      );
    } else {
      updateMutation.mutate(
        { id: defaultValues!.id!, data: payload },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListFormFieldsQueryKey() });
            toast({ title: "Field updated" });
            onClose();
          },
          onError: (err: unknown) => {
            toast({ title: "Failed to update field", description: getApiErrorMessage(err), variant: "destructive" });
          },
        }
      );
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Add New Field" : "Edit Field"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
            <FormField
              control={form.control}
              name="label"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Label</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Organisation Name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Field Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {FIELD_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {watchedType === "dropdown" && (
              <FormField
                control={form.control}
                name="optionsRaw"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Options (one per line)</FormLabel>
                    <FormControl>
                      <textarea
                        className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-y"
                        placeholder={"Option A\nOption B\nOption C"}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="required"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <FormLabel className="text-sm font-medium">Required</FormLabel>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Submitters must fill this in before submitting
                    </p>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={onClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                style={{ background: "#015845" }}
                className="hover:opacity-90"
              >
                {mode === "create" ? "Add Field" : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function FormBuilder() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: fields, isLoading } = useListFormFields();
  const deleteMutation = useDeleteFormField();
  const reorderMutation = useReorderFormFields();
  const toggleActiveMutation = useUpdateFormField();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingField, setEditingField] = useState<EditingField | null>(null);
  const [deleteFieldId, setDeleteFieldId] = useState<number | null>(null);

  const handleMove = (index: number, direction: "up" | "down") => {
    if (!fields) return;
    const newFields = [...fields];
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= newFields.length) return;
    [newFields[index], newFields[swapIndex]] = [newFields[swapIndex], newFields[index]];
    const orderedIds = newFields.map((f) => f.id);
    reorderMutation.mutate(
      { data: { orderedIds } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListFormFieldsQueryKey() });
        },
        onError: () => {
          toast({ title: "Failed to reorder fields", variant: "destructive" });
        },
      }
    );
  };

  const handleDelete = () => {
    if (deleteFieldId == null) return;
    deleteMutation.mutate(
      { id: deleteFieldId },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListFormFieldsQueryKey() });
          toast({ title: "Field deleted" });
          setDeleteFieldId(null);
        },
        onError: () => {
          toast({ title: "Failed to delete field", variant: "destructive" });
          setDeleteFieldId(null);
        },
      }
    );
  };

  const handleToggleActive = (field: { id: number; label: string; active: boolean }) => {
    toggleActiveMutation.mutate(
      { id: field.id, data: { active: !field.active } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListFormFieldsQueryKey() });
          toast({ title: field.active ? `"${field.label}" deactivated` : `"${field.label}" activated` });
        },
        onError: () => {
          toast({ title: "Failed to update field status", variant: "destructive" });
        },
      }
    );
  };

  const openEdit = (field: { id: number; label: string; type: string; required: boolean; options?: string[] | null }) => {
    setEditingField({
      id: field.id,
      label: field.label,
      type: field.type as FieldFormData["type"],
      required: field.required,
      optionsRaw: Array.isArray(field.options) ? field.options.join("\n") : "",
    });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingField(null);
  };

  const fieldTypeLabel = (type: string) =>
    FIELD_TYPES.find((t) => t.value === type)?.label || type;

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground flex items-center gap-3">
            <Settings className="h-7 w-7" style={{ color: "#015845" }} />
            Form Builder
          </h1>
          <p className="text-muted-foreground mt-1">
            Add and manage custom fields that appear in the submission form.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingField(null);
            setDialogOpen(true);
          }}
          style={{ background: "#015845" }}
          className="hover:opacity-90"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Field
        </Button>
      </div>

      <Card className="border-border">
        <CardHeader className="border-b bg-muted/20">
          <CardTitle className="text-base flex items-center gap-2">
            <Lock className="h-4 w-4 text-muted-foreground" /> Built-in Fields
          </CardTitle>
          <CardDescription>
            These core fields are always present on the submission form and cannot be removed.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <ul className="divide-y">
            {BUILTIN_FIELDS.map((field) => (
              <li key={field.label} className="flex items-center gap-4 px-6 py-4 bg-muted/10">
                <div className="text-muted-foreground/20">
                  <Lock className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm truncate text-muted-foreground">{field.label}</span>
                    {field.required && (
                      <span className="text-xs bg-destructive/10 text-destructive px-1.5 py-0.5 rounded-full font-medium">
                        Required
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">{field.type}</span>
                </div>
                <span className="text-xs text-muted-foreground/50 italic shrink-0">Built-in</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card className="border-border">
        <CardHeader className="border-b bg-muted/20">
          <CardTitle className="text-base">Custom Fields</CardTitle>
          <CardDescription>
            These fields appear at the bottom of the submission form in the order shown below.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : !fields || fields.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
              <GripVertical className="h-8 w-8 mb-3 opacity-30" />
              <p className="text-sm font-medium">No custom fields yet</p>
              <p className="text-xs mt-1 max-w-xs">
                Click "Add Field" to create your first custom field. It will appear at the bottom of the
                submission form.
              </p>
            </div>
          ) : (
            <ul className="divide-y">
              {fields.map((field, index) => (
                <li
                  key={field.id}
                  className={`flex items-center gap-4 px-6 py-4 hover:bg-muted/10 transition-colors group ${!field.active ? "opacity-60" : ""}`}
                >
                  <div className="text-muted-foreground/30 group-hover:text-muted-foreground/60 transition-colors">
                    <GripVertical className="h-5 w-5" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate">{field.label}</span>
                      {field.required && (
                        <span className="text-xs bg-destructive/10 text-destructive px-1.5 py-0.5 rounded-full font-medium">
                          Required
                        </span>
                      )}
                      {!field.active && (
                        <span className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full font-medium">
                          Inactive
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs text-muted-foreground">{fieldTypeLabel(field.type)}</span>
                      {field.type === "dropdown" && field.options && (
                        <>
                          <span className="text-xs text-muted-foreground">·</span>
                          <span className="text-xs text-muted-foreground">
                            {(field.options as string[]).length} options
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      onClick={() => handleMove(index, "up")}
                      disabled={index === 0 || reorderMutation.isPending}
                      title="Move up"
                    >
                      <ChevronUp className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      onClick={() => handleMove(index, "down")}
                      disabled={index === (fields?.length ?? 0) - 1 || reorderMutation.isPending}
                      title="Move down"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className={`h-8 w-8 ${field.active ? "text-muted-foreground hover:text-foreground" : "text-amber-500 hover:text-amber-600"}`}
                      onClick={() => handleToggleActive(field)}
                      disabled={toggleActiveMutation.isPending}
                      title={field.active ? "Deactivate field" : "Activate field"}
                    >
                      {field.active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      onClick={() => openEdit(field)}
                      title="Edit field"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-destructive/70 hover:text-destructive hover:bg-destructive/10"
                      onClick={() => setDeleteFieldId(field.id)}
                      title="Delete field"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <div
        className="rounded-xl p-5 border-l-4"
        style={{ background: "#015845", borderLeftColor: "#F5C842" }}
      >
        <p className="text-white font-serif font-bold text-sm mb-1">How it works</p>
        <ul className="text-white/70 text-sm space-y-1 list-disc list-inside">
          <li>Fields appear at the bottom of the submission form under "Additional Information"</li>
          <li>Required fields must be completed before submitting (drafts can be saved without them)</li>
          <li>Use the up/down arrows to control the order fields appear in the form</li>
          <li>Dropdown fields require you to provide the list of options, one per line</li>
        </ul>
      </div>

      <FieldDialog
        open={dialogOpen}
        onClose={closeDialog}
        defaultValues={editingField || undefined}
        mode={editingField ? "edit" : "create"}
      />

      <AlertDialog open={deleteFieldId != null} onOpenChange={(open) => !open && setDeleteFieldId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this field?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the field and all values previously submitted for it. This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
            >
              Delete Field
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
