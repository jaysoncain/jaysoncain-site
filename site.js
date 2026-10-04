(function () {
  var PURPOSES = {
    'purchase': 'Buying a home', 'buy': 'Buying a home', 'first-time': 'First-time homebuyer',
    'refinance': 'Refinance', 'refi': 'Refinance', 'cash-out': 'Cash-out refinance',
    'self-employed': 'Self-employed (bank statement)', 'bank-statement': 'Self-employed (bank statement)',
    'dscr': 'Rental property (DSCR)', 'investor': 'Investor (rehab or no-doc)', 'rehab': 'Investor (rehab or no-doc)',
    'no-doc': 'Investor (rehab or no-doc)', 'reverse': 'Reverse mortgage', 'agent': 'Real estate agent partnership'
  };
  var GREEN = '#1E4634', BRASS = '#B98A4E', MINT = '#9DB8A6';
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (id) { return document.getElementById(id); };
  var num = function (id) { var el = $(id); return el ? parseFloat(el.value) || 0 : 0; };
  var set = function (id, v) { var el = $(id); if (el) el.textContent = v; };
  var money = function (n) { return '$' + Math.round(n).toLocaleString('en-US'); };

  function bind(formId, thanksId, send) {
    var f = $(formId);
    if (!f || f.__jcBound) return;
    f.__jcBound = true;
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var btn = f.querySelector('button[type="submit"]');
      var err = f.querySelector('[data-error]');
      var label = btn.textContent;
      if (err) err.style.display = 'none';
      btn.disabled = true; btn.textContent = 'Sending…';
      Promise.resolve(send(f)).then(function (ok) {
        if (!ok) throw new Error('send failed');
        f.style.display = 'none';
        var t = $(thanksId); if (t) t.style.display = 'block';
      }).catch(function () {
        if (err) err.style.display = 'block';
        btn.disabled = false; btn.textContent = label;
      });
    });
  }
  function placeholder(ep, name) {
    if (!ep || ep.indexOf(name) !== -1) { console.warn(name + ' is still a placeholder.'); return true; }
    return false;
  }
  function setPurpose(v) { var s = $('q-purpose'); if (s && v) s.value = v; }

  /* ---------- Loan matcher ---------- */
  var match = { goal: 'buy', income: 'w2', prop: 'primary' };
  function recommend(m) {
    var out = [], purpose = 'Buying a home';
    if (m.goal === 'refi') out.push(['Rate and term refinance', 'Lower your rate, shorten your term or drop mortgage insurance.']);
    if (m.goal === 'cash') out.push(['Cash-out refinance', 'Turn equity into cash for projects, debt payoff or your next purchase.']);
    if (m.prop === 'investment') {
      out.push(['DSCR loan', 'Qualify on the property\u2019s rent instead of your personal income.']);
      if (m.income === 'w2') out.push(['Conventional investment loan', 'Full-documentation option with as little as 15% down on one unit.']);
      if (m.goal === 'buy') out.push(['Rehab and no-doc investor loans', '30-year financing while you renovate, or no-income-doc options.']);
      purpose = m.goal === 'cash' ? 'Cash-out refinance' : 'Rental property (DSCR)';
    } else if (m.income === 'self') {
      out.push(['Bank statement loan', 'Qualify on 12 to 24 months of deposits instead of tax returns.']);
      out.push(['Conventional loan', 'If your tax returns show enough income, often the lowest-cost option.']);
      purpose = 'Self-employed (bank statement)';
    } else if (m.income === 'retired') {
      if (m.goal === 'cash') out.push(['Reverse mortgage', 'For homeowners 62+: no monthly mortgage payment. Taxes and insurance still apply.']);
      out.push(['Conventional loan', 'Qualify using retirement, pension or Social Security income.']);
      out.push(['Asset-based qualifying', 'Use savings and investments as qualifying income.']);
      purpose = m.goal === 'cash' ? 'Reverse mortgage' : 'Buying a home';
    } else {
      if (m.goal === 'buy') {
        out.push(['Conventional loan', 'As little as 3% down on a primary home.']);
        out.push(['FHA or VA loan', 'FHA from 3.5% down with flexible credit; VA with no down payment for eligible veterans.']);
        out.push(['Jumbo loan', 'For loan amounts above conforming limits, common in Los Angeles.']);
      } else out.push(['Conventional or FHA refinance', 'Standard programs with the lowest rates for documented income.']);
    }
    if (m.goal === 'refi' && purpose === 'Buying a home') purpose = 'Refinance';
    if (m.goal === 'cash' && purpose === 'Buying a home') purpose = 'Cash-out refinance';
    return { items: out.slice(0, 3), purpose: purpose };
  }
  function renderMatch() {
    var box = $('match-result'); if (!box) return;
    document.querySelectorAll('[data-q]').forEach(function (b) {
      var on = match[b.getAttribute('data-q')] === b.getAttribute('data-v');
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
      b.style.background = on ? '#D9C29A' : 'transparent';
      b.style.color = on ? '#16211C' : '#F6F4EF';
      b.style.borderColor = on ? '#D9C29A' : 'rgba(246,244,239,0.35)';
    });
    var r = recommend(match);
    box.innerHTML = r.items.map(function (it, i) {
      return '<li style="display:flex;gap:14px;align-items:flex-start;padding:16px 0;border-top:' + (i ? '1px solid rgba(246,244,239,0.18)' : '0') + ';animation:jcfade .45s ease both;animation-delay:' + (i * 80) + 'ms">' +
        '<span style="flex:none;width:28px;height:28px;border-radius:50%;background:#D9C29A;color:#16211C;display:grid;place-items:center;font-weight:700;font-size:14px">' + (i + 1) + '</span>' +
        '<span style="display:flex;flex-direction:column;gap:2px"><strong style="font-size:18px;color:#fff">' + it[0] + '</strong><span style="font-size:15.5px;color:#DCE4DE">' + it[1] + '</span></span></li>';
    }).join('');
    var cta = $('match-cta'); if (cta) cta.setAttribute('data-purpose', r.purpose);
  }

  /* ---------- Payment calculator + charts ---------- */
  function donut(parts) {
    var total = parts.reduce(function (a, p) { return a + p[0]; }, 0) || 1, a0 = -Math.PI / 2, r = 70, c = 90, s = '';
    parts.forEach(function (p) {
      var a1 = a0 + (p[0] / total) * Math.PI * 2, large = a1 - a0 > Math.PI ? 1 : 0;
      if (p[0] > 0) s += '<path d="M' + (c + r * Math.cos(a0)).toFixed(2) + ' ' + (c + r * Math.sin(a0)).toFixed(2) + ' A' + r + ' ' + r + ' 0 ' + large + ' 1 ' + (c + r * Math.cos(a1 - 0.0001)).toFixed(2) + ' ' + (c + r * Math.sin(a1 - 0.0001)).toFixed(2) + '" fill="none" stroke="' + p[1] + '" stroke-width="26"/>';
      a0 = a1;
    });
    return s;
  }
  function amortChart(loan, r, n, pi) {
    var W = 600, H = 220, pad = 34, bal = loan, pts = [[0, loan]], intPts = [[0, 0]], cumInt = 0;
    for (var m = 1; m <= n; m++) { var it = bal * r; cumInt += it; bal = Math.max(0, bal - (pi - it)); if (m % 12 === 0) { pts.push([m / 12, bal]); intPts.push([m / 12, cumInt]); } }
    var yMax = Math.max(loan, cumInt) * 1.05, yrs = n / 12;
    var X = function (y) { return pad + (y / yrs) * (W - pad - 26); }, Y = function (v) { return H - 24 - (v / yMax) * (H - 40); };
    var line = function (arr) { return arr.map(function (p, i) { return (i ? 'L' : 'M') + X(p[0]).toFixed(1) + ' ' + Y(p[1]).toFixed(1); }).join(' '); };
    var area = line(pts) + ' L' + X(yrs) + ' ' + Y(0) + ' L' + X(0) + ' ' + Y(0) + ' Z';
    var grid = '';
    for (var g = 0; g <= yrs; g += (yrs > 20 ? 5 : yrs > 10 ? 5 : 3)) grid += '<line x1="' + X(g) + '" x2="' + X(g) + '" y1="16" y2="' + Y(0) + '" stroke="#E7E3DA"/><text x="' + X(g) + '" y="' + (H - 6) + '" font-size="11" fill="#5A645E" text-anchor="middle">Yr ' + g + '</text>';
    return grid + '<path d="' + area + '" fill="' + GREEN + '" fill-opacity="0.12"/>' +
      '<path d="' + line(pts) + '" fill="none" stroke="' + GREEN + '" stroke-width="2.5" pathLength="1" style="stroke-dasharray:1;stroke-dashoffset:' + (reduce ? 0 : 1) + ';animation:' + (reduce ? 'none' : 'jcdraw 1s ease forwards') + '"/>' +
      '<path d="' + line(intPts) + '" fill="none" stroke="' + BRASS + '" stroke-width="2.5" stroke-dasharray="6 5"/>' +
      '<line x1="' + pad + '" x2="' + (W - 10) + '" y1="' + Y(0) + '" y2="' + Y(0) + '" stroke="#C9C3B6"/>';
  }
  function calc() {
    if (!$('c-price') || $('c-price').value === '') return;
    var price = num('c-price'), down = num('c-down'), rate = num('c-rate'), term = num('c-term') || 30, taxp = num('c-tax'), ins = num('c-ins');
    var ids = ['c-out-total', 'c-out-pi', 'c-out-tax', 'c-out-ins', 'c-out-loan', 'c-out-interest'];
    var chart = $('calc-chart'), dn = $('calc-donut'), empty = $('calc-empty');
    if (!rate || !price) {
      ids.forEach(function (id) { set(id, '\u2014'); });
      if (chart) chart.innerHTML = ''; if (dn) dn.innerHTML = ''; if (empty) empty.style.display = 'grid';
      return;
    }
    var loan = Math.max(0, price * (1 - down / 100)), r = rate / 1200, n = term * 12;
    var pi = r ? loan * r / (1 - Math.pow(1 + r, -n)) : loan / n, tax = price * taxp / 100 / 12;
    set('c-out-total', money(pi + tax + ins)); set('c-out-pi', money(pi)); set('c-out-tax', money(tax));
    set('c-out-ins', money(ins)); set('c-out-loan', money(loan)); set('c-out-interest', money(pi * n - loan));
    if (empty) empty.style.display = 'none';
    if (dn) dn.innerHTML = donut([[pi, GREEN], [tax, BRASS], [ins, MINT]]);
    if (chart) chart.innerHTML = amortChart(loan, r, n, pi);
  }

  /* ---------- DSCR + bank statement explainers ---------- */
  function dscr() {
    if (!$('d-rent') || $('d-rent').value === '') return;
    var rent = num('d-rent'), pay = num('d-pay'), v = pay ? rent / pay : 0;
    set('d-out', pay ? v.toFixed(2) : '\u2014');
    var fill = $('d-fill'); if (fill) fill.style.width = Math.min(100, (v / 2) * 100) + '%';
    var msg = v >= 1.25 ? 'Strong: rent comfortably covers the payment.' : v >= 1 ? 'Rent covers the payment.' : 'Rent falls short of the payment. Some programs still allow this, often with a larger down payment.';
    set('d-msg', pay ? msg : '');
    if (fill) fill.style.background = v >= 1 ? GREEN : BRASS;
  }
  function bankStmt() {
    if (!$('b-dep') || $('b-dep').value === '') return;
    var dep = num('b-dep'), f = num('b-factor');
    set('b-out', money(dep * (1 - f / 100)));
    var bar = $('b-bar'); if (bar) bar.style.width = Math.max(0, 100 - f) + '%';
  }

  /* ---------- Motion ---------- */
  function reveal() {
    var els = document.querySelectorAll('[data-reveal]:not([data-revealed])');
    if (reduce || !('IntersectionObserver' in window)) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.style.opacity = '1'; en.target.style.transform = 'none';
        io.unobserve(en.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    els.forEach(function (el, i) {
      el.setAttribute('data-revealed', '');
      var d = parseInt(el.getAttribute('data-reveal'), 10) || 0;
      el.style.opacity = '0'; el.style.transform = 'translateY(18px)';
      el.style.transition = 'opacity .7s ease ' + d + 'ms, transform .7s cubic-bezier(.2,.7,.2,1) ' + d + 'ms';
      io.observe(el);
    });
  }
  function progress() {
    var sec = $('process'), fill = $('process-fill'); if (!sec || !fill) return;
    var tick = function () {
      var r = sec.getBoundingClientRect(), vh = window.innerHeight;
      var p = Math.min(1, Math.max(0, (vh * 0.75 - r.top) / (r.height * 0.7)));
      fill.style.transform = 'scaleX(' + (reduce ? 1 : p) + ')';
      document.querySelectorAll('[data-step]').forEach(function (s) {
        var on = reduce || p >= (parseInt(s.getAttribute('data-step'), 10) - 1) / 4 - 0.02;
        s.style.background = on ? GREEN : '#fff'; s.style.color = on ? '#fff' : GREEN;
      });
    };
    window.addEventListener('scroll', function () { requestAnimationFrame(tick); }, { passive: true });
    tick();
  }


  function chat() {
    var root = $('chat-root'); if (!root || root.__b) return; root.__b = true;
    var panel = $('chat-panel'), tog = $('chat-toggle'), teaser = $('chat-teaser');
    var open = function (v) { panel.style.display = v ? 'flex' : 'none'; tog.setAttribute('aria-expanded', v ? 'true' : 'false'); if (v && teaser) teaser.style.display = 'none'; };
    tog.addEventListener('click', function () { open(panel.style.display !== 'flex'); });
    $('chat-close').addEventListener('click', function () { open(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') open(false); });
    var full = $('chat-full'); if (full) full.addEventListener('click', function () { open(false); });
    root.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('[data-chat]'); if (!b) return;
      var t = b.getAttribute('data-chat');
      $('chat-topic').value = t; $('chat-echo').textContent = t;
      $('chat-replies').style.display = 'none'; $('chat-step2').style.display = 'flex';
      setTimeout(function () { var n = $('chat-name'); if (n) n.focus(); }, 50);
    });
    try {
      if (teaser && !sessionStorage.getItem('jcTeaser')) setTimeout(function () { if (panel.style.display !== 'flex') { teaser.style.display = 'flex'; teaser.style.animation = 'jcfade .4s ease both'; } sessionStorage.setItem('jcTeaser', '1'); }, 15000);
    } catch (x) {}
    var tx = $('chat-teaser-x'); if (tx) tx.addEventListener('click', function () { teaser.style.display = 'none'; });
    bind('chat-form', 'chat-thanks', function (f) {
      var ep = f.getAttribute('action');
      if (placeholder(ep, 'BREVO_CALLBACK_ENDPOINT')) return true;
      var fd = new FormData(f);
      var ph = String(fd.get('SMS') || '').replace(/\D/g, '');
      if (ph.length === 11 && ph[0] === '1') ph = ph.slice(1);
      fd.set('SMS', ph);
      return fetch(ep, { method: 'POST', body: fd, mode: 'no-cors' }).then(function () { return true; });
    });
  }
  function sched() {
    var el = $('sched-embed'); if (!el || el.__b) return;
    var url = (el.getAttribute('data-url') || '').replace(/&amp;/g, '&');
    if (!url || url.indexOf('SCHEDULING_URL') !== -1) return;
    el.__b = true;
    el.innerHTML = '<iframe src="' + url + '" title="Book a call with Jayson Cain" style="width:100%;height:720px;border:0;display:block" loading="lazy"></iframe>';
  }
  function secondLook() {
    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('[data-second-look]'); if (!a) return;
      var sel = $('q-purpose'); if (sel) sel.value = 'Second look at a quote';
    });
  }
  function init() {
    if (!document.__jcInit) {
      document.__jcInit = true;
      document.addEventListener('click', function (e) {
        var q = e.target.closest && e.target.closest('[data-q]');
        if (q) { match[q.getAttribute('data-q')] = q.getAttribute('data-v'); renderMatch(); return; }
        var a = e.target.closest && e.target.closest('[data-purpose]');
        if (a) setPurpose(a.getAttribute('data-purpose'));
      });
      document.addEventListener('input', function (e) {
        if (!e.target.closest) return;
        if (e.target.closest('#calc-form')) calc();
        if (e.target.closest('#dscr-tool')) dscr();
        if (e.target.closest('#bank-tool')) bankStmt();
      });
      progress();
    }
    try { var p = new URLSearchParams(location.search).get('purpose'); if (p) setPurpose(PURPOSES[p.toLowerCase()] || p); } catch (x) {}
    renderMatch(); calc(); dscr(); bankStmt(); reveal(); chat(); sched(); if (!window.__jcSL) { window.__jcSL = 1; secondLook(); }
    bind('hero-form', 'hero-thanks', function (f) {
      var ep = f.getAttribute('action');
      if (placeholder(ep, 'FORMSPREE_ENDPOINT')) return true;
      return fetch(ep, { method: 'POST', body: new FormData(f), headers: { Accept: 'application/json' } }).then(function (r) { return r.ok; });
    });
    bind('quote-form', 'quote-thanks', function (f) {
      var ep = f.getAttribute('action');
      if (placeholder(ep, 'FORMSPREE_ENDPOINT')) return true;
      return fetch(ep, { method: 'POST', body: new FormData(f), headers: { Accept: 'application/json' } }).then(function (r) { return r.ok; });
    });
    bind('news-form', 'news-thanks', function (f) {
      var ep = f.getAttribute('action');
      if (placeholder(ep, 'BREVO_FORM_ENDPOINT')) return true;
      return fetch(ep, { method: 'POST', body: new FormData(f), mode: 'no-cors' }).then(function () { return true; });
    });
  }
  window.jcInit = init;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
