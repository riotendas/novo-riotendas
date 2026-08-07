(function () {
  "use strict";

  const STORAGE_QUEUE = "riotendas_diagnostico_fila_v2";
  const STORAGE_DEVICE_ID = "riotendas_diagnostico_dispositivo_id_v1";
  const STORAGE_DEVICE_NAME = "riotendas_diagnostico_dispositivo_nome_v1";
  const STORAGE_MODE = "riotendas_diagnostico_modo_v2";
  const TABLE = "riotendas_diagnostico_trafego";
  const RPC = "riotendas_diagnostico_resumo";
  const MAX_QUEUE = 1200;
  const BATCH_SIZE = 40;
  const FLUSH_INTERVAL = 60000;
  const originalFetch = window.fetch.bind(window);
  let flushTimer = null;
  let flushPromise = null;
  let ultimoResumo = null;
  let centralDisponivel = null;

  function agoraIso(){ return new Date().toISOString(); }
  function num(v){ const n=Number(v); return Number.isFinite(n)?n:0; }
  function esc(v){ return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
  function uuid(){
    try { return crypto.randomUUID(); } catch (_) {}
    return `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
  }
  function dispositivoId(){
    let id=localStorage.getItem(STORAGE_DEVICE_ID);
    if(!id){ id=uuid(); localStorage.setItem(STORAGE_DEVICE_ID,id); }
    return id;
  }
  function nomePadraoDispositivo(){
    const ua=navigator.userAgent||"";
    const tipo=/Mobi|Android|iPhone|iPad/i.test(ua)?"Celular":"Computador";
    const navegador=/Edg\//.test(ua)?"Edge":/Firefox\//.test(ua)?"Firefox":/Chrome\//.test(ua)?"Chrome":/Safari\//.test(ua)?"Safari":"Navegador";
    return `${tipo} ${navegador}`;
  }
  function dispositivoNome(){
    let nome=(localStorage.getItem(STORAGE_DEVICE_NAME)||"").trim();
    if(!nome){ nome=nomePadraoDispositivo(); localStorage.setItem(STORAGE_DEVICE_NAME,nome); }
    return nome.slice(0,120);
  }
  function modo(){ return localStorage.getItem(STORAGE_MODE)==="detalhado"?"detalhado":"normal"; }
  function versao(){ return String(window.RIOTENDAS_APP_VERSION||window.RioTendasAppVersion||"não identificada").slice(0,120); }
  function usuario(){
    try {
      const u=typeof window.getUsuarioLogado==="function"?window.getUsuarioLogado():JSON.parse(localStorage.getItem("novoRioTendasUsuarioSessaoV1")||"null");
      return { nome:String(u?.nome||u?.usuario||localStorage.getItem("colaboradorLogado")||"Não identificado").slice(0,120), perfil:String(u?.perfil||"").slice(0,60) };
    } catch(_){ return {nome:"Não identificado",perfil:""}; }
  }
  function moduloAtual(){
    const secao=document.querySelector(".section.active-section");
    const mapa={dashboardSection:"Dashboard",produtosSection:"Produtos",clientesSection:"Clientes",eventosSection:"Eventos",calendarioSection:"Calendário",rotasSection:"Rotas",mapaSection:"Mapa",orcamentosSection:"Orçamentos",financeiroSection:"Financeiro",relatoriosSection:"Relatórios",usuariosSection:"Usuários",configSection:"Configurações",mobileHubSection:"Mobile",ruaMobileSection:"Rua Mobile",mobileManutencaoSection:"Manutenção Mobile",eventosMobileSection:"Eventos Mobile",diagnosticoTrafegoSection:"Diagnóstico"};
    return (mapa[secao?.id]||secao?.id||"Inicialização").slice(0,100);
  }
  function origemAtual(){
    if(location.protocol==="file:") return "Arquivo local";
    return (location.origin||"Origem desconhecida").slice(0,200);
  }
  function classificarUrl(urlTexto){
    try{
      const url=new URL(urlTexto,location.href);
      if(!/\.supabase\.co$/i.test(url.hostname)) return null;
      const partes=url.pathname.split("/").filter(Boolean);
      let servico="Supabase", recurso=partes.slice(0,3).join("/")||"-";
      if(partes[0]==="rest"&&partes[1]==="v1"){ servico="PostgREST"; recurso=decodeURIComponent(partes[2]||"-"); }
      else if(partes[0]==="functions"&&partes[1]==="v1"){ servico="Functions"; recurso=decodeURIComponent(partes[2]||"-"); }
      else if(partes[0]==="auth"){ servico="Auth"; recurso=partes[2]||"auth"; }
      else if(partes[0]==="storage"){ servico="Storage"; recurso=partes[2]||"storage"; }
      else if(partes[0]==="realtime"){ servico="Realtime"; recurso="websocket"; }
      if(recurso===TABLE || recurso===RPC || /riotendas_diagnostico_/i.test(recurso)) return null;
      return {servico,recurso,url};
    }catch(_){ return null; }
  }
  function urlSegura(url){
    try{
      const chaves=[...url.searchParams.keys()].sort();
      const select=url.searchParams.get("select");
      return `${url.pathname}${chaves.length?`?params=${chaves.join(",")}`:""}${select?`&select=${String(select).slice(0,250)}`:""}`.slice(0,700);
    }catch(_){ return "-"; }
  }
  function operacao(metodo,url){
    const m=String(metodo||"GET").toUpperCase();
    if(m==="GET"||m==="HEAD") return "SELECT";
    if(m==="POST") return /\/rpc\//i.test(url||"")?"RPC":"INSERT/RPC";
    if(m==="PATCH"||m==="PUT") return "UPDATE";
    if(m==="DELETE") return "DELETE";
    return m;
  }
  function chamador(stack){
    const linhas=String(stack||"").split("\n").map(x=>x.trim()).filter(Boolean);
    const ignorar=/diagnostico-trafego\.js|diagnosticoFetch|window\.fetch|Error$/i;
    const l=linhas.find((x,i)=>i>0&&!ignorar.test(x)&&/(?:\.js|\.html)(?::\d+){1,2}/i.test(x));
    return (l?l.replace(/^at\s+/,""):"Chamador não identificado").slice(0,300);
  }
  function lerFila(){
    try{ const x=JSON.parse(localStorage.getItem(STORAGE_QUEUE)||"[]"); return Array.isArray(x)?x.slice(-MAX_QUEUE):[]; }catch(_){ return []; }
  }
  function salvarFila(x){ try{ localStorage.setItem(STORAGE_QUEUE,JSON.stringify(x.slice(-MAX_QUEUE))); }catch(_){} }
  function enfileirar(r){
    const fila=lerFila(); fila.push(r); salvarFila(fila);
    window.dispatchEvent(new CustomEvent("riotendas:diagnostico-atualizado"));
    if(fila.length>=BATCH_SIZE) agendarFlush(1000); else agendarFlush(FLUSH_INTERVAL);
  }
  function agendarFlush(ms){ clearTimeout(flushTimer); flushTimer=setTimeout(()=>enviarPendentes(),ms); }
  async function enviarPendentes(){
    if(flushPromise) return flushPromise;
    flushPromise=(async()=>{
      const fila=lerFila();
      if(!fila.length) return {enviados:0};
      if(typeof supabaseClient==="undefined"||!supabaseClient?.from) return {enviados:0,erro:"Supabase indisponível"};
      const lote=fila.slice(0,BATCH_SIZE);
      try{
        const {error}=await supabaseClient.from(TABLE).insert(lote);
        if(error) throw error;
        salvarFila(fila.slice(lote.length));
        centralDisponivel=true;
        if(lerFila().length) agendarFlush(1500);
        return {enviados:lote.length};
      }catch(e){
        centralDisponivel=false;
        console.warn("Diagnóstico central ainda não configurado ou indisponível:",e?.message||e);
        agendarFlush(5*60*1000);
        return {enviados:0,erro:String(e?.message||e)};
      }
    })();
    try{return await flushPromise;}finally{flushPromise=null; atualizarStatus();}
  }

  function tamanhoTextoUtf8(texto){
    try { return new TextEncoder().encode(String(texto ?? "")).byteLength; }
    catch (_) { return unescape(encodeURIComponent(String(texto ?? ""))).length; }
  }
  function estimarLinhasJson(valor){
    if(Array.isArray(valor)) return valor.length;
    if(valor && typeof valor === "object") return 1;
    return 0;
  }
  function instrumentarResposta(resposta, contexto){
    let gravado=false;
    const registrar=(bytes,linhas,medicao)=>{
      if(gravado) return;
      gravado=true;
      const u=usuario();
      enfileirar({
        horario:agoraIso(), dispositivo_id:dispositivoId(), dispositivo_nome:dispositivoNome(),
        usuario_nome:u.nome, usuario_perfil:u.perfil, versao_sistema:versao(), origem:origemAtual(),
        modulo:contexto.tela, chamador:contexto.call, operacao:operacao(contexto.metodo,contexto.urlTexto),
        url_resumo:urlSegura(contexto.info.url), servico:contexto.info.servico, recurso:contexto.info.recurso,
        metodo:contexto.metodo, status:resposta.status, sucesso:resposta.ok, duracao_ms:contexto.duracao,
        bytes_recebidos:Math.max(0,Math.round(num(bytes))), linhas_estimadas:Math.max(0,Math.round(num(linhas))),
        modo_medicao:medicao, erro:resposta.ok?null:`HTTP ${resposta.status}`,
        user_agent:String(navigator.userAgent||"").slice(0,500)
      });
    };

    const contentLength=num(resposta.headers.get("content-length"));
    const contentRange=resposta.headers.get("content-range")||"";
    const mRange=contentRange.match(/(?:^|\s)(\d+)-(\d+)\/(\d+|\*)/);
    const linhasCabecalho=mRange?Math.max(0,Number(mRange[2])-Number(mRange[1])+1):0;

    const envolver=async(nome,original,args)=>{
      const valor=await original.apply(resposta,args);
      let bytes=contentLength, linhas=linhasCabecalho, medicao=contentLength?"cabecalho":"consumo real";
      if(nome==="text") bytes=tamanhoTextoUtf8(valor);
      else if(nome==="json") { bytes=tamanhoTextoUtf8(JSON.stringify(valor)); linhas=linhas||estimarLinhasJson(valor); }
      else if(nome==="arrayBuffer") bytes=valor?.byteLength||0;
      else if(nome==="blob") bytes=valor?.size||0;
      else if(nome==="formData") {
        try { bytes=tamanhoTextoUtf8([...valor.entries()].map(([k,v])=>[k,typeof v==="string"?v:`[arquivo:${v?.size||0}]`])); } catch(_) {}
      }
      registrar(bytes,linhas,medicao);
      return valor;
    };

    for(const nome of ["text","json","arrayBuffer","blob","formData"]){
      const original=resposta[nome];
      if(typeof original!=="function") continue;
      try{ Object.defineProperty(resposta,nome,{configurable:true,writable:true,value:function(...args){return envolver(nome,original,args);}}); }
      catch(_){ try{ resposta[nome]=function(...args){return envolver(nome,original,args);}; }catch(__){} }
    }

    // HEAD, 204 e respostas sem corpo precisam ser registradas imediatamente.
    if(contexto.metodo==="HEAD" || resposta.status===204 || resposta.status===205){
      registrar(contentLength,linhasCabecalho,contentLength?"cabecalho":"sem corpo");
    } else {
      // Fallback: se ninguém consumir o corpo, registra o cabeçalho ou uma estimativa mínima.
      setTimeout(()=>{
        if(gravado) return;
        const estimativa=contentLength || (linhasCabecalho?linhasCabecalho*220:0);
        registrar(estimativa,linhasCabecalho,contentLength?"cabecalho":"estimativa sem consumo");
      }, modo()==="detalhado"?8000:15000);
    }
    return resposta;
  }

  window.fetch=async function diagnosticoFetch(input,init){
    const urlTexto=typeof input==="string"?input:input?.url;
    const info=classificarUrl(urlTexto||"");
    if(!info) return originalFetch(input,init);
    const inicio=performance.now();
    const metodo=String(init?.method||input?.method||"GET").toUpperCase();
    const tela=moduloAtual();
    const call=chamador(new Error().stack);
    try{
      const resposta=await originalFetch(input,init);
      const duracao=Math.round((performance.now()-inicio)*10)/10;
      return instrumentarResposta(resposta,{urlTexto,info,metodo,tela,call,duracao});
    }catch(e){
      // Cancelamentos normais de busca/filtro não são falhas do sistema.
      if(e?.name==="AbortError" || /aborted|abortado|cancelled|canceled/i.test(String(e?.message||""))) throw e;
      const u=usuario();
      enfileirar({horario:agoraIso(),dispositivo_id:dispositivoId(),dispositivo_nome:dispositivoNome(),usuario_nome:u.nome,usuario_perfil:u.perfil,versao_sistema:versao(),origem:origemAtual(),modulo:tela,chamador:call,operacao:operacao(metodo,urlTexto),url_resumo:urlSegura(info.url),servico:info.servico,recurso:info.recurso,metodo,status:0,sucesso:false,duracao_ms:Math.round((performance.now()-inicio)*10)/10,bytes_recebidos:0,linhas_estimadas:0,modo_medicao:"erro",erro:String(e?.message||e).slice(0,800),user_agent:String(navigator.userAgent||"").slice(0,500)});
      throw e;
    }
  };

  function fmtBytes(v){ const n=num(v); if(n<1024)return `${n.toFixed(0)} B`; if(n<1024**2)return `${(n/1024).toFixed(1)} KB`; if(n<1024**3)return `${(n/1024**2).toFixed(2)} MB`; return `${(n/1024**3).toFixed(2)} GB`; }
  function fmtData(v){ try{return new Intl.DateTimeFormat("pt-BR",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit",second:"2-digit"}).format(new Date(v));}catch(_){return v||"-";} }
  function rankingTabela(itens){
    if(!itens?.length) return '<p class="empty">Sem dados no período.</p>';
    return `<div class="table-wrapper"><table class="diag-ranking"><thead><tr><th>Origem</th><th>Chamadas</th><th>Dados</th><th>Média</th><th>Tempo médio</th><th>Erros</th></tr></thead><tbody>${itens.slice(0,30).map(i=>`<tr><td><strong>${esc(i.nome)}</strong></td><td>${num(i.chamadas).toLocaleString("pt-BR")}</td><td>${fmtBytes(i.bytes)}</td><td>${fmtBytes(i.media_bytes)}</td><td>${num(i.media_ms).toFixed(0)} ms</td><td>${num(i.erros)}</td></tr>`).join("")}</tbody></table></div>`;
  }
  async function buscarResumo(){
    const dias=Number(document.getElementById("diagPeriodo")?.value||7);
    if(typeof supabaseClient==="undefined"||!supabaseClient?.rpc) throw new Error("Supabase indisponível");
    const {data,error}=await supabaseClient.rpc(RPC,{p_dias:dias,p_limite_recentes:200});
    if(error) throw error;
    centralDisponivel=true; ultimoResumo=data||{}; return ultimoResumo;
  }
  function renderResumo(data){
    const root=document.getElementById("diagnosticoTrafegoConteudo"); if(!root)return;
    const t=data?.totais||{}; const recentes=data?.recentes||[];
    root.innerHTML=`
      <div class="diag-cards">
        <div class="diag-card"><span>Chamadas centrais</span><strong>${num(t.chamadas).toLocaleString("pt-BR")}</strong></div>
        <div class="diag-card"><span>Egress estimado</span><strong>${fmtBytes(t.bytes)}</strong></div>
        <div class="diag-card"><span>Dispositivos</span><strong>${num(t.dispositivos)}</strong></div>
        <div class="diag-card"><span>Tempo médio</span><strong>${num(t.media_ms).toFixed(0)} ms</strong></div>
        <div class="diag-card ${num(t.erros)?"diag-erro":""}"><span>Erros</span><strong>${num(t.erros)}</strong></div>
      </div>
      <div class="panel diag-central-status"><strong>Coleta central:</strong> ${centralDisponivel===true?"ativa no Supabase":"aguardando configuração"}. <strong>Pendentes neste dispositivo:</strong> ${lerFila().length}. <span>O valor de Egress é estimado pelas respostas HTTP; o total oficial continua no painel do Supabase.</span></div>
      <div class="diag-grid">
        <div class="panel"><h3>Ranking por tela/módulo</h3>${rankingTabela(data?.por_modulo)}</div>
        <div class="panel"><h3>Ranking por tabela/serviço</h3>${rankingTabela(data?.por_recurso)}</div>
      </div>
      <div class="diag-grid">
        <div class="panel"><h3>Ranking por dispositivo</h3>${rankingTabela(data?.por_dispositivo)}</div>
        <div class="panel"><h3>Ranking por versão</h3>${rankingTabela(data?.por_versao)}</div>
      </div>
      <div class="panel" style="margin-top:16px"><h3>Ranking por função/chamador</h3>${rankingTabela(data?.por_chamador)}</div>
      <div class="panel diag-consultas"><h3>Últimas consultas de todos os acessos</h3><div class="table-wrapper"><table><thead><tr><th>Horário</th><th>Dispositivo</th><th>Usuário</th><th>Tela</th><th>Tabela</th><th>Operação</th><th>Status</th><th>Dados</th><th>Tempo</th><th>Versão</th></tr></thead><tbody>${recentes.length?recentes.map(r=>`<tr class="${r.sucesso?"":"diag-linha-erro"}"><td>${fmtData(r.horario)}</td><td>${esc(r.dispositivo_nome)}</td><td>${esc(r.usuario_nome)}</td><td>${esc(r.modulo)}</td><td>${esc(`${r.servico} · ${r.recurso}`)}</td><td>${esc(r.operacao)}</td><td>${r.status||"Erro"}</td><td>${fmtBytes(r.bytes_recebidos)}</td><td>${num(r.duracao_ms).toFixed(0)} ms</td><td>${esc(r.versao_sistema)}</td></tr>`).join(""):'<tr><td colspan="10" class="empty">Ainda não há dados centrais.</td></tr>'}</tbody></table></div></div>`;
  }
  async function atualizar(){
    const root=document.getElementById("diagnosticoTrafegoConteudo");
    if(root) root.innerHTML='<p class="empty">Atualizando diagnóstico central...</p>';
    await enviarPendentes();
    try{ renderResumo(await buscarResumo()); }
    catch(e){
      centralDisponivel=false;
      if(root) root.innerHTML=`<div class="panel diag-aviso"><strong>Diagnóstico central ainda não está disponível.</strong><br>Execute o arquivo SQL fornecido no Supabase. Os ${lerFila().length} registros deste dispositivo continuam guardados e serão enviados automaticamente depois da configuração.<br><small>${esc(e?.message||e)}</small></div>`;
    }
    atualizarStatus();
  }
  function atualizarStatus(){
    const el=document.getElementById("diagFilaStatus");
    if(el) el.textContent=`${lerFila().length} pendente(s)`;
  }
  function baixarJson(nome,conteudo){
    const blob=new Blob([JSON.stringify(conteudo,null,2)],{type:"application/json;charset=utf-8"});
    const a=document.createElement("a");
    a.href=URL.createObjectURL(blob);
    a.download=nome;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(()=>URL.revokeObjectURL(a.href),1500);
  }
  async function buscarLogCompleto(dias,onProgress){
    if(typeof supabaseClient==="undefined"||!supabaseClient?.from) throw new Error("Supabase indisponível");
    const desde=new Date(Date.now()-Math.max(1,Math.min(Number(dias)||7,365))*86400000).toISOString();
    const pagina=1000;
    const limiteSeguranca=100000;
    const registros=[];
    for(let inicio=0;inicio<limiteSeguranca;inicio+=pagina){
      const fim=inicio+pagina-1;
      const {data,error}=await supabaseClient
        .from(TABLE)
        .select("id,horario,dispositivo_id,dispositivo_nome,usuario_nome,usuario_perfil,versao_sistema,origem,modulo,chamador,operacao,url_resumo,servico,recurso,metodo,status,sucesso,duracao_ms,bytes_recebidos,linhas_estimadas,modo_medicao,erro,user_agent,criado_em")
        .gte("horario",desde)
        .order("horario",{ascending:true})
        .range(inicio,fim);
      if(error) throw error;
      const lote=Array.isArray(data)?data:[];
      registros.push(...lote);
      onProgress?.(registros.length);
      if(lote.length<pagina) return {registros,desde,limitado:false};
    }
    return {registros,desde,limitado:true};
  }
  async function exportar(){
    const botao=document.getElementById("diagExportar");
    const textoOriginal=botao?.textContent||"Exportar log completo";
    const dias=Number(document.getElementById("diagPeriodo")?.value||7);
    if(botao){botao.disabled=true;botao.textContent="Preparando exportação...";}
    try{
      await enviarPendentes();
      let resumo=ultimoResumo;
      if(!resumo){ try{resumo=await buscarResumo();}catch(_){resumo=null;} }
      const completo=await buscarLogCompleto(dias,total=>{if(botao)botao.textContent=`Carregando ${total.toLocaleString("pt-BR")} registros...`;});
      const geradoEm=agoraIso();
      const pacote={
        formato:"RioTendas Diagnóstico Central v2",
        gerado_em:geradoEm,
        periodo_dias:dias,
        periodo_inicio:completo.desde,
        periodo_fim:geradoEm,
        total_registros:completo.registros.length,
        exportacao_limitada:completo.limitado,
        observacao_egress:"Os bytes são uma estimativa registrada pelo navegador. O total oficial deve ser comparado com o painel do Supabase.",
        sistema:{versao:versao(),origem:origemAtual()},
        dispositivo_exportador:{id:dispositivoId(),nome:dispositivoNome(),usuario:usuario(),user_agent:navigator.userAgent||""},
        resumo_central:resumo,
        pendentes_locais:lerFila(),
        registros:completo.registros
      };
      const data=new Date().toISOString().replace(/[:.]/g,"-").slice(0,19);
      baixarJson(`riotendas-log-completo-${dias}dias-${data}.json`,pacote);
      if(completo.limitado) alert("A exportação atingiu o limite de segurança de 100.000 registros. Reduza o período e exporte em partes.");
    }catch(e){
      console.error(e);
      alert(`Não foi possível exportar o diagnóstico completo: ${e?.message||e}`);
    }finally{
      if(botao){botao.disabled=false;botao.textContent=textoOriginal;}
    }
  }

  function crc32Tabela(){
    const tabela=new Uint32Array(256);
    for(let n=0;n<256;n++){
      let c=n;
      for(let k=0;k<8;k++) c=(c&1)?(0xEDB88320^(c>>>1)):(c>>>1);
      tabela[n]=c>>>0;
    }
    return tabela;
  }
  const CRC32_TABELA=crc32Tabela();
  function crc32(bytes){
    let c=0xFFFFFFFF;
    for(let i=0;i<bytes.length;i++) c=CRC32_TABELA[(c^bytes[i])&0xFF]^(c>>>8);
    return (c^0xFFFFFFFF)>>>0;
  }
  function dosDataHora(data){
    const d=data instanceof Date?data:new Date(data||Date.now());
    const ano=Math.max(1980,d.getFullYear());
    const hora=((d.getHours()&31)<<11)|((d.getMinutes()&63)<<5)|((Math.floor(d.getSeconds()/2))&31);
    const dia=(((ano-1980)&127)<<9)|(((d.getMonth()+1)&15)<<5)|(d.getDate()&31);
    return {hora,dia};
  }
  function u16(v){const a=new Uint8Array(2);new DataView(a.buffer).setUint16(0,v,true);return a;}
  function u32(v){const a=new Uint8Array(4);new DataView(a.buffer).setUint32(0,v>>>0,true);return a;}
  function juntarBytes(partes){
    const total=partes.reduce((s,p)=>s+p.length,0),saida=new Uint8Array(total);
    let pos=0; for(const p of partes){saida.set(p,pos);pos+=p.length;} return saida;
  }
  function criarZipSemCompressao(arquivos){
    const enc=new TextEncoder(), locais=[], centrais=[];
    let offset=0;
    const agora=new Date(), dh=dosDataHora(agora);
    for(const arq of arquivos){
      const nome=enc.encode(String(arq.nome).replace(/\\/g,"/"));
      const dados=typeof arq.conteudo==="string"?enc.encode(arq.conteudo):arq.conteudo;
      const crc=crc32(dados);
      const local=juntarBytes([
        u32(0x04034b50),u16(20),u16(0x0800),u16(0),u16(dh.hora),u16(dh.dia),
        u32(crc),u32(dados.length),u32(dados.length),u16(nome.length),u16(0),nome,dados
      ]);
      locais.push(local);
      const central=juntarBytes([
        u32(0x02014b50),u16(20),u16(20),u16(0x0800),u16(0),u16(dh.hora),u16(dh.dia),
        u32(crc),u32(dados.length),u32(dados.length),u16(nome.length),u16(0),u16(0),u16(0),u16(0),u32(0),u32(offset),nome
      ]);
      centrais.push(central); offset+=local.length;
    }
    const centralBytes=juntarBytes(centrais);
    const fim=juntarBytes([u32(0x06054b50),u16(0),u16(0),u16(arquivos.length),u16(arquivos.length),u32(centralBytes.length),u32(offset),u16(0)]);
    return new Blob([...locais,centralBytes,fim],{type:"application/zip"});
  }
  function baixarBlob(nome,blob){
    const a=document.createElement("a"),url=URL.createObjectURL(blob);
    a.href=url;a.download=nome;document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),3000);
  }
  function jsonBonito(v){return JSON.stringify(v,null,2);}
  function agruparRegistros(registros,campo){
    const mapa=new Map();
    for(const r of registros){
      const nome=String(typeof campo==="function"?campo(r):(r?.[campo]??"Não identificado"));
      const item=mapa.get(nome)||{nome,chamadas:0,bytes:0,duracao_total_ms:0,erros:0,max_ms:0,linhas:0};
      item.chamadas++; item.bytes+=num(r.bytes_recebidos); item.duracao_total_ms+=num(r.duracao_ms);
      item.max_ms=Math.max(item.max_ms,num(r.duracao_ms)); item.linhas+=num(r.linhas_estimadas); if(!r.sucesso)item.erros++;
      mapa.set(nome,item);
    }
    return [...mapa.values()].map(x=>({...x,media_ms:x.chamadas?x.duracao_total_ms/x.chamadas:0,media_bytes:x.chamadas?x.bytes/x.chamadas:0})).sort((a,b)=>b.bytes-a.bytes||b.duracao_total_ms-a.duracao_total_ms);
  }
  function gerarRecomendacoes(registros,rankings){
    const rec=[];
    const totalBytes=registros.reduce((s,r)=>s+num(r.bytes_recebidos),0);
    const totalChamadas=registros.length;
    const add=(nivel,titulo,detalhe,acao)=>rec.push({nivel,titulo,detalhe,acao});
    const topModulo=rankings.modulos[0],topRecurso=rankings.recursos[0],topChamador=rankings.funcoes[0];
    if(topModulo&&totalBytes&&topModulo.bytes/totalBytes>=0.35) add("alta",`Tela ${topModulo.nome} concentra ${(topModulo.bytes/totalBytes*100).toFixed(1)}% do volume`,`Foram ${fmtBytes(topModulo.bytes)} em ${topModulo.chamadas} chamadas.`,`Revisar paginação, filtros no servidor e colunas selecionadas nesta tela.`);
    if(topRecurso&&totalBytes&&topRecurso.bytes/totalBytes>=0.35) add("alta",`Recurso ${topRecurso.nome} lidera o Egress estimado`,`Respondeu por ${(topRecurso.bytes/totalBytes*100).toFixed(1)}% do volume medido.`,`Trocar select('*') por campos necessários e limitar o período retornado.`);
    if(topChamador&&topChamador.chamadas>=Math.max(20,totalChamadas*0.15)) add("média",`Função mais acionada: ${topChamador.nome}`,`${topChamador.chamadas} chamadas, média de ${topChamador.media_ms.toFixed(0)} ms.`,`Verificar chamadas duplicadas e reaproveitamento de resultados em memória.`);
    const lentas=registros.filter(r=>num(r.duracao_ms)>=3000);
    if(lentas.length) add("alta",`${lentas.length} operações acima de 3 segundos`,`Maior duração: ${Math.max(...lentas.map(r=>num(r.duracao_ms))).toFixed(0)} ms.`,`Priorizar as operações listadas em consultas-lentas.json.`);
    const erros=registros.filter(r=>!r.sucesso);
    if(erros.length) add("alta",`${erros.length} operações com erro`,`Há falhas HTTP, timeout ou indisponibilidade registradas.`,`Abrir erros.json e corrigir primeiro os recursos com maior repetição.`);
    const possiveisDuplicadas=[];
    const janela=new Map();
    for(const r of registros){
      const chave=[r.dispositivo_id,r.modulo,r.recurso,r.operacao,r.url_resumo].join("|");
      const t=Date.parse(r.horario)||0,ant=janela.get(chave);
      if(ant&&t-ant<=1500) possiveisDuplicadas.push(r);
      janela.set(chave,t);
    }
    if(possiveisDuplicadas.length) add("média",`${possiveisDuplicadas.length} possíveis chamadas duplicadas`,`Mesma origem e consulta repetidas em até 1,5 segundo.`,`Revisar duplicidades.json e aplicar trava de promessa/debounce.`);
    if(!rec.length) add("baixa","Nenhum gargalo crítico automático encontrado","Os dados ainda podem ser insuficientes ou as operações estão distribuídas.","Coletar mais dias e comparar com o Egress oficial do Supabase.");
    return {itens:rec,possiveis_duplicadas:possiveisDuplicadas};
  }
  async function gerarPacoteAnalise(){
    const botao=document.getElementById("diagPacote");
    const original=botao?.textContent||"Gerar pacote para análise";
    const dias=Number(document.getElementById("diagPeriodo")?.value||7);
    if(botao){botao.disabled=true;botao.textContent="Preparando pacote...";}
    try{
      await enviarPendentes();
      let resumo=ultimoResumo; if(!resumo){try{resumo=await buscarResumo();}catch(_){resumo=null;}}
      const completo=await buscarLogCompleto(dias,total=>{if(botao)botao.textContent=`Coletando ${total.toLocaleString("pt-BR")} registros...`;});
      const registros=completo.registros,geradoEm=agoraIso();
      const rankings={
        modulos:agruparRegistros(registros,"modulo"),
        recursos:agruparRegistros(registros,r=>`${r.servico||"-"} · ${r.recurso||"-"}`),
        funcoes:agruparRegistros(registros,"chamador"),
        dispositivos:agruparRegistros(registros,"dispositivo_nome"),
        versoes:agruparRegistros(registros,"versao_sistema")
      };
      const avaliacao=gerarRecomendacoes(registros,rankings);
      const erros=registros.filter(r=>!r.sucesso);
      const lentas=[...registros].filter(r=>num(r.duracao_ms)>=1000).sort((a,b)=>num(b.duracao_ms)-num(a.duracao_ms)).slice(0,5000);
      const totalBytes=registros.reduce((s,r)=>s+num(r.bytes_recebidos),0);
      const totalMs=registros.reduce((s,r)=>s+num(r.duracao_ms),0);
      const manifesto={
        formato:"RioTendas Pacote de Diagnóstico v1",gerado_em:geradoEm,periodo_dias:dias,
        periodo_inicio:completo.desde,periodo_fim:geradoEm,total_registros:registros.length,
        exportacao_limitada:completo.limitado,versao_sistema:versao(),
        instrucoes:"Envie este arquivo ZIP junto com o ZIP mais recente do sistema para análise de desempenho e Egress.",
        observacao_egress:"Os bytes são estimados pelo navegador e devem ser comparados ao total oficial do painel do Supabase."
      };
      const resumoLocal={...manifesto,total_bytes_estimados:totalBytes,total_bytes_formatados:fmtBytes(totalBytes),tempo_total_ms:totalMs,tempo_medio_ms:registros.length?totalMs/registros.length:0,erros:erros.length,dispositivos:new Set(registros.map(r=>r.dispositivo_id)).size,resumo_central:resumo};
      const configuracao={sistema:{versao:versao(),origem:origemAtual(),protocolo:location.protocol},exportador:{id:dispositivoId(),nome:dispositivoNome(),usuario:usuario()},navegador:{user_agent:navigator.userAgent||"",idioma:navigator.language||"",online:navigator.onLine,memoria_gb:navigator.deviceMemory||null,nucleos:navigator.hardwareConcurrency||null},diagnostico:{modo:modo(),pendentes_locais:lerFila().length,tabela:TABLE,rpc:RPC}};
      const arquivos=[
        {nome:"manifesto.json",conteudo:jsonBonito(manifesto)},
        {nome:"resumo.json",conteudo:jsonBonito(resumoLocal)},
        {nome:"registros/diagnostico-completo.json",conteudo:jsonBonito(registros)},
        {nome:"rankings/modulos.json",conteudo:jsonBonito(rankings.modulos)},
        {nome:"rankings/recursos.json",conteudo:jsonBonito(rankings.recursos)},
        {nome:"rankings/funcoes.json",conteudo:jsonBonito(rankings.funcoes)},
        {nome:"rankings/dispositivos.json",conteudo:jsonBonito(rankings.dispositivos)},
        {nome:"rankings/versoes.json",conteudo:jsonBonito(rankings.versoes)},
        {nome:"analise/erros.json",conteudo:jsonBonito(erros)},
        {nome:"analise/consultas-lentas.json",conteudo:jsonBonito(lentas)},
        {nome:"analise/duplicidades.json",conteudo:jsonBonito(avaliacao.possiveis_duplicadas)},
        {nome:"analise/recomendacoes.json",conteudo:jsonBonito(avaliacao.itens)},
        {nome:"sistema/configuracao.json",conteudo:jsonBonito(configuracao)},
        {nome:"sistema/pendentes-locais.json",conteudo:jsonBonito(lerFila())}
      ];
      const data=new Date().toISOString().replace(/[:.]/g,"-").slice(0,19);
      baixarBlob(`diagnostico-riotendas-${dias}dias-${data}.zip`,criarZipSemCompressao(arquivos));
      if(completo.limitado) alert("O pacote atingiu 100.000 registros. Para uma análise completa, reduza o período e gere pacotes separados.");
    }catch(e){
      console.error(e); alert(`Não foi possível gerar o pacote de diagnóstico: ${e?.message||e}`);
    }finally{if(botao){botao.disabled=false;botao.textContent=original;}}
  }

  function iniciarUi(){
    const nome=document.getElementById("diagDispositivoNome"); if(nome) nome.value=dispositivoNome();
    const m=document.getElementById("diagModo"); if(m) m.value=modo();
    nome?.addEventListener("change",()=>{ const v=nome.value.trim()||nomePadraoDispositivo(); localStorage.setItem(STORAGE_DEVICE_NAME,v.slice(0,120)); nome.value=v; });
    m?.addEventListener("change",()=>localStorage.setItem(STORAGE_MODE,m.value==="detalhado"?"detalhado":"normal"));
    document.getElementById("diagAtualizar")?.addEventListener("click",atualizar);
    document.getElementById("diagEnviar")?.addEventListener("click",async()=>{await enviarPendentes();await atualizar();});
    document.getElementById("diagExportar")?.addEventListener("click",exportar);
    document.getElementById("diagPacote")?.addEventListener("click",gerarPacoteAnalise);
    document.getElementById("diagPeriodo")?.addEventListener("change",atualizar);
    document.querySelector('[data-section="diagnosticoTrafegoSection"]')?.addEventListener("click",()=>setTimeout(atualizar,0));
    window.addEventListener("online",()=>enviarPendentes());
    document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="hidden")enviarPendentes();});
    atualizarStatus(); agendarFlush(10000);
  }
  window.RioTendasDiagnostico={enviarPendentes,atualizar,dispositivoId,dispositivoNome,gerarPacoteAnalise};
  document.addEventListener("DOMContentLoaded",iniciarUi);
})();
