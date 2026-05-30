document.addEventListener("DOMContentLoaded", () => {
  const btn = document.querySelector('[data-section="calendarioSection"]');
  const section = document.getElementById("calendarioSection");

  if (!btn || !section) return;

  btn.addEventListener("click", () => {
    document.querySelectorAll(".section").forEach(sec => {
      sec.classList.remove("active-section");
      sec.classList.remove("active");
    });

    section.classList.add("active-section");

    document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    if (typeof renderizarCalendario === "function") {
      renderizarCalendario();
    }
  });
});


// v19-dev: aplica rolagem no bloco de cards do dia selecionado do calendário
function rtAplicarScrollDetalheDiaCalendario() {
  const paineis = Array.from(document.querySelectorAll('section, aside, div'))
    .filter((el) => {
      const texto = (el.textContent || '').trim();
      return /^Dia\s+\d{2}\/\d{2}\/\d{4}/.test(texto);
    });

  paineis.forEach((painel) => {
    if (painel.dataset.rtScrollDetalheDia === '1') return;

    const cards = Array.from(painel.children).filter((child) => {
      const txt = (child.textContent || '').trim();
      return /^(Evento|Mont\.|Desm\.)/.test(txt);
    });

    if (cards.length < 1) return;

    const wrapper = document.createElement('div');
    wrapper.className = 'rt-detalhe-dia-scroll-lista';
    wrapper.style.maxHeight = '665px';
    wrapper.style.overflowY = 'auto';
    wrapper.style.overflowX = 'hidden';
    wrapper.style.paddingRight = '6px';
    wrapper.style.scrollbarGutter = 'stable';

    cards[0].parentNode.insertBefore(wrapper, cards[0]);
    cards.forEach((card) => wrapper.appendChild(card));

    painel.style.overflow = 'hidden';
    painel.dataset.rtScrollDetalheDia = '1';
  });
}

document.addEventListener('DOMContentLoaded', rtAplicarScrollDetalheDiaCalendario);
document.addEventListener('click', () => setTimeout(rtAplicarScrollDetalheDiaCalendario, 50));
document.addEventListener('input', () => setTimeout(rtAplicarScrollDetalheDiaCalendario, 50));
setInterval(rtAplicarScrollDetalheDiaCalendario, 800);
