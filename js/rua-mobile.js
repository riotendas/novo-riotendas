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


// v19-dev: WhatsApp com mensagens prontas para alertas rápidos ao cliente.
// Fase 1: abre o WhatsApp com texto preenchido; o envio final continua manual pelo usuário.
function ruaMobileWhatsappMensagemUrl(telefone, mensagem) {
  const base = ruaMobileWhatsappUrl(telefone);
  if (!base) return "";
  const texto = String(mensagem || "").trim();
  return texto ? `${base}?text=${encodeURIComponent(texto)}` : base;
}

function ruaMobileFormatarDataWhatsapp(dataISO) {
  if (!dataISO) return "";
  const d = new Date(`${String(dataISO).slice(0, 10)}T12:00:00`);
  if (Number.isNaN(d.getTime())) return String(dataISO);
  return d.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" });
}

function ruaMobileWhatsappHorarioTexto(rota = {}) {
  const texto = typeof textoHorarioRota === "function" ? textoHorarioRota(rota.tipoHorario, rota.horario, rota.data) : (rota.horario || "");
  const limpo = String(texto || "").replace(/\s+/g, " ").trim();
  return limpo && limpo !== "-" ? limpo : "horário a confirmar";
}

function ruaMobileValorRestanteWhatsapp(evento = {}) {
  const restante = Math.max(Number(evento.valor_restante || 0), 0);
  if (restante > 0) return restante;
  const total = Number(evento.valor_total || 0);
  const sinal = Number(evento.valor_sinal || 0);
  return Math.max(total - sinal, 0);
}

function ruaMobileMensagemWhatsapp(rota = {}, tipoMensagem = "previsao") {
  const evento = rota.evento || {};
  const cliente = ruaMobilePrimeiroNome(rota.cliente || evento.nome || "");
  const operacao = String(rota.tipo || "serviço").toLowerCase();
  const data = ruaMobileFormatarDataWhatsapp(rota.data || evento.data_evento || "");
  const horario = ruaMobileWhatsappHorarioTexto(rota);
  const endereco = String(rota.endereco || evento.endereco || "").trim();
  const materiais = ruaMobileResumoMateriais(rota);
  const restante = ruaMobileValorRestanteWhatsapp(evento);
  const valorTexto = restante > 0 ? ruaMobileDinheiro(restante) : "";

  if (tipoMensagem === "chegando") {
    return `Olá, ${cliente}! Aqui é da RioTendas. Nossa equipe já está a caminho para a ${operacao}.\n\nEndereço: ${endereco || "endereço do evento"}.\n\nQualquer dúvida, pode responder por aqui.`;
  }

  if (tipoMensagem === "concluido") {
    const textoOperacao = rota.tipo === "Desmontagem" ? "recolhido" : (rota.tipo === "Montagem" ? "entregue" : "efetuado");
    return `Olá, ${cliente}! Aqui é da RioTendas. Passando para avisar que o atendimento foi ${textoOperacao}.\n\nMuito obrigado pela preferência!`;
  }

  if (tipoMensagem === "cobranca") {
    return `Olá, ${cliente}! Aqui é da RioTendas. Consta um valor restante de ${valorTexto || "R$ 0,00"} referente ao evento.\n\nPode nos enviar o comprovante por aqui quando realizar o pagamento. Obrigado!`;
  }

  return `Olá, ${cliente}! Aqui é da RioTendas. Sua ${operacao} está prevista para ${data || "a data combinada"}, ${horario}.\n\nEndereço: ${endereco || "endereço do evento"}.\nMateriais: ${materiais}.\n\nQualquer ajuste avisamos por aqui.`;
}

function ruaMobileWhatsappBotoesHtml(rota = {}) {
  if (!ruaMobileWhatsappUrl(rota.telefone)) return "";
  const tipos = [
    ["previsao", "⏱️", "Previsão", "Enviar previsão de horário"],
    ["chegando", "🚚", "Chegando", "Avisar que a equipe está a caminho"],
    ["concluido", "✅", "Concluído", "Avisar conclusão do atendimento"]
  ];
  const cobranca = ruaMobileValorRestanteWhatsapp(rota.evento || {}) > 0;
  if (cobranca) tipos.push(["cobranca", "💰", "Cobrar", "Enviar cobrança do restante"]);

  return `
    <div class="rua-mobile-whatsapp-alertas" aria-label="Mensagens prontas para WhatsApp">
      ${tipos.map(([tipo, icone, label, titulo]) => `
        <a class="btn-outline rua-mobile-whatsapp-alerta-btn" href="${ruaMobileWhatsappMensagemUrl(rota.telefone, ruaMobileMensagemWhatsapp(rota, tipo))}" target="_blank" rel="noopener" title="${titulo}">
          <span>${icone}</span><small>${label}</small>
        </a>
      `).join("")}
    </div>
  `;
}

function ruaMobileDinheiro(valor) {
  const n = Number(valor || 0);
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}



// v19-dev: PIX estático na Rota Mobile (sem API bancária).
function ruaMobilePixValorDevido(evento = {}) {
  const restante = Math.max(Number(evento.valor_restante || 0), 0);
  if (restante > 0) return restante;
  const total = Number(evento.valor_total || 0);
  const sinal = Number(evento.valor_sinal || 0);
  return Math.max(total - sinal, 0);
}

function ruaMobilePixConfig() {
  try {
    const cfgSistema = (typeof carregarConfiguracoes === "function")
      ? carregarConfiguracoes()
      : (window.configRioTendas || {});
    const cfgGlobal = (typeof config !== 'undefined' && config && typeof config === 'object') ? config : {};
    const pix = cfgSistema.pix || cfgGlobal.pix || cfgGlobal.pixItau || {};
    const local = JSON.parse(localStorage.getItem('riotendas_pix_config') || '{}');
    return {
      chave: pix.chave || pix.chavePix || local.chave || '',
      nome: pix.nome || local.nome || 'RIOTENDAS',
      cidade: pix.cidade || local.cidade || 'RIO DE JANEIRO',
      banco: pix.banco || local.banco || 'Itaú'
    };
  } catch { return { chave: '', nome: 'RIOTENDAS', cidade: 'RIO DE JANEIRO', banco: 'Itaú' }; }
}

function ruaMobilePixCampo(id, valor) {
  const v = String(valor ?? '');
  return String(id).padStart(2, '0') + String(v.length).padStart(2, '0') + v;
}

function ruaMobilePixCRC16(payload) {
  let crc = 0xFFFF;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) : (crc << 1);
      crc &= 0xFFFF;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

function ruaMobileGerarPixCopiaCola({ chave, nome, cidade, valor, descricao }) {
  const merchantAccount = ruaMobilePixCampo('00', 'BR.GOV.BCB.PIX') + ruaMobilePixCampo('01', chave);
  const txid = 'RT' + String(Date.now()).slice(-10);
  const adicional = ruaMobilePixCampo('05', txid);
  let payload = '';
  payload += ruaMobilePixCampo('00', '01');
  payload += ruaMobilePixCampo('26', merchantAccount);
  payload += ruaMobilePixCampo('52', '0000');
  payload += ruaMobilePixCampo('53', '986');
  if (Number(valor) > 0) payload += ruaMobilePixCampo('54', Number(valor).toFixed(2));
  payload += ruaMobilePixCampo('58', 'BR');
  payload += ruaMobilePixCampo('59', String(nome || 'RIOTENDAS').normalize('NFD').replace(/[\u0300-\u036f]/g, '').slice(0, 25).toUpperCase());
  payload += ruaMobilePixCampo('60', String(cidade || 'RIO DE JANEIRO').normalize('NFD').replace(/[\u0300-\u036f]/g, '').slice(0, 15).toUpperCase());
  payload += ruaMobilePixCampo('62', adicional);
  payload += '6304';
  return payload + ruaMobilePixCRC16(payload);
}

function ruaMobileGarantirPixModal() {
  let modal = document.getElementById('ruaMobilePixDialog');
  if (modal) return modal;
  modal = document.createElement('dialog');
  modal.id = 'ruaMobilePixDialog';
  modal.className = 'modal rua-mobile-pix-dialog';
  modal.innerHTML = `
    <div class="modal-header">
      <h2>Receber por Pix</h2>
      <button type="button" class="icon-btn" id="ruaMobilePixFechar">×</button>
    </div>
    <div class="rua-mobile-pix-body">
      <div class="rua-mobile-pix-resumo" id="ruaMobilePixResumo"></div>
      <img id="ruaMobilePixQr" class="rua-mobile-pix-qr" alt="QR Code Pix">
      <textarea id="ruaMobilePixPayload" rows="4" readonly></textarea>
      <button type="button" class="btn-primary" id="ruaMobilePixCopiar">Copiar Pix</button>
      <small>Pix estático com valor. Para baixa automática bancária seria necessária API do banco.</small>
    </div>
  `;
  document.body.appendChild(modal);
  modal.querySelector('#ruaMobilePixFechar')?.addEventListener('click', () => modal.close());
  modal.querySelector('#ruaMobilePixCopiar')?.addEventListener('click', async () => {
    const txt = modal.querySelector('#ruaMobilePixPayload')?.value || '';
    try { await navigator.clipboard.writeText(txt); alert('Pix copia e cola copiado.'); }
    catch { prompt('Copie o Pix:', txt); }
  });
  return modal;
}

function ruaMobileAbrirPixRota(rotaId) {
  const rota = (typeof criarRotasDosEventos === 'function' ? criarRotasDosEventos() : []).find(r => String(r.id) === String(rotaId));
  if (!rota) { alert('Rota não encontrada.'); return; }
  const evento = rota.evento || {};
  const valor = ruaMobilePixValorDevido(evento);
  if (!valor || valor <= 0) { alert('Este evento não possui valor devido para cobrar.'); return; }
  let cfg = ruaMobilePixConfig();
  if (!cfg.chave) {
    alert('Configure a chave Pix em Configurações > Preferências do aplicativo antes de gerar a cobrança.');
    if (typeof abrirConfigModal === "function") {
      try { abrirConfigModal("configModalPreferencias"); } catch {}
    }
    return;
  }
  const payload = ruaMobileGerarPixCopiaCola({ ...cfg, valor, descricao: rota.cliente || 'RioTendas' });
  const modal = ruaMobileGarantirPixModal();
  modal.querySelector('#ruaMobilePixResumo').innerHTML = `<strong>${rota.cliente || 'Cliente'}</strong><br>Valor devido: <strong>${ruaMobileDinheiro(valor)}</strong>`;
  modal.querySelector('#ruaMobilePixPayload').value = payload;
  modal.querySelector('#ruaMobilePixQr').src = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(payload)}`;
  if (typeof modal.showModal === 'function') modal.showModal(); else modal.setAttribute('open', 'open');
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

function ruaMobileEnderecoPrincipalMaps(valor) {
  if (typeof rtEnderecoPrincipalMaps === "function") return rtEnderecoPrincipalMaps(valor);
  const texto = String(valor || "").trim();
  const idx = texto.indexOf("(");
  return (idx > 0 ? texto.slice(0, idx) : texto).trim();
}

function ruaMobileEncodeMaps(valor) {
  return encodeURIComponent(ruaMobileEnderecoPrincipalMaps(valor));
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

function ruaMobileNotasEnderecosParaRoteiro(data, carro) {
  const notas = (typeof rtNotasDaRota === "function")
    ? rtNotasDaRota(data, carro)
    : ruaMobileNotasDaRota(data, carro);
  return (Array.isArray(notas) ? notas : [])
    .map(n => ({ endereco: ruaMobileEnderecoPrincipalMaps(n?.endereco || ""), posicao: Math.max(0, Number(n?.posicao) || 0) }))
    .filter(n => n.endereco);
}

function ruaMobileEnderecosRoteiroComNotas(pendentes, carroAlvo) {
  const data = document.getElementById("ruaMobileData")?.value || ruaMobileHojeISO();
  const carro = String(carroAlvo || "").trim() || "Sem carro";
  const notas = ruaMobileNotasEnderecosParaRoteiro(data, carro);
  const enderecos = [];
  const adicionar = (end) => {
    const limpo = ruaMobileEnderecoPrincipalMaps(end);
    if (limpo && !enderecos.some(x => x.toLowerCase() === limpo.toLowerCase())) enderecos.push(limpo);
  };

  const lista = Array.isArray(pendentes) ? pendentes : [];
  notas.filter(n => n.posicao === 0).forEach(n => adicionar(n.endereco));
  lista.forEach((rota, idx) => {
    adicionar(rota?.endereco);
    notas.filter(n => n.posicao === idx + 1).forEach(n => adicionar(n.endereco));
  });
  notas.filter(n => n.posicao > lista.length).forEach(n => adicionar(n.endereco));
  return enderecos.slice(0, 10);
}

async function abrirGoogleMapsPendenciasCarro(carroAlvo) {
  // Mantém a abertura sincronizada com o clique para evitar bloqueio de pop-up no mobile.
  const pendentes = ruaMobileRotasPendentesPorCarro(carroAlvo);
  const enderecos = ruaMobileEnderecosRoteiroComNotas(pendentes, carroAlvo);
  if (!enderecos.length) {
    alert("Não há endereços pendentes ou notas com endereço para este carro na data/filtro selecionado.");
    return;
  }

  const origem = "Current Location";
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
  window.open(url, "_blank", "noopener");
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


function ruaMobileNotasCarregar() {
  try {
    if (typeof rtNotasCarregar === "function") return rtNotasCarregar();
    const raw = localStorage.getItem("rt_notas_rota_v1");
    const lista = JSON.parse(raw || "[]");
    return Array.isArray(lista) ? lista : [];
  } catch { return []; }
}

function ruaMobileNotasDaRota(data, carro) {
  const d = String(data || "");
  const c = String(carro || "Sem carro").trim() || "Sem carro";
  return ruaMobileNotasCarregar().filter(n => String(n?.data || "") === d && (String(n?.carro || "Sem carro").trim() || "Sem carro") === c);
}

function ruaMobileNotaTextoHtml(textoBruto) {
  const textoOriginal = String(textoBruto || "Nota").trim() || "Nota";
  const partes = textoOriginal.split(/(\*[^*]+\*)/g).map(parte => {
    if (/^\*[^*]+\*$/.test(parte)) return `<strong>${ruaMobileEscAttr(parte.slice(1, -1))}</strong>`;
    return ruaMobileEscAttr(parte);
  });
  return partes.join("");
}

function ruaMobileNotaLinhaHtml(nota) {
  const texto = ruaMobileNotaTextoHtml(nota?.texto || "Nota");
  const textoPlano = ruaMobileEscAttr(String(nota?.texto || "Nota").trim() || "Nota");
  const endereco = String(nota?.endereco || "").trim();
  const mapa = endereco && typeof googleMapsNavigateUrl === "function" ? googleMapsNavigateUrl(endereco) : "";
  const enderecoHtml = endereco
    ? `<div class="rua-mobile-nota-endereco">📍 ${mapa ? `<a href="${mapa}" target="_blank" rel="noopener">${ruaMobileEscAttr(endereco)}</a>` : ruaMobileEscAttr(endereco)}</div>`
    : "";
  const admin = ruaMobileUsuarioAdmin();
  const id = ruaMobileEscAttr(nota?.id || "");
  const acoes = admin ? `
    <div class="rua-mobile-nota-acoes" aria-label="Ações da nota">
      <button type="button" class="rua-mobile-nota-btn" data-rua-nota-editar="${id}" title="Editar nota">✏️</button>
      <button type="button" class="rua-mobile-nota-btn rua-mobile-nota-btn-danger" data-rua-nota-excluir="${id}" title="Excluir nota">🗑</button>
      <button type="button" class="rua-mobile-nota-btn" data-rua-nota-mover="${id}" data-dir="up" title="Subir nota">▲</button>
      <button type="button" class="rua-mobile-nota-btn" data-rua-nota-mover="${id}" data-dir="down" title="Descer nota">▼</button>
    </div>` : "";
  return `<div class="rua-mobile-nota-linha" data-rua-nota-id="${id}" title="${textoPlano}">
    <div class="rua-mobile-nota-topo">
      <div class="rua-mobile-nota-texto"><span class="rua-mobile-nota-icone">📝</span><span class="rua-mobile-nota-conteudo">${texto}</span></div>
      ${acoes}
    </div>
    ${enderecoHtml}
  </div>`;
}

function ruaMobileNotasHtml(data, carro, posicao) {
  const pos = Math.max(0, Number(posicao) || 0);
  return ruaMobileNotasDaRota(data, carro)
    .filter(n => Math.max(0, Number(n?.posicao) || 0) === pos)
    .map(ruaMobileNotaLinhaHtml)
    .join("");
}

function ruaMobileNotasFiltradasHtml(data, carroFiltro) {
  const dataAlvo = String(data || "");
  const carroAlvo = String(carroFiltro || "").trim();
  return ruaMobileNotasCarregar()
    .filter(n => String(n?.data || "") === dataAlvo)
    .filter(n => !carroAlvo || (String(n?.carro || "Sem carro").trim() || "Sem carro") === carroAlvo)
    .sort((a,b) => String(a.carro || "").localeCompare(String(b.carro || "")) || (Number(a.posicao)||0) - (Number(b.posicao)||0))
    .map(n => `<div class="rua-mobile-carro-grupo"><span>🚚 ${ruaMobileEscAttr(n.carro || "Sem carro")}</span></div>${ruaMobileNotaLinhaHtml(n)}`)
    .join("");
}


function ruaMobileNotaListaRotas(data, carro){
  const todas = typeof obterRotasRuaMobile === "function" ? obterRotasRuaMobile() : [];
  const c = String(carro || "Sem carro").trim() || "Sem carro";
  return todas.filter(r => String(ruaMobileCarroDaRota(r) || "Sem carro").trim() === c && String(r.data || "") === String(data || ""));
}

function ruaMobileCriarNota(carroPredefinido){
  if (!ruaMobileUsuarioAdmin()) return;
  const data = document.getElementById("ruaMobileData")?.value || ruaMobileHojeISO();
  let carro = String(carroPredefinido || document.getElementById("ruaMobileCarro")?.value || "").trim();
  if (!carro) {
    const carros = ruaMobileCarrosParaEdicao();
    carro = prompt("Carro da nota:", carros[0] || "Sem carro") || "";
  }
  carro = carro.trim() || "Sem carro";
  if (typeof rtAbrirNotaRota === "function") {
    rtAbrirNotaRota(data, carro, ruaMobileNotaListaRotas(data, carro));
  } else {
    alert("Editor de nota indisponível nesta versão.");
  }
}

function ruaMobileEditarNota(notaId){
  if (!ruaMobileUsuarioAdmin() || !notaId) return;
  const nota = ruaMobileNotasCarregar().find(n => String(n.id) === String(notaId));
  if (!nota) return;
  const carro = String(nota.carro || "Sem carro").trim() || "Sem carro";
  if (typeof rtAbrirNotaRota === "function") {
    rtAbrirNotaRota(nota.data, carro, ruaMobileNotaListaRotas(nota.data, carro), nota.id);
  }
}

async function ruaMobileMoverNota(notaId, dir){
  if (!ruaMobileUsuarioAdmin() || !notaId) return;
  const notas = ruaMobileNotasCarregar();
  const nota = notas.find(n => String(n.id) === String(notaId));
  if (!nota) return;
  const delta = dir === "up" ? -1 : 1;
  const novaPos = Math.max(0, Number(nota.posicao || 0) + delta);
  if (typeof rtMoverNotaRotaParaPosicao === "function") {
    rtMoverNotaRotaParaPosicao(nota.id, nota.data, nota.carro || "Sem carro", novaPos);
  } else if (typeof rtNotasSalvar === "function") {
    nota.posicao = novaPos;
    nota.atualizadoEm = new Date().toISOString();
    rtNotasSalvar(notas);
  }
  if (typeof rtNotasSincronizarNuvem === "function") await rtNotasSincronizarNuvem(false);
  renderizarRuaMobile();
}

async function ruaMobileExcluirNota(notaId){
  if (!ruaMobileUsuarioAdmin() || !notaId) return;
  const notas = ruaMobileNotasCarregar();
  const nota = notas.find(n => String(n.id) === String(notaId));
  if (!nota) return;
  if (!confirm('Excluir esta nota da rota?')) return;
  const restantes = notas.filter(n => String(n.id) !== String(notaId));
  if (typeof rtNotasSalvarLocal === 'function') rtNotasSalvarLocal(restantes);
  let ok = true;
  if (typeof rtNotaExcluirNuvem === 'function') ok = await rtNotaExcluirNuvem(notaId);
  else {
    try {
      if (typeof supabaseClient !== 'undefined' && supabaseClient) {
        const { error } = await supabaseClient.from('notas_rota').delete().eq('id', notaId);
        ok = !error;
        if (error) alert('Não foi possível excluir a nota na nuvem: ' + (error.message || JSON.stringify(error)));
      }
    } catch(e) { ok = false; console.warn('Não foi possível excluir nota no Supabase:', e); }
  }
  if (!ok) return;
  try { if (typeof rtNotasMarcarMigrado === 'function') rtNotasMarcarMigrado(); } catch(e) {}
  try { if (typeof rtNotasSincronizarNuvem === 'function') await rtNotasSincronizarNuvem(false); } catch(e) {}
  renderizarRuaMobile();
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
  const nomeCompleto = rota?.cliente || "";
  const colaborador = String(rota?.evento?.colaborador || rota?.colaborador || "").trim();
  const colabHtml = colaborador ? `<small class="rua-mobile-colaborador">Colab. ${ruaMobileEscAttr(colaborador)}</small>` : "";
  const eventoId = rota?.evento?.id || rota?.evento_id || "";
  const eventoAlerta = { ...(rota?.evento || {}), ...rota, data_evento: rota?.data || rota?.evento?.data_evento || rota?.data_evento };
  const alerta = typeof rtEventoAlertaHtml === "function" ? rtEventoAlertaHtml(eventoAlerta) : "";

  if (ruaMobileUsuarioAdmin() && eventoId) {
    return `
      ${alerta}<button type="button" class="rua-mobile-cliente-link" data-rua-editar-evento="${ruaMobileEscAttr(eventoId)}" title="Editar dados do evento">
        <span>${ruaMobileEscAttr(nomeCompleto)}</span>${colabHtml}
      </button>
    `;
  }

  return `${alerta}<span>${ruaMobileEscAttr(nomeCompleto)}</span>${colabHtml}`;
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
    if (typeof rtEventoCancelado === "function" && rtEventoCancelado(rota.evento)) return false;
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


function ruaMobileAbrirContadorCarro(carroAlvo) {
  const carro = String(carroAlvo || "Sem carro").trim() || "Sem carro";
  const lista = obterRotasRuaMobile().filter(rota => String(ruaMobileCarroDaRota(rota) || "Sem carro").trim() === carro);
  if (typeof rtAbrirContadorCarro === "function") {
    rtAbrirContadorCarro(lista, carro);
    return;
  }
  const contagem = typeof rtResumoCargaCarro === "function" ? rtResumoCargaCarro(lista) : [];
  alert(`${carro}\n\n${contagem.length ? contagem.join("; ") : "Sem material de montagem neste carro."}`);
}


function ruaMobileConfigurarAcoesNotas(container){
  if (!container) return;
  container.querySelectorAll("[data-rua-nota-nova]").forEach(btn => {
    btn.addEventListener("click", ev => {
      ev.preventDefault();
      ev.stopPropagation();
      ruaMobileCriarNota();
    });
  });
  container.querySelectorAll("[data-rua-nota-carro]").forEach(btn => {
    btn.addEventListener("click", ev => {
      ev.preventDefault();
      ev.stopPropagation();
      ruaMobileCriarNota(btn.dataset.ruaNotaCarro || "");
    });
  });
  container.querySelectorAll("[data-rua-nota-editar]").forEach(btn => {
    btn.addEventListener("click", ev => {
      ev.preventDefault();
      ev.stopPropagation();
      ruaMobileEditarNota(btn.dataset.ruaNotaEditar || "");
    });
  });
  container.querySelectorAll("[data-rua-nota-mover]").forEach(btn => {
    btn.addEventListener("click", async ev => {
      ev.preventDefault();
      ev.stopPropagation();
      await ruaMobileMoverNota(btn.dataset.ruaNotaMover || "", btn.dataset.dir || "");
    });
  });
  container.querySelectorAll("[data-rua-nota-excluir]").forEach(btn => {
    btn.addEventListener("click", async ev => {
      ev.preventDefault();
      ev.stopPropagation();
      await ruaMobileExcluirNota(btn.dataset.ruaNotaExcluir || "");
    });
  });
  container.querySelectorAll(".rua-mobile-nota-linha").forEach(card => {
    card.addEventListener("click", ev => {
      if (ev.target.closest("button,a")) return;
      card.classList.toggle("is-expanded");
    });
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
    const notasHtml = ruaMobileNotasFiltradasHtml(dataInput?.value || ruaMobileHojeISO(), document.getElementById("ruaMobileCarro")?.value || "");
    const toolbarNotas = "";
    listaEl.innerHTML = toolbarNotas + (notasHtml || `<p class="empty">Nenhuma rota encontrada para esta data/filtro.</p>`);
    ruaMobileConfigurarAcoesNotas(listaEl);
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
          itens.map((item, pos) => ({ ...item, carroGrupo, inicioGrupo: pos === 0, posicaoGrupo: pos, totalGrupo: itens.length }))
        );
      })()
    : rotas.map((rota, idx) => ({ rota, idx, carroGrupo: ruaMobileCarroDaRota(rota), inicioGrupo: false, posicaoGrupo: idx, totalGrupo: rotas.length }));

  const ruaMobileCarroSelecionado = document.getElementById("ruaMobileCarro")?.value || "";
  const ruaMobileHeaderCarroSelecionado = ruaMobileCarroSelecionado
    ? `<div class="rua-mobile-carro-selecionado"><span>🚚 ${ruaMobileCarroSelecionado}</span><div class="rua-mobile-carro-actions"><button type="button" class="rua-mobile-carro-nota-btn" data-rua-nota-carro="${String(ruaMobileCarroSelecionado).replace(/&/g, "&amp;").replace(/"/g, "&quot;")}" title="Criar nota neste carro">+Nota</button><button type="button" class="rua-mobile-carro-contador-btn" data-rua-contador-carro="${String(ruaMobileCarroSelecionado).replace(/&/g, "&amp;").replace(/"/g, "&quot;")}" title="Ver materiais do carro">📦</button><button type="button" class="rua-mobile-carro-maps-btn" data-rua-maps-carro="${String(ruaMobileCarroSelecionado).replace(/&/g, "&amp;").replace(/"/g, "&quot;")}" title="Abrir rota pendente do carro no Google Maps">🗺️</button></div></div>`
    : "";
  // Botão global removido: agora a nota é criada diretamente na linha do carro.
  const ruaMobileToolbarNotas = "";

  listaEl.innerHTML = ruaMobileToolbarNotas + ruaMobileHeaderCarroSelecionado + rotasRender.map(({ rota, idx, carroGrupo, inicioGrupo, posicaoGrupo, totalGrupo }) => {
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
      ? `<div class="rua-mobile-carro-grupo"><span>🚚 ${carroGrupo}</span><div class="rua-mobile-carro-actions"><button type="button" class="rua-mobile-carro-nota-btn" data-rua-nota-carro="${String(carroGrupo).replace(/&/g, "&amp;").replace(/"/g, "&quot;")}" title="Criar nota neste carro">+Nota</button><button type="button" class="rua-mobile-carro-contador-btn" data-rua-contador-carro="${String(carroGrupo).replace(/&/g, "&amp;").replace(/"/g, "&quot;")}" title="Ver materiais do carro">📦</button><button type="button" class="rua-mobile-carro-maps-btn" data-rua-maps-carro="${String(carroGrupo).replace(/&/g, "&amp;").replace(/"/g, "&quot;")}" title="Abrir rota pendente do carro no Google Maps">🗺️</button></div></div>`
      : "";

    const notasAntes = ruaMobileNotasHtml(rota.data, carro, posicaoGrupo);
    const notasDepois = (posicaoGrupo === totalGrupo - 1) ? ruaMobileNotasHtml(rota.data, carro, totalGrupo) : "";

    return `
      ${ruaMobileGrupoCarro}
      ${notasAntes}
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
          <div class="rua-mobile-badge-wrap">${badge}${ruaMobileUsuarioAdmin() && operacao?.status ? `<button type="button" class="rua-mobile-reverter-top-btn" data-rua-reverter-rota="${ruaMobileEscAttr(rota.id)}" title="Reverter operação" aria-label="Reverter operação">↺</button>` : ""}</div>
        </div>
        <div class="rua-mobile-cliente">${ruaMobileHtmlClienteEvento(rota)}</div>
        ${concluida && !expandido ? `<div class="rua-mobile-endereco-resumo">📍 ${(endereco || "Endereço não informado").slice(0, 72)}${String(endereco || "").length > 72 ? "..." : ""}</div>` : ""}
        <div class="rua-mobile-endereco">📍 ${endereco ? `<a href="${mapa}" target="_blank" rel="noopener">${ruaMobileEscAttr(endereco)}</a>` : "Endereço não informado"}</div>
        <div class="rua-mobile-materiais rua-mobile-materiais-click" title="Clique em um produto para trocar"><strong>Materiais:</strong> ${typeof renderizarMateriaisRotaClicaveis === "function" ? renderizarMateriaisRotaClicaveis(rota) : ruaMobileResumoMateriais(rota)}</div>
        ${ruaMobileHtmlPagamento(rota.evento || {})}

        ${concluida && !expandido ? "" : `<div class="rua-mobile-acoes rua-mobile-acoes-compactas">
          ${ruaMobilePixValorDevido(rota.evento || {}) > 0 ? `<button type="button" class="btn-outline rua-mobile-acao-btn rua-mobile-pix-btn" data-rua-pix-rota-id="${ruaMobileEscAttr(rota.id)}" title="Gerar Pix" aria-label="Gerar Pix"><span>🔳</span><small>Pix</small></button>` : ""}
          ${tel ? `<a class="btn-outline rua-mobile-acao-btn" href="tel:${tel}" title="Ligar" aria-label="Ligar"><span>☎️</span><small>Ligar</small></a>` : ""}
          ${tel ? `<button type="button" class="btn-outline rua-mobile-acao-btn rua-mobile-whatsapp-api-btn" data-rota-whatsapp="${ruaMobileEscAttr(rota.id)}" title="Enviar template pela API do WhatsApp" aria-label="Enviar template pela API do WhatsApp"><span><svg viewBox="0 0 32 32" aria-hidden="true"><path fill="currentColor" d="M16.04 3.2A12.74 12.74 0 0 0 5.2 22.65L3.5 28.8l6.3-1.65A12.75 12.75 0 1 0 16.04 3.2Zm0 2.15a10.6 10.6 0 0 1 9.17 15.92 10.6 10.6 0 0 1-13.57 4.34l-.43-.21-3.74.98 1-3.64-.24-.45A10.6 10.6 0 0 1 16.04 5.35Zm-5.7 5.14c-.27 0-.7.1-1.07.5-.37.4-1.4 1.37-1.4 3.34 0 1.97 1.44 3.88 1.64 4.15.2.27 2.82 4.3 6.84 6.03.96.41 1.7.66 2.28.84.96.3 1.83.26 2.52.16.77-.12 2.36-.97 2.69-1.9.33-.93.33-1.73.23-1.9-.1-.17-.37-.27-.77-.47-.4-.2-2.36-1.17-2.73-1.3-.37-.14-.63-.2-.9.2-.26.4-1.03 1.3-1.26 1.57-.23.27-.47.3-.87.1-.4-.2-1.68-.62-3.2-1.98-1.18-1.05-1.98-2.35-2.21-2.75-.23-.4-.03-.62.17-.82.18-.18.4-.47.6-.7.2-.23.27-.4.4-.67.13-.27.07-.5-.03-.7-.1-.2-.9-2.17-1.23-2.97-.32-.77-.65-.67-.9-.68Z"/></svg></span><small>API</small></button>` : ""}
          ${whats ? `<a class="btn-outline rua-mobile-acao-btn" href="${whats}" target="_blank" rel="noopener" title="Abrir conversa no WhatsApp" aria-label="Abrir conversa no WhatsApp"><span>💬</span><small>Zap</small></a>` : ""}
          ${rota.tipo === "Montagem" ? `<button type="button" class="btn-outline rua-mobile-acao-btn rua-mobile-operacao-btn" data-rua-operacao="entregue" data-rota-id="${rota.id}" title="Marcar entregue" aria-label="Marcar entregue"><span>✅</span><small>Entregue</small></button>` : ""}
          ${rota.tipo === "Desmontagem" ? `<button type="button" class="btn-outline rua-mobile-acao-btn rua-mobile-operacao-btn" data-rua-operacao="recolhido" data-rota-id="${rota.id}" title="Marcar recolhido" aria-label="Marcar recolhido"><span>↩️</span><small>Recolhido</small></button>` : ""}
          ${rota.tipo !== "Montagem" && rota.tipo !== "Desmontagem" ? `<button type="button" class="btn-outline rua-mobile-acao-btn rua-mobile-operacao-btn" data-rua-operacao="efetuado" data-rota-id="${rota.id}" title="Marcar atendimento efetuado" aria-label="Marcar atendimento efetuado"><span>✓</span><small>Efetuado</small></button>` : ""}
        </div>`}
      </article>
      ${notasDepois}
    `;
  }).join("");

  ruaMobileConfigurarAcoesNotas(listaEl);

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

  listaEl.querySelectorAll("[data-rua-contador-carro]").forEach(btn => {
    btn.addEventListener("click", ev => {
      ev.preventDefault();
      ev.stopPropagation();
      ruaMobileAbrirContadorCarro(btn.dataset.ruaContadorCarro || "");
    });
  });

  listaEl.querySelectorAll("[data-rua-maps-carro]").forEach(btn => {
    btn.addEventListener("click", async (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      await abrirGoogleMapsPendenciasCarro(btn.dataset.ruaMapsCarro || "");
    });
  });


  listaEl.querySelectorAll("[data-rua-pix-rota-id]").forEach(btn => {
    btn.addEventListener("click", (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      ruaMobileAbrirPixRota(btn.dataset.ruaPixRotaId || "");
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


  listaEl.querySelectorAll("[data-rua-reverter-rota]").forEach(btn => {
    btn.addEventListener("click", async () => {
      if (!ruaMobileUsuarioAdmin()) return alert("Apenas administrador pode reverter operação.");
      if (typeof reverterOperacaoRota !== "function") return alert("Reversão indisponível nesta versão.");
      await reverterOperacaoRota(btn.dataset.ruaReverterRota);
      ruaMobileCardsExpandidos.delete(String(btn.dataset.ruaReverterRota || ""));
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
      if (typeof rtNotasSincronizarNuvem === "function") await rtNotasSincronizarNuvem(false);
      renderizarRuaMobile();
    });
  }

  setTimeout(async () => {
    if (typeof sincronizarRotasOperacaoNuvem === "function") await sincronizarRotasOperacaoNuvem(false);
    if (typeof rtNotasSincronizarNuvem === "function") await rtNotasSincronizarNuvem(false);
    renderizarRuaMobile();
  }, 800);
  // v19-dev: sincronização leve e segura. Não atualiza a tela enquanto alguém digita/edita/arrasta,
  // evitando o bug antigo de a rota "voltar sozinha" durante alterações manuais.
  setInterval(async () => {
    const usuario = typeof getUsuarioLogado === "function" ? getUsuarioLogado() : null;
    const ruaAtiva = usuario?.perfil === "rua" || document.getElementById("ruaMobileSection")?.classList.contains("active-section");
    const editando = typeof window.rtUsuarioEditandoOperacional === "function" && window.rtUsuarioEditandoOperacional();
    if (!ruaAtiva || editando) return;
    if (typeof atualizarCarrosRotasDaNuvemSeNecessario === "function") await atualizarCarrosRotasDaNuvemSeNecessario();
    if (typeof sincronizarRotasOperacaoNuvem === "function") await sincronizarRotasOperacaoNuvem(false);
    if (typeof rtNotasSincronizarNuvem === "function") await rtNotasSincronizarNuvem(false);
    renderizarRuaMobile();
  }, 60000);
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
