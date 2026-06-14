
let clientes = [];
const storageClientesKey = "novoRioTendasClientesV2";

async function buscarClientesBanco() {
  if (!supabaseClient) return JSON.parse(localStorage.getItem(storageClientesKey) || "[]");

  const { data, error } = await supabaseClient
    .from("clientes_cadastro")
    .select("*")
    .order("nome", { ascending: true });

  if (error) {
    console.error(error);
    alert("Erro ao buscar clientes no Supabase: " + (error.message || ""));
    return [];
  }
  return data || [];
}

async function salvarClienteBanco(cliente) {
  if (!supabaseClient) {
    const i = clientes.findIndex(c => c.id === cliente.id);
    if (i >= 0) clientes[i] = cliente;
    else clientes.push(cliente);
    localStorage.setItem(storageClientesKey, JSON.stringify(clientes));
    return cliente;
  }

  const { data, error } = await supabaseClient
    .from("clientes_cadastro")
    .upsert(cliente, { onConflict: "id" })
    .select()
    .single();

  if (error) {
    console.error(error);
    alert("Erro ao salvar cliente no Supabase: " + (error.message || ""));
    return null;
  }
  return data;
}

async function excluirClienteBanco(id) {
  if (!supabaseClient) {
    clientes = clientes.filter(c => c.id !== id);
    localStorage.setItem(storageClientesKey, JSON.stringify(clientes));
    return true;
  }

  const { error } = await supabaseClient.from("clientes_cadastro").delete().eq("id", id);
  if (error) {
    alert("Erro ao excluir cliente: " + (error.message || ""));
    return false;
  }
  return true;
}

async function carregarClientes() {
  clientes = await buscarClientesBanco();
  renderizarClientes();
}

function iniciarClientes() {
  if (!document.getElementById("clientesTbody")) return;

  document.getElementById("novoClienteBtn").addEventListener("click", abrirNovoCliente);
  document.getElementById("fecharClienteModal").addEventListener("click", fecharClienteModal);
  document.getElementById("cancelarCliente").addEventListener("click", fecharClienteModal);
  ["clienteNome", "clienteTelefone"].forEach(id => document.getElementById(id)?.addEventListener("input", () => atualizarWhatsappClienteForm()));
  document.getElementById("clienteForm").addEventListener("submit", salvarClienteForm);
  document.getElementById("fecharClienteDetalheModal").addEventListener("click", () => document.getElementById("clienteDetalheDialog").close());

  ["buscaCliente", "filtroClienteNome", "filtroClienteDocumento", "filtroClienteTelefone", "filtroClienteEndereco"].forEach(id => {
    document.getElementById(id).addEventListener("input", renderizarClientes);
  });

  carregarClientes();
}

function abrirNovoCliente() {
  document.getElementById("clienteForm").reset();
  document.getElementById("clienteId").value = "";
  document.getElementById("clienteModalTitulo").textContent = "Novo cliente";
  setTimeout(() => atualizarWhatsappClienteForm({ nome: "", telefone: "" }), 0);
  const cidadePadrao = (typeof carregarConfiguracoes === "function" ? (carregarConfiguracoes().cidadePadrao || "Rio de Janeiro") : "Rio de Janeiro");
  const campoCidade = document.getElementById("clienteCidade");
  if (campoCidade) campoCidade.value = cidadePadrao;
  document.getElementById("clienteDialog").showModal();
}

function abrirEditarCliente(id) {
  const c = clientes.find(x => x.id === id);
  if (!c) return;

  document.getElementById("clienteId").value = c.id;
  document.getElementById("clienteNome").value = c.nome || "";
  document.getElementById("clienteDocumento").value = c.documento || "";
  document.getElementById("clienteTelefone").value = c.telefone || "";
  document.getElementById("clienteEmail").value = c.email || "";
  document.getElementById("clientePerfil").value = c.perfil_cliente || "Normal";
  document.getElementById("clienteEndereco").value = c.endereco || "";
  document.getElementById("clienteBairro").value = c.bairro || "";
  document.getElementById("clienteCidade").value = c.cidade || (typeof carregarConfiguracoes === "function" ? (carregarConfiguracoes().cidadePadrao || "Rio de Janeiro") : "Rio de Janeiro");
  document.getElementById("clienteComplemento").value = c.complemento || "";
  document.getElementById("clienteObservacao").value = c.observacao_cliente || "";
  document.getElementById("clienteObservacaoInterna").value = c.observacao_interna || "";
  document.getElementById("clienteModalTitulo").textContent = "Editar cliente";
  atualizarWhatsappClienteForm(c);
  document.getElementById("clienteDialog").showModal();
}

function fecharClienteModal() {
  document.getElementById("clienteDialog").close();
}

async function salvarClienteForm(event) {
  event.preventDefault();

  const id = document.getElementById("clienteId").value || gerarId();
  const existente = clientes.find(c => c.id === id);

  const cliente = {
    id,
    nome: document.getElementById("clienteNome").value.trim(),
    documento: document.getElementById("clienteDocumento").value.trim(),
    telefone: document.getElementById("clienteTelefone").value.trim(),
    email: document.getElementById("clienteEmail").value.trim(),
    endereco: document.getElementById("clienteEndereco").value.trim(),
    bairro: document.getElementById("clienteBairro").value.trim(),
    cidade: document.getElementById("clienteCidade")?.value.trim() || (typeof carregarConfiguracoes === "function" ? (carregarConfiguracoes().cidadePadrao || "Rio de Janeiro") : "Rio de Janeiro"),
    complemento: document.getElementById("clienteComplemento").value.trim(),
    observacao_cliente: document.getElementById("clienteObservacao").value.trim(),
    observacao_interna: document.getElementById("clienteObservacaoInterna").value.trim(),
    perfil_cliente: document.getElementById("clientePerfil").value || "Normal",
    colaborador: getColaboradorLogado(),
    criado_em: existente?.criado_em || new Date().toISOString()
  };

  const antesLogCliente = existente ? JSON.parse(JSON.stringify(existente)) : null;
  const depoisLogCliente = JSON.parse(JSON.stringify(cliente));

  const salvo = await salvarClienteBanco(cliente);
  if (!salvo) return;

  if (typeof registrarLogSistema === "function") {
    registrarLogSistema({
      modulo: "Clientes",
      acao: existente ? "Cliente editado" : "Cliente cadastrado",
      registro_id: salvo.id,
      registro_nome: salvo.nome || cliente.nome || "Cliente",
      antes: antesLogCliente,
      depois: depoisLogCliente
    });
  }

  const i = clientes.findIndex(c => c.id === salvo.id);
  if (i >= 0) clientes[i] = salvo;
  else clientes.push(salvo);

  fecharClienteModal();
  renderizarClientes();
}

function filtrarClientes() {
  const busca = document.getElementById("buscaCliente").value.trim().toLowerCase();
  const nome = document.getElementById("filtroClienteNome").value.trim().toLowerCase();
  const documento = document.getElementById("filtroClienteDocumento").value.trim().toLowerCase();
  const telefone = document.getElementById("filtroClienteTelefone").value.trim().toLowerCase();
  const endereco = document.getElementById("filtroClienteEndereco").value.trim().toLowerCase();

  return clientes.filter(c => {
    const texto = `${c.nome || ""} ${c.documento || ""} ${c.telefone || ""} ${c.email || ""} ${c.endereco || ""} ${c.bairro || ""} ${c.cidade || ""} ${c.complemento || ""} ${c.observacao_cliente || ""} ${c.observacao_interna || ""} ${c.perfil_cliente || ""}`.toLowerCase();
    return (!busca || texto.includes(busca))
      && (!nome || String(c.nome || "").toLowerCase().includes(nome))
      && (!documento || String(c.documento || "").toLowerCase().includes(documento))
      && (!telefone || String(c.telefone || "").toLowerCase().includes(telefone))
      && (!endereco || `${c.endereco || ""} ${c.bairro || ""} ${c.cidade || ""} ${c.complemento || ""}`.toLowerCase().includes(endereco));
  });
}

function normalizarPerfilCliente(perfil) {
  return String(perfil || "Normal")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-") || "normal";
}

function renderizarClientes() {
  const tbody = document.getElementById("clientesTbody");
  if (!tbody) return;

  const lista = filtrarClientes();
  document.getElementById("clientesTotal").textContent = lista.length;

  if (!lista.length) {
    tbody.innerHTML = `<tr><td colspan="8" class="empty">Nenhum cliente cadastrado.</td></tr>`;
    return;
  }

  tbody.innerHTML = lista.map(c => `
    <tr>
      <td class="cliente-nome-cell"><button class="code-link" data-action="detalhe" data-id="${c.id}">${c.nome || "-"}</button></td>
      <td>${c.documento || "-"}</td>
      <td>${c.telefone || "-"}</td>
      <td>${c.email || "-"}</td>
      <td><span class="cliente-perfil-badge perfil-${normalizarPerfilCliente(c.perfil_cliente)}">${c.perfil_cliente || "Normal"}</span></td>
      <td>${(typeof rtEnderecoCompleto === "function" ? rtEnderecoCompleto(c) : c.endereco) || "-"}</td>
      <td>${c.colaborador || "-"}</td>
      <td class="actions clientes-actions"><div class="clientes-actions-row clientes-actions-row-wrap"><button data-action="editar" data-id="${c.id}">✏️</button>
        <button class="btn-outline cliente-whatsapp-lista-btn" title="Abrir dados e WhatsApp" data-action="whatsapp" data-id="${c.id}">💬 WhatsApp</button>
        <button class="btn-outline" title="Excluir" data-action="excluir" data-id="${c.id}">🗑️</button></div></td>
    </tr>
  `).join("");

  tbody.querySelectorAll("button[data-action]").forEach(btn => btn.addEventListener("click", lidarAcaoCliente));
}

async function lidarAcaoCliente(event) {
  const action = event.currentTarget.dataset.action;
  const id = event.currentTarget.dataset.id;

  if (action === "editar") return abrirEditarCliente(id);
  if (action === "detalhe") return abrirDetalheCliente(id);
  if (action === "whatsapp") return abrirDetalheCliente(id);

  if (action === "excluir") {
    const c = clientes.find(x => x.id === id);
    if (!confirm(`Excluir o cliente ${c?.nome || ""}?`)) return;

    const antesLogCliente = c ? JSON.parse(JSON.stringify(c)) : null;
    const ok = await excluirClienteBanco(id);
    if (!ok) return;

    if (typeof registrarLogSistema === "function") {
      registrarLogSistema({
        modulo: "Clientes",
        acao: "Cliente excluído",
        registro_id: id,
        registro_nome: c?.nome || "Cliente",
        antes: antesLogCliente,
        depois: null
      });
    }

    clientes = clientes.filter(x => x.id !== id);
    renderizarClientes();
  }
}



// v19-dev: WhatsApp na tela de dados do cliente (fase de teste).
// Abre o WhatsApp com mensagem pronta; o envio final continua manual.
function clienteTelefoneLimpoWhatsapp(telefone) {
  return String(telefone || "").replace(/\D/g, "");
}

function clienteWhatsappUrl(telefone) {
  let tel = clienteTelefoneLimpoWhatsapp(telefone);
  if (!tel) return "";

  tel = tel.replace(/^00+/, "");
  while (tel.startsWith("5555") && tel.length > 13) tel = tel.slice(2);

  if (tel.startsWith("55") && (tel.length === 12 || tel.length === 13)) return `https://wa.me/${tel}`;
  if (tel.startsWith("55") && (tel.length === 10 || tel.length === 11)) {
    const local = tel.slice(2);
    if (local.length === 8 || local.length === 9) return `https://wa.me/5521${local}`;
  }
  if (tel.length === 10 || tel.length === 11) return `https://wa.me/55${tel}`;
  if (tel.length === 8 || tel.length === 9) return `https://wa.me/5521${tel}`;

  return `https://wa.me/${tel.startsWith("55") ? tel : "55" + tel}`;
}

function clienteWhatsappMensagemUrl(telefone, mensagem) {
  const base = clienteWhatsappUrl(telefone);
  if (!base) return "";
  const texto = String(mensagem || "").trim();
  return texto ? `${base}?text=${encodeURIComponent(texto)}` : base;
}

function clientePrimeiroNomeWhatsapp(nome) {
  return String(nome || "cliente").trim().split(/\s+/)[0] || "cliente";
}

function clienteDataWhatsapp(dataISO) {
  if (!dataISO) return "data combinada";
  const texto = String(dataISO);
  const base = texto.includes("T") ? texto.slice(0, 10) : texto;
  const partes = base.split("-");
  if (partes.length === 3) return `${partes[2]}/${partes[1]}/${partes[0]}`;
  return texto;
}

function clienteHorarioWhatsapp(evento = {}) {
  const inicio = evento.hora_inicio || evento.hora_evento || evento.horario || "";
  const fim = evento.hora_termino || "";
  return inicio ? `${inicio}${fim ? " às " + fim : ""}` : "horário a confirmar";
}

function clienteValorRestanteWhatsapp(evento = {}) {
  const restante = Math.max(Number(evento.valor_restante || 0), 0);
  if (restante > 0) return restante;
  const total = Number(evento.valor_total || 0);
  const sinal = Number(evento.valor_sinal || 0);
  return Math.max(total - sinal, 0);
}

function clienteMensagemWhatsapp(cliente = {}, tipo = "conversa", evento = null) {
  const nome = clientePrimeiroNomeWhatsapp(cliente.nome || evento?.nome || "");
  const endereco = (evento && (typeof rtEnderecoCompleto === "function" ? rtEnderecoCompleto(evento) : evento.endereco)) || (typeof rtEnderecoCompleto === "function" ? rtEnderecoCompleto(cliente) : cliente.endereco) || "endereço combinado";
  const data = clienteDataWhatsapp(evento?.data_evento || evento?.data_montagem || "");
  const horario = clienteHorarioWhatsapp(evento || {});
  const restante = evento ? clienteValorRestanteWhatsapp(evento) : 0;

  if (tipo === "orcamento") {
    return `Olá, ${nome}! Aqui é da RioTendas. Estou enviando as informações do seu orçamento. Qualquer dúvida, pode responder por aqui.`;
  }
  if (tipo === "montagem") {
    return `Olá, ${nome}! Aqui é da RioTendas. Sua montagem está prevista para ${data}, ${horario}.\n\nEndereço: ${endereco}.\n\nQualquer ajuste avisamos por aqui.`;
  }
  if (tipo === "retirada") {
    return `Olá, ${nome}! Aqui é da RioTendas. A retirada do material está prevista para ${data}, ${horario}.\n\nEndereço: ${endereco}.\n\nQualquer ajuste avisamos por aqui.`;
  }
  if (tipo === "chegando") {
    return `Olá, ${nome}! Aqui é da RioTendas. Nossa equipe já está a caminho.\n\nEndereço: ${endereco}.`;
  }
  if (tipo === "cobranca") {
    return `Olá, ${nome}! Aqui é da RioTendas. Consta um valor restante de ${dinheiroClienteEvento(restante)} referente ao evento.\n\nPode nos enviar o comprovante por aqui quando realizar o pagamento. Obrigado!`;
  }
  return `Olá, ${nome}! Aqui é da RioTendas.`;
}

function clienteWhatsappBotoesHtml(cliente = {}, evento = null) {
  const telefone = cliente.telefone || evento?.telefone || "";
  if (!clienteWhatsappUrl(telefone)) return `<p class="empty">Cadastre um telefone para habilitar os atalhos de WhatsApp.</p>`;

  const botoes = [
    ["conversa", "💬", "Conversa"],
    ["orcamento", "📄", "Orçamento"]
  ];

  if (evento) {
    botoes.push(["montagem", "⏱️", "Montagem"]);
    botoes.push(["retirada", "↩️", "Retirada"]);
    botoes.push(["chegando", "🚚", "Chegando"]);
    if (clienteValorRestanteWhatsapp(evento) > 0) botoes.push(["cobranca", "💰", "Cobrar"]);
  }

  return `
    <div class="cliente-whatsapp-botoes">
      ${botoes.map(([tipo, icone, label]) => `
        <a class="btn-outline cliente-whatsapp-btn" href="${clienteWhatsappMensagemUrl(telefone, clienteMensagemWhatsapp(cliente, tipo, evento))}" target="_blank" rel="noopener">
          <span>${icone}</span><small>${label}</small>
        </a>
      `).join("")}
    </div>
  `;
}

function normalizarTextoCliente(valor) {
  return String(valor || "")
    .trim()
    .toLowerCase()
    .replace(/\D/g, "") || String(valor || "").trim().toLowerCase();
}

function somenteNumerosCliente(valor) {
  return String(valor || "").replace(/\D/g, "");
}

function eventosDoCliente(cliente) {
  try {
    if (typeof eventos === "undefined" || !Array.isArray(eventos)) return [];

    const nomeCliente = String(cliente.nome || "").trim().toLowerCase();
    const docCliente = somenteNumerosCliente(cliente.documento);
    const telCliente = somenteNumerosCliente(cliente.telefone);

    return eventos.filter(evento => {
      const nomeEvento = String(evento.nome || "").trim().toLowerCase();
      const docEvento = somenteNumerosCliente(evento.documento);
      const telEvento = somenteNumerosCliente(evento.telefone);

      const bateNome = nomeCliente && nomeEvento && nomeEvento === nomeCliente;
      const bateDoc = docCliente && docEvento && docEvento === docCliente;
      const bateTel = telCliente && telEvento && telEvento === telCliente;

      return bateNome || bateDoc || bateTel;
    }).sort((a, b) => String(b.data_evento || "").localeCompare(String(a.data_evento || "")));
  } catch (erro) {
    console.warn("Não foi possível buscar eventos do cliente:", erro);
    return [];
  }
}

function formatarDataClienteEvento(dataISO) {
  if (!dataISO) return "-";
  const texto = String(dataISO);
  if (texto.includes("T")) return formatarData(texto);

  const partes = texto.split("-");
  if (partes.length === 3) return `${partes[2]}/${partes[1]}/${partes[0].slice(-2)}`;
  return texto;
}

function horarioClienteEvento(evento) {
  const inicio = evento.hora_inicio || evento.hora_evento || "";
  const fim = evento.hora_termino || "";
  return inicio ? `${inicio}${fim ? " às " + fim : ""}` : "-";
}

function dinheiroClienteEvento(valor) {
  return Number(valor || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function resumoProdutosClienteEvento(evento) {
  const tendas = (evento.tendas || []).map(p => {
    const nome = [p.codigo, p.categoria, p.tamanho, p.cor].filter(Boolean).join(" - ");
    return nome || "Produto";
  });

  const apoio = (evento.itens_apoio || []).map(i => `${i.nome} (${i.quantidade})`);
  const extras = (typeof rtProdutosExtrasOperacionais === "function" ? rtProdutosExtrasOperacionais(evento) : (evento.produtos_extras || [])).map(i => `${i.descricao} (${i.quantidade})`);

  const todos = [...tendas, ...apoio, ...extras];

  return todos.length ? todos.join(", ") : "-";
}

function renderizarEventosCliente(cliente) {
  const lista = eventosDoCliente(cliente);

  if (!lista.length) {
    return `<p class="empty">Nenhum evento encontrado para este cliente.</p>`;
  }

  return `
    <div class="cliente-eventos-lista">
      ${lista.map(evento => `
        <div class="cliente-evento-card ${evento.pagamento_quitado ? "cliente-evento-ok" : "cliente-evento-aberto"}">
          <div class="cliente-evento-top">
            <strong>${formatarDataClienteEvento(evento.data_evento)} — ${horarioClienteEvento(evento)}</strong>
            <span>${evento.pagamento_quitado ? "Quitado" : "Em aberto"}</span>
          </div>

          <div class="cliente-evento-grid">
            <div>
              <span>Cliente</span>
              <strong>${evento.nome || "-"}</strong>
            </div>
            <div>
              <span>Telefone</span>
              <strong>${evento.telefone || "-"}</strong>
            </div>
            <div>
              <span>Total</span>
              <strong>${dinheiroClienteEvento(evento.valor_total)}</strong>
            </div>
            <div>
              <span>Sinal</span>
              <strong>${dinheiroClienteEvento(evento.valor_sinal)}</strong>
            </div>
            <div>
              <span>Restante</span>
              <strong>${dinheiroClienteEvento(evento.valor_restante)}</strong>
            </div>
          </div>

          <div class="cliente-evento-info">
            <span>Endereço</span>
            <strong>${(typeof rtEnderecoCompleto === "function" ? rtEnderecoCompleto(evento) : evento.endereco) || "-"}</strong>
          </div>

          <div class="cliente-evento-info">
            <span>Produtos</span>
            <strong>${resumoProdutosClienteEvento(evento)}</strong>
          </div>

          <div class="cliente-evento-whatsapp">
            ${clienteWhatsappBotoesHtml(cliente, evento)}
          </div>

          <button type="button" class="btn-outline cliente-abrir-evento" data-cliente-evento="${evento.id}">
            Abrir evento
          </button>
        </div>
      `).join("")}
    </div>
  `;
}

async function abrirDetalheCliente(id) {
  const c = clientes.find(x => x.id === id);
  if (!c) return;

  document.getElementById("clienteDetalheTitulo").textContent = c.nome || "Cliente";
  document.getElementById("clienteDetalheConteudo").innerHTML = `
    <div class="info-grid">
      <div class="info-box"><span>Nome</span><strong>${c.nome || "-"}</strong></div>
      <div class="info-box"><span>CPF/CNPJ</span><strong>${c.documento || "-"}</strong></div>
      <div class="info-box"><span>Telefone</span><strong>${c.telefone || "-"}</strong></div>
      <div class="info-box"><span>E-mail</span><strong>${c.email || "-"}</strong></div>
      <div class="info-box"><span>Perfil</span><strong><span class="cliente-perfil-badge perfil-${normalizarPerfilCliente(c.perfil_cliente)}">${c.perfil_cliente || "Normal"}</span></strong></div>
      <div class="info-box"><span>Endereço</span><strong>${(typeof rtEnderecoCompleto === "function" ? rtEnderecoCompleto(c) : c.endereco) || "-"}</strong></div>
      <div class="info-box"><span>Colaborador</span><strong>${c.colaborador || "-"}</strong></div>
      <div class="info-box"><span>Cadastro</span><strong>${formatarData(c.criado_em)}</strong></div>
    </div>
    <div class="subpanel cliente-whatsapp-panel">
      <h3>WhatsApp</h3>
      ${clienteWhatsappBotoesHtml(c)}
    </div>
    <div class="subpanel cliente-observacoes-panel">
      <h3>Observações</h3>
      <p><strong>Cliente:</strong> ${c.observacao_cliente || "-"}</p>
      <p><strong>Interna:</strong> ${c.observacao_interna || "-"}</p>
    </div>
    <div class="subpanel cliente-eventos-panel">
      <h3>Eventos encontrados</h3>
      ${renderizarEventosCliente(c)}
    </div>
  `;
  document.getElementById("clienteDetalheDialog").showModal();
}

document.addEventListener("DOMContentLoaded", iniciarClientes);


document.addEventListener("click", event => {
  const btn = event.target.closest("[data-cliente-evento]");
  if (!btn) return;

  const eventoId = btn.dataset.clienteEvento;

  if (typeof abrirDetalheEvento === "function") {
    abrirDetalheEvento(eventoId);
  } else {
    alert("Abra o setor de Eventos para visualizar este evento.");
  }
});
