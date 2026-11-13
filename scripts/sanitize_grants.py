#!/usr/bin/env python3
"""Conservatively remove unsafe PostgreSQL table privileges from client roles.

This is intentionally a narrow pg_dump GRANT rewriter, not a general SQL parser.
Unsupported/ambiguous grants to anon, authenticated, or PUBLIC fail closed.
"""
from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

RISKY_ROLES = {"anon", "authenticated", "public"}
UNSAFE_PRIVILEGES = {"TRUNCATE", "MAINTAIN"}

# Handles GRANT and ALTER DEFAULT PRIVILEGES ... GRANT statements. Keeps the
# prefix (including ALTER DEFAULT PRIVILEGES), object clause and trailing
# grant options exactly as supplied.
GRANT_STMT = re.compile(
    r"(?P<prefix>\\bGRANT\\s+)"
    r"(?P<privileges>.+?)\\s+ON\\s+(?P<object>.+?)\\s+TO\\s+"
    r"(?P<roles>.+?)"
    r"(?P<tail>\\s+WITH\\s+GRANT\\s+OPTION)?"
    r"(?P<granted_by>\\s+GRANTED\\s+BY\\s+[^;]+)?\\s*;",
    re.IGNORECASE | re.DOTALL,
)
# Match ALTER DEFAULT PRIVILEGES ... before its embedded GRANT keyword.
ALTER_DEFAULT = re.compile(
    r"(?P<alter>ALTER\\s+DEFAULT\\s+PRIVILEGES\\b.*?\\b)"
    r"(?P<grant>GRANT\\s+)",
    re.IGNORECASE | re.DOTALL,
)

def split_sql_list(value: str) -> list[str]:
    """Split comma lists without splitting quoted identifiers."""
    parts, buf, quoted, i = [], [], False, 0
    while i < len(value):
        ch = value[i]
        if ch == '"':
            buf.append(ch)
            if quoted and i + 1 < len(value) and value[i + 1] == '"':
                buf.append('"'); i += 2; continue
            quoted = not quoted
        elif ch == "," and not quoted:
            parts.append("".join(buf).strip()); buf = []
        else:
            buf.append(ch)
        i += 1
    if quoted:
        raise ValueError("unterminated quoted identifier in role list")
    parts.append("".join(buf).strip())
    return parts

def normalize_role(role: str) -> str:
    role = role.strip()
    if role.upper() == "PUBLIC":
        return "public"
    if role.startswith('"') and role.endswith('"'):
        return role[1:-1].replace('""', '"')
    if not re.fullmatch(r"[A-Za-z_][A-Za-z0-9_$]*", role):
        raise ValueError(f"unsupported/ambiguous role token: {role!r}")
    return role.lower()

def roles_of(value: str) -> set[str]:
    return {normalize_role(r) for r in split_sql_list(value)}

def privilege_tokens(value: str) -> list[str]:
    values = [p.strip().upper() for p in split_sql_list(value)]
    if len(values) == 1 and values[0] in {"ALL", "ALL PRIVILEGES"}:
        # ALL is unsafe by definition for client-facing object grants.
        return ["ALL", *sorted(UNSAFE_PRIVILEGES)]
    if any(not re.fullmatch(r"[A-Z][A-Z ]*", p) for p in values):
        raise ValueError(f"unsupported privilege list: {value!r}")
    return values

def transform(sql: str) -> tuple[str, int]:
    removed = 0
    def rewrite(match: re.Match[str]) -> str:
        nonlocal removed
        roles = roles_of(match.group("roles"))
        if not (roles & RISKY_ROLES):
            return match.group(0)
        privileges = privilege_tokens(match.group("privileges"))
        # Drop ALL entirely for client roles; never try to guess object-specific
        # privilege expansion. Explicit safe privileges remain.
        if "ALL" in privileges:
            removed += len(privileges)
            return ""
        kept = [p for p in privileges if p not in UNSAFE_PRIVILEGES]
        removed += len(privileges) - len(kept)
        if not kept:
            return ""
        original = match.group(0)
        grant_at = re.search(r"\\bGRANT\\s+", original, re.IGNORECASE)
        if not grant_at:
            raise ValueError("could not preserve GRANT statement prefix")
        prefix = original[:grant_at.start()]
        object_clause = match.group("object")
        roles_clause = match.group("roles")
        tail = match.group("tail") or ""
        granted_by = match.group("granted_by") or ""
        return f"{prefix}GRANT {', '.join(kept)} ON {object_clause} TO {roles_clause}{tail}{granted_by};"

    # Regex includes GRANT token, so ALTER DEFAULT PRIVILEGES prefix remains
    # part of each match and is preserved by rewrite().
    output = GRANT_STMT.sub(rewrite, sql)
    return output, removed

def verify(sql: str) -> list[str]:
    failures: list[str] = []
    for match in GRANT_STMT.finditer(sql):
        try:
            if roles_of(match.group("roles")) & RISKY_ROLES:
                privileges = privilege_tokens(match.group("privileges"))
                if "ALL" in privileges or set(privileges) & UNSAFE_PRIVILEGES:
                    failures.append(match.group(0).strip()[:240])
        except ValueError as exc:
            failures.append(f"Unparseable grant: {exc}: {match.group(0).strip()[:160]}")
    # Fail closed for client-role GRANT statements not parsed by our grammar.
    for stmt in re.findall(r"(?is)(?:ALTER\\s+DEFAULT\\s+PRIVILEGES\\b.*?\\b)?GRANT\\s+.*?;", sql):
        if not GRANT_STMT.fullmatch(stmt.strip()):
            if re.search(r"(?i)\\bTO\\s+(?:PUBLIC|anon|authenticated|\\"(?:anon|authenticated)\\")", stmt):
                failures.append("Unparsed client-role grant: " + stmt.strip()[:200])
    return failures

def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("source")
    parser.add_argument("destination")
    args = parser.parse_args()
    source = Path(args.source).read_text(encoding="utf-8")
    output, removed = transform(source)
    failures = verify(output)
    if failures:
        print("UNSAFE OR UNPARSEABLE GRANTS REMAIN:", file=sys.stderr)
        print("\\n".join(failures), file=sys.stderr)
        return 1
    Path(args.destination).write_text(output, encoding="utf-8")
    print(f"sanitized ok; removed {removed} unsafe privilege tokens/statements")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
