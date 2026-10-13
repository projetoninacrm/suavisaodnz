import { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Analysis {
  capturaDesde: string;
  mensagens: number;
  mensagensExaminadas: number;
  amostra: number;
  amostraLimitada: boolean;
  relatorio: string;
  classificacoes: Array<{ id: number; status: string; resumo: string }>;
}

export function WhatsAppAnalysis() {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
  const [start, setStart] = useState(today.slice(0, 8) + "01");
  const [end, setEnd] = useState(today);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Analysis | null>(null);

  async function analyze() {
    if (!start || !end || start > end) { setError("Selecione um período válido."); return; }
    setLoading(true); setError(""); setResult(null);
    try {
      const params = new URLSearchParams({ start, end, sample: "20" });
      const { data, error: requestError } = await supabase.functions.invoke("whatsapp-analise?" + params, { method: "GET" });
      if (requestError) {
        const response = "context" in requestError && requestError.context instanceof Response ? requestError.context : null;
        const body = response ? await response.json().catch(() => null) : null;
        throw new Error(body?.error || "Não foi possível gerar a análise. Tente novamente.");
      }
      if (data?.error) throw new Error(data.error);
      setResult(data as Analysis);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Falha ao gerar análise."); }
    finally { setLoading(false); }
  }

  return <div className="space-y-5">
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5" /> Análise de WhatsApp com OpenAI</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">Acompanhe as novas mensagens da instância DNZ e gere recomendações para a equipe.</p>
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1"><Label htmlFor="whatsapp-start">De</Label><Input id="whatsapp-start" type="date" value={start} onChange={e => setStart(e.target.value)} disabled={loading} /></div>
          <div className="space-y-1"><Label htmlFor="whatsapp-end">Até</Label><Input id="whatsapp-end" type="date" value={end} onChange={e => setEnd(e.target.value)} disabled={loading} /></div>
          <Button onClick={analyze} disabled={loading}>{loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}{loading ? "Analisando…" : "Gerar análise"}</Button>
        </div>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      </CardContent>
    </Card>
    {result && <>
      <div className="grid gap-3 sm:grid-cols-3">
        {[['Mensagens no período', result.mensagens], ['Mensagens examinadas', result.mensagensExaminadas], ['Conversas na amostra', result.amostra]].map(([label, value]) => <Card key={label}><CardContent className="pt-5"><p className="text-sm text-muted-foreground">{label}</p><p className="text-2xl font-semibold">{value}</p></CardContent></Card>)}
      </div>
      <Card><CardHeader><CardTitle>Relatório e recomendações</CardTitle></CardHeader><CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">Captura iniciada em {new Date(result.capturaDesde).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}. As classificações são inferências da IA e não alteram a agenda.</p>
        {result.amostraLimitada && <p className="text-sm text-amber-700">O relatório usa uma amostra das mensagens mais recentes. Reduza o período para examinar um conjunto menor.</p>}
        <div className="whitespace-pre-wrap text-sm leading-relaxed">{result.relatorio}</div>
      </CardContent></Card>
    </>}
  </div>;
}
