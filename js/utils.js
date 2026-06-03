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
