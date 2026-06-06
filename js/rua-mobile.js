// v19-dev: Rua Mobile — primeira versão para equipe externa
// Usa rotas/eventos já existentes e não cria estrutura nova no Supabase.

function ruaMobileHojeISO() {
  if (typeof dataLocalISO === "function") return dataLocalISO(new Date());
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function ruaMobilePrimeiroNome(nome) {
  return String(nome || "-").trim().split(/\s+/)[0] || "-";
}

function ruaMobileCarroDaRota(rota) {
  try { return (rotasCarros && rotasCarros[rota.id]) || "Sem carro"; }
  catch { return "Sem carro"; }
}

function ruaMobileResumoMateriais(rota) {
  const materiais = Array.isArray(rota?.materiais) ? rota.materiais : [];
  if (!materiais.length) return "Sem materiais informados";
  return materiais.slice(0, 6).map(m => String(m || "")).filter(Boolean).join(" • ") + (materiais.length > 6 ? " • ..." : "");
}

function ruaMobileTelefoneLimpo(telefone) {
  return String(telefone || "").replace(/\D/g, "");
}

function ruaMobileWhatsappUrl(telefone) {
  let tel = ruaMobileTelefoneLimpo(telefone);
  if (!tel) return "";

  // Normalização para WhatsApp Brasil/RJ.
  // Remove caracteres, evita duplicar DDI/DDD e, se faltar DDD, assume Rio de Janeiro (21).
  tel = tel.replace(/^00+/, "");

  // Corrige casos digitados/salvos com 55 duplicado no início.
  while (tel.startsWith("5555") && tel.length > 13) {
    tel = tel.slice(2);
  }

  // Já está no padrão Brasil: 55 + DDD + número.
  if (tel.startsWith("55") && (tel.length === 12 || tel.length === 13)) {
    return `https://wa.me/${tel}`;
  }

  // Veio com 55, mas sem DDD: 55 + número local. Assume DDD 21.
  if (tel.startsWith("55") && (tel.length === 10 || tel.length === 11)) {
    const local = tel.slice(2);
    if (local.length === 8 || local.length === 9) return `https://wa.me/5521${local}`;
  }

  // DDD + número: 21XXXXXXXX ou 21XXXXXXXXX.
  if (tel.length === 10 || tel.length === 11) {
    return `https://wa.me/55${tel}`;
  }

  // Somente número local: assume DDD 21.
  if (tel.length === 8 || tel.length === 9) {
    return `https://wa.me/5521${tel}`;
  }

  const comPais = tel.startsWith("55") ? tel : `55${tel}`;
  return `https://wa.me/${comPais}`;
}

function ruaMobileDinheiro(valor) {
  const n = Number(valor || 0);
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}


const ruaMobileCardsExpandidos = new Set();

function ruaMobileCardKey(rota) {
  return String(rota?.id || "");
}

function ruaMobileCardExpandido(rota) {
  const key = ruaMobileCardKey(rota);
  return key && ruaMobileCardsExpandidos.has(key);
}

function ruaMobilePodeVerValores() {
  try {
    const usuario = typeof getUsuarioLogado === "function" ? getUsuarioLogado() : window.usuarioLogadoSistema;
    if (!usuario) return true;
    if (usuario.perfil === "admin" || usuario.perfil === "administrador" || usuario.perfil === "rua") return true;
    if (usuario.permissoes && usuario.permissoes.ver_valores_mobile === false) return false;
    return true;
  } catch { return true; }
}

function ruaMobileHtmlPagamento(evento = {}) {
  if (!ruaMobilePodeVerValores()) return "";

  const total = Number(evento.valor_total || 0);
  const sinal = Number(evento.valor_sinal || 0);
  const restante = Math.max(Number(evento.valor_restante || 0), 0);
  const quitado = !!evento.pagamento_quitado || restante <= 0;
  const forma = evento.forma_pagamento || "-";

  if (quitado) {
    return `<div class="rua-mobile-pagamento pago"><span class="rua-mobile-pay-main"><span class="rua-mobile-pay-dot">🟢</span><strong>Pago</strong></span><small>Total ${ruaMobileDinheiro(total)} · ${forma}</small></div>`;
  }

  return `
    <div class="rua-mobile-pagamento receber">
      <span class="rua-mobile-pay-main"><span class="rua-mobile-pay-dot">🔴</span><strong>Receber ${ruaMobileDinheiro(restante)}</strong></span>
      <small>Total ${ruaMobileDinheiro(total)} · Sinal ${ruaMobileDinheiro(sinal)} · ${forma}</small>
    </div>
  `;
}

function atualizarFiltroCarrosRuaMobile() {
  const select = document.getElementById("ruaMobileCarro");
  if (!select) return;

  const atual = select.value || "";
  const carros = typeof carrosDisponiveisRotas === "function" ? carrosDisponiveisRotas() : ["Saveiro", "Dupla", "Caminhão"];
  select.innerHTML = `
    <option value="">Todos</option>
    ${carros.map(c => `<option value="${c}">${c}</option>`).join("")}
    <option value="Sem carro">Sem carro</option>
  `;
  select.value = atual;
}

function obterRotasRuaMobile() {
  if (typeof criarRotasDosEventos !== "function") return [];

  const data = document.getElementById("ruaMobileData")?.value || ruaMobileHojeISO();
  const tipo = document.getElementById("ruaMobileTipo")?.value || "";
  const carro = document.getElementById("ruaMobileCarro")?.value || "";

  const lista = criarRotasDosEventos().filter(rota => {
    const carroRota = ruaMobileCarroDaRota(rota);
    return rota.data === data
      && (!tipo || rota.tipo === tipo)
      && (!carro || carroRota === carro);
  });

  if (typeof ordenarRotasPorOrdemManual === "function") {
    return ordenarRotasPorOrdemManual(lista);
  }

  return lista.sort((a, b) => {
    const carroA = ruaMobileCarroDaRota(a);
    const carroB = ruaMobileCarroDaRota(b);
    const ordemA = typeof ordemCarro === "function" ? ordemCarro(carroA) : 99;
    const ordemB = typeof ordemCarro === "function" ? ordemCarro(carroB) : 99;
    if (ordemA !== ordemB) return ordemA - ordemB;
    return String(a.horario || "99:99").localeCompare(String(b.horario || "99:99"));
  });
}

function renderizarRuaMobile() {
  const listaEl = document.getElementById("ruaMobileLista");
  const resumoEl = document.getElementById("ruaMobileResumo");
  if (!listaEl) return;

  atualizarFiltroCarrosRuaMobile();

  const dataInput = document.getElementById("ruaMobileData");
  if (dataInput && !dataInput.value) dataInput.value = ruaMobileHojeISO();

  const rotas = obterRotasRuaMobile();
  const montagens = rotas.filter(r => r.tipo === "Montagem").length;
  const desmontagens = rotas.filter(r => r.tipo === "Desmontagem").length;

  if (resumoEl) {
    resumoEl.innerHTML = `
      <span><strong>${rotas.length}</strong> rota(s)</span>
      <span><strong>${montagens}</strong> montagem(ns)</span>
      <span><strong>${desmontagens}</strong> desmontagem(ns)</span>
    `;
  }

  if (!rotas.length) {
    listaEl.innerHTML = `<p class="empty">Nenhuma rota encontrada para esta data/filtro.</p>`;
    return;
  }

  listaEl.innerHTML = rotas.map((rota, index) => {
    const carro = ruaMobileCarroDaRota(rota);
    const tel = ruaMobileTelefoneLimpo(rota.telefone);
    const whats = ruaMobileWhatsappUrl(rota.telefone);
    const endereco = String(rota.endereco || "").trim();
    const mapa = typeof googleMapsNavigateUrl === "function" ? googleMapsNavigateUrl(endereco) : "#";
    const horario = typeof textoHorarioRota === "function" ? textoHorarioRota(rota.tipoHorario, rota.horario, rota.data) : (rota.horario || "-");
    const horarioEspecialClasse = typeof classeHorarioEspecialRota === "function" ? classeHorarioEspecialRota(rota.tipoHorario, rota.horario) : "";
    const badge = typeof badgeOperacaoRota === "function" ? badgeOperacaoRota(rota) : "";
    const operacao = typeof obterOperacaoRota === "function" ? obterOperacaoRota(rota.id) : null;
    const concluida = operacao && (operacao.status === "entregue" || operacao.status === "recolhido");
    const expandido = concluida && ruaMobileCardExpandido(rota);
    const classeConclusao = concluida ? (expandido ? "rua-mobile-card-concluido rua-mobile-card-expandido" : "rua-mobile-card-concluido") : "";

    return `
      <article class="rua-mobile-card tipo-${String(rota.tipo || "").toLowerCase()} ${classeConclusao}" data-rua-card-id="${rota.id}">
        <div class="rua-mobile-card-top">
          <div>
            <span class="rua-mobile-ordem">#${index + 1} · ${carro}</span>
            <h3>${rota.tipo} · <span class="rua-mobile-horario-destaque${horarioEspecialClasse}">${horario}</span></h3>
          </div>
          <div class="rua-mobile-badge-wrap">${badge}</div>
        </div>
        <div class="rua-mobile-cliente">${ruaMobilePrimeiroNome(rota.cliente)} <small>${rota.cliente || ""}</small></div>
        ${concluida && !expandido ? `<div class="rua-mobile-endereco-resumo">📍 ${(endereco || "Endereço não informado").slice(0, 72)}${String(endereco || "").length > 72 ? "..." : ""}</div>` : ""}
        <div class="rua-mobile-endereco">📍 ${endereco || "Endereço não informado"}</div>
        <div class="rua-mobile-materiais rua-mobile-materiais-click" title="Clique em um produto para trocar"><strong>Materiais:</strong> ${typeof renderizarMateriaisRotaClicaveis === "function" ? renderizarMateriaisRotaClicaveis(rota) : ruaMobileResumoMateriais(rota)}</div>
        ${ruaMobileHtmlPagamento(rota.evento || {})}

        <div class="rua-mobile-acoes rua-mobile-acoes-compactas">
          ${endereco ? `<a class="btn-outline rua-mobile-acao-btn" href="${mapa}" target="_blank" rel="noopener" title="Abrir mapa" aria-label="Abrir mapa"><span>🗺️</span><small>Mapa</small></a>` : ""}
          ${tel ? `<a class="btn-outline rua-mobile-acao-btn" href="tel:${tel}" title="Ligar" aria-label="Ligar"><span>☎️</span><small>Ligar</small></a>` : ""}
          ${whats ? `<a class="btn-outline rua-mobile-acao-btn" href="${whats}" target="_blank" rel="noopener" title="WhatsApp" aria-label="WhatsApp"><span>💬</span><small>Zap</small></a>` : ""}
          ${rota.tipo === "Montagem" ? `<button type="button" class="btn-outline rua-mobile-acao-btn rua-mobile-operacao-btn" data-rua-operacao="entregue" data-rota-id="${rota.id}" title="Marcar entregue" aria-label="Marcar entregue"><span>✅</span><small>Entregue</small></button>` : ""}
          ${rota.tipo === "Desmontagem" ? `<button type="button" class="btn-outline rua-mobile-acao-btn rua-mobile-operacao-btn" data-rua-operacao="recolhido" data-rota-id="${rota.id}" title="Marcar recolhido" aria-label="Marcar recolhido"><span>↩️</span><small>Recolhido</small></button>` : ""}
        </div>
      </article>
    `;
  }).join("");

  listaEl.querySelectorAll(".rua-mobile-card-concluido").forEach(card => {
    card.addEventListener("click", (ev) => {
      if (ev.target.closest("a,button,[data-rota-trocar-produto]")) return;
      const id = String(card.dataset.ruaCardId || "");
      if (!id) return;
      if (ruaMobileCardsExpandidos.has(id)) ruaMobileCardsExpandidos.delete(id);
      else ruaMobileCardsExpandidos.add(id);
      renderizarRuaMobile();
    });
  });

  listaEl.querySelectorAll("[data-rua-operacao]").forEach(btn => {
    btn.addEventListener("click", async () => {
      if (typeof marcarOperacaoRota !== "function") {
        alert("Controle de rotas indisponível.");
        return;
      }
      await marcarOperacaoRota(btn.dataset.rotaId, btn.dataset.ruaOperacao);
      ruaMobileCardsExpandidos.delete(String(btn.dataset.rotaId || ""));
      renderizarRuaMobile();
    });
  });

  // Mobile > Rua: permite trocar produto clicando no item da listagem,
  // reaproveitando o mesmo modal/fluxo de troca rápida da tela de Rotas.
  listaEl.querySelectorAll("[data-rota-trocar-produto]").forEach(btn => {
    btn.addEventListener("click", async (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      if (typeof abrirTrocaProdutoRota !== "function") {
        alert("Troca de produto indisponível nesta versão.");
        return;
      }
      await abrirTrocaProdutoRota(btn.dataset.eventoId, btn.dataset.produtoIndex);
      if (typeof sincronizarRotasOperacaoNuvem === "function") await sincronizarRotasOperacaoNuvem(false);
      renderizarRuaMobile();
    });
  });
}

function iniciarRuaMobile() {
  const section = document.getElementById("ruaMobileSection");
  if (!section) return;

  const dataInput = document.getElementById("ruaMobileData");
  if (dataInput && !dataInput.value) dataInput.value = ruaMobileHojeISO();

  ["ruaMobileData", "ruaMobileTipo", "ruaMobileCarro"].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener("input", renderizarRuaMobile);
      el.addEventListener("change", renderizarRuaMobile);
    }
  });

  const atualizarBtn = document.getElementById("ruaMobileAtualizarBtn");
  if (atualizarBtn) {
    atualizarBtn.addEventListener("click", async () => {
      if (typeof carregarEventos === "function") await carregarEventos();
      if (typeof sincronizarRotasOperacaoNuvem === "function") await sincronizarRotasOperacaoNuvem();
      renderizarRuaMobile();
    });
  }

  setTimeout(async () => {
    if (typeof sincronizarRotasOperacaoNuvem === "function") await sincronizarRotasOperacaoNuvem(false);
    renderizarRuaMobile();
  }, 800);
  setInterval(async () => {
    const usuario = typeof getUsuarioLogado === "function" ? getUsuarioLogado() : null;
    if (usuario?.perfil === "rua" || document.getElementById("ruaMobileSection")?.classList.contains("active-section")) {
      if (typeof sincronizarRotasOperacaoNuvem === "function") await sincronizarRotasOperacaoNuvem(false);
      renderizarRuaMobile();
    }
  }, 15000);
}

window.renderizarRuaMobile = renderizarRuaMobile;
window.iniciarRuaMobile = iniciarRuaMobile;

document.addEventListener("DOMContentLoaded", iniciarRuaMobile);

// Central Mobile: mantém as telas mobile separadas do menu principal.
function iniciarCentralMobile() {
  document.querySelectorAll('[data-mobile-open]').forEach(btn => {
    btn.addEventListener('click', () => {
      const destino = btn.dataset.mobileOpen;
      if (!destino) return;
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      const topBtn = document.getElementById('mobileTopBtn');
      if (topBtn) topBtn.classList.add('active');
      document.querySelectorAll('.section').forEach(s => s.classList.remove('active-section'));
      const sec = document.getElementById(destino);
      if (sec) sec.classList.add('active-section');
      if (destino === 'ruaMobileSection' && typeof renderizarRuaMobile === 'function') {
        setTimeout(renderizarRuaMobile, 50);
      }
      if (destino === 'manutencaoMobileSection' && typeof renderizarManutencaoMobile === 'function') {
        setTimeout(renderizarManutencaoMobile, 50);
      }
    });
  });
}

document.addEventListener('DOMContentLoaded', iniciarCentralMobile);
