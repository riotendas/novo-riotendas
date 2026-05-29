
let calendarioDataAtual = new Date();
let calendarioDataSelecionada = null;

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

function calendarioHoraDeDatetime(valor) {
  if (!valor) return "";
  const texto = String(valor);
  if (texto.includes("T")) return texto.slice(11, 16);
  return "";
}

function calendarioMesAnoTexto(data) {
  return data.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
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
      hora: evento.hora_inicio || evento.hora_evento || "",
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
      hora: calendarioHoraDeDatetime(evento.montagem),
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
      hora: calendarioHoraDeDatetime(evento.desmontagem),
      titulo: evento.nome || "Desmontagem",
      evento
    });
  }

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
      const tipoOk = !tipo || item.tipo === tipo;
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
  return "Evento";
}

function renderizarCalendario() {
  const grid = document.getElementById("calendarioGrid");
  if (!grid) return;

  const ano = calendarioDataAtual.getFullYear();
  const mes = calendarioDataAtual.getMonth();

  const primeiro = new Date(ano, mes, 1);
  const ultimo = new Date(ano, mes + 1, 0);
  const inicioGrade = new Date(primeiro);
  inicioGrade.setDate(primeiro.getDate() - primeiro.getDay());

  const itens = calendarioTodosItens();
  const hojeISO = calendarioISODate(new Date());

  document.getElementById("calendarioTituloMes").textContent = calendarioMesAnoTexto(calendarioDataAtual);
  const itensMes = itens.filter(i => {
    const d = new Date(`${i.data}T12:00:00`);
    return d.getFullYear() === ano && d.getMonth() === mes;
  });
  document.getElementById("calendarioResumoMes").textContent =
    `${itensMes.filter(i => i.tipo === "evento").length} eventos • ${itensMes.filter(i => i.tipo === "montagem").length} montagens • ${itensMes.filter(i => i.tipo === "desmontagem").length} desmontagens`;

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

function renderizarPainelDiaCalendario() {
  const titulo = document.getElementById("calendarioDiaTitulo");
  const lista = document.getElementById("calendarioDiaLista");
  if (!titulo || !lista) return;

  const data = calendarioDataSelecionada || calendarioISODate(new Date());
  const itens = calendarioTodosItens()
    .filter(item => item.data === data)
    .sort((a, b) => String(a.hora || "99:99").localeCompare(String(b.hora || "99:99")));

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
    const materiais = [
      ...(evento.tendas || []).map(p => [p.codigo, p.categoria, p.tamanho].filter(Boolean).join(" ")),
      ...(evento.itens_apoio || []).map(i => `${i.nome || "Item"} (${i.quantidade || 0})`),
      ...(evento.produtos_extras || []).map(i => `${i.descricao || "Extra"} (${i.quantidade || 0})`)
    ].filter(Boolean);

    return `
      <div class="calendar-panel-card ${calendarioClasseItem(item)}">
        <div class="calendar-panel-top">
          <strong>${calendarioLabelTipo(item.tipo)} — ${evento.nome || "-"}</strong>
          <span>${item.hora || "--:--"}</span>
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
          <button type="button" class="btn-outline" data-cal-abrir-evento="${evento.id}">Abrir evento</button>
          <button type="button" class="btn-outline" data-cal-editar-evento="${evento.id}">Editar evento</button>
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
}

function iniciarCalendarioVisual() {
  if (!document.getElementById("calendarioSection")) return;

  document.getElementById("calendarioHojeBtn")?.addEventListener("click", () => {
    calendarioDataAtual = new Date();
    calendarioDataSelecionada = calendarioISODate(new Date());
    renderizarCalendario();
  });

  document.getElementById("calendarioAnteriorBtn")?.addEventListener("click", () => {
    calendarioDataAtual.setMonth(calendarioDataAtual.getMonth() - 1);
    renderizarCalendario();
  });

  document.getElementById("calendarioProximoBtn")?.addEventListener("click", () => {
    calendarioDataAtual.setMonth(calendarioDataAtual.getMonth() + 1);
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
