document.addEventListener("DOMContentLoaded", () => {
  iniciarNavegacao();
  iniciarProdutos();
  iniciarAuth();
});

function iniciarNavegacao() {
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".section").forEach(s => s.classList.remove("active-section"));
      btn.classList.add("active");
      document.getElementById(btn.dataset.section).classList.add("active-section");
    });
  });
}


document.addEventListener("DOMContentLoaded", () => {
  const aviso = document.getElementById("supabaseAviso");
  if (aviso && !supabaseClient) {
    aviso.classList.remove("hidden");
  }
});
