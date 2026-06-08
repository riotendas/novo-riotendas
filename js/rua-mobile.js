// v19-dev: Rua Mobile — primeira versão para equipe externa
// Usa rotas/eventos já existentes e não cria estrutura nova no Supabase.

function ruaMobileHojeISO() {
  if (typeof dataLocalISO === "function") return dataLocalISO(new Date());
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}


function ruaMobileDataLabel(dataISO) {
  if (!dataISO) return "--/--/-- DIA";
  const d = new Date(`${dataISO}T12:00:00`);
  if (Number.isNaN(d.getTime())) return "--/--/-- DIA";
  const dias = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SAB"];
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const aa = String(d.getFullYear()).slice(-2);
  return `${dd}/${mm}/${aa} ${dias[d.getDay()]}`;
}

function ruaMobileAtualizarDiaSemana() {
  const input = document.getElementById("ruaMobileData");
  const label = document.getElementById("ruaMobileDiaSemana");
  if (label) label.textContent = ruaMobileDataLabel(input?.value || ruaMobileHojeISO());
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


function ruaMobileAlterarData(dias) {
  const input = document.getElementById("ruaMobileData");
  if (!input) return;
  const base = input.value ? new Date(`${input.value}T12:00:00`) : new Date();
  base.setDate(base.getDate() + Number(dias || 0));
  input.value = `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, "0")}-${String(base.getDate()).padStart(2, "0")}`;
  ruaMobileAtualizarDiaSemana();
  renderizarRuaMobile();
}

function ruaMobileRotaEstaPendente(rota) {
  const operacao = typeof obterOperacaoRota === "function" ? obterOperacaoRota(rota.id) : null;
  if (!operacao || !operacao.status) return true;
  if (rota.tipo === "Montagem") return operacao.status !== "entregue";
  if (rota.tipo === "Desmontagem") return operacao.status !== "recolhido";
  return true;
}

function ruaMobileRotasPendentesPorCarro(carroAlvo) {
  if (typeof criarRotasDosEventos !== "function") return [];
  const data = document.getElementById("ruaMobileData")?.value || ruaMobileHojeISO();
  const tipo = document.getElementById("ruaMobileTipo")?.value || "";
  const carro = String(carroAlvo || "").trim();
  const lista = criarRotasDosEventos().filter(rota => {
    const carroRota = String(ruaMobileCarroDaRota(rota) || "Sem carro").trim() || "Sem carro";
    return rota.data === data
      && (!tipo || rota.tipo === tipo)
      && (!carro || carroRota === carro)
      && ruaMobileRotaEstaPendente(rota)
      && String(rota.endereco || "").trim();
  });
  if (typeof ordenarRotasPorOrdemManual === "function") return ordenarRotasPorOrdemManual(lista);
  return lista;
}

function ruaMobileEncodeMaps(valor) {
  return encodeURIComponent(String(valor || "").trim());
}

async function ruaMobileOrigemAtualParaMaps() {
  if (!navigator.geolocation) return "Current+Location";
  try {
    const pos = await new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 3500, maximumAge: 60000 });
    });
    return `${pos.coords.latitude},${pos.coords.longitude}`;
  } catch {
    return "Current+Location";
  }
}

async function abrirGoogleMapsPendenciasCarro(carroAlvo) {
  const pendentes = ruaMobileRotasPendentesPorCarro(carroAlvo);
  if (!pendentes.length) {
    alert("Não há endereços pendentes para este carro na data/filtro selecionado.");
    return;
  }

  const janela = window.open("about:blank", "_blank");
  const origem = await ruaMobileOrigemAtualParaMaps();
  const enderecos = pendentes.map(r => String(r.endereco || "").trim()).filter(Boolean).slice(0, 10);
  const destino = enderecos[enderecos.length - 1];
  const waypoints = enderecos.slice(0, -1);
  const params = new URLSearchParams({
    api: "1",
    origin: origem,
    destination: destino,
    travelmode: "driving"
  });
  if (waypoints.length) params.set("waypoints", waypoints.join("|"));
  const url = `https://www.google.com/maps/dir/?${params.toString()}`;
  if (janela) janela.location.href = url;
  else window.open(url, "_blank", "noopener");
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


function ruaMobileUsuarioAdmin() {
  try {
    const usuario = typeof getUsuarioLogado === "function" ? getUsuarioLogado() : window.usuarioLogadoSistema;
    const perfil = String(usuario?.perfil || "").toLowerCase();
    return perfil === "admin" || perfil === "administrador";
  } catch { return false; }
}

function ruaMobileEscAttr(valor) {
  return String(valor ?? "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function ruaMobileCarrosParaEdicao() {
  const carros = typeof carrosDisponiveisRotas === "function" ? carrosDisponiveisRotas() : ["Saveiro", "Dupla", "Caminhão"];
  return [...new Set([...(carros || []), "Sem carro"].map(c => String(c || "").trim()).filter(Boolean))];
}

function ruaMobileOptionsCarro(carroAtual) {
  const atual = String(carroAtual || "Sem carro");
  return ruaMobileCarrosParaEdicao().map(carro => `<option value="${ruaMobileEscAttr(carro)}" ${carro === atual ? "selected" : ""}>${carro}</option>`).join("");
}

function ruaMobileHtmlClienteEvento(rota) {
  const nomeCurto = ruaMobilePrimeiroNome(rota?.cliente);
  const nomeCompleto = rota?.cliente || "";
  const eventoId = rota?.evento?.id || rota?.evento_id || "";
  const eventoAlerta = { ...(rota?.evento || {}), ...rota, data_evento: rota?.data || rota?.evento?.data_evento || rota?.data_evento };
  const alerta = typeof rtEventoAlertaHtml === "function" ? rtEventoAlertaHtml(eventoAlerta) : "";

  if (ruaMobileUsuarioAdmin() && eventoId) {
    return `
      ${alerta}<button type="button" class="rua-mobile-cliente-link" data-rua-editar-evento="${ruaMobileEscAttr(eventoId)}" title="Editar dados do evento">
        <span>${nomeCurto}</span> <small>${nomeCompleto}</small>
      </button>
    `;
  }

  return `${alerta}${nomeCurto} <small>${nomeCompleto}</small>`;
}

function ruaMobileAbrirEdicaoEvento(eventoId) {
  if (!ruaMobileUsuarioAdmin()) {
    alert("Apenas administrador pode editar o evento pela Rota Mobile.");
    return;
  }

  const id = String(eventoId || "");
  if (!id) return;

  if (typeof abrirEditarEvento === "function") {
    abrirEditarEvento(id);
  } else {
    alert("Abra o setor de Eventos para editar este evento.");
  }
}

async function ruaMobileTrocarCarroRota(rotaId, novoCarro) {
  const id = String(rotaId || "");
  if (!id) return;
  rotasCarros[id] = String(novoCarro || "Sem carro").trim() || "Sem carro";
  if (typeof salvarRotasCarrosLocal === "function") await salvarRotasCarrosLocal();
  else localStorage.setItem("novoRioTendasRotasCarrosV1", JSON.stringify(rotasCarros || {}));
  renderizarRuaMobile();
}

async function ruaMobileMoverRotaNoGrupo(rotaId, direcao) {
  const id = String(rotaId || "");
  if (!id || typeof moverOrdemRota !== "function") return;
  const todas = obterRotasRuaMobile();
  const rotaAtual = todas.find(r => String(r.id) === id);
  if (!rotaAtual) return;
  const carroAtual = String(ruaMobileCarroDaRota(rotaAtual) || "Sem carro");
  const grupo = todas.filter(r => String(ruaMobileCarroDaRota(r) || "Sem carro") === carroAtual);
  if (typeof inicializarOrdemManualRotas === "function") await inicializarOrdemManualRotas(grupo);
  await moverOrdemRota(id, direcao, grupo);
  renderizarRuaMobile();
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
  ruaMobileAtualizarDiaSemana();

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

  const ruaMobileAgruparPorCarro = !(document.getElementById("ruaMobileCarro")?.value || "");
  const rotasRender = ruaMobileAgruparPorCarro
    ? (() => {
        const grupos = new Map();
        rotas.forEach((rota, idx) => {
          const carroGrupo = String(ruaMobileCarroDaRota(rota) || "Sem carro").trim() || "Sem carro";
          if (!grupos.has(carroGrupo)) grupos.set(carroGrupo, []);
          grupos.get(carroGrupo).push({ rota, idx });
        });
        return Array.from(grupos.entries()).flatMap(([carroGrupo, itens]) =>
          itens.map((item, pos) => ({ ...item, carroGrupo, inicioGrupo: pos === 0 }))
        );
      })()
    : rotas.map((rota, idx) => ({ rota, idx, carroGrupo: ruaMobileCarroDaRota(rota), inicioGrupo: false }));

  const ruaMobileCarroSelecionado = document.getElementById("ruaMobileCarro")?.value || "";
  const ruaMobileHeaderCarroSelecionado = ruaMobileCarroSelecionado
    ? `<div class="rua-mobile-carro-selecionado"><span>🚚 ${ruaMobileCarroSelecionado}</span><button type="button" class="rua-mobile-carro-maps-btn" data-rua-maps-carro="${String(ruaMobileCarroSelecionado).replace(/&/g, "&amp;").replace(/"/g, "&quot;")}" title="Abrir rota pendente do carro no Google Maps">🗺️</button></div>`
    : "";

  listaEl.innerHTML = ruaMobileHeaderCarroSelecionado + rotasRender.map(({ rota, idx, carroGrupo, inicioGrupo }) => {
    const index = idx;
    const carro = ruaMobileCarroDaRota(rota);
    const tel = ruaMobileTelefoneLimpo(rota.telefone);
    const whats = ruaMobileWhatsappUrl(rota.telefone);
    const endereco = String(rota.endereco || "").trim();
    const mapa = typeof googleMapsNavigateUrl === "function" ? googleMapsNavigateUrl(endereco) : "#";
    const horario = typeof textoHorarioRota === "function" ? textoHorarioRota(rota.tipoHorario, rota.horario, rota.data) : (rota.horario || "-");
    const horarioEspecialClasse = typeof classeHorarioEspecialRota === "function" ? classeHorarioEspecialRota(rota.tipoHorario, rota.horario) : "";
    const badge = typeof badgeOperacaoRota === "function" ? badgeOperacaoRota(rota) : "";
    const operacao = typeof obterOperacaoRota === "function" ? obterOperacaoRota(rota.id) : null;
    const concluida = operacao && (operacao.status === "entregue" || operacao.status === "recolhido" || operacao.status === "efetuado");
    const expandido = concluida && ruaMobileCardExpandido(rota);
    const classeConclusao = concluida ? (expandido ? "rua-mobile-card-concluido rua-mobile-card-expandido" : "rua-mobile-card-concluido") : "";
    const ruaMobileGrupoCarro = ruaMobileAgruparPorCarro && inicioGrupo
      ? `<div class="rua-mobile-carro-grupo"><span>🚚 ${carroGrupo}</span><button type="button" class="rua-mobile-carro-maps-btn" data-rua-maps-carro="${String(carroGrupo).replace(/&/g, "&amp;").replace(/"/g, "&quot;")}" title="Abrir rota pendente do carro no Google Maps">🗺️</button></div>`
      : "";

    return `
      ${ruaMobileGrupoCarro}
      <article class="rua-mobile-card tipo-${String(rota.tipo || "").toLowerCase()} ${classeConclusao}" data-rua-card-id="${rota.id}">
        <div class="rua-mobile-card-top">
          <div>
            ${ruaMobileUsuarioAdmin() ? `
              <span class="rua-mobile-ordem rua-mobile-ordem-editavel">
                <span>#${index + 1} ·</span>
                <select class="rua-mobile-carro-card-select" data-rua-carro-rota-id="${ruaMobileEscAttr(rota.id)}" title="Trocar carro desta rota">${ruaMobileOptionsCarro(carro)}</select>
                <button type="button" class="rua-mobile-ordem-btn" data-rua-ordem-rota-id="${ruaMobileEscAttr(rota.id)}" data-rua-ordem-dir="up" title="Subir na rota">▲</button>
                <button type="button" class="rua-mobile-ordem-btn" data-rua-ordem-rota-id="${ruaMobileEscAttr(rota.id)}" data-rua-ordem-dir="down" title="Descer na rota">▼</button>
              </span>` : `<span class="rua-mobile-ordem">#${index + 1} · ${carro}</span>`}
            <h3>${rota.tipo} · <span class="rua-mobile-horario-destaque${horarioEspecialClasse}">${horario}</span></h3>
          </div>
          <div class="rua-mobile-badge-wrap">${badge}</div>
        </div>
        <div class="rua-mobile-cliente">${ruaMobileHtmlClienteEvento(rota)}</div>
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
          ${rota.tipo !== "Montagem" && rota.tipo !== "Desmontagem" ? `<button type="button" class="btn-outline rua-mobile-acao-btn rua-mobile-operacao-btn" data-rua-operacao="efetuado" data-rota-id="${rota.id}" title="Marcar atendimento efetuado" aria-label="Marcar atendimento efetuado"><span>✓</span><small>Efetuado</small></button>` : ""}
        </div>
      </article>
    `;
  }).join("");

  listaEl.querySelectorAll("[data-rua-carro-rota-id]").forEach(select => {
    select.addEventListener("click", ev => ev.stopPropagation());
    select.addEventListener("change", async (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      await ruaMobileTrocarCarroRota(select.dataset.ruaCarroRotaId, select.value);
    });
  });

  listaEl.querySelectorAll("[data-rua-ordem-rota-id]").forEach(btn => {
    btn.addEventListener("click", async (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      btn.disabled = true;
      try {
        await ruaMobileMoverRotaNoGrupo(btn.dataset.ruaOrdemRotaId, btn.dataset.ruaOrdemDir);
      } finally {
        btn.disabled = false;
      }
    });
  });

  listaEl.querySelectorAll("[data-rua-maps-carro]").forEach(btn => {
    btn.addEventListener("click", async (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      await abrirGoogleMapsPendenciasCarro(btn.dataset.ruaMapsCarro || "");
    });
  });

  listaEl.querySelectorAll("[data-rua-editar-evento]").forEach(btn => {
    btn.addEventListener("click", (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      ruaMobileAbrirEdicaoEvento(btn.dataset.ruaEditarEvento || "");
    });
  });

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
      if (typeof atualizarCarrosRotasDaNuvemSeNecessario === "function") await atualizarCarrosRotasDaNuvemSeNecessario();
      if (typeof atualizarOrdemRotasDaNuvemSeNecessario === "function") await atualizarOrdemRotasDaNuvemSeNecessario();
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
  ruaMobileAtualizarDiaSemana();

  ["ruaMobileData", "ruaMobileTipo", "ruaMobileCarro"].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener("input", () => { ruaMobileAtualizarDiaSemana(); renderizarRuaMobile(); });
      el.addEventListener("change", () => { ruaMobileAtualizarDiaSemana(); renderizarRuaMobile(); });
    }
  });

  const anteriorBtn = document.getElementById("ruaMobileDiaAnteriorBtn");
  const hojeBtn = document.getElementById("ruaMobileHojeBtn");
  const proximoBtn = document.getElementById("ruaMobileDiaProximoBtn");
  if (anteriorBtn) anteriorBtn.addEventListener("click", () => ruaMobileAlterarData(-1));
  if (hojeBtn) hojeBtn.addEventListener("click", () => { if (dataInput) dataInput.value = ruaMobileHojeISO(); ruaMobileAtualizarDiaSemana(); renderizarRuaMobile(); });
  if (proximoBtn) proximoBtn.addEventListener("click", () => ruaMobileAlterarData(1));

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
      if (typeof atualizarCarrosRotasDaNuvemSeNecessario === "function") await atualizarCarrosRotasDaNuvemSeNecessario();
      if (typeof atualizarOrdemRotasDaNuvemSeNecessario === "function") await atualizarOrdemRotasDaNuvemSeNecessario();
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
      if (destino === 'eventosMobileSection' && typeof renderizarEventosMobile === 'function') {
        setTimeout(renderizarEventosMobile, 50);
      }
    });
  });
}

document.addEventListener('DOMContentLoaded', iniciarCentralMobile);
