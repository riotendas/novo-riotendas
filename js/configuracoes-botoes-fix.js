(function(){
  'use strict';
  if (window.__RT_CONFIG_BOTOES_FIX_V1__) return;
  window.__RT_CONFIG_BOTOES_FIX_V1__ = true;

  function $(id){ return document.getElementById(id); }
  function chamar(nome){
    try {
      if (typeof window[nome] === 'function') {
        window[nome]();
        return true;
      }
    } catch (erro) {
      console.error('Erro em ' + nome, erro);
      alert('Erro ao executar ação: ' + (erro && erro.message ? erro.message : erro));
      return true;
    }
    return false;
  }

  function setActiveProdutoConfigTab(chave){
    const modal = $('configModalProdutos');
    if (!modal) return;
    modal.querySelectorAll('[data-produtos-config-tab]').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.produtosConfigTab === chave);
    });
    modal.querySelectorAll('[data-produtos-config-pane]').forEach(pane => {
      pane.classList.toggle('active', pane.dataset.produtosConfigPane === chave);
    });
    if (chave === 'materiais') chamar('renderizarMateriaisApoioConfig');
    if (chave === 'cores') chamar('renderizarCoresConfig');
    if (chave === 'fotos') {
      chamar('preencherSelectsFotoPadrao');
      chamar('renderizarFotosPadraoConfig');
    }
  }

  function salvarPreferenciasSeguro(){
    try {
      const carregar = window.carregarConfiguracoes;
      const padrao = window.configPadrao;
      const salvar = window.salvarConfiguracoes;
      if (typeof carregar !== 'function' || typeof padrao !== 'function' || typeof salvar !== 'function') {
        if (typeof window.salvarPreferenciasConfig === 'function') return window.salvarPreferenciasConfig();
        throw new Error('Funções de configuração não encontradas.');
      }
      const config = carregar();
      const antesLogConfig = JSON.parse(JSON.stringify(config));

      config.nomeEmpresa = ($('configNomeEmpresa')?.value || '').trim() || 'RioTendas';
      config.logoEmpresa = ($('configLogoEmpresa')?.value || '').trim() || padrao().logoEmpresa;

      const larguraLogoDoc = Number($('configLogoLarguraDocumentos')?.value || 300);
      config.logoLarguraDocumentos = Math.min(Math.max(larguraLogoDoc || 300, 80), 600);

      const formasOrcTexto = $('configFormasPagamentoOrcamento')?.value || '';
      const formasOrc = formasOrcTexto.split(/\n+/).map(v => v.trim()).filter(Boolean);
      config.formasPagamentoOrcamento = formasOrc.length ? formasOrc : (padrao().formasPagamentoOrcamento || []);

      // Mantém a observação de horários do orçamento editável nas Preferências.
      // Importante: valor vazio também deve ser salvo, pois vazio significa "não exibir no PDF".
      const obsHorariosOrcCampo = $('configObservacaoHorariosOrcamento');
      if (obsHorariosOrcCampo) {
        config.observacaoHorariosOrcamento = String(obsHorariosOrcCampo.value || '').trim();
      }

      config.assinaturaResponsavel = $('configAssinaturaResponsavel')?.value || config.assinaturaResponsavel || '';
      config.periodoRotas = $('configPeriodoRotas')?.value || '30';
      config.horarioComercial = {
        inicio: $('configHorarioComercialInicio')?.value || '08:00',
        fim: $('configHorarioComercialFim')?.value || '20:00'
      };
      config.cidadePadrao = ($('configCidadePadrao')?.value || '').trim() || 'Rio de Janeiro';
      config.pix = {
        chave: ($('configPixChave')?.value || '').trim(),
        nome: ($('configPixNome')?.value || '').trim() || 'RIOTENDAS',
        cidade: ($('configPixCidade')?.value || '').trim() || 'RIO DE JANEIRO',
        banco: ($('configPixBanco')?.value || '').trim() || 'Itaú'
      };

      salvar(config);

      if (typeof window.registrarLogSistema === 'function') {
        window.registrarLogSistema({
          modulo: 'Configurações',
          acao: 'Preferências salvas',
          registro_id: 'preferencias',
          registro_nome: 'Preferências gerais',
          antes: antesLogConfig,
          depois: config
        });
      }

      if (typeof window.aplicarConfiguracoesNoSistema === 'function') window.aplicarConfiguracoesNoSistema();
      if (typeof window.preencherPreferenciasConfig === 'function') window.preencherPreferenciasConfig();
      alert('Preferências salvas.');
    } catch (erro) {
      console.error('Erro ao salvar preferências', erro);
      alert('Erro ao salvar preferências: ' + (erro && erro.message ? erro.message : erro));
    }
  }

  document.addEventListener('click', function(e){
    const tab = e.target.closest('[data-produtos-config-tab]');
    if (tab) {
      e.preventDefault();
      e.stopPropagation();
      setActiveProdutoConfigTab(tab.dataset.produtosConfigTab);
      return;
    }

    const id = e.target.closest('button, label')?.id;
    if (!id) return;

    const mapa = {
      salvarPreferenciasConfig: salvarPreferenciasSeguro,
      exportarProdutosExcel: () => chamar('exportarProdutosExcel'),
      adicionarMaterialApoioConfig: () => chamar('adicionarMaterialApoioConfig'),
      adicionarCorConfig: () => chamar('adicionarCorConfig'),
      adicionarFotoPadraoConfig: () => chamar('adicionarFotoPadraoConfig'),
      salvarCargaOperacionalConfig: () => chamar('salvarCargaOperacionalConfig'),
      restaurarCargaOperacionalConfig: () => chamar('restaurarCargaOperacionalConfig'),
      adicionarCarroConfig: () => chamar('adicionarCarroConfig'),
      adicionarWhatsappModeloConfig: () => chamar('adicionarWhatsappModeloConfig'),
      salvarWhatsappModelosConfig: () => chamar('salvarWhatsappModelosConfig'),
      restaurarWhatsappModelosConfig: () => chamar('restaurarWhatsappModelosConfig')
    };

    if (mapa[id]) {
      e.preventDefault();
      e.stopPropagation();
      mapa[id]();
    }
  }, true);

  document.addEventListener('change', function(e){
    const id = e.target && e.target.id;
    if (id === 'importarProdutosExcel') {
      try { if (typeof window.importarProdutosExcel === 'function') window.importarProdutosExcel(e); } catch(erro){ console.error(erro); }
    }
    if (id === 'fotoPadraoCategoria') chamar('preencherTamanhosFotoPadrao');
    if (id === 'configAssinaturaResponsavelArquivo') {
      try { if (typeof window.carregarAssinaturaResponsavelConfig === 'function') window.carregarAssinaturaResponsavelConfig(e); } catch(erro){ console.error(erro); }
    }
  }, true);

  document.addEventListener('DOMContentLoaded', function(){
    const btn = $('salvarPreferenciasConfig');
    if (btn) btn.setAttribute('type','button');
    setTimeout(function(){ setActiveProdutoConfigTab('exportar'); }, 300);
  });
})();
