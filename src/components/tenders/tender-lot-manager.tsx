import { TenderBidStructure, useTenderLots } from "@/components/tenders/tender-bid-structure";

export { useTenderLots };

interface TenderLotManagerProps {
  tenderId: string;
  organizationId: string;
  companyId: string;
  selectedLotId: string | null;
  onSelectLot: (lotId: string | null) => void;
}

/**
 * Backwards-compatible wrapper for the tender workspace.
 * Bid structure is now detected from the analyzed tender rather than manually entered here.
 */
export function TenderLotManager({ tenderId, selectedLotId, onSelectLot }: TenderLotManagerProps) {
  return <TenderBidStructure tenderId={tenderId} selectedLotId={selectedLotId} onSelectLot={onSelectLot} />;
}
