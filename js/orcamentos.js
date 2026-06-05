const storageOrcamentosKey = "novoRioTendasOrcamentosV1";
let orcamentos = [];
let materiaisOrcamentoAtual = [];
let orcamentoSinalEditadoManual = false;
const rtOrcLogoDataUri = "data:image/png;base64,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";

function rtOrcGerarId(){ return (typeof gerarId === "function") ? gerarId() : String(Date.now()) + Math.random().toString(16).slice(2); }
function rtOrcMoeda(n){ return (typeof numeroParaMoeda === "function") ? numeroParaMoeda(Number(n||0)) : Number(n||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'}); }
function rtOrcNumero(v){ return (typeof moedaParaNumero === "function") ? moedaParaNumero(v) : Number(String(v||'').replace(/[^\d,.-]/g,'').replace('.','').replace(',','.')) || 0; }
function rtOrcDataBR(d){ return d ? (typeof dataBR === "function" ? dataBR(d) : d.split('-').reverse().join('/')) : ''; }
function rtOrcEscape(v){ return String(v ?? '').replace(/[&<>"]/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[s])); }
function rtOrcPrimeiroNome(nome){ return String(nome||'').trim().split(/\s+/)[0] || ''; }


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

    const { data, error } = await supabaseClient
      .from('orcamentos')
      .upsert(registro, { onConflict: 'id' })
      .select()
      .single();

    if (error) {
      console.error('Erro ao salvar orçamento no Supabase:', error);
      alert('Erro ao salvar orçamento no Supabase: ' + (error.message || '') + '\n\nSe aparecer tabela não encontrada, execute o arquivo SQL incluído no ZIP: EXECUTAR-NO-SUPABASE-ORCAMENTOS.sql');
      return null;
    }
    return data;
  }

  const idx = orcamentos.findIndex(x => String(x.id) === String(orcamento.id));
  if (idx >= 0) orcamentos[idx] = orcamento; else orcamentos.push(orcamento);
  localStorage.setItem(storageOrcamentosKey, JSON.stringify(orcamentos));
  return orcamento;
}

function salvarOrcamentosLocal(){ localStorage.setItem(storageOrcamentosKey, JSON.stringify(orcamentos)); }

function iniciarOrcamentos(){
  preencherSelectsHorarioOrcamento();
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
  document.getElementById('gerarPdfOrcamento')?.addEventListener('click', () => gerarPdfOrcamento(obterOrcamentoDoForm(true)));
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
  const form = document.getElementById('orcamentoForm');
  form?.reset();
  document.getElementById('orcamentoId').value = '';
  document.getElementById('orcamentoModalTitulo').textContent = 'Novo orçamento';
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
  document.getElementById('orcamentoFormaPagamento').value = o.forma_pagamento || document.getElementById('orcamentoFormaPagamento').options[0].value;
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

function numeroProximoOrcamento(){
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
  const seq = (orcamentos.length + 1).toString().padStart(3,'0');
  return `${ymd}/${seq}`;
}

function obterOrcamentoDoForm(temporario=false){
  calcularTotaisOrcamento(false);
  const id = document.getElementById('orcamentoId').value || (temporario ? 'preview' : rtOrcGerarId());
  const existente = orcamentos.find(o => String(o.id) === String(id));
  return {
    id,
    numero: existente?.numero || numeroProximoOrcamento(),
    nome: document.getElementById('orcamentoNome').value.trim(),
    documento: document.getElementById('orcamentoDocumento').value.trim(),
    telefone: document.getElementById('orcamentoTelefone').value.trim(),
    email: document.getElementById('orcamentoEmail').value.trim(),
    endereco: document.getElementById('orcamentoEndereco').value.trim(),
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
    criado_em: existente?.criado_em || new Date().toISOString(),
    atualizado_em: new Date().toISOString()
  };
}

async function salvarOrcamentoForm(ev){
  ev.preventDefault();
  const o = obterOrcamentoDoForm();
  if (!o.nome) { alert('Informe o nome do cliente.'); return; }
  if (!o.data_evento) { alert('Informe a data do evento.'); return; }
  const salvo = await salvarOrcamentoBanco(o);
  if (!salvo) return;
  const idx = orcamentos.findIndex(x => String(x.id) === String(o.id));
  if (idx >= 0) orcamentos[idx] = salvo; else orcamentos.push(salvo);
  await renderizarOrcamentos();
  fecharOrcamentoModal();
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
  if (!lista.length) { tbody.innerHTML = '<tr><td colspan="9" class="empty">Nenhum orçamento encontrado.</td></tr>'; return; }
  tbody.innerHTML = lista.map(o => `<tr>
    <td>${rtOrcEscape(o.numero || '')}</td>
    <td>${rtOrcDataBR(o.data_evento)}</td>
    <td>${rtOrcEscape(o.nome || '')}</td>
    <td>${rtOrcEscape(o.telefone || '')}</td>
    <td>${rtOrcEscape(o.endereco || '')}</td>
    <td>${rtOrcEscape((o.materiais||[]).map(i => `${i.quantidade} ${i.descricao}`).join('; '))}</td>
    <td>${rtOrcMoeda(o.valor_total || 0)}</td>
    <td><span class="status-pill">${rtOrcStatusLabel(o.status)}</span></td>
    <td class="actions-cell">
      <button type="button" class="btn-outline btn-mini" data-editar-orc="${o.id}">Editar</button>
      <button type="button" class="btn-outline btn-mini" data-pdf-orc="${o.id}">PDF</button>
      <button type="button" class="btn-outline btn-mini" data-aprovar-orc="${o.id}">Aprovar</button>
    </td>
  </tr>`).join('');
  tbody.querySelectorAll('[data-editar-orc]').forEach(b => b.addEventListener('click', () => abrirEditarOrcamento(b.dataset.editarOrc)));
  tbody.querySelectorAll('[data-pdf-orc]').forEach(b => b.addEventListener('click', () => gerarPdfOrcamento(orcamentos.find(o=>String(o.id)===String(b.dataset.pdfOrc)))));
  tbody.querySelectorAll('[data-aprovar-orc]').forEach(b => b.addEventListener('click', () => aprovarOrcamento(b.dataset.aprovarOrc)));
}

function rtOrcStatusLabel(s){ return ({em_aberto:'Em aberto', enviado:'Enviado', aprovado:'Aprovado', recusado:'Recusado', vencido:'Vencido'}[s] || s || '-'); }

function rtOrcAplicarModelo(modelo, dados){
  return String(modelo || '').replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (_, chave) => dados[chave] ?? '');
}

function rtOrcObterModeloDocumento(){
  try {
    const config = (typeof carregarConfiguracoes === 'function') ? carregarConfiguracoes() : null;
    const padrao = (typeof modelosDocumentosPadrao === 'function') ? modelosDocumentosPadrao() : {};
    return (config?.modelosDocumentos?.orcamento) || padrao.orcamento || '';
  } catch(e) {
    try { return (typeof modelosDocumentosPadrao === 'function' ? modelosDocumentosPadrao().orcamento : '') || ''; } catch(_) { return ''; }
  }
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

function gerarPdfOrcamento(o){
  if (!o || !o.nome) { alert('Preencha pelo menos o nome do cliente antes de gerar o PDF.'); return; }
  const itensTabela = `<table class="doc-table"><thead><tr><th>Qtd</th><th>Descrição</th><th>Valor Unit.</th><th>Total</th></tr></thead><tbody>${(o.materiais||[]).map(i => `<tr><td>${rtOrcEscape(i.quantidade)}</td><td>${rtOrcDescricaoPdfItem(i)}</td><td>${rtOrcMoeda(i.valor_unitario||0)}</td><td>${rtOrcMoeda(Number(i.quantidade||0)*Number(i.valor_unitario||0))}</td></tr>`).join('') || '<tr><td colspan="4">Materiais a combinar.</td></tr>'}</tbody></table>`;
  const hoje = rtOrcDataBR(new Date().toISOString().slice(0,10));
  const validade = new Date(); validade.setDate(validade.getDate()+30);
  const validadeBR = rtOrcDataBR(validade.toISOString().slice(0,10));
  const tiposLogistica = `${o.montagem_tipo||''} ${o.desmontagem_tipo||''}`.toLowerCase();
  const avisoLogistica = /(livre|comercial)/i.test(tiposLogistica) ? `<p><strong>Observação sobre horários:</strong><br>Nas modalidades Livre ou Comercial, a montagem e/ou desmontagem são realizadas por logística compartilhada. Nessas modalidades não trabalhamos com horário marcado; os horários servem apenas como referência operacional.</p>` : '';
  const logo = `<img src="${rtOrcLogoDataUri}" alt="RioTendas" style="max-width:122px;height:auto;">`;
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
    endereco: rtOrcEscape(o.endereco || ''),
    bairro: rtOrcEscape(o.bairro || ''),
    data_evento: rtOrcDataBR(o.data_evento),
    horario_evento: `${rtOrcEscape(o.hora_inicio || 'Livre')} às ${rtOrcEscape(o.hora_termino || 'Livre')}`,
    montagem: `${rtOrcDataBR(o.montagem_data)} ${rtOrcEscape(o.montagem_tipo||'')} ${rtOrcEscape(o.montagem_hora||'')}`.trim(),
    desmontagem: `${rtOrcDataBR(o.desmontagem_data)} ${rtOrcEscape(o.desmontagem_tipo||'')} ${rtOrcEscape(o.desmontagem_hora||'')}`.trim(),
    descricao_servico: 'LOCAÇÃO DE ARTIGOS PARA EVENTOS',
    observacao_cliente: `${avisoLogistica}${o.observacoes ? `<p><strong>Observações:</strong><br>${rtOrcEscape(o.observacoes).replace(/\n/g,'<br>')}</p>` : ''}`,
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
  const modelo = rtOrcObterModeloDocumento();
  const corpo = rtOrcAplicarModelo(modelo, dados) || `<section class="doc-header">${logo}<h1>ORÇAMENTO Nº ${dados.numero_orcamento}</h1></section>${itensTabela}`;
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Orçamento RioTendas</title><style>
    body{font-family:Arial,sans-serif;margin:0;background:#eee;color:#111}.toolbar{position:sticky;top:0;background:#111;color:#fff;padding:10px 18px;display:flex;justify-content:space-between;align-items:center}.toolbar button{padding:8px 12px;border:0;border-radius:8px;cursor:pointer}.page{width:190mm;min-height:277mm;margin:12px auto;background:#fff;padding:14mm;box-shadow:0 0 12px #999;box-sizing:border-box}.doc-header{text-align:left;border-bottom:2px solid #111;padding-bottom:8px;margin-bottom:12px}.doc-header img{max-width:122px;height:auto}.doc-header h1{margin:4px 0;font-size:20px}.doc-header h2{margin:8px 0 4px;font-size:18px}.doc-header p,.small{font-size:11px}.doc-table{width:100%;border-collapse:collapse;margin:8px 0 12px}.doc-table th,.doc-table td{border:1px solid #bbb;padding:7px;font-size:12px;text-align:left}.doc-table th{background:#f1f1f1}.compact{max-width:100%}h3{margin:14px 0 6px}p{font-size:12px;line-height:1.45}.orc-assinatura-responsavel{margin:6px 0 10px;text-align:left;font-size:12px}.doc-assinatura-img{display:block;max-width:185px;max-height:55px;object-fit:contain;margin:0 0 -4px}.linha-assinatura{line-height:1;margin-top:0}.footer{margin-top:22px;border-top:1px solid #111;padding-top:8px;display:flex;justify-content:space-between;font-size:11px}@media print{.toolbar{display:none}.page{margin:0;box-shadow:none;width:auto;min-height:auto}}
  </style></head><body><div class="toolbar"><strong>Orçamento editável</strong><div><button onclick="window.print()">Imprimir / salvar PDF</button> <button onclick="window.close()">Fechar</button></div></div><main class="page" contenteditable="true">${corpo}<div class="footer"><div>RioTendas - Locação de Tendas<br>R. Cons. Lampreia, 245 – Cosme Velho</div><div>Tel.(21) 3490-2333 / 99692-9292<br>www.riotendas.com.br</div></div></main></body></html>`;
  const w = window.open('', '_blank');
  w.document.write(html); w.document.close();
}

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
  setTimeout(() => preencherEventoComOrcamento(o), 250);
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
