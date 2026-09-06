// Modelos de Documentos centralizados no Supabase Storage
(function(){
  const BUCKET = 'modelos-documentos';
  const CACHE_KEY = 'rt_modelos_documentos_cloud_cache_v1';
  const PADRAO = {
    guia: 'modelo-guia.html',
    contrato: 'modelo-contrato.html',
    recibo: 'modelo-recibo.html',
    orcamento: 'modelo-orcamento.html'
  };
  const mem = {};
  const emAndamento = new Map();
  const falhas = new Map();
  const FALHA_CACHE_KEY = 'rt_modelos_documentos_falhas_v2';
  const FALHA_TTL_MS = 12 * 60 * 60 * 1000;

  function carregarFalhasPersistidas(){
    try {
      const obj = JSON.parse(localStorage.getItem(FALHA_CACHE_KEY) || '{}');
      return obj && typeof obj === 'object' ? obj : {};
    } catch(_) { return {}; }
  }
  function falhaPersistida(key){
    const item = carregarFalhasPersistidas()[key];
    if (!item || !item.ts || (Date.now() - Number(item.ts)) >= FALHA_TTL_MS) return null;
    return item;
  }
  function salvarFalhaPersistida(key){
    try {
      const obj = carregarFalhasPersistidas();
      obj[key] = { ts: Date.now() };
      localStorage.setItem(FALHA_CACHE_KEY, JSON.stringify(obj));
    } catch(_) {}
  }
  function limparFalhaPersistida(key){
    try {
      const obj = carregarFalhasPersistidas();
      delete obj[key];
      localStorage.setItem(FALHA_CACHE_KEY, JSON.stringify(obj));
    } catch(_) {}
  }

  function arquivoPadrao(tipo){ return PADRAO[tipo] || ''; }
  function normalizarArquivo(tipo, arquivo){
    const nome = String(arquivo || arquivoPadrao(tipo) || '').trim().replace(/^\/+/, '');
    if (!nome || nome.includes('..') || /[\\]/.test(nome)) return arquivoPadrao(tipo);
    return nome;
  }
  function carregarCache(){
    try { const v = JSON.parse(localStorage.getItem(CACHE_KEY)||'{}'); return v && typeof v === 'object' ? v : {}; }
    catch(_) { return {}; }
  }
  function salvarCache(tipo, arquivo, html, atualizadoEm, fonte='nuvem'){
    const dados = carregarCache();
    dados[tipo] = { nome: arquivo, html: String(html||''), atualizadoEm: atualizadoEm || new Date().toISOString(), fonte };
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(dados)); } catch(_) {}
    mem[tipo] = dados[tipo];
    // Compatibilidade com o cache local antigo.
    try {
      const antigos = JSON.parse(localStorage.getItem('rt_modelos_documentos_locais_v1') || '{}');
      antigos[tipo] = { nome: arquivo, html: String(html||''), atualizadoEm: dados[tipo].atualizadoEm, fonte };
      localStorage.setItem('rt_modelos_documentos_locais_v1', JSON.stringify(antigos));
    } catch(_) {}
    return dados[tipo];
  }
  function obterCache(tipo, arquivo=''){
    const alvo = normalizarArquivo(tipo, arquivo);
    const item = mem[tipo] || carregarCache()[tipo] || null;
    if (!item?.html) return null;
    if (alvo && item.nome && item.nome !== alvo) return null;
    return item;
  }
  async function baixar(tipo, arquivo='', opcoes={}){
    const alvo = normalizarArquivo(tipo, arquivo);
    if (!alvo) throw new Error('Nome do modelo inválido.');
    const key = `${tipo}:${alvo}`;
    if (!opcoes.forcar && mem[tipo]?.html && mem[tipo]?.nome === alvo) return mem[tipo];
    const local = obterCache(tipo, alvo);
    const falha = falhas.get(key);
    const falhaLocal = falhaPersistida(key);
    if (!opcoes.forcar && falhaLocal) {
      if (local && opcoes.permitirCache !== false) return local;
      throw new Error('Modelo temporariamente indisponível no Storage.');
    }
    if (!opcoes.forcar && falha && (Date.now() - falha.ts) < FALHA_TTL_MS) {
      if (local && opcoes.permitirCache !== false) return local;
      throw falha.erro;
    }
    if (!opcoes.forcar && emAndamento.has(key)) return emAndamento.get(key);
    if (typeof supabaseClient === 'undefined' || !supabaseClient?.storage) {
      if (local) return local;
      throw new Error('Supabase Storage indisponível.');
    }
    const promessa = (async () => {
      try {
        const { data, error } = await supabaseClient.storage.from(BUCKET).download(alvo);
        if (error) throw error;
        const html = await data.text();
        if (!html.trim()) throw new Error('Modelo vazio.');
        if (!/{{\s*[a-zA-Z0-9_]+\s*}}/.test(html)) throw new Error('O modelo não possui variáveis {{...}}.');
        falhas.delete(key);
        limparFalhaPersistida(key);
        return salvarCache(tipo, alvo, html, new Date().toISOString(), 'nuvem');
      } catch (erro) {
        falhas.set(key, { ts: Date.now(), erro });
        salvarFalhaPersistida(key);
        const cacheAtual = obterCache(tipo, alvo);
        if (cacheAtual && opcoes.permitirCache !== false) return cacheAtual;
        throw erro;
      } finally {
        emAndamento.delete(key);
      }
    })();
    emAndamento.set(key, promessa);
    return promessa;
  }
  async function info(tipo, arquivo=''){
    const alvo = normalizarArquivo(tipo, arquivo);
    if (typeof supabaseClient === 'undefined' || !supabaseClient?.storage) return null;
    const { data, error } = await supabaseClient.storage.from(BUCKET).list('', { limit: 100, search: alvo });
    if (error) throw error;
    return (data || []).find(x => x.name === alvo) || null;
  }
  async function enviar(tipo, file, arquivo=''){
    const alvo = normalizarArquivo(tipo, arquivo || arquivoPadrao(tipo));
    if (!file) throw new Error('Selecione um arquivo HTML.');
    if (!/\.html?$/i.test(file.name || alvo)) throw new Error('Selecione um arquivo HTML.');
    const html = await file.text();
    if (!/{{\s*[a-zA-Z0-9_]+\s*}}/.test(html)) throw new Error('O arquivo não possui variáveis no formato {{cliente}}, {{valor_total}} etc.');
    if (typeof supabaseClient === 'undefined' || !supabaseClient?.storage) throw new Error('Supabase Storage indisponível.');
    const blob = new Blob([html], { type: 'text/html;charset=UTF-8' });
    const { error } = await supabaseClient.storage.from(BUCKET).upload(alvo, blob, {
      upsert: true,
      contentType: 'text/html;charset=UTF-8',
      cacheControl: '0'
    });
    if (error) throw error;
    falhas.delete(`${tipo}:${alvo}`);
    limparFalhaPersistida(`${tipo}:${alvo}`);
    salvarCache(tipo, alvo, html, new Date().toISOString(), 'nuvem');
    return { nome: alvo, html };
  }
  async function remover(tipo, arquivo=''){
    const alvo = normalizarArquivo(tipo, arquivo);
    if (typeof supabaseClient === 'undefined' || !supabaseClient?.storage) throw new Error('Supabase Storage indisponível.');
    const { error } = await supabaseClient.storage.from(BUCKET).remove([alvo]);
    if (error) throw error;
    falhas.delete(`${tipo}:${alvo}`);
    limparFalhaPersistida(`${tipo}:${alvo}`);
    delete mem[tipo];
    const dados = carregarCache(); delete dados[tipo];
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(dados)); } catch(_) {}
  }
  function limparMemoria(){ Object.keys(mem).forEach(k => delete mem[k]); }

  window.RT_MODELOS_DOCUMENTOS_BUCKET = BUCKET;
  window.rtModeloDocumentoCloudArquivoPadrao = arquivoPadrao;
  window.rtModeloDocumentoCloudBaixar = baixar;
  window.rtModeloDocumentoCloudEnviar = enviar;
  window.rtModeloDocumentoCloudInfo = info;
  window.rtModeloDocumentoCloudRemover = remover;
  window.rtModeloDocumentoCloudObterCache = obterCache;
  window.rtModeloDocumentoCloudLimparMemoria = limparMemoria;
})();
