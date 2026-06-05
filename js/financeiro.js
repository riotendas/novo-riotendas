// v19-dev - Financeiro como Conferência Bancária de Pix/Transferência
// Lê automaticamente o campo Forma de Pagamento dos eventos e lista somente registros Pix/Transferência.

const RT_FIN_BANCO_KEY = "novoRioTendasConferenciaBancoV1";
let rtFinanceiroExtratoLinhas = [];
let rtFinanceiroExtratoSeq = 0;
let rtFinanceiroResumoMes = String(new Date().getMonth() + 1).padStart(2, "0");
let rtFinanceiroResumoAno = String(new Date().getFullYear());
let rtFinanceiroEventosCache = [];
let rtFinanceiroCarregandoEventos = null;

function rtFinEventosLista() {
  try { if (Array.isArray(eventos) && eventos.length) return eventos; } catch (e) {}
  try { if (Array.isArray(window.eventos) && window.eventos.length) return window.eventos; } catch (e) {}
  try { if (Array.isArray(rtFinanceiroEventosCache) && rtFinanceiroEventosCache.length) return rtFinanceiroEventosCache; } catch (e) {}

  const chavesLocais = [
    "novoRioTendasEventosV2",
    "novoRioTendasEventos",
    "eventos",
    "riotendas_eventos"
  ];
  for (const chave of chavesLocais) {
    try {
      const local = JSON.parse(localStorage.getItem(chave) || "[]");
      if (Array.isArray(local) && local.length) return local;
    } catch (e) {}
  }

  try { if (Array.isArray(eventos)) return eventos; } catch (e) {}
  try { if (Array.isArray(window.eventos)) return window.eventos; } catch (e) {}
  return [];
}

async function rtFinGarantirEventosAtualizados() {
  const atuais = rtFinEventosLista();
  if (Array.isArray(atuais) && atuais.length) return atuais;

  if (rtFinanceiroCarregandoEventos) return rtFinanceiroCarregandoEventos;

  if (typeof buscarEventosBanco === "function") {
    rtFinanceiroCarregandoEventos = buscarEventosBanco()
      .then(lista => {
        if (Array.isArray(lista)) {
          rtFinanceiroEventosCache = lista;
          try { window.eventos = lista; } catch (e) {}
          try { if (typeof eventos !== "undefined") eventos = lista; } catch (e) {}
          return lista;
        }
        return [];
      })
      .catch(() => [])
      .finally(() => { rtFinanceiroCarregandoEventos = null; });
    return rtFinanceiroCarregandoEventos;
  }

  return atuais || [];
}

function rtFinValorEvento(evento, nomes) {
  for (const nome of nomes) {
    if (evento && evento[nome] !== undefined && evento[nome] !== null && evento[nome] !== "") {
      return rtFinValorNumero(evento[nome]);
    }
  }
  return 0;
}

function rtFinMoeda(valor) {
  if (typeof dinheiro === "function") return dinheiro(valor);
  return Number(valor || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function rtFinValorNumero(valor) {
  if (typeof moedaParaNumero === "function") return moedaParaNumero(valor);
  let texto = String(valor || "").replace(/R\$/gi, "").trim();
  if (!texto) return 0;
  texto = texto.replace(/\./g, "").replace(",", ".").replace(/[^\d.-]/g, "");
  const n = Number(texto);
  return Number.isFinite(n) ? n : 0;
}

function rtFinDataBR(data) {
  if (!data) return "-";
  const s = String(data).trim();
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[3]}/${iso[2]}/${iso[1].slice(-2)}`;
  const br = s.match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{2,4})$/);
  if (br) return `${br[1]}/${br[2]}/${br[3].slice(-2)}`;
  return s;
}

function rtFinAnoAtualPadrao() {
  const ano = new Date().getFullYear();
  return Number.isFinite(ano) ? String(ano) : "2026";
}

function rtFinMesTextoParaNumero(mes) {
  const chave = String(mes || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z]/g, "");
  const meses = {
    jan: "01", janeiro: "01",
    fev: "02", fevereiro: "02",
    mar: "03", marco: "03",
    abr: "04", abril: "04",
    mai: "05", maio: "05",
    jun: "06", junho: "06",
    jul: "07", julho: "07",
    ago: "08", agosto: "08",
    set: "09", setembro: "09",
    out: "10", outubro: "10",
    nov: "11", novembro: "11",
    dez: "12", dezembro: "12"
  };
  return meses[chave] || meses[chave.slice(0, 3)] || "";
}

function rtFinNormalizarData(texto) {
  const t = String(texto || "").trim();
  if (!t) return "";

  // Primeiro reconhece ISO do sistema: 2026-06-04.
  // Antes estava lendo isso como 26/06/04, jogando o ano para 2004.
  let m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T\s].*)?$/);
  if (m) return `${m[1]}-${String(m[2]).padStart(2, "0")}-${String(m[3]).padStart(2, "0")}`;

  // Depois datas brasileiras: 04/06/2026 ou 04/06/26.
  m = t.match(/(?:^|\D)(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})(?:\D|$)/);
  if (m) {
    const ano = String(m[3]).length === 2 ? `20${m[3]}` : String(m[3]);
    return `${ano}-${String(m[2]).padStart(2, "0")}-${String(m[1]).padStart(2, "0")}`;
  }

  // Datas de extrato com mês em texto: 29/abr, 05/mai/26, 12/jun/2026.
  m = t.match(/(?:^|\D)(\d{1,2})[\/\-]([a-zA-ZÀ-ÿçÇ]{3,9})(?:[\/\-](\d{2,4}))?(?:\D|$)/);
  if (m) {
    const dia = String(m[1]).padStart(2, "0");
    const mes = rtFinMesTextoParaNumero(m[2]);
    if (mes) {
      const anoRaw = m[3] || rtFinAnoAtualPadrao();
      const ano = String(anoRaw).length === 2 ? `20${anoRaw}` : String(anoRaw);
      return `${ano}-${mes}-${dia}`;
    }
  }

  // Datas sem ano: 04/06 -> usa o ano atual da competência/sistema.
  m = t.match(/(?:^|\D)(\d{1,2})[\/\-](\d{1,2})(?:\D|$)/);
  if (m) return `${rtFinAnoAtualPadrao()}-${String(m[2]).padStart(2, "0")}-${String(m[1]).padStart(2, "0")}`;

  return "";
}

function rtFinExtrairValor(texto) {
  const t = String(texto || "");
  const matches = [...t.matchAll(/(?:R\$\s*)?([0-9]{1,3}(?:\.[0-9]{3})*,[0-9]{2}|[0-9]+,[0-9]{2}|[0-9]+\.\d{2})/g)];
  if (!matches.length) return 0;
  return rtFinValorNumero(matches[matches.length - 1][1]);
}

function rtFinCarregarStatus() {
  try { return JSON.parse(localStorage.getItem(RT_FIN_BANCO_KEY) || "{}"); }
  catch (e) { return {}; }
}

function rtFinSalvarStatus(obj) {
  localStorage.setItem(RT_FIN_BANCO_KEY, JSON.stringify(obj || {}));
}

function rtFinTipoValor(evento, tipo) {
  const t = String(tipo || "").toLowerCase();
  if (t.includes("pg total")) return rtFinValorEvento(evento, ["valor_total", "total", "valorTotal", "valor", "preco_total"]);
  if (t.includes("sinal")) return rtFinValorEvento(evento, ["valor_sinal", "sinal", "valorSinal", "valor_entrada", "entrada"]);
  if (t.includes("restante")) return rtFinValorEvento(evento, ["valor_restante", "restante", "valorRestante", "saldo"]);
  return 0;
}

function rtFinLinhaId(evento, tipo, dataInformada, valor) {
  return [evento.id || evento._id || evento.data_evento || "evento", tipo, dataInformada || "sem-data", Number(valor || 0).toFixed(2)].join("|");
}

function rtFinExtrairPagamentosBanco() {
  const registros = [];
  rtFinEventosLista().forEach(evento => {
    const forma = String(evento.forma_pagamento || "");
    if (!forma.toLowerCase().includes("pix/transfer")) return;
    forma.split(/\r?\n|;/).map(l => l.trim()).filter(Boolean).forEach(linha => {
      const m = linha.match(/^(Pg\s*Total|Sinal|Restante)\s*-\s*Pix\s*\/\s*Transfer[eê]ncia\s*-\s*(.*)$/i);
      if (!m) return;
      const tipoRaw = m[1].replace(/\s+/g, " ").trim();
      const tipo = /^pg/i.test(tipoRaw) ? "Pg Total" : tipoRaw.charAt(0).toUpperCase() + tipoRaw.slice(1).toLowerCase();
      const dataTexto = String(m[2] || "").trim();
      const dataISO = rtFinNormalizarData(dataTexto);
      const valor = rtFinTipoValor(evento, tipo);
      registros.push({
        id: rtFinLinhaId(evento, tipo, dataTexto || dataISO, valor),
        evento_id: evento.id,
        data_evento: evento.data_evento || "",
        cliente: evento.nome || evento.cliente || "-",
        telefone: evento.telefone || "-",
        tipo,
        forma: "Pix/Transferência",
        data_informada: dataISO || dataTexto || "",
        data_texto: dataTexto,
        valor,
        evento_descricao: evento.tipo_evento || evento.observacao || evento.endereco || "",
        linha_original: linha
      });
    });
  });
  return registros.sort((a, b) => String(a.data_informada || "9999").localeCompare(String(b.data_informada || "9999")) || String(a.cliente).localeCompare(String(b.cliente)));
}

function rtFinStatusTexto(status) {
  const mapa = {
    a_conferir: "A conferir",
    sugestao: "Sugestão encontrada",
    conferido: "Conferido",
    divergencia: "Divergência",
    nao_encontrado: "Não encontrado"
  };
  return mapa[status || "a_conferir"] || "A conferir";
}

function rtFinSetStatus(id, status) {
  const dados = rtFinCarregarStatus();
  const atual = dados[id] || {};
  const registrosLog = typeof rtFinExtrairPagamentosBanco === "function" ? rtFinExtrairPagamentosBanco() : [];
  const registroLog = registrosLog.find(r => String(r.id) === String(id));
  let obs = atual.observacao || "";
  if (status === "divergencia") {
    obs = prompt("Informe a divergência encontrada no extrato:", obs) || obs;
  }
  if (status === "nao_encontrado") {
    obs = prompt("Observação para este pagamento não encontrado:", obs || "Não localizado no extrato") || obs;
  }
  dados[id] = {
    status,
    observacao: obs,
    conferido_em: new Date().toISOString(),
    colaborador: typeof getColaboradorLogado === "function" ? getColaboradorLogado() : ""
  };
  rtFinSalvarStatus(dados);
  if (typeof registrarLogSistema === "function") {
    registrarLogSistema({
      modulo: "Financeiro",
      acao: `Status financeiro: ${rtFinStatusTexto(status)}`,
      registro_id: id,
      registro_nome: registroLog ? `${registroLog.cliente} - ${registroLog.tipo}` : id,
      antes: atual || null,
      depois: dados[id],
      detalhes: registroLog ? `${registroLog.tipo} ${registroLog.forma || ""} ${rtFinMoeda(registroLog.valor)} em ${rtFinDataBR(registroLog.data_informada)}` : ""
    });
  }
  rtFinRender();
}

function rtFinLimparStatus(id) {
  const dados = rtFinCarregarStatus();
  const antesLog = dados[id] || null;
  delete dados[id];
  rtFinSalvarStatus(dados);
  if (typeof registrarLogSistema === "function") {
    registrarLogSistema({
      modulo: "Financeiro",
      acao: "Status financeiro limpo",
      registro_id: id,
      registro_nome: id,
      antes: antesLog,
      depois: null
    });
  }
  rtFinRender();
}

function rtFinLerExtrato() {
  const texto = document.getElementById("financeiroExtratoTexto")?.value || "";
  rtFinanceiroExtratoSeq += 1;
  rtFinanceiroExtratoLinhas = texto.split(/\r?\n/).map((linha, idx) => {
    const limpa = linha.trim();
    if (!limpa) return null;
    return {
      id: `ext_${rtFinanceiroExtratoSeq}_${idx}`,
      linha: limpa,
      data: rtFinNormalizarData(limpa),
      valor: rtFinExtrairValor(limpa),
      usado: false
    };
  }).filter(Boolean);
  rtFinRenderExtrato();
  if (typeof registrarLogSistema === "function") {
    registrarLogSistema({
      modulo: "Financeiro",
      acao: "Extrato bancário lido",
      registro_id: `extrato-${Date.now()}`,
      registro_nome: "Conferência bancária",
      detalhes: `${rtFinanceiroExtratoLinhas.length} linha(s) lida(s)`
    });
  }
  rtFinRender();
}

function rtFinRenderExtrato() {
  const box = document.getElementById("financeiroExtratoResultado");
  if (!box) return;
  if (!rtFinanceiroExtratoLinhas.length) {
    box.className = "financeiro-extrato-resultado empty";
    box.textContent = "Nenhuma linha de extrato lida ainda.";
    return;
  }
  box.className = "financeiro-extrato-resultado";
  box.innerHTML = rtFinanceiroExtratoLinhas.map(l => `
    <div class="financeiro-extrato-line">
      <strong>${rtFinDataBR(l.data)}</strong>
      <span>${l.linha}</span>
      <em>${rtFinMoeda(l.valor)}</em>
    </div>
  `).join("");
}

function rtFinNormalizarTextoBusca(texto) {
  return String(texto || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function rtFinValoresIguais(a, b) {
  return Math.abs(Number(a || 0) - Number(b || 0)) < 0.01;
}

function rtFinEncontrarSugestao(registro) {
  if (!rtFinanceiroExtratoLinhas.length) return null;
  const dataRegistro = rtFinNormalizarData(registro.data_informada || registro.data_texto || "");
  const nomeCliente = rtFinNormalizarTextoBusca(registro.cliente);

  // 1) Melhor sugestão: mesmo valor + mesma data + nome/parte do nome no extrato.
  let sugestao = rtFinanceiroExtratoLinhas.find(l => {
    if (!l.data || !dataRegistro || l.data !== dataRegistro) return false;
    if (!rtFinValoresIguais(l.valor, registro.valor)) return false;
    if (!nomeCliente) return false;
    return rtFinNormalizarTextoBusca(l.linha).includes(nomeCliente.split(" ")[0]);
  });

  // 2) Sugestão principal: mesmo valor + mesma data.
  if (!sugestao) {
    sugestao = rtFinanceiroExtratoLinhas.find(l => {
      if (!l.data || !dataRegistro || l.data !== dataRegistro) return false;
      return rtFinValoresIguais(l.valor, registro.valor);
    });
  }

  // 3) Apoio visual: mesmo valor, mas data diferente.
  if (!sugestao) {
    const porValor = rtFinanceiroExtratoLinhas.find(l => rtFinValoresIguais(l.valor, registro.valor));
    if (porValor) return { ...porValor, data_diferente: true };
  }

  return sugestao || null;
}

function rtFinAtualizarDataFormaPagamento(registro, extrato) {
  if (!registro || !extrato || !extrato.data) return { idFinal: registro?.id, dataAlterada: false, dataExtratoTexto: "" };

  const dataExtratoTexto = rtFinDataBR(extrato.data);
  const dataRegistroISO = rtFinNormalizarData(registro.data_informada || registro.data_texto || "");

  if (dataRegistroISO && dataRegistroISO === extrato.data) {
    return { idFinal: registro.id, dataAlterada: false, dataExtratoTexto };
  }

  const evento = rtFinEventosLista().find(e => String(e.id) === String(registro.evento_id));
  if (!evento) return { idFinal: registro.id, dataAlterada: false, dataExtratoTexto };

  const linhas = String(evento.forma_pagamento || "").split(/\r?\n/);
  const prefixo = `${registro.tipo} - Pix/Transferência -`;
  let alterou = false;

  const novasLinhas = linhas.map(linha => {
    const limpa = String(linha || "").trim();
    if (limpa === String(registro.linha_original || "").trim()) {
      alterou = true;
      return `${prefixo} ${dataExtratoTexto}`;
    }
    const rx = new RegExp(`^${registro.tipo.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}\\s*-\\s*Pix\\s*\\/\\s*Transfer[eê]ncia\\s*-`, "i");
    if (!alterou && rx.test(limpa) && rtFinValoresIguais(rtFinTipoValor(evento, registro.tipo), registro.valor)) {
      alterou = true;
      return `${prefixo} ${dataExtratoTexto}`;
    }
    return linha;
  });

  if (!alterou) return { idFinal: registro.id, dataAlterada: false, dataExtratoTexto };

  evento.forma_pagamento = novasLinhas.join("\n");
  evento.atualizado_em = new Date().toISOString();

  const idx = rtFinEventosLista().findIndex(e => String(e.id) === String(evento.id));
  if (idx >= 0) rtFinEventosLista()[idx] = evento;

  if (typeof salvarEventoBanco === "function") {
    salvarEventoBanco(evento).then(salvo => {
      if (salvo) {
        const i = rtFinEventosLista().findIndex(e => String(e.id) === String(salvo.id));
        if (i >= 0) rtFinEventosLista()[i] = salvo;
      }
      if (typeof renderizarEventos === "function") renderizarEventos();
    }).catch(err => {
      console.error("Erro ao atualizar a data da forma de pagamento:", err);
      alert("O pagamento foi conferido, mas não foi possível atualizar a data no evento.");
    });
  } else {
    try {
      if (typeof storageEventosKey !== "undefined") {
        localStorage.setItem(storageEventosKey, JSON.stringify(rtFinEventosLista()));
      }
    } catch (e) {}
  }

  const idFinal = rtFinLinhaId(evento, registro.tipo, dataExtratoTexto, registro.valor);
  return { idFinal, dataAlterada: true, dataExtratoTexto };
}

function rtFinConfirmarSugestao(id, extratoId) {
  const registros = rtFinExtrairPagamentosBanco();
  const registro = registros.find(r => r.id === id);
  const extrato = rtFinanceiroExtratoLinhas.find(l => l.id === extratoId);
  const ajusteData = rtFinAtualizarDataFormaPagamento(registro, extrato);
  const idFinal = ajusteData.idFinal || id;
  const dados = rtFinCarregarStatus();
  if (idFinal !== id) delete dados[id];
  dados[idFinal] = {
    status: "conferido",
    observacao: extrato ? `Confirmado pelo extrato: ${extrato.linha}${ajusteData.dataAlterada ? ` | Data atualizada para ${ajusteData.dataExtratoTexto}` : ""}` : "Confirmado por sugestão do extrato",
    conferencia_automatica: true,
    data_atualizada_pelo_extrato: Boolean(ajusteData.dataAlterada),
    extrato_linha: extrato ? extrato.linha : "",
    extrato_data: extrato ? extrato.data : "",
    extrato_valor: extrato ? extrato.valor : "",
    conferido_em: new Date().toISOString(),
    colaborador: typeof getColaboradorLogado === "function" ? getColaboradorLogado() : ""
  };
  rtFinSalvarStatus(dados);
  if (typeof registrarLogSistema === "function") {
    registrarLogSistema({
      modulo: "Financeiro",
      acao: "Sugestão do extrato confirmada",
      registro_id: idFinal,
      registro_nome: registro ? `${registro.cliente} - ${registro.tipo}` : idFinal,
      antes: idFinal !== id ? { id_original: id } : null,
      depois: dados[idFinal],
      detalhes: extrato ? `Extrato: ${extrato.linha}` : "Confirmado por sugestão"
    });
  }
  rtFinRender();
}

function rtFinRender() {
  const tbody = document.getElementById("financeiroTbody");
  if (!tbody) return;

  const registros = rtFinExtrairPagamentosBanco();
  const statusSalvos = rtFinCarregarStatus();
  const busca = String(document.getElementById("financeiroBusca")?.value || "").toLowerCase();
  const filtroStatus = document.getElementById("financeiroFiltroStatus")?.value || "";

  const enriquecidos = registros.map(r => {
    const salvo = statusSalvos[r.id] || {};
    const sugestao = salvo.status === "conferido" ? null : rtFinEncontrarSugestao(r);
    const statusBase = salvo.status || (sugestao && !sugestao.data_diferente ? "sugestao" : "a_conferir");
    return { ...r, status: statusBase, status_salvo: salvo.status || "", observacao: salvo.observacao || "", conferido_em: salvo.conferido_em || "", sugestao };
  });

  const filtrados = enriquecidos.filter(r => {
    const alvo = [r.data_texto, r.cliente, r.telefone, r.tipo, r.valor, r.evento_descricao, r.observacao].join(" ").toLowerCase();
    if (busca && !alvo.includes(busca)) return false;
    if (filtroStatus && r.status !== filtroStatus) return false;
    return true;
  });

  const totalEsperado = enriquecidos.reduce((s, r) => s + Number(r.valor || 0), 0);
  const totalConferido = enriquecidos.filter(r => r.status === "conferido").reduce((s, r) => s + Number(r.valor || 0), 0);
  const totalAConferir = enriquecidos.filter(r => r.status === "a_conferir" || r.status === "sugestao").reduce((s, r) => s + Number(r.valor || 0), 0);
  const divergencias = enriquecidos.filter(r => r.status === "divergencia" || r.status === "nao_encontrado").length;
  const setTxt = (id, val, moeda = true) => { const el = document.getElementById(id); if (el) el.textContent = moeda ? rtFinMoeda(val) : String(val); };
  setTxt("finTotalPrevisto", totalEsperado);
  setTxt("finSinalPrevisto", totalConferido);
  setTxt("finRestantePrevisto", totalAConferir);
  setTxt("finEmAberto", divergencias, false);

  if (!filtrados.length) {
    tbody.innerHTML = `<tr><td colspan="10" class="empty">Nenhum Pix/Transferência encontrado no campo Forma de Pagamento dos eventos.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtrados.map(r => {
    const sugestaoHtml = r.sugestao ? `
      <div class="financeiro-sugestao ${r.sugestao.data_diferente ? "data-diferente" : ""}">
        <strong>${r.sugestao.data_diferente ? "Valor encontrado em outra data" : "Sugestão encontrada"}</strong>
        <span>${rtFinDataBR(r.sugestao.data)} · ${rtFinMoeda(r.sugestao.valor)}</span>
        <small>${r.sugestao.linha}</small>
      </div>` : `<span class="muted">Sem sugestão</span>`;
    return `
    <tr class="financeiro-status-${r.status}">
      <td>${rtFinDataBR(r.data_informada)}</td>
      <td>${r.cliente || "-"}</td>
      <td>${r.tipo}</td>
      <td>${rtFinMoeda(r.valor)}</td>
      <td>${rtFinDataBR(r.data_evento)}</td>
      <td>${r.evento_descricao || "-"}</td>
      <td>${sugestaoHtml}</td>
      <td><span class="financeiro-status-badge">${rtFinStatusTexto(r.status)}</span>${r.observacao ? `<div class="financeiro-registro"><span>${r.observacao}</span></div>` : ""}</td>
      <td>${r.linha_original}</td>
      <td class="financeiro-acoes">
        ${r.sugestao ? `<button type="button" class="btn-mini" data-fin-sugestao="${r.id}" data-extrato-id="${r.sugestao.id}">Confirmar sugestão</button>` : ""}
        <button type="button" class="btn-mini btn-outline" data-fin-status="conferido" data-fin-id="${r.id}">Confirmar manual</button>
        <button type="button" class="btn-mini btn-outline" data-fin-status="divergencia" data-fin-id="${r.id}">Divergência</button>
        <button type="button" class="btn-mini btn-outline" data-fin-status="nao_encontrado" data-fin-id="${r.id}">Não encontrado</button>
        ${r.status !== "a_conferir" && r.status !== "sugestao" ? `<button type="button" class="btn-mini btn-outline" data-fin-limpar="${r.id}">limpar</button>` : ""}
      </td>
    </tr>`;
  }).join("");

  tbody.querySelectorAll("[data-fin-status]").forEach(btn => {
    btn.addEventListener("click", () => rtFinSetStatus(btn.dataset.finId, btn.dataset.finStatus));
  });
  tbody.querySelectorAll("[data-fin-sugestao]").forEach(btn => {
    btn.addEventListener("click", () => rtFinConfirmarSugestao(btn.dataset.finSugestao, btn.dataset.extratoId));
  });
  tbody.querySelectorAll("[data-fin-limpar]").forEach(btn => {
    btn.addEventListener("click", () => rtFinLimparStatus(btn.dataset.finLimpar));
  });
}


function rtFinNormalizarFormaTexto(texto) {
  return String(texto || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function rtFinExtrairTodosPagamentosEvento(evento) {
  const registros = [];
  const forma = String(evento.forma_pagamento || "");
  forma.split(/\r?\n|;/).map(l => l.trim()).filter(Boolean).forEach(linha => {
    const m = linha.match(/^(Pg\s*Total|Sinal|Restante)\s*-\s*(Pix\s*\/\s*Transfer[eê]ncia|Dinheiro|Cart[aã]o)\s*-\s*(.*)$/i);
    if (!m) return;
    const tipoRaw = m[1].replace(/\s+/g, " ").trim();
    const tipo = /^pg/i.test(tipoRaw) ? "Pg Total" : tipoRaw.charAt(0).toUpperCase() + tipoRaw.slice(1).toLowerCase();
    const formaPg = /pix/i.test(m[2]) ? "Pix/Transferência" : (/dinheiro/i.test(m[2]) ? "Dinheiro" : "Cartão");
    const dataTexto = String(m[3] || "").trim();
    const dataISO = rtFinNormalizarData(dataTexto);
    registros.push({ tipo, forma: formaPg, data: dataISO || dataTexto || "", data_texto: dataTexto, valor: rtFinTipoValor(evento, tipo), linha_original: linha });
  });
  return registros;
}

function rtFinEventoTemPagamento(evento, tipo) {
  const pagamentos = rtFinExtrairTodosPagamentosEvento(evento);
  const t = String(tipo || "").toLowerCase();
  return pagamentos.some(p => String(p.tipo || "").toLowerCase() === t || String(p.tipo || "").toLowerCase().includes("pg total"));
}

function rtFinDataISOEvento(evento) {
  const candidatos = [
    evento?.data_evento,
    evento?.data,
    evento?.inicio,
    evento?.data_inicio,
    evento?.montagem,
    evento?.created_at,
    evento?.data_criacao,
    evento?.atualizado_em
  ];
  for (const valor of candidatos) {
    const data = rtFinNormalizarData(valor || "");
    if (data) return data;
  }
  return "";
}

function rtFinCompetenciaAtual() {
  return { ano: String(rtFinanceiroResumoAno || new Date().getFullYear()), mes: String(rtFinanceiroResumoMes || (new Date().getMonth() + 1)).padStart(2, "0") };
}

function rtFinMesmoMes(dataISO, anoRef, mesRef) {
  if (!dataISO) return false;
  const comp = rtFinCompetenciaAtual();
  const ano = String(anoRef || comp.ano);
  const mes = String(mesRef || comp.mes).padStart(2, "0");
  return String(dataISO).startsWith(`${ano}-${mes}`);
}

function rtFinAtualizarResumo() {
  const eventosLista = rtFinEventosLista();
  const comp = rtFinCompetenciaAtual();
  let receitaPrevista = 0;
  let recebidoMes = 0;
  let aReceber = 0;
  let sinaisPendentes = 0;
  let restantesPendentes = 0;
  let eventosQuitados = 0;
  let eventosPendentes = 0;

  eventosLista.forEach(evento => {
    const dataEvento = rtFinDataISOEvento(evento);
    const pagamentos = rtFinExtrairTodosPagamentosEvento(evento);
    const pagamentoNoMes = pagamentos.some(p => rtFinMesmoMes(p.data, comp.ano, comp.mes));
    const eventoNoMes = rtFinMesmoMes(dataEvento, comp.ano, comp.mes);

    // O resumo da competência considera eventos do mês selecionado e também pagamentos recebidos naquele mês.
    if (!eventoNoMes && !pagamentoNoMes) return;

    const temPgTotal = pagamentos.some(p => p.tipo === "Pg Total");
    const temSinal = temPgTotal || pagamentos.some(p => p.tipo === "Sinal");
    const temRestante = temPgTotal || pagamentos.some(p => p.tipo === "Restante");
    const valorTotal = rtFinTipoValor(evento, "Pg Total");
    const valorSinal = rtFinTipoValor(evento, "Sinal");
    const valorRestante = rtFinTipoValor(evento, "Restante");
    const totalPrevistoEvento = valorTotal || (valorSinal + valorRestante);

    // Receita prevista, pendências e contagem de eventos usam a data do evento.
    if (eventoNoMes) {
      receitaPrevista += totalPrevistoEvento;

      if (valorSinal > 0 && !temSinal) sinaisPendentes += valorSinal;
      if (valorRestante > 0 && !temRestante) restantesPendentes += valorRestante;

      if ((valorSinal > 0 && !temSinal) || (valorRestante > 0 && !temRestante) || (!temPgTotal && valorSinal <= 0 && valorRestante <= 0 && valorTotal > 0)) {
        eventosPendentes += 1;
      } else if (totalPrevistoEvento > 0) {
        eventosQuitados += 1;
      }
    }

    // Recebido no mês usa a data digitada no campo Forma de pagamento.
    pagamentos.forEach(p => {
      if (rtFinMesmoMes(p.data, comp.ano, comp.mes)) recebidoMes += Number(p.valor || 0);
    });
  });

  aReceber = sinaisPendentes + restantesPendentes;
  const faltante = Math.max(0, receitaPrevista - recebidoMes);
  const setTxt = (id, val, moeda = true) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = moeda ? rtFinMoeda(val) : String(val);
  };
  setTxt("finReceitaPrevista", receitaPrevista);
  setTxt("finRecebidoMes", recebidoMes);
  setTxt("finFaltanteMes", faltante);
  setTxt("finAReceberMes", aReceber);
  setTxt("finSinaisPendentes", sinaisPendentes);
  setTxt("finRestantesPendentes", restantesPendentes);
  setTxt("finEventosQuitados", eventosQuitados, false);
  setTxt("finEventosPendentes", eventosPendentes, false);
}

function rtFinDataHojeISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

function rtFinAdicionarDiasISO(dataISO, dias) {
  const base = dataISO ? new Date(`${dataISO}T12:00:00`) : new Date();
  base.setDate(base.getDate() + dias);
  return `${base.getFullYear()}-${String(base.getMonth()+1).padStart(2,"0")}-${String(base.getDate()).padStart(2,"0")}`;
}

function rtFinContasAReceber() {
  const contas = [];
  rtFinEventosLista().forEach(evento => {
    const data = rtFinDataISOEvento(evento);
    const cliente = evento.nome || evento.cliente || "-";
    const eventoDescricao = evento.tipo_evento || evento.observacao || evento.endereco || "-";
    const temPgTotal = rtFinEventoTemPagamento(evento, "Pg Total");
    const temSinal = temPgTotal || rtFinEventoTemPagamento(evento, "Sinal");
    const temRestante = temPgTotal || rtFinEventoTemPagamento(evento, "Restante");
    const sinal = rtFinTipoValor(evento, "Sinal");
    const restante = rtFinTipoValor(evento, "Restante");
    if (sinal > 0 && !temSinal) contas.push({ data, cliente, tipo: "Sinal", valor: sinal, evento: eventoDescricao, status: "Pendente" });
    if (restante > 0 && !temRestante) contas.push({ data, cliente, tipo: "Restante", valor: restante, evento: eventoDescricao, status: "Pendente" });
  });
  return contas.sort((a,b) => String(a.data || "9999").localeCompare(String(b.data || "9999")) || String(a.cliente).localeCompare(String(b.cliente)));
}

function rtFinRenderContasAReceber() {
  const tbody = document.getElementById("financeiroReceberTbody");
  if (!tbody) return;
  const filtro = document.getElementById("financeiroReceberFiltro")?.value || "todos";
  const hoje = rtFinDataHojeISO();
  const limite7 = rtFinAdicionarDiasISO(hoje, 7);
  const contas = rtFinContasAReceber().filter(c => {
    if (filtro === "hoje") return c.data === hoje;
    if (filtro === "7dias") return c.data && c.data >= hoje && c.data <= limite7;
    if (filtro === "vencidos") return c.data && c.data < hoje;
    return true;
  });
  if (!contas.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="empty">Nenhuma conta a receber para este filtro.</td></tr>`;
    return;
  }
  tbody.innerHTML = contas.map(c => `
    <tr>
      <td>${rtFinDataBR(c.data)}</td>
      <td>${c.cliente}</td>
      <td>${c.tipo}</td>
      <td>${rtFinMoeda(c.valor)}</td>
      <td>${c.evento || "-"}</td>
      <td><span class="financeiro-status-badge">${c.status}</span></td>
    </tr>
  `).join("");
}

function rtFinTrocarAba(aba) {
  document.querySelectorAll(".financeiro-tab").forEach(btn => btn.classList.toggle("active", btn.dataset.finTab === aba));
  document.querySelectorAll(".financeiro-tab-panel").forEach(panel => panel.classList.toggle("active", panel.dataset.finPanel === aba));
}

async function rtFinRenderTudoFase1() {
  await rtFinGarantirEventosAtualizados();
  rtFinAtualizarResumo();
  rtFinRenderContasAReceber();
  rtFinRender();
}

function rtFinAplicarCompetenciaNosCampos() {
  const mesEl = document.getElementById("financeiroResumoMes");
  const anoEl = document.getElementById("financeiroResumoAno");
  if (mesEl) mesEl.value = String(rtFinanceiroResumoMes).padStart(2, "0");
  if (anoEl) anoEl.value = String(rtFinanceiroResumoAno);
}

function rtFinDefinirCompetencia(ano, mes) {
  let a = Number(ano);
  let m = Number(mes);
  if (!Number.isFinite(a) || a < 2020) a = new Date().getFullYear();
  if (!Number.isFinite(m) || m < 1 || m > 12) m = new Date().getMonth() + 1;
  rtFinanceiroResumoAno = String(a);
  rtFinanceiroResumoMes = String(m).padStart(2, "0");
  rtFinAplicarCompetenciaNosCampos();
  rtFinAtualizarResumo();
}

function rtFinMoverCompetencia(deltaMeses) {
  const comp = rtFinCompetenciaAtual();
  const d = new Date(Number(comp.ano), Number(comp.mes) - 1 + Number(deltaMeses || 0), 1);
  rtFinDefinirCompetencia(d.getFullYear(), d.getMonth() + 1);
}

function rtFinConfigurarResumoCompetencia() {
  rtFinAplicarCompetenciaNosCampos();
  document.getElementById("financeiroResumoMes")?.addEventListener("change", (ev) => rtFinDefinirCompetencia(rtFinanceiroResumoAno, ev.target.value));
  document.getElementById("financeiroResumoAno")?.addEventListener("change", (ev) => rtFinDefinirCompetencia(ev.target.value, rtFinanceiroResumoMes));
  document.getElementById("financeiroMesAnteriorBtn")?.addEventListener("click", () => rtFinMoverCompetencia(-1));
  document.getElementById("financeiroMesAtualBtn")?.addEventListener("click", () => {
    const hoje = new Date();
    rtFinDefinirCompetencia(hoje.getFullYear(), hoje.getMonth() + 1);
  });
  document.getElementById("financeiroProximoMesBtn")?.addEventListener("click", () => rtFinMoverCompetencia(1));
}

function iniciarFinanceiro() {
  if (!document.getElementById("financeiroSection")) return;
  document.getElementById("financeiroAtualizarBtn")?.addEventListener("click", rtFinRenderTudoFase1);
  document.getElementById("financeiroLerExtratoBtn")?.addEventListener("click", rtFinLerExtrato);
  document.getElementById("financeiroLimparExtratoBtn")?.addEventListener("click", () => {
    const txt = document.getElementById("financeiroExtratoTexto");
    if (txt) txt.value = "";
    rtFinanceiroExtratoLinhas = [];
    rtFinRenderExtrato();
  });
  ["financeiroBusca", "financeiroFiltroStatus"].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener("input", rtFinRender);
    el.addEventListener("change", rtFinRender);
  });
  document.querySelectorAll(".financeiro-tab").forEach(btn => btn.addEventListener("click", () => rtFinTrocarAba(btn.dataset.finTab)));
  rtFinConfigurarResumoCompetencia();
  document.getElementById("financeiroReceberFiltro")?.addEventListener("change", rtFinRenderContasAReceber);
  setTimeout(rtFinRenderTudoFase1, 300);
  setTimeout(rtFinRenderTudoFase1, 1200);
  setTimeout(rtFinRenderTudoFase1, 2500);
}

document.addEventListener("DOMContentLoaded", iniciarFinanceiro);

(function(){
  const antigoHook = window.rtDepoisRenderizarEventosLista;
  window.rtDepoisRenderizarEventosLista = function(){
    if (typeof antigoHook === "function") antigoHook();
    setTimeout(rtFinRenderTudoFase1, 0);
  };

  function tentarEnvolverRenderizarEventos(){
    if (typeof window.renderizarEventos !== "function" || window.renderizarEventos.__rtFinResumoHook) return false;
    const original = window.renderizarEventos;
    window.renderizarEventos = function(){
      const r = original.apply(this, arguments);
      setTimeout(rtFinRenderTudoFase1, 0);
      return r;
    };
    window.renderizarEventos.__rtFinResumoHook = true;
    return true;
  }

  if (!tentarEnvolverRenderizarEventos()) {
    let tentativas = 0;
    const timer = setInterval(() => {
      tentativas += 1;
      if (tentarEnvolverRenderizarEventos() || tentativas > 20) clearInterval(timer);
    }, 250);
  }
})();
