function iniciarAuth() {
  const loginScreen = document.getElementById("loginScreen");
  const appScreen = document.getElementById("appScreen");
  const loginForm = document.getElementById("loginForm");
  const colaboradorInput = document.getElementById("colaboradorInput");
  const colaboradorNome = document.getElementById("colaboradorNome");
  const logoutBtn = document.getElementById("logoutBtn");
  const loginError = document.getElementById("loginError");

  function mostrarApp(nome) {
    colaboradorNome.textContent = nome;
    loginScreen.classList.add("hidden");
    appScreen.classList.remove("hidden");
    carregarProdutos();
  }

  const salvo = getColaboradorLogado();
  if (salvo) mostrarApp(salvo);

  loginForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const nome = colaboradorInput.value.trim();
    if (nome.length < 2) {
      loginError.textContent = "Digite um nome válido.";
      return;
    }
    localStorage.setItem("novoRioTendasColaborador", nome);
    loginError.textContent = "";
    mostrarApp(nome);
  });

  logoutBtn.addEventListener("click", () => {
    localStorage.removeItem("novoRioTendasColaborador");
    location.reload();
  });
}
