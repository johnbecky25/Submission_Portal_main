import React, { useState, useRef, useCallback } from "react";
import { useAuth } from "@/context/useAuth";
import { useLocation } from "wouter";
import { customFetch } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import {
  Download,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronRight,
  Users,
  FileText,
  Paperclip,
  File as FileIcon,
  X,
} from "lucide-react";

const TRACKS = [
  "System Reforms and Investment Fiches",
  "Country Transformation Snapshots",
  "Youth Led Innovations",
] as const;

const STATUSES = ["draft", "submitted", "under_review", "accepted", "rejected", "on_hold"] as const;

const TEMPLATE_HEADERS = [
  "author_name",
  "author_email",
  "author_expertise",
  "title",
  "track",
  "content",
  "keywords",
  "country",
  "status",
  "reviewer_comments",
  "filename",
];

const REQUIRED_HEADERS = ["author_name", "author_email", "title", "track"];

const TEMPLATE_EXAMPLE_ROWS = [
  [
    "Dr. Aisha Kamara",
    "aisha.kamara@example.org",
    "Water Systems Engineering",
    "Reforming Urban Water Tariff Structures in West Africa",
    "System Reforms and Investment Fiches",
    "This fiche outlines a comprehensive reform of urban water tariff structures across five West African cities...",
    "water tariffs, urban reform, West Africa, financing",
    "Sierra Leone",
    "submitted",
    "",
    "kamara_tariff_reform.pdf",
  ],
  [
    "Kofi Mensah",
    "k.mensah@ministry.gh",
    "Sanitation Policy",
    "Ghana's National Sanitation Strategy 2020-2025: Lessons Learned",
    "Country Transformation Snapshots",
    "Ghana implemented a national sanitation strategy that achieved coverage increases of 30% in peri-urban areas...",
    "Ghana, sanitation, policy, transformation",
    "Ghana",
    "rejected",
    "The submission lacked sufficient data to support its conclusions and did not address the required evaluation criteria for this track.",
    "mensah_ghana_snapshot.docx",
  ],
  [
    "Fatima Al-Rashid",
    "fatima@youthwater.org",
    "Innovation, Water Technology",
    "SolarPure: Low-Cost Solar Water Purification for Rural Communities",
    "Youth Led Innovations",
    "SolarPure is a youth-led innovation that uses locally sourced materials and solar energy to purify water...",
    "solar, purification, rural, innovation, youth",
    "Sudan",
    "submitted",
    "",
    "",
  ],
];

function escapeCsvCell(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function downloadTemplate() {
  const rows = [TEMPLATE_HEADERS, ...TEMPLATE_EXAMPLE_ROWS];
  const csv = rows.map((r) => r.map(escapeCsvCell).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "submission_import_template.csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') { cell += '"'; i++; }
      else if (ch === '"') { inQuotes = false; }
      else { cell += ch; }
    } else {
      if (ch === '"') { inQuotes = true; }
      else if (ch === ",") { row.push(cell); cell = ""; }
      else if (ch === "\n" || (ch === "\r" && next === "\n")) {
        if (ch === "\r") i++;
        row.push(cell); cell = "";
        if (row.some((c) => c.trim())) rows.push(row);
        row = [];
      } else if (ch === "\r") {
        row.push(cell); cell = "";
        if (row.some((c) => c.trim())) rows.push(row);
        row = [];
      } else { cell += ch; }
    }
  }
  if (cell || row.length) { row.push(cell); if (row.some((c) => c.trim())) rows.push(row); }
  return rows;
}

interface ParsedRow {
  author_name: string;
  author_email: string;
  author_expertise: string;
  title: string;
  track: string;
  content: string;
  keywords: string;
  country: string;
  status: string;
  reviewer_comments: string;
  filename: string;
  _rowNum: number;
  _valid: boolean;
  _errors: string[];
}

function normalizeTrack(raw: string): string {
  const cleaned = raw?.trim() ?? "";
  // Accept "Call for Youth Led Innovations" → "Youth Led Innovations" etc.
  const stripped = cleaned.replace(/^call\s+for\s+/i, "");
  // Try exact match first, then stripped
  if (TRACKS.includes(cleaned as any)) return cleaned;
  if (TRACKS.includes(stripped as any)) return stripped;
  return cleaned; // return as-is so the error message shows the bad value
}

function validateRow(row: Record<string, string>, rowNum: number): ParsedRow {
  const errors: string[] = [];
  if (!row.author_name?.trim()) errors.push("author_name required");
  if (!row.author_email?.trim()) errors.push("author_email required");
  if (!row.title?.trim()) errors.push("title required");
  const track = normalizeTrack(row.track ?? "");
  if (!TRACKS.includes(track as any)) errors.push(`track must be one of the 3 call types`);
  const status = row.status?.trim() || "submitted";
  if (!STATUSES.includes(status as any)) errors.push(`invalid status value`);

  return {
    author_name: row.author_name?.trim() ?? "",
    author_email: row.author_email?.trim() ?? "",
    author_expertise: row.author_expertise?.trim() ?? "",
    title: row.title?.trim() ?? "",
    track,
    content: row.content?.trim() ?? "",
    keywords: row.keywords?.trim() ?? "",
    country: row.country?.trim() ?? "",
    status,
    reviewer_comments: row.reviewer_comments?.trim() ?? "",
    filename: row.filename?.trim() ?? "",
    _rowNum: rowNum,
    _valid: errors.length === 0,
    _errors: errors,
  };
}

interface ImportResult {
  created: number;
  skipped: number;
  newAuthors: number;
  errors: string[];
}

async function uploadFile(file: File, onProgress?: (pct: number) => void): Promise<{ objectPath: string; originalName: string }> {
  const urlRes = await fetch("/api/storage/uploads/request-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type || "application/octet-stream" }),
  });
  if (!urlRes.ok) throw new Error("Failed to get upload URL");
  const { uploadURL, objectPath } = await urlRes.json();

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadURL);
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
    xhr.upload.onprogress = (ev) => {
      if (ev.lengthComputable && onProgress) onProgress(Math.round((ev.loaded / ev.total) * 100));
    };
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Upload failed: ${xhr.status}`)));
    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.send(file);
  });

  return { objectPath, originalName: file.name };
}

export default function ImportPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const csvInputRef = useRef<HTMLInputElement>(null);
  const filesInputRef = useRef<HTMLInputElement>(null);

  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [csvFileName, setCsvFileName] = useState<string | null>(null);
  const [fileMap, setFileMap] = useState<Map<string, File>>(new Map());
  const [importing, setImporting] = useState(false);
  const [importPhase, setImportPhase] = useState<"idle" | "uploading" | "importing">("idle");
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number; pct: number }>({ current: 0, total: 0, pct: 0 });
  const [result, setResult] = useState<ImportResult | null>(null);
  const [csvDragOver, setCsvDragOver] = useState(false);
  const [filesDragOver, setFilesDragOver] = useState(false);

  if (user?.role !== "admin") { setLocation("/dashboard"); return null; }

  const processCsv = useCallback((file: File) => {
    if (!file.name.endsWith(".csv")) {
      toast({ title: "Invalid file", description: "Please upload a .csv file.", variant: "destructive" });
      return;
    }
    setCsvFileName(file.name);
    setResult(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = (e.target?.result as string) ?? "";
      const rows = parseCsv(text);
      if (rows.length < 2) { toast({ title: "Empty file", description: "No data rows found.", variant: "destructive" }); return; }
      const headers = rows[0].map((h) => h.trim().toLowerCase().replace(/\s+/g, "_"));
      const dataRows = rows.slice(1);
      const parsed = dataRows.map((cells, i) => {
        const rowObj: Record<string, string> = {};
        headers.forEach((h, j) => { rowObj[h] = cells[j] ?? ""; });
        return validateRow(rowObj, i + 2);
      });
      setParsedRows(parsed);
    };
    reader.readAsText(file);
  }, [toast]);

  const addFiles = useCallback((incoming: FileList | File[]) => {
    const arr = Array.from(incoming);
    const valid = arr.filter((f) => {
      const ext = f.name.split(".").pop()?.toLowerCase();
      return ext === "pdf" || ext === "doc" || ext === "docx";
    });
    if (valid.length < arr.length) {
      toast({ title: "Some files skipped", description: "Only PDF and DOCX files are accepted.", variant: "destructive" });
    }
    setFileMap((prev) => {
      const next = new Map(prev);
      valid.forEach((f) => next.set(f.name.toLowerCase(), f));
      return next;
    });
  }, [toast]);

  const removeFile = (key: string) => {
    setFileMap((prev) => { const next = new Map(prev); next.delete(key); return next; });
  };

  const validRows = parsedRows.filter((r) => r._valid);
  const invalidRows = parsedRows.filter((r) => !r._valid);
  const rowsWithFile = validRows.filter((r) => r.filename && fileMap.has(r.filename.toLowerCase()));
  const rowsWantingFile = validRows.filter((r) => r.filename);
  const unmatchedFiles = Array.from(fileMap.entries()).filter(([key]) =>
    !parsedRows.some((r) => r.filename.toLowerCase() === key)
  );

  const trackShort = (t: string) => {
    if (t.startsWith("System")) return "System Reforms";
    if (t.startsWith("Country")) return "Country Snapshots";
    if (t.startsWith("Youth")) return "Youth Innovations";
    return t;
  };

  const handleImport = async () => {
    if (validRows.length === 0) return;
    setImporting(true);
    setResult(null);

    try {
      const fileUploads = new Map<string, { objectPath: string; originalName: string }>();

      if (rowsWithFile.length > 0) {
        setImportPhase("uploading");
        setUploadProgress({ current: 0, total: rowsWithFile.length, pct: 0 });

        for (let i = 0; i < rowsWithFile.length; i++) {
          const row = rowsWithFile[i];
          const file = fileMap.get(row.filename.toLowerCase())!;
          try {
            const result = await uploadFile(file, () => {});
            fileUploads.set(row.filename.toLowerCase(), result);
          } catch (err: any) {
            toast({ title: `File upload failed: ${file.name}`, description: err?.message, variant: "destructive" });
          }
          setUploadProgress({ current: i + 1, total: rowsWithFile.length, pct: Math.round(((i + 1) / rowsWithFile.length) * 100) });
        }
      }

      setImportPhase("importing");

      const body = {
        rows: validRows.map(({ author_name, author_email, author_expertise, title, track, content, keywords, country, status, reviewer_comments, filename }) => {
          const fileInfo = filename ? fileUploads.get(filename.toLowerCase()) : undefined;
          return {
            author_name, author_email, author_expertise, title, track, content, keywords, country, status,
            ...(reviewer_comments ? { reviewer_comments } : {}),
            ...(fileInfo ? { file_object_path: fileInfo.objectPath, file_original_name: fileInfo.originalName } : {}),
          };
        }),
      };

      const data = await customFetch<ImportResult>("/api/admin/import-submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        credentials: "include",
      });

      setResult(data);

      toast({
        title: "Import complete",
        description: `${data.created} submission${data.created !== 1 ? "s" : ""} imported. ${data.newAuthors} new account${data.newAuthors !== 1 ? "s" : ""} created.`,
      });
    } catch (err: any) {
      toast({ title: "Import failed", description: err?.message ?? "Unknown error", variant: "destructive" });
    } finally {
      setImporting(false);
      setImportPhase("idle");
    }
  };

  const handleReset = () => {
    setParsedRows([]);
    setCsvFileName(null);
    setFileMap(new Map());
    setResult(null);
    if (csvInputRef.current) csvInputRef.current.value = "";
    if (filesInputRef.current) filesInputRef.current.value = "";
  };

  const phaseLabel = importPhase === "uploading"
    ? `Uploading files… (${uploadProgress.current}/${uploadProgress.total})`
    : importPhase === "importing"
    ? "Creating submissions…"
    : `Import ${validRows.length} Submission${validRows.length !== 1 ? "s" : ""}${rowsWithFile.length > 0 ? ` + ${rowsWithFile.length} file${rowsWithFile.length !== 1 ? "s" : ""}` : ""}`;

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-5xl mx-auto p-6 space-y-6">

        <div>
          <h1 className="text-2xl font-bold text-foreground">Import Submissions</h1>
          <p className="text-muted-foreground mt-1">
            Bulk-import existing submissions with their PDF/DOCX files. New authors receive a welcome email with login credentials.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { n: 1, title: "Download Template", desc: "Get the CSV with required columns including an optional filename column" },
            { n: 2, title: "Fill In Data", desc: "Copy submission data from Zoho. Add the filename for each row that has a file" },
            { n: 3, title: "Upload CSV", desc: "Upload your completed CSV and review the validation preview" },
            { n: 4, title: "Add Files & Import", desc: "Drop in all the PDFs/DOCXs — they're matched by filename and attached automatically" },
          ].map(({ n, title, desc }) => (
            <Card key={n} className="border-2">
              <CardContent className="pt-5 pb-4">
                <div className="flex items-start gap-3">
                  <div className="h-7 w-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ background: "#015845" }}>{n}</div>
                  <div>
                    <p className="font-semibold text-sm">{title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4" style={{ color: "#015845" }} />
              CSV Template
            </CardTitle>
            <CardDescription>
              Download the template, fill in your data, then upload it below. The <code className="bg-muted px-1 rounded text-xs">filename</code> column is optional — fill it in for any submission that has a PDF or DOCX file.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="overflow-x-auto rounded-md border">
              <table className="text-xs w-full">
                <thead>
                  <tr className="bg-muted/50">
                    {TEMPLATE_HEADERS.map((h) => (
                      <th key={h} className="px-3 py-2 text-left font-semibold whitespace-nowrap border-r last:border-r-0">
                        {h}
                        {REQUIRED_HEADERS.includes(h) && <span className="ml-1 text-red-500">*</span>}
                        {h === "filename" && <span className="ml-1 text-blue-500 font-normal">(file)</span>}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t">
                    <td className="px-3 py-2 text-muted-foreground italic border-r" colSpan={11}>
                      3 example rows are included in the download
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <ul className="space-y-1 text-sm text-muted-foreground">
              {[
                <><strong className="text-foreground">reviewer_comments</strong> — paste the rejection reason or reviewer remarks from your old system here. The system will attach it as a completed review so the author can see it in the portal. Leave blank if there are no remarks.</>,
                <><strong className="text-foreground">filename</strong> — the exact name of the PDF or DOCX file for this submission (e.g. <code className="bg-muted px-1 rounded text-xs">smith_submission.pdf</code>). Leave blank if there's no file. Supported formats: PDF, DOC, DOCX.</>,
                <><strong className="text-foreground">track</strong> — one of: <em>System Reforms and Investment Fiches</em> | <em>Country Transformation Snapshots</em> | <em>Youth Led Innovations</em>. The "Call for …" prefix is accepted automatically (e.g. <em>Call for Youth Led Innovations</em> is valid).</>,
                <><strong className="text-foreground">status</strong> — optional, defaults to <code className="bg-muted px-1 rounded text-xs">submitted</code>. Options: draft | submitted | under_review | accepted | rejected | on_hold</>,
                <>If an author email already exists in the system, their existing account is used and no welcome email is sent</>,
              ].map((item, i) => (
                <li key={i} className="flex gap-2">
                  <ChevronRight className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: "#015845" }} />
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <Button onClick={downloadTemplate} style={{ background: "#015845" }} className="text-white hover:opacity-90">
              <Download className="h-4 w-4 mr-2" />
              Download Template (CSV)
            </Button>
          </CardContent>
        </Card>

        {!result && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Upload className="h-4 w-4" style={{ color: "#015845" }} />
                Step 1 — Upload Your CSV
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${csvDragOver ? "border-[#015845] bg-green-50" : "border-muted-foreground/25 hover:border-[#015845]/50 hover:bg-muted/30"}`}
                onClick={() => csvInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setCsvDragOver(true); }}
                onDragLeave={() => setCsvDragOver(false)}
                onDrop={(e) => { e.preventDefault(); setCsvDragOver(false); const f = e.dataTransfer.files[0]; if (f) processCsv(f); }}
              >
                <FileSpreadsheet className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                {csvFileName ? (
                  <div>
                    <p className="font-semibold text-foreground">{csvFileName}</p>
                    <p className="text-sm text-muted-foreground mt-1">{parsedRows.length} rows parsed — {validRows.length} valid, {invalidRows.length} with errors</p>
                  </div>
                ) : (
                  <div>
                    <p className="font-semibold text-foreground">Drop your CSV here or click to browse</p>
                    <p className="text-sm text-muted-foreground mt-1">Only .csv files accepted</p>
                  </div>
                )}
              </div>
              <input ref={csvInputRef} type="file" accept=".csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) processCsv(f); }} />
            </CardContent>
          </Card>
        )}

        {parsedRows.length > 0 && !result && (
          <>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Paperclip className="h-4 w-4" style={{ color: "#015845" }} />
                  Step 2 — Add PDF / DOCX Files (Optional)
                </CardTitle>
                <CardDescription>
                  Drop in all the submission files at once. The system matches them to CSV rows using the <code className="bg-muted px-1 rounded text-xs">filename</code> column — filenames must match exactly.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div
                  className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${filesDragOver ? "border-[#0381ED] bg-blue-50" : "border-muted-foreground/25 hover:border-[#0381ED]/50 hover:bg-muted/30"}`}
                  onClick={() => filesInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setFilesDragOver(true); }}
                  onDragLeave={() => setFilesDragOver(false)}
                  onDrop={(e) => { e.preventDefault(); setFilesDragOver(false); addFiles(e.dataTransfer.files); }}
                >
                  <Paperclip className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                  <p className="font-semibold text-foreground">Drop PDF / DOCX files here or click to browse</p>
                  <p className="text-sm text-muted-foreground mt-1">You can select multiple files at once. Accepted: PDF, DOC, DOCX</p>
                </div>
                <input ref={filesInputRef} type="file" accept=".pdf,.doc,.docx" multiple className="hidden"
                  onChange={(e) => { if (e.target.files) addFiles(e.target.files); e.target.value = ""; }} />

                {fileMap.size > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">{fileMap.size} file{fileMap.size !== 1 ? "s" : ""} loaded:</p>
                    <div className="space-y-1 max-h-48 overflow-y-auto">
                      {Array.from(fileMap.entries()).map(([key, file]) => {
                        const isMatched = parsedRows.some((r) => r.filename.toLowerCase() === key);
                        return (
                          <div key={key} className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm border ${isMatched ? "bg-green-50 border-green-200" : "bg-amber-50 border-amber-200"}`}>
                            <FileIcon className={`h-4 w-4 flex-shrink-0 ${isMatched ? "text-green-600" : "text-amber-500"}`} />
                            <span className="flex-1 font-mono text-xs truncate">{file.name}</span>
                            <span className="text-xs text-muted-foreground whitespace-nowrap">{(file.size / 1024).toFixed(0)} KB</span>
                            {isMatched
                              ? <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                              : <span className="text-xs text-amber-600 whitespace-nowrap">no match in CSV</span>
                            }
                            <button onClick={() => removeFile(key)} className="text-muted-foreground hover:text-red-500 flex-shrink-0">
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                    {unmatchedFiles.length > 0 && (
                      <Alert className="border-amber-200 bg-amber-50 py-3">
                        <AlertCircle className="h-4 w-4 text-amber-600" />
                        <AlertDescription className="text-sm text-amber-800">
                          <strong>{unmatchedFiles.length} file{unmatchedFiles.length !== 1 ? "s" : ""}</strong> don't match any row in the CSV. Check that the filename in the CSV matches exactly (including extension and capitalisation).
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                )}

                {rowsWantingFile.length > 0 && (
                  <div className="text-sm text-muted-foreground bg-muted/40 rounded-md px-4 py-3 space-y-1">
                    <p className="font-medium text-foreground">File matching summary</p>
                    <p>{rowsWantingFile.length} CSV row{rowsWantingFile.length !== 1 ? "s have" : " has"} a filename — {rowsWithFile.length} matched, {rowsWantingFile.length - rowsWithFile.length} unmatched</p>
                    {rowsWantingFile.length - rowsWithFile.length > 0 && (
                      <p className="text-amber-700">Unmatched rows will still be imported — just without a file attached.</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <CardTitle className="text-base">Step 3 — Review &amp; Import</CardTitle>
                    <CardDescription>{parsedRows.length} rows parsed — review before importing</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-green-700 border-green-300 bg-green-50">
                      <CheckCircle2 className="h-3 w-3 mr-1" />{validRows.length} valid
                    </Badge>
                    {invalidRows.length > 0 && (
                      <Badge variant="outline" className="text-red-700 border-red-300 bg-red-50">
                        <XCircle className="h-3 w-3 mr-1" />{invalidRows.length} invalid
                      </Badge>
                    )}
                    {rowsWithFile.length > 0 && (
                      <Badge variant="outline" className="text-blue-700 border-blue-300 bg-blue-50">
                        <Paperclip className="h-3 w-3 mr-1" />{rowsWithFile.length} with file
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {invalidRows.length > 0 && (
                  <Alert variant="destructive" className="py-3">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-sm">
                      <strong>{invalidRows.length} row{invalidRows.length !== 1 ? "s" : ""}</strong> will be skipped due to validation errors. Fix the CSV and re-upload to include them.
                    </AlertDescription>
                  </Alert>
                )}

                <div className="overflow-x-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="w-8">#</TableHead>
                        <TableHead className="w-8"></TableHead>
                        <TableHead>Author</TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead>Track</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>File</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {parsedRows.map((row) => {
                        const fileMatched = row.filename && fileMap.has(row.filename.toLowerCase());
                        return (
                          <TableRow key={row._rowNum} className={!row._valid ? "bg-red-50/50" : ""}>
                            <TableCell className="text-muted-foreground text-xs">{row._rowNum}</TableCell>
                            <TableCell>
                              {row._valid ? (
                                <CheckCircle2 className="h-4 w-4 text-green-600" />
                              ) : (
                                <div title={row._errors.join("; ")}>
                                  <XCircle className="h-4 w-4 text-red-500" />
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="text-sm">
                              <p className="font-medium">{row.author_name || <span className="italic text-muted-foreground">—</span>}</p>
                              <p className="text-xs text-muted-foreground">{row.author_email}</p>
                            </TableCell>
                            <TableCell className="text-sm max-w-[180px] truncate">{row.title || <span className="italic text-muted-foreground">—</span>}</TableCell>
                            <TableCell>
                              {row.track ? <Badge variant="secondary" className="text-xs">{trackShort(row.track)}</Badge> : <span className="text-red-500 text-xs">missing</span>}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs capitalize">{row.status || "submitted"}</Badge>
                            </TableCell>
                            <TableCell>
                              {row.filename ? (
                                fileMatched ? (
                                  <div className="flex items-center gap-1 text-green-700 text-xs">
                                    <Paperclip className="h-3 w-3" />
                                    <span className="font-mono truncate max-w-[100px]">{row.filename}</span>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1 text-amber-600 text-xs">
                                    <AlertCircle className="h-3 w-3" />
                                    <span className="font-mono truncate max-w-[100px]" title={row.filename}>not uploaded</span>
                                  </div>
                                )
                              ) : (
                                <span className="text-muted-foreground text-xs">—</span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                {importing && importPhase === "uploading" && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Uploading files…</span>
                      <span className="font-medium">{uploadProgress.current} / {uploadProgress.total}</span>
                    </div>
                    <Progress value={uploadProgress.pct} className="h-2" />
                  </div>
                )}

                <div className="flex items-center gap-3 pt-2">
                  <Button
                    onClick={handleImport}
                    disabled={importing || validRows.length === 0}
                    className="text-white"
                    style={{ background: "#015845" }}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {importing ? phaseLabel : phaseLabel}
                  </Button>
                  <Button variant="outline" onClick={handleReset} disabled={importing}>
                    Clear &amp; Start Over
                  </Button>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {result && (
          <Card className="border-2 border-green-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2 text-green-800">
                <CheckCircle2 className="h-5 w-5" />
                Import Complete
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 rounded-lg bg-green-50 border border-green-200">
                  <FileText className="h-6 w-6 mx-auto mb-1" style={{ color: "#015845" }} />
                  <p className="text-2xl font-bold" style={{ color: "#015845" }}>{result.created}</p>
                  <p className="text-xs text-muted-foreground">Submissions imported</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-blue-50 border border-blue-200">
                  <Users className="h-6 w-6 mx-auto mb-1 text-blue-600" />
                  <p className="text-2xl font-bold text-blue-700">{result.newAuthors}</p>
                  <p className="text-xs text-muted-foreground">New accounts created</p>
                </div>
                <div className={`text-center p-4 rounded-lg border ${result.skipped > 0 ? "bg-red-50 border-red-200" : "bg-gray-50 border-gray-200"}`}>
                  <XCircle className={`h-6 w-6 mx-auto mb-1 ${result.skipped > 0 ? "text-red-500" : "text-gray-400"}`} />
                  <p className={`text-2xl font-bold ${result.skipped > 0 ? "text-red-700" : "text-gray-500"}`}>{result.skipped}</p>
                  <p className="text-xs text-muted-foreground">Rows skipped</p>
                </div>
              </div>

              {result.newAuthors > 0 && (
                <Alert className="border-blue-200 bg-blue-50">
                  <AlertCircle className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-sm text-blue-800">
                    Welcome emails with login credentials have been sent to all <strong>{result.newAuthors} new author{result.newAuthors !== 1 ? "s" : ""}</strong>.
                    Existing authors were matched to their existing accounts — no duplicate email was sent.
                  </AlertDescription>
                </Alert>
              )}

              {result.errors.length > 0 && (
                <div className="space-y-1">
                  <p className="text-sm font-medium text-red-700">Errors during import:</p>
                  <ul className="text-xs text-red-600 space-y-0.5 max-h-40 overflow-y-auto border rounded-md p-3 bg-red-50">
                    {result.errors.map((e, i) => <li key={i}>{e}</li>)}
                  </ul>
                </div>
              )}

              <div className="flex gap-3">
                <Button onClick={handleReset} style={{ background: "#015845" }} className="text-white hover:opacity-90">
                  Import More
                </Button>
                <Button variant="outline" onClick={() => setLocation("/abstracts")}>
                  View All Submissions
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
