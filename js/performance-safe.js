/* =====================================================
   v19-dev-2026-08-06 - Desempenho global
   - Deduplica cargas concorrentes de Eventos, Clientes e Produtos.
   - Evita nova consulta poucos segundos após uma carga concluída.
   - Carrega Leaflet e XLSX apenas quando suas telas forem abertas.
===================================================== */
(function () {
  if (window.__rtPerformanceGlobalV2) return;
  window.__rtPerformanceGlobalV2 = true;

  const estado = new Map();

  function deduplicarFuncao(nome, intervaloMs) {
    const original = window[nome];
    if (typeof original !== "function" || original.__rtDeduplicada) return;

    async function protegida(...args) {
      const agora = Date.now();
      const atual = estado.get(nome) || { promessa: null, ultima: 0, resultado: undefined };

      if (atual.promessa) return atual.promessa;
      if (!args.some(Boolean) && atual.ultima && agora - atual.ultima < intervaloMs) {
        return atual.resultado;
      }

      atual.promessa = Promise.resolve().then(() => original.apply(this, args));
      estado.set(nome, atual);
      try {
        atual.resultado = await atual.promessa;
        atual.ultima = Date.now();
        return atual.resultado;
      } finally {
        atual.promessa = null;
        estado.set(nome, atual);
      }
    }

    protegida.__rtDeduplicada = true;
    protegida.__rtOriginal = original;
    window[nome] = protegida;
  }

  [
    ["carregarEventos", 3500],
    ["carregarClientes", 5000],
    ["carregarProdutos", 5000],
    ["sincronizarRotasOperacaoNuvem", 2500],
    ["sincronizarRotasCarrosNuvem", 2500],
    ["sincronizarRotasOrdemNuvem", 2500],
    ["rtNotasSincronizarNuvem", 2500]
  ].forEach(([nome, tempo]) => deduplicarFuncao(nome, tempo));

  const assets = new Map();
  function carregarScriptUmaVez(chave, src, teste) {
    if (typeof teste === "function" && teste()) return Promise.resolve(true);
    if (assets.has(chave)) return assets.get(chave);
    const promessa = new Promise((resolve, reject) => {
      const existente = document.querySelector(`script[data-rt-asset="${chave}"]`);
      if (existente) {
        existente.addEventListener("load", () => resolve(true), { once: true });
        existente.addEventListener("error", reject, { once: true });
        return;
      }
      const script = document.createElement("script");
      script.src = src;
      script.async = true;
      script.dataset.rtAsset = chave;
      script.onload = () => resolve(true);
      script.onerror = () => reject(new Error(`Falha ao carregar ${chave}`));
      document.head.appendChild(script);
    });
    assets.set(chave, promessa);
    return promessa;
  }

  window.rtGarantirLeaflet = () => carregarScriptUmaVez(
    "leaflet",
    "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js",
    () => typeof window.L !== "undefined"
  );

  window.rtGarantirXLSX = () => carregarScriptUmaVez(
    "xlsx",
    "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js",
    () => typeof window.XLSX !== "undefined"
  );

  document.addEventListener("click", (ev) => {
    const botao = ev.target?.closest?.(".tab-btn[data-section], [data-mobile-open]");
    const destino = botao?.dataset?.section || botao?.dataset?.mobileOpen || "";
    if (destino === "mapaSection") {
      window.rtGarantirLeaflet().then(() => {
        if (typeof window.renderizarMapaOperacional === "function") window.renderizarMapaOperacional(false);
      }).catch(err => console.warn("Mapa indisponível:", err));
    }
    if (destino === "configSection") {
      // Antecipação discreta: estará pronto quando o usuário escolher importar/exportar.
      setTimeout(() => window.rtGarantirXLSX().catch(() => {}), 700);
    }
  }, true);
})();

/* =====================================================
   v19-dev - Otimização segura sem separar HTML
   Mantém index único, mas evita renderizações repetidas.
===================================================== */

(function () {
  const timers = {};
  const ultimaExecucao = {};

  window.debounceRioTendas = function debounceRioTendas(chave, fn, delay = 120) {
    clearTimeout(timers[chave]);
    timers[chave] = setTimeout(() => {
      try { fn(); } catch (erro) { console.warn("Erro debounce:", chave, erro); }
    }, delay);
  };

  window.throttleRioTendas = function throttleRioTendas(chave, fn, intervalo = 350) {
    const agora = Date.now();
    if (ultimaExecucao[chave] && agora - ultimaExecucao[chave] < intervalo) return;

    ultimaExecucao[chave] = agora;
    try { fn(); } catch (erro) { console.warn("Erro throttle:", chave, erro); }
  };

  function atualizarModuloAoAbrir(sectionId) {
    if (!sectionId) return;

    // Atualizações leves só quando a aba correspondente for aberta.
    if (sectionId === "produtosSection") {
      debounceRioTendas("refresh-produtos-aba", async () => {
        if (typeof carregarEventosDisponibilidadeProduto === "function") {
          await carregarEventosDisponibilidadeProduto();
        }
        if (typeof renderizarProdutos === "function") renderizarProdutos();
      }, 80);
    }

    if (sectionId === "eventosSection") {
      debounceRioTendas("refresh-eventos-aba", async () => {
        if (typeof carregarEventos === "function") await carregarEventos();
        if (typeof renderizarEventos === "function") renderizarEventos();
      }, 80);
    }

    if (sectionId === "clientesSection") {
      debounceRioTendas("refresh-clientes-aba", async () => {
        if (typeof carregarClientes === "function") await carregarClientes();
        if (typeof renderizarClientes === "function") renderizarClientes();
      }, 80);
    }

    if (sectionId === "rotasSection") {
      debounceRioTendas("refresh-rotas-aba", async () => {
        if (typeof carregarEventos === "function") await carregarEventos();
        if (typeof renderizarRotas === "function") renderizarRotas();
      }, 80);
    }

    if (sectionId === "configSection") {
      debounceRioTendas("refresh-config-aba", () => {
        if (typeof montarPainelLogsSistema === "function") montarPainelLogsSistema();
        if (typeof renderizarLogsSistema === "function") renderizarLogsSistema();
      }, 120);
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".tab-btn[data-section]").forEach(btn => {
      btn.addEventListener("click", () => atualizarModuloAoAbrir(btn.dataset.section));
    });
  });

  // Evento global já usado por eventos/rotas/produtos.
  window.addEventListener("riotendas:eventos-atualizados", () => {
    debounceRioTendas("eventos-atualizados-global", async () => {
      const produtosAtivo = document.getElementById("produtosSection")?.classList.contains("active") ||
        document.getElementById("produtosSection")?.classList.contains("active-section");

      const rotasAtivo = document.getElementById("rotasSection")?.classList.contains("active") ||
        document.getElementById("rotasSection")?.classList.contains("active-section");

      if (produtosAtivo && typeof renderizarProdutos === "function") {
        if (typeof carregarEventosDisponibilidadeProduto === "function") {
          await carregarEventosDisponibilidadeProduto();
        }
        renderizarProdutos();
      }

      if (rotasAtivo && typeof renderizarRotas === "function") {
        renderizarRotas();
      }
    }, 120);
  });
})();

/* =====================================================
   v19-dev - Navegação rápida entre telas
   Troca a tela imediatamente e deixa renderizações/sync
   para depois do clique, evitando sensação de botão lento.
===================================================== */
(function(){
  if (window.__rtNavegacaoRapidaInstalada) return;
  window.__rtNavegacaoRapidaInstalada = true;

  const timers = {};
  let ultimaSecao = "";

  function agendar(chave, fn, delay){
    clearTimeout(timers[chave]);
    timers[chave] = setTimeout(() => {
      try { fn(); } catch (err) { console.warn("Navegação rápida:", chave, err); }
    }, delay || 0);
  }

  function secaoAtiva(id){
    const el = document.getElementById(id);
    return !!(el && (el.classList.contains("active-section") || el.classList.contains("active")));
  }

  function ativarSecao(sectionId, botao){
    if (!sectionId) return;
    const alvo = document.getElementById(sectionId);
    if (!alvo) return;

    document.querySelectorAll(".tab-btn").forEach(b => {
      b.classList.toggle("active", b === botao || b.dataset.section === sectionId && botao?.dataset?.section === sectionId && botao.closest('.tabs'));
    });
    document.querySelectorAll(".section").forEach(s => s.classList.remove("active-section", "active"));
    alvo.classList.add("active-section");
    ultimaSecao = sectionId;

    try { sessionStorage.setItem("riotendas_secao_atual", sectionId); } catch {}
    window.dispatchEvent(new CustomEvent("riotendas:secao-alterada", { detail: { sectionId } }));
  }

  function renderLeve(sectionId){
    // Renderiza apenas a tela que acabou de abrir. Banco/sync pesado fica em segundo plano.
    if (sectionId === "dashboardSection") {
      if (typeof atualizarDashboard === "function") atualizarDashboard(typeof produtos !== "undefined" ? produtos : []);
      return;
    }
    if (sectionId === "produtosSection") {
      if (typeof renderizarProdutos === "function") renderizarProdutos();
      return;
    }
    if (sectionId === "clientesSection") {
      if (typeof renderizarClientes === "function") renderizarClientes();
      return;
    }
    if (sectionId === "eventosSection") {
      if (typeof renderizarEventos === "function") renderizarEventos();
      return;
    }
    if (sectionId === "calendarioSection") {
      if (typeof renderizarCalendario === "function") renderizarCalendario();
      return;
    }
    if (sectionId === "rotasSection") {
      if (typeof renderizarRotas === "function") renderizarRotas();
      return;
    }
    if (sectionId === "orcamentosSection") {
      if (typeof renderizarOrcamentos === "function") renderizarOrcamentos();
      return;
    }
    if (sectionId === "financeiroSection") {
      if (typeof rtFinRenderTudoFase1 === "function") rtFinRenderTudoFase1();
      else if (typeof rtFinAtualizarResumo === "function") rtFinAtualizarResumo();
      return;
    }
    if (sectionId === "relatoriosSection") {
      if (typeof renderizarRelatorioChecagem === "function") renderizarRelatorioChecagem();
      return;
    }
    if (sectionId === "usuariosSection") {
      if (typeof renderizarUsuariosSistema === "function") renderizarUsuariosSistema();
      return;
    }
    if (sectionId === "configSection") {
      if (typeof renderizarManutencaoPendencias === "function") renderizarManutencaoPendencias();
      if (typeof montarPainelLogsSistema === "function") montarPainelLogsSistema();
      return;
    }
    if (sectionId === "ruaMobileSection") {
      if (typeof renderizarRuaMobile === "function") renderizarRuaMobile();
      return;
    }
    if (sectionId === "manutencaoMobileSection") {
      if (typeof renderizarManutencaoMobile === "function") renderizarManutencaoMobile();
      return;
    }
    if (sectionId === "eventosMobileSection") {
      if (typeof renderizarEventosMobile === "function") renderizarEventosMobile();
    }
  }

  function syncLeve(sectionId){
    if (!sectionId || ultimaSecao !== sectionId || !secaoAtiva(sectionId)) return;
    // Evita rodar sync no meio de digitação/arraste/modal.
    if (typeof window.rtUsuarioEditandoOperacional === "function" && window.rtUsuarioEditandoOperacional()) return;
    if (typeof window.rtSincronizarOperacionalSeguro === "function") {
      window.rtSincronizarOperacionalSeguro();
    }
  }

  function tratarClickNavegacao(ev){
    const botao = ev.target?.closest?.(".tab-btn[data-section]");
    if (!botao || botao.disabled) return;
    const sectionId = botao.dataset.section;
    if (!sectionId || !document.getElementById(sectionId)) return;

    // Assume o controle para impedir renderizações pesadas duplicadas de outros listeners no mesmo clique.
    ev.preventDefault();
    ev.stopImmediatePropagation();

    ativarSecao(sectionId, botao);

    // Dá chance para o navegador pintar a nova tela antes de qualquer trabalho mais caro.
    agendar("render-" + sectionId, () => renderLeve(sectionId), 25);
    agendar("sync-" + sectionId, () => syncLeve(sectionId), 350);
  }

  document.addEventListener("click", tratarClickNavegacao, true);
})();
