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
    btn.addEventListener("click", () => abrirManutencaoMobileProduto(btn.dataset.manutAbrir));
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
  manutencaoMobileProdutoAtualId = id;
  if (!opcoes.semHistorico && typeof window.rtMobilePushState === "function") {
    window.rtMobilePushState("manutencaoMobileSection", { detalheProdutoId: String(id || "") });
  }
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
          <p>Status atual: ${manutMobileStatusBadge(produto.status)}</p>
        </div>
        <button type="button" class="btn-outline manut-mobile-fechar" id="manutMobileFecharDetalhe" title="Fechar">×</button>
      </div>

      <label class="manut-mobile-observacao">Observação / Reparo realizado
        <textarea id="manutencaoMobileObs" rows="2" placeholder="Ex.: Lavagem, troca de lona, costura, reparo...">${manutMobileEscape(produto.observacao || "")}</textarea>
      </label>

      <div class="manut-mobile-checado-box">
        <div>
          <strong>Checado no depósito</strong>
          <small>${manutMobileEscape(manutMobileResumoChecagem(produto))}</small>
        </div>
        <button type="button" class="btn-check-produto manut-mobile-check-deposito" id="manutMobileCheckDeposito" title="Marcar produto como checado no depósito">✓</button>
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

      <button type="button" id="manutencaoMobileConcluir" class="btn-primary manut-mobile-concluir">✓ Concluir</button>
    </div>
  `;

  detalhe.scrollIntoView({ behavior: "smooth", block: "start" });
  setTimeout(() => {
    const topo = detalhe.getBoundingClientRect().top + window.scrollY - 74;
    window.scrollTo({ top: Math.max(0, topo), behavior: "smooth" });
  }, 80);

  document.getElementById("manutMobileFecharDetalhe")?.addEventListener("click", () => {
    detalhe.hidden = true;
    manutencaoMobileProdutoAtualId = null;
    const inputBusca = document.getElementById("manutencaoMobileCodigo");
    if (inputBusca) {
      inputBusca.value = "";
      setTimeout(() => {
        inputBusca.scrollIntoView({ behavior: "smooth", block: "center" });
        inputBusca.focus({ preventScroll: true });
      }, 80);
    }
    if (typeof window.rtMobilePushState === "function") {
      window.rtMobilePushState("manutencaoMobileSection");
    }
  });

  detalhe.querySelectorAll("[data-manut-status]").forEach(btn => {
    btn.addEventListener("click", () => salvarManutencaoMobileProduto(btn.dataset.manutStatus));
  });

  document.getElementById("manutMobileCheckDeposito")?.addEventListener("click", () => marcarChecadoDepositoManutencaoMobile());

  ["manutCheckLimpo", "manutCheckRevisado", "manutCheckConsertado", "manutCheckPronto"].forEach(idCheck => {
    document.getElementById(idCheck)?.addEventListener("change", manutMobileAtualizarObsChecklist);
  });

  document.getElementById("manutencaoMobileConcluir")?.addEventListener("click", () => {
    const pronto = document.getElementById("manutCheckPronto")?.checked;
    salvarManutencaoMobileProduto(pronto ? "Livre" : (produto.status || "Revisar"));
  });
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
