import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";
import { authorizeCompanyMembership } from "../_shared/company-authorization.ts";
const BUCKET="company-documents", TTL=60, MAX=20*1024*1024;
const CORS={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};
type Mode="preview"|"download"|"delete"|"prepare_upload"|"register_upload"|"cleanup_upload";
type Doc={id:string;organization_id:string;company_id:string;document_name:string;storage_path:string|null;deleted_at:string|null};
const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...CORS,"Content-Type":"application/json"}});
const digest=async(b:ArrayBuffer)=>Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",b))).map(x=>x.toString(16).padStart(2,"0")).join("");
function mime(bytes:Uint8Array):string|null {
 if(bytes.length>=5&&new TextDecoder().decode(bytes.slice(0,5))==="%PDF-")return "application/pdf";
 if(bytes.length>=8&&[137,80,78,71,13,10,26,10].every((v,i)=>bytes[i]===v))return "image/png";
 if(bytes.length>=3&&bytes[0]===255&&bytes[1]===216&&bytes[2]===255)return "image/jpeg";
 return null;
}
function validPath(company:string,path:string){return /^[0-9a-f-]{36}$/i.test(company)&&new RegExp("^"+company+"/[A-Za-z0-9._-]+/[0-9]+_[A-Za-z0-9._-]+$").test(path);}
Deno.serve(async(req)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:CORS});
 if(req.method!=="POST")return reply({error:"Method not allowed."},405);
 const url=Deno.env.get("SUPABASE_URL"), service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
 const anon=Deno.env.get("SUPABASE_PUBLISHABLE_KEY")??Deno.env.get("SUPABASE_ANON_KEY");
 if(!url||!service||!anon)return reply({error:"Document access service configuration is missing."},500);
 const auth=req.headers.get("Authorization"),token=(auth??"").replace(/^Bearer\\s+/i,"");
 if(!auth||!token)return reply({error:"Not authenticated."},401);
 const user=createClient(url,anon,{global:{headers:{Authorization:auth}},auth:{persistSession:false,autoRefreshToken:false}});
 const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
 try{
  const {data:u,error:ue}=await user.auth.getUser(token);if(ue||!u.user)return reply({error:"Not authenticated."},401);
  const body=await req.json().catch(()=>({})) as Record<string,unknown>,mode=body.mode as Mode;
  const {data:profile,error:pe}=await admin.from("profiles").select("id").eq("auth_user_id",u.user.id).maybeSingle();
  if(pe)throw pe;if(!profile)return reply({error:"No profile found for this user."},403);
  const {data:members,error:me}=await admin.from("organization_members").select("organization_id,is_owner").eq("profile_id",profile.id);
  if(me)throw me;
  const authorize=(companyId:string,orgId:string)=>authorizeCompanyMembership(admin,{profileId:profile.id,companyId,organizationId:orgId,organizationMemberships:members??[]});
  const complete=async(id:string,documentId?:string)=>{
   const patch:Record<string,unknown>={status:"completed",completed_at:new Date().toISOString(),updated_at:new Date().toISOString(),last_error:null};
   if(documentId)patch.document_id=documentId;
   const {error}=await admin.from("vault_storage_cleanup").update(patch).eq("id",id).eq("status","pending");if(error)throw error;
  };
  const failed=async(id:string,error:unknown)=>{
   const {error:e}=await admin.from("vault_storage_cleanup").update({attempts:1,last_error:error instanceof Error?error.message.slice(0,500):"Storage cleanup failed",updated_at:new Date().toISOString()}).eq("id",id).eq("status","pending");
   if(e)console.error("Cleanup retry state update failed",e);
  };
  if(mode==="prepare_upload"){
   const company=String(body.company_id??""),path=String(body.storage_path??"");
   if(!validPath(company,path))return reply({error:"Invalid company storage path."},400);
   const {data:c,error:ce}=await admin.from("companies").select("id,organization_id").eq("id",company).eq("is_active",true).maybeSingle();
   if(ce)throw ce;if(!c||!(await authorize(company,c.organization_id)))return reply({error:"Company not found or not accessible."},404);
   const cutoff=new Date(Date.now()-15*60*1000).toISOString();
   const {data:stale,error:se}=await admin.from("vault_storage_cleanup").select("id,storage_path,company_id,organization_id")
    .eq("profile_id",profile.id).eq("action","upload").eq("status","pending").lt("created_at",cutoff).limit(25);
   if(se)throw se;
   for(const item of stale??[]){
    if(!(await authorize(item.company_id,item.organization_id)))continue;
    const {data:doc,error:de}=await admin.from("company_documents").select("id").eq("storage_path",item.storage_path).maybeSingle();if(de)throw de;
    if(doc){await complete(item.id,doc.id);continue;}
    const {error:re}=await admin.storage.from(BUCKET).remove([item.storage_path]);
    if(!re)await complete(item.id);else await failed(item.id,re);
   }
   const {data:intent,error:ie}=await admin.from("vault_storage_cleanup").insert({bucket_id:BUCKET,storage_path:path,organization_id:c.organization_id,company_id:company,profile_id:profile.id,action:"upload"}).select("id").single();
   if(ie)throw ie;return reply({intent_id:intent.id});
  }
  if(mode==="register_upload"){
   const id=String(body.intent_id??""),company=String(body.company_id??""),path=String(body.storage_path??"");
   const {data:i,error:ie}=await admin.from("vault_storage_cleanup").select("id,organization_id").eq("id",id).eq("profile_id",profile.id).eq("company_id",company).eq("storage_path",path).eq("action","upload").eq("status","pending").maybeSingle();
   if(ie)throw ie;if(!i||!(await authorize(company,i.organization_id)))return reply({error:"Upload intent not found or not accessible."},404);
   const {data:file,error:fe}=await admin.storage.from(BUCKET).download(path);if(fe||!file)throw fe??new Error("Uploaded object not found.");
   if(file.size<1||file.size>MAX)throw new Error("File size must be between 1 byte and 20 MB.");
   const bytes=await file.arrayBuffer(),actualMime=mime(new Uint8Array(bytes));if(!actualMime)throw new Error("File content is not a supported PDF, PNG or JPEG.");
   const {data:docId,error:re}=await admin.rpc("register_document_upload",{
    p_company_id:company,p_category:String(body.category??""),p_document_type:String(body.document_type??""),
    p_document_name:String(body.document_name??""),p_original_filename:String(body.original_filename??""),
    p_storage_path:path,p_mime_type:actualMime,p_file_size:file.size,p_sha256_hash:await digest(bytes),
    p_expiry_date:body.expiry_date?String(body.expiry_date):null,p_uploaded_by:profile.id
   });
   if(re){
    const {error:ce}=await admin.storage.from(BUCKET).remove([path]);if(!ce)await complete(i.id);else await failed(i.id,ce);
    if(re.code==="23505")return reply({error:"A document with the same content already exists in this company."},409);
    throw re;
   }
   return reply({document_id:docId});
  }
  if(mode==="cleanup_upload"){
   const id=String(body.intent_id??"");
   const {data:i,error:ie}=await admin.from("vault_storage_cleanup").select("id,company_id,organization_id,storage_path")
    .eq("id",id).eq("profile_id",profile.id).eq("action","upload").eq("status","pending").maybeSingle();
   if(ie)throw ie;if(!i||!(await authorize(i.company_id,i.organization_id)))return reply({error:"Upload intent not found or not accessible."},404);
   const {data:doc,error:de}=await admin.from("company_documents").select("id").eq("storage_path",i.storage_path).maybeSingle();if(de)throw de;
   if(doc){await complete(i.id,doc.id);return reply({cleaned:false,registered:true});}
   const {error:re}=await admin.storage.from(BUCKET).remove([i.storage_path]);
   if(re){await failed(i.id,re);return reply({error:"Cleanup remains queued for retry."},202);}
   await complete(i.id);return reply({cleaned:true});
  }
  if(mode!=="preview"&&mode!=="download"&&mode!=="delete")return reply({error:"Unsupported document access mode."},400);
  const docId=String(body.document_id??"");if(!docId)return reply({error:"A document_id is required."},400);
  const query=user.from("company_documents").select("id,organization_id,company_id,document_name,storage_path,deleted_at").eq("id",docId);
  const {data:d,error:de}=mode==="delete"?await query.not("deleted_at","is",null).maybeSingle():await query.is("deleted_at",null).maybeSingle();
  if(de)throw de;if(!d)return reply({error:"Document not found or not accessible."},404);
  const doc=d as Doc;if(!(await authorize(doc.company_id,doc.organization_id)))return reply({error:"Document not found or not accessible."},404);
  const action=mode==="preview"?"document_preview":mode==="download"?"document_download":"document_permanent_delete";
  const {error:ae}=await admin.from("audit_logs").insert({organization_id:doc.organization_id,profile_id:profile.id,action,entity_type:"company_document",entity_id:doc.id,description:action.replaceAll("_"," ")+": "+doc.document_name,metadata:{mode,document_name:doc.document_name}});
  if(ae)throw ae;
  if(mode==="delete"){
   let intentId:string|null=null;
   if(doc.storage_path){
    const {data:existing,error:le}=await admin.from("vault_storage_cleanup").select("id").eq("storage_path",doc.storage_path).eq("action","delete").eq("status","pending").maybeSingle();if(le)throw le;
    if(existing)intentId=existing.id;
    else{
     const {data:created,error:ce}=await admin.from("vault_storage_cleanup").insert({bucket_id:BUCKET,storage_path:doc.storage_path,organization_id:doc.organization_id,company_id:doc.company_id,profile_id:profile.id,action:"delete",document_id:doc.id}).select("id").single();
     if(ce)throw ce;intentId=created.id;
    }
    const {error:re}=await admin.storage.from(BUCKET).remove([doc.storage_path]);
    if(re){await failed(intentId,re);return reply({deleted:false,storage_deleted:false,cleanup_error:"File removal failed. The document remains in the Bin for retry."},502);}
   }
   const {data:gone,error:ge}=await admin.from("company_documents").delete().eq("id",doc.id).eq("company_id",doc.company_id).select("id").maybeSingle();
   if(ge)throw ge;if(!gone)return reply({deleted:false,storage_deleted:false,cleanup_error:"Metadata remains in the Bin; retry is safe."},409);
   if(intentId)await complete(intentId,doc.id);return reply({deleted:true,storage_deleted:true});
  }
  if(!doc.storage_path)return reply({error:"Document has no stored file."},404);
  const {data:signed,error:se}=await admin.storage.from(BUCKET).createSignedUrl(doc.storage_path,TTL,mode==="download"?{download:true}:undefined);
  if(se||!signed?.signedUrl)return reply({error:"Could not create a secure document link."},502);
  return reply({signed_url:signed.signedUrl,expires_in:TTL});
 }catch(error){console.error("document-access failed",error);return reply({error:error instanceof Error?error.message:"Document access failed."},500);}
});