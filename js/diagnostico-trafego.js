(function () {
  "use strict";

  const STORAGE_KEY = "riotendas_diagnostico_trafego_v1";
  const MAX_REGISTROS = 2500;
  const RETENCAO_MS = 7 * 24 * 60 * 60 * 1000;
  const originalFetch = window.fetch.bind(window);

  function agoraIso() { return new Date().toISOString(); }
  function seguroNumero(v) { const n = Number(v); return Number.isFinite(n) ? n : 0; }

  function lerRegistros() {
    try {
      const lista = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      if (!Array.isArray(lista)) return [];
      const limite = Date.now() - RETENCAO_MS;
      return lista.filter(r => Date.parse(r.horario || 0) >= limite).slice(-MAX_REGISTROS);
    } catch (_) { return []; }
  }

  function salvarRegistros(lista) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(lista.slice(-MAX_REGISTROS))); }
    catch (err) { console.warn("Diagnóstico: armazenamento local indisponível", err); }
  }

  function moduloAtual() {
    const secao = document.querySelector(".section.active-section");
    const mapa = {
      dashboardSection: "Dashboard", produtosSection: "Produtos", clientesSection: "Clientes",
      eventosSection: "Eventos", calendarioSection: "Calendário", rotasSection: "Rotas",
      mapaSection: "Mapa", orcamentosSection: "Orçamentos", financeiroSection: "Financeiro",
      relatoriosSection: "Relatórios", usuariosSection: "Usuários", configSection: "Configurações",
      mobileHubSection: "Mobile", ruaMobileSection: "Rua Mobile", mobileManutencaoSection: "Manutenção Mobile",
      eventosMobileSection: "Eventos Mobile", diagnosticoTrafegoSection: "Diagnóstico"
    };
    return mapa[secao?.id] || secao?.id || "Inicialização";
  }

  function classificarUrl(urlTexto) {
    try {
      const url = new URL(urlTexto, location.href);
      if (!/\.supabase\.co$/i.test(url.hostname)) return null;
      const partes = url.pathname.split("/").filter(Boolean);
      if (partes[0] === "rest" && partes[1] === "v1") {
        return { servico: "PostgREST", recurso: decodeURIComponent(partes[2] || "-") };
      }
      if (partes[0] === "functions" && partes[1] === "v1") {
        return { servico: "Functions", recurso: decodeURIComponent(partes[2] || "-") };
      }
      if (partes[0] === "auth") return { servico: "Auth", recurso: partes[2] || "auth" };
      if (partes[0] === "storage") return { servico: "Storage", recurso: partes[2] || "storage" };
      if (partes[0] === "realtime") return { servico: "Realtime", recurso: "websocket" };
      return { servico: "Supabase", recurso: partes.slice(0, 3).join("/") || "-" };
    } catch (_) { return null; }
  }

  function registrar(registro) {
    const lista = lerRegistros();
    lista.push({ id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, ...registro });
    salvarRegistros(lista);
    window.dispatchEvent(new CustomEvent("riotendas:diagnostico-atualizado"));
  }

  window.fetch = async function diagnosticoFetch(input, init) {
    const urlTexto = typeof input === "string" ? input : input?.url;
    const info = classificarUrl(urlTexto || "");
    if (!info) return originalFetch(input, init);

    const inicio = performance.now();
    const metodo = String(init?.method || input?.method || "GET").toUpperCase();
    const modulo = moduloAtual();
    try {
      const resposta = await originalFetch(input, init);
      const duracaoMs = Math.round((performance.now() - inicio) * 10) / 10;
      let bytes = seguroNumero(resposta.headers.get("content-length"));
      let linhas = 0;
      const clone = resposta.clone();
      Promise.resolve().then(async () => {
        try {
          const buffer = await clone.arrayBuffer();
          if (!bytes) bytes = buffer.byteLength;
          const tipo = clone.headers.get("content-type") || "";
          if (/json/i.test(tipo) && buffer.byteLength <= 20 * 1024 * 1024) {
            try {
              const texto = new TextDecoder().decode(buffer);
              const json = JSON.parse(texto);
              linhas = Array.isArray(json) ? json.length : (json && typeof json === "object" ? 1 : 0);
            } catch (_) {}
          }
        } catch (_) {}
        registrar({ horario: agoraIso(), modulo, servico: info.servico, recurso: info.recurso, metodo,
          status: resposta.status, sucesso: resposta.ok, duracaoMs, bytes, linhas });
      });
      return resposta;
    } catch (erro) {
      registrar({ horario: agoraIso(), modulo, servico: info.servico, recurso: info.recurso, metodo,
        status: 0, sucesso: false, duracaoMs: Math.round((performance.now() - inicio) * 10) / 10,
        bytes: 0, linhas: 0, erro: String(erro?.message || erro) });
      throw erro;
    }
  };

  function formatarBytes(bytes) {
    const n = seguroNumero(bytes);
    if (n < 1024) return `${n.toFixed(0)} B`;
    if (n < 1024 ** 2) return `${(n / 1024).toFixed(1)} KB`;
    if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(2)} MB`;
    return `${(n / 1024 ** 3).toFixed(2)} GB`;
  }

  function formatarData(iso) {
    try { return new Intl.DateTimeFormat("pt-BR", { day:"2-digit", month:"2-digit", hour:"2-digit", minute:"2-digit", second:"2-digit" }).format(new Date(iso)); }
    catch (_) { return iso || "-"; }
  }

  function hojeLocal(iso) {
    const d = new Date(iso); const h = new Date();
    return d.getFullYear() === h.getFullYear() && d.getMonth() === h.getMonth() && d.getDate() === h.getDate();
  }

  function agrupar(lista, chaveFn) {
    const mapa = new Map();
    lista.forEach(r => {
      const chave = chaveFn(r);
      const item = mapa.get(chave) || { nome: chave, chamadas: 0, bytes: 0, linhas: 0, tempo: 0, erros: 0 };
      item.chamadas++; item.bytes += seguroNumero(r.bytes); item.linhas += seguroNumero(r.linhas);
      item.tempo += seguroNumero(r.duracaoMs); if (!r.sucesso) item.erros++;
      mapa.set(chave, item);
    });
    return [...mapa.values()].sort((a,b) => b.bytes - a.bytes || b.chamadas - a.chamadas);
  }

  function renderizarDiagnostico() {
    const root = document.getElementById("diagnosticoTrafegoConteudo");
    if (!root) return;
    const todos = lerRegistros();
    const periodo = document.getElementById("diagPeriodo")?.value || "hoje";
    const servico = document.getElementById("diagServico")?.value || "todos";
    let lista = todos.filter(r => periodo === "todos" || hojeLocal(r.horario));
    if (servico !== "todos") lista = lista.filter(r => r.servico === servico);

    const totalBytes = lista.reduce((s,r) => s + seguroNumero(r.bytes), 0);
    const totalTempo = lista.reduce((s,r) => s + seguroNumero(r.duracaoMs), 0);
    const totalLinhas = lista.reduce((s,r) => s + seguroNumero(r.linhas), 0);
    const erros = lista.filter(r => !r.sucesso).length;
    const porModulo = agrupar(lista, r => r.modulo || "-");
    const porRecurso = agrupar(lista, r => `${r.servico} · ${r.recurso}`);
    const recentes = [...lista].reverse().slice(0, 100);

    root.innerHTML = `
      <div class="diag-cards">
        <div class="diag-card"><span>Chamadas</span><strong>${lista.length.toLocaleString("pt-BR")}</strong></div>
        <div class="diag-card"><span>Dados recebidos</span><strong>${formatarBytes(totalBytes)}</strong></div>
        <div class="diag-card"><span>Linhas estimadas</span><strong>${totalLinhas.toLocaleString("pt-BR")}</strong></div>
        <div class="diag-card"><span>Tempo acumulado</span><strong>${(totalTempo/1000).toFixed(1)} s</strong></div>
        <div class="diag-card ${erros ? "diag-erro" : ""}"><span>Erros</span><strong>${erros}</strong></div>
      </div>
      <div class="diag-grid">
        <div class="panel"><h3>Ranking por tela</h3>${tabelaRanking(porModulo)}</div>
        <div class="panel"><h3>Ranking por serviço/tabela</h3>${tabelaRanking(porRecurso)}</div>
      </div>
      <div class="panel diag-consultas"><h3>Últimas consultas</h3>
        <div class="table-wrapper"><table><thead><tr><th>Horário</th><th>Tela</th><th>Serviço</th><th>Recurso</th><th>Método</th><th>Status</th><th>Linhas</th><th>Dados</th><th>Tempo</th></tr></thead>
        <tbody>${recentes.length ? recentes.map(r => `<tr class="${r.sucesso ? "" : "diag-linha-erro"}"><td>${formatarData(r.horario)}</td><td>${esc(r.modulo)}</td><td>${esc(r.servico)}</td><td>${esc(r.recurso)}</td><td>${esc(r.metodo)}</td><td>${r.status || "Erro"}</td><td>${seguroNumero(r.linhas).toLocaleString("pt-BR")}</td><td>${formatarBytes(r.bytes)}</td><td>${seguroNumero(r.duracaoMs).toFixed(1)} ms</td></tr>`).join("") : `<tr><td colspan="9" class="empty">Ainda não há consultas registradas neste navegador.</td></tr>`}</tbody></table></div>
      </div>`;
  }

  function tabelaRanking(itens) {
    if (!itens.length) return `<p class="empty">Sem dados no período.</p>`;
    return `<div class="table-wrapper"><table class="diag-ranking"><thead><tr><th>Origem</th><th>Chamadas</th><th>Dados</th><th>Linhas</th><th>Erros</th></tr></thead><tbody>${itens.slice(0,20).map(i => `<tr><td><strong>${esc(i.nome)}</strong></td><td>${i.chamadas.toLocaleString("pt-BR")}</td><td>${formatarBytes(i.bytes)}</td><td>${i.linhas.toLocaleString("pt-BR")}</td><td>${i.erros}</td></tr>`).join("")}</tbody></table></div>`;
  }

  function esc(v) { return String(v ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }

  function exportar() {
    const blob = new Blob([JSON.stringify(lerRegistros(), null, 2)], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `riotendas-diagnostico-${new Date().toISOString().slice(0,10)}.json`; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  function iniciarUi() {
    document.getElementById("diagAtualizar")?.addEventListener("click", renderizarDiagnostico);
    document.getElementById("diagExportar")?.addEventListener("click", exportar);
    document.getElementById("diagLimpar")?.addEventListener("click", () => {
      if (!confirm("Limpar os registros de diagnóstico deste navegador?")) return;
      localStorage.removeItem(STORAGE_KEY); renderizarDiagnostico();
    });
    document.getElementById("diagPeriodo")?.addEventListener("change", renderizarDiagnostico);
    document.getElementById("diagServico")?.addEventListener("change", renderizarDiagnostico);
    document.querySelector('[data-section="diagnosticoTrafegoSection"]')?.addEventListener("click", () => setTimeout(renderizarDiagnostico, 0));
    window.addEventListener("riotendas:diagnostico-atualizado", () => {
      if (document.getElementById("diagnosticoTrafegoSection")?.classList.contains("active-section")) renderizarDiagnostico();
    });
    renderizarDiagnostico();
  }

  window.RioTendasDiagnostico = { lerRegistros, renderizar: renderizarDiagnostico, limpar: () => { localStorage.removeItem(STORAGE_KEY); renderizarDiagnostico(); } };
  document.addEventListener("DOMContentLoaded", iniciarUi);
})();
