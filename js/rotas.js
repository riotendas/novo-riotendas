

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



function formatarDataCurtaDisponibilidade(dataISO) {
  if (!dataISO) return "-";

  const partes = String(dataISO).split("-");
  if (partes.length !== 3) return dataISO;

  return `${partes[2]}/${partes[1]}/${partes[0].slice(-2)}`;
}

function formatarDataRota(dataISO) {
  if (!dataISO) return "-";
  const partes = dataISO.split("-");
  if (partes.length !== 3) return dataISO;
  return `${partes[2]}/${partes[1]}/${partes[0].slice(-2)}`;
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
  const tendas = (evento.tendas || []).map((p, index) => {
    const nome = [p.codigo, p.categoria, p.tamanho, p.cor].filter(Boolean).join(" - ");
    return nome || "Produto com código";
  });

  const apoio = (evento.itens_apoio || []).map(i => `${i.nome} (${i.quantidade})`);

  const extras = (evento.produtos_extras || []).map(i => `${i.descricao} (${i.quantidade})`);

  return [...tendas, ...apoio, ...extras];
}

function montarMateriaisRotaDetalhados(evento) {
  const materiais = [];

  (evento.tendas || []).forEach((p, index) => {
    const nome = [p.codigo, p.categoria, p.tamanho, p.cor].filter(Boolean).join(" - ");

    materiais.push({
      tipo: "produto",
      index,
      id: p.id,
      categoria: p.categoria || p.tipo || "",
      tamanho: p.tamanho || "",
      texto: nome || "Produto com código"
    });
  });

  (evento.itens_apoio || []).forEach((i, index) => {
    materiais.push({
      tipo: "apoio",
      index,
      texto: `${i.nome} (${i.quantidade})`
    });
  });

  (evento.produtos_extras || []).forEach((i, index) => {
    materiais.push({
      tipo: "extra",
      index,
      texto: `${i.descricao} (${i.quantidade})`
    });
  });

  return materiais;
}

function renderizarMateriaisRotaClicaveis(rota) {
  const evento = rota.evento || {};
  const materiais = montarMateriaisRotaDetalhados(evento);

  if (!materiais.length) {
    return `<span>Sem materiais informados</span>`;
  }

  return materiais.map(item => {
    if (item.tipo !== "produto") {
      return `<span>${item.texto}</span>`;
    }

    return `
      <button
        type="button"
        class="rota-material-click"
        title="Clique para substituir este produto"
        data-rota-trocar-produto="1"
        data-evento-id="${evento.id || rota.evento_id || ""}"
        data-produto-index="${item.index}"
        data-produto-id="${item.id || ""}"
      >${item.texto}</button>
    `;
  }).join("");
}

function produtoDescricaoRota(produto) {
  return [produto.codigo, produto.categoria || produto.tipo, produto.tamanho, produto.cor]
    .filter(Boolean)
    .join(" - ") || "Produto com código";
}


function intervaloEventoRotaDisponibilidade(evento) {
  if (!evento) return { inicio: null, fim: null };

  let inicio = evento.montagem || null;
  let fim = evento.desmontagem || null;

  if (!inicio || !fim) {
    const data = String(evento.data_evento || "").slice(0, 10);
    if (!data) return { inicio: null, fim: null };

    inicio = `${data}T${String(evento.hora_inicio || evento.hora_evento || "00:00").slice(0, 5)}`;
    fim = `${data}T${String(evento.hora_termino || "23:59").slice(0, 5)}`;
  }

  return { inicio, fim };
}

function eventoUsaProdutoRotaPorIdOuCodigo(evento, produto) {
  if (!evento || !Array.isArray(evento.tendas) || !produto) return false;

  const id = String(produto.id || "");
  const codigo = String(produto.codigo || "").trim();

  return evento.tendas.some(item => {
    return (id && String(item.id || "") === id)
      || (codigo && String(item.codigo || "").trim() === codigo);
  });
}

function produtoDisponivelParaTrocaRota(produto, evento) {
  if (!produto || !evento) return { livre: false, texto: "Produto inválido" };

  const intervaloAtual = intervaloEventoRotaDisponibilidade(evento);
  if (!intervaloAtual.inicio || !intervaloAtual.fim) return { livre: true, texto: "Sem data definida" };

  const conflito = (Array.isArray(eventos) ? eventos : []).find(outro => {
    if (String(outro.id) === String(evento.id)) return false;
    if (!eventoUsaProdutoRotaPorIdOuCodigo(outro, produto)) return false;

    const intervaloOutro = intervaloEventoRotaDisponibilidade(outro);
    return new Date(intervaloAtual.inicio).getTime() < new Date(intervaloOutro.fim).getTime()
      && new Date(intervaloAtual.fim).getTime() > new Date(intervaloOutro.inicio).getTime();
  });

  if (conflito) {
    return { livre: false, texto: `Indisponível: ${conflito.nome || "cliente"}` };
  }

  return { livre: true, texto: "Disponível" };
}

function produtosDisponiveisParaTrocaRota(produtoAtual, evento) {
  if (!Array.isArray(produtos)) return [];

  const categoriaAtual = produtoAtual?.categoria || produtoAtual?.tipo || "";
  const tamanhoAtual = produtoAtual?.tamanho || "";
  const idsEvento = new Set((evento?.tendas || []).map(p => String(p.id || "")));
  const codigosEvento = new Set((evento?.tendas || []).map(p => String(p.codigo || "").trim()).filter(Boolean));

  return produtos
    .filter(p => {
      if (!p || !p.id) return false;
      if (String(p.id || "") === String(produtoAtual?.id || "")) return false;
      if (String(p.codigo || "").trim() && String(p.codigo || "").trim() === String(produtoAtual?.codigo || "").trim()) return false;
      if (idsEvento.has(String(p.id || ""))) return false;
      if (String(p.codigo || "").trim() && codigosEvento.has(String(p.codigo || "").trim())) return false;

      const mesmaCategoria = String(p.categoria || p.tipo || "") === String(categoriaAtual);
      const mesmoTamanho = String(p.tamanho || "") === String(tamanhoAtual);
      return mesmaCategoria && mesmoTamanho;
    })
    .sort((a, b) => String(a.codigo || "").localeCompare(String(b.codigo || ""), "pt-BR", { numeric: true }));
}

function statusTrocaRotaProduto(p, evento) {
  const status = String(p?.status || "").trim();
  const statusLower = status.toLowerCase();
  const disponibilidade = produtoDisponivelParaTrocaRota(p, evento);

  const statusLivre = ["livre", "livre para locação", "livre para locacao", "disponível", "disponivel"];

  if (!statusLivre.includes(statusLower)) {
    return {
      livre: false,
      texto: status || "Indisponível"
    };
  }

  if (!disponibilidade.livre) {
    return {
      livre: false,
      texto: disponibilidade.texto || "Ocupada no período"
    };
  }

  return {
    livre: true,
    texto: "Disponível"
  };
}

function garantirModalTrocaProdutoRota() {
  let modal = document.getElementById("rotaTrocaProdutoDialog");

  if (modal) return modal;

  modal = document.createElement("dialog");
  modal.id = "rotaTrocaProdutoDialog";
  modal.className = "modal large-modal rota-troca-produto-dialog";

  modal.innerHTML = `
    <div class="modal-header">
      <h2>Trocar produto da rota</h2>
      <button type="button" class="icon-btn" id="fecharTrocaProdutoRota">×</button>
    </div>

    <div class="rota-troca-produto-body">
      <input type="hidden" id="trocaRotaEventoId">
      <input type="hidden" id="trocaRotaProdutoIndex">

      <div class="troca-produto-atual">
        <span>Produto atual</span>
        <strong id="trocaRotaProdutoAtual">-</strong>
      </div>

      <label class="troca-produto-select-label">
        Novo produto da mesma categoria/tamanho
        <select id="trocaRotaProdutoSelect"></select>
      </label>

      <p class="troca-produto-info">
        A troca será salva no evento e refletirá automaticamente em rotas, agenda e disponibilidade.
      </p>

      <div class="modal-actions">
        <button type="button" class="btn-outline" id="cancelarTrocaProdutoRota">Cancelar</button>
        <button type="button" class="btn-primary" id="confirmarTrocaProdutoRota">Confirmar troca</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  document.getElementById("fecharTrocaProdutoRota")?.addEventListener("click", () => modal.close());
  document.getElementById("cancelarTrocaProdutoRota")?.addEventListener("click", () => modal.close());
  document.getElementById("confirmarTrocaProdutoRota")?.addEventListener("click", confirmarTrocaProdutoRota);

  return modal;
}

async function abrirTrocaProdutoRota(eventoId, produtoIndex) {
  if (typeof carregarProdutos === "function") {
    try { await carregarProdutos(); } catch {}
  }

  const evento = (Array.isArray(eventos) ? eventos : []).find(e => String(e.id) === String(eventoId));
  if (!evento) {
    alert("Evento não encontrado para troca de produto.");
    return;
  }

  const index = Number(produtoIndex);
  const produtoAtual = evento.tendas?.[index];

  if (!produtoAtual) {
    alert("Produto não encontrado neste evento.");
    return;
  }

  const opcoes = produtosDisponiveisParaTrocaRota(produtoAtual, evento);
  const modal = garantirModalTrocaProdutoRota();

  document.getElementById("trocaRotaEventoId").value = evento.id;
  document.getElementById("trocaRotaProdutoIndex").value = String(index);
  document.getElementById("trocaRotaProdutoAtual").textContent = produtoDescricaoRota(produtoAtual);

  const select = document.getElementById("trocaRotaProdutoSelect");

  if (!opcoes.length) {
    select.innerHTML = `<option value="">Nenhum produto compatível encontrado</option>`;
    document.getElementById("confirmarTrocaProdutoRota").disabled = true;
  } else {
    const opcoesComStatus = opcoes.map(p => {
      const st = statusTrocaRotaProduto(p, evento);
      return { produto: p, livre: st.livre, texto: st.texto };
    });

    select.innerHTML = `
      <option value="">Selecione o produto substituto</option>
      ${opcoesComStatus.map(item => `
        <option value="${item.produto.id}" ${item.livre ? "" : "disabled"}>
          ${produtoDescricaoRota(item.produto)} | ${item.livre ? "Disponível" : item.texto}
        </option>
      `).join("")}
    `;

    document.getElementById("confirmarTrocaProdutoRota").disabled = !opcoesComStatus.some(item => item.livre);
  }

  modal.showModal();
}

async function confirmarTrocaProdutoRota() {
  const eventoId = document.getElementById("trocaRotaEventoId")?.value;
  const produtoIndex = Number(document.getElementById("trocaRotaProdutoIndex")?.value);
  const novoProdutoId = document.getElementById("trocaRotaProdutoSelect")?.value;

  if (!eventoId || !Number.isFinite(produtoIndex) || !novoProdutoId) {
    alert("Selecione um produto para realizar a troca.");
    return;
  }

  const evento = (Array.isArray(eventos) ? eventos : []).find(e => String(e.id) === String(eventoId));
  const novoProduto = (Array.isArray(produtos) ? produtos : []).find(p => String(p.id) === String(novoProdutoId));

  if (!evento || !novoProduto) {
    alert("Não foi possível localizar o evento ou o produto selecionado.");
    return;
  }

  const produtoAntigo = evento.tendas?.[produtoIndex];

  if (!produtoAntigo) {
    alert("Produto antigo não encontrado no evento.");
    return;
  }

  if (String(produtoAntigo.id || "") === String(novoProduto.id || "") ||
      (String(produtoAntigo.codigo || "").trim() && String(produtoAntigo.codigo || "").trim() === String(novoProduto.codigo || "").trim())) {
    alert("O produto escolhido é o mesmo produto atual.");
    return;
  }

  const validacaoTroca = produtoDisponivelParaTrocaRota(novoProduto, evento);
  if (!validacaoTroca.livre) {
    alert(validacaoTroca.texto || "Este produto não está disponível para este evento.");
    return;
  }

  evento.tendas[produtoIndex] = {
    id: novoProduto.id,
    codigo: novoProduto.codigo || "",
    categoria: novoProduto.categoria || novoProduto.tipo || "",
    tipo: novoProduto.tipo || novoProduto.categoria || "",
    tamanho: novoProduto.tamanho || "",
    cor: novoProduto.cor || ""
  };

  evento.atualizado_em = new Date().toISOString();
  evento.colaborador = typeof getColaboradorLogado === "function" ? getColaboradorLogado() : evento.colaborador;

  const salvo = typeof salvarEventoBanco === "function"
    ? await salvarEventoBanco(evento)
    : null;

  if (!salvo) {
    alert("Não foi possível salvar a troca no evento.");
    return;
  }

  const idx = eventos.findIndex(e => String(e.id) === String(evento.id));
  if (idx >= 0) eventos[idx] = salvo;

  document.getElementById("rotaTrocaProdutoDialog")?.close();

  if (typeof carregarEventos === "function") await carregarEventos();
  if (typeof renderizarEventos === "function") renderizarEventos();
  if (typeof renderizarCalendario === "function") renderizarCalendario();

  renderizarRotas();

  window.dispatchEvent(new CustomEvent("riotendas:eventos-atualizados"));

  if (typeof registrarLogSistema === "function") {
    registrarLogSistema({
      modulo: "Rotas",
      acao: "Troca rápida de produto",
      registro_id: evento.id,
      registro_nome: evento.nome || "Evento",
      antes: produtoAntigo,
      depois: evento.tendas[produtoIndex],
      detalhes: `${produtoDescricaoRota(produtoAntigo)} → ${produtoDescricaoRota(novoProduto)}`
    });
  }

  alert(`Produto trocado:\n${produtoDescricaoRota(produtoAntigo)}\n→ ${produtoDescricaoRota(novoProduto)}`);
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


  container.querySelectorAll("[data-rota-trocar-produto]").forEach(btn => {
    btn.addEventListener("click", () => {
      abrirTrocaProdutoRota(btn.dataset.eventoId, btn.dataset.produtoIndex);
    });
  });


  container.querySelectorAll("select[data-rota-carro]").forEach(select => {
    select.addEventListener("change", () => {
      const carroAnterior = rotasCarros[select.dataset.rotaCarro] || "Sem carro";
      rotasCarros[select.dataset.rotaCarro] = select.value || "Sem carro";
      salvarRotasCarrosLocal();

      if (typeof registrarLogSistema === "function") {
        registrarLogSistema({
          modulo: "Rotas",
          acao: "Carro da rota alterado",
          registro_id: select.dataset.rotaCarro,
          registro_nome: select.dataset.rotaCarro,
          antes: { carro: carroAnterior },
          depois: { carro: rotasCarros[select.dataset.rotaCarro] }
        });
      }

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
  const materiaisComCodigo = [];
  const materiaisSemCodigo = {};

  listaRotas.forEach(rota => {
    // No resumo ao lado do carro, listar somente materiais que serão levados
    // para montagem/entrega. Desmontagens/retiradas não entram nessa soma.
    if (rotaEhDesmontagem(rota)) return;

    const evento = rota.evento || {};

    // Produtos com código continuam item a item.
    (evento.tendas || []).forEach(p => {
      const nome = [p.codigo, p.categoria, p.tamanho, p.cor].filter(Boolean).join(" - ");
      materiaisComCodigo.push(nome || "Produto com código");
    });

    // Materiais sem código, como mesas e cadeiras, são somados por nome.
    (evento.itens_apoio || []).forEach(item => {
      const nome = String(item.nome || "Item sem código").trim();
      const quantidade = Number(item.quantidade || item.qtd || item.quantidade_total || 0);

      if (!materiaisSemCodigo[nome]) materiaisSemCodigo[nome] = 0;
      materiaisSemCodigo[nome] += Number.isFinite(quantidade) ? quantidade : 0;
    });

    // Extras continuam item a item, pois podem ser serviços ou descrições livres.
    (evento.produtos_extras || []).forEach(item => {
      const texto = `${item.descricao || "Extra"} (${item.quantidade || 1})`;
      materiaisComCodigo.push(texto);
    });
  });

  const resumoSemCodigo = Object.entries(materiaisSemCodigo)
    .filter(([, quantidade]) => Number(quantidade) > 0)
    .map(([nome, quantidade]) => `${nome} (${quantidade})`);

  return [...materiaisComCodigo, ...resumoSemCodigo];
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


function limparTelefoneRota(telefone) {
  return String(telefone || "").replace(/\D/g, "");
}

function googleMapsSearchUrl(endereco) {
  const query = encodeURIComponent(String(endereco || "").trim());
  return query ? `https://www.google.com/maps/search/?api=1&query=${query}` : "#";
}

function googleMapsNavigateUrl(endereco) {
  const query = encodeURIComponent(String(endereco || "").trim());
  return query ? `https://www.google.com/maps/dir/?api=1&destination=${query}` : "#";
}

function renderizarLinksEnderecoRota(rota) {
  const endereco = String(rota.endereco || "").trim();
  const telefone = limparTelefoneRota(rota.telefone);

  if (!endereco && !telefone) return "";

  return `
    <div class="rota-links-endereco">
      ${endereco ? `
        <a href="${googleMapsSearchUrl(endereco)}" target="_blank" rel="noopener" title="Abrir endereço no Google Maps">📍 Mapa</a>
        <a href="${googleMapsNavigateUrl(endereco)}" target="_blank" rel="noopener" title="Navegar até o endereço">🧭 Navegar</a>
      ` : ""}
      ${telefone ? `<a href="tel:${telefone}" title="Ligar para o cliente">📞 Ligar</a>` : ""}
    </div>
  `;
}

function valorDatetimeLocal(valor) {
  if (!valor) return "";
  return String(valor).slice(0, 16);
}


function linkGoogleMapsEndereco(endereco) {
  const texto = String(endereco || "").trim();
  if (!texto || texto === "-") return "-";

  const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(texto)}`;

  return `<a class="rota-endereco-link" href="${url}" target="_blank" rel="noopener" title="Abrir no Google Maps">${texto}</a>`;
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
          <strong>${linkGoogleMapsEndereco(rota.endereco)}</strong>
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
            ${renderizarMateriaisRotaClicaveis(rota)}
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
