

function tipoHorarioBaseRota(valor) {
  return String(valor || "A partir de").split("|")[0] || "A partir de";
}

function tipoHorarioFimRota(valor) {
  const partes = String(valor || "").split("|");
  return partes.length > 1 ? partes[1] : "";
}

function textoHorarioRota(tipoSalvo, horario, dataISO) {
  const tipo = tipoHorarioBaseRota(tipoSalvo);
  const fim = tipoHorarioFimRota(tipoSalvo);

  if (tipo === "Exatamente") return horario ? `Exatamente às ${horario}` : "Exatamente";
  if (tipo === "A partir de") return horario ? `A partir das ${horario}` : "A partir de";
  if (tipo === "Até") return horario ? `Até ${horario}` : "Até";
  if (tipo === "Intervalo") {
    if (horario && fim) return `Entre ${horario} e ${fim}`;
    if (horario) return `Intervalo a partir das ${horario}`;
    return "Intervalo";
  }
  if (tipo === "Horário comercial") return "Horário comercial";
  if (tipo === "Livre / combinar") return "Livre / combinar";
  return horario ? `${tipo} ${horario}` : tipo;
}

let rotasCarros = {};
const storageRotasCarrosKey = "novoRioTendasRotasCarrosV1";


async function carregarRotasCarrosNuvem() {
  if (typeof supabaseClient === "undefined" || !supabaseClient) return null;

  try {
    const { data, error } = await supabaseClient
      .from("app_config")
      .select("valor")
      .eq("chave", "rotas_carros")
      .maybeSingle();

    if (error) {
      console.warn("Não foi possível carregar carros das rotas na nuvem:", error);
      return null;
    }

    return data?.valor || null;
  } catch (erro) {
    console.warn("Erro ao carregar carros das rotas na nuvem:", erro);
    return null;
  }
}

async function salvarRotasCarrosNuvem() {
  if (typeof supabaseClient === "undefined" || !supabaseClient) return;

  try {
    const { error } = await supabaseClient
      .from("app_config")
      .upsert({
        chave: "rotas_carros",
        valor: rotasCarros || {},
        atualizado_em: new Date().toISOString()
      }, { onConflict: "chave" });

    if (error) console.warn("Não foi possível salvar carros das rotas na nuvem:", error);
  } catch (erro) {
    console.warn("Erro ao salvar carros das rotas na nuvem:", erro);
  }
}

async function sincronizarRotasCarrosNuvem() {
  const nuvem = await carregarRotasCarrosNuvem();

  if (nuvem && typeof nuvem === "object") {
    rotasCarros = { ...rotasCarros, ...nuvem };
    localStorage.setItem(storageRotasCarrosKey, JSON.stringify(rotasCarros));
    renderizarRotas();
    return;
  }

  await salvarRotasCarrosNuvem();
}

function carregarRotasCarrosLocal() {
  return JSON.parse(localStorage.getItem(storageRotasCarrosKey) || "{}");
}

function salvarRotasCarrosLocal() {
  localStorage.setItem(storageRotasCarrosKey, JSON.stringify(rotasCarros));
  salvarRotasCarrosNuvem();
}

async function carregarRotasOrdemNuvem() {
  if (typeof supabaseClient === "undefined" || !supabaseClient) return null;

  try {
    const { data, error } = await supabaseClient
      .from("app_config")
      .select("valor")
      .eq("chave", "rotas_ordem_manual")
      .maybeSingle();

    if (error) {
      console.warn("Não foi possível carregar ordem das rotas na nuvem:", error);
      return null;
    }

    return data?.valor || null;
  } catch (erro) {
    console.warn("Erro ao carregar ordem das rotas na nuvem:", erro);
    return null;
  }
}

async function salvarRotasOrdemNuvem() {
  if (typeof supabaseClient === "undefined" || !supabaseClient) return;

  try {
    const { error } = await supabaseClient
      .from("app_config")
      .upsert({
        chave: "rotas_ordem_manual",
        valor: rotasOrdemManual || {},
        atualizado_em: new Date().toISOString()
      }, { onConflict: "chave" });

    if (error) console.warn("Não foi possível salvar ordem das rotas na nuvem:", error);
  } catch (erro) {
    console.warn("Erro ao salvar ordem das rotas na nuvem:", erro);
  }
}

async function sincronizarRotasOrdemNuvem() {
  const nuvem = await carregarRotasOrdemNuvem();

  if (nuvem && typeof nuvem === "object") {
    rotasOrdemManual = { ...rotasOrdemManual, ...nuvem };
    localStorage.setItem("rotas_ordem_manual", JSON.stringify(rotasOrdemManual));
    renderizarRotas();
    return;
  }

  await salvarRotasOrdemNuvem();
}


function atualizarFiltroCarrosRotas() {
  const select = document.getElementById("rotaCarroFiltro");
  if (!select) return;

  const valorAtual = select.value;
  select.innerHTML = `
    <option value="">Todos</option>
    ${carrosDisponiveisRotas().map(carro => `<option value="${carro}">${carro}</option>`).join("")}
    <option value="Sem carro">Sem carro</option>
  `;
  select.value = valorAtual;
}


let ultimaSincronizacaoOrdemRotas = 0;

async function atualizarOrdemRotasDaNuvemSeNecessario() {
  const agora = Date.now();
  if (agora - ultimaSincronizacaoOrdemRotas < 15000) return;

  ultimaSincronizacaoOrdemRotas = agora;
  const nuvem = await carregarRotasOrdemNuvem();

  if (nuvem && typeof nuvem === "object") {
    const atual = JSON.stringify(rotasOrdemManual || {});
    const novo = JSON.stringify({ ...rotasOrdemManual, ...nuvem });

    if (atual !== novo) {
      rotasOrdemManual = { ...rotasOrdemManual, ...nuvem };
      localStorage.setItem("rotas_ordem_manual", JSON.stringify(rotasOrdemManual));
      renderizarRotas();
    }
  }
}

function iniciarRotas() {
  if (!document.getElementById("rotasConteudo")) return;

  rotasCarros = carregarRotasCarrosLocal();
  atualizarFiltroCarrosRotas();
  sincronizarRotasCarrosNuvem();
  sincronizarRotasOrdemNuvem();

  const hoje = new Date();
  const mesAtual = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;
  document.getElementById("rotaMes").value = mesAtual;

  ["rotaPeriodo", "rotaMes", "rotaData", "rotaTipoFiltro", "rotaCarroFiltro"].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener("input", renderizarRotas);
      el.addEventListener("change", renderizarRotas);
    }
  });

  document.getElementById("atualizarRotasBtn").addEventListener("click", async () => {
    if (typeof carregarEventos === "function") await carregarEventos();
    renderizarRotas();
  });

  setTimeout(renderizarRotas, 400);
  setTimeout(renderizarRotas, 1200);

  setInterval(() => {
    atualizarOrdemRotasDaNuvemSeNecessario();
    renderizarRotas();
  }, 30000);
}

function dataLocalISO(data) {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

function somarDiasDataISO(dias) {
  const data = new Date();
  data.setDate(data.getDate() + dias);
  return dataLocalISO(data);
}

function dataKeyDeDateTime(valor) {
  if (!valor) return "";
  return String(valor).slice(0, 10);
}

function horaDeDateTime(valor) {
  if (!valor) return "";
  const texto = String(valor);
  if (texto.includes("T")) return texto.slice(11, 16);
  return texto.slice(0, 5);
}

function formatarDataRota(dataISO) {
  if (!dataISO) return "-";
  const partes = dataISO.split("-");
  if (partes.length !== 3) return dataISO;
  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function diaSemanaRota(dataISO) {
  if (!dataISO) return "";
  const d = new Date(dataISO + "T12:00:00");
  return d.toLocaleDateString("pt-BR", { weekday: "long" });
}


function dinheiroRota(valor) {
  return Number(valor || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function statusPagamentoRota(evento) {
  return evento.pagamento_quitado ? "Quitado" : "Em aberto";
}

function classePagamentoRota(evento) {
  return evento.pagamento_quitado ? "pagamento-ok" : "pagamento-aberto";
}

function montarListaMateriais(evento) {
  const tendas = (evento.tendas || []).map(p => {
    const nome = [p.codigo, p.categoria, p.tamanho, p.cor].filter(Boolean).join(" - ");
    return nome || "Produto com código";
  });

  const apoio = (evento.itens_apoio || []).map(i => `${i.nome} (${i.quantidade})`);

  const extras = (evento.produtos_extras || []).map(i => `${i.descricao} (${i.quantidade})`);

  return [...tendas, ...apoio, ...extras];
}

function criarRotasDosEventos() {
  const listaEventos = Array.isArray(eventos) ? eventos : [];

  const rotas = [];

  listaEventos.forEach(evento => {
    if (evento.montagem) {
      rotas.push({
        id: `${evento.id}-montagem`,
        evento_id: evento.id,
        tipo: "Montagem",
        data: dataKeyDeDateTime(evento.montagem),
        horario: horaDeDateTime(evento.montagem),
        tipoHorario: evento.montagem_tipo || "A partir de",
        cliente: evento.nome || "-",
        telefone: evento.telefone || "-",
        endereco: evento.endereco || "-",
        materiais: montarListaMateriais(evento),
        evento
      });
    }

    if (evento.desmontagem) {
      rotas.push({
        id: `${evento.id}-desmontagem`,
        evento_id: evento.id,
        tipo: "Desmontagem",
        data: dataKeyDeDateTime(evento.desmontagem),
        horario: horaDeDateTime(evento.desmontagem),
        tipoHorario: evento.desmontagem_tipo || "A partir de",
        cliente: evento.nome || "-",
        telefone: evento.telefone || "-",
        endereco: evento.endereco || "-",
        materiais: montarListaMateriais(evento),
        evento
      });
    }
  });

  return rotas;
}

function filtrarRotas(rotas) {
  const periodo = document.getElementById("rotaPeriodo")?.value || "30";
  const mes = document.getElementById("rotaMes").value;
  const data = document.getElementById("rotaData").value;
  const tipo = document.getElementById("rotaTipoFiltro").value;
  const carro = document.getElementById("rotaCarroFiltro").value;

  const hoje = dataLocalISO(new Date());
  const limite7 = somarDiasDataISO(7);
  const limite15 = somarDiasDataISO(15);
  const limite30 = somarDiasDataISO(30);

  return rotas.filter(rota => {
    const carroRota = rotasCarros[rota.id] || "Sem carro";

    let passaPeriodo = true;

    if (periodo === "7") {
      passaPeriodo = rota.data >= hoje && rota.data <= limite7;
    } else if (periodo === "15") {
      passaPeriodo = rota.data >= hoje && rota.data <= limite15;
    } else if (periodo === "30") {
      passaPeriodo = rota.data >= hoje && rota.data <= limite30;
    } else if (periodo === "mes") {
      passaPeriodo = !mes || rota.data.startsWith(mes);
    } else if (periodo === "data") {
      passaPeriodo = !data || rota.data === data;
    }

    return passaPeriodo
      && (!tipo || rota.tipo === tipo)
      && (!carro || carroRota === carro);
  });
}

function agruparPorDataECarro(rotas) {
  const grupos = {};

  rotas.forEach(rota => {
    const carro = rotasCarros[rota.id] || "Sem carro";

    if (!grupos[rota.data]) grupos[rota.data] = {};
    if (!grupos[rota.data][carro]) grupos[rota.data][carro] = [];

    grupos[rota.data][carro].push(rota);
  });

  Object.values(grupos).forEach(grupoCarros => {
    Object.values(grupoCarros).forEach(lista => {
      lista.sort((a, b) => String(a.horario || "").localeCompare(String(b.horario || "")));
    });
  });

  return grupos;
}

function renderizarRotas() {
  const container = document.getElementById("rotasConteudo");
  if (!container) return;

  const todas = criarRotasDosEventos();
  const filtradas = filtrarRotas(todas);

  document.getElementById("rotasTotal").textContent = filtradas.length;
  document.getElementById("rotasMontagens").textContent = filtradas.filter(r => r.tipo === "Montagem").length;
  document.getElementById("rotasDesmontagens").textContent = filtradas.filter(r => r.tipo === "Desmontagem").length;

  if (!filtradas.length) {
    container.innerHTML = `<p class="empty">Nenhuma montagem ou desmontagem encontrada para o filtro selecionado.</p>`;
    return;
  }

  const grupos = agruparPorDataECarro(filtradas);
  const datas = Object.keys(grupos).sort();

  container.innerHTML = datas.map(data => {
    const carros = Object.keys(grupos[data]).sort((a, b) => ordemCarro(a) - ordemCarro(b));

    return `
      <div class="rota-dia">
        <div class="rota-dia-header">
          <h3>${formatarDataRota(data)} <span>${diaSemanaRota(data)}</span></h3>
          <button type="button" class="btn-outline rota-print-btn" data-print-date="${data}">Gerar PDF/Imprimir</button>
        </div>

        ${carros.map(carro => {
          inicializarOrdemManualRotas(grupos[data][carro]);

          const rotasOrdenadas = ordenarRotasPorOrdemManual(grupos[data][carro]);

          return `
          <div class="rota-carro">
            <div class="rota-carro-header">
              <h4>${carro}</h4>
              <div class="rota-carro-materiais">
                ${listaMateriaisRotas(rotasOrdenadas).map(item => `<span>${item}</span>`).join("")}
              </div>
            </div>
            <div class="rota-lista">
              ${rotasOrdenadas.map((rota, idx) => renderizarCardRota(rota, idx, rotasOrdenadas.length)).join("")}
            </div>
          </div>
        `;
        }).join("")}
      </div>
    `;
  }).join("");


  container.querySelectorAll("button[data-rota-move]").forEach(btn => {
    btn.addEventListener("click", () => {
      const data = btn.dataset.rotaData;
      const carro = btn.dataset.rotaCarroGrupo;

      const todas = criarRotasDosEventos();
      const grupos = agruparPorDataECarro(todas);

      const lista = (grupos[data] && grupos[data][carro])
        ? ordenarRotasPorOrdemManual(grupos[data][carro])
        : [];

      moverOrdemRota(btn.dataset.rotaMove, btn.dataset.direction, lista);
      renderizarRotas();
    });
  });


  container.querySelectorAll("button[data-rota-edit-evento]").forEach(btn => {
    btn.addEventListener("click", () => {
      const eventoId = btn.dataset.rotaEditEvento;
      if (!eventoId) return;

      if (typeof abrirEditarEvento === "function") {
        abrirEditarEvento(eventoId);
      } else {
        alert("Abra o setor de Eventos para editar este evento.");
      }
    });
  });

  container.querySelectorAll("select[data-rota-carro]").forEach(select => {
    select.addEventListener("change", () => {
      rotasCarros[select.dataset.rotaCarro] = select.value || "Sem carro";
      salvarRotasCarrosLocal();
      renderizarRotas();
    });
  });

  container.querySelectorAll("[data-print-date]").forEach(btn => {
    btn.addEventListener("click", () => imprimirRotaData(btn.dataset.printDate));
  });
}



function rotaEhDesmontagem(rota) {
  const tipo = String(rota?.tipo || "").toLowerCase();
  return tipo.includes("desmont") || tipo.includes("retirada");
}

function listaMateriaisRotas(listaRotas = []) {
  const materiais = [];

  listaRotas.forEach(rota => {
    // No resumo ao lado do carro, listar somente materiais que serão levados
    // para montagem/entrega. Desmontagens/retiradas não entram nessa soma.
    if (rotaEhDesmontagem(rota)) return;

    if (Array.isArray(rota.materiais)) {
      rota.materiais.forEach(item => materiais.push(item));
    }
  });

  return materiais;
}

function totalMateriaisRotas(listaRotas = []) {
  return listaRotas.reduce((total, rota) => {
    if (rotaEhDesmontagem(rota)) return total;
    return total + (Array.isArray(rota.materiais) ? rota.materiais.length : 0);
  }, 0);
}

function carrosDisponiveisRotas() {
  const config = window.configRioTendas || {};
  return Array.isArray(config.carros) && config.carros.length
    ? config.carros
    : ["Saveiro", "Dupla", "Caminhão"];
}

function ordemCarro(carro) {
  if (carro === "Sem carro") return 999;

  const carros = carrosDisponiveisRotas();
  const index = carros.indexOf(carro);

  return index >= 0 ? index + 1 : 99;
}


function tipoHorarioFlexivelRota(rota) {
  const tipo = String(rota?.tipoHorario || "").toLowerCase();

  return (
    tipo.includes("horário comercial") ||
    tipo.includes("horario comercial") ||
    tipo.includes("livre") ||
    tipo.includes("combinar")
  );
}

function minutosRota(horario) {
  if (!horario) return null;

  const partes = String(horario).slice(0, 5).split(":");
  if (partes.length < 2) return null;

  const h = Number(partes[0]);
  const m = Number(partes[1]);

  if (Number.isNaN(h) || Number.isNaN(m)) return null;

  return h * 60 + m;
}

function intervaloConflitoRota(rota) {
  if (!rota || tipoHorarioFlexivelRota(rota)) return null;

  const tipo = String(rota.tipoHorario || "").toLowerCase();
  const inicio = minutosRota(rota.horario);

  if (inicio === null) return null;

  // Intervalo salvo como "Intervalo|22:00" ou similar
  if (tipo.includes("intervalo")) {
    const fimTexto = String(rota.tipoHorario || "").split("|")[1] || "";
    const fim = minutosRota(fimTexto);

    if (fim !== null) {
      return {
        inicio: Math.min(inicio, fim),
        fim: Math.max(inicio, fim)
      };
    }

    // Se não tiver final, trata como uma janela curta de atenção
    return { inicio, fim: inicio + 30 };
  }

  // Horário exato: janela pequena para detectar choque real
  if (tipo.includes("exato") || tipo.includes("exatamente")) {
    return { inicio, fim: inicio + 30 };
  }

  // "A partir de" e "Até" são flexíveis, então não geram conflito duro.
  // Mantemos fora do conflito automático para evitar falso positivo.
  if (tipo.includes("a partir") || tipo.includes("até")) {
    return null;
  }

  // Se houver horário mas tipo indefinido, usa janela curta conservadora
  return { inicio, fim: inicio + 30 };
}

function intervalosSobrepoemRota(a, b) {
  if (!a || !b) return false;
  return a.inicio < b.fim && b.inicio < a.fim;
}

function rotasComConflito(rotas) {
  const mapa = {};

  rotas.forEach(rota => {
    const carro = rotasCarros[rota.id] || "Sem carro";
    if (carro === "Sem carro") return;

    const intervalo = intervaloConflitoRota(rota);
    if (!intervalo) return;

    const chave = `${rota.data}|${carro}`;
    if (!mapa[chave]) mapa[chave] = [];

    mapa[chave].push({
      id: rota.id,
      intervalo
    });
  });

  const conflitos = new Set();

  Object.values(mapa).forEach(lista => {
    for (let i = 0; i < lista.length; i++) {
      for (let j = i + 1; j < lista.length; j++) {
        if (intervalosSobrepoemRota(lista[i].intervalo, lista[j].intervalo)) {
          conflitos.add(lista[i].id);
          conflitos.add(lista[j].id);
        }
      }
    }
  });

  return conflitos;
}

function rotaTemConflito(rota) {
  const todas = filtrarRotas(criarRotasDosEventos());
  return rotasComConflito(todas).has(rota.id);
}


async function atualizarHorarioRotaEvento(rotaId, novoValor) {
  const rota = criarRotasDosEventos().find(r => r.id === rotaId);
  if (!rota || !rota.evento) return;

  const evento = eventos.find(e => String(e.id) === String(rota.evento_id));
  if (!evento) return;

  if (rota.tipo === "Montagem") {
    evento.montagem = novoValor || null;
  } else {
    evento.desmontagem = novoValor || null;
  }

  evento.atualizado_em = new Date().toISOString();

  if (typeof salvarEventoBanco === "function") {
    const salvo = await salvarEventoBanco(evento);
    if (salvo) {
      const index = eventos.findIndex(e => String(e.id) === String(evento.id));
      if (index >= 0) eventos[index] = salvo;
    }
  } else {
    const index = eventos.findIndex(e => String(e.id) === String(evento.id));
    if (index >= 0) eventos[index] = evento;
  }

  renderizarRotas();
}

function valorDatetimeLocal(valor) {
  if (!valor) return "";
  return String(valor).slice(0, 16);
}

function renderizarCardRota(rota, index = 0, total = 0) {
  const carroAtual = rotasCarros[rota.id] || "Sem carro";
  const materiais = rota.materiais && rota.materiais.length ? rota.materiais : ["Sem materiais informados"];
  const conflito = rotaTemConflito(rota);
  const evento = rota.evento || {};

  return `
    <div class="rota-card tipo-${rota.tipo.toLowerCase()} ${conflito ? "rota-conflito" : ""}">
      <div class="rota-tipo-vertical tipo-${rota.tipo.toLowerCase()}">
        <span>${rota.tipo}</span>
      </div>

      <div class="rota-card-conteudo">
        <div class="rota-card-top rota-card-top-refinado">
          <div class="rota-identificacao">
            ${conflito ? '<b class="rota-alerta">Conflito</b>' : ''}
          </div>


      </div>

      <div class="rota-grid-info">
        <div class="rota-col rota-evento-data">
          <span>Data do evento</span>
          <strong>${dataHoraEventoPrintCurta(evento, rota)}</strong>
        </div>
        <div class="rota-col rota-operacao-data">
          <span>${rota.tipo}</span>
          <strong>${textoHorarioRota(rota.tipoHorario, rota.horario, rota.data)}</strong>
        </div>
        <div class="rota-col">
          <span>Cliente</span>
          <strong>${rota.cliente}</strong>
        </div>
        <div class="rota-col">
          <span>Telefone</span>
          <strong>${rota.telefone}</strong>
        </div>
        <div class="rota-col rota-endereco">
          <span>Endereço</span>
          <strong>${rota.endereco}</strong>
        </div>
        <div class="rota-col">
          <span>Total</span>
          <strong>${dinheiroRota(evento.valor_total)}</strong>
        </div>
        <div class="rota-col">
          <span>Sinal</span>
          <strong>${dinheiroRota(evento.valor_sinal)}</strong>
        </div>
        <div class="rota-col">
          <span>Restante</span>
          <strong>${dinheiroRota(evento.valor_restante)}</strong>
        </div>
        <div class="rota-col">
          <span>Pagamento</span>
          <strong class="${classePagamentoRota(evento)}">${statusPagamentoRota(evento)}</strong>
        </div>
        <div class="rota-col rota-forma-pagamento">
          <span>Forma pagamento</span>
          <strong>${evento.forma_pagamento || "-"}</strong>
        </div>
      </div>

      <div class="rota-materiais rota-materiais-com-controles">
        <div class="rota-materiais-lista">
          <strong>Materiais:</strong>
          <div>
            ${materiais.map(item => `<span>${item}</span>`).join("")}
          </div>
        </div>

        <div class="rota-controles-baixo">
          <div class="rota-controles-linha rota-controles-linha-baixo">
            <label class="rota-carro-inline">Carro
              <select data-rota-carro="${rota.id}">
                <option value="Sem carro" ${carroAtual === "Sem carro" ? "selected" : ""}>Sem carro</option>
                ${carrosDisponiveisRotas().map(carro => `<option value="${carro}" ${carroAtual === carro ? "selected" : ""}>${carro}</option>`).join("")}
              </select>
            </label>

            <button type="button" class="btn-outline rota-edit-event-btn" data-rota-edit-evento="${evento.id || rota.evento_id || ""}">
              Editar
            </button>

            <div class="rota-ordem-controls">
              <button type="button" class="rota-order-btn" title="Subir" data-rota-move="${rota.id}" data-direction="up" data-rota-data="${rota.data}" data-rota-carro-grupo="${carroAtual}" ${index === 0 ? "disabled" : ""}>↑</button>
              <button type="button" class="rota-order-btn" title="Descer" data-rota-move="${rota.id}" data-direction="down" data-rota-data="${rota.data}" data-rota-carro-grupo="${carroAtual}" ${index >= total - 1 ? "disabled" : ""}>↓</button>
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  `;
}


function dataEventoPrintCurta(valor) {
  if (!valor) return "-";
  const texto = String(valor).slice(0, 10);
  const partes = texto.split("-");
  if (partes.length !== 3) return texto;
  return `${partes[2]}/${partes[1]}/${partes[0].slice(-2)}`;
}

function horaPrintCurta(valor) {
  if (!valor) return "";
  return String(valor).slice(0, 5);
}

function dataHoraEventoPrintCurta(evento, rota) {
  const data = dataEventoPrintCurta(evento.data_evento || rota.data);
  const inicio = horaPrintCurta(evento.hora_inicio || evento.hora_evento || "");
  const fim = horaPrintCurta(evento.hora_termino || "");

  if (inicio && fim) return `${data} ${inicio}-${fim}`;
  if (inicio) return `${data} ${inicio}`;
  return data;
}

function imprimirRotaData(data) {
  const todas = criarRotasDosEventos();
  const rotasData = todas.filter(r => r.data === data);

  if (!rotasData.length) {
    alert("Nenhuma rota encontrada para esta data.");
    return;
  }

  const grupos = agruparPorDataECarro(rotasData);
  const carros = Object.keys(grupos[data] || {}).sort((a, b) => ordemCarro(a) - ordemCarro(b));

  const html = `
    <html>
      <head>
        <title>Rota ${formatarDataRota(data)}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            font-size: 9px;
            padding: 8px;
            color: #1d2b3a;
          }

          .topo {
            display:flex;
            align-items:center;
            gap:12px;
            margin-bottom:4px;
          }

          .topo img {
            height:36px;
          }

          h1 {
            margin:0;
            font-size:18px;
          }

          .subtitulo {
            margin-top:2px;
            color:#556677;
          }

          h2 {
            margin-top:10px;
            border-bottom:1px solid #d6e0ea;
            padding-bottom:4px;
            color:#0f3d66;
          }

          .carro-total {
            display:inline-block;
            margin-left:8px;
            padding:2px 7px;
            border-radius:999px;
            background:#eef4ff;
            color:#1d5fd1;
            font-size:8px;
            vertical-align:middle;
          }

          .carro-materiais {
            display:flex;
            flex-wrap:wrap;
            gap:4px;
            margin:4px 0 8px;
          }

          .carro-materiais span {
            background:#f3f7fb;
            border:1px solid #dce6f0;
            color:#27445f;
            border-radius:999px;
            padding:1px 4px;
            font-size:7px;
          }

          .card {
            border:1px solid #dce5ee;
            border-left:4px solid #2b7cff;
            border-radius:7px;
            padding:6px;
            margin-bottom:6px;
            background:#fbfdff;
          }

          .desmontagem {
            border-left-color:#d97000;
          }

          .titulo {
            display:flex;
            justify-content:space-between;
            margin-bottom:4px;
          }

          .titulo strong {
            font-size:12px;
          }

          .grid {
            display:grid;
            grid-template-columns: 0.9fr 0.85fr 1fr 1.0fr 1.95fr 0.5fr 0.5fr 0.55fr 0.7fr 0.85fr;
            gap:4px;
            margin-top:4px;
          }

          .col {
            border:1px solid #e2eaf2;
            border-radius:6px;
            padding:3px 4px;
            background:#fff;
          }

          .col span {
            display:block;
            font-size:7px;
            color:#667788;
            font-weight:bold;
            text-transform:uppercase;
            margin-bottom:2px;
          }

          .col strong {
            display:block;
            font-size:8px;
            line-height:1.05;
            word-break:break-word;
          }

          .materiais {
            margin-top:4px;
          }

          .materiais-tags {
            display:flex;
            flex-wrap:wrap;
            gap:4px;
            margin-top:4px;
          }

          .materiais-tags span {
            background:#eef4ff;
            color:#1d5fd1;
            border-radius:999px;
            padding:1px 4px;
            font-size:7px;
          }

          .quitado {
            color:#0a7d00;
          }

          .aberto {
            color:#b00020;
          }

          @page {
            size: landscape;
            margin: 6mm;
          }
        

          /* Ajuste final: PDF/Imprimir com 10 campos na mesma linha */
          .grid {
            grid-template-columns: 0.9fr 0.85fr 1fr 1.0fr 1.95fr 0.5fr 0.5fr 0.55fr 0.7fr 0.85fr !important;
            gap:4px !important;
          }

          .col {
            min-width:0 !important;
            overflow:hidden !important;
          }

          .col span {
            font-size:10px !important;
            line-height:1 !important;
          }

          .col strong {
            font-size:10px !important;
            line-height:1.05 !important;
          }

          .card {
            page-break-inside: avoid;
            break-inside: avoid;
          }

          @page {
            size: A4 landscape;
            margin: 6mm;
          }

        

/* Refino final PDF: fonte maior, endereço maior, valores menores */
.grid {
  grid-template-columns: 0.9fr 0.85fr 1fr 1.0fr 1.95fr 0.5fr 0.5fr 0.55fr 0.7fr 0.85fr !important;
}

.col span {
  font-size: 9px !important;
}

.col strong {
  font-size: 10px !important;
  line-height: 1.08 !important;
}

/* valores: total, sinal e restante */
.grid .col:nth-child(6) strong,
.grid .col:nth-child(7) strong,
.grid .col:nth-child(8) strong {
  font-size: 9px !important;
  white-space: nowrap !important;
}

/* endereço */
.grid .col:nth-child(5) strong {
  font-size: 10px !important;
  line-height: 1.08 !important;
}

</style>
      </head>
      <body>
        <div class="topo">
          <img src="https://riotendas.smartwebinfo.com.br/webapp/public/img/logo.png">
          <div>
            <h1>Rota ${formatarDataRota(data)} - ${diaSemanaRota(data)}</h1>
            <div class="subtitulo">Novo RioTendas — Operacional de montagem e desmontagem</div>
          </div>
        </div>

        ${carros.map(carro => `
          <h2>${carro}</h2>
          <div class="carro-materiais">
            ${listaMateriaisRotas(grupos[data][carro] || []).map(item => `<span>${item}</span>`).join("")}
          </div>

          ${(grupos[data][carro] || []).map(rota => {
            const evento = rota.evento || {};
            return `
              <div class="card ${rota.tipo === "Desmontagem" ? "desmontagem" : ""}">
                <div class="titulo">
                  <strong>${rota.tipo}</strong>
                  <span>${textoHorarioRota(rota.tipoHorario, rota.horario, rota.data)}</span>
                </div>

                <div class="grid">
                  <div class="col">
                    <span>Evento</span>
                    <strong>${dataHoraEventoPrintCurta(evento, rota)}</strong>
                  </div>

                  <div class="col">
                    <span>${rota.tipo}</span>
                    <strong>${textoHorarioRota(rota.tipoHorario, rota.horario, rota.data)}</strong>
                  </div>

                  <div class="col">
                    <span>Cliente</span>
                    <strong>${rota.cliente}</strong>
                  </div>

                  <div class="col">
                    <span>Telefone</span>
                    <strong>${rota.telefone}</strong>
                  </div>

                  <div class="col">
                    <span>Endereço</span>
                    <strong>${rota.endereco}</strong>
                  </div>

                  <div class="col">
                    <span>Total</span>
                    <strong>${dinheiroRota(evento.valor_total)}</strong>
                  </div>

                  <div class="col">
                    <span>Sinal</span>
                    <strong>${dinheiroRota(evento.valor_sinal)}</strong>
                  </div>

                  <div class="col">
                    <span>Restante</span>
                    <strong>${dinheiroRota(evento.valor_restante)}</strong>
                  </div>

                  <div class="col">
                    <span>Pagamento</span>
                    <strong class="${classePagamentoRota(evento)}">${statusPagamentoRota(evento)}</strong>
                  </div>

                  <div class="col">
                    <span>Forma</span>
                    <strong>${evento.forma_pagamento || "-"}</strong>
                  </div>
                </div>

                <div class="materiais">
                  <strong>Materiais:</strong>

                  <div class="materiais-tags">
                    ${(rota.materiais || []).map(m => `<span>${m}</span>`).join("")}
                  </div>
                </div>
              </div>
            `;
          }).join("")}
        `).join("")}
      </body>
    </html>
  `;

  const janela = window.open("", "_blank");
  janela.document.write(html);
  janela.document.close();
  janela.focus();
  janela.print();
}

document.addEventListener("DOMContentLoaded", iniciarRotas);
let rotasOrdemManual = JSON.parse(localStorage.getItem("rotas_ordem_manual") || "{}");

function salvarRotasOrdemManual() {
  localStorage.setItem("rotas_ordem_manual", JSON.stringify(rotasOrdemManual));
  salvarRotasOrdemNuvem();
}

function ordemManualRota(rota) {
  const valor = Number(rotasOrdemManual[String(rota.id)]);
  return Number.isFinite(valor) ? valor : 999999;
}

function ordenarRotasPorOrdemManual(listaRotas) {
  return [...listaRotas].sort((a, b) => {
    const ordemA = ordemManualRota(a);
    const ordemB = ordemManualRota(b);

    if (ordemA !== ordemB) return ordemA - ordemB;

    const horaA = String(a.horario || "");
    const horaB = String(b.horario || "");
    if (horaA !== horaB) return horaA.localeCompare(horaB);

    return String(a.id).localeCompare(String(b.id));
  });
}

function inicializarOrdemManualRotas(listaRotas) {
  const ordenada = ordenarRotasPorOrdemManual(listaRotas);

  ordenada.forEach((rota, index) => {
    const id = String(rota.id);

    if (!Number.isFinite(Number(rotasOrdemManual[id]))) {
      rotasOrdemManual[id] = index + 1;
    }
  });

  // Normaliza a ordem do grupo atual para evitar empates/ordens duplicadas.
  const normalizada = ordenarRotasPorOrdemManual(listaRotas);
  normalizada.forEach((rota, index) => {
    rotasOrdemManual[String(rota.id)] = index + 1;
  });

  salvarRotasOrdemManual();
}

function moverOrdemRota(rotaId, direcao, listaRotas) {
  const ordenada = ordenarRotasPorOrdemManual(listaRotas);
  const idProcurado = String(rotaId);

  // Corrige o bug principal: rotaId vem do HTML como texto.
  const atualIndex = ordenada.findIndex(r => String(r.id) === idProcurado);
  if (atualIndex === -1) return;

  const novoIndex = direcao === "up" ? atualIndex - 1 : atualIndex + 1;
  if (novoIndex < 0 || novoIndex >= ordenada.length) return;

  const temp = ordenada[atualIndex];
  ordenada[atualIndex] = ordenada[novoIndex];
  ordenada[novoIndex] = temp;

  // Regrava a ordem completa do grupo, sem depender de troca de valores antigos.
  ordenada.forEach((rota, index) => {
    rotasOrdemManual[String(rota.id)] = index + 1;
  });

  salvarRotasOrdemManual();
}
