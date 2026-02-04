import { useState, useRef, useEffect } from "react";
import { Upload, Loader2, Trash2, Image as ImageIcon, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAnuncios, type ExtractedRawMetrics } from "@/hooks/useAnuncios";
import { Label } from "@/components/ui/label";

interface AnunciosTableProps {
  tipo: "DNZ" | "SV";
}

const ANOS = [2024, 2025, 2026];

// Editable cell for this table
function EditableTableCell({ 
  value, 
  onSave, 
  isNumber = false,
  prefix = "",
  suffix = ""
}: { 
  value: string; 
  onSave: (v: string) => void; 
  isNumber?: boolean;
  prefix?: string;
  suffix?: string;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleBlur = () => {
    setIsEditing(false);
    if (editValue !== value) {
      onSave(editValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleBlur();
    if (e.key === "Escape") {
      setEditValue(value);
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        autoFocus
        type={isNumber ? "number" : "text"}
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className="w-full px-2 py-1 text-sm border rounded bg-background text-right"
        step={isNumber ? "0.01" : undefined}
      />
    );
  }

  const displayValue = isNumber 
    ? `${prefix}${parseFloat(value || "0").toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${suffix}`
    : value || "-";

  return (
    <div
      onClick={() => {
        setEditValue(value);
        setIsEditing(true);
      }}
      className="px-2 py-1 text-sm cursor-pointer rounded hover:bg-muted/50 transition-colors text-right"
    >
      {displayValue}
    </div>
  );
}

interface PlatformUploadProps {
  platform: "META" | "GOOGLE";
  isExtracting: boolean;
  onExtract: (base64: string) => Promise<ExtractedRawMetrics | null>;
  onSave: (platform: "META" | "GOOGLE", metrics: ExtractedRawMetrics) => Promise<void>;
}

function PlatformUpload({ platform, isExtracting, onExtract, onSave }: PlatformUploadProps) {
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [extractedMetrics, setExtractedMetrics] = useState<ExtractedRawMetrics | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      setPreviewImage(base64);
      setIsProcessing(true);
      
      const metrics = await onExtract(base64);
      if (metrics) {
        setExtractedMetrics(metrics);
      }
      setIsProcessing(false);
    };
    reader.readAsDataURL(file);
  };

  const handleConfirmImport = async () => {
    if (extractedMetrics) {
      await onSave(platform, extractedMetrics);
      setExtractedMetrics(null);
      setPreviewImage(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleCancelImport = () => {
    setExtractedMetrics(null);
    setPreviewImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const platformColor = platform === "META" ? "text-blue-500" : "text-yellow-500";
  const platformBg = platform === "META" ? "bg-blue-500/10" : "bg-yellow-500/10";

  return (
    <div className={`rounded-lg border border-dashed border-border p-4 ${platformBg}`}>
      <div className="flex items-center gap-2 mb-3">
        <span className={`font-semibold ${platformColor}`}>{platform}</span>
      </div>
      
      <div className="flex flex-col gap-3">
        {previewImage ? (
          <div className="relative w-full">
            <img
              src={previewImage}
              alt={`Preview ${platform}`}
              className="w-full max-h-48 object-contain rounded-lg border border-border"
            />
            {(isExtracting || isProcessing) && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-lg">
                <div className="flex items-center gap-2 text-primary">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="text-sm">Extraindo...</span>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-muted-foreground py-4">
            <ImageIcon className="w-8 h-8" />
            <p className="text-xs text-center">Upload print {platform}</p>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <Input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
            id={`file-upload-${platform}`}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isExtracting || isProcessing}
            className="w-full"
          >
            <Upload className="w-4 h-4 mr-2" />
            {previewImage ? "Trocar" : "Upload"}
          </Button>

          {extractedMetrics && (
            <div className="space-y-2">
              <div className="text-xs space-y-1 bg-card p-2 rounded border">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Investimento:</span>
                  <span className="font-medium">{formatCurrency(extractedMetrics.investimento)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Mensagens:</span>
                  <span className="font-medium">{extractedMetrics.mensagens}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cliques:</span>
                  <span className="font-medium">{extractedMetrics.cliques}</span>
                </div>
              </div>
              <div className="flex gap-1">
                <Button onClick={handleConfirmImport} variant="default" size="sm" className="flex-1">
                  Confirmar
                </Button>
                <Button onClick={handleCancelImport} variant="ghost" size="sm">
                  ✕
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function AnunciosTable({ tipo }: AnunciosTableProps) {
  // Local state for pacientes input
  const [localPacientes, setLocalPacientes] = useState("0");
  
  const {
    anuncios,
    isLoading,
    isExtracting,
    selectedAno,
    selectedMes,
    setSelectedAno,
    setSelectedMes,
    extractMetricsFromImage,
    savePlatformMetrics,
    updateAnuncio,
    deleteAnuncio,
    updatePacientesTotal,
    pacientesTotal,
    MESES,
  } = useAnuncios(tipo);

  // Sync local state with hook state
  useEffect(() => {
    setLocalPacientes(String(pacientesTotal));
  }, [pacientesTotal]);

  const handlePacientesBlur = () => {
    const value = parseInt(localPacientes) || 0;
    if (value !== pacientesTotal) {
      updatePacientesTotal(value);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value.toFixed(2)}%`;
  };

  // Calculate totals
  const totals = anuncios.reduce(
    (acc, a) => ({
      cliques: acc.cliques + (a.cliques || 0),
      leads: acc.leads + (a.leads || 0),
      investimento: acc.investimento + (a.investimento || 0),
    }),
    { cliques: 0, leads: 0, investimento: 0 }
  );

  const avgConversao = totals.cliques > 0 ? (totals.leads / totals.cliques) * 100 : 0;
  const avgCustoLead = totals.leads > 0 ? totals.investimento / totals.leads : 0;
  
  // Unified metrics using pacientesTotal
  const percentualTotal = totals.leads > 0 ? (pacientesTotal / totals.leads) * 100 : 0;
  const cacTotal = pacientesTotal > 0 ? totals.investimento / pacientesTotal : 0;

  return (
    <div className="space-y-6">
      {/* Header with filters */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Select value={String(selectedAno)} onValueChange={(v) => setSelectedAno(Number(v))}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Ano" />
            </SelectTrigger>
            <SelectContent>
              {ANOS.map((ano) => (
                <SelectItem key={ano} value={String(ano)}>
                  {ano}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedMes} onValueChange={setSelectedMes}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Mês" />
            </SelectTrigger>
            <SelectContent>
              {MESES.map((mes) => (
                <SelectItem key={mes} value={mes}>
                  {mes}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Two Upload Sections - META and GOOGLE */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <PlatformUpload
          platform="META"
          isExtracting={isExtracting}
          onExtract={extractMetricsFromImage}
          onSave={savePlatformMetrics}
        />
        <PlatformUpload
          platform="GOOGLE"
          isExtracting={isExtracting}
          onExtract={extractMetricsFromImage}
          onSave={savePlatformMetrics}
        />
      </div>

      {/* Unified Pacientes Input */}
      <div className="flex items-center gap-4 p-4 rounded-lg border border-border bg-card">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          <Label htmlFor="pacientes-total" className="font-medium">Pacientes Total (ambas plataformas):</Label>
        </div>
        <Input
          id="pacientes-total"
          type="number"
          value={localPacientes}
          onChange={(e) => setLocalPacientes(e.target.value)}
          onBlur={handlePacientesBlur}
          onKeyDown={(e) => e.key === "Enter" && handlePacientesBlur()}
          className="w-32"
          min={0}
        />
        <div className="flex-1 flex items-center gap-6 text-sm">
          <div>
            <span className="text-muted-foreground">% Conv. (P/L): </span>
            <span className="font-medium">{formatPercent(percentualTotal)}</span>
          </div>
          <div>
            <span className="text-muted-foreground">CAC: </span>
            <span className="font-medium">{formatCurrency(cacTotal)}</span>
          </div>
        </div>
      </div>

      {/* Data Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : anuncios.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>Nenhum dado cadastrado para {selectedMes}/{selectedAno}</p>
          <p className="text-sm mt-1">Faça upload de um print ou adicione manualmente</p>
        </div>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-[120px]">Plataforma</TableHead>
                <TableHead className="text-right">Cliques</TableHead>
                <TableHead className="text-right">Leads (Msgs)</TableHead>
                <TableHead className="text-right">Conv. (L/C)</TableHead>
                <TableHead className="text-right">Investimento</TableHead>
                <TableHead className="text-right">CPL</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {anuncios.map((anuncio) => (
                <TableRow key={anuncio.id}>
                  <TableCell>
                    <EditableTableCell
                      value={anuncio.plataforma}
                      onSave={(v) => updateAnuncio(anuncio.id, "plataforma", v)}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <EditableTableCell
                      value={String(anuncio.cliques)}
                      onSave={(v) => updateAnuncio(anuncio.id, "cliques", v)}
                      isNumber
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <EditableTableCell
                      value={String(anuncio.leads)}
                      onSave={(v) => updateAnuncio(anuncio.id, "leads", v)}
                      isNumber
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <EditableTableCell
                      value={String(anuncio.conversao)}
                      onSave={(v) => updateAnuncio(anuncio.id, "conversao", v)}
                      isNumber
                      suffix="%"
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <EditableTableCell
                      value={String(anuncio.investimento)}
                      onSave={(v) => updateAnuncio(anuncio.id, "investimento", v)}
                      isNumber
                      prefix="R$ "
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <EditableTableCell
                      value={String(anuncio.custo_por_lead)}
                      onSave={(v) => updateAnuncio(anuncio.id, "custo_por_lead", v)}
                      isNumber
                      prefix="R$ "
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteAnuncio(anuncio.id)}
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {/* Totals row */}
              <TableRow className="bg-muted/30 font-medium">
                <TableCell>TOTAL</TableCell>
                <TableCell className="text-right">{totals.cliques.toLocaleString("pt-BR")}</TableCell>
                <TableCell className="text-right">{totals.leads.toLocaleString("pt-BR")}</TableCell>
                <TableCell className="text-right">{formatPercent(avgConversao)}</TableCell>
                <TableCell className="text-right">{formatCurrency(totals.investimento)}</TableCell>
                <TableCell className="text-right">{formatCurrency(avgCustoLead)}</TableCell>
                <TableCell></TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
