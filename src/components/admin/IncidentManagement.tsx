import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Plus, MessageSquarePlus } from "lucide-react";

interface Area {
  id: string;
  nome: string;
}

interface Subarea {
  id: string;
  nome: string;
  area_id: string;
}

interface IncidentUpdate {
  id: string;
  status: string;
  message: string;
  created_at: string;
  profiles?: { nome: string } | null;
}

interface Incident {
  id: string;
  title: string;
  status: string;
  created_at: string;
  resolved_at: string | null;
  area_id: string | null;
  subarea_id: string | null;
  areas?: { nome: string } | null;
  incident_updates?: IncidentUpdate[];
}

interface IncidentManagementProps {
  incidents: Incident[];
  areas: Area[];
  subareas: Subarea[];
  onCreateIncident: (data: {
    title: string;
    areaId: string | null;
    subareaId: string | null;
    message: string;
    severity: string;
  }) => Promise<void>;
  onUpdateIncident: (incidentId: string, status: string, message: string) => Promise<void>;
}

const stageColors: Record<string, { bg: string; text: string }> = {
  investigating: { bg: "bg-status-red/10", text: "text-status-red" },
  identified: { bg: "bg-status-yellow/10", text: "text-status-yellow" },
  monitoring: { bg: "bg-primary/10", text: "text-primary" },
  resolved: { bg: "bg-status-green/10", text: "text-status-green" },
};

const stageLabels: Record<string, string> = {
  investigating: "Investigando",
  identified: "Identificado",
  monitoring: "Monitorando",
  resolved: "Resolvido",
};

export function IncidentManagement({
  incidents,
  areas,
  subareas,
  onCreateIncident,
  onUpdateIncident,
}: IncidentManagementProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [showUpdate, setShowUpdate] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);

  // Create form
  const [title, setTitle] = useState("");
  const [areaId, setAreaId] = useState("");
  const [subareaId, setSubareaId] = useState("");
  const [severity, setSeverity] = useState("medium");
  const [message, setMessage] = useState("");

  // Update form
  const [updateStatus, setUpdateStatus] = useState("monitoring");
  const [updateMessage, setUpdateMessage] = useState("");

  const activeIncidents = incidents.filter((i) => i.status !== "resolved");
  const resolvedIncidents = incidents.filter((i) => i.status === "resolved").slice(0, 5);

  const handleCreate = async () => {
    if (!title.trim() || !message.trim()) return;
    setCreating(true);
    try {
      await onCreateIncident({
        title: title.trim(),
        areaId: areaId || null,
        subareaId: subareaId || null,
        message: message.trim(),
        severity,
      });
      setShowCreate(false);
      setTitle("");
      setAreaId("");
      setSubareaId("");
      setMessage("");
    } finally {
      setCreating(false);
    }
  };

  const handleUpdate = async () => {
    if (!showUpdate || !updateMessage.trim()) return;
    setUpdating(true);
    try {
      await onUpdateIncident(showUpdate, updateStatus, updateMessage.trim());
      setShowUpdate(null);
      setUpdateMessage("");
    } finally {
      setUpdating(false);
    }
  };

  const areaSubareas = subareas.filter((s) => s.area_id === areaId);

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="px-5 py-3 border-b border-border flex items-center justify-between">
        <h3 className="font-semibold text-sm text-foreground">Gerenciamento de Incidentes</h3>
        <Button size="sm" className="h-7 text-xs" onClick={() => setShowCreate(true)}>
          <Plus className="w-3.5 h-3.5 mr-1" />
          Novo incidente
        </Button>
      </div>

      {/* Active incidents table */}
      {activeIncidents.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Título</TableHead>
              <TableHead className="w-[120px]">Área</TableHead>
              <TableHead className="w-[100px]">Estágio</TableHead>
              <TableHead className="w-[120px]">Início</TableHead>
              <TableHead className="w-[120px]">Última atualização</TableHead>
              <TableHead className="w-[80px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {activeIncidents.map((inc) => {
              const sc = stageColors[inc.status] || stageColors.investigating;
              const lastUpdate = inc.incident_updates?.sort(
                (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
              )[0];
              return (
                <TableRow key={inc.id}>
                  <TableCell className="font-medium text-sm text-foreground">{inc.title}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{inc.areas?.nome || "—"}</TableCell>
                  <TableCell>
                    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", sc.bg, sc.text)}>
                      {stageLabels[inc.status] || inc.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {format(new Date(inc.created_at), "dd/MM HH:mm", { locale: ptBR })}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {lastUpdate ? format(new Date(lastUpdate.created_at), "dd/MM HH:mm", { locale: ptBR }) : "—"}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => {
                        setShowUpdate(inc.id);
                        setUpdateStatus(inc.status === "investigating" ? "identified" : inc.status === "identified" ? "monitoring" : "resolved");
                        setUpdateMessage("");
                      }}
                    >
                      <MessageSquarePlus className="w-3.5 h-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      ) : (
        <div className="p-8 text-center text-sm text-muted-foreground">
          Nenhum incidente ativo no momento.
        </div>
      )}

      {/* Resolved (collapsed) */}
      {resolvedIncidents.length > 0 && (
        <div className="border-t border-border px-5 py-3">
          <p className="text-xs font-medium text-muted-foreground mb-2">Recentemente resolvidos</p>
          <div className="space-y-1">
            {resolvedIncidents.map((inc) => (
              <div key={inc.id} className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{inc.title}</span>
                <span>{inc.resolved_at ? format(new Date(inc.resolved_at), "dd/MM HH:mm", { locale: ptBR }) : ""}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create incident dialog */}
      <Dialog open={showCreate} onOpenChange={(v) => !v && setShowCreate(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground">Criar Incidente</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <Input placeholder="Título do incidente" value={title} onChange={(e) => setTitle(e.target.value)} />
            <div className="grid grid-cols-2 gap-2">
              <Select value={areaId} onValueChange={(v) => { setAreaId(v); setSubareaId(""); }}>
                <SelectTrigger><SelectValue placeholder="Área" /></SelectTrigger>
                <SelectContent>
                  {areas.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {areaSubareas.length > 0 && (
                <Select value={subareaId} onValueChange={setSubareaId}>
                  <SelectTrigger><SelectValue placeholder="Subárea" /></SelectTrigger>
                  <SelectContent>
                    {areaSubareas.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <Select value={severity} onValueChange={setSeverity}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Baixa</SelectItem>
                <SelectItem value="medium">Média</SelectItem>
                <SelectItem value="high">Alta</SelectItem>
                <SelectItem value="critical">Crítica</SelectItem>
              </SelectContent>
            </Select>
            <Textarea placeholder="Descrição inicial..." value={message} onChange={(e) => setMessage(e.target.value)} />
            <Button onClick={handleCreate} disabled={creating} className="w-full">
              {creating ? "Criando..." : "Criar incidente"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Update incident dialog */}
      <Dialog open={!!showUpdate} onOpenChange={(v) => !v && setShowUpdate(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground">Atualizar Incidente</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <Select value={updateStatus} onValueChange={setUpdateStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="investigating">Investigando</SelectItem>
                <SelectItem value="identified">Identificado</SelectItem>
                <SelectItem value="monitoring">Monitorando</SelectItem>
                <SelectItem value="resolved">Resolvido</SelectItem>
              </SelectContent>
            </Select>
            <Textarea placeholder="Mensagem da atualização..." value={updateMessage} onChange={(e) => setUpdateMessage(e.target.value)} />
            <Button onClick={handleUpdate} disabled={updating} className="w-full">
              {updating ? "Atualizando..." : "Adicionar atualização"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
