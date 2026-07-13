// RioTendas — integração de templates WhatsApp via Supabase Edge Function / OneCode.
(function () {
  "use strict";

  const DEFAULT_TEMPLATES = [{
    id: "caminho", titulo: "Estamos a caminho", icone: "🚚", templateId: "15",
    nomeTemplate: "utl_caminho", status: "APPROVED", body: "Olá {{1}}, Td bem?!\n\nPassando para avisar que *estamos a caminho* 🚚 da sua {{2}}. Ok ?", variables: ["1", "2"], ativo: true,
    variableMappings: [{position:"1",source:"primeiro_nome",value:""},{position:"2",source:"tipo_rota",value:""}]
  }];
  let templatesOneCode = [];

  const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
  function configAtual(){
    const cfg = typeof window.carregarConfiguracoes === "function" ? window.carregarConfiguracoes() : {};
    if (!Array.isArray(cfg.whatsappApiTemplates) || !cfg.whatsappApiTemplates.length) cfg.whatsappApiTemplates = DEFAULT_TEMPLATES.map(x=>({...x}));
    return cfg;
  }
  async function salvarConfig(cfg){
    if(typeof window.salvarConfiguracoes === "function") await window.salvarConfiguracoes(cfg);
    else localStorage.setItem("novoRioTendasConfiguracoesV1", JSON.stringify(cfg));
  }
  const ativos = () => configAtual().whatsappApiTemplates.filter(t=>t && t.ativo!==false && t.templateId);
  const badgeStatus = s => String(s||"").toUpperCase()==="APPROVED" ? '<span class="wa-api-badge aprovado">Aprovado</span>' : `<span class="wa-api-badge pendente">${esc(s||"Não sincronizado")}</span>`;
  const FONTES_VARIAVEL = [
    ["primeiro_nome","Primeiro nome do cliente"],
    ["nome_completo","Nome completo do cliente"],
    ["tipo_rota","Tipo da rota (montagem/desmontagem/retirada)"],
    ["texto_fixo","Texto fixo personalizado"]
  ];
  function mappingsPadrao(vars){
    return (Array.isArray(vars)?vars:[]).map((v,i)=>({position:String(v),source:i===0?"primeiro_nome":i===1?"tipo_rota":"texto_fixo",value:""}));
  }
  function normalizarMappings(t){
    const vars=Array.isArray(t?.variables)?t.variables:[];
    const atual=Array.isArray(t?.variableMappings)?t.variableMappings:[];
    return vars.map((v,i)=>{const m=atual.find(x=>String(x.position)===String(v))||{};return {position:String(v),source:m.source||(i===0?"primeiro_nome":i===1?"tipo_rota":"texto_fixo"),value:m.value||""}});
  }
  function valorPreview(mapping){
    switch(mapping?.source){
      case "primeiro_nome": return "Rodrigo";
      case "nome_completo": return "Rodrigo Brandão";
      case "tipo_rota": return "montagem";
      case "texto_fixo": return String(mapping?.value||"texto personalizado").trim()||"texto personalizado";
      default: return String(mapping?.value||"").trim();
    }
  }
  function montarPreview(body,maps){
    let texto=String(body||"").trim();
    if(!texto)return "Sincronize os templates da OneCode para carregar o texto e visualizar a prévia.";
    maps.forEach(m=>{texto=texto.replace(new RegExp(`\\{\\{${String(m.position).replace(/[-/\\^$*+?.()|[\]{}]/g,"\\$&")}\\}\\}`,"g"),valorPreview(m));});
    return texto;
  }
  function renderMapeamentos(t){
    const maps=normalizarMappings(t);
    const linhas=maps.length?maps.map(m=>`<div class="wa-api-variable-row" data-var-position="${esc(m.position)}"><span>{{${esc(m.position)}}}</span><select data-var-source>${FONTES_VARIAVEL.map(([v,l])=>`<option value="${v}" ${m.source===v?"selected":""}>${esc(l)}</option>`).join("")}</select><input type="text" data-var-value value="${esc(m.value||"")}" placeholder="Digite o texto" ${m.source==="texto_fixo"?"":"hidden"}></div>`).join(""):'<small class="wa-api-vars">Sem variáveis</small>';
    return `<div class="wa-api-variable-editor"><strong>Preenchimento das variáveis</strong>${linhas}<div class="wa-api-live-preview"><strong>Prévia da mensagem</strong><div data-wa-api-preview-text>${esc(montarPreview(t.body,maps))}</div><small>Prévia ilustrativa — os dados reais serão preenchidos conforme o evento.</small></div></div>`;
  }
  function atualizarPreviewItem(item){
    if(!item)return;
    const body=item.querySelector('[data-campo="body"]')?.value||"";
    const maps=Array.from(item.querySelectorAll(".wa-api-variable-row")).map(r=>({position:r.dataset.varPosition,source:r.querySelector("[data-var-source]")?.value||"texto_fixo",value:r.querySelector("[data-var-value]")?.value||""}));
    const alvo=item.querySelector("[data-wa-api-preview-text]");
    if(alvo)alvo.textContent=montarPreview(body,maps);
  }

  function renderConfig(){
    const lista=document.getElementById("waApiTemplatesLista"); if(!lista)return;
    lista.innerHTML=configAtual().whatsappApiTemplates.map((t,i)=>`
      <div class="wa-api-template-item" data-wa-api-index="${i}" data-id="${esc(t.id||`template_${i}`)}" data-template-id="${esc(t.templateId||"")}">
        <label class="wa-api-ativo"><input type="checkbox" data-campo="ativo" ${t.ativo!==false?"checked":""}> Ativo</label>
        <input type="text" data-campo="icone" value="${esc(t.icone||"💬")}" aria-label="Ícone">
        <div class="wa-api-template-main">
          <label class="wa-api-field-label">Nome exibido na rota<input type="text" data-campo="titulo" value="${esc(t.titulo||"Mensagem")}" aria-label="Nome exibido na rota"></label>
          <small>Template: <strong>${esc(t.nomeTemplate||"Não definido")}</strong> ${badgeStatus(t.status)}</small>
          <small class="wa-api-vars">Variáveis: ${Array.isArray(t.variables)&&t.variables.length?t.variables.map(v=>`{{${esc(v)}}}`).join(" · "):"nenhuma"}</small>
          ${renderMapeamentos(t)}
        </div>
        <input type="hidden" data-campo="templateId" value="${esc(t.templateId||"")}">
        <input type="hidden" data-campo="nomeTemplate" value="${esc(t.nomeTemplate||"")}">
        <input type="hidden" data-campo="status" value="${esc(t.status||"")}">
        <input type="hidden" data-campo="variables" value="${esc(JSON.stringify(t.variables||[]))}">
        <input type="hidden" data-campo="body" value="${esc(t.body||"")}">
        <button type="button" class="btn-outline danger" data-wa-api-remover="${i}" title="Remover">×</button>
      </div>`).join("");
  }
  function coletarConfig(){
    return Array.from(document.querySelectorAll("#waApiTemplatesLista .wa-api-template-item")).map((el,i)=>({
      id: el.dataset.id||`template_${Date.now()}_${i}`,
      ativo:!!el.querySelector('[data-campo="ativo"]')?.checked,
      icone:el.querySelector('[data-campo="icone"]')?.value.trim()||"💬",
      titulo:el.querySelector('[data-campo="titulo"]')?.value.trim()||"Mensagem",
      templateId:el.querySelector('[data-campo="templateId"]')?.value.trim()||"",
      nomeTemplate:el.querySelector('[data-campo="nomeTemplate"]')?.value.trim()||"",
      status:el.querySelector('[data-campo="status"]')?.value.trim()||"",
      variables:JSON.parse(el.querySelector('[data-campo="variables"]')?.value||"[]"),
      body:el.querySelector('[data-campo="body"]')?.value||"",
      variableMappings:Array.from(el.querySelectorAll(".wa-api-variable-row")).map(r=>({position:r.dataset.varPosition,source:r.querySelector("[data-var-source]")?.value||"texto_fixo",value:r.querySelector("[data-var-value]")?.value||""}))
    }));
  }
  function preencherSelect(){
    const sel=document.getElementById("waApiNovoTemplateSelect"); if(!sel)return;
    sel.innerHTML='<option value="">Selecione um template sincronizado</option>'+templatesOneCode
      .filter(t=>String(t.status||"").toUpperCase()==="APPROVED")
      .map(t=>`<option value="${esc(t.id)}">${esc(t.name)} — Aprovado</option>`).join("");
  }
  async function sincronizarTemplates(btn){
    const status=document.getElementById("waApiSyncStatus");
    btn.disabled=true; if(status){status.textContent="Consultando a OneCode...";status.className="wa-api-sync-status carregando";}
    try{
      const sb=typeof supabaseClient!=="undefined"?supabaseClient:window.supabaseClient;
      if(!sb?.functions?.invoke)throw new Error("Cliente Supabase indisponível.");
      const {data,error}=await sb.functions.invoke("onecode-whatsapp",{body:{action:"list_templates"}});
      if(error)throw error;if(data?.error)throw new Error(data.error);
      templatesOneCode=Array.isArray(data?.templates)?data.templates:[];
      const cfg=configAtual();
      cfg.whatsappApiTemplates=(cfg.whatsappApiTemplates||[]).map(item=>{const remoto=templatesOneCode.find(x=>String(x.id)===String(item.templateId));return remoto?{...item,nomeTemplate:remoto.name||item.nomeTemplate,status:remoto.status||item.status,variables:remoto.variables||item.variables||[],body:remoto.body||item.body||""}:item});
      await salvarConfig(cfg);
      preencherSelect();
      renderConfig();
      if(status){status.textContent=`${templatesOneCode.length} template(s) encontrado(s). Selecione um abaixo.`;status.className="wa-api-sync-status sucesso";}
    }catch(e){console.error(e);if(status){status.textContent=`Falha ao sincronizar: ${e?.message||e}`;status.className="wa-api-sync-status erro";}}
    finally{btn.disabled=false;}
  }
  function normalizarTelefone(v){let n=String(v||"").replace(/\D/g,"");if(!n)return"";if(n.startsWith("00"))n=n.slice(2);if(!n.startsWith("55"))n="55"+n;return n;}
  const primeiroNome=n=>String(n||"Cliente").trim().split(/\s+/)[0]||"Cliente";
  function localizarRota(id){return typeof window.criarRotasDosEventos==="function"?window.criarRotasDosEventos().find(r=>String(r.id)===String(id))||null:null;}
  let rotaSelecionada=null;
  function garantirDialog(){let d=document.getElementById("waApiEnvioDialog");if(d)return d;d=document.createElement("dialog");d.id="waApiEnvioDialog";d.className="modal wa-api-envio-dialog";d.innerHTML=`<div class="modal-header"><div><h2>WhatsApp</h2><p id="waApiEnvioCliente"></p></div><button type="button" class="modal-close" data-wa-api-fechar>×</button></div><div class="wa-api-envio-body"><div id="waApiAcoesLista" class="wa-api-acoes-lista"></div><div id="waApiEnvioStatus" class="wa-api-envio-status" hidden></div></div>`;document.body.appendChild(d);return d;}
  async function buscarHistoricoEvento(eventoId){
    if(!eventoId) return [];
    try{
      const sb=typeof supabaseClient!=="undefined"?supabaseClient:window.supabaseClient;
      if(sb){
        const {data,error}=await sb.from("logs_sistema").select("*").eq("modulo","WhatsApp").eq("registro_id",String(eventoId)).order("criado_em",{ascending:false}).limit(100);
        if(!error&&Array.isArray(data)) return data;
      }
    }catch(e){console.warn("Histórico WhatsApp:",e)}
    try{return JSON.parse(localStorage.getItem("novoRioTendasLogsSistemaV1")||"[]").filter(x=>x.modulo==="WhatsApp"&&String(x.registro_id)===String(eventoId));}catch{return []}
  }
  function horaBr(v){try{return new Date(v).toLocaleString("pt-BR",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"})}catch{return ""}}
  function valorVariavel(mapping,r,nome,tipo){
    switch(mapping?.source){
      case "primeiro_nome": return primeiroNome(r.cliente||nome);
      case "nome_completo": return String(r.cliente||nome||"Cliente").trim();
      case "tipo_rota": return tipo;
      case "texto_fixo": return String(mapping?.value||"").trim();
      default: return String(mapping?.value||"").trim();
    }
  }
  function bodyParamsDoTemplate(t,r,nome,tipo){
    const maps=normalizarMappings(t); const out={};
    maps.forEach(m=>{out[`additionalProp${m.position}`]=valorVariavel(m,r,nome,tipo)});
    return out;
  }
  async function abrirMenu(id){const r=localizarRota(id);if(!r)return alert("Não foi possível localizar esta rota.");if(!normalizarTelefone(r.telefone))return alert("Este cliente não possui telefone válido.");rotaSelecionada=r;const d=garantirDialog();d.querySelector("#waApiEnvioCliente").textContent=`${r.cliente||"Cliente"} • ${r.telefone}`;const ts=ativos(), hist=await buscarHistoricoEvento(r.evento_id);d.querySelector("#waApiAcoesLista").innerHTML=ts.length?ts.map((t,i)=>{const h=hist.find(x=>String(x?.depois?.acaoId||"")===String(t.id));return `<button type="button" class="wa-api-acao-btn ${h?"ja-enviado":""}" data-wa-api-enviar="${i}"><span>${esc(t.icone||"💬")}</span><strong>${esc(t.titulo||"Enviar mensagem")}${h?` <em>✓ Enviado ${horaBr(h.criado_em)}</em>`:""}</strong></button>`}).join(""):'<p class="empty">Nenhum template ativo em Configurações → WhatsApp API.</p>';const s=d.querySelector("#waApiEnvioStatus");s.hidden=true;s.textContent="";typeof d.showModal==="function"?d.showModal():d.setAttribute("open","");}
  async function enviarTemplate(i,b){
    const t=ativos()[i],r=rotaSelecionada;if(!t||!r)return;
    const telefone=normalizarTelefone(r.telefone),tipo=String(r.tipo||"montagem").toLowerCase(),nome=primeiroNome(r.cliente);
    const hist=await buscarHistoricoEvento(r.evento_id),hoje=new Date().toISOString().slice(0,10);
    const duplicado=hist.find(x=>String(x?.depois?.acaoId||"")===String(t.id)&&String(x.criado_em||"").slice(0,10)===hoje);
    if(duplicado&&!confirm(`“${t.titulo}” já foi enviado hoje às ${horaBr(duplicado.criado_em)}. Enviar novamente?`))return;
    if(!duplicado&&!confirm(`Enviar “${t.titulo}” para ${r.cliente||nome}?`))return;
    const bodyParams=bodyParamsDoTemplate(t,r,nome,tipo);
    const vazio=Object.entries(bodyParams).find(([,v])=>!String(v||"").trim());
    if(vazio){const pos=vazio[0].replace("additionalProp","");if(!confirm(`A variável {{${pos}}} está vazia. Enviar mesmo assim?`))return;}
    const d=garantirDialog(),s=d.querySelector("#waApiEnvioStatus");b.disabled=true;s.hidden=false;s.className="wa-api-envio-status enviando";s.textContent="Enviando mensagem...";
    try{
      const sb=typeof supabaseClient!=="undefined"?supabaseClient:window.supabaseClient;if(!sb?.functions?.invoke)throw new Error("Cliente Supabase indisponível.");
      const {data,error}=await sb.functions.invoke("onecode-whatsapp",{body:{action:"send_template",telefone,nome,tipo,templateId:String(t.templateId),nomeTemplate:t.nomeTemplate||"",bodyParams}});
      if(error)throw error;if(data?.error)throw new Error(data.error);
      s.className="wa-api-envio-status sucesso";s.textContent="Mensagem enviada com sucesso.";
      if(typeof registrarLogSistema==="function")await registrarLogSistema({modulo:"WhatsApp",acao:"Template enviado",registro_id:String(r.evento_id||""),registro_nome:r.cliente||nome,depois:{acaoId:String(t.id),templateId:String(t.templateId),nomeTemplate:t.nomeTemplate||"",titulo:t.titulo||"",rotaId:r.id,tipo,telefone,bodyParams},detalhes:`${t.titulo||t.nomeTemplate} enviado para ${r.cliente||nome}`});
      setTimeout(()=>{try{d.close()}catch{}},1200);
    }catch(e){console.error(e);s.className="wa-api-envio-status erro";s.textContent=`Não foi possível enviar: ${e?.message||"erro desconhecido"}`;}finally{b.disabled=false;}
  }


  document.addEventListener("change",ev=>{
    const varSel=ev.target.closest("[data-var-source]");
    if(varSel){const row=varSel.closest(".wa-api-variable-row"),inp=row?.querySelector("[data-var-value]");if(inp)inp.hidden=varSel.value!=="texto_fixo";atualizarPreviewItem(varSel.closest(".wa-api-template-item"));return;}
    const sel=ev.target.closest("#waApiNovoTemplateSelect");if(!sel)return;const t=templatesOneCode.find(x=>String(x.id)===String(sel.value));const info=document.getElementById("waApiNovoTemplateInfo");if(!t){if(info)info.innerHTML="";return;}if(!document.getElementById("waApiNovoTitulo").value.trim())document.getElementById("waApiNovoTitulo").value=String(t.name||"").replace(/^utl_/,"").replace(/_/g," ");if(info)info.innerHTML=`<strong>${esc(t.name)}</strong> ${badgeStatus(t.status)}<br><span>${esc(t.body||"")}</span><br><small>Variáveis: ${(t.variables||[]).map(v=>`{{${esc(v)}}}`).join(" · ")||"nenhuma"}</small>`;
  });
  document.addEventListener("input",ev=>{
    if(ev.target.matches("[data-var-value], [data-campo='titulo']")) atualizarPreviewItem(ev.target.closest(".wa-api-template-item"));
  });
  document.addEventListener("click",async ev=>{
    const open=ev.target.closest('[data-config-modal="whatsappApi"]');if(open){const d=document.getElementById("configModalWhatsappApi");renderConfig();setTimeout(()=>{if(d&&!d.open)d.showModal()},0);return;}
    if(ev.target.closest('[data-close-config="configModalWhatsappApi"]')){document.getElementById("configModalWhatsappApi")?.close();return;}
    const sync=ev.target.closest("#waApiSincronizarTemplates");if(sync){await sincronizarTemplates(sync);return;}
    const add=ev.target.closest("#waApiAdicionarTemplate");if(add){const sel=document.getElementById("waApiNovoTemplateSelect"),t=templatesOneCode.find(x=>String(x.id)===String(sel?.value));if(!t)return alert("Sincronize e selecione um template aprovado da OneCode.");const cfg=configAtual();cfg.whatsappApiTemplates=coletarConfig();const novoTitulo=(document.getElementById("waApiNovoTitulo")?.value.trim()||t.name);if(cfg.whatsappApiTemplates.some(x=>String(x.templateId)===String(t.id)&&String(x.titulo||"").trim().toLowerCase()===novoTitulo.toLowerCase()))return alert("Já existe uma ação com este mesmo template e nome.");cfg.whatsappApiTemplates.push({id:`template_${Date.now()}`,titulo:novoTitulo,icone:document.getElementById("waApiNovoIcone")?.value.trim()||"💬",templateId:String(t.id),nomeTemplate:t.name,status:t.status,body:t.body||"",variables:t.variables||[],ativo:true,variableMappings:mappingsPadrao(t.variables||[])});await salvarConfig(cfg);renderConfig();return;}
    const rem=ev.target.closest("[data-wa-api-remover]");if(rem){rem.closest(".wa-api-template-item")?.remove();return;}
    if(ev.target.closest("#waApiSalvarTemplates")){const cfg=configAtual();cfg.whatsappApiTemplates=coletarConfig();await salvarConfig(cfg);alert("Configurações do WhatsApp salvas.");renderConfig();return;}
    if(ev.target.closest("#waApiRestaurarTemplates")){if(!confirm("Restaurar o template padrão utl_caminho?"))return;const cfg=configAtual();cfg.whatsappApiTemplates=DEFAULT_TEMPLATES.map(x=>({...x}));await salvarConfig(cfg);renderConfig();return;}
    const wa=ev.target.closest("[data-rota-whatsapp]");if(wa){ev.preventDefault();ev.stopPropagation();abrirMenu(wa.dataset.rotaWhatsapp);return;}
    if(ev.target.closest("[data-wa-api-fechar]")){garantirDialog().close();return;}
    const send=ev.target.closest("[data-wa-api-enviar]");if(send)await enviarTemplate(Number(send.dataset.waApiEnviar),send);
  });

  async function renderHistoricoEvento(){const dlg=document.getElementById("eventoDialog"),form=document.getElementById("eventoForm");if(!dlg||!form)return;let box=document.getElementById("eventoWhatsappHistoricoBox");if(!box){box=document.createElement("div");box.id="eventoWhatsappHistoricoBox";box.className="subpanel evento-whatsapp-historico";box.innerHTML='<h3>📲 Histórico de comunicações</h3><div id="eventoWhatsappHistoricoLista" class="evento-whatsapp-historico-lista"><p class="empty">Nenhuma comunicação registrada.</p></div>';form.appendChild(box)}const id=document.getElementById("eventoId")?.value;if(!id){box.style.display="none";return}box.style.display="";const hist=await buscarHistoricoEvento(id),lista=box.querySelector("#eventoWhatsappHistoricoLista");lista.innerHTML=hist.length?hist.map(h=>`<div class="evento-whatsapp-historico-item"><strong>${esc(h?.depois?.titulo||h?.depois?.nomeTemplate||"Mensagem")}</strong><span>${horaBr(h.criado_em)} · ${esc(h.usuario||"Sistema")}</span></div>`).join(""):'<p class="empty">Nenhuma comunicação registrada.</p>';}
  document.addEventListener("click",ev=>{if(ev.target.closest('[data-action="editar"], [data-editar-evento], .editar-evento-btn'))setTimeout(renderHistoricoEvento,350)});
  const obs=new MutationObserver(()=>{const d=document.getElementById("eventoDialog");if(d?.open)setTimeout(renderHistoricoEvento,120)});obs.observe(document.documentElement,{attributes:true,subtree:true,attributeFilter:["open"]});
  window.rtWhatsappApi={abrirMenu,renderConfig,defaults:DEFAULT_TEMPLATES,renderHistoricoEvento};
})();
