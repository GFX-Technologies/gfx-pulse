import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Bot, CheckCheck, Circle } from "lucide-react";
import { SLA_CHECK_TIMES } from "@/lib/sla";
import type { WhatsAppCheckStatus } from "@/hooks/use-whatsapp-checks";

export interface SlotData {
  status: WhatsAppCheckStatus;
  checkedBy?: string;
  checkedAt?: string;
  observacao?: string;
  isAuto?: boolean;
}

interface SubareaCheckRow {
  subareaId: string;
  subareaName: string;
  currentStatus: WhatsAppCheckStatus;
  slots: Record<string, SlotData>;
}

interface WhatsAppCheckGridProps {
  subareaChecks: SubareaCheckRow[];
  onSetCheck: (subareaId: string, timeSlot: string, status: WhatsAppCheckStatus, note?: string) => Promise<void>;
  onBulkAction: (scope: "slot" | "channel" | "day", status: WhatsAppCheckStatus, note?: string, target?: string) => Promise<void>;
}

const STATUS_OPTIONS: { value: WhatsAppCheckStatus; label: string; color: string; dotClass: string }[] = [
  { value: "operational", label: "Operando normalmente", color: "bg-status-green/15 text-status-green border-status-green/30", dotClass: "bg-status-green" },
  { value: "degraded", label: "Instabilidade", color: "bg-status-yellow/15 text-status-yellow border-status-yellow/30", dotClass: "bg-status-yellow" },
  { value: "down", label: "Indisponível", color: "bg-status-red/15 text-status-red border-status-red/30", dotClass: "bg-status-red" },
];

const CELL_STYLES: Record<WhatsAppCheckStatus, string> = {
  operational: "bg-status-green/15 border-status-green/30",
  degraded: "bg-status-yellow/15 border-status-yellow/30",
  down: "bg-status-red/15 border-status-red/30",
  not_checked: "bg-muted/30 border-border",
};

const DOT_STYLES: Record<WhatsAppCheckStatus, string> = {
  operational: "bg-status-green",
  degraded: "bg-status-yellow",
  down: "bg-status-red",
  not_checked: "bg-muted-foreground/30",
};

const STATUS_LABEL: Record<WhatsAppCheckStatus, string> = {
  operational: "OK",
  degraded: "Instável",
  down: "Fora",
  not_checked: "—",
};

const CURRENT_STATUS_STYLES: Record<WhatsAppCheckStatus, string> = {
  operational: "bg-status-green/15 text-status-green",
  degraded: "bg-status-yellow/15 text-status-yellow",
  down: "bg-status-red/15 text-status-red",
  not_checked: "bg-muted text-muted-foreground",
};

export function WhatsAppCheckGrid({ subareaChecks, onSetCheck, onBulkAction }: WhatsAppCheckGridProps) {
  const [loading, setLoading] = useState(false);
  const [bulkDialog, setBulkDialog] = useState<{
    scope: "slot" | "channel" | "day";
    target?: string;
    label: string;
  } | null>(null);
  const [bulkStatus, setBulkStatus] = useState<WhatsAppCheckStatus>("operational");
  const [bulkNote, setBulkNote] = useState("");

  const handleSetCheck = async (subareaId: string, timeSlot: string, status: WhatsAppCheckStatus) => {
    setLoading(true);
    try {
      await onSetCheck(subareaId, timeSlot, status);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmBulk = async () => {
    if (!bulkDialog) return;
    setLoading(true);
    try {
      await onBulkAction(bulkDialog.scope, bulkStatus, bulkNote.trim() || undefined, bulkDialog.target);
      setBulkDialog(null);
      setBulkNote("");
      setBulkStatus("operational");
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
          onClick={() => setBulkDialog({ scope: "day", label: "todos os checks do dia" })}
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
                      onClick={() => setBulkDialog({ scope: "slot", target: time, label: `checks das ${time}` })}
                    >
                      Marcar todos
                    </Button>
                  </div>
                </TableHead>
              ))}
              <TableHead className="text-center w-[110px]">Status Atual</TableHead>
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
                  const slot = sub.slots[time] || { status: "not_checked" as const };
                  return (
                    <TableCell key={time} className="p-1">
                      <CheckCellPopover
                        slot={slot}
                        disabled={loading}
                        onSelect={(status) => handleSetCheck(sub.subareaId, time, status)}
                      />
                    </TableCell>
                  );
                })}
                <TableCell className="text-center p-1">
                  <span className={cn(
                    "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
                    CURRENT_STATUS_STYLES[sub.currentStatus]
                  )}>
                    <span className={cn("w-2 h-2 rounded-full", DOT_STYLES[sub.currentStatus])} />
                    {STATUS_LABEL[sub.currentStatus]}
                  </span>
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setBulkDialog({ scope: "channel", target: sub.subareaId, label: `checks de ${sub.subareaName}` })}
                  >
                    Marcar todos
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Bulk action dialog with status choice */}
      <Dialog open={!!bulkDialog} onOpenChange={(v) => !v && setBulkDialog(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-foreground">Marcar {bulkDialog?.label}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">Qual status deseja aplicar?</p>
            <div className="flex flex-col gap-2">
              {STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setBulkStatus(opt.value)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-all text-left",
                    bulkStatus === opt.value
                      ? cn(opt.color, "border-2 ring-1 ring-offset-1 ring-offset-background")
                      : "border-border text-foreground hover:bg-accent"
                  )}
                >
                  <span className={cn("w-3 h-3 rounded-full shrink-0", opt.dotClass)} />
                  {opt.label}
                </button>
              ))}
            </div>
            <Textarea
              placeholder="Observação geral (opcional)..."
              value={bulkNote}
              onChange={(e) => setBulkNote(e.target.value)}
              maxLength={300}
              className="h-16"
            />
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setBulkDialog(null)}>
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

/* Individual cell with popover status selector */
function CheckCellPopover({
  slot,
  disabled,
  onSelect,
}: {
  slot: SlotData;
  disabled: boolean;
  onSelect: (status: WhatsAppCheckStatus) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "w-full h-10 rounded-lg border flex items-center justify-center transition-all cursor-pointer",
            CELL_STYLES[slot.status],
            "hover:ring-2 hover:ring-primary/20"
          )}
          disabled={disabled}
          title={slot.checkedBy ? `${slot.checkedBy} às ${slot.checkedAt}` : undefined}
        >
          {slot.status === "not_checked" ? (
            <Circle className="w-3.5 h-3.5 text-muted-foreground/40" />
          ) : (
            <span className={cn("w-3 h-3 rounded-full", DOT_STYLES[slot.status])} />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-1.5" align="center" side="bottom">
        <div className="flex flex-col gap-0.5">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { onSelect(opt.value); setOpen(false); }}
              className={cn(
                "flex items-center gap-2 px-2.5 py-2 rounded-md text-xs font-medium transition-colors text-left",
                slot.status === opt.value ? cn(opt.color) : "hover:bg-accent text-foreground"
              )}
            >
              <span className={cn("w-2.5 h-2.5 rounded-full shrink-0", opt.dotClass)} />
              {opt.label}
            </button>
          ))}
          {slot.status !== "not_checked" && (
            <>
              <div className="border-t border-border my-1" />
              <button
                onClick={() => { onSelect("not_checked"); setOpen(false); }}
                className="flex items-center gap-2 px-2.5 py-2 rounded-md text-xs text-muted-foreground hover:bg-accent transition-colors text-left"
              >
                <Circle className="w-2.5 h-2.5" />
                Limpar verificação
              </button>
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
