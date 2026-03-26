import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2, Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface Area {
  id: string;
  nome: string;
  tipo: string;
  ordem: number;
}

interface Subarea {
  id: string;
  nome: string;
  area_id: string;
  ordem: number;
}

interface SettingsPanelProps {
  areas: Area[];
  subareas: Subarea[];
  onRefresh: () => void;
}

export function SettingsPanel({ areas, subareas, onRefresh }: SettingsPanelProps) {
  const [newAreaName, setNewAreaName] = useState("");
  const [newAreaType, setNewAreaType] = useState<"normal" | "group">("normal");
  const [newSubareaName, setNewSubareaName] = useState("");
  const [newSubareaAreaId, setNewSubareaAreaId] = useState("");

  const groupAreas = areas.filter((a) => a.tipo === "group");

  const addArea = async () => {
    if (!newAreaName.trim()) return;
    const { error } = await supabase.from("areas").insert({
      nome: newAreaName.trim(),
      tipo: newAreaType,
      ordem: areas.length + 1,
    });
    if (error) toast.error(error.message);
    else {
      toast.success("Área adicionada");
      setNewAreaName("");
      onRefresh();
    }
  };

  const deleteArea = async (id: string) => {
    const { error } = await supabase.from("areas").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Área removida");
      onRefresh();
    }
  };

  const addSubarea = async () => {
    if (!newSubareaName.trim() || !newSubareaAreaId) return;
    const currentSubs = subareas.filter((s) => s.area_id === newSubareaAreaId);
    const { error } = await supabase.from("subareas").insert({
      nome: newSubareaName.trim(),
      area_id: newSubareaAreaId,
      ordem: currentSubs.length + 1,
    });
    if (error) toast.error(error.message);
    else {
      toast.success("Subárea adicionada");
      setNewSubareaName("");
      onRefresh();
    }
  };

  const deleteSubarea = async (id: string) => {
    const { error } = await supabase.from("subareas").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Subárea removida");
      onRefresh();
    }
  };

  return (
    <div className="space-y-6">
      {/* Manage Areas */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <h3 className="font-semibold text-sm text-foreground">Gerenciar Áreas</h3>
        </div>
        <div className="p-4">
          <div className="flex gap-2 mb-4">
            <Input
              placeholder="Nome da área"
              value={newAreaName}
              onChange={(e) => setNewAreaName(e.target.value)}
              className="flex-1"
            />
            <Select value={newAreaType} onValueChange={(v: "normal" | "group") => setNewAreaType(v)}>
              <SelectTrigger className="w-[130px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="group">Grupo</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={addArea} size="sm">
              <Plus className="w-4 h-4 mr-1" /> Adicionar
            </Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead className="w-[100px]">Tipo</TableHead>
                <TableHead className="w-[60px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {areas.map((area) => (
                <TableRow key={area.id}>
                  <TableCell className="font-medium text-sm text-foreground">{area.nome}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{area.tipo}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => deleteArea(area.id)}>
                      <Trash2 className="w-3.5 h-3.5 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Manage Subareas */}
      {groupAreas.length > 0 && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-border">
            <h3 className="font-semibold text-sm text-foreground">Gerenciar Subáreas</h3>
          </div>
          <div className="p-4">
            <div className="flex gap-2 mb-4">
              <Select value={newSubareaAreaId} onValueChange={setNewSubareaAreaId}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Selecione o grupo" />
                </SelectTrigger>
                <SelectContent>
                  {groupAreas.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="Nome da subárea"
                value={newSubareaName}
                onChange={(e) => setNewSubareaName(e.target.value)}
                className="flex-1"
              />
              <Button onClick={addSubarea} size="sm">
                <Plus className="w-4 h-4 mr-1" /> Adicionar
              </Button>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead className="w-[150px]">Grupo</TableHead>
                  <TableHead className="w-[60px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {subareas.map((sub) => (
                  <TableRow key={sub.id}>
                    <TableCell className="font-medium text-sm text-foreground">{sub.nome}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {areas.find((a) => a.id === sub.area_id)?.nome}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => deleteSubarea(sub.id)}>
                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}
