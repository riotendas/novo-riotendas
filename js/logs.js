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
        .select("*")
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

function textoMudancasLog(log) {
  const antes = log.antes || {};
  const depois = log.depois || {};

  if (!antes || !depois || typeof antes !== "object" || typeof depois !== "object") {
    return log.detalhes || "-";
  }

  const chaves = [...new Set([...Object.keys(antes || {}), ...Object.keys(depois || {})])]
    .filter(k => !["historico", "locacoes"].includes(k));

  const mudancas = chaves.filter(k => JSON.stringify(antes?.[k]) !== JSON.stringify(depois?.[k])).slice(0, 8);

  if (!mudancas.length) return log.detalhes || "-";

  return mudancas.map(k => `${k}: ${antes?.[k] ?? "-"} → ${depois?.[k] ?? "-"}`).join(" | ");
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
  const config = document.getElementById("configSection");
  if (!config || document.getElementById("logsSistemaBox")) return;

  const box = document.createElement("div");
  box.id = "logsSistemaBox";
  box.className = "config-card logs-sistema-box";

  box.innerHTML = `
    <div class="section-header">
      <div>
        <h2>Log do Sistema</h2>
        <p>Auditoria geral de alterações feitas no sistema.</p>
        <span id="logsSistemaContador" class="logs-contador"></span>
      </div>
      <button type="button" class="btn-outline" id="exportarLogsSistemaBtn">Exportar CSV</button>
    </div>

    <div class="logs-filtros">
      <input id="logSistemaBusca" type="search" placeholder="Buscar por ação, registro, antes/depois...">
      <input id="logSistemaUsuario" type="search" placeholder="Usuário">
      <select id="logSistemaModulo">
        <option value="">Todos os módulos</option>
        <option value="Produtos">Produtos</option>
        <option value="Eventos">Eventos</option>
        <option value="Clientes">Clientes</option>
        <option value="Usuários">Usuários</option>
        <option value="Rotas">Rotas</option>
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

  renderizarLogsSistema();
}

document.addEventListener("DOMContentLoaded", () => {
  setTimeout(montarPainelLogsSistema, 700);
  document.querySelectorAll('[data-section="configSection"]').forEach(btn => {
    btn.addEventListener("click", () => setTimeout(() => {
      montarPainelLogsSistema();
      renderizarLogsSistema();
    }, 150));
  });
});
