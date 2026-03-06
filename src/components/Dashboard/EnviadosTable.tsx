import { useEffect, useState, useRef } from "react";
import { Send, RefreshCw, FileAudio, FileVideo, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SyncedHorizontalScrollbar } from "@/components/ui/synced-horizontal-scrollbar";
import { supabase } from "@/integrations/supabase/client";

interface DisparoPerdido {
  id: string;
  lead_id: string;
  nome_cliente: string | null;
  telefone: string | null;
  mensagem_enviada: string | null;
  media_url: string | null;
  media_type: string | null;
  status: string;
  erro: string | null;
  data_envio: string | null;
  created_at: string;
}

export function EnviadosTable() {
  const [disparos, setDisparos] = useState<DisparoPerdido[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const tableScrollRef = useRef<HTMLDivElement>(null);

  const fetchDisparos = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("disparos_perdidos")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setDisparos(data as DisparoPerdido[]);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchDisparos();
  }, []);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    return d.toLocaleDateString("pt-BR") + " " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  };

  const formatPhoneForWhatsApp = (phone: string | null) => {
    if (!phone) return null;
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.length === 11 || cleaned.length === 10) return `55${cleaned}`;
    if (cleaned.length === 13 && cleaned.startsWith("55")) return cleaned;
    return cleaned;
  };

  if (isLoading) {
    return <div className="flex items-center justify-center py-12 text-muted-foreground">Carregando...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Send className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">{disparos.length} mensagens enviadas</span>
        </div>
        <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={fetchDisparos}>
          <RefreshCw className="w-3.5 h-3.5" /> Atualizar
        </Button>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden card-shadow-lg animate-fade-in">
        <SyncedHorizontalScrollbar targetRef={tableScrollRef} />
        <div ref={tableScrollRef} className="overflow-x-auto scrollbar-visible">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr className="bg-table-header border-b border-table-border">
                <th className="px-3 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[160px]">Data Envio</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider min-w-[180px]">Cliente</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[150px]">Telefone</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider min-w-[250px]">Mensagem</th>
                <th className="px-3 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[90px]">Mídia</th>
                <th className="px-3 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[90px]">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-table-border">
              {disparos.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                    <Send className="w-10 h-10 mx-auto mb-3 opacity-40" />
                    <p>Nenhuma mensagem enviada ainda.</p>
                  </td>
                </tr>
              ) : (
                disparos.map((d, index) => {
                  const whatsappNumber = formatPhoneForWhatsApp(d.telefone);
                  return (
                    <tr
                      key={d.id}
                      className="table-cell-hover animate-slide-in"
                      style={{ animationDelay: `${index * 15}ms` }}
                    >
                      <td className="px-3 py-2 text-sm text-muted-foreground">{formatDate(d.data_envio)}</td>
                      <td className="px-3 py-2 text-sm font-medium">{d.nome_cliente || "—"}</td>
                      <td className="px-3 py-2 text-sm">
                        <div className="flex items-center gap-1">
                          <span>{d.telefone || "—"}</span>
                          {whatsappNumber && (
                            <a
                              href={`https://wa.me/${whatsappNumber}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1 rounded-md hover:bg-accent/20 text-accent transition-colors"
                              title="Abrir WhatsApp"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-sm text-muted-foreground max-w-[300px] truncate">{d.mensagem_enviada || "—"}</td>
                      <td className="px-3 py-2 text-center">
                        {d.media_type === "audio" ? (
                          <Badge variant="outline" className="gap-1 text-xs"><FileAudio className="w-3 h-3" /> Áudio</Badge>
                        ) : d.media_type === "video" ? (
                          <Badge variant="outline" className="gap-1 text-xs"><FileVideo className="w-3 h-3" /> Vídeo</Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <Badge variant={d.status === "enviado" ? "default" : "destructive"} className="text-xs">
                          {d.status === "enviado" ? "Enviado ✓" : d.erro || "Erro"}
                        </Badge>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
