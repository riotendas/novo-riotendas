// v19-dev - Mapa Operacional RioTendas com coordenadas persistidas no evento
(function(){
  let rtMapa = null;
  let rtMapaLayer = null;
  let rtMapaMarkers = [];
  let rtMapaRenderToken = 0;
  let rtMapaEventosCache = null;
  let rtMapaEventosCacheKey = '';
  let rtMapaPontosCache = null;
  let rtMapaDebounce = null;
  let rtMapaGeocodeFilaRodando = false;

  const CACHE_KEY = 'riotendas_mapa_geocode_cache_v4';
  const RJ_CENTER = [-22.9068, -43.1729];
  const MAX_GEOCODE_BACKGROUND = 0; // coordenadas agora são salvas no evento; mapa não geocodifica ao abrir

  function esc(v){return String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function norm(v){return String(v ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();}
  function hojeISO(){ const d=new Date(); d.setHours(0,0,0,0); return d.toISOString().slice(0,10); }
  function addDiasISO(iso, dias){
    const d = iso ? new Date(iso + 'T00:00:00') : new Date();
    if(!Number.isFinite(d.getTime())) return hojeISO();
    d.setDate(d.getDate() + Number(dias || 0));
    return d.toISOString().slice(0,10);
  }
  function periodoMapa(){
    const baseEl=document.getElementById('mapaDataBase');
    if(baseEl && !baseEl.value) baseEl.value = hojeISO();
    const ini = baseEl?.value || hojeISO();
    const dias = Math.max(1, Math.min(30, Number(document.getElementById('mapaPeriodo')?.value || 7) || 7));
    return {ini, fim:addDiasISO(ini, dias-1), dias};
  }
  function eventoNoPeriodo(e, ini, fim){
    const ev=dataEvento(e), mon=dataMontagem(e), des=dataDesmontagem(e);
    if(mon && mon >= ini && mon <= fim) return true;
    if(des && des >= ini && des <= fim) return true;
    if(ev && ev >= ini && ev <= fim) return true;
    // material na rua durante o período: montagem antes/fim e desmontagem depois/início
    if(mon && des && mon <= fim && des >= ini) return true;
    return false;
  }

  function parseData(v){
    if(!v) return '';
    const s=String(v).trim();
    const iso=s.match(/\d{4}-\d{2}-\d{2}/); if(iso) return iso[0];
    const br=s.match(/(\d{2})\/(\d{2})\/(\d{2,4})/); if(br){ const y=br[3].length===2?'20'+br[3]:br[3]; return `${y}-${br[2]}-${br[1]}`; }
    return '';
  }
  function fmtData(iso){ if(!iso) return '-'; const [y,m,d]=iso.split('-'); return `${d}/${m}/${String(y).slice(-2)}`; }
  function campo(e, nomes){ for(const n of nomes){ if(e && e[n] != null && e[n] !== '') return e[n]; } return ''; }
  function nomeCliente(e){ return campo(e, ['nome','cliente','cliente_nome','nome_cliente','contratante']) || 'Cliente'; }
  function dataEvento(e){ return parseData(campo(e, ['data_evento','data','evento_data','data_inicio'])); }
  function dataMontagem(e){ return parseData(campo(e, ['data_montagem','montagem','dataMontagem'])); }
  function dataDesmontagem(e){ return parseData(campo(e, ['data_desmontagem','desmontagem','dataDesmontagem'])); }
  function idEvento(e){ return String(e?.id || e?.evento_id || e?.codigo || '').trim(); }
  function enderecoEvento(e){
    if(typeof window.rtEnderecoCompleto === 'function'){
      try { const v = window.rtEnderecoCompleto(e); if(v) return v; } catch(_){}
    }
    return [e?.endereco, e?.numero, e?.bairro, e?.cidade || 'Rio de Janeiro', e?.uf || 'RJ'].filter(Boolean).join(', ');
  }
  function chaveEndereco(e){ return norm(enderecoEvento(e)); }
  function carregarCache(){ try{return JSON.parse(localStorage.getItem(CACHE_KEY)||'{}')||{};}catch(_){return{};} }
  function salvarCache(c){ try{localStorage.setItem(CACHE_KEY, JSON.stringify(c));}catch(_){} }
  function avisoMapa(txt){
    const el=document.getElementById('mapaResumoOperacao');
    if(!el || !txt) return;
    let badge=document.getElementById('mapaAvisoGeocode');
    if(!badge){ badge=document.createElement('span'); badge.id='mapaAvisoGeocode'; el.appendChild(badge); }
    badge.innerHTML = esc(txt);
  }
  async function salvarCoordenadaSupabase(e, pos){
    if(!window.supabaseClient || !posValida(pos?.lat,pos?.lng)) return;
    const payload={
      evento_id: idEvento(e) || null,
      cliente: nomeCliente(e),
      endereco: enderecoEvento(e),
      latitude: Number(pos.lat),
      longitude: Number(pos.lng),
      origem: 'mapa_operacional',
      atualizado_em: new Date().toISOString()
    };
    const tentativas=[
      ['mapa_coordenadas','endereco'],
      ['mapa_pontos','endereco'],
      ['enderecos_coordenadas','endereco'],
      ['geocodificacao_cache','endereco']
    ];
    for(const [tabela, conflito] of tentativas){
      try{
        const { error } = await supabaseClient.from(tabela).upsert(payload, { onConflict: conflito });
        if(!error) return;
      }catch(_){ }
    }
  }

  function hashTexto(str){
    let h=0; str=String(str||'');
    for(let i=0;i<str.length;i++) h=((h<<5)-h)+str.charCodeAt(i), h|=0;
    return Math.abs(h);
  }
  function jitter(pos, key){
    const h=hashTexto(key);
    const a=(h%360)*Math.PI/180;
    const r=0.0025 + ((h%900)/100000); // espalha pontos próximos sem sair muito do bairro
    return {lat:Number(pos.lat)+Math.sin(a)*r, lng:Number(pos.lng)+Math.cos(a)*r, fonte:pos.fonte||'aproximado'};
  }
  function posAproximadaEndereco(e){
    const texto = norm(`${enderecoEvento(e)} ${nomeCliente(e)}`);
    if(!texto) return null;
    const pontos = [
      ['barra da tijuca',-23.0004,-43.3659],['recreio',-23.0186,-43.4639],['vargem grande',-22.9700,-43.4940],['vargem pequena',-22.9850,-43.4550],['jacarepagua',-22.9675,-43.3904],['taquara',-22.9206,-43.3841],['freguesia',-22.9416,-43.3426],['curicica',-22.9511,-43.3886],['camorim',-22.9711,-43.4311],['gardênia azul',-22.9586,-43.3517],['gardenia azul',-22.9586,-43.3517],
      ['copacabana',-22.9711,-43.1822],['ipanema',-22.9847,-43.2022],['leblon',-22.9845,-43.2232],['lagoa',-22.9658,-43.2089],['jardim botanico',-22.9674,-43.2237],['jardim botânico',-22.9674,-43.2237],['gavea',-22.9778,-43.2289],['gávea',-22.9778,-43.2289],['flamengo',-22.9339,-43.1743],['botafogo',-22.9519,-43.1840],['laranjeiras',-22.9346,-43.1878],['catete',-22.9252,-43.1760],['gloria',-22.9184,-43.1765],['glória',-22.9184,-43.1765],['centro',-22.9068,-43.1729],['sao cristovao',-22.8973,-43.2210],['são cristóvão',-22.8973,-43.2210],['tijuca',-22.9249,-43.2322],['vila isabel',-22.9166,-43.2475],['grajau',-22.9216,-43.2686],['grajaú',-22.9216,-43.2686],['maracana',-22.9121,-43.2302],['maracanã',-22.9121,-43.2302],
      ['madureira',-22.8735,-43.3444],['campinho',-22.8840,-43.3470],['cascadura',-22.8838,-43.3289],['marechal hermes',-22.8598,-43.3704],['vila valqueire',-22.8883,-43.3659],['realengo',-22.8769,-43.4306],['bangu',-22.8832,-43.4716],['campo grande',-22.9028,-43.5590],['santa cruz',-22.9176,-43.6847],['guaratiba',-22.9932,-43.5840],['ilha do governador',-22.8053,-43.2066],['ilha',-22.8053,-43.2066],['ramos',-22.8496,-43.2560],['penha',-22.8382,-43.2769],['bonsucesso',-22.8612,-43.2531],
      ['niteroi',-22.8832,-43.1034],['niterói',-22.8832,-43.1034],['sao goncalo',-22.8268,-43.0537],['são gonçalo',-22.8268,-43.0537],['marica',-22.9195,-42.8186],['maricá',-22.9195,-42.8186],['mage',-22.6524,-43.0409],['magé',-22.6524,-43.0409],['inhomirim',-22.5767,-43.1781],['duque de caxias',-22.7858,-43.3049],['nova iguacu',-22.7592,-43.4511],['nova iguaçu',-22.7592,-43.4511],['queimados',-22.7103,-43.5518],['seropedica',-22.7438,-43.7075],['seropédica',-22.7438,-43.7075],['itaguai',-22.8522,-43.7753],['itaguaí',-22.8522,-43.7753],['petropolis',-22.5050,-43.1788],['petrópolis',-22.5050,-43.1788],['teresopolis',-22.4165,-42.9752],['teresópolis',-22.4165,-42.9752],
      ['rio de janeiro',-22.9068,-43.1729],['rj',-22.9068,-43.1729]
    ];
    for(const [nome,lat,lng] of pontos){
      if(texto.includes(norm(nome))) return jitter({lat,lng,fonte:'aproximado'}, `${texto}|${nome}`);
    }
    return null;
  }
  function posValida(lat,lng){
    lat=Number(lat); lng=Number(lng);
    if(!Number.isFinite(lat)||!Number.isFinite(lng)||Math.abs(lat)>90||Math.abs(lng)>180) return false;
    // evita o erro clássico 0,0 (Null Island), que joga o ponto perto da África
    if(Math.abs(lat) < 0.0001 && Math.abs(lng) < 0.0001) return false;
    // RioTendas opera no RJ/região; coordenadas fora do Brasil quase sempre são lixo do banco/geocoder
    if(lat < -35 || lat > 6 || lng < -75 || lng > -30) return false;
    return true;
  }
  function extrairPos(e){
    const lat = campo(e, ['latitude','lat','mapa_lat','geo_lat','local_latitude','coord_latitude']);
    const lng = campo(e, ['longitude','lng','lon','mapa_lng','geo_lng','local_longitude','coord_longitude']);
    if(posValida(lat,lng)) return {lat:Number(lat), lng:Number(lng), fonte:'evento'};
    return null;
  }
  function obterRotasOperacaoMapa(){
    try{ if (typeof rotasOperacao !== 'undefined' && rotasOperacao && typeof rotasOperacao === 'object') return rotasOperacao; }catch(_){}
    try{ if (window.rotasOperacao && typeof window.rotasOperacao === 'object') return window.rotasOperacao; }catch(_){}
    try{ return JSON.parse(localStorage.getItem('novoRioTendasRotasOperacaoV1') || '{}') || {}; }catch(_){ return {}; }
  }
  function operacaoConfirmada(e, tipo){
    try{
      const id = e?.id || e?.evento_id;
      const op = obterRotasOperacaoMapa()?.[`${id}-${tipo}`];
      const st = String(op?.status || '').toLowerCase();
      if(tipo==='montagem') return st === 'entregue';
      if(tipo==='desmontagem') return st === 'recolhido';
    }catch(_){ }
    return false;
  }
  function statusEventoMapa(e){
    const h=hojeISO(), ev=dataEvento(e), mon=dataMontagem(e), des=dataDesmontagem(e);
    const entregue = operacaoConfirmada(e,'montagem');
    const recolhido = operacaoConfirmada(e,'desmontagem');
    if(entregue && !recolhido) return {classe:'entregue', label:'Na rua'};
    if(recolhido) return {classe:'historico', label:'Recolhido'};
    if(des && des < h && !recolhido) return {classe:'atrasado', label:'Retirada atrasada'};
    if(mon && mon >= h && !entregue) return {classe:'montagem', label:'Montagem futura'};
    if(des && des >= h && !recolhido) return {classe:'recolher', label:'A recolher'};
    if(ev && ev >= h) return {classe:'futuro', label:'Evento futuro'};
    return {classe:'historico', label:'Histórico'};
  }
  function resumirMaterialItem(item){
    const qtd = Number(item?.quantidade ?? item?.qtd ?? item?.qtde ?? 1) || 1;
    const nome = item?.nome || item?.descricao || item?.produto || item?.tipo || item?.categoria || 'material';
    return `${qtd} ${nome}`;
  }
  function resumoMateriais(e){
    const partes=[];
    if(Array.isArray(e?.tendas) && e.tendas.length){
      const codigos = e.tendas.map(t => [t.codigo, t.tamanho, t.cor || t.categoria].filter(Boolean).join(' ')).filter(Boolean);
      partes.push(`${e.tendas.length} ${e.tendas.length===1?'tenda':'tendas'}${codigos.length ? ': '+codigos.slice(0,4).join(', ') : ''}`);
    }
    ['itens_apoio','apoio','produtos_extras','materiais_extra'].forEach(k=>{ if(Array.isArray(e?.[k])) e[k].forEach(i => partes.push(resumirMaterialItem(i))); });
    return partes.length ? partes.join(' + ') : 'Sem material informado';
  }
  function listaMateriais(e){
    const itens=[];
    if(Array.isArray(e?.tendas)) e.tendas.forEach(t=>itens.push([t.codigo, t.categoria, t.tamanho, t.cor].filter(Boolean).join(' - ') || 'Tenda'));
    ['itens_apoio','apoio','produtos_extras','materiais_extra'].forEach(k=>{ if(Array.isArray(e?.[k])) e[k].forEach(i=>itens.push(resumirMaterialItem(i))); });
    return itens;
  }

  function indexarPonto(mapa, p, fonte){
    const lat = campo(p, ['latitude','lat','mapa_lat','geo_lat','local_latitude','coord_latitude']);
    const lng = campo(p, ['longitude','lng','lon','mapa_lng','geo_lng','local_longitude','coord_longitude']);
    if(!posValida(lat,lng)) return;
    const pos = {lat:Number(lat), lng:Number(lng), fonte};
    const evId = String(campo(p, ['evento_id','id_evento','event_id','codigo_evento','evento_codigo']) || '').trim();
    if(evId) mapa.ids.set(evId, pos);
    const end = norm(campo(p, ['endereco','endereco_completo','address','logradouro','local','localizacao','chave','endereco_chave']) || '');
    if(end) mapa.ends.set(end, pos);
    const cliente = norm(campo(p, ['cliente','nome_cliente','cliente_nome','nome','contratante']) || '');
    if(cliente && end) mapa.textos.push({cliente,end,pos});
  }

  async function withTimeout(promise, ms){
    return Promise.race([promise, new Promise(resolve=>setTimeout(()=>resolve({timeout:true}), ms))]);
  }

  async function carregarPontosSupabase(){
    if(rtMapaPontosCache) return rtMapaPontosCache;
    const mapa = { ids:new Map(), ends:new Map(), textos:[] };
    const cache=carregarCache();
    Object.keys(cache).forEach(k=>{ if(cache[k] && posValida(cache[k].lat, cache[k].lng)) mapa.ends.set(k, cache[k]); });
    if(!window.supabaseClient){ rtMapaPontosCache = mapa; return mapa; }

    const tabelas = [
      'mapa_pontos','mapa_operacional','mapa_coordenadas','mapa_enderecos','enderecos_mapa','eventos_mapa','eventos_localizacoes',
      'localizacoes_eventos','localizacoes','enderecos_coordenadas','coordenadas_enderecos','enderecos_geocodificados','geocodificacao_cache'
    ];
    const consultas = tabelas.map(tabela => withTimeout(
      supabaseClient.from(tabela).select('*').limit(3000).then(r=>({tabela, ...r})).catch(error=>({tabela,error})),
      1600
    ));
    const resultados = await Promise.allSettled(consultas);
    resultados.forEach(r=>{
      const v = r.value || {};
      if(!Array.isArray(v.data)) return;
      v.data.forEach(p=>indexarPonto(mapa, p, v.tabela));
    });
    rtMapaPontosCache = mapa;
    return mapa;
  }

  function limparChaveEndereco(v){
    return norm(v)
      .replace(/cep\s*\d[\d\-.]*/g,' ')
      .replace(/\bbrasil\b/g,' ')
      .replace(/\brj\b/g,' rio de janeiro ')
      .replace(/[^a-z0-9 ]+/g,' ')
      .replace(/\s+/g,' ')
      .trim();
  }

  function enderecosParecidos(a,b){
    a=limparChaveEndereco(a); b=limparChaveEndereco(b);
    if(!a || !b || a.length < 12 || b.length < 12) return false;
    if(a === b) return true;
    // Só aceita parecido quando há número/endereço relevante em comum.
    const numsA = new Set((a.match(/\b\d{1,6}\b/g)||[]));
    const numsB = new Set((b.match(/\b\d{1,6}\b/g)||[]));
    const temNumeroComum = [...numsA].some(n=>numsB.has(n));
    if(!temNumeroComum && numsA.size && numsB.size) return false;
    const menor = a.length <= b.length ? a : b;
    const maior = a.length > b.length ? a : b;
    return menor.length >= 18 && maior.includes(menor);
  }

  function buscarPosEmIndice(e, pontos){
    const id=idEvento(e);
    if(id && pontos.ids.has(id)) return pontos.ids.get(id);
    const end=enderecoEvento(e);
    const endNorm=norm(end);
    if(endNorm && pontos.ends.has(endNorm)) return pontos.ends.get(endNorm);
    if(end){
      for(const [k,pos] of pontos.ends){
        if(enderecosParecidos(end, k)) return pos;
      }
    }
    return null;
  }

  function filtrarEventos(lista){
    const busca = norm(document.getElementById('mapaBusca')?.value || '');
    const filtro = document.getElementById('mapaFiltroStatus')?.value || 'na_rua';
    const material = document.getElementById('mapaFiltroMaterial')?.value || 'todos';
    const {ini,fim} = periodoMapa();
    return (lista||[]).filter(e=>{
      if(!e || (typeof window.rtEventoCancelado === 'function' && window.rtEventoCancelado(e))) return false;
      if(!eventoNoPeriodo(e, ini, fim)) return false;
      const st=statusEventoMapa(e);
      const mon=dataMontagem(e), des=dataDesmontagem(e);
      const materialNaRua = st.classe === 'entregue' || (mon && des && mon <= fim && des >= ini && st.classe !== 'historico');
      if(filtro !== 'todos'){
        if(filtro==='na_rua' && !materialNaRua) return false;
        else if(filtro!=='na_rua' && st.classe !== filtro) return false;
      }
      const mats = norm(resumoMateriais(e));
      if(material !== 'todos' && !mats.includes(material)) return false;
      const txt = norm(`${nomeCliente(e)} ${enderecoEvento(e)} ${resumoMateriais(e)} ${campo(e,['carro','veiculo'])}`);
      if(busca && !txt.includes(busca)) return false;
      return true;
    }).sort((a,b)=>String(dataMontagem(a)||dataEvento(a)||dataDesmontagem(a)).localeCompare(String(dataMontagem(b)||dataEvento(b)||dataDesmontagem(b))) || nomeCliente(a).localeCompare(nomeCliente(b)));
  }

  async function obterEventosMapa(force){
    const {ini,fim}=periodoMapa();
    const cacheKey = `${ini}|${fim}`;
    if(!force && Array.isArray(rtMapaEventosCache) && rtMapaEventosCacheKey === cacheKey) return rtMapaEventosCache;
    // Primeiro tenta buscar no Supabase só um intervalo pequeno. Isso evita carregar/geocodificar a base inteira.
    if(window.supabaseClient){
      try{
        const orFiltro = `and(data_evento.gte.${ini},data_evento.lte.${fim}),and(data_montagem.gte.${ini},data_montagem.lte.${fim}),and(data_desmontagem.gte.${ini},data_desmontagem.lte.${fim}),and(data_montagem.lte.${fim},data_desmontagem.gte.${ini})`;
        const {data,error}=await supabaseClient.from('eventos').select('*').or(orFiltro).order('data_evento',{ascending:true}).limit(250);
        if(!error && Array.isArray(data)){ rtMapaEventosCache=data; rtMapaEventosCacheKey=cacheKey; return data; }
        if(error) console.warn('Mapa: busca por período falhou, usando cache/local', error);
      }catch(e){ console.warn('Mapa: erro na busca por período', e); }
    }
    let lista=[];
    if(Array.isArray(window.eventos) && window.eventos.length) lista=window.eventos;
    else if(typeof window.buscarEventosBanco === 'function'){
      try{ const l=await window.buscarEventosBanco(); if(Array.isArray(l)){ window.eventos=l; lista=l; } }catch(e){ console.warn('Mapa: erro ao buscar eventos', e); }
    } else if(typeof window.garantirEventosDashboard === 'function'){
      try{ const l=await window.garantirEventosDashboard(); if(Array.isArray(l)) lista=l; }catch(_){}
    }
    rtMapaEventosCache=lista;
    rtMapaEventosCacheKey=cacheKey;
    return lista;
  }

  function atualizarResumo(lista, extras){
    let tendas=0, cadeiras=0, mesas=0, outros=0;
    lista.forEach(e=>{
      tendas += Array.isArray(e?.tendas) ? e.tendas.length : 0;
      const somar=(arr)=>{ if(!Array.isArray(arr)) return; arr.forEach(i=>{ const q=Number(i?.quantidade??i?.qtd??1)||1; const n=norm(i?.nome||i?.descricao||i?.produto||i?.tipo); if(n.includes('cadeira')) cadeiras+=q; else if(n.includes('mesa')) mesas+=q; else outros+=q; }); };
      ['itens_apoio','apoio','produtos_extras','materiais_extra'].forEach(k=>somar(e?.[k]));
    });
    const el=document.getElementById('mapaResumoOperacao');
    if(el){
      const complemento = extras ? `<span><strong>${extras.pontos||0}</strong> no mapa</span><span><strong>${extras.semCoordenada||0}</strong> sem coordenada</span>` : '';
      el.innerHTML = `<span><strong>${lista.length}</strong> locais</span><span><strong>${tendas}</strong> tendas</span><span><strong>${mesas}</strong> mesas</span><span><strong>${cadeiras}</strong> cadeiras</span><span><strong>${outros}</strong> outros</span>${complemento}`;
    }
  }

  function cardListaEvento(e, idx, temCoord){
    const st=statusEventoMapa(e);
    const endereco=enderecoEvento(e);
    return `<button type="button" class="mapa-evento-item ${temCoord?'':'sem-coord'}" data-mapa-evento-idx="${idx}">
      <span class="mapa-dot ${st.classe}"></span>
      <strong>${esc(nomeCliente(e))}</strong>
      <small>${esc(st.label)} · Evento ${fmtData(dataEvento(e))}${temCoord?'':' · sem coordenada'}</small>
      <small>📍 ${esc(endereco || 'Endereço não informado')}</small>
      <small>⛺ ${esc(resumoMateriais(e))}</small>
    </button>`;
  }

  function popupEvento(e){
    const st=statusEventoMapa(e);
    const materiais=listaMateriais(e).slice(0,8).map(i=>`<li>${esc(i)}</li>`).join('') || '<li>Sem material informado</li>';
    const id=esc(idEvento(e));
    const lat=campo(e,['latitude','lat','mapa_lat','geo_lat','local_latitude','coord_latitude']) || '-';
    const lng=campo(e,['longitude','lng','lon','mapa_lng','geo_lng','local_longitude','coord_longitude']) || '-';
    const endereco=enderecoEvento(e) || '-';
    const origem=e._origemCoordenada || 'Desconhecida';
    const linkCoord=(lat!=='-'&&lng!=='-')?`https://maps.google.com/?q=${lat},${lng}`:'';
    return `<div class="mapa-popup">
      <strong>${esc(nomeCliente(e))}</strong>
      <div><span class="mapa-badge ${st.classe}">${esc(st.label)}</span></div>
      <div>Evento: ${fmtData(dataEvento(e))}</div>
      <div>Montagem: ${fmtData(dataMontagem(e))} · Desmontagem: ${fmtData(dataDesmontagem(e))}</div>
      <div>Carro: ${esc(campo(e,['carro','veiculo']) || '-')}</div>
      <hr style="margin:6px 0">
      <div><strong>Endereço usado:</strong><br>${esc(endereco)}</div>
      <div><strong>Latitude:</strong> ${esc(lat)}</div>
      <div><strong>Longitude:</strong> ${esc(lng)}</div>
      <div><strong>Origem:</strong> ${esc(origem)}</div>
      <div><strong>Coordenada válida:</strong> ${posValida(lat,lng)?'SIM':'NÃO'}</div>
      <div><strong>Materiais:</strong><ul>${materiais}</ul></div>
      <div class="mapa-popup-actions">
        ${linkCoord ? `<a target="_blank" class="btn-outline" href="${linkCoord}">📍 Coordenada</a>` : ''}
        ${id ? `<button type="button" class="btn-outline" data-mapa-abrir-evento="${id}">Evento</button>` : ''}
        ${id ? `<button type="button" class="btn-outline" data-mapa-abrir-rota="${id}">Rota</button>` : ''}
      </div>
    </div>`;
  }

  function garantirMapa(box){
    if(!window.L) return false;
    if(!rtMapa){
      rtMapa = L.map(box, { preferCanvas:true, zoomControl:true, fadeAnimation:false, markerZoomAnimation:false }).setView(RJ_CENTER, 10);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, updateWhenIdle:true, updateWhenZooming:false, keepBuffer:1, attribution: '&copy; OpenStreetMap' }).addTo(rtMapa);
      rtMapaLayer = L.layerGroup().addTo(rtMapa);
      if(!rtMapa.__rtViewportCardsBind){
        rtMapa.__rtViewportCardsBind = true;
        rtMapa.on('moveend zoomend', ()=>setTimeout(atualizarCardsNoViewport, 60));
      }
    }
    return true;
  }

  function criarIcone(st){
    const cores = { entregue:'#16a34a', montagem:'#2563eb', recolher:'#f97316', atrasado:'#dc2626', futuro:'#4f46e5', historico:'#6b7280' };
    const cor = cores[st.classe] || '#2563eb';
    return L.divIcon({ className:'mapa-pin-wrap', html:`<span class="mapa-pin" style="background:${cor}"></span>`, iconSize:[18,18], iconAnchor:[9,9], popupAnchor:[0,-8] });
  }

  function atualizarLista(lista, coordSet){
    const listaBox=document.getElementById('mapaListaEventos');
    if(!listaBox) return;
    listaBox.innerHTML = lista.length ? lista.map((e,i)=>cardListaEvento(e,i,coordSet?.has(i))).join('') : '<div class="empty">Nenhum local encontrado para os filtros atuais.</div>';
  }

  function limparEnderecoParaBusca(end){
    let s=String(end||'')
      .replace(/CEP:?\s*\d[\d\-.]*/ig,' ')
      .replace(/\bAv\.?\b/ig,'Avenida')
      .replace(/\bR\.?\b/ig,'Rua')
      .replace(/\bEstr\.?\b/ig,'Estrada')
      .replace(/\bRod\.?\b/ig,'Rodovia')
      .replace(/\s+-\s+/g, ', ')
      .replace(/\s+/g,' ')
      .trim();
    if(!/Rio de Janeiro|Niter[oó]i|Mag[eé]|Duque de Caxias|Nova Igua[cç]u|S[aã]o Gon[cç]alo|Maric[aá]|Petr[oó]polis|Teres[oó]polis|Itagua[ií]|Serop[eé]dica|Queimados/i.test(s)) s += ', Rio de Janeiro';
    if(!/\bRJ\b|Rio de Janeiro/i.test(s)) s += ', RJ';
    if(!/Brasil/i.test(s)) s += ', Brasil';
    return s;
  }

  function extrairCepTexto(txt){
    const m=String(txt||'').match(/(?:CEP:?\s*)?(\d{5})[-.]?(\d{3})/i);
    return m ? `${m[1]}-${m[2]}` : '';
  }

  function variantesEnderecoBusca(e){
    const bruto = enderecoEvento(e);
    const base = limparEnderecoParaBusca(bruto);
    const vars = [base];
    const cep = extrairCepTexto(bruto);
    if(cep) vars.push(`${cep}, Brasil`);
    const semCep = limparEnderecoParaBusca(String(bruto||'').replace(/CEP:?\s*\d[\d\-.]*/ig,' '));
    if(semCep && semCep !== base) vars.push(semCep);
    const ruaNumero = String(bruto||'').split(/CEP/i)[0].replace(/\s+-\s+/g, ', ').trim();
    if(ruaNumero) vars.push(limparEnderecoParaBusca(ruaNumero));
    const bairroCidade = [campo(e,['bairro']), campo(e,['cidade']) || 'Rio de Janeiro', 'RJ', 'Brasil'].filter(Boolean).join(', ');
    if(bairroCidade.length > 12) vars.push(bairroCidade);
    return [...new Set(vars.map(v=>v.replace(/,{2,}/g,',').replace(/\s+,/g,',').replace(/,\s*,/g,',').trim()).filter(v=>v.length>8))].slice(0,5);
  }

  async function geocodificarNominatim(q){
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=3&countrycodes=br&addressdetails=1&bounded=0&q=${encodeURIComponent(q)}`;
    const resp = await fetch(url, { headers:{'Accept':'application/json'} });
    if(!resp.ok) return null;
    const data = await resp.json();
    if(!Array.isArray(data)) return null;
    for(const r of data){
      const lat = Number(r.lat), lng = Number(r.lon);
      if(posValida(lat,lng)) return {lat,lng,fonte:'geocode'};
    }
    return null;
  }

  async function geocodificarEndereco(e){
    const end=enderecoEvento(e), key=norm(end);
    if(!key) return null;
    const cache=carregarCache();
    if(cache[key] && posValida(cache[key].lat, cache[key].lng)) return cache[key];

    const variantes = variantesEnderecoBusca(e);
    for(let i=0;i<variantes.length;i++){
      try{
        const pos = await geocodificarNominatim(variantes[i]);
        if(pos){
          cache[key]=pos;
          variantes.forEach(v=>{ cache[norm(v)] = pos; });
          salvarCache(cache);
          salvarCoordenadaSupabase(e, pos);
          return pos;
        }
      }catch(err){ console.warn('Mapa: geocode falhou', variantes[i], err); }
      await new Promise(r=>setTimeout(r, 350));
    }
    return null;
  }

  function geocodeBackground(lista, coordSet){
    if(MAX_GEOCODE_BACKGROUND <= 0) return;
    if(rtMapaGeocodeFilaRodando) return;
    const pendentes = lista.filter((e,i)=>!coordSet.has(i)).slice(0, MAX_GEOCODE_BACKGROUND);
    if(!pendentes.length) return;
    rtMapaGeocodeFilaRodando = true;
    avisoMapa(`localizando ${pendentes.length} endereço(s)...`);
    setTimeout(async ()=>{
      let encontrados=0;
      for(let idx=0; idx<pendentes.length; idx++){
        const e=pendentes[idx];
        avisoMapa(`localizando ${idx+1}/${pendentes.length}...`);
        const pos = await geocodificarEndereco(e);
        if(pos){ encontrados++; rtMapaPontosCache=null; renderizarMapaDebounced(false); }
        await new Promise(r=>setTimeout(r, 1150));
      }
      rtMapaGeocodeFilaRodando=false;
      avisoMapa(encontrados ? `${encontrados} coordenada(s) encontrada(s)` : 'sem coordenadas encontradas');
      setTimeout(()=>renderizarMapaDebounced(false), 250);
    }, 500);
  }

  async function renderizarMapaOperacional(force){
    const token = ++rtMapaRenderToken;
    const box=document.getElementById('mapaOperacionalCanvas');
    const listaBox=document.getElementById('mapaListaEventos');
    if(!box || !listaBox) return;
    listaBox.classList.add('mapa-carregando');
    if(force){ rtMapaEventosCache=null; rtMapaEventosCacheKey=''; rtMapaPontosCache=null; }

    const eventosBase=await obterEventosMapa(force);
    if(token !== rtMapaRenderToken) return;
    const lista=filtrarEventos(eventosBase);
    window.__rtMapaEventosAtuais = lista;
    atualizarResumo(lista);
    atualizarLista(lista, new Set());

    if(!garantirMapa(box)){
      box.innerHTML = '<div class="mapa-sem-leaflet">Mapa indisponível no momento. Verifique a conexão com a internet.</div>';
      listaBox.classList.remove('mapa-carregando');
      return;
    }
    if(rtMapaLayer) rtMapaLayer.clearLayers();
    rtMapaMarkers=[];

    const pontos = await carregarPontosSupabase();
    if(token !== rtMapaRenderToken) return;

    const bounds=[];
    let semCoordenada=0;
    const coordSet = new Set();
    lista.forEach((e,i)=>{
      const pos = extrairPos(e) || buscarPosEmIndice(e, pontos);
      if(!pos){ semCoordenada++; return; }
      const st=statusEventoMapa(e);
      const marker=L.marker([pos.lat,pos.lng], { title: nomeCliente(e), icon: criarIcone(st), riseOnHover:true }).bindPopup(popupEvento(e));
      marker.on('popupopen', ()=>registrarBotoesPopup());
      marker.__rtListaIndex = i;
      marker.addTo(rtMapaLayer);
      rtMapaMarkers[i]=marker;
      coordSet.add(i);
      bounds.push([pos.lat,pos.lng]);
    });

    atualizarLista(lista, coordSet);
    atualizarResumo(lista, {pontos:bounds.length, semCoordenada});
    if(semCoordenada) avisoMapa(`${semCoordenada} evento(s) sem latitude/longitude gravadas`);
    if(bounds.length){ try{ rtMapa.fitBounds(bounds, {padding:[30,30], maxZoom:14, animate:false}); }catch(_){} }
    else rtMapa.setView(RJ_CENTER,10);
    setTimeout(()=>{ try{rtMapa.invalidateSize(); atualizarCardsNoViewport();}catch(_){} }, 80);
    listaBox.classList.remove('mapa-carregando');

    // Não geocodifica ao abrir o mapa. Coordenadas são gravadas ao salvar o evento.
    geocodeBackground(lista, coordSet);
  }

  function abrirSecao(section){
    document.querySelectorAll('.tab-btn').forEach(b=>b.classList.toggle('active', b.dataset.section===section));
    document.querySelectorAll('.section').forEach(s=>s.classList.toggle('active-section', s.id===section));
  }
  function abrirEvento(id){
    abrirSecao('eventosSection');
    setTimeout(()=>{
      const alvo=document.querySelector(`[data-evento-id="${CSS.escape(String(id))}"], [data-id="${CSS.escape(String(id))}"]`);
      if(alvo){ alvo.scrollIntoView({behavior:'smooth', block:'center'}); alvo.classList.add('rt-highlight-row'); setTimeout(()=>alvo.classList.remove('rt-highlight-row'),2500); }
      if(typeof window.abrirModalEvento === 'function') { try{ window.abrirModalEvento(id); }catch(_){} }
    },250);
  }
  function abrirRota(id){
    const e=(window.__rtMapaEventosAtuais||[]).find(x=>idEvento(x)===String(id));
    abrirSecao('rotasSection');
    try{ const data=dataMontagem(e)||dataEvento(e)||dataDesmontagem(e); if(data && typeof window.definirDataRota === 'function') window.definirDataRota(data); }catch(_){}
    setTimeout(()=>{
      const alvo=document.querySelector(`[data-evento-id="${CSS.escape(String(id))}"], [data-rota-evento-id="${CSS.escape(String(id))}"]`);
      if(alvo){ alvo.scrollIntoView({behavior:'smooth', block:'center'}); alvo.classList.add('rt-highlight-row'); setTimeout(()=>alvo.classList.remove('rt-highlight-row'),2500); }
    },500);
  }
  function registrarBotoesPopup(){
    document.querySelectorAll('[data-mapa-abrir-evento]').forEach(b=>b.onclick=()=>abrirEvento(b.dataset.mapaAbrirEvento));
    document.querySelectorAll('[data-mapa-abrir-rota]').forEach(b=>b.onclick=()=>abrirRota(b.dataset.mapaAbrirRota));
  }
  function renderizarMapaDebounced(force){
    clearTimeout(rtMapaDebounce);
    rtMapaDebounce = setTimeout(()=>renderizarMapaOperacional(!!force), force ? 20 : 160);
  }

  function atualizarCardsNoViewport(){
    try{
      const lista=document.getElementById('mapaListaEventos');
      if(!lista || !rtMapa || !Array.isArray(rtMapaMarkers)) return;
      const bounds = rtMapa.getBounds && rtMapa.getBounds();
      if(!bounds) return;
      let ativos=0;
      const ativosCards=[];
      const foraCards=[];
      lista.querySelectorAll('[data-mapa-evento-idx]').forEach(btn=>{
        const idx=Number(btn.dataset.mapaEventoIdx);
        const marker=rtMapaMarkers[idx];
        let dentro=false;
        if(marker && marker.getLatLng){
          const ll=marker.getLatLng();
          dentro = bounds.contains(ll);
        }
        btn.classList.toggle('mapa-card-fora-view', !dentro);
        btn.classList.toggle('mapa-card-no-view', !!dentro);
        btn.dataset.mapaVisivel = dentro ? '1' : '0';
        if(dentro){ ativos++; ativosCards.push(btn); }
        else foraCards.push(btn);
      });
      lista.classList.toggle('mapa-lista-filtrada-por-view', ativos > 0);
      // Mantém todos os cards, mas leva para o topo os pontos que estão visíveis no mapa.
      if(ativos > 0){
        const frag=document.createDocumentFragment();
        ativosCards.forEach(el=>frag.appendChild(el));
        foraCards.forEach(el=>frag.appendChild(el));
        lista.appendChild(frag);
      }
    }catch(_){ }
  }
  function iniciarMapaOperacional(){
    const dataBase=document.getElementById('mapaDataBase'); if(dataBase && !dataBase.value) dataBase.value=hojeISO();
    ['mapaDataBase','mapaPeriodo','mapaBusca','mapaFiltroStatus','mapaFiltroMaterial'].forEach(id=>{
      const el=document.getElementById(id);
      if(!el || el.__rtMapaBind) return;
      el.__rtMapaBind=true;
      const mudaBase = id === 'mapaDataBase' || id === 'mapaPeriodo';
      el.addEventListener('input',()=>renderizarMapaDebounced(mudaBase));
      el.addEventListener('change',()=>renderizarMapaDebounced(mudaBase));
    });
    const hojeBtn=document.getElementById('mapaHoje');
    if(hojeBtn && !hojeBtn.__rtMapaBind){ hojeBtn.__rtMapaBind=true; hojeBtn.addEventListener('click',()=>{ const d=document.getElementById('mapaDataBase'); if(d) d.value=hojeISO(); renderizarMapaOperacional(true); }); }
    const rec=document.getElementById('mapaRecarregar');
    if(rec && !rec.__rtMapaBind){ rec.__rtMapaBind=true; rec.addEventListener('click',()=>renderizarMapaOperacional(true)); }
    const lista=document.getElementById('mapaListaEventos');
    if(lista && !lista.__rtMapaBind){
      lista.__rtMapaBind=true;
      lista.addEventListener('click', ev=>{
        const btn=ev.target.closest('[data-mapa-evento-idx]'); if(!btn) return;
        const idx=Number(btn.dataset.mapaEventoIdx); const marker=rtMapaMarkers[idx];
        if(marker){
          marker.openPopup();
          try{
            rtMapa.setView(marker.getLatLng(), Math.max(rtMapa.getZoom() || 0, 16), {animate:false});
            setTimeout(atualizarCardsNoViewport, 90);
          }catch(_){}
        }
      });
    }
    document.querySelectorAll('[data-section="mapaSection"]').forEach(btn=>{
      if(btn.__rtMapaBind) return;
      btn.__rtMapaBind=true;
      btn.addEventListener('click',()=>setTimeout(()=>renderizarMapaOperacional(false),120));
    });
  }
  window.renderizarMapaOperacional = renderizarMapaOperacional;
  document.addEventListener('DOMContentLoaded', iniciarMapaOperacional);
})();
