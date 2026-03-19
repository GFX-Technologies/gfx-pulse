import { useStatusHistory } from "@/hooks/use-status-data";
import { StatusBadge } from "./StatusBadge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { User, Clock, MessageSquare } from "lucide-react";

interface StatusHistoryProps {
  open: boolean;
  onClose: () => void;
  areaId: string;
  areaName: string;
  subareaId?: string;
  subareaName?: string;
}

export function StatusHistory({ open, onClose, areaId, areaName, subareaId, subareaName }: StatusHistoryProps) {
  const { data: logs, isLoading } = useStatusHistory(open ? areaId : undefined, subareaId);

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-foreground">Histórico</DialogTitle>
          <p className="text-sm text-muted-foreground">
            {areaName}{subareaName ? ` → ${subareaName}` : ""}
          </p>
        </DialogHeader>
        <ScrollArea className="max-h-[400px]">
          {isLoading ? (
            <p className="text-muted-foreground text-sm p-4">Carregando...</p>
          ) : !logs?.length ? (
            <p className="text-muted-foreground text-sm p-4">Nenhum registro encontrado.</p>
          ) : (
            <div className="space-y-3 p-1">
              {logs.map((log: any) => (
                <div key={log.id} className="flex gap-3 p-3 rounded-lg bg-muted/50">
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <StatusBadge status={log.status} size="sm" />
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {format(new Date(log.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                    {log.observacao && (
                      <p className="text-sm text-foreground flex items-start gap-1">
                        <MessageSquare className="w-3 h-3 mt-0.5 shrink-0 text-muted-foreground" />
                        {log.observacao}
                      </p>
                    )}
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {log.profiles?.nome || "Desconhecido"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
