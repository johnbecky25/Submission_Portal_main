import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Settings, Mail, Save, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

type PortalSettings = {
  id: number;
  eventName: string;
  messageNotificationEmails: string | null;
};

async function fetchSettings(): Promise<PortalSettings> {
  const res = await fetch("/api/conf/settings", { credentials: "include" });
  if (!res.ok) throw new Error("Failed to load settings");
  return res.json();
}

async function patchSettings(data: Partial<PortalSettings>): Promise<PortalSettings> {
  const res = await fetch("/api/conf/settings", {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Failed to save");
  return res.json();
}

function parseEmails(raw: string | null | undefined): string[] {
  if (!raw?.trim()) return [];
  return raw.split(/[\n,]+/).map(e => e.trim()).filter(Boolean);
}

export default function SettingsPage() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: settings, isLoading } = useQuery<PortalSettings>({
    queryKey: ["conf-settings"],
    queryFn: fetchSettings,
  });

  const [emailsText, setEmailsText] = useState("");
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (settings) {
      setEmailsText(
        parseEmails(settings.messageNotificationEmails).join("\n")
      );
      setDirty(false);
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: (value: string | null) =>
      patchSettings({ messageNotificationEmails: value }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["conf-settings"] });
      toast({ title: "Settings saved" });
      setDirty(false);
    },
    onError: (e: Error) =>
      toast({ title: "Failed to save", description: e.message, variant: "destructive" }),
  });

  const handleSave = () => {
    const trimmed = emailsText.trim();
    saveMutation.mutate(trimmed || null);
  };

  const handleReset = () => {
    if (settings) {
      setEmailsText(parseEmails(settings.messageNotificationEmails).join("\n"));
      setDirty(false);
    }
  };

  const preview = parseEmails(emailsText);

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-serif font-bold text-foreground flex items-center gap-2">
          <Settings className="h-6 w-6 text-[#015845]" />
          Portal Settings
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">Configure how the portal behaves for your team.</p>
      </div>

      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Mail className="h-4 w-4 text-[#0381ED]" />
            Message Notification Recipients
          </CardTitle>
          <CardDescription>
            When an author sends a message on their submission, notification emails go to these addresses.
            Enter one email per line. Leave empty to automatically notify all admin users.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="h-28 bg-muted/40 rounded-md animate-pulse" />
          ) : (
            <>
              <Textarea
                className="font-mono text-sm resize-none"
                rows={6}
                placeholder={
                  "Leave empty to notify all admins automatically\n\nOr enter specific addresses:\ncoordinator@organisation.org\nreviewer@organisation.org"
                }
                value={emailsText}
                onChange={e => { setEmailsText(e.target.value); setDirty(true); }}
              />

              {preview.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2 font-medium">
                    Currently routing to {preview.length} address{preview.length !== 1 ? "es" : ""}:
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {preview.map(email => (
                      <Badge key={email} variant="secondary" className="font-mono text-xs">
                        {email}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {preview.length === 0 && !isLoading && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/30 rounded-lg px-3 py-2">
                  <span className="text-base">ℹ️</span>
                  Notifications will go to all admin and reviewer-admin accounts.
                </div>
              )}

              <div className="flex justify-end gap-2 pt-1">
                {dirty && (
                  <Button variant="ghost" size="sm" onClick={handleReset}>
                    <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                    Reset
                  </Button>
                )}
                <Button
                  size="sm"
                  disabled={saveMutation.isPending || !dirty}
                  onClick={handleSave}
                  style={{ background: "#015845" }}
                  className="text-white hover:opacity-90"
                >
                  <Save className="h-3.5 w-3.5 mr-1.5" />
                  {saveMutation.isPending ? "Saving…" : "Save changes"}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
