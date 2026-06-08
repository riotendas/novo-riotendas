
let calendarioDataAtual = new Date();
let calendarioDataSelecionada = null;
let calendarioModoVisual = "mes";

function calendarioISODate(date) {
  const d = new Date(date);
  d.setHours(12, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

function calendarioDataBR(dataISO) {
  if (!dataISO) return "-";
  const [ano, mes, dia] = String(dataISO).slice(0, 10).split("-");
  if (!ano || !mes || !dia) return dataISO;
  return `${dia}/${mes}/${ano}`;
}

function calendarioTipoHorarioTexto(tipoHorario) {
  const texto = String(tipoHorario || "").trim().toLowerCase();
  if (!texto) return "";
  if (texto.includes("livre")) return "Livre";
  if (texto.includes("comercial")) return "Comercial";
  return "";
}

function calendarioHoraLimpa(valor) {
  const texto = String(valor || "").trim();
  if (!texto) return "";
  let hora = "";
  if (texto.includes("T")) hora = texto.slice(11, 16);
  else if (/^\d{1,2}:\d{2}/.test(texto)) hora = texto.slice(0, 5).padStart(5, "0");
  if (!hora || hora === "00:00" || hora === "--:--") return "";
  return hora;
}

function calendarioHoraDeDatetime(valor, evento = null, tipo = "") {
  // v19-dev: no calendário, cada card mostra o horário/tipo da própria operação:
  // montagem usa montagem, desmontagem usa desmontagem e evento usa o horário do evento.
  const tipoHorario = tipo === "montagem"
    ? (evento?.montagem_tipo || evento?.tipo_montagem)
    : tipo === "desmontagem"
      ? (evento?.desmontagem_tipo || evento?.tipo_desmontagem)
      : "";

  const textoTipo = calendarioTipoHorarioTexto(tipoHorario);
  if (textoTipo) return textoTipo;

  let hora = calendarioHoraLimpa(valor);

  if (!hora && evento) {
    if (tipo === "montagem") {
      hora = calendarioHoraLimpa(evento.hora_montagem || evento.montagem_hora || evento.hora_inicio || evento.hora_evento);
    } else if (tipo === "desmontagem") {
      hora = calendarioHoraLimpa(evento.hora_desmontagem || evento.desmontagem_hora || evento.hora_termino);
    } else {
      hora = calendarioHoraLimpa(evento.hora_inicio || evento.hora_evento || evento.inicio);
    }
  }

  return hora;
}

function calendarioHoraExibicao(item) {
  if (item?.hora) return item.hora;
  return "Sem horário";
}

function calendarioMesAnoTexto(data) {
  return data.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}

function calendarioInicioSemana(data) {
  const d = new Date(data);
  d.setHours(12, 0, 0, 0);
  // Semana padrão: segunda-feira até domingo.
  // getDay(): domingo=0, segunda=1, terça=2...
  const deslocamento = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - deslocamento);
  return d;
}

function calendarioIntervaloSemanaTexto(inicio) {
  const fim = new Date(inicio);
  fim.setDate(inicio.getDate() + 6);
  const ini = inicio.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  const fimTxt = fim.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  return `${ini} a ${fimTxt}`;
}

function calendarioResumoItens(itens) {
  return `${itens.filter(i => i.tipo === "evento").length} eventos • ${itens.filter(i => i.tipo === "montagem").length} montagens • ${itens.filter(i => i.tipo === "desmontagem").length} desmontagens • ${itens.filter(i => i.tipo === "atendimento").length} atendimentos`;
}

function calendarioAtualizarBotoesModo() {
  document.getElementById("calendarioModoMesBtn")?.classList.toggle("active", calendarioModoVisual === "mes");
  document.getElementById("calendarioModoSemanaBtn")?.classList.toggle("active", calendarioModoVisual === "semana");
}


function calendarioEventosBase() {
  if (typeof eventos !== "undefined" && Array.isArray(eventos)) return eventos;
  if (Array.isArray(window.eventos)) return window.eventos;
  return [];
}

async function garantirEventosCalendario() {
  try {
    if (calendarioEventosBase().length) return;

    if (typeof carregarEventos === "function") {
      await carregarEventos();
      return;
    }

    if (typeof buscarEventosBanco === "function") {
      window.eventos = await buscarEventosBanco();
    }
  } catch (erro) {
    console.warn("Não foi possível carregar eventos para o calendário:", erro);
  }
}

function calendarioItensEvento(evento) {
  const itens = [];

  if (evento.data_evento) {
    itens.push({
      id: `${evento.id}-evento`,
      eventoId: evento.id,
      tipo: "evento",
      data: evento.data_evento,
      hora: calendarioHoraDeDatetime(evento.data_evento || evento.inicio || "", evento, "evento"),
      titulo: evento.nome || "Evento",
      evento
    });
  }

  if (evento.montagem) {
    itens.push({
      id: `${evento.id}-montagem`,
      eventoId: evento.id,
      tipo: "montagem",
      data: String(evento.montagem).slice(0, 10),
      hora: calendarioHoraDeDatetime(evento.montagem, evento, "montagem"),
      titulo: evento.nome || "Montagem",
      evento
    });
  }

  if (evento.desmontagem) {
    itens.push({
      id: `${evento.id}-desmontagem`,
      eventoId: evento.id,
      tipo: "desmontagem",
      data: String(evento.desmontagem).slice(0, 10),
      hora: calendarioHoraDeDatetime(evento.desmontagem, evento, "desmontagem"),
      titulo: evento.nome || "Desmontagem",
      evento
    });
  }

  const atendimentos = typeof rtAtendimentosExtrasRecorrente === "function" ? rtAtendimentosExtrasRecorrente(evento) : [];
  atendimentos.forEach(item => {
    const dh = typeof rtDataHoraAtendimentoExtra === "function" ? rtDataHoraAtendimentoExtra(item) : { data: item.data, hora: item.hora };
    if (!dh.data) return;
    itens.push({
      id: `${evento.id}-atendimento-${item.id || dh.data}`,
      eventoId: evento.id,
      tipo: "atendimento",
      data: dh.data,
      hora: dh.hora || "",
      titulo: `${item.tipo || "Atendimento extra"} — ${evento.nome || "Evento"}`,
      evento,
      atendimentoExtra: item
    });
  });

  return itens;
}

function calendarioTodosItens() {
  const tipo = document.getElementById("calendarioFiltroTipo")?.value || "";
  const pagamento = document.getElementById("calendarioFiltroPagamento")?.value || "";
  const cliente = (document.getElementById("calendarioFiltroCliente")?.value || "").trim().toLowerCase();

  return calendarioEventosBase()
    .flatMap(calendarioItensEvento)
    .filter(item => {
      const evento = item.evento;
      const clienteOk = !cliente || String(evento.nome || "").toLowerCase().includes(cliente);
      const tipoOk = !tipo || item.tipo === tipo || (item.tipo === "atendimento" && (tipo === "montagem" || tipo === "desmontagem" || tipo === "montagem_desmontagem")) || (tipo === "montagem_desmontagem" && (item.tipo === "montagem" || item.tipo === "desmontagem"));
      const pagamentoOk = !pagamento || (pagamento === "quitado" ? evento.pagamento_quitado : !evento.pagamento_quitado);
      return clienteOk && tipoOk && pagamentoOk;
    });
}

function calendarioClasseItem(item) {
  const pagamento = item.evento?.pagamento_quitado ? "cal-pago" : "cal-aberto";
  return `cal-item cal-${item.tipo} ${pagamento}`;
}

function calendarioLabelTipo(tipo) {
  if (tipo === "montagem") return "Mont.";
  if (tipo === "desmontagem") return "Desm.";
  if (tipo === "atendimento") return "Atend.";
  return "Evento";
}

function renderizarCalendario() {
  const grid = document.getElementById("calendarioGrid");
  if (!grid) return;
  calendarioAtualizarBotoesModo();
  if (calendarioModoVisual === "semana") {
    renderizarCalendarioSemana();
    return;
  }

  const ano = calendarioDataAtual.getFullYear();
  const mes = calendarioDataAtual.getMonth();

  const primeiro = new Date(ano, mes, 1);
  const ultimo = new Date(ano, mes + 1, 0);
  const inicioGrade = new Date(primeiro);
  // Grade mensal começa na segunda-feira e termina no domingo.
  const deslocamentoInicioMes = (primeiro.getDay() + 6) % 7;
  inicioGrade.setDate(primeiro.getDate() - deslocamentoInicioMes);

  const itens = calendarioTodosItens();
  const hojeISO = calendarioISODate(new Date());

  document.getElementById("calendarioTituloMes").textContent = calendarioMesAnoTexto(calendarioDataAtual);
  const itensMes = itens.filter(i => {
    const d = new Date(`${i.data}T12:00:00`);
    return d.getFullYear() === ano && d.getMonth() === mes;
  });
  document.getElementById("calendarioResumoMes").textContent = calendarioResumoItens(itensMes);

  const dias = [];

  for (let i = 0; i < 42; i++) {
    const data = new Date(inicioGrade);
    data.setDate(inicioGrade.getDate() + i);
    const iso = calendarioISODate(data);
    const foraMes = data.getMonth() !== mes;
    const selecionado = calendarioDataSelecionada === iso;
    const itensDia = itens.filter(item => item.data === iso);

    dias.push(`
      <button type="button" class="calendar-day ${foraMes ? "outside" : ""} ${iso === hojeISO ? "today" : ""} ${selecionado ? "selected" : ""}" data-cal-dia="${iso}">
        <div class="calendar-day-number">${data.getDate()}</div>
        <div class="calendar-day-items">
          ${itensDia.slice(0, 4).map(item => `
            <span class="${calendarioClasseItem(item)}" title="${calendarioLabelTipo(item.tipo)} — ${item.titulo}">
              ${item.hora ? item.hora + " • " : ""}${calendarioLabelTipo(item.tipo)} ${item.titulo}
            </span>
          `).join("")}
          ${itensDia.length > 4 ? `<span class="cal-more">+${itensDia.length - 4}</span>` : ""}
        </div>
      </button>
    `);
  }

  grid.classList.remove("calendar-grid-week");
  grid.innerHTML = dias.join("");

  grid.querySelectorAll("[data-cal-dia]").forEach(btn => {
    btn.addEventListener("click", () => {
      calendarioDataSelecionada = btn.dataset.calDia;
      renderizarCalendario();
      renderizarPainelDiaCalendario();
    });
  });

  if (!calendarioDataSelecionada) {
    calendarioDataSelecionada = hojeISO;
  }

  renderizarPainelDiaCalendario();
}


function renderizarCalendarioSemana() {
  const grid = document.getElementById("calendarioGrid");
  if (!grid) return;

  const inicioSemana = calendarioInicioSemana(calendarioDataAtual);
  const itens = calendarioTodosItens();
  const hojeISO = calendarioISODate(new Date());
  const dias = [];
  const itensSemana = [];

  for (let i = 0; i < 7; i++) {
    const data = new Date(inicioSemana);
    data.setDate(inicioSemana.getDate() + i);
    const iso = calendarioISODate(data);
    const selecionado = calendarioDataSelecionada === iso;
    const itensDia = itens
      .filter(item => item.data === iso)
      .sort(rtCalCompararPainelDia);

    itensSemana.push(...itensDia);

    dias.push(`
      <button type="button" class="calendar-day calendar-week-day ${iso === hojeISO ? "today" : ""} ${selecionado ? "selected" : ""}" data-cal-dia="${iso}">
        <div class="calendar-day-number">${data.getDate()} <small>${data.toLocaleDateString("pt-BR", { weekday: "short" })}</small></div>
        <div class="calendar-day-items">
          ${itensDia.slice(0, 8).map(item => `
            <span class="${calendarioClasseItem(item)}" title="${calendarioLabelTipo(item.tipo)} — ${item.titulo}">
              ${item.hora ? item.hora + " • " : ""}${calendarioLabelTipo(item.tipo)} ${item.titulo}
            </span>
          `).join("")}
          ${itensDia.length > 8 ? `<span class="cal-more">+${itensDia.length - 8}</span>` : ""}
        </div>
      </button>
    `);
  }

  document.getElementById("calendarioTituloMes").textContent = `Semana: ${calendarioIntervaloSemanaTexto(inicioSemana)}`;
  document.getElementById("calendarioResumoMes").textContent = calendarioResumoItens(itensSemana);

  grid.classList.add("calendar-grid-week");
  grid.innerHTML = dias.join("");

  grid.querySelectorAll("[data-cal-dia]").forEach(btn => {
    btn.addEventListener("click", () => {
      calendarioDataSelecionada = btn.dataset.calDia;
      calendarioDataAtual = new Date(`${calendarioDataSelecionada}T12:00:00`);
      renderizarCalendario();
      renderizarPainelDiaCalendario();
    });
  });

  if (!calendarioDataSelecionada) {
    calendarioDataSelecionada = hojeISO;
  }

  renderizarPainelDiaCalendario();
}


// v19-dev: carro e ordem das rotas no painel do dia do calendário
function rtCalCarrosRotas() {
  try {
    if (typeof rotasCarros !== "undefined" && rotasCarros && Object.keys(rotasCarros).length) return rotasCarros;
  } catch {}

  try {
    return JSON.parse(localStorage.getItem("novoRioTendasRotasCarrosV1") || "{}");
  } catch {
    return {};
  }
}

function rtCalOrdemRotas() {
  try {
    if (typeof rotasOrdemManual !== "undefined" && rotasOrdemManual && Object.keys(rotasOrdemManual).length) return rotasOrdemManual;
  } catch {}

  try {
    return JSON.parse(localStorage.getItem("rotas_ordem_manual") || "{}");
  } catch {
    return {};
  }
}

function rtCalRotaId(item) {
  if (!item || !item.eventoId) return "";
  if (item.tipo === "montagem") return `${item.eventoId}-montagem`;
  if (item.tipo === "desmontagem") return `${item.eventoId}-desmontagem`;
  if (item.tipo === "atendimento") return `${item.eventoId}-atendimento-${item.atendimentoExtra?.id || item.data || ""}`;
  return "";
}

function rtCalCarroItem(item) {
  const id = rtCalRotaId(item);
  if (!id) return "";

  const carros = rtCalCarrosRotas();

  // formatos possíveis: id da rota, id do evento + tipo, ou id do evento
  return carros[id]
    || carros[String(item.eventoId || "")]
    || carros[`${item.eventoId}_${item.tipo}`]
    || carros[`${item.eventoId}-${item.tipo}`]
    || "";
}

function rtCalOrdemItem(item) {
  const id = rtCalRotaId(item);
  if (!id) return 999999;
  const ordem = Number(rtCalOrdemRotas()[id]);
  return Number.isFinite(ordem) ? ordem : 999999;
}

function rtCalCompararPainelDia(a, b) {
  const rotaA = a.tipo === "montagem" || a.tipo === "desmontagem" || a.tipo === "atendimento";
  const rotaB = b.tipo === "montagem" || b.tipo === "desmontagem" || b.tipo === "atendimento";

  if (rotaA && rotaB) {
    const carroA = rtCalCarroItem(a) || "Sem carro";
    const carroB = rtCalCarroItem(b) || "Sem carro";

    if (carroA !== carroB && typeof ordemCarro === "function") {
      const diff = ordemCarro(carroA) - ordemCarro(carroB);
      if (diff !== 0) return diff;
    }

    const ordemA = rtCalOrdemItem(a);
    const ordemB = rtCalOrdemItem(b);
    if (ordemA !== ordemB) return ordemA - ordemB;
  }

  return String(a.hora || "99:99").localeCompare(String(b.hora || "99:99"));
}

function rtCalBadgeCarro(item) {
  if (!(item.tipo === "montagem" || item.tipo === "desmontagem" || item.tipo === "atendimento")) return "";

  const carro = rtCalCarroItem(item);
  const rotaId = rtCalRotaId(item);

  if (!carro) return `<span class="cal-rota-carro cal-rota-sem-carro" title="${rotaId}">Sem carro</span>`;

  return `<span class="cal-rota-carro" title="${rotaId}">🚚 ${carro}</span>`;
}

function rtCalUsuarioAdmin() {
  try { return typeof usuarioEhAdministrador === "function" && usuarioEhAdministrador(); } catch { return false; }
}

function rtCalCarrosDisponiveis() {
  try {
    const cfg = typeof carregarConfiguracoes === "function" ? carregarConfiguracoes() : null;
    if (cfg && Array.isArray(cfg.carros) && cfg.carros.length) return cfg.carros;
  } catch {}
  try {
    return Array.from(new Set(Object.values(rtCalCarrosRotas()).filter(Boolean)));
  } catch {
    return [];
  }
}

function rtCalControlesAdmin(item) {
  if (!rtCalUsuarioAdmin()) return rtCalBadgeCarro(item);
  if (!(item.tipo === "montagem" || item.tipo === "desmontagem" || item.tipo === "atendimento")) return "";
  const rotaId = rtCalRotaId(item);
  const carroAtual = rtCalCarroItem(item);
  const carros = rtCalCarrosDisponiveis();
  const opts = ['<option value="">Sem carro</option>'].concat(carros.map(c => `<option value="${String(c).replace(/"/g,'&quot;')}" ${String(c)===String(carroAtual) ? "selected" : ""}>${c}</option>`)).join("");
  return `
    <div class="cal-admin-rota-ctrl" data-cal-rota-ctrl="${rotaId}">
      <select class="cal-admin-carro-select" data-cal-carro="${rotaId}" title="Alterar carro">${opts}</select>
      <button type="button" class="cal-admin-ordem-btn" data-cal-mover="${rotaId}" data-dir="up" title="Subir">↑</button>
      <button type="button" class="cal-admin-ordem-btn" data-cal-mover="${rotaId}" data-dir="down" title="Descer">↓</button>
    </div>`;
}

async function rtCalSalvarCarro(rotaId, carro) {
  if (!rotaId) return;
  try {
    if (typeof rotasCarros !== "undefined") {
      if (carro) rotasCarros[String(rotaId)] = carro;
      else delete rotasCarros[String(rotaId)];
      if (typeof salvarRotasCarrosLocal === "function") await salvarRotasCarrosLocal();
      else localStorage.setItem("novoRioTendasRotasCarrosV1", JSON.stringify(rotasCarros));
    } else {
      const carros = rtCalCarrosRotas();
      if (carro) carros[String(rotaId)] = carro; else delete carros[String(rotaId)];
      localStorage.setItem("novoRioTendasRotasCarrosV1", JSON.stringify(carros));
    }
  } catch (e) { console.warn("Erro ao salvar carro pelo calendário:", e); }
  renderizarPainelDiaCalendario();
  try { if (typeof renderizarRotas === "function") renderizarRotas(); } catch {}
  try { if (typeof renderizarRuaMobile === "function") renderizarRuaMobile(); } catch {}
}

async function rtCalMoverOrdem(itemId, dir) {
  const data = calendarioDataSelecionada || calendarioISODate(new Date());
  const origem = calendarioTodosItens().find(i => rtCalRotaId(i) === itemId);
  const carroOrigem = origem ? (rtCalCarroItem(origem) || "Sem carro") : "Sem carro";
  const itens = calendarioTodosItens().filter(i => i.data === data && (i.tipo === "montagem" || i.tipo === "desmontagem" || i.tipo === "atendimento") && (rtCalCarroItem(i) || "Sem carro") === carroOrigem);
  const rotas = itens.map(i => ({ id: rtCalRotaId(i), horario: i.hora || "", tipo: i.tipo === "montagem" ? "Montagem" : (i.tipo === "desmontagem" ? "Desmontagem" : (i.atendimentoExtra?.tipo || "Atendimento extra")) })).filter(r => r.id);
  try {
    if (typeof moverOrdemRota === "function") await moverOrdemRota(itemId, dir, rotas);
    else {
      const ordem = rtCalOrdemRotas();
      rotas.sort((a,b) => (Number(ordem[a.id]) || 999999) - (Number(ordem[b.id]) || 999999));
      const idx = rotas.findIndex(r => String(r.id) === String(itemId));
      const n = dir === "up" ? idx - 1 : idx + 1;
      if (idx >= 0 && n >= 0 && n < rotas.length) {
        const temp = rotas[idx]; rotas[idx] = rotas[n]; rotas[n] = temp;
        rotas.forEach((r,i) => ordem[String(r.id)] = i + 1);
        localStorage.setItem("rotas_ordem_manual", JSON.stringify(ordem));
      }
    }
  } catch (e) { console.warn("Erro ao alterar ordem pelo calendário:", e); }
  renderizarPainelDiaCalendario();
  try { if (typeof renderizarRotas === "function") renderizarRotas(); } catch {}
  try { if (typeof renderizarRuaMobile === "function") renderizarRuaMobile(); } catch {}
}

function rtCalAtivarControlesAdmin(lista) {
  lista.querySelectorAll("[data-cal-carro]").forEach(sel => {
    sel.addEventListener("change", () => rtCalSalvarCarro(sel.dataset.calCarro, sel.value));
  });
  lista.querySelectorAll("[data-cal-mover]").forEach(btn => {
    btn.addEventListener("click", () => rtCalMoverOrdem(btn.dataset.calMover, btn.dataset.dir));
  });
}

function renderizarPainelDiaCalendario() {
  const titulo = document.getElementById("calendarioDiaTitulo");
  const lista = document.getElementById("calendarioDiaLista");
  if (!titulo || !lista) return;

  const data = calendarioDataSelecionada || calendarioISODate(new Date());
  const itens = calendarioTodosItens()
    .filter(item => item.data === data)
    .sort(rtCalCompararPainelDia);

  titulo.textContent = `Dia ${calendarioDataBR(data)}`;
  document.getElementById("calDiaEventos").textContent = itens.filter(i => i.tipo === "evento").length;
  document.getElementById("calDiaMontagens").textContent = itens.filter(i => i.tipo === "montagem").length;
  document.getElementById("calDiaDesmontagens").textContent = itens.filter(i => i.tipo === "desmontagem").length;

  if (!itens.length) {
    lista.innerHTML = `<p class="empty">Nenhum item neste dia.</p>`;
    return;
  }

  lista.innerHTML = itens.map(item => {
    const evento = item.evento || {};
    let materiais = [
      ...(evento.tendas || []).map(p => [p.codigo, p.categoria, p.tamanho].filter(Boolean).join(" ")),
      ...(evento.itens_apoio || []).map(i => `${i.nome || "Item"} (${i.quantidade || 0})`),
      ...(evento.produtos_extras || []).map(i => `${i.descricao || "Extra"} (${i.quantidade || 0})`)
    ].filter(Boolean);
    if (item.tipo === 'atendimento' && item.atendimentoExtra && String(item.atendimentoExtra.tipo || '').toLowerCase().includes('troca')) {
      materiais = item.atendimentoExtra.tenda_entrar ? [item.atendimentoExtra.tenda_entrar] : ['Troca de tenda'];
    }

    return `
      <div class="calendar-panel-card ${calendarioClasseItem(item)}">
        <div class="calendar-panel-top">
          <strong>${calendarioLabelTipo(item.tipo)} — ${typeof rtEventoAlertaHtml === "function" ? rtEventoAlertaHtml({ ...evento, data_evento: item.data || evento.data_evento }) : ""}${evento.nome || "-"}</strong>
          <span class="calendar-panel-time">${calendarioHoraExibicao(item)}</span>
        </div>
        <div class="calendar-panel-info">
          <span>${evento.telefone || "-"}</span>
          <span>${evento.endereco || "-"}</span>
          <span class="${evento.pagamento_quitado ? "cal-fin-ok" : "cal-fin-open"}">${evento.pagamento_quitado ? "Quitado" : "Em aberto"}</span>
        </div>
        <div class="calendar-panel-materials">
          ${materiais.length ? materiais.slice(0, 8).map(m => `<span>${m}</span>`).join("") : `<span>Sem materiais</span>`}
        </div>
        <div class="calendar-panel-actions">
          <button type="button" class="btn-outline cal-action-mini" data-cal-abrir-evento="${evento.id}" title="Abrir">🔎</button>
          <button type="button" class="btn-outline cal-action-mini" data-cal-editar-evento="${evento.id}" title="Editar">✎</button>
          ${rtCalControlesAdmin(item)}
        </div>
      </div>
    `;
  }).join("");

  lista.querySelectorAll("[data-cal-abrir-evento]").forEach(btn => {
    btn.addEventListener("click", () => {
      if (typeof abrirDetalheEvento === "function") abrirDetalheEvento(btn.dataset.calAbrirEvento);
      else alert("Abra o setor de Eventos para ver este evento.");
    });
  });

  lista.querySelectorAll("[data-cal-editar-evento]").forEach(btn => {
    btn.addEventListener("click", () => {
      if (typeof abrirEditarEvento === "function") abrirEditarEvento(btn.dataset.calEditarEvento);
      else alert("Abra o setor de Eventos para editar este evento.");
    });
  });

  rtCalAtivarControlesAdmin(lista);
}

function iniciarCalendarioVisual() {
  if (!document.getElementById("calendarioSection")) return;

  const filtroTipoInicial = document.getElementById("calendarioFiltroTipo");
  if (filtroTipoInicial && !filtroTipoInicial.value) {
    filtroTipoInicial.value = "montagem_desmontagem";
  }

  document.getElementById("calendarioHojeBtn")?.addEventListener("click", () => {
    calendarioDataAtual = new Date();
    calendarioDataSelecionada = calendarioISODate(new Date());
    renderizarCalendario();
  });

  document.getElementById("calendarioAnteriorBtn")?.addEventListener("click", () => {
    if (calendarioModoVisual === "semana") {
      calendarioDataAtual.setDate(calendarioDataAtual.getDate() - 7);
    } else {
      calendarioDataAtual.setMonth(calendarioDataAtual.getMonth() - 1);
    }
    renderizarCalendario();
  });

  document.getElementById("calendarioProximoBtn")?.addEventListener("click", () => {
    if (calendarioModoVisual === "semana") {
      calendarioDataAtual.setDate(calendarioDataAtual.getDate() + 7);
    } else {
      calendarioDataAtual.setMonth(calendarioDataAtual.getMonth() + 1);
    }
    renderizarCalendario();
  });


  document.getElementById("calendarioModoMesBtn")?.addEventListener("click", () => {
    calendarioModoVisual = "mes";
    renderizarCalendario();
  });

  document.getElementById("calendarioModoSemanaBtn")?.addEventListener("click", () => {
    calendarioModoVisual = "semana";
    calendarioDataAtual = calendarioDataSelecionada ? new Date(`${calendarioDataSelecionada}T12:00:00`) : new Date();
    renderizarCalendario();
  });

  ["calendarioFiltroTipo", "calendarioFiltroPagamento", "calendarioFiltroCliente"].forEach(id => {
    const campo = document.getElementById(id);
    if (!campo) return;
    campo.addEventListener("input", renderizarCalendario);
    campo.addEventListener("change", renderizarCalendario);
  });

  garantirEventosCalendario().then(renderizarCalendario);
}

document.addEventListener("DOMContentLoaded", iniciarCalendarioVisual);


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


// v19-dev: aplica rolagem no bloco de cards do dia selecionado do calendário
function rtAplicarScrollDetalheDiaCalendario() {
  const paineis = Array.from(document.querySelectorAll('section, aside, div'))
    .filter((el) => {
      const texto = (el.textContent || '').trim();
      return /^Dia\s+\d{2}\/\d{2}\/\d{4}/.test(texto);
    });

  paineis.forEach((painel) => {
    if (painel.dataset.rtScrollDetalheDia === '1') return;

    const cards = Array.from(painel.children).filter((child) => {
      const txt = (child.textContent || '').trim();
      return /^(Evento|Mont\.|Desm\.)/.test(txt);
    });

    if (cards.length < 1) return;

    const wrapper = document.createElement('div');
    wrapper.className = 'rt-detalhe-dia-scroll-lista';
    wrapper.style.maxHeight = '665px';
    wrapper.style.overflowY = 'auto';
    wrapper.style.overflowX = 'hidden';
    wrapper.style.paddingRight = '6px';
    wrapper.style.scrollbarGutter = 'stable';

    cards[0].parentNode.insertBefore(wrapper, cards[0]);
    cards.forEach((card) => wrapper.appendChild(card));

    painel.style.overflow = 'hidden';
    painel.dataset.rtScrollDetalheDia = '1';
  });
}

document.addEventListener('DOMContentLoaded', rtAplicarScrollDetalheDiaCalendario);
document.addEventListener('click', () => setTimeout(rtAplicarScrollDetalheDiaCalendario, 50));
document.addEventListener('input', () => setTimeout(rtAplicarScrollDetalheDiaCalendario, 50));
setInterval(rtAplicarScrollDetalheDiaCalendario, 800);
