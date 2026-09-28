import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";
import { DOCUMENT_TYPES, normalizeDocumentType, type VerifiedDocType } from "../_shared/document-classifier.ts";

const C={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};
const MAX=20*1024*1024;
type Provider="gemini"|"anthropic";
const json=(b:unknown,s=200)=>new Response(JSON.stringify(b),{status:s,headers:{...C,"Content-Type":"application/json"}});
const parse=(s:string)=>{try{return JSON.parse(s.replace(/^```json\s*/i,"").replace(/```\s*$/i,"").trim()) as Record<string,unknown>}catch{return null}};
const validType=(v:unknown):v is VerifiedDocType=>typeof v==="string"&&(DOCUMENT_TYPES as readonly string[]).includes(v);
const provider=():Provider=>Deno.env.get("AI_PROVIDER")?.toLowerCase()==="anthropic"?"anthropic":"gemini";
const prompt=()=>`You are JASMIQ's document verification engine for Nigerian procurement compliance. Inspect the supplied PDF itself. Classify it conservatively using ONLY this enum: ${DOCUMENT_TYPES.join(", ")}. Extract the document year when explicitly present, otherwise null. Extract an explicit expiry date as YYYY-MM-DD when present, otherwise null. Return JSON only with exactly: {"doc_type":"ENUM","year":integer|null,"expiry_date":"YYYY-MM-DD"|null,"confidence":"high"|"low"}. Do not infer a year from today's date or filename alone. If ambiguous or unrelated, use OTHER and low confidence.`;

async function aiCall(p:Provider,key:string,base64:string,filename:string,documentId:string){
  if(p==="anthropic"){
    const model=Deno.env.get("ANTHROPIC_MODEL")||"claude-sonnet-4-6";
    const r=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"x-api-key":key,"anthropic-version":"2023-06-01","content-type":"application/json"},body:JSON.stringify({model,max_tokens:300,system:prompt(),messages:[{role:"user",content:[{type:"document",source:{type:"base64",media_type:"application/pdf",data:base64}},{type:"text",text:`Filename: ${filename}`}]}]})});
    if(!r.ok)return {ok:false as const,provider:p,model,stage:"AI_UPSTREAM_HTTP",message:"Claude verification failed.",diagnostics:{http_status:r.status,detail:await r.text()}};
    const x=await r.json(); return {ok:true as const,provider:p,model,text:(x?.content??[]).filter((i:any)=>i?.type==="text").map((i:any)=>i.text).join("\n"),diagnostics:null};
  }
  const model=Deno.env.get("GEMINI_MODEL")||"gemini-3.6-flash";
  const r=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,{method:"POST",headers:{"x-goog-api-key":key,"content-type":"application/json"},body:JSON.stringify({contents:[{role:"user",parts:[{text:prompt()},{inlineData:{mimeType:"application/pdf",data:base64}},{text:`Filename: ${filename}`}]}],generationConfig:{responseMimeType:"application/json",maxOutputTokens:1024,thinkingConfig:{thinkingLevel:"minimal"}}})});
  if(!r.ok)return {ok:false as const,provider:p,model,stage:"AI_UPSTREAM_HTTP",message:"Gemini verification failed.",diagnostics:{http_status:r.status,detail:await r.text()}};
  const x=await r.json(); const parts=x?.candidates?.[0]?.content?.parts??[]; const text=parts.filter((i:any)=>typeof i?.text==="string").map((i:any)=>i.text).join("\n");
  return {ok:true as const,provider:p,model,text,diagnostics:{finish_reason:x?.candidates?.[0]?.finishReason??null}};
}

Deno.serve(async req=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:C});
  const url=Deno.env.get("SUPABASE_URL"),serviceKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),p=provider(),key=p==="gemini"?Deno.env.get("GEMINI_API_KEY"):Deno.env.get("ANTHROPIC_API_KEY");
  if(!url||!serviceKey||!key)return json({error:"Verification service configuration is missing.",provider:p},500);
  const admin=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
  let userId:string|null=null,doc:any=null;
  const recordAttempt=async(outcome:"verified"|"mismatch"|"failed",extra:any={})=>{if(!doc)return; const {data,error}=await admin.from("document_verification_attempts").insert({document_id:doc.id,organization_id:doc.organization_id,company_id:doc.company_id,requested_by:userId,provider:p,model:extra.model??null,outcome,detected_doc_type:extra.doc_type??null,detected_year:extra.year??null,detected_expiry_date:extra.expiry_date??null,confidence:extra.confidence??null,error_stage:extra.error_stage??null,error_message:extra.error_message??null,diagnostics:extra.diagnostics??null}).select("id").single(); if(error)throw error; return data.id;};
  try{
    const token=(req.headers.get("Authorization")??"").replace(/^Bearer\s+/i,""); if(!token)return json({error:"Not authenticated."},401);
    const {data:u,error:ue}=await admin.auth.getUser(token); if(ue||!u.user)return json({error:"Not authenticated."},401); userId=u.user.id;
    const body=await req.json().catch(()=>({})) as {document_id?:string}; if(!body.document_id)return json({error:"A document_id is required."},400);
    const {data:profile}=await admin.from("profiles").select("id").eq("auth_user_id",u.user.id).maybeSingle(); if(!profile)return json({error:"No profile found for this user."},403);
    const {data:memberships}=await admin.from("organization_members").select("organization_id").eq("profile_id",profile.id); const orgs=(memberships??[]).map(x=>x.organization_id).filter(Boolean);
    const {data:d,error:de}=await admin.from("company_documents").select("id,organization_id,company_id,document_name,original_filename,document_type,category,storage_path,mime_type").eq("id",body.document_id).maybeSingle(); if(de)throw de; doc=d;
    if(!doc||!orgs.includes(doc.organization_id))return json({error:"Document not found or not accessible."},404);
    const {data:companyMembership}=await admin.from("company_members").select("company_id").eq("company_id",doc.company_id).eq("profile_id",profile.id).maybeSingle();
    if(!companyMembership)return json({error:"Document not found or not accessible."},404);
    const {data:blob,error:dl}=await admin.storage.from("company-documents").download(doc.storage_path);
    if(dl||!blob){await recordAttempt("failed",{error_stage:"STORAGE_DOWNLOAD",error_message:"Could not download document for verification."});await admin.from("company_documents").update({verification_status:"failed",verified_at:new Date().toISOString()}).eq("id",doc.id).eq("organization_id",doc.organization_id).eq("company_id",doc.company_id);return json({error:"Could not download document for verification.",stage:"STORAGE_DOWNLOAD"},502);}
    const bytes=new Uint8Array(await blob.arrayBuffer()); if(bytes.byteLength>MAX){await recordAttempt("failed",{error_stage:"PDF_TOO_LARGE",error_message:"PDF exceeds 20 MB limit."});await admin.from("company_documents").update({verification_status:"failed",verified_at:new Date().toISOString()}).eq("id",doc.id).eq("organization_id",doc.organization_id).eq("company_id",doc.company_id);return json({error:"PDF_TOO_LARGE",document_id:doc.id,raw_bytes:bytes.byteLength,max_raw_bytes:MAX},413);}
    const chunks:string[]=[];for(let i=0;i<bytes.length;i+=0x8000)chunks.push(String.fromCharCode(...bytes.subarray(i,i+0x8000))); const base64=btoa(chunks.join("")); const filename=doc.original_filename??doc.document_name??"unknown";
    let result:any;try{result=await aiCall(p,key,base64,filename,doc.id)}catch(e){await recordAttempt("failed",{error_stage:"AI_REQUEST_EXCEPTION",error_message:e instanceof Error?e.message:String(e)});await admin.from("company_documents").update({verification_status:"failed",verified_at:new Date().toISOString()}).eq("id",doc.id).eq("organization_id",doc.organization_id).eq("company_id",doc.company_id);return json({error:"AI verification request failed.",stage:"AI_REQUEST_EXCEPTION"},502)}
    if(!result.ok){await recordAttempt("failed",{model:result.model,error_stage:result.stage,error_message:result.message,diagnostics:result.diagnostics});await admin.from("company_documents").update({verification_status:"failed",verified_at:new Date().toISOString()}).eq("id",doc.id).eq("organization_id",doc.organization_id).eq("company_id",doc.company_id);return json({error:result.message,provider:p,stage:result.stage,diagnostics:result.diagnostics},502)}
    const parsed=parse(result.text); if(!parsed||!validType(parsed.doc_type)){await recordAttempt("failed",{model:result.model,error_stage:"AI_CONTENT_PARSE_EXCEPTION",error_message:"Invalid verification payload.",diagnostics:{extracted_text:result.text}});await admin.from("company_documents").update({verification_status:"failed",verified_at:new Date().toISOString()}).eq("id",doc.id).eq("organization_id",doc.organization_id).eq("company_id",doc.company_id);return json({error:"Invalid verification payload.",provider:p,model:result.model,stage:"AI_CONTENT_PARSE_EXCEPTION"},502)}
    const year=typeof parsed.year==="number"&&Number.isInteger(parsed.year)&&parsed.year>=1900&&parsed.year<=2100?parsed.year:null; const expiry=typeof parsed.expiry_date==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(parsed.expiry_date)?parsed.expiry_date:null; const confidence=parsed.confidence==="high"?"high":"low"; const detected=parsed.doc_type as VerifiedDocType; const declared=normalizeDocumentType(doc.document_type); const mismatch=Boolean(declared&&declared!=="OTHER"&&detected!=="OTHER"&&declared!==detected); const status=detected==="OTHER"?"mismatch":mismatch&&confidence==="high"?"mismatch":"verified";
    const attemptId=await recordAttempt(status,{model:result.model,doc_type:detected,year,expiry_date:expiry,confidence});
    const now=new Date().toISOString(); const {error:up}=await admin.from("company_documents").update({verified_doc_type:detected,verified_year:year,verified_expiry_date:expiry,verification_status:status,verified_at:now}).eq("id",doc.id).eq("organization_id",doc.organization_id).eq("company_id",doc.company_id); if(up)throw up;
    if(status==="verified"){
      const {error:factError}=await admin.from("document_verified_facts").insert({document_id:doc.id,organization_id:doc.organization_id,company_id:doc.company_id,doc_type:detected,doc_year:year,expiry_date:expiry,confidence,verification_attempt_id:attemptId,verified_at:now}); if(factError)throw factError;
    }
    return json({document_id:doc.id,verified_doc_type:detected,verified_year:year,verified_expiry_date:expiry,verification_status:status,confidence,provider:p,model:result.model,verification_attempt_id:attemptId});
  }catch(e){console.error("verify-document failed",e);return json({error:e instanceof Error?e.message:"Document verification failed.",stage:"UNHANDLED_EXCEPTION"},500)}
});
