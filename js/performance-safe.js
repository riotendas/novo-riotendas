/* =====================================================
   RioTendas v19 - Performance Lazy + Cache v2
   Objetivos:
   - tela responde ao clique antes de buscar dados;
   - evita SELECTs duplicados/simultâneos;
   - app_config/usuários/rotas usam cache curto em memória;
   - módulos pesados só carregam ao serem abertos;
   - mantém a mesma estrutura SPA e todas as funções existentes.
===================================================== */
(function () {
  if (window.__rtPerformanceLazyCacheV2) return;
  window.__rtPerformanceLazyCacheV2 = true;

  const cache = new Map();
  const emAndamento = new Map();
  const carregamentoSecao = new Map();
  const ultimaCargaSecao = new Map();

  function chaveArgs(nome, args) {
    let sufixo = "";
    try { sufixo = JSON.stringify(args || []); } catch { sufixo = String(args?.length || 0); }
    return `${nome}:${sufixo}`;
  }

  function envolverCache(nome, ttlMs, opcoes = {}) {
    const original = window[nome];
    if (typeof original !== "function" || original.__rtCacheV1) return;

    async function otimizada(...args) {
      const forcar = opcoes.forceArgIndex != null && args[opcoes.forceArgIndex] === true;
      const key = opcoes.keyByArgs === false ? nome : chaveArgs(nome, args);
      const agora = Date.now();
      const item = cache.get(key);

      if (!forcar && item && agora - item.ts < ttlMs) return item.valor;
      if (!forcar && emAndamento.has(key)) return emAndamento.get(key);

      const promessa = Promise.resolve().then(() => original.apply(this, args));
      emAndamento.set(key, promessa);
      try {
        const valor = await promessa;
        if (valor !== undefined && valor !== null) cache.set(key, { valor, ts: Date.now() });
        return valor;
      } finally {
        if (emAndamento.get(key) === promessa) emAndamento.delete(key);
      }
    }

    otimizada.__rtCacheV1 = true;
    otimizada.__rtOriginal = original;
    window[nome] = otimizada;
  }

  function invalidarPorPrefixo(prefixo) {
    [...cache.keys()].forEach(k => { if (k.startsWith(prefixo)) cache.delete(k); });
  }
  window.rtInvalidarCachePerformance = invalidarPorPrefixo;

  // Dados quase estáticos / app_config. TTLs curtos o bastante para operação multiusuário,
  // mas longos o bastante para eliminar dezenas de SELECTs idênticos em sequência.
  envolverCache("buscarUsuariosSistemaBanco", 10 * 60 * 1000, { keyByArgs: false });
  envolverCache("carregarConfiguracoesNuvem", 15 * 60 * 1000, { keyByArgs: false });
  envolverCache("carregarRotasOperacaoNuvem", 10 * 60 * 1000, { keyByArgs: false });
  envolverCache("carregarRotasCarrosNuvem", 10 * 60 * 1000, { keyByArgs: false });
  envolverCache("carregarRotasOrdemNuvem", 10 * 60 * 1000, { keyByArgs: false });
  envolverCache("rtNotasCarregarNuvem", 5 * 60 * 1000, { keyByArgs: false });

  // As funções abaixo já possuem cache próprio; aqui protegemos apenas chamadas concorrentes.
  envolverCache("carregarEventos", 1500, { keyByArgs: false });
  envolverCache("carregarClientes", 3000, { keyByArgs: false });
  envolverCache("carregarProdutos", 3000, { forceArgIndex: 0 });
  envolverCache("sincronizarRotasOperacaoNuvem", 2500, { keyByArgs: false });
  envolverCache("sincronizarRotasCarrosNuvem", 2500, { keyByArgs: false });
  envolverCache("sincronizarRotasOrdemNuvem", 2500, { keyByArgs: false });
  envolverCache("rtNotasSincronizarNuvem", 2500, { keyByArgs: false });

  // Invalidar caches correspondentes quando houver gravação.
  [
    ["salvarConfiguracoesNuvem", "carregarConfiguracoesNuvem"],
    ["salvarRotasOperacaoNuvem", "carregarRotasOperacaoNuvem"],
    ["salvarRotasCarrosNuvem", "carregarRotasCarrosNuvem"],
    ["salvarRotasOrdemNuvem", "carregarRotasOrdemNuvem"],
    ["salvarUsuarioSistemaBanco", "buscarUsuariosSistemaBanco"],
    ["excluirUsuarioSistemaBanco", "buscarUsuariosSistemaBanco"]
  ].forEach(([nomeSalvar, prefixo]) => {
    const original = window[nomeSalvar];
    if (typeof original !== "function" || original.__rtInvalidacaoV1) return;
    const fn = async function(...args) {
      const r = await original.apply(this, args);
      invalidarPorPrefixo(prefixo);
      return r;
    };
    fn.__rtInvalidacaoV1 = true;
    window[nomeSalvar] = fn;
  });

  function secaoAtiva() {
    return document.querySelector(".section.active-section, .section.active")?.id || "dashboardSection";
  }

  function mostrarCarregando(sectionId, texto = "Atualizando dados…") {
    const sec = document.getElementById(sectionId);
    if (!sec || sec.querySelector(".rt-performance-loading")) return;
    const aviso = document.createElement("div");
    aviso.className = "rt-performance-loading";
    aviso.textContent = texto;
    aviso.style.cssText = "position:sticky;top:4px;z-index:20;margin:4px 0 8px;padding:6px 10px;border-radius:8px;background:rgba(255,255,255,.92);box-shadow:0 1px 5px rgba(0,0,0,.12);font-size:12px;width:max-content;max-width:100%;";
    sec.prepend(aviso);
  }
  function ocultarCarregando(sectionId) {
    document.getElementById(sectionId)?.querySelectorAll(".rt-performance-loading").forEach(el => el.remove());
  }

  async function carregarOperacional() {
    const tarefas = [];
    if (typeof window.sincronizarRotasCarrosNuvem === "function") tarefas.push(window.sincronizarRotasCarrosNuvem());
    if (typeof window.sincronizarRotasOrdemNuvem === "function") tarefas.push(window.sincronizarRotasOrdemNuvem());
    if (typeof window.sincronizarRotasOperacaoNuvem === "function") tarefas.push(window.sincronizarRotasOperacaoNuvem(false));
    if (typeof window.rtNotasSincronizarNuvem === "function") tarefas.push(window.rtNotasSincronizarNuvem(false));
    await Promise.allSettled(tarefas);
  }

  async function executarCargaSecao(sectionId) {
    switch (sectionId) {
      case "dashboardSection": {
        // Stale-while-revalidate: mostra cache local imediatamente e atualiza em segundo plano.
        try {
          const pLocal = JSON.parse(localStorage.getItem("novoRioTendasProdutosV1") || "[]");
          if (typeof window.atualizarDashboard === "function" && Array.isArray(pLocal)) window.atualizarDashboard(pLocal);
        } catch {}
        if (typeof window.renderizarDashboardEventos === "function") {
          try { await window.renderizarDashboardEventos(); } catch {}
        }
        const tarefas = [];
        if (typeof window.carregarEventos === "function") tarefas.push(window.carregarEventos());
        if (typeof window.carregarProdutos === "function") tarefas.push(window.carregarProdutos());
        await Promise.allSettled(tarefas);
        try {
          const pAtual = JSON.parse(localStorage.getItem("novoRioTendasProdutosV1") || "[]");
          if (typeof window.atualizarDashboard === "function" && Array.isArray(pAtual)) window.atualizarDashboard(pAtual);
        } catch {}
        if (typeof window.renderizarDashboardEventos === "function") await window.renderizarDashboardEventos();
        if (!window.__rtDashboardAlertasIniciados && typeof window.iniciarDashboardAlertasPersonalizados === "function") {
          window.__rtDashboardAlertasIniciados = true;
          await window.iniciarDashboardAlertasPersonalizados();
        } else if (typeof window.renderizarDashboardAlertas === "function") {
          await window.renderizarDashboardAlertas();
        }
        break;
      }
      case "eventosSection":
      case "eventosMobileSection":
      case "calendarioSection": {
        // Primeiro paint usa memória/cache atual; Supabase atualiza em segundo plano.
        if (sectionId === "eventosSection" && typeof window.renderizarEventos === "function") requestAnimationFrame(() => window.renderizarEventos());
        if (sectionId === "eventosMobileSection" && typeof window.renderizarEventosMobile === "function") requestAnimationFrame(() => window.renderizarEventosMobile());
        if (sectionId === "calendarioSection" && typeof window.renderizarCalendario === "function") requestAnimationFrame(() => window.renderizarCalendario());
        if (typeof window.carregarEventos === "function") await window.carregarEventos();
        if (sectionId === "eventosSection" && typeof window.renderizarEventos === "function") window.renderizarEventos();
        if (sectionId === "eventosMobileSection" && typeof window.renderizarEventosMobile === "function") window.renderizarEventosMobile();
        if (sectionId === "calendarioSection" && typeof window.renderizarCalendario === "function") window.renderizarCalendario();
        break;
      }
      case "clientesSection":
        if (typeof window.renderizarClientes === "function") requestAnimationFrame(() => window.renderizarClientes());
        if (typeof window.carregarClientes === "function") await window.carregarClientes();
        if (typeof window.renderizarClientes === "function") window.renderizarClientes();
        break;
      case "produtosSection":
      case "manutencaoMobileSection": {
        if (sectionId === "produtosSection" && typeof window.renderizarProdutos === "function") requestAnimationFrame(() => window.renderizarProdutos());
        if (sectionId === "manutencaoMobileSection" && typeof window.renderizarManutencaoMobile === "function") requestAnimationFrame(() => window.renderizarManutencaoMobile());
        const tarefas = [];
        if (typeof window.carregarProdutos === "function") tarefas.push(window.carregarProdutos());
        if (typeof window.carregarEventosDisponibilidadeProduto === "function") tarefas.push(window.carregarEventosDisponibilidadeProduto());
        await Promise.allSettled(tarefas);
        if (sectionId === "produtosSection" && typeof window.renderizarProdutos === "function") window.renderizarProdutos();
        if (sectionId === "manutencaoMobileSection" && typeof window.renderizarManutencaoMobile === "function") window.renderizarManutencaoMobile();
        break;
      }
      case "rotasSection":
      case "ruaMobileSection": {
        // Mostra imediatamente o último estado conhecido. Rede não bloqueia a abertura da tela.
        if (sectionId === "rotasSection" && typeof window.renderizarRotas === "function") window.renderizarRotas();
        if (sectionId === "ruaMobileSection" && typeof window.renderizarRuaMobile === "function") window.renderizarRuaMobile();
        await Promise.allSettled([
          typeof window.carregarEventos === "function" ? window.carregarEventos() : Promise.resolve(),
          carregarOperacional()
        ]);
        if (typeof window.ruaMobileInvalidarRotasBase === "function") window.ruaMobileInvalidarRotasBase();
        if (sectionId === "rotasSection" && typeof window.renderizarRotas === "function") window.renderizarRotas();
        if (sectionId === "ruaMobileSection" && typeof window.renderizarRuaMobile === "function") window.renderizarRuaMobile();
        break;
      }
      case "configSection": {
        if (typeof window.sincronizarConfiguracoesNuvem === "function") await window.sincronizarConfiguracoesNuvem();
        if (typeof window.montarPainelLogsSistema === "function") window.montarPainelLogsSistema();
        break;
      }
      case "usuariosSection":
        // Usuários é administrado somente por Configurações > Usuários.
        break;
      case "financeiroSection": {
        // Mostra primeiro o que já existe em memória; rede entra em paralelo e não bloqueia o clique.
        if (typeof window.rtFinRenderTudoFase1 === "function") requestAnimationFrame(() => window.rtFinRenderTudoFase1());
        const tarefas = [];
        if (typeof window.carregarEventos === "function") tarefas.push(window.carregarEventos());
        if (typeof window.rtFinAuditoriaCarregarNuvem === "function") tarefas.push(window.rtFinAuditoriaCarregarNuvem());
        if (typeof window.rtFinCarregarExtratoSalvo === "function") tarefas.push(window.rtFinCarregarExtratoSalvo());
        await Promise.allSettled(tarefas);
        if (typeof window.rtFinRenderTudoFase1 === "function") window.rtFinRenderTudoFase1();
        if (typeof window.rtFinRenderPagamentosNaoLocalizados === "function") window.rtFinRenderPagamentosNaoLocalizados();
        break;
      }
      case "relatoriosSection":
        if (typeof window.renderizarRelatorioChecagem === "function") window.renderizarRelatorioChecagem();
        break;
      case "orcamentosSection":
        if (typeof window.carregarOrcamentos === "function") await window.carregarOrcamentos();
        break;
      default:
        break;
    }
  }

  async function rtCarregarSecaoOtimizada(sectionId, forcar = false) {
    if (!sectionId) return;
    const agora = Date.now();
    const ttlSecao = sectionId === "rotasSection" || sectionId === "ruaMobileSection" ? 10_000 : 45_000;
    if (!forcar && ultimaCargaSecao.get(sectionId) && agora - ultimaCargaSecao.get(sectionId) < ttlSecao) return;
    if (carregamentoSecao.has(sectionId)) return carregamentoSecao.get(sectionId);

    mostrarCarregando(sectionId);
    const p = (async () => {
      try {
        await executarCargaSecao(sectionId);
        ultimaCargaSecao.set(sectionId, Date.now());
      } catch (err) {
        console.warn("Carga otimizada da seção falhou:", sectionId, err);
      } finally {
        ocultarCarregando(sectionId);
      }
    })();
    carregamentoSecao.set(sectionId, p);
    try { await p; } finally { carregamentoSecao.delete(sectionId); }
  }

  window.rtCarregarSecaoOtimizada = rtCarregarSecaoOtimizada;
  window.rtCarregarDadosSecaoAtiva = () => {
    const id = secaoAtiva();
    // Deixa a interface pintar primeiro; rede entra logo depois.
    setTimeout(() => rtCarregarSecaoOtimizada(id), 60);
  };

  // Troca visual realmente imediata: a aba muda ainda na fase de captura,
  // antes de qualquer rotina de rede/renderização ligada ao clique.
  function rtMostrarSecaoImediata(sectionId) {
    if (!sectionId) return false;
    const sec = document.getElementById(sectionId);
    if (!sec) return false;

    document.querySelectorAll(".section").forEach(s => {
      if (s !== sec) {
        s.classList.remove("active", "active-section");
        // Limpa possíveis displays inline herdados de regras antigas de permissão.
        if (s.style && s.style.display === "block") s.style.display = "";
      }
    });
    document.querySelectorAll(".tab-btn[data-section]").forEach(b => {
      b.classList.toggle("active", b.dataset.section === sectionId);
    });
    sec.style.display = "";
    sec.classList.add("active", "active-section");
    return true;
  }
  window.rtMostrarSecaoImediata = rtMostrarSecaoImediata;

  // Dados entram depois do primeiro paint, sem segurar a resposta do botão.
  document.addEventListener("click", (ev) => {
    const botao = ev.target?.closest?.(".tab-btn[data-section], [data-mobile-open]");
    const destino = botao?.dataset?.section || botao?.dataset?.mobileOpen || "";
    if (!destino) return;
    rtMostrarSecaoImediata(destino);
    requestAnimationFrame(() => {
      setTimeout(() => rtCarregarSecaoOtimizada(destino), 0);
    });
  }, true);

  // Assets grandes continuam sob demanda.
  const assets = new Map();
  function carregarScriptUmaVez(chave, src, teste) {
    if (typeof teste === "function" && teste()) return Promise.resolve(true);
    if (assets.has(chave)) return assets.get(chave);
    const promessa = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = src; script.async = true; script.dataset.rtAsset = chave;
      script.onload = () => resolve(true);
      script.onerror = () => reject(new Error(`Falha ao carregar ${chave}`));
      document.head.appendChild(script);
    });
    assets.set(chave, promessa);
    return promessa;
  }
  window.rtGarantirLeaflet = () => carregarScriptUmaVez("leaflet", "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js", () => !!window.L);
  window.rtGarantirXLSX = () => carregarScriptUmaVez("xlsx", "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js", () => !!window.XLSX);

  document.addEventListener("click", (ev) => {
    const botao = ev.target?.closest?.(".tab-btn[data-section], [data-mobile-open]");
    const destino = botao?.dataset?.section || botao?.dataset?.mobileOpen || "";
    if (destino === "mapaSection") setTimeout(() => window.rtGarantirLeaflet().catch(() => {}), 30);
    if (destino === "configSection") setTimeout(() => window.rtGarantirXLSX().catch(() => {}), 1200);
  }, true);

  document.addEventListener("DOMContentLoaded", () => {
    // Se já existe sessão, inicia apenas a seção visível, depois do primeiro paint.
    setTimeout(() => {
      const app = document.getElementById("appScreen");
      if (app && !app.classList.contains("hidden")) window.rtCarregarDadosSecaoAtiva();
    }, 120);
  });
})();
