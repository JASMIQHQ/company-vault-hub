import "jsr:@supabase/supabase-js@2.58.0";
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

type Status = "matched" | "manual_review" | "missing" | "expired";
type Doc = { id:string; document_name:string|null; original_filename:string|null; document_type:string|null; category:string|null; expiry_date:string|null; verified_doc_type:string|null; verified_year:number|null; verified_expiry_date:string|null; document_status:string|null; deleted_at:string|null; created_at:string|null };
type Req = { id:string; requirement_name:string|null; requirement_text:string|null; category:string|null; display_order:number|null };
type Alias = { alias:string; canonical_type:string };

const ORIGINS = new Set(["https://company-vault-hub.netlify.app","https://company-vault-n6uvy4nux-emmanuel-bosah-s-projects.vercel.app","http://localhost:5173","http://localhost:3000"]);
const responseHeaders = (origin:string|null) => ({
  "Access-Control-Allow-Origin": origin && ORIGINS.has(origin) ? origin : "https://company-vault-hub.netlify.app",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
});
const json = (body:unknown,status=200,origin:string|null=null) => new Response(JSON.stringify(body),{status,headers:{...responseHeaders(origin),"Content-Type":"application/json"}});
const norm=(v:string)=>v.toLowerCase().replace(/[^a-z0-9]+/g," ").replace(/\s+/g," ").trim();
const canonical=(v:string)=>norm(v).replace(/ /g,"_").toUpperCase();
const yearFrom=(v:string)=>{const m=v.match(/\b(20\d{2})\b/);return m?Number(m[1]):null};
const today=()=>new Date().toISOString().slice(0,10);
const currentYear=()=>new Date().getUTCFullYear();
const STATUTORY=new Set(["TAX_CLEARANCE_CERTIFICATE","PENCOM_CERTIFICATE","ITF_CERTIFICATE","NSITF_CERTIFICATE","BPP_CERTIFICATE"]);
const SPECIAL:[RegExp,string][]=[[/audited (financial )?statements?|audited accounts/i,"AUDITED_ACCOUNTS"],[/bank reference/i,"BANK_REFERENCE"],[/company profile/i,"COMPANY_PROFILE"],[/sworn affidavit/i,"SWORN_AFFIDAVIT"],[/nitda.*(registration|contractor)/i,"NITDA_REGISTRATION"],[/ogisp/i,"OGISP_REGISTRATION"],[/cpn|computer professionals/i,"CPN_CERTIFICATE"],[/nemsa/i,"NEMSA_CERTIFICATE"],[/iso certification/i,"ISO_CERTIFICATION"],[/naddc approval/i,"NADDC_APPROVAL"],[/similar (projects?|experience)|relevant experience/i,"EXPERIENCE"],[/key personnel|professional registration/i,"KEY_PERSONNEL"],[/language and signature/i,"LANGUAGE_SIGNATURE"],[/lot (bidding )?limit/i,"LOT_LIMIT"]];
function specialType(text:string){for(const [re,t] of SPECIAL)if(re.test(text))return t;return null}
function aliasType(text:string,aliases:Alias[]){const n=norm(text);for(const a of aliases){const x=norm(a.alias);if(x&&(n===x||n.startsWith(`${x} `)||n.endsWith(` ${x}`)||n.includes(` ${x} `)))return canonical(a.canonical_type);}return null}
function reqType(r:Req,a:Alias[]){const text=[r.requirement_name,r.requirement_text].filter(Boolean).join(" ");return specialType(text)||aliasType(text,a)}
function docType(d:Doc,a:Alias[]){if(d.verified_doc_type?.trim())return canonical(d.verified_doc_type);return aliasType([d.document_type,d.document_name,d.original_filename,d.category].filter(Boolean).join(" "),a)||specialType([d.document_type,d.document_name,d.original_filename,d.category].filter(Boolean).join(" "))}
function docYear(d:Doc){return d.verified_year??yearFrom(d.original_filename??"")??yearFrom(d.document_name??"")??yearFrom(d.document_type??"")}
function expiry(d:Doc){return d.verified_expiry_date??d.expiry_date}
function active(d:Doc){return !d.deleted_at&&(!d.document_status||d.document_status==="active")}
function expired(d:Doc){const e=expiry(d);return !!e&&e<today()}
function statValid(d:Doc){if(expired(d))return false;const y=docYear(d),e=expiry(d);return y===currentYear()||!!e&&new Date(`${e}T00:00:00Z`).getUTCFullYear()===currentYear()}
function newest(docs:Doc[]){return [...docs].sort((a,b)=>String(b.created_at??"").localeCompare(String(a.created_at??"")))[0]??null}

Deno.serve(async(req)=>{
 const origin=req.headers.get("Origin");
 if(req.method==="OPTIONS")return new Response("ok",{headers:responseHeaders(origin)});
 try{
  const url=Deno.env.get("SUPABASE_URL"), key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"); if(!url||!key)throw new Error("Supabase configuration is missing.");
  const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}}); const body=await req.json().catch(()=>({})); const tenderId=body?.tender_id;
  if(typeof tenderId!=="string")return json({error:"A valid tender_id is required."},400,origin);
  const token=(req.headers.get("Authorization")??"").replace(/^Bearer\s+/i,""); if(!token)return json({error:"Not authenticated."},401,origin);
  const {data:user,error:userError}=await db.auth.getUser(token); if(userError||!user.user)return json({error:"Not authenticated."},401,origin);
  const {data:profile,error:profileError}=await db.from("profiles").select("id").eq("auth_user_id",user.user.id).maybeSingle(); if(profileError)throw profileError; if(!profile)return json({error:"No profile found for this user."},403,origin);
  const {data:memberships,error:membershipError}=await db.from("organization_members").select("organization_id").eq("profile_id",profile.id); if(membershipError)throw membershipError;
  const orgIds=(memberships??[]).map(x=>x.organization_id);
  const {data:t,error:tenderError}=await db.from("tenders").select("id,company_id,organization_id").eq("id",tenderId).maybeSingle(); if(tenderError)throw tenderError;
  if(!t||!t.company_id||!orgIds.includes(t.organization_id))return json({error:"Tender is not accessible or has no company."},403,origin);
  const [{data:aliases,error:aliasError},{data:reqs,error:reqError},{data:docs,error:docError}]=await Promise.all([
   db.from("document_type_aliases").select("alias,canonical_type").eq("active",true),
   db.from("tender_requirements").select("id,requirement_name,requirement_text,category,display_order").eq("tender_id",t.id).eq("organization_id",t.organization_id).order("display_order",{ascending:true}),
   db.from("company_documents").select("id,document_name,original_filename,document_type,category,expiry_date,verified_doc_type,verified_year,verified_expiry_date,document_status,deleted_at,created_at").eq("organization_id",t.organization_id).eq("company_id",t.company_id),
  ]); if(aliasError)throw aliasError;if(reqError)throw reqError;if(docError)throw docError;
  const activeDocs=(docs??[] as Doc[]).filter(active); const matches:any[]=[];
  const replace=async(r:Req)=>{
   const rt=reqType(r,aliases??[]); const pool=rt?activeDocs.filter(d=>docType(d,aliases??[])===rt):[]; let status:Status="missing", best:Doc|null=null, reason="No suitable deterministic metadata candidate.";
   if(!rt){status="manual_review";reason="Requirement is not safely classifiable as a Vault evidence type."}
   else if(rt==="AUDITED_ACCOUNTS"){
    const target=[currentYear()-1,currentYear()-2,currentYear()-3], years=new Set(pool.map(docYear).filter(Boolean) as number[]), missing=target.filter(y=>!years.has(y)); best=newest(pool.filter(d=>docYear(d)===target[0]));
    if(!missing.length){status="matched";reason=`Audited accounts cover ${target.join(", ")}.`}else if(pool.length){status="manual_review";reason=`Audited accounts are incomplete; missing year(s): ${missing.join(", ")}.`}else{status="missing";reason="No audited financial statements were found with deterministic year metadata."}
   } else if(STATUTORY.has(rt)){
    const valid=pool.filter(statValid); best=newest(valid.length?valid:pool); if(!pool.length){status="missing";reason="No matching statutory document was found."}else if(!valid.length){status="expired";reason="The matching statutory document set has no currently valid document."}else{status="matched";reason="Strong canonical document type and current-year validity metadata match."}
   } else if(pool.length){
    best=newest(pool); const y=docYear(best),e=expiry(best); if((r.requirement_text??"").match(/20\d{2}/)&&!y){status="manual_review";reason="Candidate type matches but required year evidence is missing."}else if(e&&e<today()){status="expired";reason="The latest matching document is expired."}else{status="matched";reason="Canonical document type match using the latest active Vault version."}
   } else {status="missing";reason="No active Company Vault document matches the requirement type."}
   const confidence=status==="matched"?.99:status==="missing"||status==="expired"?0:.65; const explanation=best?`${reason} Candidate: ${best.document_name??best.original_filename??best.id}.`:reason;
   const {error:matchError}=await db.from("compliance_matches").insert({organization_id:t.organization_id,tender_id:t.id,document_id:best?.id??null,requirement:[r.requirement_name,r.requirement_text].filter(Boolean).join(". "),requirement_type:rt??"unclassified",status,confidence,notes:JSON.stringify({match_basis:"DETERMINISTIC_METADATA",document_type:best?docType(best,aliases??[]):null,document_year:best?docYear(best):null,expiry_date:best?expiry(best):null})}); if(matchError)throw matchError;
   const {error:updateError}=await db.from("tender_requirements").update({status,matched_document_id:best?.id??null,confidence_score:confidence,explanation,match_basis:"DETERMINISTIC_METADATA"}).eq("id",r.id).eq("tender_id",t.id).eq("organization_id",t.organization_id); if(updateError)throw updateError;
   matches.push({requirement_id:r.id,status,matched_document_id:best?.id??null,confidence,explanation});
  };
  const {error:deleteError}=await db.from("compliance_matches").delete().eq("tender_id",t.id).eq("organization_id",t.organization_id); if(deleteError)throw deleteError;
  for(const r of (reqs??[]) as Req[])await replace(r);
  const total=matches.length,matched=matches.filter(x=>x.status==="matched").length,review=matches.filter(x=>x.status==="manual_review").length,missing=matches.filter(x=>x.status==="missing").length,expiredCount=matches.filter(x=>x.status==="expired").length,pct=total?Math.round(matched/total*100):0;
  const matchingStatus=(missing||expiredCount||review)?"MATCHING_REVIEW":"MATCHED"; const {error:tenderUpdateError}=await db.from("tenders").update({compliance_percentage:pct,matching_status:matchingStatus}).eq("id",t.id).eq("organization_id",t.organization_id).eq("company_id",t.company_id); if(tenderUpdateError)throw tenderUpdateError;
  return json({tender_id:t.id,company_id:t.company_id,summary:{total,satisfied:matched,needs_review:review,missing,expired:expiredCount,compliance_percentage:pct},results:matches},200,origin);
 }catch(error){console.error("match-tender-evidence unexpected error",error);return json({error:error instanceof Error?error.message:"Unexpected matching error."},500,origin)}
});
