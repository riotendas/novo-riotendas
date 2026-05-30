

function obterTimestampOrdenacaoEvento(evento) {
  const data = evento?.data_evento || evento?.data || evento?.montagem || evento?.inicio || "";
  const hora = evento?.hora_evento || evento?.hora_inicio || evento?.horario || "00:00";

  if (!data) return Number.MAX_SAFE_INTEGER;

  const dataNormalizada = String(data).includes("T")
    ? String(data)
    : `${String(data).slice(0, 10)}T${String(hora || "00:00").slice(0, 5) || "00:00"}`;

  const ts = new Date(dataNormalizada).getTime();
  return Number.isFinite(ts) ? ts : Number.MAX_SAFE_INTEGER;
}

function ordenarEventosPorData(listaEventos) {
  if (!Array.isArray(listaEventos)) return [];

  return [...listaEventos].sort((a, b) => {
    const dataA = obterTimestampOrdenacaoEvento(a);
    const dataB = obterTimestampOrdenacaoEvento(b);

    if (dataA !== dataB) return dataA - dataB;

    const nomeA = String(a?.nome || a?.cliente || "").toLowerCase();
    const nomeB = String(b?.nome || b?.cliente || "").toLowerCase();

    return nomeA.localeCompare(nomeB, "pt-BR");
  });
}

function normalizarOrdemEventosGlobal() {
  if (Array.isArray(eventos)) {
    eventos = ordenarEventosPorData(eventos);
  }
}

function dataCompactaComDiaRecorrente(dataISO) {
  if (!dataISO) return "-";

  const partes = String(dataISO).split("-");
  if (partes.length < 3) return dataISO;

  const data = new Date(`${dataISO}T12:00:00`);
  const dias = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

  const dd = partes[2];
  const mm = partes[1];
  const aa = partes[0].slice(-2);

  return `<span class="event-date-strong">${dd}/${mm}/${aa}</span> <span class="event-weekday-light">${dias[data.getDay()]}</span>`;
}



/* =========================
   Formatação global de data/hora
========================= */


function dataCompactaComDia(dataISO) {
  if (!dataISO) return "-";

  const partes = String(dataISO).split("-");
  if (partes.length < 3) return dataISO;

  const data = new Date(`${dataISO}T12:00:00`);

  const dias = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

  const dd = partes[2];
  const mm = partes[1];
  const aa = partes[0].slice(-2);

  return `
    <span class="event-date-strong">${dd}/${mm}/${aa}</span>
    <span class="event-weekday-light">${dias[data.getDay()]}</span>
  `;
}

function formatarDataCurta(dataISO) {
  if (!dataISO) return "-";

  const texto = String(dataISO).slice(0,10);
  const partes = texto.split("-");
  if (partes.length < 3) return texto;

  return `${partes[2]}/${partes[1]}/${partes[0].slice(-2)}`;
}

function formatarHoraCurta(valor) {
  if (!valor) return "";

  const texto = String(valor);

  if (texto.includes("T")) {
    return texto.slice(11,16);
  }

  return texto.slice(0,5);
}

function formatarDataHoraCurta(valor) {
  if (!valor) return "-";

  const texto = String(valor);

  if (!texto.includes("T")) {
    return texto;
  }

  const data = formatarDataCurta(texto.slice(0,10));
  const hora = formatarHoraCurta(texto);

  return `${data} ${hora}`;
}



let eventos = [];
let produtosSelecionadosEventoAtual = [];
let produtosExtrasEventoAtual = [];
let produtosRapidoAtual = [];
let apoioRapidoAtual = [];
const storageEventosKey = "novoRioTendasEventosV2";

function dinheiro(valor) {
  return Number(valor || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function moedaParaNumero(valor) {
  if (typeof valor === "number") return valor;

  let texto = String(valor || "")
    .replace("R$", "")
    .trim();

  if (!texto) return 0;

  // Se o usuário digitar 80, interpreta como R$ 80,00.
  // Se digitar 80,50 ou 80.50, interpreta como R$ 80,50.
  if (texto.includes(",") || texto.includes(".")) {
    texto = texto.replace(/\./g, "").replace(",", ".");
    const numero = Number(texto.replace(/[^\d.]/g, ""));
    return Number.isNaN(numero) ? 0 : numero;
  }

  const numeroInteiro = Number(texto.replace(/\D/g, ""));
  return Number.isNaN(numeroInteiro) ? 0 : numeroInteiro;
}

function numeroParaMoeda(valor) {
  return dinheiro(Number(valor || 0));
}

function formatarCampoMoeda(input) {
  input.value = numeroParaMoeda(moedaParaNumero(input.value));
}

function dataBR(dataISO) {
  if (!dataISO) return "-";
  const partes = String(dataISO).split("-");
  if (partes.length !== 3) return dataISO;
  return `${partes[2]}/${partes[1]}/${partes[0].slice(-2)}`;
}


function diaSemanaTexto(data) {
  if (!data) return "";
  const dias = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const d = new Date(data + "T12:00:00");
  return dias[d.getDay()] || "";
}

function diaSemana(dataISO) {
  if (!dataISO) return "-";
  const data = new Date(dataISO + "T12:00:00");
  return data.toLocaleDateString("pt-BR", { weekday: "short" });
}


function tipoHorarioBase(valor) {
  return String(valor || "Horário comercial").split("|")[0] || "Horário comercial";
}

function tipoHorarioFim(valor) {
  const partes = String(valor || "").split("|");
  return partes.length > 1 ? partes[1] : "";
}

function montarTipoHorarioParaSalvar(selectId, fimId) {
  const tipo = document.getElementById(selectId)?.value || "A partir de";
  const fim = document.getElementById(fimId)?.value || "";
  return tipo === "Intervalo" && fim ? `${tipo}|${fim}` : tipo;
}

function textoHorarioOperacao(tipoSalvo, datetimeValor) {
  if (!datetimeValor) return "-";

  const tipo = tipoHorarioBase(tipoSalvo);
  const fim = tipoHorarioFim(tipoSalvo);
  const dataTxt = formatarData(datetimeValor);
  const hora = String(datetimeValor || "").slice(11, 16);

  if (tipo === "Exatamente") return `Exatamente ${dataTxt}`;
  if (tipo === "A partir de") return `A partir de ${dataTxt}`;
  if (tipo === "Até") return `Até ${dataTxt}`;
  if (tipo === "Intervalo") {
    return fim ? `Entre ${dataTxt} e ${fim}` : `Intervalo a partir de ${dataTxt}`;
  }
  if (tipo === "Horário comercial") return `${dataBR(String(datetimeValor).slice(0, 10))} — Horário comercial`;
  if (tipo === "Livre / combinar") return `${dataBR(String(datetimeValor).slice(0, 10))} — Livre / combinar`;

  return `${tipo} ${dataTxt}`;
}

function atualizarCampoHoraFinalOperacao(prefixo) {
  const select = document.getElementById(`evento${prefixo}Tipo`);
  const box = document.getElementById(`evento${prefixo}FimBox`);
  const input = document.getElementById(`evento${prefixo}Fim`);
  const campoDataHora = document.getElementById(`evento${prefixo}`);

  if (!select || !box || !input || !campoDataHora) return;

  const tipo = select.value;

  const mostrarHoraFinal = tipo === "Intervalo";
  box.style.display = mostrarHoraFinal ? "" : "none";
  if (!mostrarHoraFinal) input.value = "";

  const naoExigirHora =
    tipo === "Horário comercial" ||
    tipo === "Livre / combinar";

  const valorAtual = campoDataHora.value || "";
  const dataAtual = valorAtual.includes("T") ? valorAtual.split("T")[0] : valorAtual;

  // Para Horário comercial/Livre, o campo vira apenas DATA.
  // Isso evita o erro nativo do navegador de "data incompleta" em datetime-local.
  if (naoExigirHora) {
    campoDataHora.required = false;
    campoDataHora.type = "date";
    campoDataHora.value = dataAtual || "";
    return;
  }

  // Para os demais tipos, volta a ser data + hora.
  campoDataHora.type = "datetime-local";
  campoDataHora.required = false;

  if (dataAtual && !valorAtual.includes("T")) {
    campoDataHora.value = `${dataAtual}T09:00`;
  }
}

function aplicarTipoHorarioNoFormulario(prefixo, valorSalvo) {
  const select = document.getElementById(`evento${prefixo}Tipo`);
  const input = document.getElementById(`evento${prefixo}Fim`);
  if (!select || !input) return;

  select.value = tipoHorarioBase(valorSalvo);
  input.value = tipoHorarioFim(valorSalvo);
  atualizarCampoHoraFinalOperacao(prefixo);
}

async function buscarEventosBanco() {
  if (!supabaseClient) {
    return JSON.parse(localStorage.getItem(storageEventosKey) || "[]");
  }

  const { data, error } = await supabaseClient
    .from("eventos")
    .select("*")
    .order("data_evento", { ascending: true });

  if (error) {
    console.error("Erro Supabase ao buscar eventos:", error);
    alert("Erro ao buscar eventos no Supabase: " + (error.message || ""));
    return [];
  }

  return data || [];
}

async function salvarEventoBanco(evento) {
  const eventoAntesLog = Array.isArray(eventos)
    ? eventos.find(e => String(e.id) === String(evento.id))
    : null;
  const acaoLogEvento = eventoAntesLog ? "Evento editado" : "Evento cadastrado";

  if (!supabaseClient) {
    const i = eventos.findIndex(e => e.id === evento.id);
    if (i >= 0) eventos[i] = evento;
    else eventos.push(evento);
    localStorage.setItem(storageEventosKey, JSON.stringify(eventos));

    if (typeof registrarLogSistema === "function") {
      registrarLogSistema({
        modulo: "Eventos",
        acao: acaoLogEvento,
        registro_id: evento.id,
        registro_nome: evento.nome || "Evento",
        antes: eventoAntesLog || null,
        depois: evento
      });
    }

    return evento;
  }

  const eventoSupabase = {
    id: evento.id,
    nome: evento.nome || "",
    documento: evento.documento || null,
    telefone: evento.telefone || null,
    endereco: evento.endereco || null,
    data_evento: evento.data_evento || null,
    hora_evento: evento.hora_inicio || evento.hora_evento || null,
    hora_inicio: evento.hora_inicio || evento.hora_evento || null,
    hora_termino: evento.hora_termino || null,
    montagem_tipo: evento.montagem_tipo || "A partir de",
    montagem: evento.montagem || null,
    desmontagem_tipo: evento.desmontagem_tipo || "A partir de",
    desmontagem: evento.desmontagem || null,
    tendas: evento.tendas || [],
    itens_apoio: evento.itens_apoio || [],
    produtos_extras: evento.produtos_extras || [],
    valor_total: Number(evento.valor_total || 0),
    valor_sinal: Number(evento.valor_sinal || 0),
    valor_restante: Number(evento.valor_restante || 0),
    forma_pagamento: evento.forma_pagamento || null,
    pagamento_quitado: Boolean(evento.pagamento_quitado),
    colaborador: evento.colaborador || getColaboradorLogado(),
    criado_em: evento.criado_em || new Date().toISOString(),
    atualizado_em: new Date().toISOString(),
    tipo_evento: evento.tipo_evento || "pontual",
    recorrente: Boolean(evento.recorrente),
    recorrencia_grupo_id: evento.recorrencia_grupo_id || null,
    recorrencia_tipo: evento.recorrencia_tipo || null,
    recorrencia_dias: evento.recorrencia_dias || null,
    recorrencia_inicio: evento.recorrencia_inicio || null,
    recorrencia_fim: evento.recorrencia_fim || null,
    recorrencia_ordem: evento.recorrencia_ordem || null
  };

  const { data, error } = await supabaseClient
    .from("eventos")
    .upsert(eventoSupabase, { onConflict: "id" })
    .select()
    .single();

  if (error) {
    console.error("Erro Supabase ao salvar evento:", error);
    alert("Erro ao salvar evento no Supabase: " + (error.message || ""));
    return null;
  }

  if (typeof registrarLogSistema === "function") {
    registrarLogSistema({
      modulo: "Eventos",
      acao: acaoLogEvento,
      registro_id: data.id,
      registro_nome: data.nome || "Evento",
      antes: eventoAntesLog || null,
      depois: data
    });
  }

  return data;
}

async function excluirEventoBanco(id) {
  const eventoAntesLog = Array.isArray(eventos)
    ? eventos.find(e => String(e.id) === String(id))
    : null;

  if (!supabaseClient) {
    eventos = eventos.filter(e => e.id !== id);
    localStorage.setItem(storageEventosKey, JSON.stringify(eventos));

    if (typeof registrarLogSistema === "function") {
      registrarLogSistema({
        modulo: "Eventos",
        acao: "Evento excluído",
        registro_id: id,
        registro_nome: eventoAntesLog?.nome || "Evento",
        antes: eventoAntesLog || null,
        depois: null
      });
    }

    return true;
  }

  const { error } = await supabaseClient.from("eventos").delete().eq("id", id);

  if (error) {
    alert("Erro ao excluir evento: " + (error.message || ""));
    return false;
  }

  if (typeof registrarLogSistema === "function") {
    registrarLogSistema({
      modulo: "Eventos",
      acao: "Evento excluído",
      registro_id: id,
      registro_nome: eventoAntesLog?.nome || "Evento",
      antes: eventoAntesLog || null,
      depois: null
    });
  }

  return true;
}

async function garantirClienteDoEvento(evento) {
  if (!evento.nome) return;

  const documento = evento.documento || "";
  const telefone = evento.telefone || "";

  let existente = null;

  if (Array.isArray(clientes)) {
    existente = clientes.find(c =>
      (documento && c.documento === documento) ||
      (telefone && c.telefone === telefone) ||
      (String(c.nome || "").toLowerCase() === String(evento.nome || "").toLowerCase())
    );
  }

  if (existente) return existente;

  if (typeof salvarClienteBanco !== "function") return null;

  const cliente = {
    id: gerarId(),
    nome: evento.nome,
    documento: evento.documento || "",
    telefone: evento.telefone || "",
    endereco: evento.endereco || "",
    colaborador: getColaboradorLogado(),
    criado_em: new Date().toISOString()
  };

  const salvo = await salvarClienteBanco(cliente);

  if (salvo && Array.isArray(clientes)) {
    clientes.push(salvo);
    if (typeof renderizarClientes === "function") renderizarClientes();
  }

  return salvo;
}

async function carregarEventos() {
  eventos = await buscarEventosBanco();
  normalizarOrdemEventosGlobal();
  renderizarEventos();
}

function onEventoSeguro(id, evento, funcao) {
  const el = document.getElementById(id);
  if (el) el.addEventListener(evento, funcao);
}

function iniciarEventos() {
  if (!document.getElementById("eventosTbody")) return;

  onEventoSeguro("novoEventoBtn", "click", abrirNovoEvento);
  onEventoSeguro("fecharEventoModal", "click", fecharEventoModal);
  onEventoSeguro("cancelarEvento", "click", fecharEventoModal);
  onEventoSeguro("fecharEventoDetalheModal", "click", () => document.getElementById("eventoDetalheDialog").close());
  onEventoSeguro("eventoForm", "submit", salvarEventoForm);

  ["eventoValorTotal", "eventoValorSinal"].forEach(id => {
    const campo = document.getElementById(id);
    campo.addEventListener("input", calcularRestanteEvento);
    campo.addEventListener("blur", () => { formatarCampoMoeda(campo); calcularRestanteEvento(); });
  });
  onEventoSeguro("eventoBuscaCliente", "change", preencherClienteSelecionado);
  onEventoSeguro("eventoMontagemTipo", "change", () => atualizarCampoHoraFinalOperacao("Montagem"));
  onEventoSeguro("eventoDesmontagemTipo", "change", () => atualizarCampoHoraFinalOperacao("Desmontagem"));
  onEventoSeguro("adicionarProdutoEvento", "click", adicionarProdutoSelecionadoAoEvento);
  const btnExtraEvento = document.getElementById("adicionarExtraEvento");
  if (btnExtraEvento) btnExtraEvento.addEventListener("click", adicionarExtraAoEvento);
  document.getElementById("fecharEventoProdutosRapido").addEventListener("click", fecharProdutosRapido);
  document.getElementById("cancelarEventoProdutosRapido").addEventListener("click", fecharProdutosRapido);
  document.getElementById("adicionarProdutoRapido").addEventListener("click", adicionarProdutoRapido);
  document.getElementById("salvarEventoProdutosRapido").addEventListener("click", salvarProdutosRapido);

  ["eventoData", "eventoHoraInicio", "eventoHoraTermino", "eventoMontagem", "eventoDesmontagem", "eventoMontagemTipo", "eventoDesmontagemTipo", "eventoMontagemFim", "eventoDesmontagemFim"].forEach(id => {
    const campo = document.getElementById(id);
    if (!campo) return;
    campo.addEventListener("change", () => {
      popularSelectProdutosEvento();
      renderizarProdutosSelecionadosEvento();
      renderizarApoioEvento(obterApoioSelecionadoEvento());
    });
  });

  ["buscaEvento", "filtroEventoData", "filtroEventoCliente", "filtroEventoTelefone", "filtroEventoPagamento"].forEach(id => {
    const campo = document.getElementById(id);
    if (!campo) return;
    campo.addEventListener("input", renderizarEventos);
    campo.addEventListener("change", renderizarEventos);
  });


  onEventoSeguro("eventoTipoEvento", "change", () => {
    atualizarBoxRecorrencia();
    preencherDatasRecorrenciaPadrao();
  });
  onEventoSeguro("eventoRecorrenciaTipo", "change", atualizarCampoDiasRecorrencia);
  onEventoSeguro("eventoData", "change", preencherDatasRecorrenciaPadrao);

  carregarEventos();
}

function atualizarDatalistClientes() {
  const datalist = document.getElementById("clientesDatalist");
  if (!datalist || !Array.isArray(clientes)) return;

  datalist.innerHTML = clientes.map(c => `
    <option value="${c.nome || ""}" data-id="${c.id}">
  `).join("");
}

function preencherClienteSelecionado() {
  const nome = document.getElementById("eventoBuscaCliente").value.trim().toLowerCase();
  const cliente = Array.isArray(clientes) ? clientes.find(c => String(c.nome || "").toLowerCase() === nome) : null;
  if (!cliente) return;

  document.getElementById("eventoNome").value = cliente.nome || "";
  document.getElementById("eventoDocumento").value = cliente.documento || "";
  document.getElementById("eventoTelefone").value = cliente.telefone || "";
  document.getElementById("eventoEndereco").value = cliente.endereco || "";
}

function calcularRestanteEvento() {
  const total = moedaParaNumero(document.getElementById("eventoValorTotal").value);
  const sinal = moedaParaNumero(document.getElementById("eventoValorSinal").value);
  document.getElementById("eventoValorRestante").value = numeroParaMoeda(Math.max(total - sinal, 0));
}


function isEventoRecorrente(evento) {
  return Boolean(evento.recorrente || evento.tipo_evento === "recorrente" || evento.recorrencia_grupo_id);
}

function recorrenciaLabel(tipo, dias) {
  if (tipo === "mensal") return "Mensal";
  if (tipo === "quinzenal") return "A cada 15 dias";
  if (tipo === "personalizado") return `A cada ${dias || 1} dias`;
  return "-";
}

function addDiasISO(dataISO, dias) {
  const d = new Date(`${dataISO}T12:00:00`);
  d.setDate(d.getDate() + Number(dias || 0));
  return d.toISOString().slice(0, 10);
}

function addMesISO(dataISO, meses) {
  const d = new Date(`${dataISO}T12:00:00`);
  d.setMonth(d.getMonth() + Number(meses || 0));
  return d.toISOString().slice(0, 10);
}

function diffDiasISO(base, alvo) {
  const b = new Date(`${base}T12:00:00`);
  const a = new Date(`${alvo}T12:00:00`);
  return Math.round((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24));
}

function ajustarDatetimePelaNovaData(datetimeOriginal, dataOriginal, dataNova) {
  if (!datetimeOriginal || !dataOriginal || !dataNova) return datetimeOriginal || null;
  return String(datetimeOriginal).replace(String(dataOriginal), String(dataNova));
}

function datasRecorrencia(inicio, fim, tipo, diasPersonalizado) {
  if (!inicio || !fim) return [];

  const datas = [];
  let atual = inicio;
  let seguranca = 0;

  while (atual <= fim && seguranca < 120) {
    datas.push(atual);

    if (tipo === "mensal") atual = addMesISO(atual, 1);
    else if (tipo === "quinzenal") atual = addDiasISO(atual, 15);
    else atual = addDiasISO(atual, Math.max(Number(diasPersonalizado || 1), 1));

    seguranca++;
  }

  return datas;
}

function atualizarBoxRecorrencia() {
  const tipoEvento = document.getElementById("eventoTipoEvento")?.value || "pontual";
  const box = document.getElementById("eventoRecorrenciaBox");
  if (!box) return;

  box.classList.toggle("hidden", tipoEvento !== "recorrente");
}

function atualizarCampoDiasRecorrencia() {
  const tipo = document.getElementById("eventoRecorrenciaTipo")?.value || "mensal";
  const campo = document.getElementById("eventoRecorrenciaDias");
  if (!campo) return;

  campo.disabled = tipo !== "personalizado";
  if (tipo === "mensal") campo.value = 30;
  if (tipo === "quinzenal") campo.value = 15;
}

function preencherDatasRecorrenciaPadrao() {
  const dataEvento = document.getElementById("eventoData")?.value || "";
  const inicio = document.getElementById("eventoRecorrenciaInicio");
  const fim = document.getElementById("eventoRecorrenciaFim");

  if (inicio && dataEvento && !inicio.value) inicio.value = dataEvento;
  if (fim && dataEvento && !fim.value) fim.value = addMesISO(dataEvento, 6);
}


function valorOperacaoParaSalvar(campoId, tipoSelectId) {
  const campo = document.getElementById(campoId);
  const select = document.getElementById(tipoSelectId);
  const valor = campo?.value || "";
  const tipo = select?.value || "";

  if (!valor) return null;

  if (tipo === "Horário comercial" || tipo === "Livre / combinar") {
    return valor.includes("T") ? valor : `${valor}T00:00`;
  }

  return valor;
}

function montarEventoRecorrenteBase(id, existente) {
  return {
    id,
    nome: document.getElementById("eventoNome").value.trim(),
    documento: document.getElementById("eventoDocumento").value.trim(),
    telefone: document.getElementById("eventoTelefone").value.trim(),
    endereco: document.getElementById("eventoEndereco").value.trim(),
    data_evento: document.getElementById("eventoData").value || null,
    hora_inicio: document.getElementById("eventoHoraInicio").value || null,
    hora_termino: document.getElementById("eventoHoraTermino").value || null,
    hora_evento: document.getElementById("eventoHoraInicio").value || null,
    montagem_tipo: montarTipoHorarioParaSalvar("eventoMontagemTipo", "eventoMontagemFim"),
    montagem: valorOperacaoParaSalvar("eventoMontagem", "eventoMontagemTipo"),
    desmontagem_tipo: montarTipoHorarioParaSalvar("eventoDesmontagemTipo", "eventoDesmontagemFim"),
    desmontagem: valorOperacaoParaSalvar("eventoDesmontagem", "eventoDesmontagemTipo"),
    tendas: obterProdutosSelecionadosEvento(),
    itens_apoio: obterApoioSelecionadoEvento(),
    produtos_extras: produtosExtrasEventoAtual,
    valor_total: moedaParaNumero(document.getElementById("eventoValorTotal").value),
    valor_sinal: moedaParaNumero(document.getElementById("eventoValorSinal").value),
    valor_restante: moedaParaNumero(document.getElementById("eventoValorRestante").value),
    forma_pagamento: document.getElementById("eventoFormaPagamento").value.trim(),
    pagamento_quitado: document.getElementById("eventoPagamentoQuitado").checked,
    colaborador: getColaboradorLogado(),
    criado_em: existente?.criado_em || new Date().toISOString(),
    atualizado_em: new Date().toISOString()
  };
}

function montarOcorrenciasRecorrentes(baseEvento) {
  const tipo = document.getElementById("eventoRecorrenciaTipo")?.value || "mensal";
  const dias = Number(document.getElementById("eventoRecorrenciaDias")?.value || 30);
  const inicioRec = document.getElementById("eventoRecorrenciaInicio")?.value || baseEvento.data_evento;
  const fimRec = document.getElementById("eventoRecorrenciaFim")?.value || baseEvento.data_evento;
  const grupoId = gerarId();
  const datas = datasRecorrencia(inicioRec, fimRec, tipo, dias);

  return datas.map((dataOcorrencia, index) => {
    const evento = {
      ...baseEvento,
      id: index === 0 ? baseEvento.id : gerarId(),
      data_evento: dataOcorrencia,
      montagem: ajustarDatetimePelaNovaData(baseEvento.montagem, baseEvento.data_evento, dataOcorrencia),
      desmontagem: ajustarDatetimePelaNovaData(baseEvento.desmontagem, baseEvento.data_evento, dataOcorrencia),
      criado_em: new Date().toISOString(),
      atualizado_em: new Date().toISOString(),
      tipo_evento: "recorrente",
      recorrente: true,
      recorrencia_grupo_id: grupoId,
      recorrencia_tipo: tipo,
      recorrencia_dias: tipo === "personalizado" ? dias : (tipo === "quinzenal" ? 15 : 30),
      recorrencia_inicio: inicioRec,
      recorrencia_fim: fimRec,
      recorrencia_ordem: index + 1
    };

    return evento;
  });
}

function periodoRecorrenciaTexto(e) {
  if (!isEventoRecorrente(e)) return "-";
  return `${dataBR(e.recorrencia_inicio || e.data_evento)} até ${dataBR(e.recorrencia_fim || e.data_evento)}`;
}


function prepararHorarioPadraoNovoEvento() {
  aplicarTipoHorarioNoFormulario("Montagem", "Horário comercial");
  aplicarTipoHorarioNoFormulario("Desmontagem", "Horário comercial");

  const montagem = document.getElementById("eventoMontagem");
  const desmontagem = document.getElementById("eventoDesmontagem");

  if (montagem) {
    montagem.type = "date";
    montagem.required = false;
  }

  if (desmontagem) {
    desmontagem.type = "date";
    desmontagem.required = false;
  }
}

function abrirNovoEvento() {
  document.getElementById("eventoForm").reset();
  prepararHorarioPadraoNovoEvento();
  document.getElementById("eventoId").value = "";
  document.getElementById("eventoModalTitulo").textContent = "Novo evento";

  // Padrão para novo evento: horário comercial, sem exigir hora
  aplicarTipoHorarioNoFormulario("Montagem", "Horário comercial");
  aplicarTipoHorarioNoFormulario("Desmontagem", "Horário comercial");

  document.getElementById("eventoValorTotal").value = numeroParaMoeda(0);
  document.getElementById("eventoValorSinal").value = numeroParaMoeda(0);
  document.getElementById("eventoValorRestante").value = numeroParaMoeda(0);
  const tipoEvento = document.getElementById("eventoTipoEvento");
  if (tipoEvento) tipoEvento.value = "pontual";
  const tipoRec = document.getElementById("eventoRecorrenciaTipo");
  if (tipoRec) tipoRec.value = "mensal";
  const diasRec = document.getElementById("eventoRecorrenciaDias");
  if (diasRec) diasRec.value = 30;
  const inicioRec = document.getElementById("eventoRecorrenciaInicio");
  if (inicioRec) inicioRec.value = "";
  const fimRec = document.getElementById("eventoRecorrenciaFim");
  if (fimRec) fimRec.value = "";
  atualizarBoxRecorrencia();
  atualizarCampoDiasRecorrencia();
  produtosSelecionadosEventoAtual = [];
  produtosExtrasEventoAtual = [];
  atualizarDatalistClientes();
  popularSelectProdutosEvento();
  renderizarProdutosSelecionadosEvento();
  renderizarExtrasEvento();
  renderizarApoioEvento([]);
  document.getElementById("eventoDialog").showModal();
}

function abrirEditarEvento(id) {
  const e = eventos.find(x => x.id === id);
  if (!e) return;

  document.getElementById("eventoId").value = e.id;
  document.getElementById("eventoBuscaCliente").value = e.nome || "";
  document.getElementById("eventoNome").value = e.nome || "";
  document.getElementById("eventoDocumento").value = e.documento || "";
  document.getElementById("eventoTelefone").value = e.telefone || "";
  document.getElementById("eventoEndereco").value = e.endereco || "";
  document.getElementById("eventoData").value = e.data_evento || "";
  document.getElementById("eventoHoraInicio").value = e.hora_inicio || e.hora_evento || "";
  document.getElementById("eventoHoraTermino").value = e.hora_termino || "";
  aplicarTipoHorarioNoFormulario("Montagem", e.montagem_tipo || "A partir de");
  const campoMontagem = document.getElementById("eventoMontagem");
  campoMontagem.value = e.montagem ? (campoMontagem.type === "date" ? String(e.montagem).slice(0,10) : String(e.montagem).slice(0,16)) : "";

  aplicarTipoHorarioNoFormulario("Desmontagem", e.desmontagem_tipo || "A partir de");
  const campoDesmontagem = document.getElementById("eventoDesmontagem");
  campoDesmontagem.value = e.desmontagem ? (campoDesmontagem.type === "date" ? String(e.desmontagem).slice(0,10) : String(e.desmontagem).slice(0,16)) : "";
  document.getElementById("eventoValorTotal").value = numeroParaMoeda(e.valor_total || 0);
  document.getElementById("eventoValorSinal").value = numeroParaMoeda(e.valor_sinal || 0);
  document.getElementById("eventoValorRestante").value = numeroParaMoeda(e.valor_restante || 0);
  document.getElementById("eventoFormaPagamento").value = e.forma_pagamento || "";
  document.getElementById("eventoPagamentoQuitado").checked = Boolean(e.pagamento_quitado);
  const tipoEvento = document.getElementById("eventoTipoEvento");
  if (tipoEvento) tipoEvento.value = isEventoRecorrente(e) ? "recorrente" : "pontual";
  const tipoRec = document.getElementById("eventoRecorrenciaTipo");
  if (tipoRec) tipoRec.value = e.recorrencia_tipo || "mensal";
  const diasRec = document.getElementById("eventoRecorrenciaDias");
  if (diasRec) diasRec.value = e.recorrencia_dias || (e.recorrencia_tipo === "quinzenal" ? 15 : 30);
  const inicioRec = document.getElementById("eventoRecorrenciaInicio");
  if (inicioRec) inicioRec.value = e.recorrencia_inicio || e.data_evento || "";
  const fimRec = document.getElementById("eventoRecorrenciaFim");
  if (fimRec) fimRec.value = e.recorrencia_fim || e.data_evento || "";
  atualizarBoxRecorrencia();
  atualizarCampoDiasRecorrencia();

  produtosSelecionadosEventoAtual = Array.isArray(e.tendas) ? [...e.tendas] : [];
  produtosExtrasEventoAtual = Array.isArray(e.produtos_extras) ? [...e.produtos_extras] : [];
  atualizarDatalistClientes();
  popularSelectProdutosEvento();
  renderizarProdutosSelecionadosEvento();
  renderizarExtrasEvento();
  renderizarApoioEvento(e.itens_apoio || []);

  document.getElementById("eventoModalTitulo").textContent = "Editar evento";
  document.getElementById("eventoDialog").showModal();
}

function fecharEventoModal() {
  document.getElementById("eventoDialog").close();
}


function periodosConflitam(inicioA, fimA, inicioB, fimB) {
  if (!inicioA || !fimA || !inicioB || !fimB) return false;
  return new Date(inicioA) <= new Date(fimB) && new Date(fimA) >= new Date(inicioB);
}

function intervaloEventoAtual() {
  const data = document.getElementById("eventoData")?.value;
  const inicio = document.getElementById("eventoHoraInicio")?.value || "00:00";
  const termino = document.getElementById("eventoHoraTermino")?.value || "23:59";
  const montagem = document.getElementById("eventoMontagem")?.value;
  const desmontagem = document.getElementById("eventoDesmontagem")?.value;

  if (montagem && desmontagem) {
    return { inicio: montagem, fim: desmontagem };
  }

  if (data) {
    return {
      inicio: `${data}T${inicio}`,
      fim: `${data}T${termino}`
    };
  }

  return { inicio: null, fim: null };
}


function dataISOEventoSeguro(valor) {
  if (!valor) return "";
  return String(valor).slice(0, 10);
}

function intervaloDeEventoParaDisponibilidade(evento) {
  if (!evento) return { inicio: null, fim: null };

  let inicio = evento.montagem || null;
  let fim = evento.desmontagem || null;

  if (!inicio || !fim) {
    const data = dataISOEventoSeguro(evento.data_evento);
    if (!data) return { inicio: null, fim: null };

    inicio = `${data}T${String(evento.hora_inicio || evento.hora_evento || "00:00").slice(0, 5)}`;
    fim = `${data}T${String(evento.hora_termino || "23:59").slice(0, 5)}`;
  }

  return { inicio, fim };
}

function eventoUsaProdutoPorIdOuCodigo(evento, produto) {
  if (!evento || !Array.isArray(evento.tendas) || !produto) return false;

  const id = String(produto.id || "");
  const codigo = String(produto.codigo || "").trim();

  return evento.tendas.some(item => {
    return (id && String(item.id || "") === id)
      || (codigo && String(item.codigo || "").trim() === codigo);
  });
}

function produtoJaSelecionadoNoEvento(lista, produto, ignorarIndex = -1) {
  const id = String(produto?.id || "");
  const codigo = String(produto?.codigo || "").trim();

  return (lista || []).some((item, index) => {
    if (Number(index) === Number(ignorarIndex)) return false;

    return (id && String(item.id || "") === id)
      || (codigo && String(item.codigo || "").trim() === codigo);
  });
}

function produtoEstaDisponivelNoEvento(produto, evento, ignorarIndex = -1) {
  if (!produto || !evento) return { livre: false, texto: "Produto inválido", classe: "busy" };

  if (produtoJaSelecionadoNoEvento(produtosRapidoAtual || evento.tendas || [], produto, ignorarIndex)) {
    return { livre: false, texto: "Já selecionado neste evento", classe: "busy" };
  }

  const intervaloAtual = intervaloDeEventoParaDisponibilidade(evento);

  if (!intervaloAtual.inicio || !intervaloAtual.fim) {
    return { livre: true, texto: "Sem data definida", classe: "neutral" };
  }

  const conflito = eventos.find(outro => {
    if (String(outro.id) === String(evento.id)) return false;
    if (!eventoUsaProdutoPorIdOuCodigo(outro, produto)) return false;

    const intervaloOutro = intervaloDeEventoParaDisponibilidade(outro);
    return periodosConflitam(intervaloAtual.inicio, intervaloAtual.fim, intervaloOutro.inicio, intervaloOutro.fim);
  });

  if (conflito) {
    return {
      livre: false,
      texto: `Indisponível: ${conflito.nome || "cliente"} em ${dataBR(conflito.data_evento)}`,
      classe: "busy"
    };
  }

  return { livre: true, texto: "Livre para a data", classe: "free" };
}

function textoHorarioOperacaoSeguro(tipoSalvo, datetimeValor) {
  if (!datetimeValor) return "-";

  const tipo = tipoHorarioBase(tipoSalvo);
  const fim = tipoHorarioFim(tipoSalvo);
  const data = dataBR(String(datetimeValor).slice(0, 10));
  const hora = String(datetimeValor || "").includes("T") ? String(datetimeValor).slice(11, 16) : "";
  const dataHora = `${data}${hora ? " " + hora : ""}`;

  if (tipo === "Exatamente") return `Exatamente ${dataHora}`;
  if (tipo === "A partir de") return `A partir de ${dataHora}`;
  if (tipo === "Até") return `Até ${dataHora}`;
  if (tipo === "Intervalo") return fim ? `Entre ${dataHora} e ${fim}` : `Intervalo a partir de ${dataHora}`;
  if (tipo === "Horário comercial") return `${data} — Horário comercial`;
  if (tipo === "Livre / combinar") return `${data} — Livre / combinar`;

  return `${tipo} ${dataHora}`;
}

function disponibilidadeProdutoParaEvento(produtoId) {
  const eventoAtualId = document.getElementById("eventoId")?.value || "";
  const intervaloAtual = intervaloEventoAtual();
  const produto = (Array.isArray(produtos) ? produtos : []).find(p => String(p.id) === String(produtoId)) || { id: produtoId };

  if (!intervaloAtual.inicio || !intervaloAtual.fim) {
    return { livre: true, texto: "Defina a data para verificar", classe: "neutral" };
  }

  const conflito = eventos.find(evento => {
    if (String(evento.id) === String(eventoAtualId)) return false;
    if (!eventoUsaProdutoPorIdOuCodigo(evento, produto)) return false;

    const intervalo = intervaloDeEventoParaDisponibilidade(evento);
    return periodosConflitam(intervaloAtual.inicio, intervaloAtual.fim, intervalo.inicio, intervalo.fim);
  });

  if (conflito) {
    return {
      livre: false,
      texto: `Indisponível: ${conflito.nome || "cliente"} em ${dataBR(conflito.data_evento)}`,
      classe: "busy"
    };
  }

  return { livre: true, texto: "Livre para a data", classe: "free" };
}

function popularSelectProdutosEvento() {
  const select = document.getElementById("eventoProdutoSelect");
  if (!select) return;
  const ids = produtosSelecionadosEventoAtual.map(p => String(p.id));
  const disponiveis = (Array.isArray(produtos) ? produtos : [])
    .filter(p => (p.categoria || p.tipo) !== "Mesas/Cadeiras")
    .filter(p => !ids.includes(String(p.id)));
  select.innerHTML = `<option value="">Selecione um produto para adicionar</option>` + disponiveis.map(p => {
    const disp = disponibilidadeProdutoParaEvento(p.id);
    return `
      <option value="${p.id}" ${disp.livre ? "" : "disabled"}>
        ${p.codigo || "Sem código"} — ${p.categoria || p.tipo || "-"} ${p.tamanho || ""} ${p.cor || ""} | ${disp.texto}
      </option>
    `;
  }).join("");
}
function adicionarProdutoSelecionadoAoEvento() {
  const select = document.getElementById("eventoProdutoSelect");
  const id = select.value;
  if (!id) return;
  const p = produtos.find(x => String(x.id) === String(id));
  if (!p) return;

  const disponibilidade = disponibilidadeProdutoParaEvento(p.id);
  if (!disponibilidade.livre) {
    alert(`Este produto está indisponível para a data/período selecionado.\n\n${disponibilidade.texto}`);
    select.value = "";
    return;
  }

  produtosSelecionadosEventoAtual.push({
    id: p.id, codigo: p.codigo || "", categoria: p.categoria || p.tipo || "", tamanho: p.tamanho || "", cor: p.cor || ""
  });
  select.value = "";
  popularSelectProdutosEvento();
  renderizarProdutosSelecionadosEvento();
}
function removerProdutoDoEvento(id) {
  produtosSelecionadosEventoAtual = produtosSelecionadosEventoAtual.filter(p => String(p.id) !== String(id));
  popularSelectProdutosEvento();
  renderizarProdutosSelecionadosEvento();
}
function renderizarProdutosSelecionadosEvento() {
  const area = document.getElementById("eventoProdutosSelecionados");
  if (!area) return;
  if (!produtosSelecionadosEventoAtual.length) {
    area.innerHTML = `<p class="empty">Nenhum produto com código selecionado.</p>`;
    return;
  }
  area.innerHTML = produtosSelecionadosEventoAtual.map(p => {
    const disp = disponibilidadeProdutoParaEvento(p.id);
    return `
      <div class="selected-item">
        <span>
          <strong>${p.codigo || "Sem código"}</strong> — ${p.categoria || ""} ${p.tamanho || ""} ${p.cor || ""}
          <small class="availability-badge ${disp.classe}">${disp.texto}</small>
        </span>
        <button type="button" class="btn-outline" data-remove-produto="${p.id}">Remover</button>
      </div>`;
  }).join("");
  area.querySelectorAll("[data-remove-produto]").forEach(btn => {
    btn.addEventListener("click", () => removerProdutoDoEvento(btn.dataset.removeProduto));
  });
}


function adicionarExtraAoEvento() {
  const descricaoInput = document.getElementById("eventoExtraDescricao");
  const quantidadeInput = document.getElementById("eventoExtraQuantidade");

  if (!descricaoInput || !quantidadeInput) return;

  const descricao = descricaoInput.value.trim();
  const quantidade = Math.max(Number(quantidadeInput.value || 1), 1);

  if (!descricao) {
    alert("Informe a descrição do produto ou serviço extra.");
    return;
  }

  produtosExtrasEventoAtual.push({
    id: gerarId(),
    descricao,
    quantidade
  });

  descricaoInput.value = "";
  quantidadeInput.value = 1;
  renderizarExtrasEvento();
}

function removerExtraDoEvento(id) {
  produtosExtrasEventoAtual = produtosExtrasEventoAtual.filter(item => String(item.id) !== String(id));
  renderizarExtrasEvento();
}

function renderizarExtrasEvento() {
  const area = document.getElementById("eventoExtrasSelecionados");
  if (!area) return;

  if (!produtosExtrasEventoAtual.length) {
    area.innerHTML = `<p class="empty">Nenhum produto extra adicionado.</p>`;
    return;
  }

  area.innerHTML = produtosExtrasEventoAtual.map(item => `
    <div class="selected-item extra-selected">
      <span><strong>${item.descricao}</strong> — Quantidade: ${item.quantidade}</span>
      <button type="button" class="btn-outline" data-remove-extra="${item.id}">Remover</button>
    </div>
  `).join("");

  area.querySelectorAll("[data-remove-extra]").forEach(btn => {
    btn.addEventListener("click", () => removerExtraDoEvento(btn.dataset.removeExtra));
  });
}

function renderizarApoioEvento(selecionados = []) {
  const area = document.getElementById("eventoApoioLista");
  if (!area) return;

  if (!Array.isArray(estoqueApoio) || !estoqueApoio.length) {
    area.innerHTML = `<p class="empty">Nenhum item de apoio cadastrado.</p>`;
    return;
  }

  area.innerHTML = estoqueApoio.map(item => {
    const selecionado = selecionados.find(s => String(s.id) === String(item.id) || s.nome === item.nome);
    const total = Number(item.quantidade_total || 0);
    const reservado = Number(item.quantidade_reservada || 0);
    const disponibilidade = disponibilidadeApoioParaEvento(item, selecionado ? Number(selecionado.quantidade || 0) : 0);
    const disponivel = disponibilidade.disponivel;

    return `
      <label class="apoio-evento-item">
        <span>
          <strong>${item.nome}</strong>
          <small>Total: ${total} | Reservado na data: ${disponibilidade.reservadoNoPeriodo} | Disponível na data: ${disponivel}</small>
        </span>
        <input type="number" min="0" max="${disponivel}" step="1" data-id="${item.id}" data-nome="${item.nome}" value="${selecionado ? Number(selecionado.quantidade || 0) : 0}">
      </label>
    `;
  }).join("");

  area.querySelectorAll("input[type='number']").forEach(input => {
    input.addEventListener("input", () => {
      const max = Number(input.max || 0);
      const valor = Number(input.value || 0);
      if (valor > max) {
        input.value = max;
        alert(`Quantidade máxima disponível para esta data: ${max}`);
      }
      if (valor < 0) input.value = 0;
    });
  });
}

function obterProdutosSelecionadosEvento() {
  return produtosSelecionadosEventoAtual.map(p => ({
    id: p.id, codigo: p.codigo || "", categoria: p.categoria || "", tamanho: p.tamanho || "", cor: p.cor || ""
  }));
}

function obterApoioSelecionadoEvento() {
  const inputs = [...document.querySelectorAll("#eventoApoioLista input[type='number']")];

  return inputs.map(input => {
    const quantidade = Number(input.value || 0);
    if (quantidade <= 0) return null;

    return {
      id: input.dataset.id,
      nome: input.dataset.nome,
      quantidade
    };
  }).filter(Boolean);
}


function quantidadeApoioReservadaNoPeriodo(itemId, eventoAtualId = "") {
  const intervaloAtual = intervaloEventoAtual();
  if (!intervaloAtual.inicio || !intervaloAtual.fim) return 0;

  return eventos.reduce((total, evento) => {
    if (String(evento.id) === String(eventoAtualId)) return total;

    const itemEvento = Array.isArray(evento.itens_apoio)
      ? evento.itens_apoio.find(i => String(i.id) === String(itemId))
      : null;

    if (!itemEvento) return total;

    let inicioEvento = evento.montagem;
    let fimEvento = evento.desmontagem;

    if (!inicioEvento || !fimEvento) {
      if (!evento.data_evento) return total;
      inicioEvento = `${formatarDataCurtaDisponibilidade(evento.data_evento)}T${evento.hora_inicio || evento.hora_evento || "00:00"}`;
      fimEvento = `${formatarDataCurtaDisponibilidade(evento.data_evento)}T${evento.hora_termino || "23:59"}`;
    }

    if (periodosConflitam(intervaloAtual.inicio, intervaloAtual.fim, inicioEvento, fimEvento)) {
      return total + Number(itemEvento.quantidade || 0);
    }

    return total;
  }, 0);
}

function disponibilidadeApoioParaEvento(item, quantidadeDesejada = 0) {
  const eventoAtualId = document.getElementById("eventoId")?.value || "";
  const total = Number(item.quantidade_total || 0);
  const reservadoNoPeriodo = quantidadeApoioReservadaNoPeriodo(item.id, eventoAtualId);
  const disponivel = Math.max(total - reservadoNoPeriodo, 0);
  const quantidade = Number(quantidadeDesejada || 0);

  return {
    total,
    reservadoNoPeriodo,
    disponivel,
    ok: quantidade <= disponivel,
    texto: `Disponível na data: ${disponivel} de ${total}`
  };
}

function validarProdutosDoEvento() {
  const indisponiveis = produtosSelecionadosEventoAtual
    .map(p => ({ produto: p, disponibilidade: disponibilidadeProdutoParaEvento(p.id) }))
    .filter(item => !item.disponibilidade.livre);

  if (indisponiveis.length) {
    alert(
      "Não é possível salvar este evento. Existem produtos indisponíveis para a data/período:\n\n" +
      indisponiveis.map(item => `${item.produto.codigo || "Sem código"} — ${item.disponibilidade.texto}`).join("\n")
    );
    return false;
  }

  return true;
}

function validarApoioDoEvento() {
  const itens = obterApoioSelecionadoEvento();
  const problemas = [];

  itens.forEach(itemSelecionado => {
    const itemEstoque = estoqueApoio.find(item => String(item.id) === String(itemSelecionado.id));
    if (!itemEstoque) return;

    const disponibilidade = disponibilidadeApoioParaEvento(itemEstoque, itemSelecionado.quantidade);
    if (!disponibilidade.ok) {
      problemas.push(`${itemSelecionado.nome}: solicitado ${itemSelecionado.quantidade}, disponível ${disponibilidade.disponivel}`);
    }
  });

  if (problemas.length) {
    alert(
      "Não é possível salvar este evento. Quantidade insuficiente em mesas/cadeiras para a data/período:\n\n" +
      problemas.join("\n")
    );
    return false;
  }

  return true;
}

async function salvarEventoForm(event) {
  event.preventDefault();

  calcularRestanteEvento();

  if (!validarProdutosDoEvento()) return;
  if (!validarApoioDoEvento()) return;

  const id = document.getElementById("eventoId").value || gerarId();
  const existente = eventos.find(e => e.id === id);
  const tipoEvento = document.getElementById("eventoTipoEvento")?.value || "pontual";

  const evento = montarEventoRecorrenteBase(id, existente);

  if (tipoEvento === "recorrente" && !existente) {
    const inicioRec = document.getElementById("eventoRecorrenciaInicio")?.value || evento.data_evento;
    const fimRec = document.getElementById("eventoRecorrenciaFim")?.value || evento.data_evento;

    if (!inicioRec || !fimRec) {
      alert("Informe o início e o fim da recorrência.");
      return;
    }

    if (fimRec < inicioRec) {
      alert("O fim da recorrência precisa ser maior ou igual ao início.");
      return;
    }

    const ocorrencias = montarOcorrenciasRecorrentes(evento);

    if (!ocorrencias.length) {
      alert("Nenhuma ocorrência foi gerada para a recorrência informada.");
      return;
    }

    if (!confirm(`Serão criadas ${ocorrencias.length} ocorrências recorrentes. Continuar?`)) return;

    for (const ocorrencia of ocorrencias) {
      await garantirClienteDoEvento(ocorrencia);
      const salvo = await salvarEventoBanco(ocorrencia);
      if (!salvo) return;

      const i = eventos.findIndex(e => e.id === salvo.id);
      if (i >= 0) eventos[i] = salvo;
      else eventos.push(salvo);
    }

    fecharEventoModal();
    normalizarOrdemEventosGlobal();
    renderizarEventos();
    return;
  }

  evento.tipo_evento = tipoEvento;
  evento.recorrente = tipoEvento === "recorrente";
  evento.recorrencia_grupo_id = existente?.recorrencia_grupo_id || (tipoEvento === "recorrente" ? gerarId() : null);
  evento.recorrencia_tipo = tipoEvento === "recorrente" ? (document.getElementById("eventoRecorrenciaTipo")?.value || "mensal") : null;
  evento.recorrencia_dias = tipoEvento === "recorrente" ? Number(document.getElementById("eventoRecorrenciaDias")?.value || 30) : null;
  evento.recorrencia_inicio = tipoEvento === "recorrente" ? (document.getElementById("eventoRecorrenciaInicio")?.value || evento.data_evento) : null;
  evento.recorrencia_fim = tipoEvento === "recorrente" ? (document.getElementById("eventoRecorrenciaFim")?.value || evento.data_evento) : null;

  await garantirClienteDoEvento(evento);

  const salvo = await salvarEventoBanco(evento);
  if (!salvo) return;

  const i = eventos.findIndex(e => e.id === salvo.id);
  if (i >= 0) eventos[i] = salvo;
  else eventos.push(salvo);

  fecharEventoModal();
  normalizarOrdemEventosGlobal();
  renderizarEventos();
}

function filtrarEventos() {
  const busca = document.getElementById("buscaEvento").value.trim().toLowerCase();
  const data = document.getElementById("filtroEventoData").value;
  const cliente = document.getElementById("filtroEventoCliente").value.trim().toLowerCase();
  const telefone = document.getElementById("filtroEventoTelefone").value.trim().toLowerCase();
  const pagamento = document.getElementById("filtroEventoPagamento").value;

  return eventos.filter(e => {
    if (isEventoRecorrente(e)) return false;

    const produtosTxt = [...(e.tendas || []).map(p => `${p.codigo} ${p.categoria} ${p.tamanho}`), ...(e.itens_apoio || []).map(i => `${i.nome} ${i.quantidade}`)].join(" ");
    const texto = `${e.nome || ""} ${e.telefone || ""} ${e.endereco || ""} ${produtosTxt}`.toLowerCase();

    return (!busca || texto.includes(busca))
      && (!data || e.data_evento === data)
      && (!cliente || String(e.nome || "").toLowerCase().includes(cliente))
      && (!telefone || String(e.telefone || "").toLowerCase().includes(telefone))
      && (!pagamento || (pagamento === "quitado" ? e.pagamento_quitado : !e.pagamento_quitado));
  });
}


function filtrarEventosRecorrentes() {
  const busca = document.getElementById("buscaEvento").value.trim().toLowerCase();
  const data = document.getElementById("filtroEventoData").value;
  const cliente = document.getElementById("filtroEventoCliente").value.trim().toLowerCase();
  const telefone = document.getElementById("filtroEventoTelefone").value.trim().toLowerCase();
  const pagamento = document.getElementById("filtroEventoPagamento").value;

  return eventos.filter(e => {
    if (!isEventoRecorrente(e)) return false;

    const produtosTxt = [...(e.tendas || []).map(p => `${p.codigo} ${p.categoria} ${p.tamanho}`), ...(e.itens_apoio || []).map(i => `${i.nome} ${i.quantidade}`)].join(" ");
    const texto = `${e.nome || ""} ${e.telefone || ""} ${e.endereco || ""} ${produtosTxt}`.toLowerCase();

    return (!busca || texto.includes(busca))
      && (!data || e.data_evento === data)
      && (!cliente || String(e.nome || "").toLowerCase().includes(cliente))
      && (!telefone || String(e.telefone || "").toLowerCase().includes(telefone))
      && (!pagamento || (pagamento === "quitado" ? e.pagamento_quitado : !e.pagamento_quitado));
  }).sort((a, b) => String(a.data_evento || "").localeCompare(String(b.data_evento || "")));
}




function dataEventoCompactaVisual(dataISO) {
  if (!dataISO) return "-";

  const partes = String(dataISO).split("-");
  if (partes.length < 3) return dataISO;

  const data = new Date(`${dataISO}T12:00:00`);

  const dias = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

  const dd = partes[2];
  const mm = partes[1];
  const aa = partes[0].slice(-2);

  return `<span class="event-date-strong">${dd}/${mm}/${aa}</span> <span class="event-weekday-light">${dias[data.getDay()]}</span>`;
}

function horarioEventoAbaixoData(e) {
  const inicio = formatarHoraCurta(e.hora_inicio || e.hora_evento || "");
  const fim = formatarHoraCurta(e.hora_termino || "");

  if (inicio && fim) return `${inicio} às ${fim}`;
  return inicio || "";
}

function dataHoraCurtaEvento(valor) {
  return formatarDataHoraCurta(valor);
}

function montagemDesmontagemCompacta(e) {
  const montagem = dataHoraCurtaEvento(e.montagem);
  const desmontagem = dataHoraCurtaEvento(e.desmontagem);

  if (montagem && desmontagem) {
    return `<span class="md-line"><b>M:</b> ${montagem}</span><span class="md-line"><b>D:</b> ${desmontagem}</span>`;
  }

  if (montagem) return `<span class="md-line"><b>M:</b> ${montagem}</span>`;
  if (desmontagem) return `<span class="md-line"><b>D:</b> ${desmontagem}</span>`;

  return "-";
}

function resumoProdutosEvento(e) {
  const tendas = (e.tendas || []).map(p => {
    const nome = [p.categoria, p.tamanho, p.cor].filter(Boolean).join(" ");
    return `${p.codigo || "Sem código"}${nome ? " — " + nome : ""}`;
  }).filter(Boolean);

  const apoio = (e.itens_apoio || []).map(i => `${i.nome} (${i.quantidade})`);
  const extras = (e.produtos_extras || []).map(i => `${i.descricao} (${i.quantidade})`);

  const todos = [...tendas, ...apoio, ...extras];

  return todos.length ? todos.join("<br>") : "-";
}

function renderizarEventos() {
  normalizarOrdemEventosGlobal();

  const tbody = document.getElementById("eventosTbody");
  const tbodyRec = document.getElementById("eventosRecorrentesTbody");

  const tabelaPrincipalEventos = tbody ? tbody.closest("table") : null;
  const tabelaRecorrentesEventos = tbodyRec ? tbodyRec.closest("table") : null;

  if (tabelaPrincipalEventos) {
    tabelaPrincipalEventos.classList.add("eventos-tabela-principal");
    tabelaPrincipalEventos.classList.remove("eventos-tabela-recorrentes");
  }

  if (tabelaRecorrentesEventos) {
    tabelaRecorrentesEventos.classList.add("eventos-tabela-recorrentes");
    tabelaRecorrentesEventos.classList.remove("eventos-tabela-principal");
  }

  if (!tbody) return;

  const lista = filtrarEventos();
  const recorrentes = filtrarEventosRecorrentes();

  document.getElementById("eventosTotal").textContent = lista.length + recorrentes.length;
  document.getElementById("eventosEmAberto").textContent = [...lista, ...recorrentes].filter(e => !e.pagamento_quitado).length;

  if (!lista.length) {
    tbody.innerHTML = `<tr><td colspan="12" class="empty">Nenhum evento pontual cadastrado.</td></tr>`;
  } else {
    tbody.innerHTML = lista.map(e => `
      <tr class="${e.pagamento_quitado ? "" : "payment-open"}">
        <td class="clientes-actions"><div class="clientes-actions-row">${dataEventoCompactaVisual(e.data_evento)}
          <small class="weekday-badge">${typeof diaSemanaTexto === "function" ? diaSemanaTexto(e.data_evento) : diaSemana(e.data_evento)}</small>
          <small class="event-hour-under">${horarioEventoAbaixoData(e) || "-"}</small>
        </td>
        <td class="mont-desm-cell">${montagemDesmontagemCompacta(e)}</td>
        <td><button class="code-link" data-action="detalhe" data-id="${e.id}">${e.nome || "-"}</button></td>
        <td>${e.telefone || "-"}</td>
        <td><div class="cell-scroll cell-endereco">${e.endereco || "-"}</div></td>
        <td>
          <div class="cell-scroll cell-produtos">
            <button class="product-list-button" data-action="editar-produtos" data-id="${e.id}">
              ${resumoProdutosEvento(e)}
            </button>
          </div>
        </td>
        <td>${dinheiro(e.valor_total)}</td>
        <td>${dinheiro(e.valor_sinal)}</td>
        <td>${dinheiro(e.valor_restante)}</td>
        <td>${e.pagamento_quitado ? "Quitado" : "Em aberto"}</td>
        <td>${e.colaborador || "-"}</td>
        <td class="actions clientes-actions"><div class="clientes-actions-row"><button data-action="editar" data-id="${e.id}">Editar</button>
          <button class="btn-outline" data-action="excluir" data-id="${e.id}">Excluir</button></div></td>
      </tr>
    `).join("");
  }

  tbody.querySelectorAll("button[data-action]").forEach(btn => btn.addEventListener("click", lidarAcaoEvento));

  if (!tbodyRec) return;

  if (!recorrentes.length) {
    tbodyRec.innerHTML = `<tr><td colspan="11" class="empty">Nenhum evento recorrente cadastrado.</td></tr>`;
    return;
  }

  tbodyRec.innerHTML = recorrentes.map(e => `
    <tr class="recurring-row ${e.pagamento_quitado ? "" : "payment-open"}">
      <td class="clientes-actions"><div class="clientes-actions-row">${dataCompactaComDiaRecorrente(e.data_evento)}</td>
      <td>${periodoRecorrenciaTexto(e)}</td>
      <td>${recorrenciaLabel(e.recorrencia_tipo, e.recorrencia_dias)}</td>
      <td><button class="code-link" data-action="detalhe" data-id="${e.id}">${e.nome || "-"}</button></td>
      <td>${e.telefone || "-"}</td>
      <td><div class="cell-scroll cell-endereco">${e.endereco || "-"}</div></td>
      <td>
        <div class="cell-scroll cell-produtos">
          <button class="product-list-button" data-action="editar-produtos" data-id="${e.id}">
            ${resumoProdutosEvento(e)}
          </button>
        </div>
      </td>
      <td>${dinheiro(e.valor_total)}</td>
      <td>${e.pagamento_quitado ? "Quitado" : "Em aberto"}</td>
      <td>${e.colaborador || "-"}</td>
      <td class="actions clientes-actions"><div class="clientes-actions-row"><button data-action="editar" data-id="${e.id}">Editar</button>
        <button class="btn-outline" data-action="excluir" data-id="${e.id}">Excluir</button></div></td>
    </tr>
  `).join("");

  tbodyRec.querySelectorAll("button[data-action]").forEach(btn => btn.addEventListener("click", lidarAcaoEvento));
}

async function lidarAcaoEvento(event) {
  const action = event.currentTarget.dataset.action;
  const id = event.currentTarget.dataset.id;

  if (action === "editar") return abrirEditarEvento(id);
  if (action === "editar-produtos") return abrirProdutosRapido(id);
  if (action === "detalhe") return abrirDetalheEvento(id);

  if (action === "excluir") {
    const e = eventos.find(x => x.id === id);
    if (!confirm(`Excluir o evento de ${e?.nome || ""}?`)) return;

    const ok = await excluirEventoBanco(id);
    if (!ok) return;

    eventos = eventos.filter(x => x.id !== id);
    normalizarOrdemEventosGlobal();
    renderizarEventos();
  }
}



function produtoMesmoModelo(a, b) {
  if (!a || !b) return false;

  const catA = String(a.categoria || "").toLowerCase().trim();
  const catB = String(b.categoria || "").toLowerCase().trim();
  const tamA = String(a.tamanho || "").toLowerCase().trim();
  const tamB = String(b.tamanho || "").toLowerCase().trim();

  return catA === catB && tamA === tamB;
}

function descricaoProdutoCompacta(produto) {
  return [
    produto.codigo,
    produto.categoria,
    produto.tamanho,
    produto.cor
  ].filter(Boolean).join(" — ");
}

function statusProdutoBloqueiaTrocaRapida(produto) {
  const status = String(produto?.status || "").toLowerCase().trim();

  if (!status) return false;

  const statusLivre = [
    "livre",
    "livre para locação",
    "livre para locacao",
    "disponível",
    "disponivel"
  ];

  if (statusLivre.includes(status)) return false;

  return [
    "alugada",
    "alugado",
    "ocupada",
    "ocupado",
    "reservada",
    "reservado",
    "manutenção",
    "manutencao",
    "precisa manutenção",
    "precisa manutencao",
    "limpar",
    "consertar"
  ].some(palavra => status.includes(palavra));
}

function textoStatusProdutoTrocaRapida(produto) {
  const statusOriginal = String(produto?.status || "").trim();
  if (!statusOriginal) return "Ocupada";
  return statusOriginal.charAt(0).toUpperCase() + statusOriginal.slice(1);
}

function abrirTrocaRapidaProduto(index) {
  const atual = produtosRapidoAtual[index];
  const evento = eventoProdutosRapidoAtual();

  if (!atual || !evento) return;

  const opcoesTroca = (produtos || [])
    .filter(p => {
      if (String(p.id || "") === String(atual.id || "")) return false;
      if (String(p.codigo || "").trim() && String(p.codigo || "").trim() === String(atual.codigo || "").trim()) return false;
      return produtoMesmoModelo(p, atual);
    })
    .map(p => {
      const disponibilidade = produtoEstaDisponivelNoEvento(p, evento, index);
      const bloqueadoPorStatus = statusProdutoBloqueiaTrocaRapida(p);
      const livre = disponibilidade.livre && !bloqueadoPorStatus;

      let texto = "Disponível";
      let classe = "free";

      if (bloqueadoPorStatus) {
        texto = textoStatusProdutoTrocaRapida(p);
        classe = "busy";
      } else if (!disponibilidade.livre) {
        texto = disponibilidade.texto || "Ocupada";
        classe = disponibilidade.classe || "busy";
      }

      return {
        produto: p,
        livre,
        texto,
        classe
      };
    });

  if (!opcoesTroca.length) {
    alert("Não há outro produto compatível com a mesma categoria e tamanho.");
    return;
  }

  const opcoesLivres = opcoesTroca.filter(item => item.livre);

  let dialog = document.getElementById("trocaRapidaProdutoDialog");

  if (!dialog) {
    dialog = document.createElement("dialog");
    dialog.id = "trocaRapidaProdutoDialog";
    dialog.className = "troca-rapida-dialog";
    document.body.appendChild(dialog);
  }

  dialog.innerHTML = `
    <div class="troca-rapida-header">
      <h3>Alterar produto</h3>
      <button type="button" class="troca-rapida-fechar" aria-label="Fechar">×</button>
    </div>

    <div class="troca-rapida-atual">
      <span>Produto atual</span>
      <strong>${descricaoProdutoCompacta(atual)}</strong>
    </div>

    <label class="troca-rapida-select-label">
      Substituir por
      <select id="trocaRapidaProdutoSelect">
        <option value="">Selecione um produto compatível disponível</option>
        ${opcoesTroca.map(item => `
          <option value="${item.produto.id}" ${item.livre ? "" : "disabled"}>
            ${descricaoProdutoCompacta(item.produto)} — ${item.livre ? "Disponível" : item.texto}
          </option>
        `).join("")}
      </select>
    </label>

    <div class="troca-rapida-lista">
      ${opcoesTroca.map(item => `
        <button
          type="button"
          class="troca-rapida-opcao ${item.livre ? "" : "troca-rapida-opcao-bloqueada"}"
          data-troca-produto-id="${item.produto.id}"
          ${item.livre ? "" : "disabled"}
          title="${item.livre ? "Disponível para troca" : item.texto}"
        >
          <strong>${item.produto.codigo || "-"}</strong>
          <span>${[item.produto.categoria || item.produto.tipo, item.produto.tamanho, item.produto.cor].filter(Boolean).join(" ")}</span>
          <em class="troca-rapida-status ${item.livre ? "ok" : "bloqueado"}">${item.livre ? "Disponível" : item.texto}</em>
        </button>
      `).join("")}
    </div>

    ${opcoesLivres.length ? "" : `<p class="troca-rapida-alerta">Todos os produtos compatíveis estão ocupados, alugados ou indisponíveis neste período.</p>`}

    <div class="troca-rapida-actions">
      <button type="button" class="btn-outline troca-rapida-cancelar">Cancelar</button>
      <button type="button" class="btn-primary troca-rapida-confirmar" ${opcoesLivres.length ? "" : "disabled"}>Alterar</button>
    </div>
  `;

  function confirmarTroca(produtoId) {
    const itemEscolhido = opcoesTroca.find(item => String(item.produto.id) === String(produtoId));

    if (!itemEscolhido) {
      alert("Selecione um produto substituto.");
      return;
    }

    if (!itemEscolhido.livre) {
      alert(itemEscolhido.texto || "Este produto não está disponível para este evento.");
      return;
    }

    const novoProduto = itemEscolhido.produto;

    const validacao = produtoEstaDisponivelNoEvento(novoProduto, evento, index);
    if (!validacao.livre || statusProdutoBloqueiaTrocaRapida(novoProduto)) {
      alert(validacao.texto || textoStatusProdutoTrocaRapida(novoProduto) || "Este produto não está disponível para este evento.");
      return;
    }

    produtosRapidoAtual[index] = {
      id: novoProduto.id,
      codigo: novoProduto.codigo || "",
      categoria: novoProduto.categoria || novoProduto.tipo || "",
      tipo: novoProduto.tipo || novoProduto.categoria || "",
      tamanho: novoProduto.tamanho || "",
      cor: novoProduto.cor || ""
    };

    dialog.close();
    popularSelectProdutosRapido();
    renderizarProdutosRapido();
  }

  dialog.querySelector(".troca-rapida-fechar").addEventListener("click", () => dialog.close());
  dialog.querySelector(".troca-rapida-cancelar").addEventListener("click", () => dialog.close());

  dialog.querySelector(".troca-rapida-confirmar").addEventListener("click", () => {
    confirmarTroca(dialog.querySelector("#trocaRapidaProdutoSelect").value);
  });

  dialog.querySelectorAll("[data-troca-produto-id]:not(:disabled)").forEach(btn => {
    btn.addEventListener("click", () => confirmarTroca(btn.dataset.trocaProdutoId));
  });

  dialog.showModal();
}

function abrirProdutosRapido(id) {
  const evento = eventos.find(e => String(e.id) === String(id));
  if (!evento) return;

  document.getElementById("eventoProdutosRapidoId").value = evento.id;
  document.getElementById("eventoProdutosRapidoTitulo").textContent = `Alterar produtos — ${evento.nome || "Evento"}`;

  produtosRapidoAtual = Array.isArray(evento.tendas) ? [...evento.tendas] : [];
  apoioRapidoAtual = Array.isArray(evento.itens_apoio) ? [...evento.itens_apoio] : [];

  popularSelectProdutosRapido();
  renderizarProdutosRapido();
  renderizarApoioRapido();

  document.getElementById("eventoProdutosRapidoDialog").showModal();
}

function fecharProdutosRapido() {
  document.getElementById("eventoProdutosRapidoDialog").close();
}

function eventoProdutosRapidoAtual() {
  const id = document.getElementById("eventoProdutosRapidoId").value;
  return eventos.find(e => String(e.id) === String(id));
}

function disponibilidadeProdutoRapido(produtoId) {
  const evento = eventoProdutosRapidoAtual();
  if (!evento) return { livre: true, texto: "Livre", classe: "free" };

  const produto = (Array.isArray(produtos) ? produtos : []).find(p => String(p.id) === String(produtoId)) || { id: produtoId };
  return produtoEstaDisponivelNoEvento(produto, evento, -1);
}

function popularSelectProdutosRapido() {
  const select = document.getElementById("eventoProdutoRapidoSelect");
  if (!select) return;

  const selecionados = produtosRapidoAtual.map(p => String(p.id));
  const disponiveis = (Array.isArray(produtos) ? produtos : [])
    .filter(p => (p.categoria || p.tipo) !== "Mesas/Cadeiras")
    .filter(p => !selecionados.includes(String(p.id)));

  select.innerHTML = `<option value="">Selecione um produto para adicionar</option>` + disponiveis.map(p => {
    const disp = disponibilidadeProdutoRapido(p.id);
    return `
      <option value="${p.id}" ${disp.livre ? "" : "disabled"}>
        ${p.codigo || "Sem código"} — ${p.categoria || p.tipo || "-"} ${p.tamanho || ""} ${p.cor || ""} | ${disp.texto}
      </option>
    `;
  }).join("");
}

function adicionarProdutoRapido() {
  const select = document.getElementById("eventoProdutoRapidoSelect");
  const id = select.value;
  if (!id) return;

  const produto = produtos.find(p => String(p.id) === String(id));
  if (!produto) return;

  const disp = disponibilidadeProdutoRapido(produto.id);
  if (!disp.livre) {
    alert("Este produto está indisponível para este evento.");
    select.value = "";
    return;
  }

  produtosRapidoAtual.push({
    id: produto.id,
    codigo: produto.codigo || "",
    categoria: produto.categoria || produto.tipo || "",
    tamanho: produto.tamanho || "",
    cor: produto.cor || ""
  });

  select.value = "";
  popularSelectProdutosRapido();
  renderizarProdutosRapido();
}

function removerProdutoRapido(id) {
  produtosRapidoAtual = produtosRapidoAtual.filter(p => String(p.id) !== String(id));
  popularSelectProdutosRapido();
  renderizarProdutosRapido();
}

function renderizarProdutosRapido() {
  const container = document.getElementById("eventoProdutosRapidoSelecionados");
  if (!container) return;

  if (!produtosRapidoAtual.length) {
    container.innerHTML = `<p class="empty">Nenhum produto selecionado.</p>`;
    return;
  }

  container.innerHTML = produtosRapidoAtual.map((produto, index) => {
    const disponibilidade = disponibilidadeProdutoRapido(produto.id);
    const classe = disponibilidade.classe || "neutral";
    const textoDisponibilidade = disponibilidade.texto || "Disponibilidade não verificada";

    return `
      <div class="produto-rapido-row">
        <div class="produto-rapido-info">
          <strong>${produto.codigo || "-"}</strong>
          <span>${[produto.categoria, produto.tamanho, produto.cor].filter(Boolean).join(" ")}</span>
          <em class="availability ${classe}">${textoDisponibilidade}</em>
        </div>

        <div class="produto-rapido-actions">
          <button type="button" class="btn-outline produto-alterar-btn" data-produto-rapido-alterar="${index}">
            Alterar
          </button>
          <button type="button" class="btn-outline produto-remover-btn" data-produto-rapido-remover="${index}">
            Remover
          </button>
        </div>
      </div>
    `;
  }).join("");

  container.querySelectorAll("[data-produto-rapido-remover]").forEach(btn => {
    btn.addEventListener("click", () => {
      produtosRapidoAtual.splice(Number(btn.dataset.produtoRapidoRemover), 1);
      renderizarProdutosRapido();
    });
  });

  container.querySelectorAll("[data-produto-rapido-alterar]").forEach(btn => {
    btn.addEventListener("click", () => {
      abrirTrocaRapidaProduto(Number(btn.dataset.produtoRapidoAlterar));
    });
  });
}

function intervaloDoEvento(evento) {
  if (!evento) return { inicio: null, fim: null };

  const inicio = evento.montagem || (evento.data_evento ? `${formatarDataCurtaDisponibilidade(evento.data_evento)}T${evento.hora_inicio || evento.hora_evento || "00:00"}` : null);
  const fim = evento.desmontagem || (evento.data_evento ? `${formatarDataCurtaDisponibilidade(evento.data_evento)}T${evento.hora_termino || "23:59"}` : null);

  return { inicio, fim };
}

function quantidadeApoioReservadaNoPeriodoDoEvento(itemId, eventoBase) {
  const intervaloBase = intervaloDoEvento(eventoBase);
  if (!intervaloBase.inicio || !intervaloBase.fim) return 0;

  return eventos.reduce((total, evento) => {
    if (String(evento.id) === String(eventoBase.id)) return total;

    const itemEvento = Array.isArray(evento.itens_apoio)
      ? evento.itens_apoio.find(i => String(i.id) === String(itemId))
      : null;

    if (!itemEvento) return total;

    const intervaloOutro = intervaloDoEvento(evento);

    if (periodosConflitam(intervaloBase.inicio, intervaloBase.fim, intervaloOutro.inicio, intervaloOutro.fim)) {
      return total + Number(itemEvento.quantidade || 0);
    }

    return total;
  }, 0);
}

function renderizarApoioRapido() {
  const area = document.getElementById("eventoApoioRapidoLista");
  if (!area) return;

  const evento = eventoProdutosRapidoAtual();

  if (!Array.isArray(estoqueApoio) || !estoqueApoio.length) {
    area.innerHTML = `<p class="empty">Nenhum item de apoio cadastrado.</p>`;
    return;
  }

  area.innerHTML = estoqueApoio.map(item => {
    const selecionado = apoioRapidoAtual.find(s => String(s.id) === String(item.id) || s.nome === item.nome);
    const total = Number(item.quantidade_total || 0);
    const reservadoNoPeriodo = evento ? quantidadeApoioReservadaNoPeriodoDoEvento(item.id, evento) : 0;
    const disponivelNaData = Math.max(total - reservadoNoPeriodo, 0);
    const valorOriginal = selecionado ? Number(selecionado.quantidade || 0) : 0;
    const maxPermitido = disponivelNaData;
    const valor = Math.min(valorOriginal, maxPermitido);

    return `
      <label class="apoio-evento-item apoio-rapido-item">
        <span>
          <strong>${item.nome}</strong>
          <small>Total: ${total} | Já reservado na data: ${reservadoNoPeriodo} | Máximo para este evento: ${maxPermitido}</small>
        </span>
        <input type="number" min="0" max="${maxPermitido}" step="1" data-apoio-rapido-id="${item.id}" data-apoio-rapido-nome="${item.nome}" value="${valor}">
      </label>
    `;
  }).join("");

  area.querySelectorAll("input[type='number']").forEach(input => {
    input.addEventListener("input", () => {
      const max = Number(input.max || 0);
      const valor = Number(input.value || 0);

      if (valor > max) {
        input.value = max;
        alert(`Quantidade máxima disponível para este evento: ${max}`);
      }

      if (valor < 0) input.value = 0;
    });
  });
}

function obterApoioRapidoSelecionado() {
  return [...document.querySelectorAll("#eventoApoioRapidoLista input[type='number']")]
    .map(input => {
      const quantidade = Number(input.value || 0);
      if (quantidade <= 0) return null;

      return {
        id: input.dataset.apoioRapidoId,
        nome: input.dataset.apoioRapidoNome,
        quantidade
      };
    })
    .filter(Boolean);
}

async function salvarProdutosRapido() {
  const id = document.getElementById("eventoProdutosRapidoId").value;
  const evento = eventos.find(e => String(e.id) === String(id));
  if (!evento) return;

  const apoioSelecionado = obterApoioRapidoSelecionado();
  const problemas = [];

  apoioSelecionado.forEach(itemSelecionado => {
    const itemEstoque = estoqueApoio.find(item => String(item.id) === String(itemSelecionado.id));
    if (!itemEstoque) return;

    const total = Number(itemEstoque.quantidade_total || 0);
    const reservadoNoPeriodo = quantidadeApoioReservadaNoPeriodoDoEvento(itemEstoque.id, evento);
    const disponivelParaEsteEvento = Math.max(total - reservadoNoPeriodo, 0);

    if (Number(itemSelecionado.quantidade || 0) > disponivelParaEsteEvento) {
      problemas.push(`${itemSelecionado.nome}: solicitado ${itemSelecionado.quantidade}, disponível ${disponivelParaEsteEvento}`);
    }
  });

  if (problemas.length) {
    alert(
      "Não é possível salvar. Quantidade insuficiente para este período:\\n\\n" +
      problemas.join("\\n")
    );
    return;
  }

  evento.tendas = produtosRapidoAtual;
  evento.itens_apoio = apoioSelecionado;
  evento.atualizado_em = new Date().toISOString();

  const salvo = await salvarEventoBanco(evento);
  if (!salvo) return;

  const index = eventos.findIndex(e => String(e.id) === String(id));
  if (index >= 0) eventos[index] = salvo;

  fecharProdutosRapido();
  normalizarOrdemEventosGlobal();
  renderizarEventos();

  window.dispatchEvent(new CustomEvent("riotendas:eventos-atualizados"));
}

function abrirDetalheEvento(id) {
  const e = eventos.find(x => x.id === id);
  if (!e) return;

  document.getElementById("eventoDetalheTitulo").textContent = `Evento — ${e.nome || ""}`;

  document.getElementById("eventoDetalheConteudo").innerHTML = `
    <div class="detail-actions-top">
      <button type="button" class="btn-primary detalhe-editar-btn" data-detalhe-editar="${e.id}">Editar evento</button>
    </div>

    <div class="info-grid detalhe-compacto">
      <div class="info-box linha-data">
        <span>Data</span>
        <strong>${formatarDataCurta(e.data_evento)}</strong>
      </div>
      <div class="info-box linha-inicio">
        <span>Início</span>
        <strong>${formatarHoraCurta(e.hora_inicio || e.hora_evento || '-')}</strong>
      </div>
      <div class="info-box linha-termino">
        <span>Término</span>
        <strong>${formatarHoraCurta(e.hora_termino || '-')}</strong>
      </div>
      <div class="info-box linha-montagem">
        <span>Montagem</span>
        <strong>${textoHorarioOperacaoSeguro(e.montagem_tipo, e.montagem)}</strong>
      </div>
      <div class="info-box linha-desmontagem">
        <span>Desmontagem</span>
        <strong>${textoHorarioOperacaoSeguro(e.desmontagem_tipo, e.desmontagem)}</strong>
      </div>

      <div class="info-box linha-cliente">
        <span>Cliente</span>
        <strong>${e.nome || "-"}</strong>
      </div>
      <div class="info-box linha-tipo">
        <span>Tipo</span>
        <strong>${isEventoRecorrente(e) ? "Recorrente" : "Pontual"}</strong>
      </div>
      <div class="info-box linha-telefone">
        <span>Telefone</span>
        <strong>${e.telefone || "-"}</strong>
      </div>

      <div class="info-box linha-endereco">
        <span>Endereço</span>
        <strong>${e.endereco || "-"}</strong>
      </div>

      <div class="info-box linha-pagamento">
        <span>Pagamento</span>
        <strong>${e.pagamento_quitado ? "Quitado" : "Em aberto"}</strong>
      </div>
      <div class="info-box linha-total">
        <span>Total</span>
        <strong>${dinheiro(e.valor_total)}</strong>
      </div>
      <div class="info-box linha-sinal">
        <span>Sinal</span>
        <strong>${dinheiro(e.valor_sinal)}</strong>
      </div>
      <div class="info-box linha-restante">
        <span>Restante</span>
        <strong>${dinheiro(e.valor_restante)}</strong>
      </div>
      <div class="info-box linha-colaborador">
        <span>Colaborador</span>
        <strong>${e.colaborador || "-"}</strong>
      </div>
    </div>

    <h4>Produtos</h4>
    <div class="detail-products">${resumoProdutosEvento(e)}</div>

    <div class="subpanel detalhe-pagamento-forma">
      <h3>Forma de pagamento</h3>
      <p>${e.forma_pagamento || "-"}</p>
    </div>
  `;

  const btnEditar = document.querySelector("[data-detalhe-editar]");
  if (btnEditar) {
    btnEditar.addEventListener("click", () => {
      document.getElementById("eventoDetalheDialog").close();
      abrirEditarEvento(btnEditar.dataset.detalheEditar);
    });
  }

  document.getElementById("eventoDetalheDialog").showModal();
}

document.addEventListener("DOMContentLoaded", iniciarEventos);

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
