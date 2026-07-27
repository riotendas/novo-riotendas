
let usuarioLogadoSistema = null;
let usuariosSistema = [];

const storageSessaoUsuarioKey = "novoRioTendasUsuarioSessaoV1";
const storageUsuariosLocalKey = "novoRioTendasUsuariosSistemaV1";

const storagePermissoesUsuariosOverrideKey = "novoRioTendasPermissoesUsuariosOverrideV1";

function rtPermissoesUsuarioOverrideLocal() {
  try { return JSON.parse(localStorage.getItem(storagePermissoesUsuariosOverrideKey) || "{}"); }
  catch { return {}; }
}

function rtSalvarPermissoesUsuarioOverrideLocal(usuario) {
  if (!usuario || !(usuario.id || usuario.usuario)) return;
  const mapa = rtPermissoesUsuarioOverrideLocal();
  const chaveId = usuario.id ? `id:${usuario.id}` : null;
  const chaveLogin = usuario.usuario ? `login:${String(usuario.usuario).toLowerCase()}` : null;
  const perms = usuario.permissoes || null;
  if (chaveId) mapa[chaveId] = perms;
  if (chaveLogin) mapa[chaveLogin] = perms;
  localStorage.setItem(storagePermissoesUsuariosOverrideKey, JSON.stringify(mapa));
}

function rtAplicarPermissoesUsuarioOverrideLocal(usuario) {
  if (!usuario) return usuario;
  const mapa = rtPermissoesUsuarioOverrideLocal();
  const porId = usuario.id ? mapa[`id:${usuario.id}`] : null;
  const porLogin = usuario.usuario ? mapa[`login:${String(usuario.usuario).toLowerCase()}`] : null;
  const override = porId || porLogin;
  return override ? { ...usuario, permissoes: override } : usuario;
}

function perfilUsuarioLabel(perfil) {
  if (perfil === "administrador") return "Administrador";
  if (perfil === "operacional") return "Operacional";
  if (perfil === "manutencao") return "Manutenção";
  if (perfil === "rua") return "Rua";
  return perfil || "-";
}


function normalizarPerfilSistemaApp(perfil) {
  const p = String(perfil || "").trim().toLowerCase();
  if (["admin", "administrador", "administrator"].includes(p)) return "administrador";
  if (["operador", "operacional", "operation"].includes(p)) return "operacional";
  if (["manutencao", "manutenção", "manutencao_mobile"].includes(p)) return "manutencao";
  if (["rua", "motorista", "entrega"].includes(p)) return "rua";
  return p || "operacional";
}

function normalizarUsuarioSistemaApp(usuario) {
  if (!usuario) return usuario;
  const perfil = normalizarPerfilSistemaApp(usuario.perfil);
  const normalizador = (typeof window !== "undefined" && typeof window.normalizarPermissoesUsuarioMobileV19 === "function")
    ? window.normalizarPermissoesUsuarioMobileV19
    : normalizarPermissoesUsuario;
  return rtAplicarPermissoesUsuarioOverrideLocal({
    ...usuario,
    perfil,
    permissoes: normalizador(perfil, usuario.permissoes || null)
  });
}

function opcoesPerfilParaBanco(perfil) {
  const app = normalizarPerfilSistemaApp(perfil);
  if (app === "administrador") return ["administrador", "admin"];
  if (app === "operacional") return ["operacional", "operador"];
  if (app === "manutencao") return ["manutencao", "manutenção"];
  // Alguns bancos antigos não têm "rua" no CHECK do perfil.
  // Tenta salvar como rua e, se o Supabase recusar, mantém como operacional com permissões mobile.
  if (app === "rua") return ["rua", "operacional"];
  return [app || "operacional"];
}

function getUsuarioLogado() {
  if (usuarioLogadoSistema) return usuarioLogadoSistema;

  try {
    return normalizarUsuarioSistemaApp(JSON.parse(localStorage.getItem(storageSessaoUsuarioKey) || "null"));
  } catch {
    return null;
  }
}

function getColaboradorLogado() {
  const usuario = getUsuarioLogado();

  if (usuario && (usuario.nome || usuario.usuario)) {
    return usuario.nome || usuario.usuario;
  }

  return localStorage.getItem("novoRioTendasColaborador") || "";
}

window.getColaboradorLogado = getColaboradorLogado;

function usuarioEhAdministrador() {
  const usuario = getUsuarioLogado();
  return usuario && usuario.perfil === "administrador";
}

async function buscarUsuariosSistemaBanco() {
  if (typeof supabaseClient !== "undefined" && supabaseClient) {
    const { data, error } = await supabaseClient
      .from("usuarios_sistema")
      .select("id,nome,usuario,senha,perfil,ativo,criado_em,atualizado_em,permissoes")
      .order("nome", { ascending: true });

    if (!error && Array.isArray(data)) return data.map(normalizarUsuarioSistemaApp);

    console.warn("Erro ao buscar usuários:", error);
  }

  return JSON.parse(localStorage.getItem(storageUsuariosLocalKey) || "[]").map(normalizarUsuarioSistemaApp);
}

async function salvarUsuarioSistemaBanco(usuario) {
  const usuarioAntesLog = Array.isArray(usuariosSistema)
    ? usuariosSistema.find(u => String(u.id) === String(usuario.id))
    : null;
  const usuarioLogin = String(usuario.usuario || "").trim();

  if (!usuarioLogin) {
    alert("Informe o usuário/login.");
    return null;
  }

  const perfilAppUsuario = normalizarPerfilSistemaApp(usuario.perfil || "operacional");
  const normalizadorPermUsuario = (typeof window !== "undefined" && typeof window.normalizarPermissoesUsuarioMobileV19 === "function")
    ? window.normalizarPermissoesUsuarioMobileV19
    : normalizarPermissoesUsuario;
  const permissoesNormalizadas = normalizadorPermUsuario(perfilAppUsuario, usuario.permissoes || null);
  const payload = {
    nome: usuario.nome || "",
    usuario: usuarioLogin,
    senha: usuario.senha || "",
    perfil: perfilAppUsuario,
    ativo: usuario.ativo !== false,
    permissoes: permissoesNormalizadas,
    atualizado_em: new Date().toISOString()
  };

  // Garante que a permissão alterada no modal já fique disponível nesta sessão,
  // mesmo se o Supabase antigo recusar algum campo novo.
  rtSalvarPermissoesUsuarioOverrideLocal({ ...usuario, perfil: perfilAppUsuario, permissoes: permissoesNormalizadas });

  if (typeof supabaseClient !== "undefined" && supabaseClient) {
    const perfisBancoTentativa = Array.from(new Set(opcoesPerfilParaBanco(perfilAppUsuario)));

    async function tentarSalvarUsuarioSistemaNoBanco(operacao) {
      let ultimoErro = null;
      for (const perfilBanco of perfisBancoTentativa) {
        const payloadBanco = { ...payload, perfil: perfilBanco };
        let resultado = await operacao(payloadBanco);
        if (resultado.error) {
          const msgCol = String(resultado.error?.message || "").toLowerCase();
          if (msgCol.includes("permissoes") && (msgCol.includes("column") || msgCol.includes("schema cache") || msgCol.includes("could not find"))) {
            const { permissoes, ...payloadSemPermissoes } = payloadBanco;
            resultado = await operacao(payloadSemPermissoes);
          }
        }
        if (!resultado.error) {
          return { data: normalizarUsuarioSistemaApp({ ...resultado.data, permissoes: resultado.data?.permissoes || permissoesNormalizadas }), error: null };
        }
        ultimoErro = resultado.error;
        const msg = String(resultado.error?.message || "").toLowerCase();
        if (!msg.includes("usuarios_sistema_perfil_check") && !msg.includes("check constraint")) break;
      }
      return { data: null, error: ultimoErro };
    }

    // EDIÇÃO: atualiza pelo ID do usuário selecionado
    if (usuario.id) {
      const { data, error } = await tentarSalvarUsuarioSistemaNoBanco(payloadBanco => supabaseClient
        .from("usuarios_sistema")
        .update(payloadBanco)
        .eq("id", usuario.id)
        .select()
        .single());

      if (error) {
        alert("Erro ao editar usuário: " + (error.message || ""));
        return null;
      }

      if (typeof registrarLogSistema === "function") {
        registrarLogSistema({
          modulo: "Usuários",
          acao: "Usuário editado",
          registro_id: data.id,
          registro_nome: data.nome || data.usuario,
          antes: usuarioAntesLog || null,
          depois: data
        });
      }

      return data;
    }

    // CRIAÇÃO: usa upsert pelo campo usuario.
    // Se o login já existir, atualiza o cadastro existente em vez de travar com erro de duplicidade.
    const { data, error } = await tentarSalvarUsuarioSistemaNoBanco(payloadBanco => supabaseClient
      .from("usuarios_sistema")
      .upsert(payloadBanco, { onConflict: "usuario" })
      .select()
      .single());

    if (error) {
      alert("Erro ao salvar usuário: " + (error.message || ""));
      return null;
    }

    if (typeof registrarLogSistema === "function") {
      registrarLogSistema({
        modulo: "Usuários",
        acao: usuario.id ? "Usuário editado" : "Usuário cadastrado",
        registro_id: data.id,
        registro_nome: data.nome || data.usuario,
        antes: usuarioAntesLog || null,
        depois: data
      });
    }

    return data;
  }

  const lista = await buscarUsuariosSistemaBanco();

  if (usuario.id) {
    const idx = lista.findIndex(u => String(u.id) === String(usuario.id));
    const atualizado = { ...payload, id: usuario.id };

    if (idx >= 0) lista[idx] = atualizado;
    else lista.push(atualizado);

    localStorage.setItem(storageUsuariosLocalKey, JSON.stringify(lista));
    return atualizado;
  }

  const existenteIndex = lista.findIndex(u =>
    String(u.usuario || "").trim().toLowerCase() === usuarioLogin.toLowerCase()
  );

  const salvo = {
    ...payload,
    id: existenteIndex >= 0 ? lista[existenteIndex].id : (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()))
  };

  if (existenteIndex >= 0) lista[existenteIndex] = salvo;
  else lista.push(salvo);

  localStorage.setItem(storageUsuariosLocalKey, JSON.stringify(lista));
  return salvo;
}

async function excluirUsuarioSistemaBanco(id) {
  const usuarioAntesLog = Array.isArray(usuariosSistema)
    ? usuariosSistema.find(u => String(u.id) === String(id))
    : null;

  if (typeof supabaseClient !== "undefined" && supabaseClient) {
    const { error } = await supabaseClient
      .from("usuarios_sistema")
      .delete()
      .eq("id", id);

    if (error) {
      alert("Erro ao excluir usuário: " + (error.message || ""));
      return false;
    }

    if (typeof registrarLogSistema === "function") {
      registrarLogSistema({
        modulo: "Usuários",
        acao: "Usuário excluído",
        registro_id: id,
        registro_nome: usuarioAntesLog?.nome || usuarioAntesLog?.usuario || "Usuário",
        antes: usuarioAntesLog || null,
        depois: null
      });
    }

    return true;
  }

  const lista = await buscarUsuariosSistemaBanco();
  localStorage.setItem(storageUsuariosLocalKey, JSON.stringify(lista.filter(u => String(u.id) !== String(id))));
  return true;
}

async function garantirAdminPadrao() {
  const lista = await buscarUsuariosSistemaBanco();

  if (lista.length) return;

  await salvarUsuarioSistemaBanco({
    nome: "Administrador",
    usuario: "admin",
    senha: "admin123",
    perfil: "administrador",
    ativo: true
  });
}

async function autenticarUsuarioSistema(usuario, senha) {
  const lista = await buscarUsuariosSistemaBanco();

  return normalizarUsuarioSistemaApp(lista.find(u =>
    u.ativo !== false &&
    String(u.usuario || "").trim().toLowerCase() === String(usuario || "").trim().toLowerCase() &&
    String(u.senha || "") === String(senha || "")
  ) || null);
}

function esconderAba(sectionId) {
  const tab = document.querySelector(`[data-section="${sectionId}"]`);
  const section = document.getElementById(sectionId);

  if (tab) tab.style.display = "none";
  if (section) section.style.display = "none";
}

function aplicarPermissoesUsuario() {
  const usuario = getUsuarioLogado();
  if (!usuario) return;

  document.body.classList.remove(
    "perfil-admin",
    "perfil-operacional",
    "perfil-manutencao",
    "perfil-rua"
  );

  document.body.classList.add(`perfil-${usuario.perfil}`);

  document.querySelectorAll(".admin-only").forEach(el => {
    el.style.display = usuario.perfil === "administrador" ? "" : "none";
  });

  // ADMINISTRADOR = acesso TOTAL
  if (usuario.perfil === "administrador") {

    document.querySelectorAll(".tab-btn").forEach(btn => {
      btn.style.display = "";
      btn.disabled = false;
    });

    document.querySelectorAll(".section").forEach(sec => {
      sec.style.display = "";
    });

    document.querySelectorAll(".admin-only").forEach(el => {
      el.style.display = "";
    });

    return;
  }

  // OPERACIONAL
  if (usuario.perfil === "operacional") {
    esconderAba("usuariosSection");
    esconderAba("configSection");

    // esconder botões críticos
    document.querySelectorAll(
      ".btn-danger, .danger, [data-excluir], .delete-btn"
    ).forEach(el => {
      el.style.display = "none";
    });

    return;
  }

  // MANUTENÇÃO
  if (usuario.perfil === "manutencao") {

    const permitidas = ["mobileHubSection", "manutencaoMobileSection", "produtosSection"];

    document.querySelectorAll(".tab-btn").forEach(btn => {
      const section = btn.dataset.section;

      if (!permitidas.includes(section)) {
        btn.style.display = "none";
      }
    });

    document.querySelectorAll(".section").forEach(sec => {
      if (!permitidas.includes(sec.id)) {
        sec.style.display = "none";
      }
    });

    const mobileBtn = document.querySelector('[data-section="mobileHubSection"]') || document.getElementById("mobileTopBtn");
    const manutMobileSection = document.getElementById("manutencaoMobileSection");

    if (mobileBtn) mobileBtn.classList.add("active");

    document.querySelectorAll(".section").forEach(sec => {
      sec.classList.remove("active", "active-section");
    });

    if (manutMobileSection) {
      manutMobileSection.style.display = "";
      manutMobileSection.classList.add("active", "active-section");
    }

    esconderAba("usuariosSection");
    esconderAba("configSection");
  }


  // RUA MOBILE: acesso restrito à tela simplificada de rotas.
  if (usuario.perfil === "rua") {
    const permitidas = ["ruaMobileSection"];

    document.querySelectorAll(".tab-btn").forEach(btn => {
      const section = btn.dataset.section;
      if (!permitidas.includes(section)) btn.style.display = "none";
      else {
        btn.style.display = "";
        btn.classList.add("active");
      }
    });

    document.querySelectorAll(".section").forEach(sec => {
      sec.classList.remove("active-section", "active");
      if (!permitidas.includes(sec.id)) sec.style.display = "none";
    });

    const ruaSection = document.getElementById("ruaMobileSection");
    if (ruaSection) {
      ruaSection.style.display = "";
      ruaSection.classList.add("active-section", "active");
    }

    return;
  }
}

function mostrarAppUsuario(usuario) {
  usuarioLogadoSistema = usuario;
  window.usuarioLogadoSistema = usuario;

  localStorage.setItem(storageSessaoUsuarioKey, JSON.stringify(usuario));
  localStorage.setItem("novoRioTendasColaborador", usuario.nome || usuario.usuario || "");
  localStorage.setItem("colaboradorLogado", usuario.nome || usuario.usuario || "");

  const loginScreen = document.getElementById("loginScreen");
  const appScreen = document.getElementById("appScreen");
  const colaboradorNome = document.getElementById("colaboradorNome");

  if (colaboradorNome) {
    colaboradorNome.textContent = `${usuario.nome || usuario.usuario} (${perfilUsuarioLabel(usuario.perfil)})`;
  }

  if (loginScreen) loginScreen.classList.add("hidden");
  if (appScreen) appScreen.classList.remove("hidden");

  aplicarPermissoesUsuario();
  aplicarPermissoesUsuarioIndividual();
  aplicarPermissoesUsuarioIndividual();
  montarEditorPermissoesPerfil();
  garantirEstruturaUsuariosAdmin();

  if (typeof carregarProdutos === "function") carregarProdutos();
  if (typeof carregarClientes === "function") carregarClientes();
  if (typeof carregarEventos === "function") carregarEventos().then(() => { if (typeof renderizarRuaMobile === "function") renderizarRuaMobile(); });

  setTimeout(() => {
    if (typeof renderizarUsuariosSistema === "function") renderizarUsuariosSistema();
  }, 300);
}

function sairUsuarioSistema() {
  localStorage.removeItem(storageSessaoUsuarioKey);
  localStorage.removeItem("novoRioTendasColaborador");
  localStorage.removeItem("colaboradorLogado");
  location.reload();
}

async function iniciarAuth() {
  const loginScreen = document.getElementById("loginScreen");
  const appScreen = document.getElementById("appScreen");
  const loginForm = document.getElementById("loginForm");
  const usuarioInput = document.getElementById("usuarioInput") || document.getElementById("colaboradorInput");
  const senhaInput = document.getElementById("senhaInput");
  const logoutBtn = document.getElementById("logoutBtn");
  const loginError = document.getElementById("loginError");

  await garantirAdminPadrao();

  const sessao = getUsuarioLogado();

  if (sessao) {
    mostrarAppUsuario(sessao);
  } else {
    if (loginScreen) loginScreen.classList.remove("hidden");
    if (appScreen) appScreen.classList.add("hidden");
  }

  if (loginForm) {
    loginForm.addEventListener("submit", async (event) => {
      event.preventDefault();

      const usuario = usuarioInput ? usuarioInput.value.trim() : "";
      const senha = senhaInput ? senhaInput.value : "";

      const autenticado = await autenticarUsuarioSistema(usuario, senha);

      if (!autenticado) {
        if (loginError) loginError.textContent = "Usuário ou senha inválidos.";
        return;
      }

      if (loginError) loginError.textContent = "";

      mostrarAppUsuario({
        id: autenticado.id,
        nome: autenticado.nome,
        usuario: autenticado.usuario,
        perfil: autenticado.perfil,
        permissoes: autenticado.permissoes || null
      });
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener("click", sairUsuarioSistema);
  }
}

async function carregarUsuariosSistema() {
  usuariosSistema = await buscarUsuariosSistemaBanco();
  return usuariosSistema;
}

async function renderizarUsuariosSistema() {
  const tbody = document.getElementById("usuariosTbody");
  if (!tbody) return;

  if (!usuarioEhAdministrador()) {
    tbody.innerHTML = `<tr><td colspan="5">Acesso restrito ao administrador.</td></tr>`;
    return;
  }

  await carregarUsuariosSistema();

  garantirColunaPermissoesUsuarios();

  tbody.innerHTML = usuariosSistema.map(u => `
    <tr>
      <td>${u.nome || "-"}</td>
      <td>${u.usuario || "-"}</td>
      <td>${perfilUsuarioLabel(u.perfil)}</td>
      <td>${u.ativo === false ? "Inativo" : "Ativo"}</td>
      <td>${resumoPermissoesUsuario(u)}</td>
      <td class="clientes-actions">
        <div class="clientes-actions-row">
          <button type="button" class="btn-outline" data-editar-usuario="${u.id}">Editar</button>
          <button type="button" class="btn-outline danger" data-excluir-usuario="${u.id}">Excluir</button>
        </div>
      </td>
    </tr>
  `).join("");

  tbody.querySelectorAll("[data-editar-usuario]").forEach(btn => {
    btn.addEventListener("click", () => abrirUsuarioModal(btn.dataset.editarUsuario));
  });

  tbody.querySelectorAll("[data-excluir-usuario]").forEach(btn => {
    btn.addEventListener("click", async () => {
      if (!confirm("Excluir este usuário?")) return;
      await excluirUsuarioSistemaBanco(btn.dataset.excluirUsuario);
      renderizarUsuariosSistema();
      renderizarUsuariosSistemaConfig();
    });
  });
}

function abrirUsuarioModal(id = null) {
  if (!usuarioEhAdministrador()) {
    alert("Apenas administrador pode gerenciar usuários.");
    return;
  }

  const modal = document.getElementById("usuarioModal");
  if (!modal) return;

  const usuario = id ? usuariosSistema.find(u => String(u.id) === String(id)) : null;

  document.getElementById("usuarioModalTitulo").textContent = usuario ? "Editar usuário" : "Novo usuário";
  document.getElementById("usuarioId").value = usuario?.id || "";
  document.getElementById("usuarioNome").value = usuario?.nome || "";
  document.getElementById("usuarioLogin").value = usuario?.usuario || "";
  document.getElementById("usuarioSenha").value = usuario?.senha || "";
  document.getElementById("usuarioPerfil").value = usuario?.perfil || "operacional";
  document.getElementById("usuarioAtivo").value = String(usuario?.ativo !== false);

  montarPermissoesNoModalUsuario(usuario);

  modal.showModal();
}

function fecharUsuarioModal() {
  const modal = document.getElementById("usuarioModal");
  if (modal) modal.close();
}

function iniciarUsuariosSistema() {
  const novoBtn = document.getElementById("novoUsuarioBtn");
  const fecharBtn = document.getElementById("fecharUsuarioModal");
  const cancelarBtn = document.getElementById("cancelarUsuario");
  const form = document.getElementById("usuarioForm");

  if (novoBtn) novoBtn.addEventListener("click", () => abrirUsuarioModal());
  if (fecharBtn) fecharBtn.addEventListener("click", fecharUsuarioModal);
  if (cancelarBtn) cancelarBtn.addEventListener("click", fecharUsuarioModal);

  if (form) {
    form.addEventListener("submit", async e => {
      e.preventDefault();

      const salvo = await salvarUsuarioSistemaBanco({
        id: document.getElementById("usuarioId").value || undefined,
        nome: document.getElementById("usuarioNome").value.trim(),
        usuario: document.getElementById("usuarioLogin").value.trim(),
        senha: document.getElementById("usuarioSenha").value,
        perfil: document.getElementById("usuarioPerfil").value,
        ativo: document.getElementById("usuarioAtivo").value === "true",
        permissoes: coletarPermissoesDoModalUsuario()
      });

      if (!salvo) return;

      fecharUsuarioModal();
      renderizarUsuariosSistema();
      renderizarUsuariosSistemaConfig();
    });
  }

  setTimeout(renderizarUsuariosSistema, 500);
}

document.addEventListener("DOMContentLoaded", () => {
  iniciarAuth();
  iniciarUsuariosSistema();
});


document.addEventListener("DOMContentLoaded", () => {
  setTimeout(() => {

    const usuario = getUsuarioLogado();

    if (usuario && usuario.perfil === "administrador") {

      document.querySelectorAll(".admin-only").forEach(el => {
        el.style.display = "";
      });

      const usuariosBtn = document.querySelector('[data-section="usuariosSection"]');
      const usuariosSection = document.getElementById("usuariosSection");

      if (usuariosBtn) {
        usuariosBtn.style.display = "";
        usuariosBtn.disabled = false;
      }

      if (usuariosSection) {
        usuariosSection.style.display = "";
      }
    }

  }, 300);
});


function garantirEstruturaUsuariosAdmin() {
  const usuario = getUsuarioLogado ? getUsuarioLogado() : null;
  if (!usuario || usuario.perfil !== "administrador") return;

  let btn = document.querySelector('[data-section="usuariosSection"]');

  if (!btn) {
    const tabs = document.querySelector(".tabs, nav");
    if (tabs) {
      btn = document.createElement("button");
      btn.className = "tab-btn admin-only";
      btn.dataset.section = "usuariosSection";
      btn.type = "button";
      btn.textContent = "Usuários";

      const configBtn = tabs.querySelector('[data-section="configSection"]');
      if (configBtn) tabs.insertBefore(btn, configBtn);
      else tabs.appendChild(btn);
    }
  }

  let section = document.getElementById("usuariosSection");

  if (!section) {
    section = document.createElement("section");
    section.id = "usuariosSection";
    section.className = "section";
    section.innerHTML = `
      <div class="section-header">
        <div>
          <h2>Usuários</h2>
          <p>Gerencie usuários, senhas e perfis de acesso.</p>
        </div>
        <button id="novoUsuarioBtn" class="btn-primary" type="button">Novo usuário</button>
      </div>

      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Nome</th>
              <th>Usuário</th>
              <th>Perfil</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody id="usuariosTbody"></tbody>
        </table>
      </div>
    `;

    const appScreen = document.getElementById("appScreen") || document.querySelector("main") || document.body;
    const configSection = document.getElementById("configSection");

    if (configSection && configSection.parentNode) {
      configSection.parentNode.insertBefore(section, configSection);
    } else {
      appScreen.appendChild(section);
    }
  }

  if (btn) {
    btn.style.display = "";
    btn.hidden = false;
    btn.disabled = false;

    if (!btn.dataset.usuariosListener) {
      btn.dataset.usuariosListener = "1";
      btn.addEventListener("click", () => {
        document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
        document.querySelectorAll(".section").forEach(s => s.classList.remove("active"));

        btn.classList.add("active");
        section.classList.add("active");
        section.style.display = "";

        if (typeof renderizarUsuariosSistema === "function") renderizarUsuariosSistema();
      });
    }
  }

  section.style.display = "";
  section.hidden = false;

  if (typeof iniciarUsuariosSistema === "function") iniciarUsuariosSistema();
  if (typeof renderizarUsuariosSistema === "function") renderizarUsuariosSistema();
}


document.addEventListener("DOMContentLoaded", () => {
  setTimeout(garantirEstruturaUsuariosAdmin, 500);
  setTimeout(garantirEstruturaUsuariosAdmin, 1200);
});


function garantirUsuariosDentroConfiguracoes() {
  const usuario = typeof getUsuarioLogado === "function" ? getUsuarioLogado() : null;
  if (!usuario || usuario.perfil !== "administrador") return;

  const config = document.getElementById("usuariosAdminConfigSlot") || document.querySelector("#configModalUsuarios .config-popup-body");
  if (!config) return;

  if (document.getElementById("usuariosAdminConfigBox")) return;

  const box = document.createElement("div");
  box.id = "usuariosAdminConfigBox";
  box.className = "usuarios-admin-box";
  box.innerHTML = `
    <div class="section-header">
      <div>
        <h2>Usuários</h2>
        <p>Gerencie usuários, senhas e perfis de acesso.</p>
      </div>
      <button id="novoUsuarioBtnConfig" class="btn-primary" type="button">Novo usuário</button>
    </div>

    <div class="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>Nome</th>
            <th>Usuário</th>
            <th>Perfil</th>
            <th>Status</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody id="usuariosTbodyConfig"></tbody>
      </table>
    </div>
  `;

  config.appendChild(box);

  const novo = document.getElementById("novoUsuarioBtnConfig");
  if (novo) novo.addEventListener("click", () => abrirUsuarioModal());

  renderizarUsuariosSistemaConfig();
}

async function renderizarUsuariosSistemaConfig() {
  const tbody = document.getElementById("usuariosTbodyConfig");
  if (!tbody) return;

  if (!usuarioEhAdministrador()) {
    tbody.innerHTML = `<tr><td colspan="5">Acesso restrito ao administrador.</td></tr>`;
    return;
  }

  await carregarUsuariosSistema();

  garantirColunaPermissoesUsuarios();

  tbody.innerHTML = usuariosSistema.map(u => `
    <tr>
      <td class="clientes-actions"><div class="clientes-actions-row">${u.nome || "-"}</td>
      <td>${u.usuario || "-"}</td>
      <td>${perfilUsuarioLabel(u.perfil)}</td>
      <td>${u.ativo === false ? "Inativo" : "Ativo"}</td>
      <td>${resumoPermissoesUsuario(u)}</td>
      <td>${resumoPermissoesUsuario(u)}</td>
      <td>
        <button type="button" class="btn-outline" data-editar-usuario-config="${u.id}">Editar</button>
        <button type="button" class="btn-outline danger" data-excluir-usuario-config="${u.id}">Excluir</button></div></td>
    </tr>
  `).join("");

  tbody.querySelectorAll("[data-editar-usuario-config]").forEach(btn => {
    btn.addEventListener("click", () => abrirUsuarioModal(btn.dataset.editarUsuarioConfig));
  });

  tbody.querySelectorAll("[data-excluir-usuario-config]").forEach(btn => {
    btn.addEventListener("click", async () => {
      if (!confirm("Excluir este usuário?")) return;
      await excluirUsuarioSistemaBanco(btn.dataset.excluirUsuarioConfig);
      renderizarUsuariosSistemaConfig();
      if (typeof renderizarUsuariosSistema === "function") renderizarUsuariosSistema();
    });
  });
}


document.addEventListener("DOMContentLoaded", () => {
  setTimeout(garantirUsuariosDentroConfiguracoes, 600);
  setTimeout(garantirUsuariosDentroConfiguracoes, 1500);

  document.querySelectorAll('[data-section="configSection"]').forEach(btn => {
    btn.addEventListener("click", () => {
      setTimeout(garantirUsuariosDentroConfiguracoes, 100);
    });
  });
});



/* =====================================================
   Permissões por Perfil / Página
===================================================== */

const paginasSistemaPermissoes = [
  { id: "dashboardSection", label: "Dashboard" },
  { id: "produtosSection", label: "Produtos" },
  { id: "clientesSection", label: "Clientes" },
  { id: "eventosSection", label: "Eventos" },
  { id: "orcamentosSection", label: "Orçamentos" },
  { id: "calendarioSection", label: "Agenda" },
  { id: "rotasSection", label: "Rotas" },
  { id: "mapaSection", label: "Mapa" },
  { id: "financeiroSection", label: "Financeiro" },
  { id: "relatoriosSection", label: "Relatórios" },
  { id: "usuariosSection", label: "Usuários" },
  { id: "configSection", label: "Configurações" }
];

const perfisSistemaPermissoes = [
  { id: "administrador", label: "Administrador" },
  { id: "operacional", label: "Operacional" },
  { id: "manutencao", label: "Manutenção" }
];

const permissoesPadraoPerfil = {
  administrador: {
    dashboardSection: true,
    produtosSection: true,
    clientesSection: true,
    eventosSection: true,
    orcamentosSection: true,
    calendarioSection: true,
    rotasSection: true,
    financeiroSection: true,
    relatoriosSection: true,
    usuariosSection: true,
    configSection: true
  },
  operacional: {
    dashboardSection: true,
    produtosSection: true,
    clientesSection: true,
    eventosSection: true,
    orcamentosSection: true,
    calendarioSection: true,
    rotasSection: true,
    financeiroSection: true,
    relatoriosSection: true,
    usuariosSection: false,
    configSection: false
  },
  manutencao: {
    dashboardSection: false,
    produtosSection: true,
    clientesSection: false,
    eventosSection: false,
    orcamentosSection: false,
    calendarioSection: false,
    rotasSection: false,
    financeiroSection: false,
    relatoriosSection: true,
    usuariosSection: false,
    configSection: false
  }
};

let permissoesPerfilSistemaCache = null;

function normalizarPermissoesPerfil(permissoes = {}) {
  const final = JSON.parse(JSON.stringify(permissoesPadraoPerfil));

  Object.entries(permissoes || {}).forEach(([perfil, paginas]) => {
    if (!final[perfil]) final[perfil] = {};
    Object.entries(paginas || {}).forEach(([pagina, permitido]) => {
      final[perfil][pagina] = Boolean(permitido);
    });
  });

  // Segurança: administrador sempre acessa Usuários e Configurações.
  if (final.administrador) {
    paginasSistemaPermissoes.forEach(p => final.administrador[p.id] = true);
  }

  return final;
}

async function carregarPermissoesPerfilSistema() {
  if (permissoesPerfilSistemaCache) return permissoesPerfilSistemaCache;

  if (typeof supabaseClient !== "undefined" && supabaseClient) {
    try {
      const { data, error } = await supabaseClient
        .from("app_config")
        .select("valor")
        .eq("chave", "permissoes_perfil")
        .maybeSingle();

      if (!error && data?.valor) {
        permissoesPerfilSistemaCache = normalizarPermissoesPerfil(data.valor);
        localStorage.setItem("novoRioTendasPermissoesPerfil", JSON.stringify(permissoesPerfilSistemaCache));
        return permissoesPerfilSistemaCache;
      }
    } catch (erro) {
      console.warn("Não foi possível carregar permissões da nuvem:", erro);
    }
  }

  try {
    permissoesPerfilSistemaCache = normalizarPermissoesPerfil(
      JSON.parse(localStorage.getItem("novoRioTendasPermissoesPerfil") || "null") || {}
    );
  } catch {
    permissoesPerfilSistemaCache = normalizarPermissoesPerfil({});
  }

  return permissoesPerfilSistemaCache;
}

async function salvarPermissoesPerfilSistema(permissoes) {
  permissoesPerfilSistemaCache = normalizarPermissoesPerfil(permissoes);
  localStorage.setItem("novoRioTendasPermissoesPerfil", JSON.stringify(permissoesPerfilSistemaCache));

  if (typeof supabaseClient !== "undefined" && supabaseClient) {
    try {
      const { error } = await supabaseClient
        .from("app_config")
        .upsert({
          chave: "permissoes_perfil",
          valor: permissoesPerfilSistemaCache,
          atualizado_em: new Date().toISOString()
        }, { onConflict: "chave" });

      if (error) {
        alert("Não foi possível salvar permissões na nuvem: " + (error.message || ""));
        return false;
      }
    } catch (erro) {
      alert("Erro ao salvar permissões: " + (erro.message || erro));
      return false;
    }
  }

  return true;
}

function usuarioPodeAcessarPagina(sectionId) {
  const usuario = typeof getUsuarioLogado === "function" ? getUsuarioLogado() : null;
  if (!usuario) return false;

  const permissoes = permissoesPerfilSistemaCache || normalizarPermissoesPerfil({});
  const perfil = usuario.perfil || "operacional";

  if (perfil === "administrador") return true;

  return Boolean(permissoes?.[perfil]?.[sectionId]);
}

async function aplicarPermissoesPorPagina() {
  const usuario = typeof getUsuarioLogado === "function" ? getUsuarioLogado() : null;
  if (!usuario) return;

  const permissoes = await carregarPermissoesPerfilSistema();
  const perfil = usuario.perfil || "operacional";

  document.querySelectorAll(".tab-btn[data-section]").forEach(btn => {
    const sectionId = btn.dataset.section;
    const permitido = perfil === "administrador" || Boolean(permissoes?.[perfil]?.[sectionId]);

    btn.style.display = permitido ? "" : "none";
    btn.disabled = !permitido;
  });

  document.querySelectorAll(".section").forEach(sec => {
    const sectionId = sec.id;
    const permitido = perfil === "administrador" || Boolean(permissoes?.[perfil]?.[sectionId]);

    if (!permitido) {
      sec.classList.remove("active");
      sec.style.display = "none";
    }
  });

  const activeBtn = document.querySelector(".tab-btn.active[data-section]");
  if (!activeBtn || activeBtn.style.display === "none") {
    const primeiro = Array.from(document.querySelectorAll(".tab-btn[data-section]"))
      .find(btn => btn.style.display !== "none" && !btn.disabled);

    if (primeiro) {
      primeiro.click();
    }
  }

  document.querySelectorAll(".admin-only").forEach(el => {
    el.style.display = perfil === "administrador" ? "" : "none";
  });
}

function montarEditorPermissoesPerfil() {
  const usuario = typeof getUsuarioLogado === "function" ? getUsuarioLogado() : null;
  if (!usuario || usuario.perfil !== "administrador") return;

  const destino =
    document.getElementById("usuariosAdminConfigBox") ||
    document.getElementById("usuariosSection") ||
    document.getElementById("configSection");

  if (!destino || document.getElementById("permissoesPerfilBox")) return;

  const box = document.createElement("div");
  box.id = "permissoesPerfilBox";
  box.className = "config-card permissoes-perfil-box";

  box.innerHTML = `
    <div class="section-header">
      <div>
        <h2>Permissões por perfil</h2>
        <p>Marque quais páginas cada perfil pode acessar.</p>
      </div>
      <button id="salvarPermissoesPerfilBtn" class="btn-primary" type="button">Salvar permissões</button>
    </div>

    <div class="permissoes-grid-wrap">
      <table class="permissoes-grid-table">
        <thead>
          <tr>
            <th>Perfil</th>
            ${paginasSistemaPermissoes.map(p => `<th>${p.label}</th>`).join("")}
          </tr>
        </thead>
        <tbody>
          ${perfisSistemaPermissoes.map(perfil => `
            <tr>
              <td><strong>${perfil.label}</strong></td>
              ${paginasSistemaPermissoes.map(pagina => `
                <td>
                  <label class="perm-check">
                    <input
                      type="checkbox"
                      data-perfil="${perfil.id}"
                      data-pagina="${pagina.id}"
                      ${perfil.id === "administrador" ? "checked disabled" : ""}
                    >
                  </label>
                </td>
              `).join("")}
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;

  destino.appendChild(box);

  preencherEditorPermissoesPerfil();

  const salvar = document.getElementById("salvarPermissoesPerfilBtn");
  if (salvar) {
    salvar.addEventListener("click", salvarPermissoesPerfilDoEditor);
  }
}

async function preencherEditorPermissoesPerfil() {
  const permissoes = await carregarPermissoesPerfilSistema();

  document.querySelectorAll("#permissoesPerfilBox input[data-perfil][data-pagina]").forEach(input => {
    const perfil = input.dataset.perfil;
    const pagina = input.dataset.pagina;

    input.checked = Boolean(permissoes?.[perfil]?.[pagina]);

    if (perfil === "administrador") {
      input.checked = true;
      input.disabled = true;
    }
  });
}

async function salvarPermissoesPerfilDoEditor() {
  const permissoes = await carregarPermissoesPerfilSistema();
  const novas = normalizarPermissoesPerfil(permissoes);

  document.querySelectorAll("#permissoesPerfilBox input[data-perfil][data-pagina]").forEach(input => {
    const perfil = input.dataset.perfil;
    const pagina = input.dataset.pagina;

    if (!novas[perfil]) novas[perfil] = {};
    novas[perfil][pagina] = input.checked;
  });

  const salvo = await salvarPermissoesPerfilSistema(novas);

  if (salvo) {
    if (typeof registrarLogSistema === "function") {
      registrarLogSistema({
        modulo: "Permissões",
        acao: "Permissões de perfil salvas",
        registro_id: "permissoes-perfil",
        registro_nome: "Permissões por perfil",
        antes: permissoes,
        depois: novas
      });
    }
    alert("Permissões salvas com sucesso.");
    await aplicarPermissoesUsuarioIndividual();
  }
}

document.addEventListener("DOMContentLoaded", () => {
  setTimeout(async () => {
    await carregarPermissoesPerfilSistema();
    await aplicarPermissoesUsuarioIndividual();
    montarEditorPermissoesPerfil();
  }, 800);

  document.querySelectorAll('[data-section="usuariosSection"], [data-section="configSection"]').forEach(btn => {
    btn.addEventListener("click", () => {
      setTimeout(() => {
        montarEditorPermissoesPerfil();
        preencherEditorPermissoesPerfil();
      }, 150);
    });
  });
});




/* =====================================================
   Permissões por usuário
===================================================== */

const paginasPermissaoUsuario = [
  { id: "dashboardSection", label: "Dashboard" },
  { id: "produtosSection", label: "Produtos" },
  { id: "clientesSection", label: "Clientes" },
  { id: "eventosSection", label: "Eventos" },
  { id: "orcamentosSection", label: "Orçamentos" },
  { id: "calendarioSection", label: "Agenda" },
  { id: "rotasSection", label: "Rotas" },
  { id: "mapaSection", label: "Mapa" },
  { id: "financeiroSection", label: "Financeiro" },
  { id: "relatoriosSection", label: "Relatórios" },
  { id: "usuariosSection", label: "Usuários" },
  { id: "configSection", label: "Configurações" }
];

const permissoesPadraoPorPerfilUsuario = {
  administrador: {
    dashboardSection: true,
    produtosSection: true,
    clientesSection: true,
    eventosSection: true,
    orcamentosSection: true,
    calendarioSection: true,
    rotasSection: true,
    financeiroSection: true,
    relatoriosSection: true,
    usuariosSection: true,
    configSection: true
  },
  operacional: {
    dashboardSection: true,
    produtosSection: true,
    clientesSection: true,
    eventosSection: true,
    orcamentosSection: true,
    calendarioSection: true,
    rotasSection: true,
    financeiroSection: true,
    relatoriosSection: true,
    usuariosSection: false,
    configSection: false
  },
  manutencao: {
    dashboardSection: false,
    produtosSection: true,
    clientesSection: false,
    eventosSection: false,
    orcamentosSection: false,
    calendarioSection: false,
    rotasSection: false,
    financeiroSection: false,
    relatoriosSection: true,
    usuariosSection: false,
    configSection: false
  }
};

function normalizarPermissoesUsuario(perfil, permissoes = null) {
  const base = {
    ...(permissoesPadraoPorPerfilUsuario[perfil || "operacional"] || permissoesPadraoPorPerfilUsuario.operacional)
  };

  Object.entries(permissoes || {}).forEach(([pagina, permitido]) => {
    base[pagina] = Boolean(permitido);
  });

  if (perfil === "administrador") {
    paginasPermissaoUsuario.forEach(p => base[p.id] = true);
  }

  return base;
}

function permissoesDoUsuarioLogado() {
  const usuario = typeof getUsuarioLogado === "function" ? getUsuarioLogado() : null;
  if (!usuario) return {};

  return normalizarPermissoesUsuario(usuario.perfil, usuario.permissoes || null);
}

function usuarioPodeAcessarPaginaUsuario(sectionId) {
  const usuario = typeof getUsuarioLogado === "function" ? getUsuarioLogado() : null;
  if (!usuario) return false;
  if (usuario.perfil === "administrador") return true;

  const permissoes = permissoesDoUsuarioLogado();
  return Boolean(permissoes[sectionId]);
}

async function aplicarPermissoesUsuarioIndividual() {
  const usuario = typeof getUsuarioLogado === "function" ? getUsuarioLogado() : null;
  if (!usuario) return;

  const permissoes = permissoesDoUsuarioLogado();

  document.querySelectorAll(".tab-btn[data-section]").forEach(btn => {
    const sectionId = btn.dataset.section;
    const permitido = usuario.perfil === "administrador" || Boolean(permissoes[sectionId]);

    btn.style.display = permitido ? "" : "none";
    btn.disabled = !permitido;
  });

  document.querySelectorAll(".section").forEach(sec => {
    const sectionId = sec.id;
    const permitido = usuario.perfil === "administrador" || Boolean(permissoes[sectionId]);

    if (!permitido) {
      sec.classList.remove("active");
      sec.style.display = "none";
    }
  });

  document.querySelectorAll(".admin-only").forEach(el => {
    el.style.display = usuario.perfil === "administrador" ? "" : "none";
  });

  const ativo = document.querySelector(".tab-btn.active[data-section]");
  if (!ativo || ativo.style.display === "none" || ativo.disabled) {
    const primeiro = Array.from(document.querySelectorAll(".tab-btn[data-section]"))
      .find(btn => btn.style.display !== "none" && !btn.disabled);

    if (primeiro) primeiro.click();
  }
}

function montarPermissoesNoModalUsuario(usuario = null) {
  const form = document.getElementById("usuarioForm");
  if (!form) return;

  let box = document.getElementById("usuarioPermissoesBox");
  if (!box) {
    box = document.createElement("div");
    box.id = "usuarioPermissoesBox";
    box.className = "usuario-permissoes-box";
    box.innerHTML = `
      <h3>Permissões deste usuário</h3>
      <p>Marque quais páginas este usuário poderá acessar.</p>
      <div class="usuario-permissoes-grid">
        ${paginasPermissaoUsuario.map(p => `
          <label class="usuario-permissao-check">
            <input type="checkbox" data-user-perm="${p.id}">
            <span>${p.label}</span>
          </label>
        `).join("")}
      </div>
    `;

    const actions = form.querySelector(".form-actions");
    if (actions) form.insertBefore(box, actions);
    else form.appendChild(box);
  }

  preencherPermissoesNoModalUsuario(usuario);

  const perfilSelect = document.getElementById("usuarioPerfil");
  if (perfilSelect && !perfilSelect.dataset.permListener) {
    perfilSelect.dataset.permListener = "1";
    perfilSelect.addEventListener("change", () => {
      preencherPermissoesNoModalUsuario({
        perfil: perfilSelect.value,
        permissoes: null
      });
    });
  }
}

function preencherPermissoesNoModalUsuario(usuario = null) {
  const perfil = usuario?.perfil || document.getElementById("usuarioPerfil")?.value || "operacional";
  const normalizador = (typeof window !== "undefined" && typeof window.normalizarPermissoesUsuarioMobileV19 === "function")
    ? window.normalizarPermissoesUsuarioMobileV19
    : normalizarPermissoesUsuario;
  const permissoes = normalizador(perfil, usuario?.permissoes || null);

  document.querySelectorAll("#usuarioPermissoesBox input[data-user-perm]").forEach(input => {
    const pagina = input.dataset.userPerm;
    input.checked = Boolean(permissoes[pagina]);

    if (perfil === "administrador") {
      input.checked = true;
      input.disabled = true;
    } else {
      input.disabled = false;
    }
  });
}

function coletarPermissoesDoModalUsuario() {
  const perfil = document.getElementById("usuarioPerfil")?.value || "operacional";
  const permissoes = {};

  document.querySelectorAll("#usuarioPermissoesBox input[data-user-perm]").forEach(input => {
    permissoes[input.dataset.userPerm] = input.checked;
  });

  const normalizador = (typeof window !== "undefined" && typeof window.normalizarPermissoesUsuarioMobileV19 === "function")
    ? window.normalizarPermissoesUsuarioMobileV19
    : normalizarPermissoesUsuario;
  return normalizador(perfil, permissoes);
}

function garantirColunaPermissoesUsuarios() {
  const tabela = document.querySelector("#usuariosSection table, #usuariosAdminConfigBox table");
  if (!tabela) return;

  const headRow = tabela.querySelector("thead tr");
  if (headRow && !headRow.querySelector("[data-col-permissoes]")) {
    const th = document.createElement("th");
    th.dataset.colPermissoes = "1";
    th.textContent = "Permissões";
    const acoes = Array.from(headRow.children).find(th => th.textContent.trim().toLowerCase() === "ações");
    if (acoes) headRow.insertBefore(th, acoes);
    else headRow.appendChild(th);
  }
}

function resumoPermissoesUsuario(usuario) {
  const normalizador = (typeof window !== "undefined" && typeof window.normalizarPermissoesUsuarioMobileV19 === "function")
    ? window.normalizarPermissoesUsuarioMobileV19
    : normalizarPermissoesUsuario;
  const permissoes = normalizador(usuario.perfil, usuario.permissoes || null);
  const liberadas = paginasPermissaoUsuario
    .filter(p => permissoes[p.id])
    .map(p => p.label);

  if (usuario.perfil === "administrador") return "Acesso total";
  if (!liberadas.length) return "Sem páginas";
  if (liberadas.length <= 3) return liberadas.join(", ");

  return `${liberadas.slice(0, 3).join(", ")} +${liberadas.length - 3}`;
}


/* =====================================================
   v19-dev: Mobile centralizado por usuário
   - Reaproveita os usuários existentes.
   - Permite escolher Sistema Completo, Mobile Rua e Mobile Manutenção.
   - Em celular, entra direto no Mobile quando o usuário tiver acesso.
===================================================== */
(function(){
  function addPermissao(id, label, posicao) {
    try {
      if (typeof paginasPermissaoUsuario !== 'undefined' && Array.isArray(paginasPermissaoUsuario) && !paginasPermissaoUsuario.some(p => p.id === id)) {
        const item = { id, label };
        if (typeof posicao === 'number') paginasPermissaoUsuario.splice(posicao, 0, item);
        else paginasPermissaoUsuario.push(item);
      }
    } catch (e) { console.warn('Permissão mobile não adicionada:', id, e); }
  }

  addPermissao('sistemaCompleto', 'Sistema completo', 0);
  addPermissao('mobileHubSection', 'Mobile', 1);
  addPermissao('ruaMobileSection', 'Mobile > Rua', 2);
  addPermissao('manutencaoMobileSection', 'Mobile > Manutenção', 3);
  addPermissao('eventosMobileSection', 'Mobile > Eventos', 4);
  addPermissao('mobileRuaValores', 'Mobile > Rua: ver valores', 5);

  function aplicarDefaultsMobile(obj, perfil) {
    if (!obj) return obj;
    if (perfil === 'administrador') {
      obj.sistemaCompleto = true;
      obj.mobileHubSection = true;
      obj.ruaMobileSection = true;
      obj.manutencaoMobileSection = true;
      obj.eventosMobileSection = true;
      obj.mobileRuaValores = true;
    } else if (perfil === 'rua') {
      obj.sistemaCompleto = false;
      obj.mobileHubSection = true;
      obj.ruaMobileSection = true;
      obj.manutencaoMobileSection = false;
      obj.eventosMobileSection = false;
      obj.mobileRuaValores = true;
    } else if (perfil === 'manutencao') {
      obj.sistemaCompleto = false;
      obj.mobileHubSection = true;
      obj.ruaMobileSection = false;
      obj.manutencaoMobileSection = true;
      obj.eventosMobileSection = false;
      obj.mobileRuaValores = false;
    } else {
      if (typeof obj.sistemaCompleto === 'undefined') obj.sistemaCompleto = true;
      if (typeof obj.mobileHubSection === 'undefined') obj.mobileHubSection = false;
      if (typeof obj.ruaMobileSection === 'undefined') obj.ruaMobileSection = false;
      if (typeof obj.manutencaoMobileSection === 'undefined') obj.manutencaoMobileSection = false;
      if (typeof obj.eventosMobileSection === 'undefined') obj.eventosMobileSection = false;
      if (typeof obj.mobileRuaValores === 'undefined') obj.mobileRuaValores = false;
    }
    return obj;
  }

  try {
    if (typeof permissoesPadraoPorPerfilUsuario !== 'undefined') {
      Object.keys(permissoesPadraoPorPerfilUsuario).forEach(perfil => aplicarDefaultsMobile(permissoesPadraoPorPerfilUsuario[perfil], perfil));
      if (!permissoesPadraoPorPerfilUsuario.rua) {
        permissoesPadraoPorPerfilUsuario.rua = aplicarDefaultsMobile({
          dashboardSection:false, produtosSection:false, clientesSection:false, eventosSection:false,
          orcamentosSection:false, calendarioSection:false, rotasSection:false, financeiroSection:false,
          relatoriosSection:false, usuariosSection:false, configSection:false
        }, 'rua');
      }
    }
  } catch(e) { console.warn('Defaults mobile usuário:', e); }

  const normalizarAnterior = typeof normalizarPermissoesUsuario === 'function' ? normalizarPermissoesUsuario : null;
  window.normalizarPermissoesUsuarioMobileV19 = function(perfil, permissoes = null) {
    let base = normalizarAnterior ? normalizarAnterior(perfil, permissoes) : {};
    base = aplicarDefaultsMobile(base, perfil || 'operacional');

    Object.entries(permissoes || {}).forEach(([chave, valor]) => {
      base[chave] = Boolean(valor);
    });

    // Segurança: perfis exclusivamente mobile não herdam acessos indevidos salvos antes.
    if (perfil === 'rua') {
      base.sistemaCompleto = false;
      base.mobileHubSection = true;
      base.ruaMobileSection = true;
      base.manutencaoMobileSection = false;
      base.eventosMobileSection = false;
      base.eventosSection = false;
      base.clientesSection = false;
      base.orcamentosSection = false;
      base.configSection = false;
      base.usuariosSection = false;
    }

    if (perfil === 'manutencao') {
      base.sistemaCompleto = false;
      base.mobileHubSection = true;
      base.ruaMobileSection = false;
      base.manutencaoMobileSection = true;
      base.eventosMobileSection = false;
      base.eventosSection = false;
      base.clientesSection = false;
      base.orcamentosSection = false;
      base.configSection = false;
      base.usuariosSection = false;
    }

    if (perfil === 'administrador') {
      Object.keys(base).forEach(k => base[k] = true);
      base.sistemaCompleto = true;
    }

    return base;
  };

  // Sobrescreve a função do arquivo para incluir as chaves mobile.
  normalizarPermissoesUsuario = window.normalizarPermissoesUsuarioMobileV19;

  window.usuarioPodeVerValoresMobileRua = function() {
    const usuario = typeof getUsuarioLogado === 'function' ? getUsuarioLogado() : null;
    if (!usuario) return false;
    if (usuario.perfil === 'administrador') return true;
    const p = normalizarPermissoesUsuario(usuario.perfil, usuario.permissoes || null);
    return Boolean(p.mobileRuaValores);
  };

  function usuarioTemMobile(permissoes) {
    return Boolean(permissoes.mobileHubSection || permissoes.ruaMobileSection || permissoes.manutencaoMobileSection);
  }

  function secaoMobilePreferida(usuario, permissoes) {
    if (usuario?.perfil === 'rua' && permissoes.ruaMobileSection) return 'ruaMobileSection';
    if (usuario?.perfil === 'manutencao' && permissoes.manutencaoMobileSection) return 'manutencaoMobileSection';
    if (permissoes.ruaMobileSection && !permissoes.manutencaoMobileSection) return 'ruaMobileSection';
    if (permissoes.manutencaoMobileSection && !permissoes.ruaMobileSection) return 'manutencaoMobileSection';
    return 'mobileHubSection';
  }

  function rtSecaoEhMobile(sectionId) {
    return ['mobileHubSection', 'ruaMobileSection', 'manutencaoMobileSection'].includes(sectionId);
  }

  window.rtMobilePushState = function(sectionId, extra = {}) {
    try {
      if (!rtSecaoEhMobile(sectionId)) return;
      const atual = history.state || {};
      const novo = { rtMobile: true, sectionId, ...extra };
      if (atual.rtMobile && atual.sectionId === novo.sectionId && atual.detalheProdutoId === novo.detalheProdutoId) return;
      history.pushState(novo, '', `${location.pathname}${location.search}#${sectionId}`);
    } catch(e) { console.warn('Histórico mobile:', e); }
  };

  window.abrirSecaoRioTendas = function(sectionId, opcoes = {}) {
    const sec = document.getElementById(sectionId);
    if (!sec) return;
    document.querySelectorAll('.tab-btn[data-section]').forEach(btn => btn.classList.toggle('active', btn.dataset.section === sectionId));
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active', 'active-section'));
    sec.style.display = '';
    sec.classList.add('active', 'active-section');
    if (rtSecaoEhMobile(sectionId)) {
      document.body.classList.add('modo-mobile-operacional');
      if (!opcoes.semHistorico) window.rtMobilePushState(sectionId);
    }
    if (sectionId === 'ruaMobileSection' && typeof renderizarRuaMobile === 'function') renderizarRuaMobile();
    if (sectionId === 'manutencaoMobileSection' && typeof renderizarManutencaoMobile === 'function') renderizarManutencaoMobile();
  };

  window.addEventListener('popstate', (ev) => {
    const state = ev.state || {};
    if (!state.rtMobile) {
      const ativoMobile = document.querySelector('.section.active#manutencaoMobileSection, .section.active#ruaMobileSection, .section.active#mobileHubSection');
      if (ativoMobile && ativoMobile.id === 'manutencaoMobileSection' && typeof window.manutencaoMobileFecharDetalheVoltar === 'function' && window.manutencaoMobileFecharDetalheVoltar()) {
        return;
      }
      return;
    }

    if (state.sectionId === 'manutencaoMobileSection' && typeof window.manutencaoMobileFecharDetalheVoltar === 'function') {
      window.manutencaoMobileFecharDetalheVoltar();
    }

    window.abrirSecaoRioTendas(state.sectionId || 'mobileHubSection', { semHistorico: true });

    if (state.sectionId === 'manutencaoMobileSection' && state.detalheProdutoId && typeof window.abrirManutencaoMobileProduto === 'function') {
      setTimeout(() => window.abrirManutencaoMobileProduto(state.detalheProdutoId, { semHistorico: true }), 80);
    }
  });

  function garantirBotaoSistemaCompletoMobile() {
    const hub = document.getElementById('mobileHubSection');
    if (!hub || document.getElementById('mobileSistemaCompletoBtn')) return;
    const btn = document.createElement('button');
    btn.id = 'mobileSistemaCompletoBtn';
    btn.className = 'btn-outline mobile-full-system-btn';
    btn.type = 'button';
    btn.textContent = 'Sistema completo';
    const header = hub.querySelector('.section-header');
    if (header) header.appendChild(btn);
    else hub.prepend(btn);
    btn.addEventListener('click', () => {
      document.body.classList.remove('modo-mobile-operacional');
      window.abrirSecaoRioTendas('dashboardSection');
    });
  }

  aplicarPermissoesUsuarioIndividual = async function() {
    const usuario = typeof getUsuarioLogado === 'function' ? getUsuarioLogado() : null;
    if (!usuario) return;

    const permissoes = normalizarPermissoesUsuario(usuario.perfil, usuario.permissoes || null);
    const sistemaCompleto = usuario.perfil === 'administrador' || Boolean(permissoes.sistemaCompleto);
    const temMobile = usuarioTemMobile(permissoes);
    const telaCelular = window.matchMedia && window.matchMedia('(max-width: 780px)').matches;
    const somenteMobile = !sistemaCompleto;
    const entrarMobileAutomatico = temMobile && (somenteMobile || telaCelular);

    document.body.classList.toggle('modo-mobile-operacional', entrarMobileAutomatico || somenteMobile);
    document.body.classList.toggle('usuario-sem-sistema-completo', somenteMobile);

    document.querySelectorAll('.tab-btn[data-section]').forEach(btn => {
      const sectionId = btn.dataset.section;
      const ehMobile = ['mobileHubSection', 'ruaMobileSection', 'manutencaoMobileSection'].includes(sectionId);
      let permitido = false;

      if (usuario.perfil === 'administrador') permitido = true;
      else if (ehMobile) permitido = Boolean(permissoes[sectionId]) || (sectionId === 'mobileHubSection' && temMobile);
      else permitido = sistemaCompleto && Boolean(permissoes[sectionId]);

      btn.style.display = permitido ? '' : 'none';
      btn.disabled = !permitido;
    });

    const mobileBtn = document.getElementById('mobileTopBtn');
    if (mobileBtn) {
      mobileBtn.style.display = temMobile ? '' : 'none';
      mobileBtn.disabled = !temMobile;
    }

    document.querySelectorAll('.section').forEach(sec => {
      const sectionId = sec.id;
      const ehMobile = ['mobileHubSection', 'ruaMobileSection', 'manutencaoMobileSection'].includes(sectionId);
      let permitido = false;

      if (usuario.perfil === 'administrador') permitido = true;
      else if (ehMobile) permitido = Boolean(permissoes[sectionId]) || (sectionId === 'mobileHubSection' && temMobile);
      else permitido = sistemaCompleto && Boolean(permissoes[sectionId]);

      if (!permitido) {
        sec.classList.remove('active', 'active-section');
        sec.style.display = 'none';
      } else {
        sec.style.display = '';
      }
    });

    document.querySelectorAll('.admin-only').forEach(el => {
      el.style.display = usuario.perfil === 'administrador' ? '' : 'none';
    });

    garantirBotaoSistemaCompletoMobile();
    const fullBtn = document.getElementById('mobileSistemaCompletoBtn');
    if (fullBtn) fullBtn.style.display = sistemaCompleto ? '' : 'none';

    if (entrarMobileAutomatico) {
      window.abrirSecaoRioTendas(secaoMobilePreferida(usuario, permissoes));
      return;
    }

    const ativo = document.querySelector('.tab-btn.active[data-section]');
    if (!ativo || ativo.style.display === 'none' || ativo.disabled) {
      const primeiro = Array.from(document.querySelectorAll('.tab-btn[data-section]'))
        .find(btn => btn.style.display !== 'none' && !btn.disabled);
      if (primeiro) primeiro.click();
    }
  };

  function filtrarCardsMobileHub() {
    const usuario = typeof getUsuarioLogado === 'function' ? getUsuarioLogado() : null;
    if (!usuario) return;
    const p = normalizarPermissoesUsuario(usuario.perfil, usuario.permissoes || null);
    document.querySelectorAll('[data-mobile-open]').forEach(btn => {
      const destino = btn.dataset.mobileOpen;
      btn.style.display = (usuario.perfil === 'administrador' || p[destino]) ? '' : 'none';
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    const mobileBtn = document.getElementById('mobileTopBtn');
    if (mobileBtn && !mobileBtn.dataset.mobileCentralListener) {
      mobileBtn.dataset.mobileCentralListener = '1';
      mobileBtn.addEventListener('click', () => {
        const usuario = typeof getUsuarioLogado === 'function' ? getUsuarioLogado() : null;
        const p = normalizarPermissoesUsuario(usuario?.perfil, usuario?.permissoes || null);
        document.body.classList.add('modo-mobile-operacional');
        window.abrirSecaoRioTendas(secaoMobilePreferida(usuario, p));
        filtrarCardsMobileHub();
      });
    }

    document.querySelectorAll('[data-mobile-open]').forEach(btn => {
      if (btn.dataset.mobileOpenListener) return;
      btn.dataset.mobileOpenListener = '1';
      btn.addEventListener('click', () => {
        document.body.classList.add('modo-mobile-operacional');
        window.abrirSecaoRioTendas(btn.dataset.mobileOpen);
      });
    });

    setTimeout(filtrarCardsMobileHub, 900);
  });
})();
