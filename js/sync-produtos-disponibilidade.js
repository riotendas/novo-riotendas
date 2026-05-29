/* =====================================================
   Sincronização automática da disponibilidade dos produtos
===================================================== */

async function atualizarDisponibilidadeProdutosAutomaticamente() {
  try {
    if (typeof carregarEventos === "function") {
      await carregarEventos();
    }

    if (typeof carregarEventosDisponibilidadeProduto === "function") {
      await carregarEventosDisponibilidadeProduto();
    }

    if (typeof renderizarProdutos === "function") {
      renderizarProdutos();
    }

    if (typeof atualizarDashboard === "function" && Array.isArray(window.produtos || produtos)) {
      atualizarDashboard(window.produtos || produtos);
    }
  } catch (erro) {
    console.warn("Não foi possível atualizar automaticamente a disponibilidade dos produtos:", erro);
  }
}

window.atualizarDisponibilidadeProdutosAutomaticamente = atualizarDisponibilidadeProdutosAutomaticamente;

window.addEventListener("riotendas:eventos-atualizados", () => {
  atualizarDisponibilidadeProdutosAutomaticamente();
});
