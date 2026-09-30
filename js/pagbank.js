/* RioTendas - PagBank Link de Pagamento (Sandbox) */
(() => {
  const FUNCTION_URL = "https://nxfveatrehzcsjpcbosk.supabase.co/functions/v1/pagbank-criar-link";

  const $ = id => document.getElementById(id);
  const dinheiroNumero = valor => {
    let s = String(valor ?? "").trim().replace(/R\$\s*/gi, "").replace(/\s/g, "");
    if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
    const n = Number(s);
    return Number.isFinite(n) ? n : 0;
  };
  const dinheiroBR = n => Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const clienteAtual = () => ($("eventoBuscaCliente")?.value || $("eventoNome")?.value || "Cliente").trim();
  const telefoneAtual = () => String($("eventoTelefone")?.value || "").replace(/\D/g, "");
  const referenciaAtual = () => {
    const id = String($("eventoId")?.value || "NOVO").replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 30);
    return `RIOTENDAS-${id}-${Date.now()}`.slice(0, 64);
  };
  function setStatus(texto, tipo="") {
    const el = $("pagbankStatus"); if (!el) return;
    el.textContent = texto || ""; el.className = `rt-pagbank-status ${tipo}`.trim();
  }
  function abrir() {
    const dlg = $("pagbankLinkDialog"); if (!dlg) return;
    $("pagbankCliente").value = clienteAtual();
    const restante = dinheiroNumero($("eventoValorRestante")?.value);
    $("pagbankValor").value = dinheiroBR(restante);
    $("pagbankParcelas").value = "1";
    $("pagbankLink").value = "";
    $("pagbankResultado").classList.add("hidden");
    setStatus(restante > 0 ? "" : "O saldo restante está zerado. Informe o valor que deseja cobrar.");
    dlg.showModal();
  }
  function fechar(){ $("pagbankLinkDialog")?.close(); }
  async function gerar() {
    const valor = dinheiroNumero($("pagbankValor")?.value);
    const parcelas = Math.max(1, Math.min(12, Number($("pagbankParcelas")?.value || 1)));
    if (!(valor > 0)) { setStatus("Informe um valor maior que zero.", "erro"); $("pagbankValor")?.focus(); return; }
    const btn = $("pagbankGerar"); btn.disabled = true; btn.textContent = "Gerando...";
    setStatus("Criando checkout no PagBank Sandbox...");
    try {
      const r = await fetch(FUNCTION_URL, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ valor, parcelas, referencia: referenciaAtual() }) });
      let data = {}; try { data = await r.json(); } catch (_) {}
      if (!r.ok || !data?.sucesso || !data?.link) throw new Error(data?.error || data?.detalhes?.error_messages?.[0]?.description || `Falha ao gerar link (${r.status}).`);
      $("pagbankLink").value = data.link;
      $("pagbankResultado").classList.remove("hidden");
      setStatus("Link criado com sucesso no ambiente de teste.", "ok");
    } catch (e) { console.error("PagBank:", e); setStatus(e?.message || "Não foi possível gerar o link.", "erro"); }
    finally { btn.disabled = false; btn.textContent = "Gerar link"; }
  }
  async function copiar() {
    const link = $("pagbankLink")?.value; if (!link) return;
    try { await navigator.clipboard.writeText(link); setStatus("Link copiado.", "ok"); }
    catch (_) { $("pagbankLink").select(); document.execCommand("copy"); setStatus("Link copiado.", "ok"); }
  }
  function whatsapp() {
    const link = $("pagbankLink")?.value; if (!link) return;
    let tel = telefoneAtual(); if (tel.length === 8 || tel.length === 9) tel = "21" + tel; if ((tel.length === 10 || tel.length === 11) && !tel.startsWith("55")) tel = "55" + tel;
    const nome = clienteAtual();
    const valor = $("pagbankValor")?.value || "";
    const msg = `Olá, ${nome}! Segue o link para pagamento de ${valor}:\n${link}`;
    window.open(`https://wa.me/${tel}?text=${encodeURIComponent(msg)}`, "_blank", "noopener");
  }
  document.addEventListener("DOMContentLoaded", () => {
    $("eventoGerarLinkPagBank")?.addEventListener("click", abrir);
    $("pagbankFechar")?.addEventListener("click", fechar); $("pagbankCancelar")?.addEventListener("click", fechar);
    $("pagbankGerar")?.addEventListener("click", gerar); $("pagbankCopiar")?.addEventListener("click", copiar); $("pagbankWhatsApp")?.addEventListener("click", whatsapp);
    $("pagbankLinkDialog")?.addEventListener("click", e => { if (e.target === $("pagbankLinkDialog")) fechar(); });
    $("pagbankValor")?.addEventListener("blur", e => { const n=dinheiroNumero(e.target.value); if(n>=0)e.target.value=dinheiroBR(n); });
  });
})();
