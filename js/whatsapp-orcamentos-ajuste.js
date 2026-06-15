// v19-dev: WhatsApp de orçamento separado do WhatsApp operacional do evento.
(function(){
  if (window.__RT_WA_ORCAMENTOS_AJUSTE__) return;
  window.__RT_WA_ORCAMENTOS_AJUSTE__ = true;

  function limparNumero(tel){ return String(tel || '').replace(/\D/g, ''); }
  function whatsappUrl(tel, msg){
    let n = limparNumero(tel);
    if (!n) return '';
    if (!n.startsWith('55')) n = '55' + n;
    return 'https://wa.me/' + n + '?text=' + encodeURIComponent(msg || '');
  }
  function dataBR(d){
    if (!d) return '';
    if (typeof window.dataBR === 'function') return window.dataBR(d);
    return String(d).includes('-') ? String(d).split('-').reverse().join('/') : String(d);
  }
  function moeda(v){
    if (typeof window.numeroParaMoeda === 'function') return window.numeroParaMoeda(Number(v || 0));
    return Number(v || 0).toLocaleString('pt-BR', { style:'currency', currency:'BRL' });
  }
  function primeiro(nome){ return String(nome || '').trim().split(/\s+/)[0] || 'cliente'; }
  function itens(o){
    const arr = Array.isArray(o && o.materiais) ? o.materiais : [];
    return arr.length ? arr.map(i => `${i.quantidade || 1} ${i.descricao || i.tipo || 'item'}`).join('\n') : 'Conforme orçamento em PDF.';
  }
  function config(){ try { return typeof window.carregarConfiguracoes === 'function' ? window.carregarConfiguracoes() : {}; } catch(e){ return {}; } }
  function modelosPadrao(){
    try { if (typeof window.modelosWhatsappPadrao === 'function') return window.modelosWhatsappPadrao(); } catch(e){}
    return [{ id:'orcamento', tipo:'orcamento', icone:'📋', titulo:'Orçamento', ativo:true, texto:'Olá, {PRIMEIRO_NOME}! Tudo bem?\n\nSegue o orçamento solicitado pela {EMPRESA}.\n\nQualquer dúvida, fico à disposição.' }];
  }
  function modeloOrcamento(){
    const cfg = config();
    const lista = Array.isArray(cfg.modelosWhatsapp) ? cfg.modelosWhatsapp : [];
    return lista.find(m => m && m.ativo !== false && (m.tipo === 'orcamento' || m.id === 'orcamento')) || modelosPadrao().find(m => m.tipo === 'orcamento') || {};
  }
  function aplicarModelo(texto, o){
    const cfg = config();
    const nomeEmpresa = cfg.nomeEmpresa || 'RioTendas';
    const dados = {
      CLIENTE: o.nome || '',
      PRIMEIRO_NOME: primeiro(o.nome),
      DATA: dataBR(o.data_evento) || 'a combinar',
      MONTAGEM: [dataBR(o.montagem_data), o.montagem_tipo || '', o.montagem_hora || ''].filter(Boolean).join(' '),
      RETIRADA: [dataBR(o.desmontagem_data), o.desmontagem_tipo || '', o.desmontagem_hora || ''].filter(Boolean).join(' '),
      ENDERECO: o.endereco || 'a combinar',
      PRODUTOS: itens(o),
      TOTAL: moeda(o.valor_total || 0),
      SINAL: moeda(o.valor_sinal || 0),
      RESTANTE: moeda(o.valor_restante || 0),
      PIX: cfg?.pix?.chave || '',
      EMPRESA: nomeEmpresa,
      NUMERO_ORCAMENTO: o.numero || ''
    };
    return String(texto || '').replace(/\{([A-Z0-9_]+)\}/g, (_, k) => dados[k] ?? '');
  }
  function montarMensagem(o){
    const modelo = modeloOrcamento();
    return aplicarModelo(modelo.texto || 'Olá, {PRIMEIRO_NOME}! Tudo bem?\n\nSegue o orçamento solicitado pela {EMPRESA}.\n\nQualquer dúvida, fico à disposição.', o || {});
  }
  function getOrcamentoForm(){
    try { if (typeof window.obterOrcamentoDoForm === 'function') return window.obterOrcamentoDoForm(true); } catch(e){}
    const val = id => document.getElementById(id)?.value || '';
    return {
      nome: val('orcamentoNome'), telefone: val('orcamentoTelefone'), endereco: val('orcamentoEndereco'),
      data_evento: val('orcamentoDataEvento'), montagem_data: val('orcamentoMontagemData'), montagem_tipo: val('orcamentoMontagemTipo'), montagem_hora: val('orcamentoMontagemHora'),
      desmontagem_data: val('orcamentoDesmontagemData'), desmontagem_tipo: val('orcamentoDesmontagemTipo'), desmontagem_hora: val('orcamentoDesmontagemHora'),
      valor_total: (typeof window.moedaParaNumero === 'function' ? window.moedaParaNumero(val('orcamentoValorTotal')) : val('orcamentoValorTotal')),
      valor_sinal: (typeof window.moedaParaNumero === 'function' ? window.moedaParaNumero(val('orcamentoValorSinal')) : val('orcamentoValorSinal')),
      valor_restante: (typeof window.moedaParaNumero === 'function' ? window.moedaParaNumero(val('orcamentoValorRestante')) : val('orcamentoValorRestante')),
      materiais: Array.isArray(window.materiaisOrcamentoAtual) ? window.materiaisOrcamentoAtual : []
    };
  }
  function abrirWhatsappOrcamento(o, gerarPdf){
    o = o || getOrcamentoForm();
    if (!o || !o.nome) { alert('Preencha o nome do cliente antes de enviar.'); return; }
    if (!limparNumero(o.telefone)) { alert('Preencha o telefone do cliente no orçamento.'); return; }
    if (gerarPdf && typeof window.gerarPdfOrcamento === 'function') {
      try { window.gerarPdfOrcamento(o); } catch(e) { console.warn(e); }
    }
    window.open(whatsappUrl(o.telefone, montarMensagem(o)), '_blank', 'noopener');
  }
  window.rtAbrirWhatsappOrcamento = abrirWhatsappOrcamento;

  function instalarBotaoModal(){
    const btn = document.getElementById('enviarWhatsappOrcamento');
    if (btn && !btn.dataset.rtWaBound) {
      btn.dataset.rtWaBound = '1';
      btn.addEventListener('click', () => abrirWhatsappOrcamento(getOrcamentoForm(), false));
    }
  }
  function instalarBotoesLista(){
    document.querySelectorAll('#orcamentosTbody tr').forEach(tr => {
      const actions = tr.querySelector('.orc-actions-row');
      if (!actions || actions.querySelector('[data-wa-orc-lista]')) return;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn-outline btn-mini';
      btn.textContent = '💬';
      btn.title = 'Abrir WhatsApp com a mensagem configurada para orçamento.';
      btn.setAttribute('data-wa-orc-lista','1');
      btn.addEventListener('click', () => {
        const tds = tr.querySelectorAll('td');
        const o = {
          numero: tds[1]?.textContent.trim(),
          data_evento: tds[2]?.textContent.trim(),
          nome: tds[3]?.textContent.trim(),
          telefone: tds[4]?.textContent.trim(),
          endereco: tds[5]?.textContent.trim(),
          materiais: [{quantidade:'', descricao:tds[6]?.textContent.trim()}],
          valor_total: Number(String(tds[7]?.textContent || '').replace(/[^\d,]/g,'').replace(',','.')) || 0
        };
        abrirWhatsappOrcamento(o, false);
      });
      const pdf = actions.querySelector('[data-pdf-orc]');
      if (pdf && pdf.nextSibling) actions.insertBefore(btn, pdf.nextSibling); else actions.appendChild(btn);
    });
  }
  function filtrarOrcamentoDosModelosEvento(){
    if (typeof window.rtEventoWhatsappModelosAtivos === 'function' && !window.rtEventoWhatsappModelosAtivos.__rtSemOrcamento) {
      const original = window.rtEventoWhatsappModelosAtivos;
      window.rtEventoWhatsappModelosAtivos = function(){
        return (original.apply(this, arguments) || []).filter(m => m && m.tipo !== 'orcamento' && m.id !== 'orcamento');
      };
      window.rtEventoWhatsappModelosAtivos.__rtSemOrcamento = true;
    }
  }
  function init(){
    instalarBotaoModal();
    instalarBotoesLista();
    filtrarOrcamentoDosModelosEvento();
    const tb = document.getElementById('orcamentosTbody');
    if (tb && !tb.dataset.rtWaObserver) {
      tb.dataset.rtWaObserver = '1';
      new MutationObserver(instalarBotoesLista).observe(tb, {childList:true, subtree:true});
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
  document.addEventListener('click', () => setTimeout(init, 80), true);
})();
