// v19-dev: Mobile > Eventos
// Primeira versão: eventos de hoje, busca, novo evento rápido e voz -> texto -> prévia.
// Não cria tabelas novas no Supabase. O salvamento final continua passando pelo cadastro oficial de Eventos.

let eventosMobilePreviewAtual = null;
let eventosMobileRecognition = null;
let eventosMobileDataSelecionada = null;
let eventosMobileModoSeteDias = false;

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
  eventosMobileModoSeteDias = false;
  renderizarEventosMobile();
}

function eventosMobileTituloData(dataISO) {
  if (!dataISO) return "📅 Eventos do dia";
  const hoje = eventosMobileHojeISO();
  const texto = eventosMobileFormatarData(dataISO);
  if (dataISO === hoje) return `📅 Eventos de hoje · ${texto}`;
  return `📅 Eventos de ${texto}`;
}

function eventosMobileSomarDiasISO(dataISO, delta) {
  const [ano, mes, dia] = String(dataISO || eventosMobileHojeISO()).split("-").map(Number);
  const d = new Date(ano, (mes || 1) - 1, dia || 1, 12, 0, 0, 0);
  d.setDate(d.getDate() + Number(delta || 0));
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

function eventosMobileAtualizarBotaoSeteDias() {
  const btn = document.getElementById("eventosMobileSeteDiasBtn");
  if (!btn) return;
  btn.classList.toggle("active", !!eventosMobileModoSeteDias);
  btn.classList.toggle("btn-primary", !!eventosMobileModoSeteDias);
  btn.classList.toggle("btn-outline", !eventosMobileModoSeteDias);
}

function eventosMobileTituloSeteDias(dataISO) {
  const ini = eventosMobileFormatarData(dataISO);
  const fim = eventosMobileFormatarData(eventosMobileSomarDiasISO(dataISO, 6));
  return `📅 Próximos 7 dias · ${ini} a ${fim}`;
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

function eventosMobileCorAbrev(cor) {
  const t = eventosMobileNormalizar(cor || "");
  if (t.includes("branca") || t.includes("branco")) return "Br";
  if (t.includes("preta") || t.includes("preto")) return "Pt";
  if (t.includes("cristal")) return "Crist";
  return String(cor || "").trim();
}

function eventosMobileProdutoCodigoTipo(item) {
  if (typeof item === "string") {
    let texto = String(item || "").trim().replace(/\s+/g, " ");
    texto = texto.replace(/^tenda\s+/i, "");
    texto = texto.replace(/\s+-\s+Tenda\s+/i, " - ");
    return texto || "Produto";
  }
  const codigo = item?.codigo || item?.produto_codigo || item?.id || "";
  const tamanho = item?.tamanho || item?.medida || "";
  const cor = eventosMobileCorAbrev(item?.cor || item?.cor_nome || "");
  let tipo = String(item?.categoria || item?.tipo || item?.descricao || item?.nome || "").trim();
  tipo = tipo.replace(/^tenda\s+/i, "").replace(/^ombrelone\s+/i, "Omb ");
  tipo = tipo.replace(/sanfonada/i, "Sanf.").replace(/piramidal/i, "Piram.");
  const desc = [tipo, tamanho, cor].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
  return [codigo, desc].filter(Boolean).join(" - ") || "Produto";
}

function eventosMobileApoioResumo(item) {
  const qtd = Number(item?.quantidade || item?.qtd || item?.quantidade_total || 0) || "";
  const nomeOriginal = String(item?.nome || item?.descricao || item?.tipo || "Apoio").trim();
  const n = eventosMobileNormalizar(nomeOriginal);
  let nome = nomeOriginal;
  if (n.includes("cadeira")) nome = n.includes("madeira") ? "Cad. Mad." : (n.includes("bistro") || n.includes("bistro")) ? "Cad. Bistrô" : "Cad.";
  else if (n.includes("mesa")) nome = n.includes("madeira") ? "Mesa Mad." : (n.includes("bistro") || n.includes("bistro")) ? "Mesa Bistrô" : "Mesa";
  else if (n.includes("toalha")) nome = "Toalha";
  else if (n.includes("lateral")) nome = "Lat.";
  else if (n.includes("caixa") && n.includes("term")) nome = n.includes("grande") || n.includes("360") ? "Cx Grande" : n.includes("peq") || n.includes("190") ? "Cx Pequena" : "Cx Térm.";
  else if (n.includes("ombrelone")) nome = "Omb.";
  return `${qtd ? qtd + " " : ""}${nome}`.trim();
}

function eventosMobileResumoProdutos(evento = {}) {
  const itens = [];
  const tendas = Array.isArray(evento.tendas) ? evento.tendas : [];
  const reservas = typeof rtProdutosReservaEvento === "function" ? rtProdutosReservaEvento(evento) : [];
  const apoio = Array.isArray(evento.itens_apoio) ? evento.itens_apoio : [];
  const extras = typeof rtProdutosExtrasOperacionais === "function" ? rtProdutosExtrasOperacionais(evento) : (Array.isArray(evento.produtos_extras) ? evento.produtos_extras : []);

  tendas.slice(0, 6).forEach(t => itens.push(eventosMobileProdutoCodigoTipo(t)));
  reservas.slice(0, 3).forEach(r => itens.push(eventosMobileProdutoCodigoTipo(r)));
  apoio.slice(0, 6).forEach(a => itens.push(eventosMobileApoioResumo(a)));
  extras.slice(0, 3).forEach(e => {
    if (typeof e === "string") itens.push(e);
    else itens.push(eventosMobileApoioResumo(e));
  });

  const texto = itens.filter(Boolean).join(" • ");
  return texto || "Sem materiais informados";
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


function eventosMobileDataCurta(dataISO) {
  const valor = String(dataISO || "").slice(0, 10);
  if (!valor) return "";
  const partes = valor.split("-");
  if (partes.length !== 3) return valor;
  return `${partes[2]}/${partes[1]}`;
}

function eventosMobilePrimeiraDataOperacao(ev, campoData, campoFallback) {
  const bruto = ev?.[campoData] || ev?.[campoFallback] || "";
  return String(bruto || "").slice(0, 10);
}

function eventosMobileRotuloOperacao(ev) {
  const montagem = eventosMobilePrimeiraDataOperacao(ev, "montagem", "data_montagem");
  const desmontagem = eventosMobilePrimeiraDataOperacao(ev, "desmontagem", "data_desmontagem");
  const partes = [];
  if (montagem) partes.push(`Ent. ${eventosMobileDataCurta(montagem)}`);
  if (desmontagem) partes.push(`Ret. ${eventosMobileDataCurta(desmontagem)}`);
  return partes.join(" · ") || eventosMobileDataCurta(ev?.data_evento || "");
}


function renderizarEventosMobile() {
  const listaEl = document.getElementById("eventosMobileLista");
  if (!listaEl) return;

  const busca = eventosMobileNormalizar(document.getElementById("eventosMobileBusca")?.value || "");
  const dataSelecionada = eventosMobileDataAtual();
  const tituloData = document.getElementById("eventosMobileTituloData");
  if (tituloData) tituloData.textContent = busca
    ? "🔍 Resultado da busca"
    : (eventosMobileModoSeteDias ? eventosMobileTituloSeteDias(dataSelecionada) : eventosMobileTituloData(dataSelecionada));
  eventosMobileAtualizarBotaoSeteDias();
  let lista = eventosMobileListaBase().filter(ev => !(typeof rtEventoCancelado === "function" && rtEventoCancelado(ev)));

  if (busca) {
    lista = lista.filter(ev => {
      const texto = eventosMobileNormalizar([
        ev.nome, ev.telefone, ev.endereco, ev.data_evento,
        eventosMobileResumoProdutos(ev), ev.colaborador
      ].join(" "));
      return texto.includes(busca);
    });
  } else if (eventosMobileModoSeteDias) {
    const dataFinal = eventosMobileSomarDiasISO(dataSelecionada, 6);
    lista = lista.filter(ev => {
      const dataEvento = String(ev.data_evento || "").slice(0, 10);
      return dataEvento >= dataSelecionada && dataEvento <= dataFinal;
    });
  } else {
    lista = lista.filter(ev => String(ev.data_evento || "").slice(0, 10) === dataSelecionada);
  }

  lista = eventosMobileOrdenar(lista).slice(0, 80);

  if (!lista.length) {
    listaEl.innerHTML = `<p class="empty">${busca ? "Nenhum evento encontrado." : (eventosMobileModoSeteDias ? "Nenhum evento nos próximos 7 dias." : "Nenhum evento nesta data.")}</p>`;
    return;
  }

  listaEl.innerHTML = lista.map(ev => {
    const nome = eventosMobileEscape(eventosMobilePrimeiroNome(ev.nome || ev.cliente));
    const alerta = typeof rtEventoAlertaHtml === "function" ? rtEventoAlertaHtml(ev) : "";
    const data = eventosMobileFormatarData(ev.data_evento);
    const operacao = eventosMobileEscape(eventosMobileRotuloOperacao(ev));
    const endereco = eventosMobileEscape(ev.endereco || "");
    const produtos = eventosMobileEscape(eventosMobileResumoProdutos(ev));
    const id = eventosMobileEscape(ev.id || "");
    return `
      <article class="eventos-mobile-item">
        <div class="eventos-mobile-item-top">
          <strong>${alerta}${nome}${operacao ? " - " + operacao : ""}</strong>
          <span>${data}</span>
        </div>
        <div class="eventos-mobile-item-produtos">${produtos}</div>
        ${endereco ? `<div class="eventos-mobile-item-endereco">📍 ${endereco}</div>` : ""}
        <div class="eventos-mobile-item-actions">
          <button type="button" class="btn-outline eventos-mobile-editar" data-evento-id="${id}" title="Editar evento">Editar</button>
          ${typeof ruaMobileUsuarioAdmin === "function" && ruaMobileUsuarioAdmin() ? `<button type="button" class="btn-outline danger-soft eventos-mobile-cancelar" data-evento-id="${id}" title="Cancelar evento">Cancelar</button>` : ""}
        </div>
      </article>
    `;
  }).join("");

  listaEl.querySelectorAll(".eventos-mobile-editar").forEach(btn => {
    btn.addEventListener("click", () => eventosMobileAbrirEdicao(btn.dataset.eventoId));
  });

  listaEl.querySelectorAll(".eventos-mobile-cancelar").forEach(btn => {
    btn.addEventListener("click", () => eventosMobileCancelarEvento(btn.dataset.eventoId));
  });

}


async function eventosMobileCancelarEvento(id) {
  if (!id) return;
  if (!(typeof ruaMobileUsuarioAdmin === "function" && ruaMobileUsuarioAdmin())) {
    alert("Apenas administrador pode cancelar eventos pelo mobile.");
    return;
  }
  const ev = eventosMobileListaBase().find(e => String(e.id) === String(id));
  if (!confirm(`Cancelar o evento de ${ev?.nome || "cliente"}?\n\nEle ficará salvo como cancelado e não contará em rotas/disponibilidade.`)) return;
  if (typeof atualizarStatusEventoBanco !== "function") return alert("Cancelamento indisponível nesta versão.");
  const ok = await atualizarStatusEventoBanco(id, "cancelado");
  if (!ok) return;
  if (typeof rtLiberarProdutosEventoCancelado === "function") await rtLiberarProdutosEventoCancelado(ev);
  if (typeof rtLimparOperacoesRotasEventoCancelado === "function") rtLimparOperacoesRotasEventoCancelado(id);
  if (typeof carregarEventosBanco === "function") await carregarEventosBanco();
  if (typeof renderizarEventos === "function") renderizarEventos();
  if (typeof renderizarRotas === "function") renderizarRotas();
  renderizarEventosMobile();
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


function eventosMobileAddDiasISO(dataISO, dias) {
  if (!dataISO) return "";
  const d = new Date(`${dataISO}T12:00:00`);
  if (Number.isNaN(d.getTime())) return "";
  d.setDate(d.getDate() + Number(dias || 0));
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

function eventosMobileParseDataDepoisPalavra(texto, palavras) {
  const bruto = String(texto || "");
  const normal = eventosMobileNormalizar(bruto);
  const lista = Array.isArray(palavras) ? palavras : [palavras];
  for (const palavra of lista) {
    const alvo = eventosMobileNormalizar(palavra);
    const idx = normal.indexOf(alvo);
    if (idx < 0) continue;
    const trecho = bruto.slice(Math.max(0, idx), Math.min(bruto.length, idx + 90));
    const data = eventosMobileParseData(trecho);
    if (data) return data;
  }
  return "";
}

function eventosMobileParseHoraDepoisPalavras(texto, palavras) {
  for (const p of (Array.isArray(palavras) ? palavras : [palavras])) {
    const h = eventosMobileParseHoraDepois(texto, p);
    if (h) return h;
  }
  return "";
}

function eventosMobileParseValores(texto) {
  const bruto = String(texto || "");
  const normal = eventosMobileNormalizar(bruto);
  const moeda = (valor) => {
    if (!valor) return 0;
    const limpo = String(valor).replace(/r\$|reais|real/gi, '').trim();
    const temDecimalVirgula = /,\d{2}\b/.test(limpo);
    let v = limpo.replace(/\./g, '').replace(',', '.').replace(/[^0-9.]/g, '');
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : 0;
  };
  const achar = (regexes) => {
    for (const rg of regexes) {
      const m = bruto.match(rg);
      if (m) return moeda(m[1]);
    }
    return 0;
  };
  const total = achar([/(?:valor\s*total|total|valor)\s*(?:de|:)?\s*(?:r\$\s*)?([\d\.]+(?:,\d{2})?)/i]);
  const sinal = achar([/(?:sinal|entrada)\s*(?:de|:)?\s*(?:r\$\s*)?([\d\.]+(?:,\d{2})?)/i]);
  const restante = achar([/(?:restante|resto|saldo)\s*(?:de|:)?\s*(?:r\$\s*)?([\d\.]+(?:,\d{2})?)/i]);
  const formas = [];
  const addForma = (tipo, palavras) => {
    const janela = normal;
    const temTipo = janela.includes(eventosMobileNormalizar(tipo));
    for (const f of palavras) {
      if (janela.includes(eventosMobileNormalizar(f))) {
        formas.push(`${tipo} - ${f === 'cartao' ? 'Cartão/Rede' : f === 'pix' ? 'Pix/Transf./Dep./Boleto' : f.charAt(0).toUpperCase()+f.slice(1)}`);
        return;
      }
    }
    if (temTipo) formas.push(tipo);
  };
  addForma('Sinal', ['pix', 'dinheiro', 'cartao', 'cartão', 'transferencia', 'transferência']);
  addForma('Restante', ['pix', 'dinheiro', 'cartao', 'cartão', 'transferencia', 'transferência']);
  if (normal.includes('pagamento') && !formas.length) {
    if (normal.includes('pix')) formas.push('Pagamento - Pix/Transf./Dep./Boleto');
    else if (normal.includes('dinheiro')) formas.push('Pagamento - Dinheiro');
    else if (normal.includes('cartao') || normal.includes('cartão')) formas.push('Pagamento - Cartão/Rede');
  }
  return { total, sinal, restante, formaPagamento: formas.join('\n') };
}

function eventosMobileDetectarProdutosTexto(texto) {
  const bruto = String(texto || "");
  const itens = [];
  const numeroPalavra = { uma:1, um:1, duas:2, dois:2, tres:3, três:3, quatro:4, cinco:5, seis:6, sete:7, oito:8, nove:9, dez:10 };
  const regex = /(?:(\d+|um|uma|dois|duas|tres|três|quatro|cinco|seis|sete|oito|nove|dez)\s+)?\b(tendas|tenda(?:\s+sanfonada)?|ombrelones|ombrelone)\b\s*(?:de|da|do)?\s*([0-9]+(?:[,.][0-9]+)?\s*x\s*[0-9]+(?:[,.][0-9]+)?|[0-9]+(?:[,.][0-9]+)?m?)?\s*([a-zçãáéíóúâêô ]{0,18})/gi;
  let m;
  while ((m = regex.exec(bruto))) {
    const qtdRaw = String(m[1] || '1').toLowerCase();
    const quantidade = Number(qtdRaw) || numeroPalavra[qtdRaw] || 1;
    const tipo = /ombrelone/i.test(m[2]) ? 'ombrelone' : 'tenda';
    const tamanho = String(m[3] || '').replace(/\s+/g, '').replace(',', '.');
    let cor = String(m[4] || '')
      .split(/[,.;\n]|\b(?:total|sinal|restante|valor|endereco|endereço|montagem|desmontagem)\b/i)[0]
      .trim();
    cor = cor.replace(/\b(de|da|do|com|e)\b/gi, ' ').replace(/\s+/g, ' ').trim();
    itens.push({ quantidade: Math.max(1, quantidade), tipo, tamanho, cor, texto: m[0].trim() });
  }
  return itens;
}

function eventosMobileProdutoBate(info, produto) {
  if (!produto) return false;
  const texto = eventosMobileNormalizar([produto.codigo, produto.categoria || produto.tipo, produto.tamanho, produto.cor, produto.modelo, produto.descricao].filter(Boolean).join(' '));
  if (info.tipo === 'tenda' && !texto.includes('tenda')) return false;
  if (info.tipo === 'ombrelone' && !texto.includes('ombrelone')) return false;
  if (info.tamanho) {
    const tam = eventosMobileNormalizar(info.tamanho).replace(/\s+/g, '');
    const txt = texto.replace(/\s+/g, '');
    const tamSemPonto = tam.replace('.', ',');
    const tamanhosPossiveis = [tam, tamSemPonto].filter(Boolean);
    const tamanhoProduto = eventosMobileNormalizar(produto.tamanho || "").replace(/\s+/g, '');
    if (!tamanhosPossiveis.some(t => tamanhoProduto === t || txt.includes(t))) return false;
  }
  const cor = eventosMobileNormalizar(info.cor || '');
  if (cor.includes('branc') && !texto.includes('branc')) return false;
  if (cor.includes('azul') && !texto.includes('azul')) return false;
  if (cor.includes('preta') && !texto.includes('pret')) return false;
  return true;
}

function eventosMobileAplicarProdutosInterpretados(dados) {
  if (!dados || !Array.isArray(dados.produtosDetectados) || !dados.produtosDetectados.length) return;
  if (typeof produtosSelecionadosEventoAtual === 'undefined' || !Array.isArray(produtos)) return;
  const ja = new Set((produtosSelecionadosEventoAtual || []).map(p => String(p.id)));
  dados.produtosDetectados.forEach(info => {
    const candidatos = produtos
      .filter(p => (p.categoria || p.tipo) !== 'Materiais de Apoio')
      .filter(p => !ja.has(String(p.id)))
      .filter(p => eventosMobileProdutoBate(info, p))
      .map(p => ({ p, disp: typeof disponibilidadeProdutoParaEvento === 'function' ? disponibilidadeProdutoParaEvento(p.id) : { livre:true } }))
      .filter(x => x.disp && x.disp.livre)
      .sort((a, b) => String(a.p.codigo || "").localeCompare(String(b.p.codigo || ""), "pt-BR", { numeric: true }));
    candidatos.slice(0, info.quantidade).forEach(x => {
      if (typeof rtAdicionarProdutoObjetoEvento === 'function') rtAdicionarProdutoObjetoEvento(x.p);
      ja.add(String(x.p.id));
    });
  });
  if (typeof popularSelectProdutosEvento === 'function') popularSelectProdutosEvento();
  if (typeof renderizarProdutosSelecionadosEvento === 'function') renderizarProdutosSelecionadosEvento();
}

function eventosMobileInterpretarTexto(texto) {
  const bruto = String(texto || "").trim();
  const data = eventosMobileParseDataDepoisPalavra(bruto, ["dia", "evento", "data"]) || eventosMobileParseData(bruto);
  const montagemDataTexto = eventosMobileParseDataDepoisPalavra(bruto, ["montagem", "entrega"]);
  const desmontagemDataTexto = eventosMobileParseDataDepoisPalavra(bruto, ["desmontagem", "retirada"]);
  const montagemData = montagemDataTexto || (data ? eventosMobileAddDiasISO(data, -1) : "");
  const desmontagemData = desmontagemDataTexto || (data ? eventosMobileAddDiasISO(data, 1) : "");
  const montagemHora = eventosMobileParseHoraDepoisPalavras(bruto, ["montagem", "entrega"]);
  const desmontagemHora = eventosMobileParseHoraDepoisPalavras(bruto, ["desmontagem", "retirada"]);
  const nome = eventosMobileExtrairCampo(bruto, ["cliente", "nome"], [" dia ", " data ", " evento", " montagem", " desmontagem", " endereco", " endereço", " telefone", " produto", " produtos", " valor", " total", " sinal", " restante"]);
  const telefoneMatch = bruto.replace(/\D/g, " ").match(/\b\d{8,13}\b/);
  const telefone = telefoneMatch ? telefoneMatch[0] : "";
  const endereco = eventosMobileExtrairCampo(bruto, ["endereco", "endereço", "local"], [" telefone", " produto", " produtos", " valor", " pagamento", " total", " sinal", " restante"]);
  let produtosTexto = eventosMobileExtrairCampo(bruto, ["produtos", "produto", "material", "materiais"], [" endereco", " endereço", " telefone", " valor", " pagamento", " total", " sinal", " restante"]);
  const produtosDetectados = eventosMobileDetectarProdutosTexto(bruto);
  if (!produtosTexto && produtosDetectados.length) produtosTexto = produtosDetectados.map(p => `${p.quantidade} ${p.tipo} ${p.tamanho || ""} ${p.cor || ""}`.trim()).join(", ");
  if (!produtosTexto) {
    const prodMatch = bruto.match(/((?:\d+\s+)?(?:tenda|tendas|ombrelone|ombrelones|mesa|mesas|cadeira|cadeiras|conjunto|conjuntos|bistro|bistrô|banqueta|banquetas)[\s\S]*)/i);
    produtosTexto = prodMatch ? prodMatch[1].trim() : "";
  }
  const valores = eventosMobileParseValores(bruto);

  return {
    modo: "novo",
    nome,
    telefone,
    data,
    montagemData,
    desmontagemData,
    montagemHora,
    desmontagemHora,
    endereco,
    produtosTexto,
    produtosDetectados,
    valorTotal: valores.total,
    valorSinal: valores.sinal,
    valorRestante: valores.restante,
    formaPagamento: valores.formaPagamento,
    textoOriginal: bruto
  };
}

function eventosMobileDadosManual() {
  const data = document.getElementById("eventosMobileData")?.value || "";
  const produtosTexto = document.getElementById("eventosMobileProdutos")?.value || "";
  const produtosDetectados = eventosMobileDetectarProdutosTexto(produtosTexto);
  return {
    modo: "novo",
    nome: document.getElementById("eventosMobileNome")?.value || "",
    telefone: document.getElementById("eventosMobileTelefone")?.value || "",
    data,
    montagemData: document.getElementById("eventosMobileMontagemData")?.value || (data ? eventosMobileAddDiasISO(data, -1) : ""),
    desmontagemData: document.getElementById("eventosMobileDesmontagemData")?.value || (data ? eventosMobileAddDiasISO(data, 1) : ""),
    montagemHora: "",
    desmontagemHora: "",
    endereco: document.getElementById("eventosMobileEndereco")?.value || "",
    produtosTexto,
    produtosDetectados,
    textoOriginal: ""
  };
}

function eventosMobilePreencherManual(dados = {}) {
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ""; };
  set("eventosMobileNome", dados.nome);
  set("eventosMobileTelefone", dados.telefone);
  set("eventosMobileData", dados.data);
  set("eventosMobileMontagemData", dados.montagemData || (dados.data ? eventosMobileAddDiasISO(dados.data, -1) : ""));
  set("eventosMobileDesmontagemData", dados.desmontagemData || (dados.data ? eventosMobileAddDiasISO(dados.data, 1) : ""));
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
      <span>Montagem</span><strong>${eventosMobileEscape([eventosMobileFormatarData(d.montagemData), d.montagemHora || "Livre"].filter(Boolean).join(" · ") || "-")}</strong>
      <span>Desmontagem</span><strong>${eventosMobileEscape([eventosMobileFormatarData(d.desmontagemData), d.desmontagemHora || "Livre"].filter(Boolean).join(" · ") || "-")}</strong>
      <span>Endereço</span><strong>${eventosMobileEscape(d.endereco || "-")}</strong>
      <span>Produtos / alteração</span><strong>${eventosMobileEscape(d.produtosTexto || "-")}</strong>
      <span>Valores</span><strong>${eventosMobileEscape([d.valorTotal ? `Total R$ ${d.valorTotal}` : "", d.valorSinal ? `Sinal R$ ${d.valorSinal}` : "", d.valorRestante ? `Restante R$ ${d.valorRestante}` : ""].filter(Boolean).join(" · ") || "-")}</strong>
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
    set("eventoMontagem", d.montagemData || (d.data ? eventosMobileAddDiasISO(d.data, -1) : ""));
    set("eventoDesmontagem", d.desmontagemData || (d.data ? eventosMobileAddDiasISO(d.data, 1) : ""));
    set("eventoMontagemHora", d.montagemHora || "");
    set("eventoDesmontagemHora", d.desmontagemHora || "");
    if (d.valorTotal && typeof numeroParaMoeda === "function") set("eventoValorTotal", numeroParaMoeda(d.valorTotal));
    if (d.valorSinal && typeof numeroParaMoeda === "function") set("eventoValorSinal", numeroParaMoeda(d.valorSinal));
    if (d.formaPagamento) set("eventoFormaPagamento", d.formaPagamento);
    const mt = document.getElementById("eventoMontagemTipo");
    const dt = document.getElementById("eventoDesmontagemTipo");
    if (mt) mt.value = d.montagemHora ? "Exatamente" : "Livre / combinar";
    if (dt) dt.value = d.desmontagemHora ? "Exatamente" : "Livre / combinar";
    if (typeof atualizarCampoHoraFinalOperacao === "function") {
      atualizarCampoHoraFinalOperacao("Montagem");
      atualizarCampoHoraFinalOperacao("Desmontagem");
    }
    if (typeof calcularRestanteEvento === "function") calcularRestanteEvento();
    if (typeof atualizarIconesFormaPagamentoEvento === "function") atualizarIconesFormaPagamentoEvento();
    setTimeout(() => eventosMobileAplicarProdutosInterpretados(d), 120);

    const obs = document.getElementById("eventoClienteObservacao");
    if (obs && d.produtosTexto && (!d.produtosDetectados || !d.produtosDetectados.length)) {
      obs.value = [obs.value, `Produtos interpretados: ${d.produtosTexto}`].filter(Boolean).join(" | ");
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
    eventosMobileModoSeteDias = false;
    const busca = document.getElementById("eventosMobileBusca");
    if (busca) busca.value = "";
    renderizarEventosMobile();
  });
  document.getElementById("eventosMobileDiaProximoBtn")?.addEventListener("click", () => eventosMobileMoverDia(1));
  document.getElementById("eventosMobileSeteDiasBtn")?.addEventListener("click", () => {
    eventosMobileDataSelecionada = eventosMobileHojeISO();
    eventosMobileModoSeteDias = true;
    const busca = document.getElementById("eventosMobileBusca");
    if (busca) busca.value = "";
    renderizarEventosMobile();
  });

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
