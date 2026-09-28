# JASMIQ Security Policy

## Scope

JASMIQ handles company documents, tender requirements, compliance evidence and organisation-scoped procurement data.

Security issues are production-impacting when they could expose another organisation's data, another company's documents, tender evidence outside the selected company, private storage objects, authentication credentials or secrets.

## Reporting

Do not publish sensitive security details in a public GitHub issue. Report suspected vulnerabilities privately to the JASMIQ maintainers with the affected environment, exact reproduction steps, expected behaviour, observed behaviour, and sanitised screenshots or logs.

## Security principles

- Organisation isolation is mandatory.
- Company isolation is mandatory.
- RLS is the database enforcement layer.
- Service-role access is backend-only.
- Matching must never bypass company or organisation boundaries.
- Security-sensitive database functions must have an explicit access reason.
- Production changes require verification evidence.

## Release rule

A feature is not production-ready because the code compiles. It must pass the relevant acceptance test and provide evidence for the security boundary it changes.
