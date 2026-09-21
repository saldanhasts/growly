/* ==========================================================================
   Growly Digital | Landing page
   Rolagem suave, tema por seção, animações guiadas por scroll, cena do
   shopping em canvas, FAQ e formulário com envio para o WhatsApp.
   ========================================================================== */
(function () {
  'use strict';

  /* ------------------------------------------------------------------------
     CONFIGURAÇÃO
     TROQUE o número abaixo pelo WhatsApp da Growly.
     Formato: DDI + DDD + número, só dígitos. Exemplo: 5531999998888
     ------------------------------------------------------------------------ */
  var CONFIG = {
    whatsapp: '5500000000000',
    defaultMessage: 'Olá! Vim pela página da Growly Digital e quero saber mais sobre como ter uma loja no shopping digital.'
  };

  /* ------------------------------------------------------------------------
     Utilitários
     ------------------------------------------------------------------------ */
  var root = document.documentElement;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var clamp = function (v, a, b) { a = a === undefined ? 0 : a; b = b === undefined ? 1 : b; return Math.min(b, Math.max(a, v)); };
  var lerp = function (a, b, t) { return a + (b - a) * t; };
  var ss = function (a, b, v) { var t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
  var easeOutBack = function (t) { var c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
  var easeInOut = function (t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
  var mulberry32 = function (a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  };

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  function track(name, params) {
    try {
      if (typeof window.gtag === 'function') { window.gtag('event', name, params || {}); return; }
      window.dataLayer = window.dataLayer || [];
      var e = { event: name };
      for (var k in (params || {})) e[k] = params[k];
      window.dataLayer.push(e);
    } catch (err) { /* sem rastreamento, sem problema */ }
  }

  function waUrl(text) {
    return 'https://wa.me/' + CONFIG.whatsapp + '?text=' + encodeURIComponent(text);
  }

  /* ------------------------------------------------------------------------
     Elementos principais
     ------------------------------------------------------------------------ */
  var body = document.body;
  var header = $('.header');
  var burger = $('.burger');
  var menu = $('#menu');
  var dock = $('.dock');
  var progressBar = $('.progress__bar');
  var railNum = $('.rail__num');
  var railName = $('.rail__name');
  var railEl = $('.rail');

  var sections = $$('main > section');
  var themed = sections.concat([$('.footer')]);
  var PREV = { brand: '#23806a', dark: '#262626', light: '#f9f9fb' };
  var RAIL_COLOR = { brand: 'rgba(255,255,255,.86)', dark: 'rgba(255,255,255,.66)', light: 'rgba(38,38,38,.72)' };
  themed.forEach(function (el, i) {
    if (i > 0) el.style.setProperty('--prev', PREV[themed[i - 1].getAttribute('data-theme')]);
  });
  var heroEl = $('#inicio');
  var mallSection = $('#shopping');
  var contactSection = $('#contato');

  /* ------------------------------------------------------------------------
     Rolagem suave (Lenis). No toque, a rolagem nativa segue como está.
     ------------------------------------------------------------------------ */
  var lenis = null;
  if (!reduce && typeof window.Lenis === 'function') {
    lenis = new window.Lenis({
      duration: 1.15,
      easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); },
      smoothWheel: true
    });
  }

  function scrollToEl(target) {
    if (lenis) {
      lenis.scrollTo(target, { offset: 0, duration: 1.6, easing: easeInOut, force: true });
    } else {
      target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    }
  }

  /* ------------------------------------------------------------------------
     Títulos: divisão em palavras (revelação) e texto que acende (scrub)
     ------------------------------------------------------------------------ */
  function splitWords(el) {
    var words = el.textContent.trim().replace(/\s+/g, ' ').split(' ');
    el.textContent = '';
    words.forEach(function (word, i) {
      var outer = document.createElement('span');
      outer.className = 'w';
      var inner = document.createElement('span');
      inner.className = 'wi';
      inner.style.setProperty('--d', Math.min(i, 12));
      inner.textContent = word;
      outer.appendChild(inner);
      el.appendChild(outer);
      if (i < words.length - 1) el.appendChild(document.createTextNode(' '));
    });
  }

  $$('[data-split]').forEach(splitWords);

  var scrubWords = [];
  $$('[data-scrub]').forEach(function (el) {
    var words = el.textContent.trim().replace(/\s+/g, ' ').split(' ');
    el.textContent = '';
    words.forEach(function (word, i) {
      var s = document.createElement('span');
      s.className = 'sw';
      s.textContent = word;
      el.appendChild(s);
      if (i < words.length - 1) el.appendChild(document.createTextNode(' '));
      scrubWords.push({ el: s, v: -1 });
    });
  });
  var scrubEl = $('[data-scrub]');

  var heroTitle = $('.hero__title');
  var splitTargets = $$('[data-split]').filter(function (el) { return el !== heroTitle; });
  if (reduce || !('IntersectionObserver' in window)) {
    splitTargets.forEach(function (el) { el.classList.add('is-in'); });
  } else {
    var splitIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('is-in'); splitIO.unobserve(en.target); }
      });
    }, { threshold: 0.2, rootMargin: '0px 0px -8% 0px' });
    splitTargets.forEach(function (el) { splitIO.observe(el); });
  }

  /* ------------------------------------------------------------------------
     Entrada do hero (uma coreografia só, depois que as fontes carregam)
     ------------------------------------------------------------------------ */
  function heroReady() {
    root.classList.add('is-ready');
    setTimeout(function () { heroTitle.classList.add('is-in'); }, 120);
  }
  var fontsGate = (document.fonts && document.fonts.ready)
    ? Promise.race([document.fonts.ready, new Promise(function (r) { setTimeout(r, 1200); })])
    : Promise.resolve();
  fontsGate.then(function () { requestAnimationFrame(heroReady); });

  /* ------------------------------------------------------------------------
     Faixa de serviços em movimento
     ------------------------------------------------------------------------ */
  var ribbonTrack = $('.ribbon__track');
  var ribbonGroup = $('.ribbon__group');
  var ribbonW = 0;
  var ribbonX = 0;

  function setupRibbon() {
    if (!ribbonTrack || !ribbonGroup) return;
    $$('[data-clone]', ribbonTrack).forEach(function (n) { n.parentNode.removeChild(n); });
    ribbonW = ribbonGroup.getBoundingClientRect().width;
    if (!ribbonW) return;
    var need = Math.ceil((window.innerWidth * 1.1) / ribbonW) + 1;
    for (var i = 0; i < need; i++) {
      var c = ribbonGroup.cloneNode(true);
      c.setAttribute('data-clone', '');
      ribbonTrack.appendChild(c);
    }
  }

  /* ------------------------------------------------------------------------
     Menu mobile
     ------------------------------------------------------------------------ */
  var menuOpen = false;
  function setMenu(open) {
    menuOpen = open;
    burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    burger.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
    menu.classList.toggle('is-open', open);
    menu.setAttribute('aria-hidden', open ? 'false' : 'true');
    root.classList.toggle('is-locked', open);
    header.classList.remove('is-hidden');
    if (lenis) { open ? lenis.stop() : lenis.start(); }
  }
  burger.addEventListener('click', function () { setMenu(!menuOpen); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && menuOpen) { setMenu(false); burger.focus(); }
  });
  var mqDesktop = window.matchMedia('(min-width: 60rem)');
  var onDesktop = function (e) { if (e.matches && menuOpen) setMenu(false); };
  if (mqDesktop.addEventListener) mqDesktop.addEventListener('change', onDesktop);
  else if (mqDesktop.addListener) mqDesktop.addListener(onDesktop);

  /* ------------------------------------------------------------------------
     Âncoras com rolagem suave e pré-seleção do interesse no formulário
     ------------------------------------------------------------------------ */
  var nomeInput = $('#f-nome');
  var telInput = $('#f-tel');
  var intSelect = $('#f-int');

  function setInterest(value) {
    for (var i = 0; i < intSelect.options.length; i++) {
      if (intSelect.options[i].text === value) { intSelect.selectedIndex = i; return; }
    }
  }

  document.addEventListener('click', function (e) {
    var cta = e.target.closest('[data-cta]');
    if (cta) track('cta_click', { cta: cta.getAttribute('data-cta') });

    var a = e.target.closest('a[href^="#"]');
    if (!a) return;
    var id = a.getAttribute('href');
    if (id.length < 2) return;
    var target = document.getElementById(id.slice(1));
    if (!target) return;
    e.preventDefault();
    if (a.getAttribute('data-interest')) setInterest(a.getAttribute('data-interest'));
    var inMenu = !!a.closest('.menu');
    if (inMenu) setMenu(false);
    var go = function () {
      scrollToEl(target);
      try { history.pushState(null, '', id); } catch (err) { /* arquivo local */ }
      target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
    };
    if (inMenu) setTimeout(go, 280); else go();
  });

  /* ------------------------------------------------------------------------
     Links de WhatsApp
     ------------------------------------------------------------------------ */
  $$('[data-wa]').forEach(function (a) {
    a.href = waUrl(CONFIG.defaultMessage);
    a.target = '_blank';
    a.rel = 'noopener';
  });

  /* ------------------------------------------------------------------------
     FAQ (acordeão acessível)
     ------------------------------------------------------------------------ */
  function setQa(qa, open) {
    qa.classList.toggle('is-open', open);
    $('.qa__q', qa).setAttribute('aria-expanded', open ? 'true' : 'false');
    $('.qa__a', qa).inert = !open;
  }
  $$('.qa').forEach(function (qa) {
    $('.qa__a', qa).inert = true;
    $('.qa__q', qa).addEventListener('click', function () {
      var willOpen = !qa.classList.contains('is-open');
      $$('.qa.is-open').forEach(function (o) { setQa(o, false); });
      if (willOpen) { setQa(qa, true); track('faq_open', { question: $('.qa__q', qa).textContent.trim() }); }
    });
  });

  /* ------------------------------------------------------------------------
     Formulário: máscara, validação e envio para o WhatsApp
     ------------------------------------------------------------------------ */
  var form = $('[data-form]');
  var formOk = $('[data-form-ok]');
  var retryLink = $('[data-wa-retry]');

  function maskPhone(v) {
    var d = v.replace(/\D/g, '').slice(0, 11);
    if (!d) return '';
    if (d.length <= 2) return '(' + d;
    if (d.length <= 6) return '(' + d.slice(0, 2) + ') ' + d.slice(2);
    if (d.length <= 10) return '(' + d.slice(0, 2) + ') ' + d.slice(2, 6) + '-' + d.slice(6);
    return '(' + d.slice(0, 2) + ') ' + d.slice(2, 7) + '-' + d.slice(7);
  }
  function validName(v) { return v.trim().length >= 2; }
  function validPhone(v) {
    var d = v.replace(/\D/g, '');
    if (d.length !== 10 && d.length !== 11) return false;
    if (parseInt(d.slice(0, 2), 10) < 11) return false;
    return d.length === 10 || d.charAt(2) === '9';
  }
  function showError(input, errId, msg) {
    var err = document.getElementById(errId);
    if (msg) {
      err.textContent = msg;
      err.classList.add('is-shown');
      input.setAttribute('aria-invalid', 'true');
      input.setAttribute('aria-describedby', errId);
    } else {
      err.textContent = '';
      err.classList.remove('is-shown');
      input.removeAttribute('aria-invalid');
      input.removeAttribute('aria-describedby');
    }
  }

  telInput.addEventListener('input', function () {
    telInput.value = maskPhone(telInput.value);
    if (validPhone(telInput.value)) showError(telInput, 'e-tel', '');
  });
  nomeInput.addEventListener('input', function () {
    if (validName(nomeInput.value)) showError(nomeInput, 'e-nome', '');
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var okName = validName(nomeInput.value);
    var okTel = validPhone(telInput.value);
    showError(nomeInput, 'e-nome', okName ? '' : 'Diga como podemos te chamar.');
    showError(telInput, 'e-tel', okTel ? '' : 'Confira o número com DDD, por exemplo (11) 99999-9999.');
    if (!okName) { nomeInput.focus(); return; }
    if (!okTel) { telInput.focus(); return; }

    var interesse = intSelect.options[intSelect.selectedIndex].text;
    var msg = 'Olá, Growly! Meu nome é ' + nomeInput.value.trim() +
      '. Tenho interesse em: ' + interesse +
      '. Meu WhatsApp: ' + telInput.value +
      '. Vim pela landing page e quero agendar a reunião de briefing.';
    var url = waUrl(msg);

    track('generate_lead', { interest: interesse });
    retryLink.href = url;
    retryLink.target = '_blank';
    retryLink.rel = 'noopener';
    formOk.hidden = false;
    window.open(url, '_blank', 'noopener');
  });

  /* ------------------------------------------------------------------------
     Cena do shopping (canvas): a loja enche conforme o scroll
     ------------------------------------------------------------------------ */
  function createMall(canvas, stage, hud) {
    var ctx = canvas.getContext('2d');
    var PURPLE = '#534AB7', TEAL = '#1D9E75', INK = '#262626';
    var PALETTE = [INK, PURPLE, TEAL, '#7d76d6', '#4fbf9d'];
    var FONT = '"Bricolage Grotesque", system-ui, sans-serif';

    var icon = new Image();
    var iconOk = false;
    icon.onload = function () { iconOk = true; };
    icon.src = 'assets/growly-icon-white.png';

    var rng = mulberry32(11);
    var W = 0, H = 0, dpr = 1, g = {};
    var fx = [];

    var walkers = [];
    for (var i = 0; i < 30; i++) {
      walkers.push({
        i: i,
        lane: i % 2,
        dir: i % 3 === 2 ? -1 : 1,
        speed: 26 + rng() * 26,
        fx: rng(),
        x: 0,
        color: PALETTE[Math.floor(rng() * PALETTE.length)],
        step: rng() * 6.28,
        tagged: i % 3 !== 0,
        kind: i % 2 ? 'heart' : 'cursor',
        state: 'walk', st: 0, x0: 0, y0: 0, hold: 0,
        cool: rng() * 3,
        vis: 0
      });
    }

    var order = [];
    var OCC = 12;
    for (var j = 0; j < OCC; j++) order.push(j);
    for (var s = OCC - 1; s > 0; s--) { var r = Math.floor(rng() * (s + 1)); var t = order[s]; order[s] = order[r]; order[r] = t; }
    var occupants = [];
    for (var o = 0; o < OCC; o++) {
      occupants.push({
        fx: ((o + 0.5) / OCC) * 0.9 + 0.05 + (rng() - 0.5) * 0.03,
        row: o % 2,
        color: PALETTE[Math.floor(rng() * PALETTE.length)],
        th: 0.42 + order[o] * 0.042,
        ph: rng() * 6.28
      });
    }

    function mix(a, b, k) {
      var pa = [parseInt(a.slice(1, 3), 16), parseInt(a.slice(3, 5), 16), parseInt(a.slice(5, 7), 16)];
      var pb = [parseInt(b.slice(1, 3), 16), parseInt(b.slice(3, 5), 16), parseInt(b.slice(5, 7), 16)];
      return 'rgb(' + Math.round(lerp(pa[0], pb[0], k)) + ',' + Math.round(lerp(pa[1], pb[1], k)) + ',' + Math.round(lerp(pa[2], pb[2], k)) + ')';
    }

    function rr(x, y, w, h, rad) {
      rad = Math.min(rad, w / 2, h / 2);
      ctx.beginPath();
      ctx.moveTo(x + rad, y);
      ctx.arcTo(x + w, y, x + w, y + h, rad);
      ctx.arcTo(x + w, y + h, x, y + h, rad);
      ctx.arcTo(x, y + h, x, y, rad);
      ctx.arcTo(x, y, x + w, y, rad);
      ctx.closePath();
    }

    function resize() {
      var w = stage.clientWidth, h = stage.clientHeight;
      if (!w || !h) return false;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      var oldW = W;
      W = w; H = h;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      var pad = Math.max(10, W * 0.035);
      var sw = Math.min(W - pad * 2, 580);
      g.sw = sw;
      g.x0 = (W - sw) / 2;
      g.x1 = g.x0 + sw;
      g.floorY = H * 0.78;
      g.signH = clamp(H * 0.11, 34, 58);
      var hudB = hud ? hud.offsetTop + hud.offsetHeight : 0;
      g.top = Math.max(H * 0.1, hudB + 12);
      if (g.floorY - g.top < 170) g.top = Math.max(4, g.floorY - 170);
      g.awnN = Math.max(6, Math.round(sw / 30));
      g.awnR = sw / g.awnN / 2;
      g.awnH = g.awnR + 10;
      g.signY = g.top;
      g.awnY = g.top + g.signH;
      g.bodyY = g.awnY + g.awnH;
      g.winX0 = g.x0 + sw * 0.06;
      g.doorW = sw * 0.2;
      g.doorX0 = g.x1 - sw * 0.06 - g.doorW;
      g.winX1 = g.doorX0 - sw * 0.05;
      g.winY0 = g.bodyY + 10;
      g.winY1 = g.floorY - H * 0.02;
      g.doorCx = g.doorX0 + g.doorW / 2;
      g.laneA = g.floorY + H * 0.075;
      g.laneB = g.floorY + H * 0.16;
      g.hB = clamp(H * 0.13, 34, 66);
      g.k = clamp(W / 420, 0.7, 1.5);

      walkers.forEach(function (k) {
        k.x = oldW ? k.x * (W / oldW) : k.fx * (W + 52) - 26;
      });
      return true;
    }

    function person(x, feetY, h, color, alpha, step, moving) {
      if (alpha <= 0.01 || h < 4) return;
      ctx.save();
      ctx.globalAlpha = alpha;
      var hr = h * 0.15, bw = h * 0.34;
      var headY = feetY - h + hr;
      var torsoTop = headY + hr + h * 0.03;
      var torsoBot = feetY - h * 0.3;
      var swing = moving ? Math.sin(step) * bw * 0.5 : 0;
      ctx.fillStyle = color;
      ctx.strokeStyle = color;
      ctx.lineCap = 'round';
      ctx.lineWidth = h * 0.09;
      ctx.beginPath();
      ctx.moveTo(x - bw * 0.2, torsoBot - 2);
      ctx.lineTo(x - bw * 0.2 + swing, feetY);
      ctx.moveTo(x + bw * 0.2, torsoBot - 2);
      ctx.lineTo(x + bw * 0.2 - swing, feetY);
      ctx.stroke();
      rr(x - bw / 2, torsoTop, bw, torsoBot - torsoTop, bw * 0.42);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x, headY, hr, 0, 6.2832);
      ctx.fill();
      ctx.restore();
    }

    function tag(x, y, kind, sc, alpha) {
      if (alpha <= 0.01) return;
      ctx.save();
      ctx.globalAlpha = alpha;
      var r = 8.5 * sc;
      var col = kind === 'heart' ? PURPLE : TEAL;
      ctx.fillStyle = '#fff';
      ctx.strokeStyle = col;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, 6.2832);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = col;
      var u;
      if (kind === 'heart') {
        u = r * 0.42;
        ctx.beginPath();
        ctx.moveTo(x, y + u * 1.05);
        ctx.bezierCurveTo(x - u * 2, y - u * 0.2, x - u * 0.9, y - u * 1.5, x, y - u * 0.45);
        ctx.bezierCurveTo(x + u * 0.9, y - u * 1.5, x + u * 2, y - u * 0.2, x, y + u * 1.05);
        ctx.fill();
      } else {
        u = r * 0.5;
        ctx.beginPath();
        ctx.moveTo(x - u * 0.7, y - u * 1.0);
        ctx.lineTo(x - u * 0.7, y + u * 0.9);
        ctx.lineTo(x - u * 0.2, y + u * 0.45);
        ctx.lineTo(x + u * 0.2, y + u * 1.15);
        ctx.lineTo(x + u * 0.5, y + u * 1.0);
        ctx.lineTo(x + u * 0.15, y + u * 0.35);
        ctx.lineTo(x + u * 0.8, y + u * 0.3);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }

    function update(dt, p) {
      if (!W) return;
      var cnt = 2 + 28 * ss(0.3, 0.95, p);
      var enterProb = 0.1 + 0.75 * ss(0.36, 0.9, p);
      walkers.forEach(function (w) {
        w.vis = clamp(cnt - w.i);
        var laneY = w.lane ? g.laneB : g.laneA;
        if (w.state === 'walk') {
          var prev = w.x;
          w.x += w.dir * w.speed * g.k * dt;
          w.step += dt * w.speed * g.k * 0.17;
          w.cool -= dt;
          if (w.dir > 0 && w.x > W + 26) w.x = -26;
          else if (w.dir < 0 && w.x < -26) w.x = W + 26;
          if (w.cool <= 0 && p > 0.36 && w.vis > 0.9 &&
            Math.abs(w.x - prev) < 40 &&
            (prev - g.doorCx) * (w.x - g.doorCx) <= 0) {
            if (Math.random() < enterProb) { w.state = 'enter'; w.st = 0; w.x0 = w.x; w.y0 = laneY; }
            else w.cool = 1;
          }
        } else if (w.state === 'enter') {
          w.st += dt / 0.95;
          w.step += dt * 5;
          if (w.st >= 1) {
            fx.push({ x: g.doorCx, y: g.floorY - g.hB * 0.5, t: 0 });
            w.state = 'hold';
            w.hold = 0.4 + Math.random() * 1.4;
          }
        } else {
          w.hold -= dt;
          if (w.hold <= 0) {
            w.state = 'walk';
            w.x = w.dir > 0 ? -26 : W + 26;
            w.cool = 1 + Math.random() * 2;
          }
        }
      });
      for (var f = fx.length - 1; f >= 0; f--) {
        fx[f].t += dt;
        if (fx[f].t > 1.1) fx.splice(f, 1);
      }
    }

    function drawWalker(w, p, animated) {
      if (w.state === 'hold' || w.vis <= 0.01) return;
      var laneY = w.lane ? g.laneB : g.laneA;
      var h = g.hB * (w.lane ? 1 : 0.82);
      var x = w.x, y = laneY, a = w.vis, sc = 1;
      if (w.state === 'enter') {
        var e = easeInOut(w.st);
        x = lerp(w.x0, g.doorCx, e);
        y = lerp(w.y0, g.floorY - 2, e);
        sc = lerp(1, 0.8, e);
        a *= w.st < 0.55 ? 1 : 1 - (w.st - 0.55) / 0.45;
      }
      var bob = animated ? Math.abs(Math.sin(w.step)) * h * 0.03 : 0;
      person(x, y - bob, h * sc, w.color, a, w.step, animated);
      if (w.tagged && w.state === 'walk') {
        var pulse = animated ? 1 + Math.sin(w.step * 0.7) * 0.06 : 1;
        tag(x, y - h * sc - 13, w.kind, pulse, a * ss(0.33, 0.45, p));
      }
    }

    function draw(p, time, animated) {
      if (!W) return;
      var lit = ss(0.3, 0.55, p);
      ctx.clearRect(0, 0, W, H);
      ctx.save();
      rr(0, 0, W, H, Math.min(28, W * 0.06));
      ctx.clip();

      /* fundo do painel */
      var bg = ctx.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, '#eeedf8');
      bg.addColorStop(1, '#e5f3ed');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = 'rgba(38,38,38,.05)';
      ctx.fillRect(0, g.floorY, W, H - g.floorY);

      /* luz que sai da loja no chão */
      if (lit > 0.01) {
        var glow = ctx.createRadialGradient(W / 2, g.floorY, 4, W / 2, g.floorY, g.sw * 0.62);
        glow.addColorStop(0, 'rgba(29,158,117,' + (0.32 * lit).toFixed(3) + ')');
        glow.addColorStop(1, 'rgba(29,158,117,0)');
        ctx.save();
        ctx.translate(0, g.floorY);
        ctx.scale(1, 0.22);
        ctx.translate(0, -g.floorY);
        ctx.fillStyle = glow;
        ctx.fillRect(0, g.floorY - g.sw, W, g.sw * 2);
        ctx.restore();
      }

      /* fachada */
      var storeH = g.floorY - g.signY;
      ctx.save();
      rr(g.x0, g.signY, g.sw, storeH, 12);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.clip();

      /* letreiro */
      ctx.fillStyle = INK;
      ctx.fillRect(g.x0, g.signY, g.sw, g.signH);
      var isz = g.signH * 0.66;
      if (iconOk) {
        ctx.globalAlpha = 0.4 + 0.6 * lit;
        ctx.drawImage(icon, g.x0 + 14, g.signY + (g.signH - isz) / 2, isz, isz);
        ctx.globalAlpha = 1;
      }
      ctx.font = '700 ' + Math.round(g.signH * 0.4) + 'px ' + FONT;
      ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(255,255,255,' + (0.4 + 0.6 * lit).toFixed(3) + ')';
      ctx.fillText('Sua marca', g.x0 + 14 + isz + 8, g.signY + g.signH / 2 + 1);

      /* toldo listrado com festão */
      var stripeW = g.sw / g.awnN;
      for (var n = 0; n < g.awnN; n++) {
        var sx = g.x0 + n * stripeW;
        ctx.fillStyle = n % 2 ? '#ffffff' : mix(PURPLE, TEAL, n / Math.max(1, g.awnN - 1));
        ctx.beginPath();
        ctx.moveTo(sx, g.awnY);
        ctx.lineTo(sx + stripeW + 0.5, g.awnY);
        ctx.lineTo(sx + stripeW + 0.5, g.awnY + g.awnH - g.awnR);
        ctx.arc(sx + stripeW / 2, g.awnY + g.awnH - g.awnR, g.awnR, 0, Math.PI);
        ctx.closePath();
        ctx.fill();
        if (n % 2) {
          ctx.strokeStyle = 'rgba(38,38,38,.14)';
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }

      /* vitrine */
      var ww = g.winX1 - g.winX0, wh = g.winY1 - g.winY0;
      ctx.save();
      rr(g.winX0, g.winY0, ww, wh, 8);
      ctx.fillStyle = '#f3f3f7';
      ctx.fill();
      var inter = ctx.createLinearGradient(0, g.winY0, 0, g.winY1);
      inter.addColorStop(0, 'rgba(83,74,183,' + (0.2 * lit).toFixed(3) + ')');
      inter.addColorStop(1, 'rgba(29,158,117,' + (0.3 * lit).toFixed(3) + ')');
      ctx.fillStyle = inter;
      ctx.fill();
      ctx.clip();

      /* prateleiras e produtos */
      for (var sh = 0; sh < 2; sh++) {
        var shY = g.winY0 + wh * (0.42 + sh * 0.27);
        ctx.strokeStyle = 'rgba(38,38,38,.16)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(g.winX0 + 6, shY);
        ctx.lineTo(g.winX1 - 6, shY);
        ctx.stroke();
        var step = 20;
        var prods = Math.floor((ww - 20) / step);
        for (var q = 0; q < prods; q++) {
          var ph = 8 + ((q * 97 + sh * 31) % 7) * 2.2;
          ctx.globalAlpha = 0.22 + 0.5 * lit;
          ctx.fillStyle = (q + sh) % 3 === 0 ? PURPLE : ((q + sh) % 3 === 1 ? TEAL : INK);
          rr(g.winX0 + 10 + q * step, shY - 2 - ph, 12, ph, 3);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }

      /* pessoas dentro da loja */
      var occH = Math.min(wh * 0.42, g.hB * 0.95);
      occupants.forEach(function (oc) {
        var k = easeOutBack(clamp((p - oc.th) / 0.04));
        if (k <= 0.01) return;
        var hh = occH * (oc.row ? 1 : 0.86) * clamp(k, 0, 1.08);
        var fy = g.winY1 - 4 - (oc.row ? 0 : wh * 0.07);
        var idle = animated ? Math.sin(time * 1.6 + oc.ph) * 1.1 : 0;
        person(g.winX0 + 12 + oc.fx * (ww - 24), fy + idle, hh, oc.color, clamp(k * 2), 0, false);
      });

      /* reflexo do vidro */
      ctx.fillStyle = 'rgba(255,255,255,.32)';
      ctx.beginPath();
      ctx.moveTo(g.winX0 + ww * 0.18, g.winY0);
      ctx.lineTo(g.winX0 + ww * 0.3, g.winY0);
      ctx.lineTo(g.winX0 + ww * 0.3 - wh * 0.35, g.winY1);
      ctx.lineTo(g.winX0 + ww * 0.18 - wh * 0.35, g.winY1);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      rr(g.winX0, g.winY0, ww, wh, 8);
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2;
      ctx.stroke();

      /* porta */
      var dh = g.floorY - g.winY0;
      ctx.save();
      rr(g.doorX0, g.winY0, g.doorW, dh, 6);
      ctx.fillStyle = '#eeeef3';
      ctx.fill();
      ctx.fillStyle = inter;
      ctx.fill();
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = INK;
      rr(g.doorX0 + 7, g.winY0 + dh * 0.5, 3, dh * 0.14, 1.5);
      ctx.fill();

      /* placa Aberto / Fechado */
      var open = p > 0.35;
      var pw = g.doorW * 0.82, phh = 17;
      var px = g.doorCx - pw / 2, py = g.winY0 + 12;
      var oa = ss(0.3, 0.4, p);
      ctx.fillStyle = mix('#dcdce4', TEAL, oa);
      rr(px, py, pw, phh, 8);
      ctx.fill();
      ctx.font = '700 10px ' + FONT;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = open ? '#ffffff' : 'rgba(38,38,38,.62)';
      ctx.fillText(open ? 'Aberto' : 'Fechado', g.doorCx, py + phh / 2 + 0.5);
      ctx.textAlign = 'left';
      ctx.restore();

      /* rodapé da fachada */
      ctx.fillStyle = 'rgba(38,38,38,.08)';
      ctx.fillRect(g.x0, g.winY1, g.sw, g.floorY - g.winY1);
      ctx.restore();

      rr(g.x0, g.signY, g.sw, storeH, 12);
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.5;
      ctx.stroke();

      /* chão */
      ctx.strokeStyle = 'rgba(38,38,38,.22)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, g.floorY);
      ctx.lineTo(W, g.floorY);
      ctx.stroke();

      /* gente passando: fundo primeiro, frente depois */
      walkers.forEach(function (w) { if (!w.lane) drawWalker(w, p, animated); });
      walkers.forEach(function (w) { if (w.lane) drawWalker(w, p, animated); });

      /* novo lead entrando */
      fx.forEach(function (f) {
        var k = f.t / 1.1;
        ctx.save();
        ctx.globalAlpha = clamp(1 - k * 1.1);
        ctx.strokeStyle = TEAL;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(f.x, f.y, 6 + k * 34, 0, 6.2832);
        ctx.stroke();
        ctx.font = '800 15px ' + FONT;
        ctx.textAlign = 'center';
        ctx.fillStyle = TEAL;
        ctx.fillText('+1', f.x, f.y - 12 - k * 26);
        ctx.restore();
      });

      ctx.restore();
    }

    return { resize: resize, update: update, draw: draw };
  }

  var canvas = $('[data-mall-canvas]');
  var mallStage = canvas ? canvas.parentNode : null;
  var mall = null;
  if (canvas && canvas.getContext) {
    mall = createMall(canvas, mallStage, $('.hud', mallStage));
    if ('ResizeObserver' in window) {
      new ResizeObserver(function () { if (mall.resize()) state.forceMall = true; }).observe(mallStage);
    }
    if (document.fonts && document.fonts.load) {
      document.fonts.load('700 20px "Bricolage Grotesque"').then(function () { state.forceMall = true; });
    }
  }

  /* ------------------------------------------------------------------------
     Elementos guiados por scroll
     ------------------------------------------------------------------------ */
  var mallTrack = $('[data-mall-track]');
  var mallStick = $('.mall__stick');
  var phaseEls = $$('.phase');
  var phaseBars = $$('.phases__bar i');
  var countEl = $('[data-mall-count]');
  var stepsEl = $('[data-steps]');
  var stepEls = $$('.step');
  var vennEl = $('[data-venn]');
  var verdictEl = $('[data-verdict]');
  var svcs = $$('[data-svc]');
  var svcTops = [];
  var parallaxEls = $$('[data-parallax]').map(function (el) {
    return { el: el, f: parseFloat(el.getAttribute('data-parallax')) || 0, sec: el.closest('section') };
  });
  var launch = $('[data-launch]');
  var rocket = $('[data-rocket]');

  function measureSvc() {
    svcTops = svcs.map(function (c) { return parseFloat(window.getComputedStyle(c).top) || 0; });
  }

  if (!reduce && 'IntersectionObserver' in window) {
    var svcIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('is-in'); svcIO.unobserve(en.target); }
      });
    }, { threshold: 0.2, rootMargin: '0px 0px -10% 0px' });
    svcs.forEach(function (c) { svcIO.observe(c); });
  } else {
    svcs.forEach(function (c) { c.classList.add('is-in'); });
  }

  /* mouse no hero (só em desktop) */
  var mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  if (finePointer && !reduce && launch) {
    window.addEventListener('pointermove', function (e) {
      mouse.tx = (e.clientX / window.innerWidth - 0.5) * 2;
      mouse.ty = (e.clientY / window.innerHeight - 0.5) * 2;
    }, { passive: true });
  }

  /* ------------------------------------------------------------------------
     Trabalho a cada quadro
     ------------------------------------------------------------------------ */
  var state = {
    y: -1, prevY: 0, vel: 0, velS: 0, lastT: 0,
    pMall: 0, pS: 0, mallVisible: false, heroVisible: true,
    hdrAcc: 0, theme: '', railTheme: '', dockTheme: '', rail: -1, forceMall: true, leads: -1, phase: -1
  };

  function scrollWork(y, dt) {
    var vh = window.innerHeight;
    var rects = themed.map(function (el) { return el.getBoundingClientRect(); });
    var maxScroll = Math.max(1, root.scrollHeight - vh);
    var pageP = clamp(y / maxScroll);

    /* progresso da página */
    progressBar.style.transform = 'scaleX(' + pageP.toFixed(4) + ')';

    /* tema do cabeçalho, do indicador lateral e do botão flutuante */
    var themeOf = function (idx) { return themed[idx].getAttribute('data-theme'); };
    var themeAt = function (py) {
      for (var i = themed.length - 1; i >= 0; i--) { if (rects[i].top <= py) return themeOf(i); }
      return themeOf(0);
    };
    var theme = themeAt(44);
    if (theme !== state.theme) { state.theme = theme; body.setAttribute('data-theme', theme); }
    var midTheme = themeAt(vh * 0.5);
    if (midTheme !== state.railTheme) { state.railTheme = midTheme; railEl.style.color = RAIL_COLOR[midTheme]; }
    var lowTheme = themeAt(vh - 48);
    if (lowTheme !== state.dockTheme) { state.dockTheme = lowTheme; dock.setAttribute('data-on', lowTheme); }

    /* o gradiente das seções de marca desliza com o scroll */
    if (!reduce) {
      themed.forEach(function (el, k) {
        if (themeOf(k) !== 'brand') return;
        var r = rects[k];
        if (r.bottom < -50 || r.top > vh + 50) return;
        el.style.setProperty('--gp', clamp((vh - r.top) / (vh + r.height)).toFixed(3));
      });
    }

    /* indicador lateral de seção */
    var probe = vh * 0.5, idx = 0;
    for (var s = 0; s < sections.length; s++) { if (rects[s].top <= probe) idx = s; }
    if (idx !== state.rail) {
      state.rail = idx;
      railNum.textContent = ('0' + (idx + 1)).slice(-2);
      railName.textContent = sections[idx].getAttribute('data-rail');
    }

    /* cabeçalho some ao descer e volta ao subir */
    var dy = y - state.prevY;
    if (y < 80 || menuOpen || header.matches(':focus-within')) {
      header.classList.remove('is-hidden'); state.hdrAcc = 0;
    } else if (dy > 0) {
      state.hdrAcc = Math.max(0, state.hdrAcc) + dy;
      if (state.hdrAcc > 40) header.classList.add('is-hidden');
    } else if (dy < 0) {
      state.hdrAcc = Math.min(0, state.hdrAcc) + dy;
      if (state.hdrAcc < -20) header.classList.remove('is-hidden');
    }

    /* botão flutuante de WhatsApp (celular) */
    var showDock = rects[0].bottom < vh * 0.35 && rects[7].top > vh * 0.75 && !menuOpen;
    if (showDock !== state.dockShown) { state.dockShown = showDock; dock.classList.toggle('is-shown', showDock); }

    state.heroVisible = rects[0].bottom > -60;

    /* hero: foguete decola e chamas crescem */
    if (!reduce && rocket && state.heroVisible) {
      var hp = clamp(y / (rects[0].height * 0.75 || 1));
      rocket.style.transform = 'translate3d(0,' + (-hp * 34).toFixed(2) + '%,0) scale(' + (1 + hp * 0.1).toFixed(3) + ')';
      launch.style.setProperty('--tro', clamp(hp * 3).toFixed(3));
      launch.style.setProperty('--tr', (0.2 + hp * 1.1).toFixed(3));
    }

    /* parallax dos elementos marcados */
    if (!reduce) {
      parallaxEls.forEach(function (pe) {
        var si = sections.indexOf(pe.sec);
        if (si < 0) return;
        var r = rects[si];
        if (r.bottom < -200 || r.top > vh + 200) return;
        var off = (r.top + r.height / 2 - vh / 2) * pe.f;
        pe.el.style.translate = '0 ' + off.toFixed(1) + 'px';
        if (pe.el.classList.contains('watermark')) pe.el.style.rotate = (y * 0.02).toFixed(2) + 'deg';
      });
    }

    /* problema: texto que acende palavra por palavra */
    if (scrubEl && scrubWords.length && !reduce) {
      var sr = scrubEl.getBoundingClientRect();
      var sp = clamp((vh * 0.85 - sr.top) / (sr.height + vh * 0.4));
      var n = sp * scrubWords.length;
      scrubWords.forEach(function (w, k) {
        var v = clamp(n - k);
        v = Math.round(v * 40) / 40;
        if (v !== w.v) { w.v = v; w.el.style.opacity = (0.16 + 0.84 * v).toFixed(3); }
      });
    }

    /* shopping: progresso na cena fixa */
    var tr = mallTrack.getBoundingClientRect();
    var range = Math.max(1, tr.height - mallStick.offsetHeight);
    state.pMall = clamp(-tr.top / range);
    state.mallVisible = tr.top < vh && tr.bottom > 0;
    var pm = state.pMall;
    var ph = pm < 0.335 ? 0 : (pm < 0.67 ? 1 : 2);
    if (ph !== state.phase) {
      state.phase = ph;
      phaseEls.forEach(function (el, k) { el.classList.toggle('is-active', k === ph); });
    }
    phaseBars.forEach(function (b, k) { b.style.setProperty('--f', clamp(pm * 3 - k).toFixed(3)); });

    /* serviços: cartas que empilham */
    if (!reduce) {
      for (var c = 0; c < svcs.length - 1; c++) {
        var nextTop = svcs[c + 1].getBoundingClientRect().top;
        var q = clamp(1 - (nextTop - (svcTops[c + 1] || 0)) / (vh * 0.6));
        var sc = 1 - 0.05 * q;
        if (Math.abs(sc - (svcs[c]._sc || 1)) > 0.0005) {
          svcs[c]._sc = sc;
          svcs[c].style.transform = 'scale(' + sc.toFixed(4) + ')';
        }
      }
    }

    /* método: linha que preenche e passos que acendem */
    var stR = stepsEl.getBoundingClientRect();
    var pr = vh * 0.62;
    stepsEl.style.setProperty('--fill', clamp((pr - (stR.top + 10)) / Math.max(1, stR.height - 20)).toFixed(4));
    stepEls.forEach(function (el) {
      var done = el.getBoundingClientRect().top + 8 <= pr;
      if (done !== el._done) { el._done = done; el.classList.toggle('is-done', done); }
    });

    /* pilares: os três círculos se encontram */
    var vr = vennEl.getBoundingClientRect();
    var vs = reduce ? 1 : clamp((vh - vr.top) / (vh * 0.5 + vr.height * 0.5));
    vennEl.style.setProperty('--k', (1 - (1 - Math.pow(1 - vs, 3))).toFixed(4));

    /* pilares: frase final riscada e sublinhada */
    var ve = verdictEl.getBoundingClientRect();
    var vp = reduce ? 1 : clamp((vh * 0.85 - ve.top) / (vh * 0.45));
    verdictEl.style.setProperty('--v', clamp(vp * 2).toFixed(3));
    verdictEl.style.setProperty('--u', clamp(vp * 2 - 1).toFixed(3));
  }

  function loop(now) {
    requestAnimationFrame(loop);
    var dt = Math.min(0.05, (now - state.lastT) / 1000 || 0.016);
    state.lastT = now;
    if (lenis) lenis.raf(now);

    var y = window.scrollY;
    var moved = y !== state.y;
    if (moved) {
      var rawV = state.y < 0 ? 0 : (y - state.y) / Math.max(dt, 0.001);
      state.vel = rawV;
      scrollWork(y, dt);
      state.prevY = y;
      state.y = y;
    } else {
      state.vel = 0;
    }
    state.velS += (Math.abs(state.vel) - state.velS) * Math.min(1, dt * 8);

    /* faixa de serviços: velocidade base + impulso do scroll */
    if (!reduce && ribbonW && state.heroVisible) {
      ribbonX = (ribbonX + (55 + Math.min(state.velS * 0.25, 520)) * dt) % ribbonW;
      ribbonTrack.style.transform = 'translate3d(' + (-ribbonX).toFixed(2) + 'px,0,0)';
    }

    /* mouse no hero */
    if (finePointer && !reduce && launch && state.heroVisible) {
      mouse.x += (mouse.tx - mouse.x) * Math.min(1, dt * 4);
      mouse.y += (mouse.ty - mouse.y) * Math.min(1, dt * 4);
      launch.style.setProperty('--mx', mouse.x.toFixed(3));
      launch.style.setProperty('--my', mouse.y.toFixed(3));
    }

    /* cena do shopping */
    if (mall && (state.mallVisible || state.forceMall)) {
      var k = 1 - Math.exp(-dt * 7);
      state.pS = reduce ? state.pMall : state.pS + (state.pMall - state.pS) * k;
      if (Math.abs(state.pMall - state.pS) < 0.0004) state.pS = state.pMall;
      if (!reduce) mall.update(dt, state.pS);
      if (!reduce || moved || state.forceMall) mall.draw(state.pS, now / 1000, !reduce);
      state.forceMall = false;

      var leads = Math.round(ss(0.34, 0.97, state.pS) * 96);
      if (leads !== state.leads) { state.leads = leads; countEl.textContent = leads.toLocaleString('pt-BR'); }
    }
  }

  /* ------------------------------------------------------------------------
     Início
     ------------------------------------------------------------------------ */
  function measureAll() {
    setupRibbon();
    measureSvc();
    state.y = -1;
  }

  var resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(measureAll, 120);
  });
  window.addEventListener('load', measureAll);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measureAll);

  measureAll();
  requestAnimationFrame(function (t) { state.lastT = t; loop(t); });
})();
