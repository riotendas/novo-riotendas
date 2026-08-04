// v19-dev - Financeiro: lançamentos individuais de sinal + identificação de cancelados
// Lê automaticamente o campo Forma de Pagamento dos eventos e lista somente registros Pix/Transf./Dep./Boleto.

const RT_FIN_BANCO_KEY = "novoRioTendasConferenciaBancoV1";
let rtFinanceiroExtratoLinhas = [];
let rtFinanceiroExtratoSeq = 0;
let rtFinanceiroExtratoClipboard = { texto: "", html: "", ultimaCaptura: "" };
let rtFinanceiroResumoMes = String(new Date().getMonth() + 1).padStart(2, "0");
let rtFinanceiroResumoAno = String(new Date().getFullYear());
let rtFinanceiroEventosCache = [];
let rtFinanceiroCarregandoEventos = null;
let rtFinanceiroExtratoFiltro = localStorage.getItem("rtFinanceiroExtratoFiltro") || "pendentes";
let rtFinanceiroExtratoBusca = localStorage.getItem("rtFinanceiroExtratoBusca") || "";

function rtFinEventoTemFinanceiroConciliavel(evento) {
  if (!evento) return false;
  const forma = String(evento.forma_pagamento || "");
  const temLinhaBanco = forma.split(/\r?\n|;/).some(linha => {
    const t = String(linha || "").trim();
    if (!t) return false;
    const m = t.match(/^(Pg\s*Total|Sinal|Restante)\s*-\s*(Pix\s*\/\s*Transf\.\s*\/\s*Dep\.\s*\/\s*Boleto|Pix\s*\/\s*Transfer[eê]ncia|Pix\s*\/\s*Transf\.\s*\/\s*Dep[oó]sito\s*\/\s*Boleto|Dinheiro|Cart[aã]o(?:\s*\/\s*Rede)?|Rede|Dep[oó]sito|Boleto|[^\-]+?)\s*-\s*(.*)$/i);
    return !!(m && rtFinMetodoPagamentoAuditavel(String(m[2] || "")));
  });
  return temLinhaBanco || Number(evento.sinal || 0) > 0 || Number(evento.valor_pago || 0) > 0 || Number(evento.total_pago || 0) > 0;
}

function rtFinEventosLista() {
  // Para o financeiro, eventos cancelados com movimentação bancária continuam aparecendo
  // para conciliação de sinal, devolução, multa/crédito etc.
  const listaFinanceira = (lista) => (Array.isArray(lista) ? lista.filter(e => {
    const cancelado = (typeof rtEventoCancelado === "function" && rtEventoCancelado(e));
    return !cancelado || rtFinEventoTemFinanceiroConciliavel(e);
  }) : lista);
  try { if (Array.isArray(eventos) && eventos.length) return listaFinanceira(eventos); } catch (e) {}
  try { if (Array.isArray(window.eventos) && window.eventos.length) return listaFinanceira(window.eventos); } catch (e) {}
  try { if (Array.isArray(rtFinanceiroEventosCache) && rtFinanceiroEventosCache.length) return listaFinanceira(rtFinanceiroEventosCache); } catch (e) {}

  const chavesLocais = [
    "novoRioTendasEventosV2",
    "novoRioTendasEventos",
    "eventos",
    "riotendas_eventos"
  ];
  for (const chave of chavesLocais) {
    try {
      const local = JSON.parse(localStorage.getItem(chave) || "[]");
      if (Array.isArray(local) && local.length) return listaFinanceira(local);
    } catch (e) {}
  }

  try { if (Array.isArray(eventos)) return listaFinanceira(eventos); } catch (e) {}
  try { if (Array.isArray(window.eventos)) return listaFinanceira(window.eventos); } catch (e) {}
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

// Interpreta o trecho final da Forma de pagamento.
// Aceita tanto o formato antigo (apenas data) quanto o novo
// com lançamentos parciais: "3.980,00 - 30/07".
function rtFinExtrairDetalhesLancamento(texto, valorFallback = 0) {
  const bruto = String(texto || "").trim();
  const valorExplicito = rtFinExtrairValor(bruto);
  const dataISO = rtFinNormalizarData(bruto);
  return {
    texto: bruto,
    dataISO,
    valor: valorExplicito > 0 ? valorExplicito : Number(valorFallback || 0),
    valor_explicito: valorExplicito > 0
  };
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
  // Opções que devem ser conciliadas com extrato bancário.
  // Compatível com o texto antigo "Pix/Transferência" e com o novo
  // "Pix/Transf./Dep./Boleto". Cartão/Rede e Dinheiro ficam fora da lista
  // de associação direta, pois são tratados nos blocos separados da auditoria.
  return rtFinExtrairPagamentosAuditaveis()
    .filter(r => rtFinAuditoriaGrupo(r) === "pendentes")
    .sort((a, b) => String(a.data_informada || "9999").localeCompare(String(b.data_informada || "9999")) || String(a.cliente).localeCompare(String(b.cliente)));
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
  rtFinRenderPagamentosNaoLocalizados();
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


function rtFinEscapeHtml(texto) {
  return String(texto ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}



const RT_FIN_EXTRATO_LOCAL_KEY = "novoRioTendasExtratoBancarioLinhasV1";
let rtFinanceiroExtratoSalvo = [];

function rtFinSupabaseDisponivel() {
  try { return typeof supabaseClient !== "undefined" && !!supabaseClient; } catch (e) { return false; }
}

function rtFinColaboradorAtual() {
  try { if (typeof getColaboradorLogado === "function") return getColaboradorLogado() || ""; } catch (e) {}
  try { return JSON.parse(localStorage.getItem("usuarioLogado") || "{}").nome || ""; } catch (e) {}
  return "";
}

function rtFinExtratoLocalCarregar() {
  try { return JSON.parse(localStorage.getItem(RT_FIN_EXTRATO_LOCAL_KEY) || "[]"); } catch (e) { return []; }
}

function rtFinExtratoLocalSalvar(lista) {
  try { localStorage.setItem(RT_FIN_EXTRATO_LOCAL_KEY, JSON.stringify(Array.isArray(lista) ? lista : [])); } catch (e) {}
}

const RT_FIN_AUDITORIA_KEY = "novoRioTendasAuditoriaPagamentosV1";
let rtFinanceiroAuditoriaFiltro = localStorage.getItem("rtFinanceiroAuditoriaFiltro") || "pendentes";
let rtFinanceiroAuditoriaCache = {};
let rtFinanceiroAuditoriaNuvemOk = false;

function rtFinAuditoriaLocalCarregar() {
  try { return JSON.parse(localStorage.getItem(RT_FIN_AUDITORIA_KEY) || "{}"); } catch (e) { return {}; }
}

function rtFinAuditoriaLocalSalvar(obj) {
  try { localStorage.setItem(RT_FIN_AUDITORIA_KEY, JSON.stringify(obj || {})); } catch (e) {}
}

function rtFinAuditoriaCarregar() {
  return rtFinanceiroAuditoriaNuvemOk ? (rtFinanceiroAuditoriaCache || {}) : rtFinAuditoriaLocalCarregar();
}

function rtFinAuditoriaSalvar(obj) {
  rtFinanceiroAuditoriaCache = obj || {};
  rtFinAuditoriaLocalSalvar(rtFinanceiroAuditoriaCache);
}

async function rtFinAuditoriaCarregarNuvem() {
  if (!rtFinSupabaseDisponivel()) {
    rtFinanceiroAuditoriaNuvemOk = false;
    rtFinanceiroAuditoriaCache = rtFinAuditoriaLocalCarregar();
    return rtFinanceiroAuditoriaCache;
  }
  try {
    const { data, error } = await supabaseClient
      .from("financeiro_auditoria_pagamentos")
      .select("pagamento_id,status,observacao,colaborador,atualizado_em");
    if (error) throw error;
    const mapa = {};
    (data || []).forEach(r => {
      if (!r.pagamento_id) return;
      mapa[String(r.pagamento_id)] = {
        status: r.status || "",
        observacao: r.observacao || "",
        colaborador: r.colaborador || "",
        atualizado_em: r.atualizado_em || ""
      };
    });
    rtFinanceiroAuditoriaCache = mapa;
    rtFinanceiroAuditoriaNuvemOk = true;
    rtFinAuditoriaLocalSalvar(mapa);
    return mapa;
  } catch (err) {
    console.warn("Auditoria financeira: usando cache local porque não foi possível carregar Supabase", err);
    rtFinanceiroAuditoriaNuvemOk = false;
    rtFinanceiroAuditoriaCache = rtFinAuditoriaLocalCarregar();
    return rtFinanceiroAuditoriaCache;
  }
}

async function rtFinAuditoriaSalvarStatusNuvem(id, registro) {
  if (!id) return;
  const dados = rtFinAuditoriaCarregar();
  dados[id] = registro;
  rtFinAuditoriaSalvar(dados);
  if (!rtFinSupabaseDisponivel()) return;
  try {
    const payload = {
      pagamento_id: String(id),
      status: registro.status || "",
      observacao: registro.observacao || "",
      colaborador: registro.colaborador || rtFinColaboradorAtual(),
      atualizado_em: new Date().toISOString()
    };
    const { error } = await supabaseClient
      .from("financeiro_auditoria_pagamentos")
      .upsert(payload, { onConflict: "pagamento_id" });
    if (error) throw error;
    rtFinanceiroAuditoriaNuvemOk = true;
  } catch (err) {
    console.error("Não foi possível salvar a auditoria no Supabase", err);
    alert(`Não foi possível salvar esta marcação da auditoria no Supabase.\n\n${err.message || err}`);
  }
}

async function rtFinAuditoriaRemoverStatusNuvem(id) {
  if (!id) return;
  const dados = rtFinAuditoriaCarregar();
  delete dados[id];
  rtFinAuditoriaSalvar(dados);
  if (!rtFinSupabaseDisponivel()) return;
  try {
    const { error } = await supabaseClient
      .from("financeiro_auditoria_pagamentos")
      .delete()
      .eq("pagamento_id", String(id));
    if (error) throw error;
    rtFinanceiroAuditoriaNuvemOk = true;
  } catch (err) {
    console.error("Não foi possível remover a auditoria no Supabase", err);
    alert(`Não foi possível remover esta marcação da auditoria no Supabase.\n\n${err.message || err}`);
  }
}

function rtFinAuditoriaStatus(id) {
  const dados = rtFinAuditoriaCarregar();
  return dados[id] || null;
}

function rtFinAuditoriaGrupo(registro) {
  const st = rtFinAuditoriaStatus(registro?.id);
  if (st?.status === "outro") return "outros";
  if (st?.status === "ignorado") return "ignorados";
  const forma = rtFinNormalizarTextoBusca(registro?.forma || registro?.linha_original || "");
  if (/dinheiro|in loco/.test(forma)) return "dinheiro";
  if (/cartao|rede|maquininha|cielo|getnet|stone|master|visa|debito|credito/.test(forma)) return "cartao";
  return "pendentes";
}

function rtFinAuditoriaTextoBusca(registro) {
  const st = rtFinAuditoriaStatus(registro?.id) || {};
  return rtFinNormalizarTextoBusca([
    registro?.data_informada, registro?.data_texto, registro?.valor,
    registro?.tipo, registro?.forma, registro?.cliente,
    registro?.data_evento, registro?.evento_descricao, st.observacao
  ].join(" "));
}

async function rtFinMarcarAuditoriaPagamento(id, status) {
  const obsEl = document.querySelector(`[data-audit-obs="${CSS.escape(id)}"]`);
  const dados = rtFinAuditoriaCarregar();
  const registro = {
    status,
    observacao: obsEl ? obsEl.value : (dados[id]?.observacao || ""),
    atualizado_em: new Date().toISOString(),
    colaborador: rtFinColaboradorAtual()
  };
  await rtFinAuditoriaSalvarStatusNuvem(id, registro);
  rtFinRenderPagamentosNaoLocalizados();
  rtFinRenderExtratoSalvo();
}

async function rtFinLimparAuditoriaPagamento(id) {
  await rtFinAuditoriaRemoverStatusNuvem(id);
  rtFinRenderPagamentosNaoLocalizados();
  rtFinRenderExtratoSalvo();
}

function rtFinStatusLinhaExtrato(linha) {
  const status = String(linha?.status || "");
  if (status === "associado") return "✅ Associado";
  if (status === "rendimento") return "🏦 Rendimento";
  if (status === "outro") return "📌 Outro";
  if (status === "ignorado") return "🚫 Ignorado";
  if (linha?.tipo === "saida" || linha?.tipo === "saldo") return "🚫 Ignorado";
  if (linha?.tipo === "cartao" || linha?.tipo === "outro") return "📌 Outro / conferir";
  return "⚠ Pendente";
}

function rtFinGerarPayloadExtrato(item) {
  const sug = item.sugestao_evento || null;
  const tipo = item.tipo || "outro";
  return {
    fingerprint: item.fingerprint || rtFinLinhaExtratoFingerprint(item),
    data_lancamento: item.data || null,
    descricao: item.linha || "",
    linha_original: item.linha || "",
    valor: Math.abs(Number(item.valor || 0)),
    valor_assinado: Number(item.valor_assinado || item.valor || 0),
    tipo,
    status: tipo === "rendimento" ? "rendimento" : ((tipo === "saida" || tipo === "saldo") ? "ignorado" : (tipo === "cartao" || tipo === "outro" ? "outro" : "pendente")),
    cliente_nome: "",
    evento_id: null,
    evento_data: null,
    tipo_pagamento: "",
    valor_associado: null,
    sugestao_json: sug ? JSON.stringify(sug, (k, v) => k === "evento" ? undefined : v) : null,
    observacao: "",
    origem: "cola_itau",
    colaborador: rtFinColaboradorAtual(),
    atualizado_em: new Date().toISOString()
  };
}

async function rtFinSalvarExtratoProcessado() {
  if (!rtFinanceiroExtratoLinhas.length) {
    alert("Processe o extrato antes de salvar.");
    return;
  }
  const payloads = rtFinanceiroExtratoLinhas.map(rtFinGerarPayloadExtrato);
  try {
    let novas = payloads;
    let repetidas = 0;
    if (rtFinSupabaseDisponivel()) {
      const fingerprints = payloads.map(p => p.fingerprint).filter(Boolean);
      if (fingerprints.length) {
        const { data: existentes, error: erroBusca } = await supabaseClient
          .from("extrato_bancario_linhas")
          .select("fingerprint,data_lancamento,descricao,linha_original,valor,valor_assinado,status,criado_em,atualizado_em")
          .limit(5000);
        if (erroBusca) throw erroBusca;
        const jaExisteFingerprint = new Set((existentes || []).map(x => x.fingerprint).filter(Boolean));
        const jaExisteRobusto = new Set((existentes || []).map(x => rtFinAssinaturaExtratoRobusta(x)).filter(Boolean));
        repetidas = payloads.filter(p => jaExisteFingerprint.has(p.fingerprint) || jaExisteRobusto.has(rtFinAssinaturaExtratoRobusta(p))).length;
        novas = payloads.filter(p => !jaExisteFingerprint.has(p.fingerprint) && !jaExisteRobusto.has(rtFinAssinaturaExtratoRobusta(p)));
      }
      if (novas.length) {
        const { error } = await supabaseClient
          .from("extrato_bancario_linhas")
          .insert(novas);
        if (error) throw error;
      }
    } else {
      const atuais = rtFinExtratoLocalCarregar();
      payloads.forEach(p => {
        const idx = atuais.findIndex(x => x.fingerprint === p.fingerprint);
        if (idx >= 0) { repetidas += 1; return; }
        atuais.push({ ...p, id: `local_${Date.now()}_${Math.random().toString(36).slice(2)}`, criado_em: new Date().toISOString() });
      });
      rtFinExtratoLocalSalvar(atuais);
    }
    alert(`${payloads.length} linha(s) processada(s).\n${payloads.length - repetidas} nova(s) salva(s).\n${repetidas} repetida(s) ignorada(s).`);
    rtFinanceiroExtratoLinhas = [];
    const txt = document.getElementById("financeiroExtratoTexto");
    if (txt) txt.value = "";
    const diag = document.getElementById("financeiroExtratoDiagnostico");
    if (diag) { diag.className = "financeiro-extrato-diagnostico empty oculto"; diag.textContent = "Diagnóstico oculto."; diag.style.display = "none"; }
    rtFinRenderExtrato();
    await rtFinCarregarExtratoSalvo();
  } catch (err) {
    console.error(err);
    alert(`Não foi possível salvar o extrato. Confira se o SQL do Supabase foi executado.\n\n${err.message || err}`);
  }
}

async function rtFinCarregarExtratoSalvo() {
  await rtFinAuditoriaCarregarNuvem();
  try {
    if (rtFinSupabaseDisponivel()) {
      // Financeiro 2.1: não usar limit baixo aqui.
      // A listagem de associação ficava presa nos primeiros registros do extrato
      // e pagamentos a partir de determinadas datas deixavam de aparecer.
      const todos = [];
      const pageSize = 1000;
      for (let ini = 0; ini < 10000; ini += pageSize) {
        const fim = ini + pageSize - 1;
        const { data, error } = await supabaseClient
          .from("extrato_bancario_linhas")
          .select("id,fingerprint,data_lancamento,descricao,linha_original,valor,valor_assinado,tipo,status,cliente_nome,evento_id,evento_data,tipo_pagamento,valor_associado,sugestao_json,observacao,origem,colaborador,criado_em,atualizado_em")
          .order("data_lancamento", { ascending: true })
          .order("criado_em", { ascending: true })
          .range(ini, fim);
        if (error) throw error;
        const lote = Array.isArray(data) ? data : [];
        todos.push(...lote);
        if (lote.length < pageSize) break;
      }
      rtFinanceiroExtratoSalvo = rtFinDeduplicarExtratoSalvo(todos);
    } else {
      rtFinanceiroExtratoSalvo = rtFinDeduplicarExtratoSalvo(rtFinExtratoLocalCarregar()).sort((a,b) => String(a.data_lancamento || "9999").localeCompare(String(b.data_lancamento || "9999")) || String(a.criado_em || "").localeCompare(String(b.criado_em || "")));
    }
  } catch (err) {
    console.error(err);
    rtFinanceiroExtratoSalvo = rtFinDeduplicarExtratoSalvo(rtFinExtratoLocalCarregar());
  }
  rtFinRenderExtratoSalvo();
}

function rtFinOpcoesPagamentoEvento(evento) {
  const total = rtFinTipoValor(evento, "Pg Total");
  const sinal = rtFinTipoValor(evento, "Sinal");
  const restante = rtFinTipoValor(evento, "Restante");
  const opcoes = [];
  const add = (tipo, valor) => {
    if (Number(valor || 0) > 0 && !opcoes.some(o => o.tipo === tipo && rtFinValoresIguais(o.valor, valor))) {
      opcoes.push({ tipo, valor: Number(valor || 0) });
    }
  };

  // Evita duplicidade confusa: quando o restante é igual ao total porque não houve sinal, mostra só Pg Total.
  if (total > 0 && (sinal <= 0 || rtFinValoresIguais(total, restante))) {
    add("Pg Total", total);
    return opcoes;
  }

  if (sinal > 0) add("Sinal", sinal);
  if (restante > 0) add("Restante", restante);
  if (total > 0 && !rtFinValoresIguais(total, sinal) && !rtFinValoresIguais(total, restante) && !rtFinValoresIguais(total, sinal + restante)) {
    add("Pg Total", total);
  }
  if (!opcoes.length && total > 0) add("Pg Total", total);
  return opcoes;
}

function rtFinFormatarOpcaoAssociacao(o) {
  const dataAviso = rtFinDataBR(o.data_aviso || o.data_informada || "");
  const dataEvento = rtFinDataBR(o.data_evento || "");
  const valor = rtFinMoeda(o.valor || 0).replace(/^R\$\s*/, "R$ ");
  const tipo = String(o.tipo_pagamento || o.tipo || "").padEnd(8, " ");
  const cliente = String(o.cliente || "Cliente").trim();
  const tagCancelado = o.cancelado ? " [CANCELADO]" : "";
  return `${dataAviso.padEnd(8, " ")} | ${valor.padStart(12, " ")} | ${tipo} | ${cliente}${tagCancelado} - Evento ${dataEvento}`;
}

function rtFinRegistroPagamentoKey(r) {
  return r?.id || [r?.evento_id || "", r?.tipo || r?.tipo_pagamento || "", r?.data_informada || "", Number(r?.valor || 0).toFixed(2)].join("||");
}

function rtFinTotalAssociadoPagamento(eventoId, tipoPagamento, excluirLinhaId = "") {
  const evento = String(eventoId || "");
  const tipo = String(tipoPagamento || "").toLowerCase();
  let total = 0;
  rtFinanceiroExtratoSalvo.forEach(l => {
    if (String(l.status || "") !== "associado") return;
    const linhaId = String(l.id || l.fingerprint || "");
    if (excluirLinhaId && linhaId === String(excluirLinhaId)) return;
    const assocs = rtFinAssociacoesLinhaExtrato(l);
    assocs.forEach(a => {
      if (String(a.evento_id || "") !== evento) return;
      if (String(a.tipo_pagamento || "").toLowerCase() !== tipo) return;
      total += Number(a.valor || 0);
    });
  });
  return Math.max(0, total);
}


// Soma somente o que foi associado ao lançamento individual
// (evento + tipo + data + valor), permitindo dois sinais do mesmo evento.
function rtFinTotalAssociadoRegistro(registro, excluirLinhaId = "") {
  if (!registro) return 0;
  const chave = rtFinRegistroPagamentoKey(registro);
  const evento = String(registro.evento_id || "");
  const tipo = String(registro.tipo || registro.tipo_pagamento || "").toLowerCase();
  const candidatosMesmoTipo = rtFinExtrairPagamentosAuditaveis().filter(r =>
    String(r.evento_id || "") === evento &&
    String(r.tipo || "").toLowerCase() === tipo
  );
  const permitirFallbackLegado = candidatosMesmoTipo.length <= 1;
  let total = 0;
  rtFinanceiroExtratoSalvo.forEach(l => {
    if (String(l.status || "") !== "associado") return;
    const linhaId = String(l.id || l.fingerprint || "");
    if (excluirLinhaId && linhaId === String(excluirLinhaId)) return;
    rtFinAssociacoesLinhaExtrato(l).forEach(a => {
      const chaveAssoc = String(a.key || "");
      if (chaveAssoc && chaveAssoc === chave) {
        total += Number(a.valor || 0);
        return;
      }
      if (permitirFallbackLegado && a.legacy_only &&
          String(a.evento_id || "") === evento &&
          String(a.tipo_pagamento || "").toLowerCase() === tipo) {
        total += Number(a.valor || 0);
      }
    });
  });
  return Math.max(0, total);
}

function rtFinOpcoesPagamentoEventos(linhaExtrato = null) {
  const registros = rtFinExtrairPagamentosBanco();
  const item = linhaExtrato ? rtFinItemExtratoDeLinhaSalva(linhaExtrato) : null;
  const atualId = item ? String(item.id || "") : "";
  const bloqueadosAuditoria = new Set();

  // Pagamentos resolvidos manualmente na auditoria (Outros/Ignorar) não entram na associação.
  const auditoria = rtFinAuditoriaCarregar();
  Object.keys(auditoria || {}).forEach(id => {
    const st = String(auditoria[id]?.status || "");
    if (["outro", "ignorado"].includes(st)) bloqueadosAuditoria.add(String(id));
  });

  const opts = registros.map(r => {
    const key = rtFinRegistroPagamentoKey(r);
    const legacyKey = `${r.evento_id || ""}||${r.tipo || ""}`;
    const valorOriginal = Number(r.valor || 0);
    const jaAssociado = rtFinTotalAssociadoRegistro(r, atualId);
    const restanteAssociavel = Math.max(0, valorOriginal - jaAssociado);
    return {
      key,
      legacy_key: legacyKey,
      evento_id: r.evento_id || "",
      cliente: r.cliente || "Cliente",
      data_aviso: r.data_informada || "",
      data_evento: r.data_evento || "",
      tipo_pagamento: r.tipo || "",
      valor: restanteAssociavel,
      valor_original: valorOriginal,
      valor_ja_associado: jaAssociado,
      cancelado: !!r.cancelado,
      label: ""
    };
  }).filter(o => {
    const keyValor = [o.evento_id || "", o.tipo_pagamento || "", Number(o.valor_original || 0).toFixed(2)].join("||VALOR||");
    return Number(o.valor || 0) > 0.009
      && !bloqueadosAuditoria.has(o.key)
      && !bloqueadosAuditoria.has(o.legacy_key)
      && !bloqueadosAuditoria.has(keyValor);
  }).map(o => {
    const base = rtFinFormatarOpcaoAssociacao(o);
    const parcial = Number(o.valor_ja_associado || 0) > 0.009
      ? ` | Já assoc.: ${rtFinMoeda(o.valor_ja_associado)} | Falta: ${rtFinMoeda(o.valor)}`
      : "";
    return { ...o, label: `${base}${parcial}` };
  });

  opts.forEach(o => { o._score = item ? rtFinPontuarOpcaoPagamentoExtrato(item, o) : 0; });
  return opts.sort((a,b) => {
    if (item) {
      const scoreDiff = Number(b._score || 0) - Number(a._score || 0);
      if (scoreDiff) return scoreDiff;
      const dv = Math.abs(Number(a.valor || 0) - Math.abs(Number(item.valor || 0))) - Math.abs(Number(b.valor || 0) - Math.abs(Number(item.valor || 0)));
      if (dv) return dv;
      const da = rtFinDiferencaDias(item.data, a.data_aviso) - rtFinDiferencaDias(item.data, b.data_aviso);
      if (da) return da;
    }
    return String(a.data_aviso || "9999").localeCompare(String(b.data_aviso || "9999")) || String(a.cliente).localeCompare(String(b.cliente));
  });
}

function rtFinEventoKeyLinha(l) {
  return `${l.evento_id || ""}||${l.tipo_pagamento || ""}`;
}


// Financeiro 2.1 — associação de uma linha do extrato a múltiplos eventos/pagamentos.
function rtFinParseJsonSeguro(txt) {
  try { return txt ? JSON.parse(txt) : null; } catch (e) { return null; }
}

function rtFinAssociacoesLinhaExtrato(linha) {
  const dados = rtFinParseJsonSeguro(linha?.sugestao_json || "");
  if (dados && dados.tipo === "associacao_multipla" && Array.isArray(dados.associacoes)) {
    return dados.associacoes.map(a => ({
      key: a.key || [a.evento_id || "", a.tipo_pagamento || "", a.data_aviso || a.data_informada || "", Number(a.valor || 0).toFixed(2)].join("||"),
      legacy_key: a.legacy_key || `${a.evento_id || ""}||${a.tipo_pagamento || ""}`,
      evento_id: a.evento_id || "",
      cliente: a.cliente || "Cliente",
      data_aviso: a.data_aviso || a.data_informada || "",
      data_evento: a.data_evento || "",
      tipo_pagamento: a.tipo_pagamento || "",
      valor: Number(a.valor || 0),
      label: a.label || "",
      legacy_only: false
    }));
  }
  if (linha?.evento_id && linha?.tipo_pagamento) {
    return [{
      key: [linha.evento_id || "", linha.tipo_pagamento || "", linha.data_informada || linha.data_aviso || "", Number(linha.valor_associado || linha.valor || 0).toFixed(2)].join("||"),
      legacy_key: `${linha.evento_id || ""}||${linha.tipo_pagamento || ""}`,
      evento_id: linha.evento_id || "",
      cliente: linha.cliente_nome || "Cliente",
      data_aviso: linha.data_informada || linha.data_aviso || "",
      data_evento: linha.evento_data || "",
      tipo_pagamento: linha.tipo_pagamento || "",
      valor: Number(linha.valor_associado || linha.valor || 0),
      label: "",
      legacy_only: true
    }];
  }
  return [];
}

function rtFinValoresFecham(a, b) {
  return Math.abs(Number(a || 0) - Number(b || 0)) < 0.015;
}

function rtFinSugerirCombinacaoExtrato(item, opcoes) {
  const alvo = Math.abs(Number(item?.valor || 0));
  if (!alvo || !Array.isArray(opcoes) || opcoes.length < 2) return null;
  const normalDesc = rtFinNormalizarTextoBusca(item?.descricao || item?.linha_original || "");
  let candidatos = opcoes
    .filter(o => Number(o.valor || 0) > 0 && Number(o.valor || 0) <= alvo + 0.01)
    .map(o => ({ ...o, _clienteNorm: rtFinNormalizarTextoBusca(o.cliente || "") }))
    .sort((a,b) => Number(b._score || 0) - Number(a._score || 0));

  const grupos = [];
  const porCliente = new Map();
  candidatos.forEach(o => {
    const k = o._clienteNorm || "sem-cliente";
    if (!porCliente.has(k)) porCliente.set(k, []);
    porCliente.get(k).push(o);
  });
  porCliente.forEach((lista, clienteNorm) => {
    if (lista.length >= 2) grupos.push(lista);
  });
  grupos.push(candidatos);

  function procurar(lista, maxItens) {
    let melhor = null;
    const lim = lista.slice(0, 40);
    function dfs(idx, combo, soma) {
      if (melhor) return;
      if (combo.length >= 2 && rtFinValoresFecham(soma, alvo)) {
        melhor = combo.slice();
        return;
      }
      if (combo.length >= maxItens || soma > alvo + 0.01) return;
      for (let i = idx; i < lim.length; i += 1) {
        dfs(i + 1, combo.concat(lim[i]), soma + Number(lim[i].valor || 0));
        if (melhor) return;
      }
    }
    dfs(0, [], 0);
    return melhor;
  }

  for (const grupo of grupos) {
    for (const max of [2,3,4]) {
      const achou = procurar(grupo, max);
      if (achou) {
        const clienteComum = achou.every(a => a._clienteNorm === achou[0]._clienteNorm) ? achou[0].cliente : "Múltiplos clientes";
        return {
          tipo: "combinacao",
          cliente: clienteComum,
          total: alvo,
          associacoes: achou,
          keys: achou.map(a => a.key),
          confianca: normalDesc && achou.some(a => a._clienteNorm && normalDesc.includes(a._clienteNorm)) ? 95 : 85
        };
      }
    }
  }
  return null;
}

function rtFinRenderSelectAssociacao(id, opcoes, selecionado = "", indice = 0) {
  const opts = opcoes.map(o => `<option value="${rtFinEscapeHtml(o.key)}" ${(o.key === selecionado || o.legacy_key === selecionado) ? "selected" : ""}>${rtFinEscapeHtml(o.label || rtFinFormatarOpcaoAssociacao(o))}</option>`).join("");
  return `<div class="fin-ext-assoc-row" data-ext-assoc-row>
    <select class="fin-ext-assoc" data-ext-assoc="${rtFinEscapeHtml(id)}">
      <option value="">Selecionar evento/pagamento...</option>
      ${opts}
    </select>
    <button type="button" class="btn-mini btn-outline fin-ext-cliente-info" title="Ver dados do cliente selecionado" aria-label="Ver dados do cliente selecionado" data-ext-cliente-info="${rtFinEscapeHtml(id)}" ${selecionado ? "" : "disabled"}>👤</button>
    ${indice > 0 ? `<button type="button" class="btn-mini btn-outline" title="Remover este evento" data-ext-remover-assoc="${rtFinEscapeHtml(id)}">✖</button>` : ""}
  </div>`;
}

function rtFinTelefoneSomenteNumeros(valor) {
  return String(valor || "").replace(/\D/g, "");
}

function rtFinEventoPorId(eventoId) {
  return rtFinEventosLista().find(e => String(e.id || e._id || "") === String(eventoId || "")) || null;
}

async function rtFinBuscarClienteCadastro(opcao, evento) {
  const nomeAlvo = rtFinNormalizarTextoBusca(opcao?.cliente || evento?.nome || evento?.cliente || "");
  const telAlvo = rtFinTelefoneSomenteNumeros(evento?.telefone || "");
  let lista = [];
  try {
    if (typeof clientes !== "undefined" && Array.isArray(clientes) && clientes.length) lista = clientes;
  } catch (e) {}
  if (!lista.length) {
    try {
      if (rtFinSupabaseDisponivel()) {
        const { data, error } = await supabaseClient.from("clientes_cadastro").select("id,nome,documento,telefone,email,endereco,bairro,cidade,complemento,observacao_cliente,observacao_interna,perfil_cliente,criado_em");
        if (!error && Array.isArray(data)) lista = data;
      } else {
        lista = JSON.parse(localStorage.getItem("novoRioTendasClientesV2") || "[]");
      }
    } catch (e) { lista = []; }
  }
  return lista.find(c => {
    const nome = rtFinNormalizarTextoBusca(c?.nome || "");
    const tel = rtFinTelefoneSomenteNumeros(c?.telefone || "");
    return (telAlvo && tel && (tel === telAlvo || tel.endsWith(telAlvo) || telAlvo.endsWith(tel))) || (nomeAlvo && nome === nomeAlvo);
  }) || null;
}

function rtFinEnderecoClienteResumo(cliente, evento) {
  const partes = [cliente?.endereco, cliente?.bairro, cliente?.cidade, cliente?.complemento].map(v => String(v || "").trim()).filter(Boolean);
  return partes.join(" · ") || evento?.endereco || evento?.local || "Não informado";
}

function rtFinGarantirModalClienteResumo() {
  let dlg = document.getElementById("finClienteResumoDialog");
  if (dlg) return dlg;
  dlg = document.createElement("dialog");
  dlg.id = "finClienteResumoDialog";
  dlg.className = "fin-cliente-resumo-dialog";
  dlg.innerHTML = `<div class="fin-cliente-resumo-card">
    <div class="fin-cliente-resumo-head"><strong>Dados do cliente</strong><button type="button" class="btn-mini btn-outline" data-fin-cliente-fechar>✖</button></div>
    <div data-fin-cliente-conteudo></div>
  </div>`;
  document.body.appendChild(dlg);
  dlg.querySelector("[data-fin-cliente-fechar]")?.addEventListener("click", () => dlg.close());
  dlg.addEventListener("click", ev => { if (ev.target === dlg) dlg.close(); });
  return dlg;
}

async function rtFinAbrirResumoClienteEvento(eventoId, opcaoBase = {}) {
  const evento = rtFinEventoPorId(eventoId);
  if (!evento) return;
  const opcao = {
    evento_id: eventoId,
    cliente: opcaoBase.cliente || evento?.nome || evento?.cliente || "Cliente",
    data_evento: opcaoBase.data_evento || evento?.data_evento || evento?.data || "",
    ...opcaoBase
  };
  const cliente = await rtFinBuscarClienteCadastro(opcao, evento);
  const telefone = cliente?.telefone || evento?.telefone || "Não informado";
  const obs = [cliente?.observacao_cliente, cliente?.observacao_interna].map(v => String(v || "").trim()).filter(Boolean).join(" · ");
  const dataEvento = rtFinDataBR(evento?.data_evento || evento?.data || opcao.data_evento || "");
  const ultimos = rtFinanceiroExtratoSalvo.filter(l => String(l.status || "") === "associado" && rtFinAssociacoesLinhaExtrato(l).some(a => String(a.evento_id || "") === String(eventoId || ""))).slice().sort((a,b) => String(b.data_lancamento || "").localeCompare(String(a.data_lancamento || ""))).slice(0,3);
  const pagamentos = ultimos.length ? ultimos.map(l => `<div class="fin-cliente-resumo-pag"><span>${rtFinDataBR(l.data_lancamento)}</span><strong>${rtFinMoeda(Math.abs(Number(l.valor_assinado ?? l.valor ?? 0)))}</strong>${l.observacao ? `<small>${rtFinEscapeHtml(l.observacao)}</small>` : ""}</div>`).join("") : `<span class="muted">Nenhum pagamento anterior localizado.</span>`;
  const valorTotal = Number(evento?.valor_total || 0);
  const valorSinal = Number(evento?.valor_sinal || 0);
  const valorRestante = Number(evento?.valor_restante || 0);
  const formaPagamento = String(evento?.forma_pagamento || "").trim() || "Não informada";
  const situacaoFinanceira = evento?.pagamento_quitado || valorRestante <= 0.009
    ? "Quitado"
    : (valorSinal > 0 ? "Sinal informado / saldo pendente" : "Aguardando sinal");
  const dlg = rtFinGarantirModalClienteResumo();
  const conteudo = dlg.querySelector("[data-fin-cliente-conteudo]");
  conteudo.innerHTML = `
    <h3>${rtFinEscapeHtml(cliente?.nome || opcao.cliente || evento?.nome || "Cliente")}</h3>
    <div class="fin-cliente-resumo-grid">
      <div><span>Telefone</span><button type="button" class="fin-cliente-copiar" data-fin-copiar-telefone="${rtFinEscapeHtml(telefone)}" title="Copiar telefone">${rtFinEscapeHtml(telefone)} 📋</button></div>
      <div><span>Evento selecionado</span><strong>${rtFinEscapeHtml(dataEvento || "Não informado")}</strong></div>
      <div class="span-2"><span>Endereço</span><strong>${rtFinEscapeHtml(rtFinEnderecoClienteResumo(cliente, evento))}</strong></div>
      ${obs ? `<div class="span-2"><span>Observações do cadastro</span><strong>${rtFinEscapeHtml(obs)}</strong></div>` : ""}
      <div class="span-2 fin-cliente-financeiro"><span>Financeiro deste evento</span>
        <div class="fin-cliente-financeiro-grid">
          <div><small>Valor total</small><strong>${rtFinMoeda(valorTotal)}</strong></div>
          <div><small>Sinal</small><strong>${rtFinMoeda(valorSinal)}</strong></div>
          <div><small>Saldo restante</small><strong>${rtFinMoeda(valorRestante)}</strong></div>
          <div><small>Situação</small><strong>${rtFinEscapeHtml(situacaoFinanceira)}</strong></div>
          <div class="span-2"><small>Forma de pagamento</small><strong>${rtFinEscapeHtml(formaPagamento)}</strong></div>
        </div>
        <button type="button" class="btn-outline fin-cliente-abrir-evento" data-fin-abrir-evento="${rtFinEscapeHtml(eventoId || "")}">Abrir evento completo</button>
      </div>
      <div class="span-2"><span>Últimos pagamentos associados</span><div class="fin-cliente-resumo-pags">${pagamentos}</div></div>
    </div>`;
  conteudo.querySelector("[data-fin-copiar-telefone]")?.addEventListener("click", async ev => {
    const valor = ev.currentTarget.dataset.finCopiarTelefone || "";
    try { await navigator.clipboard.writeText(valor); ev.currentTarget.textContent = `${valor} ✓ Copiado`; setTimeout(() => { ev.currentTarget.textContent = `${valor} 📋`; }, 1400); }
    catch (e) { prompt("Copie o telefone:", valor); }
  });
  conteudo.querySelector("[data-fin-abrir-evento]")?.addEventListener("click", ev => {
    const id = ev.currentTarget.dataset.finAbrirEvento || "";
    if (!id) return;

    const painelAtivo = document.querySelector('.financeiro-tab-panel.active[data-fin-panel]');
    const estadoCampos = {};
    [
      "financeiroExtratoBuscaSalvos",
      "financeiroBusca",
      "financeiroFiltroStatus",
      "financeiroReceberFiltro"
    ].forEach(campoId => {
      const campo = document.getElementById(campoId);
      if (campo) estadoCampos[campoId] = campo.value;
    });

    const scrolls = {};
    document.querySelectorAll('#financeiroSection .table-wrapper, #financeiroSection [data-fin-panel]').forEach((el, idx) => {
      if (el.scrollTop || el.scrollLeft) scrolls[idx] = { top: el.scrollTop, left: el.scrollLeft };
    });

    window.__rtEventoRetornoFinanceiro = {
      aba: painelAtivo?.dataset.finPanel || "resumo",
      campos: estadoCampos,
      scrollY: window.scrollY || 0,
      scrolls,
      auditoriaFiltro: typeof rtFinanceiroAuditoriaFiltro !== "undefined" ? rtFinanceiroAuditoriaFiltro : "pendentes",
      extratoFiltro: typeof rtFinanceiroExtratoFiltro !== "undefined" ? rtFinanceiroExtratoFiltro : "pendentes"
    };

    dlg.close();
    const aba = document.querySelector('.tab-btn[data-section="eventosSection"]');
    if (aba) aba.click();
    setTimeout(() => {
      if (typeof abrirEditarEvento === "function") abrirEditarEvento(id);
    }, 80);
  });
  if (typeof dlg.showModal === "function") dlg.showModal(); else dlg.setAttribute("open", "open");
}

async function rtFinAbrirResumoClienteAssociacao(id, botao) {
  const linha = rtFinanceiroExtratoSalvo.find(l => String(l.id || l.fingerprint) === String(id));
  const row = botao?.closest("[data-ext-assoc-row]");
  const select = row?.querySelector("select[data-ext-assoc]");
  if (!linha || !select?.value) return;
  const opcoes = rtFinOpcoesPagamentoEventos(rtFinItemExtratoDeLinhaSalva(linha));
  const opcao = opcoes.find(o => o.key === select.value || o.legacy_key === select.value);
  if (!opcao) return;
  await rtFinAbrirResumoClienteEvento(opcao.evento_id, opcao);
}

function rtFinResumoAssociacaoMultipla(linha) {
  const assocs = rtFinAssociacoesLinhaExtrato(linha);
  if (!assocs.length) return "";
  const partes = assocs.map(a => {
    const cliente = String(a.cliente || "Cliente").trim();
    const data = rtFinDataBR(a.data_evento || a.data_aviso || "");
    const tipo = String(a.tipo_pagamento || "").trim();
    const valor = rtFinMoeda(Number(a.valor || 0));
    return `${cliente}${data ? " " + data : ""}${tipo ? " · " + tipo : ""} · ${valor}`;
  });
  const titulo = rtFinEscapeHtml(partes.join("\n"));
  if (assocs.length === 1) {
    const a = assocs[0];
    const cliente = rtFinEscapeHtml(String(a.cliente || "Cliente").trim());
    const data = rtFinDataBR(a.data_evento || a.data_aviso || "");
    const tipo = rtFinEscapeHtml(String(a.tipo_pagamento || "").trim());
    const valor = rtFinMoeda(Number(a.valor || 0));
    return `<div class="financeiro-registro fin-ext-assoc-resumo" title="${titulo}"><span>✅ ${cliente}${data ? ` | Evento ${data}` : ""}${tipo ? ` | ${tipo}` : ""} | ${valor}</span></div>`;
  }
  const total = assocs.reduce((s,a) => s + Number(a.valor || 0), 0);
  const curto = partes.join(" + ");
  return `<div class="financeiro-registro fin-ext-assoc-resumo" title="${titulo}"><span>✅ ${assocs.length} eventos | ${rtFinEscapeHtml(curto)} | Total ${rtFinMoeda(total)}</span></div>`;
}

function rtFinAtualizarResumoAssociacaoLinha(id) {
  const linha = rtFinanceiroExtratoSalvo.find(l => String(l.id || l.fingerprint) === String(id));
  const box = document.querySelector(`[data-ext-assoc-total="${CSS.escape(id)}"]`);
  if (!linha || !box) return;
  const valorExtrato = Math.abs(Number(linha.valor_assinado ?? linha.valor ?? 0));
  const opcoes = rtFinOpcoesPagamentoEventos(rtFinItemExtratoDeLinhaSalva(linha));
  const selecionados = Array.from(document.querySelectorAll(`[data-ext-assoc-list="${CSS.escape(id)}"] select[data-ext-assoc]`)).map(s => s.value).filter(Boolean);
  const ops = selecionados.map(k => opcoes.find(o => o.key === k)).filter(Boolean);
  const total = ops.reduce((s,o) => s + Number(o.valor || 0), 0);
  const diff = valorExtrato - total;
  const fechou = rtFinValoresFecham(valorExtrato, total);
  const difTexto = `Dif.: ${rtFinMoeda(Math.abs(diff))} ${fechou ? "✅" : "⚠"}`;
  box.innerHTML = `
    <div class="fin-ext-resumo-line ${fechou ? "ok" : "warn"}">
      <strong>${difTexto}</strong>
      <span class="fin-ext-sep">|</span>
      <span>Extrato: <b>${rtFinMoeda(valorExtrato)}</b></span>
      <span class="fin-ext-sep">|</span>
      <span>Assoc.: <b>${rtFinMoeda(total)}</b></span>
    </div>
  `;
}

function rtFinMetodoPagamentoAuditavel(forma) {
  const n = rtFinNormalizarTextoBusca(forma || "");
  if (!n) return false;
  // A auditoria 2.1 agora também lista Cartão/Rede e Dinheiro, mas em blocos separados.
  return /(pix|transfer|transf|ted|doc|deposit|boleto|cartao|rede|maquininha|cielo|getnet|stone|master|visa|dinheiro|in loco)/.test(n);
}

function rtFinNormalizarMetodoPagamento(forma) {
  const n = rtFinNormalizarTextoBusca(forma || "");
  if (/pix|transfer|transf|ted|doc|deposit|boleto/.test(n)) return "Pix/Transf./Dep./Boleto";
  if (/dinheiro|in loco/.test(n)) return "Dinheiro";
  if (/cartao|rede|maquininha|cielo|getnet|stone|master|visa|debito|credito/.test(n)) return "Cartão/Rede";
  return String(forma || "").trim() || "Outro";
}

function rtFinExtrairPagamentosAuditaveis() {
  const registros = [];
  rtFinEventosLista().forEach(evento => {
    const forma = String(evento.forma_pagamento || "");
    forma.split(/\r?\n|;/).map(l => l.trim()).filter(Boolean).forEach(linha => {
      const m = linha.match(/^(Pg\s*Total|Sinal|Restante)\s*-\s*(Pix\s*\/\s*Transf\.\s*\/\s*Dep\.\s*\/\s*Boleto|Pix\s*\/\s*Transfer[eê]ncia|Pix\s*\/\s*Transf\.\s*\/\s*Dep[oó]sito\s*\/\s*Boleto|Dinheiro|Cart[aã]o(?:\s*\/\s*Rede)?|Rede|Dep[oó]sito|Boleto|[^\-]+?)\s*-\s*(.*)$/i);
      if (!m) return;
      const metodoRaw = String(m[2] || "").trim();
      if (!rtFinMetodoPagamentoAuditavel(metodoRaw)) return;
      const tipoRaw = m[1].replace(/\s+/g, " ").trim();
      const tipo = /^pg/i.test(tipoRaw) ? "Pg Total" : tipoRaw.charAt(0).toUpperCase() + tipoRaw.slice(1).toLowerCase();
      const dataTexto = String(m[3] || "").trim();
      const detalhes = rtFinExtrairDetalhesLancamento(dataTexto, rtFinTipoValor(evento, tipo));
      const dataISO = detalhes.dataISO;
      const valor = detalhes.valor;
      // Lançamentos zerados não representam pagamento e não devem aparecer como pendência.
      if (!(Number(valor || 0) > 0.009)) return;
      registros.push({
        id: rtFinLinhaId(evento, tipo, dataISO || dataTexto, valor),
        evento_id: evento.id || evento._id || "",
        data_evento: evento.data_evento || evento.data || "",
        cliente: evento.nome || evento.cliente || "-",
        telefone: evento.telefone || "-",
        tipo,
        forma: rtFinNormalizarMetodoPagamento(metodoRaw),
        data_informada: dataISO || dataTexto || "",
        data_texto: dataTexto,
        valor,
        valor_explicito: detalhes.valor_explicito,
        evento_descricao: evento.tipo_evento || evento.observacao || evento.endereco || "",
        cancelado: !!(typeof rtEventoCancelado === "function" && rtEventoCancelado(evento)),
        linha_original: linha
      });
    });
  });
  return registros.sort((a,b) => String(a.data_informada || "9999").localeCompare(String(b.data_informada || "9999")) || String(a.cliente).localeCompare(String(b.cliente)));
}

function rtFinPagamentoEstaLocalizadoNoExtrato(registro) {
  if (!registro) return false;
  const valorEsperado = Number(registro.valor || 0);
  const totalAssociado = rtFinTotalAssociadoRegistro(registro);
  return valorEsperado > 0
    ? totalAssociado >= valorEsperado - 0.015
    : totalAssociado > 0;
}

function rtFinPagamentosNaoLocalizadosExtrato() {
  return rtFinExtrairPagamentosAuditaveis().filter(r => !rtFinPagamentoEstaLocalizadoNoExtrato(r));
}

function rtFinRenderFiltrosAuditoria() {
  const wrap = document.getElementById("financeiroAuditoriaFiltroBtns");
  if (!wrap) return;
  const todos = rtFinPagamentosNaoLocalizadosExtrato();
  const counts = { pendentes: 0, cartao: 0, dinheiro: 0, outros: 0, ignorados: 0, todos: todos.length };
  todos.forEach(r => { const g = rtFinAuditoriaGrupo(r); counts[g] = (counts[g] || 0) + 1; });
  const labels = [["pendentes", "Pendentes"], ["cartao", "Cartão/Rede"], ["dinheiro", "Dinheiro"], ["outros", "Outros"], ["ignorados", "Ignorados"], ["todos", "Todos"]];
  wrap.innerHTML = labels.map(([key, label]) => `<button type="button" class="btn-mini ${rtFinanceiroAuditoriaFiltro === key ? "active" : "btn-outline"}" data-audit-filtro="${key}">${label} (${counts[key] || 0})</button>`).join("");
  wrap.querySelectorAll("[data-audit-filtro]").forEach(btn => btn.addEventListener("click", () => {
    rtFinanceiroAuditoriaFiltro = btn.dataset.auditFiltro || "pendentes";
    try { localStorage.setItem("rtFinanceiroAuditoriaFiltro", rtFinanceiroAuditoriaFiltro); } catch(e) {}
    rtFinRenderPagamentosNaoLocalizados();
  }));
}

function rtFinRenderPagamentosNaoLocalizados() {
  const tbody = document.getElementById("financeiroPagamentosNaoLocalizadosTbody");
  const resumo = document.getElementById("financeiroPagamentosNaoLocalizadosResumo");
  if (!tbody && !resumo) return;
  const todos = rtFinPagamentosNaoLocalizadosExtrato();
  const pendentes = todos.filter(r => rtFinAuditoriaGrupo(r) === "pendentes");
  const total = pendentes.reduce((s, r) => s + Number(r.valor || 0), 0);
  rtFinRenderFiltrosAuditoria();
  if (resumo) {
    resumo.innerHTML = pendentes.length
      ? `<strong>${pendentes.length}</strong> pagamento(s) ainda não localizado(s) · <strong>${rtFinMoeda(total)}</strong>`
      : `✅ Nenhum pagamento pendente de localização no extrato.`;
  }
  if (!tbody) return;
  let lista = todos;
  if (rtFinanceiroAuditoriaFiltro !== "todos") lista = todos.filter(r => rtFinAuditoriaGrupo(r) === rtFinanceiroAuditoriaFiltro);
  lista = lista.slice().sort((a,b) => {
    const da = String(a.data_informada || "9999").localeCompare(String(b.data_informada || "9999"));
    if (da) return da;
    const dv = Number(a.valor || 0) - Number(b.valor || 0);
    if (dv) return dv;
    return String(a.cliente || "").localeCompare(String(b.cliente || ""));
  });
  if (!lista.length) {
    tbody.innerHTML = `<tr><td colspan="7" class="empty">Nenhum pagamento neste filtro.</td></tr>`;
    return;
  }
  tbody.innerHTML = lista.map(r => {
    const st = rtFinAuditoriaStatus(r.id) || {};
    const grupo = rtFinAuditoriaGrupo(r);
    const statusTexto = grupo === "cartao" ? "💳 Cartão/Rede" : (grupo === "dinheiro" ? "💵 Dinheiro" : (grupo === "outros" ? "📌 Outros" : (grupo === "ignorados" ? "🚫 Ignorado" : "🔴 Não localizado")));
    const mostrarOutros = grupo !== "outros";
    const mostrarIgnorar = grupo !== "ignorados";
    const formaCompleta = rtFinEscapeHtml(r.forma || "");
    const formaCurta = /pix|transf|dep|boleto/i.test(String(r.forma || "")) ? "Banco" : (grupo === "cartao" ? "Cartão/Rede" : (grupo === "dinheiro" ? "Dinheiro" : String(r.forma || "-")));
    return `
    <tr class="financeiro-status-${grupo === "pendentes" ? "nao_encontrado" : grupo}">
      <td>${rtFinDataBR(r.data_informada)}</td>
      <td>${rtFinMoeda(r.valor)}</td>
      <td>${rtFinEscapeHtml(r.tipo)}</td>
      <td title="${formaCompleta}"><span class="fin-forma-chip">${rtFinEscapeHtml(formaCurta)}</span></td>
      <td><div class="fin-audit-cliente-linha"><strong>${rtFinEscapeHtml(r.cliente)}${r.cancelado ? " (CANCELADO)" : ""}</strong><button type="button" class="btn-mini btn-outline fin-audit-cliente-info" title="Ver dados do cliente e do evento" aria-label="Ver dados do cliente e do evento" data-audit-cliente-info="${rtFinEscapeHtml(r.evento_id || "")}">👤</button></div><div class="financeiro-registro"><span>Evento ${rtFinDataBR(r.data_evento)} · ${rtFinEscapeHtml(r.evento_descricao || "-")}</span></div></td>
      <td colspan="2">
        <div class="financeiro-auditoria-linha-controle">
          <input class="fin-audit-obs" data-audit-obs="${rtFinEscapeHtml(r.id)}" value="${rtFinEscapeHtml(st.observacao || "")}" placeholder="observação">
          <span class="financeiro-status-badge">${statusTexto}</span>
          <span class="financeiro-acoes financeiro-auditoria-acoes">
            ${mostrarOutros ? `<button type="button" class="btn-mini btn-outline" data-audit-marcar="outro" data-audit-id="${rtFinEscapeHtml(r.id)}">Outros</button>` : ""}
            ${mostrarIgnorar ? `<button type="button" class="btn-mini btn-outline" data-audit-marcar="ignorado" data-audit-id="${rtFinEscapeHtml(r.id)}">Ignorar</button>` : ""}
            ${grupo !== "pendentes" ? `<button type="button" class="btn-mini btn-outline" data-audit-limpar="${rtFinEscapeHtml(r.id)}">Voltar</button>` : ""}
          </span>
        </div>
      </td>
    </tr>`;
  }).join("");
  tbody.querySelectorAll("[data-audit-marcar]").forEach(btn => btn.addEventListener("click", () => rtFinMarcarAuditoriaPagamento(btn.dataset.auditId, btn.dataset.auditMarcar)));
  tbody.querySelectorAll("[data-audit-limpar]").forEach(btn => btn.addEventListener("click", () => rtFinLimparAuditoriaPagamento(btn.dataset.auditLimpar)));
  tbody.querySelectorAll("[data-audit-cliente-info]").forEach(btn => btn.addEventListener("click", () => rtFinAbrirResumoClienteEvento(btn.dataset.auditClienteInfo)));
}

function rtFinGrupoFiltroExtrato(linha) {
  const status = String(linha?.status || "pendente");
  const tipo = String(linha?.tipo || "outro");
  if (status === "associado") return "associados";
  if (status === "rendimento" || tipo === "rendimento") return "rendimentos";
  if (status === "outro" || tipo === "cartao" || tipo === "outro") return "outros";
  if (status === "ignorado" || tipo === "saida" || tipo === "saldo") return "ignorados";
  return "pendentes";
}

function rtFinLinhaExtratoTextoBusca(linha) {
  return rtFinNormalizarTextoBusca([
    linha?.data_lancamento, linha?.descricao, linha?.linha_original,
    linha?.valor, linha?.valor_assinado, linha?.tipo, linha?.status,
    linha?.cliente_nome, linha?.evento_data, linha?.tipo_pagamento, linha?.observacao, linha?.sugestao_json
  ].join(" "));
}

function rtFinListaExtratoFiltrada() {
  const filtro = rtFinanceiroExtratoFiltro || "pendentes";
  const termo = rtFinNormalizarTextoBusca(rtFinanceiroExtratoBusca || "");
  let lista = (filtro === "todos") ? rtFinanceiroExtratoSalvo : rtFinanceiroExtratoSalvo.filter(l => rtFinGrupoFiltroExtrato(l) === filtro);
  if (termo) lista = lista.filter(l => rtFinLinhaExtratoTextoBusca(l).includes(termo));
  return lista.slice().sort((a,b) => String(a.data_lancamento || "9999").localeCompare(String(b.data_lancamento || "9999")) || String(a.criado_em || "").localeCompare(String(b.criado_em || "")));
}

function rtFinRenderFiltrosExtratoSalvo() {
  const wrap = document.getElementById("financeiroExtratoFiltroBtns");
  if (!wrap) return;
  const counts = { todos: rtFinanceiroExtratoSalvo.length, pendentes:0, associados:0, rendimentos:0, outros:0, ignorados:0 };
  rtFinanceiroExtratoSalvo.forEach(l => { const g = rtFinGrupoFiltroExtrato(l); counts[g] = (counts[g] || 0) + 1; });
  const labels = [
    ["pendentes", "Pendentes"],
    ["associados", "Associados"],
    ["rendimentos", "Rendimentos"],
    ["outros", "Outros/Rede"],
    ["ignorados", "Ignorados"],
    ["todos", "Todos"]
  ];
  wrap.innerHTML = labels.map(([key, label]) => `<button type="button" class="btn-mini ${rtFinanceiroExtratoFiltro === key ? "active" : "btn-outline"}" data-ext-filtro="${key}">${label} (${counts[key] || 0})</button>`).join("");
  wrap.querySelectorAll("[data-ext-filtro]").forEach(btn => btn.addEventListener("click", () => {
    rtFinanceiroExtratoFiltro = btn.dataset.extFiltro || "pendentes";
    try { localStorage.setItem("rtFinanceiroExtratoFiltro", rtFinanceiroExtratoFiltro); } catch(e) {}
    rtFinRenderExtratoSalvo();
  }));
}

function rtFinRenderExtratoSalvo() {
  const tbody = document.getElementById("financeiroExtratoSalvoTbody");
  if (!tbody) return;
  rtFinRenderFiltrosExtratoSalvo();
  rtFinRenderPagamentosNaoLocalizados();
  if (!rtFinanceiroExtratoSalvo.length) {
    tbody.innerHTML = `<tr><td colspan="8" class="empty">Nenhuma linha de extrato salva ainda.</td></tr>`;
    return;
  }
  const linhasRender = rtFinListaExtratoFiltrada();
  if (!linhasRender.length) {
    tbody.innerHTML = `<tr><td colspan="8" class="empty">Nenhuma linha neste filtro.</td></tr>`;
    return;
  }
  tbody.innerHTML = linhasRender.map(l => {
    const id = l.id || l.fingerprint;
    const valor = Number(l.valor_assinado ?? l.valor ?? 0);
    const tipo = l.tipo || "outro";
    const itemSugestao = rtFinItemExtratoDeLinhaSalva(l);
    const opcoes = rtFinOpcoesPagamentoEventos(itemSugestao);
    let sugestao = null;
    if (l.sugestao_json) {
      try { sugestao = JSON.parse(l.sugestao_json); } catch (e) {}
    }
    const associacoesSalvas = rtFinAssociacoesLinhaExtrato(l);
    let selecionados = associacoesSalvas.map(a => a.key || a.legacy_key).filter(Boolean);
    const sugestaoCombo = tipo === "entrada" && String(l.status || "pendente") === "pendente" ? rtFinSugerirCombinacaoExtrato(itemSugestao, opcoes) : null;
    let comboAutoSelecionado = false;
    if (!selecionados.length && sugestaoCombo && Number(sugestaoCombo.confianca || 0) >= 90 && Array.isArray(sugestaoCombo.keys) && sugestaoCombo.keys.length) {
      selecionados = sugestaoCombo.keys.slice();
      comboAutoSelecionado = true;
    }
    // Auto-seleção mais rígida e estável: se a sugestão simples tem confiança alta,
    // procura a opção real pelo evento/tipo/valor antes de cair no primeiro item da lista.
    if (!selecionados.length && sugestao && sugestao.evento_id && Number(sugestao.confianca || 0) >= 60) {
      const sugEvento = String(sugestao.evento_id || "");
      const sugTipo = rtFinNormalizarTextoBusca(sugestao.tipo_pagamento || "");
      const sugValor = Number(sugestao.valor_esperado || sugestao.valor || 0);
      const matchSug = opcoes.find(o => {
        const mesmoEvento = String(o.evento_id || "") === sugEvento;
        const tipoOpcao = rtFinNormalizarTextoBusca(o.tipo_pagamento || o.tipo || "");
        const tipoOk = !sugTipo || tipoOpcao === sugTipo || tipoOpcao.includes(sugTipo) || sugTipo.includes(tipoOpcao);
        const valorOk = !sugValor || rtFinValoresIguais(Number(o.valor || 0), sugValor);
        return mesmoEvento && tipoOk && valorOk;
      }) || opcoes.find(o => String(o.evento_id || "") === sugEvento && (!sugValor || rtFinValoresIguais(Number(o.valor || 0), sugValor)))
        || opcoes.find(o => String(o.evento_id || "") === sugEvento);
      if (matchSug) selecionados = [matchSug.key];
    }
    // Se ainda não havia seleção gravada, deixa a melhor opção provável já selecionada.
    const melhorOpcao = opcoes.find(o => selecionados.includes(o.key) || selecionados.includes(o.legacy_key)) || opcoes[0];
    if (!selecionados.length && melhorOpcao && Number(melhorOpcao._score || 0) >= 45) selecionados = [melhorOpcao.key];
    if (!selecionados.length) selecionados = [""];
    const podeVincular = tipo === "entrada" && !["rendimento", "outro", "ignorado", "associado"].includes(String(l.status || ""));
    const assoc = podeVincular ? `
      <div class="fin-ext-assoc-compact">
        <div class="fin-ext-assoc-top">
          <div class="fin-ext-assoc-list" data-ext-assoc-list="${rtFinEscapeHtml(id)}">
            ${selecionados.map((sel, idx) => rtFinRenderSelectAssociacao(id, opcoes, sel, idx)).join("")}
          </div>
          <button type="button" class="btn-mini btn-outline fin-ext-add-compact" title="Adicionar outro evento" data-ext-add-assoc="${rtFinEscapeHtml(id)}">+</button>
          <input class="fin-ext-obs" data-ext-obs="${rtFinEscapeHtml(id)}" value="${rtFinEscapeHtml(l.observacao || "")}" placeholder="observação">
        </div>
        <div class="financeiro-registro fin-ext-assoc-total" data-ext-assoc-total="${rtFinEscapeHtml(id)}"><span>Calculando...</span></div>
        ${sugestaoCombo ? `<div class="financeiro-registro fin-ext-combo-sug"><span>💡 ${comboAutoSelecionado ? "Autoassociado: " : "Sugestão: "}${sugestaoCombo.associacoes.length} eventos · ${rtFinMoeda(sugestaoCombo.total)} (${sugestaoCombo.confianca}%)</span></div>` : (sugestao && sugestao.evento_id ? `<div class="financeiro-registro fin-ext-combo-sug"><span>💡 ${rtFinEscapeHtml(sugestao.cliente || "")} · ${rtFinEscapeHtml(sugestao.tipo_pagamento || "")} · ${rtFinMoeda(sugestao.valor_esperado || 0)} (${sugestao.confianca || 0}%)</span></div>` : "")}
      </div>
    ` : (() => {
      const resumoBase = String(l.status || "") === "associado"
        ? (rtFinResumoAssociacaoMultipla(l) || `<span class="muted">Associado</span>`)
        : `<span class="muted">${tipo === "rendimento" ? "Rendimento bancário" : (tipo === "cartao" ? "Cartão/Rede ou outro crédito" : (tipo === "outro" ? "Outro crédito" : "Não vincular"))}</span>`;
      const obsSalva = String(l.observacao || "").trim();
      return `${resumoBase}${obsSalva ? `<span class="fin-ext-obs-inline" title="${rtFinEscapeHtml(obsSalva)}"> — <strong>Obs.:</strong> ${rtFinEscapeHtml(obsSalva)}</span>` : ""}`;
    })();
    return `<tr class="financeiro-status-${l.status || "pendente"}">
      <td>${rtFinDataBR(l.data_lancamento)}</td>
      <td><strong>${rtFinEscapeHtml(l.descricao || l.linha_original || "")}</strong></td>
      <td>${valor < 0 ? "-" : "+"}${rtFinMoeda(Math.abs(valor))}</td>
      <td>${rtFinTipoExtratoTexto(tipo)}</td>
      <td><span class="financeiro-status-badge">${rtFinStatusLinhaExtrato(l)}</span></td>
      <td>${assoc}</td>
      <td class="financeiro-acoes fin-ext-acoes-grid ${podeVincular ? "fin-ext-acoes-pendentes" : "fin-ext-acoes-compacta"}">
        ${podeVincular ? `<button type="button" class="btn-mini btn-outline fin-ext-save-action" data-ext-salvar-assoc="${rtFinEscapeHtml(id)}">Salvar associação</button>` : ""}
        <button type="button" class="btn-mini btn-outline fin-ext-action-pendente" data-ext-marcar="pendente" data-ext-id="${rtFinEscapeHtml(id)}">${podeVincular ? "Pendente" : "Pend."}</button>
        <button type="button" class="btn-mini btn-outline" data-ext-marcar="rendimento" data-ext-id="${rtFinEscapeHtml(id)}">${podeVincular ? "Rendimento" : "Rend."}</button>
        <button type="button" class="btn-mini btn-outline" data-ext-marcar="outro" data-ext-id="${rtFinEscapeHtml(id)}">Outro</button>
        <button type="button" class="btn-mini btn-outline" data-ext-marcar="ignorado" data-ext-id="${rtFinEscapeHtml(id)}">${podeVincular ? "Ignorar" : "Ign."}</button>
      </td>
    </tr>`;
  }).join("");

  tbody.querySelectorAll("[data-ext-salvar-assoc]").forEach(btn => btn.addEventListener("click", () => rtFinSalvarAssociacaoExtrato(btn.dataset.extSalvarAssoc)));
  tbody.querySelectorAll("select[data-ext-assoc]").forEach(sel => sel.addEventListener("change", () => {
    rtFinAtualizarResumoAssociacaoLinha(sel.dataset.extAssoc);
    const info = sel.closest("[data-ext-assoc-row]")?.querySelector("[data-ext-cliente-info]");
    if (info) info.disabled = !sel.value;
  }));
  tbody.querySelectorAll("[data-ext-cliente-info]").forEach(btn => btn.addEventListener("click", () => rtFinAbrirResumoClienteAssociacao(btn.dataset.extClienteInfo, btn)));
  tbody.querySelectorAll("[data-ext-add-assoc]").forEach(btn => btn.addEventListener("click", () => {
    const id = btn.dataset.extAddAssoc;
    const linha = rtFinanceiroExtratoSalvo.find(l => String(l.id || l.fingerprint) === String(id));
    const lista = document.querySelector(`[data-ext-assoc-list="${CSS.escape(id)}"]`);
    if (!linha || !lista) return;
    const opcoes = rtFinOpcoesPagamentoEventos(rtFinItemExtratoDeLinhaSalva(linha));
    lista.insertAdjacentHTML("beforeend", rtFinRenderSelectAssociacao(id, opcoes, "", lista.querySelectorAll("select").length));
    lista.querySelectorAll("select[data-ext-assoc]").forEach(sel => sel.onchange = () => {
      rtFinAtualizarResumoAssociacaoLinha(id);
      const info = sel.closest("[data-ext-assoc-row]")?.querySelector("[data-ext-cliente-info]");
      if (info) info.disabled = !sel.value;
    });
    lista.querySelectorAll("[data-ext-cliente-info]").forEach(b => b.onclick = () => rtFinAbrirResumoClienteAssociacao(b.dataset.extClienteInfo, b));
    lista.querySelectorAll("[data-ext-remover-assoc]").forEach(b => b.onclick = () => { b.closest("[data-ext-assoc-row]")?.remove(); rtFinAtualizarResumoAssociacaoLinha(id); });
    rtFinAtualizarResumoAssociacaoLinha(id);
  }));
  tbody.querySelectorAll("[data-ext-remover-assoc]").forEach(btn => btn.addEventListener("click", () => { const id = btn.dataset.extRemoverAssoc; btn.closest("[data-ext-assoc-row]")?.remove(); rtFinAtualizarResumoAssociacaoLinha(id); }));
  tbody.querySelectorAll("[data-ext-assoc-total]").forEach(el => rtFinAtualizarResumoAssociacaoLinha(el.dataset.extAssocTotal));
  tbody.querySelectorAll("[data-ext-marcar]").forEach(btn => btn.addEventListener("click", () => rtFinMarcarStatusExtrato(btn.dataset.extId, btn.dataset.extMarcar)));
}

async function rtFinAtualizarLinhaExtrato(id, patch, opts = {}) {
  const linha = rtFinanceiroExtratoSalvo.find(l => String(l.id || l.fingerprint) === String(id));
  if (!linha) return false;
  const fingerprint = linha.fingerprint;
  const atualizado = { ...patch, atualizado_em: new Date().toISOString(), colaborador: rtFinColaboradorAtual() };
  try {
    if (rtFinSupabaseDisponivel() && linha.id && !String(linha.id).startsWith("local_")) {
      const { error } = await supabaseClient.from("extrato_bancario_linhas").update(atualizado).eq("id", linha.id);
      if (error) throw error;
    } else if (rtFinSupabaseDisponivel()) {
      const { error } = await supabaseClient.from("extrato_bancario_linhas").update(atualizado).eq("fingerprint", fingerprint);
      if (error) throw error;
    } else {
      const lista = rtFinExtratoLocalCarregar();
      const idx = lista.findIndex(x => String(x.id || x.fingerprint) === String(id) || x.fingerprint === fingerprint);
      if (idx >= 0) lista[idx] = { ...lista[idx], ...atualizado };
      rtFinExtratoLocalSalvar(lista);
    }

    // Atualiza em memória e mantém a linha na mesma posição visual.
    Object.assign(linha, atualizado);
    if (!opts.semRender) rtFinRenderExtratoSalvo();
    else rtFinRenderPagamentosNaoLocalizados();
    return true;
  } catch (err) {
    console.error(err);
    alert(`Não foi possível atualizar a linha do extrato.\n\n${err.message || err}`);
    return false;
  }
}

async function rtFinSalvarAssociacaoExtrato(id, silencioso = false) {
  const linha = rtFinanceiroExtratoSalvo.find(l => String(l.id || l.fingerprint) === String(id));
  const obs = document.querySelector(`input[data-ext-obs="${CSS.escape(id)}"]`)?.value || "";
  const selects = Array.from(document.querySelectorAll(`[data-ext-assoc-list="${CSS.escape(id)}"] select[data-ext-assoc]`));
  const valores = [...new Set(selects.map(s => s.value).filter(Boolean))];
  if (!linha || !valores.length) {
    if (!silencioso) alert("Escolha pelo menos um evento/pagamento para associar.");
    return false;
  }
  const opcoes = rtFinOpcoesPagamentoEventos(rtFinItemExtratoDeLinhaSalva(linha));
  const escolhidas = valores.map(v => opcoes.find(o => o.key === v)).filter(Boolean);
  if (!escolhidas.length) {
    if (!silencioso) alert("Não foi possível localizar as opções selecionadas.");
    return false;
  }

  const valorExtrato = Math.abs(Number(linha.valor_assinado ?? linha.valor ?? 0));
  let saldoExtrato = valorExtrato;
  const ops = escolhidas.map(o => {
    const valorDisponivel = Math.max(0, Number(o.valor || 0));
    const valorAlocado = Math.min(valorDisponivel, Math.max(0, saldoExtrato));
    saldoExtrato -= valorAlocado;
    return { ...o, valor: valorAlocado };
  }).filter(o => Number(o.valor || 0) > 0.009);

  if (!ops.length) {
    if (!silencioso) alert("Este pagamento já está totalmente associado.");
    return false;
  }

  const total = ops.reduce((s,o) => s + Number(o.valor || 0), 0);
  const diff = valorExtrato - total;
  if (!rtFinValoresFecham(valorExtrato, total) && !silencioso) {
    const msg = `O valor associado não fecha com o extrato.\n\nExtrato: ${rtFinMoeda(valorExtrato)}\nAssociado: ${rtFinMoeda(total)}\nDiferença: ${rtFinMoeda(Math.abs(diff))}\n\nDeseja salvar mesmo assim?`;
    if (!confirm(msg)) return false;
  }

  const primeiro = ops[0];
  const precisaJson = ops.length > 1 || Number(primeiro.valor || 0) < Number(primeiro.valor_original || primeiro.valor || 0) - 0.015;
  const multiJson = precisaJson ? JSON.stringify({
    tipo: "associacao_multipla",
    valor_extrato: valorExtrato,
    valor_associado: total,
    diferenca: diff,
    associacoes: ops.map(o => ({
      key: o.key,
      legacy_key: o.legacy_key,
      evento_id: o.evento_id,
      cliente: o.cliente,
      data_aviso: o.data_aviso,
      data_evento: o.data_evento,
      tipo_pagamento: o.tipo_pagamento,
      valor: Number(o.valor || 0),
      valor_pagamento_total: Number(o.valor_original || o.valor || 0),
      label: o.label || rtFinFormatarOpcaoAssociacao(o)
    }))
  }) : null;

  const ok = await rtFinAtualizarLinhaExtrato(id, {
    status: "associado",
    cliente_nome: ops.length > 1 ? `${ops.length} eventos` : primeiro.cliente,
    evento_id: primeiro.evento_id || null,
    evento_data: primeiro.data_evento || null,
    tipo_pagamento: ops.length > 1 ? "Múltiplos" : primeiro.tipo_pagamento,
    valor_associado: total,
    sugestao_json: multiJson,
    observacao: obs
  });
  return ok;
}

async function rtFinMarcarStatusExtrato(id, status) {
  const obs = document.querySelector(`input[data-ext-obs="${CSS.escape(id)}"]`)?.value || "";
  const patch = { status, observacao: obs };
  if (status === "rendimento") patch.tipo = "rendimento";
  if (status === "outro") patch.tipo = "outro";
  if (status === "pendente") patch.tipo = "entrada";
  if (status === "ignorado") patch.tipo = "outro";
  if (status !== "associado") {
    patch.sugestao_json = null;
    patch.cliente_nome = "";
    patch.evento_id = null;
    patch.evento_data = null;
    patch.tipo_pagamento = "";
    patch.valor_associado = null;
  }
  await rtFinAtualizarLinhaExtrato(id, patch);
}


function rtFinDetectarFormatoCaptura(texto, html) {
  const t = String(texto || "");
  const h = String(html || "");
  const tipos = [];
  if (h && /<\s*(table|tr|td|div|span)\b/i.test(h)) tipos.push("HTML");
  if (/\t/.test(t)) tipos.push("TSV/TAB");
  if (/<\s*(table|tr|td|div|span)\b/i.test(t)) tipos.push("HTML no texto");
  if (/\d{1,2}\s*\/\s*(jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)/i.test(t)) tipos.push("Data Itaú");
  if (!tipos.length) tipos.push("Texto puro / desconhecido");
  return tipos.join(" + ");
}

function rtFinHtmlParaTextoTabela(html) {
  const h = String(html || "");
  if (!h) return "";
  try {
    const doc = new DOMParser().parseFromString(h, "text/html");
    const linhas = [];
    doc.querySelectorAll("tr").forEach(tr => {
      const cols = Array.from(tr.querySelectorAll("th,td"))
        .map(td => (td.innerText || td.textContent || "").replace(/\s+/g, " ").trim())
        .filter(Boolean);
      if (cols.length) linhas.push(cols.join("\t"));
    });
    if (linhas.length) return linhas.join("\n");
    const texto = (doc.body?.innerText || doc.body?.textContent || "").trim();
    return texto;
  } catch (err) {
    return h.replace(/<\s*br\s*\/?>/gi, "\n")
      .replace(/<\s*\/tr\s*>/gi, "\n")
      .replace(/<\s*\/td\s*>/gi, "\t")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .trim();
  }
}

function rtFinQuebrarExtratoItauPorData(texto) {
  const base = String(texto || "")
    .replace(/\u00a0/g, " ")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n+/g, " ")
    .trim();
  if (!base) return "";

  const dataRegex = /\b\d{1,2}\/(?:jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)\b/gi;
  const pontos = [];
  let m;
  while ((m = dataRegex.exec(base)) !== null) pontos.push(m.index);
  if (pontos.length < 2) return base;

  const linhas = [];
  for (let i = 0; i < pontos.length; i += 1) {
    const ini = pontos[i];
    const fim = pontos[i + 1] ?? base.length;
    const trecho = base.slice(ini, fim).trim();
    if (trecho) linhas.push(trecho);
  }
  return linhas.join("\n");
}

function rtFinNormalizarTextoCapturadoParaLinhas(texto, html) {
  let base = String(texto || "");
  const deHtml = rtFinHtmlParaTextoTabela(html);
  if (deHtml && deHtml.length > base.length) base = deHtml;
  let normalizado = base
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/[ \t]{2,}/g, "\t")
    .trim();

  const linhas = normalizado.split(/\r?\n/).filter(l => l.trim()).length;
  const qtdDatasItau = (normalizado.match(/\b\d{1,2}\/(?:jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)\b/gi) || []).length;
  if (linhas <= 3 && qtdDatasItau >= 2) {
    normalizado = rtFinQuebrarExtratoItauPorData(normalizado);
  }
  return normalizado;
}

function rtFinCapturarColagemExtrato(ev) {
  const cd = ev.clipboardData || window.clipboardData;
  if (!cd) return;
  const texto = cd.getData("text/plain") || "";
  const html = cd.getData("text/html") || "";
  rtFinanceiroExtratoClipboard = {
    texto,
    html,
    ultimaCaptura: new Date().toLocaleString("pt-BR")
  };
  const normalizado = rtFinNormalizarTextoCapturadoParaLinhas(texto, html);
  if (normalizado && normalizado !== texto) {
    ev.preventDefault();
    const alvo = ev.target;
    const ini = alvo.selectionStart ?? alvo.value.length;
    const fim = alvo.selectionEnd ?? alvo.value.length;
    alvo.value = alvo.value.slice(0, ini) + normalizado + alvo.value.slice(fim);
    alvo.selectionStart = alvo.selectionEnd = ini + normalizado.length;
  }
}

function rtFinMostrarDiagnosticoExtrato() {
  const txtEl = document.getElementById("financeiroExtratoTexto");
  const box = document.getElementById("financeiroExtratoDiagnostico");
  if (!box || !txtEl) return;
  const textoAtual = txtEl.value || "";
  const clip = rtFinanceiroExtratoClipboard || {};
  const html = clip.html || "";
  const textoBruto = clip.texto || textoAtual;
  const normalizado = rtFinNormalizarTextoCapturadoParaLinhas(textoBruto, html) || textoAtual;
  const linhasTexto = normalizado.split(/\r?\n/).filter(l => l.trim()).length;
  const linhasHtml = html ? (html.match(/<\s*tr\b/gi) || []).length : 0;
  const tabs = (normalizado.match(/\t/g) || []).length;
  const amostraHtml = html ? html.slice(0, 4000) : "";
  const htmlInfo = html ? `\n\n==================================\nHTML CAPTURADO (amostra)\n==================================\n${amostraHtml}` : "\n\nHTML CAPTURADO: nenhum";
  box.className = "financeiro-extrato-diagnostico";
  box.style.display = "block";
  box.innerHTML = `
    <div class="financeiro-extrato-diagnostico-head">
      <strong>Diagnóstico da colagem</strong>
      <span>Formato: ${rtFinEscapeHtml(rtFinDetectarFormatoCaptura(textoBruto, html))}</span>
      <span>Linhas: ${linhasTexto}</span>
      <span>TABs: ${tabs}</span>
      <span>Linhas HTML: ${linhasHtml}</span>
      <span>Última captura: ${rtFinEscapeHtml(clip.ultimaCaptura || "sem captura direta")}</span>
    </div>
    <pre>${rtFinEscapeHtml(`==================================\nTEXTO BRUTO RECEBIDO\n==================================\n${textoBruto || "(vazio)"}\n\n==================================\nTEXTO NORMALIZADO PARA PROCESSAR\n==================================\n${normalizado || "(vazio)"}${htmlInfo}`)}</pre>
  `;
}

function rtFinExtrairValorAssinado(texto) {
  const t = String(texto || "");
  const matches = [...t.matchAll(/([-+]?\s*(?:R\$\s*)?[0-9]{1,3}(?:\.[0-9]{3})*,[0-9]{2}|[-+]?\s*(?:R\$\s*)?[0-9]+,[0-9]{2}|[-+]?\s*(?:R\$\s*)?[0-9]+(?:\.\d{2})?)(?!\S)/g)];
  if (!matches.length) return 0;
  let raw = String(matches[matches.length - 1][1] || "").trim();
  const negativo = /^-/.test(raw) || /\s-\s*/.test(` ${raw}`);
  raw = raw.replace(/^[-+]\s*/, "");
  const valor = rtFinValorNumero(raw);
  return negativo ? -Math.abs(valor) : valor;
}

function rtFinClassificarLinhaExtrato(linha, valor) {
  const normal = rtFinNormalizarTextoBusca(linha);
  if (/saldo total|saldo disponivel|saldo disponível|saldo do dia|saldo anterior|saldo em conta/.test(normal)) return "saldo";
  if (/rendiment|rend pago|remuneracao|remuneraçao|juros/.test(normal)) return "rendimento";
  if (Number(valor || 0) < 0) return "saida";
  if (/rshop|rsccs|tarifa|iof|pagamento efetuado|debito|d[eé]bito|compra|pix enviado/.test(normal)) return "saida";
  if (/recebimento rede|rede visa|rede mast|maquininha|cart[aã]o|cielo|getnet/.test(normal)) return "cartao";
  if (Number(valor || 0) > 0) return "entrada";
  return "outro";
}

function rtFinTipoExtratoTexto(tipo) {
  const mapa = {
    entrada: "Entrada",
    saida: "Saída",
    saldo: "Saldo",
    rendimento: "Rendimento",
    cartao: "Cartão/Rede",
    outro: "Outro"
  };
  return mapa[tipo] || "Outro";
}


function rtFinNormalizarDescricaoExtratoParaChave(texto) {
  return rtFinNormalizarTextoBusca(texto || "")
    .replace(/\b\d{1,2}\s*\/\s*(?:jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)\b/g, " ")
    .replace(/\b\d{1,2}\s*\/\s*\d{1,2}\s*\/\s*\d{2,4}\b/g, " ")
    .replace(/\b\d{1,2}\s*\/\s*\d{1,2}\b/g, " ")
    .replace(/[-+]?\s*(?:r\$\s*)?\d{1,3}(?:\.\d{3})*,\d{2}\b/g, " ")
    .replace(/[-+]?\s*(?:r\$\s*)?\d+,\d{2}\b/g, " ")
    .replace(/\bexibir\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function rtFinAssinaturaExtratoRobusta(linha) {
  if (!linha) return "";
  const data = linha.data_lancamento || linha.data || rtFinNormalizarData(linha.descricao || linha.linha_original || linha.linha || "") || "sem-data";
  const valor = Math.abs(Number(linha.valor_assinado ?? linha.valor ?? 0)).toFixed(2);
  const desc = rtFinNormalizarDescricaoExtratoParaChave(linha.descricao || linha.linha_original || linha.linha || "").slice(0, 120);
  return [data, valor, desc].join("|");
}

function rtFinPrioridadeLinhaExtrato(linha) {
  const st = String(linha?.status || "pendente");
  if (st === "associado") return 60;
  if (st === "rendimento") return 50;
  if (st === "outro") return 45;
  if (st === "ignorado") return 40;
  if (linha?.tipo === "saida" || linha?.tipo === "saldo") return 35;
  return 10;
}

function rtFinDeduplicarExtratoSalvo(lista) {
  const mapa = new Map();
  (Array.isArray(lista) ? lista : []).forEach(l => {
    const key = rtFinAssinaturaExtratoRobusta(l) || l.fingerprint || l.id;
    if (!key) return;
    const atual = mapa.get(key);
    if (!atual) { mapa.set(key, l); return; }
    const pa = rtFinPrioridadeLinhaExtrato(atual);
    const pn = rtFinPrioridadeLinhaExtrato(l);
    if (pn > pa || (pn === pa && String(l.atualizado_em || l.criado_em || "") > String(atual.atualizado_em || atual.criado_em || ""))) {
      mapa.set(key, l);
    }
  });
  return Array.from(mapa.values());
}

function rtFinLinhaExtratoFingerprint(item) {
  return rtFinAssinaturaExtratoRobusta(item);
}

function rtFinTokensNome(texto) {
  const ignorar = new Set(["de", "da", "do", "das", "dos", "e", "a", "o", "pix", "transf", "transferencia", "transfer", "recebido", "qrs"]);
  return rtFinNormalizarTextoBusca(texto)
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(t => t.length >= 3 && !ignorar.has(t));
}

function rtFinDiferencaDias(dataA, dataB) {
  if (!dataA || !dataB) return 999;
  const a = new Date(`${dataA}T12:00:00`);
  const b = new Date(`${dataB}T12:00:00`);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return 999;
  return Math.round(Math.abs(a - b) / 86400000);
}

function rtFinMontarDescricaoEvento(evento) {
  const partes = [evento?.tipo_evento, evento?.endereco, evento?.bairro].filter(Boolean);
  return partes.join(" · ") || evento?.observacao || "Evento";
}

function rtFinItemExtratoDeLinhaSalva(linha) {
  if (!linha) return null;
  return {
    id: linha.id || linha.fingerprint || "",
    linha: linha.descricao || linha.linha_original || "",
    data: linha.data_lancamento || linha.data || "",
    valor: Math.abs(Number(linha.valor ?? linha.valor_assinado ?? 0)),
    valor_assinado: Number(linha.valor_assinado ?? linha.valor ?? 0),
    tipo: linha.tipo || "entrada"
  };
}

function rtFinPontuarOpcaoPagamentoExtrato(item, op) {
  if (!item || !op) return 0;
  const valorAbs = Math.abs(Number(item.valor || 0));
  const valorOp = Math.abs(Number(op.valor || 0));
  const diffValor = Math.abs(valorOp - valorAbs);
  const valorIgual = diffValor < 0.01;
  const valorProximo = diffValor > 0.009 && diffValor <= Math.max(20, valorAbs * 0.05);
  const dataAviso = op.data_aviso || op.data_informada || "";
  const dataEvento = op.data_evento || "";
  const diffAviso = rtFinDiferencaDias(item.data, dataAviso);
  const diffEvento = rtFinDiferencaDias(item.data, dataEvento);
  const tokensLinha = rtFinTokensNome(item.linha || "");
  const tokensCliente = rtFinTokensNome(op.cliente || "");
  const comuns = tokensCliente.filter(t => tokensLinha.includes(t));
  let score = 0;
  if (valorIgual) score += 55;
  else if (valorProximo) score += 30;
  else if (diffValor <= Math.max(50, valorAbs * 0.10)) score += 10;
  if (diffAviso <= 0) score += 30;
  else if (diffAviso <= 1) score += 25;
  else if (diffAviso <= 3) score += 18;
  else if (diffAviso <= 7) score += 10;
  else if (diffAviso <= 20) score += 4;
  if (comuns.length) score += Math.min(25, comuns.length * 12);
  if (diffEvento <= 3) score += 7;
  else if (diffEvento <= 10) score += 3;
  if (!valorIgual && !valorProximo && !comuns.length) score -= 20;
  return Math.max(0, Math.min(99, Math.round(score)));
}

function rtFinSugerirEventoParaExtrato(item) {
  if (!item || !(item.tipo === "entrada" || item.tipo === "rendimento" || item.tipo === "cartao" || item.tipo === "outro")) return null;
  if (item.tipo === "rendimento") return { tipo: "rendimento", confianca: 100, texto: "Rendimento bancário", detalhe: "Não vincular a cliente/evento" };
  if (item.tipo === "cartao") return { tipo: "cartao", confianca: 100, texto: "Cartão/Rede", detalhe: "Entrada de cartão/rede, conferir como Outros se necessário" };

  const candidatos = rtFinOpcoesPagamentoEventos(item).map(o => {
    const confianca = rtFinPontuarOpcaoPagamentoExtrato(item, o);
    const diffValor = Math.abs(Math.abs(Number(item.valor || 0)) - Number(o.valor || 0));
    const diffAviso = rtFinDiferencaDias(item.data, o.data_aviso);
    const tokensLinha = rtFinTokensNome(item.linha || "");
    const comuns = rtFinTokensNome(o.cliente || "").filter(t => tokensLinha.includes(t));
    return {
      evento_id: o.evento_id,
      cliente: o.cliente || "-",
      data_evento: o.data_evento || "",
      data_aviso: o.data_aviso || "",
      tipo_pagamento: o.tipo_pagamento || "",
      valor_esperado: Number(o.valor || 0),
      diferenca: Math.abs(Number(item.valor || 0)) - Number(o.valor || 0),
      diff_dias: diffAviso,
      confianca,
      descricao: `Aviso ${rtFinDataBR(o.data_aviso)} · Evento ${rtFinDataBR(o.data_evento)}`,
      motivo: [
        diffValor < 0.01 ? "valor igual" : (diffValor <= Math.max(20, Math.abs(Number(item.valor || 0)) * 0.05) ? `valor próximo (${rtFinMoeda(diffValor)})` : ""),
        diffAviso < 999 ? `aviso ${rtFinDataBR(o.data_aviso)}` : "",
        comuns.length ? `nome: ${comuns.join(", ")}` : ""
      ].filter(Boolean).join(" · ")
    };
  }).filter(c => Number(c.confianca || 0) >= 60);

  candidatos.sort((a,b) => Number(b.confianca || 0) - Number(a.confianca || 0));
  return candidatos[0] || null;
}


function rtFinEncontrarLinhaSalvaParaPreview(item) {
  if (!item) return null;
  const fp = item.fingerprint || rtFinLinhaExtratoFingerprint(item);
  const robusta = rtFinAssinaturaExtratoRobusta(item);
  const lista = Array.isArray(rtFinanceiroExtratoSalvo) ? rtFinanceiroExtratoSalvo : [];
  let melhor = null;
  lista.forEach(l => {
    const lfp = l.fingerprint || "";
    const lrobusta = rtFinAssinaturaExtratoRobusta(l);
    if ((fp && lfp && fp === lfp) || (robusta && lrobusta && robusta === lrobusta)) {
      if (!melhor || rtFinPrioridadeLinhaExtrato(l) > rtFinPrioridadeLinhaExtrato(melhor)) melhor = l;
    }
  });
  return melhor;
}

function rtFinStatusPreviewLinhaSalva(linhaSalva) {
  if (!linhaSalva) return "";
  const st = String(linhaSalva.status || "pendente").toLowerCase();
  const cliente = linhaSalva.cliente_nome || linhaSalva.cliente || "";
  const tipoPg = linhaSalva.tipo_pagamento || "";
  const dataEv = linhaSalva.evento_data ? rtFinDataBR(linhaSalva.evento_data) : "";
  const detalhes = [cliente, dataEv, tipoPg].filter(Boolean).join(" · ");
  if (st === "associado") {
    return `<div class="financeiro-extrato-match ja-associada">🟢 Já importada e associada${detalhes ? `<span>${rtFinEscapeHtml(detalhes)}</span>` : ""}</div>`;
  }
  if (st === "rendimento") {
    return `<div class="financeiro-extrato-match rendimento">🏦 Já importada como rendimento</div>`;
  }
  if (st === "outro") {
    return `<div class="financeiro-extrato-match outro">📌 Já importada como outro/rede</div>`;
  }
  if (st === "ignorado") {
    return `<div class="financeiro-extrato-match ignorado">🚫 Já importada e ignorada</div>`;
  }
  return `<div class="financeiro-extrato-match ja-pendente">🟡 Já importada, mas ainda pendente</div>`;
}

function rtFinLerExtrato() {
  const texto = rtFinNormalizarTextoCapturadoParaLinhas(document.getElementById("financeiroExtratoTexto")?.value || "", rtFinanceiroExtratoClipboard.html || "");
  rtFinanceiroExtratoSeq += 1;
  rtFinanceiroExtratoLinhas = texto.split(/\r?\n/).map((linha, idx) => {
    const limpa = linha.trim();
    if (!limpa) return null;
    const valor = rtFinExtrairValorAssinado(limpa);
    const data = rtFinNormalizarData(limpa);
    const tipo = rtFinClassificarLinhaExtrato(limpa, valor);
    const item = {
      id: `ext_${rtFinanceiroExtratoSeq}_${idx}`,
      linha: limpa,
      data,
      valor: Math.abs(Number(valor || 0)),
      valor_assinado: Number(valor || 0),
      tipo,
      usado: false
    };
    item.fingerprint = rtFinLinhaExtratoFingerprint(item);
    item.sugestao_evento = rtFinSugerirEventoParaExtrato(item);
    return item;
  }).filter(Boolean).sort((a,b) => String(a.data || "9999").localeCompare(String(b.data || "9999")) || String(a.linha || "").localeCompare(String(b.linha || "")));
  rtFinRenderExtrato();
  if (typeof registrarLogSistema === "function") {
    registrarLogSistema({
      modulo: "Financeiro",
      acao: "Extrato Bancário 2.0 processado",
      registro_id: `extrato-${Date.now()}`,
      registro_nome: "Conferência Bancária 2.0",
      detalhes: `${rtFinanceiroExtratoLinhas.length} linha(s) processada(s)`
    });
  }
  rtFinRender();
}

function rtFinRenderExtrato() {
  const box = document.getElementById("financeiroExtratoResultado");
  if (!box) return;

  const entradas = rtFinanceiroExtratoLinhas.filter(l => ["entrada", "rendimento", "cartao", "outro"].includes(l.tipo) && Number(l.valor_assinado ?? l.valor ?? 0) >= 0);
  const saidas = rtFinanceiroExtratoLinhas.filter(l => l.tipo === "saida");
  const identificadas = entradas.filter(l => l.tipo === "rendimento" || l.tipo === "cartao" || l.tipo === "outro" || (l.sugestao_evento && Number(l.sugestao_evento.confianca || 0) >= 60));
  const naoIdentificadas = entradas.filter(l => l.tipo === "entrada" && (!l.sugestao_evento || Number(l.sugestao_evento.confianca || 0) < 60));

  const setTxt = (id, val, moeda = true) => {
    const el = document.getElementById(id);
    if (el) el.textContent = moeda ? rtFinMoeda(val) : String(val);
  };
  setTxt("finExtEntradas", entradas.reduce((s, l) => s + Math.abs(Number(l.valor || 0)), 0));
  setTxt("finExtSaidas", saidas.reduce((s, l) => s + Math.abs(Number(l.valor || 0)), 0));
  setTxt("finExtIdentificadas", identificadas.length, false);
  setTxt("finExtNaoIdentificadas", naoIdentificadas.length, false);

  if (!rtFinanceiroExtratoLinhas.length) {
    box.className = "financeiro-extrato-resultado empty";
    box.textContent = "Nenhuma linha de extrato processada ainda.";
    return;
  }

  box.className = "financeiro-extrato-resultado financeiro-extrato-resultado-v2";
  box.innerHTML = rtFinanceiroExtratoLinhas.map(l => {
    const sug = l.sugestao_evento;
    const salva = rtFinEncontrarLinhaSalvaParaPreview(l);
    let statusHtml = rtFinStatusPreviewLinhaSalva(salva);
    if (!statusHtml && l.tipo === "rendimento") {
      statusHtml = `<div class="financeiro-extrato-match rendimento">🏦 Rendimento bancário</div>`;
    } else if (!statusHtml && (l.tipo === "cartao" || l.tipo === "outro")) {
      statusHtml = `<div class="financeiro-extrato-match outro">📌 ${l.tipo === "cartao" ? "Cartão/Rede ou outro crédito" : "Outro crédito"}</div>`;
    } else if (!statusHtml && l.tipo === "entrada" && sug) {
      const diff = Math.abs(Number(sug.diferenca || 0));
      statusHtml = `<div class="financeiro-extrato-match ${sug.confianca >= 75 ? "alta" : "media"}">
        <strong>${sug.confianca >= 75 ? "✅" : "⚠"} ${rtFinEscapeHtml(sug.cliente)} · ${rtFinDataBR(sug.data_evento)} · ${rtFinEscapeHtml(sug.tipo_pagamento)}</strong>
        <span>${rtFinEscapeHtml(sug.motivo || "Sugestão por nome/valor/data")}${diff >= 0.01 ? ` · Diferença: ${rtFinMoeda(sug.diferenca)}` : ""}</span>
      </div>`;
    } else if (!statusHtml && l.tipo === "entrada") {
      statusHtml = `<div class="financeiro-extrato-match nao">🔴 Entrada nova não identificada</div>`;
    }

    return `
    <div class="financeiro-extrato-line financeiro-extrato-line-v2 tipo-${l.tipo}">
      <div class="financeiro-extrato-main">
        <strong>${rtFinDataBR(l.data)}</strong>
        <span>${rtFinEscapeHtml(l.linha)}</span>
        ${statusHtml}
      </div>
      <div class="financeiro-extrato-side">
        <em>${l.valor_assinado < 0 ? "-" : "+"}${rtFinMoeda(Math.abs(Number(l.valor || 0)))}</em>
        <small>${rtFinTipoExtratoTexto(l.tipo)}</small>
      </div>
    </div>`;
  }).join("");
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
  const linhasExtratoEntrada = rtFinanceiroExtratoLinhas.filter(l => !l.tipo || l.tipo === "entrada" || l.tipo === "rendimento");
  if (!linhasExtratoEntrada.length) return null;
  const dataRegistro = rtFinNormalizarData(registro.data_informada || registro.data_texto || "");
  const nomeCliente = rtFinNormalizarTextoBusca(registro.cliente);

  // 1) Melhor sugestão: mesmo valor + mesma data + nome/parte do nome no extrato.
  let sugestao = linhasExtratoEntrada.find(l => {
    if (!l.data || !dataRegistro || l.data !== dataRegistro) return false;
    if (!rtFinValoresIguais(l.valor, registro.valor)) return false;
    if (!nomeCliente) return false;
    return rtFinNormalizarTextoBusca(l.linha).includes(nomeCliente.split(" ")[0]);
  });

  // 2) Sugestão principal: mesmo valor + mesma data.
  if (!sugestao) {
    sugestao = linhasExtratoEntrada.find(l => {
      if (!l.data || !dataRegistro || l.data !== dataRegistro) return false;
      return rtFinValoresIguais(l.valor, registro.valor);
    });
  }

  // 3) Apoio visual: mesmo valor, mas data diferente.
  if (!sugestao) {
    const porValor = linhasExtratoEntrada.find(l => rtFinValoresIguais(l.valor, registro.valor));
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
  const prefixo = `${registro.tipo} - Pix/Transf./Dep./Boleto -`;
  const valorIndividualTexto = registro.valor_explicito
    ? `${rtFinMoeda(registro.valor).replace(/^R\$\s*/, "")} - `
    : "";
  let alterou = false;

  const novasLinhas = linhas.map(linha => {
    const limpa = String(linha || "").trim();
    if (limpa === String(registro.linha_original || "").trim()) {
      alterou = true;
      return `${prefixo} ${valorIndividualTexto}${dataExtratoTexto}`;
    }
    const rx = new RegExp(`^${registro.tipo.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}\\s*-\\s*Pix\\s*\\/\\s*Transfer[eê]ncia\\s*-`, "i");
    if (!alterou && rx.test(limpa) && rtFinValoresIguais(rtFinTipoValor(evento, registro.tipo), registro.valor)) {
      alterou = true;
      return `${prefixo} ${valorIndividualTexto}${dataExtratoTexto}`;
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
    tbody.innerHTML = `<tr><td colspan="10" class="empty">Nenhum pagamento bancário encontrado no campo Forma de Pagamento dos eventos.</td></tr>`;
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
    const m = linha.match(/^(Pg\s*Total|Sinal|Restante)\s*-\s*(Pix\s*\/\s*Transf\.\s*\/\s*Dep\.\s*\/\s*Boleto|Pix\s*\/\s*Transfer[eê]ncia|Dinheiro|Cart[aã]o(?:\s*\/\s*Rede)?)\s*-\s*(.*)$/i);
    if (!m) return;
    const tipoRaw = m[1].replace(/\s+/g, " ").trim();
    const tipo = /^pg/i.test(tipoRaw) ? "Pg Total" : tipoRaw.charAt(0).toUpperCase() + tipoRaw.slice(1).toLowerCase();
    const formaPg = /pix/i.test(m[2]) ? "Pix/Transf./Dep./Boleto" : (/dinheiro/i.test(m[2]) ? "Dinheiro" : "Cartão/Rede");
    const dataTexto = String(m[3] || "").trim();
    const detalhes = rtFinExtrairDetalhesLancamento(dataTexto, rtFinTipoValor(evento, tipo));
    if (!(Number(detalhes.valor || 0) > 0.009)) return;
    registros.push({ tipo, forma: formaPg, data: detalhes.dataISO || dataTexto || "", data_texto: dataTexto, valor: detalhes.valor, valor_explicito: detalhes.valor_explicito, linha_original: linha });
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
  let recebido = 0;
  let aReceber = 0;
  let eventosQuitados = 0;
  let eventosPendentes = 0;
  let eventosFuturos = 0;
  const hoje = rtFinDataHojeISO();

  eventosLista.forEach(evento => {
    const dataEvento = rtFinDataISOEvento(evento);
    if (!rtFinMesmoMes(dataEvento, comp.ano, comp.mes)) return;

    const pagamentos = rtFinExtrairTodosPagamentosEvento(evento);
    const valorTotal = rtFinTipoValor(evento, "Pg Total");
    const valorSinal = rtFinTipoValor(evento, "Sinal");
    const valorRestante = rtFinTipoValor(evento, "Restante");
    const totalPrevistoEvento = valorTotal || (valorSinal + valorRestante);

    // A competência é definida pela data do evento. Todos os pagamentos já
    // registrados para esse evento entram em "Recebido", independentemente
    // do mês em que o sinal ou o restante foram pagos.
    const temPgTotal = pagamentos.some(p => p.tipo === "Pg Total");
    const temSinal = pagamentos.some(p => p.tipo === "Sinal");
    const temRestante = pagamentos.some(p => p.tipo === "Restante");

    let recebidoEvento = 0;
    if (temPgTotal) {
      recebidoEvento = totalPrevistoEvento;
    } else {
      if (temSinal) recebidoEvento += valorSinal;
      if (temRestante) recebidoEvento += valorRestante;
    }

    // Evita que inconsistências antigas façam o recebido ultrapassar o valor
    // previsto do próprio evento.
    recebidoEvento = Math.max(0, Math.min(totalPrevistoEvento, recebidoEvento));
    const pendenteEvento = Math.max(0, totalPrevistoEvento - recebidoEvento);

    receitaPrevista += totalPrevistoEvento;
    recebido += recebidoEvento;
    aReceber += pendenteEvento;

    if (totalPrevistoEvento > 0) {
      if (pendenteEvento <= 0.01) {
        eventosQuitados += 1;
      } else if (dataEvento && dataEvento < hoje) {
        // Eventos pendentes passam a representar somente pagamentos em atraso:
        // evento já ocorrido e ainda com saldo em aberto.
        eventosPendentes += 1;
      } else {
        // Eventos de hoje ou de datas posteriores com saldo em aberto ficam
        // separados no visor de eventos futuros.
        eventosFuturos += 1;
      }
    }
  });

  const setTxt = (id, val, moeda = true) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = moeda ? rtFinMoeda(val) : String(val);
  };
  setTxt("finReceitaPrevista", receitaPrevista);
  setTxt("finRecebidoMes", recebido);
  setTxt("finAReceberMes", aReceber);
  setTxt("finEventosQuitados", eventosQuitados, false);
  setTxt("finEventosPendentes", eventosPendentes, false);
  setTxt("finEventosFuturos", eventosFuturos, false);
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
    if (filtro === "atrasados_mes") return c.data && c.data < hoje && rtFinMesmoMes(c.data, rtFinCompetenciaAtual().ano, rtFinCompetenciaAtual().mes);
    if (filtro === "futuros_mes") return c.data && c.data >= hoje && rtFinMesmoMes(c.data, rtFinCompetenciaAtual().ano, rtFinCompetenciaAtual().mes);
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

window.rtFinRestaurarRetornoEvento = function() {
  const estado = window.__rtEventoRetornoFinanceiro;
  if (!estado) return false;
  delete window.__rtEventoRetornoFinanceiro;

  const abaFinanceiro = document.querySelector('.tab-btn[data-section="financeiroSection"]');
  if (abaFinanceiro) abaFinanceiro.click();
  rtFinTrocarAba(estado.aba || "resumo");

  if (estado.auditoriaFiltro) rtFinanceiroAuditoriaFiltro = estado.auditoriaFiltro;
  if (estado.extratoFiltro) rtFinanceiroExtratoFiltro = estado.extratoFiltro;

  Object.entries(estado.campos || {}).forEach(([campoId, valor]) => {
    const campo = document.getElementById(campoId);
    if (campo) campo.value = valor ?? "";
  });

  if (typeof rtFinRenderTudoFase1 === "function") rtFinRenderTudoFase1();

  setTimeout(() => {
    Object.entries(estado.campos || {}).forEach(([campoId, valor]) => {
      const campo = document.getElementById(campoId);
      if (campo) campo.value = valor ?? "";
    });
    if (typeof rtFinRenderExtratoSalvo === "function") rtFinRenderExtratoSalvo();
    if (typeof rtFinRenderPagamentosNaoLocalizados === "function") rtFinRenderPagamentosNaoLocalizados();

    const elementosScroll = document.querySelectorAll('#financeiroSection .table-wrapper, #financeiroSection [data-fin-panel]');
    Object.entries(estado.scrolls || {}).forEach(([idx, pos]) => {
      const el = elementosScroll[Number(idx)];
      if (el) {
        el.scrollTop = Number(pos?.top || 0);
        el.scrollLeft = Number(pos?.left || 0);
      }
    });
    window.scrollTo({ top: Number(estado.scrollY || 0), behavior: "auto" });
  }, 180);
  return true;
};

async function rtFinRenderTudoFase1() {
  await rtFinGarantirEventosAtualizados();
  rtFinAtualizarResumo();
  rtFinRenderContasAReceber();
  rtFinRender();
  rtFinRenderPagamentosNaoLocalizados();
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
  document.getElementById("financeiroMostrarCapturaBtn")?.addEventListener("click", rtFinMostrarDiagnosticoExtrato);
  document.getElementById("financeiroSalvarExtratoBtn")?.addEventListener("click", rtFinSalvarExtratoProcessado);
  document.getElementById("financeiroRecarregarExtratoSalvoBtn")?.addEventListener("click", rtFinCarregarExtratoSalvo);
  const buscaExtrato = document.getElementById("financeiroExtratoBuscaSalvos");
  if (buscaExtrato) {
    buscaExtrato.value = rtFinanceiroExtratoBusca || "";
    buscaExtrato.addEventListener("input", () => {
      rtFinanceiroExtratoBusca = buscaExtrato.value || "";
      try { localStorage.setItem("rtFinanceiroExtratoBusca", rtFinanceiroExtratoBusca); } catch(e) {}
      rtFinRenderExtratoSalvo();
    });
  }
  document.getElementById("financeiroExtratoTexto")?.addEventListener("paste", rtFinCapturarColagemExtrato);
  document.getElementById("financeiroLimparExtratoBtn")?.addEventListener("click", () => {
    const txt = document.getElementById("financeiroExtratoTexto");
    if (txt) txt.value = "";
    rtFinanceiroExtratoLinhas = [];
    const diag = document.getElementById("financeiroExtratoDiagnostico");
    if (diag) { diag.className = "financeiro-extrato-diagnostico empty oculto"; diag.textContent = "Diagnóstico oculto."; diag.style.display = "none"; }
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
  const abrirListaResumo = (filtro) => {
    rtFinTrocarAba("receber");
    const campo = document.getElementById("financeiroReceberFiltro");
    if (campo) campo.value = filtro;
    rtFinRenderContasAReceber();
    document.getElementById("financeiroTabReceber")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  document.getElementById("finEventosPendentesCard")?.addEventListener("click", () => abrirListaResumo("atrasados_mes"));
  document.getElementById("finEventosFuturosCard")?.addEventListener("click", () => abrirListaResumo("futuros_mes"));
  setTimeout(rtFinRenderTudoFase1, 300);
  setTimeout(async () => {
    await rtFinAuditoriaCarregarNuvem();
    await rtFinCarregarExtratoSalvo();
    rtFinRenderPagamentosNaoLocalizados();
  }, 500);
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
