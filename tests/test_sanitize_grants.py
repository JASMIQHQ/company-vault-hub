import pytest
from scripts.sanitize_grants import GRANT, sanitize, verify

def run(sql):
    return sanitize(sql)[0]

@pytest.mark.parametrize("sql", [
    "GRANT TRUNCATE ON TABLE public.t TO anon;",
    "GRANT ALL ON TABLE public.t TO authenticated;",
    'GRANT SELECT, TRUNCATE ON TABLE public.t TO "anon", service_role;',
    "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon;",
    "GRANT MAINTAIN ON TABLE public.t TO PUBLIC;",
    "grant truncate on table public.t to ANON;",
    "GRANT SELECT, MAINTAIN ON TABLE public.t TO authenticated;",
])
def test_unsafe_removed(sql):
    out=run(sql)
    assert verify(out)==[]
    assert not GRANT.search(out) or not any(x in out.upper() for x in ("TRUNCATE","MAINTAIN"))

def test_service_role_untouched():
    sql="GRANT ALL ON TABLE public.t TO service_role;"
    assert run(sql)==sql

def test_select_kept():
    out=run("GRANT SELECT, TRUNCATE ON TABLE public.t TO anon;")
    assert "GRANT SELECT ON TABLE public.t TO anon;" in out

def test_mixed_role_keeps_safe_privilege():
    out=run('GRANT SELECT, TRUNCATE ON TABLE public.t TO "anon", service_role;')
    assert "SELECT" in out and "TRUNCATE" not in out.upper()

def test_public_is_risky():
    assert run("GRANT MAINTAIN ON TABLE public.t TO PUBLIC;").strip()==""

def test_verify_detects_unsafe():
    assert verify("GRANT TRUNCATE ON TABLE public.t TO anon;")

def test_quoted_comma_role_not_split():
    # Non-risky quoted role with comma should be preserved byte-for-byte.
    sql='GRANT ALL ON TABLE public.t TO "team,ops";'
    assert run(sql)==sql
