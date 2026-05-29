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
