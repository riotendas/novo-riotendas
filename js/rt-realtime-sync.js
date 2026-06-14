// v19-dev-sync-seguro: sincronização Supabase Realtime sem recarregar a tela inteira.
(function () {
  const RT_SYNC_VERSION = "v19-dev-2026-06-13-performance-inteligente";
  let iniciado = false;
  let pendente = false;
  let timer = null;
  let ultimaExecucao = 0;

  function rtUsuarioEditando() {
    const ae = document.activeElement;
    const editandoCampo = ae && ["INPUT", "TEXTAREA", "SELECT"].includes(ae.tagName);
    const modalAberto = !!document.querySelector("dialog[open], .modal.show, .modal.aberto, .rt-modal.aberto");
    const arrastando = !!(window.__rtUsuarioArrastandoRota || document.querySelector(".arrastando, .rota-card-arrastando"));
    return editandoCampo || modalAberto || arrastando;
  }

  window.rtUsuarioEditandoOperacional = rtUsuarioEditando;

  function indicador(mostrar) {
    let el = document.getElementById("rtSyncPendenteIndicador");
    if (!mostrar) { if (el) el.remove(); return; }
    if (!el) {
      el = document.createElement("div");
      el.id = "rtSyncPendenteIndicador";
      el.className = "rt-sync-pendente-indicador";
      el.textContent = "Sincronizando quando a tela estiver parada…";
      document.body.appendChild(el);
    }
  }

  function rtSecaoAtiva(id) {
    const el = document.getElementById(id);
    return !!(el && (el.classList.contains("active") || el.classList.contains("active-section")));
  }

  async function atualizarDadosOperacionais() {
    if (rtUsuarioEditando()) {
      pendente = true;
      indicador(true);
      clearTimeout(timer);
      timer = setTimeout(atualizarDadosOperacionais, 3000);
      return;
    }
    indicador(false);
    pendente = false;
    const agora = Date.now();
    if (agora - ultimaExecucao < 4000) return;
    ultimaExecucao = agora;

    try {
      const eventosAtivo = rtSecaoAtiva("eventosSection");
      const produtosAtivo = rtSecaoAtiva("produtosSection");
      const rotasAtivo = rtSecaoAtiva("rotasSection");
      const ruaAtivo = rtSecaoAtiva("ruaMobileSection");
      const calendarioAtivo = rtSecaoAtiva("calendarioSection");
      const financeiroAtivo = rtSecaoAtiva("financeiroSection");
      const dashboardAtivo = rtSecaoAtiva("dashboardSection");

      const precisaEventos = eventosAtivo || produtosAtivo || rotasAtivo || ruaAtivo || calendarioAtivo || financeiroAtivo || dashboardAtivo;
      const precisaProdutos = produtosAtivo || dashboardAtivo;
      const precisaOperacao = rotasAtivo || ruaAtivo || produtosAtivo;

      if (precisaEventos && typeof buscarEventosBanco === "function") {
        const novosEventos = await buscarEventosBanco();
        if (Array.isArray(novosEventos)) eventos = novosEventos;
      }

      if (precisaProdutos && typeof buscarProdutosBanco === "function") {
        const novosProdutos = await buscarProdutosBanco();
        if (Array.isArray(novosProdutos)) produtos = novosProdutos;
      }

      if (precisaOperacao && typeof carregarRotasOperacaoNuvem === "function") {
        const ops = await carregarRotasOperacaoNuvem();
        if (ops && typeof ops === "object") {
          rotasOperacao = typeof rtRotasOperacaoMesclar === "function" ? rtRotasOperacaoMesclar(rotasOperacao || {}, ops) : ops;
          try { localStorage.setItem("novoRioTendasRotasOperacaoV1", JSON.stringify(rotasOperacao || {})); } catch {}
        }
      }

      // Atualização inteligente: renderiza somente o módulo realmente aberto.
      if (eventosAtivo && typeof renderizarEventos === "function") renderizarEventos();
      if (produtosAtivo && typeof renderizarProdutos === "function") renderizarProdutos();
      if (rotasAtivo && typeof renderizarRotas === "function") renderizarRotas();
      if (ruaAtivo && typeof renderizarRuaMobile === "function") renderizarRuaMobile();
      if (calendarioAtivo && typeof renderizarCalendario === "function") renderizarCalendario();
      if (financeiroAtivo && typeof rtFinAtualizarResumo === "function") rtFinAtualizarResumo();
      if (dashboardAtivo && typeof atualizarDashboard === "function") atualizarDashboard(produtos || []);
    } catch (err) {
      console.warn("Falha na sincronização automática segura:", err);
    }
  }

  function agendarSync() {
    clearTimeout(timer);
    timer = setTimeout(atualizarDadosOperacionais, 900);
  }

  function iniciarRealtimeSeguro() {
    if (iniciado) return;
    iniciado = true;
    try { localStorage.setItem("riotendas_sync_version", RT_SYNC_VERSION); } catch {}
    if (typeof supabaseClient === "undefined" || !supabaseClient || !supabaseClient.channel) return;
    supabaseClient
      .channel("riotendas-operacional-seguro")
      .on("postgres_changes", { event: "*", schema: "public", table: "eventos" }, agendarSync)
      .on("postgres_changes", { event: "*", schema: "public", table: "produtos" }, agendarSync)
      .on("postgres_changes", { event: "*", schema: "public", table: "app_config", filter: "chave=in.(rotas_operacao,rotas_carros,rotas_ordem_manual)" }, agendarSync)
      .subscribe((status) => {
        if (status === "SUBSCRIBED") console.log("RioTendas realtime operacional ativo");
      });
  }

  document.addEventListener("DOMContentLoaded", iniciarRealtimeSeguro);
  window.rtSincronizarOperacionalSeguro = atualizarDadosOperacionais;
})();
