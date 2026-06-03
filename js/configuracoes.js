
const storageConfigKey = "novoRioTendasConfiguracoesV1";
window.RT_ASSINATURA_RODRIGO_PADRAO = window.RT_ASSINATURA_RODRIGO_PADRAO || "data:image/gif;base64,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";

function modelosDocumentosPadrao() {
  return {
    guia: `
<section class="doc-header">
  {{logo_empresa}}
  <h1>RioTendas – Empresa do Grupo Maximum</h1>
  <p>CNPJ: 05.831.617/0001-72<br>Tels.: (21) 3490-2333 / 99692-9292<br>www.riotendas.com.br</p>
  <h2>Guia de serviço / Contrato</h2>
</section>
<table class="doc-table">
  <tr><th>Data do evento</th><td>{{data_evento}}</td><th>Horário do evento</th><td>{{horario_evento}}</td></tr>
  <tr><th>Montagem</th><td>{{montagem}}</td><th>Desmontagem</th><td>{{desmontagem}}</td></tr>
  <tr><th>Cliente</th><td>{{cliente}}</td><th>CPF/CNPJ</th><td>{{cpf_cnpj}}</td></tr>
  <tr><th>Contatos</th><td>{{telefone}}</td><th>E-mail</th><td>{{email}}</td></tr>
  <tr><th>Endereço</th><td colspan="3">{{endereco}}</td></tr>
  <tr><th>Descrição do serviço</th><td colspan="3">{{descricao_servico}}</td></tr>
  <tr><th>Observação</th><td colspan="3">{{observacao_cliente}}</td></tr>
</table>
<h3>Pagamento</h3>
<table class="doc-table compact">
  <tr><th>Valor total</th><td>{{valor_total}}</td><th>Sinal pago</th><td>{{sinal}}</td><th>Receber</th><td>{{restante}}</td></tr>
  <tr><th>Forma de pagamento</th><td colspan="5">{{forma_pagamento}}</td></tr>
</table>
<h3>Contrato</h3>
<p>Pelo presente CONTRATO DE LOCAÇÃO, de um lado, na qualidade de LOCADORA a empresa RIOTENDAS, pessoa jurídica de direito privado e, na qualidade de LOCATÁRIO, o cliente acima identificado, têm entre si justo e contratado o que abaixo segue:</p>
<p>1º - Confirmo o recebimento dos objetos locados acima descritos em perfeito estado de conservação e funcionamento e, desta forma deverão ser devolvidos à LOCADORA.</p>
<p>2º - É vedada a instalação de material adesivo na lona ou estrutura, alteração de configuração, amarramento ou peças.</p>
<p>3º - O LOCATÁRIO assume responsabilidade pela guarda e conservação dos objetos locados.</p>
<p>Rio de Janeiro, {{data_hoje}}.</p>
{{assinaturas}}
`,
    contrato: `
<section class="doc-header">
  {{logo_empresa}}
  <h1>Contrato de prestação de serviços</h1>
  <p><strong>Contratado:</strong> RioTendas (Condolink Eventos, Locação e Multimidia Ltda) — CNPJ: 05.831.617/0001-72 — Tel.: (21) 3490-2333</p>
</section>
<p><strong>Contratante:</strong> {{cliente}} — CPF/CNPJ: {{cpf_cnpj}} — Telefone: {{telefone}} — E-mail: {{email}}</p>
<p><strong>Descrição do serviço:</strong><br>{{descricao_servico}}</p>
<p><strong>Data do evento:</strong> {{data_evento}} &nbsp; <strong>Horário:</strong> {{horario_evento}}</p>
<p><strong>Local:</strong> {{endereco}}</p>
<h3>Procedimentos de montagem e desmontagem</h3>
<p><strong>Montagem:</strong> {{montagem}}</p>
<p><strong>Desmontagem:</strong> {{desmontagem}}</p>
<h3>Valores e forma de pagamento</h3>
<p>Valor total do serviço: <strong>{{valor_total}}</strong></p>
<p>Sinal: <strong>{{sinal}}</strong></p>
<p>Restante: <strong>{{restante}}</strong></p>
<p>Forma de pagamento:<br>{{forma_pagamento}}</p>
<h3>Contrato de prestação de serviços — Adicional</h3>
<p>De um lado, ora definida como CONTRATANTE, {{cliente}}, no endereço {{endereco}}, telefone {{telefone}}.</p>
<p>De outro lado, ora definido como CONTRATADO, Rio Tendas (Condolink Eventos, Locação e Multimídia Ltda ME), empresa registrada sob o CNPJ 05.831.617/0001-72, com sede à Rua Conselheiro Lampreia, 245 – Cosme Velho - Rio de Janeiro/RJ.</p>
<h4>Cláusula 01 – Das responsabilidades</h4>
<p>A CONTRATADA deverá utilizar produtos de procedência segura, realizar a entrega dos materiais limpos e sem aparência danificada, comparecer ao local com antecedência suficiente e levar as ferramentas necessárias para execução do serviço.</p>
<p>A CONTRATANTE deverá informar dia, local e horário do evento, repassar informações sobre o local, efetuar os pagamentos acordados e providenciar autorizações necessárias em condomínios, portarias ou áreas de acesso restrito.</p>
<h4>Cláusula 02 – Dos serviços</h4>
<p>A CONTRATADA fica encarregada de fornecer os materiais escolhidos pela CONTRATANTE, nos modelos e medidas acordados neste documento.</p>
<h4>Cláusula 03 – Horário de serviço</h4>
<p>A CONTRATADA geralmente realiza a montagem no dia anterior ao evento e a desmontagem no dia posterior ao término, sem cobrança de diária adicional, respeitando rota, trânsito e condições operacionais.</p>
<h4>Cláusula 04 – Do valor e forma de pagamento</h4>
<p>A CONTRATANTE deverá efetuar o pagamento do sinal para garantir a data escolhida e quitar o contrato conforme combinado entre as partes.</p>
<h4>Cláusula 05 – Do cancelamento</h4>
<p>Cancelamentos, alterações de local ou de quantidade de materiais deverão ser comunicados por escrito e serão tratados conforme disponibilidade, prazos e condições comerciais acordadas.</p>
<h4>Cláusula 06 – Do foro</h4>
<p>As partes elegem o foro da Cidade do Rio de Janeiro para solução de qualquer controvérsia oriunda do presente contrato.</p>
<p>Rio de Janeiro, {{data_hoje}}.</p>
{{assinaturas}}
`,
    recibo: `
<section class="doc-header">
  {{logo_empresa}}
  <h1>RioTendas – Empresa do Grupo Maximum</h1>
  <p>Telefones: (21) 3490-2333 / 99692-9292<br>www.riotendas.com.br<br>CNPJ: 05.831.617/0001-72</p>
  <h2>Recibo de locação de bens móveis</h2>
</section>
<table class="doc-table compact">
  <tr><th>Valor</th><td>{{valor_total}}</td><th>Data</th><td>{{data_hoje}}</td></tr>
</table>
<p><strong>Documento emitido conforme Lei 8.846/1994</strong></p>
<table class="doc-table">
  <tr><th>Recebemos de</th><td>{{cliente}}</td></tr>
  <tr><th>Endereço</th><td>{{endereco}}</td></tr>
  <tr><th>A importância de (R$)</th><td>{{valor_total}}</td></tr>
  <tr><th>Referente a</th><td>Locação de materiais para evento em {{data_evento}}<br>{{descricao_servico}}</td></tr>
  <tr><th>Recebimento</th><td>{{forma_pagamento}}</td></tr>
</table>
<p class="small-text">A atividade de locação de bens móveis não está sujeita à tributação de ISS, conforme Lei Complementar nº 116/03, Anexo III da Lei Complementar nº 123/2006 e Instr. Normativa SMF nº 15 de 12/01/2012. As empresas deverão emitir recibo ou fatura de locação de bens móveis.</p>
{{assinaturas}}
`
  };
}


function configPadrao() {
  return {
    carros: ["Saveiro", "Dupla", "Caminhão"],
    categorias: {
      "Tenda Sanfonada": ["3x3", "4.5x3", "4x4", "6x3"],
      "Tenda Piramidal": ["5x5", "6x6", "8x8", "10x10"],
      "Ombrelone": ["2,40"],
      "Materiais de Apoio": ["Sem código individual"]
    },
    cores: ["Branca", "Cristal", "Preta"],
    fotosPadrao: {},
    nomeEmpresa: "RioTendas",
    logoEmpresa: "https://riotendas.smartwebinfo.com.br/webapp/public/img/logo.png",
    assinaturaResponsavel: window.RT_ASSINATURA_RODRIGO_PADRAO || "",
    periodoRotas: "30",
    modelosDocumentos: modelosDocumentosPadrao()
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
  iniciarModelosDocumentosConfig();

  iniciarPopupsConfiguracoes();

  const aoClicar = (id, fn) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("click", fn);
  };
  const aoMudar = (id, fn) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("change", fn);
  };

  aoClicar("exportarProdutosExcel", () => exportarProdutosExcel());
  aoMudar("importarProdutosExcel", importarProdutosExcel);

  aoClicar("adicionarMaterialApoioConfig", adicionarMaterialApoioConfig);
  renderizarMateriaisApoioConfig();

  aoClicar("exportarEventosExcel", exportarEventosExcel);
  aoMudar("importarEventosExcel", importarEventosExcel);

  aoClicar("adicionarCarroConfig", adicionarCarroConfig);
  aoClicar("adicionarCategoriaConfig", adicionarCategoriaConfig);
  aoClicar("adicionarCorConfig", adicionarCorConfig);
  const categoriaFotoPadrao = document.getElementById("fotoPadraoCategoria");
  if (categoriaFotoPadrao) categoriaFotoPadrao.addEventListener("change", preencherTamanhosFotoPadrao);

  const btnFotoPadrao = document.getElementById("adicionarFotoPadraoConfig");
  if (btnFotoPadrao) btnFotoPadrao.addEventListener("click", adicionarFotoPadraoConfig);
  const salvarPrefs = document.getElementById("salvarPreferenciasConfig");
  if (salvarPrefs) salvarPrefs.addEventListener("click", salvarPreferenciasConfig);
  aoMudar("configAssinaturaResponsavelArquivo", carregarAssinaturaResponsavelConfig);
  aoClicar("removerAssinaturaResponsavelConfig", removerAssinaturaResponsavelConfig);
  aoClicar("restaurarAssinaturaResponsavelConfig", restaurarAssinaturaResponsavelConfig);
}

function iniciarPopupsConfiguracoes() {
  const mapa = {
    usuarios: "configModalUsuarios",
    produtos: "configModalProdutos",
    materiais: "configModalMateriais",
    eventos: "configModalEventos",
    carros: "configModalCarros",
    cores: "configModalCores",
    fotos: "configModalFotos",
    documentos: "configModalDocumentos",
    preferencias: "configModalPreferencias",
    logs: "configModalLogs"
  };

  document.querySelectorAll("[data-config-modal]").forEach(btn => {
    btn.addEventListener("click", () => {
      const modal = document.getElementById(mapa[btn.dataset.configModal]);
      if (!modal) return;
      if (btn.dataset.configModal === "usuarios") {
        if (typeof garantirUsuariosDentroConfiguracoes === "function") garantirUsuariosDentroConfiguracoes();
        setTimeout(() => { if (typeof renderizarUsuariosSistemaConfig === "function") renderizarUsuariosSistemaConfig(); }, 50);
      }
      if (btn.dataset.configModal === "materiais") {
        renderizarMateriaisApoioConfig();
      }
      if (btn.dataset.configModal === "documentos") {
        iniciarModelosDocumentosConfig();
      }
      if (btn.dataset.configModal === "logs" && typeof montarPainelLogsSistema === "function") {
        montarPainelLogsSistema();
        setTimeout(() => { if (typeof renderizarLogsSistema === "function") renderizarLogsSistema(); }, 50);
      }
      modal.showModal();
    });
  });

  document.querySelectorAll("[data-close-config]").forEach(btn => {
    btn.addEventListener("click", () => document.getElementById(btn.dataset.closeConfig)?.close());
  });

}


let modeloDocumentoAtualConfig = "guia";

function rtObterModelosDocumentosConfig() {
  const config = carregarConfiguracoes();
  const padrao = modelosDocumentosPadrao();
  return { ...padrao, ...(config.modelosDocumentos || {}) };
}

function iniciarModelosDocumentosConfig() {
  const editor = document.getElementById("docModeloEditor");
  if (!editor) return;

  document.querySelectorAll(".doc-model-tab").forEach(btn => {
    if (btn.dataset.docModelBound === "1") return;
    btn.dataset.docModelBound = "1";
    btn.addEventListener("click", () => {
      modeloDocumentoAtualConfig = btn.dataset.docModel || "guia";
      document.querySelectorAll(".doc-model-tab").forEach(b => b.classList.toggle("active", b === btn));
      carregarModeloDocumentoNoEditor();
    });
  });

  const salvar = document.getElementById("salvarModeloDocumento");
  if (salvar && salvar.dataset.bound !== "1") {
    salvar.dataset.bound = "1";
    salvar.addEventListener("click", salvarModeloDocumentoAtual);
  }

  const restaurar = document.getElementById("restaurarModeloDocumento");
  if (restaurar && restaurar.dataset.bound !== "1") {
    restaurar.dataset.bound = "1";
    restaurar.addEventListener("click", restaurarModeloDocumentoAtual);
  }

  carregarModeloDocumentoNoEditor();
}

function carregarModeloDocumentoNoEditor() {
  const editor = document.getElementById("docModeloEditor");
  if (!editor) return;
  const titulos = { guia: "Guia de Serviço", contrato: "Contrato", recibo: "Recibo" };
  const titulo = document.getElementById("docModeloTituloAtual");
  if (titulo) titulo.textContent = titulos[modeloDocumentoAtualConfig] || "Modelo";
  const modelos = rtObterModelosDocumentosConfig();
  editor.value = modelos[modeloDocumentoAtualConfig] || "";
}

function salvarModeloDocumentoAtual() {
  const editor = document.getElementById("docModeloEditor");
  if (!editor) return;
  const config = carregarConfiguracoes();
  const modelos = rtObterModelosDocumentosConfig();
  modelos[modeloDocumentoAtualConfig] = editor.value;
  config.modelosDocumentos = modelos;
  salvarConfiguracoes(config);
  alert("Modelo salvo.");
}

function restaurarModeloDocumentoAtual() {
  if (!confirm("Restaurar o modelo padrão deste documento?")) return;
  const config = carregarConfiguracoes();
  const modelos = rtObterModelosDocumentosConfig();
  modelos[modeloDocumentoAtualConfig] = modelosDocumentosPadrao()[modeloDocumentoAtualConfig] || "";
  config.modelosDocumentos = modelos;
  salvarConfiguracoes(config);
  carregarModeloDocumentoNoEditor();
  alert("Modelo restaurado.");
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

    if (typeof carregarProdutos === "function") await carregarProdutos(true);

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

let rtEventosImportacaoExcelPreviewAtual = [];

async function importarEventosExcel(event) {
  const file = event.target.files[0];
  if (!file) return;

  if (!garantirXLSX()) {
    event.target.value = "";
    return;
  }

  const reader = new FileReader();

  reader.onload = e => {
    try {
      const workbook = XLSX.read(new Uint8Array(e.target.result), { type: "array", cellDates: true });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const linhas = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

      const dados = linhas
        .filter(linha => Array.isArray(linha) && linha.some(cel => String(cel ?? "").trim()))
        .filter((linha, idx) => {
          if (idx !== 0) return true;
          const primeira = String(linha[0] || "").toLowerCase();
          const sexta = String(linha[5] || "").toLowerCase();
          return !(primeira.includes("data") || sexta.includes("cliente"));
        })
        .map((linha, idx) => normalizarLinhaEventoImportado(linha, idx + 1));

      renderizarPreviewImportarEventos(dados);
    } catch (erro) {
      console.error("Erro ao ler Excel de eventos:", erro);
      alert("Não foi possível ler a planilha. Verifique se o arquivo está em XLSX, XLS ou CSV.");
    }
  };

  reader.readAsArrayBuffer(file);
  event.target.value = "";
}

function normalizarLinhaEventoImportado(linha, numero) {
  const valor = i => String(linha[i] ?? "").trim();

  const evento = {
    numero,
    data_evento: formatarDataImportada(linha[0]),
    hora_evento: formatarHoraImportada(linha[1]),
    montagem: "",
    montagem_original: valor(2),
    montagem_data_escolhida: "",
    montagem_hora_escolhida: "",
    desmontagem: "",
    desmontagem_original: valor(3),
    desmontagem_data_escolhida: "",
    desmontagem_hora_escolhida: "",
    colaborador: normalizarColaboradorImportado(valor(4)),
    nome: valor(5),
    telefone: valor(6),
    endereco: valor(7),
    produtos_texto: valor(8),
    valor_total: formatarMoedaImportada(linha[9]),
    valor_sinal: formatarMoedaImportada(linha[10]),
    valor_restante: formatarMoedaImportada(linha[11]),
    forma_pagamento: valor(12),
    documento: valor(13),
    pendencias: []
  };

  if (!evento.data_evento) evento.pendencias.push("data");
  if (!evento.nome) evento.pendencias.push("cliente");
  if (!evento.endereco) evento.pendencias.push("endereço");
  if (!evento.produtos_texto) evento.pendencias.push("produtos");

  return evento;
}

function formatarDataImportada(valor) {
  if (!valor) return "";

  if (valor instanceof Date && !isNaN(valor.getTime())) {
    return valor.toISOString().slice(0, 10);
  }

  if (typeof valor === "number") {
    const data = XLSX.SSF.parse_date_code(valor);
    if (!data) return "";
    return `${data.y}-${String(data.m).padStart(2, "0")}-${String(data.d).padStart(2, "0")}`;
  }

  const texto = String(valor).trim();
  const match = texto.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (match) {
    const dia = match[1].padStart(2, "0");
    const mes = match[2].padStart(2, "0");
    let ano = match[3];
    if (ano.length === 2) ano = `20${ano}`;
    return `${ano}-${mes}-${dia}`;
  }

  const data = new Date(texto);
  if (!isNaN(data.getTime())) return data.toISOString().slice(0, 10);

  return "";
}

function formatarHoraImportada(valor) {
  if (!valor) return "";

  if (valor instanceof Date && !isNaN(valor.getTime())) {
    return `${String(valor.getHours()).padStart(2, "0")}:${String(valor.getMinutes()).padStart(2, "0")}`;
  }

  if (typeof valor === "number") {
    const totalMinutos = Math.round(valor * 24 * 60);
    const horas = Math.floor(totalMinutos / 60) % 24;
    const minutos = totalMinutos % 60;
    return `${String(horas).padStart(2, "0")}:${String(minutos).padStart(2, "0")}`;
  }

  const texto = String(valor).trim();
  if (/^\d{1,2}H?$/i.test(texto)) return texto.replace(/h/i, "").padStart(2, "0") + ":00";
  if (/^\d{1,2}[:H]\d{1,2}$/i.test(texto)) {
    const partes = texto.replace(/h/i, ":").split(":");
    return `${partes[0].padStart(2, "0")}:${partes[1].padStart(2, "0")}`;
  }

  return texto;
}

function formatarMoedaImportada(valor) {
  if (valor === null || valor === undefined || valor === "") return "";

  if (typeof valor === "number") {
    return valor.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  const texto = String(valor).trim();
  const numero = Number(texto.replace(/\./g, "").replace(",", "."));
  if (!isNaN(numero)) {
    return numero.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  return texto;
}

function normalizarColaboradorImportado(valor) {
  const texto = String(valor || "").trim().toUpperCase();
  if (texto === "R") return "Rodrigo";
  if (texto === "S") return "Sérgio";
  return valor || "";
}

function renderizarPreviewImportarEventos(dados) {
  rtEventosImportacaoExcelPreviewAtual = Array.isArray(dados) ? dados : [];
  const dialog = document.getElementById("previewImportarEventosDialog");
  const tbody = document.getElementById("previewImportarEventosTbody");
  const resumo = document.getElementById("previewImportarEventosResumo");

  if (!dialog || !tbody || !resumo) {
    alert("Prévia criada, mas o modal de importação não foi encontrado.");
    return;
  }

  const total = dados.length;
  const comPendencia = dados.filter(item => item.pendencias.length).length;

  resumo.innerHTML = `
    <button type="button" class="btn-mini" id="selecionarClientesNovosImportacao">Selecionar só clientes novos</button>
    <button type="button" class="btn-mini" id="selecionarTodosClientesImportacao">Selecionar todos</button>
    <strong>${total}</strong> linhas encontradas.
    <strong>${total - comPendencia}</strong> parecem completas.
    <strong>${comPendencia}</strong> precisam de conferência.
  `;

  tbody.innerHTML = dados.map(item => `
    <tr class="${item.pendencias.length ? "linha-pendente" : ""}">
      <td>
        <input
          type="checkbox"
          class="rt-importar-linha-evento"
          data-import-numero="${item.numero}"
          checked
          aria-label="Importar linha ${item.numero}"
        >
      </td>
      <td>${item.numero}</td>
      <td>${rtFormatarDataEventoImportacao(item.data_evento)}</td>
      <td>${item.hora_evento || "-"}</td>
      <td>${rtCampoDataHoraImportacao(item.numero, "montagem", item.montagem_original)}</td>
      <td>${rtCampoDataHoraImportacao(item.numero, "desmontagem", item.desmontagem_original)}</td>
      <td>${escaparHTML(item.colaborador) || "-"}</td>
      <td>${escaparHTML(item.nome) || "-"}<br>${rtStatusClienteImportacao(item)}</td>
      <td>${escaparHTML(item.telefone) || "-"}</td>
      <td>${escaparHTML(item.endereco) || "-"}</td>
      <td>${rtCampoProdutosImportacao(item)}</td>
      <td>${escaparHTML(item.valor_total) || "-"}</td>
      <td>${escaparHTML(item.valor_sinal) || "-"}</td>
      <td>${escaparHTML(item.valor_restante) || "-"}</td>
      <td>${escaparHTML(item.forma_pagamento) || "-"}</td>
      <td>${escaparHTML(item.documento) || "-"}</td>
      <td>${item.pendencias.length ? `Conferir: ${item.pendencias.join(", ")}` : "OK"}</td>
    </tr>
  `).join("");

  const rtBtnFecharPreview = document.getElementById("fecharPreviewImportarEventos"); if (rtBtnFecharPreview) rtBtnFecharPreview.onclick = () => dialog.close();
  const rtBtnCancelarPreview = document.getElementById("cancelarPreviewImportarEventos"); if (rtBtnCancelarPreview) rtBtnCancelarPreview.onclick = () => dialog.close();

  const rtBtnConfirmarPreviewImportacao = document.getElementById("confirmarPreviewImportarEventos");
  if (rtBtnConfirmarPreviewImportacao) rtBtnConfirmarPreviewImportacao.onclick = rtConfirmarImportacaoEventosExcel;

  rtConfigurarSeletorLinhasImportacaoEventos();
  rtConfigurarBotoesClienteNovoImportacao();

  dialog.showModal();
}

function escaparHTML(valor) {
  return String(valor ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
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


function atualizarPreviewAssinaturaResponsavelConfig(valor) {
  const hidden = document.getElementById("configAssinaturaResponsavel");
  const preview = document.getElementById("configAssinaturaResponsavelPreview");
  if (hidden) hidden.value = valor || "";
  if (preview) {
    preview.innerHTML = valor
      ? `<img src="${valor}" alt="Assinatura do responsável">`
      : `<span>Sem assinatura configurada.</span>`;
  }
}

function carregarAssinaturaResponsavelConfig(evento) {
  const arquivo = evento?.target?.files?.[0];
  if (!arquivo) return;
  if (!arquivo.type.startsWith("image/")) {
    alert("Selecione um arquivo de imagem para a assinatura.");
    evento.target.value = "";
    return;
  }
  const reader = new FileReader();
  reader.onload = () => atualizarPreviewAssinaturaResponsavelConfig(reader.result || "");
  reader.readAsDataURL(arquivo);
}

function removerAssinaturaResponsavelConfig() {
  atualizarPreviewAssinaturaResponsavelConfig("");
  const arquivo = document.getElementById("configAssinaturaResponsavelArquivo");
  if (arquivo) arquivo.value = "";
}

function restaurarAssinaturaResponsavelConfig() {
  atualizarPreviewAssinaturaResponsavelConfig(window.RT_ASSINATURA_RODRIGO_PADRAO || "");
  const arquivo = document.getElementById("configAssinaturaResponsavelArquivo");
  if (arquivo) arquivo.value = "";
}

function preencherPreferenciasConfig() {
  const config = carregarConfiguracoes();

  document.getElementById("configNomeEmpresa").value = config.nomeEmpresa || "";
  document.getElementById("configLogoEmpresa").value = config.logoEmpresa || "";
  atualizarPreviewAssinaturaResponsavelConfig(config.assinaturaResponsavel || window.RT_ASSINATURA_RODRIGO_PADRAO || "");
  document.getElementById("configPeriodoRotas").value = config.periodoRotas || "30";
}

function renderizarCarrosConfig() {
  const config = carregarConfiguracoes();
  
const materiaisApoioStyle = document.getElementById('materiais-apoio-align-style') || (()=>{const s=document.createElement('style');s.id='materiais-apoio-align-style';s.textContent=`
#configModalMateriais .materiais-apoio-cabecalho,#configModalMateriais .material-apoio-config-item{display:grid;grid-template-columns:260px 112px 190px;align-items:center;column-gap:12px;justify-content:start;width:fit-content}
#configModalMateriais .materiais-apoio-cabecalho span:nth-child(2),#configModalMateriais .materiais-apoio-cabecalho span:nth-child(3){text-align:center}
#configModalMateriais .material-apoio-config-item .config-actions{display:flex;gap:8px;justify-content:center;width:190px}
`;document.head.appendChild(s);return s;})();

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
  if (!lista) return;

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



async function atualizarMateriaisApoioNasTelas() {
  // Atualiza imediatamente os dados globais e avisa as outras telas, sem precisar recarregar a página.
  try {
    if (typeof invalidarCacheProdutosGlobal === "function") invalidarCacheProdutosGlobal();

    if (typeof buscarEstoqueApoioBanco === "function") {
      window.estoqueApoio = await buscarEstoqueApoioBanco();
      if (typeof estoqueApoio !== "undefined") estoqueApoio = window.estoqueApoio;
    }

    if (typeof carregarProdutos === "function") await carregarProdutos(true);
    else if (typeof renderizarProdutos === "function") renderizarProdutos();

    if (typeof renderizarTabelaApoioSeparada === "function") renderizarTabelaApoioSeparada();
    if (typeof renderizarProdutos === "function") renderizarProdutos();

    window.dispatchEvent(new CustomEvent("materiaisApoioAtualizados", {
      detail: { atualizadoEm: new Date().toISOString() }
    }));
  } catch (erro) {
    console.warn("Não foi possível atualizar automaticamente os materiais de apoio nas telas.", erro);
  }
}

async function buscarMateriaisApoioConfig() {
  if (typeof buscarEstoqueApoioBanco === "function") {
    return await buscarEstoqueApoioBanco();
  }
  return JSON.parse(localStorage.getItem("novoRioTendasEstoqueApoioV1") || "[]");
}

async function salvarMaterialApoioConfig(item) {
  if (typeof salvarItemApoioBanco === "function") {
    return await salvarItemApoioBanco(item);
  }

  const estoque = JSON.parse(localStorage.getItem("novoRioTendasEstoqueApoioV1") || "[]");
  const index = estoque.findIndex(i => String(i.id) === String(item.id));
  if (index >= 0) estoque[index] = item;
  else estoque.push(item);
  localStorage.setItem("novoRioTendasEstoqueApoioV1", JSON.stringify(estoque));
  return item;
}

async function excluirMaterialApoioConfig(id) {
  const idTexto = String(id || "");
  const materiaisAtuais = await buscarMateriaisApoioConfig();
  const itemAtual = materiaisAtuais.find(i => String(i.id) === idTexto);

  if (itemAtual?.nome && typeof marcarMaterialApoioExcluido === "function") {
    marcarMaterialApoioExcluido(itemAtual.nome);
  }

  if (typeof supabaseClient !== "undefined" && supabaseClient && !idTexto.startsWith("local-")) {
    const { error } = await supabaseClient.from("estoque_apoio").delete().eq("id", id);
    if (error) {
      console.warn("Erro ao remover material de apoio no Supabase. Removendo localmente se existir.", error);
    }
  }

  const estoque = JSON.parse(localStorage.getItem("novoRioTendasEstoqueApoioV1") || "[]")
    .filter(i => String(i.id) !== idTexto)
    .filter(i => !itemAtual?.nome || String(i.nome || "").trim().toLowerCase() !== String(itemAtual.nome || "").trim().toLowerCase());
  localStorage.setItem("novoRioTendasEstoqueApoioV1", JSON.stringify(estoque));

  await atualizarMateriaisApoioNasTelas();
}

async function renderizarMateriaisApoioConfig() {
  const lista = document.getElementById("listaMateriaisApoioConfig");
  if (!lista) return;

  const materiais = await buscarMateriaisApoioConfig();

  if (!materiais.length) {
    lista.innerHTML = `<p class="empty">Nenhum material de apoio cadastrado.</p>`;
    return;
  }

  const grupos = materiais.reduce((acc, item) => {
    const grupo = (typeof grupoMaterialApoio === "function") ? grupoMaterialApoio(item.nome) : "Materiais Gerais";
    if (!acc[grupo]) acc[grupo] = [];
    acc[grupo].push(item);
    return acc;
  }, {});
  const ordemGrupos = ["Materiais Gerais", "Caixas Térmicas", "Toalhas", "Acessórios de Tendas"];

  lista.innerHTML = ordemGrupos.filter(grupo => grupos[grupo]?.length).map(grupo => `
    <div class="config-subsection-title">${grupo}</div>
    <div class="materiais-apoio-tabela">
      <div class="materiais-apoio-cabecalho">
        <span>Nome</span>
        <span>Qtd.</span>
        <span>Ações</span>
      </div>
      ${grupos[grupo].map(item => `
      <div class="config-list-item material-apoio-config-item" data-material-id="${item.id}">
        <input type="text" class="material-apoio-nome" aria-label="Nome" value="${String(item.nome || "").replace(/"/g, "&quot;")}">
        <input type="number" min="0" step="1" class="material-apoio-qtd" aria-label="Quantidade total" value="${Number(item.quantidade_total || 0)}">
        <div class="config-actions">
          <button type="button" class="btn-outline" data-salvar-material-apoio="${item.id}">Salvar</button>
          <button type="button" class="btn-outline danger" data-remover-material-apoio="${item.id}">Excluir</button>
        </div>
      </div>
      `).join("")}
    </div>
  `).join("");

  lista.querySelectorAll("[data-salvar-material-apoio]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const linha = btn.closest("[data-material-id]");
      const id = btn.dataset.salvarMaterialApoio;
      const original = materiais.find(i => String(i.id) === String(id));
      if (!linha || !original) return;

      const nome = linha.querySelector(".material-apoio-nome")?.value.trim();
      const quantidade = Math.max(Number(linha.querySelector(".material-apoio-qtd")?.value || 0), 0);
      if (!nome) {
        alert("Informe o nome do material de apoio.");
        return;
      }

      if (String(original.nome || "").trim().toLowerCase() !== nome.toLowerCase() && typeof marcarMaterialApoioExcluido === "function") {
        marcarMaterialApoioExcluido(original.nome);
      }
      if (typeof desmarcarMaterialApoioExcluido === "function") desmarcarMaterialApoioExcluido(nome);
      await salvarMaterialApoioConfig({ ...original, nome, quantidade_total: quantidade });
      await atualizarMateriaisApoioNasTelas();
      renderizarMateriaisApoioConfig();
    });
  });

  lista.querySelectorAll("[data-remover-material-apoio]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.removerMaterialApoio;
      const item = materiais.find(i => String(i.id) === String(id));
      if (!confirm(`Remover o material de apoio "${item?.nome || ""}"?`)) return;
      await excluirMaterialApoioConfig(id);
      renderizarMateriaisApoioConfig();
    });
  });
}

async function adicionarMaterialApoioConfig() {
  const nomeInput = document.getElementById("novoMaterialApoioNome");
  const qtdInput = document.getElementById("novoMaterialApoioQtd");
  const tipoInput = document.getElementById("novoMaterialApoioTipo");
  const corInput = document.getElementById("novoMaterialApoioCor");

  const tipo = tipoInput?.value || "material";
  const cor = corInput?.value.trim();
  let nome = nomeInput?.value.trim();
  const quantidade = Math.max(Number(qtdInput?.value || 0), 0);

  if (tipo === "toalha") {
    if (!cor) {
      alert("Informe a cor da toalha.");
      return;
    }
    nome = "Toalha " + cor;
  }

  if (!nome) {
    alert("Informe o nome do material de apoio.");
    return;
  }

  const materiais = await buscarMateriaisApoioConfig();
  const duplicado = materiais.some(i => String(i.nome || "").trim().toLowerCase() === nome.toLowerCase());
  if (duplicado) {
    alert("Já existe um material de apoio com esse nome.");
    return;
  }

  const item = {
    id: (typeof supabaseClient !== "undefined" && supabaseClient) ? undefined : "local-" + gerarId(),
    nome,
    quantidade_total: quantidade,
    quantidade_reservada: 0,
    atualizado_em: new Date().toISOString(),
    colaborador: getColaboradorLogado()
  };

  await salvarMaterialApoioConfig(item);
  if (nomeInput) nomeInput.value = "";
  if (corInput) corInput.value = "";
  if (qtdInput) qtdInput.value = "0";

  await atualizarMateriaisApoioNasTelas();
  renderizarMateriaisApoioConfig();
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
  config.assinaturaResponsavel = document.getElementById("configAssinaturaResponsavel")?.value || "";
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


// v19-dev-lista-combinada-scroll-4
function aplicarScrollListaCombinadaCalendario() {
  const seletores = [
    '#listaEventosDia',
    '#listaEventosMontagens',
    '#eventosMontagensDesmontagens',
    '#calendarioListaDia',
    '.calendario-lista-dia',
    '.calendario-lista-combinada',
    '.lista-eventos-dia',
    '.lista-eventos-montagens',
    '.eventos-montagens-desmontagens'
  ];

  seletores.forEach((sel) => {
    document.querySelectorAll(sel).forEach((el) => {
      el.classList.add('calendario-lista-combinada');
    });
  });
}

document.addEventListener('DOMContentLoaded', aplicarScrollListaCombinadaCalendario);


// v19-dev: confirmação segura da importação de eventos Excel
async function rtConfirmarImportacaoEventosExcel() {
  rtAtualizarDatasEscolhidasImportacao();
  rtAtualizarProdutosEscolhidosImportacao();

  if (!Array.isArray(rtEventosImportacaoExcelPreviewAtual) || !rtEventosImportacaoExcelPreviewAtual.length) {
    alert("Não há eventos na prévia para importar.");
    return;
  }

  const linhasSelecionadasImportacao = rtObterLinhasSelecionadasImportacaoEventos();

  if (!linhasSelecionadasImportacao.length) {
    alert("Selecione pelo menos uma linha para importar.");
    return;
  }

  const escolha = prompt(
    "Como deseja importar?\n\n" +
    "1 - Criar todos como novos\n" +
    "2 - Atualizar existentes quando encontrar mesmo cliente + mesma data\n" +
    "3 - Cancelar\n\n" +
    "Digite 1, 2 ou 3:"
  );

  if (escolha === null || escolha === "3") return;

  const criarTodos = escolha === "1";
  const atualizarExistentes = escolha === "2";

  if (!criarTodos && !atualizarExistentes) {
    alert("Opção inválida. Importação cancelada.");
    return;
  }

  const confirmar = confirm(
    atualizarExistentes
      ? "Confirmar importação atualizando eventos existentes por cliente + data?"
      : "Confirmar importação criando todos os eventos como novos?"
  );

  if (!confirmar) return;

  const resultado = {
    criados: 0,
    atualizados: 0,
    ignorados: 0,
    erros: 0
  };

  try {
    if (typeof carregarEventos === "function") {
      await carregarEventos();
    }
  } catch (erro) {
    console.warn("Não foi possível recarregar eventos antes da importação:", erro);
  }

  const eventosAtuais = Array.isArray(eventos) ? eventos : [];
  const rtProdutosReservadosNestaImportacao = new Set();

  for (const linha of linhasSelecionadasImportacao) {
    try {
      if (!linha || !linha.nome || !linha.data_evento) {
        resultado.ignorados++;
        continue;
      }

      let existente = null;

      if (atualizarExistentes) {
        existente = eventosAtuais.find(ev =>
          String(ev.nome || "").trim().toLowerCase() === String(linha.nome || "").trim().toLowerCase() &&
          String(ev.data_evento || "").slice(0, 10) === String(linha.data_evento || "").slice(0, 10)
        );
      }

      await rtGarantirClienteImportado(linha);

      const evento = rtMontarEventoImportadoParaSalvar(linha, existente);

      (evento.tendas || []).forEach(t => {
        if (t.id) rtProdutosReservadosNestaImportacao.add(String(t.id));
        if (t.codigo) rtProdutosReservadosNestaImportacao.add(`codigo:${String(t.codigo).trim()}`);
      });

      if (typeof salvarEventoBanco !== "function") {
        console.error("Função salvarEventoBanco não encontrada.");
        resultado.erros++;
        continue;
      }

      const salvo = await salvarEventoBanco(evento);

      if (!salvo) {
        resultado.erros++;
        continue;
      }

      if (existente) resultado.atualizados++;
      else resultado.criados++;
    } catch (erro) {
      console.error("Erro ao importar linha:", linha, erro);
      resultado.erros++;
    }
  }

  try {
    if (typeof carregarEventos === "function") await carregarEventos();
    if (typeof renderizarEventos === "function") renderizarEventos();
    if (typeof renderizarCalendario === "function") renderizarCalendario();
    if (typeof renderizarRotas === "function") renderizarRotas();
  } catch (erro) {
    console.warn("Importou, mas houve aviso ao atualizar a tela:", erro);
  }

  document.getElementById("previewImportarEventosDialog")?.close();

  alert(
    "Importação concluída.\n\n" +
    `Criados: ${resultado.criados}\n` +
    `Atualizados: ${resultado.atualizados}\n` +
    `Ignorados: ${resultado.ignorados}\n` +
    `Erros: ${resultado.erros}`
  );
}

function rtMontarEventoImportadoParaSalvar(linha, existente = null) {
  const agora = new Date().toISOString();

  const valorTotal = rtMoedaImportadaParaNumero(linha.valor_total);
  const valorSinal = rtMoedaImportadaParaNumero(linha.valor_sinal);
  const valorRestante = linha.valor_restante
    ? rtMoedaImportadaParaNumero(linha.valor_restante)
    : Math.max(valorTotal - valorSinal, 0);

  return {
    ...(existente || {}),
    id: existente?.id || gerarId(),
    nome: linha.nome || "",
    documento: linha.documento || "",
    telefone: linha.telefone || "",
    endereco: linha.endereco || "",
    data_evento: linha.data_evento || null,
    hora_evento: linha.hora_evento || null,
    hora_inicio: linha.hora_evento || null,
    hora_termino: existente?.hora_termino || null,
    montagem_tipo: existente?.montagem_tipo || "A partir de",
    montagem: rtMontarDataHoraImportacao(linha.montagem_data_escolhida, linha.montagem_hora_escolhida) || existente?.montagem || null,
    desmontagem_tipo: existente?.desmontagem_tipo || "A partir de",
    desmontagem: rtMontarDataHoraImportacao(linha.desmontagem_data_escolhida, linha.desmontagem_hora_escolhida) || existente?.desmontagem || null,
    tendas: Array.isArray(linha.tendas_escolhidas) && linha.tendas_escolhidas.length ? linha.tendas_escolhidas : (existente?.tendas || []),
    itens_apoio: Array.isArray(linha.itens_apoio_escolhidos) && linha.itens_apoio_escolhidos.length ? linha.itens_apoio_escolhidos : (existente?.itens_apoio || []),
    produtos_extras: Array.isArray(linha.produtos_extras_escolhidos) && linha.produtos_extras_escolhidos.length
      ? linha.produtos_extras_escolhidos
      : (linha.produtos_texto && !(Array.isArray(linha.tendas_escolhidas) && linha.tendas_escolhidas.length)
        ? [{ descricao: linha.produtos_texto, origem: "Importação Excel" }]
        : (existente?.produtos_extras || [])),
    valor_total: valorTotal,
    valor_sinal: valorSinal,
    valor_restante: valorRestante,
    forma_pagamento: linha.forma_pagamento || "",
    pagamento_quitado: valorRestante <= 0 && valorTotal > 0,
    colaborador: linha.colaborador || getColaboradorLogado(),
    criado_em: existente?.criado_em || agora,
    atualizado_em: agora
  };
}

function rtMoedaImportadaParaNumero(valor) {
  if (valor === null || valor === undefined || valor === "") return 0;
  if (typeof valor === "number") return valor;

  const texto = String(valor).trim();
  if (!texto) return 0;

  const numero = Number(
    texto
      .replace(/\./g, "")
      .replace(",", ".")
      .replace(/[^\d.-]/g, "")
  );

  return Number.isFinite(numero) ? numero : 0;
}


// v19-dev: campos editáveis para montagem/desmontagem na importação
function rtCampoDataHoraImportacao(numero, campo, textoOriginal) {
  const texto = escaparHTML(textoOriginal || "");
  const aviso = texto ? `<small class="import-data-original">Original: ${texto}</small>` : `<small class="import-data-original">Em branco</small>`;

  return `
    <div class="import-data-editavel">
      ${aviso}
      <input
        type="date"
        class="rt-import-data"
        data-import-numero="${numero}"
        data-import-campo="${campo}"
        aria-label="${campo} data"
      >
      <input
        type="time"
        class="rt-import-hora"
        data-import-numero="${numero}"
        data-import-campo="${campo}"
        aria-label="${campo} hora"
      >
      <div class="import-data-botoes">
        <button type="button" class="btn-mini rt-import-limpar-data" data-import-numero="${numero}" data-import-campo="${campo}">
          Em branco
        </button>
        <button type="button" class="btn-mini rt-import-auto-dia" data-import-numero="${numero}" data-import-campo="${campo}">
          ${campo === "montagem" ? "Dia anterior" : "Dia posterior"}
        </button>
      </div>
    </div>
  `;
}

function rtAtualizarDatasEscolhidasImportacao() {
  const lista = Array.isArray(rtEventosImportacaoExcelPreviewAtual)
    ? rtEventosImportacaoExcelPreviewAtual
    : (Array.isArray(eventosImportacaoExcelPreviewAtual) ? eventosImportacaoExcelPreviewAtual : []);

  lista.forEach(item => {
    ["montagem", "desmontagem"].forEach(campo => {
      const dataEl = document.querySelector(`.rt-import-data[data-import-numero="${item.numero}"][data-import-campo="${campo}"]`);
      const horaEl = document.querySelector(`.rt-import-hora[data-import-numero="${item.numero}"][data-import-campo="${campo}"]`);

      item[`${campo}_data_escolhida`] = dataEl?.value || "";
      item[`${campo}_hora_escolhida`] = horaEl?.value || "";
    });
  });
}

function rtMontarDataHoraImportacao(data, hora) {
  if (!data) return null;
  const horario = hora || "00:00";
  return `${data}T${horario}:00`;
}

document.addEventListener("click", event => {
  const btn = event.target.closest?.(".rt-import-limpar-data");
  if (!btn) return;

  const numero = btn.dataset.importNumero;
  const campo = btn.dataset.importCampo;

  const dataEl = document.querySelector(`.rt-import-data[data-import-numero="${numero}"][data-import-campo="${campo}"]`);
  const horaEl = document.querySelector(`.rt-import-hora[data-import-numero="${numero}"][data-import-campo="${campo}"]`);

  if (dataEl) dataEl.value = "";
  if (horaEl) horaEl.value = "";
});


document.addEventListener("click", event => {
  const btn = event.target.closest?.(".rt-import-auto-dia");
  if (!btn) return;

  const numero = btn.dataset.importNumero;
  const campo = btn.dataset.importCampo;

  const lista = Array.isArray(rtEventosImportacaoExcelPreviewAtual)
    ? rtEventosImportacaoExcelPreviewAtual
    : (Array.isArray(eventosImportacaoExcelPreviewAtual) ? eventosImportacaoExcelPreviewAtual : []);

  const item = lista.find(linha => String(linha.numero) === String(numero));
  if (!item || !item.data_evento) {
    alert("Não foi possível calcular a data porque a data do evento não foi reconhecida.");
    return;
  }

  const dataBase = new Date(`${item.data_evento}T12:00:00`);
  if (isNaN(dataBase.getTime())) {
    alert("Data do evento inválida para calcular automaticamente.");
    return;
  }

  if (campo === "montagem") dataBase.setDate(dataBase.getDate() - 1);
  else if (campo === "desmontagem") dataBase.setDate(dataBase.getDate() + 1);

  const yyyy = dataBase.getFullYear();
  const mm = String(dataBase.getMonth() + 1).padStart(2, "0");
  const dd = String(dataBase.getDate()).padStart(2, "0");

  const dataEl = document.querySelector(`.rt-import-data[data-import-numero="${numero}"][data-import-campo="${campo}"]`);
  const horaEl = document.querySelector(`.rt-import-hora[data-import-numero="${numero}"][data-import-campo="${campo}"]`);

  if (dataEl) dataEl.value = `${yyyy}-${mm}-${dd}`;
  if (horaEl) horaEl.value = "";
});


// v19-dev: seletor de linhas na prévia da importação de eventos
function rtConfigurarSeletorLinhasImportacaoEventos() {
  const checkTodos = document.getElementById("selecionarTodosImportarEventos");
  const checks = Array.from(document.querySelectorAll(".rt-importar-linha-evento"));

  if (!checkTodos) return;

  checkTodos.checked = checks.every(check => check.checked);

  checkTodos.onchange = () => {
    checks.forEach(check => {
      check.checked = checkTodos.checked;
    });
    rtAtualizarResumoSelecaoImportacaoEventos();
  };

  checks.forEach(check => {
    check.onchange = () => {
      const todos = Array.from(document.querySelectorAll(".rt-importar-linha-evento"));
      checkTodos.checked = todos.length > 0 && todos.every(item => item.checked);
      rtAtualizarResumoSelecaoImportacaoEventos();
    };
  });

  rtAtualizarResumoSelecaoImportacaoEventos();
}

function rtAtualizarResumoSelecaoImportacaoEventos() {
  const resumo = document.getElementById("previewImportarEventosResumo");
  if (!resumo) return;

  const checks = Array.from(document.querySelectorAll(".rt-importar-linha-evento"));
  const selecionados = checks.filter(check => check.checked).length;

  let badge = document.getElementById("previewImportarEventosSelecionados");
  if (!badge) {
    badge = document.createElement("strong");
    badge.id = "previewImportarEventosSelecionados";
    resumo.appendChild(document.createTextNode(" "));
    resumo.appendChild(badge);
  }

  badge.textContent = `${selecionados} selecionados para importar.`;
}

function rtObterLinhasSelecionadasImportacaoEventos() {
  const lista = Array.isArray(rtEventosImportacaoExcelPreviewAtual)
    ? rtEventosImportacaoExcelPreviewAtual
    : (Array.isArray(eventosImportacaoExcelPreviewAtual) ? eventosImportacaoExcelPreviewAtual : []);

  const selecionados = new Set(
    Array.from(document.querySelectorAll(".rt-importar-linha-evento:checked"))
      .map(check => String(check.dataset.importNumero))
  );

  return lista.filter(item => selecionados.has(String(item.numero)));
}


// v19-dev: data formatada + produtos assistidos na importação de eventos
function rtFormatarDataEventoImportacao(valor) {
  if (!valor) return "-";

  const data = new Date(`${valor}T12:00:00`);
  if (isNaN(data.getTime())) return escaparHTML(valor);

  const dias = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
  const dia = String(data.getDate()).padStart(2, "0");
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const ano = String(data.getFullYear()).slice(-2);

  return `${dia}/${mes}/${ano} <small class="import-dia-semana">${dias[data.getDay()]}</small>`;
}

function rtCampoProdutosImportacao(item) {
  const original = escaparHTML(item.produtos_texto || "");
  const sugestaoQtd = rtExtrairQuantidadeTendasImportacao(item.produtos_texto);
  const sugestaoTamanho = rtExtrairTamanhoTendaImportacao(item.produtos_texto);

  return `
    <div class="import-produtos-assistido" data-import-produtos-numero="${item.numero}">
      <small class="import-produtos-original">Original: ${original || "em branco"}</small>

      <div class="import-produtos-row">
        <label>Qtd.
          <input
            type="number"
            min="0"
            class="rt-import-prod-qtd"
            data-import-numero="${item.numero}"
            value="${sugestaoQtd || ""}"
          >
        </label>

        <label>Tamanho
          <input
            type="text"
            class="rt-import-prod-tamanho"
            data-import-numero="${item.numero}"
            value="${escaparHTML(sugestaoTamanho || "")}"
            placeholder="Ex: 3x3"
          >
        </label>
      </div>

      <div class="import-produtos-actions">
        <button type="button" class="btn-mini rt-import-prod-escolher" data-import-numero="${item.numero}">
          Escolher produtos
        </button>
        <button type="button" class="btn-mini rt-import-prod-auto" data-import-numero="${item.numero}">
          Confirmar automático
        </button>
        <button type="button" class="btn-mini rt-import-prod-adicionar" data-import-numero="${item.numero}">
          Adicionar qualquer item
        </button>
      </div>

      <div class="rt-import-prod-selecionados" data-import-numero="${item.numero}">
        Nenhum produto escolhido.
      </div>
    </div>
  `;
}

function rtExtrairQuantidadeTendasImportacao(texto) {
  const t = String(texto || "").toLowerCase();

  const matchQtd = t.match(/(\d+)\s*(tendas?|un|und|unidades?)/i);
  if (matchQtd) return Number(matchQtd[1]);

  const matchInicio = t.match(/^(\d+)\s+/);
  if (matchInicio) return Number(matchInicio[1]);

  return "";
}

function rtExtrairTamanhoTendaImportacao(texto) {
  const t = String(texto || "").toLowerCase();
  const match = t.match(/(\d+(?:[,.]\d+)?)\s*x\s*(\d+(?:[,.]\d+)?)/i);
  if (!match) return "";

  return `${match[1].replace(",", ".")}x${match[2].replace(",", ".")}`;
}

async function rtGarantirProdutosParaImportacao() {
  if (Array.isArray(produtos) && produtos.length) return true;

  if (typeof carregarProdutos === "function") {
    try {
      await carregarProdutos();
      return Array.isArray(produtos) && produtos.length;
    } catch (erro) {
      console.warn("Não foi possível carregar produtos para importação:", erro);
    }
  }

  return Array.isArray(produtos) && produtos.length;
}

function rtProdutoDisponivelParaDataImportacao(produto, dataEvento, ignorarReservasImportacao = false) {
  if (!produto) return false;

  const status = String(produto.status || "").trim().toLowerCase();
  const statusLivre = ["livre", "livre para locação", "livre para locacao", "disponível", "disponivel"];

  if (status && !statusLivre.includes(status)) return false;

  if (!ignorarReservasImportacao && rtProdutoJaEscolhidoNestaImportacao(produto)) return false;

  const eventosBase = Array.isArray(eventos) ? eventos : [];
  const data = String(dataEvento || "").slice(0, 10);

  if (!data) return true;

  return !eventosBase.some(ev => {
    if (!ev || !Array.isArray(ev.tendas)) return false;

    const mesmoDia = String(ev.data_evento || "").slice(0, 10) === data;
    if (!mesmoDia) return false;

    return ev.tendas.some(t => {
      const mesmoId = String(t.id || "") && String(t.id || "") === String(produto.id || "");
      const mesmoCodigo = String(t.codigo || "").trim() && String(t.codigo || "").trim() === String(produto.codigo || "").trim();
      return mesmoId || mesmoCodigo;
    });
  });
}

function rtProdutosCompativeisImportacao(item) {
  const tamanhoEl = document.querySelector(`.rt-import-prod-tamanho[data-import-numero="${item.numero}"]`);
  const tamanhoInformado = String(tamanhoEl?.value || rtExtrairTamanhoTendaImportacao(item.produtos_texto) || "").trim().toLowerCase();
  const textoOriginalEhOmbrelone = rtTextoProdutoEhOmbreloneImportacao(item.produtos_texto);

  return (Array.isArray(produtos) ? produtos : [])
    .filter(p => {
      const categoria = String(p.categoria || p.tipo || "").toLowerCase();
      const nomeDescricao = String([p.nome, p.descricao, p.observacao].filter(Boolean).join(" ")).toLowerCase();
      const tamanho = String(p.tamanho || "").toLowerCase();
      const produtoEhOmbrelone = categoria.includes("ombrelone") || nomeDescricao.includes("ombrelone");

      if (textoOriginalEhOmbrelone) {
        if (!produtoEhOmbrelone) return false;
      } else if (!categoria.includes("tenda") && !categoria.includes("sanfonada") && !categoria.includes("piramidal")) {
        if (!tamanhoInformado || tamanho !== tamanhoInformado) return false;
      }

      if (!textoOriginalEhOmbrelone && tamanhoInformado && tamanho !== tamanhoInformado) return false;

      return rtProdutoDisponivelParaDataImportacao(p, item.data_evento);
    })
    .sort((a, b) => String(a.codigo || "").localeCompare(String(b.codigo || ""), "pt-BR", { numeric: true }));
}

function rtDescricaoProdutoImportacao(p) {
  return [p.codigo, p.categoria || p.tipo, p.tamanho, p.cor].filter(Boolean).join(" - ");
}

function rtSalvarProdutosEscolhidosNaLinha(numero, produtosEscolhidos) {
  const lista = Array.isArray(rtEventosImportacaoExcelPreviewAtual)
    ? rtEventosImportacaoExcelPreviewAtual
    : (Array.isArray(eventosImportacaoExcelPreviewAtual) ? eventosImportacaoExcelPreviewAtual : []);

  const item = lista.find(linha => String(linha.numero) === String(numero));
  if (!item) return;

  item.tendas_escolhidas = produtosEscolhidos.map(p => ({
    id: p.id,
    codigo: p.codigo || "",
    categoria: p.categoria || p.tipo || "",
    tipo: p.tipo || p.categoria || "",
    tamanho: p.tamanho || "",
    cor: p.cor || ""
  }));

  rtRenderizarItensEscolhidosImportacao(numero);
}

async function rtEscolherProdutosImportacao(numero) {
  await rtGarantirProdutosParaImportacao();

  const lista = Array.isArray(rtEventosImportacaoExcelPreviewAtual)
    ? rtEventosImportacaoExcelPreviewAtual
    : (Array.isArray(eventosImportacaoExcelPreviewAtual) ? eventosImportacaoExcelPreviewAtual : []);

  const item = lista.find(linha => String(linha.numero) === String(numero));
  if (!item) return;

  const opcoes = rtProdutosCompativeisImportacao(item);

  if (!opcoes.length) {
    alert("Nenhum produto disponível encontrado para essa data/tamanho.");
    return;
  }

  const qtdEl = document.querySelector(`.rt-import-prod-qtd[data-import-numero="${numero}"]`);
  const qtd = Number(qtdEl?.value || 1);

  const texto = opcoes.map((p, i) => `${i + 1} - ${rtDescricaoProdutoImportacao(p)}`).join("\n");
  const resposta = prompt(
    `Escolha até ${qtd || 1} produto(s), separando os números por vírgula:\n\n${texto}`,
    ""
  );

  if (!resposta) return;

  const indices = resposta
    .split(",")
    .map(v => Number(v.trim()) - 1)
    .filter(i => Number.isInteger(i) && i >= 0 && i < opcoes.length);

  const escolhidos = [...new Set(indices)].slice(0, qtd || 1).map(i => opcoes[i]);

  if (!escolhidos.length) {
    alert("Nenhum produto válido escolhido.");
    return;
  }

  rtSalvarProdutosEscolhidosNaLinha(numero, escolhidos);
}

async function rtConfirmarProdutosAutomaticoImportacao(numero) {
  await rtGarantirProdutosParaImportacao();

  const lista = Array.isArray(rtEventosImportacaoExcelPreviewAtual)
    ? rtEventosImportacaoExcelPreviewAtual
    : (Array.isArray(eventosImportacaoExcelPreviewAtual) ? eventosImportacaoExcelPreviewAtual : []);

  const item = lista.find(linha => String(linha.numero) === String(numero));
  if (!item) return;

  const qtdEl = document.querySelector(`.rt-import-prod-qtd[data-import-numero="${numero}"]`);
  const qtd = Math.max(1, Number(qtdEl?.value || rtExtrairQuantidadeTendasImportacao(item.produtos_texto) || 1));

  const opcoes = rtProdutosCompativeisImportacao(item);

  if (opcoes.length < qtd) {
    alert(`Só encontrei ${opcoes.length} produto(s) disponível(is). Necessário: ${qtd}.`);
    return;
  }

  const escolhidos = opcoes.slice(0, qtd);
  rtSalvarProdutosEscolhidosNaLinha(numero, escolhidos);
}

function rtAtualizarProdutosEscolhidosImportacao() {
  // As escolhas já ficam salvas na própria linha durante os cliques.
  // Esta função existe para manter o fluxo de confirmação uniforme.
}

document.addEventListener("click", event => {
  const escolher = event.target.closest?.(".rt-import-prod-escolher");
  if (escolher) {
    rtEscolherProdutosImportacao(escolher.dataset.importNumero);
    return;
  }

  const auto = event.target.closest?.(".rt-import-prod-auto");
  if (auto) {
    rtConfirmarProdutosAutomaticoImportacao(auto.dataset.importNumero);
  }
});


// v19-dev: correções importação - produtos/cliente/conflitos
function rtProdutoJaEscolhidoNestaImportacao(produto) {
  const lista = Array.isArray(rtEventosImportacaoExcelPreviewAtual)
    ? rtEventosImportacaoExcelPreviewAtual
    : (Array.isArray(eventosImportacaoExcelPreviewAtual) ? eventosImportacaoExcelPreviewAtual : []);

  return lista.some(item => (item.tendas_escolhidas || []).some(t => {
    const mesmoId = String(t.id || "") && String(t.id || "") === String(produto.id || "");
    const mesmoCodigo = String(t.codigo || "").trim() && String(t.codigo || "").trim() === String(produto.codigo || "").trim();
    return mesmoId || mesmoCodigo;
  }));
}

function rtStatusClienteImportacao(item) {
  const existente = rtEncontrarClienteImportadoExistente(item);
  if (existente) {
    return `<small class="import-cliente-existente">Cliente já cadastrado</small>`;
  }
  return `<small class="import-cliente-novo">Cliente novo</small>`;
}

function rtEncontrarClienteImportadoExistente(item) {
  const documento = String(item.documento || "").replace(/\D/g, "");
  const telefone = String(item.telefone || "").replace(/\D/g, "");
  const nome = String(item.nome || "").trim().toLowerCase();

  if (!Array.isArray(clientes)) return null;

  return clientes.find(c => {
    const docCliente = String(c.documento || "").replace(/\D/g, "");
    const telCliente = String(c.telefone || "").replace(/\D/g, "");
    const nomeCliente = String(c.nome || "").trim().toLowerCase();

    return (documento && docCliente && documento === docCliente) ||
      (telefone && telCliente && telefone === telCliente) ||
      (nome && nomeCliente && nome === nomeCliente);
  }) || null;
}

async function rtGarantirClienteImportado(item) {
  if (!item || !item.nome) return null;

  if (typeof carregarClientes === "function" && (!Array.isArray(clientes) || !clientes.length)) {
    try { await carregarClientes(); } catch (erro) { console.warn("Não foi possível carregar clientes:", erro); }
  }

  const existente = rtEncontrarClienteImportadoExistente(item);

  if (existente) {
    let alterou = false;

    if (!existente.documento && item.documento) { existente.documento = item.documento; alterou = true; }
    if (!existente.telefone && item.telefone) { existente.telefone = item.telefone; alterou = true; }
    if (!existente.endereco && item.endereco) { existente.endereco = item.endereco; alterou = true; }

    if (alterou && typeof salvarClienteBanco === "function") {
      await salvarClienteBanco({ ...existente, atualizado_em: new Date().toISOString() });
      if (typeof renderizarClientes === "function") renderizarClientes();
    }

    return existente;
  }

  if (typeof salvarClienteBanco !== "function") return null;

  const novoCliente = {
    id: gerarId(),
    nome: item.nome || "",
    documento: item.documento || "",
    telefone: item.telefone || "",
    endereco: item.endereco || "",
    colaborador: item.colaborador || getColaboradorLogado(),
    criado_em: new Date().toISOString(),
    atualizado_em: new Date().toISOString()
  };

  const salvo = await salvarClienteBanco(novoCliente);

  if (salvo && Array.isArray(clientes)) {
    clientes.push(salvo);
    if (typeof renderizarClientes === "function") renderizarClientes();
  }

  return salvo;
}

let rtImportProdutosVisualLinhaAtual = null;
let rtImportProdutosVisualOpcoes = [];

async function rtAdicionarQualquerItemImportacao(numero) {
  await rtAbrirModalProdutosImportacao(numero);
}

document.addEventListener("click", event => {
  const add = event.target.closest?.(".rt-import-prod-adicionar");
  if (!add) return;
  rtAdicionarQualquerItemImportacao(add.dataset.importNumero);
});


// v19-dev: selecionar somente clientes novos na importação
function rtConfigurarBotoesClienteNovoImportacao() {
  const btnNovos = document.getElementById("selecionarClientesNovosImportacao");
  const btnTodos = document.getElementById("selecionarTodosClientesImportacao");

  if (btnNovos) {
    btnNovos.onclick = () => {
      const lista = Array.isArray(rtEventosImportacaoExcelPreviewAtual)
        ? rtEventosImportacaoExcelPreviewAtual
        : (Array.isArray(eventosImportacaoExcelPreviewAtual) ? eventosImportacaoExcelPreviewAtual : []);

      document.querySelectorAll(".rt-importar-linha-evento").forEach(check => {
        const item = lista.find(linha => String(linha.numero) === String(check.dataset.importNumero));
        check.checked = !!item && !rtEncontrarClienteImportadoExistente(item);
      });

      const checkTodos = document.getElementById("selecionarTodosImportarEventos");
      if (checkTodos) checkTodos.checked = false;

      if (typeof rtAtualizarResumoSelecaoImportacaoEventos === "function") {
        rtAtualizarResumoSelecaoImportacaoEventos();
      }
    };
  }

  if (btnTodos) {
    btnTodos.onclick = () => {
      document.querySelectorAll(".rt-importar-linha-evento").forEach(check => check.checked = true);
      const checkTodos = document.getElementById("selecionarTodosImportarEventos");
      if (checkTodos) checkTodos.checked = true;

      if (typeof rtAtualizarResumoSelecaoImportacaoEventos === "function") {
        rtAtualizarResumoSelecaoImportacaoEventos();
      }
    };
  }
}


// v19-dev: busca de item por código/nome/categoria na importação
function rtNormalizarBuscaImportacao(valor) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\d]+/g, " ")
    .trim()
    .toLowerCase();
}

function rtTextoBuscaItemImportacao(item) {
  return rtNormalizarBuscaImportacao([
    item.codigo,
    item.nome,
    item.descricao,
    item.categoria,
    item.tipo,
    item.tamanho,
    item.cor,
    item.observacao,
    item.status
  ].filter(Boolean).join(" "));
}


// v19-dev: reconhecimento de ombrelone/ombrelones na importação
function rtTextoProdutoEhOmbreloneImportacao(texto) {
  return /\bombrelones?\b/i.test(String(texto || "").normalize("NFD").replace(/[\u0300-\u036f]/g, ""));
}


// v19-dev: renderização e remoção de itens escolhidos na importação
function rtRenderizarItensEscolhidosImportacao(numero) {
  const lista = Array.isArray(rtEventosImportacaoExcelPreviewAtual)
    ? rtEventosImportacaoExcelPreviewAtual
    : (Array.isArray(eventosImportacaoExcelPreviewAtual) ? eventosImportacaoExcelPreviewAtual : []);

  const item = lista.find(linha => String(linha.numero) === String(numero));
  const box = document.querySelector(`.rt-import-prod-selecionados[data-import-numero="${numero}"]`);

  if (!item || !box) return;

  const partes = [];

  (item.tendas_escolhidas || []).forEach((p, idx) => {
    partes.push(`
      <span>
        ${escaparHTML([p.codigo, p.categoria, p.tamanho, p.cor].filter(Boolean).join(" - "))}
        <button type="button" class="rt-import-remover-item" data-import-numero="${numero}" data-import-tipo="tenda" data-import-index="${idx}" title="Remover">×</button>
      </span>
    `);
  });

  (item.itens_apoio_escolhidos || []).forEach((a, idx) => {
    partes.push(`
      <span>
        ${escaparHTML(`${a.quantidade || 1}x ${a.nome || a.descricao || "Item de apoio"}`)}
        <button type="button" class="rt-import-remover-item" data-import-numero="${numero}" data-import-tipo="apoio" data-import-index="${idx}" title="Remover">×</button>
      </span>
    `);
  });

  (item.produtos_extras_escolhidos || []).forEach((e, idx) => {
    partes.push(`
      <span>
        ${escaparHTML(`${e.quantidade || 1}x ${e.descricao || "Item extra"}`)}
        <button type="button" class="rt-import-remover-item" data-import-numero="${numero}" data-import-tipo="extra" data-import-index="${idx}" title="Remover">×</button>
      </span>
    `);
  });

  box.innerHTML = partes.length ? partes.join("") : "Nenhum produto escolhido.";
}

document.addEventListener("click", event => {
  const btn = event.target.closest?.(".rt-import-remover-item");
  if (!btn) return;

  const numero = btn.dataset.importNumero;
  const tipo = btn.dataset.importTipo;
  const index = Number(btn.dataset.importIndex);

  const lista = Array.isArray(rtEventosImportacaoExcelPreviewAtual)
    ? rtEventosImportacaoExcelPreviewAtual
    : (Array.isArray(eventosImportacaoExcelPreviewAtual) ? eventosImportacaoExcelPreviewAtual : []);

  const item = lista.find(linha => String(linha.numero) === String(numero));
  if (!item || !Number.isFinite(index)) return;

  if (tipo === "tenda" && Array.isArray(item.tendas_escolhidas)) item.tendas_escolhidas.splice(index, 1);
  if (tipo === "apoio" && Array.isArray(item.itens_apoio_escolhidos)) item.itens_apoio_escolhidos.splice(index, 1);
  if (tipo === "extra" && Array.isArray(item.produtos_extras_escolhidos)) item.produtos_extras_escolhidos.splice(index, 1);

  rtRenderizarItensEscolhidosImportacao(numero);
});


// v19-dev: modal visual para escolher produtos/apoio na importação
async function rtAbrirModalProdutosImportacao(numero) {
  await rtGarantirProdutosParaImportacao();

  if (typeof buscarEstoqueApoioBanco === "function") {
    try {
      estoqueApoio = await buscarEstoqueApoioBanco();
    } catch (erro) {
      console.warn("Não foi possível carregar itens de apoio:", erro);
    }
  }

  const lista = Array.isArray(rtEventosImportacaoExcelPreviewAtual)
    ? rtEventosImportacaoExcelPreviewAtual
    : (Array.isArray(eventosImportacaoExcelPreviewAtual) ? eventosImportacaoExcelPreviewAtual : []);

  const linha = lista.find(item => String(item.numero) === String(numero));
  if (!linha) return;

  rtImportProdutosVisualLinhaAtual = linha;
  rtImportProdutosVisualOpcoes = rtMontarOpcoesProdutosImportacaoVisual(linha);

  const modal = document.getElementById("modalImportarProdutosVisual");
  const busca = document.getElementById("buscaImportarProdutosVisual");
  const extraDescricao = document.getElementById("importarProdutoExtraDescricao");
  const extraQtd = document.getElementById("importarProdutoExtraQtd");

  if (!modal || !busca) {
    alert("Modal de seleção de produtos não encontrado.");
    return;
  }

  busca.value = "";
  if (extraDescricao) extraDescricao.value = "";
  if (extraQtd) extraQtd.value = "1";

  const fechar = () => modal.close();

  const btnFechar = document.getElementById("fecharImportarProdutosVisual");
  const btnCancelar = document.getElementById("cancelarImportarProdutosVisual");
  const btnConfirmar = document.getElementById("confirmarImportarProdutosVisual");
  const btnExtra = document.getElementById("adicionarImportarProdutoExtra");

  if (btnFechar) btnFechar.onclick = fechar;
  if (btnCancelar) btnCancelar.onclick = fechar;
  if (btnConfirmar) btnConfirmar.onclick = rtConfirmarProdutosModalImportacao;
  if (btnExtra) btnExtra.onclick = rtAdicionarExtraModalImportacao;

  busca.oninput = () => rtRenderizarModalProdutosImportacao();

  rtRenderizarModalProdutosImportacao();
  modal.showModal();
}

function rtMontarOpcoesProdutosImportacaoVisual(linha) {
  const produtosLista = (Array.isArray(produtos) ? produtos : [])
    .map(p => {
      const statusDisponivel = rtProdutoDisponivelParaDataImportacao(p, linha.data_evento);
      const texto = typeof rtTextoBuscaItemImportacao === "function" ? rtTextoBuscaItemImportacao(p) : String([p.codigo, p.categoria, p.tipo, p.tamanho, p.cor, p.nome, p.descricao].filter(Boolean).join(" ")).toLowerCase();
      const categoria = String(p.categoria || p.tipo || "").toLowerCase();
      const nomeDescricao = String([p.nome, p.descricao, p.observacao].filter(Boolean).join(" ")).toLowerCase();
      const produtoEhOmbrelone = categoria.includes("ombrelone") || nomeDescricao.includes("ombrelone");

      return {
        tipoOrigem: "produto",
        id: p.id || "",
        codigo: p.codigo || "",
        descricao: [p.categoria || p.tipo || p.nome || p.descricao || "Produto", p.tamanho, p.cor].filter(Boolean).join(" - "),
        status: statusDisponivel ? "Disponível" : "Indisponível",
        disponivel: !!statusDisponivel,
        quantidadePadrao: 1,
        busca: texto + (produtoEhOmbrelone ? " ombrelone ombrelones" : ""),
        raw: p
      };
    });

  const apoioLista = (Array.isArray(estoqueApoio) ? estoqueApoio : [])
    .map(a => ({
      tipoOrigem: "apoio",
      id: a.id || "",
      codigo: a.codigo || "",
      descricao: a.nome || a.descricao || a.categoria || a.tipo || "Item de apoio",
      status: "Apoio",
      disponivel: true,
      quantidadePadrao: 1,
      busca: typeof rtTextoBuscaItemImportacao === "function" ? rtTextoBuscaItemImportacao(a) : String([a.codigo, a.nome, a.descricao, a.categoria, a.tipo].filter(Boolean).join(" ")).toLowerCase(),
      raw: a
    }));

  return [...produtosLista, ...apoioLista]
    .sort((a, b) => {
      if (a.tipoOrigem !== b.tipoOrigem) return a.tipoOrigem === "apoio" ? -1 : 1;
      return String(a.codigo || a.descricao).localeCompare(String(b.codigo || b.descricao), "pt-BR", { numeric: true });
    });
}

function rtRenderizarModalProdutosImportacao() {
  const tbody = document.getElementById("tbodyImportarProdutosVisual");
  const resumo = document.getElementById("resumoImportarProdutosVisual");
  const buscaValor = document.getElementById("buscaImportarProdutosVisual")?.value || "";
  const busca = typeof rtNormalizarBuscaImportacao === "function" ? rtNormalizarBuscaImportacao(buscaValor) : String(buscaValor).toLowerCase().trim();

  if (!tbody) return;

  const filtrados = rtImportProdutosVisualOpcoes
    .filter(op => !busca || op.busca.includes(busca) || String(op.codigo || "").toLowerCase().includes(busca))
    .slice(0, 180);

  if (resumo) {
    resumo.textContent = `${filtrados.length} item(ns) exibido(s). Produtos indisponíveis aparecem bloqueados.`;
  }

  tbody.innerHTML = filtrados.map((op) => {
    const originalIndex = rtImportProdutosVisualOpcoes.indexOf(op);
    const disabled = op.disponivel ? "" : "disabled";
    const rowClass = op.disponivel ? "" : "linha-bloqueada";

    return `
      <tr class="${rowClass}">
        <td>
          <input type="checkbox" class="rt-modal-prod-check" data-op-index="${originalIndex}" ${disabled}>
        </td>
        <td>${op.tipoOrigem === "apoio" ? "Apoio" : "Produto"}</td>
        <td>${escaparHTML(op.codigo || "-")}</td>
        <td>${escaparHTML(op.descricao || "-")}</td>
        <td>${escaparHTML(op.status || "-")}</td>
        <td>
          <input type="number" min="1" value="${op.quantidadePadrao || 1}" class="rt-modal-prod-qtd" data-op-index="${originalIndex}" ${disabled}>
        </td>
      </tr>
    `;
  }).join("");
}

function rtConfirmarProdutosModalImportacao() {
  const linha = rtImportProdutosVisualLinhaAtual;
  if (!linha) return;

  const checks = Array.from(document.querySelectorAll(".rt-modal-prod-check:checked"));
  if (!checks.length) {
    alert("Selecione pelo menos um item ou adicione um item extra.");
    return;
  }

  const produtosEscolhidos = [];
  const apoioEscolhido = [];

  checks.forEach(check => {
    const index = Number(check.dataset.opIndex);
    const op = rtImportProdutosVisualOpcoes[index];
    if (!op || !op.disponivel) return;

    const qtdEl = document.querySelector(`.rt-modal-prod-qtd[data-op-index="${index}"]`);
    const quantidade = Math.max(1, Number(qtdEl?.value || 1) || 1);

    if (op.tipoOrigem === "produto") {
      produtosEscolhidos.push(op.raw);
    } else {
      apoioEscolhido.push({ raw: op.raw, quantidade });
    }
  });

  if (produtosEscolhidos.length) {
    const atuais = Array.isArray(linha.tendas_escolhidas) ? linha.tendas_escolhidas : [];
    const novos = produtosEscolhidos.filter(p => !atuais.some(a => String(a.id) === String(p.id) || String(a.codigo) === String(p.codigo)));
    rtSalvarProdutosEscolhidosNaLinha(linha.numero, [...atuais, ...novos]);
  }

  if (apoioEscolhido.length) {
    linha.itens_apoio_escolhidos = linha.itens_apoio_escolhidos || [];

    apoioEscolhido.forEach(({ raw, quantidade }) => {
      linha.itens_apoio_escolhidos.push({
        id: raw.id || gerarId(),
        nome: raw.nome || raw.descricao || raw.categoria || raw.tipo || "Item de apoio",
        quantidade,
        observacao: "Importação Excel"
      });
    });

    if (typeof rtRenderizarItensEscolhidosImportacao === "function") {
      rtRenderizarItensEscolhidosImportacao(linha.numero);
    }
  }

  document.getElementById("modalImportarProdutosVisual")?.close();
}

function rtAdicionarExtraModalImportacao() {
  const linha = rtImportProdutosVisualLinhaAtual;
  if (!linha) return;

  const descEl = document.getElementById("importarProdutoExtraDescricao");
  const qtdEl = document.getElementById("importarProdutoExtraQtd");

  const descricao = String(descEl?.value || "").trim();
  const quantidade = Math.max(1, Number(qtdEl?.value || 1) || 1);

  if (!descricao) {
    alert("Digite a descrição do item extra.");
    return;
  }

  linha.produtos_extras_escolhidos = linha.produtos_extras_escolhidos || [];
  linha.produtos_extras_escolhidos.push({
    descricao,
    quantidade,
    origem: "Importação Excel - manual"
  });

  if (descEl) descEl.value = "";
  if (qtdEl) qtdEl.value = "1";

  if (typeof rtRenderizarItensEscolhidosImportacao === "function") {
    rtRenderizarItensEscolhidosImportacao(linha.numero);
  }
}


function configurarCamposNovoMaterialApoio() {
  const tipoInput = document.getElementById("novoMaterialApoioTipo");
  const nomeInput = document.getElementById("novoMaterialApoioNome");
  const corInput = document.getElementById("novoMaterialApoioCor");
  if (!tipoInput || !nomeInput || !corInput) return;

  const aplicar = () => {
    const ehToalha = tipoInput.value === "toalha";
    nomeInput.style.display = ehToalha ? "none" : "";
    corInput.style.display = ehToalha ? "" : "none";
    corInput.required = ehToalha;
    nomeInput.required = !ehToalha;
  };

  tipoInput.addEventListener("change", aplicar);
  aplicar();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", configurarCamposNovoMaterialApoio);
} else {
  configurarCamposNovoMaterialApoio();
}
