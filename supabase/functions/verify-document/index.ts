import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";
import { DOCUMENT_TYPES, type VerifiedDocType } from "../_shared/document-classifier.ts";

const corsHeaders={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...corsHeaders,"Content-Type":"application/json"}});
const validType=(value:unknown):value is VerifiedDocType=>typeof value==="string"&&(DOCUMENT_TYPES as readonly string[]).includes(value);
const parseJson=(text:string)=>{try{return JSON.parse(text.replace(/^```json\s*/i,"").replace(/```\s*$/i,"").trim()) as Record<string,unknown>}catch{return null}};

Deno.serve(async(req)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:corsHeaders});
 try{
  const url=Deno.env.get("SUPABASE_URL"),serviceKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),anthropicKey=Deno.env.get("ANTHROPIC_API_KEY");
  const model=Deno.env.get("ANTHROPIC_MODEL")||"claude-sonnet-4-20250514";
  if(!url||!serviceKey)return json({error:"Supabase service configuration is missing."},500);
  if(!anthropicKey)return json({error:"ANTHROPIC_API_KEY is not configured."},500);
  const admin=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
  const token=(req.headers.get("Authorization")??"").replace(/^Bearer\s+/i,"");
  if(!token)return json({error:"Not authenticated."},401);
  const {data:userData,error:userError}=await admin.auth.getUser(token);
  if(userError||!userData.user)return json({error:"Not authenticated."},401);
  const body=await req.json().catch(()=>({})) as {document_id?:string};
  if(!body.document_id)return json({error:"A document_id is required."},400);
  const {data:profile}=await admin.from("profiles").select("id").eq("auth_user_id",userData.user.id).maybeSingle();
  if(!profile)return json({error:"No profile found for this user."},403);
  const {data:memberships}=await admin.from("organization_members").select("organization_id").eq("profile_id",profile.id);
  const orgIds=(memberships??[]).map(row=>row.organization_id).filter(Boolean);
  const {data:doc,error:docError}=await admin.from("company_documents").select("id,organization_id,company_id,document_name,original_filename,document_type,storage_path").eq("id",body.document_id).maybeSingle();
  if(docError)throw docError;
  if(!doc||!orgIds.includes(doc.organization_id))return json({error:"Document not found or not accessible."},404);
  const {data:blob,error:downloadError}=await admin.storage.from("company-documents").download(doc.storage_path);
  if(downloadError||!blob){await admin.from("company_documents").update({verification_status:"failed",verified_at:new Date().toISOString()}).eq("id",doc.id).eq("organization_id",doc.organization_id);return json({error:"Could not download document for verification."},502)}
  const bytes=new Uint8Array(await blob.arrayBuffer());let binary="";for(let i=0;i<bytes.length;i+=0x8000)binary+=String.fromCharCode(...bytes.subarray(i,i+0x8000));
  const base64=btoa(binary);
  const prompt=`You are JASMIQ's conservative Nigerian procurement document verifier. Inspect the supplied PDF itself. Classify it using ONLY this enum: ${DOCUMENT_TYPES.join(", ")}. Extract the document year only when explicitly present, otherwise null. Extract an explicit expiry date as YYYY-MM-DD only when present, otherwise null. Return ONLY JSON: {"doc_type":"ENUM","year":integer|null,"expiry_date":"YYYY-MM-DD"|null,"confidence":"high"|"low"}. Do not infer a year from today's date or filename alone. If ambiguous or unrelated, use OTHER and low confidence.`;
  const response=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"x-api-key":anthropicKey,"anthropic-version":"2023-06-01","content-type":"application/json"},body:JSON.stringify({model,max_tokens:300,system:prompt,messages:[{role:"user",content:[{type:"document",source:{type:"base64",media_type:"application/pdf",data:base64}},{type:"text",text:`Filename: ${doc.original_filename??doc.document_name??"unknown"}`}]}]})});
  if(!response.ok){const detail=await response.text();await admin.from("company_documents").update({verification_status:"failed",verified_at:new Date().toISOString()}).eq("id",doc.id).eq("organization_id",doc.organization_id);return json({error:"Claude verification failed.",diagnostics:detail.slice(0,500)},502)}
  const payload=await response.json();const content=(payload?.content??[]).filter((item:any)=>item?.type==="text").map((item:any)=>item.text).join("\n");const result=parseJson(content);
  if(!result||!validType(result.doc_type)){await admin.from("company_documents").update({verification_status:"failed",verified_at:new Date().toISOString()}).eq("id",doc.id).eq("organization_id",doc.organization_id);return json({error:"Claude returned an invalid verification payload."},502)}
  const year=typeof result.year==="number"&&Number.isInteger(result.year)&&result.year>=1900&&result.year<=2100?result.year:null;
  const expiryDate=typeof result.expiry_date==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(result.expiry_date)?result.expiry_date:null;
  const confidence=result.confidence==="high"?"high":"low";
  const status=result.doc_type==="OTHER"?"mismatch":"verified";
  const {error:updateError}=await admin.from("company_documents").update({verified_doc_type:result.doc_type,verified_year:year,verified_expiry_date:expiryDate,verification_status:status,verified_at:new Date().toISOString()}).eq("id",doc.id).eq("organization_id",doc.organization_id).eq("company_id",doc.company_id);
  if(updateError)throw updateError;
  return json({document_id:doc.id,verified_doc_type:result.doc_type,verified_year:year,verified_expiry_date:expiryDate,verification_status:status,confidence});
 }catch(error){console.error("verify-document failed",error);return json({error:error instanceof Error?error.message:"Document verification failed."},500)}
});
