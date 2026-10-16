# G34: Company/organisation consistency audit

## Finding

The live definitions of `public.register_document_upload` and `public.calculate_tender_compliance` use SECURITY DEFINER execution.

- `register_document_upload` obtains the document `organization_id` from `current_organization_id()`, then checks membership in the requested company. For users with memberships in multiple organisations, the selected organisation is not guaranteed to be the requested company's organisation.
- `calculate_tender_compliance` verifies membership in the tender's company but does not explicitly reject a tender whose stored `organization_id` differs from that company's organisation before writing its compliance percentage.
- Current table foreign keys validate that the referenced company and organisation exist independently; they do not enforce that the two organisation IDs agree.

## Read-only evidence

The live audit query returned zero mismatched company-document and tender organisation relationships in the rows examined. No production rows were changed.

## Proposed fix

1. In `register_document_upload`, derive the organisation from the active persisted company row, then check company membership before inserting.
2. In `calculate_tender_compliance`, verify the persisted tender organisation equals the active company's organisation before reading requirements or updating compliance.
3. Add regression checks for multi-organisation membership, mismatched organisation/company relationships, and valid same-company operations.
4. Apply only through the reviewed migration/release process after migration provenance and authenticated G34 gates pass.

## Release status

Finding confirmed from live function definitions. Proposed SQL migration was not committed or applied because the repository write action was blocked by the execution safety checks. No production DDL, data changes, or deployment were performed.
