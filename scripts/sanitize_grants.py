#!/usr/bin/env python3
"""Conservative staging grant sanitizer; fail closed on ambiguous SQL."""
import argparse, re, sys
from pathlib import Path

RISKY = {"anon", "authenticated", "public"}
UNSAFE = {"TRUNCATE", "MAINTAIN"}
GRANT = re.compile(
 r"(?P<prefix>\bGRANT\s+)(?P<privs>.+?)\s+ON\s+(?P<object>.+?)\s+TO\s+"
 r"(?P<roles>.+?)(?P<tail>\s+WITH\s+GRANT\s+OPTION)?"
 r"(?P<by>\s+GRANTED\s+BY\s+[^;]+)?\s*;", re.I|re.S)

def split_list(s):
 out=[]; buf=[]; quoted=False; i=0
 while i<len(s):
  ch=s[i]
  if ch=='"':
   buf.append(ch)
   if quoted and i+1<len(s) and s[i+1]=='"': buf.append('"'); i+=2; continue
   quoted=not quoted
  elif ch==',' and not quoted: out.append(''.join(buf).strip()); buf=[]
  else: buf.append(ch)
  i+=1
 if quoted: raise ValueError("unterminated quoted identifier")
 out.append(''.join(buf).strip()); return out

def role_name(s):
 s=s.strip()
 if s.upper()=="PUBLIC": return "public"
 if s.startswith('"') and s.endswith('"'): return s[1:-1].replace('""','"')
 if not re.fullmatch(r"[A-Za-z_][A-Za-z0-9_$]*",s): raise ValueError("ambiguous role "+repr(s))
 return s.lower()

def role_set(s): return {role_name(x) for x in split_list(s)}
def privs(s):
 p=[x.strip().upper() for x in split_list(s)]
 if p in (["ALL"],["ALL PRIVILEGES"]): return ["ALL","TRUNCATE","MAINTAIN"]
 if any(not re.fullmatch(r"[A-Z][A-Z ]*",x) for x in p): raise ValueError("ambiguous privilege "+repr(s))
 return p

def sanitize(sql):
 removed=0
 def sub(m):
  nonlocal removed
  roles=role_set(m["roles"])
  if not roles & RISKY: return m.group(0)
  ps=privs(m["privs"])
  if "ALL" in ps: removed+=len(ps); return ""
  keep=[p for p in ps if p not in UNSAFE]; removed+=len(ps)-len(keep)
  if not keep: return ""
  return (m["prefix"]+", ".join(keep)+" ON "+m["object"]+" TO "+m["roles"]+
          (m["tail"] or "")+(m["by"] or "")+";")
 return GRANT.sub(sub,sql),removed

def verify(sql):
 bad=[]
 for m in GRANT.finditer(sql):
  try:
   if role_set(m["roles"]) & RISKY and (set(privs(m["privs"])) & UNSAFE or "ALL" in privs(m["privs"])):
    bad.append(m.group(0)[:240])
  except ValueError as e: bad.append("unparseable: "+str(e)+" :: "+m.group(0)[:160])
 # Catch any grant involving client roles which escaped the parser.
 for st in re.findall(r"(?is)(?:ALTER\s+DEFAULT\s+PRIVILEGES\b.*?\b)?GRANT\s+.*?;",sql):
  if not GRANT.fullmatch(st.strip()) and re.search(r'(?i)\bTO\s+(?:PUBLIC|anon|authenticated|"anon"|"authenticated")\b',st):
   bad.append("unparsed client-role grant: "+st[:200])
 return bad

def main():
 ap=argparse.ArgumentParser(); ap.add_argument("source"); ap.add_argument("destination"); a=ap.parse_args()
 raw=Path(a.source).read_text(encoding="utf-8"); out,n=sanitize(raw); bad=verify(out)
 if bad: print("UNSAFE/UNPARSEABLE GRANTS REMAIN:\n"+"\n".join(bad),file=sys.stderr); return 1
 Path(a.destination).write_text(out,encoding="utf-8"); print(f"sanitized ok; removed {n} unsafe privilege tokens/statements"); return 0
if __name__=="__main__": raise SystemExit(main())
