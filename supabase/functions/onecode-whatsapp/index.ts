import "jsr:@supabase/functions-js/edge-runtime.d.ts";
const corsHeaders={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type"};
function json(data:unknown,status=200){return new Response(JSON.stringify(data),{status,headers:{...corsHeaders,"Content-Type":"application/json; charset=utf-8"}})}
Deno.serve(async(req)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:corsHeaders});
 if(req.method!=="POST")return json({error:"Método não permitido."},405);
 if(!req.headers.get("Authorization"))return json({error:"Usuário não autenticado."},401);
 try{
  const apiUrl=(Deno.env.get("ONECODE_API_URL")||"https://api-riotendas.onecode.chat").replace(/\/$/,"");
  const apiKey=Deno.env.get("ONECODE_API_KEY");
  const connectionId=Number(Deno.env.get("ONECODE_CONNECTION_ID")||"3");
  if(!apiKey)return json({error:"ONECODE_API_KEY não configurada no Supabase."},500);
  const body=await req.json(); const action=String(body.action||"send_template");
  if(action==="list_templates"){
   const r=await fetch(`${apiUrl}/api/connections/${connectionId}/templates`,{headers:{Accept:"application/json",Authorization:`Bearer ${apiKey}`}});
   const text=await r.text();let d:any;try{d=text?JSON.parse(text):{}}catch{d={raw:text}}
   if(!r.ok)return json({error:d?.error||`Erro OneCode (${r.status}).`,details:d},r.status);
   const raw=Array.isArray(d)?d:(Array.isArray(d?.templates)?d.templates:(d?.id?[d]:[]));
   const templates=raw.map((t:any)=>({id:t.id,externalId:t.externalId,name:t.name,type:t.type,language:t.language,variableType:t.variableType,body:t.body,status:t.status,variables:Array.isArray(t.variables)?t.variables:[]}));
   return json({success:true,templates});
  }
  const telefone=String(body.telefone||"").replace(/\D/g,"");
  const nome=String(body.nome||"Cliente").trim().split(/\s+/)[0]||"Cliente";
  const tipo=String(body.tipo||"montagem").trim().toLowerCase()||"montagem";
  const templateId=String(body.templateId||Deno.env.get("ONECODE_TEMPLATE_CAMINHO_ID")||"15");
  if(!/^55\d{10,11}$/.test(telefone))return json({error:"Telefone inválido. Use país, DDD e número."},400);
  if(!/^\d+$/.test(templateId))return json({error:"ID de template inválido."},400);
  const bodyParams=(body.bodyParams&&typeof body.bodyParams==="object")?body.bodyParams:{additionalProp1:nome,additionalProp2:tipo};
  const r=await fetch(`${apiUrl}/api/send-template/${telefone}`,{method:"POST",headers:{Accept:"application/json","Content-Type":"application/json",Authorization:`Bearer ${apiKey}`},body:JSON.stringify({connectionFrom:connectionId,templateId,bodyParams,headerParams:{},buttonParams:{},ticketStrategy:"create"})});
  const text=await r.text();let d:any;try{d=text?JSON.parse(text):{}}catch{d={raw:text}}
  if(!r.ok)return json({error:d?.error||`Erro OneCode (${r.status}).`,details:d},r.status);
  return json({success:true,message:d?.message||d});
 }catch(e){console.error(e);return json({error:e instanceof Error?e.message:"Erro interno."},500)}
});
