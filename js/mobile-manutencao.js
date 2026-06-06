// v19-dev: Mobile > Manutenção
// Busca rápida por número/código, observação, checklist e atualização de status.

let manutencaoMobileFiltroAtual = "pendentes";
let manutencaoMobileProdutoAtualId = null;

function manutMobileNormalizar(txt) {
  return String(txt || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function manutMobileEscape(txt) {
  return String(txt || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


function manutMobileUltimaChecagemProduto(produto = {}) {
  if (typeof obterUltimaChecagemProduto === "function") return obterUltimaChecagemProduto(produto);
  const historico = Array.isArray(produto?.historico) ? produto.historico : [];
  return historico
    .filter(item => String(item.alteracao || "").toLowerCase().includes("checagem de depósito") || String(item.alteracao || "").toLowerCase().includes("checagem de deposito"))
    .map(item => ({ ...item, dataObj: new Date(item.data || item.criado_em || item.atualizado_em || 0) }))
    .filter(item => !Number.isNaN(item.dataObj.getTime()))
    .sort((a, b) => b.dataObj - a.dataObj)[0] || null;
}

function manutMobileResumoChecagem(produto = {}) {
  const ultima = manutMobileUltimaChecagemProduto(produto);
  if (!ultima) return "Ainda não checado no depósito";
  const dataTxt = typeof formatarData === "function" ? formatarData(ultima.data || ultima.criado_em || ultima.atualizado_em) : new Date(ultima.data || ultima.criado_em || ultima.atualizado_em).toLocaleString("pt-BR");
  return `Última checagem: ${dataTxt} por ${ultima.colaborador || "-"}`;
}

function manutMobileProdutoTitulo(produto = {}) {
  return [produto.categoria || produto.tipo, produto.tamanho, produto.cor].filter(Boolean).join(" · ") || "Produto";
}

function manutMobileStatusClasse(status) {
  const st = manutMobileNormalizar(status);
  if (st === "bloqueado" || st === "bloqueada") return "bloqueado";
  if (st === "livre") return "livre";
  if (st === "alugado" || st === "ocupado") return "alugado";
  if (["revisar", "limpar", "consertar"].includes(st)) return st;
  return "padrao";
}

function manutMobileStatusBadge(status) {
  const texto = manutMobileEscape(status || "-");
  return `<span class="manut-mobile-status-badge status-${manutMobileStatusClasse(status)}">${texto}</span>`;
}


function manutMobileUsabilidadeOpcoes() {
  return (typeof grausUsabilidade !== "undefined" && Array.isArray(grausUsabilidade) && grausUsabilidade.length)
    ? grausUsabilidade
    : ["Excelente", "Bom", "Regular", "Ruim", "Venda / Baixa"];
}

function manutMobileDisponibilidadeResumo(produto = {}) {
  try {
    if (typeof disponibilidadePeriodoProduto === "function") {
      const disp = disponibilidadePeriodoProduto(produto) || {};
      return {
        titulo: disp.texto || "Disponibilidade",
        detalhe: disp.detalhe || "Sem detalhe de disponibilidade"
      };
    }
    if (typeof proximoUsoProduto === "function") {
      const proximo = proximoUsoProduto(produto);
      if (proximo) {
        const dataTxt = typeof formatarDataHoraProdutoDisp === "function"
          ? `${formatarDataHoraProdutoDisp(proximo.intervalo?.inicio)} até ${formatarDataHoraProdutoDisp(proximo.intervalo?.fim)}`
          : "Próximo evento encontrado";
        return { titulo: "Próximo uso", detalhe: `${proximo.evento?.nome || "Cliente"} — ${dataTxt}` };
      }
    }
  } catch (erro) {
    console.warn("Não foi possível calcular disponibilidade mobile:", erro);
  }
  return { titulo: produto.status || "Livre", detalhe: "Nenhum uso futuro encontrado" };
}

function manutMobileUsabilidadeClasse(valor) {
  const v = manutMobileNormalizar(valor);
  if (v.includes("excelente")) return "excelente";
  if (v.includes("bom")) return "bom";
  if (v.includes("regular")) return "regular";
  if (v.includes("ruim")) return "ruim";
  if (v.includes("venda") || v.includes("baixa")) return "baixa";
  return "padrao";
}

function manutMobileRemoverMarcacoesAuto(texto) {
  return String(texto || "")
    .split(/\n+/)
    .map(linha => linha
      .replace(/(?:^|\s*[,-]\s*)(Limpo|Revisado|Consertado|Pronto para uso)(?=\s*(?:,|-|$))/gi, "")
      .replace(/^\s*[,|-]\s*/, "")
      .replace(/\s*[,|-]\s*$/, "")
      .trim()
    )
    .filter(Boolean)
    .join("\n")
    .trim();
}

function manutMobileAtualizarObsChecklist() {
  const textarea = document.getElementById("manutencaoMobileObs");
  if (!textarea) return;
  const base = manutMobileRemoverMarcacoesAuto(textarea.value);
  const marcas = [];
  if (document.getElementById("manutCheckLimpo")?.checked) marcas.push("Limpo");
  if (document.getElementById("manutCheckRevisado")?.checked) marcas.push("Revisado");
  if (document.getElementById("manutCheckConsertado")?.checked) marcas.push("Consertado");
  if (document.getElementById("manutCheckPronto")?.checked) marcas.push("Pronto para uso");
  textarea.value = [base, marcas.join(", ")].filter(Boolean).join(base ? " - " : "");
}

function manutMobileProdutoPendente(produto = {}) {
  const status = manutMobileNormalizar(produto.status);
  return ["revisar", "limpar", "consertar", "bloqueada", "bloqueado"].includes(status);
}

function manutMobileProdutosFiltrados() {
  const lista = Array.isArray(produtos) ? produtos : [];
  const filtro = manutMobileNormalizar(manutencaoMobileFiltroAtual || "pendentes");
  return lista
    .filter(produto => {
      if (filtro === "todos") return true;
      if (!filtro || filtro === "pendentes") return manutMobileProdutoPendente(produto);
      const status = manutMobileNormalizar(produto.status);
      if (filtro === "bloqueada") return status === "bloqueada" || status === "bloqueado";
      return status === filtro;
    })
    .sort((a, b) => String(a.codigo || "").localeCompare(String(b.codigo || ""), "pt-BR", { numeric: true }));
}

function manutMobileContar(statusEsperado) {
  const esperado = manutMobileNormalizar(statusEsperado);
  return (Array.isArray(produtos) ? produtos : []).filter(produto => {
    if (!esperado || esperado === "pendentes") return manutMobileProdutoPendente(produto);
    if (esperado === "todos") return true;
    const st = manutMobileNormalizar(produto.status);
    if (esperado === "bloqueada") return st === "bloqueada" || st === "bloqueado";
    return st === esperado;
  }).length;
}

function renderizarManutencaoMobileResumo() {
  const resumo = document.getElementById("manutencaoMobileResumo");
  if (!resumo) return;
  resumo.querySelectorAll("[data-manut-filtro]").forEach(btn => {
    const filtro = btn.dataset.manutFiltro || "";
    const strong = btn.querySelector("strong");
    if (strong) strong.textContent = manutMobileContar(filtro);
  });
}

function renderizarManutencaoMobile() {
  renderizarManutencaoMobileResumo();
  const listaEl = document.getElementById("manutencaoMobileLista");
  if (!listaEl) return;

  const lista = manutMobileProdutosFiltrados();
  if (!lista.length) {
    const filtro = manutMobileNormalizar(manutencaoMobileFiltroAtual || "pendentes");
    const msg = filtro === "todos" ? "Nenhum produto encontrado." : "Nenhum produto pendente encontrado.";
    listaEl.innerHTML = `<p class="empty">${msg}</p>`;
    return;
  }

  listaEl.innerHTML = lista.map(produto => `
    <article class="manut-mobile-card status-${manutMobileNormalizar(produto.status)}" data-manut-produto-id="${manutMobileEscape(produto.id)}">
      <div>
        <span class="manut-mobile-codigo">${manutMobileEscape(produto.codigo || "Sem código")}</span>
        <h3>${manutMobileEscape(manutMobileProdutoTitulo(produto))}</h3>
        <small>Status: ${manutMobileStatusBadge(produto.status)}</small>
      </div>
      <button type="button" class="btn-outline" data-manut-abrir="${manutMobileEscape(produto.id)}">Abrir</button>
    </article>
  `).join("");

  listaEl.querySelectorAll("[data-manut-abrir]").forEach(btn => {
    btn.addEventListener("click", () => abrirManutencaoMobileProduto(btn.dataset.manutAbrir, { anchorEl: btn.closest(".manut-mobile-card") }));
  });
}

function manutMobileDigitos(txt) {
  return String(txt || "").replace(/\D+/g, "");
}

function manutMobileBuscarProdutoPorCodigo(codigo) {
  const termo = manutMobileNormalizar(codigo).replace(/\s+/g, "");
  const termoDigitos = manutMobileDigitos(codigo);
  if (!termo && !termoDigitos) return null;

  const lista = Array.isArray(produtos) ? produtos : [];
  const preparar = p => ({
    produto: p,
    codigo: manutMobileNormalizar(p.codigo).replace(/\s+/g, ""),
    digitos: manutMobileDigitos(p.codigo)
  });

  const preparados = lista.map(preparar);

  return preparados.find(item => item.codigo === termo)?.produto
    || preparados.find(item => termoDigitos && item.digitos === termoDigitos)?.produto
    || preparados.find(item => termoDigitos && item.digitos.endsWith(termoDigitos))?.produto
    || preparados.find(item => item.codigo.includes(termo) || (termo && termo.includes(item.codigo)))?.produto
    || null;
}

function manutMobileBuscarProdutosPossiveis(codigo) {
  const termoDigitos = manutMobileDigitos(codigo);
  if (!termoDigitos) return [];
  return (Array.isArray(produtos) ? produtos : []).filter(p => {
    const dig = manutMobileDigitos(p.codigo);
    return dig === termoDigitos || dig.endsWith(termoDigitos) || dig.includes(termoDigitos);
  });
}

let manutMobileBuscaTimer = null;
function manutMobileBuscaAutomatica() {
  const input = document.getElementById("manutencaoMobileCodigo");
  const statusEl = document.getElementById("manutencaoMobileOcrStatus");
  if (!input) return;

  const somenteNumeros = manutMobileDigitos(input.value);
  if (input.value !== somenteNumeros) input.value = somenteNumeros;

  clearTimeout(manutMobileBuscaTimer);
  manutMobileBuscaTimer = setTimeout(() => {
    const termo = input.value;
    if (!termo || termo.length < 3) {
      if (statusEl) statusEl.textContent = "Digite pelo menos 3 números do código do produto.";
      return;
    }

    const possiveis = manutMobileBuscarProdutosPossiveis(termo);
    if (possiveis.length === 1) {
      if (statusEl) statusEl.textContent = `Produto encontrado: ${possiveis[0].codigo || termo}`;
      abrirManutencaoMobileProduto(possiveis[0].id);
      return;
    }

    const exato = possiveis.find(p => manutMobileDigitos(p.codigo) === termo);
    if (exato) {
      if (statusEl) statusEl.textContent = `Produto encontrado: ${exato.codigo || termo}`;
      abrirManutencaoMobileProduto(exato.id);
      return;
    }

    if (possiveis.length > 1) {
      if (statusEl) statusEl.textContent = `${possiveis.length} produtos encontrados. Digite mais números para abrir automaticamente.`;
      return;
    }

    if (statusEl) statusEl.textContent = "Nenhum produto encontrado para este número.";
  }, 250);
}

function manutMobileChecklistHtml(produto = {}) {
  const status = manutMobileNormalizar(produto.status);
  const limpo = status === "limpar" ? "" : "";
  return `
    <label><input type="checkbox" id="manutCheckLimpo" ${limpo}> Limpo</label>
    <label><input type="checkbox" id="manutCheckRevisado"> Revisado</label>
    <label><input type="checkbox" id="manutCheckConsertado"> Consertado</label>
    <label><input type="checkbox" id="manutCheckPronto"> Pronto para uso</label>
  `;
}

function abrirManutencaoMobileProduto(id, opcoes = {}) {
  try { document.activeElement && document.activeElement.blur && document.activeElement.blur(); } catch {}
  manutencaoMobileProdutoAtualId = id;
  if (!opcoes.semHistorico && typeof window.rtMobilePushState === "function") {
    window.rtMobilePushState("manutencaoMobileSection", { detalheProdutoId: String(id || "") });
  }
  const produto = (Array.isArray(produtos) ? produtos : []).find(p => String(p.id) === String(id));
  const detalhe = document.getElementById("manutencaoMobileDetalhe");
  if (!detalhe || !produto) return;
  const dispMobile = manutMobileDisponibilidadeResumo(produto);
  const usabilidadeAtual = produto.grau_usabilidade || produto.usabilidade || "Bom";

  // Abre a ficha exatamente na região atual de trabalho:
  // - se veio de um card da lista, posiciona logo abaixo do card clicado;
  // - se veio da busca, posiciona logo abaixo da mensagem/campo de busca;
  // - não força scroll para topo nem centraliza na página.
  try {
    const anchor = opcoes.anchorEl;
    const statusBusca = document.getElementById("manutencaoMobileOcrStatus");
    if (anchor && anchor.parentNode) {
      anchor.insertAdjacentElement("afterend", detalhe);
    } else if (statusBusca && statusBusca.parentNode) {
      statusBusca.insertAdjacentElement("afterend", detalhe);
    }
  } catch {}

  detalhe.hidden = false;
  detalhe.classList.remove("manut-mobile-modal-wrap");
  detalhe.classList.add("manut-mobile-inline-wrap");
  detalhe.innerHTML = `
    <div class="manut-mobile-detalhe-card manut-mobile-modal-card status-${manutMobileNormalizar(produto.status)}" role="dialog" aria-modal="true">
      <div class="manut-mobile-detalhe-top manut-mobile-modal-top">
        <div class="manut-mobile-produto-titulo">
          <span class="manut-mobile-codigo manut-mobile-codigo-destaque">${manutMobileEscape(produto.codigo || "Sem código")}</span>
          <h3>${manutMobileEscape(manutMobileProdutoTitulo(produto))}</h3>
          <p>Status atual: ${manutMobileStatusBadge(produto.status)}</p>
        </div>
        <div class="manut-mobile-modal-acoes-topo">
          <button type="button" class="btn-outline manut-mobile-fechar" id="manutMobileFecharDetalhe" title="Fechar">×</button>
        </div>
      </div>

      <label class="manut-mobile-observacao">Observação / Reparo realizado
        <textarea id="manutencaoMobileObs" rows="1" placeholder="Ex.: Lavagem, troca de lona, costura, reparo...">${manutMobileEscape(produto.observacao || "")}</textarea>
      </label>

      <div class="manut-mobile-disponibilidade-box">
        <strong>Disponibilidade</strong>
        <span>${manutMobileEscape(dispMobile.titulo)}</span>
        <small>${manutMobileEscape(dispMobile.detalhe)}</small>
      </div>

      <div class="manut-mobile-info-linha">
        <div class="manut-mobile-checado-box manut-mobile-info-card">
          <div>
            <strong>Checado no depósito</strong>
            <small>${manutMobileEscape(manutMobileResumoChecagem(produto))}</small>
          </div>
          <button type="button" class="btn-check-produto manut-mobile-check-deposito" id="manutMobileCheckDeposito" title="Marcar produto como checado no depósito">✓</button>
        </div>
        <label class="manut-mobile-usabilidade-box manut-mobile-info-card">
          <span>Usabilidade</span>
          <select id="manutMobileUsabilidade" class="usab-${manutMobileUsabilidadeClasse(usabilidadeAtual)}">
            ${manutMobileUsabilidadeOpcoes().map(op => `<option value="${manutMobileEscape(op)}" ${String(op) === String(usabilidadeAtual) ? "selected" : ""}>${manutMobileEscape(op)}</option>`).join("")}
          </select>
        </label>
      </div>

      <div class="manut-mobile-checklist">
        ${manutMobileChecklistHtml(produto)}
      </div>

      <div class="manut-mobile-status-botoes">
        <button type="button" class="btn-outline" data-manut-status="Limpar">Limpar</button>
        <button type="button" class="btn-outline" data-manut-status="Revisar">Revisar</button>
        <button type="button" class="btn-outline" data-manut-status="Consertar">Consertar</button>
        <button type="button" class="btn-outline" data-manut-status="Bloqueado">Bloquear</button>
        <button type="button" class="btn-outline" data-manut-status="Livre">Liberar</button>
      </div>

      <button type="button" class="btn-primary manut-mobile-concluir-grande" id="manutencaoMobileConcluirGrande">✓ Concluir</button>
    </div>
  `;

  document.getElementById("manutMobileFecharDetalhe")?.addEventListener("click", () => {
    detalhe.hidden = true;
    detalhe.classList.remove("manut-mobile-modal-wrap");
    detalhe.classList.remove("manut-mobile-inline-wrap");
    manutencaoMobileProdutoAtualId = null;
    const inputBusca = document.getElementById("manutencaoMobileCodigo");
    if (inputBusca) inputBusca.value = "";
    if (typeof window.rtMobilePushState === "function") {
      window.rtMobilePushState("manutencaoMobileSection");
    }
  });

  detalhe.querySelectorAll("[data-manut-status]").forEach(btn => {
    btn.addEventListener("click", () => salvarManutencaoMobileProduto(btn.dataset.manutStatus));
  });

  document.getElementById("manutMobileCheckDeposito")?.addEventListener("click", () => marcarChecadoDepositoManutencaoMobile());
  document.getElementById("manutMobileUsabilidade")?.addEventListener("change", (ev) => alterarUsabilidadeManutencaoMobile(ev.currentTarget.value));

  ["manutCheckLimpo", "manutCheckRevisado", "manutCheckConsertado", "manutCheckPronto"].forEach(idCheck => {
    document.getElementById(idCheck)?.addEventListener("change", manutMobileAtualizarObsChecklist);
  });

  function concluirManutencaoMobileProduto() {
    const pronto = document.getElementById("manutCheckPronto")?.checked;
    salvarManutencaoMobileProduto(pronto ? "Livre" : (produto.status || "Revisar"));
  }

  document.getElementById("manutencaoMobileConcluirGrande")?.addEventListener("click", concluirManutencaoMobileProduto);
}



async function alterarUsabilidadeManutencaoMobile(novaUsabilidade) {
  const produto = (Array.isArray(produtos) ? produtos : []).find(p => String(p.id) === String(manutencaoMobileProdutoAtualId));
  if (!produto) return;
  if ((produto.grau_usabilidade || "Bom") === novaUsabilidade) return;

  const anterior = produto.grau_usabilidade || "Bom";
  const agora = new Date().toISOString();
  const colaborador = typeof getColaboradorLogado === "function" ? getColaboradorLogado() : "Mobile";

  produto.grau_usabilidade = novaUsabilidade;
  produto.atualizado_em = agora;
  produto.colaborador = colaborador;
  produto.historico = Array.isArray(produto.historico) ? produto.historico : [];
  produto.historico.push({
    data: agora,
    colaborador,
    alteracao: `Usabilidade alterada via mobile para ${novaUsabilidade}`,
    observacao: produto.observacao || "-"
  });

  const salvo = typeof salvarProdutoBanco === "function" ? await salvarProdutoBanco(produto) : produto;
  if (!salvo) return;
  const idx = produtos.findIndex(p => String(p.id) === String(produto.id));
  if (idx >= 0) produtos[idx] = salvo;
  if (typeof registrarLogSistema === "function") {
    registrarLogSistema({
      modulo: "Mobile Manutenção",
      acao: "Usabilidade alterada",
      registro_id: salvo.id,
      registro_nome: salvo.codigo || "Produto",
      antes: { grau_usabilidade: anterior },
      depois: { grau_usabilidade: novaUsabilidade }
    });
  }
  const select = document.getElementById("manutMobileUsabilidade");
  if (select) select.className = `usab-${manutMobileUsabilidadeClasse(novaUsabilidade)}`;
  if (typeof renderizarProdutos === "function") renderizarProdutos();
}

async function marcarChecadoDepositoManutencaoMobile() {
  const produto = (Array.isArray(produtos) ? produtos : []).find(p => String(p.id) === String(manutencaoMobileProdutoAtualId));
  if (!produto) return;

  const agora = new Date().toISOString();
  const colaborador = typeof getColaboradorLogado === "function" ? getColaboradorLogado() : "Mobile";
  const observacaoTela = String(document.getElementById("manutencaoMobileObs")?.value || "").trim();

  produto.atualizado_em = agora;
  produto.colaborador = colaborador;
  produto.historico = Array.isArray(produto.historico) ? produto.historico : [];
  produto.historico.push({
    data: agora,
    colaborador,
    alteracao: "Checagem de depósito",
    observacao: observacaoTela || "Produto conferido no depósito"
  });

  const salvo = typeof salvarProdutoBanco === "function" ? await salvarProdutoBanco(produto) : produto;
  if (!salvo) return;

  const index = produtos.findIndex(p => String(p.id) === String(produto.id));
  if (index >= 0) produtos[index] = salvo;

  if (typeof registrarLogSistema === "function") {
    registrarLogSistema({
      modulo: "Mobile Manutenção",
      acao: "Produto checado no depósito",
      registro_id: salvo.id,
      registro_nome: salvo.codigo || "Produto",
      antes: null,
      depois: { codigo: salvo.codigo || "-", data: agora, colaborador, observacao: observacaoTela || "Produto conferido no depósito" }
    });
  }

  alert(`Produto ${salvo.codigo || ""} marcado como checado no depósito.`);
  abrirManutencaoMobileProduto(salvo.id);
  if (typeof renderizarProdutos === "function") renderizarProdutos();
  if (typeof renderizarRelatorioChecagem === "function") renderizarRelatorioChecagem();
}

async function salvarManutencaoMobileProduto(novoStatus) {
  const produto = (Array.isArray(produtos) ? produtos : []).find(p => String(p.id) === String(manutencaoMobileProdutoAtualId));
  if (!produto) return;

  const observacaoTela = String(document.getElementById("manutencaoMobileObs")?.value || "").trim();
  const observacao = manutMobileRemoverMarcacoesAuto(observacaoTela);
  const checks = [];
  if (document.getElementById("manutCheckLimpo")?.checked) checks.push("Limpo");
  if (document.getElementById("manutCheckRevisado")?.checked) checks.push("Revisado");
  if (document.getElementById("manutCheckConsertado")?.checked) checks.push("Consertado");
  if (document.getElementById("manutCheckPronto")?.checked) checks.push("Pronto para uso");

  if (!observacao && String(novoStatus || "").toLowerCase() === "livre") {
    const ok = confirm("Deseja liberar sem preencher observação de manutenção?");
    if (!ok) return;
  }

  const statusAnterior = produto.status || "";
  const obsAnterior = produto.observacao || "";
  const colaborador = typeof getColaboradorLogado === "function" ? getColaboradorLogado() : "Mobile";
  const dataAgora = new Date().toISOString();
  const obsHistorico = [observacao, checks.length ? `Checklist: ${checks.join(", ")}` : ""].filter(Boolean).join(" | ");

  produto.status = novoStatus || produto.status || "Revisar";
  produto.observacao = String(produto.status || "").toLowerCase() === "livre" ? "" : observacao;
  produto.colaborador = colaborador;
  produto.atualizado_em = dataAgora;
  produto.historico = Array.isArray(produto.historico) ? produto.historico : [];
  produto.historico.push({
    data: dataAgora,
    colaborador,
    alteracao: `Manutenção mobile: ${statusAnterior || "-"} → ${produto.status}`,
    observacao: obsHistorico || obsAnterior || "-"
  });

  const salvo = typeof salvarProdutoBanco === "function" ? await salvarProdutoBanco(produto) : produto;
  if (salvo) {
    const idx = produtos.findIndex(p => String(p.id) === String(produto.id));
    if (idx >= 0) produtos[idx] = salvo;

    if (typeof registrarLogSistema === "function") {
      registrarLogSistema({
        modulo: "Mobile Manutenção",
        acao: "Produto atualizado",
        registro_id: salvo.id,
        registro_nome: salvo.codigo || "Produto",
        antes: { status: statusAnterior, observacao: obsAnterior },
        depois: { status: salvo.status, observacao: obsHistorico || salvo.observacao || "-" }
      });
    }

    alert(`Produto ${salvo.codigo || ""} atualizado para ${salvo.status}.`);
    renderizarManutencaoMobile();
    abrirManutencaoMobileProduto(salvo.id);
    if (typeof renderizarProdutos === "function") renderizarProdutos();
    if (typeof rtAtualizarDashboardProdutosLeve === "function") rtAtualizarDashboardProdutosLeve();
  }
}

async function manutMobileCarregarTesseract() {
  if (window.Tesseract) return window.Tesseract;
  await new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js";
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
  return window.Tesseract;
}

function manutMobileExtrairCodigos(texto) {
  const candidatos = String(texto || "")
    .toUpperCase()
    .replace(/[O]/g, "0")
    .replace(/[I|]/g, "1")
    .match(/[A-Z]{0,3}\s*\d{2,6}[A-Z0-9-]*/g) || [];

  const codigosProdutos = (Array.isArray(produtos) ? produtos : []).map(p => String(p.codigo || "").toUpperCase().replace(/\s+/g, ""));
  return candidatos
    .map(c => c.replace(/\s+/g, ""))
    .filter(Boolean)
    .sort((a, b) => {
      const aExato = codigosProdutos.includes(a) ? 0 : 1;
      const bExato = codigosProdutos.includes(b) ? 0 : 1;
      return aExato - bExato;
    });
}

async function processarOCRManutencaoMobile(file) {
  const statusEl = document.getElementById("manutencaoMobileOcrStatus");
  if (!file) return;
  try {
    if (statusEl) statusEl.textContent = "Lendo imagem... mantenha o número bem nítido.";
    const Tesseract = await manutMobileCarregarTesseract();
    const resultado = await Tesseract.recognize(file, "eng", {
      logger: info => {
        if (statusEl && info.status) statusEl.textContent = `Lendo código: ${Math.round((info.progress || 0) * 100)}%`;
      }
    });
    const codigos = manutMobileExtrairCodigos(resultado?.data?.text || "");
    if (!codigos.length) {
      if (statusEl) statusEl.textContent = "Não consegui ler com segurança. Digite o código manualmente.";
      return;
    }

    const produto = codigos.map(c => manutMobileBuscarProdutoPorCodigo(c)).find(Boolean);
    if (produto) {
      document.getElementById("manutencaoMobileCodigo").value = produto.codigo || codigos[0];
      if (statusEl) statusEl.textContent = `Código encontrado: ${produto.codigo}`;
      abrirManutencaoMobileProduto(produto.id);
    } else {
      document.getElementById("manutencaoMobileCodigo").value = codigos[0];
      if (statusEl) statusEl.textContent = `Li ${codigos[0]}, mas não encontrei no cadastro. Confira e toque em Buscar.`;
    }
  } catch (erro) {
    console.error("Erro OCR manutenção:", erro);
    if (statusEl) statusEl.textContent = "Leitura por câmera indisponível neste aparelho/navegador. Use a busca manual.";
  }
}

function iniciarManutencaoMobile() {
  const section = document.getElementById("manutencaoMobileSection");
  if (!section) return;

  document.getElementById("manutencaoMobileBuscarBtn")?.addEventListener("click", () => {
    const codigo = document.getElementById("manutencaoMobileCodigo")?.value || "";
    const produto = manutMobileBuscarProdutoPorCodigo(codigo);
    if (!produto) {
      alert("Produto não encontrado para este código.");
      return;
    }
    abrirManutencaoMobileProduto(produto.id);
  });

  document.getElementById("manutencaoMobileCodigo")?.addEventListener("input", manutMobileBuscaAutomatica);

  document.getElementById("manutencaoMobileCodigo")?.addEventListener("keydown", ev => {
    if (ev.key === "Enter") {
      ev.preventDefault();
      document.getElementById("manutencaoMobileBuscarBtn")?.click();
    }
  });

  document.getElementById("manutencaoMobileAtualizarBtn")?.addEventListener("click", async () => {
    if (typeof carregarProdutos === "function") await carregarProdutos();
    renderizarManutencaoMobile();
  });

  document.querySelectorAll("[data-manut-filtro]").forEach(btn => {
    btn.addEventListener("click", () => {
      manutencaoMobileFiltroAtual = btn.dataset.manutFiltro || "pendentes";
      document.querySelectorAll("#manutencaoMobileResumo [data-manut-filtro]").forEach(b => {
        b.classList.toggle("active", (b.dataset.manutFiltro || "pendentes") === manutencaoMobileFiltroAtual);
      });
      document.querySelectorAll(".manut-mobile-exibir-todos").forEach(b => {
        b.classList.toggle("active", manutencaoMobileFiltroAtual === "todos");
      });
      renderizarManutencaoMobile();
    });
  });

  setTimeout(renderizarManutencaoMobile, 900);
}


function manutencaoMobileFecharDetalheVoltar() {
  const detalhe = document.getElementById("manutencaoMobileDetalhe");
  if (detalhe && !detalhe.hidden) {
    detalhe.hidden = true;
    detalhe.classList.remove("manut-mobile-modal-wrap");
    detalhe.classList.remove("manut-mobile-inline-wrap");
    manutencaoMobileProdutoAtualId = null;
    return true;
  }
  return false;
}

window.abrirManutencaoMobileProduto = abrirManutencaoMobileProduto;
window.manutencaoMobileFecharDetalheVoltar = manutencaoMobileFecharDetalheVoltar;

window.renderizarManutencaoMobile = renderizarManutencaoMobile;
window.iniciarManutencaoMobile = iniciarManutencaoMobile;

document.addEventListener("DOMContentLoaded", iniciarManutencaoMobile);
