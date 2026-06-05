let produtos = [];
let estoqueApoio = [];
let fotoAtual = "";
const produtoDetalheCache = new Map();

const storageProdutosKey = "novoRioTendasProdutosV1";
const storageApoioKey = "novoRioTendasEstoqueApoioV1";
const storageApoioExcluidosKey = "novoRioTendasEstoqueApoioExcluidosV1";

function chaveMaterialApoio(nome) {
  return String(nome || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function nomesMateriaisApoioExcluidos() {
  try {
    return JSON.parse(localStorage.getItem(storageApoioExcluidosKey) || "[]");
  } catch (erro) {
    return [];
  }
}

function materialApoioEstaExcluido(nome) {
  return nomesMateriaisApoioExcluidos().includes(chaveMaterialApoio(nome));
}

function marcarMaterialApoioExcluido(nome) {
  const chave = chaveMaterialApoio(nome);
  if (!chave) return;
  const excluidos = nomesMateriaisApoioExcluidos();
  if (!excluidos.includes(chave)) {
    excluidos.push(chave);
    localStorage.setItem(storageApoioExcluidosKey, JSON.stringify(excluidos));
  }
}

function desmarcarMaterialApoioExcluido(nome) {
  const chave = chaveMaterialApoio(nome);
  if (!chave) return;
  const excluidos = nomesMateriaisApoioExcluidos().filter(i => i !== chave);
  localStorage.setItem(storageApoioExcluidosKey, JSON.stringify(excluidos));
}

function filtrarMateriaisApoioVisiveis(lista) {
  return (lista || []).filter(item => !materialApoioEstaExcluido(item.nome));
}


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
    .select("id,codigo,tipo,categoria,tamanho,status,cor,observacao,foto,grau_usabilidade,colaborador,historico,locacoes,atualizado_em,criado_em")
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

async function buscarProdutoDetalheBanco(id, usarCache = true) {
  const chave = String(id || "");

  if (usarCache && produtoDetalheCache.has(chave)) {
    return produtoDetalheCache.get(chave);
  }

  if (!supabaseClient) {
    const local = produtos.find(p => String(p.id) === chave) || null;
    if (local) produtoDetalheCache.set(chave, local);
    return local;
  }

  const { data, error } = await supabaseClient
    .from("produtos")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error("Erro ao buscar detalhe do produto:", error);
    const fallback = produtos.find(p => String(p.id) === chave) || null;
    return fallback;
  }

  if (data) {
    const index = produtos.findIndex(p => String(p.id) === chave);
    if (index >= 0) produtos[index] = { ...produtos[index], ...data };
    else produtos.push(data);
    produtoDetalheCache.set(chave, data);
  }

  return data || null;
}

function limparCacheDetalheProduto(id) {
  if (id) produtoDetalheCache.delete(String(id));
  else produtoDetalheCache.clear();
}

async function carregarProdutoDetalheParaUso(id) {
  return await buscarProdutoDetalheBanco(id, true);
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

  if (data) {
    limparCacheDetalheProduto(data.id);
    produtoDetalheCache.set(String(data.id), data);
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
  const nomesExistentes = new Set(estoque.map(i => chaveMaterialApoio(i.nome)));
  let alterou = false;

  itensApoioPadrao.forEach(nome => {
    if (materialApoioEstaExcluido(nome)) return;
    if (!nomesExistentes.has(chaveMaterialApoio(nome))) {
      estoque.push({
        id: "local-" + gerarId(),
        nome,
        quantidade_total: 0,
        quantidade_reservada: 0,
        atualizado_em: new Date().toISOString(),
        colaborador: getColaboradorLogado()
      });
      alterou = true;
    }
  });

  estoque = filtrarMateriaisApoioVisiveis(estoque);

  if (alterou || !JSON.parse(localStorage.getItem(storageApoioKey) || "[]").length) {
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

  if (data && data.length) {
    const dadosVisiveis = filtrarMateriaisApoioVisiveis(data);
    const nomesExistentes = new Set(data.map(i => chaveMaterialApoio(i.nome)));
    const faltantes = itensApoioPadrao
      .filter(nome => !materialApoioEstaExcluido(nome))
      .filter(nome => !nomesExistentes.has(chaveMaterialApoio(nome)))
      .map(nome => ({
        nome,
        quantidade_total: 0,
        quantidade_reservada: 0,
        atualizado_em: new Date().toISOString(),
        colaborador: getColaboradorLogado()
      }));

    if (faltantes.length) {
      const { data: criadosFaltantes, error: erroFaltantes } = await supabaseClient
        .from("estoque_apoio")
        .insert(faltantes)
        .select();
      if (!erroFaltantes && criadosFaltantes) return [...dadosVisiveis, ...criadosFaltantes].sort((a, b) => String(a.nome || "").localeCompare(String(b.nome || "")));
    }

    return dadosVisiveis;
  }

  const iniciais = itensApoioPadrao
    .filter(nome => !materialApoioEstaExcluido(nome))
    .map(nome => ({
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
  desmarcarMaterialApoioExcluido(item.nome);
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

// v19-dev: cache global de produtos para reduzir delay em rotas/calendário/troca
let produtosCacheGlobalEmCarregamento = null;
let produtosCacheGlobalTimestamp = 0;
const PRODUTOS_CACHE_GLOBAL_TTL_MS = 5 * 60 * 1000;

function invalidarCacheProdutosGlobal() {
  produtosCacheGlobalEmCarregamento = null;
  produtosCacheGlobalTimestamp = 0;
}

function produtosCacheGlobalValido() {
  return Array.isArray(produtos) && produtos.length > 0 && (Date.now() - produtosCacheGlobalTimestamp) < PRODUTOS_CACHE_GLOBAL_TTL_MS;
}


// v19-dev: atualiza dashboard sem forçar renderização pesada repetida
let rtDashboardProdutosTimer = null;
function rtAtualizarDashboardProdutosLeve() {
  if (typeof atualizarDashboard !== "function") return;
  clearTimeout(rtDashboardProdutosTimer);
  rtDashboardProdutosTimer = setTimeout(() => atualizarDashboard(produtos), 60);
}


function rtProdutosSectionAtiva() {
  const section = document.getElementById("produtosSection");
  return !!section && section.classList.contains("active-section");
}

async function carregarProdutos(forceReload = false) {
  if (!forceReload && produtosCacheGlobalValido()) {
    if (rtProdutosSectionAtiva()) renderizarProdutos();
    rtAtualizarDashboardProdutosLeve();
    return produtos;
  }

  if (!forceReload && produtosCacheGlobalEmCarregamento) {
    await produtosCacheGlobalEmCarregamento;
    if (rtProdutosSectionAtiva()) renderizarProdutos();
    rtAtualizarDashboardProdutosLeve();
    return produtos;
  }

  produtosCacheGlobalEmCarregamento = (async () => {
    produtos = await buscarProdutosBanco();
    estoqueApoio = await buscarEstoqueApoioBanco();
    produtosCacheGlobalTimestamp = Date.now();
    return produtos;
  })();

  try {
    await produtosCacheGlobalEmCarregamento;
  } finally {
    produtosCacheGlobalEmCarregamento = null;
  }

  if (rtProdutosSectionAtiva()) renderizarProdutos();
  rtAtualizarDashboardProdutosLeve();
  return produtos;
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
  document.getElementById("duplicarProdutoBtn")?.addEventListener("click", duplicarProdutoAtual);

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
  document.getElementById("duplicarProdutoBtn").style.display = "none";
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
  document.getElementById("duplicarProdutoBtn").style.display = "inline-flex";
  document.getElementById("produtoDialog").showModal();
}


function sugerirProximoCodigoProduto(categoriaBase = "") {
  const categoriaNormalizada = String(categoriaBase || "").trim().toLowerCase();

  const codigosNumericos = (Array.isArray(produtos) ? produtos : [])
    .filter(p => String(p.categoria || p.tipo || "").trim().toLowerCase() === categoriaNormalizada)
    .map(p => String(p.codigo || "").trim())
    .filter(c => /^\d+$/.test(c))
    .map(c => Number(c));

  const proximo = codigosNumericos.length ? Math.max(...codigosNumericos) + 1 : 1;
  const largura = Math.max(3, String(Math.max(...codigosNumericos, proximo)).length);
  return String(proximo).padStart(largura, "0");
}

function duplicarProdutoAtual() {
  const idAtual = document.getElementById("produtoId").value;
  const produtoAtual = (Array.isArray(produtos) ? produtos : []).find(p => String(p.id) === String(idAtual));

  if (!produtoAtual) {
    alert("Abra um produto existente para duplicar.");
    return;
  }

  const novoCodigo = sugerirProximoCodigoProduto(produtoAtual.categoria || produtoAtual.tipo || "");

  document.getElementById("produtoId").value = "";
  document.getElementById("produtoCodigo").value = novoCodigo;
  document.getElementById("produtoCategoria").value = produtoAtual.categoria || produtoAtual.tipo || "";
  atualizarTamanhos();
  document.getElementById("produtoTamanho").value = produtoAtual.tamanho || "";
  document.getElementById("produtoCor").value = produtoAtual.cor || "";
  document.getElementById("produtoStatus").value = produtoAtual.status || "Livre";
  document.getElementById("produtoUsabilidade").value = produtoAtual.grau_usabilidade || "Bom";
  document.getElementById("produtoObservacao").value = produtoAtual.observacao || "";
  fotoAtual = produtoAtual.foto || "";
  document.getElementById("fotoPreview").src = fotoAtual || "";
  document.getElementById("produtoModalTitulo").textContent = `Duplicar produto - novo código ${novoCodigo}`;
  document.getElementById("duplicarProdutoBtn").style.display = "none";
  document.getElementById("produtoCodigo").focus();
  document.getElementById("produtoCodigo").select();
}


function fecharProdutoModal() {
  document.getElementById("produtoDialog").close();
}


function codigoProdutoJaExiste(codigo, idAtual = "") {
  const codigoNormalizado = String(codigo || "").trim().toLowerCase();

  if (!codigoNormalizado) return false;

  return (Array.isArray(produtos) ? produtos : []).some(p => {
    const mesmoCodigo = String(p.codigo || "").trim().toLowerCase() === codigoNormalizado;
    const outroProduto = String(p.id || "") !== String(idAtual || "");
    return mesmoCodigo && outroProduto;
  });
}

async function salvarProdutoForm(event) {
  event.preventDefault();
  const id = document.getElementById("produtoId").value || gerarId();
  const existente = produtos.find(p => p.id === id);
  const colaborador = getColaboradorLogado();

  const codigoInformado = document.getElementById("produtoCodigo").value.trim();

  if (codigoProdutoJaExiste(codigoInformado, id)) {
    alert(`Já existe um produto cadastrado com o código ${codigoInformado}. Use outro código.`);
    document.getElementById("produtoCodigo").focus();
    return;
  }

  const produto = {
    id,
    codigo: codigoInformado,
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
  rtAtualizarDashboardProdutosLeve();
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

function rtTimestampLocalOperacional(valor) {
  if (!valor) return NaN;

  // Datas/horários de montagem e desmontagem são operacionais locais.
  // Não usar new Date(valor) aqui, pois valores vindos do Supabase com Z/+00:00
  // sofrem deslocamento UTC (-3h no Brasil) e liberam material antes do horário real.
  const texto = String(valor).trim();
  const dataMatch = texto.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!dataMatch) {
    const fallback = new Date(texto).getTime();
    return Number.isNaN(fallback) ? NaN : fallback;
  }

  const horaMatch = texto.match(/T(\d{2}):(\d{2})/);
  const ano = Number(dataMatch[1]);
  const mes = Number(dataMatch[2]) - 1;
  const dia = Number(dataMatch[3]);
  const hora = horaMatch ? Number(horaMatch[1]) : 0;
  const minuto = horaMatch ? Number(horaMatch[2]) : 0;

  return new Date(ano, mes, dia, hora, minuto, 0, 0).getTime();
}

function periodoProdutoSelecionado() {
  const inicio = document.getElementById("dispProdutoInicio")?.value || "";
  const fim = document.getElementById("dispProdutoFim")?.value || "";

  if (!inicio || !fim) return null;

  if (rtTimestampLocalOperacional(fim) <= rtTimestampLocalOperacional(inicio)) {
    return { invalido: true, inicio, fim };
  }

  return { inicio, fim };
}

function conflitoPeriodoProduto(inicioBusca, fimBusca, inicioReserva, fimReserva) {
  if (!inicioBusca || !fimBusca || !inicioReserva || !fimReserva) return false;

  const ib = rtTimestampLocalOperacional(inicioBusca);
  const fb = rtTimestampLocalOperacional(fimBusca);
  const ir = rtTimestampLocalOperacional(inicioReserva);
  const fr = rtTimestampLocalOperacional(fimReserva);

  if ([ib, fb, ir, fr].some(Number.isNaN)) return false;

  return ib < fr && fb > ir;
}



function obterRotasOperacaoProdutoDisponibilidade() {
  try {
    if (typeof rotasOperacao !== "undefined" && rotasOperacao && typeof rotasOperacao === "object") return rotasOperacao;
  } catch {}

  try {
    const local = JSON.parse(localStorage.getItem("novoRioTendasRotasOperacaoV1") || "{}");
    return local && typeof local === "object" ? local : {};
  } catch {
    return {};
  }
}

function eventoMontagemPendenteEntregaProduto(evento) {
  if (!evento || !evento.id || !evento.montagem) return false;

  const montagem = new Date(evento.montagem);
  if (Number.isNaN(montagem.getTime())) return false;

  const agora = new Date();
  if (agora.getTime() < montagem.getTime()) return false;

  const operacoes = obterRotasOperacaoProdutoDisponibilidade();
  const opMontagem = operacoes[`${evento.id}-montagem`];

  // Se já marcou entregue ou recolhido, não é pendência de entrega.
  if (opMontagem && ["entregue", "recolhido"].includes(String(opMontagem.status || "").toLowerCase())) return false;

  return true;
}

function pendenciaEntregaProduto(produto) {
  const pendentes = getEventosDisponibilidadeProduto()
    .filter(evento => eventoUsaProdutoParaDisponibilidade(evento, produto))
    .filter(eventoMontagemPendenteEntregaProduto)
    .sort((a, b) => new Date(a.montagem).getTime() - new Date(b.montagem).getTime());

  return pendentes[0] || null;
}

function dataISOProdutoDisponibilidade(valor) {
  if (!valor) return "";
  return String(valor).slice(0, 10);
}

function rtTipoHorarioBaseDisponibilidade(valor) {
  return String(valor || "").split("|")[0] || "";
}

function rtFimOperacaoDisponibilidade(valor, tipoSalvo, fallbackData = "") {
  if (!valor && !fallbackData) return null;

  const tipo = rtTipoHorarioBaseDisponibilidade(tipoSalvo);
  const data = dataISOProdutoDisponibilidade(valor || fallbackData);
  if (!data) return valor || null;

  // Regra segura de desmontagem:
  // - Exatamente: respeita o horário informado.
  // - Até / A partir de / Livre / Comercial: o material continua bloqueado até o fim do dia
  //   ou até o fluxo operacional marcar recolhido/revisado/livre.
  // Isso evita liberar o material no próprio dia da retirada antes da equipe realmente recolher.
  const tipoNormalizado = String(tipo || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

  const deveSegurarAteFimDoDia = [
    "horario comercial",
    "livre / combinar",
    "livre",
    "comercial",
    "ate",
    "a partir de",
    "a partir"
  ].includes(tipoNormalizado);

  if (deveSegurarAteFimDoDia) return `${data}T23:59`;

  if (String(valor || "").includes("T")) return valor;
  return `${data}T23:59`;
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

  // Ajuste fino: no dia da desmontagem Livre/Comercial, não libera às 00:00.
  fim = rtFimOperacaoDisponibilidade(fim, evento.desmontagem_tipo, dataEvento);

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
    const pendenteEntrega = pendenciaEntregaProduto(produto);

    if (pendenteEntrega) {
      const intervaloPendente = intervaloEventoDisponibilidade(pendenteEntrega);
      return {
        classe: "pendente-entrega",
        texto: "Pendente entrega",
        detalhe: `${pendenteEntrega.nome || "Cliente"} — montagem prevista ${formatarDataHoraProdutoDisp(pendenteEntrega.montagem || intervaloPendente.inicio)}`
      };
    }

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
  // Materiais de Apoio agora são renderizadas em tabela separada,
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

  // Mantém o filtro do topo: só mostra em Todas ou Materiais de Apoio
  if (categoriaFiltro && categoriaFiltro !== "Materiais de Apoio") {
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

  const gruposApoio = itensFiltrados.reduce((acc, item) => {
    const grupo = (typeof grupoMaterialApoio === "function") ? grupoMaterialApoio(item.nome) : "Materiais Gerais";
    if (!acc[grupo]) acc[grupo] = [];
    acc[grupo].push(item);
    return acc;
  }, {});

  const ordemGruposApoio = ["Materiais Gerais", "Caixas Térmicas", "Toalhas", "Acessórios de Tendas"];

  area.style.display = "";

  if (!itensFiltrados.length) {
    area.innerHTML = `
      <div class="apoio-separado-header">
        <h3>Materiais de Apoio</h3>
        <span>Controle por quantidade, sem código individual</span>
      </div>
      <p class="empty">Nenhum item de apoio disponível no período selecionado.</p>
    `;
    return;
  }

  area.innerHTML = `
    <div class="apoio-separado-header">
      <h3>Materiais de Apoio</h3>
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
          ${ordemGruposApoio.filter(grupo => gruposApoio[grupo]?.length).map(grupo => `
            <tr class="apoio-grupo-row"><td colspan="5"><strong>${grupo}</strong></td></tr>
            ${gruposApoio[grupo].map(item => {
            const total = Number(item.quantidade_total || 0);
            const dispPeriodo = disponibilidadeApoioNoPeriodo(item);
            const reservado = Number(dispPeriodo.reservado || 0);
            const disponivel = Math.max(Number(dispPeriodo.disponivel || 0), 0);
            const statusPeriodo = statusApoioPeriodo(item);

            return `
              <tr class="apoio-row-separada">
                <td><span class="apoio-icon">Qtd</span></td>
                <td>${grupo}</td>
                <td>${item.nome || "-"}</td>
                <td>
                  <div class="qtd-apoio-box qtd-apoio-somente-leitura">
                    <span>Total: <strong>${total}</strong> | Reservado: <strong>${reservado}</strong> | Disponível: <strong>${disponivel}</strong></span>
                  </div>
                </td>
                <td class="availability-cell">
                  <span class="disp-badge disp-${statusPeriodo.classe}" title="${dispPeriodo.detalhe}">
                    ${statusPeriodo.texto}
                  </span>
                  <small class="disp-detail">${dispPeriodo.detalhe}</small>
                  <button type="button" class="btn-outline mini" data-action="detalhe-apoio" data-id="${item.id}">Detalhes</button>
                </td>
              </tr>
            `;
          }).join("")}
          `).join("")}        </tbody>
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

function obterUltimaChecagemProduto(produto, inicio = null, fim = null) {
  const historico = Array.isArray(produto?.historico) ? produto.historico : [];
  const checks = historico
    .filter(item => String(item.alteracao || "").toLowerCase().includes("checagem de depósito") || String(item.alteracao || "").toLowerCase().includes("checagem de deposito"))
    .map(item => ({ ...item, dataObj: new Date(item.data || item.criado_em || item.atualizado_em || 0) }))
    .filter(item => !Number.isNaN(item.dataObj.getTime()));

  const filtrados = checks.filter(item => {
    if (inicio && item.dataObj < inicio) return false;
    if (fim && item.dataObj > fim) return false;
    return true;
  });

  return filtrados.sort((a, b) => b.dataObj - a.dataObj)[0] || null;
}

function htmlCheckDepositoProduto(produto) {
  const ultimo = obterUltimaChecagemProduto(produto);
  const titulo = ultimo
    ? `Última checagem: ${formatarData(ultimo.data)} por ${ultimo.colaborador || "-"}`
    : "Marcar produto como checado no depósito";

  return `
    <button type="button" class="btn-check-produto" data-action="check-deposito" data-id="${produto.id}" title="${titulo.replaceAll('"', '&quot;')}">✓</button>
  `;
}

function renderizarProdutos() {
  const tbody = document.getElementById("produtosTbody");
  const filtrados = filtrarProdutos();

  document.getElementById("prodTotal").textContent = filtrados.length;
  document.getElementById("prodLivres").textContent = filtrados.filter(p => p.status === "Livre").length;
  document.getElementById("prodProblema").textContent = filtrados.filter(p => p.status !== "Livre").length;

  if (!filtrados.length) {
    tbody.innerHTML = `<tr><td colspan="11" class="empty">Nenhum produto com código cadastrado.</td></tr>${renderizarLinhasApoio()}`;
    configurarEventosTabelaProdutos(tbody);
    rtAtualizarDashboardProdutosLeve();
    return;
  }

  const ordenados = [...filtrados].sort((a,b) => {
    const aMesa = (a.categoria || a.tipo) === "Materiais de Apoio";
    const bMesa = (b.categoria || b.tipo) === "Materiais de Apoio";
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
      <td class="check-cell">${htmlCheckDepositoProduto(p)}</td>
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


  rtAtualizarDashboardProdutosLeve();
}

async function lidarAcaoProduto(event) {
  const action = event.currentTarget.dataset.action;
  const id = event.currentTarget.dataset.id;

  if (action === "detalhe-apoio") {
    abrirDetalheApoio(id);
    return;
  }

  let produto = produtos.find(p => p.id === id);
  if (!produto) return;

  // Status e observação devem responder rápido na tela de Produtos.
  // A lista inicial já traz historico/locacoes, evitando uma consulta extra ao Supabase
  // a cada alteração. Essa consulta extra era o que deixava o primeiro ajuste lento.

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
    rtAtualizarDashboardProdutosLeve();
  }

  if (action === "status") {
    const novoStatus = event.currentTarget.value;
    if ((produto.status || "") === novoStatus) return;

    const statusAnterior = produto.status || "";
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
      alteracao: `Status alterado manualmente para ${produto.status}`,
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
          antes: { status: statusAnterior, observacao: observacaoAnterior },
          depois: { status: novoStatus, observacao: produto.observacao || "-" }
        });
      }
    }
    renderizarProdutos();
    rtAtualizarDashboardProdutosLeve();
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
    invalidarCacheProdutosGlobal();
  await carregarProdutos(true);
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
    rtAtualizarDashboardProdutosLeve();
  }


  if (action === "check-deposito") {
    const agora = new Date().toISOString();
    const colaborador = getColaboradorLogado();
    produto.atualizado_em = agora;
    produto.colaborador = colaborador;
    produto.historico = produto.historico || [];
    produto.historico.push({
      data: agora,
      colaborador,
      alteracao: "Checagem de depósito",
      observacao: "Produto conferido no depósito"
    });

    const salvo = await salvarProdutoBanco(produto);
    if (salvo) {
      const index = produtos.findIndex(p => p.id === id);
      if (index >= 0) produtos[index] = salvo;

      if (typeof registrarLogSistema === "function") {
        registrarLogSistema({
          modulo: "Produtos",
          acao: "Produto checado no depósito",
          registro_id: salvo.id,
          registro_nome: salvo.codigo || "Produto",
          antes: null,
          depois: { codigo: salvo.codigo || "-", data: agora, colaborador }
        });
      }
    }

    renderizarProdutos();
    if (typeof renderizarRelatorioChecagem === "function") renderizarRelatorioChecagem();
    return;
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
          <div class="info-box"><span>Categoria</span><strong>Materiais de Apoio</strong></div>
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

const LIMITE_LINHAS_DETALHE_PRODUTO = 7;
const LIMITE_LINHAS_AGENDA_PRODUTO = 2;

function renderizarAgendaProduto(produtoId, pagina = 1) {
  const agenda = eventosProdutoAgenda(produtoId);

  if (!agenda.length) {
    return `<p class="empty agenda-produto-vazia">Nenhum evento encontrado para este produto.</p>`;
  }

  return `
    <div class="agenda-produto-lista agenda-produto-compacta" data-agenda-limite="${LIMITE_LINHAS_AGENDA_PRODUTO}">
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

function mudarPaginaAgendaProduto(produtoId, pagina) {
  const area = document.getElementById("agendaProdutoConteudo");
  if (!area) return;
  area.innerHTML = renderizarAgendaProduto(produtoId, pagina);
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

  const paginaSalva = Number(area.dataset.pagina || 1);
  const totalPaginas = Math.max(1, Math.ceil(filtrado.length / LIMITE_LINHAS_DETALHE_PRODUTO));
  const paginaAtual = Math.min(Math.max(paginaSalva, 1), totalPaginas);
  const inicio = (paginaAtual - 1) * LIMITE_LINHAS_DETALHE_PRODUTO;
  const exibidos = filtrado.slice(inicio, inicio + LIMITE_LINHAS_DETALHE_PRODUTO);
  area.dataset.pagina = String(paginaAtual);

  if (contador) {
    contador.textContent = filtrado.length > LIMITE_LINHAS_DETALHE_PRODUTO
      ? `Mostrando ${inicio + 1}-${Math.min(inicio + LIMITE_LINHAS_DETALHE_PRODUTO, filtrado.length)} de ${filtrado.length} registro(s)`
      : `${filtrado.length} de ${historico.length} registro(s)`;
  }

  const precisaPaginacao = filtrado.length > LIMITE_LINHAS_DETALHE_PRODUTO;
  const paginacaoHtml = `
    <div class="produto-detalhe-paginacao ${precisaPaginacao ? "" : "produto-detalhe-paginacao-reservada"}">
      <button type="button" class="btn-outline" onclick="mudarPaginaHistoricoProduto('${produtoId}', ${paginaAtual - 1})" ${paginaAtual <= 1 || !precisaPaginacao ? "disabled" : ""}>Anterior</button>
      <button type="button" class="btn-outline" onclick="mudarPaginaHistoricoProduto('${produtoId}', ${paginaAtual + 1})" ${paginaAtual >= totalPaginas || !precisaPaginacao ? "disabled" : ""}>Próxima</button>
    </div>
  `;

  if (!filtrado.length) {
    area.innerHTML = `<p class="empty">Nenhum histórico encontrado.</p>${paginacaoHtml}`;
    return;
  }

  area.innerHTML = `
    <div class="historico-produto-lista-interna">
      ${exibidos.map(h => `
        <label class="historico-produto-linha historico-produto-check-linha">
          <input type="checkbox" class="historico-produto-check" data-historico-index="${h.indexOriginal}">
          <div class="historico-produto-conteudo">
            <strong>${formatarData(h.data)}</strong>
            <span>${h.colaborador || "-"}</span>
            <span>${h.alteracao || "Alteração realizada"}</span>
            <span class="historico-obs">Obs: ${h.observacao || "-"}</span>
          </div>
        </label>
      `).join("")}
    </div>
    ${paginacaoHtml}
  `;
}

function mudarPaginaHistoricoProduto(produtoId, pagina) {
  const area = document.getElementById("historicoProdutoLista");
  if (!area) return;
  area.dataset.pagina = String(Math.max(Number(pagina) || 1, 1));
  renderizarHistoricoProdutoDetalhe(produtoId, document.getElementById("historicoProdutoBusca")?.value || "");
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
    rtAtualizarDashboardProdutosLeve();
  }
}

function selecionarHistoricoFiltradoProduto(marcar = true) {
  document.querySelectorAll(".historico-produto-check").forEach(input => {
    input.checked = marcar;
  });
}

async function abrirDetalheProduto(id) {
  const resumo = produtos.find(produto => produto.id === id);
  if (!resumo) return;

  document.getElementById("detalheTitulo").textContent = `${resumo.categoria || resumo.tipo || "Produto"} ${resumo.codigo || ""}`;
  document.getElementById("produtoDetalheConteudo").innerHTML = `<div class="subpanel"><p class="empty">Carregando histórico e agenda do produto...</p></div>`;
  document.getElementById("produtoDetalheDialog").showModal();

  const p = await buscarProdutoDetalheBanco(id, true) || resumo;

  document.getElementById("detalheTitulo").textContent = `${p.categoria || p.tipo || "Produto"} ${p.codigo || ""}`;

  const historico = Array.isArray(p.historico) ? p.historico : [];
  const foto = obterFotoProduto(p);

  document.getElementById("produtoDetalheConteudo").innerHTML = `
    <div class="produto-ficha-compacta">
      <div class="produto-ficha-foto">
        ${foto ? `<img src="${foto}" alt="Foto do produto">` : `<span class="product-img-placeholder">Sem foto</span>`}
      </div>

      <div class="produto-ficha-info">
        <div class="produto-dados-3linhas">
          <div class="produto-dados-linha produto-dados-linha-4">
            <div><span>Código</span><strong>${p.codigo || "-"}</strong></div>
            <div><span>Categoria</span><strong>${p.categoria || p.tipo || "-"}</strong></div>
            <div><span>Tamanho</span><strong>${p.tamanho || "-"}</strong></div>
            <div><span>Cor</span><strong>${p.cor || "-"}</strong></div>
          </div>
          <div class="produto-dados-linha produto-dados-linha-4">
            <div><span>Status</span><strong>${p.status || "-"}</strong></div>
            <div><span>Usabilidade</span><strong>${p.grau_usabilidade || "Bom"}</strong></div>
            <div><span>Colaborador</span><strong>${p.colaborador || "-"}</strong></div>
            <div><span>Cadastro</span><strong>${formatarData(p.criado_em || p.data_cadastro || p.data_compra)}</strong></div>
          </div>
          <div class="produto-dados-linha produto-dados-linha-2">
            <div><span>Observação</span><strong>${p.observacao || "-"}</strong></div>
            <div><span>Atualizado</span><strong>${formatarData(p.atualizado_em)}</strong></div>
          </div>
        </div>
      </div>
    </div>

    <div class="subpanel produto-agenda">
      <h3>Agenda do produto</h3>
      <div id="agendaProdutoConteudo">${renderizarAgendaProduto(p.id)}</div>
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

  renderizarHistoricoProdutoDetalhe(p.id);

  const buscaHistorico = document.getElementById("historicoProdutoBusca");
  if (buscaHistorico) {
    buscaHistorico.addEventListener("input", () => {
      const areaHistorico = document.getElementById("historicoProdutoLista");
      if (areaHistorico) areaHistorico.dataset.pagina = "1";
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

// Recebe alterações feitas em Configurações > Materiais de Apoio e atualiza a tela sem F5.
window.addEventListener("materiaisApoioAtualizados", async () => {
  try {
    if (typeof invalidarCacheProdutosGlobal === "function") invalidarCacheProdutosGlobal();
    if (typeof carregarProdutos === "function") await carregarProdutos(true);
    else if (typeof renderizarProdutos === "function") renderizarProdutos();
  } catch (erro) {
    console.warn("Falha ao atualizar materiais de apoio automaticamente.", erro);
  }
});
