// RioTendas — Central de Envios em lote (previsões) — Desktop
(function(){
  'use strict';
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const normalizarTelefone=v=>{let n=String(v||'').replace(/\D/g,'');if(!n)return'';if(n.startsWith('00'))n=n.slice(2);if(!n.startsWith('55'))n='55'+n;return n;};
  const primeiroNome=n=>String(n||'Cliente').trim().split(/\s+/)[0]||'Cliente';
  const cfg=()=>typeof window.carregarConfiguracoes==='function'?window.carregarConfiguracoes():{};
  const templatePrevisao=()=>((cfg().whatsappApiTemplates||[]).find(t=>t&&t.ativo!==false&&String(t.nomeTemplate||'').toLowerCase().includes('previsao'))||null);
  const parseData=iso=>{const [a,m,d]=String(iso||'').split('-').map(Number);return new Date(a,m-1,d,12,0,0)};
  const dataISO=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const diaSemana=d=>d.toLocaleDateString('pt-BR',{weekday:'long'}).replace(/-feira$/,'-feira');
  function textoDia(iso){
    const alvo=parseData(iso),hoje=new Date();hoje.setHours(12,0,0,0);
    const dif=Math.round((alvo-hoje)/86400000),dm=alvo.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'}),sem=diaSemana(alvo);
    if(dif===0)return `Hoje, dia ${dm}`;
    if(dif===1)return `Amanhã, ${sem}, dia ${dm}`;
    return `${sem.charAt(0).toUpperCase()+sem.slice(1)}, dia ${dm}`;
  }
  function minHora(v){const m=String(v||'').match(/^(\d{1,2}):(\d{2})$/);return m?+m[1]*60 + +m[2]:0}
  function horaTxt(min){const h=Math.floor(min/60),m=min%60;return m?`${h}h${String(m).padStart(2,'0')}`:`${h}h`}
  function faixas(t){const c=t?.previsaoConfig||{},ini=minHora(c.inicio||'08:00'),fim=minHora(c.fim||'18:00'),dur=(Number(c.duracao)||2)*60,out=[];for(let a=ini;a+dur<=fim;a+=60)out.push(`${horaTxt(a)} e ${horaTxt(a+dur)}`);return out.length?out:['9h e 11h','10h e 12h','11h e 13h','12h e 14h','13h e 15h','14h e 16h','15h e 17h'];}
  function periodo(h){const n=parseInt(String(h).match(/\d+/)?.[0]||'0',10);if(n<12)return'manhã';if(n<14)return'início da tarde';return'tarde';}
  function materiais(r){
    const evento=r?.evento||{};
    const textos=[];
    (evento.tendas||[]).forEach(p=>textos.push([p?.categoria,p?.tipo,p?.descricao,p?.nome].filter(Boolean).join(' ')));
    (evento.itens_apoio||[]).forEach(i=>textos.push(i?.nome||i?.descricao||''));
    (evento.produtos_extras||[]).forEach(i=>textos.push(i?.descricao||i?.nome||''));
    if(!textos.length && Array.isArray(r?.materiais)) textos.push(...r.materiais);
    const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
    const grupos={tenda:0,ombrelone:0,mesa:0,cadeira:0,outro:0};
    textos.filter(Boolean).forEach(txt=>{
      const n=norm(txt);
      if(n.includes('ombrelone')) grupos.ombrelone++;
      else if(/\btenda\b/.test(n)) grupos.tenda++;
      else if(n.includes('mesa')) grupos.mesa++;
      else if(n.includes('cadeira')) grupos.cadeira++;
      else if(!n.includes('uso em transito')) grupos.outro++;
    });
    const ativos=Object.entries(grupos).filter(([,q])=>q>0).map(([k])=>k);
    if(ativos.length===1 && ativos[0]==='tenda') return grupos.tenda>1?'das tendas':'da tenda';
    if(ativos.length===1 && ativos[0]==='ombrelone') return grupos.ombrelone>1?'dos ombrelones':'do ombrelone';
    if(ativos.every(k=>k==='mesa'||k==='cadeira') && ativos.length){
      if(grupos.mesa&&grupos.cadeira) return 'das mesas e cadeiras';
      if(grupos.mesa) return grupos.mesa>1?'das mesas':'da mesa';
      return grupos.cadeira>1?'das cadeiras':'da cadeira';
    }
    return ativos.length?'dos materiais':'do material';
  }
  function mensagem(t,row){let s=String(t.body||'');const vals=[row.nome,row.materiais,row.dia,row.horario];vals.forEach((v,i)=>s=s.replace(new RegExp(`\\{\\{${i+1}\\}\\}`,'g'),v));return s;}
  async function historico(eventoId){try{const sb=window.supabaseClient||supabaseClient;const {data,error}=await sb.from('logs_sistema').select('*').eq('modulo','WhatsApp').eq('registro_id',String(eventoId)).order('criado_em',{ascending:false}).limit(100);if(!error)return data||[];}catch{}return[]}
  function habilitarArraste(d){
    if(d.dataset.dragReady==='1')return;d.dataset.dragReady='1';
    const cab=d.querySelector('.modal-header');let ativo=false,dx=0,dy=0;
    cab.addEventListener('pointerdown',e=>{if(e.target.closest('button,input,select'))return;ativo=true;const r=d.getBoundingClientRect();dx=e.clientX-r.left;dy=e.clientY-r.top;d.style.margin='0';d.style.left=r.left+'px';d.style.top=r.top+'px';cab.setPointerCapture?.(e.pointerId);});
    cab.addEventListener('pointermove',e=>{if(!ativo)return;const maxX=Math.max(0,innerWidth-d.offsetWidth),maxY=Math.max(0,innerHeight-d.offsetHeight);d.style.left=Math.max(0,Math.min(maxX,e.clientX-dx))+'px';d.style.top=Math.max(0,Math.min(maxY,e.clientY-dy))+'px';});
    const parar=()=>ativo=false;cab.addEventListener('pointerup',parar);cab.addEventListener('pointercancel',parar);
  }
  function dialog(){let d=document.getElementById('waLoteDialog');if(d)return d;d=document.createElement('dialog');d.id='waLoteDialog';d.className='modal wa-lote-dialog';d.innerHTML=`<div class="modal-header" title="Arraste para mover"><div><h2>📨 Previsões do dia</h2><p id="waLoteSub"></p></div><button type="button" class="modal-close" data-wa-lote-fechar>×</button></div><div class="wa-lote-toolbar"><label><input type="checkbox" id="waLoteTodos" checked> Selecionar todos</label><span id="waLoteContador"></span></div><div id="waLoteLista" class="wa-lote-lista"></div><div id="waLoteStatus" class="wa-api-envio-status" hidden></div><div class="wa-lote-footer"><button type="button" class="btn-outline" data-wa-lote-fechar>Cancelar</button><button type="button" id="waLoteEnviar">Enviar selecionados</button></div>`;document.body.appendChild(d);habilitarArraste(d);return d;}
  let linhas=[];
  function lerLinha(el){const sel=el.querySelector('[data-lote-horario]').value;const personalizado=el.querySelector('[data-lote-personalizado]')?.value.trim()||'';return {rotaId:el.dataset.rotaId,eventoId:el.dataset.eventoId,telefone:el.dataset.telefone,nome:el.querySelector('[data-lote-nome]').value.trim(),materiais:el.querySelector('[data-lote-materiais]').value.trim(),dia:el.querySelector('[data-lote-dia]').value.trim(),horario:sel==='personalizado'?personalizado:sel,horarioTipo:sel,selecionado:el.querySelector('[data-lote-check]').checked};}
  function atualizarContador(){const els=[...document.querySelectorAll('.wa-lote-row')],n=els.filter(e=>e.querySelector('[data-lote-check]').checked).length;const c=document.getElementById('waLoteContador');if(c)c.textContent=`${n} selecionado(s)`;const b=document.getElementById('waLoteEnviar');if(b)b.textContent=`Enviar ${n} mensagem${n===1?'':'s'}`;}
  function atualizarPrevia(el){const t=templatePrevisao(),r=lerLinha(el),p=el.querySelector('[data-lote-preview]');if(p)p.textContent=mensagem(t,r);}
  async function abrir(data){
    if(matchMedia('(max-width: 760px)').matches)return alert('A Central de Envios em lote está disponível somente no Desktop.');
    const t=templatePrevisao();if(!t)return alert('Adicione e ative o template “previsao” em Configurações → WhatsApp API.');
    const todas=typeof window.criarRotasDosEventos==='function'?window.criarRotasDosEventos():[];
    const lista=todas.filter(r=>r.data===data&&String(r.tipo).toLowerCase()==='montagem');
    if(!lista.length)return alert('Nenhuma montagem encontrada nesta data.');
    const fs=faixas(t); linhas=[];
    for(let i=0;i<lista.length;i++){
      const r=lista[i],hist=await historico(r.evento_id),h=hist.find(x=>String(x?.depois?.nomeTemplate||'').toLowerCase().includes('previsao'));
      linhas.push({r,nome:primeiroNome(r.cliente),materiais:materiais(r),dia:textoDia(data),horario:fs[Math.min(i,fs.length-1)],enviado:h});
    }
    const d=dialog();d.querySelector('#waLoteSub').textContent=`${textoDia(data)} • ${lista.length} cliente(s)`;
    d.querySelector('#waLoteLista').innerHTML=linhas.map((x,i)=>`<div class="wa-lote-row ${x.enviado?'ja-enviado':''}" data-rota-id="${esc(x.r.id)}" data-evento-id="${esc(x.r.evento_id)}" data-telefone="${esc(normalizarTelefone(x.r.telefone))}"><div class="wa-lote-main"><input type="checkbox" data-lote-check ${normalizarTelefone(x.r.telefone)?'checked':'disabled'} title="Selecionar cliente"><input data-lote-nome value="${esc(x.nome)}" aria-label="Nome" title="Nome do cliente"><input data-lote-materiais value="${esc(x.materiais)}" aria-label="Materiais" title="Materiais"><input data-lote-dia value="${esc(x.dia)}" aria-label="Dia" title="Dia da entrega"><select data-lote-horario title="Faixa de horário">${fs.map(f=>`<option ${f===x.horario?'selected':''}>${esc(f)}</option>`).join('')}<option value="personalizado">Personalizar...</option></select><input data-lote-personalizado class="wa-lote-personalizado" placeholder="Ex.: 13h e 16h" aria-label="Horário personalizado" hidden><span class="wa-lote-periodo">${periodo(x.horario)}</span><span class="wa-lote-envio-status">${x.enviado?'✓ Já enviado':'Pendente'}</span></div></div>`).join('');
    atualizarContador();d.style.left='50%';d.style.top='72px';d.style.transform='translateX(-50%)';d.style.margin='0';typeof d.show==='function'?d.show():d.setAttribute('open','');
  }
  async function enviar(){
    const t=templatePrevisao(),els=[...document.querySelectorAll('.wa-lote-row')].filter(e=>e.querySelector('[data-lote-check]').checked);if(!els.length)return alert('Selecione pelo menos um cliente.');
    if(!confirm(`Enviar ${els.length} previsão(ões)?`))return;
    const btn=document.getElementById('waLoteEnviar'),st=document.getElementById('waLoteStatus');btn.disabled=true;st.hidden=false;let ok=0,erro=0;
    for(let i=0;i<els.length;i++){
      const el=els[i],row=lerLinha(el);if(row.horarioTipo==='personalizado'&&!row.horario)throw new Error('Informe o horário personalizado.');
      st.className='wa-api-envio-status enviando';st.textContent=`Enviando ${i+1} de ${els.length}: ${row.nome}...`;
      try{if(!row.telefone)throw new Error('telefone inválido');const sb=window.supabaseClient||supabaseClient;const bodyParams={additionalProp1:row.nome,additionalProp2:row.materiais,additionalProp3:row.dia,additionalProp4:row.horario};const {data,error}=await sb.functions.invoke('onecode-whatsapp',{body:{action:'send_template',telefone:row.telefone,nome:row.nome,tipo:'montagem',templateId:String(t.templateId),nomeTemplate:t.nomeTemplate||'previsao',bodyParams}});if(error)throw error;if(data?.error)throw new Error(data.error);ok++;el.classList.add('enviado-agora');el.querySelector('.wa-lote-envio-status').textContent='✓ Enviado';if(typeof registrarLogSistema==='function')await registrarLogSistema({modulo:'WhatsApp',acao:'Template enviado',registro_id:String(row.eventoId),registro_nome:row.nome,depois:{acaoId:String(t.id),templateId:String(t.templateId),nomeTemplate:t.nomeTemplate||'previsao',titulo:t.titulo||'Previsão de entrega',rotaId:row.rotaId,tipo:'montagem',telefone:row.telefone,bodyParams,mensagem:mensagem(t,row)},detalhes:`Previsão enviada para ${row.nome}`});}catch(e){erro++;el.classList.add('erro-envio');el.querySelector('.wa-lote-envio-status').textContent='Erro';}
    }
    st.className=`wa-api-envio-status ${erro?'erro':'sucesso'}`;st.textContent=`${ok} enviada(s) com sucesso${erro?` • ${erro} falhou(aram)`:''}.`;btn.disabled=false;
  }
  document.addEventListener('click',e=>{const b=e.target.closest('[data-wa-lote-data]');if(b){e.preventDefault();abrir(b.dataset.waLoteData);return;}if(e.target.closest('[data-wa-lote-fechar]')){dialog().close();return;}if(e.target.closest('#waLoteEnviar'))enviar();});
  document.addEventListener('change',e=>{if(e.target.id==='waLoteTodos'){document.querySelectorAll('[data-lote-check]:not(:disabled)').forEach(c=>c.checked=e.target.checked);atualizarContador();return;}if(e.target.matches('[data-lote-check]')){atualizarContador();return;}if(e.target.matches('[data-lote-horario]')){const row=e.target.closest('.wa-lote-row'),campo=row.querySelector('[data-lote-personalizado]'),personalizado=e.target.value==='personalizado';campo.hidden=!personalizado;campo.disabled=!personalizado;if(personalizado)setTimeout(()=>campo.focus(),0);row.querySelector('.wa-lote-periodo').textContent=personalizado?'personalizado':periodo(e.target.value);}});
  document.addEventListener('input',e=>{const row=e.target.closest('.wa-lote-row');if(row&&e.target.matches('[data-lote-personalizado]'))row.querySelector('.wa-lote-periodo').textContent=e.target.value.trim()?'personalizado':'informe o horário';});
  window.rtWhatsappLote={abrir};
})();
