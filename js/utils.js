const categorias = {
  "Tenda Sanfonada": ["3x3", "4.5x3", "4x4", "6x3"],
  "Tenda Piramidal": ["5x5", "6x6", "8x8", "10x10"],
  "Ombrelone": ["2,40"],
  "Materiais de Apoio": ["Sem código individual"]
};

const cores = ["Branca", "Cristal", "Preta"];
const statusProdutos = ["Livre", "Alugado", "Bloqueada", "Limpar", "Consertar", "Revisar"];
const grausUsabilidade = ["Excelente", "Bom", "Regular", "Ruim", "Venda / Baixa"];

function normalizarStatus(status) {
  return String(status || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replaceAll(" ", "-");
}

function formatarData(dataISO) {
  if (!dataISO) return "-";
  const data = new Date(dataISO);
  if (Number.isNaN(data.getTime())) return dataISO;
  return data.toLocaleDateString("pt-BR") + " " + data.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function getColaboradorLogado() {
  if (window.getColaboradorLogado && window.getColaboradorLogado !== getColaboradorLogado) {
    return window.getColaboradorLogado();
  }

  try {
    const usuario = JSON.parse(localStorage.getItem("novoRioTendasUsuarioSessaoV1") || "null");
    if (usuario && (usuario.nome || usuario.usuario)) return usuario.nome || usuario.usuario;
  } catch {}

  return localStorage.getItem("novoRioTendasColaborador") || "";
}

function gerarId() {
  return crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random());
}

function popularSelect(select, opcoes, valorInicial = "") {
  select.innerHTML = "";
  if (valorInicial !== null) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = valorInicial || "Selecione";
    select.appendChild(opt);
  }
  opcoes.forEach(item => {
    const opt = document.createElement("option");
    opt.value = item;
    opt.textContent = item;
    select.appendChild(opt);
  });
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    if (!file) return resolve("");
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}


function normalizarClasse(valor) {
  return String(valor || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}


const itensApoioPadrao = [
  "Mesa Plástica Branca",
  "Cadeira Plástica Branca",
  "Mesa de Madeira",
  "Cadeira de Madeira",
  "Mesa Bistrô",
  "Cadeira Bistrô",
  "Caixa Térmica 190L",
  "Caixa Térmica 360L",
  "Toalha Branca",
  "Toalha Azul",
  "Toalha Verde",
  "Lateral 3m",
  "Lateral 4m",
  "Lateral 4,5m",
  "Lateral 5m",
  "Lateral 6m",
  "Lateral 8m",
  "Lateral 10m"
];

function grupoMaterialApoio(nome) {
  const texto = String(nome || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (texto.includes("caixa termica") || texto.includes("caixa térmica")) return "Caixas Térmicas";
  if (texto.includes("toalha")) return "Toalhas";
  if (texto.includes("lateral")) return "Acessórios de Tendas";
  return "Materiais Gerais";
}

// v19-dev: alerta operacional por observação entre asteriscos (*texto*)
function rtHojeISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function rtEventoDataISO(evento = {}) {
  return String(evento.data_evento || evento.data || evento.data_montagem || evento.montagem_data || "").slice(0, 10);
}

function rtEventoEhHojeOuFuturo(evento = {}) {
  const data = rtEventoDataISO(evento);
  if (!data) return false;
  return data >= rtHojeISO();
}

function rtTextoObservacaoEvento(evento = {}) {
  return String(
    evento.observacao_evento ||
    evento.observacao ||
    evento.observacoes ||
    evento.obs ||
    evento.cliente_observacao ||
    evento.observacao_cliente ||
    ""
  );
}

function rtExtrairAlertasAsterisco(texto = "") {
  const alertas = [];
  const re = /\*([^*\n][^*]*?)\*/g;
  let match;
  while ((match = re.exec(String(texto || ""))) !== null) {
    const valor = String(match[1] || "").trim();
    if (valor) alertas.push(valor);
  }
  return alertas;
}

function rtEventoAlertaTexto(evento = {}) {
  if (!rtEventoEhHojeOuFuturo(evento)) return "";
  return rtExtrairAlertasAsterisco(rtTextoObservacaoEvento(evento)).join(" • ");
}

function rtEventoEscapeHtml(valor) {
  return String(valor ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function rtEventoAlertaHtml(evento = {}) {
  const texto = rtEventoAlertaTexto(evento);
  if (!texto) return "";
  const safe = rtEventoEscapeHtml(texto);
  return `<span class="rt-evento-alerta-asterisco" title="${safe}" data-rt-alerta-obs="${safe}" aria-label="Alerta do evento">⚠️</span>`;
}

if (!window.__rtEventoAlertaAsteriscoClick) {
  window.__rtEventoAlertaAsteriscoClick = true;
  document.addEventListener("click", (ev) => {
    const alvo = ev.target.closest?.("[data-rt-alerta-obs]");
    if (!alvo) return;
    ev.stopPropagation();
    const txt = alvo.getAttribute("data-rt-alerta-obs") || "";
    const div = document.createElement("div");
    div.innerHTML = txt;
    alert(div.textContent || div.innerText || txt);
  });
}


// v19-dev: atendimentos extras de eventos recorrentes ficam salvos no próprio evento,
// usando produtos_extras como campo JSON já existente no Supabase.
function rtEhAtendimentoExtraRecorrente(item) {
  return Boolean(item && (item.rt_tipo === "atendimento_extra_recorrente" || item.atendimento_extra_recorrente));
}
function rtAtendimentosExtrasRecorrente(evento) {
  return (Array.isArray(evento?.produtos_extras) ? evento.produtos_extras : []).filter(rtEhAtendimentoExtraRecorrente);
}
function rtEhProdutoReservaEvento(item) {
  return Boolean(item && (item.rt_tipo === "produto_reserva" || item.produto_reserva || item.reserva_operacional));
}
function rtProdutosReservaEvento(evento) {
  return (Array.isArray(evento?.produtos_extras) ? evento.produtos_extras : []).filter(rtEhProdutoReservaEvento);
}
function rtProdutosExtrasOperacionais(evento) {
  return (Array.isArray(evento?.produtos_extras) ? evento.produtos_extras : []).filter(item => !rtEhAtendimentoExtraRecorrente(item) && !rtEhProdutoReservaEvento(item));
}
function rtMesclarProdutosExtrasComAtendimentos(produtosExtrasVisiveis, eventoExistente) {
  return [
    ...(Array.isArray(produtosExtrasVisiveis) ? produtosExtrasVisiveis.filter(item => !rtEhAtendimentoExtraRecorrente(item) && !rtEhProdutoReservaEvento(item)) : []),
    ...rtAtendimentosExtrasRecorrente(eventoExistente)
  ];
}
function rtProdutoReservaParaTexto(item) {
  const codigo = item?.codigo ? String(item.codigo).trim() : "-";
  return `🔄 Res - ${codigo}`;
}
function rtLabelAtendimentoExtra(item) {
  return String(item?.tipo || item?.descricao || "Atendimento extra").trim() || "Atendimento extra";
}
function rtDataHoraAtendimentoExtra(item) {
  const data = String(item?.data || "").slice(0,10);
  const hora = String(item?.hora || "").slice(0,5);
  return { data, hora };
}



// v19-dev: formatação visual sem alterar dados salvos.
// Converte textos digitados totalmente em caixa alta para iniciais maiúsculas,
// preservando exatamente o que estiver entre parênteses.
function rtTextoVisual(valor) {
  const original = String(valor ?? "");
  if (!original.trim()) return original;

  const minusculas = new Set(["de", "da", "do", "das", "dos", "e"]);

  function deveFormatar(trecho) {
    const letras = trecho.match(/[A-Za-zÀ-ÖØ-öø-ÿ]/g) || [];
    if (!letras.length) return false;
    const minus = trecho.match(/[a-zà-öø-ÿ]/g) || [];
    const maius = trecho.match(/[A-ZÀ-ÖØ-Þ]/g) || [];
    return maius.length > 0 && minus.length === 0;
  }

  function formatarTrecho(trecho) {
    if (!deveFormatar(trecho)) return trecho;
    return trecho.replace(/[A-Za-zÀ-ÖØ-öø-ÿ]+(?:['’][A-Za-zÀ-ÖØ-öø-ÿ]+)?/g, (palavra, offset) => {
      const lower = palavra.toLocaleLowerCase("pt-BR");
      const antes = trecho.slice(0, offset);
      const ehPrimeiraPalavra = !/[A-Za-zÀ-ÖØ-öø-ÿ]/.test(antes);
      if (!ehPrimeiraPalavra && minusculas.has(lower)) return lower;
      return lower.charAt(0).toLocaleUpperCase("pt-BR") + lower.slice(1);
    });
  }

  return original.split(/(\([^)]*\))/g).map(parte => {
    if (/^\([^)]*\)$/.test(parte)) return parte;
    return formatarTrecho(parte);
  }).join("");
}

function rtNormalizarTextoVisual(valor) {
  return String(valor || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function rtCidadeEhRioDeJaneiro(cidade) {
  const n = rtNormalizarTextoVisual(cidade);
  return !n || n === "rio de janeiro" || n === "rio de janeiro rj" || n === "rj";
}

function rtLocalResumoEvento(dados = {}) {
  const cidade = String(dados.cidade || "").trim();
  if (cidade && !rtCidadeEhRioDeJaneiro(cidade)) return rtTextoVisual(cidade);
  const bairro = String(dados.bairro || "").trim();
  if (bairro) return rtTextoVisual(bairro);
  const endereco = String(dados.endereco || dados.local || "").trim();
  if (!endereco) return "";
  const partes = endereco.split(/[,\-–]+/).map(p => p.trim()).filter(Boolean);
  const candidato = partes.length ? partes[partes.length - 1] : "";
  return rtTextoVisual(candidato.replace(/\b(rio de janeiro|rj|brasil|brazil|cep\s*\d+).*$/i, "").trim());
}

// v19-dev: composição centralizada de endereço separado.
function rtReferenciaLocal(dados = {}) {
  return String(
    dados.referencia_local ||
    dados.cliente_observacao ||
    dados.observacao_cliente ||
    dados.observacaoCliente ||
    ""
  ).trim();
}

function rtEnderecoCompleto(dados = {}) {
  const endereco = rtTextoVisual(String(dados.endereco || dados.local || "").trim());
  const bairro = rtTextoVisual(String(dados.bairro || "").trim());
  const cidade = rtTextoVisual(String(dados.cidade || "").trim());
  const complemento = rtTextoVisual(String(dados.complemento || "").trim());
  const referencia = typeof rtReferenciaLocal === "function" ? rtReferenciaLocal(dados) : "";
  let texto = endereco;
  if (bairro) texto = texto ? `${texto} - ${bairro}` : bairro;
  if (cidade) texto = texto ? `${texto} - ${cidade}` : cidade;
  if (complemento) texto = texto ? `${texto}, ${complemento}` : complemento;
  if (referencia) texto = texto ? `${texto} (${referencia})` : `(${referencia})`;
  return texto || "";
}

function rtBairroResumo(dados = {}) {
  return rtLocalResumoEvento(dados);
}

// v19-dev: parser local conservador para sugerir Bairro/Cidade/Complemento sem alterar o Endereço colado.
(function(){
  if (window.__rtEnderecoParserLocalV1) return;
  window.__rtEnderecoParserLocalV1 = true;

  const BAIRROS_RJ = [
    "Abolicao","Alto da Boa Vista","Anchieta","Andarai","Anil","Bancarios","Bangu","Barra da Tijuca","Barra de Guaratiba","Barros Filho","Benfica","Bento Ribeiro","Bonsucesso","Botafogo","Braz de Pina","Cachambi","Cacuia","Caju","Camorim","Campinho","Campo Grande","Cascadura","Catete","Catumbi","Cavalcanti","Centro","Cidade Nova","Cidade de Deus","Cocota","Coelho Neto","Colegio","Copacabana","Cordovil","Cosme Velho","Cosmos","Curicica","Del Castilho","Deodoro","Encantado","Engenho Novo","Engenho da Rainha","Engenho de Dentro","Estacio","Flamengo","Freguesia","Galeao","Gamboa","Gardênia Azul","Gloria","Grajaú","Grumari","Guadalupe","Guaratiba","Higienopolis","Honorio Gurgel","Humaita","Inhauma","Inhoaiba","Ipanema","Iraja","Itanhanga","Jacare","Jacarepagua","Jardim America","Jardim Botanico","Jardim Carioca","Jardim Guanabara","Lagoa","Laranjeiras","Leblon","Leme","Lins de Vasconcelos","Madureira","Magalhaes Bastos","Mangueira","Manguinhos","Maracana","Marechal Hermes","Maria da Graca","Méier","Monero","Olaria","Oswaldo Cruz","Paciência","Padre Miguel","Paqueta","Parada de Lucas","Parque Anchieta","Pavuna","Pechincha","Penha","Penha Circular","Piedade","Pilares","Praça Seca","Praia da Bandeira","Quintino Bocaiuva","Ramos","Realengo","Recreio dos Bandeirantes","Riachuelo","Ribeira","Ricardo de Albuquerque","Rocha","Rocha Miranda","Rocinha","Sampaio","Santa Cruz","Santa Teresa","Santo Cristo","Santissimo","Saude","Senador Camara","Senador Vasconcelos","Sepetiba","São Conrado","São Cristóvão","São Francisco Xavier","Tanque","Taquara","Taua","Tijuca","Todos os Santos","Tomás Coelho","Turiaçu","Urca","Vargem Grande","Vargem Pequena","Vasco da Gama","Vaz Lobo","Vicente de Carvalho","Vidigal","Vigário Geral","Vila Isabel","Vila Kosmos","Vila Militar","Vila Valqueire","Vista Alegre","Zumbi"
  ];

  const CIDADES_RJ = [
    "Rio de Janeiro","Niterói","São Gonçalo","Duque de Caxias","Nova Iguaçu","Belford Roxo","São João de Meriti","Mesquita","Nilópolis","Queimados","Maricá","Itaboraí","Magé","Petrópolis","Teresópolis","Volta Redonda","Barra Mansa","Angra dos Reis","Cabo Frio","Arraial do Cabo","Armação dos Búzios","Nova Friburgo","Seropédica","Itaguaí","Guapimirim"
  ];

  function norm(v){
    return String(v || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
  }
  function title(v){
    return String(v || "").trim().replace(/\s+/g, " ");
  }
  function acharItem(partes, lista){
    const mapa = lista.map(x => ({ original:x, n:norm(x) })).sort((a,b)=>b.n.length-a.n.length);
    for (let i = partes.length - 1; i >= 0; i--) {
      const p = norm(partes[i]);
      if (!p) continue;
      const exato = mapa.find(x => p === x.n || p.includes(x.n));
      if (exato) return { valor: exato.original, index: i };
    }
    return null;
  }
  function removerCepUf(texto){
    return String(texto || "")
      .replace(/\b\d{5}-?\d{3}\b/g, "")
      .replace(/\bRJ\b/gi, "")
      .replace(/\bCEP\s*:?/gi, "")
      .replace(/\s+/g, " ")
      .replace(/\s*,\s*/g, ", ")
      .trim();
  }
  function parseEnderecoLocal(texto){
    const original = String(texto || "").trim();
    const limpo = removerCepUf(original);
    if (!limpo || limpo.length < 8) return null;
    let partes = limpo.split(/[,\n;]+/).map(p => title(p)).filter(Boolean);
    if (partes.length < 2) return null;

    let cidade = acharItem(partes, CIDADES_RJ);
    let cidadeValor = cidade?.valor || "";
    if (cidade) partes.splice(cidade.index, 1);

    let bairro = acharItem(partes, BAIRROS_RJ);
    let bairroValor = bairro?.valor || "";
    if (bairro) partes.splice(bairro.index, 1);

    // Parser conservador: nunca corta/limpa o campo Endereço automaticamente.
    // Complemento só é sugerido quando há palavras bem explícitas.
    const complementoTokens = /(ap\.?|apto|apartamento|bloco|bl\.?|sala|sl\.?|loja|lj\.?|casa|fundos|sobrado|cobertura|quiosque|box|lote|lt\.?|quadra|qd\.?|port[aã]o|entrada|sal[aã]o|condom[ií]nio|cond\.?|refer[eê]ncia)/i;
    let complemento = "";
    const complementoPartes = partes.filter(p => complementoTokens.test(p));
    if (complementoPartes.length) complemento = complementoPartes.join(", ");

    return {
      endereco: original,
      bairro: title(bairroValor),
      cidade: title(cidadeValor),
      complemento: title(complemento)
    };
  }

  function aplicarParser(prefixo){
    const enderecoEl = document.getElementById(prefixo + "Endereco");
    if (!enderecoEl) return;
    const bairroEl = document.getElementById(prefixo + "Bairro");
    const cidadeEl = document.getElementById(prefixo + "Cidade");
    const complementoEl = document.getElementById(prefixo + "Complemento");
    const executar = () => {
      const atual = enderecoEl.value || "";
      const parsed = parseEnderecoLocal(atual);
      if (!parsed) return;
      // Nunca sobrescreve ou encurta o campo Endereço; preserva exatamente o que foi colado/digitado.
      if (bairroEl && !bairroEl.value.trim() && parsed.bairro) bairroEl.value = parsed.bairro;
      if (cidadeEl && !cidadeEl.value.trim() && parsed.cidade) cidadeEl.value = parsed.cidade;
      if (complementoEl && !complementoEl.value.trim() && parsed.complemento) complementoEl.value = parsed.complemento;
    };
    enderecoEl.addEventListener("paste", () => setTimeout(executar, 60));
    enderecoEl.addEventListener("blur", executar);
  }

  window.rtParseEnderecoLocal = parseEnderecoLocal;
  window.rtAplicarParserEnderecoLocal = aplicarParser;

  document.addEventListener("DOMContentLoaded", () => {
    aplicarParser("evento");
    aplicarParser("cliente");
  });
})();

// v19-dev: status de evento cancelado (não exclui o pedido)
(function(){
  function normalizarStatusEvento(valor){
    return String(valor || "ativo").trim().toLowerCase();
  }
  function eventoCancelado(evento){
    const status = normalizarStatusEvento(evento && (evento.status_evento || evento.status || evento.situacao_evento));
    return status === "cancelado" || status === "cancelada" || status === "cancelled";
  }
  window.rtNormalizarStatusEvento = normalizarStatusEvento;
  window.rtEventoCancelado = eventoCancelado;
})();
