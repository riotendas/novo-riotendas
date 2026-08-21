(function(){
  const MOBILE_QUERY = "(max-width: 768px)";
  const mq = window.matchMedia ? window.matchMedia(MOBILE_QUERY) : { matches: false };

  function isMobile(){ return !!mq.matches; }

  function setupEventoMobileAccordion(){
    const dialog = document.getElementById("eventoDialog");
    const form = document.getElementById("eventoForm");
    if (!dialog || !form) return;

    const panels = Array.from(form.querySelectorAll(":scope > .subpanel"));
    panels.forEach((panel, index) => {
      const title = panel.querySelector(":scope > h3");
      if (!title || title.dataset.rtMobileAccordion === "1") return;
      title.dataset.rtMobileAccordion = "1";
      title.setAttribute("role", "button");
      title.setAttribute("tabindex", "0");
      title.setAttribute("aria-expanded", "true");

      const toggle = () => {
        if (!isMobile()) return;
        panel.classList.toggle("rt-mobile-collapsed");
        title.setAttribute("aria-expanded", panel.classList.contains("rt-mobile-collapsed") ? "false" : "true");
      };

      title.addEventListener("click", toggle);
      title.addEventListener("keydown", (ev) => {
        if (ev.key === "Enter" || ev.key === " ") {
          ev.preventDefault();
          toggle();
        }
      });

      // No celular, deixa Cliente, Dados do evento e Financeiro abertos.
      // Os demais painéis continuam recolhidos para reduzir a rolagem.
      const tituloPainel = String(title.textContent || "").trim().toLowerCase();
      const manterAberto = index <= 1 || tituloPainel === "financeiro";
      if (isMobile() && !manterAberto) {
        panel.classList.add("rt-mobile-collapsed");
        title.setAttribute("aria-expanded", "false");
      } else if (isMobile() && manterAberto) {
        panel.classList.remove("rt-mobile-collapsed");
        title.setAttribute("aria-expanded", "true");
      }
    });
  }

  function openPanelContaining(el){
    if (!el) return;
    const panel = el.closest && el.closest("#eventoDialog .subpanel");
    if (!panel) return;
    panel.classList.remove("rt-mobile-collapsed");
    const title = panel.querySelector(":scope > h3");
    if (title) title.setAttribute("aria-expanded", "true");
  }

  function setupAutoOpenOnFocus(){
    const dialog = document.getElementById("eventoDialog");
    if (!dialog || dialog.dataset.rtMobileAutoOpen === "1") return;
    dialog.dataset.rtMobileAutoOpen = "1";
    dialog.addEventListener("focusin", (ev) => {
      if (isMobile()) openPanelContaining(ev.target);
    });
  }

  function onDialogOpen(){
    setupEventoMobileAccordion();
    setupAutoOpenOnFocus();
    const dialog = document.getElementById("eventoDialog");
    if (!dialog || !isMobile()) return;
    setTimeout(() => {
      const form = document.getElementById("eventoForm");
      if (form) form.scrollTop = 0;
    }, 60);
  }

  document.addEventListener("DOMContentLoaded", () => {
    setupEventoMobileAccordion();
    setupAutoOpenOnFocus();
    const dialog = document.getElementById("eventoDialog");
    if (!dialog) return;
    const observer = new MutationObserver(() => {
      if (dialog.hasAttribute("open")) onDialogOpen();
    });
    observer.observe(dialog, { attributes: true, attributeFilter: ["open"] });
    if (dialog.hasAttribute("open")) onDialogOpen();
  });

  if (mq.addEventListener) mq.addEventListener("change", setupEventoMobileAccordion);
})();

/* v19-dev-eventos-mobile-modal-corrigido-real: correção forte do modal mobile */
(function(){
  const MOBILE_QUERY = "(max-width: 768px)";
  const mq = window.matchMedia ? window.matchMedia(MOBILE_QUERY) : { matches: false };
  function isMobile(){ return !!mq.matches; }
  function imp(el, prop, val){ if (el && el.style) el.style.setProperty(prop, val, 'important'); }
  function fixMobileEventoModal(){
    if (!isMobile()) return;
    const dialog = document.getElementById('eventoDialog');
    const form = document.getElementById('eventoForm');
    if (!dialog || !form || !dialog.hasAttribute('open')) return;

    imp(dialog, 'position', 'fixed');
    imp(dialog, 'inset', '0');
    imp(dialog, 'width', '100vw');
    imp(dialog, 'max-width', '100vw');
    imp(dialog, 'height', '100dvh');
    imp(dialog, 'max-height', '100dvh');
    imp(dialog, 'margin', '0');
    imp(dialog, 'padding', '0');
    imp(dialog, 'overflow', 'hidden');

    imp(form, 'height', '100dvh');
    imp(form, 'max-height', '100dvh');
    imp(form, 'overflow-y', 'auto');
    imp(form, 'overflow-x', 'hidden');
    imp(form, 'padding', '0 10px 18px');
    imp(form, 'box-sizing', 'border-box');

    const clientGrid = dialog.querySelector('.compact-client-grid');
    if (clientGrid) {
      imp(clientGrid, 'display', 'grid');
      imp(clientGrid, 'grid-template-columns', '1fr');
      imp(clientGrid, 'gap', '8px');
      imp(clientGrid, 'width', '100%');
      imp(clientGrid, 'max-width', '100%');
      imp(clientGrid, 'margin-top', '10px');
      clientGrid.querySelectorAll('label, .evento-endereco-wide, .evento-observacao-wide, .evento-colaborador-admin-field').forEach(el => {
        imp(el, 'display', 'flex');
        imp(el, 'flex-direction', 'column');
        imp(el, 'grid-column', '1 / -1');
        imp(el, 'width', '100%');
        imp(el, 'max-width', '100%');
        imp(el, 'min-width', '0');
        imp(el, 'margin', '0');
        imp(el, 'font-size', '12px');
        imp(el, 'line-height', '1.2');
        imp(el, 'box-sizing', 'border-box');
      });
      clientGrid.querySelectorAll('input, select, textarea').forEach(el => {
        imp(el, 'width', '100%');
        imp(el, 'max-width', '100%');
        imp(el, 'min-width', '0');
        imp(el, 'box-sizing', 'border-box');
        imp(el, 'font-size', '13px');
        imp(el, 'min-height', el.tagName === 'TEXTAREA' ? '64px' : '34px');
      });
    }

    dialog.querySelectorAll('#eventoEndereco, #eventoClienteObservacao').forEach(el => {
      imp(el, 'width', '100%');
      imp(el, 'min-height', '72px');
      imp(el, 'resize', 'vertical');
    });

    const enderecoRow = dialog.querySelector('.endereco-validacao-row');
    if (enderecoRow) {
      imp(enderecoRow, 'display', 'grid');
      imp(enderecoRow, 'grid-template-columns', '1fr');
      imp(enderecoRow, 'gap', '5px');
      imp(enderecoRow, 'width', '100%');
    }

    const actions = dialog.querySelector('.evento-modal-actions');
    if (actions) {
      imp(actions, 'position', 'static');
      imp(actions, 'display', 'grid');
      imp(actions, 'grid-template-columns', '1fr');
      imp(actions, 'gap', '8px');
      imp(actions, 'width', '100%');
      imp(actions, 'max-width', '100%');
      imp(actions, 'margin', '12px 0 0');
      imp(actions, 'padding', '10px 0 16px');
      imp(actions, 'background', 'transparent');
      imp(actions, 'border-top', '1px solid #d8e2ee');
      imp(actions, 'box-shadow', 'none');
      imp(actions, 'box-sizing', 'border-box');
    }
    const docActions = dialog.querySelector('.evento-doc-actions');
    if (docActions) {
      imp(docActions, 'display', 'grid');
      imp(docActions, 'grid-template-columns', 'repeat(4, minmax(0, 1fr))');
      imp(docActions, 'gap', '6px');
      imp(docActions, 'width', '100%');
      imp(docActions, 'max-width', '100%');
      imp(docActions, 'margin', '0');
    }
    const saveActions = dialog.querySelector('.evento-save-actions');
    if (saveActions) {
      imp(saveActions, 'display', 'grid');
      imp(saveActions, 'grid-template-columns', 'repeat(3, minmax(0, 1fr))');
      imp(saveActions, 'gap', '6px');
      imp(saveActions, 'width', '100%');
      imp(saveActions, 'max-width', '100%');
      imp(saveActions, 'margin', '0');
    }
    const spacer = dialog.querySelector('.evento-rodape-spacer');
    if (spacer) imp(spacer, 'display', 'none');
    dialog.querySelectorAll('.evento-doc-actions button, .evento-save-actions button').forEach(btn => {
      imp(btn, 'width', '100%');
      imp(btn, 'min-width', '0');
      imp(btn, 'max-width', 'none');
      imp(btn, 'height', '34px');
      imp(btn, 'min-height', '34px');
      imp(btn, 'padding', '6px 5px');
      imp(btn, 'font-size', '11px');
      imp(btn, 'line-height', '1');
      imp(btn, 'box-sizing', 'border-box');
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    const dialog = document.getElementById('eventoDialog');
    if (!dialog) return;
    const obs = new MutationObserver(() => setTimeout(fixMobileEventoModal, 30));
    obs.observe(dialog, { attributes: true, attributeFilter: ['open'] });
    dialog.addEventListener('input', () => setTimeout(fixMobileEventoModal, 0), true);
    dialog.addEventListener('click', () => setTimeout(fixMobileEventoModal, 0), true);
    setTimeout(fixMobileEventoModal, 200);
  });
  if (mq.addEventListener) mq.addEventListener('change', fixMobileEventoModal);
})();
