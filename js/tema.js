/* =============================================================================
   tema.js — CORES E TEMA (escolhidos pela pessoa em "Personalizar")
   -----------------------------------------------------------------------------
   • Guarda a escolha no aparelho: { cor: "#3b6fd6", tema: "escuro" | "claro" | "auto" }.
   • A partir de UMA cor de destaque, calcula as variações (mais escura, mais clara, suave) e
     escolhe sozinho se o texto em cima dela deve ser branco ou escuro, para sempre dar para ler
     (por isso funciona até com amarelo).
   • Este arquivo roda no <head>, antes de a página aparecer: assim não "pisca" com a cor errada.
   • As contas (sem tela) são testadas no Node: node --test test/
   ============================================================================= */
(function (raiz) {
  var T = {};
  T.PADRAO = { cor: "#3b6fd6", tema: "escuro" };
  T.CHAVE = "startnow-preferencias";
  T.TEMAS = ["escuro", "claro", "auto"];
  T.PRESETS = [
    { nome: "Azul", cor: "#3b6fd6" }, { nome: "Turquesa", cor: "#1fa3a8" }, { nome: "Verde", cor: "#2fa56a" },
    { nome: "Amarelo", cor: "#d9a520" }, { nome: "Laranja", cor: "#e8742c" }, { nome: "Vermelho", cor: "#d9473f" },
    { nome: "Rosa", cor: "#d9487d" }, { nome: "Roxo", cor: "#7c5cd6" }
  ];
  var FUNDO_ESCURO = "#101218", FUNDO_CLARO = "#ffffff";   // cartões: contra eles o texto colorido precisa ter contraste

  /* "#abc", "ABCDEF", " #aBc123 " -> "#aabbcc" / "#abcdef" / "#abc123"; devolve null se não for uma cor. */
  T.normalizarHex = function (texto) {
    var h = String(texto == null ? "" : texto).trim().replace(/^#/, "").toLowerCase();
    if (/^[0-9a-f]{3}$/.test(h)) h = h.replace(/(.)/g, "$1$1");
    return /^[0-9a-f]{6}$/.test(h) ? "#" + h : null;
  };
  T.hexParaRgb = function (hex) { var h = T.normalizarHex(hex); return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; };
  T.rgbParaHex = function (rgb) { return "#" + rgb.map(function (v) { var s = Math.max(0, Math.min(255, Math.round(v))).toString(16); return s.length < 2 ? "0" + s : s; }).join(""); };

  T.rgbParaHsl = function (rgb) {
    var r = rgb[0] / 255, g = rgb[1] / 255, b = rgb[2] / 255, max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, h = 0, s = 0, d = max - min;
    if (d) {
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
      h /= 6;
    }
    return [h, s, l];
  };
  T.hslParaRgb = function (hsl) {
    var h = hsl[0], s = hsl[1], l = hsl[2];
    if (!s) return [l * 255, l * 255, l * 255];
    function f(p, q, t) { if (t < 0) t += 1; if (t > 1) t -= 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < 1 / 2 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; }
    var q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
    return [f(p, q, h + 1 / 3) * 255, f(p, q, h) * 255, f(p, q, h - 1 / 3) * 255];
  };

  /* Contraste entre duas cores, pela regra de acessibilidade (WCAG): de 1 (igual) a 21 (preto no branco). */
  function luminancia(rgb) {
    var c = rgb.map(function (v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  }
  T.contraste = function (hexA, hexB) {
    var a = luminancia(T.hexParaRgb(hexA)), b = luminancia(T.hexParaRgb(hexB));
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  };

  function comLuz(hex, luz) { var hsl = T.rgbParaHsl(T.hexParaRgb(hex)); return T.rgbParaHex(T.hslParaRgb([hsl[0], hsl[1], Math.max(0, Math.min(1, luz))])); }

  /* A cor usada COMO TEXTO (ex.: "40%", rótulos): clareia (tema escuro) ou escurece (tema claro) até dar contraste 4,5. */
  function corDeTexto(hex, tema) {
    var fundo = tema === "claro" ? FUNDO_CLARO : FUNDO_ESCURO, passo = tema === "claro" ? -0.02 : 0.02;
    var luz = T.rgbParaHsl(T.hexParaRgb(hex))[2], atual = hex;
    for (var i = 0; i < 40 && T.contraste(atual, fundo) < 4.5; i++) { luz += passo; atual = comLuz(hex, luz); }
    return atual;
  }

  /* Todas as variações do destaque, para o tema escuro ou claro. */
  T.derivar = function (hex, tema) {
    hex = T.normalizarHex(hex) || T.PADRAO.cor;
    var rgb = T.hexParaRgb(hex), luz = T.rgbParaHsl(rgb)[2], suave = rgb.join(", ");
    return {
      destaque: hex,
      escuro: comLuz(hex, Math.max(0.12, luz - 0.1)),
      claro: comLuz(hex, Math.min(0.88, luz + 0.2)),
      texto: corDeTexto(hex, tema),
      sobre: T.contraste("#ffffff", hex) >= 4 ? "#ffffff" : "#10131a",
      suave: "rgba(" + suave + ", 0.16)",
      brilho: "rgba(" + suave + (tema === "claro" ? ", 0.16)" : ", 0.28)")
    };
  };

  /* ---------- guardar e aplicar (só no navegador) ---------- */
  T.ler = function () {
    try {
      var p = JSON.parse(localStorage.getItem(T.CHAVE));
      if (p) return { cor: T.normalizarHex(p.cor) || T.PADRAO.cor, tema: T.TEMAS.indexOf(p.tema) !== -1 ? p.tema : T.PADRAO.tema };
    } catch (e) { /* sem armazenamento: usa o padrão */ }
    return { cor: T.PADRAO.cor, tema: T.PADRAO.tema };
  };
  T.gravar = function (prefs) { try { localStorage.setItem(T.CHAVE, JSON.stringify(prefs)); } catch (e) { /* segue só nesta visita */ } };
  T.resolver = function (tema) {
    if (tema !== "auto") return tema;
    return (window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches) ? "claro" : "escuro";
  };
  T.aplicar = function (prefs) {
    var tema = T.resolver(prefs.tema), d = T.derivar(prefs.cor, tema), el = document.documentElement;
    el.setAttribute("data-tema", tema);
    var vars = { "--destaque": d.destaque, "--destaque-escuro": d.escuro, "--destaque-claro": d.claro, "--destaque-texto": d.texto,
                 "--sobre-destaque": d.sobre, "--destaque-suave": d.suave, "--destaque-brilho": d.brilho };
    Object.keys(vars).forEach(function (k) { el.style.setProperty(k, vars[k]); });
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", d.destaque);
    return d;
  };

  if (typeof module !== "undefined" && module.exports) { module.exports = T; }
  else {
    raiz.App = raiz.App || {}; raiz.App.tema = T;
    T.aplicar(T.ler());
    // no modo "auto", acompanha o aparelho se ele mudar de claro para escuro
    if (window.matchMedia) {
      var mq = window.matchMedia("(prefers-color-scheme: light)"), aoMudar = function () { var p = T.ler(); if (p.tema === "auto") T.aplicar(p); };
      if (mq.addEventListener) mq.addEventListener("change", aoMudar); else if (mq.addListener) mq.addListener(aoMudar);
    }
  }
})(typeof window !== "undefined" ? window : {});
