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

  lista.className = "compact-list dash-produtos-problema-lista";
  lista.innerHTML = produtosProblema.map(p => `
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
        return lista;
      }
    }

    if (typeof carregarEventos === "function") {
      await carregarEventos();
      if (typeof eventos !== "undefined" && Array.isArray(eventos)) return eventos;
      if (Array.isArray(window.eventos)) return window.eventos;
    }

    if (typeof eventos !== "undefined" && Array.isArray(eventos)) return eventos;
    if (Array.isArray(window.eventos)) return window.eventos;
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
