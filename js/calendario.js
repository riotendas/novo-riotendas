
let calendarioDataAtual = new Date();
let calendarioDataSelecionada = null;
let calendarioModoVisual = "mes";
let calendarioResumoCompacto = false;

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
  document.getElementById("calendarioResumoBtn")?.classList.toggle("active", calendarioResumoCompacto);
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


function rtCalResumoAtivo() {
  const filtro = document.getElementById("calendarioFiltroTipo")?.value || "";
  return calendarioResumoCompacto && (filtro === "montagem_desmontagem" || filtro === "montagem" || filtro === "desmontagem");
}

function rtCalEscape(texto) {
  return String(texto ?? "").replace(/[&<>'"]/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "'":"&#39;", '"':"&quot;" }[c]));
}

function rtCalPrimeiroNome(nome) {
  return String(nome || "-").trim().split(/\s+/)[0] || "-";
}

function rtCalBairro(endereco) {
  const partes = String(endereco || "").split(",").map(p => p.trim()).filter(Boolean);
  const candidatos = partes.filter(p => !/^\d/.test(p) && !/^(rua|r\.|av\.?|avenida|estrada|travessa|praça|praca|rodovia|alameda)\b/i.test(p));
  let bairro = candidatos.length ? candidatos[candidatos.length - 1] : (partes.length ? partes[partes.length - 1] : "-");
  bairro = bairro.replace(/\b(rio de janeiro|rj|brasil|cep\s*\d+).*$/i, "").trim();
  return bairro || "-";
}

function rtCalNumeroCurto(valor) {
  const n = Math.round((Number(valor) || 0) * 10) / 10;
  if (!n) return "";
  return Number.isInteger(n) ? String(n) : String(n).replace(".", ",");
}

function rtCalNormalizar(texto) {
  return String(texto || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function rtCalCargaConfigAtual() {
  const padrao = {
    pontosItens: {
      tenda_3x3: 0.5, tenda_4_5x3: 1, tenda_4x4: 1, tenda_5x5: 1.5,
      tenda_6x3: 1, tenda_6x6: 2, tenda_8x8: 2.5, tenda_10x10: 3,
      ombrelone: 0.5, mesa_plastica: 0.10, mesa_madeira: 0.15,
      cadeira_plastica: 0.05, cadeira_madeira: 0.08, caixa_190: 0.30,
      caixa_360: 0.50, lateral: 0.10, outros: 0
    },
    resumoItens: {}
  };
  try {
    const config = typeof carregarConfiguracoes === "function" ? carregarConfiguracoes() : (window.configRioTendas || {});
    const carga = config?.cargaOperacional || {};
    return {
      ...padrao,
      ...carga,
      pontosItens: { ...(padrao.pontosItens || {}), ...((carga.pontosItens) || {}) },
      resumoItens: { ...((carga.resumoItens) || {}) }
    };
  } catch (erro) {
    return padrao;
  }
}

function rtCalChaveTendaCarga(tamanho) {
  const t = String(tamanho || "").replace(",", ".").trim();
  if (t.includes("4.5") || t.includes("4,5")) return "tenda_4_5x3";
  return `tenda_${t.replace(".", "_")}`;
}

function rtCalTamanhoProduto(item) {
  const texto = [item?.tamanho, item?.medida, item?.nome, item?.descricao, item?.codigo].filter(Boolean).join(" ");
  const m = String(texto).match(/(10x10|8x8|6x6|6x3|5x5|4[,.]5x3|4x4|3x3)/i);
  return m ? m[1].replace(",", ".") : "";
}

function rtCalQuantidadeItem(item) {
  const n = Number(item?.quantidade ?? item?.qtd ?? item?.qtde ?? item?.total ?? 1);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

function rtCalTipoApoio(item) {
  const txt = rtCalNormalizar([item?.tipo, item?.categoria, item?.nome, item?.descricao, item?.material].filter(Boolean).join(" "));
  if (txt.includes("ombrel")) return "ombrelone";
  if (txt.includes("mesa")) return txt.includes("madeira") ? "mesa_madeira" : "mesa_plastica";
  if (txt.includes("cadeira") || txt.includes("banco") || txt.includes("banqueta")) return txt.includes("madeira") ? "cadeira_madeira" : "cadeira_plastica";
  if (txt.includes("190")) return "caixa_190";
  if (txt.includes("360")) return "caixa_360";
  if (txt.includes("lateral")) return "lateral";
  return "outros";
}

function rtCalResumoConfigItem(chave) {
  const cfg = rtCalCargaConfigAtual().resumoItens || {};
  return cfg[chave] || {};
}

function rtCalChaveMaterialResumo(item) {
  const txt = rtCalNormalizar([item?.tipo, item?.categoria, item?.nome, item?.descricao, item?.material, item?.tamanho, item?.medida, item?.codigo].filter(Boolean).join(" "));
  if (txt.includes("ombrel")) return "ombrelone";

  const tamanho = rtCalTamanhoProduto(item);
  const ehTenda = tamanho || txt.includes("tenda") || txt.includes("piramidal") || txt.includes("sanfonada");
  if (ehTenda) return rtCalChaveTendaCarga(tamanho);

  return rtCalTipoApoio(item);
}

function rtCalRegraResumoMaterial(chave) {
  const carga = rtCalCargaConfigAtual();
  const regra = (carga.resumoItens || {})[chave] || {};
  const modoPadrao = chave.startsWith("tenda_") ? "carga" : (chave === "ombrelone" ? "sigla" : "letra");
  const siglaPadrao = chave === "ombrelone" ? "OMB" : "";
  return {
    modo: regra.modo || modoPadrao,
    sigla: String(regra.sigla || siglaPadrao || "").trim().toUpperCase()
  };
}

function rtCalSiglaPadraoMaterial(item, chave) {
  const nome = String(item?.nome || item?.descricao || item?.material || item?.categoria || chave || "").trim();
  if (chave === "ombrelone") return "OMB";
  return nome.slice(0, 1).toUpperCase();
}

function rtCalResumoMateriaisEvento(evento) {
  const carga = rtCalCargaConfigAtual();
  const listas = [evento?.tendas, evento?.itens_apoio, evento?.materiais_apoio, evento?.produtos_extras].filter(Array.isArray);
  let total = 0;
  const siglas = [];

  listas.flat().forEach(item => {
    const chave = rtCalChaveMaterialResumo(item);
    const regra = rtCalRegraResumoMaterial(chave);
    if (regra.modo === "ocultar") return;

    const qtd = rtCalQuantidadeItem(item);
    if (regra.modo === "carga") {
      const peso = Number((carga.pontosItens || {})[chave]);
      total += (Number.isFinite(peso) ? peso : 0) * qtd;
      return;
    }

    const sigla = (regra.sigla || rtCalSiglaPadraoMaterial(item, chave)).toUpperCase();
    if (sigla && !siglas.includes(sigla)) siglas.push(sigla);
  });

  const pontos = rtCalNumeroCurto(total);
  return `${pontos || ""}${siglas.join("")}` || "-";
}

function rtCalQtdPontos(evento) {
  // Mantido por compatibilidade, mas agora considera todos os materiais marcados como Carga.
  const resumo = rtCalResumoMateriaisEvento(evento || {});
  const m = String(resumo).match(/^([0-9]+(?:,[0-9]+)?)/);
  return m ? m[1] : "";
}

function rtCalSiglasApoio(evento) {
  // Mantido por compatibilidade: retorna somente a parte de letras/siglas do resumo.
  const resumo = rtCalResumoMateriaisEvento(evento || {});
  return String(resumo).replace(/^([0-9]+(?:,[0-9]+)?)/, "").replace("-", "");
}

function rtCalHoraResumo(item) {
  const evento = item?.evento || {};
  const tipoHorario = item.tipo === "montagem" ? (evento.montagem_tipo || evento.tipo_montagem) : (evento.desmontagem_tipo || evento.tipo_desmontagem);
  const tipoTxt = String(tipoHorario || "").toLowerCase();
  if (tipoTxt.includes("livre") || tipoTxt.includes("comercial")) return "";
  if ((tipoTxt.includes("até") || tipoTxt.includes("ate") || tipoTxt.includes("partir")) && !rtCalForaHorarioComercial(item)) return "";
  if (tipoTxt.includes("até") || tipoTxt.includes("ate")) return `Até ${calendarioHoraLimpa(item.hora || evento.hora_montagem || evento.hora_desmontagem).replace(":00", "h")}`.trim();
  if (tipoTxt.includes("partir")) return `A partir ${calendarioHoraLimpa(item.hora || evento.hora_montagem || evento.hora_desmontagem).replace(":00", "h")}`.trim();
  const hora = calendarioHoraExibicao(item);
  if (!hora || hora === "Sem horário") return "";
  return rtCalForaHorarioComercial(item) ? hora.replace(":00", "h") : "";
}

function rtCalTipoHorarioOperacao(item) {
  const evento = item?.evento || {};
  if (item?.tipo === "montagem") return evento.montagem_tipo || evento.tipo_montagem || "";
  if (item?.tipo === "desmontagem") return evento.desmontagem_tipo || evento.tipo_desmontagem || "";
  return item?.atendimentoExtra?.tipo || "";
}

function rtCalHoraOperacao(item) {
  const evento = item?.evento || {};
  if (item?.tipo === "montagem") {
    return calendarioHoraLimpa(item.hora || evento.hora_montagem || evento.montagem_hora || evento.hora_inicio || evento.hora_evento || evento.montagem);
  }
  if (item?.tipo === "desmontagem") {
    return calendarioHoraLimpa(item.hora || evento.hora_desmontagem || evento.desmontagem_hora || evento.hora_termino || evento.desmontagem);
  }
  return calendarioHoraLimpa(item?.hora || item?.atendimentoExtra?.hora || "");
}

function rtCalMinutosHora(hora) {
  const limpo = calendarioHoraLimpa(hora);
  const m = String(limpo || "").match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (!Number.isFinite(h) || !Number.isFinite(min)) return null;
  return h * 60 + min;
}

function rtCalForaHorarioComercial(item) {
  // Amarelo apenas quando a operação realmente cai fora do expediente configurado.
  // Livre/comercial não recebe destaque.
  const tipoTxt = rtCalNormalizar(rtCalTipoHorarioOperacao(item));
  if (tipoTxt.includes("livre") || tipoTxt.includes("comercial")) return false;

  const min = rtCalMinutosHora(rtCalHoraOperacao(item));
  if (min === null) return false;

  const config = typeof carregarConfiguracoes === "function" ? carregarConfiguracoes() : {};
  const horario = config.horarioComercial || {};
  const inicioComercial = rtCalMinutosHora(horario.inicio || "08:00") ?? (8 * 60);
  const fimComercial = rtCalMinutosHora(horario.fim || "20:00") ?? (20 * 60);

  if (tipoTxt.includes("ate")) return min < inicioComercial;
  if (tipoTxt.includes("partir")) return min > fimComercial;
  return min < inicioComercial || min > fimComercial;
}

function rtCalMB(item) {
  if (item.tipo === "montagem") return '<b class="rt-cal-mb rt-cal-m">M</b>';
  if (item.tipo === "desmontagem") return '<b class="rt-cal-mb rt-cal-b">B</b>';
  return '<b class="rt-cal-mb">A</b>';
}

function rtCalTextoResumoItem(item) {
  const evento = item.evento || {};
  const pontos = rtCalResumoMateriaisEvento(evento);
  const bairro = (typeof rtBairroResumo === "function" ? rtBairroResumo(evento) : "") || rtCalBairro(evento.endereco || evento.local || evento.endereco_entrega || "");
  const cliente = rtCalPrimeiroNome(evento.nome || evento.cliente || "");
  const hora = rtCalHoraResumo(item);
  const partes = [rtCalMB(item), rtCalEscape(pontos), rtCalEscape(bairro), rtCalEscape(cliente)];
  if (hora) partes.push(rtCalEscape(hora));
  return partes.join("-");
}

function rtCalResumoPorCarroHtml(itensDia, limiteItens = 99) {
  const itens = itensDia
    .filter(item => item.tipo === "montagem" || item.tipo === "desmontagem" || item.tipo === "atendimento")
    .sort(rtCalCompararPainelDia);
  if (!itens.length) return "";

  const grupos = new Map();
  itens.forEach(item => {
    const carro = rtCalCarroItem(item) || "Sem carro";
    if (!grupos.has(carro)) grupos.set(carro, []);
    grupos.get(carro).push(item);
  });

  let cont = 0;
  const blocos = [];
  grupos.forEach((lista, carro) => {
    if (cont >= limiteItens) return;
    const linhas = [];
    for (const item of lista) {
      if (cont >= limiteItens) break;
      const adminEdita = rtCalUsuarioAdmin() && item.evento?.id;
      const extraClasses = [rtCalForaHorarioComercial(item) ? "rt-cal-fora-comercial" : "", adminEdita ? "rt-cal-resumo-editavel" : ""].filter(Boolean).join(" ");
      const dataEditar = adminEdita ? ` data-cal-resumo-editar="${rtCalEscape(item.evento.id)}"` : "";
      linhas.push(`<span class="${calendarioClasseItem(item)} rt-cal-resumo-linha ${extraClasses}"${dataEditar} title="${rtCalEscape(calendarioLabelTipo(item.tipo) + ' — ' + (item.evento?.nome || ''))}">${rtCalTextoResumoItem(item)}</span>`);
      cont += 1;
    }
    if (linhas.length) {
      blocos.push(`<div class="rt-cal-resumo-carro"><div class="rt-cal-resumo-carro-titulo">${rtCalEscape(carro)}</div>${linhas.join("")}</div>`);
    }
  });
  if (itens.length > cont) blocos.push(`<span class="cal-more">+${itens.length - cont}</span>`);
  return blocos.join("");
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
          ${rtCalResumoAtivo() ? rtCalResumoPorCarroHtml(itensDia, 6) : itensDia.slice(0, 4).map(item => `
            <span class="${calendarioClasseItem(item)}" title="${calendarioLabelTipo(item.tipo)} — ${item.titulo}">
              ${item.hora ? item.hora + " • " : ""}${calendarioLabelTipo(item.tipo)} ${item.titulo}
            </span>
          `).join("")}
          ${!rtCalResumoAtivo() && itensDia.length > 4 ? `<span class="cal-more">+${itensDia.length - 4}</span>` : ""}
        </div>
      </button>
    `);
  }

  grid.classList.remove("calendar-grid-week");
  grid.innerHTML = dias.join("");
  rtCalAtivarResumoClicks(grid);

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
          ${rtCalResumoAtivo() ? rtCalResumoPorCarroHtml(itensDia, 14) : itensDia.slice(0, 8).map(item => `
            <span class="${calendarioClasseItem(item)}" title="${calendarioLabelTipo(item.tipo)} — ${item.titulo}">
              ${item.hora ? item.hora + " • " : ""}${calendarioLabelTipo(item.tipo)} ${item.titulo}
            </span>
          `).join("")}
          ${!rtCalResumoAtivo() && itensDia.length > 8 ? `<span class="cal-more">+${itensDia.length - 8}</span>` : ""}
        </div>
      </button>
    `);
  }

  document.getElementById("calendarioTituloMes").textContent = `Semana: ${calendarioIntervaloSemanaTexto(inicioSemana)}`;
  document.getElementById("calendarioResumoMes").textContent = calendarioResumoItens(itensSemana);

  grid.classList.add("calendar-grid-week");
  grid.innerHTML = dias.join("");
  rtCalAtivarResumoClicks(grid);

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

function rtCalAbrirRotaDoDia(data) {
  const dataRota = data || calendarioDataSelecionada || calendarioISODate(new Date());
  try {
    const tab = document.querySelector('[data-section="rotasSection"]');
    if (tab) tab.click();
    const rotaPeriodo = document.getElementById("rotaPeriodo");
    const rotaData = document.getElementById("rotaData");
    const rotaTipo = document.getElementById("rotaTipoFiltro");
    const rotaCarro = document.getElementById("rotaCarroFiltro");
    if (rotaPeriodo) rotaPeriodo.value = "data";
    if (rotaData) rotaData.value = dataRota;
    if (rotaTipo) rotaTipo.value = "";
    if (rotaCarro) rotaCarro.value = "";
    if (typeof renderizarRotas === "function") renderizarRotas();
  } catch (err) {
    const url = new URL(window.location.href);
    url.searchParams.set("section", "rotas");
    url.searchParams.set("rotaData", dataRota);
    window.location.href = url.toString();
  }
}

function rtCalAbrirEdicaoResumo(eventoId) {
  if (!rtCalUsuarioAdmin() || !eventoId) return;
  if (typeof abrirEditarEvento === "function") {
    abrirEditarEvento(eventoId);
    return;
  }
  if (typeof abrirDetalheEvento === "function") {
    abrirDetalheEvento(eventoId);
    return;
  }
  alert("Abra o setor de Eventos para editar este evento.");
}

function rtCalAtivarResumoClicks(container) {
  if (!container || !rtCalUsuarioAdmin()) return;
  container.querySelectorAll("[data-cal-resumo-editar]").forEach(el => {
    el.addEventListener("click", ev => {
      ev.preventDefault();
      ev.stopPropagation();
      rtCalAbrirEdicaoResumo(el.dataset.calResumoEditar);
    });
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
  const btnRotaDia = document.getElementById("calVerRotaDia");
  if (btnRotaDia) {
    btnRotaDia.dataset.rotaData = data;
    btnRotaDia.disabled = false;
  }
  document.getElementById("calDiaEventos").textContent = itens.filter(i => i.tipo === "evento").length;
  document.getElementById("calDiaMontagens").textContent = itens.filter(i => i.tipo === "montagem").length;
  document.getElementById("calDiaDesmontagens").textContent = itens.filter(i => i.tipo === "desmontagem").length;

  if (!itens.length) {
    lista.innerHTML = `<p class="empty">Nenhum item neste dia.</p>`;
    return;
  }

  if (rtCalResumoAtivo()) {
    lista.innerHTML = `<div class="rt-cal-resumo-painel">${rtCalResumoPorCarroHtml(itens, 999)}</div>`;
    rtCalAtivarResumoClicks(lista);
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
          <span>${(typeof rtEnderecoCompleto === "function" ? rtEnderecoCompleto(evento) : evento.endereco) || "-"}</span>
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

  document.getElementById("calendarioResumoBtn")?.addEventListener("click", () => {
    calendarioResumoCompacto = !calendarioResumoCompacto;
    renderizarCalendario();
  });

  document.getElementById("calVerRotaDia")?.addEventListener("click", () => {
    const data = document.getElementById("calVerRotaDia")?.dataset.rotaData || calendarioDataSelecionada || calendarioISODate(new Date());
    rtCalAbrirRotaDoDia(data);
  });

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

// v19-dev: correção robusta da seleção de dias no calendário.
// Usa delegação em fase de captura para impedir que elementos internos do dia bloqueiem o clique.
(function corrigirCliqueDiaCalendario(){
  if (window.__rtCalendarioCliqueDiaFix) return;
  window.__rtCalendarioCliqueDiaFix = true;

  function selecionarDiaCalendario(btn){
    const iso = btn && btn.dataset ? btn.dataset.calDia : '';
    if (!iso) return;
    calendarioDataSelecionada = iso;
    if (calendarioModoVisual === 'semana') {
      calendarioDataAtual = new Date(`${iso}T12:00:00`);
    }
    renderizarCalendario();
    renderizarPainelDiaCalendario();
  }

  document.addEventListener('click', function(evento){
    const btn = evento.target && evento.target.closest ? evento.target.closest('#calendarioGrid .calendar-day[data-cal-dia]') : null;
    if (!btn) return;
    evento.preventDefault();
    evento.stopPropagation();
    selecionarDiaCalendario(btn);
  }, true);

  document.addEventListener('touchend', function(evento){
    const btn = evento.target && evento.target.closest ? evento.target.closest('#calendarioGrid .calendar-day[data-cal-dia]') : null;
    if (!btn) return;
    selecionarDiaCalendario(btn);
  }, { passive: true, capture: true });
})();
