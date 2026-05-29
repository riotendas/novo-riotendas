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
