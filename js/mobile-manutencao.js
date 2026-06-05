// v19-dev: Mobile > Manutenção
// Busca manual por código, OCR beta do número escrito, observação, checklist e atualização de status.

let manutencaoMobileFiltroAtual = "";
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

function manutMobileProdutoTitulo(produto = {}) {
  return [produto.categoria || produto.tipo, produto.tamanho, produto.cor].filter(Boolean).join(" · ") || "Produto";
}

function manutMobileProdutoPendente(produto = {}) {
  const status = manutMobileNormalizar(produto.status);
  return ["revisar", "limpar", "consertar", "bloqueada", "bloqueado"].includes(status);
}

function manutMobileProdutosFiltrados() {
  const lista = Array.isArray(produtos) ? produtos : [];
  const filtro = manutMobileNormalizar(manutencaoMobileFiltroAtual);
  return lista
    .filter(produto => {
      if (!filtro) return manutMobileProdutoPendente(produto);
      const status = manutMobileNormalizar(produto.status);
      if (filtro === "bloqueada") return status === "bloqueada" || status === "bloqueado";
      return status === filtro;
    })
    .sort((a, b) => String(a.codigo || "").localeCompare(String(b.codigo || ""), "pt-BR", { numeric: true }));
}

function manutMobileContar(statusEsperado) {
  const esperado = manutMobileNormalizar(statusEsperado);
  return (Array.isArray(produtos) ? produtos : []).filter(produto => {
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
    listaEl.innerHTML = `<p class="empty">Nenhum produto pendente encontrado.</p>`;
    return;
  }

  listaEl.innerHTML = lista.map(produto => `
    <article class="manut-mobile-card status-${manutMobileNormalizar(produto.status)}" data-manut-produto-id="${manutMobileEscape(produto.id)}">
      <div>
        <span class="manut-mobile-codigo">${manutMobileEscape(produto.codigo || "Sem código")}</span>
        <h3>${manutMobileEscape(manutMobileProdutoTitulo(produto))}</h3>
        <small>Status: <strong>${manutMobileEscape(produto.status || "-")}</strong></small>
      </div>
      <button type="button" class="btn-outline" data-manut-abrir="${manutMobileEscape(produto.id)}">Abrir</button>
    </article>
  `).join("");

  listaEl.querySelectorAll("[data-manut-abrir]").forEach(btn => {
    btn.addEventListener("click", () => abrirManutencaoMobileProduto(btn.dataset.manutAbrir));
  });
}

function manutMobileBuscarProdutoPorCodigo(codigo) {
  const termo = manutMobileNormalizar(codigo).replace(/\s+/g, "");
  if (!termo) return null;
  return (Array.isArray(produtos) ? produtos : []).find(p => {
    const cod = manutMobileNormalizar(p.codigo).replace(/\s+/g, "");
    return cod === termo;
  }) || (Array.isArray(produtos) ? produtos : []).find(p => {
    const cod = manutMobileNormalizar(p.codigo).replace(/\s+/g, "");
    return cod.includes(termo) || termo.includes(cod);
  }) || null;
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

function abrirManutencaoMobileProduto(id) {
  manutencaoMobileProdutoAtualId = id;
  const produto = (Array.isArray(produtos) ? produtos : []).find(p => String(p.id) === String(id));
  const detalhe = document.getElementById("manutencaoMobileDetalhe");
  if (!detalhe || !produto) return;

  detalhe.hidden = false;
  detalhe.innerHTML = `
    <div class="manut-mobile-detalhe-card status-${manutMobileNormalizar(produto.status)}">
      <div class="manut-mobile-detalhe-top">
        <div>
          <span class="manut-mobile-codigo">${manutMobileEscape(produto.codigo || "Sem código")}</span>
          <h3>${manutMobileEscape(manutMobileProdutoTitulo(produto))}</h3>
          <p>Status atual: <strong>${manutMobileEscape(produto.status || "-")}</strong></p>
        </div>
        <button type="button" class="btn-outline" id="manutMobileFecharDetalhe">Fechar</button>
      </div>

      <label class="manut-mobile-observacao">Observação / Reparo realizado
        <textarea id="manutencaoMobileObs" rows="4" placeholder="Ex.: Lavagem completa, troca de lona, costura refeita, reparo de solda...">${manutMobileEscape(produto.observacao || "")}</textarea>
      </label>

      <div class="manut-mobile-checklist">
        ${manutMobileChecklistHtml(produto)}
      </div>

      <div class="manut-mobile-status-botoes">
        <button type="button" class="btn-outline" data-manut-status="Limpar">Limpar</button>
        <button type="button" class="btn-outline" data-manut-status="Revisar">Revisar</button>
        <button type="button" class="btn-outline" data-manut-status="Consertar">Consertar</button>
        <button type="button" class="btn-primary" data-manut-status="Livre">Liberar</button>
      </div>

      <button type="button" id="manutencaoMobileConcluir" class="btn-primary manut-mobile-concluir">✓ Concluir</button>
    </div>
  `;

  detalhe.scrollIntoView({ behavior: "smooth", block: "start" });

  document.getElementById("manutMobileFecharDetalhe")?.addEventListener("click", () => {
    detalhe.hidden = true;
    manutencaoMobileProdutoAtualId = null;
  });

  detalhe.querySelectorAll("[data-manut-status]").forEach(btn => {
    btn.addEventListener("click", () => salvarManutencaoMobileProduto(btn.dataset.manutStatus));
  });

  document.getElementById("manutencaoMobileConcluir")?.addEventListener("click", () => {
    const pronto = document.getElementById("manutCheckPronto")?.checked;
    salvarManutencaoMobileProduto(pronto ? "Livre" : (produto.status || "Revisar"));
  });
}

async function salvarManutencaoMobileProduto(novoStatus) {
  const produto = (Array.isArray(produtos) ? produtos : []).find(p => String(p.id) === String(manutencaoMobileProdutoAtualId));
  if (!produto) return;

  const observacao = String(document.getElementById("manutencaoMobileObs")?.value || "").trim();
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

  document.getElementById("manutencaoMobileCodigo")?.addEventListener("keydown", ev => {
    if (ev.key === "Enter") document.getElementById("manutencaoMobileBuscarBtn")?.click();
  });

  document.getElementById("manutencaoMobileOCRBtn")?.addEventListener("click", () => {
    document.getElementById("manutencaoMobileOCRInput")?.click();
  });

  document.getElementById("manutencaoMobileOCRInput")?.addEventListener("change", ev => {
    processarOCRManutencaoMobile(ev.target.files?.[0]);
    ev.target.value = "";
  });

  document.getElementById("manutencaoMobileAtualizarBtn")?.addEventListener("click", async () => {
    if (typeof carregarProdutos === "function") await carregarProdutos();
    renderizarManutencaoMobile();
  });

  document.querySelectorAll("[data-manut-filtro]").forEach(btn => {
    btn.addEventListener("click", () => {
      manutencaoMobileFiltroAtual = btn.dataset.manutFiltro || "";
      document.querySelectorAll(".manutencao-mobile-filtros [data-manut-filtro]").forEach(b => b.classList.toggle("active", (b.dataset.manutFiltro || "") === manutencaoMobileFiltroAtual));
      renderizarManutencaoMobile();
    });
  });

  setTimeout(renderizarManutencaoMobile, 900);
}

window.renderizarManutencaoMobile = renderizarManutencaoMobile;
window.iniciarManutencaoMobile = iniciarManutencaoMobile;

document.addEventListener("DOMContentLoaded", iniciarManutencaoMobile);
