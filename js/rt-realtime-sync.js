// v19-dev: sincronização operacional imediata entre usuários + polling de segurança.
(function () {
  const RT_SYNC_VERSION = "v19-dev-2026-08-25-performance-v5-realtime-cache";
  let iniciado = false;
  let timerDados = null;
  let timerPolling = null;
  let executando = false;
  let ultimaExecucaoDados = 0;
  let ultimaExecucaoOperacional = 0;

  function secaoAtiva(id) {
    const el = document.getElementById(id);
    return !!(el && (el.classList.contains("active") || el.classList.contains("active-section")));
  }

  function moduloOperacionalAtivo() {
    return secaoAtiva("rotasSection") || secaoAtiva("ruaMobileSection") || secaoAtiva("produtosSection");
  }

  function renderOperacional() {
    if (secaoAtiva("rotasSection") && typeof renderizarRotas === "function") renderizarRotas();
    if (secaoAtiva("ruaMobileSection") && typeof renderizarRuaMobile === "function") renderizarRuaMobile();
    if (secaoAtiva("produtosSection") && typeof renderizarProdutos === "function") renderizarProdutos();
  }


  // V5: aplica mudanças de Eventos/Produtos recebidas pelo Realtime diretamente
  // na memória. Evita baixar as tabelas inteiras só para descobrir uma alteração.
  function rtPatchListaPorId(lista, payload) {
    const atual = Array.isArray(lista) ? lista.slice() : [];
    const evento = String(payload?.eventType || payload?.event || '').toUpperCase();
    const novo = payload?.new || null;
    const antigo = payload?.old || null;
    const id = String((novo && novo.id) ?? (antigo && antigo.id) ?? '');
    if (!id) return atual;
    const idx = atual.findIndex(x => String(x?.id) === id);
    if (evento === 'DELETE') {
      if (idx >= 0) atual.splice(idx, 1);
      return atual;
    }
    if (!novo || typeof novo !== 'object') return atual;
    if (idx >= 0) atual[idx] = { ...atual[idx], ...novo };
    else atual.push(novo);
    return atual;
  }

  let rtTimerRenderEventosRealtime = null;
  function rtRenderEventosRealtime() {
    clearTimeout(rtTimerRenderEventosRealtime);
    rtTimerRenderEventosRealtime = setTimeout(() => {
      try { if (secaoAtiva('eventosSection') && typeof renderizarEventos === 'function') renderizarEventos(); } catch {}
      try { if (secaoAtiva('eventosMobileSection') && typeof renderizarEventosMobile === 'function') renderizarEventosMobile(); } catch {}
      try { if (secaoAtiva('calendarioSection') && typeof renderizarCalendario === 'function') renderizarCalendario(); } catch {}
      try { if (secaoAtiva('rotasSection') && typeof renderizarRotas === 'function') renderizarRotas(); } catch {}
      try { if (secaoAtiva('ruaMobileSection') && typeof renderizarRuaMobile === 'function') renderizarRuaMobile(); } catch {}
      try { if (secaoAtiva('financeiroSection') && typeof rtFinAtualizarResumo === 'function') rtFinAtualizarResumo(); } catch {}
      try { if (secaoAtiva('dashboardSection') && typeof renderizarDashboardEventos === 'function') renderizarDashboardEventos(); } catch {}
    }, 80);
  }

  function aoMudarEvento(payload) {
    try {
      if (typeof eventos !== 'undefined') {
        eventos = rtPatchListaPorId(eventos, payload);
        try { localStorage.setItem('novoRioTendasEventosV2', JSON.stringify(eventos)); } catch {}
        try {
          if (typeof rtEventosCacheBanco !== 'undefined') rtEventosCacheBanco = eventos.slice();
          if (typeof rtEventosCacheBancoTs !== 'undefined') rtEventosCacheBancoTs = Date.now();
        } catch {}
        rtRenderEventosRealtime();
      }
    } catch (err) { console.warn('Falha ao aplicar evento realtime:', err); }
  }

  let rtTimerRenderProdutosRealtime = null;
  function aoMudarProduto(payload) {
    try {
      if (typeof produtos !== 'undefined') {
        produtos = rtPatchListaPorId(produtos, payload);
        try { localStorage.setItem('novoRioTendasProdutosV1', JSON.stringify(produtos)); } catch {}
        try {
          if (typeof rtProdutosCacheBanco !== 'undefined') rtProdutosCacheBanco = produtos.slice();
          if (typeof rtProdutosCacheBancoTs !== 'undefined') rtProdutosCacheBancoTs = Date.now();
        } catch {}
        clearTimeout(rtTimerRenderProdutosRealtime);
        rtTimerRenderProdutosRealtime = setTimeout(() => {
          try { if (secaoAtiva('produtosSection') && typeof renderizarProdutos === 'function') renderizarProdutos(); } catch {}
          try { if (secaoAtiva('manutencaoMobileSection') && typeof renderizarManutencaoMobile === 'function') renderizarManutencaoMobile(); } catch {}
          try { if (secaoAtiva('dashboardSection') && typeof atualizarDashboard === 'function') atualizarDashboard(produtos || []); } catch {}
        }, 80);
      }
    } catch (err) { console.warn('Falha ao aplicar produto realtime:', err); }
  }

  function salvarLocal(chave, valor) {
    try { localStorage.setItem(chave, JSON.stringify(valor || {})); } catch {}
  }

  function aplicarOperacaoRecebida(valor) {
    if (!valor || typeof valor !== "object") return;
    const anterior = JSON.stringify(window.rotasOperacao || rotasOperacao || {});
    const atual = typeof rtRotasOperacaoMesclar === "function"
      ? rtRotasOperacaoMesclar((typeof rotasOperacao !== "undefined" ? rotasOperacao : {}), valor)
      : valor;
    if (typeof rotasOperacao !== "undefined") rotasOperacao = atual;
    salvarLocal("novoRioTendasRotasOperacaoV1", atual);
    if (JSON.stringify(atual) !== anterior) renderOperacional();
  }

  function aplicarCarrosRecebidos(valor) {
    if (!valor || typeof valor !== "object") return;
    if (typeof rtEdicaoManualRecenteCarrosRotas === "function" && rtEdicaoManualRecenteCarrosRotas()) return;
    const atual = typeof rotasCarros !== "undefined" ? (rotasCarros || {}) : {};
    const mesclado = { ...atual, ...valor };
    if (JSON.stringify(mesclado) === JSON.stringify(atual)) return;
    if (typeof rotasCarros !== "undefined") rotasCarros = mesclado;
    salvarLocal("novoRioTendasRotasCarrosV1", mesclado);
    renderOperacional();
  }

  function aplicarOrdemRecebida(valor, atualizadoEm) {
    if (!valor || typeof valor !== "object") return;
    if (typeof rtEdicaoManualRecenteOrdemRotas === "function" && rtEdicaoManualRecenteOrdemRotas()) return;
    const remotoTs = atualizadoEm ? new Date(atualizadoEm).getTime() : Date.now();
    const localTs = typeof rtTimestampOrdemLocal === "function" ? rtTimestampOrdemLocal() : 0;
    if (remotoTs && localTs && remotoTs < localTs) return;
    const atual = typeof rotasOrdemManual !== "undefined" ? (rotasOrdemManual || {}) : {};
    const mesclado = { ...atual, ...valor };
    if (JSON.stringify(mesclado) === JSON.stringify(atual)) return;
    if (typeof rotasOrdemManual !== "undefined") rotasOrdemManual = mesclado;
    salvarLocal("rotas_ordem_manual", mesclado);
    if (typeof rtSetTimestampOrdemLocal === "function") rtSetTimestampOrdemLocal(remotoTs || Date.now());
    renderOperacional();
  }

  async function sincronizarOperacionalAgora(forcar = false) {
    if (!moduloOperacionalAtivo() && !forcar) return;
    if (!forcar && typeof window.rtUsuarioEditandoOperacional === "function" && window.rtUsuarioEditandoOperacional()) return;
    const agora = Date.now();
    if (!forcar && agora - ultimaExecucaoOperacional < 1200) return;
    ultimaExecucaoOperacional = agora;
    try {
      const tarefas = [];
      if (typeof carregarRotasOperacaoNuvem === "function") tarefas.push(carregarRotasOperacaoNuvem().then(aplicarOperacaoRecebida));
      if (typeof carregarRotasCarrosNuvem === "function") tarefas.push(carregarRotasCarrosNuvem().then(aplicarCarrosRecebidos));
      if (typeof carregarRotasOrdemNuvem === "function") tarefas.push(carregarRotasOrdemNuvem().then(n => n && aplicarOrdemRecebida(n.valor, n.atualizadoEm)));
      await Promise.allSettled(tarefas);
    } catch (err) {
      console.warn("Falha na sincronização operacional imediata:", err);
    }
  }

  async function atualizarDadosGerais() {
    if (executando) return;
    const agora = Date.now();
    if (agora - ultimaExecucaoDados < 1200) return;
    ultimaExecucaoDados = agora;
    executando = true;
    try {
      const eventosAtivo = secaoAtiva("eventosSection");
      const produtosAtivo = secaoAtiva("produtosSection");
      const rotasAtivo = secaoAtiva("rotasSection");
      const ruaAtivo = secaoAtiva("ruaMobileSection");
      const calendarioAtivo = secaoAtiva("calendarioSection");
      const financeiroAtivo = secaoAtiva("financeiroSection");
      const dashboardAtivo = secaoAtiva("dashboardSection");
      // Dashboard não força download completo a cada mudança de app_config.
      // Ele atualiza ao abrir ou pelo cache da seção.
      const precisaEventos = eventosAtivo || produtosAtivo || rotasAtivo || ruaAtivo || calendarioAtivo || financeiroAtivo;
      if (precisaEventos && typeof buscarEventosBanco === "function") {
        const novos = await buscarEventosBanco();
        if (Array.isArray(novos)) eventos = novos;
      }
      if (produtosAtivo && typeof buscarProdutosBanco === "function") {
        const novos = await buscarProdutosBanco();
        if (Array.isArray(novos)) produtos = novos;
      }
      await sincronizarOperacionalAgora(true);
      if (eventosAtivo && typeof renderizarEventos === "function") renderizarEventos();
      if (calendarioAtivo && typeof renderizarCalendario === "function") renderizarCalendario();
      if (financeiroAtivo && typeof rtFinAtualizarResumo === "function") rtFinAtualizarResumo();
      if (dashboardAtivo && typeof atualizarDashboard === "function") atualizarDashboard(produtos || []);
    } catch (err) {
      console.warn("Falha na sincronização geral:", err);
    } finally {
      executando = false;
    }
  }

  function agendarDados() {
    clearTimeout(timerDados);
    timerDados = setTimeout(atualizarDadosGerais, 250);
  }

  function aoMudarAppConfig(payload) {
    const novo = payload && payload.new ? payload.new : {};
    const chave = String(novo.chave || "");
    // Realtime invalida somente a chave afetada. Assim os TTLs podem ser longos
    // sem atrasar mudanças feitas por outros usuários.
    try {
      if (typeof window.rtInvalidarCachePerformance === "function") {
        if (chave === "rotas_operacao") window.rtInvalidarCachePerformance("carregarRotasOperacaoNuvem");
        else if (chave === "rotas_carros") window.rtInvalidarCachePerformance("carregarRotasCarrosNuvem");
        else if (chave === "rotas_ordem_manual") window.rtInvalidarCachePerformance("carregarRotasOrdemNuvem");
        else if (chave === "configuracoes") window.rtInvalidarCachePerformance("carregarConfiguracoesNuvem");
      }
      if (chave === "configuracoes" && typeof window.rtInvalidarConfigNuvemCache === "function") {
        window.rtInvalidarConfigNuvemCache();
      }
      if (typeof window.rtInvalidarRotasAppConfigCache === "function" &&
          ["rotas_operacao","rotas_carros","rotas_ordem_manual"].includes(chave)) {
        window.rtInvalidarRotasAppConfigCache(chave);
      }
    } catch {}
    if (chave === "rotas_operacao") aplicarOperacaoRecebida(novo.valor);
    else if (chave === "rotas_carros") aplicarCarrosRecebidos(novo.valor);
    else if (chave === "rotas_ordem_manual") aplicarOrdemRecebida(novo.valor, novo.atualizado_em);
    else agendarDados();
  }

  function iniciarPolling() {
    clearInterval(timerPolling);
    timerPolling = setInterval(() => {
      if (document.visibilityState === "visible" && moduloOperacionalAtivo()) sincronizarOperacionalAgora();
    }, 300000);
  }

  function iniciar() {
    if (iniciado) return;
    iniciado = true;
    try { localStorage.setItem("riotendas_sync_version", RT_SYNC_VERSION); } catch {}
    if (typeof supabaseClient !== "undefined" && supabaseClient && supabaseClient.channel) {
      supabaseClient
        .channel("riotendas-operacional-imediato-v2")
        // Eventos e produtos não disparam mais recarga completa automática.
        // Isso evita baixar tabelas inteiras a cada pequena alteração e reduz fortemente o Egress.
        .on("postgres_changes", { event: "*", schema: "public", table: "app_config" }, aoMudarAppConfig)
        .on("postgres_changes", { event: "*", schema: "public", table: "eventos" }, aoMudarEvento)
        .on("postgres_changes", { event: "*", schema: "public", table: "produtos" }, aoMudarProduto)
        .subscribe(status => {
          if (status === "SUBSCRIBED") {
            console.log("RioTendas realtime operacional imediato ativo");
            sincronizarOperacionalAgora(false);
          }
        });
    }
    iniciarPolling();
    window.addEventListener("focus", () => sincronizarOperacionalAgora(false));
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") sincronizarOperacionalAgora(false);
    });
  }

  document.addEventListener("DOMContentLoaded", iniciar);
  window.rtSincronizarOperacionalSeguro = () => atualizarDadosGerais();
  window.rtSincronizarOperacionalAgora = sincronizarOperacionalAgora;
})();
