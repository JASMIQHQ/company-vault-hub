# G34 Threat Model — Company Authorization

## Decision

JASMIQ treats the **company** as the authorization boundary for company-owned procurement evidence.

- Organization membership establishes workspace access.
- Company membership establishes which legal company a user may operate on.
- Resource ownership is derived from the resource itself.
- A client-selected company ID is context, never proof of authorization.
- Role answers **what** a user may do; company membership answers **where** they may do it.

## Protected resources

The company boundary applies to:

- Company Vault documents
- Tenders
- Tender requirements
- Tender files
- Compliance matches
- Generated tender documents
- Document verification attempts and verified facts
- Bank-reference requests
- Affidavit requests
- Storage objects linked to those resources

## Required invariant

For evidence matching:

`tender.company_id = evidence.company_id`

A match must not be accepted merely because both records belong to the same organization.

## Current migration strategy

The first G34 migration creates `public.company_members` and backfills every active organization member into every active company in that organization. This is intentionally a **no-behavior-change backfill** for the current single-user workspace.

Future administration can narrow membership without changing the resource authorization model.

## Security layers

1. RLS limits direct Data API access.
2. `private.is_company_member(uuid)` is the narrow authorization primitive.
3. SECURITY DEFINER write functions validate company membership before privileged writes.
4. Read-only document functions use SECURITY INVOKER so RLS remains authoritative.
5. Storage policies resolve an object back to its persisted company-owned resource.
6. Edge Functions derive company ownership from the persisted tender/document and never trust request-body company IDs.

## Non-goals

G34 does not introduce a second organization system, duplicate evidence tables, or speculative enterprise permission matrices.
