
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
  return `${partes[2]}/${partes[1]}/${partes[0]}`;
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
  if (!supabaseClient) {
    const i = eventos.findIndex(e => e.id === evento.id);
    if (i >= 0) eventos[i] = evento;
    else eventos.push(evento);
    localStorage.setItem(storageEventosKey, JSON.stringify(eventos));
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

  return data;
}

async function excluirEventoBanco(id) {
  if (!supabaseClient) {
    eventos = eventos.filter(e => e.id !== id);
    localStorage.setItem(storageEventosKey, JSON.stringify(eventos));
    return true;
  }

  const { error } = await supabaseClient.from("eventos").delete().eq("id", id);

  if (error) {
    alert("Erro ao excluir evento: " + (error.message || ""));
    return false;
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
  onEventoSeguro("adicionarProdutoEvento", "click", adicionarProdutoSelecionadoAoEvento);
  const btnExtraEvento = document.getElementById("adicionarExtraEvento");
  if (btnExtraEvento) btnExtraEvento.addEventListener("click", adicionarExtraAoEvento);
  document.getElementById("fecharEventoProdutosRapido").addEventListener("click", fecharProdutosRapido);
  document.getElementById("cancelarEventoProdutosRapido").addEventListener("click", fecharProdutosRapido);
  document.getElementById("adicionarProdutoRapido").addEventListener("click", adicionarProdutoRapido);
  document.getElementById("salvarEventoProdutosRapido").addEventListener("click", salvarProdutosRapido);

  ["eventoData", "eventoHoraInicio", "eventoHoraTermino", "eventoMontagem", "eventoDesmontagem"].forEach(id => {
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
    montagem_tipo: document.getElementById("eventoMontagemTipo").value || "A partir de",
    montagem: document.getElementById("eventoMontagem").value || null,
    desmontagem_tipo: document.getElementById("eventoDesmontagemTipo").value || "A partir de",
    desmontagem: document.getElementById("eventoDesmontagem").value || null,
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

function abrirNovoEvento() {
  document.getElementById("eventoForm").reset();
  document.getElementById("eventoId").value = "";
  document.getElementById("eventoModalTitulo").textContent = "Novo evento";
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
  document.getElementById("eventoMontagemTipo").value = e.montagem_tipo || "A partir de";
  document.getElementById("eventoMontagem").value = e.montagem ? String(e.montagem).slice(0,16) : "";
  document.getElementById("eventoDesmontagemTipo").value = e.desmontagem_tipo || "A partir de";
  document.getElementById("eventoDesmontagem").value = e.desmontagem ? String(e.desmontagem).slice(0,16) : "";
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

function disponibilidadeProdutoParaEvento(produtoId) {
  const eventoAtualId = document.getElementById("eventoId")?.value || "";
  const intervaloAtual = intervaloEventoAtual();

  if (!intervaloAtual.inicio || !intervaloAtual.fim) {
    return { livre: true, texto: "Defina a data para verificar", classe: "neutral" };
  }

  const conflito = eventos.find(evento => {
    if (String(evento.id) === String(eventoAtualId)) return false;

    const usaProduto = Array.isArray(evento.tendas) && evento.tendas.some(p => String(p.id) === String(produtoId));
    if (!usaProduto) return false;

    let inicioEvento = evento.montagem;
    let fimEvento = evento.desmontagem;

    if (!inicioEvento || !fimEvento) {
      if (!evento.data_evento) return false;
      inicioEvento = `${evento.data_evento}T${evento.hora_inicio || evento.hora_evento || "00:00"}`;
      fimEvento = `${evento.data_evento}T${evento.hora_termino || "23:59"}`;
    }

    return periodosConflitam(intervaloAtual.inicio, intervaloAtual.fim, inicioEvento, fimEvento);
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
      inicioEvento = `${evento.data_evento}T${evento.hora_inicio || evento.hora_evento || "00:00"}`;
      fimEvento = `${evento.data_evento}T${evento.hora_termino || "23:59"}`;
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
  const tbody = document.getElementById("eventosTbody");
  const tbodyRec = document.getElementById("eventosRecorrentesTbody");
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
        <td>${dataBR(e.data_evento)} <small class="weekday-badge">${typeof diaSemanaTexto === "function" ? diaSemanaTexto(e.data_evento) : diaSemana(e.data_evento)}</small></td>
        <td>${e.hora_inicio || e.hora_evento || "-"}${e.hora_termino ? " às " + e.hora_termino : ""}</td>
        <td><button class="code-link" data-action="detalhe" data-id="${e.id}">${e.nome || "-"}</button></td>
        <td>${e.telefone || "-"}</td>
        <td>${e.endereco || "-"}</td>
        <td>
          <button class="product-list-button" data-action="editar-produtos" data-id="${e.id}">
            ${resumoProdutosEvento(e)}
          </button>
        </td>
        <td>${dinheiro(e.valor_total)}</td>
        <td>${dinheiro(e.valor_sinal)}</td>
        <td>${dinheiro(e.valor_restante)}</td>
        <td>${e.pagamento_quitado ? "Quitado" : "Em aberto"}</td>
        <td>${e.colaborador || "-"}</td>
        <td class="actions">
          <button data-action="editar" data-id="${e.id}">Editar</button>
          <button class="btn-outline" data-action="excluir" data-id="${e.id}">Excluir</button>
        </td>
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
      <td>${dataBR(e.data_evento)} <small class="weekday-badge">${typeof diaSemanaTexto === "function" ? diaSemanaTexto(e.data_evento) : diaSemana(e.data_evento)}</small></td>
      <td>${periodoRecorrenciaTexto(e)}</td>
      <td>${recorrenciaLabel(e.recorrencia_tipo, e.recorrencia_dias)}</td>
      <td><button class="code-link" data-action="detalhe" data-id="${e.id}">${e.nome || "-"}</button></td>
      <td>${e.telefone || "-"}</td>
      <td>${e.endereco || "-"}</td>
      <td>
        <button class="product-list-button" data-action="editar-produtos" data-id="${e.id}">
          ${resumoProdutosEvento(e)}
        </button>
      </td>
      <td>${dinheiro(e.valor_total)}</td>
      <td>${e.pagamento_quitado ? "Quitado" : "Em aberto"}</td>
      <td>${e.colaborador || "-"}</td>
      <td class="actions">
        <button data-action="editar" data-id="${e.id}">Editar</button>
        <button class="btn-outline" data-action="excluir" data-id="${e.id}">Excluir</button>
      </td>
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
    renderizarEventos();
  }
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

  const inicio = evento.montagem || (evento.data_evento ? `${evento.data_evento}T${evento.hora_inicio || evento.hora_evento || "00:00"}` : null);
  const fim = evento.desmontagem || (evento.data_evento ? `${evento.data_evento}T${evento.hora_termino || "23:59"}` : null);

  if (!inicio || !fim) return { livre: true, texto: "Sem data definida", classe: "neutral" };

  const conflito = eventos.find(outro => {
    if (String(outro.id) === String(evento.id)) return false;

    const usaProduto = Array.isArray(outro.tendas) && outro.tendas.some(p => String(p.id) === String(produtoId));
    if (!usaProduto) return false;

    const inicioOutro = outro.montagem || (outro.data_evento ? `${outro.data_evento}T${outro.hora_inicio || outro.hora_evento || "00:00"}` : null);
    const fimOutro = outro.desmontagem || (outro.data_evento ? `${outro.data_evento}T${outro.hora_termino || "23:59"}` : null);

    return periodosConflitam(inicio, fim, inicioOutro, fimOutro);
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
  const area = document.getElementById("eventoProdutosRapidoSelecionados");
  if (!area) return;

  if (!produtosRapidoAtual.length) {
    area.innerHTML = `<p class="empty">Nenhum produto com código selecionado.</p>`;
    return;
  }

  area.innerHTML = produtosRapidoAtual.map(p => {
    const disp = disponibilidadeProdutoRapido(p.id);
    return `
      <div class="selected-item">
        <span>
          <strong>${p.codigo || "Sem código"}</strong> — ${p.categoria || ""} ${p.tamanho || ""} ${p.cor || ""}
          <small class="availability-badge ${disp.classe}">${disp.texto}</small>
        </span>
        <button type="button" class="btn-outline" data-remover-produto-rapido="${p.id}">Remover</button>
      </div>
    `;
  }).join("");

  area.querySelectorAll("[data-remover-produto-rapido]").forEach(btn => {
    btn.addEventListener("click", () => removerProdutoRapido(btn.dataset.removerProdutoRapido));
  });
}

function intervaloDoEvento(evento) {
  if (!evento) return { inicio: null, fim: null };

  const inicio = evento.montagem || (evento.data_evento ? `${evento.data_evento}T${evento.hora_inicio || evento.hora_evento || "00:00"}` : null);
  const fim = evento.desmontagem || (evento.data_evento ? `${evento.data_evento}T${evento.hora_termino || "23:59"}` : null);

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
  renderizarEventos();
}

function abrirDetalheEvento(id) {
  const e = eventos.find(x => x.id === id);
  if (!e) return;

  document.getElementById("eventoDetalheTitulo").textContent = `Evento — ${e.nome || ""}`;

  document.getElementById("eventoDetalheConteudo").innerHTML = `
    <div class="info-grid">
      <div class="info-box"><span>Cliente</span><strong>${e.nome || "-"}</strong></div>
      <div class="info-box"><span>Telefone</span><strong>${e.telefone || "-"}</strong></div>
      <div class="info-box"><span>Endereço</span><strong>${e.endereco || "-"}</strong></div>
      <div class="info-box"><span>Data</span><strong>${dataBR(e.data_evento)}</strong></div>
      <div class="info-box"><span>Início</span><strong>${e.hora_inicio || e.hora_evento || "-"}</strong></div>\n      <div class="info-box"><span>Término</span><strong>${e.hora_termino || "-"}</strong></div>
      <div class="info-box"><span>Montagem</span><strong>${e.montagem ? (e.montagem_tipo || "A partir de") + " " + formatarData(e.montagem) : "-"}</strong></div>
      <div class="info-box"><span>Desmontagem</span><strong>${e.desmontagem ? (e.desmontagem_tipo || "A partir de") + " " + formatarData(e.desmontagem) : "-"}</strong></div>
      <div class="info-box"><span>Pagamento</span><strong>${e.pagamento_quitado ? "Quitado" : "Em aberto"}</strong></div>
      <div class="info-box"><span>Total</span><strong>${dinheiro(e.valor_total)}</strong></div>
      <div class="info-box"><span>Sinal</span><strong>${dinheiro(e.valor_sinal)}</strong></div>
      <div class="info-box"><span>Restante</span><strong>${dinheiro(e.valor_restante)}</strong></div>
      <div class="info-box"><span>Colaborador</span><strong>${e.colaborador || "-"}</strong></div>
      <div class="info-box"><span>Tipo</span><strong>${isEventoRecorrente(e) ? "Recorrente" : "Pontual"}</strong></div>
      ${isEventoRecorrente(e) ? `<div class="info-box"><span>Recorrência</span><strong>${recorrenciaLabel(e.recorrencia_tipo, e.recorrencia_dias)}</strong></div>
      <div class="info-box"><span>Período recorrente</span><strong>${periodoRecorrenciaTexto(e)}</strong></div>` : ""}
    </div>

    <div class="subpanel">
      <h3>Produtos com código</h3>
      ${(e.tendas || []).length ? (e.tendas || []).map(p => `<div class="compact-item">${p.codigo || "-"} — ${p.categoria || ""} ${p.tamanho || ""} ${p.cor || ""}</div>`).join("") : `<p class="empty">Nenhum produto com código selecionado.</p>`}
    </div>

    <div class="subpanel">
      <h3>Mesas e cadeiras</h3>
      ${(e.itens_apoio || []).length ? (e.itens_apoio || []).map(i => `<div class="compact-item">${i.nome || "-"} — Quantidade: ${i.quantidade || 0}</div>`).join("") : `<p class="empty">Nenhum item de apoio selecionado.</p>`}
    </div>

    <div class="subpanel">
      <h3>Produtos/serviços extras</h3>
      ${(e.produtos_extras || []).length ? (e.produtos_extras || []).map(i => `<div class="compact-item">${i.descricao || "-"} — Quantidade: ${i.quantidade || 0}</div>`).join("") : `<p class="empty">Nenhum extra selecionado.</p>`}
    </div>

    <div class="subpanel">
      <h3>Forma de pagamento</h3>
      <p>${e.forma_pagamento || "-"}</p>
    </div>
  `;

  document.getElementById("eventoDetalheDialog").showModal();
}

document.addEventListener("DOMContentLoaded", iniciarEventos);
