function atualizarDashboard(produtos = []) {
  const total = produtos.length;
  const livres = produtos.filter(p => p.status === "Livre").length;
  const problema = produtos.filter(p => p.status !== "Livre").length;

  document.getElementById("dashTotalProdutos").textContent = total;
  document.getElementById("dashLivres").textContent = livres;
  document.getElementById("dashManutencao").textContent = problema;
  document.getElementById("dashPagamentos").textContent = "0";

  const lista = document.getElementById("dashboardProdutosProblema");
  const produtosProblema = produtos.filter(p => p.status !== "Livre");

  if (!produtosProblema.length) {
    lista.className = "compact-list empty";
    lista.textContent = "Nenhum produto encontrado.";
    return;
  }

  lista.className = "compact-list";
  lista.innerHTML = produtosProblema.map(p => `
    <div class="compact-item">
      <strong>${p.codigo || "Sem código"}</strong> - ${p.categoria || "-"} ${p.tamanho || ""}<br>
      Status: <strong>${p.status}</strong><br>
      Observação: ${p.observacao || "-"}
    </div>
  `).join("");
}
