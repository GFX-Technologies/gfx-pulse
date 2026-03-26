import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AlertTriangle, MessageSquare } from "lucide-react";

interface ServiceStatus {
  areaId: string;
  name: string;
  status: string;
  lastUpdate: Date | null;
  lastUpdatedBy: string | null;
}

interface OperationTableProps {
  services: ServiceStatus[];
  onQuickUpdate: (areaId: string, status: string) => void;
  onOpenNote: (areaId: string) => void;
  onOpenIncident: (areaId: string) => void;
}

const statusDot: Record<string, string> = {
  green: "bg-status-green",
  yellow: "bg-status-yellow",
  red: "bg-status-red",
  gray: "bg-status-gray",
};

const statusLabel: Record<string, string> = {
  green: "Operacional",
  yellow: "Instabilidade",
  red: "Indisponível",
  gray: "Não verificado",
};

export function OperationTable({ services, onQuickUpdate, onOpenNote, onOpenIncident }: OperationTableProps) {
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="px-5 py-3 border-b border-border">
        <h3 className="font-semibold text-sm text-foreground">Operação do Dia</h3>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[180px]">Serviço</TableHead>
            <TableHead className="w-[120px]">Status</TableHead>
            <TableHead className="w-[140px]">Última atualização</TableHead>
            <TableHead className="w-[120px]">Atualizado por</TableHead>
            <TableHead>Ações rápidas</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {services.map((svc) => (
            <TableRow key={svc.areaId}>
              <TableCell className="font-medium text-foreground">{svc.name}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <span className={cn("w-2.5 h-2.5 rounded-full", statusDot[svc.status] || statusDot.gray)} />
                  <span className="text-xs font-medium text-foreground">
                    {statusLabel[svc.status] || statusLabel.gray}
                  </span>
                </div>
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {svc.lastUpdate
                  ? format(svc.lastUpdate, "dd/MM HH:mm", { locale: ptBR })
                  : "—"}
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {svc.lastUpdatedBy || "—"}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs border-status-green/30 text-status-green hover:bg-status-green/10"
                    onClick={() => onQuickUpdate(svc.areaId, "green")}
                  >
                    Operando
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs border-status-yellow/30 text-status-yellow hover:bg-status-yellow/10"
                    onClick={() => onQuickUpdate(svc.areaId, "yellow")}
                  >
                    Instável
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs border-status-red/30 text-status-red hover:bg-status-red/10"
                    onClick={() => onQuickUpdate(svc.areaId, "red")}
                  >
                    Indisponível
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => onOpenNote(svc.areaId)}>
                    <MessageSquare className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => onOpenIncident(svc.areaId)}>
                    <AlertTriangle className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
