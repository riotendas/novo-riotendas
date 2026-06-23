const storageOrcamentosKey = "novoRioTendasOrcamentosV1";
let orcamentos = [];
let materiaisOrcamentoAtual = [];
let orcamentoSinalEditadoManual = false;
const rtOrcLogoUrlPadrao = "https://riotendas.smartwebinfo.com.br/webapp/public/img/logo.png";

function rtOrcGerarId(){ return (typeof gerarId === "function") ? gerarId() : String(Date.now()) + Math.random().toString(16).slice(2); }
function rtOrcEhUuid(v){ return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(v||'').trim()); }
function rtOrcUuidOuNull(v){ const t = String(v || '').trim(); return rtOrcEhUuid(t) ? t : null; }
function rtOrcMoeda(n){ return (typeof numeroParaMoeda === "function") ? numeroParaMoeda(Number(n||0)) : Number(n||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'}); }
function rtOrcNumero(v){ return (typeof moedaParaNumero === "function") ? moedaParaNumero(v) : Number(String(v||'').replace(/[^\d,.-]/g,'').replace('.','').replace(',','.')) || 0; }
function rtOrcDataBR(d){ return d ? (typeof dataBR === "function" ? dataBR(d) : d.split('-').reverse().join('/')) : ''; }
function rtOrcEscape(v){ return String(v ?? '').replace(/[&<>"]/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[s])); }
function rtOrcPrimeiroNome(nome){ return String(nome||'').trim().split(/\s+/)[0] || ''; }



function rtOrcFormasPagamentoPadrao(){
  return [
    "Sinal de 20% para reserva do material e mobilização da equipe. Restante até o dia do evento em dinheiro, transferência ou cartão.",
    "Faturado conforme combinado entre as partes.",
    "À vista no local.",
    "A combinar."
  ];
}

function rtOrcObterFormasPagamentoOrcamento(){
  try {
    const cfg = (typeof carregarConfiguracoes === 'function') ? carregarConfiguracoes() : {};
    const lista = Array.isArray(cfg.formasPagamentoOrcamento) ? cfg.formasPagamentoOrcamento : [];
    const limpas = lista.map(v => String(v || '').trim()).filter(Boolean);
    return limpas.length ? limpas : rtOrcFormasPagamentoPadrao();
  } catch(e) {
    return rtOrcFormasPagamentoPadrao();
  }
}

function preencherFormasPagamentoOrcamento(valorAtual){
  const select = document.getElementById('orcamentoFormaPagamento');
  if (!select) return;
  const atual = valorAtual || select.value || '';
  const lista = rtOrcObterFormasPagamentoOrcamento();
  select.innerHTML = lista.map(v => `<option value="${rtOrcEscape(v)}">${rtOrcEscape(v.length > 70 ? v.slice(0,67) + '...' : v)}</option>`).join('');
  if (atual && lista.includes(atual)) select.value = atual;
  else if (atual) {
    const opt = document.createElement('option');
    opt.value = atual;
    opt.textContent = atual.length > 70 ? atual.slice(0,67) + '...' : atual;
    select.appendChild(opt);
    select.value = atual;
  }
}

function rtOrcObterLarguraLogoDocumentos(){
  try {
    const cfg = (typeof carregarConfiguracoes === 'function') ? carregarConfiguracoes() : {};
    const n = Number(cfg.logoLarguraDocumentos || 300);
    return Math.min(Math.max(n || 300, 80), 600);
  } catch(e) {
    return 300;
  }
}

function rtOrcSanitizarModeloOrcamento(html){
  return String(html || '')
    .replace(/\sheight=["']150["']/gi, '')
    .replace(/\smin-height\s*:\s*150px\s*;?/gi, '')
    .replace(/(<section[^>]*class=["'][^"']*doc-header[^"']*["'][^>]*>)/i, '$1')
    .replace(/(<table\b[^>]*?)\sheight=["'][^"']+["']/gi, '$1')
    .replace(/(<td\b[^>]*?)\sheight=["'][^"']+["']/gi, '$1');
}


function preencherSelectsHorarioOrcamento(){
  const ids = [
    'orcamentoHoraInicio',
    'orcamentoHoraTermino',
    'orcamentoMontagemHora',
    'orcamentoDesmontagemHora'
  ];
  const opcoes = ['<option value="">Livre</option>'];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 30) {
      const valor = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      opcoes.push(`<option value="${valor}">${valor}</option>`);
    }
  }
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (!el || el.dataset.horariosCarregados === '1') return;
    const valorAtual = el.value || '';
    el.innerHTML = opcoes.join('');
    el.value = valorAtual;
    el.dataset.horariosCarregados = '1';
  });
}

async function carregarOrcamentos(){
  if (typeof supabaseClient !== 'undefined' && supabaseClient) {
    const { data, error } = await supabaseClient
      .from('orcamentos')
      .select('*')
      .order('criado_em', { ascending: false });

    if (error) {
      console.error('Erro ao buscar orçamentos no Supabase:', error);
      alert('Erro ao buscar orçamentos no Supabase: ' + (error.message || '') + '\n\nSe aparecer tabela não encontrada, execute o arquivo SQL incluído no ZIP: EXECUTAR-NO-SUPABASE-ORCAMENTOS.sql');
      orcamentos = [];
      return orcamentos;
    }

    orcamentos = (data || []).map(o => ({
      ...o,
      materiais: Array.isArray(o.materiais) ? o.materiais : []
    }));
    return orcamentos;
  }

  try { orcamentos = JSON.parse(localStorage.getItem(storageOrcamentosKey) || '[]'); }
  catch(e){ orcamentos = []; }
  if (!Array.isArray(orcamentos)) orcamentos = [];
  return orcamentos;
}

async function salvarOrcamentoBanco(orcamento){
  if (typeof supabaseClient !== 'undefined' && supabaseClient) {
    const registro = {
      ...orcamento,
      materiais: Array.isArray(orcamento.materiais) ? orcamento.materiais : [],
      valor_materiais: Number(orcamento.valor_materiais || 0),
      valor_frete_montagem: Number(orcamento.valor_frete_montagem || 0),
      valor_desconto: Number(orcamento.valor_desconto || 0),
      valor_total: Number(orcamento.valor_total || 0),
      valor_sinal: Number(orcamento.valor_sinal || 0),
      valor_restante: Number(orcamento.valor_restante || 0),
      atualizado_em: new Date().toISOString()
    };

    // Compatibilidade Supabase: a tabela orcamentos não possui a coluna evento_vinculado_id.
    // O vínculo oficial com o evento fica em evento_id.
    delete registro.evento_vinculado_id;

    // Campos UUID do Supabase não aceitam string vazia.
    // Orçamento novo sem evento vinculado deve gravar NULL, nunca "".
    registro.evento_id = rtOrcUuidOuNull(registro.evento_id);

    // A coluna id da tabela orcamentos é UUID. Nunca gravar números de orçamento
    // como id (ex.: orc_06062026-001). O Supabase deve gerar o UUID automaticamente.
    const temIdUuid = rtOrcEhUuid(registro.id);
    if (!temIdUuid) delete registro.id;

    const query = temIdUuid
      ? supabaseClient.from('orcamentos').upsert(registro, { onConflict: 'id' })
      : supabaseClient.from('orcamentos').insert(registro);

    const { data, error } = await query
      .select()
      .single();

    if (error) {
      console.error('Erro ao salvar orçamento no Supabase:', error);
      alert('Erro ao salvar orçamento no Supabase: ' + (error.message || '') + '\n\nSe aparecer tabela não encontrada, execute o arquivo SQL incluído no ZIP: EXECUTAR-NO-SUPABASE-ORCAMENTOS.sql');
      return null;
    }
    return data;
  }

  if (!orcamento.id || orcamento.id === 'preview') orcamento.id = rtOrcGerarId();
  const idx = orcamentos.findIndex(x => String(x.id) === String(orcamento.id));
  if (idx >= 0) orcamentos[idx] = orcamento; else orcamentos.push(orcamento);
  localStorage.setItem(storageOrcamentosKey, JSON.stringify(orcamentos));
  return orcamento;
}

function salvarOrcamentosLocal(){ localStorage.setItem(storageOrcamentosKey, JSON.stringify(orcamentos)); }

function iniciarOrcamentos(){
  preencherSelectsHorarioOrcamento();
  preencherFormasPagamentoOrcamento();
  document.getElementById('novoOrcamentoBtn')?.addEventListener('click', abrirNovoOrcamento);
  document.getElementById('orcamentoForm')?.addEventListener('submit', salvarOrcamentoForm);
  document.getElementById('fecharOrcamentoModal')?.addEventListener('click', fecharOrcamentoModal);
  document.getElementById('cancelarOrcamento')?.addEventListener('click', fecharOrcamentoModal);
  document.getElementById('adicionarMaterialOrcamento')?.addEventListener('click', adicionarMaterialOrcamento);
  document.getElementById('orcamentoMaterialTipo')?.addEventListener('change', () => {
    rtOrcAlternarDescricaoOutroServico();
    atualizarDisponibilidadeCatalogoOrcamento();
  });
  document.getElementById('orcamentoMaterialDescricao')?.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter') { ev.preventDefault(); adicionarMaterialOrcamento(); }
  });
  ['orcamentoDataEvento','orcamentoMontagemData','orcamentoMontagemHora','orcamentoMontagemTipo','orcamentoDesmontagemData','orcamentoDesmontagemHora','orcamentoDesmontagemTipo'].forEach(id => {
    document.getElementById(id)?.addEventListener('change', renderizarMateriaisOrcamento);
  });
  document.getElementById('gerarPdfOrcamento')?.addEventListener('click', rtOrcSalvarEGerarPdfAtual);
  document.getElementById('aprovarOrcamentoBtn')?.addEventListener('click', aprovarOrcamentoAtual);
  document.getElementById('orcamentoMontagemDiaAnterior')?.addEventListener('click', aplicarMontagemDiaAnteriorOrcamento);
  document.getElementById('orcamentoRetiradaDiaSeguinte')?.addEventListener('click', aplicarRetiradaDiaSeguinteOrcamento);
  document.getElementById('orcamentoFormaPagamento')?.addEventListener('change', ajustarSinalPorFormaPagamentoOrcamento);
  ['orcamentoValorFreteMontagem','orcamentoValorDesconto','orcamentoMaterialValorUnit'].forEach(id => {
    const el = document.getElementById(id);
    el?.addEventListener('blur', () => { el.value = rtOrcMoeda(rtOrcNumero(el.value)); calcularTotaisOrcamento(); });
    el?.addEventListener('input', calcularTotaisOrcamento);
  });
  const sinalEl = document.getElementById('orcamentoValorSinal');
  sinalEl?.addEventListener('input', () => { orcamentoSinalEditadoManual = true; calcularTotaisOrcamento(); });
  sinalEl?.addEventListener('blur', () => { orcamentoSinalEditadoManual = true; sinalEl.value = rtOrcMoeda(rtOrcNumero(sinalEl.value)); calcularTotaisOrcamento(); });
  ['buscaOrcamento','filtroOrcamentoStatus'].forEach(id => document.getElementById(id)?.addEventListener('input', renderizarOrcamentos));
  document.addEventListener('change', (ev) => { if (ev.target?.id === 'orcSelecionarTodos') rtOrcSelecionarTodos(ev.target.checked); });
  document.addEventListener('click', (ev) => {
    const t = ev.target;
    if (t?.id === 'orcExcluirSelecionados') rtOrcExcluirSelecionados();
    if (t?.id === 'orcExcluirVencidos') rtOrcExcluirVencidosAguardando();
  });
  ['orcamentoDataEvento','orcamentoHoraInicio','orcamentoHoraTermino','orcamentoMontagemData','orcamentoMontagemHora','orcamentoMontagemTipo','orcamentoDesmontagemData','orcamentoDesmontagemHora','orcamentoDesmontagemTipo'].forEach(id => {
    const el = document.getElementById(id);
    el?.addEventListener('change', renderizarMateriaisOrcamento);
  });
  document.querySelectorAll('[data-section="orcamentosSection"]').forEach(btn => btn.addEventListener('click', () => renderizarOrcamentos()));
  carregarOrcamentos().then(() => renderizarOrcamentos());
}

document.addEventListener('DOMContentLoaded', iniciarOrcamentos);

function abrirNovoOrcamento(){
  preencherSelectsHorarioOrcamento();
  preencherFormasPagamentoOrcamento();
  const form = document.getElementById('orcamentoForm');
  form?.reset();
  document.getElementById('orcamentoId').value = '';
  document.getElementById('orcamentoModalTitulo').textContent = 'Novo orçamento';
  const campoCidadeOrcamento = document.getElementById('orcamentoCidade');
  if (campoCidadeOrcamento) campoCidadeOrcamento.value = (typeof carregarConfiguracoes === 'function' ? (carregarConfiguracoes().cidadePadrao || 'Rio de Janeiro') : 'Rio de Janeiro');
  materiaisOrcamentoAtual = [];
  const hoje = new Date().toISOString().slice(0,10);
  document.getElementById('orcamentoDataEvento').value = hoje;
  document.getElementById('orcamentoMontagemData').value = hoje;
  document.getElementById('orcamentoDesmontagemData').value = hoje;
  document.getElementById('orcamentoValorMateriais').value = rtOrcMoeda(0);
  document.getElementById('orcamentoValorFreteMontagem').value = rtOrcMoeda(0);
  document.getElementById('orcamentoValorDesconto').value = rtOrcMoeda(0);
  document.getElementById('orcamentoValorTotal').value = rtOrcMoeda(0);
  document.getElementById('orcamentoValorSinal').value = rtOrcMoeda(0);
  document.getElementById('orcamentoValorRestante').value = rtOrcMoeda(0);
  orcamentoSinalEditadoManual = false;
  document.getElementById('orcamentoStatus').value = 'em_aberto';
  document.getElementById('orcamentoTipoEvento').value = 'pontual';
  document.getElementById('aprovarOrcamentoBtn').style.display = 'none';
  renderizarMateriaisOrcamento();
  document.getElementById('orcamentoDialog')?.showModal();
}

function fecharOrcamentoModal(){ document.getElementById('orcamentoDialog')?.close(); }

function abrirEditarOrcamento(id){
  preencherSelectsHorarioOrcamento();
  const o = orcamentos.find(x => String(x.id) === String(id));
  if (!o) return;
  document.getElementById('orcamentoId').value = o.id;
  document.getElementById('orcamentoModalTitulo').textContent = `Editar orçamento ${o.numero || ''}`;
  document.getElementById('orcamentoNome').value = o.nome || '';
  document.getElementById('orcamentoDocumento').value = o.documento || '';
  document.getElementById('orcamentoTelefone').value = o.telefone || '';
  document.getElementById('orcamentoEmail').value = o.email || '';
  document.getElementById('orcamentoEndereco').value = o.endereco || '';
  document.getElementById('orcamentoBairro').value = o.bairro || '';
  document.getElementById('orcamentoCidade').value = o.cidade || (typeof carregarConfiguracoes === 'function' ? (carregarConfiguracoes().cidadePadrao || 'Rio de Janeiro') : 'Rio de Janeiro');
  document.getElementById('orcamentoComplemento').value = o.complemento || '';
  document.getElementById('orcamentoObservacaoCliente').value = o.observacao_cliente || '';
  document.getElementById('orcamentoDataEvento').value = o.data_evento || '';
  document.getElementById('orcamentoHoraInicio').value = o.hora_inicio || '';
  document.getElementById('orcamentoHoraTermino').value = o.hora_termino || '';
  document.getElementById('orcamentoStatus').value = o.status || 'em_aberto';
  document.getElementById('orcamentoTipoEvento').value = o.tipo_evento || 'pontual';
  document.getElementById('orcamentoMontagemData').value = o.montagem_data || '';
  document.getElementById('orcamentoMontagemHora').value = o.montagem_hora || '';
  document.getElementById('orcamentoMontagemTipo').value = o.montagem_tipo || 'Horário comercial';
  document.getElementById('orcamentoDesmontagemData').value = o.desmontagem_data || '';
  document.getElementById('orcamentoDesmontagemHora').value = o.desmontagem_hora || '';
  document.getElementById('orcamentoDesmontagemTipo').value = o.desmontagem_tipo || 'Horário comercial';
  document.getElementById('orcamentoValorMateriais').value = rtOrcMoeda(o.valor_materiais || (o.materiais||[]).reduce((s,i)=>s + Number(i.quantidade||0)*Number(i.valor_unitario||0),0));
  document.getElementById('orcamentoValorFreteMontagem').value = rtOrcMoeda(o.valor_frete_montagem || 0);
  document.getElementById('orcamentoValorDesconto').value = rtOrcMoeda(o.valor_desconto || 0);
  document.getElementById('orcamentoValorTotal').value = rtOrcMoeda(o.valor_total || 0);
  document.getElementById('orcamentoValorSinal').value = rtOrcMoeda(o.valor_sinal || 0);
  document.getElementById('orcamentoValorRestante').value = rtOrcMoeda(o.valor_restante || 0);
  preencherFormasPagamentoOrcamento(o.forma_pagamento || '');
  orcamentoSinalEditadoManual = true;
  document.getElementById('orcamentoObservacoes').value = o.observacoes || '';
  materiaisOrcamentoAtual = Array.isArray(o.materiais) ? JSON.parse(JSON.stringify(o.materiais)) : [];
  document.getElementById('aprovarOrcamentoBtn').style.display = 'inline-flex';
  renderizarMateriaisOrcamento();
  calcularTotaisOrcamento(false);
  document.getElementById('orcamentoDialog')?.showModal();
}


function rtOrcNormalizarTexto(valor){
  return String(valor || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[,;]/g,' ').replace(/\s+/g,' ').trim();
}

function rtOrcNormalizarTamanho(valor){
  return String(valor || '').toLowerCase().replace(/\s/g,'').replace(/[×]/g,'x').replace(/,/g,'.');
}

function rtOrcInferirMaterial(descricao){
  const txt = rtOrcNormalizarTexto(descricao);
  const tamMatch = txt.match(/(10x10|8x8|8x6|6x6|6x3|5x5|4\.5x3|4,5x3|4x4|4x3|3x3)/i);
  const tamanho = tamMatch ? tamMatch[1].replace(',', '.') : '';
  if (txt.includes('ombr') || txt.includes('omb')) return { categoria:'Ombrelone', tamanho:'', tipo:'produto' };
  if (txt.includes('tenda') || tamanho) return { categoria:'Tenda', tamanho, tipo:'produto' };
  if (txt.includes('mesa') || /\bmes\b/.test(txt)) return { categoria:'Mesa', tamanho:'', tipo:'apoio' };
  if (txt.includes('cadeira') || /\bcad\b/.test(txt)) return { categoria:'Cadeira', tamanho:'', tipo:'apoio' };
  return { categoria: descricao || 'Material', tamanho:'', tipo:'extra' };
}


const RT_ORC_CONJUNTOS = {
  plastico: {
    descricao: 'Conjunto Plástico (1 mesa plástica + 4 cadeiras)',
    itens: [
      { nome: 'Mesa de Plástico Branca', aliases: ['Mesa de Plástico Branca','Mesa Plástica Branca'], qtd: 1 },
      { nome: 'Cadeira Plástica Branca', aliases: ['Cadeira Plástica Branca'], qtd: 4 }
    ]
  },
  madeira: {
    descricao: 'Conjunto Madeira (1 mesa madeira + 4 cadeiras)',
    itens: [
      { nome: 'Mesa de Madeira', aliases: ['Mesa de Madeira','Mesa Madeira'], qtd: 1 },
      { nome: 'Cadeira de Madeira', aliases: ['Cadeira de Madeira','Cadeira Madeira'], qtd: 4 }
    ]
  },
  bistro: {
    descricao: 'Conjunto Bistrô (1 mesa bistrô + 2 banquetas)',
    itens: [
      { nome: 'Mesa Bistrô', aliases: ['Mesa Bistrô','Mesa Bistro'], qtd: 1 },
      { nome: 'Banqueta', aliases: ['Banqueta','Banquetas'], qtd: 2 }
    ]
  }
};

function rtOrcObterConjunto(chave){
  return RT_ORC_CONJUNTOS[String(chave || '').toLowerCase()] || null;
}

function rtOrcEncontrarItemApoioPorAliases(aliases){
  const lista = Array.isArray(window.estoqueApoio) ? window.estoqueApoio : (typeof estoqueApoio !== 'undefined' && Array.isArray(estoqueApoio) ? estoqueApoio : []);
  const alvos = (aliases || []).map(rtOrcTextoNormalizadoSimples).filter(Boolean);
  if (!lista.length || !alvos.length) return null;
  return lista.find(i => alvos.includes(rtOrcTextoNormalizadoSimples(i.nome)))
    || lista.find(i => {
      const nome = rtOrcTextoNormalizadoSimples(i.nome);
      return alvos.some(a => nome.includes(a) || a.includes(nome));
    });
}

function rtOrcDisponibilidadeConjuntoOrcamento(item, info){
  const conjunto = rtOrcObterConjunto(info.conjunto || info.chave_conjunto);
  if (!conjunto) return { texto:'Conjunto não configurado', classe:'neutral', info };
  const qtdConjuntos = Number(item.quantidade || 0) || 0;
  let menor = Infinity;
  const detalhes = [];
  conjunto.itens.forEach(comp => {
    const apoio = rtOrcEncontrarItemApoioPorAliases(comp.aliases || [comp.nome]);
    if (!apoio) {
      detalhes.push(`${comp.nome}: sem cadastro`);
      menor = 0;
      return;
    }
    let disponivel = Number(apoio.quantidade_total || 0);
    try {
      if (typeof disponibilidadeApoioParaEvento === 'function') {
        const d = disponibilidadeApoioParaEvento(apoio, 0);
        if (d && typeof d.disponivel !== 'undefined') disponivel = Number(d.disponivel || 0);
      }
    } catch(e) {}
    const completos = Math.floor(disponivel / Number(comp.qtd || 1));
    menor = Math.min(menor, completos);
    detalhes.push(`${comp.nome}: ${disponivel}`);
  });
  if (menor === Infinity) menor = 0;
  return {
    texto: `Disponível na data: ${menor} conjuntos${qtdConjuntos ? ` | solicitado: ${qtdConjuntos}` : ''} (${detalhes.join(' / ')})`,
    classe: menor >= qtdConjuntos ? 'free' : 'busy',
    info,
    livres: menor
  };
}

function rtOrcMontarDataHora(data, hora){
  if (!data) return '';
  const h = String(hora || '').slice(0,5);
  return h && /^\d{2}:\d{2}$/.test(h) ? `${data}T${h}` : data;
}

function rtOrcEventoTemporarioParaDisponibilidade(){
  const data = document.getElementById('orcamentoDataEvento')?.value || '';
  const montagemData = document.getElementById('orcamentoMontagemData')?.value || data;
  const desmontagemData = document.getElementById('orcamentoDesmontagemData')?.value || data;
  return {
    id: 'orcamento-preview',
    data_evento: data,
    hora_inicio: document.getElementById('orcamentoHoraInicio')?.value || '00:00',
    hora_termino: document.getElementById('orcamentoHoraTermino')?.value || '23:59',
    montagem: rtOrcMontarDataHora(montagemData, document.getElementById('orcamentoMontagemHora')?.value || ''),
    desmontagem: rtOrcMontarDataHora(desmontagemData, document.getElementById('orcamentoDesmontagemHora')?.value || ''),
    tendas: []
  };
}

function rtOrcProdutoBateComMaterial(produto, info){
  const combinado = rtOrcNormalizarTexto([
    produto?.codigo, produto?.categoria, produto?.tipo, produto?.modelo, produto?.nome,
    produto?.descricao, produto?.tamanho, produto?.medida, produto?.cor, produto?.status
  ].filter(Boolean).join(' '));
  const cat = rtOrcNormalizarTexto([produto?.categoria, produto?.tipo, produto?.nome, produto?.descricao].filter(Boolean).join(' '));
  const tamProduto = rtOrcNormalizarTamanho(produto?.tamanho || produto?.medida || combinado);
  const tamInfo = rtOrcNormalizarTamanho(info?.tamanho || '');
  const categoriaInfo = rtOrcNormalizarTexto(info?.categoria || '');
  if (categoriaInfo.includes('ombr')) return cat.includes('ombr') || combinado.includes('ombr') || combinado.includes('ombrelone');
  if (categoriaInfo.includes('tenda')) {
    const bateCategoria = cat.includes('tenda') || cat.includes('cobertura') || combinado.includes('tenda');
    const bateTamanho = !tamInfo || tamProduto.includes(tamInfo) || rtOrcNormalizarTamanho(combinado).includes(tamInfo);
    const detalhes = rtOrcNormalizarTexto(info?.detalhes || '').split(' ').filter(Boolean);
    // Quando o estoque não possui o campo de modelo/cor preenchido, não bloqueia por detalhe.
    const temAlgumDetalheNoProduto = /(sanfonada|piramidal|branca|branco|cristal)/.test(combinado);
    const bateDetalhes = !detalhes.length || !temAlgumDetalheNoProduto || detalhes.every(t => combinado.includes(t));
    return bateCategoria && bateTamanho && bateDetalhes;
  }
  return false;
}


function rtOrcTextoNormalizadoSimples(valor){
  return String(valor || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
}

function rtOrcEncontrarItemApoio(info){
  const lista = Array.isArray(window.estoqueApoio) ? window.estoqueApoio : (typeof estoqueApoio !== 'undefined' && Array.isArray(estoqueApoio) ? estoqueApoio : []);
  const alvo = rtOrcTextoNormalizadoSimples(info.nome_apoio || info.categoria || '');
  if (!alvo || !lista.length) return null;
  return lista.find(i => rtOrcTextoNormalizadoSimples(i.nome) === alvo)
    || lista.find(i => rtOrcTextoNormalizadoSimples(i.nome).includes(alvo) || alvo.includes(rtOrcTextoNormalizadoSimples(i.nome)));
}

function rtOrcDisponibilidadeApoioOrcamento(item, info){
  if (!document.getElementById('orcamentoDataEvento')?.value) return { texto:'Informe a data para verificar disponibilidade', classe:'neutral', info };
  const apoio = rtOrcEncontrarItemApoio(info);
  if (!apoio) return { texto:'Material de apoio — será conferido no evento', classe:'neutral', info };
  let disponivel = Number(apoio.quantidade_total || 0);
  try {
    if (typeof disponibilidadeApoioParaEvento === 'function') {
      const d = disponibilidadeApoioParaEvento(apoio, 0);
      if (d && typeof d.disponivel !== 'undefined') disponivel = Number(d.disponivel || 0);
    }
  } catch(e) {}
  const qtd = Number(item.quantidade || 0);
  return {
    texto: `Disponível na data: ${disponivel}${qtd ? ` | solicitado: ${qtd}` : ''}`,
    classe: disponivel >= qtd ? 'free' : 'busy',
    info,
    apoio_id: apoio.id,
    apoio_nome: apoio.nome
  };
}


function rtOrcDescricaoPdfItem(item){
  const desc = String(item?.descricao || '');
  const info = item?.info_material || {};
  const conjunto = rtOrcObterConjunto(info.conjunto || info.chave_conjunto);
  if (conjunto) {
    const curta = desc.replace(/\s*\([^)]*\)\s*$/,'').trim() || conjunto.descricao.replace(/\s*\([^)]*\)\s*$/,'').trim();
    const detalhe = (conjunto.descricao.match(/\(([^)]*)\)/) || [,''])[1];
    return detalhe ? `${curta}<br><small>(${detalhe})</small>` : curta;
  }
  return rtOrcEscape(desc);
}

function rtOrcDisponibilidadeMaterial(item){
  const info = item.info_material || rtOrcInferirMaterial(item.descricao);
  if (info.tipo === 'conjunto') return rtOrcDisponibilidadeConjuntoOrcamento(item, info);
  if (info.tipo === 'apoio') return rtOrcDisponibilidadeApoioOrcamento(item, info);
  if (info.tipo !== 'produto') return { texto:'Extra/serviço — será levado como extra no evento', classe:'neutral', info };
  if (!document.getElementById('orcamentoDataEvento')?.value) return { texto:'Informe a data para verificar disponibilidade', classe:'neutral', info };
  const listaProdutos = Array.isArray(window.produtos) ? window.produtos : (typeof produtos !== 'undefined' && Array.isArray(produtos) ? produtos : []);
  const candidatos = listaProdutos.filter(p => rtOrcProdutoBateComMaterial(p, info));
  if (!candidatos.length) return { texto:'Sem cadastro compatível no estoque', classe:'neutral', info };
  const eventoTemp = rtOrcEventoTemporarioParaDisponibilidade();
  const livres = candidatos.filter(p => {
    if (typeof produtoEstaDisponivelNoEvento !== 'function') return true;
    const d = produtoEstaDisponivelNoEvento(p, eventoTemp, -1);
    return d?.livre;
  }).length;
  const qtd = Number(item.quantidade || 0);
  return {
    texto: `Disponível na data: ${livres} de ${candidatos.length}${qtd ? ` | solicitado: ${qtd}` : ''}`,
    classe: livres >= qtd ? 'free' : 'busy',
    info,
    livres,
    total: candidatos.length
  };
}

function rtOrcDisponibilidadeParaOpcao(opt){
  if (!opt || !opt.value) return '';
  const info = {
    descricao: opt.value || opt.dataset.label || '',
    categoria: opt.dataset.categoria || opt.value || '',
    tamanho: opt.dataset.tamanho || '',
    detalhes: opt.dataset.detalhes || '',
    tipo: opt.dataset.tipo || 'extra',
    nome_apoio: opt.dataset.apoio || opt.dataset.categoria || opt.value || '',
    conjunto: opt.dataset.conjunto || ''
  };
  const itemTemp = { descricao: info.descricao, quantidade: Number(document.getElementById('orcamentoMaterialQtd')?.value || 1), info_material: info };
  const d = rtOrcDisponibilidadeMaterial(itemTemp);
  if (!d) return '';
  if (info.tipo === 'produto' && typeof d.livres !== 'undefined') return `disp. ${d.livres}/${d.total}`;
  if (info.tipo === 'conjunto' && typeof d.livres !== 'undefined') return `disp. ${d.livres} conj.`;
  if (info.tipo === 'apoio') return (d.texto || '').replace('Disponível na data: ', 'disp. ').replace(' | solicitado: '+itemTemp.quantidade, '');
  return '';
}

function atualizarDisponibilidadeCatalogoOrcamento(){
  const sel = document.getElementById('orcamentoMaterialTipo');
  if (!sel) return;
  Array.from(sel.options).forEach(opt => {
    if (!opt.value) return;
    const base = opt.dataset.label || opt.value || opt.textContent;
    opt.dataset.label = base;
    const disponibilidade = rtOrcDisponibilidadeParaOpcao(opt);
    opt.textContent = disponibilidade ? `${base} — ${disponibilidade}` : base;
  });
}


function rtOrcAlternarDescricaoOutroServico(){
  const sel = document.getElementById('orcamentoMaterialTipo');
  const linha = document.getElementById('orcamentoOutroServicoLinha');
  const desc = document.getElementById('orcamentoMaterialDescricao');
  if (!sel || !linha) return;
  const opt = sel.options[sel.selectedIndex];
  const isExtra = opt && (opt.dataset.tipo === 'extra' || String(sel.value || '').toLowerCase().includes('outro'));
  linha.style.display = isExtra ? '' : 'none';
  if (isExtra && desc) setTimeout(() => desc.focus(), 50);
  if (!isExtra && desc) desc.value = '';
}

function rtOrcInfoMaterialSelecionado(){
  const sel = document.getElementById('orcamentoMaterialTipo');
  if (sel && sel.value) {
    const opt = sel.options[sel.selectedIndex];
    const isExtra = opt && (opt.dataset.tipo === 'extra' || String(sel.value || '').toLowerCase().includes('outro'));
    const descInput = document.getElementById('orcamentoMaterialDescricao');
    const descLivre = descInput ? descInput.value.trim() : '';
    return {
      descricao: isExtra ? descLivre : (opt.value || opt.dataset.label || opt.textContent || ''),
      categoria: opt.dataset.categoria || opt.value || '',
      tamanho: opt.dataset.tamanho || '',
      detalhes: opt.dataset.detalhes || '',
      tipo: opt.dataset.tipo || 'extra',
      nome_apoio: opt.dataset.apoio || opt.dataset.categoria || opt.value || '',
      conjunto: opt.dataset.conjunto || ''
    };
  }
  const descInput = document.getElementById('orcamentoMaterialDescricao');
  const desc = descInput ? descInput.value.trim() : '';
  const info = rtOrcInferirMaterial(desc);
  return { descricao: desc, ...info };
}

function adicionarMaterialOrcamento(){
  const selMaterial = document.getElementById('orcamentoMaterialTipo');
  const optMaterial = selMaterial ? selMaterial.options[selMaterial.selectedIndex] : null;
  const isOutroServico = optMaterial && (optMaterial.dataset.tipo === 'extra' || String(selMaterial.value || '').toLowerCase().includes('outro'));
  const selecionado = rtOrcInfoMaterialSelecionado();
  const desc = String(selecionado.descricao || '').trim();
  const qtd = Number(document.getElementById('orcamentoMaterialQtd').value || 0);
  const unit = rtOrcNumero(document.getElementById('orcamentoMaterialValorUnit').value);
  if (isOutroServico && !desc) {
    rtOrcAlternarDescricaoOutroServico();
    alert('Informe a descrição do outro produto/serviço.');
    document.getElementById('orcamentoMaterialDescricao')?.focus();
    return;
  }
  if (!desc || qtd <= 0) { alert('Selecione o material e informe a quantidade.'); return; }
  const info = {
    categoria: selecionado.categoria || desc,
    tamanho: selecionado.tamanho || '',
    tipo: selecionado.tipo || 'extra',
    nome_apoio: selecionado.nome_apoio || selecionado.categoria || desc,
    detalhes: selecionado.detalhes || '',
    conjunto: selecionado.conjunto || ''
  };
  materiaisOrcamentoAtual.push({
    id: rtOrcGerarId(),
    descricao: desc,
    quantidade: qtd,
    valor_unitario: unit,
    tipo_produto: info.categoria,
    tamanho_produto: info.tamanho,
    tipo_material: info.tipo,
    nome_apoio: info.nome_apoio,
    info_material: info
  });
  const sel = document.getElementById('orcamentoMaterialTipo');
  if (sel) sel.value = '';
  const descInput = document.getElementById('orcamentoMaterialDescricao');
  if (descInput) descInput.value = '';
  rtOrcAlternarDescricaoOutroServico();
  document.getElementById('orcamentoMaterialQtd').value = 1;
  document.getElementById('orcamentoMaterialValorUnit').value = rtOrcMoeda(0);
  renderizarMateriaisOrcamento();
  calcularTotaisOrcamento(true);
}
function removerMaterialOrcamento(id){
  materiaisOrcamentoAtual = materiaisOrcamentoAtual.filter(i => String(i.id) !== String(id));
  renderizarMateriaisOrcamento();
  calcularTotaisOrcamento(true);
}

function renderizarMateriaisOrcamento(){
  atualizarDisponibilidadeCatalogoOrcamento();
  const area = document.getElementById('orcamentoMateriaisSelecionados');
  if (!area) return;
  if (!materiaisOrcamentoAtual.length) { area.innerHTML = '<p class="empty">Nenhum material adicionado.</p>'; return; }
  area.innerHTML = materiaisOrcamentoAtual.map(item => {
    const total = Number(item.quantidade||0) * Number(item.valor_unitario||0);
    const disp = rtOrcDisponibilidadeMaterial(item);
    return `<div class="selected-item extra-selected orcamento-material-item">
      <span><strong>${rtOrcEscape(item.quantidade)}x ${rtOrcEscape(item.descricao)}</strong> — Unit.: ${rtOrcMoeda(item.valor_unitario)} — Total: ${rtOrcMoeda(total)}
        <small class="availability-badge ${disp.classe}">${rtOrcEscape(disp.texto)}</small>
      </span>
      <button type="button" class="btn-outline" data-remover-material-orc="${item.id}">Remover</button>
    </div>`;
  }).join('');
  area.querySelectorAll('[data-remover-material-orc]').forEach(btn => btn.addEventListener('click', () => removerMaterialOrcamento(btn.dataset.removerMaterialOrc)));
}

function rtOrcPagamentoUsaSinal(){
  const val = document.getElementById('orcamentoFormaPagamento')?.value || '';
  return val.toLowerCase().includes('sinal de 20%');
}

function ajustarSinalPorFormaPagamentoOrcamento(){
  const total = rtOrcNumero(document.getElementById('orcamentoValorTotal')?.value || 0);
  const sinalEl = document.getElementById('orcamentoValorSinal');
  if (!sinalEl) return;
  if (!rtOrcPagamentoUsaSinal()) {
    sinalEl.value = rtOrcMoeda(0);
    orcamentoSinalEditadoManual = false;
  } else if (!orcamentoSinalEditadoManual && rtOrcNumero(sinalEl.value) === 0 && total > 0) {
    sinalEl.value = rtOrcMoeda(total * 0.2);
  }
  calcularTotaisOrcamento(false);
}

function calcularTotaisOrcamento(recalcularTotal=false){
  const materiais = materiaisOrcamentoAtual.reduce((s,i)=>s + Number(i.quantidade||0)*Number(i.valor_unitario||0),0);
  const materiaisEl = document.getElementById('orcamentoValorMateriais');
  if (materiaisEl) materiaisEl.value = rtOrcMoeda(materiais);
  const frete = rtOrcNumero(document.getElementById('orcamentoValorFreteMontagem')?.value || 0);
  const desconto = rtOrcNumero(document.getElementById('orcamentoValorDesconto')?.value || 0);
  const total = Math.max(materiais + frete - desconto, 0);
  const totalEl = document.getElementById('orcamentoValorTotal');
  if (totalEl) totalEl.value = rtOrcMoeda(total);
  const sinalEl = document.getElementById('orcamentoValorSinal');
  if (rtOrcPagamentoUsaSinal() && !orcamentoSinalEditadoManual && sinalEl) {
    sinalEl.value = rtOrcMoeda(total * 0.2);
  }
  const sinal = rtOrcNumero(sinalEl?.value || 0);
  const restanteEl = document.getElementById('orcamentoValorRestante');
  if (restanteEl) restanteEl.value = rtOrcMoeda(Math.max(total - sinal, 0));
}

function rtOrcDataSomarDias(data, dias){
  if (!data) return '';
  const [y,m,d] = String(data).split('-').map(Number);
  if (!y || !m || !d) return '';
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + dias);
  return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`;
}

function aplicarMontagemDiaAnteriorOrcamento(){
  const dataEvento = document.getElementById('orcamentoDataEvento')?.value;
  if (!dataEvento) { alert('Informe primeiro a data do evento.'); return; }
  document.getElementById('orcamentoMontagemData').value = rtOrcDataSomarDias(dataEvento, -1);
  document.getElementById('orcamentoMontagemHora').value = '';
  document.getElementById('orcamentoMontagemTipo').value = 'Livre / combinar';
}

function aplicarRetiradaDiaSeguinteOrcamento(){
  const dataEvento = document.getElementById('orcamentoDataEvento')?.value;
  if (!dataEvento) { alert('Informe primeiro a data do evento.'); return; }
  document.getElementById('orcamentoDesmontagemData').value = rtOrcDataSomarDias(dataEvento, 1);
  document.getElementById('orcamentoDesmontagemHora').value = '';
  document.getElementById('orcamentoDesmontagemTipo').value = 'Livre / combinar';
}

function rtOrcNumeroBaseData(dataEvento){
  const data = String(dataEvento || '').slice(0,10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) {
    const d = new Date();
    return `${String(d.getDate()).padStart(2,'0')}${String(d.getMonth()+1).padStart(2,'0')}${d.getFullYear()}`;
  }
  const [ano, mes, dia] = data.split('-');
  return `${dia}${mes}${ano}`;
}

function numeroProximoOrcamento(dataEvento){
  const base = rtOrcNumeroBaseData(dataEvento || document.getElementById('orcamentoDataEvento')?.value || '');
  const regex = new RegExp('^' + base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '-(\\d{3})$');
  const max = (Array.isArray(orcamentos) ? orcamentos : []).reduce((m, o) => {
    const match = String(o?.numero || '').match(regex);
    return match ? Math.max(m, Number(match[1] || 0)) : m;
  }, 0);
  return `${base}-${String(max + 1).padStart(3,'0')}`;
}

async function rtOrcGarantirNumero(orcamento){
  if (!orcamento) return orcamento;
  if (orcamento.numero && /^\d{8}-\d{3}$/.test(String(orcamento.numero))) return orcamento;
  const base = rtOrcNumeroBaseData(orcamento.data_evento);

  if (typeof supabaseClient !== 'undefined' && supabaseClient) {
    for (let tentativa = 0; tentativa < 25; tentativa++) {
      let maior = 0;
      try {
        const { data } = await supabaseClient
          .from('orcamentos_numeracao')
          .select('sequencial')
          .eq('data_evento', orcamento.data_evento)
          .order('sequencial', { ascending: false })
          .limit(1);
        maior = Number(data?.[0]?.sequencial || 0);
      } catch(e) {}

      const sequencial = maior + 1 + tentativa;
      const numero = `${base}-${String(sequencial).padStart(3,'0')}`;
      try {
        const { error } = await supabaseClient
          .from('orcamentos_numeracao')
          .insert({ data_evento: orcamento.data_evento, sequencial, numero_orcamento: numero });
        if (!error) {
          orcamento.numero = numero;
          return orcamento;
        }
      } catch(e) {}
    }
  }

  orcamento.numero = numeroProximoOrcamento(orcamento.data_evento);
  return orcamento;
}

function obterOrcamentoDoForm(temporario=false){
  calcularTotaisOrcamento(false);
  const idAtual = document.getElementById('orcamentoId').value || '';
  const usandoSupabase = (typeof supabaseClient !== 'undefined' && supabaseClient);
  const id = idAtual || (temporario ? 'preview' : (usandoSupabase ? '' : rtOrcGerarId()));
  const existente = id ? orcamentos.find(o => String(o.id) === String(id)) : null;
  return {
    id,
    numero: existente?.numero || '',
    nome: document.getElementById('orcamentoNome').value.trim(),
    documento: document.getElementById('orcamentoDocumento').value.trim(),
    telefone: document.getElementById('orcamentoTelefone').value.trim(),
    email: document.getElementById('orcamentoEmail').value.trim(),
    endereco: document.getElementById('orcamentoEndereco').value.trim(),
    bairro: document.getElementById('orcamentoBairro')?.value.trim() || '',
    cidade: document.getElementById('orcamentoCidade')?.value.trim() || (typeof carregarConfiguracoes === 'function' ? (carregarConfiguracoes().cidadePadrao || 'Rio de Janeiro') : 'Rio de Janeiro'),
    complemento: document.getElementById('orcamentoComplemento')?.value.trim() || '',
    observacao_cliente: document.getElementById('orcamentoObservacaoCliente').value.trim(),
    data_evento: document.getElementById('orcamentoDataEvento').value || null,
    hora_inicio: document.getElementById('orcamentoHoraInicio').value || '',
    hora_termino: document.getElementById('orcamentoHoraTermino').value || '',
    status: document.getElementById('orcamentoStatus').value || 'em_aberto',
    tipo_evento: document.getElementById('orcamentoTipoEvento').value || 'pontual',
    montagem_data: document.getElementById('orcamentoMontagemData').value || '',
    montagem_hora: document.getElementById('orcamentoMontagemHora').value || '',
    montagem_tipo: document.getElementById('orcamentoMontagemTipo').value || 'Horário comercial',
    desmontagem_data: document.getElementById('orcamentoDesmontagemData').value || '',
    desmontagem_hora: document.getElementById('orcamentoDesmontagemHora').value || '',
    desmontagem_tipo: document.getElementById('orcamentoDesmontagemTipo').value || 'Horário comercial',
    materiais: JSON.parse(JSON.stringify(materiaisOrcamentoAtual)),
    valor_materiais: rtOrcNumero(document.getElementById('orcamentoValorMateriais').value),
    valor_frete_montagem: rtOrcNumero(document.getElementById('orcamentoValorFreteMontagem').value),
    valor_desconto: rtOrcNumero(document.getElementById('orcamentoValorDesconto').value),
    valor_total: rtOrcNumero(document.getElementById('orcamentoValorTotal').value),
    valor_sinal: rtOrcNumero(document.getElementById('orcamentoValorSinal').value),
    valor_restante: rtOrcNumero(document.getElementById('orcamentoValorRestante').value),
    forma_pagamento: document.getElementById('orcamentoFormaPagamento').value,
    observacoes: document.getElementById('orcamentoObservacoes').value.trim(),
    evento_id: rtOrcUuidOuNull(existente?.evento_id || window.__rtOrcamentoEventoOrigemId || ''),
    criado_em: existente?.criado_em || new Date().toISOString(),
    atualizado_em: new Date().toISOString()
  };
}

function rtOrcSetBotaoProcessando(el, processando, texto){
  if (!el) return;
  if (processando) {
    el.dataset.rtTextoOriginal = el.textContent || '';
    el.disabled = true;
    if (texto) el.textContent = texto;
  } else {
    el.disabled = false;
    if (el.dataset.rtTextoOriginal) el.textContent = el.dataset.rtTextoOriginal;
    delete el.dataset.rtTextoOriginal;
  }
}

function rtOrcAtualizarCacheSalvo(salvo, fallback){
  const obj = salvo || fallback;
  if (!obj) return;
  if (!Array.isArray(orcamentos)) orcamentos = [];
  const chave = String(obj.id || fallback?.id || '');
  const idx = chave ? orcamentos.findIndex(x => String(x.id) === chave) : -1;
  if (idx >= 0) orcamentos[idx] = obj; else if (obj.id || obj.numero) orcamentos.push(obj);
  const idInput = document.getElementById('orcamentoId');
  if (idInput && obj.id) idInput.value = obj.id;
  try {
    const total = document.getElementById('orcamentosTotal');
    if (total) total.textContent = String((orcamentos || []).length);
  } catch(e) {}
}

async function rtOrcSalvarEmSegundoPlano(orcamento, eventoOrigemId){
  try {
    await rtOrcGarantirNumero(orcamento);
    const salvo = await salvarOrcamentoBanco(orcamento);
    if (salvo) {
      rtOrcAtualizarCacheSalvo(salvo, orcamento);
      if (eventoOrigemId) rtOrcDefinirOrcamentoPendenteEvento(salvo);
    }
  } catch(e) {
    console.warn('Orçamento gerado, mas não foi possível salvar em segundo plano:', e);
  }
}

async function rtOrcSalvarEGerarPdfAtual(ev){
  const btn = ev?.currentTarget || document.getElementById('gerarPdfOrcamento');
  const o = obterOrcamentoDoForm(false);
  if (!o.nome) { alert('Informe o nome do cliente.'); return; }
  if (!o.data_evento) { alert('Informe a data do evento.'); return; }

  const eventoOrigemId = window.__rtOrcamentoEventoOrigemId || document.getElementById('eventoId')?.value || '';
  if (eventoOrigemId) o.evento_id = eventoOrigemId;

  // Gerar PDF deve responder rápido: se ainda não houver número oficial, usa uma prévia
  // e grava o orçamento em segundo plano. O botão Salvar orçamento continua fazendo a gravação síncrona.
  if (!o.numero) o.numero = numeroProximoOrcamento(o.data_evento);
  rtOrcSetBotaoProcessando(btn, true, 'Gerando...');
  try {
    gerarPdfOrcamento(o);
  } finally {
    setTimeout(() => rtOrcSetBotaoProcessando(btn, false), 250);
  }

  rtOrcSalvarEmSegundoPlano(o, eventoOrigemId);
}
window.rtOrcSalvarEGerarPdfAtual = rtOrcSalvarEGerarPdfAtual;

async function salvarOrcamentoForm(ev){
  ev.preventDefault();
  const btn = ev.submitter || document.querySelector('#orcamentoForm button[type="submit"]');
  const o = obterOrcamentoDoForm();
  if (!o.nome) { alert('Informe o nome do cliente.'); return; }
  if (!o.data_evento) { alert('Informe a data do evento.'); return; }
  const eventoOrigemId = window.__rtOrcamentoEventoOrigemId || document.getElementById('eventoId')?.value || '';
  if (eventoOrigemId) o.evento_id = eventoOrigemId;

  // Salvar orçamento não deve travar a tela do evento. Fecha rápido e grava em segundo plano.
  rtOrcSetBotaoProcessando(btn, true, 'Salvando...');
  fecharOrcamentoModal();
  setTimeout(async () => {
    try {
      await rtOrcGarantirNumero(o);
      const salvo = await salvarOrcamentoBanco(o);
      if (!salvo) return;
      rtOrcAtualizarCacheSalvo(salvo, o);
      if (eventoOrigemId) rtOrcDefinirOrcamentoPendenteEvento(salvo);
      if (typeof renderizarOrcamentos === 'function' && document.getElementById('orcamentosTbody')) {
        try { await renderizarOrcamentos(); } catch(e) {}
      }
    } catch(e) {
      console.error('Erro ao salvar orçamento em segundo plano:', e);
      alert('Não foi possível salvar o orçamento. Verifique sua conexão e tente novamente.');
    } finally {
      rtOrcSetBotaoProcessando(btn, false);
    }
  }, 0);
}

async function renderizarOrcamentos(){
  await carregarOrcamentos();
  const tbody = document.getElementById('orcamentosTbody');
  if (!tbody) return;
  const busca = (document.getElementById('buscaOrcamento')?.value || '').toLowerCase();
  const status = document.getElementById('filtroOrcamentoStatus')?.value || '';
  let lista = orcamentos.filter(o => !status || o.status === status).filter(o => {
    const txt = [o.numero,o.nome,o.telefone,o.endereco,o.status,(o.materiais||[]).map(i=>i.descricao).join(' ')].join(' ').toLowerCase();
    return !busca || txt.includes(busca);
  }).sort((a,b)=>String(b.criado_em||'').localeCompare(String(a.criado_em||'')));
  document.getElementById('orcamentosTotal').textContent = lista.length;
  document.getElementById('orcamentosAbertos').textContent = lista.filter(o => ['em_aberto','enviado'].includes(o.status)).length;
  rtOrcGarantirBarraLimpeza();
  if (!lista.length) { tbody.innerHTML = '<tr><td colspan="10" class="empty">Nenhum orçamento encontrado.</td></tr>'; return; }
  tbody.innerHTML = lista.map(o => `<tr>
    <td class="orc-col-check"><input type="checkbox" class="orc-check" value="${rtOrcEscape(o.id)}"></td>
    <td class="orc-col-numero">${rtOrcEscape(o.numero || '')}</td>
    <td class="orc-col-data">${rtOrcDataBR(o.data_evento)}</td>
    <td class="orc-col-cliente">${rtOrcEscape(o.nome || '')}</td>
    <td class="orc-col-telefone">${rtOrcEscape(o.telefone || '')}</td>
    <td class="orc-col-evento">${rtOrcEscape(o.endereco || '')}</td>
    <td class="orc-col-materiais">${rtOrcEscape((o.materiais||[]).map(i => `${i.quantidade} ${i.descricao}`).join('; '))}</td>
    <td class="orc-col-total">${rtOrcMoeda(o.valor_total || 0)}</td>
    <td class="orc-col-status"><span class="status-pill">${rtOrcStatusLabel(o.status)}</span></td>
    <td class="actions-cell orc-col-acoes"><div class="orc-actions-row">
      <button type="button" class="btn-outline btn-mini" data-editar-orc="${o.id}" title="Editar orçamento">✏️</button>
      <button type="button" class="btn-outline btn-mini" data-pdf-orc="${o.id}" title="Gerar PDF do orçamento">PDF</button>
      <button type="button" class="btn-outline btn-mini" data-aprovar-orc="${o.id}" title="Aprovar orçamento">Aprovar</button>
    </div></td>
  </tr>`).join('');
  tbody.querySelectorAll('[data-editar-orc]').forEach(b => b.addEventListener('click', () => abrirEditarOrcamento(b.dataset.editarOrc)));
  tbody.querySelectorAll('[data-pdf-orc]').forEach(b => b.addEventListener('click', () => gerarPdfOrcamento(orcamentos.find(o=>String(o.id)===String(b.dataset.pdfOrc)))));
  tbody.querySelectorAll('[data-aprovar-orc]').forEach(b => b.addEventListener('click', () => aprovarOrcamento(b.dataset.aprovarOrc)));
}


function rtOrcGarantirBarraLimpeza(){
  const section = document.getElementById('orcamentosSection');
  const tabela = document.getElementById('orcamentosTbody')?.closest('table');
  if (!section || !tabela || document.getElementById('orcamentosBulkBar')) return;
  const bar = document.createElement('div');
  bar.id = 'orcamentosBulkBar';
  bar.className = 'orcamentos-bulk-bar';
  bar.innerHTML = `<label><input type="checkbox" id="orcSelecionarTodos"> Selecionar todos</label><button type="button" id="orcExcluirSelecionados" class="btn-outline">Excluir selecionados</button><button type="button" id="orcExcluirVencidos" class="btn-outline danger">Excluir vencidos/aguardando antigos</button>`;
  tabela.parentNode.insertBefore(bar, tabela);
}
function rtOrcSelecionarTodos(marcado){ document.querySelectorAll('.orc-check').forEach(c => c.checked = !!marcado); }
async function rtOrcExcluirIds(ids){
  ids = [...new Set((ids || []).filter(Boolean).map(String))];
  if (!ids.length) { alert('Nenhum orçamento selecionado.'); return; }
  if (!confirm(`Excluir ${ids.length} orçamento(s)? Essa ação não poderá ser desfeita.`)) return;
  if (typeof supabaseClient !== 'undefined' && supabaseClient) {
    try { const { error } = await supabaseClient.from('orcamentos').delete().in('id', ids); if (error) throw error; } catch(e) { console.warn('Erro ao excluir no Supabase, usando local:', e); }
  }
  orcamentos = orcamentos.filter(o => !ids.includes(String(o.id)));
  salvarOrcamentosLocal();
  await renderizarOrcamentos();
}
function rtOrcExcluirSelecionados(){ rtOrcExcluirIds(Array.from(document.querySelectorAll('.orc-check:checked')).map(c => c.value)); }
function rtOrcExcluirVencidosAguardando(){
  const hoje = new Date().toISOString().slice(0,10);
  const ids = orcamentos.filter(o => ['em_aberto','enviado','vencido'].includes(o.status || 'em_aberto') && String(o.data_evento || '') < hoje).map(o => o.id);
  rtOrcExcluirIds(ids);
}

function rtOrcStatusLabel(s){ return ({em_aberto:'Em aberto', enviado:'Enviado', aprovado:'Aprovado', recusado:'Recusado', vencido:'Vencido'}[s] || s || '-'); }

function rtOrcAplicarModelo(modelo, dados){
  return String(modelo || '').replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (_, chave) => dados[chave] ?? '');
}

function rtOrcObterModeloDocumento(){
  try {
    const config = (typeof carregarConfiguracoes === 'function') ? carregarConfiguracoes() : null;
    const padrao = (typeof modelosDocumentosPadrao === 'function') ? modelosDocumentosPadrao() : {};
    const configurado = String(config?.modelosDocumentos?.orcamento || '');

    // Proteção: se o modelo salvo estiver sem placeholders, ele provavelmente foi salvo já preenchido
    // com dados de um orçamento antigo. Nesse caso, ignorar e usar o padrão dinâmico.
    if (configurado && /{{\s*[a-zA-Z0-9_]+\s*}}/.test(configurado)) return configurado;
    if (configurado) console.warn('Modelo de orçamento sem placeholders ignorado para evitar PDF com dados antigos.');
    return padrao.orcamento || '';
  } catch(e) {
    try { return (typeof modelosDocumentosPadrao === 'function' ? modelosDocumentosPadrao().orcamento : '') || ''; } catch(_) { return ''; }
  }
}

function rtOrcObterLogoEmpresaUrl(){
  try {
    const config = (typeof carregarConfiguracoes === 'function') ? carregarConfiguracoes() : {};
    const url = String(config?.logoEmpresa || '').trim();
    if (url && !url.startsWith('data:image')) return url;
  } catch(e) {}
  return rtOrcLogoUrlPadrao;
}


function rtOrcAssinaturaResponsavelHtml(){
  let assinatura = '';
  try {
    const config = (typeof carregarConfiguracoes === 'function') ? carregarConfiguracoes() : {};
    assinatura = String(config.assinaturaResponsavel || '').trim();
  } catch(e) { assinatura = ''; }
  const img = assinatura ? `<img class="doc-assinatura-img" src="${rtOrcEscape(assinatura)}" alt="Assinatura RioTendas">` : '';
  return `<div class="orc-assinatura-responsavel">${img}<div class="linha-assinatura">______________________________________</div><strong>Rodrigo Brandão</strong><br><span>RioTendas</span></div>`;
}

function rtOrcObterObservacaoHorariosOrcamento(){
  const padrao = 'Nas modalidades Livre ou Comercial, a montagem e/ou desmontagem são realizadas por logística compartilhada. Nessas modalidades não trabalhamos com horário marcado; os horários servem apenas como referência operacional.';
  try {
    const configLocal = JSON.parse(localStorage.getItem('novoRioTendasConfiguracoesV1') || 'null');
    if (configLocal && Object.prototype.hasOwnProperty.call(configLocal, 'observacaoHorariosOrcamento')) {
      return String(configLocal.observacaoHorariosOrcamento || '').trim();
    }
    const cfg = (typeof carregarConfiguracoes === 'function') ? carregarConfiguracoes() : {};
    if (Object.prototype.hasOwnProperty.call(cfg, 'observacaoHorariosOrcamento')) {
      return String(cfg.observacaoHorariosOrcamento || '').trim();
    }
  } catch(e) {}
  return padrao;
}

function rtOrcPrepararModeloObservacoes(modelo){
  let html = String(modelo || '');
  if (/{{\s*observacao_horarios\s*}}/i.test(html)) return html;

  // Modelos antigos tinham apenas {{observacao_cliente}} nessa posição.
  // A partir daqui, a observação de horários é uma preferência separada.
  html = html.replace(/<p>\s*{{\s*observacao_cliente\s*}}\s*<\/p>/i, '{{observacao_horarios}}\n{{observacao_cliente}}');
  if (!/{{\s*observacao_horarios\s*}}/i.test(html) && /{{\s*observacao_cliente\s*}}/i.test(html)) {
    html = html.replace(/{{\s*observacao_cliente\s*}}/i, '{{observacao_horarios}}\n{{observacao_cliente}}');
  }
  return html;
}

function gerarPdfOrcamento(o){
  if (!o || !o.nome) { alert('Preencha pelo menos o nome do cliente antes de gerar o PDF.'); return; }
  const itensTabela = `<table class="doc-table"><thead><tr><th>Qtd</th><th>Descrição</th><th>Valor Unit.</th><th>Total</th></tr></thead><tbody>${(o.materiais||[]).map(i => `<tr><td>${rtOrcEscape(i.quantidade)}</td><td>${rtOrcDescricaoPdfItem(i)}</td><td>${rtOrcMoeda(i.valor_unitario||0)}</td><td>${rtOrcMoeda(Number(i.quantidade||0)*Number(i.valor_unitario||0))}</td></tr>`).join('') || '<tr><td colspan="4">Materiais a combinar.</td></tr>'}</tbody></table>`;
  const hoje = rtOrcDataBR(new Date().toISOString().slice(0,10));
  const validade = new Date(); validade.setDate(validade.getDate()+30);
  const validadeBR = rtOrcDataBR(validade.toISOString().slice(0,10));
  const tiposLogistica = `${o.montagem_tipo||''} ${o.desmontagem_tipo||''}`.toLowerCase();
  const textoObservacaoHorarios = rtOrcObterObservacaoHorariosOrcamento();
  const avisoLogistica = /(livre|comercial)/i.test(tiposLogistica) && textoObservacaoHorarios ? `<p><strong>Observação sobre horários:</strong><br>${rtOrcEscape(textoObservacaoHorarios).replace(/\n/g, '<br>')}</p>` : '';
  const larguraLogo = rtOrcObterLarguraLogoDocumentos();
  const logo = `<img src="${rtOrcObterLogoEmpresaUrl()}" alt="RioTendas" style="max-width:${larguraLogo}px;width:${larguraLogo}px;height:auto;">`;
  const dados = {
    logo_empresa: logo,
    nome_empresa: 'RioTendas',
    numero_orcamento: rtOrcEscape(o.numero || 'PREVIEW'),
    data_orcamento: hoje,
    validade_orcamento: validadeBR,
    cliente: rtOrcEscape(o.nome),
    cpf_cnpj: rtOrcEscape(o.documento || '-'),
    telefone: rtOrcEscape(o.telefone || '-'),
    email: rtOrcEscape(o.email || '-'),
    endereco: rtOrcEscape((typeof rtEnderecoCompleto === 'function' ? rtEnderecoCompleto(o) : o.endereco) || ''),
    bairro: rtOrcEscape(o.bairro || ''),
    cidade: rtOrcEscape(o.cidade || 'Rio de Janeiro'),
    data_evento: rtOrcDataBR(o.data_evento),
    horario_evento: `${rtOrcEscape(o.hora_inicio || 'Livre')} às ${rtOrcEscape(o.hora_termino || 'Livre')}`,
    montagem: `${rtOrcDataBR(o.montagem_data)} ${rtOrcEscape(o.montagem_tipo||'')} ${rtOrcEscape(o.montagem_hora||'')}`.trim(),
    desmontagem: `${rtOrcDataBR(o.desmontagem_data)} ${rtOrcEscape(o.desmontagem_tipo||'')} ${rtOrcEscape(o.desmontagem_hora||'')}`.trim(),
    descricao_servico: 'LOCAÇÃO DE ARTIGOS PARA EVENTOS',
    observacao_horarios: avisoLogistica,
    observacao_cliente: o.observacoes ? `<p><strong>Observações:</strong><br>${rtOrcEscape(o.observacoes).replace(/\n/g,'<br>')}</p>` : '',
    itens: itensTabela,
    valor_materiais: rtOrcMoeda(o.valor_materiais || (o.materiais||[]).reduce((s,i)=>s + Number(i.quantidade||0)*Number(i.valor_unitario||0),0)),
    valor_frete: rtOrcMoeda(o.valor_frete_montagem || 0),
    desconto: Number(o.valor_desconto||0) > 0 ? `<tr><th>Desconto</th><td>- ${rtOrcMoeda(o.valor_desconto)}</td></tr>` : '',
    valor_total: rtOrcMoeda(o.valor_total),
    sinal: rtOrcMoeda(o.valor_sinal),
    restante: rtOrcMoeda(o.valor_restante),
    forma_pagamento: rtOrcEscape(o.forma_pagamento || ''),
    data_hoje: hoje,
    assinaturas: rtOrcAssinaturaResponsavelHtml()
  };
  const modelo = rtOrcSanitizarModeloOrcamento(rtOrcPrepararModeloObservacoes(rtOrcObterModeloDocumento()));
  const corpo = rtOrcSanitizarModeloOrcamento(rtOrcAplicarModelo(modelo, dados) || `<section class="doc-header">${logo}<h1>ORÇAMENTO Nº ${dados.numero_orcamento}</h1></section>${itensTabela}`);
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${rtOrcEscape((o.numero ? 'Orçamento - RioTendas - ' + o.numero : 'Orçamento RioTendas'))}</title><style>
    body{font-family:Arial,sans-serif;margin:0;background:#eee;color:#111}.toolbar{position:sticky;top:0;z-index:50;background:#0d3f73;color:#fff;padding:8px 12px;display:flex;gap:8px;align-items:center;flex-wrap:wrap}.toolbar button,.toolbar input{padding:6px 8px;border:0;border-radius:7px;cursor:pointer}.toolbar .wa-pdf{background:#25d366;color:#062b14;font-weight:700}.toolbar .hint-wa{font-size:11px;opacity:.95}.page{width:190mm;min-height:277mm;margin:0 auto 12px;background:#fff;padding:0 14mm 14mm;box-shadow:0 0 12px #999;box-sizing:border-box}.doc-header{text-align:left;border-bottom:2px solid #111;padding-top:0;padding-bottom:8px;margin-top:0;margin-bottom:12px}.doc-header img{height:auto}.doc-header h1{margin:4px 0;font-size:20px}.doc-header h2{margin:8px 0 4px;font-size:18px}.doc-header p,.small{font-size:11px}.doc-table{width:100%;border-collapse:collapse;margin:8px 0 12px}.doc-table th,.doc-table td{border:1px solid #bbb;padding:7px;font-size:12px;text-align:left;resize:both;overflow:auto}.doc-table th{background:#f1f1f1}.compact{max-width:100%}h3{margin:14px 0 6px}p{font-size:12px;line-height:1.45}.orc-assinatura-responsavel{margin:6px 0 10px;text-align:left;font-size:12px}.doc-assinatura-img{display:block;max-width:185px;max-height:55px;object-fit:contain;margin:0 0 -4px}.linha-assinatura{line-height:1;margin-top:0}.footer{margin-top:22px;border-top:1px solid #111;padding-top:8px;display:flex;justify-content:space-between;font-size:11px}.layout-mode *{outline:1px dashed rgba(13,63,115,.25)}@page{margin:0} @media print{html,body{margin:0!important;padding:0!important}.toolbar{display:none}.page{margin:0;box-shadow:none;width:auto;min-height:auto;padding-top:0!important}.doc-header{margin-top:0!important;padding-top:0!important}.layout-mode *{outline:none}}
  </style></head><body><div class="toolbar"><strong>Orçamento editável</strong><button onclick="document.execCommand('bold')">B</button><button onclick="document.execCommand('italic')">I</button><button onclick="document.execCommand('underline')">U</button><button onclick="document.execCommand('justifyLeft')">Esq.</button><button onclick="document.execCommand('justifyCenter')">Centro</button><button onclick="document.execCommand('justifyRight')">Dir.</button><button onclick="document.execCommand('fontSize',false,'2')">A-</button><button onclick="document.execCommand('fontSize',false,'4')">A+</button><input type="color" onchange="document.execCommand('foreColor',false,this.value)"><button onclick="document.querySelector('.page').classList.toggle('layout-mode')">Editar layout</button><button onclick="rtSalvarModeloOrcamentoNuvem()">Salvar modelo</button><button onclick="window.print()">Imprimir/PDF</button><button onclick="window.close()">Fechar</button></div><main class="page" contenteditable="true">${corpo}<div class="footer"><div>RioTendas - Locação de Tendas<br>R. Cons. Lampreia, 245 – Cosme Velho</div><div>Tel.(21) 3490-2333 / 99692-9292<br>www.riotendas.com.br</div></div></main><script>
function rtOrcHtmlLimpo(){var p=document.querySelector('.page'); if(!p) return ''; var c=p.cloneNode(true); return c.innerHTML;}
async function rtSalvarModeloOrcamentoNuvem(){
  try{
    if(!window.opener){ alert('Não foi possível acessar a janela principal para salvar o modelo.'); return; }
    var html=rtOrcHtmlLimpo();
    var cfg=(typeof window.opener.carregarConfiguracoes==='function') ? window.opener.carregarConfiguracoes() : (window.opener.configRioTendas || {});
    cfg=cfg||{}; cfg.modelosDocumentos=cfg.modelosDocumentos||{}; cfg.modelosDocumentos.orcamento=html;
    if(typeof window.opener.salvarConfiguracoes==='function') await window.opener.salvarConfiguracoes(cfg);
    else { window.opener.localStorage.setItem('novoRioTendasConfiguracoesV1', JSON.stringify(cfg)); }
    if(window.opener.configRioTendas) window.opener.configRioTendas = cfg;
    alert('Modelo do orçamento salvo para todos os usuários.');
  }catch(e){ console.error(e); alert('Não foi possível salvar o modelo do orçamento.'); }
}
</script></body></html>`;
  const w = window.open('', '_blank');
  w.document.write(html); w.document.close();
}


function rtOrcObjetoDoEventoAtual(){
  const moeda = v => (typeof moedaParaNumero === 'function' ? moedaParaNumero(v || 0) : rtOrcNumero(v || 0));
  const dataEvento = document.getElementById('eventoData')?.value || '';
  const produtosEvento = typeof obterProdutosSelecionadosEvento === 'function' ? obterProdutosSelecionadosEvento() : [];
  const apoioEvento = typeof obterApoioSelecionadoEvento === 'function' ? obterApoioSelecionadoEvento() : [];
  const extrasEvento = Array.isArray(window.produtosExtrasEventoAtual || produtosExtrasEventoAtual) ? (window.produtosExtrasEventoAtual || produtosExtrasEventoAtual) : [];
  const materiais = [];
  produtosEvento.forEach(p => materiais.push({ quantidade: Number(p.quantidade || p.quantidade_pendente || 1), descricao: [p.categoria, p.tamanho, p.cor].filter(Boolean).join(' ') || p.descricao_orcamento || p.codigo || 'Produto', valor_unitario: 0, total: 0 }));
  apoioEvento.forEach(a => materiais.push({ quantidade: Number(a.quantidade || 1), descricao: a.nome || 'Material de apoio', valor_unitario: 0, total: 0 }));
  extrasEvento.forEach(e => materiais.push({ quantidade: Number(e.quantidade || 1), descricao: e.descricao || 'Extra', valor_unitario: 0, total: 0 }));
  return {
    id: document.getElementById('eventoOrcamentoIdVinculado')?.value || '',
    numero: '',
    nome: document.getElementById('eventoNome')?.value || '',
    documento: document.getElementById('eventoDocumento')?.value || '',
    telefone: document.getElementById('eventoTelefone')?.value || '',
    email: document.getElementById('eventoEmail')?.value || '',
    endereco: document.getElementById('eventoEndereco')?.value || '',
    bairro: document.getElementById('eventoBairro')?.value || '',
    cidade: document.getElementById('eventoCidade')?.value || 'Rio de Janeiro',
    complemento: document.getElementById('eventoComplemento')?.value || '',
    observacao_cliente: document.getElementById('eventoClienteObservacao')?.value || '',
    data_evento: dataEvento,
    hora_inicio: document.getElementById('eventoHoraInicio')?.value || '',
    hora_termino: document.getElementById('eventoHoraTermino')?.value || '',
    montagem_data: document.getElementById('eventoMontagem')?.value || dataEvento,
    montagem_hora: document.getElementById('eventoMontagemHora')?.value || '',
    montagem_tipo: document.getElementById('eventoMontagemTipo')?.value || 'Horário comercial',
    desmontagem_data: document.getElementById('eventoDesmontagem')?.value || dataEvento,
    desmontagem_hora: document.getElementById('eventoDesmontagemHora')?.value || '',
    desmontagem_tipo: document.getElementById('eventoDesmontagemTipo')?.value || 'Horário comercial',
    materiais,
    valor_materiais: moeda(document.getElementById('eventoValorTotal')?.value || 0),
    valor_frete_montagem: 0,
    valor_desconto: 0,
    valor_total: moeda(document.getElementById('eventoValorTotal')?.value || 0),
    valor_sinal: moeda(document.getElementById('eventoValorSinal')?.value || 0),
    valor_restante: moeda(document.getElementById('eventoValorRestante')?.value || 0),
    forma_pagamento: document.getElementById('eventoFormaPagamento')?.value || '',
    observacoes: document.getElementById('eventoClienteObservacao')?.value || '',
    status: 'evento'
  };
}


function rtOrcPreencherModalComObjeto(o, titulo){
  preencherSelectsHorarioOrcamento();
  preencherFormasPagamentoOrcamento(o?.forma_pagamento || '');
  const set = (id, val) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.value = val ?? '';
    el.dispatchEvent(new Event('input', { bubbles:true }));
    el.dispatchEvent(new Event('change', { bubbles:true }));
  };

  set('orcamentoId', o?.id || '');
  const tituloEl = document.getElementById('orcamentoModalTitulo');
  if (tituloEl) tituloEl.textContent = titulo || 'Orçamento do evento';

  set('orcamentoNome', o?.nome || '');
  set('orcamentoDocumento', o?.documento || '');
  set('orcamentoTelefone', o?.telefone || '');
  set('orcamentoEmail', o?.email || '');
  set('orcamentoEndereco', o?.endereco || '');
  set('orcamentoBairro', o?.bairro || '');
  set('orcamentoCidade', o?.cidade || (typeof carregarConfiguracoes === 'function' ? (carregarConfiguracoes().cidadePadrao || 'Rio de Janeiro') : 'Rio de Janeiro'));
  set('orcamentoComplemento', o?.complemento || '');
  set('orcamentoObservacaoCliente', o?.observacao_cliente || '');
  set('orcamentoDataEvento', o?.data_evento || '');
  set('orcamentoHoraInicio', o?.hora_inicio || '');
  set('orcamentoHoraTermino', o?.hora_termino || '');
  set('orcamentoStatus', o?.status || 'em_aberto');
  set('orcamentoTipoEvento', o?.tipo_evento || 'pontual');
  set('orcamentoMontagemData', o?.montagem_data || o?.data_evento || '');
  set('orcamentoMontagemHora', o?.montagem_hora || '');
  set('orcamentoMontagemTipo', o?.montagem_tipo || 'Horário comercial');
  set('orcamentoDesmontagemData', o?.desmontagem_data || o?.data_evento || '');
  set('orcamentoDesmontagemHora', o?.desmontagem_hora || '');
  set('orcamentoDesmontagemTipo', o?.desmontagem_tipo || 'Horário comercial');

  materiaisOrcamentoAtual = Array.isArray(o?.materiais) ? JSON.parse(JSON.stringify(o.materiais)) : [];
  set('orcamentoValorMateriais', rtOrcMoeda(o?.valor_materiais || (materiaisOrcamentoAtual || []).reduce((s,i)=>s + Number(i.quantidade||0)*Number(i.valor_unitario||0),0)));
  set('orcamentoValorFreteMontagem', rtOrcMoeda(o?.valor_frete_montagem || 0));
  set('orcamentoValorDesconto', rtOrcMoeda(o?.valor_desconto || 0));
  set('orcamentoValorTotal', rtOrcMoeda(o?.valor_total || 0));
  set('orcamentoValorSinal', rtOrcMoeda(o?.valor_sinal || 0));
  set('orcamentoValorRestante', rtOrcMoeda(o?.valor_restante || 0));
  set('orcamentoFormaPagamento', o?.forma_pagamento || '');
  set('orcamentoObservacoes', o?.observacoes || '');

  orcamentoSinalEditadoManual = true;
  renderizarMateriaisOrcamento();
  calcularTotaisOrcamento(false);
  const aprovar = document.getElementById('aprovarOrcamentoBtn');
  if (aprovar) aprovar.style.display = o?.id ? '' : 'none';
  document.getElementById('orcamentoDialog')?.showModal();
}
window.rtOrcPreencherModalComObjeto = rtOrcPreencherModalComObjeto;

async function rtAbrirOrcamentoPdfDeEventoAtual(){
  const o = rtOrcObjetoDoEventoAtual();
  if (!o.nome || !o.data_evento) { alert('Informe cliente e data do evento antes de abrir orçamento.'); return; }

  // Fluxo rápido: ao clicar no botão Orçamento dentro do evento, apenas abre o formulário.
  // O orçamento só será salvo/numerado quando clicar em Salvar, Gerar PDF ou Aprovar.
  const eventoId = document.getElementById('eventoId')?.value || '';
  window.__rtOrcamentoEventoOrigemId = eventoId || '';
  if (eventoId) o.evento_id = eventoId;

  // Se já houver orçamento vinculado, reabre para edição; se não houver, abre como novo preenchido.
  const vinculadoId = document.getElementById('eventoOrcamentoIdVinculado')?.value || '';
  const existente = vinculadoId && Array.isArray(orcamentos)
    ? orcamentos.find(x => String(x.id) === String(vinculadoId))
    : null;

  rtOrcPreencherModalComObjeto(existente || o, existente ? `Editar orçamento ${existente.numero || ''}` : 'Orçamento do evento');
}
window.rtAbrirOrcamentoPdfDeEventoAtual = rtAbrirOrcamentoPdfDeEventoAtual;

function rtOrcDefinirOrcamentoPendenteEvento(o){
  if (!o) return;
  window.__rtOrcamentoPendenteEvento = { id: o.id, numero: o.numero || '' };
  let input = document.getElementById('eventoOrcamentoIdVinculado');
  if (!input) {
    input = document.createElement('input');
    input.type = 'hidden';
    input.id = 'eventoOrcamentoIdVinculado';
    const form = document.getElementById('eventoForm') || document.querySelector('#eventoDialog form');
    (form || document.body).appendChild(input);
  }
  input.value = o.id || '';
}
window.rtOrcDefinirOrcamentoPendenteEvento = rtOrcDefinirOrcamentoPendenteEvento;

async function rtVincularOrcamentoEventoSePendente(eventoId){
  const pend = window.__rtOrcamentoPendenteEvento;
  if (!pend || !pend.id || !eventoId) return;
  try {
    const idx = Array.isArray(orcamentos) ? orcamentos.findIndex(o => String(o.id) === String(pend.id)) : -1;
    if (idx >= 0) {
      orcamentos[idx].evento_id = eventoId;
      // Mantém apenas evento_id para compatibilidade com o schema atual do Supabase.
      orcamentos[idx].status = 'aprovado';
    }
  } catch(e) {}
  if (typeof supabaseClient !== 'undefined' && supabaseClient) {
    try {
      await supabaseClient.from('orcamentos').update({ evento_id: eventoId, status: 'aprovado', atualizado_em: new Date().toISOString() }).eq('id', pend.id);
    } catch(e) { console.warn('Orçamento aprovado, mas não foi possível gravar evento_id na tabela orcamentos. Verifique se a coluna existe.', e); }
  }
  window.__rtOrcamentoPendenteEvento = null;
}
window.rtVincularOrcamentoEventoSePendente = rtVincularOrcamentoEventoSePendente;

function aprovarOrcamentoAtual(){
  const id = document.getElementById('orcamentoId').value;
  if (id) aprovarOrcamento(id); else alert('Salve o orçamento antes de aprovar.');
}

async function aprovarOrcamento(id){
  const o = orcamentos.find(x => String(x.id) === String(id));
  if (!o) return;
  if (!confirm('Aprovar este orçamento e abrir um novo evento com os dados preenchidos?')) return;
  o.status = 'aprovado'; o.atualizado_em = new Date().toISOString();
  const salvo = await salvarOrcamentoBanco(o);
  if (!salvo) return;
  await renderizarOrcamentos();
  fecharOrcamentoModal();
  if (typeof abrirNovoEvento === 'function') abrirNovoEvento();
  setTimeout(() => { rtOrcDefinirOrcamentoPendenteEvento(o); preencherEventoComOrcamento(o); }, 250);
}

function preencherEventoComOrcamento(o){
  const set = (id, val) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.value = val || '';
    el.dispatchEvent(new Event('input', { bubbles:true }));
    el.dispatchEvent(new Event('change', { bubbles:true }));
  };

  set('eventoNome', o.nome);
  set('eventoBuscaCliente', o.nome);
  set('eventoDocumento', o.documento);
  set('eventoTelefone', o.telefone);
  set('eventoEmail', o.email);
  set('eventoEndereco', o.endereco);
  set('eventoClienteObservacao', o.observacao_cliente);
  set('eventoData', o.data_evento || '');
  set('eventoHoraInicio', o.hora_inicio || '');
  set('eventoHoraTermino', o.hora_termino || '');
  set('eventoMontagem', o.montagem_data || o.data_evento || '');
  set('eventoMontagemHora', o.montagem_hora || '');
  set('eventoMontagemTipo', o.montagem_tipo || 'Horário comercial');
  set('eventoDesmontagem', o.desmontagem_data || o.data_evento || '');
  set('eventoDesmontagemHora', o.desmontagem_hora || '');
  set('eventoDesmontagemTipo', o.desmontagem_tipo || 'Horário comercial');
  set('eventoValorTotal', rtOrcMoeda(o.valor_total));
  set('eventoValorSinal', rtOrcMoeda(o.valor_sinal));
  set('eventoValorRestante', rtOrcMoeda(o.valor_restante));
  set('eventoFormaPagamento', o.forma_pagamento);

  const pendentesCodigo = [];
  const extrasOuApoio = [];
  const apoioSelecionado = [];
  (o.materiais || []).forEach(m => {
    const info = m.info_material || rtOrcInferirMaterial(m.descricao);
    const qtd = Math.max(Number(m.quantidade || 1), 1);
    if (info.tipo === 'produto') {
      pendentesCodigo.push({
        id: `orc-pendente-${rtOrcGerarId()}`,
        codigo: 'Pendente',
        categoria: info.categoria || m.tipo_produto || m.descricao || '',
        tamanho: info.tamanho || m.tamanho_produto || '',
        cor: info.detalhes || '',
        descricao_orcamento: m.descricao || '',
        quantidade_pendente: qtd,
        pendente_codigo: true
      });
    } else if (info.tipo === 'conjunto') {
      const conjunto = rtOrcObterConjunto(info.conjunto || info.chave_conjunto);
      if (conjunto) {
        conjunto.itens.forEach(comp => {
          const apoio = rtOrcEncontrarItemApoioPorAliases(comp.aliases || [comp.nome]);
          const quantidadeConvertida = qtd * Number(comp.qtd || 1);
          if (apoio) {
            const existente = apoioSelecionado.find(a => String(a.id) === String(apoio.id));
            if (existente) existente.quantidade += quantidadeConvertida;
            else apoioSelecionado.push({ id: apoio.id, nome: apoio.nome, quantidade: quantidadeConvertida });
          } else {
            extrasOuApoio.push({ id: rtOrcGerarId(), descricao: comp.nome, quantidade: quantidadeConvertida });
          }
        });
      } else {
        extrasOuApoio.push({ id: rtOrcGerarId(), descricao: m.descricao, quantidade: qtd });
      }
    } else if (info.tipo === 'apoio') {
      const apoio = rtOrcEncontrarItemApoio(info);
      if (apoio) {
        const existente = apoioSelecionado.find(a => String(a.id) === String(apoio.id));
        if (existente) existente.quantidade += qtd;
        else apoioSelecionado.push({ id: apoio.id, nome: apoio.nome, quantidade: qtd });
      } else {
        extrasOuApoio.push({ id: rtOrcGerarId(), descricao: m.descricao, quantidade: qtd });
      }
    } else {
      extrasOuApoio.push({
        id: rtOrcGerarId(),
        descricao: `${m.descricao}${m.valor_unitario ? ' - ' + rtOrcMoeda(m.valor_unitario) + ' un.' : ''}`,
        quantidade: qtd
      });
    }
  });

  if (typeof produtosSelecionadosEventoAtual !== 'undefined') {
    produtosSelecionadosEventoAtual = pendentesCodigo;
    if (typeof renderizarProdutosSelecionadosEvento === 'function') renderizarProdutosSelecionadosEvento();
  }
  if (typeof produtosExtrasEventoAtual !== 'undefined') {
    produtosExtrasEventoAtual = extrasOuApoio;
    if (typeof renderizarExtrasEvento === 'function') renderizarExtrasEvento();
  }
  if (typeof renderizarApoioEvento === 'function') renderizarApoioEvento(apoioSelecionado);
  if (typeof popularSelectProdutosEvento === 'function') popularSelectProdutosEvento();
  if (typeof calcularRestanteEvento === 'function') calcularRestanteEvento();
}
