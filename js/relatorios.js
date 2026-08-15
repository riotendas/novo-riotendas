function rtInicioFimRelatorioChecagem() {
  const inicioInput = document.getElementById("relatorioCheckInicio");
  const fimInput = document.getElementById("relatorioCheckFim");

  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = String(hoje.getMonth() + 1).padStart(2, "0");
  const ultimoDia = new Date(ano, hoje.getMonth() + 1, 0).getDate();

  if (inicioInput && !inicioInput.value) inicioInput.value = `${ano}-${mes}-01`;
  if (fimInput && !fimInput.value) fimInput.value = `${ano}-${mes}-${String(ultimoDia).padStart(2, "0")}`;

  const inicio = inicioInput?.value ? new Date(`${inicioInput.value}T00:00:00`) : null;
  const fim = fimInput?.value ? new Date(`${fimInput.value}T23:59:59`) : null;

  return { inicio, fim };
}

function rtProdutoTemCodigoReal(produto) {
  return Boolean(String(produto?.codigo || "").trim());
}

function rtDataChecagemFormatada(item) {
  if (!item || !item.data) return "-";
  if (typeof formatarData === "function") return formatarData(item.data);
  return new Date(item.data).toLocaleString("pt-BR");
}

function renderizarRelatorioChecagem() {
  const tbody = document.getElementById("relatorioChecagemTbody");
  if (!tbody) return;

  const { inicio, fim } = rtInicioFimRelatorioChecagem();
  const filtro = document.getElementById("relatorioCheckFiltroStatus")?.value || "todos";
  const busca = String(document.getElementById("relatorioCheckBusca")?.value || "").trim().toLowerCase();

  const listaProdutos = (typeof produtos !== "undefined" ? produtos : [])
    .filter(rtProdutoTemCodigoReal)
    .filter(p => String(p.categoria || p.tipo || "").toLowerCase() !== "materiais de apoio");

  const linhas = listaProdutos.map(p => {
    const ultimo = typeof obterUltimaChecagemProduto === "function" ? obterUltimaChecagemProduto(p, inicio, fim) : null;
    // O relatório representa o checklist atual e considera o período da última marcação.
    // Isso mantém a mesma fonte de verdade da tela Produtos: deposito_check.
    return { produto: p, ultimo, checado: Boolean(p.deposito_check && ultimo) };
  });

  const checados = linhas.filter(l => l.checado).length;
  const total = linhas.length;
  const naoChecados = total - checados;

  const totalEl = document.getElementById("relCheckTotal");
  const checadosEl = document.getElementById("relCheckChecados");
  const naoEl = document.getElementById("relCheckNaoChecados");
  if (totalEl) totalEl.textContent = total;
  if (checadosEl) checadosEl.textContent = checados;
  if (naoEl) naoEl.textContent = naoChecados;

  const filtradas = linhas.filter(({ produto, checado }) => {
    if (filtro === "checados" && !checado) return false;
    if (filtro === "nao_checados" && checado) return false;

    if (busca) {
      const texto = [produto.codigo, produto.categoria || produto.tipo, produto.tamanho, produto.cor]
        .join(" ")
        .toLowerCase();
      if (!texto.includes(busca)) return false;
    }

    return true;
  });

  if (!filtradas.length) {
    tbody.innerHTML = `<tr><td colspan="7" class="empty">Nenhum produto encontrado para o filtro selecionado.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtradas.map(({ produto, ultimo, checado }) => `
    <tr>
      <td><strong>${produto.codigo || "-"}</strong></td>
      <td>${produto.categoria || produto.tipo || "-"}</td>
      <td>${produto.tamanho || "-"}</td>
      <td>${produto.cor || "-"}</td>
      <td>${checado ? rtDataChecagemFormatada(ultimo) : "-"}</td>
      <td>${checado ? (ultimo.colaborador || "-") : "-"}</td>
      <td>${checado ? '<span class="badge success">Checado</span>' : '<span class="badge danger">Não checado</span>'}</td>
    </tr>
  `).join("");
}

function iniciarRelatorios() {
  const atualizar = document.getElementById("relatoriosAtualizarBtn");
  const mesAtual = document.getElementById("relatorioCheckMesAtual");

  ["relatorioCheckInicio", "relatorioCheckFim", "relatorioCheckFiltroStatus", "relatorioCheckBusca"].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener(id === "relatorioCheckBusca" ? "input" : "change", renderizarRelatorioChecagem);
  });

  if (atualizar) atualizar.addEventListener("click", renderizarRelatorioChecagem);
  if (mesAtual) {
    mesAtual.addEventListener("click", () => {
      const inicioInput = document.getElementById("relatorioCheckInicio");
      const fimInput = document.getElementById("relatorioCheckFim");
      if (inicioInput) inicioInput.value = "";
      if (fimInput) fimInput.value = "";
      renderizarRelatorioChecagem();
    });
  }

  rtInicioFimRelatorioChecagem();
  // Performance V3: relatório pesado só renderiza quando a aba for aberta.
}
