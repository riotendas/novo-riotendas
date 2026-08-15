/* =====================================================
   Log do Sistema - Novo RioTendas
===================================================== */

const storageLogsSistemaKey = "novoRioTendasLogsSistemaV1";

function usuarioLogSistemaAtual() {
  try {
    if (typeof getUsuarioLogado === "function") {
      const usuario = getUsuarioLogado();
      if (usuario) return usuario;
    }
  } catch {}

  try {
    const sessao = JSON.parse(localStorage.getItem("novoRioTendasUsuarioSessaoV1") || "null");
    if (sessao) return sessao;
  } catch {}

  return {
    nome: typeof getColaboradorLogado === "function" ? getColaboradorLogado() : "Sistema",
    usuario: "",
    perfil: ""
  };
}

function resumoRegistroLog(obj) {
  if (!obj) return "-";
  if (typeof obj === "string") return obj;

  return obj.codigo ||
    obj.nome ||
    obj.cliente ||
    obj.usuario ||
    obj.documento ||
    obj.id ||
    "-";
}

function limparObjetoLog(obj) {
  if (!obj || typeof obj !== "object") return obj;

  try {
    return JSON.parse(JSON.stringify(obj));
  } catch {
    return { valor: String(obj) };
  }
}

async function registrarLogSistema({
  modulo = "Sistema",
  acao = "Alteração",
  registro_id = "",
  registro_nome = "",
  antes = null,
  depois = null,
  detalhes = ""
} = {}) {
  const usuario = usuarioLogSistemaAtual();

  const log = {
    id: (crypto.randomUUID ? crypto.randomUUID() : String(Date.now())),
    usuario: usuario.nome || usuario.usuario || "Sistema",
    perfil: usuario.perfil || "",
    modulo,
    acao,
    registro_id: String(registro_id || ""),
    registro_nome: registro_nome || resumoRegistroLog(depois) || resumoRegistroLog(antes),
    antes: limparObjetoLog(antes),
    depois: limparObjetoLog(depois),
    detalhes: detalhes || "",
    criado_em: new Date().toISOString()
  };

  // Local fallback
  try {
    const locais = JSON.parse(localStorage.getItem(storageLogsSistemaKey) || "[]");
    locais.unshift(log);
    localStorage.setItem(storageLogsSistemaKey, JSON.stringify(locais.slice(0, 1000)));
  } catch {}

  if (typeof supabaseClient !== "undefined" && supabaseClient) {
    try {
      const { error } = await supabaseClient
        .from("logs_sistema")
        .insert({
          usuario: log.usuario,
          perfil: log.perfil,
          modulo: log.modulo,
          acao: log.acao,
          registro_id: log.registro_id,
          registro_nome: log.registro_nome,
          antes: log.antes,
          depois: log.depois,
          detalhes: log.detalhes,
          criado_em: log.criado_em
        });

      if (error) {
        console.warn("Não foi possível salvar log no Supabase:", error);
      }
    } catch (erro) {
      console.warn("Erro ao registrar log:", erro);
    }
  }

  return log;
}

async function buscarLogsSistema({ termo = "", modulo = "", usuario = "", dataInicio = "", dataFim = "" } = {}) {
  let logs = [];

  if (typeof supabaseClient !== "undefined" && supabaseClient) {
    try {
      let query = supabaseClient
        .from("logs_sistema")
        .select("id,usuario,perfil,modulo,acao,registro_id,registro_nome,antes,depois,detalhes,criado_em")
        .order("criado_em", { ascending: false })
        .limit(300);

      if (modulo) query = query.eq("modulo", modulo);
      if (usuario) query = query.ilike("usuario", `%${usuario}%`);
      if (dataInicio) query = query.gte("criado_em", `${dataInicio}T00:00:00`);
      if (dataFim) query = query.lte("criado_em", `${dataFim}T23:59:59`);

      const { data, error } = await query;
      if (!error && Array.isArray(data)) logs = data;
    } catch (erro) {
      console.warn("Erro ao buscar logs da nuvem:", erro);
    }
  }

  if (!logs.length) {
    try {
      logs = JSON.parse(localStorage.getItem(storageLogsSistemaKey) || "[]");
    } catch {
      logs = [];
    }
  }

  const termoNorm = String(termo || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  if (termoNorm) {
    logs = logs.filter(log => {
      const texto = [
        log.usuario,
        log.perfil,
        log.modulo,
        log.acao,
        log.registro_nome,
        log.detalhes,
        JSON.stringify(log.antes || {}),
        JSON.stringify(log.depois || {})
      ].join(" ").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

      return texto.includes(termoNorm);
    });
  }

  return logs;
}

function dataHoraLogBR(valor) {
  if (!valor) return "-";
  try {
    return new Date(valor).toLocaleString("pt-BR");
  } catch {
    return valor;
  }
}

function rtLogEscapeHtml(valor) {
  return String(valor ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function rtLogNormalizarLista(valor) {
  return Array.isArray(valor) ? valor : [];
}

function rtLogChaveItem(item, indice = 0) {
  if (!item || typeof item !== "object") return `item-${indice}-${String(item)}`;
  return String(item.id || item.codigo || item.produto_codigo || item.nome || item.descricao || `item-${indice}`);
}

function rtLogNomeMaterial(item) {
  if (!item || typeof item !== "object") return String(item || "-");
  const codigo = String(item.codigo || item.produto_codigo || "").trim();
  const nome = [item.categoria || item.tipo || item.nome || item.descricao || "", item.tamanho || "", item.cor || ""]
    .map(v => String(v || "").trim()).filter(Boolean).join(" ");
  const qtd = Number(item.quantidade || 0);
  const qtdTxt = qtd > 1 ? ` (${qtd}x)` : "";
  return `${codigo ? codigo + " — " : ""}${nome || "Material"}${qtdTxt}`;
}

function rtLogDiffMateriais(antesLista, depoisLista, rotulo = "Material") {
  const antes = rtLogNormalizarLista(antesLista);
  const depois = rtLogNormalizarLista(depoisLista);
  const mapaAntes = new Map(antes.map((item, i) => [rtLogChaveItem(item, i), item]));
  const mapaDepois = new Map(depois.map((item, i) => [rtLogChaveItem(item, i), item]));
  const saida = [];

  for (const [chave, item] of mapaDepois) {
    if (!mapaAntes.has(chave)) {
      saida.push(`<span class="log-mudanca log-add">+ ${rtLogEscapeHtml(rotulo)} adicionado: <b>${rtLogEscapeHtml(rtLogNomeMaterial(item))}</b></span>`);
      continue;
    }
    const anterior = mapaAntes.get(chave);
    const qa = Number(anterior?.quantidade || 0);
    const qd = Number(item?.quantidade || 0);
    if ((qa || qd) && qa !== qd) {
      saida.push(`<span class="log-mudanca log-change">↔ ${rtLogEscapeHtml(rtLogNomeMaterial(item))}: quantidade <b>${qa || 0} → ${qd || 0}</b></span>`);
    }
  }

  for (const [chave, item] of mapaAntes) {
    if (!mapaDepois.has(chave)) {
      saida.push(`<span class="log-mudanca log-remove">− ${rtLogEscapeHtml(rotulo)} removido: <b>${rtLogEscapeHtml(rtLogNomeMaterial(item))}</b></span>`);
    }
  }
  return saida;
}

function rtLogRotuloCampo(campo) {
  const mapa = {
    nome: "Cliente", documento: "CPF/CNPJ", telefone: "Telefone", cliente_email: "E-mail",
    endereco: "Endereço", bairro: "Bairro", cidade: "Cidade", complemento: "Complemento/Referência",
    data_evento: "Data do evento", hora_inicio: "Início", hora_termino: "Término",
    montagem: "Montagem", montagem_tipo: "Tipo da montagem", desmontagem: "Desmontagem",
    desmontagem_tipo: "Tipo da desmontagem", valor_total: "Valor total", valor_sinal: "Sinal",
    valor_restante: "Valor restante", forma_pagamento: "Forma de pagamento", pagamento_quitado: "Quitado",
    pagar_inloco: "Pagar no local", colaborador: "Colaborador", status_evento: "Status do evento",
    recorrencia_inicio: "Início da recorrência", recorrencia_fim: "Fim da recorrência",
    recorrencia_tipo: "Frequência", recorrencia_dias: "Dias do período", recorrencia_ordem: "Ordem da recorrência",
    assinatura_status: "Assinatura", cliente_observacao: "Observação do cliente"
  };
  return mapa[campo] || campo.replace(/_/g, " ").replace(/^./, c => c.toUpperCase());
}

function rtLogFormatarValor(campo, valor) {
  if (valor === null || valor === undefined || valor === "") return "-";
  if (["pagamento_quitado", "pagar_inloco", "recorrente"].includes(campo)) return valor ? "Sim" : "Não";
  if (["valor_total", "valor_sinal", "valor_restante"].includes(campo)) {
    const n = Number(valor || 0);
    return Number.isFinite(n) ? n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : String(valor);
  }
  if (["data_evento", "recorrencia_inicio", "recorrencia_fim"].includes(campo) && /^\d{4}-\d{2}-\d{2}/.test(String(valor))) {
    const [a,m,d] = String(valor).slice(0,10).split("-");
    return `${d}/${m}/${a}`;
  }
  if (["montagem", "desmontagem"].includes(campo) && /^\d{4}-\d{2}-\d{2}/.test(String(valor))) {
    const [data, hora = ""] = String(valor).split("T");
    const [a,m,d] = data.split("-");
    return `${d}/${m}/${a}${hora ? " " + hora.slice(0,5) : ""}`;
  }
  if (typeof valor === "object") return JSON.stringify(valor);
  return String(valor);
}

function textoMudancasLog(log) {
  const antes = log.antes || {};
  const depois = log.depois || {};

  if (!antes || !depois || typeof antes !== "object" || typeof depois !== "object") {
    return rtLogEscapeHtml(log.detalhes || "-");
  }

  const saida = [];
  const listas = [
    ["tendas", "Tenda/material"],
    ["itens_apoio", "Material de apoio"],
    ["produtos_extras", "Produto extra"]
  ];
  listas.forEach(([campo, rotulo]) => {
    if (JSON.stringify(antes?.[campo] || []) !== JSON.stringify(depois?.[campo] || [])) {
      saida.push(...rtLogDiffMateriais(antes?.[campo], depois?.[campo], rotulo));
    }
  });

  const ignorar = new Set([
    "historico", "locacoes", "tendas", "itens_apoio", "produtos_extras",
    "criado_em", "atualizado_em", "geocode_at", "geocode_status", "latitude", "longitude",
    "assinatura_link", "assinatura_enviada_em", "assinatura_realizada_em"
  ]);
  const chaves = [...new Set([...Object.keys(antes || {}), ...Object.keys(depois || {})])]
    .filter(k => !ignorar.has(k));

  chaves.forEach(k => {
    if (JSON.stringify(antes?.[k]) === JSON.stringify(depois?.[k])) return;
    const va = rtLogFormatarValor(k, antes?.[k]);
    const vd = rtLogFormatarValor(k, depois?.[k]);
    saida.push(`<span class="log-mudanca log-change"><b>${rtLogEscapeHtml(rtLogRotuloCampo(k))}:</b> ${rtLogEscapeHtml(va)} → ${rtLogEscapeHtml(vd)}</span>`);
  });

  if (!saida.length && log.detalhes) return rtLogEscapeHtml(log.detalhes);
  if (!saida.length) return "Sem alteração relevante para exibir.";
  return saida.slice(0, 20).join("<br>");
}

async function apagarLogsSistema() {
  const totalTexto = document.getElementById("logsSistemaContador")?.textContent || "os registros";
  if (!confirm(`Apagar TODOS os logs do sistema?\n\n${totalTexto}\n\nEsta ação remove o histórico central e não pode ser desfeita.`)) return;
  if (!confirm("Confirma novamente a exclusão definitiva dos logs?")) return;

  let erroRemoto = null;
  if (typeof supabaseClient !== "undefined" && supabaseClient) {
    try {
      const { error } = await supabaseClient
        .from("logs_sistema")
        .delete()
        .gte("criado_em", "1970-01-01T00:00:00.000Z");
      if (error) erroRemoto = error;
    } catch (erro) {
      erroRemoto = erro;
    }
  }

  if (erroRemoto) {
    console.warn("Não foi possível apagar os logs no Supabase:", erroRemoto);
    alert("Não foi possível apagar os logs centrais no Supabase. Verifique a permissão de DELETE da tabela logs_sistema. Nenhum log local será apagado até isso ser resolvido.");
    return;
  }

  try { localStorage.removeItem(storageLogsSistemaKey); } catch {}
  await renderizarLogsSistema();
  alert("Logs apagados com sucesso.");
}

async function renderizarLogsSistema() {
  const tbody = document.getElementById("logsSistemaTbody");
  if (!tbody) return;

  const filtros = {
    termo: document.getElementById("logSistemaBusca")?.value || "",
    modulo: document.getElementById("logSistemaModulo")?.value || "",
    usuario: document.getElementById("logSistemaUsuario")?.value || "",
    dataInicio: document.getElementById("logSistemaDataInicio")?.value || "",
    dataFim: document.getElementById("logSistemaDataFim")?.value || ""
  };

  const logs = await buscarLogsSistema(filtros);

  const contador = document.getElementById("logsSistemaContador");
  if (contador) contador.textContent = `${logs.length} registro(s)`;

  if (!logs.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="empty">Nenhum log encontrado.</td></tr>`;
    return;
  }

  tbody.innerHTML = logs.map(log => `
    <tr>
      <td>${dataHoraLogBR(log.criado_em)}</td>
      <td>${log.usuario || "-"}</td>
      <td>${log.modulo || "-"}</td>
      <td>${log.acao || "-"}</td>
      <td>${log.registro_nome || "-"}</td>
      <td class="log-detalhes">${textoMudancasLog(log)}</td>
    </tr>
  `).join("");
}

function exportarLogsSistemaCsv() {
  const linhas = [["Data/Hora", "Usuario", "Perfil", "Modulo", "Acao", "Registro", "Detalhes"]];
  const trs = document.querySelectorAll("#logsSistemaTbody tr");

  trs.forEach(tr => {
    const cols = Array.from(tr.children).map(td => `"${String(td.textContent || "").replace(/"/g, '""')}"`);
    if (cols.length >= 6) linhas.push(cols);
  });

  const csv = linhas.map(l => l.join(";")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `logs-sistema-${new Date().toISOString().slice(0,10)}.csv`;
  a.click();

  URL.revokeObjectURL(url);
}

function montarPainelLogsSistema() {
  const config = document.getElementById("configModalLogsConteudo") || document.getElementById("configSection");
  if (!config || document.getElementById("logsSistemaBox")) return;

  const box = document.createElement("div");
  box.id = "logsSistemaBox";
  box.className = "logs-sistema-box";

  box.innerHTML = `
    <div class="section-header">
      <div>
        <h2>Log do Sistema</h2>
        <p>Auditoria geral de alterações feitas no sistema.</p>
        <span id="logsSistemaContador" class="logs-contador"></span>
      </div>
      <div class="logs-header-actions">
        <button type="button" class="btn-outline" id="exportarLogsSistemaBtn">Exportar CSV</button>
        <button type="button" class="btn-danger-soft" id="apagarLogsSistemaBtn">Apagar logs</button>
      </div>
    </div>

    <div class="logs-filtros">
      <input id="logSistemaBusca" type="search" placeholder="Buscar por ação, registro, antes/depois...">
      <input id="logSistemaUsuario" type="search" placeholder="Usuário">
      <select id="logSistemaModulo">
        <option value="">Todos os módulos</option>
        <option value="Produtos">Produtos</option>
        <option value="Eventos">Eventos</option>
        <option value="Eventos Recorrentes">Eventos Recorrentes</option>
        <option value="Clientes">Clientes</option>
        <option value="Financeiro">Financeiro</option>
        <option value="Usuários">Usuários</option>
        <option value="Permissões">Permissões</option>
        <option value="Rotas">Rotas</option>
        <option value="Materiais de Apoio">Materiais de Apoio</option>
        <option value="Configurações">Configurações</option>
      </select>
      <input id="logSistemaDataInicio" type="date">
      <input id="logSistemaDataFim" type="date">
      <button type="button" class="btn-primary" id="filtrarLogsSistemaBtn">Filtrar</button>
    </div>

    <div class="table-wrapper logs-table-wrapper">
      <table class="logs-sistema-table">
        <thead>
          <tr>
            <th>Data/Hora</th>
            <th>Usuário</th>
            <th>Módulo</th>
            <th>Ação</th>
            <th>Registro</th>
            <th>Detalhes</th>
          </tr>
        </thead>
        <tbody id="logsSistemaTbody">
          <tr><td colspan="6" class="empty">Carregando logs...</td></tr>
        </tbody>
      </table>
    </div>
  `;

  config.appendChild(box);

  ["logSistemaBusca", "logSistemaUsuario", "logSistemaModulo", "logSistemaDataInicio", "logSistemaDataFim"].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener("input", () => {
        clearTimeout(window.__logSistemaTimer);
        window.__logSistemaTimer = setTimeout(renderizarLogsSistema, 250);
      });
      el.addEventListener("change", renderizarLogsSistema);
    }
  });

  document.getElementById("filtrarLogsSistemaBtn")?.addEventListener("click", renderizarLogsSistema);
  document.getElementById("exportarLogsSistemaBtn")?.addEventListener("click", exportarLogsSistemaCsv);
  document.getElementById("apagarLogsSistemaBtn")?.addEventListener("click", apagarLogsSistema);

  renderizarLogsSistema();
}

document.addEventListener("DOMContentLoaded", () => {
  // Não baixar ~centenas de KB de logs na abertura do Dashboard.
  document.querySelectorAll('[data-section="configSection"]').forEach(btn => {
    btn.addEventListener("click", () => setTimeout(() => {
      montarPainelLogsSistema();
      renderizarLogsSistema();
    }, 150));
  });
});
