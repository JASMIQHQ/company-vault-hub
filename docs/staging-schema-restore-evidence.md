# Staging schema restore — evidence ledger

Updated: 2026-11-13

| Evidence item | Status | Evidence |
|---|---|---|
| Vercel Preview build for `e2a34e6` | PASS | Preview deployment Ready; frontend build completed |
| Sanitizer unit tests | PASS (limited) | 13 tests passed; these are unit tests only |
| Real production schema fixture download in PR #81 | FAIL | GitHub Actions step returned 401 Bad credentials |
| Artifact availability for export run `42649485410` | NOT AVAILABLE | GitHub artifact listing currently returns an empty array |
| Real schema SQL sanitized and independently checked | NOT PROVEN | Fixture download failed; sanitizer stage skipped |
| Production schema export without ACLs | PENDING | New privilege-free export workflow proposed in this PR |
| Staging database connection | NOT PROVEN | Supabase SQL connector returned PostgreSQL 28P01 for staging |
| Staging schema restore | NOT RUN | Restore workflow deliberately fails closed |
| Staging effective ACL audit | NOT RUN | No staging catalog connection |
| Staging default ACL review | NOT RUN | No staging catalog connection |
| Production Supabase Security Advisor | REVIEW REQUIRED | 16 RLS-enabled tables without policies; 19 SECURITY DEFINER functions executable by authenticated; 2 extensions in public; leaked-password protection disabled |

## Safety boundary

- No production database writes were performed during this audit.
- No staging restore was run.
- The regex-based grant sanitizer is retired.
- The new restore workflow is intentionally blocked until a reviewed grants allowlist exists and staging connectivity is verified.
