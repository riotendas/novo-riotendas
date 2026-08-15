// Performance V3 — calendário: sem polling global e sem segundo controlador de navegação.
// A navegação é controlada por performance-safe.js; o scroll é aplicado pelo próprio calendario.js após render.
(function(){
  if (window.__rtCalendarioNavPerfV3) return;
  window.__rtCalendarioNavPerfV3 = true;
})();
