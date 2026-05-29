let produtos = [];
let estoqueApoio = [];
let fotoAtual = "";

const storageProdutosKey = "novoRioTendasProdutosV1";
const storageApoioKey = "novoRioTendasEstoqueApoioV1";


function categoriasProdutosAtivas() {
  return window.categoriasProdutosConfig || categoriasProdutos;
}

function coresProdutosAtivas() {
  return window.coresProdutosConfig || coresProdutos;
}

async function buscarProdutosBanco() {
  if (!supabaseClient) {
    return JSON.parse(localStorage.getItem(storageProdutosKey) || "[]");
  }

  const { data, error } = await supabaseClient
    .from("produtos")
    .select("*")
    .order("codigo", { ascending: true });

  if (error) {
    console.error("Erro Supabase ao buscar produtos:", error);
    alert(
      "Erro ao buscar produtos no Supabase.\n\n" +
      "Mensagem: " + (error.message || "sem mensagem") + "\n" +
      "Código: " + (error.code || "-") + "\n\n" +
      "Verifique se a tabela produtos existe e se as políticas de acesso foram liberadas."
    );
    return [];
  }
  return data || [];
}

async function salvarProdutoBanco(produto) {
  if (!supabaseClient) {
    const index = produtos.findIndex(p => p.id === produto.id);
    if (index >= 0) produtos[index] = produto;
    else produtos.push(produto);
    localStorage.setItem(storageProdutosKey, JSON.stringify(produtos));
    return produto;
  }

  const produtoSupabase = {
    id: produto.id,
    codigo: produto.codigo || null,
    tipo: produto.tipo || produto.categoria || null,
    categoria: produto.categoria || produto.tipo || null,
    tamanho: produto.tamanho || null,
    status: produto.status || "Livre",
    cor: produto.cor || null,
    observacao: produto.observacao || null,
    foto: produto.foto || null,
    grau_usabilidade: produto.grau_usabilidade || "Bom",
    colaborador: produto.colaborador || getColaboradorLogado(),
    historico: produto.historico || [],
    locacoes: produto.locacoes || [],
    atualizado_em: produto.atualizado_em || new Date().toISOString(),
    criado_em: produto.criado_em || new Date().toISOString()
  };

  const { data, error } = await supabaseClient
    .from("produtos")
    .upsert(produtoSupabase, { onConflict: "id" })
    .select()
    .single();

  if (error) {
    console.error("Erro Supabase ao salvar produto:", error);
    alert(
      "Erro ao salvar produto no Supabase.\n\n" +
      "Mensagem: " + (error.message || "sem mensagem") + "\n" +
      "Código: " + (error.code || "-") + "\n\n" +
      "Verifique se você executou o arquivo SQL atualizado no Supabase."
    );
    return null;
  }

  return data;
}

async function excluirProdutoBanco(id) {
  if (!supabaseClient) {
    produtos = produtos.filter(p => p.id !== id);
    localStorage.setItem(storageProdutosKey, JSON.stringify(produtos));
    return true;
  }

  const { error } = await supabaseClient.from("produtos").delete().eq("id", id);
  if (error) {
    console.error(error);
    alert("Erro ao excluir produto.");
    return false;
  }
  return true;
}


function buscarEstoqueApoioLocal() {
  let estoque = JSON.parse(localStorage.getItem(storageApoioKey) || "[]");
  if (!estoque.length) {
    estoque = itensApoioPadrao.map(nome => ({
      id: "local-" + gerarId(),
      nome,
      quantidade_total: 0,
      quantidade_reservada: 0,
      atualizado_em: new Date().toISOString(),
      colaborador: getColaboradorLogado()
    }));
    localStorage.setItem(storageApoioKey, JSON.stringify(estoque));
  }
  return estoque;
}

async function buscarEstoqueApoioBanco() {
  if (!supabaseClient) return buscarEstoqueApoioLocal();

  const { data, error } = await supabaseClient
    .from("estoque_apoio")
    .select("*")
    .order("nome", { ascending: true });

  if (error) {
    console.warn("Tabela estoque_apoio ainda não encontrada. Usando localStorage temporariamente.", error);
    return buscarEstoqueApoioLocal();
  }

  if (data && data.length) return data;

  const iniciais = itensApoioPadrao.map(nome => ({
    nome,
    quantidade_total: 0,
    quantidade_reservada: 0,
    atualizado_em: new Date().toISOString(),
    colaborador: getColaboradorLogado()
  }));

  const { data: criados, error: erroInsert } = await supabaseClient
    .from("estoque_apoio")
    .insert(iniciais)
    .select();

  if (erroInsert) {
    console.warn("Não foi possível criar itens de apoio no Supabase. Usando localStorage.", erroInsert);
    return buscarEstoqueApoioLocal();
  }

  return criados || [];
}

async function salvarItemApoioBanco(item) {
  item.atualizado_em = new Date().toISOString();
  item.colaborador = getColaboradorLogado();

  if (!supabaseClient || String(item.id || "").startsWith("local-")) {
    let estoque = buscarEstoqueApoioLocal();
    const index = estoque.findIndex(i => String(i.id) === String(item.id) || i.nome === item.nome);
    if (index >= 0) estoque[index] = item;
    else estoque.push(item);
    localStorage.setItem(storageApoioKey, JSON.stringify(estoque));
    return item;
  }

  const { data, error } = await supabaseClient
    .from("estoque_apoio")
    .upsert(item)
    .select()
    .single();

  if (error) {
    console.warn("Erro ao salvar item de apoio no Supabase. Salvando localmente.", error);
    let estoque = buscarEstoqueApoioLocal();
    const index = estoque.findIndex(i => String(i.id) === String(item.id) || i.nome === item.nome);
    if (index >= 0) estoque[index] = item;
    else estoque.push(item);
    localStorage.setItem(storageApoioKey, JSON.stringify(estoque));
    return item;
  }

  return data;
}

async function carregarProdutos() {
  produtos = await buscarProdutosBanco();
  estoqueApoio = await buscarEstoqueApoioBanco();
  renderizarProdutos();
  atualizarDashboard(produtos);
}

function iniciarProdutos() {
  const categoriaSelect = document.getElementById("produtoCategoria");
  const tamanhoSelect = document.getElementById("produtoTamanho");
  const corSelect = document.getElementById("produtoCor");
  const statusSelect = document.getElementById("produtoStatus");
  const usabilidadeSelect = document.getElementById("produtoUsabilidade");
  const filtroCategoria = document.getElementById("filtroCategoria");
  const filtroTamanho = document.getElementById("filtroTamanho");
  const filtroStatus = document.getElementById("filtroStatus");

  popularSelect(categoriaSelect, Object.keys(categorias));
  popularSelect(corSelect, cores);
  popularSelect(statusSelect, statusProdutos);
  popularSelect(usabilidadeSelect, grausUsabilidade);
  popularSelect(filtroCategoria, Object.keys(categorias), "Todas");
  popularSelect(filtroStatus, statusProdutos, "Todos");
  atualizarTamanhos();
  atualizarFiltroTamanhos();

  categoriaSelect.addEventListener("change", atualizarTamanhos);
  filtroCategoria.addEventListener("change", () => { atualizarFiltroTamanhos(); renderizarProdutos(); });
  filtroTamanho.addEventListener("change", renderizarProdutos);
  filtroStatus.addEventListener("change", renderizarProdutos);
  document.getElementById("buscaProduto").addEventListener("input", renderizarProdutos);

  ["dispProdutoInicio", "dispProdutoFim", "mostrarSomenteDisponiveis"].forEach(id => {
    const campo = document.getElementById(id);
    if (!campo) return;

    const atualizar = async () => {
      await carregarEventosDisponibilidadeProduto();
      renderizarProdutos();
    };

    campo.addEventListener("input", atualizar);
    campo.addEventListener("change", atualizar);
  });

  const limparDispProdutos = document.getElementById("limparDisponibilidadeProdutos");
  if (limparDispProdutos) {
    limparDispProdutos.addEventListener("click", () => {
      document.getElementById("dispProdutoInicio").value = "";
      document.getElementById("dispProdutoFim").value = "";
      document.getElementById("mostrarSomenteDisponiveis").checked = false;
      renderizarProdutos();
    });
  }


  document.getElementById("novoProdutoBtn").addEventListener("click", abrirNovoProduto);
  document.getElementById("fecharProdutoModal").addEventListener("click", fecharProdutoModal);
  document.getElementById("cancelarProduto").addEventListener("click", fecharProdutoModal);
  document.getElementById("fecharDetalheModal").addEventListener("click", () => document.getElementById("produtoDetalheDialog").close());
  document.getElementById("produtoForm").addEventListener("submit", salvarProdutoForm);

  document.getElementById("produtoFoto").addEventListener("change", async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    fotoAtual = await fileToBase64(file);
  });
}
  carregarEventosDisponibilidadeProduto().then(() => renderizarProdutos());


function atualizarTamanhos() {
  const categoria = document.getElementById("produtoCategoria").value;
  popularSelect(document.getElementById("produtoTamanho"), categorias[categoria] || []);
}

function atualizarFiltroTamanhos() {
  const categoria = document.getElementById("filtroCategoria").value;
  const tamanhos = categoria ? categorias[categoria] : [...new Set(Object.values(categorias).flat())];
  popularSelect(document.getElementById("filtroTamanho"), tamanhos, "Todos");
}

function abrirNovoProduto() {
  fotoAtual = "";
  document.getElementById("produtoForm").reset();
  document.getElementById("produtoId").value = "";
  document.getElementById("produtoModalTitulo").textContent = "Novo produto";
  atualizarTamanhos();
  document.getElementById("produtoUsabilidade").value = "Bom";
  document.getElementById("produtoDialog").showModal();
}

function abrirEditarProduto(id) {
  const produto = produtos.find(p => p.id === id);
  if (!produto) return;

  fotoAtual = produto.foto || "";
  document.getElementById("produtoId").value = produto.id;
  document.getElementById("produtoCodigo").value = produto.codigo || "";
  document.getElementById("produtoCategoria").value = produto.categoria || produto.tipo || "";
  atualizarTamanhos();
  document.getElementById("produtoTamanho").value = produto.tamanho || "";
  document.getElementById("produtoCor").value = produto.cor || "";
  document.getElementById("produtoStatus").value = produto.status || "Livre";
  document.getElementById("produtoUsabilidade").value = produto.grau_usabilidade || "Bom";
  document.getElementById("produtoObservacao").value = produto.observacao || "";
  document.getElementById("fotoPreview").src = fotoAtual || "";
  document.getElementById("produtoModalTitulo").textContent = `Editar ${produto.codigo || "produto"}`;
  document.getElementById("produtoDialog").showModal();
}

function fecharProdutoModal() {
  document.getElementById("produtoDialog").close();
}

async function salvarProdutoForm(event) {
  event.preventDefault();
  const id = document.getElementById("produtoId").value || gerarId();
  const existente = produtos.find(p => p.id === id);
  const colaborador = getColaboradorLogado();

  const produto = {
    id,
    codigo: document.getElementById("produtoCodigo").value.trim(),
    categoria: document.getElementById("produtoCategoria").value,
    tipo: document.getElementById("produtoCategoria").value,
    tamanho: document.getElementById("produtoTamanho").value,
    cor: document.getElementById("produtoCor").value,
    status: document.getElementById("produtoStatus").value,
    grau_usabilidade: document.getElementById("produtoUsabilidade").value,
    observacao: document.getElementById("produtoObservacao").value.trim(),
    foto: fotoAtual,
    colaborador,
    atualizado_em: new Date().toISOString(),
    criado_em: existente?.criado_em || new Date().toISOString(),
    historico: existente?.historico || []
  };

  produto.historico.push({
    data: new Date().toISOString(),
    colaborador,
    alteracao: existente ? "Produto editado" : "Produto cadastrado",
    observacao: produto.observacao || "-"
  });

  const antesLogProduto = existente ? JSON.parse(JSON.stringify(existente)) : null;
  const depoisLogProduto = JSON.parse(JSON.stringify(produto));

  const salvo = await salvarProdutoBanco(produto);
  if (!salvo) return;

  if (typeof registrarLogSistema === "function") {
    registrarLogSistema({
      modulo: "Produtos",
      acao: existente ? "Produto editado" : "Produto cadastrado",
      registro_id: salvo.id,
      registro_nome: salvo.codigo || salvo.nome || salvo.categoria || "Produto",
      antes: antesLogProduto,
      depois: depoisLogProduto
    });
  }

  const index = produtos.findIndex(p => p.id === salvo.id);
  if (index >= 0) produtos[index] = salvo;
  else produtos.push(salvo);

  fecharProdutoModal();
  renderizarProdutos();
  atualizarDashboard(produtos);
}


function getEventosDisponibilidadeProduto() {
  if (typeof eventos !== "undefined" && Array.isArray(eventos)) return eventos;
  if (Array.isArray(window.eventos)) return window.eventos;
  return [];
}

async function carregarEventosDisponibilidadeProduto() {
  try {
    if (getEventosDisponibilidadeProduto().length) return;

    if (typeof carregarEventos === "function") {
      await carregarEventos();
      return;
    }

    if (typeof supabaseClient !== "undefined" && supabaseClient) {
      const { data, error } = await supabaseClient.from("eventos").select("*");
      if (!error && Array.isArray(data)) window.eventos = data;
    }
  } catch (erro) {
    console.warn("Não foi possível carregar eventos para disponibilidade:", erro);
  }
}

function periodoProdutoSelecionado() {
  const inicio = document.getElementById("dispProdutoInicio")?.value || "";
  const fim = document.getElementById("dispProdutoFim")?.value || "";

  if (!inicio || !fim) return null;

  if (new Date(fim).getTime() <= new Date(inicio).getTime()) {
    return { invalido: true, inicio, fim };
  }

  return { inicio, fim };
}

function conflitoPeriodoProduto(inicioBusca, fimBusca, inicioReserva, fimReserva) {
  if (!inicioBusca || !fimBusca || !inicioReserva || !fimReserva) return false;

  return new Date(inicioBusca).getTime() < new Date(fimReserva).getTime()
    && new Date(fimBusca).getTime() > new Date(inicioReserva).getTime();
}


function dataISOProdutoDisponibilidade(valor) {
  if (!valor) return "";
  return String(valor).slice(0, 10);
}

function intervaloEventoDisponibilidade(evento) {
  if (!evento) return { inicio: null, fim: null };

  let inicio = evento.montagem || null;
  let fim = evento.desmontagem || null;

  const dataEvento = dataISOProdutoDisponibilidade(evento.data_evento);

  if (!inicio && dataEvento) {
    inicio = `${dataEvento}T${String(evento.hora_inicio || evento.hora_evento || "00:00").slice(0, 5)}`;
  }

  if (!fim && dataEvento) {
    fim = `${dataEvento}T${String(evento.hora_termino || "23:59").slice(0, 5)}`;
  }

  // Se só tiver montagem, considera fim no dia do evento/desmontagem se existir.
  if (inicio && !fim) {
    const base = dataEvento || String(inicio).slice(0, 10);
    fim = `${base}T23:59`;
  }

  if (!inicio || !fim) return { inicio: null, fim: null };

  return { inicio, fim };
}

function formatarDataHoraProdutoDisp(valor) {
  if (!valor) return "-";

  const texto = String(valor);
  const data = texto.slice(0, 10);
  const hora = texto.includes("T") ? texto.slice(11, 16) : "";
  const partes = data.split("-");

  if (partes.length === 3) {
    return `${partes[2]}/${partes[1]}/${partes[0].slice(-2)}${hora ? " " + hora : ""}`;
  }

  return texto;
}


function normalizarCodigoProdutoDisponibilidade(valor) {
  const texto = String(valor || "").trim();
  if (!texto) return "";

  // Mantém versão original e também remove zeros à esquerda para comparar 006/6/606 com segurança.
  const somenteDigitos = texto.replace(/\D/g, "");
  if (!somenteDigitos) return texto.toLowerCase();

  return String(Number(somenteDigitos));
}

function codigosEquivalentesProdutoDisponibilidade(a, b) {
  const originalA = String(a || "").trim().toLowerCase();
  const originalB = String(b || "").trim().toLowerCase();

  if (!originalA || !originalB) return false;
  if (originalA === originalB) return true;

  return normalizarCodigoProdutoDisponibilidade(originalA) === normalizarCodigoProdutoDisponibilidade(originalB);
}

function dataInicioDiaProdutoDisponibilidade(valor) {
  if (!valor) return null;
  const data = new Date(String(valor).slice(0, 10) + "T00:00:00");
  return Number.isNaN(data.getTime()) ? null : data;
}

function eventoUsaProdutoParaDisponibilidade(evento, produto) {
  if (!Array.isArray(evento.tendas)) return false;

  const produtoId = String(produto.id || "");
  const produtoCodigo = String(produto.codigo || "").trim();

  return evento.tendas.some(item => {
    const itemId = String(item.id || "");
    const itemCodigo = String(item.codigo || "").trim();

    return (produtoId && itemId && itemId === produtoId)
      || (produtoCodigo && itemCodigo && codigosEquivalentesProdutoDisponibilidade(itemCodigo, produtoCodigo));
  });
}

function proximoUsoProduto(produto) {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const proximos = getEventosDisponibilidadeProduto()
    .filter(evento => eventoUsaProdutoParaDisponibilidade(evento, produto))
    .map(evento => {
      const intervalo = intervaloEventoDisponibilidade(evento);

      // Prioridade para montagem; fallback para data do evento.
      const inicioComparacao =
        dataInicioDiaProdutoDisponibilidade(intervalo.inicio) ||
        dataInicioDiaProdutoDisponibilidade(evento.montagem) ||
        dataInicioDiaProdutoDisponibilidade(evento.data_evento);

      return { evento, intervalo, inicioComparacao };
    })
    .filter(item => item.inicioComparacao && item.inicioComparacao.getTime() >= hoje.getTime())
    .sort((a, b) => a.inicioComparacao.getTime() - b.inicioComparacao.getTime());

  return proximos[0] || null;
}

function diasAteProximoUsoProduto(proximo) {
  if (!proximo || !proximo.intervalo || !proximo.intervalo.inicio) return null;

  const hoje = new Date();
  const inicio = new Date(proximo.intervalo.inicio);
  const diff = inicio.getTime() - hoje.getTime();

  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function textoAlertaProximoUso(proximo) {
  const dias = diasAteProximoUsoProduto(proximo);

  if (dias === null) return "";
  if (dias <= 0) return "Uso hoje";
  if (dias === 1) return "Uso amanhã";
  return `Uso em ${dias} dias`;
}

function classeAlertaProximoUso(produto, proximo) {
  const dias = diasAteProximoUsoProduto(proximo);
  const status = produto.status || "";

  if (dias === null) return "";
  if (status === "Livre") return "";

  if (dias <= 2) return "alerta-critico";
  if (dias <= 5) return "alerta-atencao";
  return "alerta-normal";
}

function disponibilidadePeriodoProduto(produto) {
  const periodo = periodoProdutoSelecionado();

  if (!periodo) {
    const proximo = proximoUsoProduto(produto);

    if ((produto.status || "") !== "Livre") {
      if (proximo) {
        const alerta = classeAlertaProximoUso(produto, proximo);
        const textoAlerta = textoAlertaProximoUso(proximo);

        return {
          classe: alerta || "bloqueado",
          texto: `${produto.status || "Indisponível"}`,
          detalhe: `${textoAlerta}: ${proximo.evento.nome || "Cliente"} — ${formatarDataHoraProdutoDisp(proximo.intervalo.inicio)} até ${formatarDataHoraProdutoDisp(proximo.intervalo.fim)}`
        };
      }

      return {
        classe: "bloqueado",
        texto: produto.status || "Indisponível",
        detalhe: "Sem próximo uso encontrado"
      };
    }

    if (proximo) {
      return {
        classe: "proximo",
        texto: "Próximo uso",
        detalhe: `${proximo.evento.nome || "Cliente"} — ${formatarDataHoraProdutoDisp(proximo.intervalo.inicio)} até ${formatarDataHoraProdutoDisp(proximo.intervalo.fim)}`
      };
    }

    return {
      classe: "livre",
      texto: "Sem locação",
      detalhe: "Nenhum uso futuro encontrado"
    };
  }

  if (periodo.invalido) {
    return {
      classe: "bloqueado",
      texto: "Período inválido",
      detalhe: "Fim precisa ser maior que início"
    };
  }

  if ((produto.status || "") !== "Livre") {
    return {
      classe: "bloqueado",
      texto: "Indisponível",
      detalhe: produto.status || "Bloqueado/manutenção"
    };
  }

  const conflito = getEventosDisponibilidadeProduto().find(evento => {
    if (!eventoUsaProdutoParaDisponibilidade(evento, produto)) return false;

    const intervalo = intervaloEventoDisponibilidade(evento);
    return conflitoPeriodoProduto(periodo.inicio, periodo.fim, intervalo.inicio, intervalo.fim);
  });

  if (conflito) {
    const intervalo = intervaloEventoDisponibilidade(conflito);

    return {
      classe: "ocupado",
      texto: "Ocupado",
      detalhe: `${conflito.nome || "Cliente"} — ${formatarDataHoraProdutoDisp(intervalo.inicio)} até ${formatarDataHoraProdutoDisp(intervalo.fim)}`
    };
  }

  return {
    classe: "livre",
    texto: "Disponível",
    detalhe: "Livre no período"
  };
}

function htmlDisponibilidadePeriodoProduto(produto) {
  const d = disponibilidadePeriodoProduto(produto);

  return `
    <span class="disp-badge disp-${d.classe}" title="${d.detalhe}">${d.texto}</span>
    <small class="disp-detail">${d.detalhe}</small>
  `;
}

function filtrarProdutos() {
  const categoria = document.getElementById("filtroCategoria").value;
  const tamanho = document.getElementById("filtroTamanho").value;
  const status = document.getElementById("filtroStatus").value;
  const busca = document.getElementById("buscaProduto").value.trim().toLowerCase();
  const somenteDisponiveis = document.getElementById("mostrarSomenteDisponiveis")?.checked || false;

  return produtos.filter(p => {
    const texto = `${p.codigo} ${p.categoria || p.tipo} ${p.tamanho} ${p.cor} ${p.status} ${p.grau_usabilidade || ""} ${p.observacao}`.toLowerCase();
    const disp = disponibilidadePeriodoProduto(p);

    return (!categoria || (p.categoria || p.tipo) === categoria)
      && (!tamanho || p.tamanho === tamanho)
      && (!status || p.status === status)
      && (!busca || texto.includes(busca))
      && (!somenteDisponiveis || disp.classe === "livre");
  });
}


function eventoUsaItemApoio(evento, itemApoio) {
  if (!Array.isArray(evento.itens_apoio)) return false;

  const itemId = String(itemApoio.id || "");
  const nome = String(itemApoio.nome || "").trim().toLowerCase();

  return evento.itens_apoio.some(item => {
    return (itemId && String(item.id || "") === itemId)
      || (nome && String(item.nome || "").trim().toLowerCase() === nome);
  });
}

function quantidadeApoioNoEvento(evento, itemApoio) {
  if (!Array.isArray(evento.itens_apoio)) return 0;

  const itemId = String(itemApoio.id || "");
  const nome = String(itemApoio.nome || "").trim().toLowerCase();

  return evento.itens_apoio.reduce((total, item) => {
    const corresponde = (itemId && String(item.id || "") === itemId)
      || (nome && String(item.nome || "").trim().toLowerCase() === nome);

    return corresponde ? total + Number(item.quantidade || 0) : total;
  }, 0);
}

function disponibilidadeApoioNoPeriodo(itemApoio) {
  const total = Number(itemApoio.quantidade_total || 0);
  const periodo = periodoProdutoSelecionado();

  if (!periodo) {
    return {
      reservado: Number(itemApoio.quantidade_reservada || 0),
      disponivel: Math.max(total - Number(itemApoio.quantidade_reservada || 0), 0),
      detalhe: "Informe um período para verificar por data"
    };
  }

  if (periodo.invalido) {
    return {
      reservado: 0,
      disponivel: total,
      detalhe: "Período inválido"
    };
  }

  const eventosPeriodo = getEventosDisponibilidadeProduto().filter(evento => {
    if (!eventoUsaItemApoio(evento, itemApoio)) return false;

    const intervalo = intervaloEventoDisponibilidade(evento);

    return conflitoPeriodoProduto(periodo.inicio, periodo.fim, intervalo.inicio, intervalo.fim);
  });

  const reservado = eventosPeriodo.reduce((totalReservado, evento) => {
    return totalReservado + quantidadeApoioNoEvento(evento, itemApoio);
  }, 0);

  const detalhes = eventosPeriodo.map(evento => {
    const intervalo = intervaloEventoDisponibilidade(evento);
    return `${evento.nome || "Cliente"}: ${quantidadeApoioNoEvento(evento, itemApoio)} — ${formatarDataHoraProdutoDisp(intervalo.inicio)} até ${formatarDataHoraProdutoDisp(intervalo.fim)}`;
  });

  return {
    reservado,
    disponivel: Math.max(total - reservado, 0),
    detalhe: detalhes.length ? detalhes.join(" | ") : "Livre no período"
  };
}

function statusApoioPeriodo(itemApoio) {
  const total = Number(itemApoio.quantidade_total || 0);
  const disp = disponibilidadeApoioNoPeriodo(itemApoio);

  if (total <= 0) return { classe: "bloqueado", texto: "Sem estoque" };
  if (disp.disponivel <= 0) return { classe: "ocupado", texto: "Sem disponibilidade" };
  if (disp.disponivel < total) return { classe: "proximo", texto: "Parcial" };
  return { classe: "livre", texto: "Disponível" };
}

function renderizarLinhasApoio() {
  // Mesas e cadeiras agora são renderizadas em tabela separada,
  // mantendo os mesmos filtros do topo.
  setTimeout(renderizarTabelaApoioSeparada, 0);
  return "";
}


function garantirAreaApoioSeparada() {
  const produtosSection = document.getElementById("produtosSection");
  if (!produtosSection) return null;

  let area = document.getElementById("apoioTabelaSeparadaArea");
  if (area) return area;

  area = document.createElement("div");
  area.id = "apoioTabelaSeparadaArea";
  area.className = "apoio-separado-area";

  const tabelaPrincipal = document.querySelector("#produtosSection .table-wrapper");
  if (tabelaPrincipal && tabelaPrincipal.parentNode) {
    tabelaPrincipal.parentNode.insertBefore(area, tabelaPrincipal.nextSibling);
  } else {
    produtosSection.appendChild(area);
  }

  return area;
}

function renderizarTabelaApoioSeparada() {
  const area = garantirAreaApoioSeparada();
  if (!area) return;

  const categoriaFiltro = document.getElementById("filtroCategoria")?.value || "";
  const somenteDisponiveis = document.getElementById("mostrarSomenteDisponiveis")?.checked || false;

  // Mantém o filtro do topo: só mostra em Todas ou Mesas/Cadeiras
  if (categoriaFiltro && categoriaFiltro !== "Mesas/Cadeiras") {
    area.innerHTML = "";
    area.style.display = "none";
    return;
  }

  if (!Array.isArray(estoqueApoio) || !estoqueApoio.length) {
    area.innerHTML = "";
    area.style.display = "none";
    return;
  }

  const itensFiltrados = estoqueApoio.filter(item => {
    if (!somenteDisponiveis) return true;
    return disponibilidadeApoioNoPeriodo(item).disponivel > 0;
  });

  area.style.display = "";

  if (!itensFiltrados.length) {
    area.innerHTML = `
      <div class="apoio-separado-header">
        <h3>Mesas e cadeiras</h3>
        <span>Controle por quantidade, sem código individual</span>
      </div>
      <p class="empty">Nenhum item de apoio disponível no período selecionado.</p>
    `;
    return;
  }

  area.innerHTML = `
    <div class="apoio-separado-header">
      <h3>Mesas e cadeiras</h3>
      <span>Controle por quantidade, sem código individual</span>
    </div>

    <div class="apoio-separado-table-wrap">
      <table class="apoio-separado-table">
        <thead>
          <tr>
            <th>Qtd</th>
            <th>Categoria</th>
            <th>Item</th>
            <th>Quantidade</th>
            <th>Disponibilidade</th>
          </tr>
        </thead>
        <tbody>
          ${itensFiltrados.map(item => {
            const total = Number(item.quantidade_total || 0);
            const dispPeriodo = disponibilidadeApoioNoPeriodo(item);
            const reservado = Number(dispPeriodo.reservado || 0);
            const disponivel = Math.max(Number(dispPeriodo.disponivel || 0), 0);
            const statusPeriodo = statusApoioPeriodo(item);

            return `
              <tr class="apoio-row-separada">
                <td><span class="apoio-icon">Qtd</span></td>
                <td>Mesas/Cadeiras</td>
                <td>${item.nome || "-"}</td>
                <td>
                  <div class="qtd-apoio-box">
                    <label>Total
                      <input type="number" min="0" step="1" class="qtd-apoio-input" data-action="qtd-apoio" data-id="${item.id}" value="${total}">
                    </label>
                    <span>Reservado: <strong>${reservado}</strong></span>
                    <span>Disponível: <strong>${disponivel}</strong></span>
                  </div>
                </td>
                <td class="availability-cell">
                  <span class="disp-badge disp-${statusPeriodo.classe}" title="${dispPeriodo.detalhe}">
                    ${statusPeriodo.texto}
                  </span>
                  <small class="disp-detail">${dispPeriodo.detalhe}</small>
                </td>

              </tr>
            `;
          }).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function normalizarChaveFotoProduto(valor) {
  return String(valor || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "")
    .replace(/,/g, ".")
    .replace(/m$/g, "");
}

function obterFotosPadraoConfiguradas() {
  try {
    if (typeof carregarConfiguracoes === "function") {
      const config = carregarConfiguracoes();
      if (config && config.fotosPadrao) return config.fotosPadrao;
    }
  } catch (erro) {
    console.warn("Não foi possível carregar fotos padrão:", erro);
  }

  if (window.fotosPadraoProdutosConfig) return window.fotosPadraoProdutosConfig;
  if (window.configRioTendas && window.configRioTendas.fotosPadrao) return window.configRioTendas.fotosPadrao;

  return {};
}

function obterFotoPadraoProduto(produto) {
  const fotosPadrao = obterFotosPadraoConfiguradas();
  const categoriaProduto = produto?.categoria || produto?.tipo || "";
  const tamanhoProduto = produto?.tamanho || "";

  const chaveExata = `${categoriaProduto}|${tamanhoProduto}`;
  if (fotosPadrao[chaveExata]) return fotosPadrao[chaveExata];

  const categoriaNormalizada = normalizarChaveFotoProduto(categoriaProduto);
  const tamanhoNormalizado = normalizarChaveFotoProduto(tamanhoProduto);

  const entrada = Object.entries(fotosPadrao).find(([chave]) => {
    const [categoria, tamanho] = String(chave).split("|");

    return normalizarChaveFotoProduto(categoria) === categoriaNormalizada
      && normalizarChaveFotoProduto(tamanho) === tamanhoNormalizado;
  });

  return entrada ? entrada[1] : "";
}

function fotoValidaProduto(valor) {
  const texto = String(valor || "").trim();

  if (!texto) return "";
  if (texto === "Foto própria cadastrada") return "";
  if (texto === "Foto padrão cadastrada") return "";
  if (texto === "Foto própria cadastrada no sistema") return "";
  if (texto === "Foto padrão cadastrada no sistema") return "";
  if (texto === "Foto padrão enviada por upload") return "";

  return texto;
}

function obterFotoProduto(produto) {
  const fotoPropria = fotoValidaProduto(produto?.foto);

  if (fotoPropria) return fotoPropria;

  const fotoPadrao = obterFotoPadraoProduto(produto);

  return fotoPadrao || "";
}

function renderizarProdutos() {
  const tbody = document.getElementById("produtosTbody");
  const filtrados = filtrarProdutos();

  document.getElementById("prodTotal").textContent = filtrados.length;
  document.getElementById("prodLivres").textContent = filtrados.filter(p => p.status === "Livre").length;
  document.getElementById("prodProblema").textContent = filtrados.filter(p => p.status !== "Livre").length;

  if (!filtrados.length) {
    tbody.innerHTML = `<tr><td colspan="9" class="empty">Nenhum produto com código cadastrado.</td></tr>${renderizarLinhasApoio()}`;
    configurarEventosTabelaProdutos(tbody);
    atualizarDashboard(produtos);
    return;
  }

  const ordenados = [...filtrados].sort((a,b) => {
    const aMesa = (a.categoria || a.tipo) === "Mesas/Cadeiras";
    const bMesa = (b.categoria || b.tipo) === "Mesas/Cadeiras";
    if (aMesa !== bMesa) return aMesa ? 1 : -1;
    return String(a.codigo || "").localeCompare(String(b.codigo || ""), "pt-BR", { numeric: true });
  });

  tbody.innerHTML = ordenados.map(p => `
    <tr class="status-${normalizarStatus(p.status)}">
      <td>${obterFotoProduto(p) ? `<img class="product-img" src="${obterFotoProduto(p)}" alt="">` : `<span class="product-img-placeholder">Sem foto</span>`}</td>
      <td><button class="code-link" data-action="detalhe" data-id="${p.id}">${p.codigo || "Sem código"}</button></td>
      <td>${p.categoria || p.tipo || "-"}</td>
      <td>${p.tamanho || "-"}</td>
      <td>${p.cor || "-"}</td><td>${p.grau_usabilidade || p.usabilidade || "-"}</td>
      <td>
        <select class="status-select status-${normalizarStatus(p.status)}" data-action="status" data-id="${p.id}">
          ${statusProdutos.map(s => `<option value="${s}" ${p.status === s ? "selected" : ""}>${s}</option>`).join("")}
        </select>
      </td>
      <td><input data-action="obs" data-id="${p.id}" value="${(p.observacao || "").replaceAll('"', '&quot;')}" /></td>
      <td class="availability-cell">${htmlDisponibilidadePeriodoProduto(p)}</td>
      <td class="actions">
        <button data-action="editar" data-id="${p.id}">Editar</button>
        <button class="btn-outline" data-action="excluir" data-id="${p.id}">Excluir</button>
      </td>
    </tr>
  `).join("") + renderizarLinhasApoio();

  // Eventos separados para não atrapalhar select/input.
  // Antes todos os elementos data-action recebiam click + change,
  // isso fazia o seletor de status e a observação perderem o foco.
  tbody.querySelectorAll("button[data-action]").forEach(btn => {
    btn.addEventListener("click", lidarAcaoProduto);
  });

  tbody.querySelectorAll("select[data-action='status']").forEach(select => {
    select.addEventListener("click", event => event.stopPropagation());
    select.addEventListener("mousedown", event => event.stopPropagation());
    select.addEventListener("change", lidarAcaoProduto);
  });

  tbody.querySelectorAll("select[data-action='usabilidade']").forEach(select => {
    select.addEventListener("click", event => event.stopPropagation());
    select.addEventListener("mousedown", event => event.stopPropagation());
    select.addEventListener("change", lidarAcaoProduto);
  });

  tbody.querySelectorAll("input[data-action='obs']").forEach(input => {
    input.addEventListener("click", event => event.stopPropagation());
    input.addEventListener("mousedown", event => event.stopPropagation());
    input.addEventListener("keydown", event => {
      if (event.key === "Enter") {
        event.preventDefault();
        event.currentTarget.blur();
      }
    });
    input.addEventListener("blur", lidarAcaoProduto);
  });

  tbody.querySelectorAll("input[data-action='qtd-apoio']").forEach(input => {
    input.addEventListener("click", event => event.stopPropagation());
    input.addEventListener("mousedown", event => event.stopPropagation());
    input.addEventListener("keydown", event => {
      if (event.key === "Enter") {
        event.preventDefault();
        event.currentTarget.blur();
      }
    });
    input.addEventListener("blur", lidarAcaoProduto);
  });

  atualizarDashboard(produtos);
}

async function lidarAcaoProduto(event) {
  const action = event.currentTarget.dataset.action;
  const id = event.currentTarget.dataset.id;

  if (action === "qtd-apoio") {
    const item = estoqueApoio.find(i => String(i.id) === String(id));
    if (!item) return;

    const novaQuantidade = Math.max(Number(event.currentTarget.value || 0), 0);
    if (Number(item.quantidade_total || 0) === novaQuantidade) return;

    item.quantidade_total = novaQuantidade;
    const salvo = await salvarItemApoioBanco(item);
    if (salvo) {
      const index = estoqueApoio.findIndex(i => String(i.id) === String(id));
      if (index >= 0) estoqueApoio[index] = salvo;
    }
    renderizarProdutos();
    return;
  }

  if (action === "detalhe-apoio") {
    abrirDetalheApoio(id);
    return;
  }

  const produto = produtos.find(p => p.id === id);
  if (!produto) return;

  if (action === "editar") abrirEditarProduto(id);
  if (action === "detalhe") abrirDetalheProduto(id);

  if (action === "excluir") {
    if (!confirm(`Excluir o produto ${produto.codigo || "sem código"}?`)) return;
    const antesExclusaoProduto = JSON.parse(JSON.stringify(produto));
    const excluido = await excluirProdutoBanco(id);
    if (!excluido) return;

    if (typeof registrarLogSistema === "function") {
      registrarLogSistema({
        modulo: "Produtos",
        acao: "Produto excluído",
        registro_id: antesExclusaoProduto.id,
        registro_nome: antesExclusaoProduto.codigo || antesExclusaoProduto.categoria || "Produto",
        antes: antesExclusaoProduto,
        depois: null
      });
    }

    produtos = produtos.filter(p => p.id !== id);
    renderizarProdutos();
    atualizarDashboard(produtos);
  }

  if (action === "status") {
    const novoStatus = event.currentTarget.value;
    if ((produto.status || "") === novoStatus) return;

    const observacaoAnterior = produto.observacao || "-";

    produto.status = novoStatus;

    if (String(novoStatus || "").trim().toLowerCase() === "livre") {
      produto.observacao = "";
    }

    produto.atualizado_em = new Date().toISOString();
    produto.colaborador = getColaboradorLogado();
    produto.historico = produto.historico || [];
    produto.historico.push({
      data: new Date().toISOString(),
      colaborador: produto.colaborador,
      alteracao: `Status alterado para ${produto.status}`,
      observacao: observacaoAnterior
    });

    const salvo = await salvarProdutoBanco(produto);
    if (salvo) {
      const index = produtos.findIndex(p => p.id === id);
      if (index >= 0) produtos[index] = salvo;

      if (typeof registrarLogSistema === "function") {
        registrarLogSistema({
          modulo: "Produtos",
          acao: "Status alterado",
          registro_id: salvo.id,
          registro_nome: salvo.codigo || "Produto",
          antes: { status: produto.status === novoStatus ? "Anterior" : produto.status, observacao: observacaoAnterior },
          depois: { status: novoStatus, observacao: produto.observacao || "-" }
        });
      }
    }
    renderizarProdutos();
    atualizarDashboard(produtos);
  }

  if (action === "usabilidade") {
    const novaUsabilidade = event.currentTarget.value;
    if ((produto.grau_usabilidade || "Bom") === novaUsabilidade) return;

    produto.grau_usabilidade = novaUsabilidade;
    produto.atualizado_em = new Date().toISOString();
    produto.colaborador = getColaboradorLogado();
    produto.historico = produto.historico || [];
    produto.historico.push({ data: new Date().toISOString(), colaborador: produto.colaborador, alteracao: `Usabilidade alterada para ${produto.grau_usabilidade}`, observacao: produto.observacao || "-" });
    await salvarProdutoBanco(produto);
    await carregarProdutos();
  }

  if (action === "obs") {
    const novaObservacao = event.currentTarget.value.trim();
    if ((produto.observacao || "") === novaObservacao) return;

    produto.observacao = novaObservacao;
    produto.atualizado_em = new Date().toISOString();
    produto.colaborador = getColaboradorLogado();
    produto.historico = produto.historico || [];
    produto.historico.push({ data: new Date().toISOString(), colaborador: produto.colaborador, alteracao: "Observação alterada", observacao: produto.observacao || "-" });
    const salvo = await salvarProdutoBanco(produto);
    if (salvo) {
      const index = produtos.findIndex(p => p.id === id);
      if (index >= 0) produtos[index] = salvo;
    }
    renderizarProdutos();
    atualizarDashboard(produtos);
  }

  renderizarTabelaApoioSeparada();
}


function abrirDetalheApoio(id) {
  const item = estoqueApoio.find(i => String(i.id) === String(id));
  if (!item) return;

  const total = Number(item.quantidade_total || 0);
  const reservado = Number(item.quantidade_reservada || 0);
  const disponivel = Math.max(total - reservado, 0);

  document.getElementById("detalheTitulo").textContent = item.nome || "Item de apoio";
  document.getElementById("produtoDetalheConteudo").innerHTML = `
    <div class="detail-grid">
      <div class="apoio-detail-icon">Qtd</div>
      <div>
        <div class="info-grid">
          <div class="info-box"><span>Item</span><strong>${item.nome || "-"}</strong></div>
          <div class="info-box"><span>Categoria</span><strong>Mesas/Cadeiras</strong></div>
          <div class="info-box"><span>Código</span><strong>Sem código individual</strong></div>
          <div class="info-box"><span>Total disponível</span><strong>${total}</strong></div>
          <div class="info-box"><span>Reservado</span><strong>${reservado}</strong></div>
          <div class="info-box"><span>Disponível agora</span><strong>${disponivel}</strong></div>
          <div class="info-box"><span>Colaborador</span><strong>${item.colaborador || "-"}</strong></div>
          <div class="info-box"><span>Atualizado</span><strong>${formatarData(item.atualizado_em)}</strong></div>
        </div>
        <div class="subpanel">
          <h3>Como funciona</h3>
          <p>Este item não possui código individual. O controle é feito pela quantidade total, quantidade reservada e quantidade disponível.</p>
        </div>
      </div>
    </div>
    <div class="subpanel">
      <h3>Agenda do item</h3>
      <p class="empty">A reserva por período será ligada ao setor de eventos na próxima etapa.</p>
    </div>
  `;
  document.getElementById("produtoDetalheDialog").showModal();
}


function eventosProdutoAgenda(produtoId) {
  if (!Array.isArray(eventos)) return [];

  return eventos.filter(evento => {
    return Array.isArray(evento.tendas) &&
      evento.tendas.some(p => String(p.id) === String(produtoId));
  }).sort((a, b) => String(a.data_evento || "").localeCompare(String(b.data_evento || "")));
}

function statusPagamentoAgenda(evento) {
  return evento.pagamento_quitado ? "Quitado" : "Em aberto";
}

function classePagamentoAgenda(evento) {
  return evento.pagamento_quitado ? "agenda-pagamento-ok" : "agenda-pagamento-aberto";
}


function eventosProdutoAgenda(produtoId) {
  try {
    if (typeof eventos === "undefined" || !Array.isArray(eventos)) return [];

    return eventos.filter(evento => {
      return Array.isArray(evento.tendas) &&
        evento.tendas.some(p => String(p.id) === String(produtoId));
    }).sort((a, b) => String(a.data_evento || "").localeCompare(String(b.data_evento || "")));
  } catch (erro) {
    console.warn("Não foi possível montar agenda do produto:", erro);
    return [];
  }
}

function formatarDataEventoAgenda(dataISO) {
  if (!dataISO) return "-";
  const texto = String(dataISO);
  if (texto.includes("T")) return formatarData(texto);

  const partes = texto.split("-");
  if (partes.length === 3) return `${partes[2]}/${partes[1]}/${partes[0].slice(-2)}`;

  return texto;
}

function horarioEventoAgenda(evento) {
  const inicio = evento.hora_inicio || evento.hora_evento || "";
  const fim = evento.hora_termino || "";
  return inicio ? `${inicio}${fim ? " às " + fim : ""}` : "-";
}

function statusPagamentoAgenda(evento) {
  return evento.pagamento_quitado ? "Quitado" : "Em aberto";
}

function classePagamentoAgenda(evento) {
  return evento.pagamento_quitado ? "agenda-pagamento-ok" : "agenda-pagamento-aberto";
}

function renderizarAgendaProduto(produtoId) {
  const agenda = eventosProdutoAgenda(produtoId);

  if (!agenda.length) {
    return `<p class="empty">Nenhum evento encontrado para este produto.</p>`;
  }

  return `
    <div class="agenda-produto-lista agenda-produto-compacta">
      ${agenda.map(evento => `
        <div class="agenda-produto-linha ${classePagamentoAgenda(evento)}">
          <strong>${evento.nome || "-"}</strong>
          <span>${formatarDataEventoAgenda(evento.data_evento)}</span>
          <span class="agenda-endereco-compacto">${evento.endereco || "-"}</span>
          <button type="button" class="btn-outline agenda-abrir-evento" data-agenda-evento="${evento.id}">
            Abrir evento
          </button>
        </div>
      `).join("")}
    </div>
  `;
}


function normalizarTextoBuscaHistorico(valor) {
  return String(valor || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function historicoProdutoComIndice(produto) {
  const historico = Array.isArray(produto?.historico) ? produto.historico : [];

  return historico.map((item, indexOriginal) => ({
    ...item,
    indexOriginal
  })).slice().reverse();
}

function renderizarHistoricoProdutoDetalhe(produtoId, termo = "") {
  const produto = produtos.find(p => String(p.id) === String(produtoId));
  const area = document.getElementById("historicoProdutoLista");
  const contador = document.getElementById("historicoProdutoContador");

  if (!produto || !area) return;

  const termoNormalizado = normalizarTextoBuscaHistorico(termo);
  const historico = historicoProdutoComIndice(produto);

  const filtrado = historico.filter(h => {
    const texto = [
      formatarData(h.data),
      h.colaborador,
      h.alteracao,
      h.observacao
    ].join(" ");

    return normalizarTextoBuscaHistorico(texto).includes(termoNormalizado);
  });

  if (contador) {
    contador.textContent = `${filtrado.length} de ${historico.length} registro(s)`;
  }

  if (!filtrado.length) {
    area.innerHTML = `<p class="empty">Nenhum histórico encontrado.</p>`;
    return;
  }

  area.innerHTML = filtrado.map(h => `
    <label class="historico-produto-linha historico-produto-check-linha">
      <input type="checkbox" class="historico-produto-check" data-historico-index="${h.indexOriginal}">
      <div class="historico-produto-conteudo">
        <strong>${formatarData(h.data)}</strong>
        <span>${h.colaborador || "-"}</span>
        <span>${h.alteracao || "Alteração realizada"}</span>
        <span class="historico-obs">Obs: ${h.observacao || "-"}</span>
      </div>
    </label>
  `).join("");
}

function indicesHistoricoSelecionados() {
  return Array.from(document.querySelectorAll(".historico-produto-check:checked"))
    .map(input => Number(input.dataset.historicoIndex))
    .filter(Number.isFinite);
}

async function excluirHistoricoProduto(produtoId, indices) {
  const produto = produtos.find(p => String(p.id) === String(produtoId));
  if (!produto || !Array.isArray(produto.historico)) return;

  const unicos = [...new Set(indices)].sort((a, b) => b - a);

  if (!unicos.length) {
    alert("Selecione pelo menos um registro do histórico.");
    return;
  }

  if (!confirm(`Excluir ${unicos.length} registro(s) do histórico deste produto?`)) return;

  const produtoAntesLog = JSON.parse(JSON.stringify(produto));
  const historicosRemovidos = [];

  unicos.forEach(index => {
    if (index >= 0 && index < produto.historico.length) {
      const removido = produto.historico.splice(index, 1)[0];
      historicosRemovidos.push({
        index,
        ...removido
      });
    }
  });

  produto.atualizado_em = new Date().toISOString();
  produto.colaborador = getColaboradorLogado();

  const salvo = await salvarProdutoBanco(produto);

  if (salvo) {
    const indexProduto = produtos.findIndex(p => String(p.id) === String(produtoId));
    if (indexProduto >= 0) produtos[indexProduto] = salvo;

    if (typeof registrarLogSistema === "function") {
      registrarLogSistema({
        modulo: "Produtos",
        acao: historicosRemovidos.length > 1 ? "Histórico do produto excluído em massa" : "Histórico do produto excluído",
        registro_id: salvo.id,
        registro_nome: salvo.codigo || salvo.categoria || salvo.tipo || "Produto",
        antes: {
          produto: {
            id: produtoAntesLog.id,
            codigo: produtoAntesLog.codigo,
            categoria: produtoAntesLog.categoria || produtoAntesLog.tipo,
            tamanho: produtoAntesLog.tamanho,
            status: produtoAntesLog.status
          },
          historicos_removidos: historicosRemovidos
        },
        depois: {
          produto: {
            id: salvo.id,
            codigo: salvo.codigo,
            categoria: salvo.categoria || salvo.tipo,
            tamanho: salvo.tamanho,
            status: salvo.status
          },
          quantidade_removida: historicosRemovidos.length
        },
        detalhes: `${historicosRemovidos.length} registro(s) removido(s) do histórico do produto ${salvo.codigo || ""}`
      });
    }

    renderizarHistoricoProdutoDetalhe(produtoId, document.getElementById("historicoProdutoBusca")?.value || "");
    renderizarProdutos();
    atualizarDashboard(produtos);
  }
}

function selecionarHistoricoFiltradoProduto(marcar = true) {
  document.querySelectorAll(".historico-produto-check").forEach(input => {
    input.checked = marcar;
  });
}

function abrirDetalheProduto(id) {
  const p = produtos.find(produto => produto.id === id);
  if (!p) return;

  document.getElementById("detalheTitulo").textContent = `${p.categoria || p.tipo || "Produto"} ${p.codigo || ""}`;

  const historico = Array.isArray(p.historico) ? p.historico : [];
  const foto = obterFotoProduto(p);

  document.getElementById("produtoDetalheConteudo").innerHTML = `
    <div class="produto-ficha-compacta">
      <div class="produto-ficha-foto">
        ${foto ? `<img src="${foto}" alt="Foto do produto">` : `<span class="product-img-placeholder">Sem foto</span>`}
      </div>

      <div class="produto-ficha-info">
        <div class="produto-info-compact-grid">
          <div><span>Código</span><strong>${p.codigo || "-"}</strong></div>
          <div><span>Categoria</span><strong>${p.categoria || p.tipo || "-"}</strong></div>
          <div><span>Tamanho</span><strong>${p.tamanho || "-"}</strong></div>
          <div><span>Cor</span><strong>${p.cor || "-"}</strong></div>
          <div><span>Status</span><strong>${p.status || "-"}</strong></div>
          <div><span>Usabilidade</span><strong>${p.grau_usabilidade || "Bom"}</strong></div>
          <div><span>Colaborador</span><strong>${p.colaborador || "-"}</strong></div>
          <div><span>Cadastro</span><strong>${formatarData(p.criado_em || p.data_cadastro || p.data_compra)}</strong></div>
          <div><span>Atualizado</span><strong>${formatarData(p.atualizado_em)}</strong></div>
        </div>

        <div class="produto-observacao-compacta">
          <span>Observação</span>
          <strong>${p.observacao || "-"}</strong>
        </div>
      </div>
    </div>

    <div class="subpanel produto-agenda">
      <h3>Agenda do produto</h3>
      ${renderizarAgendaProduto(p.id)}
    </div>

    <div class="subpanel produto-historico-compacto">
      <div class="historico-produto-topo">
        <div>
          <h3>Histórico</h3>
          <span id="historicoProdutoContador" class="historico-produto-contador"></span>
        </div>

        <div class="historico-produto-acoes">
          <input id="historicoProdutoBusca" type="search" placeholder="Buscar serviço, alteração, colaborador ou observação...">
          <button type="button" class="btn-outline" id="selecionarHistoricoFiltrado">Selecionar filtrados</button>
          <button type="button" class="btn-outline" id="limparSelecaoHistorico">Limpar seleção</button>
          <button type="button" class="btn-outline danger" id="excluirHistoricoSelecionado">Excluir selecionados</button>
        </div>
      </div>

      <div id="historicoProdutoLista"></div>
    </div>
  `;

  document.getElementById("produtoDetalheDialog").showModal();

  renderizarHistoricoProdutoDetalhe(p.id);

  const buscaHistorico = document.getElementById("historicoProdutoBusca");
  if (buscaHistorico) {
    buscaHistorico.addEventListener("input", () => {
      renderizarHistoricoProdutoDetalhe(p.id, buscaHistorico.value);
    });
  }

  document.getElementById("selecionarHistoricoFiltrado")?.addEventListener("click", () => selecionarHistoricoFiltradoProduto(true));
  document.getElementById("limparSelecaoHistorico")?.addEventListener("click", () => selecionarHistoricoFiltradoProduto(false));
  document.getElementById("excluirHistoricoSelecionado")?.addEventListener("click", () => {
    excluirHistoricoProduto(p.id, indicesHistoricoSelecionados());
  });
}


document.addEventListener("click", event => {
  const btn = event.target.closest("[data-agenda-evento]");
  if (!btn) return;

  const eventoId = btn.dataset.agendaEvento;

  if (typeof abrirDetalheEvento === "function") {
    abrirDetalheEvento(eventoId);
  } else {
    alert("Abra o setor de Eventos para visualizar este evento.");
  }
});


/* Atualiza badges de disponibilidade quando Eventos/Rotas mudarem */
window.addEventListener("riotendas:eventos-atualizados", async () => {
  try {
    if (typeof carregarEventosDisponibilidadeProduto === "function") {
      await carregarEventosDisponibilidadeProduto();
    }
    if (typeof renderizarProdutos === "function") {
      renderizarProdutos();
    }
  } catch (erro) {
    console.warn("Erro ao atualizar badges de produtos:", erro);
  }
});
