let rtDashboardProdutosCacheKey = "";
let rtDashboardEventosCache = null;
let rtDashboardEventosCacheTs = 0;
const RT_DASHBOARD_EVENTOS_TTL_MS = 2 * 60 * 1000;

function atualizarDashboard(produtos = []) {
  const listaProdutos = Array.isArray(produtos) ? produtos : [];
  const total = listaProdutos.length;
  let livres = 0;
  let manutencaoQtd = 0;
  let bloqueadosQtd = 0;
  const produtosProblema = [];

  listaProdutos.forEach(p => {
    const status = String(p.status || "").toLowerCase();
    if (p.status === "Livre") livres++;
    else produtosProblema.push(p);
    if (status.includes("bloque")) bloqueadosQtd++;
    else if (p.status !== "Livre") manutencaoQtd++;
  });

  const problema = produtosProblema.length;
  const cacheKey = `${total}|${livres}|${problema}|${produtosProblema.map(p => `${p.id || p.codigo}:${p.status}:${p.observacao || ""}`).join(";")}`;

  const totalEl = document.getElementById("dashTotalProdutos");
  const livresEl = document.getElementById("dashLivres");
  const manutEl = document.getElementById("dashManutencao");
  const manutProdutosEl = document.getElementById("dashManutencaoProdutos");
  const bloqueadosEl = document.getElementById("dashBloqueadosProdutos");
  const pagEl = document.getElementById("dashPagamentos");
  const lista = document.getElementById("dashboardProdutosProblema");

  if (totalEl) totalEl.textContent = total;
  if (livresEl) livresEl.textContent = livres;
  if (manutEl) manutEl.textContent = problema;
  if (manutProdutosEl) manutProdutosEl.textContent = manutencaoQtd;
  if (bloqueadosEl) bloqueadosEl.textContent = bloqueadosQtd;
  if (pagEl) pagEl.textContent = "0";

  if (!lista) return;
  if (cacheKey === rtDashboardProdutosCacheKey) return;
  rtDashboardProdutosCacheKey = cacheKey;

  if (!produtosProblema.length) {
    lista.className = "compact-list empty";
    lista.textContent = "Nenhum produto encontrado.";
    return;
  }

  lista.className = "compact-list dash-produtos-problema-lista";
  lista.innerHTML = produtosProblema.slice(0, 80).map(p => `
    <div class="dash-produto-problema-linha">
      <strong>${p.codigo || "Sem código"}</strong>
      <span>${p.categoria || "-"} ${p.tamanho || ""}</span>
      <span class="dash-produto-status">${p.status || "-"}</span>
      <span class="dash-produto-obs">${p.observacao || "-"}</span>
    </div>
  `).join("");
}



async function garantirCarrosRotasDashboard() {
  try {
    if (typeof rotasCarros !== "undefined" && rotasCarros && Object.keys(rotasCarros).length) return;

    const local = JSON.parse(localStorage.getItem("novoRioTendasRotasCarrosV1") || "{}");

    if (typeof rotasCarros !== "undefined") {
      rotasCarros = local || {};
    }

    if (typeof carregarRotasCarrosNuvem === "function") {
      const nuvem = await carregarRotasCarrosNuvem();

      if (nuvem && typeof nuvem === "object") {
        if (typeof rotasCarros !== "undefined") {
          rotasCarros = { ...(rotasCarros || {}), ...nuvem };
        }
        localStorage.setItem("novoRioTendasRotasCarrosV1", JSON.stringify(nuvem));
      }
    }
  } catch (erro) {
    console.warn("Não foi possível carregar carros das rotas no Dashboard:", erro);
  }
}

async function garantirEventosDashboard() {
  if (rtDashboardEventosCache && (Date.now() - rtDashboardEventosCacheTs) < RT_DASHBOARD_EVENTOS_TTL_MS) {
    return rtDashboardEventosCache;
  }

  try {
    if (typeof eventos !== "undefined" && Array.isArray(eventos) && eventos.length) {
      rtDashboardEventosCache = eventos; rtDashboardEventosCacheTs = Date.now(); return eventos;
    }
    if (Array.isArray(window.eventos) && window.eventos.length) {
      rtDashboardEventosCache = window.eventos; rtDashboardEventosCacheTs = Date.now(); return window.eventos;
    }

    // Performance V2: pinta o Dashboard imediatamente com o último cache válido.
    // A sincronização da nuvem continua em segundo plano pelo gerenciador de performance.
    try {
      const local = JSON.parse(localStorage.getItem("novoRioTendasEventosV2") || "[]");
      if (Array.isArray(local) && local.length) {
        rtDashboardEventosCache = local;
        rtDashboardEventosCacheTs = Date.now();
        return local;
      }
    } catch {}

    if (typeof buscarEventosBanco === "function") {
      const lista = await buscarEventosBanco();
      if (Array.isArray(lista)) {
        console.log("[Dashboard] eventos via buscarEventosBanco:", lista.length);
        window.eventos = lista;
        try { if (typeof eventos !== "undefined") eventos = lista; } catch (e) {}
        rtDashboardEventosCache = lista;
        rtDashboardEventosCacheTs = Date.now();
        return lista;
      }
    }

    if (typeof carregarEventos === "function") {
      await carregarEventos();
      if (typeof eventos !== "undefined" && Array.isArray(eventos)) return eventos;
      if (Array.isArray(window.eventos)) return window.eventos;
    }

    if (typeof eventos !== "undefined" && Array.isArray(eventos)) { rtDashboardEventosCache = eventos; rtDashboardEventosCacheTs = Date.now(); return eventos; }
    if (Array.isArray(window.eventos)) { rtDashboardEventosCache = window.eventos; rtDashboardEventosCacheTs = Date.now(); return window.eventos; }
  } catch (erro) {
    console.warn("Não foi possível carregar eventos no Dashboard:", erro);
  }

  return [];
}


function obterCampoDashboardEvento(evento, nomes, padrao = "") {
  for (const nome of nomes) {
    if (evento && evento[nome] !== undefined && evento[nome] !== null && String(evento[nome]).trim() !== "") {
      return evento[nome];
    }
  }
  return padrao;
}

function dataEventoDashboard(evento) {
  return normalizarDataDashboard(obterCampoDashboardEvento(evento, [
    "data_evento", "dataEvento", "data", "evento_data", "dia_evento"
  ]));
}

function montagemEventoDashboard(evento) {
  return obterCampoDashboardEvento(evento, [
    "montagem", "data_montagem", "montagem_data", "data_hora_montagem", "dataMontagem"
  ]);
}

function desmontagemEventoDashboard(evento) {
  return obterCampoDashboardEvento(evento, [
    "desmontagem", "data_desmontagem", "desmontagem_data", "data_hora_desmontagem", "dataDesmontagem"
  ]);
}

function nomeClienteDashboard(evento) {
  return obterCampoDashboardEvento(evento, ["nome", "cliente", "nome_cliente", "cliente_nome"], "-");
}

function enderecoDashboard(evento) {
  return obterCampoDashboardEvento(evento, ["endereco", "endereço", "local", "local_evento"], "-");
}

function telefoneDashboard(evento) {
  return obterCampoDashboardEvento(evento, ["telefone", "celular", "whatsapp", "contato"], "-");
}

function horaEventoDashboard(evento) {
  return obterCampoDashboardEvento(evento, ["hora_inicio", "hora_evento", "horario", "hora"], "");
}

function normalizarDataDashboard(valor) {
  if (!valor) return "";
  return String(valor).slice(0, 10);
}

function compararDataDashboard(dataA, dataB) {
  const a = normalizarDataDashboard(dataA);
  const b = normalizarDataDashboard(dataB);
  if (!a || !b) return 0;
  return a.localeCompare(b);
}

function dataISOHojeDashboard() {
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = String(hoje.getMonth() + 1).padStart(2, "0");
  const dia = String(hoje.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

function formatarDataDashboard(dataISO) {
  if (!dataISO) return "-";
  const partes = String(dataISO).slice(0,10).split("-");
  if (partes.length !== 3) return dataISO;
  return `${partes[2]}/${partes[1]}`;
}

function horaDashboard(valor) {
  if (!valor) return "";
  const texto = String(valor).trim();
  let hora = "";
  if (texto.includes("T")) hora = texto.slice(11,16);
  else {
    const m = texto.match(/(?:^|\s)(\d{1,2}:\d{2})(?:\b|$)/);
    hora = m ? m[1].padStart(5, "0") : "";
  }
  if (hora === "00:00") return "";
  return hora;
}

function statusPagamentoDashboard(evento) {
  if (
    evento.pagamento_quitado ||
    evento.status_pagamento === "Pago" ||
    evento.status_pagamento === "Quitado"
  ) {
    return {
      texto: "Pago",
      classe: "ok"
    };
  }

  const sinal = Number(evento.sinal || 0);
  const total = Number(evento.total || evento.valor_total || 0);

  if (sinal > 0 && sinal < total) {
    return {
      texto: "Parcial",
      classe: "partial"
    };
  }

  return {
    texto: "Pendente",
    classe: "pending"
  };
}

function carroEventoDashboard(evento, tipos = []) {
  try {
    const mapa = (typeof rotasCarros !== "undefined" && rotasCarros)
      ? rotasCarros
      : JSON.parse(localStorage.getItem("novoRioTendasRotasCarrosV1") || "{}");

    const id = evento?.id;
    if (!id || !mapa) return "Sem carro";

    const chaves = [];

    if (tipos.includes("montagem")) chaves.push(`${id}-montagem`);
    if (tipos.includes("desmontagem")) chaves.push(`${id}-desmontagem`);

    chaves.push(`${id}-montagem`, `${id}-desmontagem`, id);

    const carrosEncontrados = chaves
      .map(chave => mapa[chave])
      .filter(carro => carro && carro !== "Sem carro");

    const unicos = [...new Set(carrosEncontrados)];

    if (unicos.length) return unicos.join(" / ");

    return "Sem carro";
  } catch (e) {
    return "Sem carro";
  }
}

function operacaoDashboard(evento, tipo) {
  const montagem = montagemEventoDashboard(evento);
  const desmontagem = desmontagemEventoDashboard(evento);
  const dataEvento = dataEventoDashboard(evento);

  const dataBase = tipo === "montagem" ? montagem : tipo === "desmontagem" ? desmontagem : dataEvento;

  const dataTexto = formatarDataDashboard(dataBase);
  const horaTexto = tipo === "montagem"
    ? horaDashboard(montagem)
    : tipo === "desmontagem"
    ? horaDashboard(desmontagem)
    : horaEventoDashboard(evento);

  const tipoTexto = tipo === "montagem" ? "Montagem" : tipo === "desmontagem" ? "Desmontagem" : "Evento";

  return `
    <span class="dash-op dash-op-${tipo}">
      <strong>${tipoTexto}</strong>
      ${dataTexto} ${horaTexto || ""}
    </span>
  `;
}

function cardEventoDashboardAgrupado(evento, tipos = ["evento"]) {
  const pagamento = statusPagamentoDashboard(evento);
  const tiposUnicos = [...new Set(tipos)];

  return `
    <div class="dash-event-card dash-event-card-compacto">
      <div class="dash-event-top compacto">
        <div>
          <strong>${nomeClienteDashboard(evento)}</strong>
          <span>${enderecoDashboard(evento)}</span>
        </div>

        <div class="dash-event-actions">
          <span class="dash-pay-badge ${pagamento.classe}">
            ${pagamento.texto}
          </span>
          <button
            type="button"
            class="btn-outline dash-open-event-btn"
            data-dashboard-evento="${evento.id}"
          >
            Abrir
          </button>
        </div>
      </div>

      <div class="dash-ops-line">
        ${tiposUnicos.map(tipo => operacaoDashboard(evento, tipo)).join("")}
      </div>

      <div class="dash-event-middle compacto">
        <span>🚚 ${carroEventoDashboard(evento, tiposUnicos)}</span>
        <span>☎ ${telefoneDashboard(evento)}</span>
      </div>
    </div>
  `;
}


function rtDashDataPrincipalEvento(item) {
  return `${item.primeiraData || ""} ${item.primeiraHora || ""}`;
}

function rtDashPagamentoPendenteEvento(evento) {
  const status = String(evento?.status_pagamento || evento?.pagamento || "").toLowerCase();
  if (evento?.pagamento_quitado || status.includes("quit") || status.includes("pago")) return false;
  const total = rtDashValorEvento(evento);
  const sinal = rtDashNumero(evento?.sinal ?? evento?.valor_sinal ?? 0);
  const restante = rtDashNumero(evento?.restante ?? evento?.valor_restante ?? (total ? Math.max(total - sinal, 0) : 0));
  return total > 0 && restante > 0;
}

function rtDashResumoValorPendente(evento) {
  const total = rtDashValorEvento(evento);
  const sinal = rtDashNumero(evento?.sinal ?? evento?.valor_sinal ?? 0);
  const restante = rtDashNumero(evento?.restante ?? evento?.valor_restante ?? (total ? Math.max(total - sinal, 0) : 0));
  return `Total ${rtDashMoeda(total)} · Sinal ${rtDashMoeda(sinal)} · Restante ${rtDashMoeda(restante)}`;
}

async function renderizarDashboardEventos() {
  const eventosBox = document.getElementById("dashboardEventosHoje");
  const valoresBox = document.getElementById("dashboardValoresPendentes") || document.getElementById("dashboardProximosEventos");

  if (!eventosBox || !valoresBox) return;

  await garantirCarrosRotasDashboard();

  const eventosLista = await garantirEventosDashboard();
  const hojeISO = dataISOHojeDashboard();

  const eventosPorEvento = new Map();
  const valoresPendentes = [];

  const adicionarOperacao = (mapa, evento, tipo, data, hora = "") => {
    data = normalizarDataDashboard(data);
    if (!evento || !data || data < hojeISO) return;
    if ((tipo === "montagem" || tipo === "desmontagem") && rtDashOperacaoConfirmada(evento, tipo)) return;

    const chave = evento.id || evento.evento_id || `${nomeClienteDashboard(evento)}-${data}`;

    if (!mapa.has(chave)) {
      mapa.set(chave, { evento, tipos: [], primeiraData: data, primeiraHora: hora || "" });
    }

    const item = mapa.get(chave);
    if (!item.tipos.includes(tipo)) item.tipos.push(tipo);

    const atual = `${data} ${hora || ""}`;
    const primeiro = `${item.primeiraData} ${item.primeiraHora || ""}`;

    if (atual < primeiro) {
      item.primeiraData = data;
      item.primeiraHora = hora || "";
    }
  };

  eventosLista.forEach(evento => {
    if (!evento || (typeof rtEventoCancelado === "function" && rtEventoCancelado(evento))) return;

    const dataEvento = dataEventoDashboard(evento);
    const montagemValor = montagemEventoDashboard(evento);
    const desmontagemValor = desmontagemEventoDashboard(evento);

    const montagemData = normalizarDataDashboard(montagemValor);
    const desmontagemData = normalizarDataDashboard(desmontagemValor);

    const horaEvento = horaEventoDashboard(evento);
    const horaMontagem = horaDashboard(montagemValor);
    const horaDesmontagem = horaDashboard(desmontagemValor);

    adicionarOperacao(eventosPorEvento, evento, "evento", dataEvento, horaEvento);
    adicionarOperacao(eventosPorEvento, evento, "montagem", montagemData, horaMontagem);
    adicionarOperacao(eventosPorEvento, evento, "desmontagem", desmontagemData, horaDesmontagem);

    const dataBaseValor = dataEvento || montagemData || desmontagemData;
    if (dataBaseValor && dataBaseValor < hojeISO && rtDashPagamentoPendenteEvento(evento)) {
      valoresPendentes.push({ evento, data: dataBaseValor });
    }
  });

  const eventosItens = [...eventosPorEvento.values()].sort((a, b) => rtDashDataPrincipalEvento(a).localeCompare(rtDashDataPrincipalEvento(b)));
  valoresPendentes.sort((a, b) => String(a.data).localeCompare(String(b.data)) || nomeClienteDashboard(a.evento).localeCompare(nomeClienteDashboard(b.evento)));

  const qtdEventos = document.getElementById("dashEventosHojeQtd");
  if (qtdEventos) qtdEventos.textContent = eventosItens.length;
  const qtdValores = document.getElementById("dashEventosFuturosQtd");
  if (qtdValores) qtdValores.textContent = valoresPendentes.length;

  eventosBox.classList.remove("empty");
  valoresBox.classList.remove("empty");

  eventosBox.innerHTML = eventosItens.length
    ? eventosItens.slice(0, 18).map(item => cardEventoDashboardAgrupado(item.evento, item.tipos)).join("")
    : `<div class="empty">Nenhum evento futuro encontrado.</div>`;

  valoresBox.innerHTML = valoresPendentes.length
    ? valoresPendentes.slice(0, 30).map(item => rtDashItem({
        tipo: "money",
        titulo: `${nomeClienteDashboard(item.evento)} · ${rtDashMoeda(rtDashNumero(item.evento?.restante ?? item.evento?.valor_restante ?? Math.max(rtDashValorEvento(item.evento) - rtDashNumero(item.evento?.sinal ?? item.evento?.valor_sinal ?? 0), 0)))}`,
        meta: `Evento ${formatarDataDashboard(item.data)}`,
        detalhe: rtDashResumoValorPendente(item.evento),
        data: item.data,
        eventoId: item.evento?.id || "",
        botao: "Evento"
      })).join("")
    : `<div class="empty">Nenhum valor vencido encontrado.</div>`;

  document.querySelectorAll("[data-dashboard-evento]").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.dashboardEvento;
      if (typeof abrirDetalheEvento === "function") abrirDetalheEvento(id);
      else alert("Abra o setor Eventos para visualizar este evento.");
    });
  });
  document.querySelectorAll("[data-dash-rota-data]").forEach(btn => {
    btn.onclick = () => rtDashAbrirRotaData(btn.dataset.dashRotaData, btn.dataset.dashRotaId || "");
  });
  document.querySelectorAll("[data-dashboard-evento]").forEach(btn => {
    btn.onclick = () => {
      const id = btn.dataset.dashboardEvento;
      if (typeof abrirDetalheEvento === "function") abrirDetalheEvento(id);
      else alert("Abra o setor Eventos para visualizar este evento.");
    };
  });
}


// dashboard-render-fix
document.addEventListener("DOMContentLoaded", () => {
  // O gerenciador lazy carrega o Dashboard uma única vez por janela de cache.
  document.querySelectorAll("[data-section='dashboardSection']").forEach(btn => {
    btn.addEventListener("click", () => {
      if (typeof window.rtCarregarSecaoOtimizada === "function") window.rtCarregarSecaoOtimizada("dashboardSection");
    });
  });
});


// v19-dev-lista-combinada-scroll-4
function aplicarScrollListaCombinadaCalendario() {
  const seletores = [
    '#listaEventosDia',
    '#listaEventosMontagens',
    '#eventosMontagensDesmontagens',
    '#calendarioListaDia',
    '.calendario-lista-dia',
    '.calendario-lista-combinada',
    '.lista-eventos-dia',
    '.lista-eventos-montagens',
    '.eventos-montagens-desmontagens'
  ];

  seletores.forEach((sel) => {
    document.querySelectorAll(sel).forEach((el) => {
      el.classList.add('calendario-lista-combinada');
    });
  });
}

document.addEventListener('DOMContentLoaded', aplicarScrollListaCombinadaCalendario);

// v19-dev-dashboard-alertas
const RT_DASH_ALERTAS_CONFIG_KEY = "dashboard_alertas_config";
const RT_DASH_ALERTAS_DEFAULT = {
  montagensDia: 6,
  desmontagensDia: 6,
  tendasEvento: 5,
  materiaisEvento: 50,
  valorAlto: 1500
};
let rtDashboardAlertasConfig = { ...RT_DASH_ALERTAS_DEFAULT };

function rtDashEscape(texto) {
  return String(texto ?? "").replace(/[&<>'"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;","\"":"&quot;"}[c]));
}

function rtDashNumero(valor) {
  const n = Number(String(valor ?? "").replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function rtDashMoeda(valor) {
  return rtDashNumero(valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function rtDashSomarMateriaisEvento(evento) {
  let total = 0;
  if (Array.isArray(evento?.tendas)) total += evento.tendas.length;
  if (Array.isArray(evento?.itens_apoio)) {
    evento.itens_apoio.forEach(i => total += Number(i.quantidade || i.qtd || 0) || 0);
  }
  if (Array.isArray(evento?.produtos_extras)) {
    evento.produtos_extras.forEach(i => total += Number(i.quantidade || i.qtd || 1) || 1);
  }
  return total;
}

function rtDashQtdTendasEvento(evento) {
  return Array.isArray(evento?.tendas) ? evento.tendas.length : 0;
}

function rtDashValorEvento(evento) {
  return rtDashNumero(evento?.valor_total ?? evento?.total ?? evento?.valor ?? 0);
}

function rtDashDataHoraEvento(evento, tipo) {
  const bruto = tipo === "montagem" ? montagemEventoDashboard(evento) : desmontagemEventoDashboard(evento);
  return { data: normalizarDataDashboard(bruto), hora: horaDashboard(bruto) };
}

function rtDashOperacaoForaHorario(tipoHorario, hora) {
  try {
    if (typeof horarioForaComercialRota === "function") return horarioForaComercialRota(tipoHorario, hora);
  } catch(e) {}
  const h = String(hora || "").slice(0,5);
  if (!/^\d{2}:\d{2}$/.test(h)) return false;
  return h < "08:00" || h > "18:00";
}

function rtDashOperacaoConfirmada(evento, tipo) {
  try {
    const id = `${evento.id}-${tipo}`;
    const op = (typeof rotasOperacao !== "undefined" && rotasOperacao) ? rotasOperacao[id] : null;
    if (!op) return false;
    const status = String(op.status || "").toLowerCase();
    if (tipo === "montagem") return status === "entregue";
    if (tipo === "desmontagem") return status === "recolhido";
  } catch(e) {}
  return false;
}

function rtDashAbrirRotaData(data, rotaId = "") {
  try {
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".section").forEach(s => s.classList.remove("active-section"));
    document.querySelector("[data-section='rotasSection']")?.classList.add("active");
    document.getElementById("rotasSection")?.classList.add("active-section");

    const periodo = document.getElementById("rotaPeriodo");
    if (periodo) {
      periodo.value = "data";
      periodo.dispatchEvent(new Event("change", { bubbles: true }));
    }

    const input = document.getElementById("rotaData");
    if (input) {
      input.value = data;
      input.dispatchEvent(new Event("change", { bubbles: true }));
    }

    if (typeof renderizarRotas === "function") setTimeout(renderizarRotas, 80);

    if (rotaId) {
      const tentarLocalizar = () => {
        try {
          const idSafe = typeof CSS !== "undefined" && CSS.escape ? CSS.escape(rotaId) : String(rotaId).replace(/"/g, '\"');
          const card = document.querySelector(`.rota-card[data-rota-card="${idSafe}"]`);
          if (card) {
            card.scrollIntoView({ behavior: "smooth", block: "center" });
            card.classList.add("rota-card-localizado");
            setTimeout(() => card.classList.remove("rota-card-localizado"), 2200);
          }
        } catch(e) {}
      };
      setTimeout(tentarLocalizar, 350);
      setTimeout(tentarLocalizar, 900);
    }
  } catch (erro) {
    console.warn("Não foi possível abrir a rota pelo Dashboard:", erro);
  }
}

function rtDashItem({ tipo = "info", titulo, meta = "", detalhe = "", data = "", rotaId = "", eventoId = "", botao = "Rota" }) {
  const botaoHtml = eventoId
    ? rtDashBotaoEvento(eventoId, botao || "Evento")
    : (data ? `<button type="button" class="btn-outline dash-alert-rota-btn" data-dash-rota-data="${rtDashEscape(data)}" data-dash-rota-id="${rtDashEscape(rotaId || "")}">${rtDashEscape(botao || "Rota")}</button>` : "");
  return `<div class="dash-alert-item dash-alert-${tipo}" data-dash-alert-date="${rtDashEscape(data || "")}" data-dash-alert-rota-id="${rtDashEscape(rotaId || "")}">
    <div class="dash-alert-main">
      <strong>${rtDashEscape(titulo)}</strong>
      ${meta ? `<span>${rtDashEscape(meta)}</span>` : ""}
      ${detalhe ? `<small>${rtDashEscape(detalhe)}</small>` : ""}
    </div>
    ${botaoHtml}
  </div>`;
}

async function rtDashCarregarConfigAlertas() {
  let cfg = null;
  try {
    if (typeof supabaseClient !== "undefined" && supabaseClient) {
      const { data, error } = await supabaseClient.from("app_config").select("valor").eq("chave", RT_DASH_ALERTAS_CONFIG_KEY).maybeSingle();
      if (!error && data?.valor) cfg = data.valor;
    }
  } catch(e) { console.warn("Dashboard: não carregou config nuvem", e); }
  if (!cfg) {
    try { cfg = JSON.parse(localStorage.getItem("riotendas_dashboard_alertas_config") || "null"); } catch(e) {}
  }
  rtDashboardAlertasConfig = { ...RT_DASH_ALERTAS_DEFAULT, ...(cfg || {}) };
  rtDashPreencherInputsConfig();
  return rtDashboardAlertasConfig;
}

function rtDashPreencherInputsConfig() {
  const cfg = rtDashboardAlertasConfig;
  const mapa = {
    dashAlertaMontagensQtd: "montagensDia",
    dashAlertaDesmontagensQtd: "desmontagensDia",
    dashAlertaTendasEventoQtd: "tendasEvento",
    dashAlertaMateriaisQtd: "materiaisEvento",
    dashAlertaValorAlto: "valorAlto"
  };
  Object.entries(mapa).forEach(([id, chave]) => {
    const el = document.getElementById(id);
    if (el) el.value = cfg[chave];
  });
}

async function rtDashSalvarConfigAlertas() {
  const cfg = {
    montagensDia: Number(document.getElementById("dashAlertaMontagensQtd")?.value || 6),
    desmontagensDia: Number(document.getElementById("dashAlertaDesmontagensQtd")?.value || 6),
    tendasEvento: Number(document.getElementById("dashAlertaTendasEventoQtd")?.value || 5),
    materiaisEvento: Number(document.getElementById("dashAlertaMateriaisQtd")?.value || 50),
    valorAlto: Number(document.getElementById("dashAlertaValorAlto")?.value || 1500)
  };
  rtDashboardAlertasConfig = { ...RT_DASH_ALERTAS_DEFAULT, ...cfg };
  localStorage.setItem("riotendas_dashboard_alertas_config", JSON.stringify(rtDashboardAlertasConfig));
  try {
    if (typeof supabaseClient !== "undefined" && supabaseClient) {
      const { error } = await supabaseClient.from("app_config").upsert({
        chave: RT_DASH_ALERTAS_CONFIG_KEY,
        valor: rtDashboardAlertasConfig,
        atualizado_em: new Date().toISOString()
      }, { onConflict: "chave" });
      if (error) throw error;
    }
    alert("Alertas do dashboard salvos.");
  } catch (erro) {
    console.warn("Não foi possível salvar alertas no Supabase:", erro);
    alert("Alertas salvos neste navegador. Verifique o Supabase/app_config para salvar multiusuário.");
  }
  const modal = document.querySelector(".dashboard-config-modal");
  if (modal) modal.hidden = true;
  await renderizarDashboardAlertas();
}


function rtDashDataDoHtml(itemHtml) {
  const m = String(itemHtml || "").match(/data-dash-alert-date="([^"]*)"/);
  return m ? m[1] : "";
}

function rtDashOrdenarPorDataAsc(lista) {
  return [...(lista || [])].sort((a, b) => rtDashDataDoHtml(a).localeCompare(rtDashDataDoHtml(b)));
}

function rtDashSomenteHojeEmDiante(lista, hoje) {
  return (lista || []).filter(item => {
    const data = rtDashDataDoHtml(item);
    return data && data >= hoje;
  });
}


function rtDashAbreviarMaterial(nome) {
  const n = String(nome || "").toLowerCase();
  if (n.includes("cadeira")) return "cad";
  if (n.includes("mesa")) return "mesas";
  if (n.includes("conj")) return "conj";
  if (n.includes("caixa") && n.includes("term")) return "Cx Term";
  if (n.includes("lateral")) return "Lat";
  if (n.includes("tenda")) return "tendas";
  return String(nome || "mat").replace(/\s+/g, " ").trim().slice(0, 14);
}

function rtDashResumoMateriaisTexto(evento) {
  const partes = [];
  const qtdTendas = rtDashQtdTendasEvento(evento);
  if (qtdTendas) partes.push(`${String(qtdTendas).padStart(2, "0")} ${qtdTendas === 1 ? "tenda" : "tendas"}`);

  const acumulado = new Map();
  const coletar = (arr) => {
    if (!Array.isArray(arr)) return;
    arr.forEach(item => {
      const qtd = Number(item?.quantidade ?? item?.qtd ?? item?.qtde ?? 1) || 1;
      const nome = rtDashAbreviarMaterial(item?.nome ?? item?.produto ?? item?.tipo ?? item?.descricao ?? item?.label ?? "material");
      acumulado.set(nome, (acumulado.get(nome) || 0) + qtd);
    });
  };
  coletar(evento?.itens_apoio);
  coletar(evento?.produtos_extras);
  coletar(evento?.materiais_extra);
  coletar(evento?.apoio);

  acumulado.forEach((qtd, nome) => partes.push(`${qtd} ${nome}`));
  return partes.length ? partes.join(" + ") : "Sem material informado";
}

function rtDashAcumularMateriaisDia(destino, evento) {
  if (!destino.mapaMateriais) destino.mapaMateriais = new Map();
  const add = (nome, qtd) => {
    qtd = Number(qtd || 0) || 0;
    if (!qtd) return;
    destino.mapaMateriais.set(nome, (destino.mapaMateriais.get(nome) || 0) + qtd);
  };
  const qtdTendas = rtDashQtdTendasEvento(evento);
  if (qtdTendas) add(qtdTendas === 1 ? "tenda" : "tendas", qtdTendas);
  const coletar = (arr) => {
    if (!Array.isArray(arr)) return;
    arr.forEach(item => {
      const qtd = Number(item?.quantidade ?? item?.qtd ?? item?.qtde ?? 1) || 1;
      const nome = rtDashAbreviarMaterial(item?.nome ?? item?.produto ?? item?.tipo ?? item?.descricao ?? item?.label ?? "material");
      add(nome, qtd);
    });
  };
  coletar(evento?.itens_apoio);
  coletar(evento?.produtos_extras);
  coletar(evento?.materiais_extra);
  coletar(evento?.apoio);
}

function rtDashResumoMateriaisMap(mapa) {
  const partes = [];
  if (mapa && typeof mapa.forEach === "function") {
    mapa.forEach((qtd, nome) => partes.push(`${qtd} ${nome}`));
  }
  return partes.length ? partes.join(" + ") : "Sem material informado";
}

function rtDashBotaoEvento(id, label = "Evento") {
  return id ? `<button type="button" class="btn-outline dash-alert-rota-btn" data-dashboard-evento="${rtDashEscape(id)}">${rtDashEscape(label)}</button>` : "";
}

function rtDashMetaOperacaoEvento(evento) {
  const montagem = rtDashDataHoraEvento(evento, "montagem");
  const desmontagem = rtDashDataHoraEvento(evento, "desmontagem");
  const m = montagem.data ? `Mont. ${formatarDataDashboard(montagem.data)}${montagem.hora ? " " + montagem.hora : ""}` : "";
  const d = desmontagem.data ? `Desm. ${formatarDataDashboard(desmontagem.data)}${desmontagem.hora ? " " + desmontagem.hora : ""}` : "";
  return [m, d].filter(Boolean).join(" · ");
}

async function renderizarDashboardAlertas() {
  const eventosLista = await garantirEventosDashboard();
  const hoje = dataISOHojeDashboard();
  const cfg = rtDashboardAlertasConfig || RT_DASH_ALERTAS_DEFAULT;

  const montagensPorDia = new Map();
  const desmontagensPorDia = new Map();
  const foraHorario = [];
  const pendentes = [];
  const alertas = [];
  const tendasAlugadas = [];
  const estoquePorDia = new Map();

  eventosLista.forEach(evento => {
    if (!evento || (typeof rtEventoCancelado === "function" && rtEventoCancelado(evento))) return;
    const nome = nomeClienteDashboard(evento);
    const qtdTendas = rtDashQtdTendasEvento(evento);
    const qtdMateriais = rtDashSomarMateriaisEvento(evento);
    const valor = rtDashValorEvento(evento);
    const dataEvento = dataEventoDashboard(evento);

    if (qtdTendas) tendasAlugadas.push({ evento, qtdTendas, data: dataEvento || rtDashDataHoraEvento(evento, "montagem").data || "" });
    const dataRotaEvento = rtDashDataHoraEvento(evento, "montagem").data || dataEvento || rtDashDataHoraEvento(evento, "desmontagem").data;
    const rotaIdEvento = evento?.id ? `${evento.id}-montagem` : "";
    const metaOperacao = rtDashMetaOperacaoEvento(evento) || `Evento ${formatarDataDashboard(dataEvento)}`;
    const resumoMateriais = rtDashResumoMateriaisTexto(evento);
    if (qtdTendas >= Number(cfg.tendasEvento || 5)) alertas.push(rtDashItem({ tipo: "warning", titulo: `${nome} · ${qtdTendas} tendas`, meta: metaOperacao, detalhe: resumoMateriais, data: dataRotaEvento, eventoId: evento?.id || "", botao: "Evento" }));
    if (qtdMateriais >= Number(cfg.materiaisEvento || 50)) alertas.push(rtDashItem({ tipo: "warning", titulo: `${nome} · material grande`, meta: metaOperacao, detalhe: resumoMateriais, data: dataRotaEvento, eventoId: evento?.id || "", botao: "Evento" }));
    if (valor >= Number(cfg.valorAlto || 1500)) alertas.push(rtDashItem({ tipo: "money", titulo: `${nome} · ${rtDashMoeda(valor)}`, meta: metaOperacao, detalhe: resumoMateriais, data: dataRotaEvento, eventoId: evento?.id || "", botao: "Evento" }));

    ["montagem", "desmontagem"].forEach(tipo => {
      const { data, hora } = rtDashDataHoraEvento(evento, tipo);
      if (!data) return;
      const mapa = tipo === "montagem" ? montagensPorDia : desmontagensPorDia;
      mapa.set(data, (mapa.get(data) || 0) + 1);
      if (tipo === "montagem") {
        const atual = estoquePorDia.get(data) || { data, tendas: 0, materiais: 0, eventos: 0 };
        atual.tendas += qtdTendas;
        atual.materiais += qtdMateriais;
        atual.eventos += 1;
        rtDashAcumularMateriaisDia(atual, evento);
        estoquePorDia.set(data, atual);
      }
      const tipoHorario = tipo === "montagem" ? (evento.montagem_tipo || evento.tipo_horario_montagem || "") : (evento.desmontagem_tipo || evento.tipo_horario_desmontagem || "");
      if (data >= hoje && !rtDashOperacaoConfirmada(evento, tipo) && rtDashOperacaoForaHorario(tipoHorario, hora)) {
        const metaFora = [formatarDataDashboard(data), hora].filter(Boolean).join(" ");
        foraHorario.push(rtDashItem({ tipo: "time", titulo: `${tipo === "montagem" ? "Montagem" : "Desmontagem"} · ${nome}`, meta: metaFora, detalhe: enderecoDashboard(evento), data, eventoId: evento?.id || "", botao: "Evento" }));
      }
      if (data <= hoje && !rtDashOperacaoConfirmada(evento, tipo)) {
        pendentes.push(rtDashItem({ tipo: "danger", titulo: `${tipo === "montagem" ? "Entrega" : "Retirada"} não confirmada · ${nome}`, meta: `${formatarDataDashboard(data)} ${hora || ""}`, detalhe: enderecoDashboard(evento), data, rotaId: `${evento.id}-${tipo}` }));
      }
    });
  });

  [...montagensPorDia.entries()].sort().forEach(([data, qtd]) => {
    if (data >= hoje && qtd >= Number(cfg.montagensDia || 6)) alertas.push(rtDashItem({ tipo: "warning", titulo: `${qtd} montagens no dia`, meta: formatarDataDashboard(data), detalhe: "Carga operacional alta", data }));
  });
  [...desmontagensPorDia.entries()].sort().forEach(([data, qtd]) => {
    if (data >= hoje && qtd >= Number(cfg.desmontagensDia || 6)) alertas.push(rtDashItem({ tipo: "warning", titulo: `${qtd} desmontagens no dia`, meta: formatarDataDashboard(data), detalhe: "Carga operacional alta", data }));
  });

  const estoqueItens = [...estoquePorDia.values()]
    .filter(i => i.data >= hoje)
    .sort((a,b) => a.data.localeCompare(b.data))
    .slice(0, 21)
    .map(i => rtDashItem({ tipo: i.tendas >= Number(cfg.tendasEvento || 5) || i.materiais >= Number(cfg.materiaisEvento || 50) ? "warning" : "ok", titulo: `${formatarDataDashboard(i.data)} · ${i.eventos} evento(s)`, meta: rtDashResumoMateriaisMap(i.mapaMateriais), detalhe: "Uso previsto de estoque", data: i.data }));

  const tendasItens = tendasAlugadas
    .sort((a,b) => String(a.data).localeCompare(String(b.data)) || b.qtdTendas - a.qtdTendas)
    .slice(0, 80)
    .map(i => rtDashItem({ tipo: i.qtdTendas >= Number(cfg.tendasEvento || 5) ? "warning" : "info", titulo: `${nomeClienteDashboard(i.evento)} · ${i.qtdTendas} tendas`, meta: `Evento ${formatarDataDashboard(i.data)}`, detalhe: enderecoDashboard(i.evento), data: rtDashDataHoraEvento(i.evento, "montagem").data || i.data }));

  const alertasOperacaoOrdenados = rtDashOrdenarPorDataAsc(rtDashSomenteHojeEmDiante(alertas, hoje));
  const pendentesOrdenados = rtDashOrdenarPorDataAsc(pendentes);
  const foraHorarioOrdenados = rtDashOrdenarPorDataAsc(foraHorario);

  rtDashPreencherLista("dashboardAlertasOperacao", "dashAlertasOperacaoQtd", alertasOperacaoOrdenados);
  rtDashPreencherLista("dashboardPendenciasEntrega", "dashPendenciasEntregaQtd", pendentesOrdenados);
  rtDashPreencherLista("dashboardForaHorario", "dashForaHorarioQtd", foraHorarioOrdenados);
  rtDashPreencherLista("dashboardEstoqueFuturo", "dashEstoqueFuturoQtd", estoqueItens);
  // Card de tendas alugadas removido do Dashboard. Mantido cálculo interno sem renderização.

  document.querySelectorAll("[data-dash-rota-data]").forEach(btn => {
    btn.onclick = () => rtDashAbrirRotaData(btn.dataset.dashRotaData, btn.dataset.dashRotaId || "");
  });
  document.querySelectorAll("[data-dashboard-evento]").forEach(btn => {
    btn.onclick = () => {
      const id = btn.dataset.dashboardEvento;
      if (typeof abrirDetalheEvento === "function") abrirDetalheEvento(id);
      else alert("Abra o setor Eventos para visualizar este evento.");
    };
  });
}

function rtDashPreencherLista(idLista, idQtd, itens) {
  const lista = document.getElementById(idLista);
  const qtd = document.getElementById(idQtd);
  if (qtd) qtd.textContent = itens.length;
  if (!lista) return;
  if (!itens.length) {
    lista.classList.add("empty");
    lista.textContent = "Nenhum alerta encontrado.";
    return;
  }
  lista.classList.remove("empty");
  lista.innerHTML = itens.join("");
}

async function iniciarDashboardAlertasPersonalizados() {
  await rtDashCarregarConfigAlertas();
  document.getElementById("dashSalvarAlertasBtn")?.addEventListener("click", rtDashSalvarConfigAlertas);
  document.querySelectorAll("[data-dash-open-alert-config]").forEach(btn => {
    btn.onclick = () => {
      const modal = document.querySelector(".dashboard-config-modal");
      if (modal) modal.hidden = false;
    };
  });
  document.querySelectorAll("[data-dash-close-alert-config]").forEach(btn => {
    btn.onclick = () => {
      const modal = document.querySelector(".dashboard-config-modal");
      if (modal) modal.hidden = true;
    };
  });
  document.querySelectorAll(".dashboard-config-modal").forEach(modal => {
    modal.addEventListener("click", (ev) => {
      if (ev.target === modal) modal.hidden = true;
    });
  });
  await renderizarDashboardAlertas();
}

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll("[data-section='dashboardSection']").forEach(btn => {
    btn.addEventListener("click", () => {
      if (typeof window.rtCarregarSecaoOtimizada === "function") window.rtCarregarSecaoOtimizada("dashboardSection");
    });
  });
  window.addEventListener("riotendas:eventos-atualizados", () => {
    const ativo = document.getElementById("dashboardSection")?.classList.contains("active-section");
    if (ativo) setTimeout(renderizarDashboardAlertas, 180);
  });
});
