/* =====================================================
   Sincronização automática da disponibilidade dos produtos
   Versão leve: não recarrega produtos/eventos em toda alteração.
   Só atualiza a tela de Produtos quando ela estiver aberta.
===================================================== */

function rtSecaoAtivaDisponibilidade(id) {
  const el = document.getElementById(id);
  return !!(el && (el.classList.contains("active") || el.classList.contains("active-section")));
}

function rtUsuarioEditandoDisponibilidade() {
  if (typeof rtUsuarioEditandoOperacional === "function") return rtUsuarioEditandoOperacional();
  const ae = document.activeElement;
  return !!(ae && ["INPUT", "TEXTAREA", "SELECT"].includes(ae.tagName));
}

async function atualizarDisponibilidadeProdutosAutomaticamente(forcar = false) {
  try {
    const produtosAtiva = rtSecaoAtivaDisponibilidade("produtosSection");
    const dashboardAtivo = rtSecaoAtivaDisponibilidade("dashboardSection");

    // Evita que um clique em rota/evento trave a interface recarregando produtos em segundo plano.
    if (!forcar && !produtosAtiva && !dashboardAtivo) return;
    if (!forcar && rtUsuarioEditandoDisponibilidade()) return;

    if (produtosAtiva && typeof carregarEventosDisponibilidadeProduto === "function") {
      await carregarEventosDisponibilidadeProduto();
    }

    if (produtosAtiva && typeof renderizarProdutos === "function") {
      renderizarProdutos();
    }

    if (dashboardAtivo && typeof atualizarDashboard === "function" && Array.isArray(window.produtos || produtos)) {
      atualizarDashboard(window.produtos || produtos);
    }
  } catch (erro) {
    console.warn("Não foi possível atualizar automaticamente a disponibilidade dos produtos:", erro);
  }
}

window.atualizarDisponibilidadeProdutosAutomaticamente = atualizarDisponibilidadeProdutosAutomaticamente;

let rtSyncProdutosDisponibilidadeTimer = null;

window.addEventListener("riotendas:eventos-atualizados", () => {
  clearTimeout(rtSyncProdutosDisponibilidadeTimer);
  rtSyncProdutosDisponibilidadeTimer = setTimeout(() => {
    atualizarDisponibilidadeProdutosAutomaticamente(false);
  }, 900);
});
