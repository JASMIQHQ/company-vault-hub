import { useState } from "react";
import { Layers3, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { detectTenderBidStructure, listTenderLots, type TenderLot } from "@/lib/tender-lots";

export function useTenderLots(tenderId: string | undefined) {
  return useQuery({ queryKey: ["tender-lots", tenderId], enabled: Boolean(tenderId), queryFn: () => listTenderLots(tenderId!) });
}

export function TenderBidStructure({ tenderId, compact = false, selectedLotId, onSelectLot }: { tenderId: string; compact?: boolean; selectedLotId?: string | null; onSelectLot?: (lotId: string | null) => void }) {
  const queryClient = useQueryClient();
  const lotsQuery = useTenderLots(tenderId);
  const [open, setOpen] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const lots = lotsQuery.data ?? [];
  const detect = async () => {
    setDetecting(true);
    try {
      const result = await detectTenderBidStructure(tenderId);
      await queryClient.invalidateQueries({ queryKey: ["tender-lots", tenderId] });
      if (result.created) toast.success(`${result.scopes.length} bid scope${result.scopes.length === 1 ? "" : "s"} detected from the tender`);
      else toast.success(result.message ?? "Bid structure checked");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not detect the bid structure"); }
    finally { setDetecting(false); }
  };
  return <>
    <Button variant="outline" size={compact ? "sm" : "default"} className="rounded-lg" onClick={() => setOpen(true)} disabled={detecting}>{detecting ? <Loader2 className="size-4 animate-spin" /> : <Layers3 className="size-4" />}<span className="ml-1.5">Bid structure</span></Button>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="glass-panel sm:max-w-lg"><DialogHeader><DialogTitle>Bid structure</DialogTitle><DialogDescription>JASMIQ reads the analyzed tender and identifies explicit lots or categories. You do not need to type titles or descriptions.</DialogDescription></DialogHeader><div className="space-y-3"><Button className="w-full rounded-xl" onClick={detect} disabled={detecting || lots.length > 0}>{detecting ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Sparkles className="mr-2 size-4" />}{lots.length > 0 ? "Structure detected" : "Detect from tender"}</Button><div className="rounded-xl border border-border/60 bg-muted/20 p-3 text-sm text-muted-foreground">{lots.length === 0 ? "No explicit lot/category has been saved yet. The tender remains one whole tender until a real bid structure is detected." : "These scopes were derived from the tender document. Tender-wide requirements remain shared across every scope."}</div>{lots.length > 0 ? <div className="space-y-2">{lots.map((lot: TenderLot) => <button type="button" key={lot.id} onClick={() => { onSelectLot?.(lot.id); setOpen(false); }} className={`w-full rounded-xl border p-3 text-left transition ${selectedLotId === lot.id ? "border-primary/40 bg-primary/5" : "border-border/60 bg-muted/10 hover:bg-muted/20"}`}><div className="flex items-center justify-between gap-3"><Badge variant="outline" className="rounded-full">Lot / Category {lot.lot_number}</Badge>{selectedLotId === lot.id ? <span className="text-xs font-medium text-primary">Selected</span> : null}</div><p className="mt-2 text-sm font-semibold">{lot.lot_title}</p>{lot.description ? <p className="mt-1 text-xs leading-5 text-muted-foreground">{lot.description}</p> : null}</button>)}</div> : <div className="rounded-xl border border-dashed border-border/60 p-4 text-sm"><p className="font-medium">Whole tender</p><p className="mt-1 text-muted-foreground">No lot or category detected. Requirements stay tender-wide.</p></div>}</div></DialogContent></Dialog>
  </>;
}

export function TenderScopeSelector({ tenderId, selectedLotId, onSelectLot }: { tenderId: string; selectedLotId: string | null; onSelectLot: (lotId: string | null) => void }) {
  const lotsQuery = useTenderLots(tenderId);
  const lots = lotsQuery.data ?? [];
  return <div className="flex flex-wrap items-center gap-2"><Button type="button" variant={selectedLotId === null ? "default" : "outline"} size="sm" className="rounded-full" onClick={() => onSelectLot(null)}>Whole tender</Button>{lots.map((lot) => <Button key={lot.id} type="button" variant={selectedLotId === lot.id ? "default" : "outline"} size="sm" className="rounded-full" onClick={() => onSelectLot(lot.id)}>Lot / Category {lot.lot_number}</Button>)}</div>;
}
