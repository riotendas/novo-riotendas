// v19-dev: Mobile > Eventos
// Primeira versão: eventos de hoje, busca, novo evento rápido e voz -> texto -> prévia.
// Não cria tabelas novas no Supabase. O salvamento final continua passando pelo cadastro oficial de Eventos.

let eventosMobilePreviewAtual = null;
let eventosMobileRecognition = null;
let eventosMobileDataSelecionada = null;

function eventosMobileHojeISO() {
  if (typeof dataLocalISO === "function") return dataLocalISO(new Date());
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

function eventosMobileDataAtual() {
  if (!eventosMobileDataSelecionada) eventosMobileDataSelecionada = eventosMobileHojeISO();
  return eventosMobileDataSelecionada;
}

function eventosMobileMoverDia(delta) {
  const base = eventosMobileDataAtual();
  const [ano, mes, dia] = String(base).split("-").map(Number);
  const d = new Date(ano, (mes || 1) - 1, dia || 1, 12, 0, 0, 0);
  d.setDate(d.getDate() + delta);
  eventosMobileDataSelecionada = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  renderizarEventosMobile();
}

function eventosMobileTituloData(dataISO) {
  if (!dataISO) return "📅 Eventos do dia";
  const hoje = eventosMobileHojeISO();
  const texto = eventosMobileFormatarData(dataISO);
  if (dataISO === hoje) return `📅 Eventos de hoje · ${texto}`;
  return `📅 Eventos de ${texto}`;
}

function eventosMobileEscape(txt) {
  return String(txt || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function eventosMobileNormalizar(txt) {
  return String(txt || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function eventosMobileFormatarData(dataISO) {
  if (typeof formatarDataCurta === "function") return formatarDataCurta(dataISO);
  if (!dataISO) return "-";
  const p = String(dataISO).slice(0, 10).split("-");
  return p.length === 3 ? `${p[2]}/${p[1]}/${String(p[0]).slice(-2)}` : dataISO;
}

function eventosMobilePrimeiroNome(nome) {
  return String(nome || "-").trim().split(/\s+/)[0] || "-";
}

function eventosMobileResumoProdutos(evento = {}) {
  const itens = [];
  const tendas = Array.isArray(evento.tendas) ? evento.tendas : [];
  const apoio = Array.isArray(evento.itens_apoio) ? evento.itens_apoio : [];
  const extras = Array.isArray(evento.produtos_extras) ? evento.produtos_extras : [];

  tendas.slice(0, 4).forEach(t => {
    if (typeof t === "string") itens.push(t);
    else itens.push(t?.codigo || t?.descricao || t?.nome || t?.tamanho || "Produto");
  });
  apoio.slice(0, 4).forEach(a => {
    const qtd = a?.quantidade || a?.qtd || "";
    const nome = a?.nome || a?.descricao || a?.tipo || "Apoio";
    itens.push(`${qtd ? qtd + " " : ""}${nome}`);
  });
  extras.slice(0, 3).forEach(e => {
    if (typeof e === "string") itens.push(e);
    else itens.push(e?.descricao || e?.nome || "Extra");
  });

  return itens.filter(Boolean).slice(0, 6).join(" • ") || "Sem materiais informados";
}

function eventosMobileListaBase() {
  try {
    if (Array.isArray(eventos)) return eventos;
  } catch {}
  try {
    return JSON.parse(localStorage.getItem("novoRioTendasEventosV2") || "[]");
  } catch {
    return [];
  }
}

function eventosMobileOrdenar(lista) {
  return [...(lista || [])].sort((a, b) => {
    const da = String(a.data_evento || "").slice(0, 10);
    const db = String(b.data_evento || "").slice(0, 10);
    const ha = String(a.hora_inicio || a.hora_evento || "00:00").slice(0, 5);
    const hb = String(b.hora_inicio || b.hora_evento || "00:00").slice(0, 5);
    return `${da} ${ha}`.localeCompare(`${db} ${hb}`);
  });
}

function renderizarEventosMobile() {
  const listaEl = document.getElementById("eventosMobileLista");
  if (!listaEl) return;

  const busca = eventosMobileNormalizar(document.getElementById("eventosMobileBusca")?.value || "");
  const dataSelecionada = eventosMobileDataAtual();
  const tituloData = document.getElementById("eventosMobileTituloData");
  if (tituloData) tituloData.textContent = busca ? "🔍 Resultado da busca" : eventosMobileTituloData(dataSelecionada);
  let lista = eventosMobileListaBase();

  if (busca) {
    lista = lista.filter(ev => {
      const texto = eventosMobileNormalizar([
        ev.nome, ev.telefone, ev.endereco, ev.data_evento,
        eventosMobileResumoProdutos(ev), ev.colaborador
      ].join(" "));
      return texto.includes(busca);
    });
  } else {
    lista = lista.filter(ev => String(ev.data_evento || "").slice(0, 10) === dataSelecionada);
  }

  lista = eventosMobileOrdenar(lista).slice(0, 80);

  if (!lista.length) {
    listaEl.innerHTML = `<p class="empty">${busca ? "Nenhum evento encontrado." : "Nenhum evento nesta data."}</p>`;
    return;
  }

  listaEl.innerHTML = lista.map(ev => {
    const hora = String(ev.hora_inicio || ev.hora_evento || "").slice(0,5) || "--:--";
    const nome = eventosMobileEscape(eventosMobilePrimeiroNome(ev.nome || ev.cliente));
    const data = eventosMobileFormatarData(ev.data_evento);
    const endereco = eventosMobileEscape(ev.endereco || "");
    const produtos = eventosMobileEscape(eventosMobileResumoProdutos(ev));
    const id = eventosMobileEscape(ev.id || "");
    return `
      <article class="eventos-mobile-item">
        <div class="eventos-mobile-item-top">
          <strong>${hora} · ${nome}</strong>
          <span>${data}</span>
        </div>
        <div class="eventos-mobile-item-produtos">${produtos}</div>
        ${endereco ? `<div class="eventos-mobile-item-endereco">📍 ${endereco}</div>` : ""}
        <div class="eventos-mobile-item-actions">
          <button type="button" class="btn-outline eventos-mobile-editar" data-evento-id="${id}">Editar</button>
          <button type="button" class="btn-outline eventos-mobile-voz-editar" data-evento-id="${id}">🎙️ Voz</button>
        </div>
      </article>
    `;
  }).join("");

  listaEl.querySelectorAll(".eventos-mobile-editar").forEach(btn => {
    btn.addEventListener("click", () => eventosMobileAbrirEdicao(btn.dataset.eventoId));
  });
  listaEl.querySelectorAll(".eventos-mobile-voz-editar").forEach(btn => {
    btn.addEventListener("click", () => eventosMobileEditarPorVoz(btn.dataset.eventoId));
  });
}

function eventosMobileAbrirEdicao(id) {
  if (!id) return;
  if (typeof abrirEditarEvento === "function") {
    abrirEditarEvento(id);
  } else {
    alert("Não foi possível abrir a edição do evento nesta versão.");
  }
}

function eventosMobileEditarPorVoz(id) {
  const ev = eventosMobileListaBase().find(e => String(e.id) === String(id));
  if (!ev) return alert("Evento não encontrado.");
  const texto = prompt(`Fale/digite a alteração para ${ev.nome || "evento"}:\nEx.: adicionar 2 ombrelones, trocar desmontagem para 22h, alterar endereço...`);
  if (!texto) return;
  const box = document.getElementById("eventosMobileTextoVoz");
  if (box) box.value = `Editar evento ${ev.nome || ""}: ${texto}`;
  eventosMobilePreviewAtual = {
    modo: "edicao",
    eventoId: id,
    nome: ev.nome || "",
    data: ev.data_evento || "",
    produtosTexto: texto,
    observacao: "Alteração por voz: " + texto
  };
  eventosMobileRenderPreview();
}

const eventosMobileMeses = {
  janeiro: "01", fevereiro: "02", marco: "03", março: "03", abril: "04", maio: "05", junho: "06",
  julho: "07", agosto: "08", setembro: "09", outubro: "10", novembro: "11", dezembro: "12"
};

function eventosMobileParseData(texto) {
  const t = eventosMobileNormalizar(texto);
  const hoje = new Date();
  if (/\bamanha\b/.test(t)) {
    const d = new Date(hoje); d.setDate(d.getDate() + 1);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  }

  let m = t.match(/\b(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?\b/);
  if (m) {
    const dia = String(m[1]).padStart(2, "0");
    const mes = String(m[2]).padStart(2, "0");
    let ano = m[3] ? String(m[3]) : String(hoje.getFullYear());
    if (ano.length === 2) ano = "20" + ano;
    return `${ano}-${mes}-${dia}`;
  }

  m = t.match(/\bdia\s+(\d{1,2})(?:\s+de)?\s+(janeiro|fevereiro|marco|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)(?:\s+de\s+(\d{4}))?/);
  if (m) {
    const dia = String(m[1]).padStart(2, "0");
    const mes = eventosMobileMeses[m[2]] || "";
    const ano = m[3] || String(hoje.getFullYear());
    if (mes) return `${ano}-${mes}-${dia}`;
  }
  return "";
}

function eventosMobileParseHoraDepois(texto, palavra) {
  const t = eventosMobileNormalizar(texto);
  const idx = t.indexOf(palavra);
  const trecho = idx >= 0 ? t.slice(idx, idx + 80) : t;
  const m = trecho.match(/(\d{1,2})(?:[:h]\s*(\d{2}))?/);
  if (!m) return "";
  const hh = Math.min(23, Number(m[1]));
  const mm = m[2] ? Math.min(59, Number(m[2])) : 0;
  return `${String(hh).padStart(2,"0")}:${String(mm).padStart(2,"0")}`;
}

function eventosMobileExtrairCampo(texto, palavras, atePalavras = []) {
  const original = String(texto || "");
  const lower = eventosMobileNormalizar(original);
  for (const palavra of palavras) {
    const idx = lower.indexOf(palavra);
    if (idx >= 0) {
      let fim = original.length;
      for (const ate of atePalavras) {
        const pos = lower.indexOf(ate, idx + palavra.length);
        if (pos > idx && pos < fim) fim = pos;
      }
      return original.slice(idx + palavra.length, fim).replace(/^[:\s,.-]+/, "").trim();
    }
  }
  return "";
}

function eventosMobileInterpretarTexto(texto) {
  const bruto = String(texto || "").trim();
  const data = eventosMobileParseData(bruto);
  const montagemHora = eventosMobileParseHoraDepois(bruto, "montagem") || eventosMobileParseHoraDepois(bruto, "entrega");
  const desmontagemHora = eventosMobileParseHoraDepois(bruto, "desmontagem") || eventosMobileParseHoraDepois(bruto, "retirada");
  const nome = eventosMobileExtrairCampo(bruto, ["cliente", "nome"], [" dia ", " montagem", " desmontagem", " endereco", " endereço", " telefone", " produto", " produtos"]);
  const telefoneMatch = bruto.replace(/\D/g, " ").match(/\b\d{8,13}\b/);
  const telefone = telefoneMatch ? telefoneMatch[0] : "";
  const endereco = eventosMobileExtrairCampo(bruto, ["endereco", "endereço", "local"], [" telefone", " produto", " produtos", " valor", " pagamento"]);
  let produtosTexto = eventosMobileExtrairCampo(bruto, ["produtos", "produto", "material", "materiais"], [" endereco", " endereço", " telefone", " valor", " pagamento"]);
  if (!produtosTexto) {
    const prodMatch = bruto.match(/((?:\d+\s+)?(?:tenda|tendas|ombrelone|ombrelones|mesa|mesas|cadeira|cadeiras|conjunto|conjuntos|bistro|bistrô|banqueta|banquetas)[\s\S]*)/i);
    produtosTexto = prodMatch ? prodMatch[1].trim() : "";
  }

  return {
    modo: "novo",
    nome,
    telefone,
    data,
    montagemHora,
    desmontagemHora,
    endereco,
    produtosTexto,
    textoOriginal: bruto
  };
}

function eventosMobileDadosManual() {
  return {
    modo: "novo",
    nome: document.getElementById("eventosMobileNome")?.value || "",
    telefone: document.getElementById("eventosMobileTelefone")?.value || "",
    data: document.getElementById("eventosMobileData")?.value || "",
    montagemHora: document.getElementById("eventosMobileMontagem")?.value || "",
    desmontagemHora: document.getElementById("eventosMobileDesmontagem")?.value || "",
    endereco: document.getElementById("eventosMobileEndereco")?.value || "",
    produtosTexto: document.getElementById("eventosMobileProdutos")?.value || "",
    textoOriginal: ""
  };
}

function eventosMobilePreencherManual(dados = {}) {
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ""; };
  set("eventosMobileNome", dados.nome);
  set("eventosMobileTelefone", dados.telefone);
  set("eventosMobileData", dados.data);
  set("eventosMobileMontagem", dados.montagemHora);
  set("eventosMobileDesmontagem", dados.desmontagemHora);
  set("eventosMobileEndereco", dados.endereco);
  set("eventosMobileProdutos", dados.produtosTexto);
}

function eventosMobileRenderPreview() {
  const box = document.getElementById("eventosMobilePreview");
  const conteudo = document.getElementById("eventosMobilePreviewConteudo");
  if (!box || !conteudo || !eventosMobilePreviewAtual) return;

  const d = eventosMobilePreviewAtual;
  conteudo.innerHTML = `
    <div class="eventos-mobile-preview-grid">
      <span>Modo</span><strong>${d.modo === "edicao" ? "Editar evento existente" : "Novo evento"}</strong>
      <span>Cliente</span><strong>${eventosMobileEscape(d.nome || "-")}</strong>
      <span>Telefone</span><strong>${eventosMobileEscape(d.telefone || "-")}</strong>
      <span>Data</span><strong>${eventosMobileEscape(eventosMobileFormatarData(d.data) || "-")}</strong>
      <span>Montagem</span><strong>${eventosMobileEscape(d.montagemHora || "-")}</strong>
      <span>Desmontagem</span><strong>${eventosMobileEscape(d.desmontagemHora || "-")}</strong>
      <span>Endereço</span><strong>${eventosMobileEscape(d.endereco || "-")}</strong>
      <span>Produtos / alteração</span><strong>${eventosMobileEscape(d.produtosTexto || "-")}</strong>
    </div>
    <p class="eventos-mobile-preview-alert">Confira os dados. Nesta primeira versão, o botão abaixo abre o cadastro oficial já preenchido para você revisar e salvar.</p>
  `;
  box.classList.remove("hidden");
  box.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function eventosMobileAbrirCadastroPreenchido() {
  const d = eventosMobilePreviewAtual;
  if (!d) return;

  if (d.modo === "edicao" && d.eventoId) {
    eventosMobileAbrirEdicao(d.eventoId);
    setTimeout(() => {
      const obs = document.getElementById("eventoClienteObservacao");
      if (obs && d.observacao) obs.value = [obs.value, d.observacao].filter(Boolean).join(" | ");
    }, 250);
    return;
  }

  if (typeof abrirNovoEvento !== "function") {
    alert("Cadastro oficial de eventos não disponível nesta tela.");
    return;
  }

  abrirNovoEvento();

  setTimeout(() => {
    const set = (id, val) => { const el = document.getElementById(id); if (el && val !== undefined && val !== null) el.value = val; };
    set("eventoBuscaCliente", d.nome || "");
    set("eventoNome", d.nome || "");
    set("eventoTelefone", d.telefone || "");
    set("eventoEndereco", d.endereco || "");
    set("eventoData", d.data || "");
    set("eventoHoraInicio", d.montagemHora || "");
    set("eventoHoraTermino", d.desmontagemHora || "");
    set("eventoMontagem", d.data || "");
    set("eventoDesmontagem", d.data || "");
    set("eventoMontagemHora", d.montagemHora || "");
    set("eventoDesmontagemHora", d.desmontagemHora || "");
    const mt = document.getElementById("eventoMontagemTipo");
    const dt = document.getElementById("eventoDesmontagemTipo");
    if (mt && d.montagemHora) mt.value = "Exatamente";
    if (dt && d.desmontagemHora) dt.value = "Exatamente";
    if (typeof atualizarCampoHoraFinalOperacao === "function") {
      atualizarCampoHoraFinalOperacao("Montagem");
      atualizarCampoHoraFinalOperacao("Desmontagem");
    }

    // Primeira fase: o texto de produtos entra como observação para conferência.
    // A seleção automática de códigos entra na fase seguinte.
    const obs = document.getElementById("eventoClienteObservacao");
    if (obs && d.produtosTexto) {
      obs.value = [obs.value, `Produtos por voz: ${d.produtosTexto}`].filter(Boolean).join(" | ");
    }
  }, 250);
}

function eventosMobileIniciarReconhecimento() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const status = document.getElementById("eventosMobileVozStatus");
  if (!SpeechRecognition) {
    if (status) status.textContent = "Este navegador não liberou reconhecimento de voz. Digite o texto e clique em Interpretar.";
    return;
  }

  if (!eventosMobileRecognition) {
    eventosMobileRecognition = new SpeechRecognition();
    eventosMobileRecognition.lang = "pt-BR";
    eventosMobileRecognition.interimResults = true;
    eventosMobileRecognition.continuous = false;

    eventosMobileRecognition.onresult = (event) => {
      let texto = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        texto += event.results[i][0].transcript;
      }
      const campo = document.getElementById("eventosMobileTextoVoz");
      if (campo) campo.value = texto;
    };

    eventosMobileRecognition.onend = () => {
      if (status) status.textContent = "Gravação encerrada. Confira o texto e clique em Interpretar.";
    };

    eventosMobileRecognition.onerror = () => {
      if (status) status.textContent = "Não consegui usar o microfone. Digite o texto manualmente.";
    };
  }

  if (status) status.textContent = "Ouvindo... fale os dados do evento.";
  try { eventosMobileRecognition.start(); } catch {}
}

function iniciarEventosMobile() {
  const sec = document.getElementById("eventosMobileSection");
  if (!sec || sec.dataset.iniciado === "1") return;
  sec.dataset.iniciado = "1";

  const hoje = document.getElementById("eventosMobileData");
  if (hoje && !hoje.value) hoje.value = eventosMobileHojeISO();

  document.getElementById("eventosMobileAtualizarBtn")?.addEventListener("click", () => {
    if (typeof carregarEventos === "function") carregarEventos().then(renderizarEventosMobile);
    else renderizarEventosMobile();
  });

  document.getElementById("eventosMobileBusca")?.addEventListener("input", renderizarEventosMobile);
  document.getElementById("eventosMobileDiaAnteriorBtn")?.addEventListener("click", () => eventosMobileMoverDia(-1));
  document.getElementById("eventosMobileHojeBtn")?.addEventListener("click", () => {
    eventosMobileDataSelecionada = eventosMobileHojeISO();
    const busca = document.getElementById("eventosMobileBusca");
    if (busca) busca.value = "";
    renderizarEventosMobile();
  });
  document.getElementById("eventosMobileDiaProximoBtn")?.addEventListener("click", () => eventosMobileMoverDia(1));
  document.getElementById("eventosMobileGravarBtn")?.addEventListener("click", eventosMobileIniciarReconhecimento);

  document.getElementById("eventosMobileInterpretarBtn")?.addEventListener("click", () => {
    const txt = document.getElementById("eventosMobileTextoVoz")?.value || "";
    eventosMobilePreviewAtual = eventosMobileInterpretarTexto(txt);
    eventosMobilePreencherManual(eventosMobilePreviewAtual);
    eventosMobileRenderPreview();
  });

  document.getElementById("eventosMobileLimparVozBtn")?.addEventListener("click", () => {
    const campo = document.getElementById("eventosMobileTextoVoz");
    if (campo) campo.value = "";
    const status = document.getElementById("eventosMobileVozStatus");
    if (status) status.textContent = "Microfone em modo teste. Sempre confira a prévia antes de salvar.";
  });

  document.getElementById("eventosMobilePrepararManualBtn")?.addEventListener("click", () => {
    eventosMobilePreviewAtual = eventosMobileDadosManual();
    eventosMobileRenderPreview();
  });

  document.getElementById("eventosMobileFecharPreviewBtn")?.addEventListener("click", () => {
    document.getElementById("eventosMobilePreview")?.classList.add("hidden");
  });

  document.getElementById("eventosMobileEditarPreviewBtn")?.addEventListener("click", () => {
    if (eventosMobilePreviewAtual) eventosMobilePreencherManual(eventosMobilePreviewAtual);
    document.getElementById("eventosMobilePreview")?.classList.add("hidden");
  });

  document.getElementById("eventosMobileAbrirCadastroBtn")?.addEventListener("click", eventosMobileAbrirCadastroPreenchido);

  renderizarEventosMobile();
}

window.iniciarEventosMobile = iniciarEventosMobile;
window.renderizarEventosMobile = renderizarEventosMobile;

document.addEventListener("DOMContentLoaded", iniciarEventosMobile);
