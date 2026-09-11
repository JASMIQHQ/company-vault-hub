import { useMemo, useState } from "react";
import { Plus, Layers3, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { createTenderLot, listTenderLots, type TenderLot } from "@/lib/tender-lots";
import { supabase } from "@/integrations/supabase/client";

interface TenderLotManagerProps {
  tenderId: string;
  organizationId: string;
  companyId: string;
  selectedLotId: string | null;
  onSelectLot: (lotId: string | null) => void;
}

export function useTenderLots(tenderId: string | undefined) {
  return useQuery({
    queryKey: ["tender-lots", tenderId],
    enabled: Boolean(tenderId),
    queryFn: () => listTenderLots(tenderId!),
  });
}

export function TenderLotManager({ tenderId, organizationId, companyId, selectedLotId, onSelectLot }: TenderLotManagerProps) {
  const queryClient = useQueryClient();
  const lotsQuery = useTenderLots(tenderId);
  const [open, setOpen] = useState(false);
  const [lotNumber, setLotNumber] = useState("");
  const [lotTitle, setLotTitle] = useState("");
  const [description, setDescription] = useState("");

  const create = useMutation({
    mutationFn: () => createTenderLot({ tender_id: tenderId, organization_id: organizationId, company_id: companyId, lot_number: lotNumber.trim(), lot_title: lotTitle.trim(), description: description.trim() || null }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tender-lots", tenderId] }),
  });

  const lots = lotsQuery.data ?? [];
  const selected = useMemo(() => lots.find((lot) => lot.id === selectedLotId) ?? null, [lots, selectedLotId]);

  const save = async () => {
    if (!lotNumber.trim() || !lotTitle.trim()) return;
    try {
      const lot = await create.mutateAsync();
      onSelectLot(lot.id);
      setLotNumber(""); setLotTitle(""); setDescription(""); setOpen(false);
      toast.success(`Lot ${lot.lot_number} created`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create the lot");
    }
  };

  return <section className="glass-panel mt-5 rounded-2xl p-5 sm:p-6">
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div><div className="flex items-center gap-2"><Layers3 className="size-5 text-primary" /><h2 className="text-lg font-semibold">Tender lots</h2></div><p className="mt-1 text-sm text-muted-foreground">Scope requirements and readiness to the exact lot your company is bidding for.</p></div>
      <Button className="rounded-xl" onClick={() => setOpen(true)}><Plus className="mr-2 size-4" />Add lot</Button>
    </div>
    <div className="mt-4 flex flex-wrap gap-2">
      <Button type="button" variant={selectedLotId === null ? "default" : "outline"} className="rounded-full" size="sm" onClick={() => onSelectLot(null)}>Whole tender</Button>
      {lots.map((lot) => <Button key={lot.id} type="button" variant={selectedLotId === lot.id ? "default" : "outline"} className="rounded-full" size="sm" onClick={() => onSelectLot(lot.id)}>Lot {lot.lot_number}</Button>)}
    </div>
    {lotsQuery.isPending ? <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" />Loading lots…</div> : null}
    {lots.length > 0 ? <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{lots.map((lot) => <button type="button" key={lot.id} onClick={() => onSelectLot(lot.id)} className={`rounded-xl border p-4 text-left transition ${selectedLotId === lot.id ? "border-primary/40 bg-primary/5" : "border-border/60 bg-muted/10 hover:bg-muted/20"}`}><div className="flex items-center justify-between gap-2"><Badge variant="outline" className="rounded-full">Lot {lot.lot_number}</Badge><span className="text-[10px] uppercase tracking-wide text-muted-foreground">{selectedLotId === lot.id ? "Selected" : "Select"}</span></div><p className="mt-3 text-sm font-semibold">{lot.lot_title}</p>{lot.description ? <p className="mt-1 text-xs leading-5 text-muted-foreground">{lot.description}</p> : null}</button>)}</div> : <p className="mt-4 rounded-xl border border-dashed border-border/60 p-4 text-sm text-muted-foreground">No lots have been defined yet. Requirements remain tender-wide until you assign them to a lot.</p>}
    {selected ? <p className="mt-4 text-xs text-primary">Working on Lot {selected.lot_number}: {selected.lot_title}</p> : null}
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="glass-panel sm:max-w-md"><DialogHeader><DialogTitle>Add tender lot</DialogTitle><DialogDescription>Create a durable lot record. Requirements can then be assigned to it and readiness will be calculated per lot.</DialogDescription></DialogHeader><div className="space-y-4"><div className="space-y-2"><Label htmlFor="lot-number">Lot number</Label><Input id="lot-number" value={lotNumber} onChange={(event) => setLotNumber(event.target.value)} placeholder="1" className="rounded-xl" /></div><div className="space-y-2"><Label htmlFor="lot-title">Lot title</Label><Input id="lot-title" value={lotTitle} onChange={(event) => setLotTitle(event.target.value)} placeholder="ICT Equipment" className="rounded-xl" /></div><div className="space-y-2"><Label htmlFor="lot-description">Description</Label><Input id="lot-description" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Optional lot scope" className="rounded-xl" /></div></div><DialogFooter><Button variant="ghost" className="rounded-xl" onClick={() => setOpen(false)}>Cancel</Button><Button className="rounded-xl" onClick={save} disabled={!lotNumber.trim() || !lotTitle.trim() || create.isPending}>{create.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}Create lot</Button></DialogFooter></DialogContent></Dialog>
  </section>;
}
