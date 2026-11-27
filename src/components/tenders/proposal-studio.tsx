import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, FilePlus2, FileText, Save, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import type { TenderRequirementWithLot } from "@/hooks/use-tenders";
import type { CompanyDocument } from "@/lib/vault";

type SavedProposal = {
  id: string;
  title: string | null;
  document_type: string;
  content_markdown: string | null;
  version: number | null;
  approved: boolean | null;
  created_at: string | null;
};

function buildProposalDraft({
  tenderTitle,
  companyName,
  requirements,
  documents,
}: {
  tenderTitle: string;
  companyName: string;
  requirements: TenderRequirementWithLot[];
  documents: CompanyDocument[];
}) {
  const evidence = requirements.filter((requirement) => {
    if (requirement.status !== "matched" || requirement.match_basis !== "VERIFIED_FACT") {
      return false;
    }
    const document = documents.find((item) => item.id === requirement.matched_document_id);
    return Boolean(
      document && document.verification_status === "verified" && !document.deleted_at,
    );
  });
  const gaps = requirements.filter(
    (requirement) =>
      requirement.match_basis !== "PROCEDURAL_DECLARATION" &&
      (requirement.status !== "matched" || requirement.match_basis !== "VERIFIED_FACT"),
  );
  const submissionSteps = requirements.filter(
    (requirement) => requirement.match_basis === "PROCEDURAL_DECLARATION",
  );

  const lines = [
    `# Technical Proposal Draft — ${tenderTitle}`,
    "",
    `**Bidder:** ${companyName}`,
    `**Prepared:** ${new Date().toISOString().slice(0, 10)}`,
    "**Document status:** Working draft — requires human review and approval",
    "",
    "> This draft is a structured starting point. It does not invent company experience, personnel, project references, prices, certifications or delivery commitments. Complete every marked section using approved company information before submission.",
    "",
    "## 1. Executive Summary",
    "",
    "[Bid team: write a concise summary of the proposed solution, the procuring entity's objectives and the bidder's demonstrable capability. Do not insert unsupported claims.]",
    "",
    "## 2. Understanding of the Requirement",
    "",
    ...requirements.map(
      (item, index) =>
        `${index + 1}. **${item.requirement_name ?? "Requirement"}:** ${item.requirement_text}`,
    ),
    "",
    "## 3. Technical Approach and Methodology",
    "",
    "[Bid team: describe the delivery approach, work packages, implementation method, quality controls and acceptance process. Reference only capabilities the company can substantiate.]",
    "",
    "## 4. Work Plan and Deliverables",
    "",
    "| Phase | Activities | Deliverables | Duration / Owner |",
    "|---|---|---|---|",
    "| Mobilisation | [Complete] | [Complete] | [Complete] |",
    "| Execution | [Complete] | [Complete] | [Complete] |",
    "| Testing and acceptance | [Complete] | [Complete] | [Complete] |",
    "| Handover and close-out | [Complete] | [Complete] | [Complete] |",
    "",
    "## 5. Relevant Experience and Personnel",
    "",
    "[Bid team: insert verified project references, CVs, named personnel and qualifications from approved company records. No experience or personnel claims have been generated.]",
    "",
    "## 6. Compliance Evidence Register",
    "",
    ...(evidence.length
      ? [
          "| Tender requirement | Verified Vault evidence |",
          "|---|---|",
          ...evidence.map((item) => {
            const document = documents.find(
              (candidate) => candidate.id === item.matched_document_id,
            );
            return `| ${item.requirement_name ?? item.requirement_text} | ${document?.document_name ?? document?.original_filename ?? "Verified document"} |`;
          }),
        ]
      : ["No tender requirement currently has qualifying verified Vault evidence."]),
    "",
    "## 7. Outstanding Compliance and Review Items",
    "",
    ...(gaps.length
      ? gaps.map(
          (item) =>
            `- [ ] ${item.requirement_name ?? item.requirement_text} — current status: ${item.status ?? "not assessed"}`,
        )
      : ["No outstanding evidence requirements are recorded by the current matcher."]),
    "",
    "## 8. Submission Actions",
    "",
    ...(submissionSteps.length
      ? submissionSteps.map((item) => `- [ ] ${item.requirement_name ?? item.requirement_text}`)
      : ["No procedural submission actions were classified for this tender."]),
    "",
    "## 9. Commercial and Financial Submission",
    "",
    "[Bid team: complete pricing, taxes, assumptions, validity period, payment terms and bid security strictly from the approved commercial response. No prices have been inferred.]",
    "",
    "## 10. Final Review and Authorisation",
    "",
    "- [ ] All statements are supported by approved company records.",
    "- [ ] All mandatory evidence is current and verified.",
    "- [ ] All submission instructions and procedural actions are completed.",
    "- [ ] Commercial figures have been independently checked.",
    "- [ ] The authorised approver has approved the final submission.",
    "",
    "**Approval name:** [Complete]  ",
    "**Approval date:** [Complete]  ",
    "**Version:** Working draft",
  ];
  return lines.flat().join("\n");
}

function downloadMarkdown(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function ProposalStudio({
  tenderId,
  tenderTitle,
  organizationId,
  companyName,
  requirements,
  documents,
}: {
  tenderId: string;
  tenderTitle: string;
  organizationId: string;
  companyName: string;
  requirements: TenderRequirementWithLot[];
  documents: CompanyDocument[];
}) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const savedQuery = useQuery({
    queryKey: ["generated_documents", organizationId, tenderId],
    enabled: Boolean(organizationId && tenderId),
    queryFn: async (): Promise<SavedProposal[]> => {
      const { data, error } = await supabase
        .from("generated_documents")
        .select("id, title, document_type, content_markdown, version, approved, created_at")
        .eq("organization_id", organizationId)
        .eq("tender_id", tenderId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as SavedProposal[];
    },
  });

  const verifiedEvidenceCount = useMemo(
    () =>
      requirements.filter((requirement) => {
        if (requirement.status !== "matched" || requirement.match_basis !== "VERIFIED_FACT") {
          return false;
        }
        const document = documents.find((item) => item.id === requirement.matched_document_id);
        return Boolean(
          document && document.verification_status === "verified" && !document.deleted_at,
        );
      }).length,
    [requirements, documents],
  );

  const saveDraft = useMutation({
    mutationFn: async () => {
      if (!draft.trim()) {
        throw new Error("Generate or write a proposal draft before saving.");
      }
      const nextVersion =
        Math.max(0, ...(savedQuery.data ?? []).map((item) => item.version ?? 0)) + 1;
      const { data, error } = await supabase
        .from("generated_documents")
        .insert({
          organization_id: organizationId,
          tender_id: tenderId,
          document_type: "technical_proposal",
          title: `Technical Proposal — ${tenderTitle}`,
          content_markdown: draft,
          version: nextVersion,
          approved: false,
        })
        .select("id")
        .single();
      if (error) throw error;
      return data.id;
    },
    onSuccess: async (id) => {
      setActiveId(id);
      await queryClient.invalidateQueries({
        queryKey: ["generated_documents", organizationId, tenderId],
      });
      toast.success("Proposal draft saved to this tender.");
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Could not save proposal draft."),
  });

  const startDraft = () => {
    setDraft(buildProposalDraft({ tenderTitle, companyName, requirements, documents }));
    setActiveId(null);
  };
  const loadSaved = (item: SavedProposal) => {
    setDraft(item.content_markdown ?? "");
    setActiveId(item.id);
  };

  return (
    <section className="glass-panel mt-5 overflow-hidden rounded-2xl">
      <div className="flex flex-col gap-4 border-b border-border/50 p-5 sm:flex-row sm:items-start sm:justify-between sm:p-6">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold">Bid document studio</h2>
            <Badge variant="outline" className="rounded-full">
              Deterministic draft
            </Badge>
          </div>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Build a structured technical proposal from this tender&apos;s requirements and verified
            Vault evidence. Unsupported company claims remain explicit placeholders.
          </p>
          <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck className="size-3.5 text-success" />
            {verifiedEvidenceCount} requirement(s) currently backed by verified Vault evidence
          </p>
        </div>
        <Button
          type="button"
          onClick={startDraft}
          className="shrink-0 rounded-xl"
          disabled={requirements.length === 0}
        >
          <FilePlus2 className="mr-2 size-4" />
          Build proposal draft
        </Button>
      </div>

      {savedQuery.isError ? (
        <div className="flex items-center gap-2 border-b border-border/50 px-5 py-3 text-sm text-destructive">
          Saved proposal drafts could not be loaded. Check your access and retry.
          <Button variant="ghost" size="sm" onClick={() => void savedQuery.refetch()}>
            Retry
          </Button>
        </div>
      ) : null}

      {(savedQuery.data ?? []).length ? (
        <div className="flex flex-wrap gap-2 border-b border-border/50 px-5 py-4">
          {(savedQuery.data ?? []).map((item) => (
            <Button
              key={item.id}
              type="button"
              size="sm"
              variant={activeId === item.id ? "secondary" : "outline"}
              className="rounded-xl"
              onClick={() => loadSaved(item)}
            >
              <FileText className="mr-1.5 size-3.5" />
              {item.title ?? `Proposal v${item.version ?? 1}`}
              <span className="ml-1 text-xs text-muted-foreground">v{item.version ?? 1}</span>
            </Button>
          ))}
        </div>
      ) : null}

      <div className="space-y-3 p-5 sm:p-6">
        <Textarea
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value);
            setActiveId(null);
          }}
          rows={18}
          className="min-h-[420px] font-mono text-xs leading-6"
          placeholder="Build a proposal draft to start. The draft will use verified evidence only and clearly mark sections that require your team's input."
          aria-label="Technical proposal draft in Markdown"
        />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            {activeId
              ? "Editing a saved version. Saving creates a new version."
              : "Unsaved changes are not stored until you save."}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              disabled={!draft.trim()}
              onClick={() => downloadMarkdown(draft, "jasmiq-technical-proposal.md")}
            >
              <Download className="mr-2 size-4" />
              Export Markdown
            </Button>
            <Button
              type="button"
              className="rounded-xl"
              disabled={!draft.trim() || saveDraft.isPending}
              onClick={() => saveDraft.mutate()}
            >
              <Save className="mr-2 size-4" />
              {saveDraft.isPending ? "Saving…" : "Save new version"}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
