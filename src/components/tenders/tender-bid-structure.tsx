import { useState } from "react";
import { Layers3, Loader2, Sparkles, WandSparkles, ArrowRight, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { detectTenderBidStructure, listTenderLots, type TenderLot } from "@/lib/tender-lots";
import "@/styles/glass-motion.css";

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
    <Button variant="outline" size={compact ? "sm" : "default"} className="jasmiq-glass-trigger rounded-xl" onClick={() => setOpen(true)} disabled={detecting}><span className="relative z-10 flex items-center"><Layers3 className="jasmiq-glass-icon size-4" /><span className="ml-1.5">Bid structure</span></span></Button>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="jasmiq-glass-dialog glass-panel sm:max-w-xl">
        <div className="jasmiq-glass-stage -m-6 p-6">
          <DialogHeader>
            <div className="jasmiq-glass-title flex items-start gap-3"><div className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 shadow-elegant"><WandSparkles className="size-5 text-primary" /></div><div><DialogTitle className="text-xl tracking-tight">Bid structure</DialogTitle><DialogDescription className="jasmiq-glass-copy mt-1.5 max-w-lg leading-6">JASMIQ reads the analyzed tender and identifies explicit lots, categories or packages. You do not need to type titles or descriptions.</DialogDescription></div></div>
          </DialogHeader>
          <div className="mt-6 space-y-4">
            <Button className="jasmiq-glass-action h-12 w-full rounded-2xl text-sm font-semibold" onClick={detect} disabled={detecting || lots.length > 0}>{detecting ? <Loader2 className="mr-2 size-4 animate-spin" /> : lots.length > 0 ? <CheckCircle2 className="mr-2 size-4" /> : <Sparkles className="jasmiq-spark mr-2 size-4" />}{detecting ? "Reading tender structure…" : lots.length > 0 ? "Structure detected" : "Detect from tender"}{!detecting && lots.length === 0 ? <ArrowRight className="ml-auto size-4 opacity-70" /> : null}</Button>
            <div className="jasmiq-glass-empty rounded-2xl border border-border/60 p-4 text-sm">{lots.length === 0 ? <><p className="font-semibold">Whole tender</p><p className="mt-1 text-muted-foreground">No explicit lot, category or package has been saved. The tender stays whole until a real bid structure is detected.</p></> : <><p className="font-semibold">Structure found in the tender</p><p className="mt-1 text-muted-foreground">These scopes were derived from the tender. Tender-wide requirements remain shared across every scope.</p></>}</div>
            {lots.length > 0 ? <div className="grid gap-3 sm:grid-cols-2">{lots.map((lot: TenderLot, index) => <button type="button" key={lot.id} onClick={() => { onSelectLot?.(lot.id); setOpen(false); }} style={{ "--scope-delay": `${index * 70}ms` } as React.CSSProperties} className={`jasmiq-scope-card group w-full rounded-2xl border p-4 text-left ${selectedLotId === lot.id ? "border-primary/45 bg-primary/8 ring-1 ring-primary/15" : "border-border/60"}`}><div className="relative z-10 flex items-start gap-3"><div className="jasmiq-scope-icon flex size-10 shrink-0 items-center justify-center rounded-xl border border-primary/15 bg-primary/10 text-primary"><Layers3 className="size-4" /></div><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><Badge variant="outline" className="rounded-full bg-background/20">{lot.lot_number}</Badge>{selectedLotId === lot.id ? <span className="text-xs font-semibold text-primary">Selected</span> : <span className="text-xs text-muted-foreground transition-colors group-hover:text-foreground">Select</span>}</div><p className="mt-3 text-sm font-semibold tracking-tight">{lot.lot_title}</p>{lot.description ? <p className="mt-1 text-xs leading-5 text-muted-foreground">{lot.description}</p> : null}</div></div></button>)}</div> : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  </>;
}

export function TenderScopeSelector({ tenderId, selectedLotId, onSelectLot }: { tenderId: string; selectedLotId: string | null; onSelectLot: (lotId: string | null) => void }) {
  const lotsQuery = useTenderLots(tenderId);
  const lots = lotsQuery.data ?? [];
  return <div className="flex flex-wrap items-center gap-2"><Button type="button" variant={selectedLotId === null ? "default" : "outline"} size="sm" className="rounded-full transition-all duration-200 hover:-translate-y-0.5" onClick={() => onSelectLot(null)}>Whole tender</Button>{lots.map((lot) => <Button key={lot.id} type="button" variant={selectedLotId === lot.id ? "default" : "outline"} size="sm" className="rounded-full transition-all duration-200 hover:-translate-y-0.5" onClick={() => onSelectLot(lot.id)}>{lot.lot_number}</Button>)}</div>;
}
