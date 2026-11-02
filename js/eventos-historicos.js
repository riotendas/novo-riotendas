(() => {
  "use strict";

  const LIMITE = 50;
  let offset = 0;
  let total = 0;
  let registrosPorId = new Map();

  const $ = (id) => document.getElementById(id);
  const esc = (v) => String(v ?? "")
    .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;").replace(/'/g,"&#039;");

  function dataBR(v) {
    if (!v) return "-";
    const m = String(v).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return esc(v);
    return `${m[3]}/${m[2]}/${m[1]}`;
  }

  function dinheiroHistorico(v) {
    if (v === null || v === undefined || String(v).trim() === "") return "-";
    const s = String(v).trim();
    const n = Number(s.replace(/\./g,"").replace(",","."));
    if (Number.isFinite(n)) return n.toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
    return esc(s);
  }

  function abrir() {
    const dlg = $("baseAntigaDialog");
    if (!dlg) return;
    if (typeof dlg.showModal === "function") {
      if (!dlg.open) dlg.showModal();
    } else dlg.setAttribute("open","open");
    setTimeout(() => $("baseAntigaBusca")?.focus(), 30);
  }

  function fechar() {
    const dlg = $("baseAntigaDialog");
    if (!dlg) return;
    if (typeof dlg.close === "function") dlg.close();
    else dlg.removeAttribute("open");
  }

  function linha(r) {
    const id = `rt-hist-detalhe-${r.id}`;
    return `<div class="rt-hist-row">
      <div class="rt-hist-cell rt-hist-data" data-label="Data">${dataBR(r.data_evento)}</div>
      <div class="rt-hist-cell rt-hist-cliente" data-label="Cliente" title="${esc(r.cliente || "")}">${esc(r.cliente || "-")}</div>
      <div class="rt-hist-cell" data-label="Telefone" title="${esc(r.contatos || "")}">${esc(r.contatos || "-")}</div>
      <div class="rt-hist-cell rt-hist-endereco" data-label="Endereço" title="${esc(r.endereco || "")}">${esc(r.endereco || "-")}</div>
      <div class="rt-hist-cell rt-hist-servico" data-label="Serviço" title="${esc(r.descricao_servico || "")}">${esc(r.descricao_servico || "-")}</div>
      <div class="rt-hist-cell rt-hist-total" data-label="Total">${dinheiroHistorico(r.valor_total)}</div>
      <div class="rt-hist-cell rt-hist-mais">
        <button type="button" class="btn-outline rt-hist-mais-btn" data-hist-toggle="${id}">mais</button>
      </div>
    </div>
    <div class="rt-hist-detalhe" id="${id}" hidden>
        <div class="rt-hist-endereco-completo"><b>Endereço completo:</b> ${esc(r.endereco || "-")}</div>
        <div><b>Horário:</b> ${esc(r.horario || "-")}</div>
        <div><b>Montagem:</b> ${esc(r.montagem || "-")}</div>
        <div><b>Retirada/desmontagem:</b> ${esc(r.desmontagem || "-")}</div>
        <div><b>Colaborador:</b> ${esc(r.colaborador || "-")}</div>
        <div><b>CPF/CNPJ:</b> ${esc(r.cpf_cnpj || "-")}</div>
        <div><b>Sinal:</b> ${dinheiroHistorico(r.sinal)}</div>
        <div><b>Restante:</b> ${dinheiroHistorico(r.restante)}</div>
        <div class="rt-hist-detalhe-pag"><b>Forma de pagamento:</b> ${esc(r.forma_pagamento || "-")}</div>
        <div class="rt-hist-detalhe-serv"><b>Descrição completa:</b> ${esc(r.descricao_servico || "-")}</div>
        <div class="rt-hist-detalhe-acoes">
          <button type="button" class="btn-outline rt-hist-importar-cliente" data-hist-importar="${esc(r.id)}">Criar novo evento com este cliente</button>
          <span class="rt-hist-importar-status" data-hist-importar-status="${esc(r.id)}"></span>
        </div>
      </div>`;
  }

  function cabecalho() {
    return `<div class="rt-hist-head">
      <div>Data</div><div>Cliente</div><div>Telefone</div><div>Endereço</div>
      <div>Serviço</div><div>Total</div><div></div>
    </div>`;
  }

  async function buscar(novoOffset = 0) {
    const sb = window.supabaseClient || (typeof supabaseClient !== "undefined" ? supabaseClient : null);
    const status = $("baseAntigaStatus");
    const box = $("baseAntigaResultados");
    if (!sb || !status || !box) return;

    const campo = $("baseAntigaCampo")?.value || "todos";
    const busca = $("baseAntigaBusca")?.value?.trim() || "";
    const dataInicial = $("baseAntigaDataInicial")?.value || null;
    const dataFinal = $("baseAntigaDataFinal")?.value || null;

    if (!busca && !dataInicial && !dataFinal) {
      status.textContent = "Digite um termo ou informe uma faixa de datas para pesquisar.";
      box.innerHTML = "";
      atualizarPaginacao(0,0);
      return;
    }
    if (dataInicial && dataFinal && dataInicial > dataFinal) {
      status.textContent = "A data inicial não pode ser posterior à data final.";
      box.innerHTML = "";
      atualizarPaginacao(0,0);
      return;
    }

    offset = Math.max(0, novoOffset);
    status.textContent = "Pesquisando na base antiga...";
    box.innerHTML = '<p class="empty">Carregando...</p>';

    try {
      const { data, error } = await sb.rpc("buscar_eventos_historicos_v2", {
        p_busca: busca,
        p_campo: campo,
        p_data_inicial: dataInicial,
        p_data_final: dataFinal,
        p_limite: LIMITE,
        p_offset: offset
      });
      if (error) throw error;

      const lista = Array.isArray(data) ? data : [];
      registrosPorId = new Map(lista.map(r => [String(r.id), r]));
      total = Number(lista[0]?.total_encontrado || 0);
      status.textContent = total
        ? `${total.toLocaleString("pt-BR")} registro(s) encontrado(s).`
        : "Nenhum registro encontrado na base antiga.";
      box.innerHTML = lista.length ? cabecalho() + lista.map(linha).join("") : '<p class="empty">Nenhum resultado.</p>';
      atualizarPaginacao(total, offset);
    } catch (err) {
      console.error("Base antiga:", err);
      const msg = String(err?.message || err || "");
      const naoConfigurada = /buscar_eventos_historicos_v2|eventos_historicos|schema cache|function/i.test(msg);
      status.innerHTML = naoConfigurada
        ? '<strong>Atualização V2 da Base antiga ainda não aplicada no Supabase.</strong> Execute o novo SQL fornecido.'
        : `Não foi possível consultar a base antiga: ${esc(msg)}`;
      box.innerHTML = "";
      atualizarPaginacao(0,0);
    }
  }


  function normalizarTexto(v) {
    return String(v || "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
  }

  function digitos(v) { return String(v || "").replace(/\D/g, ""); }

  function rtHistSepararEndereco(endereco) {
    const original = String(endereco || "").trim();
    let logradouro = original;
    let bairro = "";
    // A base antiga costuma guardar "logradouro - bairro" no mesmo campo.
    // Se houver um último separador claro, usa apenas como sugestão visual;
    // o texto original permanece intacto na Base antiga.
    const partes = original.split(/\s+-\s+/).map(v => v.trim()).filter(Boolean);
    if (partes.length >= 2) {
      const candidato = partes[partes.length - 1];
      if (candidato.length <= 80 && !/^\d+$/.test(candidato)) {
        bairro = candidato;
        logradouro = partes.slice(0, -1).join(" - ");
      }
    }
    return { logradouro: logradouro || original, bairro };
  }

  function rtHistSetCampoEvento(id, valor) {
    const el = document.getElementById(id);
    if (!el) return;
    el.value = valor == null ? "" : String(valor);
    el.dispatchEvent(new Event("input", { bubbles:true }));
    el.dispatchEvent(new Event("change", { bubbles:true }));
  }

  async function importarClienteHistorico(id, btn) {
    const r = registrosPorId.get(String(id));
    if (!r) return;
    const nome = String(r.cliente || "").trim();
    const telefone = String(r.contatos || "").trim();
    const enderecoOriginal = String(r.endereco || "").trim();
    const status = document.querySelector(`[data-hist-importar-status="${CSS.escape(String(id))}"]`);

    if (!nome) { if (status) status.textContent = "Registro sem nome de cliente."; return; }
    if (btn) btn.disabled = true;
    if (status) status.textContent = "Abrindo novo evento...";

    try {
      // Apenas prepara o formulário. Nenhum cliente/evento é gravado neste clique.
      fechar();
      if (typeof abrirNovoEvento !== "function") throw new Error("Tela de novo evento indisponível.");
      abrirNovoEvento();

      const endereco = rtHistSepararEndereco(enderecoOriginal);
      const cidadePadrao = typeof carregarConfiguracoes === "function"
        ? (carregarConfiguracoes().cidadePadrao || "Rio de Janeiro")
        : "Rio de Janeiro";

      // Aguarda o dialog terminar a preparação síncrona e então preenche somente
      // os dados de identificação trazidos da Base antiga.
      setTimeout(() => {
        rtHistSetCampoEvento("eventoNome", nome);
        rtHistSetCampoEvento("eventoBuscaCliente", nome);
        rtHistSetCampoEvento("eventoTelefone", telefone);
        rtHistSetCampoEvento("eventoEndereco", endereco.logradouro || enderecoOriginal);
        rtHistSetCampoEvento("eventoBairro", endereco.bairro);
        rtHistSetCampoEvento("eventoCidade", cidadePadrao);

        // CPF/CNPJ, e-mail, complemento, datas, produtos e financeiro permanecem
        // em branco/padrão do Novo evento por segurança.
        const busca = document.getElementById("eventoBuscaCliente");
        if (busca) { try { busca.focus(); } catch (_) {} }
      }, 60);
    } catch (err) {
      console.error("Abrir novo evento pela Base antiga:", err);
      if (status) status.textContent = `Erro: ${err?.message || err}`;
      if (btn) btn.disabled = false;
    }
  }

  function atualizarPaginacao(qtd, off) {
    const ant = $("baseAntigaAnteriorBtn"), prox = $("baseAntigaProximaBtn"), info = $("baseAntigaPaginaInfo");
    if (!ant || !prox || !info) return;
    ant.disabled = off <= 0;
    prox.disabled = off + LIMITE >= qtd;
    info.textContent = qtd ? `${off+1}-${Math.min(off+LIMITE,qtd)} de ${qtd.toLocaleString("pt-BR")}` : "";
  }

  document.addEventListener("DOMContentLoaded", () => {
    $("abrirBaseAntigaBtn")?.addEventListener("click", abrir);
    $("fecharBaseAntigaBtn")?.addEventListener("click", fechar);
    $("baseAntigaBuscaForm")?.addEventListener("submit", e => { e.preventDefault(); buscar(0); });
    $("baseAntigaAnteriorBtn")?.addEventListener("click", () => buscar(Math.max(0, offset-LIMITE)));
    $("baseAntigaProximaBtn")?.addEventListener("click", () => buscar(offset+LIMITE));
    $("baseAntigaDialog")?.addEventListener("click", e => { if (e.target === $("baseAntigaDialog")) fechar(); });
    $("baseAntigaResultados")?.addEventListener("click", e => {
      const importar = e.target.closest("[data-hist-importar]");
      if (importar) { importarClienteHistorico(importar.dataset.histImportar, importar); return; }
      const btn = e.target.closest("[data-hist-toggle]");
      if (!btn) return;
      const alvo = $(btn.dataset.histToggle);
      if (!alvo) return;
      const vaiAbrir = alvo.hidden;
      alvo.hidden = !vaiAbrir;
      btn.textContent = vaiAbrir ? "menos" : "mais";
      btn.closest(".rt-hist-row")?.classList.toggle("rt-hist-row-aberta", vaiAbrir);
    });
  });

  window.abrirBaseAntiga = abrir;
})();