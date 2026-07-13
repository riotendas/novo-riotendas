document.addEventListener("DOMContentLoaded", () => {
  iniciarNavegacao();
  iniciarProdutos();
  if (typeof iniciarRelatorios === "function") iniciarRelatorios();
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

// v19-dev: controle simples de versão/cache para reduzir app antigo em celulares.
const RIOTENDAS_APP_VERSION = "v19-dev-2026-07-13-check-busca-recorrentes";

function iniciarControleVersaoCache() {
  try {
    const rodape = document.createElement("div");
    rodape.className = "rt-versao-rodape";
    rodape.textContent = `Versão ${RIOTENDAS_APP_VERSION}`;
    document.body.appendChild(rodape);

    const chave = "riotendas_app_version";
    const instalada = localStorage.getItem(chave);
    if (instalada === RIOTENDAS_APP_VERSION) return;

    const banner = document.createElement("div");
    banner.className = "rt-versao-cache-banner";
    banner.innerHTML = `
      <div><strong>🔄 Nova versão disponível</strong><br><span>Atualize para limpar cache e sincronizar o sistema.</span></div>
      <div class="rt-versao-cache-banner-actions">
        <button type="button" class="rt-versao-depois">Depois</button>
        <button type="button" class="rt-versao-atualizar">Atualizar agora</button>
      </div>
    `;
    document.body.appendChild(banner);

    banner.querySelector(".rt-versao-depois")?.addEventListener("click", () => {
      localStorage.setItem(chave, RIOTENDAS_APP_VERSION);
      banner.remove();
    });

    banner.querySelector(".rt-versao-atualizar")?.addEventListener("click", async () => {
      try {
        if ("serviceWorker" in navigator) {
          const regs = await navigator.serviceWorker.getRegistrations();
          await Promise.all(regs.map(reg => reg.unregister()));
        }
        if (window.caches && caches.keys) {
          const keys = await caches.keys();
          await Promise.all(keys.map(k => caches.delete(k)));
        }
      } catch (err) {
        console.warn("Não foi possível limpar todo o cache automaticamente", err);
      }
      localStorage.setItem(chave, RIOTENDAS_APP_VERSION);
      window.location.reload();
    });
  } catch (err) {
    console.warn("Controle de versão indisponível", err);
  }
}

document.addEventListener("DOMContentLoaded", iniciarControleVersaoCache);


// v19-dev: abrir Rotas em nova aba a partir do link "Ver rota" do cadastro de evento.
function aplicarParametrosRotaAoAbrir() {
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get("section") !== "rotas") return;

    const dataParam = params.get("rotaData") || "";
    const tipoParam = params.get("rotaTipo") || "";
    window.__riotendasRotaLinkParams = { data: dataParam, tipo: tipoParam };

    const abrir = () => {
      const tab = document.querySelector('[data-section="rotasSection"]');
      if (tab) tab.click();
      const rotaPeriodo = document.getElementById("rotaPeriodo");
      const rotaData = document.getElementById("rotaData");
      const rotaTipo = document.getElementById("rotaTipoFiltro");
      const rotaCarro = document.getElementById("rotaCarroFiltro");
      if (rotaPeriodo) rotaPeriodo.value = "data";
      if (rotaData && dataParam) rotaData.value = dataParam;
      if (rotaTipo && tipoParam) rotaTipo.value = tipoParam;
      if (rotaCarro) rotaCarro.value = "";
      if (typeof renderizarRotas === "function") renderizarRotas();
    };

    abrir();
    [250, 700, 1300, 2500, 4000].forEach(ms => setTimeout(abrir, ms));
  } catch (err) {
    console.warn("Não foi possível aplicar parâmetros da rota", err);
  }
}

document.addEventListener("DOMContentLoaded", aplicarParametrosRotaAoAbrir);
