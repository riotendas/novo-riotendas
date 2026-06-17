// v19-dev-pacote-operacional


function tipoHorarioBaseRota(valor) {
  return String(valor || "A partir de").split("|")[0] || "A partir de";
}

function tipoHorarioFimRota(valor) {
  const partes = String(valor || "").split("|");
  return partes.length > 1 ? partes[1] : "";
}

function textoHorarioRota(tipoSalvo, horario, dataISO) {
  const tipo = tipoHorarioBaseRota(tipoSalvo);
  const fim = tipoHorarioFimRota(tipoSalvo);

  if (tipo === "Exatamente") return horario ? `Exatamente às ${horario}` : "Exatamente";
  if (tipo === "A partir de") return horario ? `A partir das ${horario}` : "A partir de";
  if (tipo === "Até") return horario ? `Até ${horario}` : "Até";
  if (tipo === "Intervalo") {
    if (horario && fim) return `Entre ${horario} e ${fim}`;
    if (horario) return `Intervalo a partir das ${horario}`;
    return "Intervalo";
  }
  if (tipo === "Horário comercial") return "Horário comercial";
  if (tipo === "Livre / combinar") return "Livre / combinar";
  return horario ? `${tipo} ${horario}` : tipo;
}

function minutosHorarioOperacionalRota(horario) {
  if (!horario) return null;
  const texto = String(horario).trim().slice(0, 5);
  const m = texto.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (!Number.isFinite(h) || !Number.isFinite(min)) return null;
  return h * 60 + min;
}

function horarioForaComercialRota(tipoSalvo, horario) {
  const tipo = tipoHorarioBaseRota(tipoSalvo);
  const tipoNorm = String(tipo || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (tipoNorm.includes("horario comercial") || tipoNorm.includes("livre") || tipoNorm.includes("combinar")) return false;

  const config = typeof carregarConfiguracoes === "function" ? carregarConfiguracoes() : (window.configRioTendas || {});
  const horarioConfig = config.horarioComercial || {};
  const inicioComercial = minutosHorarioOperacionalRota(horarioConfig.inicio || "08:00") ?? (8 * 60);
  const fimComercial = minutosHorarioOperacionalRota(horarioConfig.fim || "20:00") ?? (20 * 60);
  const ini = minutosHorarioOperacionalRota(horario);
  if (ini === null) return false;

  if (tipoNorm.includes("ate")) return ini < inicioComercial;
  if (tipoNorm.includes("partir")) return ini > fimComercial;

  if (tipoNorm.includes("intervalo")) {
    const fim = minutosHorarioOperacionalRota(tipoHorarioFimRota(tipoSalvo));
    if (fim !== null) return ini < inicioComercial || fim > fimComercial;
  }

  return ini < inicioComercial || ini > fimComercial;
}

function classeHorarioEspecialRota(tipoSalvo, horario) {
  return horarioForaComercialRota(tipoSalvo, horario) ? " horario-fora-comercial" : "";
}

let rotasCarros = {};
const storageRotasCarrosKey = "novoRioTendasRotasCarrosV1";


// v19-dev: controle operacional de rotas (entregue/recolhido/revisar)
let rotasOperacao = {};
const storageRotasOperacaoKey = "novoRioTendasRotasOperacaoV1";

function carregarRotasOperacaoLocal() {
  try { return JSON.parse(localStorage.getItem(storageRotasOperacaoKey) || "{}"); }
  catch { return {}; }
}

function salvarRotasOperacaoLocal() {
  localStorage.setItem(storageRotasOperacaoKey, JSON.stringify(rotasOperacao || {}));
  return salvarRotasOperacaoNuvem();
}

async function carregarRotasOperacaoNuvem() {
  if (typeof supabaseClient === "undefined" || !supabaseClient) return null;

  try {
    const { data, error } = await supabaseClient
      .from("app_config")
      .select("valor")
      .eq("chave", "rotas_operacao")
      .maybeSingle();

    if (error) {
      console.warn("Não foi possível carregar operação das rotas na nuvem:", error);
      return null;
    }

    return data?.valor || null;
  } catch (erro) {
    console.warn("Erro ao carregar operação das rotas na nuvem:", erro);
    return null;
  }
}

function rtRotasOperacaoMesclar(local = {}, nuvem = {}) {
  const saida = { ...(local || {}) };

  Object.entries(nuvem || {}).forEach(([id, opNuvem]) => {
    const opLocal = saida[id];
    if (!opLocal) {
      saida[id] = opNuvem;
      return;
    }

    const tLocal = new Date(opLocal.data || opLocal.atualizado_em || 0).getTime() || 0;
    const tNuvem = new Date(opNuvem.data || opNuvem.atualizado_em || 0).getTime() || 0;
    if (tNuvem >= tLocal) saida[id] = opNuvem;
  });

  return saida;
}

async function salvarRotasOperacaoNuvem() {
  if (typeof supabaseClient === "undefined" || !supabaseClient) return false;

  try {
    const { error } = await supabaseClient
      .from("app_config")
      .upsert({
        chave: "rotas_operacao",
        valor: rotasOperacao || {},
        atualizado_em: new Date().toISOString()
      }, { onConflict: "chave" });

    if (error) {
      console.warn("Não foi possível salvar operação das rotas na nuvem:", error);
      return false;
    }
    return true;
  } catch (erro) {
    console.warn("Erro ao salvar operação das rotas na nuvem:", erro);
    return false;
  }
}


async function zerarRotasOperacaoTotal(silencioso = false) {
  const antes = rotasOperacao && typeof rotasOperacao === "object" ? { ...rotasOperacao } : {};
  rotasOperacao = {};
  localStorage.setItem(storageRotasOperacaoKey, JSON.stringify({}));

  if (typeof supabaseClient !== "undefined" && supabaseClient) {
    try {
      await supabaseClient
        .from("app_config")
        .upsert({
          chave: "rotas_operacao",
          valor: {},
          atualizado_em: new Date().toISOString()
        }, { onConflict: "chave" });
    } catch (erro) {
      console.warn("Não foi possível zerar Entregue/Recolhido na nuvem:", erro);
    }
  }

  if (typeof registrarLogSistema === "function") {
    registrarLogSistema({
      modulo: "Rotas",
      acao: "Entregue/Recolhido zerado",
      registro_id: "rotas_operacao",
      registro_nome: "Controle operacional de rotas",
      antes,
      depois: {},
      detalhes: "Limpeza dos marcadores Entregue/Recolhido para recomeçar os testes da logística sem sincronização automática em loop."
    });
  }

  if (!silencioso) alert("Marcadores Entregue/Recolhido zerados. A partir de agora, os produtos só mudam de status quando você clicar em Entregue, Recolhido ou Reverter.");
  if (typeof renderizarRotas === "function") renderizarRotas();
}

async function resetarOperacoesRotasUmaVezParaTeste() {
  const chaveReset = "novoRioTendasResetEntregueRecolhidoLogisticaV1";
  if (localStorage.getItem(chaveReset) === "ok") return;
  localStorage.setItem(chaveReset, "ok");
  await zerarRotasOperacaoTotal(true);
}

async function sincronizarRotasOperacaoNuvem(renderizar = true) {
  const localAntes = rotasOperacao && typeof rotasOperacao === "object" ? rotasOperacao : carregarRotasOperacaoLocal();
  const nuvem = await carregarRotasOperacaoNuvem();

  if (nuvem && typeof nuvem === "object") {
    const mesclado = rtRotasOperacaoMesclar(localAntes, nuvem);
    const mudou = JSON.stringify(mesclado) !== JSON.stringify(rotasOperacao || {});
    rotasOperacao = mesclado;
    localStorage.setItem(storageRotasOperacaoKey, JSON.stringify(rotasOperacao));
    if (renderizar && mudou && typeof renderizarRotas === "function") renderizarRotas();
    if (typeof renderizarRuaMobile === "function") renderizarRuaMobile();
    return rotasOperacao;
  }

  await salvarRotasOperacaoNuvem();
  return rotasOperacao;
}

function colaboradorRotaAtual() {
  try {
    return typeof getColaboradorLogado === "function" ? getColaboradorLogado() : "Sistema";
  } catch {
    return "Sistema";
  }
}

function formatarDataHoraOperacaoRota(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function obterOperacaoRota(rotaId) {
  return (rotasOperacao || {})[rotaId] || null;
}

function textoPendenteRota(rota) {
  return rota?.tipo === "Desmontagem" ? "Retirada Pendente" : "Entrega Pendente";
}

function badgeOperacaoRota(rota) {
  const op = obterOperacaoRota(rota.id);
  if (!op || !op.status) return `<span class="rota-operacao-badge rota-operacao-pendente">${textoPendenteRota(rota)}</span>`;

  const quando = formatarDataHoraOperacaoRota(op.data);
  const por = op.colaborador ? ` · ${op.colaborador}` : "";

  if (op.status === "entregue") {
    return `<span class="rota-operacao-badge rota-operacao-entregue">Entregue${quando ? ` ${quando}` : ""}${por}</span>`;
  }

  if (op.status === "recolhido") {
    return `<span class="rota-operacao-badge rota-operacao-recolhido">Recolhido · Revisar${quando ? ` ${quando}` : ""}${por}</span>`;
  }
  if (op.status === "efetuado") {
    return `<span class="rota-operacao-badge rota-operacao-entregue">Efetuado${quando ? ` ${quando}` : ""}${por}</span>`;
  }

  return `<span class="rota-operacao-badge rota-operacao-pendente">${textoPendenteRota(rota)}</span>`;
}

function produtoEventoChaveRota(produto) {
  return {
    id: String(produto?.id || ""),
    codigo: String(produto?.codigo || "").trim()
  };
}

function localizarProdutoDaListaRota(produtoEvento) {
  if (!Array.isArray(produtos)) return null;
  const chave = produtoEventoChaveRota(produtoEvento);
  return produtos.find(p => {
    const id = String(p?.id || "");
    const codigo = String(p?.codigo || "").trim();
    return (chave.id && id === chave.id) || (chave.codigo && codigo === chave.codigo);
  }) || null;
}

function rotaUsuarioEhAdmin() {
  try {
    if (typeof usuarioEhAdministrador === "function") return usuarioEhAdministrador();
    const usuario = JSON.parse(localStorage.getItem("novoRioTendasUsuarioSessaoV1") || localStorage.getItem("novoRioTendasUsuarioLogado") || "null");
    return usuario && usuario.perfil === "administrador";
  } catch {
    return false;
  }
}

function materialEventoRotas(rota) {
  const evento = rota?.evento || {};
  return Array.isArray(evento.tendas) ? evento.tendas : [];
}



function rtProdutoStatusFoiAlteradoManual(produto) {
  const historico = Array.isArray(produto?.historico) ? produto.historico : [];
  const eventosStatus = historico
    .filter(h => String(h?.alteracao || '').toLowerCase().includes('status alterado'))
    .slice()
    .sort((a, b) => new Date(b.data || 0) - new Date(a.data || 0));

  if (!eventosStatus.length) return false;

  const ultimo = eventosStatus[0];
  const texto = `${ultimo.alteracao || ''} ${ultimo.observacao || ''}`.toLowerCase();

  // Alterações registradas pela rota continuam sendo automáticas.
  if (texto.includes('pela rota') || texto.includes('sincronização automática') || texto.includes('sincronizacao automatica')) {
    return false;
  }

  return true;
}

function rtStatusProdutoManualProtegido(produto, novoStatus) {
  const atual = String(produto?.status || '').trim().toLowerCase();
  const destino = String(novoStatus || '').trim().toLowerCase();
  if (!atual || atual === destino) return false;
  return rtProdutoStatusFoiAlteradoManual(produto);
}

async function alterarStatusProdutosEventoRota(rota, novoStatus, motivo, opAnterior = null) {
  const tendasEvento = materialEventoRotas(rota);
  if (!tendasEvento.length) return [];

  if (typeof carregarProdutos === "function") {
    try { await carregarProdutos(true); } catch {}
  }

  const alterados = [];
  const colaborador = colaboradorRotaAtual();
  const agora = new Date().toISOString();
  const nomeEvento = rota?.evento?.nome || rota?.cliente || "Evento";
  const anterioresSalvos = Array.isArray(opAnterior?.produtos) ? opAnterior.produtos : [];

  for (const itemEvento of tendasEvento) {
    const produto = localizarProdutoDaListaRota(itemEvento);
    if (!produto) continue;

    const statusAnterior = produto.status || "";
    let statusDestino = novoStatus;

    if (novoStatus === "__RESTORE__") {
      const registro = anterioresSalvos.find(reg =>
        (reg.id && String(reg.id) === String(produto.id)) ||
        (reg.codigo && String(reg.codigo).trim() === String(produto.codigo || "").trim())
      );
      statusDestino = registro?.statusAnterior || (opAnterior?.status === "recolhido" ? "Alugado" : "Livre");
    }

    if (String(statusAnterior).trim().toLowerCase() === String(statusDestino).trim().toLowerCase()) continue;

    const ehSincronizacaoAutomatica = String(motivo || "").toLowerCase().includes("sincronização automática") || String(motivo || "").toLowerCase().includes("sincronizacao automatica");

    // Protege status manuais apenas durante reconciliações automáticas.
    // Ações explícitas da rota (Entregue/Recolhido) continuam tendo prioridade operacional.
    if (ehSincronizacaoAutomatica && rtStatusProdutoManualProtegido(produto, statusDestino)) {
      if (typeof registrarLogSistema === "function") {
        registrarLogSistema({
          modulo: "Rotas",
          acao: "Status automático ignorado",
          registro_id: produto.id,
          registro_nome: produto.codigo || produto.nome || "Produto",
          antes: { status: statusAnterior },
          depois: { status: statusAnterior },
          detalhes: `A sincronização automática tentou alterar para ${statusDestino}, mas o status atual foi definido manualmente. Produto preservado para evitar loop.`
        });
      }
      continue;
    }

    alterados.push({
      id: produto.id,
      codigo: produto.codigo || "",
      statusAnterior,
      statusNovo: statusDestino
    });

    produto.status = statusDestino;
    if (statusDestino === "Alugado") {
      produto.observacao = `Evento: ${nomeEvento}`;
    } else if (statusDestino === "Revisar") {
      produto.observacao = produto.observacao || `Recolhido do evento ${nomeEvento}. Aguardando revisão.`;
    }
    produto.atualizado_em = agora;
    produto.colaborador = colaborador;
    produto.historico = Array.isArray(produto.historico) ? produto.historico : [];
    produto.historico.push({
      data: agora,
      colaborador,
      alteracao: `Status alterado para ${statusDestino} pela rota`,
      observacao: `Evento: ${nomeEvento}. ${motivo || ""}`.trim()
    });

    if (typeof salvarProdutoBanco === "function") {
      const salvo = await salvarProdutoBanco(produto);
      if (salvo && Array.isArray(produtos)) {
        const idx = produtos.findIndex(p => String(p.id) === String(salvo.id));
        if (idx >= 0) produtos[idx] = salvo;
      }
    }

    if (typeof registrarLogSistema === "function") {
      registrarLogSistema({
        modulo: "Rotas",
        acao: `Produto alterado para ${statusDestino}`,
        registro_id: produto.id,
        registro_nome: produto.codigo || produto.nome || "Produto",
        antes: { status: statusAnterior },
        depois: { status: statusDestino },
        detalhes: `${motivo || "Alteração operacional"} no evento ${nomeEvento}`
      });
    }
  }

  if (alterados.length && typeof invalidarCacheProdutosGlobal === "function") invalidarCacheProdutosGlobal();
  if (alterados.length && typeof renderizarProdutos === "function") renderizarProdutos();
  return alterados;
}

async function marcarProdutosEventoParaRevisar(rota) {
  return (await alterarStatusProdutosEventoRota(rota, "Revisar", "Recolhido na desmontagem")).length;
}

async function marcarProdutosEventoParaAlugado(rota) {
  return await alterarStatusProdutosEventoRota(rota, "Alugado", "Entrega/montagem confirmada");
}

async function reverterOperacaoRota(rotaId) {
  if (!rotaUsuarioEhAdmin()) {
    alert("Apenas administrador pode reverter entrega ou recolhimento.");
    return;
  }

  const rota = criarRotasDosEventos().find(r => String(r.id) === String(rotaId));
  const opAnterior = obterOperacaoRota(rotaId);

  if (!rota || !opAnterior?.status) {
    alert("Não há operação para reverter nesta rota.");
    return;
  }

  const confirma = confirm(`Reverter a operação ${opAnterior.status === "recolhido" ? "recolhida" : (opAnterior.status === "efetuado" ? "efetuada" : "entregue")} desta rota?`);
  if (!confirma) return;

  const colaborador = colaboradorRotaAtual();
  const agora = new Date().toISOString();
  let alterados = [];

  if (opAnterior.status === "recolhido") {
    alterados = await alterarStatusProdutosEventoRota(rota, "__RESTORE__", "Reversão administrativa do recolhimento", opAnterior);
    delete rotasOperacao[rota.id];
  } else if (opAnterior.status === "entregue") {
    alterados = await alterarStatusProdutosEventoRota(rota, "__RESTORE__", "Reversão administrativa da entrega", opAnterior);
    delete rotasOperacao[rota.id];
  } else if (opAnterior.status === "efetuado") {
    // Atendimentos extras não alteram o status dos produtos; reverter significa
    // voltar o atendimento para pendente e liberar o botão Efetuado novamente.
    delete rotasOperacao[rota.id];
  }

  await salvarRotasOperacaoLocal();

  if (typeof registrarLogSistema === "function") {
    registrarLogSistema({
      modulo: "Rotas",
      acao: "Operação revertida pelo administrador",
      registro_id: rota.evento_id,
      registro_nome: rota.cliente || "Evento",
      antes: opAnterior,
      depois: rotasOperacao[rota.id] || { status: "pendente" },
      detalhes: `Produtos restaurados: ${alterados.length}`
    });
  }

  if (typeof carregarProdutos === "function") {
    try { await carregarProdutos(true); } catch {}
  }

  renderizarRotas();
  alert("Operação revertida pelo administrador.");
}

async function reconciliarStatusProdutosOperacoesRotas() {
  if (!rotasOperacao || typeof rotasOperacao !== "object") return;

  const rotas = criarRotasDosEventos();
  let mudouOperacao = false;

  const operacoesOrdenadas = Object.entries(rotasOperacao)
    .filter(([, op]) => op && op.status)
    .sort(([, a], [, b]) => {
      const da = new Date(a?.data || 0).getTime() || 0;
      const db = new Date(b?.data || 0).getTime() || 0;
      return da - db;
    });

  // Processa em ordem cronológica para a última operação vencer.
  // Isso evita que uma montagem entregue antiga volte a marcar como Alugado
  // depois que a desmontagem já foi marcada como Recolhido/Revisar.
  for (const [rotaId, op] of operacoesOrdenadas) {
    const rota = rotas.find(r => String(r.id) === String(rotaId));
    if (!rota) continue;

    if (op.semAlterarProdutos) continue;

    if (op.status === "entregue") {
      const alterados = await alterarStatusProdutosEventoRota(rota, "Alugado", "Sincronização automática: rota entregue");
      if (alterados.length) {
        op.produtos = Array.isArray(op.produtos) && op.produtos.length ? op.produtos : alterados;
        mudouOperacao = true;
      }
    }

    if (op.status === "recolhido") {
      const alterados = await alterarStatusProdutosEventoRota(rota, "Revisar", "Sincronização automática: rota recolhida");
      if (alterados.length) {
        op.produtos = Array.isArray(op.produtos) && op.produtos.length ? op.produtos : alterados;
        mudouOperacao = true;
      }
    }
  }

  if (mudouOperacao) await salvarRotasOperacaoLocal();
}


function rotaOperacaoConcluida(rota) {
  const op = obterOperacaoRota(rota.id);
  if (!op || !op.status) return false;
  if (rota.tipo === "Montagem") return op.status === "entregue";
  if (rota.tipo === "Desmontagem") return op.status === "recolhido";
  if (String(rota.tipo || "").toLowerCase().includes("atendimento") || String(rota.tipoHorario || "").toLowerCase().includes("atendimento") || !["Montagem","Desmontagem"].includes(rota.tipo)) return op.status === "efetuado";
  return false;
}

function rotasDoFiltroAtualParaAvanco(data, tipo, carro) {
  if (typeof criarRotasDosEventos !== "function") return [];
  return criarRotasDosEventos().filter(rota => {
    const carroRota = typeof ruaMobileCarroDaRota === "function"
      ? ruaMobileCarroDaRota(rota)
      : ((rotasCarros && rotasCarros[rota.id]) || "Sem carro");
    return rota.data === data
      && (!tipo || rota.tipo === tipo)
      && (!carro || String(carroRota || "Sem carro") === String(carro));
  });
}

function avancarListagemRotasSeDiaConcluido() {
  try {
    const ruaAtiva = document.getElementById("ruaMobileSection")?.classList.contains("active-section");
    const rotasAtiva = document.getElementById("rotasSection")?.classList.contains("active-section");
    let input = null;
    let tipo = "";
    let carro = "";

    if (ruaAtiva && document.getElementById("ruaMobileData")) {
      input = document.getElementById("ruaMobileData");
      tipo = document.getElementById("ruaMobileTipo")?.value || "";
      carro = document.getElementById("ruaMobileCarro")?.value || "";
    } else if (rotasAtiva && document.getElementById("rotaPeriodo")?.value === "data") {
      input = document.getElementById("rotaData");
      tipo = document.getElementById("rotaTipoFiltro")?.value || "";
      carro = document.getElementById("rotaCarroFiltro")?.value || "";
    }

    const data = input?.value || "";
    if (!data) return false;

    const rotasDia = rotasDoFiltroAtualParaAvanco(data, tipo, carro);
    if (!rotasDia.length) return false;
    if (!rotasDia.every(rotaOperacaoConcluida)) return false;

    const proxima = new Date(`${data}T12:00:00`);
    if (Number.isNaN(proxima.getTime())) return false;
    proxima.setDate(proxima.getDate() + 1);
    input.value = `${proxima.getFullYear()}-${String(proxima.getMonth() + 1).padStart(2, "0")}-${String(proxima.getDate()).padStart(2, "0")}`;
    if (typeof ruaMobileAtualizarDiaSemana === "function") ruaMobileAtualizarDiaSemana();
    return true;
  } catch (err) {
    console.warn("Não foi possível avançar a listagem de rotas:", err);
    return false;
  }
}

async function marcarOperacaoRota(rotaId, acao) {
  const rota = criarRotasDosEventos().find(r => String(r.id) === String(rotaId));
  if (!rota) {
    alert("Rota não encontrada.");
    return;
  }

  const agora = new Date().toISOString();
  const colaborador = colaboradorRotaAtual();

  if (acao === "entregue") {
    const alteradosAlugado = await marcarProdutosEventoParaAlugado(rota);

    rotasOperacao[rota.id] = {
      status: "entregue",
      data: agora,
      colaborador,
      evento_id: rota.evento_id,
      tipo: rota.tipo,
      produtos: alteradosAlugado
    };

    await salvarRotasOperacaoLocal();

    if (typeof registrarLogSistema === "function") {
      registrarLogSistema({
        modulo: "Rotas",
        acao: "Material entregue",
        registro_id: rota.evento_id,
        registro_nome: rota.cliente || "Evento",
        depois: rotasOperacao[rota.id],
        detalhes: `Montagem marcada como entregue na rota ${rota.id}`
      });
    }

    const avancouDia = avancarListagemRotasSeDiaConcluido();
    renderizarRotas();
    if (avancouDia && typeof renderizarRuaMobile === "function") renderizarRuaMobile();
    return;
  }

  if (acao === "efetuado") {
    rotasOperacao[rota.id] = { status: "efetuado", data: agora, colaborador, evento_id: rota.evento_id, tipo: rota.tipo };
    await salvarRotasOperacaoLocal();
    if (typeof registrarLogSistema === "function") {
      registrarLogSistema({ modulo: "Rotas", acao: "Atendimento efetuado", registro_id: rota.evento_id, registro_nome: rota.cliente || "Evento", depois: rotasOperacao[rota.id], detalhes: `Atendimento extra efetuado na rota ${rota.id}` });
    }
    const avancouDia = avancarListagemRotasSeDiaConcluido();
    renderizarRotas();
    if (avancouDia && typeof renderizarRuaMobile === "function") renderizarRuaMobile();
    return;
  }

  if (acao === "recolhido") {
    const confirma = confirm("Marcar material como recolhido e enviar os produtos deste evento para status Revisar?");
    if (!confirma) return;

    rotasOperacao[rota.id] = {
      status: "recolhido",
      data: agora,
      colaborador,
      evento_id: rota.evento_id,
      tipo: rota.tipo
    };

    const alteradosRevisar = await alterarStatusProdutosEventoRota(rota, "Revisar", "Recolhido na desmontagem");
    const qtdRevisar = alteradosRevisar.length;
    rotasOperacao[rota.id].produtos = alteradosRevisar;
    await salvarRotasOperacaoLocal();

    if (typeof registrarLogSistema === "function") {
      registrarLogSistema({
        modulo: "Rotas",
        acao: "Material recolhido",
        registro_id: rota.evento_id,
        registro_nome: rota.cliente || "Evento",
        depois: rotasOperacao[rota.id],
        detalhes: `Desmontagem recolhida. Produtos enviados para Revisar: ${qtdRevisar}`
      });
    }

    if (typeof carregarProdutos === "function") {
      try { await carregarProdutos(true); } catch {}
    }

    const avancouDia = avancarListagemRotasSeDiaConcluido();
    renderizarRotas();
    if (avancouDia && typeof renderizarRuaMobile === "function") renderizarRuaMobile();
    alert(`Material recolhido. ${qtdRevisar} produto(s) foram enviados para Revisar.`);
  }
}


async function carregarRotasCarrosNuvem() {
  if (typeof supabaseClient === "undefined" || !supabaseClient) return null;

  try {
    const { data, error } = await supabaseClient
      .from("app_config")
      .select("valor")
      .eq("chave", "rotas_carros")
      .maybeSingle();

    if (error) {
      console.warn("Não foi possível carregar carros das rotas na nuvem:", error);
      return null;
    }

    return data?.valor || null;
  } catch (erro) {
    console.warn("Erro ao carregar carros das rotas na nuvem:", erro);
    return null;
  }
}

async function salvarRotasCarrosNuvem() {
  if (typeof supabaseClient === "undefined" || !supabaseClient) return;

  try {
    const { error } = await supabaseClient
      .from("app_config")
      .upsert({
        chave: "rotas_carros",
        valor: rotasCarros || {},
        atualizado_em: new Date().toISOString()
      }, { onConflict: "chave" });

    if (error) console.warn("Não foi possível salvar carros das rotas na nuvem:", error);
  } catch (erro) {
    console.warn("Erro ao salvar carros das rotas na nuvem:", erro);
  }
}

async function sincronizarRotasCarrosNuvem() {
  const nuvem = await carregarRotasCarrosNuvem();

  if (nuvem && typeof nuvem === "object") {
    rotasCarros = { ...rotasCarros, ...nuvem };
    localStorage.setItem(storageRotasCarrosKey, JSON.stringify(rotasCarros));
    renderizarRotas();
    return;
  }

  await salvarRotasCarrosNuvem();
}

function carregarRotasCarrosLocal() {
  return JSON.parse(localStorage.getItem(storageRotasCarrosKey) || "{}");
}

function salvarRotasCarrosLocal() {
  rtMarcarEdicaoManualCarrosRotas();
  localStorage.setItem(storageRotasCarrosKey, JSON.stringify(rotasCarros));
  return salvarRotasCarrosNuvem();
}

const storageRotasOrdemKey = "rotas_ordem_manual";
const storageRotasOrdemAtualizadaKey = "rotas_ordem_manual_atualizada_em";
const storageRotasOrdemPendenteKey = "rotas_ordem_manual_pendente";

function rtTimestampOrdemLocal() {
  return Number(localStorage.getItem(storageRotasOrdemAtualizadaKey) || "0") || 0;
}

function rtSetTimestampOrdemLocal(timestamp = Date.now()) {
  localStorage.setItem(storageRotasOrdemAtualizadaKey, String(timestamp));
  return timestamp;
}

async function carregarRotasOrdemNuvem() {
  if (typeof supabaseClient === "undefined" || !supabaseClient) return null;

  try {
    const { data, error } = await supabaseClient
      .from("app_config")
      .select("valor, atualizado_em")
      .eq("chave", "rotas_ordem_manual")
      .maybeSingle();

    if (error) {
      console.warn("Não foi possível carregar ordem das rotas na nuvem:", error);
      return null;
    }

    if (!data?.valor || typeof data.valor !== "object") return null;
    return {
      valor: data.valor,
      atualizadoEm: data.atualizado_em ? new Date(data.atualizado_em).getTime() : 0
    };
  } catch (erro) {
    console.warn("Erro ao carregar ordem das rotas na nuvem:", erro);
    return null;
  }
}

async function salvarRotasOrdemNuvem(timestamp = rtTimestampOrdemLocal() || Date.now()) {
  if (typeof supabaseClient === "undefined" || !supabaseClient) return false;

  try {
    const dataIso = new Date(timestamp).toISOString();
    const { error } = await supabaseClient
      .from("app_config")
      .upsert({
        chave: "rotas_ordem_manual",
        valor: rotasOrdemManual || {},
        atualizado_em: dataIso
      }, { onConflict: "chave" });

    if (error) {
      console.warn("Não foi possível salvar ordem das rotas na nuvem:", error);
      return false;
    }
    return true;
  } catch (erro) {
    console.warn("Erro ao salvar ordem das rotas na nuvem:", erro);
    return false;
  }
}

async function sincronizarRotasOrdemNuvem() {
  const nuvem = await carregarRotasOrdemNuvem();
  const localTs = rtTimestampOrdemLocal();

  if (nuvem?.valor && nuvem.atualizadoEm > localTs) {
    rotasOrdemManual = { ...rotasOrdemManual, ...nuvem.valor };
    localStorage.setItem(storageRotasOrdemKey, JSON.stringify(rotasOrdemManual));
    rtSetTimestampOrdemLocal(nuvem.atualizadoEm);
    renderizarRotas();
    return;
  }

  // Não salvar ordem automaticamente na inicialização. Somente ações manuais salvam na nuvem.
}


function atualizarFiltroCarrosRotas() {
  const select = document.getElementById("rotaCarroFiltro");
  if (!select) return;

  const valorAtual = select.value;
  select.innerHTML = `
    <option value="">Todos</option>
    ${carrosDisponiveisRotas().map(carro => `<option value="${carro}">${carro}</option>`).join("")}
    <option value="Sem carro">Sem carro</option>
  `;
  select.value = valorAtual;
}


let ultimaSincronizacaoOrdemRotas = 0;
let ultimaEdicaoManualOrdemRotas = 0;
let ultimaEdicaoManualCarrosRotas = 0;
const janelaProtecaoEdicaoRotasMs = 12000;

function rtMarcarEdicaoManualOrdemRotas() {
  ultimaEdicaoManualOrdemRotas = Date.now();
}

function rtMarcarEdicaoManualCarrosRotas() {
  ultimaEdicaoManualCarrosRotas = Date.now();
}

function rtEdicaoManualRecenteOrdemRotas() {
  return Date.now() - ultimaEdicaoManualOrdemRotas < janelaProtecaoEdicaoRotasMs;
}

function rtEdicaoManualRecenteCarrosRotas() {
  return Date.now() - ultimaEdicaoManualCarrosRotas < janelaProtecaoEdicaoRotasMs;
}

async function atualizarCarrosRotasDaNuvemSeNecessario() {
  if (rtEdicaoManualRecenteCarrosRotas()) return;

  const nuvem = await carregarRotasCarrosNuvem();
  if (nuvem && typeof nuvem === "object") {
    const atual = JSON.stringify(rotasCarros || {});
    const novo = JSON.stringify({ ...rotasCarros, ...nuvem });

    if (atual !== novo) {
      rotasCarros = { ...rotasCarros, ...nuvem };
      localStorage.setItem(storageRotasCarrosKey, JSON.stringify(rotasCarros));
      if (document.getElementById("rotasSection")?.classList.contains("active-section")) renderizarRotas();
      if (typeof renderizarRuaMobile === "function" && document.getElementById("ruaMobileSection")?.classList.contains("active-section")) renderizarRuaMobile();
    }
  }
}

async function atualizarOrdemRotasDaNuvemSeNecessario() {
  const pendenteRaw = localStorage.getItem(storageRotasOrdemPendenteKey);
  if (pendenteRaw) {
    try {
      const pendente = JSON.parse(pendenteRaw);
      if (pendente?.valor && typeof pendente.valor === "object") {
        rotasOrdemManual = pendente.valor;
        localStorage.setItem(storageRotasOrdemKey, JSON.stringify(rotasOrdemManual));
        rtSetTimestampOrdemLocal(pendente.atualizadoEm || Date.now());
        const salvou = await salvarRotasOrdemNuvem(pendente.atualizadoEm || rtTimestampOrdemLocal());
        if (salvou) localStorage.removeItem(storageRotasOrdemPendenteKey);
      }
    } catch (erro) {
      console.warn("Não foi possível reenviar ordem pendente:", erro);
    }
    return;
  }

  if (rtEdicaoManualRecenteOrdemRotas()) return;
  const agora = Date.now();
  if (agora - ultimaSincronizacaoOrdemRotas < 15000) return;

  ultimaSincronizacaoOrdemRotas = agora;
  const nuvem = await carregarRotasOrdemNuvem();
  const localTs = rtTimestampOrdemLocal();

  // A nuvem só pode vencer se for comprovadamente mais recente que esta aba.
  // Isso evita que outra tela/aba com ordem antiga faça a lista voltar sozinha.
  if (nuvem?.valor && nuvem.atualizadoEm > localTs) {
    const atual = JSON.stringify(rotasOrdemManual || {});
    const novoMapa = { ...rotasOrdemManual, ...nuvem.valor };
    const novo = JSON.stringify(novoMapa);

    if (atual !== novo) {
      rotasOrdemManual = novoMapa;
      localStorage.setItem(storageRotasOrdemKey, JSON.stringify(rotasOrdemManual));
      rtSetTimestampOrdemLocal(nuvem.atualizadoEm);
      if (document.getElementById("rotasSection")?.classList.contains("active-section")) renderizarRotas();
      if (typeof renderizarRuaMobile === "function" && document.getElementById("ruaMobileSection")?.classList.contains("active-section")) renderizarRuaMobile();
    }
  }
}


function aplicarParametrosRotaLinkSeExistirem() {
  try {
    const params = window.__riotendasRotaLinkParams || (() => {
      const q = new URLSearchParams(window.location.search);
      if (q.get("section") !== "rotas") return null;
      return { data: q.get("rotaData") || "", tipo: q.get("rotaTipo") || "" };
    })();
    if (!params || !params.data) return;
    const rotaPeriodo = document.getElementById("rotaPeriodo");
    const rotaData = document.getElementById("rotaData");
    const rotaTipo = document.getElementById("rotaTipoFiltro");
    const rotaCarro = document.getElementById("rotaCarroFiltro");
    if (rotaPeriodo) rotaPeriodo.value = "data";
    if (rotaData) rotaData.value = params.data;
    if (rotaTipo && params.tipo) rotaTipo.value = params.tipo;
    if (rotaCarro) rotaCarro.value = "";
  } catch (err) {
    console.warn("Não foi possível travar data/tipo da rota pelo link", err);
  }
}

function iniciarRotas() {
  if (!document.getElementById("rotasConteudo")) return;

  rotasCarros = carregarRotasCarrosLocal();
  rotasOperacao = carregarRotasOperacaoLocal();
  atualizarFiltroCarrosRotas();
  sincronizarRotasCarrosNuvem();
  sincronizarRotasOrdemNuvem();
  rtNotasSincronizarNuvem(true).catch(() => {});
  sincronizarRotasOperacaoNuvem(true).catch(() => {});
  // Não zerar Entregue/Recolhido automaticamente em ambiente multiusuário.
  // A limpeza deve acontecer apenas pelo botão administrativo.

  const hoje = new Date();
  const mesAtual = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;
  document.getElementById("rotaMes").value = mesAtual;
  aplicarParametrosRotaLinkSeExistirem();

  ["rotaPeriodo", "rotaMes", "rotaData", "rotaTipoFiltro", "rotaCarroFiltro"].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener("input", renderizarRotas);
      el.addEventListener("change", renderizarRotas);
    }
  });

  document.getElementById("atualizarRotasBtn")?.addEventListener("click", async () => {
    if (typeof carregarEventos === "function") await carregarEventos();
    renderizarRotas();
  });

  document.getElementById("organizarRotasBtn")?.addEventListener("click", () => {
    const layout = document.getElementById("rotasLayout");
    const btn = document.getElementById("organizarRotasBtn");
    if (!layout) return;
    const ativo = !layout.classList.contains("organizador-ativo");
    layout.classList.toggle("organizador-ativo", ativo);
    btn?.classList.toggle("ativo", ativo);
    if (btn) btn.textContent = ativo ? "Fechar organizador" : "Organizar rotas";
    renderizarRotas();
  });

  document.getElementById("rotasOrganizadorFechar")?.addEventListener("click", () => {
    const layout = document.getElementById("rotasLayout");
    const btn = document.getElementById("organizarRotasBtn");
    layout?.classList.remove("organizador-ativo");
    btn?.classList.remove("ativo");
    if (btn) btn.textContent = "Organizar rotas";
  });

  setTimeout(renderizarRotas, 400);

  setInterval(() => {
    if (typeof rtUsuarioEditandoOperacional === "function" && rtUsuarioEditandoOperacional()) return;
    const rotasAtiva = document.getElementById("rotasSection")?.classList.contains("active-section");
    const ruaAtiva = document.getElementById("ruaMobileSection")?.classList.contains("active-section");
    if (!rotasAtiva && !ruaAtiva) return;
    atualizarCarrosRotasDaNuvemSeNecessario().catch(() => {});
    atualizarOrdemRotasDaNuvemSeNecessario().catch(() => {});
    rtNotasSincronizarNuvem(true).catch(() => {});
    sincronizarRotasOperacaoNuvem(true).then(() => {
      if (rotasAtiva && typeof renderizarRotas === "function") renderizarRotas();
      if (ruaAtiva && typeof renderizarRuaMobile === "function") renderizarRuaMobile();
    }).catch(() => {});
  }, 120000);

  if (!window.__rtRotasOperacaoSyncTimer) {
    window.__rtRotasOperacaoSyncTimer = setInterval(() => {
      const rotasAtiva = document.getElementById("rotasSection")?.classList.contains("active-section");
      const ruaAtiva = document.getElementById("ruaMobileSection")?.classList.contains("active-section");
      const produtosAtiva = document.getElementById("produtosSection")?.classList.contains("active-section");
      if ((rotasAtiva || ruaAtiva || produtosAtiva) && !(typeof rtUsuarioEditandoOperacional === "function" && rtUsuarioEditandoOperacional())) {
        rtNotasSincronizarNuvem(true).catch(() => {});
        sincronizarRotasOperacaoNuvem(true).catch(() => {});
      }
    }, 120000);
  }
}

function dataLocalISO(data) {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

function somarDiasDataISO(dias) {
  const data = new Date();
  data.setDate(data.getDate() + dias);
  return dataLocalISO(data);
}

function dataKeyDeDateTime(valor) {
  if (!valor) return "";
  return String(valor).slice(0, 10);
}

function horaDeDateTime(valor) {
  if (!valor) return "";
  const texto = String(valor);
  if (texto.includes("T")) return texto.slice(11, 16);
  return texto.slice(0, 5);
}



function formatarDataCurtaDisponibilidade(dataISO) {
  if (!dataISO) return "-";

  const partes = String(dataISO).split("-");
  if (partes.length !== 3) return dataISO;

  return `${partes[2]}/${partes[1]}/${partes[0].slice(-2)}`;
}

function formatarDataRota(dataISO) {
  if (!dataISO) return "-";
  const partes = dataISO.split("-");
  if (partes.length !== 3) return dataISO;
  return `${partes[2]}/${partes[1]}/${partes[0].slice(-2)}`;
}

function diaSemanaRota(dataISO) {
  if (!dataISO) return "";
  const d = new Date(dataISO + "T12:00:00");
  const dias = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SAB"];
  return dias[d.getDay()] || "";
}

function rtDataOrganizadorRota(dataISO) {
  if (!dataISO) return "-";
  const dia = diaSemanaRota(dataISO);
  return `${formatarDataRota(dataISO)}${dia ? " - " + dia : ""}`;
}


function dinheiroRota(valor) {
  return Number(valor || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function statusPagamentoRota(evento) {
  return evento.pagamento_quitado ? "Quitado" : "Em aberto";
}

function classePagamentoRota(evento) {
  return evento.pagamento_quitado ? "pagamento-ok" : "pagamento-aberto";
}

function montarListaMateriais(evento) {
  const tendas = (evento.tendas || []).map((p, index) => {
    const nome = [p.codigo, p.categoria, p.tamanho, p.cor].filter(Boolean).join(" - ");
    const base = nome || "Produto com código";
    if (p.uso_transito || p.usoEmTransito) {
      const origem = p.origem_transito_texto || (p.origem_evento_nome ? `Retirar de ${p.origem_evento_nome}` : "Retirar no caminho");
      return `⚠ Uso em trânsito: ${base} — ${origem}`;
    }
    return base;
  });

  const reservas = (typeof rtProdutosReservaEvento === "function" ? rtProdutosReservaEvento(evento) : []).map(i => typeof rtProdutoReservaParaTexto === "function" ? rtProdutoReservaParaTexto(i) : `🔄 R${i.codigo || ""}`);

  const apoio = (evento.itens_apoio || []).map(i => `${i.nome} (${i.quantidade})`);

  const extras = (typeof rtProdutosExtrasOperacionais === "function" ? rtProdutosExtrasOperacionais(evento) : (evento.produtos_extras || [])).map(i => `${i.descricao} (${i.quantidade})`);

  return [...tendas, ...reservas, ...apoio, ...extras];
}

function montarMateriaisRotaDetalhados(evento) {
  const materiais = [];

  (evento.tendas || []).forEach((p, index) => {
    const nome = [p.codigo, p.categoria, p.tamanho, p.cor].filter(Boolean).join(" - ");

    materiais.push({
      tipo: "produto",
      index,
      id: p.id,
      categoria: p.categoria || p.tipo || "",
      tamanho: p.tamanho || "",
      texto: (p.uso_transito || p.usoEmTransito) ? `⚠ Uso em trânsito: ${nome || "Produto com código"} — ${p.origem_transito_texto || (p.origem_evento_nome ? "Retirar de " + p.origem_evento_nome : "Retirar no caminho")}` : (nome || "Produto com código")
    });
  });

  (typeof rtProdutosReservaEvento === "function" ? rtProdutosReservaEvento(evento) : []).forEach((p, index) => {
    const nome = typeof rtProdutoReservaParaTexto === "function" ? rtProdutoReservaParaTexto(p) : `🔄 R${p.codigo || ""}`;
    materiais.push({ tipo: "reserva", index, id: p.id, categoria: p.categoria || p.tipo || "", tamanho: p.tamanho || "", texto: nome });
  });

  (evento.itens_apoio || []).forEach((i, index) => {
    materiais.push({
      tipo: "apoio",
      index,
      texto: `${i.nome} (${i.quantidade})`
    });
  });

  (typeof rtProdutosExtrasOperacionais === "function" ? rtProdutosExtrasOperacionais(evento) : (evento.produtos_extras || [])).forEach((i, index) => {
    materiais.push({
      tipo: "extra",
      index,
      texto: `${i.descricao} (${i.quantidade})`
    });
  });

  return materiais;
}

function renderizarMateriaisRotaClicaveis(rota) {
  if (rota && rota.atendimentoExtra && String(rota.atendimentoExtra.tipo || '').toLowerCase().includes('troca')) {
    const novas = rtTendasNovasAtendimento(rota);
    if (novas.length) {
      const atendimentoId = rota.atendimentoExtra.id || rota.id || "";
      return novas.map((nova, idx) => `
        <button
          type="button"
          class="rota-material-click"
          title="Clique para substituir este produto"
          data-rota-trocar-produto="1"
          data-evento-id="${rota.evento?.id || rota.evento_id || ""}"
          data-produto-index="extra:${atendimentoId}:${idx}"
        >${nova}</button>
      `).join('');
    }
    if (Array.isArray(rota.materiais) && rota.materiais.length) return rota.materiais.map(m => `<span>${m}</span>`).join('');
    return `<span>Troca de tenda</span>`;
  }
  const evento = rota.evento || {};
  const materiais = montarMateriaisRotaDetalhados(evento);

  if (!materiais.length) {
    return `<span>Sem materiais informados</span>`;
  }

  return materiais.map(item => {
    if (item.tipo !== "produto") {
      return `<span>${item.texto}</span>`;
    }

    return `
      <button
        type="button"
        class="rota-material-click"
        title="Clique para substituir este produto"
        data-rota-trocar-produto="1"
        data-evento-id="${evento.id || rota.evento_id || ""}"
        data-produto-index="${item.index}"
        data-produto-id="${item.id || ""}"
      >${item.texto}</button>
    `;
  }).join("");
}

function produtoDescricaoRota(produto) {
  return [produto.codigo, produto.categoria || produto.tipo, produto.tamanho, produto.cor]
    .filter(Boolean)
    .join(" - ") || "Produto com código";
}


function intervaloEventoRotaDisponibilidade(evento) {
  if (!evento) return { inicio: null, fim: null };

  let inicio = evento.montagem || null;
  let fim = evento.desmontagem || null;

  if (!inicio || !fim) {
    const data = String(evento.data_evento || "").slice(0, 10);
    if (!data) return { inicio: null, fim: null };

    inicio = `${data}T${String(evento.hora_inicio || evento.hora_evento || "00:00").slice(0, 5)}`;
    fim = `${data}T${String(evento.hora_termino || "23:59").slice(0, 5)}`;
  }

  return { inicio, fim };
}

function eventoUsaProdutoRotaPorIdOuCodigo(evento, produto) {
  if (!evento || !Array.isArray(evento.tendas) || !produto) return false;

  const id = String(produto.id || "");
  const codigo = String(produto.codigo || "").trim();

  return evento.tendas.some(item => {
    return (id && String(item.id || "") === id)
      || (codigo && String(item.codigo || "").trim() === codigo);
  });
}

function rtIntervalosEventosConflitamRota(a, b) {
  if (!a?.inicio || !a?.fim || !b?.inicio || !b?.fim) return false;
  return new Date(a.inicio).getTime() < new Date(b.fim).getTime()
    && new Date(a.fim).getTime() > new Date(b.inicio).getTime();
}

function produtoDisponivelParaTrocaRota(produto, evento, ignorarEventosIds = []) {
  if (!produto || !evento) return { livre: false, texto: "Produto inválido" };

  const intervaloAtual = intervaloEventoRotaDisponibilidade(evento);
  if (!intervaloAtual.inicio || !intervaloAtual.fim) return { livre: true, texto: "Sem data definida" };

  const ignorar = new Set((Array.isArray(ignorarEventosIds) ? ignorarEventosIds : [ignorarEventosIds]).map(x => String(x || "")).filter(Boolean));
  ignorar.add(String(evento.id));

  const conflito = (Array.isArray(eventos) ? eventos : []).find(outro => {
    if (!outro || ignorar.has(String(outro.id))) return false;
    if (typeof rtEventoCancelado === "function" && rtEventoCancelado(outro)) return false;
    if (!eventoUsaProdutoRotaPorIdOuCodigo(outro, produto)) return false;

    const intervaloOutro = intervaloEventoRotaDisponibilidade(outro);
    return rtIntervalosEventosConflitamRota(intervaloAtual, intervaloOutro);
  });

  if (conflito) {
    return { livre: false, texto: `Em uso - ${conflito.nome || conflito.cliente || "Cliente"} - ${conflito.data_evento ? formatarDataRota(conflito.data_evento) : "data não informada"}`, conflito, permiteUsoTransito: true };
  }

  return { livre: true, texto: "Disponível" };
}

function rtEventoMontagemEntregueRota(evento) {
  if (!evento?.id) return false;
  const op = obterOperacaoRota(`${evento.id}-montagem`);
  return String(op?.status || "") === "entregue";
}

function rtProdutoMesmoTipoTrocaRota(a, b) {
  if (!a || !b) return false;
  const catA = String(a.categoria || a.tipo || "");
  const catB = String(b.categoria || b.tipo || "");
  const tamA = String(a.tamanho || "");
  const tamB = String(b.tamanho || "");
  return catA === catB && tamA === tamB;
}

function rtPermutaPossivelTrocaRota(produtoNovo, eventoAtual, produtoAntigo) {
  const disponibilidade = produtoDisponivelParaTrocaRota(produtoNovo, eventoAtual);
  const conflito = disponibilidade?.conflito || null;
  if (!conflito || !produtoAntigo) return null;
  if (typeof rtEventoCancelado === "function" && rtEventoCancelado(conflito)) return null;
  if (rtEventoMontagemEntregueRota(conflito)) return null;
  if (!rtProdutoMesmoTipoTrocaRota(produtoNovo, produtoAntigo)) return null;

  const antigoLivreParaConflito = produtoDisponivelParaTrocaRota(produtoAntigo, conflito, [eventoAtual.id, conflito.id]);
  if (!antigoLivreParaConflito.livre) return null;

  const idxProdutoConflito = Array.isArray(conflito.tendas)
    ? conflito.tendas.findIndex(item => {
        const idItem = String(item?.id || "");
        const codItem = String(item?.codigo || "").trim();
        const idNovo = String(produtoNovo?.id || "");
        const codNovo = String(produtoNovo?.codigo || "").trim();
        return (idItem && idNovo && idItem === idNovo) || (codItem && codNovo && codItem === codNovo);
      })
    : -1;

  if (idxProdutoConflito < 0) return null;

  return {
    conflito,
    idxProdutoConflito,
    texto: "Reservada para evento futuro"
  };
}

function produtosDisponiveisParaTrocaRota(produtoAtual, evento) {
  if (!Array.isArray(produtos)) return [];

  const categoriaAtual = produtoAtual?.categoria || produtoAtual?.tipo || "";
  const tamanhoAtual = produtoAtual?.tamanho || "";
  const idsEvento = new Set((evento?.tendas || []).map(p => String(p.id || "")));
  const codigosEvento = new Set((evento?.tendas || []).map(p => String(p.codigo || "").trim()).filter(Boolean));

  return produtos
    .filter(p => {
      if (!p || !p.id) return false;
      if (String(p.id || "") === String(produtoAtual?.id || "")) return false;
      if (String(p.codigo || "").trim() && String(p.codigo || "").trim() === String(produtoAtual?.codigo || "").trim()) return false;
      if (idsEvento.has(String(p.id || ""))) return false;
      if (String(p.codigo || "").trim() && codigosEvento.has(String(p.codigo || "").trim())) return false;

      const mesmaCategoria = String(p.categoria || p.tipo || "") === String(categoriaAtual);
      const mesmoTamanho = String(p.tamanho || "") === String(tamanhoAtual);
      return mesmaCategoria && mesmoTamanho;
    })
    .sort((a, b) => String(a.codigo || "").localeCompare(String(b.codigo || ""), "pt-BR", { numeric: true }));
}

function statusTrocaRotaProduto(p, evento, produtoAtual = null) {
  const status = String(p?.status || "").trim();
  const statusLower = status.toLowerCase();
  const disponibilidade = produtoDisponivelParaTrocaRota(p, evento);

  const statusLivre = ["livre", "livre para locação", "livre para locacao", "disponível", "disponivel"];
  const statusRevisar = (typeof rtProdutoEventoEstaRevisar === "function" && rtProdutoEventoEstaRevisar(p)) || statusLower.includes("revis");
  const statusConsertar = (typeof rtProdutoEventoEstaConsertar === "function" && rtProdutoEventoEstaConsertar(p)) || statusLower.includes("consert");
  const statusAlugadoReservado = statusLower.includes("alug") || statusLower.includes("reserv");

  if (!disponibilidade.livre && disponibilidade.permiteUsoTransito && !statusRevisar && !statusConsertar) {
    return {
      livre: false,
      transito: true,
      conflito: disponibilidade.conflito,
      texto: `${disponibilidade.texto || "Em uso"} | ⚠ Uso em trânsito`
    };
  }

  if (statusRevisar || statusConsertar) {
    if (!disponibilidade.livre) {
      const permutaInfo = produtoAtual ? rtPermutaPossivelTrocaRota(p, evento, produtoAtual) : null;
      if (permutaInfo) {
        return {
          livre: false,
          permuta: true,
          conflito: permutaInfo.conflito,
          idxProdutoConflito: permutaInfo.idxProdutoConflito,
          texto: "Reservada para evento futuro"
        };
      }
      return { livre: false, permuta: false, texto: disponibilidade.texto || "Ocupada no período" };
    }
    return {
      livre: true,
      permuta: false,
      texto: statusConsertar ? "⚠ Para consertar" : "⚠ Para revisar"
    };
  }

  if (!statusLivre.includes(statusLower)) {
    const statusPermutavel = statusLower.includes("alug") || statusLower.includes("reserv");
    const permutaInfo = statusPermutavel && produtoAtual ? rtPermutaPossivelTrocaRota(p, evento, produtoAtual) : null;
    if (permutaInfo) {
      return {
        livre: false,
        permuta: true,
        conflito: permutaInfo.conflito,
        idxProdutoConflito: permutaInfo.idxProdutoConflito,
        texto: "Reservada para evento futuro"
      };
    }

    return {
      livre: false,
      permuta: false,
      texto: status || "Indisponível"
    };
  }

  if (!disponibilidade.livre) {
    const permutaInfo = produtoAtual ? rtPermutaPossivelTrocaRota(p, evento, produtoAtual) : null;
    if (permutaInfo) {
      return {
        livre: false,
        permuta: true,
        conflito: permutaInfo.conflito,
        idxProdutoConflito: permutaInfo.idxProdutoConflito,
        texto: "Reservada para evento futuro"
      };
    }

    return {
      livre: false,
      permuta: false,
      texto: disponibilidade.texto || "Ocupada no período"
    };
  }

  return {
    livre: true,
    permuta: false,
    texto: "Disponível"
  };
}

function garantirModalTrocaProdutoRota() {
  let modal = document.getElementById("rotaTrocaProdutoDialog");

  if (modal) return modal;

  modal = document.createElement("dialog");
  modal.id = "rotaTrocaProdutoDialog";
  modal.className = "modal large-modal rota-troca-produto-dialog";

  modal.innerHTML = `
    <div class="modal-header">
      <h2>Trocar produto da rota</h2>
      <button type="button" class="icon-btn" id="fecharTrocaProdutoRota">×</button>
    </div>

    <div class="rota-troca-produto-body">
      <input type="hidden" id="trocaRotaEventoId">
      <input type="hidden" id="trocaRotaProdutoIndex">

      <div class="troca-produto-atual">
        <span>Produto atual</span>
        <strong id="trocaRotaProdutoAtual">-</strong>
      </div>

      <label class="troca-produto-select-label">
        Novo produto da mesma categoria/tamanho
        <select id="trocaRotaProdutoSelect"></select>
      </label>

      <p class="troca-produto-info">
        A troca será salva no evento e refletirá automaticamente em rotas, agenda e disponibilidade.
      </p>

      <div class="modal-actions">
        <button type="button" class="btn-outline" id="cancelarTrocaProdutoRota">Cancelar</button>
        <button type="button" class="btn-primary" id="confirmarTrocaProdutoRota">Confirmar troca</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  document.getElementById("fecharTrocaProdutoRota")?.addEventListener("click", () => modal.close());
  document.getElementById("cancelarTrocaProdutoRota")?.addEventListener("click", () => modal.close());
  document.getElementById("confirmarTrocaProdutoRota")?.addEventListener("click", confirmarTrocaProdutoRota);

  return modal;
}

function garantirModalPermutaProdutoRota() {
  let modal = document.getElementById("rotaPermutaProdutoDialog");
  if (modal) return modal;

  modal = document.createElement("dialog");
  modal.id = "rotaPermutaProdutoDialog";
  modal.className = "modal rota-permuta-produto-dialog";
  modal.innerHTML = `
    <div class="modal-header">
      <h2>Troca rápida</h2>
      <button type="button" class="icon-btn" data-permuta-acao="cancelar">×</button>
    </div>
    <div class="rota-permuta-body">
      <div class="rota-permuta-alerta">⚠ Reservada para evento futuro.</div>
      <div class="rota-permuta-actions">
        <button type="button" class="btn-primary" data-permuta-acao="permutar">Permutar</button>
        <button type="button" class="btn-outline" data-permuta-acao="outra">Escolher outra</button>
        <button type="button" class="btn-outline" data-permuta-acao="cancelar">Cancelar</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  return modal;
}

function confirmarPermutaProdutoRota() {
  const modal = garantirModalPermutaProdutoRota();
  return new Promise(resolve => {
    const limpar = () => {
      modal.querySelectorAll("[data-permuta-acao]").forEach(btn => btn.removeEventListener("click", onClick));
      modal.removeEventListener("cancel", onCancel);
    };
    const fechar = valor => {
      limpar();
      try { modal.close(); } catch {}
      resolve(valor);
    };
    const onClick = ev => {
      const acao = ev.currentTarget?.dataset?.permutaAcao;
      if (acao === "permutar") return fechar("permutar");
      if (acao === "outra") return fechar("outra");
      return fechar("cancelar");
    };
    const onCancel = ev => {
      ev.preventDefault();
      fechar("cancelar");
    };
    modal.querySelectorAll("[data-permuta-acao]").forEach(btn => btn.addEventListener("click", onClick));
    modal.addEventListener("cancel", onCancel);
    modal.showModal();
  });
}


function rtProdutoPorTextoTrocaRota(texto) {
  const raw = String(texto || "").trim();
  if (!raw) return null;
  const lista = Array.isArray(produtos) ? produtos : [];
  const codigo = (raw.match(/^\s*([^\s-]+)/) || [])[1] || "";
  const norm = raw.toLowerCase().replace(/\s+/g, " ").trim();
  return lista.find(p => {
    const cod = String(p.codigo || p.id || p.numero || "").trim();
    const desc = produtoDescricaoRota(p).toLowerCase().replace(/\s+/g, " " ).trim();
    return (codigo && cod && cod === codigo) || desc === norm || norm.includes(desc) || desc.includes(norm);
  }) || null;
}

function rtPseudoProdutoTrocaAtendimento(texto) {
  const achado = rtProdutoPorTextoTrocaRota(texto);
  if (achado) return achado;
  const raw = String(texto || "").trim();
  const partes = raw.split(/\s+-\s+/).map(x => x.trim()).filter(Boolean);
  return {
    id: raw,
    codigo: partes[0] || "",
    categoria: partes[1] || "Tenda",
    tipo: partes[1] || "Tenda",
    tamanho: partes[2] || rtTamanhoProduto({ descricao: raw, tamanho: raw }) || "",
    cor: partes[3] || "",
    descricao: raw
  };
}

function rtListaTendasEntrarAtendimento(item) {
  const val = String(item?.tenda_entrar || item?.tendas_entrar || "").trim();
  if (!val) return [];
  return val.split(/\s*[,;]\s*/).map(v => v.trim()).filter(Boolean);
}

function rtEncontrarAtendimentoExtraEvento(evento, atendimentoId) {
  const lista = Array.isArray(evento?.produtos_extras) ? evento.produtos_extras : [];
  return lista.find(x => String(x?.id || "") === String(atendimentoId || ""));
}

async function abrirTrocaProdutoAtendimentoExtraRota(eventoId, produtoIndex) {
  if (typeof carregarProdutos === "function") {
    try { await carregarProdutos(); } catch {}
  }

  const partes = String(produtoIndex || "").split(":");
  const atendimentoId = partes[1] || "";
  const tendaIdx = Number(partes[2] || 0);
  const evento = (Array.isArray(eventos) ? eventos : []).find(e => String(e.id) === String(eventoId));
  const atendimento = rtEncontrarAtendimentoExtraEvento(evento, atendimentoId);
  const tendas = rtListaTendasEntrarAtendimento(atendimento);
  const textoAtual = tendas[tendaIdx] || atendimento?.tenda_entrar || "";

  if (!evento || !atendimento || !textoAtual) {
    alert("Atendimento extra não encontrado para troca de produto.");
    return;
  }

  const produtoAtual = rtPseudoProdutoTrocaAtendimento(textoAtual);
  const opcoes = produtosDisponiveisParaTrocaRota(produtoAtual, evento);
  const modal = garantirModalTrocaProdutoRota();

  document.getElementById("trocaRotaEventoId").value = evento.id;
  document.getElementById("trocaRotaProdutoIndex").value = produtoIndex;
  document.getElementById("trocaRotaProdutoAtual").textContent = rtFormatarTendaTroca(textoAtual);

  const select = document.getElementById("trocaRotaProdutoSelect");
  if (!opcoes.length) {
    select.innerHTML = `<option value="">Nenhum produto compatível encontrado</option>`;
    document.getElementById("confirmarTrocaProdutoRota").disabled = true;
  } else {
    const opcoesComStatus = opcoes.map(p => {
      const st = statusTrocaRotaProduto(p, evento);
      return { produto: p, livre: st.livre, transito: !!st.transito, texto: st.texto, statusAviso: st.texto && st.texto !== "Disponível" && (st.livre || st.permuta || st.transito) };
    });
    select.innerHTML = `
      <option value="">Selecione o produto substituto</option>
      ${opcoesComStatus.map(item => `
        <option value="${item.produto.id}" ${(item.livre || item.transito) ? "" : "disabled"}>
          ${produtoDescricaoRota(item.produto)} | ${item.statusAviso ? item.texto : (item.livre ? "Disponível" : item.texto)}
        </option>
      `).join("")}
    `;
    document.getElementById("confirmarTrocaProdutoRota").disabled = !opcoesComStatus.some(item => item.livre || item.transito);
  }

  modal.showModal();
}

async function confirmarTrocaProdutoAtendimentoExtraRota(eventoId, produtoIndex, novoProdutoId) {
  if (!eventoId || !produtoIndex || !novoProdutoId) {
    alert("Selecione um produto para realizar a troca.");
    return;
  }

  const partes = String(produtoIndex || "").split(":");
  const atendimentoId = partes[1] || "";
  const tendaIdx = Number(partes[2] || 0);
  const evento = (Array.isArray(eventos) ? eventos : []).find(e => String(e.id) === String(eventoId));
  const novoProduto = (Array.isArray(produtos) ? produtos : []).find(p => String(p.id) === String(novoProdutoId));
  const atendimento = rtEncontrarAtendimentoExtraEvento(evento, atendimentoId);
  const tendas = rtListaTendasEntrarAtendimento(atendimento);
  const antigoTexto = tendas[tendaIdx] || atendimento?.tenda_entrar || "";

  if (!evento || !novoProduto || !atendimento || !antigoTexto) {
    alert("Não foi possível localizar o atendimento extra ou o produto selecionado.");
    return;
  }

  const produtoAtual = rtPseudoProdutoTrocaAtendimento(antigoTexto);
  if (String(produtoAtual.id || "") === String(novoProduto.id || "") ||
      (String(produtoAtual.codigo || "").trim() && String(produtoAtual.codigo || "").trim() === String(novoProduto.codigo || "").trim())) {
    alert("O produto escolhido é o mesmo produto atual.");
    return;
  }

  if (typeof rtConfirmarUsoProdutoRevisar === "function" && typeof rtProdutoEventoExigeConfirmacao === "function" && rtProdutoEventoExigeConfirmacao(novoProduto)) {
    const permitidoRevisao = await rtConfirmarUsoProdutoRevisar(novoProduto, evento);
    if (!permitidoRevisao) return;
  }

  const validacaoTroca = produtoDisponivelParaTrocaRota(novoProduto, evento);
  if (!validacaoTroca.livre) {
    alert(validacaoTroca.texto || "Este produto não está disponível para este atendimento.");
    return;
  }

  const novoTexto = produtoDescricaoRota(novoProduto);
  tendas[tendaIdx] = novoTexto;
  atendimento.tenda_entrar = tendas.join("; ");

  evento.atualizado_em = new Date().toISOString();
  evento.colaborador = typeof getColaboradorLogado === "function" ? getColaboradorLogado() : evento.colaborador;

  const salvo = typeof salvarEventoBanco === "function" ? await salvarEventoBanco(evento) : null;
  if (!salvo) {
    alert("Não foi possível salvar a troca no atendimento extra.");
    return;
  }

  const idx = eventos.findIndex(e => String(e.id) === String(evento.id));
  if (idx >= 0) eventos[idx] = salvo;

  document.getElementById("rotaTrocaProdutoDialog")?.close();

  if (typeof carregarEventos === "function") await carregarEventos();
  if (typeof renderizarEventos === "function") renderizarEventos();
  if (typeof renderizarCalendario === "function") renderizarCalendario();
  renderizarRotas();
  window.dispatchEvent(new CustomEvent("riotendas:eventos-atualizados"));

  if (typeof registrarLogSistema === "function") {
    registrarLogSistema({
      modulo: "Rotas",
      acao: "Troca rápida de atendimento extra",
      registro_id: evento.id,
      registro_nome: evento.nome || "Evento",
      antes: antigoTexto,
      depois: novoTexto,
      detalhes: `${rtFormatarTendaTroca(antigoTexto)} → ${novoTexto}`
    });
  }

  alert(`Produto trocado:\n${rtFormatarTendaTroca(antigoTexto)}\n→ ${novoTexto}`);
}

async function abrirTrocaProdutoRota(eventoId, produtoIndex) {
  if (String(produtoIndex || "").startsWith("extra:")) {
    return abrirTrocaProdutoAtendimentoExtraRota(eventoId, produtoIndex);
  }

  if (typeof carregarProdutos === "function") {
    try { await carregarProdutos(); } catch {}
  }

  const evento = (Array.isArray(eventos) ? eventos : []).find(e => String(e.id) === String(eventoId));
  if (!evento) {
    alert("Evento não encontrado para troca de produto.");
    return;
  }

  const index = Number(produtoIndex);
  const produtoAtual = evento.tendas?.[index];

  if (!produtoAtual) {
    alert("Produto não encontrado neste evento.");
    return;
  }

  const opcoes = produtosDisponiveisParaTrocaRota(produtoAtual, evento);
  const modal = garantirModalTrocaProdutoRota();

  document.getElementById("trocaRotaEventoId").value = evento.id;
  document.getElementById("trocaRotaProdutoIndex").value = String(index);
  document.getElementById("trocaRotaProdutoAtual").textContent = produtoDescricaoRota(produtoAtual);

  const select = document.getElementById("trocaRotaProdutoSelect");

  if (!opcoes.length) {
    select.innerHTML = `<option value="">Nenhum produto compatível encontrado</option>`;
    document.getElementById("confirmarTrocaProdutoRota").disabled = true;
  } else {
    const opcoesComStatus = opcoes.map(p => {
      const st = statusTrocaRotaProduto(p, evento, produtoAtual);
      return { produto: p, livre: st.livre, permuta: !!st.permuta, transito: !!st.transito, texto: st.texto, statusAviso: st.texto && st.texto !== "Disponível" && (st.livre || st.permuta || st.transito) };
    });

    select.innerHTML = `
      <option value="">Selecione o produto substituto</option>
      ${opcoesComStatus.map(item => `
        <option value="${item.produto.id}" ${(item.livre || item.permuta || item.transito) ? "" : "disabled"} data-permuta="${item.permuta ? "1" : "0"}" data-transito="${item.transito ? "1" : "0"}">
          ${produtoDescricaoRota(item.produto)} | ${item.statusAviso ? item.texto : (item.livre ? "Disponível" : item.texto)}
        </option>
      `).join("")}
    `;

    document.getElementById("confirmarTrocaProdutoRota").disabled = !opcoesComStatus.some(item => item.livre || item.permuta || item.transito);
  }

  modal.showModal();
}

async function confirmarTrocaProdutoRota() {
  const eventoId = document.getElementById("trocaRotaEventoId")?.value;
  const produtoIndexRaw = document.getElementById("trocaRotaProdutoIndex")?.value;
  const novoProdutoId = document.getElementById("trocaRotaProdutoSelect")?.value;

  if (String(produtoIndexRaw || "").startsWith("extra:")) {
    return confirmarTrocaProdutoAtendimentoExtraRota(eventoId, produtoIndexRaw, novoProdutoId);
  }

  const produtoIndex = Number(produtoIndexRaw);

  if (!eventoId || !Number.isFinite(produtoIndex) || !novoProdutoId) {
    alert("Selecione um produto para realizar a troca.");
    return;
  }

  const evento = (Array.isArray(eventos) ? eventos : []).find(e => String(e.id) === String(eventoId));
  const novoProduto = (Array.isArray(produtos) ? produtos : []).find(p => String(p.id) === String(novoProdutoId));

  if (!evento || !novoProduto) {
    alert("Não foi possível localizar o evento ou o produto selecionado.");
    return;
  }

  const produtoAntigo = evento.tendas?.[produtoIndex];

  if (!produtoAntigo) {
    alert("Produto antigo não encontrado no evento.");
    return;
  }

  if (String(produtoAntigo.id || "") === String(novoProduto.id || "") ||
      (String(produtoAntigo.codigo || "").trim() && String(produtoAntigo.codigo || "").trim() === String(novoProduto.codigo || "").trim())) {
    alert("O produto escolhido é o mesmo produto atual.");
    return;
  }

  if (typeof rtConfirmarUsoProdutoRevisar === "function" && typeof rtProdutoEventoExigeConfirmacao === "function" && rtProdutoEventoExigeConfirmacao(novoProduto)) {
    const permitidoRevisao = await rtConfirmarUsoProdutoRevisar(novoProduto, evento);
    if (!permitidoRevisao) {
      const select = document.getElementById("trocaRotaProdutoSelect");
      if (select) {
        select.value = "";
        select.focus();
      }
      return;
    }
  }

  const validacaoTroca = produtoDisponivelParaTrocaRota(novoProduto, evento);
  let permutaInfo = null;
  let aplicarPermuta = false;
  let aplicarUsoTransito = false;

  if (!validacaoTroca.livre) {
    const statusNovoLower = String(novoProduto.status || "").toLowerCase();
    const podeTransito = validacaoTroca.permiteUsoTransito && (statusNovoLower.includes("alug") || statusNovoLower.includes("reserv") || validacaoTroca.conflito);
    if (podeTransito && typeof rtConfirmarUsoEmTransito === "function" && rtConfirmarUsoEmTransito(novoProduto, validacaoTroca, evento)) {
      aplicarUsoTransito = true;
    } else {
      permutaInfo = rtPermutaPossivelTrocaRota(novoProduto, evento, produtoAntigo);

      if (!permutaInfo) {
        alert(validacaoTroca.texto || "Este produto não está disponível para este evento.");
        return;
      }

    const acaoPermuta = await confirmarPermutaProdutoRota();
    if (acaoPermuta === "outra") {
      const select = document.getElementById("trocaRotaProdutoSelect");
      if (select) {
        select.value = "";
        select.focus();
      }
      return;
    }
      if (acaoPermuta !== "permutar") {
        document.getElementById("rotaTrocaProdutoDialog")?.close();
        return;
      }

      aplicarPermuta = true;
    }
  }

  const produtoNovoEvento = {
    id: novoProduto.id,
    codigo: novoProduto.codigo || "",
    categoria: novoProduto.categoria || novoProduto.tipo || "",
    tipo: novoProduto.tipo || novoProduto.categoria || "",
    tamanho: novoProduto.tamanho || "",
    cor: novoProduto.cor || ""
  };

  if (aplicarUsoTransito && typeof rtAplicarUsoEmTransitoProduto === "function") {
    rtAplicarUsoEmTransitoProduto(produtoNovoEvento, validacaoTroca);
  }

  const produtoAntigoEvento = {
    id: produtoAntigo.id || "",
    codigo: produtoAntigo.codigo || "",
    categoria: produtoAntigo.categoria || produtoAntigo.tipo || "",
    tipo: produtoAntigo.tipo || produtoAntigo.categoria || "",
    tamanho: produtoAntigo.tamanho || "",
    cor: produtoAntigo.cor || ""
  };

  evento.tendas[produtoIndex] = produtoNovoEvento;

  if (aplicarPermuta && permutaInfo?.conflito && Number.isFinite(permutaInfo.idxProdutoConflito)) {
    permutaInfo.conflito.tendas[permutaInfo.idxProdutoConflito] = produtoAntigoEvento;
    permutaInfo.conflito.atualizado_em = new Date().toISOString();
    permutaInfo.conflito.colaborador = typeof getColaboradorLogado === "function" ? getColaboradorLogado() : permutaInfo.conflito.colaborador;
  }

  evento.atualizado_em = new Date().toISOString();
  evento.colaborador = typeof getColaboradorLogado === "function" ? getColaboradorLogado() : evento.colaborador;

  const salvo = typeof salvarEventoBanco === "function"
    ? await salvarEventoBanco(evento)
    : null;

  if (!salvo) {
    alert("Não foi possível salvar a troca no evento.");
    return;
  }

  let salvoPermuta = null;
  if (aplicarPermuta && permutaInfo?.conflito) {
    salvoPermuta = typeof salvarEventoBanco === "function" ? await salvarEventoBanco(permutaInfo.conflito) : null;
    if (!salvoPermuta) {
      alert("A troca principal foi salva, mas não foi possível salvar a permuta do evento futuro. Verifique o outro evento antes de continuar.");
    }
  }

  const idx = eventos.findIndex(e => String(e.id) === String(evento.id));
  if (idx >= 0) eventos[idx] = salvo;
  if (salvoPermuta) {
    const idxPermuta = eventos.findIndex(e => String(e.id) === String(salvoPermuta.id));
    if (idxPermuta >= 0) eventos[idxPermuta] = salvoPermuta;
  }

  document.getElementById("rotaTrocaProdutoDialog")?.close();

  if (typeof carregarEventos === "function") await carregarEventos();
  if (typeof renderizarEventos === "function") renderizarEventos();
  if (typeof renderizarCalendario === "function") renderizarCalendario();

  renderizarRotas();

  window.dispatchEvent(new CustomEvent("riotendas:eventos-atualizados"));

  if (typeof registrarLogSistema === "function") {
    registrarLogSistema({
      modulo: "Rotas",
      acao: aplicarPermuta ? "Troca rápida com permuta" : "Troca rápida de produto",
      registro_id: evento.id,
      registro_nome: evento.nome || "Evento",
      antes: produtoAntigo,
      depois: evento.tendas[produtoIndex],
      detalhes: aplicarPermuta && permutaInfo?.conflito
        ? `${produtoDescricaoRota(produtoAntigo)} ↔ ${produtoDescricaoRota(novoProduto)}`
        : `${produtoDescricaoRota(produtoAntigo)} → ${produtoDescricaoRota(novoProduto)}`
    });
  }

  alert(`Produto trocado:\n${produtoDescricaoRota(produtoAntigo)}\n→ ${produtoDescricaoRota(novoProduto)}`);
}

function criarRotasDosEventos() {
  const listaEventos = Array.isArray(eventos) ? eventos : [];

  const rotas = [];

  listaEventos.forEach(evento => {
    if (typeof rtEventoCancelado === "function" && rtEventoCancelado(evento)) return;
    if (evento.montagem) {
      rotas.push({
        id: `${evento.id}-montagem`,
        evento_id: evento.id,
        tipo: "Montagem",
        data: dataKeyDeDateTime(evento.montagem),
        horario: horaDeDateTime(evento.montagem),
        tipoHorario: evento.montagem_tipo || "A partir de",
        cliente: evento.nome || "-",
        telefone: evento.telefone || "-",
        endereco: (typeof rtEnderecoCompleto === "function" ? rtEnderecoCompleto(evento) : evento.endereco) || "-",
        materiais: montarListaMateriais(evento),
        evento
      });
    }

    if (evento.desmontagem) {
      rotas.push({
        id: `${evento.id}-desmontagem`,
        evento_id: evento.id,
        tipo: "Desmontagem",
        data: dataKeyDeDateTime(evento.desmontagem),
        horario: horaDeDateTime(evento.desmontagem),
        tipoHorario: evento.desmontagem_tipo || "A partir de",
        cliente: evento.nome || "-",
        telefone: evento.telefone || "-",
        endereco: (typeof rtEnderecoCompleto === "function" ? rtEnderecoCompleto(evento) : evento.endereco) || "-",
        materiais: montarListaMateriais(evento),
        evento
      });
    }


    const atendimentos = typeof rtAtendimentosExtrasRecorrente === "function" ? rtAtendimentosExtrasRecorrente(evento) : [];
    atendimentos.forEach(item => {
      const dh = typeof rtDataHoraAtendimentoExtra === "function" ? rtDataHoraAtendimentoExtra(item) : { data: item.data, hora: item.hora };
      if (!dh.data) return;
      rotas.push({
        id: `${evento.id}-atendimento-${item.id || dh.data}`,
        evento_id: evento.id,
        tipo: item.tipo || "Atendimento extra",
        data: dh.data,
        horario: dh.hora || "",
        tipoHorario: "Atendimento extra",
        cliente: `${(item.tipo || "Atendimento").toUpperCase()} — ${evento.nome || "-"}`,
        telefone: evento.telefone || "-",
        endereco: (typeof rtEnderecoCompleto === "function" ? rtEnderecoCompleto(evento) : evento.endereco) || "-",
        materiais: (String(item.tipo || "").toLowerCase().includes("troca") && item.tenda_entrar)
          ? [rtFormatarTendaTroca(item.tenda_entrar)]
          : (item.observacao ? [item.observacao] : montarListaMateriais(evento)),
        evento,
        atendimentoExtra: item
      });
    });
  });

  return rotas;
}

function filtrarRotas(rotas) {
  const periodo = document.getElementById("rotaPeriodo")?.value || "30";
  const mes = document.getElementById("rotaMes").value;
  const data = document.getElementById("rotaData").value;
  const tipo = document.getElementById("rotaTipoFiltro").value;
  const carro = document.getElementById("rotaCarroFiltro").value;

  const hoje = dataLocalISO(new Date());
  const limite7 = somarDiasDataISO(7);
  const limite15 = somarDiasDataISO(15);
  const limite30 = somarDiasDataISO(30);

  return rotas.filter(rota => {
    const carroRota = rotasCarros[rota.id] || "Sem carro";

    let passaPeriodo = true;

    if (periodo === "7") {
      passaPeriodo = rota.data >= hoje && rota.data <= limite7;
    } else if (periodo === "15") {
      passaPeriodo = rota.data >= hoje && rota.data <= limite15;
    } else if (periodo === "30") {
      passaPeriodo = rota.data >= hoje && rota.data <= limite30;
    } else if (periodo === "mes") {
      passaPeriodo = !mes || rota.data.startsWith(mes);
    } else if (periodo === "data") {
      passaPeriodo = !data || rota.data === data;
    }

    return passaPeriodo
      && (!tipo || rota.tipo === tipo)
      && (!carro || carroRota === carro);
  });
}

function agruparPorDataECarro(rotas) {
  const grupos = {};

  rotas.forEach(rota => {
    const carro = rotasCarros[rota.id] || "Sem carro";

    if (!grupos[rota.data]) grupos[rota.data] = {};
    if (!grupos[rota.data][carro]) grupos[rota.data][carro] = [];

    grupos[rota.data][carro].push(rota);
  });

  Object.values(grupos).forEach(grupoCarros => {
    Object.values(grupoCarros).forEach(lista => {
      lista.sort((a, b) => String(a.horario || "").localeCompare(String(b.horario || "")));
    });
  });

  return grupos;
}



// v19-dev: contador operacional resumido por carro
function rtNormalizarTexto(txt) {
  return String(txt || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function rtQuantidadeItem(item) {
  const q = Number(item?.quantidade ?? item?.qtd ?? item?.quantidade_total ?? item?.qtde ?? 1);
  return Number.isFinite(q) && q > 0 ? q : 1;
}

function rtTamanhoProduto(item) {
  const textoBruto = [item?.tamanho, item?.medida, item?.categoria, item?.tipo, item?.nome, item?.descricao, item?.codigo].filter(Boolean).join(" ");
  const texto = rtNormalizarTexto(textoBruto);
  const achado = String(textoBruto).match(/(10x10|8x8|6x6|6x3|5x5|4[,.]5x3|4x4|3x3)/i);
  if (achado) return achado[1].replace(",", ".");
  if (texto.includes("4.5x3") || texto.includes("4,5x3") || texto.includes("4.50x3") || texto.includes("4,50x3")) return "4.5x3";
  if (texto.includes("10x10")) return "10x10";
  if (texto.includes("8x8")) return "8x8";
  if (texto.includes("6x6")) return "6x6";
  if (texto.includes("6x3")) return "6x3";
  if (texto.includes("5x5")) return "5x5";
  if (texto.includes("4x4")) return "4x4";
  if (texto.includes("3x3")) return "3x3";
  return "";
}

function rtTipoApoioResumo(item) {
  const texto = rtNormalizarTexto([item?.nome, item?.descricao, item?.categoria, item?.tipo].filter(Boolean).join(" "));
  if (texto.includes("ombrel") || texto.includes("omb")) return "omb";
  if (texto.includes("lateral") || texto.includes("laterais")) return "lat";
  if (texto.includes("cadeira") || texto.includes(" banco") || texto.startsWith("banco")) return "cad";
  if (texto.includes("mesa")) return "mes";
  return "";
}

function rtCorMaterialResumo(item, textoExtra = "") {
  const texto = rtNormalizarTexto([
    item?.cor,
    item?.nome,
    item?.descricao,
    item?.categoria,
    item?.tipo,
    textoExtra
  ].filter(Boolean).join(" "));

  if (texto.includes("crist")) return "Crist";
  if (texto.includes("branca") || texto.includes("branco")) return "Br";
  if (texto.includes("preta") || texto.includes("preto")) return "Preta";
  if (texto.includes("azul")) return "Azul";
  if (texto.includes("verde")) return "Verde";
  if (texto.includes("vermel")) return "Verm";
  if (texto.includes("amarel")) return "Amar";
  return "";
}

function rtTipoMaterialResumo(item, textoExtra = "") {
  const texto = rtNormalizarTexto([
    item?.nome,
    item?.descricao,
    item?.categoria,
    item?.tipo,
    item?.material,
    textoExtra
  ].filter(Boolean).join(" "));

  if (texto.includes("plast")) return "Plast";
  if (texto.includes("madeira") || texto.includes("mad")) return "Mad";
  if (texto.includes("crist")) return "Crist";
  if (texto.includes("branca") || texto.includes("branco")) return "Br";
  return "";
}

function rtLateralResumo(item, textoExtra = "") {
  const texto = rtNormalizarTexto([
    item?.nome,
    item?.descricao,
    item?.categoria,
    item?.tipo,
    item?.material,
    textoExtra
  ].filter(Boolean).join(" "));

  const m = texto.match(/(?:lateral|laterais)?\s*(10|8|6|5|4[,.]?5|4|3)\s*m?\b/i)
    || texto.match(/\b(10|8|6|5|4[,.]?5|4|3)\s*m\b/i);
  if (m && m[1]) return `Lat ${String(m[1]).replace(".", ",")}m`;
  return "Lat";
}

function rtAdicionarContagemMapa(mapa, chave, qtd) {
  if (!chave) return;
  mapa[chave] = (mapa[chave] || 0) + (Number(qtd) || 0);
}

function rtCargaOperacionalConfigAtual() {
  const padrao = {
    pontosItens: {
      tenda_3x3: 0.5,
      tenda_4_5x3: 1,
      tenda_4x4: 1,
      tenda_5x5: 1.5,
      tenda_6x3: 1,
      tenda_6x6: 2,
      tenda_8x8: 2.5,
      tenda_10x10: 3,
      ombrelone: 0.5,
      mesa_plastica: 0.10,
      mesa_madeira: 0.15,
      cadeira_plastica: 0.05,
      cadeira_madeira: 0.08,
      caixa_190: 0.30,
      caixa_360: 0.50,
      lateral: 0.10,
      outros: 0
    },
    capacidadeVeiculos: {}
  };

  try {
    const config = (typeof carregarConfiguracoes === "function") ? carregarConfiguracoes() : (window.configRioTendas || {});
    const carga = config?.cargaOperacional || {};
    return {
      ...padrao,
      ...carga,
      pontosItens: { ...(padrao.pontosItens || {}), ...((carga.pontosItens) || {}) },
      capacidadeVeiculos: { ...(padrao.capacidadeVeiculos || {}), ...((carga.capacidadeVeiculos) || {}) }
    };
  } catch (erro) {
    return padrao;
  }
}

function rtChaveTendaCarga(tamanho) {
  return `tenda_${String(tamanho || "").replace(",", ".").replace(".", "_").replace("x", "x")}`;
}

function rtChaveApoioCarga(tipoApoio, subtipo = "", texto = "") {
  const n = rtNormalizarTexto([subtipo, texto].filter(Boolean).join(" "));

  if (tipoApoio === "mes") {
    if (n.includes("mad")) return "mesa_madeira";
    return "mesa_plastica";
  }

  if (tipoApoio === "cad") {
    if (n.includes("mad")) return "cadeira_madeira";
    return "cadeira_plastica";
  }

  if (tipoApoio === "omb") return "ombrelone";
  if (n.includes("190")) return "caixa_190";
  if (n.includes("360")) return "caixa_360";
  if (n.includes("lateral")) return "lateral";

  return "outros";
}

function rtPontosOperacionaisPorChave(chave, qtd) {
  const config = rtCargaOperacionalConfigAtual();
  const valor = Number((config.pontosItens || {})[chave]);
  return (Number.isFinite(valor) ? valor : 0) * (Number(qtd) || 0);
}

function rtPesoOperacionalTenda(tamanho, qtd) {
  return rtPontosOperacionaisPorChave(rtChaveTendaCarga(tamanho), qtd);
}

function rtFormatoContagemMapa(mapa) {
  return Object.entries(mapa)
    .filter(([, qtd]) => qtd)
    .map(([chave, qtd]) => `${rtNumeroCurto(qtd)} ${chave}`);
}

function rtResumoCargaCarro(listaRotas = [], carro = "") {
  const tendas = {};
  const mesas = {};
  const cadeiras = {};
  const laterais = {};
  const outros = {};

  let pontosTendas = 0;
  let totalMesas = 0;
  let totalCadeiras = 0;
  let totalOmbrelones = 0;
  let totalLaterais = 0;
  let cargaPts = 0;

  function processarItem(item, textoExtra = "") {
    const qtd = rtQuantidadeItem(item);
    const tamanho = rtTamanhoProduto({ ...item, descricao: [item?.descricao, textoExtra].filter(Boolean).join(" ") });
    const tipoApoio = rtTipoApoioResumo({ ...item, descricao: [item?.descricao, textoExtra].filter(Boolean).join(" ") });

    if (tamanho) {
      const cor = rtCorMaterialResumo(item, textoExtra);
      rtAdicionarContagemMapa(tendas, `${tamanho}${cor ? " " + cor : ""}`, qtd);
      const pontosItemTenda = rtPesoOperacionalTenda(tamanho, qtd);
      pontosTendas += pontosItemTenda;
      cargaPts += pontosItemTenda;
      return;
    }

    if (tipoApoio === "mes") {
      const subtipo = rtTipoMaterialResumo(item, textoExtra);
      rtAdicionarContagemMapa(mesas, `Mes${subtipo ? " " + subtipo : ""}`, qtd);
      totalMesas += qtd;
      cargaPts += rtPontosOperacionaisPorChave(rtChaveApoioCarga("mes", subtipo, [item?.nome, item?.descricao, textoExtra].filter(Boolean).join(" ")), qtd);
      return;
    }

    if (tipoApoio === "cad") {
      const subtipo = rtTipoMaterialResumo(item, textoExtra);
      rtAdicionarContagemMapa(cadeiras, `Cad${subtipo ? " " + subtipo : ""}`, qtd);
      totalCadeiras += qtd;
      cargaPts += rtPontosOperacionaisPorChave(rtChaveApoioCarga("cad", subtipo, [item?.nome, item?.descricao, textoExtra].filter(Boolean).join(" ")), qtd);
      return;
    }

    if (tipoApoio === "lat") {
      const lateral = rtLateralResumo(item, textoExtra);
      rtAdicionarContagemMapa(laterais, lateral, qtd);
      totalLaterais += qtd;
      cargaPts += rtPontosOperacionaisPorChave("lateral", qtd);
      return;
    }

    if (tipoApoio === "omb") {
      rtAdicionarContagemMapa(outros, "Omb", qtd);
      totalOmbrelones += qtd;
      cargaPts += rtPontosOperacionaisPorChave("ombrelone", qtd);
    }
  }

  (listaRotas || []).forEach(rota => {
    if (rotaEhDesmontagem(rota)) return;
    const evento = rota.evento || {};

    if (rota.atendimentoExtra && String(rota.atendimentoExtra.tipo || "").toLowerCase().includes("troca")) {
      rtTendasNovasAtendimento(rota).forEach(txt => processarItem({ descricao: txt, tamanho: txt }, txt));
      return;
    }

    (evento.tendas || []).forEach(item => processarItem(item));
    (typeof rtProdutosReservaEvento === "function" ? rtProdutosReservaEvento(evento) : []).forEach(item => processarItem(item));
    [
      ...(evento.itens_apoio || []),
      ...(typeof rtProdutosExtrasOperacionais === "function" ? rtProdutosExtrasOperacionais(evento) : (evento.produtos_extras || []))
    ].forEach(item => processarItem(item));
  });

  const linhaDetalhada = [
    ...rtFormatoContagemMapa(tendas),
    ...rtFormatoContagemMapa(mesas),
    ...rtFormatoContagemMapa(cadeiras),
    ...rtFormatoContagemMapa(laterais),
    ...rtFormatoContagemMapa(outros)
  ].join(" • ");

  const resumoOperacional = [];
  if (pontosTendas) resumoOperacional.push(`T${rtNumeroCurto(pontosTendas)}`);
  if (totalMesas) resumoOperacional.push(`M${rtNumeroCurto(totalMesas)}`);
  if (totalCadeiras) resumoOperacional.push(`C${rtNumeroCurto(totalCadeiras)}`);
  if (totalLaterais) resumoOperacional.push(`L${rtNumeroCurto(totalLaterais)}`);
  if (totalOmbrelones) resumoOperacional.push(`O${rtNumeroCurto(totalOmbrelones)}`);

  const linhas = [];

  if (linhaDetalhada) linhas.push(linhaDetalhada);

  const configCargaFinal = rtCargaOperacionalConfigAtual();
  const capacidades = configCargaFinal.capacidadeVeiculos || {};
  const capacidade = Number(capacidades[carro] ?? capacidades[String(carro || "").trim()] ?? 0);
  const cargaArredondada = Math.round(cargaPts * 10) / 10;
  let textoCarga = cargaPts ? `Carga ${rtNumeroCurto(cargaArredondada)} pts` : "";

  if (cargaPts && capacidade > 0) {
    const percentual = cargaArredondada / capacidade;
    const statusCarga = percentual > 1 ? "🔴 Excesso" : (percentual >= 0.85 ? "🟡 Cheio" : "🟢 OK");
    textoCarga = `Carga ${rtNumeroCurto(cargaArredondada)} / ${rtNumeroCurto(capacidade)} pts ${statusCarga}`;
  }

  const linhaOperacional = [
    resumoOperacional.join(" • "),
    textoCarga
  ].filter(Boolean).join(" • ");

  if (linhaOperacional) linhas.push(linhaOperacional);

  return linhas.length ? linhas : ["Sem material de montagem neste carro"];
}

function rtPrimeiroNomeCliente(nome) {
  const visual = typeof rtTextoVisual === "function" ? rtTextoVisual(nome) : String(nome || "-");
  return String(visual || "-").trim().split(/\s+/)[0] || "-";
}

function rtBairroEndereco(endereco) {
  const textoOriginal = String(endereco || "").trim();
  if (!textoOriginal) return "-";

  function limparBairro(valor) {
    return String(valor || "")
      .replace(/\bcep\b[:\s-]*[\d.-]*/ig, "")
      .replace(/\b(rio de janeiro|rj|brasil|brazil)\b/ig, "")
      .replace(/^[\d\s.,º°ª/-]+/, "")
      .replace(/[\d\s.,º°ª/-]+$/, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  const ignorar = p => {
    const n = rtNormalizarTexto(p);
    return !n || /\b(rio de janeiro|rj|brasil|brazil|cep)\b/.test(n);
  };

  const partes = textoOriginal
    .split(",")
    .map(p => p.trim())
    .filter(Boolean)
    .filter(p => !ignorar(p));

  const candidatos = [];

  partes.forEach(parte => {
    const pedacos = parte.split(/\s+-\s+/).map(p => p.trim()).filter(Boolean);
    if (pedacos.length > 1) candidatos.push(pedacos[pedacos.length - 1]);
    candidatos.push(parte);
  });

  const palavrasLogradouro = /\b(rua|av|avenida|estrada|rodovia|travessa|praça|praca|alameda|largo|condominio|condomínio|bloco|apto|apartamento|casa|loja|sala)\b/i;
  const validos = candidatos
    .map(limparBairro)
    .filter(Boolean)
    .filter(c => !ignorar(c))
    .filter(c => !palavrasLogradouro.test(c) || !/\d/.test(c));

  return validos.length ? validos[validos.length - 1] : (limparBairro(partes[partes.length - 1]) || "-");
}

function rtPontosTendasEvento(evento) {
  let pontos = 0;
  [...(evento?.tendas || []), ...(typeof rtProdutosReservaEvento === "function" ? rtProdutosReservaEvento(evento) : [])].forEach(item => {
    const qtd = rtQuantidadeItem(item);
    const tamanho = rtTamanhoProduto(item);
    if (tamanho) pontos += rtPesoOperacionalTenda(tamanho, qtd);
  });
  return pontos;
}

function rtMesasCadeirasOmbEvento(evento) {
  const r = { mes: 0, cad: 0, omb: 0 };
  const todos = [...(evento?.tendas || []), ...(typeof rtProdutosReservaEvento === "function" ? rtProdutosReservaEvento(evento) : []), ...(evento?.itens_apoio || []), ...(typeof rtProdutosExtrasOperacionais === "function" ? rtProdutosExtrasOperacionais(evento) : (evento?.produtos_extras || []))];
  todos.forEach(item => {
    const tipo = rtTipoApoioResumo(item);
    if (tipo) r[tipo] += rtQuantidadeItem(item);
  });
  return r;
}

function rtNumeroCurto(n) {
  return Number.isInteger(n) ? String(n) : String(n).replace('.', ',');
}

function rtResumoCurtoRota(rota) {
  const evento = rota.evento || {};

  // v19-dev: o mini resumo da rota deve obedecer exatamente a configuração
  // de Configurações → Carga Operacional usada no Calendário Resumo.
  // Assim, se a 5x5 estiver configurada como Sigla/Letra, aparece como 5x5,
  // e não como os pontos/carga operacional dela.
  if (typeof rtCalResumoMateriaisEvento === "function") {
    const resumoCalendario = rtCalResumoMateriaisEvento(evento);
    if (resumoCalendario && resumoCalendario !== "-") return resumoCalendario;
  }

  const pontos = rtPontosTendasEvento(evento);
  const apoio = rtMesasCadeirasOmbEvento(evento);
  const blocos = [];

  if (pontos) blocos.push(rtNumeroCurto(pontos));
  const mc = `${apoio.cad ? apoio.cad + 'c' : ''}${apoio.mes ? apoio.mes + 'm' : ''}`;
  if (mc) blocos.push(mc);
  if (apoio.omb) blocos.push('OMB');

  return blocos.length ? blocos.join(' ') : '-';
}

function rtHorarioMiniResumoRota(rota) {
  const tipo = rtNormalizarTexto(rota?.tipoHorario || rota?.tipo_horario || rota?.horarioTipo || "");

  // Livre/comercial são padrão operacional do dia e não precisam ocupar espaço
  // no mini resumo do contador do carro.
  if (tipo.includes("livre") || tipo.includes("comercial") || tipo.includes("combinar")) return "";

  const texto = (typeof textoHorarioRota === "function")
    ? textoHorarioRota(rota?.tipoHorario, rota?.horario, rota?.data)
    : String(rota?.horario || "").trim();

  const normalizado = rtNormalizarTexto(texto);
  if (!texto || normalizado.includes("livre") || normalizado.includes("comercial") || normalizado.includes("combinar")) return "";
  return texto;
}

function rtMiniResumoRotasCarro(listaRotas = []) {
  return (listaRotas || []).map(rota => {
    const evento = rota.evento || {};
    const carga = rtResumoCurtoRota(rota);
    const bairro = (typeof rtBairroResumo === "function" ? rtBairroResumo({ ...evento, bairro: evento.bairro || rota.bairro, cidade: evento.cidade || rota.cidade, endereco: evento.endereco || rota.endereco }) : "") || rtBairroEndereco(rota.endereco || evento.endereco);
    const cliente = rtPrimeiroNomeCliente(rota.cliente || evento.nome);
    const horario = rtHorarioMiniResumoRota(rota);
    return [carga, bairro, cliente, horario].filter(Boolean).join(" - ");
  });
}

function rtFecharContadorCarro() {
  const dialog = document.getElementById("rotaContadorDialog");
  if (dialog && dialog.open) dialog.close();
}

function rtAbrirContadorCarro(listaRotas = [], carro = "Carro") {
  let dialog = document.getElementById("rotaContadorDialog");

  if (!dialog) {
    dialog = document.createElement("dialog");
    dialog.id = "rotaContadorDialog";
    dialog.className = "modal rota-contador-modal";
    document.body.appendChild(dialog);
  }

  const contagem = rtResumoCargaCarro(listaRotas, carro);
  const miniRotas = rtMiniResumoRotasCarro(listaRotas);

  dialog.innerHTML = `
    <div class="modal-header">
      <div>
        <h2>Contador do carro</h2>
        <p>${carro}</p>
      </div>
      <button type="button" class="modal-close" data-rota-contador-fechar>×</button>
    </div>
    <div class="rota-contador-body">
      <h3>Material de montagem</h3>
      <div class="rota-contador-resumo">
        ${contagem.length ? `<div class="rota-contador-linha-principal">${contagem[0]}</div>` : ""}
        ${contagem.slice(1).map(item => `<div class="rota-contador-linha-secundaria">${item}</div>`).join("")}
      </div>
      <h3>Mini resumo da rota</h3>
      <div class="rota-contador-lista">
        ${miniRotas.length ? miniRotas.map(item => `<div>${item}</div>`).join("") : `<p class="empty">Sem paradas neste carro.</p>`}
      </div>
      <p class="rota-contador-legenda">Pontos em Configurações → Carga Operacional. Limite do carro em Configurações → Carros da Empresa.</p>
    </div>
  `;

  dialog.querySelector("[data-rota-contador-fechar]")?.addEventListener("click", rtFecharContadorCarro);
  dialog.addEventListener("click", (ev) => { if (ev.target === dialog) rtFecharContadorCarro(); }, { once: true });

  if (typeof dialog.showModal === "function") dialog.showModal();
  else alert(`${carro}\n\n${contagem.join('; ')}\n\n${miniRotas.join('\n')}`);
}

// v19-dev: gerar rota no Google Maps por carro/dia
function rtEnderecoPrincipalMaps(endereco) {
  const texto = String(endereco || "").trim();
  if (!texto) return "";
  const idx = texto.indexOf("(");
  return (idx > 0 ? texto.slice(0, idx) : texto).trim();
}

function rtEnderecoRotaValido(endereco) {
  return rtEnderecoPrincipalMaps(endereco);
}

function rtGoogleMapsUrlRotas(listaRotas) {
  const enderecos = (Array.isArray(listaRotas) ? listaRotas : [])
    .map(r => rtEnderecoRotaValido(r.endereco))
    .filter(Boolean);

  const unicos = [];
  enderecos.forEach(end => {
    if (!unicos.some(x => x.toLowerCase() === end.toLowerCase())) unicos.push(end);
  });

  if (!unicos.length) return "";

  // v19-dev: a rota do carro deve sair da localização atual do motorista.
  // No Google Maps, "Current Location" força o Maps/app a usar o local atual
  // como ponto de origem, em vez de usar o primeiro endereço da lista.
  const origem = "Current Location";
  const destino = unicos[unicos.length - 1];
  const intermediarios = unicos.slice(0, -1);

  let url = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origem)}&destination=${encodeURIComponent(destino)}&travelmode=driving`;

  if (intermediarios.length) {
    url += `&waypoints=${intermediarios.map(encodeURIComponent).join("|")}`;
  }

  return url;
}

function rtAbrirGoogleMapsRotas(listaRotas) {
  const url = rtGoogleMapsUrlRotas(listaRotas);

  if (!url) {
    alert("Nenhum endereço encontrado para gerar a rota.");
    return;
  }

  window.open(url, "_blank");
}

// v19-dev: notas da rota por carro/dia, com sincronização multiusuário via Supabase.
// Requer tabela Supabase: notas_rota(id, data_rota, carro, texto, endereco, ordem, criado_por, criado_em, atualizado_em)
const RT_ROTAS_NOTAS_KEY = "rt_notas_rota_v1";

function rtNotaNormalizarRegistro(nota) {
  if (!nota || typeof nota !== "object") return null;
  const id = String(nota.id || nota.uuid || "").trim();
  if (!id) return null;
  const data = String(nota.data || nota.data_rota || nota.dataRota || "").slice(0, 10);
  const carro = String(nota.carro || "Sem carro").trim() || "Sem carro";
  const texto = String(nota.texto || nota.nota || "").trim();
  const endereco = String(nota.endereco || "").trim();
  const posicao = Number(nota.posicao ?? nota.ordem ?? 0) || 0;
  const criadoEm = nota.criadoEm || nota.criado_em || new Date().toISOString();
  const atualizadoEm = nota.atualizadoEm || nota.atualizado_em || criadoEm;
  return { id, data, carro, texto: texto || endereco || "Nota", endereco, posicao, criadoEm, atualizadoEm };
}

function rtNotaParaSupabase(nota) {
  const n = rtNotaNormalizarRegistro(nota);
  if (!n) return null;
  return {
    id: n.id,
    data_rota: n.data,
    carro: n.carro,
    texto: n.texto,
    endereco: n.endereco || null,
    ordem: Number(n.posicao || 0),
    criado_por: (typeof getColaboradorLogado === "function" ? getColaboradorLogado() : "") || null,
    criado_em: n.criadoEm || new Date().toISOString(),
    atualizado_em: n.atualizadoEm || new Date().toISOString()
  };
}

function rtNotasCarregar() {
  try {
    const raw = localStorage.getItem(RT_ROTAS_NOTAS_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.map(rtNotaNormalizarRegistro).filter(Boolean) : [];
  } catch {
    return [];
  }
}

function rtNotasSalvarLocal(notas) {
  const lista = (Array.isArray(notas) ? notas : []).map(rtNotaNormalizarRegistro).filter(Boolean);
  try { localStorage.setItem(RT_ROTAS_NOTAS_KEY, JSON.stringify(lista)); } catch {}
  return lista;
}

function rtNotasSalvar(notas) {
  const lista = rtNotasSalvarLocal(notas);
  rtNotasSalvarNuvem(lista).catch(() => {});
}

async function rtNotasCarregarNuvem() {
  if (typeof supabaseClient === "undefined" || !supabaseClient) return null;
  try {
    const { data, error } = await supabaseClient
      .from("notas_rota")
      .select("*")
      .order("data_rota", { ascending: true })
      .order("carro", { ascending: true })
      .order("ordem", { ascending: true });
    if (!error) {
      return (data || []).map(rtNotaNormalizarRegistro).filter(Boolean);
    }
    console.warn("Tabela notas_rota indisponível; tentando fallback app_config:", error);
  } catch (erro) {
    console.warn("Erro ao carregar notas_rota; tentando fallback app_config:", erro);
  }

  try {
    const { data, error } = await supabaseClient
      .from("app_config")
      .select("valor")
      .eq("chave", "rotas_notas")
      .maybeSingle();
    if (error) return null;
    const valor = data?.valor;
    return Array.isArray(valor) ? valor.map(rtNotaNormalizarRegistro).filter(Boolean) : [];
  } catch {
    return null;
  }
}

function rtNotasMesclar(local = [], nuvem = []) {
  const mapa = new Map();
  const incluir = nota => {
    const n = rtNotaNormalizarRegistro(nota);
    if (!n) return;
    const atual = mapa.get(n.id);
    if (!atual) {
      mapa.set(n.id, n);
      return;
    }
    const tAtual = new Date(atual.atualizadoEm || atual.criadoEm || 0).getTime() || 0;
    const tNota = new Date(n.atualizadoEm || n.criadoEm || 0).getTime() || 0;
    if (tNota >= tAtual) mapa.set(n.id, n);
  };
  (Array.isArray(local) ? local : []).forEach(incluir);
  (Array.isArray(nuvem) ? nuvem : []).forEach(incluir);
  return Array.from(mapa.values());
}

async function rtNotasSalvarNuvem(notas) {
  const lista = (Array.isArray(notas) ? notas : []).map(rtNotaNormalizarRegistro).filter(Boolean);
  if (typeof supabaseClient === "undefined" || !supabaseClient) return false;

  // Fonte principal multiusuário: tabela notas_rota.
  try {
    const registros = lista.map(rtNotaParaSupabase).filter(Boolean);
    if (registros.length) {
      const { error } = await supabaseClient
        .from("notas_rota")
        .upsert(registros, { onConflict: "id" });
      if (!error) return true;
      console.warn("Não foi possível salvar em notas_rota; fallback app_config:", error);
    }
  } catch (erro) {
    console.warn("Erro ao salvar em notas_rota; fallback app_config:", erro);
  }

  // Fallback para bases antigas.
  try {
    const { error } = await supabaseClient
      .from("app_config")
      .upsert({
        chave: "rotas_notas",
        valor: lista,
        atualizado_em: new Date().toISOString()
      }, { onConflict: "chave" });
    return !error;
  } catch {
    return false;
  }
}

async function rtNotaExcluirNuvem(notaId) {
  if (typeof supabaseClient === "undefined" || !supabaseClient || !notaId) return false;
  try {
    const { error } = await supabaseClient.from("notas_rota").delete().eq("id", notaId);
    if (!error) return true;
    console.warn("Não foi possível excluir nota em notas_rota:", error);
  } catch (erro) {
    console.warn("Erro ao excluir nota em notas_rota:", erro);
  }
  return false;
}

async function rtNotasSincronizarNuvem(renderizar = true) {
  const local = rtNotasCarregar();
  const nuvem = await rtNotasCarregarNuvem();
  if (!Array.isArray(nuvem)) return local;
  const mesclado = rtNotasMesclar(local, nuvem);
  const mudou = JSON.stringify(mesclado) !== JSON.stringify(local);
  rtNotasSalvarLocal(mesclado);
  if (mudou) {
    if (renderizar && typeof renderizarRotas === "function") renderizarRotas();
    if (typeof renderizarRuaMobile === "function") renderizarRuaMobile();
  }
  return mesclado;
}

function rtHtml(valor) {
  return String(valor ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function rtNotaId() {
  return "nota_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);
}

function rtNotasDaRota(data, carro) {
  return rtNotasCarregar()
    .filter(n => n && n.data === data && n.carro === carro)
    .sort((a, b) => (Number(a.posicao || 0) - Number(b.posicao || 0)) || String(a.id || "").localeCompare(String(b.id || "")));
}

function rtNotasEnderecos(data, carro) {
  return rtNotasDaRota(data, carro).map(n => rtEnderecoRotaValido(n.endereco)).filter(Boolean);
}

function rtNotaTextoHtml(textoBruto) {
  const textoOriginal = String(textoBruto || "Nota").trim() || "Nota";
  const destaque = /^\*[^*].*[^*]\*$/.test(textoOriginal) || /^\*[^*]\*$/.test(textoOriginal);
  const textoLimpo = destaque ? textoOriginal.replace(/^\*/, "").replace(/\*$/, "").trim() : textoOriginal;
  const safe = rtHtml(textoLimpo || "Nota");
  return destaque ? `<strong>${safe}</strong>` : safe;
}

function rtNotaLinhaHtml(nota) {
  const admin = rotaUsuarioEhAdmin();
  const temEndereco = String(nota?.endereco || "").trim();
  const icone = temEndereco ? "📍" : "📝";
  const texto = rtNotaTextoHtml(nota?.texto || "Nota");
  const enderecoCurto = temEndereco ? ` <span class="rota-nota-endereco">${rtHtml(nota.endereco)}</span>` : "";
  const dragAttrs = admin ? ` draggable="true" title="Arrastar para reposicionar"` : "";
  return `
    <div class="rota-nota-linha" data-rota-nota-id="${rtHtml(nota.id)}" data-rota-nota-data="${rtHtml(nota.data || "")}" data-rota-nota-carro="${rtHtml(nota.carro || "")}"${dragAttrs}>
      <span class="rota-nota-texto">${icone} ${texto}${enderecoCurto}</span>
      ${admin ? `
        <button type="button" class="rota-nota-icon" title="Editar" data-rota-nota-editar="${rtHtml(nota.id)}">✏️</button>
        <button type="button" class="rota-nota-icon" title="Excluir" data-rota-nota-excluir="${rtHtml(nota.id)}">🗑️</button>
      ` : ""}
    </div>
  `;
}

function rtRenderizarListaComNotas(rotasOrdenadas, data, carro) {
  const notas = rtNotasDaRota(data, carro);
  const porPosicao = new Map();
  notas.forEach(nota => {
    const pos = Math.max(0, Math.min(Number(nota.posicao || 0), rotasOrdenadas.length));
    if (!porPosicao.has(pos)) porPosicao.set(pos, []);
    porPosicao.get(pos).push(nota);
  });

  const partes = [];
  (porPosicao.get(0) || []).forEach(nota => partes.push(rtNotaLinhaHtml(nota)));
  rotasOrdenadas.forEach((rota, idx) => {
    partes.push(renderizarCardRota(rota, idx, rotasOrdenadas.length));
    (porPosicao.get(idx + 1) || []).forEach(nota => partes.push(rtNotaLinhaHtml(nota)));
  });
  return partes.join("");
}

function rtNomeCurtoRota(rota, idx) {
  const evento = rota?.evento || {};
  const cliente = String(rota?.cliente || evento.nome || `Parada ${idx + 1}`).trim();
  const bairro = typeof rtBairroResumo === "function"
    ? rtBairroResumo({ ...evento, bairro: evento.bairro || rota.bairro, cidade: evento.cidade || rota.cidade, endereco: evento.endereco || rota.endereco })
    : "";
  return [cliente.split(/\s+/).slice(0, 2).join(" "), bairro].filter(Boolean).join(" - ");
}

function rtAbrirNotaRota(data, carro, listaRotas = [], notaId = "") {
  if (!rotaUsuarioEhAdmin()) return;

  const notas = rtNotasCarregar();
  const existente = notaId ? notas.find(n => n.id === notaId) : null;

  let dialog = document.getElementById("rotaNotaDialog");
  if (!dialog) {
    dialog = document.createElement("dialog");
    dialog.id = "rotaNotaDialog";
    dialog.className = "modal rota-nota-modal";
    document.body.appendChild(dialog);
  }

  const lista = Array.isArray(listaRotas) ? listaRotas : [];
  const posAtual = existente ? Number(existente.posicao || 0) : 0;
  const opcoes = [`<option value="0"${posAtual === 0 ? " selected" : ""}>Início da rota</option>`]
    .concat(lista.map((rota, idx) => {
      const val = idx + 1;
      const label = `Depois de ${rtNomeCurtoRota(rota, idx)}`;
      return `<option value="${val}"${posAtual === val ? " selected" : ""}>${rtHtml(label)}</option>`;
    })).join("");

  dialog.innerHTML = `
    <div class="modal-header">
      <div>
        <h2>${existente ? "Editar nota na rota" : "Adicionar nota na rota"}</h2>
        <p>${rtHtml(carro)} • ${rtHtml(formatarDataRota(data))}</p>
      </div>
      <button type="button" class="modal-close" data-rota-nota-fechar>×</button>
    </div>
    <div class="rota-nota-form">
      <label>Nota</label>
      <input type="text" id="rotaNotaTexto" placeholder="Ex.: Segunda viagem" value="${rtHtml(existente?.texto || "")}" />
      <label>Endereço opcional</label>
      <input type="text" id="rotaNotaEndereco" placeholder="Preencher só se entrar na rota" value="${rtHtml(existente?.endereco || "")}" />
      <label>Posição</label>
      <select id="rotaNotaPosicao">${opcoes}</select>
      <div class="modal-actions">
        <button type="button" class="btn-outline" data-rota-nota-fechar>Cancelar</button>
        <button type="button" class="btn-primary" data-rota-nota-salvar>Salvar</button>
      </div>
    </div>
  `;

  const fechar = () => { if (dialog.open) dialog.close(); };
  dialog.querySelectorAll("[data-rota-nota-fechar]").forEach(btn => btn.addEventListener("click", fechar));
  dialog.querySelector("[data-rota-nota-salvar]")?.addEventListener("click", () => {
    const texto = dialog.querySelector("#rotaNotaTexto")?.value?.trim() || "";
    const endereco = dialog.querySelector("#rotaNotaEndereco")?.value?.trim() || "";
    const posicao = Number(dialog.querySelector("#rotaNotaPosicao")?.value || 0);
    if (!texto && !endereco) {
      alert("Informe uma nota ou endereço.");
      return;
    }

    if (existente) {
      existente.texto = texto || endereco;
      existente.endereco = endereco;
      existente.posicao = posicao;
      existente.atualizadoEm = new Date().toISOString();
    } else {
      notas.push({
        id: rtNotaId(),
        data,
        carro,
        texto: texto || endereco,
        endereco,
        posicao,
        criadoEm: new Date().toISOString()
      });
    }

    rtNotasSalvar(notas);
    fechar();
    renderizarRotas();
  });

  if (typeof dialog.showModal === "function") dialog.showModal();
  else alert("Seu navegador não suporta esta janela de nota.");
}

function rtExcluirNotaRota(notaId) {
  if (!rotaUsuarioEhAdmin() || !notaId) return;
  const notas = rtNotasCarregar();
  const nota = notas.find(n => n.id === notaId);
  if (!nota) return;
  if (!confirm(`Excluir a nota "${nota.texto || nota.endereco || "sem texto"}"?`)) return;
  rtNotasSalvar(notas.filter(n => n.id !== notaId));
  rtNotaExcluirNuvem(notaId).catch(() => {});
  renderizarRotas();
  if (typeof renderizarRuaMobile === 'function') renderizarRuaMobile();
}

function rtGoogleMapsUrlRotasComExtras(listaRotas, extras = []) {
  const enderecos = [
    ...(Array.isArray(listaRotas) ? listaRotas.map(r => rtEnderecoRotaValido(r.endereco)) : []),
    ...(Array.isArray(extras) ? extras.map(rtEnderecoRotaValido) : [])
  ].filter(Boolean);

  const unicos = [];
  enderecos.forEach(end => {
    if (!unicos.some(x => x.toLowerCase() === end.toLowerCase())) unicos.push(end);
  });

  if (!unicos.length) return "";
  const origem = "Current Location";
  const destino = unicos[unicos.length - 1];
  const intermediarios = unicos.slice(0, -1);
  let url = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origem)}&destination=${encodeURIComponent(destino)}&travelmode=driving`;
  if (intermediarios.length) url += `&waypoints=${intermediarios.map(encodeURIComponent).join("|")}`;
  return url;
}

function rtAbrirGoogleMapsRotasComNotas(listaRotas, data, carro) {
  const url = rtGoogleMapsUrlRotasComExtras(listaRotas, rtNotasEnderecos(data, carro));
  if (!url) {
    alert("Nenhum endereço encontrado para gerar a rota.");
    return;
  }
  window.open(url, "_blank");
}

function renderizarRotas() {
  aplicarParametrosRotaLinkSeExistirem();
  const container = document.getElementById("rotasConteudo");
  if (!container) return;

  const todas = criarRotasDosEventos();
  const filtradas = filtrarRotas(todas);

  document.getElementById("rotasTotal").textContent = filtradas.length;
  document.getElementById("rotasMontagens").textContent = filtradas.filter(r => r.tipo === "Montagem").length;
  document.getElementById("rotasDesmontagens").textContent = filtradas.filter(r => r.tipo === "Desmontagem").length;

  if (!filtradas.length) {
    container.innerHTML = `<p class="empty">Nenhuma montagem ou desmontagem encontrada para o filtro selecionado.</p>`;
    return;
  }

  const grupos = agruparPorDataECarro(filtradas);
  const datas = Object.keys(grupos).sort();

  container.innerHTML = datas.map(data => {
    const carros = Object.keys(grupos[data]).sort((a, b) => ordemCarro(a) - ordemCarro(b));

    return `
      <div class="rota-dia">
        <div class="rota-dia-header">
          <h3>${formatarDataRota(data)} <span>${diaSemanaRota(data)}</span></h3>
          <button type="button" class="btn-outline rota-print-btn" data-print-date="${data}">Gerar PDF/Imprimir</button>
        </div>

        ${carros.map(carro => {
          inicializarOrdemManualRotas(grupos[data][carro]);

          const rotasOrdenadas = ordenarRotasPorOrdemManual(grupos[data][carro]);

          return `
          <div class="rota-carro">
            <div class="rota-carro-header rota-carro-header-maps">
              <div class="rota-carro-topo">
                <h4>${carro}</h4>
                <div class="rota-carro-acoes">
                  ${rotaUsuarioEhAdmin() ? `<button type="button" class="btn-outline rota-nota-btn" data-rota-nota-data="${data}" data-rota-nota-carro="${carro}">+Nota</button>` : ""}
                  <button type="button" class="btn-outline rota-contador-btn" data-rota-contador-data="${data}" data-rota-contador-carro="${carro}">Contador</button>
                  <button type="button" class="btn-outline rota-maps-btn rota-maps-header-btn" data-rota-maps-data="${data}" data-rota-maps-carro="${carro}">Rota</button>
                </div>
              </div>
              <div class="rota-carro-materiais">
                ${listaMateriaisRotas(rotasOrdenadas).map(item => `<span>${item}</span>`).join("")}
              </div>
            </div>
            <div class="rota-lista">
              ${rtRenderizarListaComNotas(rotasOrdenadas, data, carro)}
            </div>
          </div>
        `;
        }).join("")}
      </div>
    `;
  }).join("");



  container.querySelectorAll("button[data-rota-contador-data]").forEach(btn => {
    btn.addEventListener("click", () => {
      const data = btn.dataset.rotaContadorData;
      const carro = btn.dataset.rotaContadorCarro;

      const todas = criarRotasDosEventos();
      const grupos = agruparPorDataECarro(todas);
      const lista = (grupos[data] && grupos[data][carro])
        ? ordenarRotasPorOrdemManual(grupos[data][carro])
        : [];

      rtAbrirContadorCarro(lista, carro);
    });
  });

  container.querySelectorAll("button[data-rota-maps-data]").forEach(btn => {
    btn.addEventListener("click", () => {
      const data = btn.dataset.rotaMapsData;
      const carro = btn.dataset.rotaMapsCarro;

      const todas = criarRotasDosEventos();
      const grupos = agruparPorDataECarro(todas);
      const lista = (grupos[data] && grupos[data][carro])
        ? ordenarRotasPorOrdemManual(grupos[data][carro])
        : [];

      rtAbrirGoogleMapsRotasComNotas(lista, data, carro);
    });
  });

  container.querySelectorAll("button[data-rota-nota-data]").forEach(btn => {
    btn.addEventListener("click", () => {
      const data = btn.dataset.rotaNotaData;
      const carro = btn.dataset.rotaNotaCarro;

      const todas = criarRotasDosEventos();
      const grupos = agruparPorDataECarro(todas);
      const lista = (grupos[data] && grupos[data][carro])
        ? ordenarRotasPorOrdemManual(grupos[data][carro])
        : [];

      rtAbrirNotaRota(data, carro, lista);
    });
  });

  container.querySelectorAll("[data-rota-nota-editar]").forEach(btn => {
    btn.addEventListener("click", () => {
      const notaId = btn.dataset.rotaNotaEditar;
      const nota = rtNotasCarregar().find(n => n.id === notaId);
      if (!nota) return;

      const todas = criarRotasDosEventos();
      const grupos = agruparPorDataECarro(todas);
      const lista = (grupos[nota.data] && grupos[nota.data][nota.carro])
        ? ordenarRotasPorOrdemManual(grupos[nota.data][nota.carro])
        : [];

      rtAbrirNotaRota(nota.data, nota.carro, lista, notaId);
    });
  });

  container.querySelectorAll("[data-rota-nota-excluir]").forEach(btn => {
    btn.addEventListener("click", () => rtExcluirNotaRota(btn.dataset.rotaNotaExcluir));
  });

  container.querySelectorAll("button[data-rota-move]").forEach(btn => {
    btn.addEventListener("click", () => {
      const data = btn.dataset.rotaData;
      const carro = btn.dataset.rotaCarroGrupo;

      const todas = criarRotasDosEventos();
      const grupos = agruparPorDataECarro(todas);

      const lista = (grupos[data] && grupos[data][carro])
        ? ordenarRotasPorOrdemManual(grupos[data][carro])
        : [];

      moverOrdemRota(btn.dataset.rotaMove, btn.dataset.direction, lista);
      renderizarRotas();
    });
  });

  configurarArrastarOrdemRotas(container);
  rtRenderizarPainelOrganizarRotas(filtradas);


  container.querySelectorAll("button[data-rota-operacao]").forEach(btn => {
    btn.addEventListener("click", () => {
      marcarOperacaoRota(btn.dataset.rotaId, btn.dataset.rotaOperacao);
    });
  });

  container.querySelectorAll("button[data-rota-reverter]").forEach(btn => {
    btn.addEventListener("click", () => {
      reverterOperacaoRota(btn.dataset.rotaReverter);
    });
  });


  container.querySelectorAll("button[data-rota-edit-evento]").forEach(btn => {
    btn.addEventListener("click", () => {
      const eventoId = btn.dataset.rotaEditEvento;
      if (!eventoId) return;

      if (typeof abrirEditarEvento === "function") {
        abrirEditarEvento(eventoId);
      } else {
        alert("Abra o setor de Eventos para editar este evento.");
      }
    });
  });


  container.querySelectorAll("[data-rota-trocar-produto]").forEach(btn => {
    btn.addEventListener("click", () => {
      abrirTrocaProdutoRota(btn.dataset.eventoId, btn.dataset.produtoIndex);
    });
  });


  container.querySelectorAll("select[data-rota-carro]").forEach(select => {
    select.addEventListener("change", () => {
      const carroAnterior = rotasCarros[select.dataset.rotaCarro] || "Sem carro";
      rotasCarros[select.dataset.rotaCarro] = select.value || "Sem carro";
      salvarRotasCarrosLocal();

      if (typeof registrarLogSistema === "function") {
        registrarLogSistema({
          modulo: "Rotas",
          acao: "Carro da rota alterado",
          registro_id: select.dataset.rotaCarro,
          registro_nome: select.dataset.rotaCarro,
          antes: { carro: carroAnterior },
          depois: { carro: rotasCarros[select.dataset.rotaCarro] }
        });
      }

      renderizarRotas();
    });
  });

  container.querySelectorAll("[data-print-date]").forEach(btn => {
    btn.addEventListener("click", () => imprimirRotaData(btn.dataset.printDate));
  });
}


function rtPainelOrganizarAtivo() {
  return document.getElementById("rotasLayout")?.classList.contains("organizador-ativo");
}

function rtResumoOrganizadorRota(rota) {
  const evento = rota?.evento || {};
  const carga = typeof rtResumoCurtoRota === "function" ? rtResumoCurtoRota(rota) : "";
  const cliente = typeof rtPrimeiroNomeCliente === "function" ? rtPrimeiroNomeCliente(rota.cliente || evento.nome) : String(rota.cliente || evento.nome || "Cliente").split(/\s+/)[0];
  const local = (typeof rtBairroResumo === "function"
    ? rtBairroResumo({ ...evento, bairro: evento.bairro || rota.bairro, cidade: evento.cidade || rota.cidade, endereco: evento.endereco || rota.endereco })
    : "") || (typeof rtBairroEndereco === "function" ? rtBairroEndereco(rota.endereco || evento.endereco) : "");
  const horario = typeof rtHorarioMiniResumoRota === "function" ? rtHorarioMiniResumoRota(rota) : "";
  return [carga, local, cliente, horario].filter(Boolean).join("-");
}

function rtResumoOrganizadorPartes(rota) {
  const evento = rota?.evento || {};
  const carga = typeof rtResumoCurtoRota === "function" ? rtResumoCurtoRota(rota) : "";
  const cliente = typeof rtPrimeiroNomeCliente === "function" ? rtPrimeiroNomeCliente(rota.cliente || evento.nome) : String(rota.cliente || evento.nome || "Cliente").split(/\s+/)[0];
  const local = (typeof rtBairroResumo === "function"
    ? rtBairroResumo({ ...evento, bairro: evento.bairro || rota.bairro, cidade: evento.cidade || rota.cidade, endereco: evento.endereco || rota.endereco })
    : "") || (typeof rtBairroEndereco === "function" ? rtBairroEndereco(rota.endereco || evento.endereco) : "");
  const horario = typeof rtHorarioMiniResumoRota === "function" ? rtHorarioMiniResumoRota(rota) : "";
  return { carga: carga || "-", local: local || "-", cliente: cliente || "Cliente", horario: horario || "" };
}

function rtEscapeHtmlOrganizador(valor) {
  return String(valor ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function rtCarrosFixosOrganizador(gruposData = {}) {
  const fixos = ["Sem carro", ...carrosDisponiveisRotas()];
  const extras = Object.keys(gruposData || {}).filter(carro => !fixos.includes(carro));
  return [...fixos, ...extras.sort((a, b) => ordemCarro(a) - ordemCarro(b))];
}

function rtNotaOrganizadorHtml(nota) {
  const texto = rtNotaTextoHtml(nota?.texto || nota?.endereco || "Nota");
  const endereco = String(nota?.endereco || "").trim();
  const enderecoMini = endereco ? ` <span class="rotas-organizador-nota-endereco">📍 ${rtEscapeHtmlOrganizador(endereco)}</span>` : "";
  return `<div class="rotas-organizador-nota" draggable="true" data-org-nota-id="${rtEscapeHtmlOrganizador(nota?.id || "")}" data-org-data="${rtEscapeHtmlOrganizador(nota?.data || "")}" data-org-carro="${rtEscapeHtmlOrganizador(nota?.carro || "")}" title="Arrastar nota para reposicionar">📝 ${texto}${enderecoMini}</div>`;
}

function rtRenderizarOrganizadorListaComNotas(ordenadas, data, carro) {
  const lista = Array.isArray(ordenadas) ? ordenadas : [];
  const notas = rtNotasDaRota(data, carro);
  const porPosicao = new Map();
  notas.forEach(nota => {
    const pos = Math.max(0, Math.min(Number(nota.posicao || 0), lista.length));
    if (!porPosicao.has(pos)) porPosicao.set(pos, []);
    porPosicao.get(pos).push(nota);
  });
  const partes = [];
  (porPosicao.get(0) || []).forEach(nota => partes.push(rtNotaOrganizadorHtml(nota)));
  lista.forEach(rota => {
    const tipoClasse = rota.tipo === "Desmontagem" ? "desmontagem" : "montagem";
    const tipoLetra = rota.tipo === "Desmontagem" ? "B" : "M";
    const partesResumo = rtResumoOrganizadorPartes(rota);
    const resumo = rtResumoOrganizadorRota(rota);
    const foraHorario = horarioForaComercialRota(rota.tipoHorario || rota.tipo_horario || rota.horarioTipo, rota.horario) ? " fora-horario" : "";
    partes.push(`
      <div class="rotas-organizador-item tipo-${tipoClasse}${foraHorario}" draggable="true" data-org-rota-id="${rota.id}" data-org-data="${data}" data-org-carro="${carro}" title="Clique para localizar na rota da esquerda">
        <div class="rotas-organizador-linha rotas-organizador-linha-colunas" title="${rtEscapeHtmlOrganizador(resumo)}">
          <span class="rotas-organizador-col rotas-organizador-col-qtd">${rtEscapeHtmlOrganizador(partesResumo.carga)}</span>
          <span class="rotas-organizador-col rotas-organizador-col-local">${rtEscapeHtmlOrganizador(partesResumo.local)}</span>
          <span class="rotas-organizador-col rotas-organizador-col-cliente">${rtEscapeHtmlOrganizador(partesResumo.cliente)}</span>
          <span class="rotas-organizador-col rotas-organizador-col-horario">${rtEscapeHtmlOrganizador(partesResumo.horario)}</span>
          <span class="rotas-organizador-tipo ${tipoLetra === 'B' ? 'b' : 'm'}">${tipoLetra}</span>
        </div>
      </div>`);
    (porPosicao.get(partes.filter(p => p.includes('rotas-organizador-item')).length) || []).forEach(nota => partes.push(rtNotaOrganizadorHtml(nota)));
  });
  return partes.length ? partes.join("") : `<div class="rotas-organizador-vazio">Solte aqui</div>`;
}

function rtRenderizarPainelOrganizarRotas(rotasFiltradas = []) {
  const painel = document.getElementById("rotasOrganizadorPainel");
  const listaEl = document.getElementById("rotasOrganizadorLista");
  const dataEl = document.getElementById("rotasOrganizadorData");
  if (!painel || !listaEl) return;
  if (!rtPainelOrganizarAtivo()) return;

  const listaBase = Array.isArray(rotasFiltradas) ? rotasFiltradas : filtrarRotas(criarRotasDosEventos());
  if (!listaBase.length) {
    listaEl.innerHTML = `<p class="empty">Nenhuma rota encontrada no filtro atual.</p>`;
    if (dataEl) dataEl.textContent = "Sem rotas";
    return;
  }

  const grupos = agruparPorDataECarro(listaBase);
  const datas = Object.keys(grupos).sort();
  if (dataEl) dataEl.textContent = datas.length === 1 ? rtDataOrganizadorRota(datas[0]) : `${datas.length} datas no filtro`;

  listaEl.innerHTML = datas.map(data => {
    const carrosBase = rtCarrosFixosOrganizador(grupos[data]);
    const carrosComQtd = carrosBase.map(carro => ({ carro, lista: grupos[data][carro] || [] }));
    const carros = [
      ...carrosComQtd.filter(item => item.lista.length > 0),
      ...carrosComQtd.filter(item => item.lista.length === 0)
    ].map(item => item.carro);
    return `
      <div class="rotas-organizador-data" data-org-data="${data}">
        ${datas.length > 1 ? `<div class="rotas-organizador-data-titulo">${rtDataOrganizadorRota(data)}</div>` : ""}
        ${carros.map(carro => {
          const listaCarro = grupos[data][carro] || [];
          inicializarOrdemManualRotas(listaCarro);
          const ordenadas = ordenarRotasPorOrdemManual(listaCarro);
          const grupoVazio = ordenadas.length ? "" : " grupo-vazio";
          return `
            <div class="rotas-organizador-grupo${grupoVazio}" data-org-grupo-data="${data}" data-org-grupo-carro="${carro}">
              <h4><span>${carro} (${ordenadas.length})</span></h4>
              <div class="rotas-organizador-dropzone ${ordenadas.length ? "" : "vazio"}" data-org-drop-data="${data}" data-org-drop-carro="${carro}">
                ${rtRenderizarOrganizadorListaComNotas(ordenadas, data, carro)}
              </div>
            </div>`;
        }).join("")}
      </div>`;
  }).join("");

  rtConfigurarPainelOrganizarEventos(listaEl);
}

function rtSalvarMovimentoOrganizador({ rotaId, data, carroOrigem, carroDestino, antesDeId = null }) {
  const id = String(rotaId || "");
  if (!id || !data || !carroDestino) return;

  const anterior = rotasCarros[id] || "Sem carro";
  if (anterior !== carroDestino) {
    rotasCarros[id] = carroDestino;
    salvarRotasCarrosLocal();
    if (typeof registrarLogSistema === "function") {
      registrarLogSistema({
        modulo: "Rotas",
        acao: "Carro da rota alterado pelo organizador",
        registro_id: id,
        registro_nome: id,
        antes: { carro: anterior },
        depois: { carro: carroDestino }
      });
    }
  }

  const todas = criarRotasDosEventos();
  const normalizarGrupo = (carro) => {
    const grupo = todas.filter(r => r.data === data && ((rotasCarros[String(r.id)] || "Sem carro") === carro));
    const ordenada = ordenarRotasPorOrdemManual(grupo).filter(r => String(r.id) !== id);
    const movida = todas.find(r => String(r.id) === id);
    if (movida && carro === carroDestino) {
      const idxDestino = antesDeId ? ordenada.findIndex(r => String(r.id) === String(antesDeId)) : -1;
      if (idxDestino >= 0) ordenada.splice(idxDestino, 0, movida);
      else ordenada.push(movida);
    }
    ordenada.forEach((rota, idx) => { rotasOrdemManual[String(rota.id)] = idx + 1; });
  };

  normalizarGrupo(carroOrigem || anterior);
  if ((carroOrigem || anterior) !== carroDestino) normalizarGrupo(carroDestino);
  salvarRotasOrdemManual();
  renderizarRotas();
}

function rtLimparIndicadoresOrganizador(listaEl) {
  listaEl.querySelectorAll(".rotas-organizador-item.inserir-antes, .rotas-organizador-item.inserir-depois")
    .forEach(el => el.classList.remove("inserir-antes", "inserir-depois"));
  listaEl.querySelectorAll(".rotas-organizador-dropzone.sobre").forEach(el => el.classList.remove("sobre"));
}

function rtIdAntesDepoisOrganizador(item, inserirDepois, dragId) {
  if (!inserirDepois) return item.dataset.orgRotaId;
  let proximo = item.nextElementSibling;
  while (proximo && (!proximo.matches?.(".rotas-organizador-item[data-org-rota-id]") || String(proximo.dataset.orgRotaId) === String(dragId))) {
    proximo = proximo.nextElementSibling;
  }
  return proximo ? proximo.dataset.orgRotaId : null;
}

function rtFocarRotaNaListaEsquerda(rotaId) {
  const id = String(rotaId || "");
  if (!id) return;
  const seletor = typeof CSS !== "undefined" && CSS.escape ? `.rota-card[data-rota-card="${CSS.escape(id)}"]` : `.rota-card[data-rota-card="${id.replace(/"/g, '\\"')}"]`;
  const card = document.querySelector(seletor);
  if (!card) return;
  card.scrollIntoView({ behavior: "smooth", block: "center" });
  card.classList.add("rota-card-localizado");
  setTimeout(() => card.classList.remove("rota-card-localizado"), 1800);
}

function rtOrganizadorPosicaoPorAlvo(alvoEl, inserirDepois = false) {
  const zone = alvoEl?.closest?.(".rotas-organizador-dropzone[data-org-drop-carro]");
  if (!zone) return 0;
  const itens = Array.from(zone.querySelectorAll(".rotas-organizador-item[data-org-rota-id]"));
  const item = alvoEl.closest?.(".rotas-organizador-item[data-org-rota-id]");
  if (!item) return itens.length;
  const idx = itens.findIndex(el => el === item);
  if (idx < 0) return itens.length;
  return Math.max(0, idx + (inserirDepois ? 1 : 0));
}

function rtSalvarMovimentoNotaOrganizador({ notaId, data, carro, posicao }) {
  const ok = rtMoverNotaRotaParaPosicao(notaId, data, carro, posicao);
  if (!ok) return;
  renderizarRotas();
  if (typeof renderizarRuaMobile === "function") renderizarRuaMobile();
}

function rtConfigurarPainelOrganizarEventos(listaEl) {
  let drag = null;

  listaEl.querySelectorAll(".rotas-organizador-item[data-org-rota-id]").forEach(item => {
    item.addEventListener("click", ev => {
      if (item.classList.contains("arrastando")) return;
      rtFocarRotaNaListaEsquerda(item.dataset.orgRotaId);
    });
    item.addEventListener("dragstart", ev => {
      window.__rtUsuarioArrastandoRota = true;
      drag = { tipo: "rota", id: item.dataset.orgRotaId, data: item.dataset.orgData, carro: item.dataset.orgCarro };
      item.classList.add("arrastando");
      ev.dataTransfer.effectAllowed = "move";
      ev.dataTransfer.setData("text/plain", drag.id);
    });
    item.addEventListener("dragend", () => {
      window.__rtUsuarioArrastandoRota = false;
      item.classList.remove("arrastando");
      rtLimparIndicadoresOrganizador(listaEl);
      drag = null;
    });
    item.addEventListener("dragover", ev => {
      if (!drag || item.dataset.orgData !== drag.data) return;
      ev.preventDefault();
      const rect = item.getBoundingClientRect();
      const inserirDepois = ev.clientY > (rect.top + rect.height / 2);
      rtLimparIndicadoresOrganizador(listaEl);
      item.classList.add(inserirDepois ? "inserir-depois" : "inserir-antes");
      ev.dataTransfer.dropEffect = "move";
    });
    item.addEventListener("dragleave", ev => {
      if (!item.contains(ev.relatedTarget)) item.classList.remove("inserir-antes", "inserir-depois");
    });
    item.addEventListener("drop", ev => {
      ev.preventDefault();
      if (!drag || item.dataset.orgData !== drag.data) return;
      const destinoId = item.dataset.orgRotaId;
      const carroDestino = item.dataset.orgCarro || "Sem carro";
      const rect = item.getBoundingClientRect();
      const inserirDepois = ev.clientY > (rect.top + rect.height / 2);
      if (drag.tipo === "nota") {
        rtSalvarMovimentoNotaOrganizador({
          notaId: drag.id,
          data: drag.data,
          carro: carroDestino,
          posicao: rtOrganizadorPosicaoPorAlvo(item, inserirDepois)
        });
        return;
      }
      if (!destinoId || String(destinoId) === String(drag.id)) return;
      const antesDeId = rtIdAntesDepoisOrganizador(item, inserirDepois, drag.id);
      rtSalvarMovimentoOrganizador({
        rotaId: drag.id,
        data: drag.data,
        carroOrigem: drag.carro,
        carroDestino,
        antesDeId
      });
    });
  });


  listaEl.querySelectorAll(".rotas-organizador-nota[data-org-nota-id]").forEach(nota => {
    nota.addEventListener("dragstart", ev => {
      window.__rtUsuarioArrastandoRota = true;
      drag = { tipo: "nota", id: nota.dataset.orgNotaId, data: nota.dataset.orgData, carro: nota.dataset.orgCarro };
      nota.classList.add("arrastando");
      ev.dataTransfer.effectAllowed = "move";
      ev.dataTransfer.setData("text/plain", drag.id);
    });
    nota.addEventListener("dragend", () => {
      window.__rtUsuarioArrastandoRota = false;
      nota.classList.remove("arrastando");
      rtLimparIndicadoresOrganizador(listaEl);
      drag = null;
    });
    nota.addEventListener("dragover", ev => {
      if (!drag || drag.tipo !== "nota" || nota.dataset.orgData !== drag.data) return;
      ev.preventDefault();
      ev.dataTransfer.dropEffect = "move";
    });
    nota.addEventListener("drop", ev => {
      ev.preventDefault();
      if (!drag || drag.tipo !== "nota" || nota.dataset.orgData !== drag.data) return;
      const carroDestino = nota.dataset.orgCarro || drag.carro || "Sem carro";
      const posicao = Math.max(0, Number((rtNotasCarregar().find(n => String(n.id) === String(nota.dataset.orgNotaId)) || {}).posicao || 0));
      rtSalvarMovimentoNotaOrganizador({ notaId: drag.id, data: drag.data, carro: carroDestino, posicao });
    });
  });

  listaEl.querySelectorAll(".rotas-organizador-dropzone[data-org-drop-carro]").forEach(zone => {
    zone.addEventListener("dragover", ev => {
      if (!drag || zone.dataset.orgDropData !== drag.data) return;
      ev.preventDefault();
      if (!ev.target.closest?.(".rotas-organizador-item")) zone.classList.add("sobre");
      ev.dataTransfer.dropEffect = "move";
    });
    zone.addEventListener("dragleave", ev => {
      if (!zone.contains(ev.relatedTarget)) zone.classList.remove("sobre");
    });
    zone.addEventListener("drop", ev => {
      ev.preventDefault();
      zone.classList.remove("sobre");
      if (!drag || zone.dataset.orgDropData !== drag.data) return;
      if (ev.target.closest?.(".rotas-organizador-item")) return;
      const carroDestino = zone.dataset.orgDropCarro || "Sem carro";
      if (drag.tipo === "nota") {
        rtSalvarMovimentoNotaOrganizador({
          notaId: drag.id,
          data: drag.data,
          carro: carroDestino,
          posicao: zone.querySelectorAll(".rotas-organizador-item[data-org-rota-id]").length
        });
        return;
      }
      rtSalvarMovimentoOrganizador({
        rotaId: drag.id,
        data: drag.data,
        carroOrigem: drag.carro,
        carroDestino,
        antesDeId: null
      });
    });
  });
}




function rtFormatarTendaTroca(valor) {
  const raw = String(valor || "").trim();
  if (!raw) return "";
  if (raw.includes(" - ")) return raw.replace(/\s+/g, " ").trim();
  try {
    const lista = Array.isArray(produtos) ? produtos : [];
    const achado = lista.find(p => String(p.codigo || p.id || p.numero || "").trim() === raw);
    if (achado) {
      return [achado.codigo || achado.id || raw, achado.categoria || achado.tipo || achado.nome || achado.descricao || "Tenda", achado.tamanho, achado.cor]
        .filter(Boolean).join(" - ").replace(/\s+-\s+-\s+/g, " - ").trim();
    }
  } catch {}
  return raw;
}
function rtTendasNovasAtendimento(rota) {
  const item = rota?.atendimentoExtra || rota;
  const val = String(item?.tenda_entrar || item?.tendas_entrar || "").trim();
  if (!val) return [];
  return val.split(/\s*[,;]\s*/).map(rtFormatarTendaTroca).filter(Boolean);
}

function rotaEhDesmontagem(rota) {
  const tipo = String(rota?.tipo || "").toLowerCase();
  return tipo.includes("desmont") || tipo.includes("retirada");
}

function listaMateriaisRotas(listaRotas = []) {
  const materiaisComCodigo = [];
  const materiaisSemCodigo = {};

  listaRotas.forEach(rota => {
    // No resumo ao lado do carro, listar somente materiais que serão levados
    // para montagem/entrega. Desmontagens/retiradas não entram nessa soma.
    if (rotaEhDesmontagem(rota)) return;

    const evento = rota.evento || {};
    if (rota.atendimentoExtra && String(rota.atendimentoExtra.tipo || '').toLowerCase().includes('troca')) {
      rtTendasNovasAtendimento(rota).forEach(nova => materiaisComCodigo.push(nova));
      return;
    }

    // Produtos com código continuam item a item.
    (evento.tendas || []).forEach(p => {
      const nome = [p.codigo, p.categoria, p.tamanho, p.cor].filter(Boolean).join(" - ");
      materiaisComCodigo.push(nome || "Produto com código");
    });

    // Materiais sem código, como materiais de apoio, são somados por nome.
    (evento.itens_apoio || []).forEach(item => {
      const nome = String(item.nome || "Item sem código").trim();
      const quantidade = Number(item.quantidade || item.qtd || item.quantidade_total || 0);

      if (!materiaisSemCodigo[nome]) materiaisSemCodigo[nome] = 0;
      materiaisSemCodigo[nome] += Number.isFinite(quantidade) ? quantidade : 0;
    });

    // Extras continuam item a item, pois podem ser serviços ou descrições livres.
    (typeof rtProdutosExtrasOperacionais === "function" ? rtProdutosExtrasOperacionais(evento) : (evento.produtos_extras || [])).forEach(item => {
      const texto = `${item.descricao || "Extra"} (${item.quantidade || 1})`;
      materiaisComCodigo.push(texto);
    });
  });

  const resumoSemCodigo = Object.entries(materiaisSemCodigo)
    .filter(([, quantidade]) => Number(quantidade) > 0)
    .map(([nome, quantidade]) => `${nome} (${quantidade})`);

  return [...materiaisComCodigo, ...resumoSemCodigo];
}

function totalMateriaisRotas(listaRotas = []) {
  return listaRotas.reduce((total, rota) => {
    if (rotaEhDesmontagem(rota)) return total;
    return total + (Array.isArray(rota.materiais) ? rota.materiais.length : 0);
  }, 0);
}

function carrosDisponiveisRotas() {
  const config = window.configRioTendas || {};
  return Array.isArray(config.carros) && config.carros.length
    ? config.carros
    : ["Saveiro", "Dupla", "Caminhão"];
}

function ordemCarro(carro) {
  if (carro === "Sem carro") return 999;

  const carros = carrosDisponiveisRotas();
  const index = carros.indexOf(carro);

  return index >= 0 ? index + 1 : 99;
}


function tipoHorarioFlexivelRota(rota) {
  const tipo = String(rota?.tipoHorario || "").toLowerCase();

  return (
    tipo.includes("horário comercial") ||
    tipo.includes("horario comercial") ||
    tipo.includes("livre") ||
    tipo.includes("combinar")
  );
}

function minutosRota(horario) {
  if (!horario) return null;

  const partes = String(horario).slice(0, 5).split(":");
  if (partes.length < 2) return null;

  const h = Number(partes[0]);
  const m = Number(partes[1]);

  if (Number.isNaN(h) || Number.isNaN(m)) return null;

  return h * 60 + m;
}

function intervaloConflitoRota(rota) {
  if (!rota || tipoHorarioFlexivelRota(rota)) return null;

  const tipo = String(rota.tipoHorario || "").toLowerCase();
  const inicio = minutosRota(rota.horario);

  if (inicio === null) return null;

  // Intervalo salvo como "Intervalo|22:00" ou similar
  if (tipo.includes("intervalo")) {
    const fimTexto = String(rota.tipoHorario || "").split("|")[1] || "";
    const fim = minutosRota(fimTexto);

    if (fim !== null) {
      return {
        inicio: Math.min(inicio, fim),
        fim: Math.max(inicio, fim)
      };
    }

    // Se não tiver final, trata como uma janela curta de atenção
    return { inicio, fim: inicio + 30 };
  }

  // Horário exato: janela pequena para detectar choque real
  if (tipo.includes("exato") || tipo.includes("exatamente")) {
    return { inicio, fim: inicio + 30 };
  }

  // "A partir de" e "Até" são flexíveis, então não geram conflito duro.
  // Mantemos fora do conflito automático para evitar falso positivo.
  if (tipo.includes("a partir") || tipo.includes("até")) {
    return null;
  }

  // Se houver horário mas tipo indefinido, usa janela curta conservadora
  return { inicio, fim: inicio + 30 };
}

function intervalosSobrepoemRota(a, b) {
  if (!a || !b) return false;
  return a.inicio < b.fim && b.inicio < a.fim;
}

function rotasComConflito(rotas) {
  const mapa = {};

  rotas.forEach(rota => {
    const carro = rotasCarros[rota.id] || "Sem carro";
    if (carro === "Sem carro") return;

    const intervalo = intervaloConflitoRota(rota);
    if (!intervalo) return;

    const chave = `${rota.data}|${carro}`;
    if (!mapa[chave]) mapa[chave] = [];

    mapa[chave].push({
      id: rota.id,
      intervalo
    });
  });

  const conflitos = new Set();

  Object.values(mapa).forEach(lista => {
    for (let i = 0; i < lista.length; i++) {
      for (let j = i + 1; j < lista.length; j++) {
        if (intervalosSobrepoemRota(lista[i].intervalo, lista[j].intervalo)) {
          conflitos.add(lista[i].id);
          conflitos.add(lista[j].id);
        }
      }
    }
  });

  return conflitos;
}

function rotaTemConflito(rota) {
  const todas = filtrarRotas(criarRotasDosEventos());
  return rotasComConflito(todas).has(rota.id);
}


async function atualizarHorarioRotaEvento(rotaId, novoValor) {
  const rota = criarRotasDosEventos().find(r => r.id === rotaId);
  if (!rota || !rota.evento) return;

  const evento = eventos.find(e => String(e.id) === String(rota.evento_id));
  if (!evento) return;

  if (rota.tipo === "Montagem") {
    evento.montagem = novoValor || null;
  } else {
    evento.desmontagem = novoValor || null;
  }

  evento.atualizado_em = new Date().toISOString();

  if (typeof salvarEventoBanco === "function") {
    const salvo = await salvarEventoBanco(evento);
    if (salvo) {
      const index = eventos.findIndex(e => String(e.id) === String(evento.id));
      if (index >= 0) eventos[index] = salvo;
    }
  } else {
    const index = eventos.findIndex(e => String(e.id) === String(evento.id));
    if (index >= 0) eventos[index] = evento;
  }

  renderizarRotas();

  if (!window.__rtRotasOperacaoSyncTimer) {
    window.__rtRotasOperacaoSyncTimer = setInterval(() => {
      const rotasAtiva = document.getElementById("rotasSection")?.classList.contains("active-section");
      const ruaAtiva = document.getElementById("ruaMobileSection")?.classList.contains("active-section");
      const produtosAtiva = document.getElementById("produtosSection")?.classList.contains("active-section");
      if ((rotasAtiva || ruaAtiva || produtosAtiva) && !(typeof rtUsuarioEditandoOperacional === "function" && rtUsuarioEditandoOperacional())) {
        rtNotasSincronizarNuvem(true).catch(() => {});
        sincronizarRotasOperacaoNuvem(true).catch(() => {});
      }
    }, 120000);
  }
}


function limparTelefoneRota(telefone) {
  return String(telefone || "").replace(/\D/g, "");
}

function googleMapsSearchUrl(endereco) {
  const consulta = typeof rtEnderecoPrincipalMaps === "function" ? rtEnderecoPrincipalMaps(endereco) : String(endereco || "").trim();
  const query = encodeURIComponent(consulta);
  return query ? `https://www.google.com/maps/search/?api=1&query=${query}` : "#";
}

function googleMapsNavigateUrl(endereco) {
  const consulta = typeof rtEnderecoPrincipalMaps === "function" ? rtEnderecoPrincipalMaps(endereco) : String(endereco || "").trim();
  const query = encodeURIComponent(consulta);
  return query ? `https://www.google.com/maps/dir/?api=1&destination=${query}` : "#";
}

function renderizarLinksEnderecoRota(rota) {
  const endereco = String(rota.endereco || "").trim();
  const telefone = limparTelefoneRota(rota.telefone);

  if (!endereco && !telefone) return "";

  return `
    <div class="rota-links-endereco">
      ${endereco ? `
        <a href="${googleMapsSearchUrl(endereco)}" target="_blank" rel="noopener" title="Abrir endereço no Google Maps">📍 Mapa</a>
        <a href="${googleMapsNavigateUrl(endereco)}" target="_blank" rel="noopener" title="Navegar até o endereço">🧭 Navegar</a>
      ` : ""}
      ${telefone ? `<a href="tel:${telefone}" title="Ligar para o cliente">📞 Ligar</a>` : ""}
    </div>
  `;
}

function valorDatetimeLocal(valor) {
  if (!valor) return "";
  return String(valor).slice(0, 16);
}


function linkGoogleMapsEndereco(endereco) {
  const texto = String(endereco || "").trim();
  if (!texto || texto === "-") return "-";

  const consulta = typeof rtEnderecoPrincipalMaps === "function" ? rtEnderecoPrincipalMaps(texto) : texto;
  const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(consulta)}`;

  return `<a class="rota-endereco-link" href="${url}" target="_blank" rel="noopener" title="Abrir no Google Maps">${texto}</a>`;
}

function alertaRotaClienteHtml(rota = {}) {
  const eventoAlerta = { ...(rota.evento || {}), ...rota, data_evento: rota.data || rota.data_evento || rota?.evento?.data_evento };
  return typeof rtEventoAlertaHtml === "function" ? rtEventoAlertaHtml(eventoAlerta) : "";
}


function rtColaboradorRotaHtml(rota = {}) {
  const nome = String(rota?.evento?.colaborador || rota?.colaborador || "").trim();
  if (!nome) return "";
  const safe = typeof rtTextoVisual === "function" ? rtTextoVisual(nome) : nome.replace(/[&<>]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;"}[c]));
  return `<div class="rota-colaborador-financeiro">Colab. ${safe}</div>`;
}

function renderizarCardRota(rota, index = 0, total = 0) {
  const carroAtual = rotasCarros[rota.id] || "Sem carro";
  const materiais = rota.materiais && rota.materiais.length ? rota.materiais : ["Sem materiais informados"];
  const conflito = rotaTemConflito(rota);
  const evento = rota.evento || {};

  return `
    <div class="rota-card tipo-${rota.tipo.toLowerCase()} ${conflito ? "rota-conflito" : ""}" data-rota-card="${rota.id}" data-rota-data="${rota.data}" data-rota-carro-grupo="${carroAtual}">
      <div class="rota-tipo-vertical tipo-${rota.tipo.toLowerCase()}" draggable="true" title="Arrastar para ordenar">
        <span>${rota.tipo}</span>
      </div>

      <div class="rota-card-conteudo">
        <div class="rota-card-top rota-card-top-refinado">
          <div class="rota-identificacao">
            ${conflito ? '<b class="rota-alerta">Conflito</b>' : ''}
            ${badgeOperacaoRota(rota)}
          </div>
          ${rtColaboradorRotaHtml(rota)}


      </div>

      <div class="rota-grid-info">
        <div class="rota-col rota-evento-data">
          <span>Data do evento</span>
          <strong>${dataHoraEventoPrintCurta(evento, rota)}</strong>
        </div>
        <div class="rota-col rota-operacao-data">
          <span>${rota.tipo}</span>
          <strong class="rota-horario-destaque${classeHorarioEspecialRota(rota.tipoHorario, rota.horario)}">${textoHorarioRota(rota.tipoHorario, rota.horario, rota.data)}</strong>
        </div>
        <div class="rota-col">
          <span>Cliente</span>
          <strong class="rota-cliente-alerta-nome">${alertaRotaClienteHtml(rota)}${typeof rtTextoVisual === "function" ? rtTextoVisual(rota.cliente) : rota.cliente}</strong>
        </div>
        <div class="rota-col">
          <span>Telefone</span>
          <strong>${rota.telefone}</strong>
        </div>
        <div class="rota-col rota-endereco">
          <span>Endereço</span>
          <strong>${linkGoogleMapsEndereco(rota.endereco)}</strong>
        </div>
        <div class="rota-col">
          <span>Total</span>
          <strong>${dinheiroRota(evento.valor_total)}</strong>
        </div>
        <div class="rota-col">
          <span>Sinal</span>
          <strong>${dinheiroRota(evento.valor_sinal)}</strong>
        </div>
        <div class="rota-col">
          <span>Restante</span>
          <strong>${dinheiroRota(evento.valor_restante)}</strong>
        </div>
        <div class="rota-col">
          <span>Pagamento</span>
          <strong class="${classePagamentoRota(evento)}">${statusPagamentoRota(evento)}</strong>
        </div>
        <div class="rota-col rota-forma-pagamento">
          <span>Forma pagamento</span>
          <strong>${evento.forma_pagamento || "-"}</strong>
        </div>
      </div>

      <div class="rota-materiais rota-materiais-com-controles">
        <div class="rota-materiais-lista">
          <strong>Materiais:</strong>
          <div>
            ${renderizarMateriaisRotaClicaveis(rota)}
          </div>
        </div>

        <div class="rota-controles-baixo">
          <div class="rota-controles-linha rota-controles-linha-baixo">
            <label class="rota-carro-inline">Carro
              <select data-rota-carro="${rota.id}">
                <option value="Sem carro" ${carroAtual === "Sem carro" ? "selected" : ""}>Sem carro</option>
                ${carrosDisponiveisRotas().map(carro => `<option value="${carro}" ${carroAtual === carro ? "selected" : ""}>${carro}</option>`).join("")}
              </select>
            </label>

            <button type="button" class="btn-outline rota-edit-event-btn" data-rota-edit-evento="${evento.id || rota.evento_id || ""}">
              Editar
            </button>

            <div class="rota-ordem-controls">
              <button type="button" class="rota-order-btn" title="Subir" data-rota-move="${rota.id}" data-direction="up" data-rota-data="${rota.data}" data-rota-carro-grupo="${carroAtual}" ${index === 0 ? "disabled" : ""}>↑</button>
              <button type="button" class="rota-order-btn" title="Descer" data-rota-move="${rota.id}" data-direction="down" data-rota-data="${rota.data}" data-rota-carro-grupo="${carroAtual}" ${index >= total - 1 ? "disabled" : ""}>↓</button>
              ${rota.tipo === "Montagem" ? `<button type="button" class="rota-operacao-btn rota-entregue-btn" title="Marcar material entregue na montagem" data-rota-operacao="entregue" data-rota-id="${rota.id}">✓ Entregue</button>` : ""}
              ${rota.tipo === "Desmontagem" ? `<button type="button" class="rota-operacao-btn rota-recolhido-btn" title="Marcar material recolhido e enviar produtos para revisão" data-rota-operacao="recolhido" data-rota-id="${rota.id}">↩ Recolhido</button>` : ""}
              ${rota.tipo !== "Montagem" && rota.tipo !== "Desmontagem" ? `<button type="button" class="rota-operacao-btn rota-entregue-btn" title="Marcar atendimento efetuado" data-rota-operacao="efetuado" data-rota-id="${rota.id}">✓ Efetuado</button>` : ""}
              ${rotaUsuarioEhAdmin() && obterOperacaoRota(rota.id)?.status ? `<button type="button" class="rota-operacao-btn rota-reverter-btn" title="Reverter operação desta rota" data-rota-reverter="${rota.id}">↺ Reverter</button>` : ""}
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  `;
}


function dataEventoPrintCurta(valor) {
  if (!valor) return "-";
  const texto = String(valor).slice(0, 10);
  const partes = texto.split("-");
  if (partes.length !== 3) return texto;
  return `${partes[2]}/${partes[1]}/${partes[0].slice(-2)}`;
}

function horaPrintCurta(valor) {
  if (!valor) return "";
  return String(valor).slice(0, 5);
}

function dataHoraEventoPrintCurta(evento, rota) {
  const data = dataEventoPrintCurta(evento.data_evento || rota.data);
  const inicio = horaPrintCurta(evento.hora_inicio || evento.hora_evento || "");
  const fim = horaPrintCurta(evento.hora_termino || "");

  if (inicio && fim) return `${data} ${inicio}-${fim}`;
  if (inicio) return `${data} ${inicio}`;
  return data;
}


function rtColaboradorRotaTextoPdf(rota = {}) {
  const nome = String(rota?.evento?.colaborador || rota?.colaborador || "").trim();
  return nome ? `Colab.: ${nome}` : "Colab.: -";
}

function imprimirRotaData(data) {
  const todas = criarRotasDosEventos();
  const rotasData = todas.filter(r => r.data === data);

  if (!rotasData.length) {
    alert("Nenhuma rota encontrada para esta data.");
    return;
  }

  const grupos = agruparPorDataECarro(rotasData);
  const carros = Object.keys(grupos[data] || {}).sort((a, b) => ordemCarro(a) - ordemCarro(b));
  const usuarioRotaLayout = (typeof getUsuarioLogado === "function" ? getUsuarioLogado() : null) || {};
  const rotaLayoutUsuarioKey = String(usuarioRotaLayout.id || usuarioRotaLayout.usuario || usuarioRotaLayout.nome || "padrao").replace(/[^a-zA-Z0-9_-]/g, "_");
  const rotaLayoutIsAdmin = usuarioRotaLayout.perfil === "administrador";

  const html = `
    <html>
      <head>
        <title>Rota ${formatarDataRota(data)}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            font-size: 9px;
            padding: 8px;
            color: #1d2b3a;
          }

          .topo {
            display:flex;
            align-items:center;
            gap:12px;
            margin-bottom:4px;
          }

          .topo img {
            height:36px;
          }

          h1 {
            margin:0;
            font-size:18px;
          }

          .subtitulo {
            margin-top:2px;
            color:#556677;
          }

          h2 {
            margin-top:10px;
            border-bottom:1px solid #d6e0ea;
            padding-bottom:4px;
            color:#0f3d66;
          }

          .carro-total {
            display:inline-block;
            margin-left:8px;
            padding:2px 7px;
            border-radius:999px;
            background:#eef4ff;
            color:#1d5fd1;
            font-size:8px;
            vertical-align:middle;
          }

          .carro-materiais {
            display:flex;
            flex-wrap:wrap;
            gap:4px;
            margin:4px 0 8px;
          }

          .carro-materiais span {
            background:#f3f7fb;
            border:1px solid #dce6f0;
            color:#27445f;
            border-radius:999px;
            padding:1px 4px;
            font-size:7px;
          }

          .card {
            border:1px solid #dce5ee;
            border-left:4px solid #2b7cff;
            border-radius:7px;
            padding:6px;
            margin-bottom:6px;
            background:#fbfdff;
          }

          .desmontagem {
            border-left-color:#d97000;
          }

          .titulo {
            display:flex;
            justify-content:space-between;
            margin-bottom:4px;
          }

          .titulo strong {
            font-size:12px;
          }

          .grid {
            display:grid;
            grid-template-columns: var(--rota-colunas-editaveis, 0.9fr 0.85fr 1fr 1fr 1.95fr 0.5fr 0.5fr 0.55fr 0.7fr 0.85fr);
            gap:4px;
            margin-top:4px;
          }

          .col {
            border:1px solid #e2eaf2;
            border-radius:6px;
            padding:3px 4px;
            background:#fff;
            position:relative;
          }

          .rota-col-resizer {
            position:absolute;
            top:0;
            right:-4px;
            width:8px;
            height:100%;
            cursor:col-resize;
            z-index:5;
            user-select:none;
            touch-action:none;
          }

          .rota-col-resizer::after {
            content:"";
            position:absolute;
            top:18%;
            bottom:18%;
            left:3px;
            width:2px;
            border-radius:2px;
            background:rgba(15,61,102,.22);
          }

          body.rota-redimensionando {
            cursor:col-resize;
            user-select:none;
          }

          .col span {
            display:block;
            font-size:7px;
            color:#667788;
            font-weight:bold;
            text-transform:uppercase;
            margin-bottom:2px;
          }

          .col strong {
            display:block;
            font-size:8px;
            line-height:1.05;
            word-break:break-word;
          }

          .materiais {
            margin-top:4px;
          }

          .materiais-tags {
            display:flex;
            flex-wrap:wrap;
            gap:4px;
            margin-top:4px;
          }

          .materiais-tags span {
            background:#eef4ff;
            color:#1d5fd1;
            border-radius:999px;
            padding:1px 4px;
            font-size:7px;
          }

          .quitado {
            color:#0a7d00;
          }

          .aberto {
            color:#b00020;
          }

          .toolbar-rota-editavel { position: sticky; top:0; z-index:10; display:flex; justify-content:space-between; align-items:center; gap:10px; padding:8px 10px; margin:-8px -8px 8px; background:#0f3d66; color:#fff; font-size:12px; }
          .toolbar-rota-editavel button { border:0; border-radius:8px; padding:7px 10px; cursor:pointer; font-weight:700; }
          .toolbar-rota-editavel .secondary { background:#e9eef5; color:#123; }
          .toolbar-rota-editavel .editor-controls { display:flex; align-items:center; flex-wrap:wrap; gap:5px; justify-content:flex-end; }
          .toolbar-rota-editavel .editor-controls button { padding:6px 8px; min-width:30px; }
          .toolbar-rota-editavel .editor-controls input[type="color"] { width:32px; height:30px; border:0; border-radius:8px; padding:2px; background:#e9eef5; cursor:pointer; }
          .rota-editavel-page:focus { outline:2px dashed #7aa7d9; outline-offset:4px; }
          :root { --rota-print-font-scale: 1; }
          .rota-editavel-page { font-size: calc(9px * var(--rota-print-font-scale)) !important; }
          .rota-editavel-page h1 { font-size: calc(18px * var(--rota-print-font-scale)) !important; }
          .rota-editavel-page h2 { font-size: calc(14px * var(--rota-print-font-scale)) !important; }
          .rota-editavel-page .titulo strong { font-size: calc(12px * var(--rota-print-font-scale)) !important; }
          .rota-editavel-page .col span { font-size: calc(9px * var(--rota-print-font-scale)) !important; }
          .rota-editavel-page .col strong { font-size: calc(10px * var(--rota-print-font-scale)) !important; }
          .rota-editavel-page .materiais-tags span, .rota-editavel-page .carro-materiais span { font-size: calc(7px * var(--rota-print-font-scale)) !important; }
          .rota-editavel-page .grid .col:nth-child(6) strong,
          .rota-editavel-page .grid .col:nth-child(7) strong,
          .rota-editavel-page .grid .col:nth-child(8) strong { font-size: calc(9px * var(--rota-print-font-scale)) !important; }
          .rota-editavel-page .grid .col:nth-child(5) strong { font-size: calc(10px * var(--rota-print-font-scale)) !important; }
          @media print { .toolbar-rota-editavel { display:none !important; } body { padding:0; } }
          @page {
            size: landscape;
            margin: 6mm;
          }
        

          /* Ajuste final: PDF/Imprimir com 10 campos na mesma linha */
          .grid {
            grid-template-columns: var(--rota-colunas-editaveis, 0.9fr 0.85fr 1fr 1fr 1.95fr 0.5fr 0.5fr 0.55fr 0.7fr 0.85fr) !important;
            gap:4px !important;
          }

          .col {
            min-width:0 !important;
            overflow:hidden !important;
          }

          .col span {
            font-size:10px !important;
            line-height:1 !important;
          }

          .col strong {
            font-size:10px !important;
            line-height:1.05 !important;
          }

          .card {
            page-break-inside: avoid;
            break-inside: avoid;
          }

          @page {
            size: A4 landscape;
            margin: 6mm;
          }

        

/* Refino final PDF: fonte maior, endereço maior, valores menores */
.grid {
  grid-template-columns: var(--rota-colunas-editaveis, 0.9fr 0.85fr 1fr 1fr 1.95fr 0.5fr 0.5fr 0.55fr 0.7fr 0.85fr) !important;
}

.col span {
  font-size: 9px !important;
}

.col strong {
  font-size: 10px !important;
  line-height: 1.08 !important;
}

/* valores: total, sinal e restante */
.grid .col:nth-child(6) strong,
.grid .col:nth-child(7) strong,
.grid .col:nth-child(8) strong {
  font-size: 9px !important;
  white-space: nowrap !important;
}

/* endereço */
.grid .col:nth-child(5) strong {
  font-size: 10px !important;
  line-height: 1.08 !important;
}

</style>
      </head>
      <body>
        <div class="toolbar-rota-editavel" contenteditable="false">
          <strong>Rota editável — ajuste textos, formatação e colunas antes de imprimir/PDF</strong>
          <div class="editor-controls" contenteditable="false">
            <button type="button" class="secondary" data-rota-font="down" title="Diminuir fonte">A−</button>
            <button type="button" class="secondary" data-rota-font="up" title="Aumentar fonte">A+</button>
            <button type="button" class="secondary" data-rota-cmd="bold" title="Negrito"><b>N</b></button>
            <button type="button" class="secondary" data-rota-cmd="italic" title="Itálico"><i>I</i></button>
            <button type="button" class="secondary" data-rota-cmd="underline" title="Sublinhado"><u>S</u></button>
            <button type="button" class="secondary" data-rota-cmd="justifyLeft" title="Alinhar à esquerda">☰</button>
            <button type="button" class="secondary" data-rota-cmd="justifyCenter" title="Centralizar">≡</button>
            <button type="button" class="secondary" data-rota-cmd="justifyRight" title="Alinhar à direita">☷</button>
            <input type="color" id="rotaTextColor" value="#1d2b3a" title="Cor do texto">
            <button type="button" class="secondary" data-rota-cmd="undo" title="Desfazer">↶</button>
            <button type="button" class="secondary" data-rota-cmd="redo" title="Refazer">↷</button>
            <button type="button" class="secondary" id="rotaResetColunasBtn">Restaurar padrão</button>
            ${rotaLayoutIsAdmin ? '<button type="button" class="secondary" id="rotaSalvarGlobalColunasBtn">Salvar modelo para todos</button>' : ''}
            <button type="button" class="secondary" onclick="window.print()">Imprimir/PDF</button>
            <button type="button" onclick="window.close()">Fechar</button>
          </div>
        </div>
        <main class="rota-editavel-page" contenteditable="true">
        <div class="topo">
          <img src="https://riotendas.smartwebinfo.com.br/webapp/public/img/logo.png">
          <div>
            <h1>Rota ${formatarDataRota(data)} - ${diaSemanaRota(data)}</h1>
            <div class="subtitulo">Novo RioTendas — Operacional de montagem e desmontagem</div>
          </div>
        </div>

        ${carros.map(carro => {
          const rotasDoCarroPdf = ordenarRotasPorOrdemManual(grupos[data][carro] || []);
          return `
          <h2>${carro}</h2>
          <div class="carro-materiais">
            ${listaMateriaisRotas(rotasDoCarroPdf).map(item => `<span>${item}</span>`).join("")}
          </div>

          ${rotasDoCarroPdf.map(rota => {
            const evento = rota.evento || {};
            return `
              <div class="card ${rota.tipo === "Desmontagem" ? "desmontagem" : ""}">
                <div class="titulo">
                  <strong>${rota.tipo}</strong>
                  <span>${rtColaboradorRotaTextoPdf(rota)}</span>
                </div>

                <div class="grid">
                  <div class="col">
                    <span>Evento</span>
                    <strong>${dataHoraEventoPrintCurta(evento, rota)}</strong>
                  </div>

                  <div class="col">
                    <span>${rota.tipo}</span>
                    <strong class="rota-horario-destaque${classeHorarioEspecialRota(rota.tipoHorario, rota.horario)}">${textoHorarioRota(rota.tipoHorario, rota.horario, rota.data)}</strong>
                  </div>

                  <div class="col">
                    <span>Cliente</span>
                    <strong class="rota-cliente-alerta-nome">${alertaRotaClienteHtml(rota)}${typeof rtTextoVisual === "function" ? rtTextoVisual(rota.cliente) : rota.cliente}</strong>
                  </div>

                  <div class="col">
                    <span>Telefone</span>
                    <strong>${rota.telefone}</strong>
                  </div>

                  <div class="col">
                    <span>Endereço</span>
                    <strong>${rota.endereco}</strong>
                  </div>

                  <div class="col">
                    <span>Total</span>
                    <strong>${dinheiroRota(evento.valor_total)}</strong>
                  </div>

                  <div class="col">
                    <span>Sinal</span>
                    <strong>${dinheiroRota(evento.valor_sinal)}</strong>
                  </div>

                  <div class="col">
                    <span>Restante</span>
                    <strong>${dinheiroRota(evento.valor_restante)}</strong>
                  </div>

                  <div class="col">
                    <span>Pagamento</span>
                    <strong class="${classePagamentoRota(evento)}">${statusPagamentoRota(evento)}</strong>
                  </div>

                  <div class="col">
                    <span>Forma</span>
                    <strong>${evento.forma_pagamento || "-"}</strong>
                  </div>
                </div>

                <div class="materiais">
                  <strong>Materiais:</strong>

                  <div class="materiais-tags">
                    ${(rota.materiais || []).map(m => `<span>${m}</span>`).join("")}
                  </div>
                </div>
              </div>
            `;
          }).join("")}
        `;
        }).join("")}
        </main>

        <script>
          (function() {
            const DEFAULT_COLS = [0.9,0.85,1,1,1.95,0.5,0.5,0.55,0.7,0.85];
            const usuarioKey = "${rotaLayoutUsuarioKey}";
            const isAdmin = ${rotaLayoutIsAdmin ? "true" : "false"};
            const localUserKey = "rt_rota_colunas_usuario_" + usuarioKey;
            const localGlobalKey = "rt_rota_colunas_global";
            const cloudUserKey = "rota_colunas_layout_usuario_" + usuarioKey;
            const cloudGlobalKey = "rota_colunas_layout_global";
            let cols = DEFAULT_COLS.slice();
            let fontScale = 1;
            let saveTimer = null;

            function normalizar(lista) {
              if (!Array.isArray(lista) || lista.length !== 10) return null;
              const nums = lista.map(Number);
              if (nums.some(v => !Number.isFinite(v) || v <= 0)) return null;
              return nums;
            }

            function normalizarFontScale(valor) {
              const n = Number(valor);
              return Number.isFinite(n) ? Math.min(1.6, Math.max(0.75, n)) : null;
            }

            function template(lista) {
              return lista.map(v => Math.max(0.25, Number(v) || 0.5).toFixed(3) + "fr").join(" ");
            }

            function aplicar(lista) {
              const validas = normalizar(lista) || DEFAULT_COLS.slice();
              cols = validas.slice();
              document.documentElement.style.setProperty("--rota-colunas-editaveis", template(cols));
            }

            function aplicarFontScale(valor) {
              fontScale = normalizarFontScale(valor) || 1;
              document.documentElement.style.setProperty("--rota-print-font-scale", String(fontScale));
            }

            function lerLocal(key) {
              try {
                const valor = JSON.parse(localStorage.getItem(key) || "null");
                if (Array.isArray(valor)) return { colunas: normalizar(valor), fontScale: null };
                if (!valor) return null;
                return { colunas: normalizar(valor.colunas), fontScale: normalizarFontScale(valor.fontScale) };
              } catch(e) { return null; }
            }

            function salvarLocal(key, value) {
              try { localStorage.setItem(key, JSON.stringify(value)); } catch(e) {}
            }

            async function lerCloud(key) {
              try {
                const sb = window.opener && window.opener.supabaseClient;
                if (!sb) return null;
                const resp = await sb.from("configuracoes_sistema").select("valor").eq("chave", key).maybeSingle();
                if (resp.error) return null;
                const valor = resp.data && resp.data.valor;
                if (!valor) return null;
                return { colunas: normalizar(valor.colunas), fontScale: normalizarFontScale(valor.fontScale) };
              } catch(e) { return null; }
            }

            async function salvarCloud(key, value) {
              try {
                const sb = window.opener && window.opener.supabaseClient;
                if (!sb) return false;
                const resp = await sb.from("configuracoes_sistema").upsert({
                  chave: key,
                  valor: { colunas: value.colunas || value, fontScale: normalizarFontScale(value.fontScale) || fontScale, atualizado_em: new Date().toISOString() },
                  atualizado_em: new Date().toISOString()
                }, { onConflict: "chave" });
                return !resp.error;
              } catch(e) { return false; }
            }

            async function carregarLayout() {
              const userCloud = await lerCloud(cloudUserKey);
              const globalCloud = await lerCloud(cloudGlobalKey);
              const userLocal = lerLocal(localUserKey);
              const globalLocal = lerLocal(localGlobalKey);
              const escolhido = userCloud || userLocal || globalCloud || globalLocal || { colunas: DEFAULT_COLS, fontScale: 1 };
              aplicar(escolhido.colunas || DEFAULT_COLS);
              aplicarFontScale(escolhido.fontScale || 1);
              if (globalCloud) salvarLocal(localGlobalKey, globalCloud);
              if (userCloud) salvarLocal(localUserKey, userCloud);
            }

            function agendarSalvarUsuario() {
              clearTimeout(saveTimer);
              saveTimer = setTimeout(async () => {
                salvarLocal(localUserKey, { colunas: cols, fontScale });
                await salvarCloud(cloudUserKey, { colunas: cols, fontScale });
              }, 250);
            }

            function primeiraGrid() {
              return document.querySelector(".grid");
            }

            function iniciarResize(idx, evento) {
              evento.preventDefault();
              evento.stopPropagation();
              const grid = primeiraGrid();
              if (!grid) return;
              const cells = Array.from(grid.children);
              const startX = (evento.touches && evento.touches[0] ? evento.touches[0].clientX : evento.clientX);
              const startWidths = cells.map(c => c.getBoundingClientRect().width);
              const total = startWidths.reduce((a,b) => a + b, 0) || 1;
              const min = 34;
              document.body.classList.add("rota-redimensionando");

              function mover(ev) {
                const x = (ev.touches && ev.touches[0] ? ev.touches[0].clientX : ev.clientX);
                const dx = x - startX;
                const widths = startWidths.slice();
                widths[idx] = Math.max(min, startWidths[idx] + dx);
                widths[idx + 1] = Math.max(min, startWidths[idx + 1] - dx);
                const novoTotal = widths.reduce((a,b) => a + b, 0) || total;
                cols = widths.map(w => (w / novoTotal) * 10);
                aplicar(cols);
              }

              function parar() {
                document.body.classList.remove("rota-redimensionando");
                document.removeEventListener("mousemove", mover);
                document.removeEventListener("mouseup", parar);
                document.removeEventListener("touchmove", mover);
                document.removeEventListener("touchend", parar);
                agendarSalvarUsuario();
              }

              document.addEventListener("mousemove", mover);
              document.addEventListener("mouseup", parar);
              document.addEventListener("touchmove", mover, { passive:false });
              document.addEventListener("touchend", parar);
            }

            function criarHandles() {
              document.querySelectorAll(".grid").forEach(grid => {
                Array.from(grid.children).forEach((col, idx) => {
                  if (idx >= 9 || col.querySelector(".rota-col-resizer")) return;
                  const h = document.createElement("span");
                  h.className = "rota-col-resizer";
                  h.contentEditable = "false";
                  h.title = "Arraste para ajustar a largura da coluna";
                  h.addEventListener("mousedown", ev => iniciarResize(idx, ev));
                  h.addEventListener("touchstart", ev => iniciarResize(idx, ev), { passive:false });
                  col.appendChild(h);
                });
              });
            }

            function executarComando(cmd, valor) {
              const page = document.querySelector(".rota-editavel-page");
              if (page) page.focus();
              try { document.execCommand(cmd, false, valor || null); } catch(e) { console.warn("Comando não aplicado", cmd, e); }
            }

            function ajustarFonte(delta) {
              aplicarFontScale((fontScale || 1) + delta);
              agendarSalvarUsuario();
            }

            function configurarEditorCompacto() {
              document.querySelectorAll("[data-rota-cmd]").forEach(btn => {
                btn.addEventListener("mousedown", ev => ev.preventDefault());
                btn.addEventListener("click", () => executarComando(btn.dataset.rotaCmd));
              });
              document.querySelectorAll("[data-rota-font]").forEach(btn => {
                btn.addEventListener("mousedown", ev => ev.preventDefault());
                btn.addEventListener("click", () => ajustarFonte(btn.dataset.rotaFont === "up" ? 0.05 : -0.05));
              });
              const color = document.getElementById("rotaTextColor");
              if (color) {
                color.addEventListener("mousedown", ev => ev.stopPropagation());
                color.addEventListener("input", () => executarComando("foreColor", color.value));
              }
            }

            document.addEventListener("DOMContentLoaded", async () => {
              await carregarLayout();
              criarHandles();
              configurarEditorCompacto();
              const resetBtn = document.getElementById("rotaResetColunasBtn");
              if (resetBtn) resetBtn.addEventListener("click", async () => {
                aplicar(DEFAULT_COLS);
                salvarLocal(localUserKey, { colunas: cols, fontScale });
                await salvarCloud(cloudUserKey, { colunas: cols, fontScale });
              });
              const globalBtn = document.getElementById("rotaSalvarGlobalColunasBtn");
              if (globalBtn) globalBtn.addEventListener("click", async () => {
                if (!isAdmin) return;
                if (!confirm("Salvar este modelo de rota como padrão para todos os usuários?")) return;
                salvarLocal(localGlobalKey, { colunas: cols, fontScale });
                const ok = await salvarCloud(cloudGlobalKey, { colunas: cols, fontScale });
                if (ok) { alert("Modelo salvo como padrão para todos."); } else { console.warn("Não foi possível salvar o layout na nuvem."); }
              });
            });
          })();
        </script>
      </body>
    </html>
  `;

  const janela = window.open("", "_blank");
  janela.document.write(html);
  janela.document.close();
  janela.focus();
}

document.addEventListener("DOMContentLoaded", iniciarRotas);
let rotasOrdemManual = JSON.parse(localStorage.getItem(storageRotasOrdemKey) || "{}");

function salvarRotasOrdemManual() {
  rtMarcarEdicaoManualOrdemRotas();
  const atualizadoEm = rtSetTimestampOrdemLocal(Date.now());
  localStorage.setItem(storageRotasOrdemKey, JSON.stringify(rotasOrdemManual));
  localStorage.setItem(storageRotasOrdemPendenteKey, JSON.stringify({
    atualizadoEm,
    valor: rotasOrdemManual || {}
  }));

  return salvarRotasOrdemNuvem(atualizadoEm).then(salvou => {
    if (salvou) localStorage.removeItem(storageRotasOrdemPendenteKey);
    return salvou;
  }).catch(erro => {
    console.warn("Ordem das rotas ficará pendente para reenviar:", erro);
    return false;
  });
}

function salvarRotasOrdemLocalSemNuvem() {
  localStorage.setItem(storageRotasOrdemKey, JSON.stringify(rotasOrdemManual));
}

function ordemManualRota(rota) {
  const valor = Number(rotasOrdemManual[String(rota.id)]);
  return Number.isFinite(valor) ? valor : 999999;
}

function ordenarRotasPorOrdemManual(listaRotas) {
  return [...listaRotas].sort((a, b) => {
    const ordemA = ordemManualRota(a);
    const ordemB = ordemManualRota(b);

    if (ordemA !== ordemB) return ordemA - ordemB;

    const horaA = String(a.horario || "");
    const horaB = String(b.horario || "");
    if (horaA !== horaB) return horaA.localeCompare(horaB);

    return String(a.id).localeCompare(String(b.id));
  });
}

function inicializarOrdemManualRotas(listaRotas) {
  let alterou = false;
  const ordenada = ordenarRotasPorOrdemManual(listaRotas);

  ordenada.forEach((rota, index) => {
    const id = String(rota.id);

    if (!Number.isFinite(Number(rotasOrdemManual[id]))) {
      rotasOrdemManual[id] = index + 1;
      alterou = true;
    }
  });

  // Normaliza a ordem do grupo atual para evitar empates/ordens duplicadas.
  const normalizada = ordenarRotasPorOrdemManual(listaRotas);
  normalizada.forEach((rota, index) => {
    const id = String(rota.id);
    const novaOrdem = index + 1;
    if (Number(rotasOrdemManual[id]) !== novaOrdem) {
      rotasOrdemManual[id] = novaOrdem;
      alterou = true;
    }
  });

  if (alterou) salvarRotasOrdemLocalSemNuvem();
  return Promise.resolve();
}

function moverOrdemRota(rotaId, direcao, listaRotas) {
  const ordenada = ordenarRotasPorOrdemManual(listaRotas);
  const idProcurado = String(rotaId);

  // Corrige o bug principal: rotaId vem do HTML como texto.
  const atualIndex = ordenada.findIndex(r => String(r.id) === idProcurado);
  if (atualIndex === -1) return;

  const novoIndex = direcao === "up" ? atualIndex - 1 : atualIndex + 1;
  if (novoIndex < 0 || novoIndex >= ordenada.length) return;

  const temp = ordenada[atualIndex];
  ordenada[atualIndex] = ordenada[novoIndex];
  ordenada[novoIndex] = temp;

  // Regrava a ordem completa do grupo, sem depender de troca de valores antigos.
  ordenada.forEach((rota, index) => {
    rotasOrdemManual[String(rota.id)] = index + 1;
  });

  return salvarRotasOrdemManual();
}


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


// v19-dev-rotas-drag-drop-ordem: permite ordenar segurando a faixa vertical do card.
function moverRotaParaIndice(rotaId, alvoId, listaRotas, inserirDepois = false) {
  const ordenada = ordenarRotasPorOrdemManual(listaRotas);
  const origemIndex = ordenada.findIndex(r => String(r.id) === String(rotaId));
  const alvoIndexOriginal = ordenada.findIndex(r => String(r.id) === String(alvoId));
  if (origemIndex === -1 || alvoIndexOriginal === -1 || String(rotaId) === String(alvoId)) return Promise.resolve();

  const [movida] = ordenada.splice(origemIndex, 1);
  let alvoIndex = ordenada.findIndex(r => String(r.id) === String(alvoId));
  if (alvoIndex === -1) alvoIndex = ordenada.length;
  const destino = inserirDepois ? alvoIndex + 1 : alvoIndex;
  ordenada.splice(Math.max(0, Math.min(destino, ordenada.length)), 0, movida);

  ordenada.forEach((rota, index) => {
    rotasOrdemManual[String(rota.id)] = index + 1;
  });

  return salvarRotasOrdemManual();
}

function rtMoverNotaRotaParaPosicao(notaId, data, carro, posicao) {
  const notas = rtNotasCarregar();
  const nota = notas.find(n => String(n.id) === String(notaId));
  if (!nota) return false;
  nota.data = data || nota.data;
  nota.carro = carro || nota.carro;
  nota.posicao = Math.max(0, Number(posicao) || 0);
  nota.atualizadoEm = new Date().toISOString();
  rtNotasSalvar(notas);
  return true;
}

function rtFinalizarMovimentoNotaRota(dragInfo, alvoEl, inserirDepois = false) {
  if (!dragInfo || dragInfo.tipo !== "nota" || !alvoEl) return false;
  const todas = criarRotasDosEventos();
  const grupos = agruparPorDataECarro(todas);
  const data = dragInfo.data;
  const carro = dragInfo.carro;
  const lista = (grupos[data] && grupos[data][carro])
    ? ordenarRotasPorOrdemManual(grupos[data][carro])
    : [];

  let posicao = 0;
  const card = alvoEl.closest?.('.rota-card[data-rota-card]');
  const notaAlvo = alvoEl.closest?.('.rota-nota-linha[data-rota-nota-id]');

  if (card) {
    const idx = lista.findIndex(r => String(r.id) === String(card.dataset.rotaCard));
    posicao = idx >= 0 ? idx + (inserirDepois ? 1 : 0) : lista.length;
  } else if (notaAlvo) {
    const alvo = rtNotasCarregar().find(n => String(n.id) === String(notaAlvo.dataset.rotaNotaId));
    posicao = Math.max(0, Number(alvo?.posicao || 0));
  } else {
    return false;
  }

  if (!rtMoverNotaRotaParaPosicao(dragInfo.id, data, carro, posicao)) return false;
  renderizarRotas();
  if (typeof renderizarRuaMobile === 'function') renderizarRuaMobile();
  if (typeof renderizarCalendario === 'function') renderizarCalendario();
  return true;
}

function configurarArrastarOrdemRotas(container) {
  if (!container) return;
  let dragInfo = null;

  container.querySelectorAll('.rota-card[data-rota-card]').forEach(card => {
    const handle = card.querySelector('.rota-tipo-vertical');
    if (!handle) return;

    handle.addEventListener('dragstart', ev => {
      window.__rtUsuarioArrastandoRota = true;
      dragInfo = {
        tipo: "rota",
        id: card.dataset.rotaCard,
        data: card.dataset.rotaData,
        carro: card.dataset.rotaCarroGrupo
      };
      card.classList.add('rota-card-arrastando');
      if (ev.dataTransfer) {
        ev.dataTransfer.effectAllowed = 'move';
        ev.dataTransfer.setData('text/plain', dragInfo.id || '');
      }
    });

    handle.addEventListener('dragend', () => {
      window.__rtUsuarioArrastandoRota = false;
      card.classList.remove('rota-card-arrastando');
      container.querySelectorAll('.rota-drop-before, .rota-drop-after').forEach(el => el.classList.remove('rota-drop-before', 'rota-drop-after'));
      dragInfo = null;
    });

    card.addEventListener('dragover', ev => {
      if (!dragInfo || (dragInfo.tipo !== "nota" && String(card.dataset.rotaCard) === String(dragInfo.id))) return;
      if (card.dataset.rotaData !== dragInfo.data || card.dataset.rotaCarroGrupo !== dragInfo.carro) return;
      ev.preventDefault();
      const rect = card.getBoundingClientRect();
      const depois = ev.clientY > rect.top + rect.height / 2;
      card.classList.toggle('rota-drop-before', !depois);
      card.classList.toggle('rota-drop-after', depois);
      if (ev.dataTransfer) ev.dataTransfer.dropEffect = 'move';
    });

    card.addEventListener('dragleave', () => {
      card.classList.remove('rota-drop-before', 'rota-drop-after');
    });

    card.addEventListener('drop', ev => {
      if (!dragInfo || (dragInfo.tipo !== "nota" && String(card.dataset.rotaCard) === String(dragInfo.id))) return;
      if (card.dataset.rotaData !== dragInfo.data || card.dataset.rotaCarroGrupo !== dragInfo.carro) return;
      ev.preventDefault();
      const rect = card.getBoundingClientRect();
      const inserirDepois = ev.clientY > rect.top + rect.height / 2;
      if (dragInfo.tipo === "nota") {
        rtFinalizarMovimentoNotaRota(dragInfo, card, inserirDepois);
        return;
      }
      const todas = criarRotasDosEventos();
      const grupos = agruparPorDataECarro(todas);
      const lista = (grupos[dragInfo.data] && grupos[dragInfo.data][dragInfo.carro])
        ? ordenarRotasPorOrdemManual(grupos[dragInfo.data][dragInfo.carro])
        : [];
      moverRotaParaIndice(dragInfo.id, card.dataset.rotaCard, lista, inserirDepois).then(() => {
        renderizarRotas();
        if (typeof renderizarRuaMobile === 'function') renderizarRuaMobile();
        if (typeof renderizarCalendario === 'function') renderizarCalendario();
      });
    });
  });

  container.querySelectorAll('.rota-nota-linha[data-rota-nota-id][draggable="true"]').forEach(notaEl => {
    notaEl.addEventListener('dragstart', ev => {
      window.__rtUsuarioArrastandoRota = true;
      dragInfo = {
        tipo: "nota",
        id: notaEl.dataset.rotaNotaId,
        data: notaEl.dataset.rotaNotaData,
        carro: notaEl.dataset.rotaNotaCarro
      };
      notaEl.classList.add('rota-nota-arrastando');
      if (ev.dataTransfer) {
        ev.dataTransfer.effectAllowed = 'move';
        ev.dataTransfer.setData('text/plain', dragInfo.id || '');
      }
    });
    notaEl.addEventListener('dragend', () => {
      window.__rtUsuarioArrastandoRota = false;
      notaEl.classList.remove('rota-nota-arrastando');
      container.querySelectorAll('.rota-drop-before, .rota-drop-after').forEach(el => el.classList.remove('rota-drop-before', 'rota-drop-after'));
      dragInfo = null;
    });
    notaEl.addEventListener('dragover', ev => {
      if (!dragInfo || dragInfo.tipo !== "nota" || String(dragInfo.id) === String(notaEl.dataset.rotaNotaId)) return;
      if (notaEl.dataset.rotaNotaData !== dragInfo.data || notaEl.dataset.rotaNotaCarro !== dragInfo.carro) return;
      ev.preventDefault();
      if (ev.dataTransfer) ev.dataTransfer.dropEffect = 'move';
    });
    notaEl.addEventListener('drop', ev => {
      if (!dragInfo || dragInfo.tipo !== "nota" || String(dragInfo.id) === String(notaEl.dataset.rotaNotaId)) return;
      if (notaEl.dataset.rotaNotaData !== dragInfo.data || notaEl.dataset.rotaNotaCarro !== dragInfo.carro) return;
      ev.preventDefault();
      rtFinalizarMovimentoNotaRota(dragInfo, notaEl, false);
    });
  });

  // Suporte básico a toque: usa a faixa lateral como alça e move para o card onde soltar.
  container.querySelectorAll('.rota-tipo-vertical').forEach(handle => {
    handle.addEventListener('touchstart', ev => {
      const card = handle.closest('.rota-card[data-rota-card]');
      if (!card) return;
      dragInfo = { tipo: "rota", id: card.dataset.rotaCard, data: card.dataset.rotaData, carro: card.dataset.rotaCarroGrupo };
      card.classList.add('rota-card-arrastando');
    }, { passive: true });
  });

  container.querySelectorAll('.rota-nota-linha[data-rota-nota-id][draggable="true"]').forEach(notaEl => {
    notaEl.addEventListener('touchstart', () => {
      dragInfo = { tipo: "nota", id: notaEl.dataset.rotaNotaId, data: notaEl.dataset.rotaNotaData, carro: notaEl.dataset.rotaNotaCarro };
      notaEl.classList.add('rota-nota-arrastando');
    }, { passive: true });
  });

  container.addEventListener('touchend', ev => {
    if (!dragInfo) return;
    const touch = ev.changedTouches && ev.changedTouches[0];
    const alvo = touch ? document.elementFromPoint(touch.clientX, touch.clientY)?.closest?.('.rota-card[data-rota-card], .rota-nota-linha[data-rota-nota-id]') : null;
    container.querySelectorAll('.rota-card-arrastando, .rota-nota-arrastando').forEach(el => el.classList.remove('rota-card-arrastando', 'rota-nota-arrastando'));
    if (!alvo) {
      dragInfo = null;
      return;
    }
    if (dragInfo.tipo === "nota") {
      const alvoCard = alvo.closest?.('.rota-card[data-rota-card]');
      const alvoNota = alvo.closest?.('.rota-nota-linha[data-rota-nota-id]');
      if (alvoNota && String(alvoNota.dataset.rotaNotaId) === String(dragInfo.id)) {
        dragInfo = null;
        return;
      }
      const alvoData = alvoCard ? alvoCard.dataset.rotaData : alvoNota?.dataset.rotaNotaData;
      const alvoCarro = alvoCard ? alvoCard.dataset.rotaCarroGrupo : alvoNota?.dataset.rotaNotaCarro;
      if (alvoData !== dragInfo.data || alvoCarro !== dragInfo.carro) {
        dragInfo = null;
        return;
      }
      const rect = alvo.getBoundingClientRect();
      const inserirDepoisNota = touch.clientY > rect.top + rect.height / 2;
      rtFinalizarMovimentoNotaRota(dragInfo, alvo, inserirDepoisNota);
      dragInfo = null;
      return;
    }
    if (String(alvo.dataset.rotaCard) === String(dragInfo.id) || alvo.dataset.rotaData !== dragInfo.data || alvo.dataset.rotaCarroGrupo !== dragInfo.carro) {
      dragInfo = null;
      return;
    }
    const rect = alvo.getBoundingClientRect();
    const inserirDepois = touch.clientY > rect.top + rect.height / 2;
    const todas = criarRotasDosEventos();
    const grupos = agruparPorDataECarro(todas);
    const lista = (grupos[dragInfo.data] && grupos[dragInfo.data][dragInfo.carro])
      ? ordenarRotasPorOrdemManual(grupos[dragInfo.data][dragInfo.carro])
      : [];
    moverRotaParaIndice(dragInfo.id, alvo.dataset.rotaCard, lista, inserirDepois).then(() => {
      renderizarRotas();
      if (typeof renderizarRuaMobile === 'function') renderizarRuaMobile();
      if (typeof renderizarCalendario === 'function') renderizarCalendario();
    });
    dragInfo = null;
  }, { passive: true });
}
