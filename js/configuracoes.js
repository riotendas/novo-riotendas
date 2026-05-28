
const storageConfigKey = "novoRioTendasConfiguracoesV1";

function configPadrao() {
  return {
    carros: ["Saveiro", "Dupla", "Caminhão"],
    categorias: {
      "Tenda Sanfonada": ["3x3", "4.5x3", "4x4", "6x3"],
      "Tenda Piramidal": ["5x5", "6x6", "8x8", "10x10"],
      "Ombrelone": ["2,40"],
      "Mesas/Cadeiras": ["Sem código individual"]
    },
    cores: ["Branca", "Cristal", "Preta"],
    fotosPadrao: {},
    nomeEmpresa: "RioTendas",
    logoEmpresa: "https://riotendas.smartwebinfo.com.br/webapp/public/img/logo.png",
    periodoRotas: "30"
  };
}

function carregarConfiguracoes() {
  const salvas = JSON.parse(localStorage.getItem(storageConfigKey) || "null");
  return { ...configPadrao(), ...(salvas || {}) };
}


async function carregarConfiguracoesNuvem() {
  if (typeof supabaseClient === "undefined" || !supabaseClient) return null;

  try {
    const { data, error } = await supabaseClient
      .from("app_config")
      .select("valor")
      .eq("chave", "configuracoes")
      .maybeSingle();

    if (error) {
      console.warn("Não foi possível carregar configurações da nuvem:", error);
      return null;
    }

    return data?.valor || null;
  } catch (erro) {
    console.warn("Erro ao carregar configurações da nuvem:", erro);
    return null;
  }
}

async function salvarConfiguracoesNuvem(config) {
  if (typeof supabaseClient === "undefined" || !supabaseClient) return;

  try {
    const { error } = await supabaseClient
      .from("app_config")
      .upsert({
        chave: "configuracoes",
        valor: config,
        atualizado_em: new Date().toISOString()
      }, { onConflict: "chave" });

    if (error) console.warn("Não foi possível salvar configurações na nuvem:", error);
  } catch (erro) {
    console.warn("Erro ao salvar configurações na nuvem:", erro);
  }
}

async function sincronizarConfiguracoesNuvem() {
  const configNuvem = await carregarConfiguracoesNuvem();

  if (configNuvem) {
    const configLocal = carregarConfiguracoes();
    const configFinal = { ...configLocal, ...configNuvem };
    localStorage.setItem(storageConfigKey, JSON.stringify(configFinal));
    aplicarConfiguracoesNoSistema();

    if (typeof renderizarProdutos === "function") renderizarProdutos();
    if (typeof renderizarRotas === "function") renderizarRotas();
    if (typeof renderizarFotosPadraoConfig === "function") renderizarFotosPadraoConfig();
    if (typeof renderizarCarrosConfig === "function") renderizarCarrosConfig();
    return configFinal;
  }

  const configAtual = carregarConfiguracoes();
  await salvarConfiguracoesNuvem(configAtual);
  return configAtual;
}

function salvarConfiguracoes(config) {
  localStorage.setItem(storageConfigKey, JSON.stringify(config));
  aplicarConfiguracoesNoSistema();

  // Em nuvem, mantém configurações compartilhadas entre computadores/celulares.
  salvarConfiguracoesNuvem(config);
}

function aplicarConfiguracoesNoSistema() {
  const config = carregarConfiguracoes();

  window.configRioTendas = config;

  if (Array.isArray(config.carros)) {
    window.carrosEmpresa = config.carros;
  }

  if (config.categorias && typeof config.categorias === "object") {
    window.categoriasProdutosConfig = config.categorias;

    // Atualiza a variável global usada pelo cadastro de produtos, se ela existir.
    try {
      if (typeof categoriasProdutos !== "undefined") {
        Object.keys(categoriasProdutos).forEach(k => delete categoriasProdutos[k]);
        Object.entries(config.categorias).forEach(([categoria, tamanhos]) => {
          categoriasProdutos[categoria] = tamanhos;
        });
      }
    } catch (erro) {
      console.warn("Não foi possível atualizar categoriasProdutos diretamente.", erro);
    }
  }

  if (config.fotosPadrao && typeof config.fotosPadrao === "object") {
    window.fotosPadraoProdutosConfig = config.fotosPadrao;
  }

  if (Array.isArray(config.cores)) {
    window.coresProdutosConfig = config.cores;

    // Atualiza a variável global usada pelo cadastro de produtos, se ela existir.
    try {
      if (typeof coresProdutos !== "undefined") {
        coresProdutos.length = 0;
        config.cores.forEach(cor => coresProdutos.push(cor));
      }
    } catch (erro) {
      console.warn("Não foi possível atualizar coresProdutos diretamente.", erro);
    }
  }

  const rotaPeriodo = document.getElementById("rotaPeriodo");
  if (rotaPeriodo && config.periodoRotas) {
    rotaPeriodo.value = config.periodioRotas || config.periodoRotas;
  }

  // Recarrega opções visuais sem apagar dados digitados.
  try {
    if (typeof preencherFiltrosProdutos === "function") preencherFiltrosProdutos();
  } catch {}

  try {
    if (typeof atualizarOpcoesProduto === "function") atualizarOpcoesProduto();
  } catch {}

  try {
    if (typeof renderizarRotas === "function") renderizarRotas();
  } catch {}
}

function iniciarConfiguracoes() {
  if (!document.getElementById("configSection")) return;

  aplicarConfiguracoesNoSistema();
  sincronizarConfiguracoesNuvem().then(() => {
    preencherPreferenciasConfig();
    renderizarCarrosConfig();
    renderizarCategoriasConfig();
    preencherSelectsFotoPadrao();
    renderizarCoresConfig();
    renderizarFotosPadraoConfig();
  });
  preencherPreferenciasConfig();
  renderizarCarrosConfig();
  renderizarCategoriasConfig();
  preencherSelectsFotoPadrao();
  renderizarCoresConfig();
  preencherSelectsFotoPadrao();
  renderizarFotosPadraoConfig();

  document.getElementById("exportarProdutosExcel").addEventListener("click", () => exportarProdutosExcel());
  document.getElementById("importarProdutosExcel").addEventListener("change", importarProdutosExcel);

  document.getElementById("exportarEventosExcel").addEventListener("click", exportarEventosExcel);
  document.getElementById("importarEventosExcel").addEventListener("change", importarEventosExcel);

  document.getElementById("adicionarCarroConfig").addEventListener("click", adicionarCarroConfig);
  document.getElementById("adicionarCategoriaConfig").addEventListener("click", adicionarCategoriaConfig);
  document.getElementById("adicionarCorConfig").addEventListener("click", adicionarCorConfig);
  const categoriaFotoPadrao = document.getElementById("fotoPadraoCategoria");
  if (categoriaFotoPadrao) categoriaFotoPadrao.addEventListener("change", preencherTamanhosFotoPadrao);

  const btnFotoPadrao = document.getElementById("adicionarFotoPadraoConfig");
  if (btnFotoPadrao) btnFotoPadrao.addEventListener("click", adicionarFotoPadraoConfig);
  document.getElementById("salvarPreferenciasConfig").addEventListener("click", salvarPreferenciasConfig);
}

function garantirXLSX() {
  if (typeof XLSX === "undefined") {
    alert("Biblioteca de Excel não carregada. Verifique a conexão com a internet ou o CDN do SheetJS.");
    return false;
  }
  return true;
}

function baixarCSVCompatExcel(nomeArquivo, linhas) {
  if (!linhas || !linhas.length) {
    alert("Nenhum dado encontrado para exportar.");
    return;
  }

  const colunas = Object.keys(linhas[0]);

  const escapar = valor => {
    const texto = String(valor ?? "").replace(/"/g, '""');
    return `"${texto}"`;
  };

  const csv = [
    colunas.map(escapar).join(";"),
    ...linhas.map(linha => colunas.map(coluna => escapar(linha[coluna])).join(";"))
  ].join("\n");

  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = nomeArquivo.replace(/\.xlsx$/i, ".csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

function baixarPlanilha(nomeArquivo, linhas, nomeAba = "Dados") {
  if (!linhas || !linhas.length) {
    alert("Nenhum dado encontrado para exportar.");
    return;
  }

  if (typeof XLSX === "undefined") {
    console.warn("XLSX não carregou. Exportando CSV compatível com Excel.");
    baixarCSVCompatExcel(nomeArquivo, linhas);
    return;
  }

  try {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(linhas);
    XLSX.utils.book_append_sheet(wb, ws, nomeAba);
    XLSX.writeFile(wb, nomeArquivo);
  } catch (erro) {
    console.error("Erro ao gerar XLSX. Exportando CSV.", erro);
    baixarCSVCompatExcel(nomeArquivo, linhas);
  }
}

function lerPlanilhaArquivo(file, callback) {
  if (!garantirXLSX()) return;

  const reader = new FileReader();

  reader.onload = e => {
    const data = new Uint8Array(e.target.result);
    const wb = XLSX.read(data, { type: "array" });
    const primeiraAba = wb.SheetNames[0];
    const ws = wb.Sheets[primeiraAba];
    const linhas = XLSX.utils.sheet_to_json(ws, { defval: "" });
    callback(linhas);
  };

  reader.readAsArrayBuffer(file);
}

async function exportarProdutosExcel() {
  try {
    if (typeof XLSX === "undefined") {
      alert("A biblioteca de Excel ainda não carregou. Aguarde alguns segundos e tente novamente.");
      return;
    }

    let listaProdutos = [];

    if (typeof buscarProdutosBanco === "function") {
      try {
        const dadosBanco = await buscarProdutosBanco();
        if (Array.isArray(dadosBanco)) listaProdutos = dadosBanco;
      } catch (erro) {
        console.warn("buscarProdutosBanco falhou:", erro);
      }
    }

    if (!listaProdutos.length && typeof supabaseClient !== "undefined" && supabaseClient) {
      for (const tabela of ["produtos", "tendas"]) {
        try {
          const { data, error } = await supabaseClient.from(tabela).select("*");
          if (!error && Array.isArray(data) && data.length) {
            listaProdutos = data;
            break;
          }
        } catch (erro) {
          console.warn("Erro ao consultar tabela", tabela, erro);
        }
      }
    }

    if (!listaProdutos.length && typeof produtos !== "undefined" && Array.isArray(produtos)) {
      listaProdutos = produtos;
    }

    if (!listaProdutos.length) {
      alert("Nenhum produto encontrado para exportar.");
      return;
    }

    const limitarCelulaExcel = (valor, limite = 32000) => {
      const texto = String(valor ?? "");
      return texto.length > limite ? texto.slice(0, limite) + "..." : texto;
    };

    const chaveFotoPadraoProduto = produto => `${produto.categoria || produto.tipo || ""}|${produto.tamanho || ""}`;

    const obterResumoFotoExcel = produto => {
      const config = carregarConfiguracoes();
      const chave = chaveFotoPadraoProduto(produto);
      const fotoPadrao = config.fotosPadrao?.[chave] || "";
      const fotoPropria = String(produto.foto || "");

      if (fotoPropria && fotoPropria.startsWith("data:image")) return "Foto própria cadastrada";
      if (fotoPropria && fotoPropria.length <= 500) return fotoPropria;
      if (fotoPropria) return "Foto própria cadastrada";

      if (fotoPadrao && String(fotoPadrao).startsWith("data:image")) return "Foto padrão cadastrada";
      if (fotoPadrao && String(fotoPadrao).length <= 500) return fotoPadrao;
      if (fotoPadrao) return "Foto padrão cadastrada";

      return "";
    };

    const linhas = listaProdutos.map(p => ({
      "Código": limitarCelulaExcel(p.codigo || ""),
      "Categoria": limitarCelulaExcel(p.categoria || p.tipo || ""),
      "Tamanho": limitarCelulaExcel(p.tamanho || ""),
      "Cor": limitarCelulaExcel(p.cor || ""),
      "Status": limitarCelulaExcel(p.status || ""),
      "Observação": limitarCelulaExcel(p.observacao || ""),
      "Grau de usabilidade": limitarCelulaExcel(p.grau_usabilidade || ""),
      "Foto": obterResumoFotoExcel(p),
      "Chave foto padrão": chaveFotoPadraoProduto(p),
      "Colaborador": limitarCelulaExcel(p.colaborador || ""),
      "Cadastro": limitarCelulaExcel(p.criado_em || p.data_cadastro || p.data_compra || ""),
      "Atualizado em": limitarCelulaExcel(p.atualizado_em || ""),
      "ID": limitarCelulaExcel(p.id || "")
    }));

    const cabecalhos = [
      "Código",
      "Categoria",
      "Tamanho",
      "Cor",
      "Status",
      "Observação",
      "Grau de usabilidade",
      "Foto",
      "Chave foto padrão",
      "Colaborador",
      "Cadastro",
      "Atualizado em",
      "ID"
    ];

    const ws = XLSX.utils.json_to_sheet(linhas, { header: cabecalhos });

    ws["!cols"] = [
      { wch: 12 },
      { wch: 22 },
      { wch: 14 },
      { wch: 14 },
      { wch: 18 },
      { wch: 35 },
      { wch: 20 },
      { wch: 26 },
      { wch: 28 },
      { wch: 18 },
      { wch: 22 },
      { wch: 22 },
      { wch: 36 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Produtos");

    const arrayBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([arrayBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "produtos-riotendas.xlsx";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

  } catch (erro) {
    console.error("Erro geral ao exportar produtos em XLSX:", erro);
    alert("Erro ao exportar produtos em XLSX: " + (erro.message || erro));
  }
}

async function importarProdutosExcel(event) {
  const file = event.target.files[0];
  if (!file) return;

  if (!confirm("Importar produtos do Excel? Produtos com o mesmo código serão atualizados, evitando duplicidade.")) return;

  const normalizarCodigoProduto = valor => String(valor || "").trim().toLowerCase();

  const fotoValidaImportacao = valor => {
    const texto = String(valor || "").trim();

    if (!texto) return "";
    if (texto === "Foto própria cadastrada") return "";
    if (texto === "Foto padrão cadastrada") return "";
    if (texto === "Foto própria cadastrada no sistema") return "";
    if (texto === "Foto padrão cadastrada no sistema") return "";
    if (texto === "Foto padrão enviada por upload") return "";

    if (texto.startsWith("http://") || texto.startsWith("https://") || texto.startsWith("data:image")) return texto;

    return "";
  };

  lerPlanilhaArquivo(file, async linhasOriginais => {
    const linhas = [];
    const codigosNaPlanilha = new Set();
    let ignoradosSemCodigo = 0;
    let duplicadosNaPlanilha = 0;

    for (const linha of linhasOriginais) {
      const codigo = linha["Código"] || linha.codigo || "";
      const codigoNormalizado = normalizarCodigoProduto(codigo);

      if (!codigoNormalizado) {
        ignoradosSemCodigo++;
        continue;
      }

      // Se a própria planilha tiver o mesmo código repetido,
      // fica valendo a última linha encontrada.
      const existenteIndex = linhas.findIndex(l => normalizarCodigoProduto(l["Código"] || l.codigo || "") === codigoNormalizado);

      if (existenteIndex >= 0) {
        linhas[existenteIndex] = linha;
        duplicadosNaPlanilha++;
      } else {
        linhas.push(linha);
      }

      codigosNaPlanilha.add(codigoNormalizado);
    }

    const produtosAtuais = typeof buscarProdutosBanco === "function"
      ? await buscarProdutosBanco()
      : (Array.isArray(produtos) ? produtos : []);

    let atualizados = 0;
    let criados = 0;

    for (const linha of linhas) {
      const codigo = linha["Código"] || linha.codigo || "";
      const codigoNormalizado = normalizarCodigoProduto(codigo);

      const existente = Array.isArray(produtosAtuais)
        ? produtosAtuais.find(p => normalizarCodigoProduto(p.codigo) === codigoNormalizado)
        : null;

      const id = existente?.id || linha.ID || linha.id || gerarId();

      const fotoImportada = fotoValidaImportacao(linha["Foto"] || linha.foto || "");
      const fotoPreservada = fotoImportada || existente?.foto || "";

      const produto = {
        ...(existente || {}),
        id,
        codigo: codigo,
        categoria: linha["Categoria"] || linha.categoria || linha.tipo || existente?.categoria || existente?.tipo || "",
        tipo: linha["Categoria"] || linha.tipo || linha.categoria || existente?.tipo || existente?.categoria || "",
        tamanho: linha["Tamanho"] || linha.tamanho || existente?.tamanho || "",
        cor: linha["Cor"] || linha.cor || existente?.cor || "",
        status: linha["Status"] || linha.status || existente?.status || "Livre",
        observacao: linha["Observação"] || linha.observacao || linha["observação"] || existente?.observacao || "",
        foto: fotoPreservada,
        grau_usabilidade: linha["Grau de usabilidade"] || linha.grau_usabilidade || linha.usabilidade || existente?.grau_usabilidade || "Bom",
        colaborador: linha["Colaborador"] || linha.colaborador || existente?.colaborador || getColaboradorLogado(),
        criado_em: existente?.criado_em || linha["Cadastro"] || linha.criado_em || new Date().toISOString(),
        atualizado_em: new Date().toISOString(),
        historico: existente?.historico || [],
        locacoes: existente?.locacoes || []
      };

      if (typeof salvarProdutoBanco === "function") {
        await salvarProdutoBanco(produto);
      }

      if (existente) atualizados++;
      else criados++;
    }

    if (typeof carregarProdutos === "function") await carregarProdutos();

    alert(
      `Importação concluída.\n\n` +
      `Criados: ${criados}\n` +
      `Atualizados: ${atualizados}\n` +
      `Duplicados na planilha ignorados/mesclados: ${duplicadosNaPlanilha}\n` +
      `Linhas sem código ignoradas: ${ignoradosSemCodigo}`
    );
  });

  event.target.value = "";
}

function filtrarEventosExportacao() {
  const inicio = document.getElementById("exportEventoInicio").value;
  const fim = document.getElementById("exportEventoFim").value;

  return (Array.isArray(eventos) ? eventos : []).filter(e => {
    return (!inicio || e.data_evento >= inicio) && (!fim || e.data_evento <= fim);
  });
}

function textoProdutosEventoConfig(evento) {
  const tendas = (evento.tendas || []).map(p => [p.codigo, p.categoria, p.tamanho, p.cor].filter(Boolean).join(" - "));
  const apoio = (evento.itens_apoio || []).map(i => `${i.nome} (${i.quantidade})`);
  const extras = (evento.produtos_extras || []).map(i => `${i.descricao} (${i.quantidade})`);
  return [...tendas, ...apoio, ...extras].join(" | ");
}

function exportarEventosExcel() {
  const linhas = filtrarEventosExportacao().map(e => ({
    id: e.id || "",
    nome: e.nome || "",
    documento: e.documento || "",
    telefone: e.telefone || "",
    endereco: e.endereco || "",
    data_evento: e.data_evento || "",
    hora_inicio: e.hora_inicio || e.hora_evento || "",
    hora_termino: e.hora_termino || "",
    montagem_tipo: e.montagem_tipo || "",
    montagem: e.montagem || "",
    desmontagem_tipo: e.desmontagem_tipo || "",
    desmontagem: e.desmontagem || "",
    produtos_resumo: textoProdutosEventoConfig(e),
    tendas_json: JSON.stringify(e.tendas || []),
    itens_apoio_json: JSON.stringify(e.itens_apoio || []),
    produtos_extras_json: JSON.stringify(e.produtos_extras || []),
    valor_total: Number(e.valor_total || 0),
    valor_sinal: Number(e.valor_sinal || 0),
    valor_restante: Number(e.valor_restante || 0),
    forma_pagamento: e.forma_pagamento || "",
    pagamento_quitado: e.pagamento_quitado ? "Sim" : "Não",
    colaborador: e.colaborador || "",
    criado_em: e.criado_em || "",
    atualizado_em: e.atualizado_em || ""
  }));

  baixarPlanilha("eventos-riotendas.xlsx", linhas, "Eventos");
}

async function importarEventosExcel(event) {
  const file = event.target.files[0];
  if (!file) return;

  if (!confirm("Importar eventos do Excel? Eventos com o mesmo ID serão atualizados.")) return;

  lerPlanilhaArquivo(file, async linhas => {
    for (const linha of linhas) {
      const evento = {
        id: linha.id || gerarId(),
        nome: linha.nome || "",
        documento: linha.documento || "",
        telefone: linha.telefone || "",
        endereco: linha.endereco || "",
        data_evento: linha.data_evento || null,
        hora_inicio: linha.hora_inicio || linha.hora_evento || null,
        hora_termino: linha.hora_termino || null,
        hora_evento: linha.hora_inicio || linha.hora_evento || null,
        montagem_tipo: linha.montagem_tipo || "A partir de",
        montagem: linha.montagem || null,
        desmontagem_tipo: linha.desmontagem_tipo || "A partir de",
        desmontagem: linha.desmontagem || null,
        tendas: parseJSONSeguro(linha.tendas_json, []),
        itens_apoio: parseJSONSeguro(linha.itens_apoio_json, []),
        produtos_extras: parseJSONSeguro(linha.produtos_extras_json, []),
        valor_total: Number(linha.valor_total || 0),
        valor_sinal: Number(linha.valor_sinal || 0),
        valor_restante: Number(linha.valor_restante || 0),
        forma_pagamento: linha.forma_pagamento || "",
        pagamento_quitado: String(linha.pagamento_quitado || "").toLowerCase().startsWith("s") || linha.pagamento_quitado === true,
        colaborador: linha.colaborador || getColaboradorLogado(),
        criado_em: linha.criado_em || new Date().toISOString(),
        atualizado_em: new Date().toISOString()
      };

      if (typeof salvarEventoBanco === "function") {
        await salvarEventoBanco(evento);
      }
    }

    if (typeof carregarEventos === "function") await carregarEventos();
    alert("Eventos importados com sucesso.");
  });

  event.target.value = "";
}

function parseJSONSeguro(valor, fallback) {
  try {
    if (!valor) return fallback;
    if (typeof valor !== "string") return fallback;
    return JSON.parse(valor);
  } catch {
    return fallback;
  }
}

function preencherPreferenciasConfig() {
  const config = carregarConfiguracoes();

  document.getElementById("configNomeEmpresa").value = config.nomeEmpresa || "";
  document.getElementById("configLogoEmpresa").value = config.logoEmpresa || "";
  document.getElementById("configPeriodoRotas").value = config.periodoRotas || "30";
}

function renderizarCarrosConfig() {
  const config = carregarConfiguracoes();
  const lista = document.getElementById("listaCarrosConfig");

  lista.innerHTML = config.carros.map(carro => `
    <div class="config-list-item">
      <span>${carro}</span>
      <button type="button" class="btn-outline" data-remover-carro="${carro}">Excluir</button>
    </div>
  `).join("");

  lista.querySelectorAll("[data-remover-carro]").forEach(btn => {
    btn.addEventListener("click", () => {
      const config = carregarConfiguracoes();
      config.carros = config.carros.filter(c => c !== btn.dataset.removerCarro);
      salvarConfiguracoes(config);
      renderizarCarrosConfig();
    });
  });
}

function adicionarCarroConfig() {
  const input = document.getElementById("novoCarroNome");
  const nome = input.value.trim();
  if (!nome) return;

  const config = carregarConfiguracoes();
  if (!config.carros.includes(nome)) config.carros.push(nome);

  input.value = "";
  salvarConfiguracoes(config);
  aplicarConfiguracoesNoSistema();
  renderizarCarrosConfig();
}

function renderizarCategoriasConfig() {
  const config = carregarConfiguracoes();
  const lista = document.getElementById("listaCategoriasConfig");

  lista.innerHTML = Object.entries(config.categorias).map(([categoria, tamanhos]) => `
    <div class="config-list-item config-list-item-column">
      <div>
        <strong>${categoria}</strong>
        <small>${(tamanhos || []).join(", ")}</small>
      </div>
      <button type="button" class="btn-outline" data-remover-categoria="${categoria}">Excluir</button>
    </div>
  `).join("");

  lista.querySelectorAll("[data-remover-categoria]").forEach(btn => {
    btn.addEventListener("click", () => {
      const config = carregarConfiguracoes();
      delete config.categorias[btn.dataset.removerCategoria];
      salvarConfiguracoes(config);
      renderizarCategoriasConfig();
  preencherSelectsFotoPadrao();
    });
  });
}

function adicionarCategoriaConfig() {
  const nomeInput = document.getElementById("novaCategoriaNome");
  const tamanhosInput = document.getElementById("novaCategoriaTamanhos");

  const nome = nomeInput.value.trim();
  const tamanhos = tamanhosInput.value.split(",").map(t => t.trim()).filter(Boolean);

  if (!nome) return;

  const config = carregarConfiguracoes();
  config.categorias[nome] = tamanhos.length ? tamanhos : ["Padrão"];

  nomeInput.value = "";
  tamanhosInput.value = "";

  salvarConfiguracoes(config);
  aplicarConfiguracoesNoSistema();
  renderizarCategoriasConfig();
  preencherSelectsFotoPadrao();
}

function renderizarCoresConfig() {
  const config = carregarConfiguracoes();
  const lista = document.getElementById("listaCoresConfig");

  lista.innerHTML = config.cores.map(cor => `
    <div class="config-list-item">
      <span>${cor}</span>
      <button type="button" class="btn-outline" data-remover-cor="${cor}">Excluir</button>
    </div>
  `).join("");

  lista.querySelectorAll("[data-remover-cor]").forEach(btn => {
    btn.addEventListener("click", () => {
      const config = carregarConfiguracoes();
      config.cores = config.cores.filter(c => c !== btn.dataset.removerCor);
      salvarConfiguracoes(config);
      renderizarCoresConfig();
  preencherSelectsFotoPadrao();
  renderizarFotosPadraoConfig();
    });
  });
}

function adicionarCorConfig() {
  const input = document.getElementById("novaCorNome");
  const nome = input.value.trim();

  if (!nome) return;

  const config = carregarConfiguracoes();
  if (!config.cores.includes(nome)) config.cores.push(nome);

  input.value = "";
  salvarConfiguracoes(config);
  aplicarConfiguracoesNoSistema();
  renderizarCoresConfig();
  preencherSelectsFotoPadrao();
  renderizarFotosPadraoConfig();
}



function arquivoFotoPadraoParaDataURL(file, maxWidth = 900, qualidade = 0.78) {
  return new Promise((resolve, reject) => {
    if (!file) {
      resolve("");
      return;
    }

    const reader = new FileReader();

    reader.onload = event => {
      const img = new Image();

      img.onload = () => {
        const escala = Math.min(1, maxWidth / img.width);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * escala);
        canvas.height = Math.round(img.height * escala);

        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        resolve(canvas.toDataURL("image/jpeg", qualidade));
      };

      img.onerror = reject;
      img.src = event.target.result;
    };

    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function chaveFotoPadrao(categoria, tamanho) {
  return `${String(categoria || "").trim()}|${String(tamanho || "").trim()}`;
}


function preencherSelectsFotoPadrao() {
  const categoriaSelect = document.getElementById("fotoPadraoCategoria");
  const tamanhoSelect = document.getElementById("fotoPadraoTamanho");

  if (!categoriaSelect || !tamanhoSelect) return;

  const config = carregarConfiguracoes();
  const categorias = config.categorias || {};

  const categoriaAtual = categoriaSelect.value;

  categoriaSelect.innerHTML = `
    <option value="">Selecione uma categoria</option>
    ${Object.keys(categorias).map(categoria => `
      <option value="${categoria}" ${categoriaAtual === categoria ? "selected" : ""}>${categoria}</option>
    `).join("")}
  `;

  preencherTamanhosFotoPadrao();
}

function preencherTamanhosFotoPadrao() {
  const categoriaSelect = document.getElementById("fotoPadraoCategoria");
  const tamanhoSelect = document.getElementById("fotoPadraoTamanho");

  if (!categoriaSelect || !tamanhoSelect) return;

  const config = carregarConfiguracoes();
  const categoria = categoriaSelect.value;
  const tamanhos = (config.categorias && config.categorias[categoria]) ? config.categorias[categoria] : [];

  tamanhoSelect.innerHTML = `
    <option value="">Selecione um tamanho</option>
    ${tamanhos.map(tamanho => `<option value="${tamanho}">${tamanho}</option>`).join("")}
  `;
}

function renderizarFotosPadraoConfig() {
  const lista = document.getElementById("listaFotosPadraoConfig");
  if (!lista) return;

  const config = carregarConfiguracoes();
  const fotos = config.fotosPadrao || {};
  const entradas = Object.entries(fotos);

  if (!entradas.length) {
    lista.innerHTML = `<p class="empty">Nenhuma foto padrão cadastrada.</p>`;
    return;
  }

  lista.innerHTML = entradas.map(([chave, url]) => {
    const [categoria, tamanho] = chave.split("|");
    return `
      <div class="config-list-item config-list-item-column foto-padrao-item">
        <div>
          <strong>${categoria || "-"}</strong>
          <small>${tamanho || "-"}</small>
          <small class="foto-padrao-link">${String(url).startsWith("data:image") ? "Foto enviada por upload" : url}</small>
        </div>
        <div class="foto-padrao-preview">
          <img src="${url}" alt="Foto padrão">
          <button type="button" class="btn-outline" data-editar-foto-padrao="${chave}">Alterar</button>
          <button type="button" class="btn-outline btn-danger-soft" data-remover-foto-padrao="${chave}">Excluir link</button>
        </div>
      </div>
    `;
  }).join("");

  lista.querySelectorAll("[data-remover-foto-padrao]").forEach(btn => {
    btn.addEventListener("click", () => {
      const config = carregarConfiguracoes();
      delete config.fotosPadrao[btn.dataset.removerFotoPadrao];
      salvarConfiguracoes(config);
      preencherSelectsFotoPadrao();
  renderizarFotosPadraoConfig();
      if (typeof renderizarProdutos === "function") renderizarProdutos();
    });
  });
}

async function adicionarFotoPadraoConfig() {
  const categoriaInput = document.getElementById("fotoPadraoCategoria");
  const tamanhoInput = document.getElementById("fotoPadraoTamanho");
  const arquivoInput = document.getElementById("fotoPadraoArquivo");
  const hiddenAtual = document.getElementById("fotoPadraoUrl");

  const categoria = categoriaInput.value.trim();
  const tamanho = tamanhoInput.value.trim();
  const arquivo = arquivoInput?.files?.[0] || null;
  const fotoAtual = hiddenAtual?.value || "";

  if (!categoria || !tamanho) {
    alert("Selecione a categoria e o tamanho.");
    return;
  }

  if (!arquivo && !fotoAtual) {
    alert("Selecione uma foto para enviar.");
    return;
  }

  let fotoFinal = fotoAtual;

  if (arquivo) {
    try {
      fotoFinal = await arquivoFotoPadraoParaDataURL(arquivo);
    } catch (erro) {
      console.error("Erro ao processar foto:", erro);
      alert("Não foi possível processar a foto selecionada.");
      return;
    }
  }

  const config = carregarConfiguracoes();
  config.fotosPadrao = config.fotosPadrao || {};
  config.fotosPadrao[chaveFotoPadrao(categoria, tamanho)] = fotoFinal;

  categoriaInput.value = "";
  preencherTamanhosFotoPadrao();
  if (arquivoInput) arquivoInput.value = "";
  if (hiddenAtual) hiddenAtual.value = "";

  salvarConfiguracoes(config);
  renderizarFotosPadraoConfig();

  if (typeof renderizarProdutos === "function") renderizarProdutos();
}

function salvarPreferenciasConfig() {
  const config = carregarConfiguracoes();

  config.nomeEmpresa = document.getElementById("configNomeEmpresa").value.trim() || "RioTendas";
  config.logoEmpresa = document.getElementById("configLogoEmpresa").value.trim() || configPadrao().logoEmpresa;
  config.periodoRotas = document.getElementById("configPeriodoRotas").value || "30";

  salvarConfiguracoes(config);
  alert("Preferências salvas.");
}

let configuracoesInicializadas = false;

function iniciarConfiguracoesUmaVez() {
  if (configuracoesInicializadas) return;
  if (!document.getElementById("configSection")) return;
  iniciarConfiguracoes();
  configuracoesInicializadas = true;
}

document.addEventListener("DOMContentLoaded", () => {
  sincronizarConfiguracoesNuvem();
  iniciarConfiguracoesUmaVez();

  document.querySelectorAll("[data-section='configSection']").forEach(btn => {
    btn.addEventListener("click", () => {
      setTimeout(iniciarConfiguracoesUmaVez, 50);
    });
  });
});
