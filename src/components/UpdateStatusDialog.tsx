import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Database } from "@/integrations/supabase/types";

type StatusType = Database["public"]["Enums"]["status_type"];

interface UpdateStatusDialogProps {
  open: boolean;
  onClose: () => void;
  areaId: string;
  areaName: string;
  subareaId?: string;
  subareaName?: string;
}

const STATUS_OPTIONS: { value: StatusType; label: string; color: string }[] = [
  { value: "green", label: "Operando normalmente", color: "bg-status-green" },
  { value: "yellow", label: "Instabilidade", color: "bg-status-yellow" },
  { value: "red", label: "Indisponível", color: "bg-status-red" },
  { value: "gray", label: "Não verificado", color: "bg-status-gray" },
];

export function UpdateStatusDialog({
  open,
  onClose,
  areaId,
  areaName,
  subareaId,
  subareaName,
}: UpdateStatusDialogProps) {
  const [status, setStatus] = useState<StatusType>("green");
  const [observacao, setObservacao] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const handleSubmit = async () => {
    if (!user) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from("status_logs").insert({
        area_id: areaId,
        subarea_id: subareaId || null,
        status,
        observacao: observacao.trim() || null,
        usuario_id: user.id,
      });
      if (error) throw error;
      toast.success("Status atualizado com sucesso");
      queryClient.invalidateQueries({ queryKey: ["latest-status-logs"] });
      onClose();
      setObservacao("");
      setStatus("green");
    } catch (err: any) {
      toast.error("Erro ao atualizar: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-foreground">
            Atualizar Status
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {areaName}{subareaName ? ` → ${subareaName}` : ""}
          </p>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div>
            <Label className="text-foreground mb-2 block">Status</Label>
            <div className="grid grid-cols-2 gap-2">
              {STATUS_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setStatus(opt.value)}
                  className={cn(
                    "flex items-center gap-2 p-3 rounded-lg border text-sm font-medium transition-all text-foreground",
                    status === opt.value
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "border-border hover:bg-accent"
                  )}
                >
                  <span className={cn("w-3 h-3 rounded-full", opt.color)} />
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label htmlFor="obs" className="text-foreground">Observação</Label>
            <Textarea
              id="obs"
              placeholder="Descreva o que está acontecendo..."
              value={observacao}
              onChange={e => setObservacao(e.target.value)}
              className="mt-1.5"
              maxLength={500}
            />
          </div>
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full"
          >
            {submitting ? "Atualizando..." : "Atualizar status"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
