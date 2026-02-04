import { useState, useRef } from "react";
import { Upload, Loader2, Plus, Trash2, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAnuncios, type ExtractedRawMetrics } from "@/hooks/useAnuncios";

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
    addManualRow,
    MESES,
  } = useAnuncios(tipo);

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
      pacientes: acc.pacientes + (a.pacientes || 0),
    }),
    { cliques: 0, leads: 0, investimento: 0, pacientes: 0 }
  );

  const avgConversao = totals.cliques > 0 ? (totals.leads / totals.cliques) * 100 : 0;
  const avgCustoLead = totals.leads > 0 ? totals.investimento / totals.leads : 0;

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

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={addManualRow}>
            <Plus className="w-4 h-4 mr-1" />
            Adicionar Linha
          </Button>
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
                <TableHead className="text-right">Pacientes</TableHead>
                <TableHead className="text-right">% Conv. (P/L)</TableHead>
                <TableHead className="text-right">CAC</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {anuncios.map((anuncio) => {
                // Calculate derived values for display
                const leads = anuncio.leads || 0;
                const pacientes = anuncio.pacientes || 0;
                const investimento = anuncio.investimento || 0;
                const percentualCalc = leads > 0 ? (pacientes / leads) * 100 : 0;
                const cacCalc = pacientes > 0 ? investimento / pacientes : 0;
                
                return (
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
                  <TableCell className="text-right">
                    <EditableTableCell
                      value={String(anuncio.pacientes)}
                      onSave={(v) => updateAnuncio(anuncio.id, "pacientes", v)}
                      isNumber
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="px-2 py-1 text-sm text-muted-foreground">
                      {percentualCalc.toFixed(2)}%
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="px-2 py-1 text-sm text-muted-foreground">
                      {formatCurrency(cacCalc)}
                    </div>
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
              );})}
              {/* Totals row */}
              <TableRow className="bg-muted/30 font-medium">
                <TableCell>TOTAL</TableCell>
                <TableCell className="text-right">{totals.cliques.toLocaleString("pt-BR")}</TableCell>
                <TableCell className="text-right">{totals.leads.toLocaleString("pt-BR")}</TableCell>
                <TableCell className="text-right">{formatPercent(avgConversao)}</TableCell>
                <TableCell className="text-right">{formatCurrency(totals.investimento)}</TableCell>
                <TableCell className="text-right">{formatCurrency(avgCustoLead)}</TableCell>
                <TableCell className="text-right">{totals.pacientes.toLocaleString("pt-BR")}</TableCell>
                <TableCell className="text-right">
                  {totals.leads > 0 ? formatPercent((totals.pacientes / totals.leads) * 100) : "-"}
                </TableCell>
                <TableCell className="text-right">
                  {totals.pacientes > 0 ? formatCurrency(totals.investimento / totals.pacientes) : "-"}
                </TableCell>
                <TableCell></TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
