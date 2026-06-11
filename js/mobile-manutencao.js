// v19-dev: Mobile > Manutenção
// Correção real: sync automático + sem histórico vazio + histórico recente só status.
// Busca rápida por número/código, observação, checklist e atualização de status.

let manutencaoMobileFiltroAtual = "pendentes";
let manutencaoMobileProdutoAtualId = null;
let manutencaoMobileStatusSelecionado = "";
let manutencaoMobileUsabilidadeFiltroAtual = "Todos";
let manutMobileSyncTimer = null;
let manutMobileSyncExecutando = false;

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


function manutMobileAvisoConexao(texto, mostrarBotao = false) {
  let aviso = document.getElementById("manutMobileConexaoAviso");
  const section = document.getElementById("manutencaoMobileSection");
  if (!section) return;
  if (!aviso) {
    aviso = document.createElement("div");
    aviso.id = "manutMobileConexaoAviso";
    aviso.className = "manut-mobile-sync-aviso";
    const titulo = section.querySelector("h2") || section.firstElementChild;
    (titulo?.parentNode || section).insertBefore(aviso, titulo?.nextSibling || section.firstChild);
  }
  aviso.hidden = !texto;
  aviso.innerHTML = texto ? `${manutMobileEscape(texto)}${mostrarBotao ? ' <button type="button" class="btn-outline btn-mini" id="manutMobileConexaoRetry">Tentar novamente</button>' : ''}` : "";
  document.getElementById("manutMobileConexaoRetry")?.addEventListener("click", async () => {
    manutMobileAvisoConexao("Reconectando...");
    try {
      if (typeof carregarProdutos === "function") await carregarProdutos(true);
      renderizarManutencaoMobile();
      manutMobileAvisoConexao("");
    } catch (erro) {
      manutMobileAvisoConexao("Sem conexão. Tente novamente em instantes.", true);
    }
  });
}

async function manutMobileRecarregarComAviso() {
  try {
    manutMobileAvisoConexao("Atualizando dados...");
    if (typeof carregarProdutos === "function") await carregarProdutos(true);
    renderizarManutencaoMobile();
    manutMobileAvisoConexao("");
  } catch (erro) {
    console.warn("Falha ao atualizar manutenção mobile", erro);
    manutMobileAvisoConexao("Sem conexão. Mantendo dados carregados. Tente novamente.", true);
  }
}

function manutMobileLimparPrefixoHistorico(texto = "") {
  return String(texto || "")
    .replace(/^\s*manuten[cç][aã]o\s+mobile\s*:?\s*/i, "")
    .trim();
}

function manutMobileExtrairChecklist(item = {}) {
  const bruto = [item.checklist, item.observacao, item.descricao, item.alteracao]
    .filter(Boolean)
    .join(" | ");
  const t = manutMobileNormalizar(bruto);
  const itens = [];
  if (/\blimp/.test(t)) itens.push("Limpo");
  if (/revisad/.test(t) || /checklist[^|]*revis/.test(t)) itens.push("Revisado");
  if (/\bconsert/.test(t)) itens.push("Consertado");
    if (/\bbloque/.test(t)) itens.push("Bloqueado");
  if (/\bliber/.test(t) || /para uso/.test(t)) itens.push("Liberado");
  return [...new Set(itens)];
}

function manutMobileStatusHistorico(item = {}) {
  const texto = manutMobileLimparPrefixoHistorico(item.alteracao || item.texto || "");
  const m = texto.match(/([^:|]+?)\s*→\s*([^|]+)/);
  if (!m) return "";
  return `Status: ${m[1].trim()} → ${m[2].trim()}`;
}

function manutMobileTextoHistoricoCompacto(item = {}) {
  const checks = manutMobileExtrairChecklist(item);
  const status = manutMobileStatusHistorico(item);
  const partes = [];
  if (checks.length) partes.push(checks.map(c => `✓ ${c}`).join(" "));
  if (status) partes.push(status);
  if (!partes.length) {
    partes.push(manutMobileLimparPrefixoHistorico(item.texto || item.alteracao || item.observacao || "Registro"));
  }
  return partes.join(" • ");
}


function manutMobileHistoricoProduto(produto = {}) {
  const historico = Array.isArray(produto?.historico) ? produto.historico : [];
  return historico
    .map(item => {
      const texto = manutMobileLimparPrefixoHistorico(String(item.alteracao || item.descricao || item.observacao || item.status || "").trim());
      const dataTxt = item.data || item.criado_em || item.atualizado_em || item.created_at || "";
      const dataObj = dataTxt ? new Date(dataTxt) : null;
      return { ...item, texto, dataObj, ts: dataObj && !Number.isNaN(dataObj.getTime()) ? dataObj.getTime() : 0 };
    })
    .filter(item => item.texto || item.ts)
    .sort((a, b) => b.ts - a.ts);
}

function manutMobileEhServicoHistorico(texto = "") {
  const t = manutMobileNormalizar(texto);
  return ["limpo", "limpa", "revisado", "revisada", "consertado", "consertada", "bloqueado", "bloqueada", "liberado", "liberada", "checado", "checagem"].some(p => t.includes(p));
}

function manutMobileServicoLabel(texto = "") {
  const t = manutMobileNormalizar(texto);
  if (t.includes("limp")) return "Limpo";
  if (t.includes("revis")) return "Revisado";
  if (t.includes("consert")) return "Consertado";
  if (t.includes("bloque")) return "Bloqueado";
  if (t.includes("liber")) return "Liberado";
  if (t.includes("chec")) return "Checado";
  return String(texto || "Serviço").split(" - ")[0].slice(0, 32);
}

function manutMobileServicoClasse(label = "") {
  const t = manutMobileNormalizar(label);
  if (t.includes("limpo")) return "ok";
  if (t.includes("revis")) return "warn";
  if (t.includes("consert")) return "danger";
  if (t.includes("bloque")) return "dark";
  if (t.includes("liber")) return "ok";
  return "neutral";
}

function manutMobileDataCurta(dataObj) {
  if (!dataObj || Number.isNaN(dataObj.getTime())) return "";
  return `${String(dataObj.getDate()).padStart(2, "0")}/${String(dataObj.getMonth() + 1).padStart(2, "0")}`;
}

function manutMobileTempoRelativo(dataObj) {
  if (!dataObj || Number.isNaN(dataObj.getTime())) return "";
  const diff = Date.now() - dataObj.getTime();
  if (diff < 0) return "agora";
  const min = Math.floor(diff / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min}min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h}h`;
  const d = Math.floor(h / 24);
  return d === 1 ? "há 1 dia" : `há ${d} dias`;
}

function manutMobileHistoricoServicos(produto = {}) {
  return manutMobileHistoricoProduto(produto).filter(item => manutMobileEhServicoHistorico(item.texto));
}

function manutMobileRenderHistoricoResumo(produto = {}) {
  const historicoStatus = manutMobileHistoricoProduto(produto)
    .map(item => ({ item, status: manutMobileStatusHistorico(item) }))
    .filter(reg => reg.status)
    .slice(0, 3);
  const linhas = historicoStatus.map(({ item, status }) => {
    const data = item.dataObj && !Number.isNaN(item.dataObj.getTime()) ? manutMobileDataCurta(item.dataObj) : "-";
    return `<div class="manut-mobile-hist-row"><span>${manutMobileEscape(data)}</span><strong>${manutMobileEscape(status.replace(/^Status:\s*/i, ""))}</strong></div>`;
  }).join("");

  return `
    <div class="manut-mobile-historico-resumo manut-mobile-historico-card">
      <div class="manut-mobile-hist-titulo">Histórico recente</div>
      <div class="manut-mobile-hist-recent">
        ${linhas || `<div class="manut-mobile-hist-row vazio">Sem mudança de status.</div>`}
      </div>
      <button type="button" class="manut-mobile-hist-more" data-manut-hist-mais>exibir mais</button>
    </div>
  `;
}




function manutMobileAbrirHistoricoCompleto(produto = {}) {
  const historico = manutMobileHistoricoProduto(produto);
  const titulo = manutMobileEscape(produto.codigo || produto.numero || produto.id || "Produto");
  const linhas = historico.length
    ? historico.slice(0, 120).map(item => {
        const data = item.dataObj && !Number.isNaN(item.dataObj.getTime())
          ? `${manutMobileDataCurta(item.dataObj)} ${String(item.dataObj.getHours()).padStart(2, "0")}:${String(item.dataObj.getMinutes()).padStart(2, "0")}`
          : "-";
        const usuario = item.usuario || item.colaborador || item.responsavel || "";
        const textoOriginal = manutMobileTextoHistoricoCompacto(item) || "Registro";
        const texto = manutMobileEscape(textoOriginal);
        const termosBusca = manutMobileNormalizar([
          data,
          usuario,
          textoOriginal,
          item.texto,
          item.alteracao,
          item.observacao,
          item.descricao,
          item.status,
          Array.isArray(item.checklist) ? item.checklist.join(" ") : item.checklist
        ].filter(Boolean).join(" "));
        return `
          <div class="manut-mobile-hist-modal-row" data-hist-text="${manutMobileEscape(termosBusca)}">
            <span>${manutMobileEscape(data)}</span>
            <strong>${texto}</strong>
            ${usuario ? `<em>${manutMobileEscape(usuario)}</em>` : ""}
          </div>
        `;
      }).join("")
    : `<p class="empty">Sem histórico registrado para este produto.</p>`;

  let modal = document.getElementById("manutMobileHistoricoDialog");
  if (!modal) {
    modal = document.createElement("dialog");
    modal.id = "manutMobileHistoricoDialog";
    modal.className = "modal manut-mobile-hist-modal";
    document.body.appendChild(modal);
  }

  modal.innerHTML = `
    <div class="modal-header">
      <h2>Histórico ${titulo}</h2>
      <button type="button" class="icon-btn" id="manutMobileFecharHistorico">×</button>
    </div>
    ${historico.length ? `
      <input type="search" id="manutMobileBuscaHistorico" class="manut-mobile-hist-search" placeholder="🔎 Pesquisar no histórico...">
      <div class="manut-mobile-hist-count" id="manutMobileHistCount">${historico.length} registro(s)</div>
    ` : ""}
    <div class="manut-mobile-hist-modal-lista">${linhas}</div>
  `;

  modal.querySelector("#manutMobileFecharHistorico")?.addEventListener("click", () => modal.close());
  const busca = modal.querySelector("#manutMobileBuscaHistorico");
  const contador = modal.querySelector("#manutMobileHistCount");
  if (busca) {
    busca.addEventListener("input", () => {
      const termo = manutMobileNormalizar(busca.value);
      const rows = [...modal.querySelectorAll(".manut-mobile-hist-modal-row")];
      let visiveis = 0;
      rows.forEach(row => {
        const ok = !termo || String(row.dataset.histText || "").includes(termo);
        row.hidden = !ok;
        if (ok) visiveis += 1;
      });
      if (contador) contador.textContent = termo ? `${visiveis} resultado(s)` : `${rows.length} registro(s)`;
    });
  }
  try { modal.showModal(); } catch { modal.setAttribute("open", "open"); }
  setTimeout(() => busca?.focus?.(), 80);
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


function manutMobileTituloInline(produto = {}) {
  const codigo = produto.codigo || produto.numero || produto.id || "";
  const nome = manutMobileProdutoTitulo(produto);
  return `<span class="manut-mobile-codigo-destaque">${manutMobileEscape(codigo)}</span> <span class="manut-mobile-title-produto">${manutMobileEscape(nome)}</span>`;
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

function manutMobileUsabilidadeFiltros() {
  return ["Todos", "Excelente", "Bom", "Regular", "Ruim", "Venda"];
}

function manutMobileUsabilidadeProduto(produto = {}) {
  return String(produto.grau_usabilidade || produto.usabilidade || "Bom").trim() || "Bom";
}

function manutMobileUsabilidadeCombina(produto = {}) {
  const filtro = manutMobileNormalizar(manutencaoMobileUsabilidadeFiltroAtual || "Todos");
  if (!filtro || filtro === "todos") return true;
  const atual = manutMobileNormalizar(manutMobileUsabilidadeProduto(produto));
  if (filtro === "venda") return atual.includes("venda") || atual.includes("baixa");
  return atual === filtro;
}

function manutMobileAtualizarBotaoUsabilidadeFiltro() {
  const btn = document.getElementById("manutMobileUsabilidadeFiltroBtn");
  if (!btn) return;
  const valor = manutencaoMobileUsabilidadeFiltroAtual || "Todos";
  const strong = btn.querySelector("strong");
  if (strong) strong.textContent = valor;
  btn.dataset.manutUsabFiltro = valor;
  btn.className = `manut-usab-filtro usab-${manutMobileUsabilidadeClasse(valor)}`;
  btn.classList.toggle("active", manutMobileNormalizar(valor) !== "todos");
}

function manutMobileAlternarUsabilidadeFiltro() {
  const opcoes = manutMobileUsabilidadeFiltros();
  const atual = manutencaoMobileUsabilidadeFiltroAtual || "Todos";
  const idx = opcoes.findIndex(op => manutMobileNormalizar(op) === manutMobileNormalizar(atual));
  manutencaoMobileUsabilidadeFiltroAtual = opcoes[(idx + 1 + opcoes.length) % opcoes.length];
  manutMobileAtualizarBotaoUsabilidadeFiltro();
  renderizarManutencaoMobile();
}

function manutMobileDisponibilidadeResumo(produto = {}) {
  const linhasCompactas = [manutMobileProximoUsoLinha(produto), manutMobileLimpezaResumo(produto)];
  try {
    if (typeof disponibilidadePeriodoProduto === "function") {
      const disp = disponibilidadePeriodoProduto(produto) || {};
      return {
        titulo: disp.texto || "Disponibilidade",
        detalhe: linhasCompactas.join(" · "),
        detalheLongo: disp.detalhe || "Sem detalhe de disponibilidade"
      };
    }
    if (typeof proximoUsoProduto === "function") {
      const proximo = proximoUsoProduto(produto);
      if (proximo) {
        return { titulo: "Próximo uso", detalhe: linhasCompactas.join(" · "), detalheLongo: "Próximo evento encontrado" };
      }
    }
  } catch (erro) {
    console.warn("Não foi possível calcular disponibilidade mobile:", erro);
  }
  return { titulo: produto.status || "Livre", detalhe: linhasCompactas.join(" · "), detalheLongo: "Nenhum uso futuro encontrado" };
}


function manutMobileFormatarDataCurta(dataValor) {
  if (!dataValor) return "--/--";
  try {
    if (typeof formatarDataCurtaProdutoDisp === "function") return formatarDataCurtaProdutoDisp(dataValor);
    const d = dataValor instanceof Date ? dataValor : new Date(String(dataValor).includes("T") ? dataValor : `${dataValor}T12:00:00`);
    if (Number.isNaN(d.getTime())) return "--/--";
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
  } catch {
    return "--/--";
  }
}

function manutMobilePrimeiroNome(nome) {
  return String(nome || "Cliente").trim().split(/\s+/)[0] || "Cliente";
}

function manutMobileUltimaLimpezaProduto(produto = {}) {
  try {
    if (typeof ultimaLimpezaProduto === "function") return ultimaLimpezaProduto(produto);
  } catch {}
  const historico = Array.isArray(produto?.historico) ? produto.historico : [];
  return historico
    .map(item => ({ ...item, dataObj: new Date(item.data || item.criado_em || item.atualizado_em || 0) }))
    .filter(item => !Number.isNaN(item.dataObj.getTime()))
    .filter(item => {
      const txt = String(`${item.alteracao || ""} ${item.observacao || ""}`).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      return txt.includes("limpeza confirmada") || txt.includes("marcado como limpa") || txt.includes("marcado como limpo") || (txt.includes("limp") && txt.includes("livre"));
    })
    .sort((a, b) => b.dataObj - a.dataObj)[0] || null;
}

function manutMobileLimpezaResumo(produto = {}) {
  const limpeza = manutMobileUltimaLimpezaProduto(produto);
  return `Limp: ${limpeza ? manutMobileFormatarDataCurta(limpeza.dataObj || limpeza.data || limpeza.criado_em || limpeza.atualizado_em) : "—"}`;
}

function manutMobileProximoUsoLinha(produto = {}) {
  try {
    if (typeof proximoUsoProduto === "function") {
      const proximo = proximoUsoProduto(produto);
      if (proximo) {
        return `Próx: ${manutMobilePrimeiroNome(proximo.evento?.nome)} ${manutMobileFormatarDataCurta(proximo.inicioComparacao || proximo.intervalo?.inicio)}`;
      }
    }
  } catch {}
  return "Próx: —";
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
      .replace(/(?:^|\s*[,-]\s*)(Limpo|Revisado|Consertado)(?=\s*(?:,|-|$))/gi, "")
      .replace(/^\s*[,|-]\s*/, "")
      .replace(/\s*[,|-]\s*$/, "")
      .trim()
    )
    .filter(Boolean)
    .join("\n")
    .trim();
}

function manutMobileAtualizarObsChecklist() {
  // As ações executadas agora ficam registradas no histórico, sem poluir a observação.
  return;
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
      if (!manutMobileUsabilidadeCombina(produto)) return false;
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
  manutMobileAtualizarBotaoUsabilidadeFiltro();
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
        <h3 class="manut-mobile-produto-titulo-inline">${manutMobileTituloInline(produto)}</h3>
        <small>Status: ${manutMobileStatusBadge(produto.status)}</small>
        <small class="manut-mobile-card-disp">${manutMobileEscape(manutMobileProximoUsoLinha(produto))}</small>
        <small class="manut-mobile-card-disp">${manutMobileEscape(manutMobileLimpezaResumo(produto))}</small>
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


function manutMobileSnapshotProduto(produto = {}) {
  const historicoLen = Array.isArray(produto.historico) ? produto.historico.length : 0;
  const ultimoHist = historicoLen ? JSON.stringify(produto.historico[historicoLen - 1] || {}) : "";
  return [
    produto.id || "",
    produto.status || "",
    produto.observacao || "",
    produto.grau_usabilidade || produto.usabilidade || "",
    produto.atualizado_em || produto.updated_at || "",
    historicoLen,
    ultimoHist
  ].join("||");
}

function manutMobileChecksSelecionados() {
  return Array.from(document.querySelectorAll("#manutencaoMobileDetalhe [data-manut-check].manut-status-selecionado"))
    .map(btn => btn.dataset.manutCheck)
    .filter(Boolean);
}

function manutMobileTemEdicaoPendente(produto = {}) {
  const detalhe = document.getElementById("manutencaoMobileDetalhe");
  if (!detalhe || detalhe.hidden) return false;
  const obsTela = manutMobileRemoverMarcacoesAuto(String(document.getElementById("manutencaoMobileObs")?.value || "").trim());
  const obsOriginal = String(produto.observacao || "").trim();
  return !!manutencaoMobileStatusSelecionado
    || manutMobileChecksSelecionados().length > 0
    || obsTela !== obsOriginal;
}

function manutMobileFecharDetalheLimpo() {
  const detalhe = document.getElementById("manutencaoMobileDetalhe");
  if (detalhe) {
    detalhe.hidden = true;
    detalhe.classList.remove("manut-mobile-modal-wrap");
    detalhe.classList.remove("manut-mobile-inline-wrap");
  }
  manutencaoMobileProdutoAtualId = null;
  manutencaoMobileStatusSelecionado = "";
  const inputBusca = document.getElementById("manutencaoMobileCodigo");
  if (inputBusca) inputBusca.value = "";
  if (typeof window.rtMobilePushState === "function") window.rtMobilePushState("manutencaoMobileSection");
}

function manutMobileMostrarAvisoSincronizacao(produtoId) {
  const aviso = document.getElementById("manutMobileSyncAviso");
  if (!aviso) return;
  aviso.hidden = false;
  aviso.innerHTML = `Este produto foi atualizado por outro usuário. <button type="button" class="btn-outline btn-mini" id="manutMobileSyncAplicar">Atualizar dados</button>`;
  document.getElementById("manutMobileSyncAplicar")?.addEventListener("click", () => {
    const produtoAtualizado = (Array.isArray(produtos) ? produtos : []).find(p => String(p.id) === String(produtoId));
    if (produtoAtualizado) abrirManutencaoMobileProduto(produtoAtualizado.id, { semHistorico: true });
  });
}

async function manutMobileSincronizarProdutosAutomatico() {
  const section = document.getElementById("manutencaoMobileSection");
  if (!section || !section.classList.contains("active-section")) return;
  if (manutMobileSyncExecutando) return;
  if (typeof carregarProdutos !== "function") return;
  manutMobileSyncExecutando = true;
  const produtoAbertoId = manutencaoMobileProdutoAtualId;
  const detalhe = document.getElementById("manutencaoMobileDetalhe");
  const snapshotAnterior = detalhe?.dataset?.manutSnapshot || "";
  try {
    await carregarProdutos(true);
    renderizarManutencaoMobile();
    if (produtoAbertoId && detalhe && !detalhe.hidden) {
      const produtoAtualizado = (Array.isArray(produtos) ? produtos : []).find(p => String(p.id) === String(produtoAbertoId));
      if (produtoAtualizado) {
        const novoSnapshot = manutMobileSnapshotProduto(produtoAtualizado);
        if (snapshotAnterior && novoSnapshot !== snapshotAnterior) {
          if (manutMobileTemEdicaoPendente(produtoAtualizado)) {
            manutMobileMostrarAvisoSincronizacao(produtoAbertoId);
          } else {
            abrirManutencaoMobileProduto(produtoAbertoId, { semHistorico: true });
          }
        }
      }
    }
  } catch (err) {
    console.warn("Falha ao sincronizar manutenção mobile", err);
    manutMobileAvisoConexao("Sem conexão. Mantendo dados carregados.", true);
  } finally {
    manutMobileSyncExecutando = false;
  }
}

function manutMobileIniciarSincronizacaoAutomatica() {
  clearInterval(manutMobileSyncTimer);
  manutMobileSyncTimer = setInterval(manutMobileSincronizarProdutosAutomatico, 20000);
}

function manutMobileChecklistHtml(produto = {}) {
  return `
    <div class="manut-mobile-bloco-titulo">Ações executadas</div>
    <button type="button" class="btn-outline manut-acao-btn" data-manut-check="Limpo">Limpo</button>
    <button type="button" class="btn-outline manut-acao-btn" data-manut-check="Revisado">Revisado</button>
    <button type="button" class="btn-outline manut-acao-btn" data-manut-check="Consertado">Consertado</button>
  `;
}

function abrirManutencaoMobileProduto(id, opcoes = {}) {
  try { document.activeElement && document.activeElement.blur && document.activeElement.blur(); } catch {}
  manutencaoMobileProdutoAtualId = id;
  manutencaoMobileStatusSelecionado = "";
  if (!opcoes.semHistorico && typeof window.rtMobilePushState === "function") {
    window.rtMobilePushState("manutencaoMobileSection", { detalheProdutoId: String(id || "") });
  }
  const produto = (Array.isArray(produtos) ? produtos : []).find(p => String(p.id) === String(id));
  const detalhe = document.getElementById("manutencaoMobileDetalhe");
  if (!detalhe || !produto) return;
  const dispMobile = manutMobileDisponibilidadeResumo(produto);
  const usabilidadeAtual = produto.grau_usabilidade || produto.usabilidade || "Bom";

  // Abre sempre como modal fixo e visível.
  // Evita que a ficha apareça perdida no topo/meio/lista após várias aberturas.
  try {
    if (detalhe.parentElement !== document.body) {
      document.body.appendChild(detalhe);
    }
  } catch {}

  detalhe.hidden = false;
  detalhe.classList.remove("manut-mobile-inline-wrap");
  detalhe.classList.add("manut-mobile-modal-wrap");
  detalhe.innerHTML = `
    <div class="manut-mobile-detalhe-card manut-mobile-modal-card status-${manutMobileNormalizar(produto.status)}" role="dialog" aria-modal="true">
      <div class="manut-mobile-detalhe-top manut-mobile-modal-top">
        <div class="manut-mobile-produto-titulo">
          <h3 class="manut-mobile-produto-titulo-inline">${manutMobileTituloInline(produto)}</h3>
          <p>Status atual: ${manutMobileStatusBadge(produto.status)}</p>
        </div>
        <div class="manut-mobile-modal-acoes-topo">
          <button type="button" class="btn-outline manut-mobile-fechar" id="manutMobileFecharDetalhe" title="Fechar">×</button>
        </div>
      </div>

      <div class="manut-mobile-disponibilidade-box">
        <strong>Disponibilidade</strong>
        <span>${manutMobileEscape(dispMobile.titulo)}</span>
        <small>${manutMobileEscape(dispMobile.detalhe)}</small>
      </div>

      <div class="manut-mobile-info-linha manut-mobile-info-linha-3cards">
        <div class="manut-mobile-checado-box manut-mobile-info-card">
          <div>
            <strong>Checado no depósito</strong>
            <small>${manutMobileEscape(manutMobileResumoChecagem(produto))}</small>
          </div>
          <button type="button" class="btn-check-produto manut-mobile-check-deposito" id="manutMobileCheckDeposito" title="Marcar produto como checado no depósito">✓</button>
        </div>
        ${manutMobileRenderHistoricoResumo(produto)}
        <label class="manut-mobile-usabilidade-box manut-mobile-info-card">
          <span>Usabilidade</span>
          <select id="manutMobileUsabilidade" class="usab-${manutMobileUsabilidadeClasse(usabilidadeAtual)}">
            ${manutMobileUsabilidadeOpcoes().map(op => `<option value="${manutMobileEscape(op)}" ${String(op) === String(usabilidadeAtual) ? "selected" : ""}>${manutMobileEscape(op)}</option>`).join("")}
          </select>
        </label>
      </div>

      <div id="manutMobileSyncAviso" class="manut-mobile-sync-aviso" hidden></div>

      <div class="manut-mobile-checklist manut-mobile-acoes-executadas">
        ${manutMobileChecklistHtml(produto)}
      </div>

      <label class="manut-mobile-observacao manut-mobile-info-card">Observação / Reparo realizado
        <textarea id="manutencaoMobileObs" rows="1" placeholder="Ex.: Lavagem, troca de lona, costura, reparo...">${manutMobileEscape(produto.observacao || "")}</textarea>
      </label>

      <div class="manut-mobile-status-grupo">
        <div class="manut-mobile-bloco-titulo">Status do produto</div>
        <div class="manut-mobile-status-botoes manut-mobile-status-botoes-5">
          <button type="button" class="btn-outline" data-manut-status="Limpar">Limpar</button>
          <button type="button" class="btn-outline" data-manut-status="Revisar">Revisar</button>
          <button type="button" class="btn-outline" data-manut-status="Consertar">Consertar</button>
          <button type="button" class="btn-outline" data-manut-status="Bloqueado">Bloquear</button>
          <button type="button" class="btn-outline" data-manut-status="Livre">Liberar</button>
        </div>
      </div>

      <button type="button" class="btn-primary manut-mobile-concluir-grande" id="manutencaoMobileConcluirGrande">✓ Concluir</button>
    </div>
  `;
  detalhe.dataset.manutSnapshot = manutMobileSnapshotProduto(produto);

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

  detalhe.querySelectorAll("[data-manut-check]").forEach(btn => {
    btn.addEventListener("click", () => {
      btn.classList.toggle("manut-status-selecionado");
      manutMobileAtualizarObsChecklist();
    });
  });

  detalhe.querySelectorAll("[data-manut-status]").forEach(btn => {
    btn.addEventListener("click", () => {
      const status = btn.dataset.manutStatus || "";
      if (manutencaoMobileStatusSelecionado === status) {
        manutencaoMobileStatusSelecionado = "";
        btn.classList.remove("manut-status-selecionado");
        return;
      }
      manutencaoMobileStatusSelecionado = status;
      detalhe.querySelectorAll("[data-manut-status]").forEach(outro => outro.classList.remove("manut-status-selecionado"));
      btn.classList.add("manut-status-selecionado");
    });
  });

  document.getElementById("manutMobileCheckDeposito")?.addEventListener("click", () => marcarChecadoDepositoManutencaoMobile());
  document.getElementById("manutMobileUsabilidade")?.addEventListener("change", (ev) => alterarUsabilidadeManutencaoMobile(ev.currentTarget.value));

  function concluirManutencaoMobileProduto() {
    const checks = manutMobileChecksSelecionados();
    const statusFinal = checks.length ? "Livre" : (manutencaoMobileStatusSelecionado || (produto.status || "Revisar"));
    salvarManutencaoMobileProduto(statusFinal);
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


function manutMobileStatusIgual(a, b) {
  const na = manutMobileNormalizar(a || "");
  const nb = manutMobileNormalizar(b || "");
  if ((na === "bloqueado" && nb === "bloqueada") || (na === "bloqueada" && nb === "bloqueado")) return true;
  return na === nb;
}

function manutMobileAlteracaoReal(statusAnterior, statusDesejado, obsAnterior, obsAtual, checks) {
  const checklistMudou = Array.isArray(checks) && checks.length > 0;
  const statusFoiEscolhido = !!manutencaoMobileStatusSelecionado || checklistMudou;
  const statusMudou = statusFoiEscolhido && !manutMobileStatusIgual(statusAnterior, statusDesejado);
  const obsMudou = String(obsAtual || "").trim() !== String(obsAnterior || "").trim();
  return { statusMudou, obsMudou, checklistMudou, houve: statusMudou || obsMudou || checklistMudou };
}

async function salvarManutencaoMobileProduto(novoStatus) {
  const produto = (Array.isArray(produtos) ? produtos : []).find(p => String(p.id) === String(manutencaoMobileProdutoAtualId));
  if (!produto) return;

  const observacaoTela = String(document.getElementById("manutencaoMobileObs")?.value || "").trim();
  const observacao = manutMobileRemoverMarcacoesAuto(observacaoTela);
  const checks = manutMobileChecksSelecionados();

  const statusAnterior = produto.status || "";
  const obsAnterior = produto.observacao || "";
  // Ao executar serviço (Limpo/Consertado/Revisado), libera automaticamente para uso.
  const statusDesejado = checks.length ? "Livre" : (manutencaoMobileStatusSelecionado || novoStatus || produto.status || "Revisar");
  const statusNormalizado = manutMobileNormalizar(statusDesejado || produto.status || "Revisar");
  const alteracaoReal = manutMobileAlteracaoReal(statusAnterior, statusDesejado, obsAnterior, observacao, checks);
  const statusMudou = alteracaoReal.statusMudou;
  const obsMudou = alteracaoReal.obsMudou;

  if (!alteracaoReal.houve) {
    // Sem botão selecionado efetivo, sem checklist e sem alteração de observação:
    // não grava status Livre → Livre e não registra histórico.
    manutMobileFecharDetalheLimpo();
    renderizarManutencaoMobile();
    return;
  }

  // Quando há serviço executado selecionado, não exige observação para concluir/liberar.
  if (!observacao && statusNormalizado === "livre" && statusMudou && !checks.length) {
    const ok = confirm("Deseja liberar sem preencher observação de manutenção?");
    if (!ok) return;
  }

  const colaborador = typeof getColaboradorLogado === "function" ? getColaboradorLogado() : "Mobile";
  const dataAgora = new Date().toISOString();
  const obsHistorico = [observacao, checks.length ? `Checklist: ${checks.join(", ")}` : ""].filter(Boolean).join(" | ");

  produto.status = statusMudou ? statusDesejado : (produto.status || "Revisar");
  produto.observacao = manutMobileNormalizar(produto.status) === "livre" ? "" : observacao;
  produto.colaborador = colaborador;
  produto.atualizado_em = dataAgora;
  produto.historico = Array.isArray(produto.historico) ? produto.historico : [];
  if (statusMudou || obsHistorico || obsMudou) {
    produto.historico.push({
      data: dataAgora,
      colaborador,
      alteracao: statusMudou ? `${statusAnterior || "-"} → ${produto.status}` : "Checklist / observação atualizados",
      observacao: obsHistorico || (obsMudou ? observacao : "-")
    });
  }

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
    manutMobileFecharDetalheLimpo();
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

  document.getElementById("manutencaoMobileAtualizarBtn")?.addEventListener("click", manutMobileRecarregarComAviso);

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      setTimeout(() => {
        const section = document.getElementById("manutencaoMobileSection");
        if (section?.classList.contains("active-section")) manutMobileRecarregarComAviso();
      }, 1200);
    }
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

  document.getElementById("manutMobileUsabilidadeFiltroBtn")?.addEventListener("click", manutMobileAlternarUsabilidadeFiltro);
  manutMobileAtualizarBotaoUsabilidadeFiltro();

  setTimeout(renderizarManutencaoMobile, 900);
  manutMobileIniciarSincronizacaoAutomatica();
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


document.addEventListener("click", (ev) => {
  const btn = ev.target?.closest?.("[data-manut-hist-mais]");
  if (!btn) return;
  ev.preventDefault();
  ev.stopPropagation();
  try {
    const produto = Array.isArray(produtos) ? produtos.find(p => String(p.id) === String(manutencaoMobileProdutoAtualId)) : null;
    manutMobileAbrirHistoricoCompleto(produto || {});
  } catch {
    manutMobileAbrirHistoricoCompleto({});
  }
});
