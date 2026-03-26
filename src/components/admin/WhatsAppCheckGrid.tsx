import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Check, Clock, AlertCircle, X, CheckCheck } from "lucide-react";
import { SLA_CHECK_TIMES } from "@/lib/sla";
import { toast } from "sonner";

export type CheckState = "checked" | "pending" | "overdue" | "missed" | "not_started";

interface SubareaCheck {
  subareaId: string;
  subareaName: string;
  currentStatus: string;
  checks: Record<string, CheckState>; // time slot -> state
  checkLogs: Record<string, { checkedAt: string; checkedBy: string } | null>;
}

interface WhatsAppCheckGridProps {
  subareaChecks: SubareaCheck[];
  onMarkCheck: (subareaId: string, timeSlot: string, note?: string) => Promise<void>;
  onBulkMarkSlot: (timeSlot: string) => Promise<void>;
  onBulkMarkChannel: (subareaId: string) => Promise<void>;
  onBulkMarkAll: () => Promise<void>;
}

const stateIcons: Record<CheckState, React.ReactNode> = {
  checked: <Check className="w-4 h-4 text-status-green" />,
  pending: <Clock className="w-4 h-4 text-status-yellow" />,
  overdue: <AlertCircle className="w-4 h-4 text-status-red" />,
  missed: <X className="w-4 h-4 text-muted-foreground" />,
  not_started: <span className="w-4 h-4 rounded-full border-2 border-border block" />,
};

const stateBg: Record<CheckState, string> = {
  checked: "bg-status-green/10 hover:bg-status-green/20",
  pending: "bg-status-yellow/10 hover:bg-status-yellow/20",
  overdue: "bg-status-red/10 hover:bg-status-red/20",
  missed: "bg-muted hover:bg-muted/80",
  not_started: "hover:bg-accent/50",
};

const statusDot: Record<string, string> = {
  green: "bg-status-green",
  yellow: "bg-status-yellow",
  red: "bg-status-red",
  gray: "bg-status-gray",
};

export function WhatsAppCheckGrid({
  subareaChecks,
  onMarkCheck,
  onBulkMarkSlot,
  onBulkMarkChannel,
  onBulkMarkAll,
}: WhatsAppCheckGridProps) {
  const [noteDialog, setNoteDialog] = useState<{ subareaId: string; timeSlot: string } | null>(null);
  const [note, setNote] = useState("");
  const [confirmDialog, setConfirmDialog] = useState<{
    message: string;
    action: () => Promise<void>;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  const handleCellClick = (subareaId: string, timeSlot: string, state: CheckState) => {
    if (state === "checked") return; // Already checked
    setNoteDialog({ subareaId, timeSlot });
    setNote("");
  };

  const handleConfirmCheck = async () => {
    if (!noteDialog) return;
    setLoading(true);
    try {
      await onMarkCheck(noteDialog.subareaId, noteDialog.timeSlot, note.trim() || undefined);
      setNoteDialog(null);
      setNote("");
    } finally {
      setLoading(false);
    }
  };

  const handleBulkAction = (message: string, action: () => Promise<void>) => {
    setConfirmDialog({ message, action });
  };

  const handleConfirmBulk = async () => {
    if (!confirmDialog) return;
    setLoading(true);
    try {
      await confirmDialog.action();
      setConfirmDialog(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="px-5 py-3 border-b border-border flex items-center justify-between">
        <h3 className="font-semibold text-sm text-foreground">WhatsApp — Operação Diária</h3>
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs"
          onClick={() => handleBulkAction("Deseja marcar todos os checks pendentes do dia?", onBulkMarkAll)}
        >
          <CheckCheck className="w-3.5 h-3.5 mr-1" />
          Marcar todos do dia
        </Button>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[180px] sticky left-0 bg-card z-10">Canal</TableHead>
              {SLA_CHECK_TIMES.map((time) => (
                <TableHead key={time} className="text-center w-[100px]">
                  <div className="flex flex-col items-center gap-1">
                    <span>{time}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-5 text-[10px] px-1.5 text-muted-foreground hover:text-foreground"
                      onClick={() =>
                        handleBulkAction(`Deseja marcar todos os checks das ${time}?`, () => onBulkMarkSlot(time))
                      }
                    >
                      Marcar todos
                    </Button>
                  </div>
                </TableHead>
              ))}
              <TableHead className="text-center w-[100px]">Status Atual</TableHead>
              <TableHead className="w-[100px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {subareaChecks.map((sub) => (
              <TableRow key={sub.subareaId}>
                <TableCell className="font-medium text-sm text-foreground sticky left-0 bg-card z-10">
                  {sub.subareaName}
                </TableCell>
                {SLA_CHECK_TIMES.map((time) => {
                  const state = sub.checks[time] || "not_started";
                  return (
                    <TableCell key={time} className="p-1">
                      <button
                        className={cn(
                          "w-full h-10 rounded-lg flex items-center justify-center transition-colors",
                          stateBg[state]
                        )}
                        onClick={() => handleCellClick(sub.subareaId, time, state)}
                        disabled={state === "checked"}
                        title={
                          sub.checkLogs[time]
                            ? `${sub.checkLogs[time]!.checkedBy} - ${sub.checkLogs[time]!.checkedAt}`
                            : undefined
                        }
                      >
                        {stateIcons[state]}
                      </button>
                    </TableCell>
                  );
                })}
                <TableCell className="text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    <span className={cn("w-2.5 h-2.5 rounded-full", statusDot[sub.currentStatus] || statusDot.gray)} />
                  </div>
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() =>
                      handleBulkAction(
                        `Deseja marcar todos os checks pendentes de ${sub.subareaName}?`,
                        () => onBulkMarkChannel(sub.subareaId)
                      )
                    }
                  >
                    Marcar todos
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Note dialog for individual check */}
      <Dialog open={!!noteDialog} onOpenChange={(v) => !v && setNoteDialog(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-foreground">Registrar verificação</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <Textarea
              placeholder="Observação (opcional)..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={300}
            />
            <Button onClick={handleConfirmCheck} disabled={loading} className="w-full">
              {loading ? "Registrando..." : "Confirmar check"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmation dialog for bulk actions */}
      <Dialog open={!!confirmDialog} onOpenChange={(v) => !v && setConfirmDialog(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-foreground">Confirmar ação</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-sm text-foreground">{confirmDialog?.message}</p>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setConfirmDialog(null)}>
                Cancelar
              </Button>
              <Button onClick={handleConfirmBulk} disabled={loading} className="flex-1">
                {loading ? "Processando..." : "Confirmar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
