let rtDashboardProdutosCacheKey = "";
let rtDashboardEventosCache = null;
let rtDashboardEventosCacheTs = 0;
const RT_DASHBOARD_EVENTOS_TTL_MS = 2 * 60 * 1000;

function atualizarDashboard(produtos = []) {
  const listaProdutos = Array.isArray(produtos) ? produtos : [];
  const total = listaProdutos.length;
  let livres = 0;
  const produtosProblema = [];

  listaProdutos.forEach(p => {
    if (p.status === "Livre") livres++;
    else produtosProblema.push(p);
  });

  const problema = produtosProblema.length;
  const cacheKey = `${total}|${livres}|${problema}|${produtosProblema.map(p => `${p.id || p.codigo}:${p.status}:${p.observacao || ""}`).join(";")}`;

  const totalEl = document.getElementById("dashTotalProdutos");
  const livresEl = document.getElementById("dashLivres");
  const manutEl = document.getElementById("dashManutencao");
  const pagEl = document.getElementById("dashPagamentos");
  const lista = document.getElementById("dashboardProdutosProblema");

  if (totalEl) totalEl.textContent = total;
  if (livresEl) livresEl.textContent = livres;
  if (manutEl) manutEl.textContent = problema;
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
    if (typeof supabaseClient !== "undefined" && supabaseClient) {
      for (const tabela of ["eventos", "eventos_cadastro"]) {
        try {
          const { data, error } = await supabaseClient.from(tabela).select("*");

          if (!error && Array.isArray(data)) {
            console.log(`[Dashboard] eventos carregados de ${tabela}:`, data.length);
            window.eventos = data;
            try { if (typeof eventos !== "undefined") eventos = data; } catch (e) {}
            return data;
          }

          if (error) console.warn(`[Dashboard] erro ao buscar ${tabela}:`, error);
        } catch (erroTabela) {
          console.warn(`[Dashboard] falha ao consultar ${tabela}:`, erroTabela);
        }
      }
    }

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
  const texto = String(valor);
  if (texto.includes("T")) return texto.slice(11,16);
  return texto.slice(0,5);
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

async function renderizarDashboardEventos() {
  const hojeBox = document.getElementById("dashboardEventosHoje");
  const futurosBox = document.getElementById("dashboardProximosEventos");

  if (!hojeBox || !futurosBox) return;

  await garantirCarrosRotasDashboard();

  const eventosLista = await garantirEventosDashboard();
  const hojeISO = dataISOHojeDashboard();

  console.log("[Dashboard] renderizando eventos. Hoje:", hojeISO, "Quantidade:", eventosLista.length);

  const hojePorEvento = new Map();
  const futurosPorEvento = new Map();

  const adicionarOperacao = (mapa, evento, tipo, data, hora = "") => {
    data = normalizarDataDashboard(data);
    if (!evento || !data) return;

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
    const dataEvento = dataEventoDashboard(evento);
    const montagemValor = montagemEventoDashboard(evento);
    const desmontagemValor = desmontagemEventoDashboard(evento);

    const montagemData = normalizarDataDashboard(montagemValor);
    const desmontagemData = normalizarDataDashboard(desmontagemValor);

    const horaEvento = horaEventoDashboard(evento);
    const horaMontagem = horaDashboard(montagemValor);
    const horaDesmontagem = horaDashboard(desmontagemValor);

    if (dataEvento === hojeISO) adicionarOperacao(hojePorEvento, evento, "evento", dataEvento, horaEvento);
    if (montagemData === hojeISO) adicionarOperacao(hojePorEvento, evento, "montagem", montagemData, horaMontagem);
    if (desmontagemData === hojeISO) adicionarOperacao(hojePorEvento, evento, "desmontagem", desmontagemData, horaDesmontagem);

    if (dataEvento && dataEvento > hojeISO) adicionarOperacao(futurosPorEvento, evento, "evento", dataEvento, horaEvento);
    if (montagemData && montagemData > hojeISO) adicionarOperacao(futurosPorEvento, evento, "montagem", montagemData, horaMontagem);
    if (desmontagemData && desmontagemData > hojeISO) adicionarOperacao(futurosPorEvento, evento, "desmontagem", desmontagemData, horaDesmontagem);

    if (!dataEvento && !montagemData && !desmontagemData) console.warn("[Dashboard] evento sem data reconhecida:", evento);
  });

  const ordenar = (a, b) => `${a.primeiraData} ${a.primeiraHora || ""}`.localeCompare(`${b.primeiraData} ${b.primeiraHora || ""}`);

  const hojeItens = [...hojePorEvento.values()].sort(ordenar);
  const futurosItens = [...futurosPorEvento.values()].sort(ordenar);

  console.log("[Dashboard] hoje:", hojeItens.length, "futuros:", futurosItens.length);

  document.getElementById("dashEventosHojeQtd").textContent = hojeItens.length;
  document.getElementById("dashEventosFuturosQtd").textContent = futurosItens.length;

  hojeBox.classList.remove("empty");
  futurosBox.classList.remove("empty");

  hojeBox.innerHTML = hojeItens.length
    ? hojeItens.slice(0, 8).map(item => cardEventoDashboardAgrupado(item.evento, item.tipos)).join("")
    : `<div class="empty">Nenhum evento hoje.</div>`;

  futurosBox.innerHTML = futurosItens.length
    ? futurosItens.slice(0, 10).map(item => cardEventoDashboardAgrupado(item.evento, item.tipos)).join("")
    : `<div class="empty">Nenhum próximo evento. Verifique no console se os eventos estão sendo carregados.</div>`;

  document.querySelectorAll("[data-dashboard-evento]").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.dashboardEvento;
      if (typeof abrirDetalheEvento === "function") abrirDetalheEvento(id);
      else alert("Abra o setor Eventos para visualizar este evento.");
    });
  });
}


// dashboard-render-fix
document.addEventListener("DOMContentLoaded", () => {
  setTimeout(renderizarDashboardEventos, 800);
  setTimeout(renderizarDashboardEventos, 1800);
  setTimeout(renderizarDashboardEventos, 3000);

  document.querySelectorAll("[data-section='dashboardSection']").forEach(btn => {
    btn.addEventListener("click", () => {
      setTimeout(renderizarDashboardEventos, 200);
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

function rtDashAbrirRotaData(data) {
  try {
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".section").forEach(s => s.classList.remove("active-section"));
    document.querySelector("[data-section='rotasSection']")?.classList.add("active");
    document.getElementById("rotasSection")?.classList.add("active-section");
    const input = document.getElementById("rotaData");
    if (input) {
      input.value = data;
      input.dispatchEvent(new Event("change", { bubbles: true }));
    }
    if (typeof renderizarRotas === "function") setTimeout(renderizarRotas, 80);
  } catch (erro) {
    console.warn("Não foi possível abrir a rota pelo Dashboard:", erro);
  }
}

function rtDashItem({ tipo = "info", titulo, meta = "", detalhe = "", data = "" }) {
  return `<div class="dash-alert-item dash-alert-${tipo}">
    <div class="dash-alert-main">
      <strong>${rtDashEscape(titulo)}</strong>
      ${meta ? `<span>${rtDashEscape(meta)}</span>` : ""}
      ${detalhe ? `<small>${rtDashEscape(detalhe)}</small>` : ""}
    </div>
    ${data ? `<button type="button" class="btn-outline dash-alert-rota-btn" data-dash-rota-data="${rtDashEscape(data)}">Rota</button>` : ""}
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
  await renderizarDashboardAlertas();
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
    if (qtdTendas >= Number(cfg.tendasEvento || 5)) alertas.push(rtDashItem({ tipo: "warning", titulo: `${nome} · ${qtdTendas} tendas`, meta: `Evento ${formatarDataDashboard(dataEvento)}`, detalhe: "Quantidade alta de tendas no mesmo evento", data: rtDashDataHoraEvento(evento, "montagem").data || dataEvento }));
    if (qtdMateriais >= Number(cfg.materiaisEvento || 50)) alertas.push(rtDashItem({ tipo: "warning", titulo: `${nome} · ${qtdMateriais} materiais`, meta: `Evento ${formatarDataDashboard(dataEvento)}`, detalhe: "Quantidade grande de material", data: rtDashDataHoraEvento(evento, "montagem").data || dataEvento }));
    if (valor >= Number(cfg.valorAlto || 1500)) alertas.push(rtDashItem({ tipo: "money", titulo: `${nome} · ${rtDashMoeda(valor)}`, meta: `Evento ${formatarDataDashboard(dataEvento)}`, detalhe: "Valor alto requer atenção", data: rtDashDataHoraEvento(evento, "montagem").data || dataEvento }));

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
        estoquePorDia.set(data, atual);
      }
      const tipoHorario = tipo === "montagem" ? (evento.montagem_tipo || evento.tipo_horario_montagem || "") : (evento.desmontagem_tipo || evento.tipo_horario_desmontagem || "");
      if (data >= hoje && rtDashOperacaoForaHorario(tipoHorario, hora)) {
        foraHorario.push(rtDashItem({ tipo: "time", titulo: `${tipo === "montagem" ? "Montagem" : "Desmontagem"} · ${nome}`, meta: `${formatarDataDashboard(data)} ${hora || ""}`, detalhe: enderecoDashboard(evento), data }));
      }
      if (data <= hoje && !rtDashOperacaoConfirmada(evento, tipo)) {
        pendentes.push(rtDashItem({ tipo: "danger", titulo: `${tipo === "montagem" ? "Entrega" : "Retirada"} não confirmada · ${nome}`, meta: `${formatarDataDashboard(data)} ${hora || ""}`, detalhe: enderecoDashboard(evento), data }));
      }
    });
  });

  [...montagensPorDia.entries()].sort().forEach(([data, qtd]) => {
    if (qtd >= Number(cfg.montagensDia || 6)) alertas.unshift(rtDashItem({ tipo: "warning", titulo: `${qtd} montagens no dia`, meta: formatarDataDashboard(data), detalhe: "Carga operacional alta", data }));
  });
  [...desmontagensPorDia.entries()].sort().forEach(([data, qtd]) => {
    if (qtd >= Number(cfg.desmontagensDia || 6)) alertas.unshift(rtDashItem({ tipo: "warning", titulo: `${qtd} desmontagens no dia`, meta: formatarDataDashboard(data), detalhe: "Carga operacional alta", data }));
  });

  const estoqueItens = [...estoquePorDia.values()]
    .filter(i => i.data >= hoje)
    .sort((a,b) => a.data.localeCompare(b.data))
    .slice(0, 21)
    .map(i => rtDashItem({ tipo: i.tendas >= Number(cfg.tendasEvento || 5) || i.materiais >= Number(cfg.materiaisEvento || 50) ? "warning" : "ok", titulo: `${formatarDataDashboard(i.data)} · ${i.eventos} evento(s)`, meta: `${i.tendas} tendas · ${i.materiais} materiais`, detalhe: "Uso previsto de estoque", data: i.data }));

  const tendasItens = tendasAlugadas
    .sort((a,b) => String(a.data).localeCompare(String(b.data)) || b.qtdTendas - a.qtdTendas)
    .slice(0, 80)
    .map(i => rtDashItem({ tipo: i.qtdTendas >= Number(cfg.tendasEvento || 5) ? "warning" : "info", titulo: `${nomeClienteDashboard(i.evento)} · ${i.qtdTendas} tendas`, meta: `Evento ${formatarDataDashboard(i.data)}`, detalhe: enderecoDashboard(i.evento), data: rtDashDataHoraEvento(i.evento, "montagem").data || i.data }));

  rtDashPreencherLista("dashboardAlertasOperacao", "dashAlertasOperacaoQtd", alertas);
  rtDashPreencherLista("dashboardPendenciasEntrega", "dashPendenciasEntregaQtd", pendentes);
  rtDashPreencherLista("dashboardForaHorario", "dashForaHorarioQtd", foraHorario);
  rtDashPreencherLista("dashboardEstoqueFuturo", "dashEstoqueFuturoQtd", estoqueItens);
  rtDashPreencherLista("dashboardTendasAlugadas", "dashTendasAlugadasQtd", tendasItens);

  document.querySelectorAll("[data-dash-rota-data]").forEach(btn => {
    btn.onclick = () => rtDashAbrirRotaData(btn.dataset.dashRotaData);
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
  await renderizarDashboardAlertas();
}

document.addEventListener("DOMContentLoaded", () => {
  setTimeout(iniciarDashboardAlertasPersonalizados, 1200);
  document.querySelectorAll("[data-section='dashboardSection']").forEach(btn => {
    btn.addEventListener("click", () => setTimeout(renderizarDashboardAlertas, 350));
  });
  window.addEventListener("riotendas:eventos-atualizados", () => setTimeout(renderizarDashboardAlertas, 300));
});
