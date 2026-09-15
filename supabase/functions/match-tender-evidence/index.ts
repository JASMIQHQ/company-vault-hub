import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
type Status = "matched" | "manual_review" | "missing";
type Doc = { id:string; document_name:string|null; original_filename:string|null; document_type:string|null; category:string|null; expiry_date:string|null; verified_doc_type:string|null; verified_year:number|null; verified_expiry_date:string|null; document_status:string|null; deleted_at:string|null };
type Req = { id:string; requirement_name:string|null; requirement_text:string|null; category:string|null; display_order:number|null };
const norm=(v:string)=>v.toLowerCase().replace(/[^a-z0-9]+/g," ").replace(/\s+/g," ").trim();
const yearFrom=(v:string)=>{const m=v.match(/\b(20\d{2})\b/);return m?Number(m[1]):null};
const today=()=>new Date().toISOString().slice(0,10);
const STATUTORY=new Set(["TAX_CLEARANCE_CERTIFICATE","PENCOM_CERTIFICATE","ITF_CERTIFICATE","NSITF_CERTIFICATE","BPP_CERTIFICATE"]);
const SPECIAL:[RegExp,string][]=[[/audited (financial )?statements?|audited accounts/i,"AUDITED_ACCOUNTS"],[/bank reference/i,"BANK_REFERENCE"],[/company profile/i,"COMPANY_PROFILE"],[/sworn affidavit/i,"SWORN_AFFIDAVIT"],[/nitda.*(registration|contractor)/i,"NITDA_REGISTRATION"],[/ogisp/i,"OGISP_REGISTRATION"],[/cpn|computer professionals/i,"CPN_CERTIFICATE"],[/nemsa/i,"NEMSA_CERTIFICATE"],[/iso certification/i,"ISO_CERTIFICATION"],[/naddc approval/i,"NADDC_APPROVAL"],[/similar (projects?|experience)|relevant experience/i,"EXPERIENCE"],[/key personnel|professional registration/i,"KEY_PERSONNEL"],[/language and signature/i,"LANGUAGE_SIGNATURE"],[/lot (bidding )?limit/i,"LOT_LIMIT"]];
function specialType(text:string){for(const [re,t] of SPECIAL)if(re.test(text))return t;return null}
function aliasType(text:string, aliases:Array<{alias:string;canonical_type:string}>){const n=norm(text);for(const a of aliases){const x=norm(a.alias);if(x && (n===x || n.includes(` ${x} `) || n.startsWith(`${x} `) || n.endsWith(` ${x}`)))return a.canonical_type;}return null}
function reqType(r:Req,aliases:Array<{alias:string;canonical_type:string}>){const text=[r.requirement_name,r.requirement_text].filter(Boolean).join(" ");return specialType(text)||aliasType(text,aliases)}
function docType(d:Doc,aliases:Array<{alias:string;canonical_type:string}>){const verified=d.verified_doc_type?.trim();if(verified)return verified.toUpperCase();return aliasType([d.document_type,d.document_name,d.original_filename,d.category].filter(Boolean).join(" "),aliases)||specialType([d.document_type,d.document_name,d.original_filename,d.category].filter(Boolean).join(" "))}
function docYear(d:Doc){return d.verified_year ?? yearFrom(d.original_filename??"") ?? yearFrom(d.document_name??"") ?? yearFrom(d.document_type??"")}
function expiry(d:Doc){return d.verified_expiry_date ?? d.expiry_date}
function isActive(d:Doc){return !d.deleted_at && (!d.document_status || d.document_status==="active")}
function statutoryValid(d:Doc){const e=expiry(d);if(e && e<today())return false;const y=docYear(d);return y===new Date().getUTCFullYear() || (!!e && new Date(`${e}T00:00:00Z`).getUTCFullYear()===new Date().getUTCFullYear())}

Deno.serve(async(req)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:CORS});
 try{
  const url=Deno.env.get("SUPABASE_URL"), key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"); if(!url||!key)throw new Error("Supabase configuration is missing.");
  const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}}); const body=await req.json().catch(()=>({})); const tenderId=body?.tender_id;
  if(typeof tenderId!=="string")return new Response(JSON.stringify({error:"A valid tender_id is required."}),{status:400,headers:{...CORS,"Content-Type":"application/json"}});
  const token=(req.headers.get("Authorization")??"").replace(/^Bearer\s+/i,""); if(!token)return new Response(JSON.stringify({error:"Not authenticated."}),{status:401,headers:{...CORS,"Content-Type":"application/json"}});
  const {data:user}=await db.auth.getUser(token); if(!user.user)return new Response(JSON.stringify({error:"Not authenticated."}),{status:401,headers:{...CORS,"Content-Type":"application/json"}});
  const {data:p}=await db.from("profiles").select("id").eq("auth_user_id",user.user.id).maybeSingle(); if(!p)throw new Error("No profile found for this user.");
  const {data:mem}=await db.from("organization_members").select("organization_id").eq("profile_id",p.id); const orgs=(mem??[]).map(x=>x.organization_id);
  const {data:t}=await db.from("tenders").select("id,company_id,organization_id").eq("id",tenderId).maybeSingle(); if(!t||!orgs.includes(t.organization_id)||!t.company_id)throw new Error("Tender is not accessible or has no company.");
  const {data:aliases}=await db.from("document_type_aliases").select("alias,canonical_type").eq("active",true); const {data:reqs}=await db.from("tender_requirements").select("id,requirement_name,requirement_text,category,display_order").eq("tender_id",t.id).eq("organization_id",t.organization_id).order("display_order",{ascending:true});
  const {data:docs}=await db.from("company_documents").select("id,document_name,original_filename,document_type,category,expiry_date,verified_doc_type,verified_year,verified_expiry_date,document_status,deleted_at").eq("organization_id",t.organization_id).eq("company_id",t.company_id); const active=(docs??[] as Doc[]).filter(isActive);
  await db.from("compliance_matches").delete().eq("tender_id",t.id).eq("organization_id",t.organization_id);
  const out=[] as any[];
  for(const r of (reqs??[]) as Req[]){
   const rt=reqType(r,aliases??[]); let status:Status="missing", best:Doc|null=null, reason="No suitable deterministic metadata candidate."; const candidates=rt?(active.filter(d=>docType(d,aliases??[])===rt)):[];
   if(!rt){status="manual_review";reason="Requirement type is not safely classifiable from deterministic metadata."}
   else if(rt==="AUDITED_ACCOUNTS"){
    const target=[new Date().getUTCFullYear()-1,new Date().getUTCFullYear()-2,new Date().getUTCFullYear()-3]; const years=new Set(candidates.map(docYear).filter(Boolean) as number[]); const missingYears=target.filter(y=>!years.has(y)); best=candidates.find(d=>docYear(d)===target[0])??null; if(missingYears.length===0){status="matched";reason=`Audited accounts cover ${target.join(", ")}.`}else if(candidates.length){status="manual_review";reason=`Audited accounts are incomplete; missing year(s): ${missingYears.join(", ")}.`}else{status="missing";reason="No audited financial statements were found with deterministic year metadata."}
   } else if(STATUTORY.has(rt)){best=candidates.find(statutoryValid)??candidates[0]??null;if(!best){status="missing";reason="No matching statutory document was found."}else if(!statutoryValid(best)){status="manual_review";reason="Matching statutory document is expired or lacks sufficient current-year validity metadata."}else{status="matched";reason="Strong canonical document type and current-year validity metadata match."}}
   else if(candidates.length===1){best=candidates[0];const y=docYear(best),e=expiry(best);if((r.requirement_text??"").match(/20\d{2}/)&&!y){status="manual_review";reason="Candidate type matches but required year evidence is missing."}else if(e&&e<today()){status="manual_review";reason="Candidate document is expired."}else{status="matched";reason="Exact canonical document type match."}}
   else if(candidates.length>1){status="manual_review";reason="Multiple documents share the required type; human review is required."}
   const confidence=status==="matched"?.99:status==="missing"?0:.65; const explanation=best?`${reason} Candidate: ${best.document_name??best.original_filename??best.id}.`:`${reason}`;
   await db.from("compliance_matches").insert({organization_id:t.organization_id,tender_id:t.id,document_id:best?.id??null,requirement:[r.requirement_name,r.requirement_text].filter(Boolean).join(". "),requirement_type:rt??"unclassified",status,confidence,notes:JSON.stringify({match_basis:"DETERMINISTIC_METADATA",document_type:best?docType(best,aliases??[]):null,document_year:best?docYear(best):null,expiry_date:best?expiry(best):null})});
   await db.from("tender_requirements").update({status,matched_document_id:best?.id??null,confidence_score:confidence,explanation,match_basis:"DETERMINISTIC_METADATA"}).eq("id",r.id).eq("tender_id",t.id).eq("organization_id",t.organization_id);
   out.push({requirement_id:r.id,status,matched_document_id:best?.id??null,confidence,explanation});
  }
  const total=out.length,matched=out.filter(x=>x.status==="matched").length,review=out.filter(x=>x.status==="manual_review").length,missing=out.filter(x=>x.status==="missing").length; const pct=total?Math.round(matched/total*100):0;
  await db.from("tenders").update({compliance_percentage:pct,matching_status:review?"MATCHING_REVIEW":"MATCHED"}).eq("id",t.id).eq("organization_id",t.organization_id).eq("company_id",t.company_id);
  return new Response(JSON.stringify({tender_id:t.id,company_id:t.company_id,summary:{total,satisfied:matched,needs_review:review,missing,compliance_percentage:pct},results:out}),{headers:{...CORS,"Content-Type":"application/json"}});
 }catch(error){console.error(error);return new Response(JSON.stringify({error:error instanceof Error?error.message:String(error)}),{status:500,headers:{...CORS,"Content-Type":"application/json"}})}
});
