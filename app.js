/* CarManager - gestione privata delle autovetture
   Tutti i dati restano nella memoria di questo dispositivo (localStorage). */
'use strict';
(function () {

  /* ============ costanti ============ */
  var KEY = 'carmanager.v1';
  var DEFAULT_CATS = ['Carburante', 'Assicurazione', 'Bollo', 'Tagliando', 'Manutenzione', 'Riparazioni',
    'Pneumatici', 'Revisione', 'Parcheggio', 'Pedaggi', 'Lavaggio', 'Multe', 'Accessori', 'Altro'];
  var DEADLINE_TYPES = ['Bollo', 'Assicurazione', 'Revisione', 'Tagliando', 'Cambio gomme', 'Altro'];
  var DEADLINE_TO_CAT = { 'Bollo': 'Bollo', 'Assicurazione': 'Assicurazione', 'Revisione': 'Revisione',
    'Tagliando': 'Tagliando', 'Cambio gomme': 'Pneumatici', 'Altro': 'Altro' };
  var FUELS = ['Benzina', 'Diesel', 'GPL', 'Metano', 'Ibrida', 'Elettrica'];
  var RECUR = [
    { v: '0', l: 'Non si ripete' }, { v: '12', l: 'Ogni anno' }, { v: '6', l: 'Ogni 6 mesi' },
    { v: '3', l: 'Ogni 3 mesi' }, { v: '24', l: 'Ogni 2 anni' }
  ];
  var VCOLORS = ['#4f46e5', '#0891b2', '#d97706', '#db2777', '#059669', '#7c3aed', '#ea580c'];
  var MONTHS = ['G', 'F', 'M', 'A', 'M', 'G', 'L', 'A', 'S', 'O', 'N', 'D'];
  var YEAR = new Date().getFullYear();

  /* ============ icone ============ */
  var IC = {
    car: '<path d="M3 13l2-5.5A2 2 0 0 1 6.9 6h10.2a2 2 0 0 1 1.9 1.5L21 13v5a1 1 0 0 1-1 1h-1.5a1 1 0 0 1-1-1v-1h-11v1a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/><path d="M3 13h18"/><circle cx="7.5" cy="15.4" r=".7"/><circle cx="16.5" cy="15.4" r=".7"/>',
    cal: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    chart: '<path d="M6 20v-6M12 20V6M18 20V10"/>',
    sliders: '<path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    back: '<path d="M15 5l-7 7 7 7"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/>'
  };
  function ico(n) { return '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true">' + IC[n] + '</svg>'; }

  /* ============ utilita ============ */
  function $(s, r) { return (r || document).querySelector(s); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function sum(arr, fn) { var t = 0; for (var i = 0; i < arr.length; i++) t += fn(arr[i]) || 0; return t; }
  var fmtEur = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', useGrouping: 'always' });
  function eur(n) { return fmtEur.format(n || 0); }
  function num(n, dec) {
    dec = dec || 0;
    return new Intl.NumberFormat('it-IT', { minimumFractionDigits: dec, maximumFractionDigits: dec, useGrouping: 'always' }).format(n || 0);
  }
  function parseNum(s) {
    if (s == null) return null;
    s = String(s).trim().replace(/\s/g, '');
    if (s === '') return null;
    if (s.indexOf(',') >= 0) s = s.replace(/\./g, '').replace(',', '.');
    var n = parseFloat(s);
    return isNaN(n) ? null : n;
  }
  function fieldNum(v) { return v == null ? '' : String(v).replace('.', ','); }
  function short(v) {
    if (v >= 10000) return Math.round(v / 1000) + 'k';
    if (v >= 1000) return (v / 1000).toFixed(1).replace('.', ',') + 'k';
    return String(Math.round(v));
  }

  var pad = function (n) { return String(n).padStart(2, '0'); };
  function iso(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function today() { return iso(new Date()); }
  function parseD(s) { var p = s.split('-').map(Number); return new Date(p[0], p[1] - 1, p[2]); }
  function addMonths(s, n) {
    var d = parseD(s), day = d.getDate();
    var t = new Date(d.getFullYear(), d.getMonth() + n, 1);
    var last = new Date(t.getFullYear(), t.getMonth() + 1, 0).getDate();
    t.setDate(Math.min(day, last));
    return iso(t);
  }
  function addDays(s, n) { var d = parseD(s); d.setDate(d.getDate() + n); return iso(d); }
  function daysUntil(s) { return Math.round((parseD(s) - parseD(today())) / 86400000); }
  function fmtDate(s) { return parseD(s).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' }); }

  /* ============ dati ============ */
  function emptyDb() { return { v: 1, vehicles: [], expenses: [], yearly: [], deadlines: [], cats: [], lastBackup: null }; }
  function load() {
    try {
      var r = localStorage.getItem(KEY);
      if (r) { return Object.assign(emptyDb(), JSON.parse(r)); }
    } catch (e) { /* dati non leggibili */ }
    return emptyDb();
  }
  var db = load();
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(db)); }
    catch (e) { toast('Impossibile salvare: memoria del dispositivo piena?'); }
  }
  function allCats() {
    var out = DEFAULT_CATS.slice();
    db.cats.forEach(function (c) { if (out.indexOf(c) < 0) out.push(c); });
    return out;
  }
  function catColor(c) { var i = allCats().indexOf(c); return 'var(--c' + ((i < 0 ? 7 : i % 8) + 1) + ')'; }
  function vById(id) { return db.vehicles.filter(function (v) { return v.id === id; })[0]; }
  function vColor(v) {
    var h = 0, s = v.id; for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return VCOLORS[h % VCOLORS.length];
  }
  function vName(id) { var v = vById(id); return v ? v.nome : '?'; }

  function expensesOf(vid, year) {
    return db.expenses.filter(function (e) {
      return (!vid || vid === 'all' || e.vehicleId === vid) && (!year || year === 'all' || e.data.slice(0, 4) === String(year));
    });
  }
  function yearsFor(vid) {
    var set = {}; set[YEAR] = 1;
    expensesOf(vid).forEach(function (e) { set[e.data.slice(0, 4)] = 1; });
    db.yearly.forEach(function (r) { if (!vid || vid === 'all' || r.vehicleId === vid) set[r.anno] = 1; });
    return Object.keys(set).map(Number).sort(function (a, b) { return b - a; });
  }
  function byCat(list) {
    var m = {};
    list.forEach(function (e) { m[e.categoria] = (m[e.categoria] || 0) + e.importo; });
    return Object.keys(m).map(function (k) { return { label: k, value: m[k] }; })
      .sort(function (a, b) { return b.value - a.value; });
  }
  function yearStats(vid, year) {
    var ex = expensesOf(vid, year);
    var tot = sum(ex, function (e) { return e.importo; });
    var litri = sum(ex, function (e) { return e.litri; });
    var y = db.yearly.filter(function (r) { return r.vehicleId === vid && String(r.anno) === String(year); })[0];
    var km = null;
    if (y && y.kmInizio != null && y.kmFine != null && y.kmFine > y.kmInizio) km = y.kmFine - y.kmInizio;
    else {
      var ks = ex.filter(function (e) { return e.km != null; }).map(function (e) { return e.km; });
      if (ks.length > 1) { var d = Math.max.apply(null, ks) - Math.min.apply(null, ks); if (d > 0) km = d; }
    }
    var cons = y && y.consumo ? y.consumo : null, est = false;
    if (cons == null && km && litri > 0) { cons = km / litri; est = true; }
    return { tot: tot, km: km, cons: cons, est: est, costKm: km ? tot / km : null, litri: litri, n: ex.length, rec: y };
  }
  function acquistoInfo(a) {
    var rata = a.importoRata || 0, nr = a.nRate || 0, pag = a.ratePagate || 0;
    var anticipo = a.anticipo || 0, saldo = a.saldo || 0;
    var totale = anticipo + rata * nr + saldo;
    var pagato = anticipo + rata * Math.min(pag, nr) + (a.saldoPagato === 'si' ? saldo : 0);
    return { totale: totale, pagato: pagato, residuo: Math.max(totale - pagato, 0), perc: totale > 0 ? Math.min(100, pagato / totale * 100) : 0,
      interessi: a.prezzo ? totale - a.prezzo : null };
  }
  function sortedDeadlines(vid) {
    return db.deadlines.filter(function (d) { return !vid || d.vehicleId === vid; })
      .sort(function (a, b) { return a.data < b.data ? -1 : a.data > b.data ? 1 : 0; });
  }
  function dueText(d) {
    var n = daysUntil(d.data);
    if (n < 0) return 'scaduta da ' + (-n) + (n === -1 ? ' giorno' : ' giorni');
    if (n === 0) return 'scade oggi';
    if (n === 1) return 'scade domani';
    return 'tra ' + n + ' giorni';
  }
  function dueClass(d) { var n = daysUntil(d.data); return n < 0 ? 'bad' : n <= 30 ? 'warn' : 'ok'; }

  /* ============ stato schermata ============ */
  var S = { tab: 'veicoli', vid: null, vtab: 'riepilogo', year: String(YEAR), stV: 'all', stY: String(YEAR) };

  function toast(msg) {
    var t = $('#toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(toast._t); toast._t = setTimeout(function () { t.classList.remove('show'); }, 2600);
  }

  /* ============ viste ============ */
  function render() {
    var h;
    if (S.vid && !vById(S.vid)) S.vid = null;
    if (S.vid) h = viewVehicle();
    else if (S.tab === 'scadenze') h = viewDeadlines();
    else if (S.tab === 'grafici') h = viewCharts();
    else if (S.tab === 'impostazioni') h = viewSettings();
    else h = viewHome();
    $('#main').innerHTML = h;
    renderTabbar();
  }
  function renderTabbar() {
    var items = [['veicoli', 'Veicoli', 'car'], ['scadenze', 'Scadenze', 'cal'], ['grafici', 'Grafici', 'chart'], ['impostazioni', 'Impostazioni', 'sliders']];
    $('#tabbar').innerHTML = '<div class="tabs">' + items.map(function (t) {
      var on = !S.vid ? S.tab === t[0] : t[0] === 'veicoli';
      return '<button class="tab' + (on ? ' on' : '') + '" data-act="tab" data-tab="' + t[0] + '">' + ico(t[2]) + '<span>' + t[1] + '</span></button>';
    }).join('') + '</div>';
  }

  function viewHome() {
    var tot = sum(expensesOf('all', YEAR), function (e) { return e.importo; });
    var next = sortedDeadlines()[0];
    var h = '<div class="hero"><div class="brand"><img src="icons/icon-192.png" alt=""><b>CarManager</b></div><div class="grid">' +
      '<div class="stat"><span>Spese ' + YEAR + '</span><strong>' + eur(tot) + '</strong><small>' + db.vehicles.length + (db.vehicles.length === 1 ? ' veicolo' : ' veicoli') + '</small></div>' +
      '<div class="stat"><span>Prossima scadenza</span><strong class="ell">' + (next ? esc(next.tipo) : '—') + '</strong><small>' + (next ? esc(vName(next.vehicleId)) + ' · ' + dueText(next) : 'Nessuna') + '</small></div></div></div>';
    if (db.vehicles.length && (!db.lastBackup || daysUntil(db.lastBackup.slice(0, 10)) < -30)) {
      h += '<div class="banner"><div class="grow">Fai un backup dei tuoi dati: li proteggi se cambi o perdi il telefono.</div><button class="btn sm" data-act="export">Backup</button></div>';
    }
    if (!db.vehicles.length) {
      return h + '<div class="empty"><img src="icons/icon-192.png" alt=""><h2>Aggiungi la tua prima auto</h2><p>Registra spese, chilometri, acquisto e scadenze. I dati restano solo sul tuo telefono.</p><button class="btn" data-act="addV">' + ico('plus') + ' Aggiungi veicolo</button></div>';
    }
    h += '<div class="btns" style="margin-bottom:6px"><button class="btn" data-act="addV">' + ico('plus') + ' Veicolo</button><button class="btn sec" data-act="addE">' + ico('plus') + ' Spesa</button></div>';
    h += '<div class="sectitle">I tuoi veicoli</div>';
    db.vehicles.forEach(function (v) {
      var t = yearStats(v.id, YEAR).tot;
      h += '<button class="item" data-act="openV" data-id="' + v.id + '"><div class="avatar" style="background:' + vColor(v) + '">' + ico('car') + '</div>' +
        '<div class="grow"><div class="title ell">' + esc(v.nome) + '</div><div class="meta ell">' + esc(v.targa || '') + (v.targa && v.kmAttuali ? ' · ' : '') + (v.kmAttuali ? num(v.kmAttuali) + ' km' : '') + '</div></div>' +
        '<div class="right"><div class="amt">' + eur(t) + '</div><div class="meta">' + YEAR + '</div></div></button>';
    });
    return h;
  }

  function yearSelect(sel, years, name, withAll) {
    var o = (withAll ? '<option value="all"' + (sel === 'all' ? ' selected' : '') + '>Tutti gli anni</option>' : '') +
      years.map(function (y) { return '<option value="' + y + '"' + (String(y) === String(sel) ? ' selected' : '') + '>' + y + '</option>'; }).join('');
    return '<select data-chg="' + name + '" aria-label="Anno">' + o + '</select>';
  }

  function viewVehicle() {
    var v = vById(S.vid);
    var h = '<div class="topbar"><button class="iconbtn" data-act="back" aria-label="Indietro">' + ico('back') + '</button>' +
      '<h1 class="ell">' + esc(v.nome) + '<div class="sub">' + esc([v.targa, v.carburante, v.anno].filter(Boolean).join(' · ')) + '</div></h1>' +
      '<button class="iconbtn" data-act="editV" aria-label="Modifica veicolo">' + ico('edit') + '</button></div>';
    var tabs = [['riepilogo', 'Riepilogo'], ['spese', 'Spese'], ['km', 'Km'], ['acquisto', 'Acquisto'], ['scadenze', 'Scadenze']];
    h += '<div class="seg">' + tabs.map(function (t) {
      return '<button class="' + (S.vtab === t[0] ? 'on' : '') + '" data-act="vtab" data-t="' + t[0] + '">' + t[1] + '</button>';
    }).join('') + '</div>';
    if (S.vtab === 'spese') h += vExpenses(v);
    else if (S.vtab === 'km') h += vKm(v);
    else if (S.vtab === 'acquisto') h += vPurchase(v);
    else if (S.vtab === 'scadenze') h += vDeadlines(v);
    else h += vSummary(v);
    return h;
  }

  function vSummary(v) {
    var years = yearsFor(v.id);
    if (years.indexOf(Number(S.year)) < 0) S.year = String(years[0]);
    var st = yearStats(v.id, S.year);
    var h = '<div class="filters" style="grid-template-columns:1fr">' + yearSelect(S.year, years, 'year') + '</div>';
    h += '<div class="metrics">' +
      '<div class="metric"><span>Spese ' + S.year + '</span><strong>' + eur(st.tot) + '</strong><small>' + st.n + (st.n === 1 ? ' voce' : ' voci') + '</small></div>' +
      '<div class="metric"><span>Km percorsi</span><strong>' + (st.km ? num(st.km) : '—') + '</strong><small>' + (st.km ? 'nell\'anno' : 'vedi scheda Km') + '</small></div>' +
      '<div class="metric"><span>Consumo medio</span><strong>' + (st.cons ? num(st.cons, 1) + ' km/l' : '—') + '</strong><small>' + (st.cons ? (st.est ? 'stimato dai rifornimenti' : 'inserito da te') : 'dato mancante') + '</small></div>' +
      '<div class="metric"><span>Costo al km</span><strong>' + (st.costKm ? eur(st.costKm) : '—') + '</strong><small>' + (st.costKm ? 'spese / km' : 'servono i km') + '</small></div></div>';
    var cats = byCat(expensesOf(v.id, S.year));
    h += '<div class="card"><h2>Spese per categoria</h2>' + (cats.length ? hbars(cats, st.tot, true) : '<p class="muted small">Nessuna spesa registrata in questo anno.</p>') + '</div>';
    var all = sum(expensesOf(v.id), function (e) { return e.importo; });
    h += '<div class="card"><h2>Costo totale di possesso</h2><div class="kv"><span>Spese di gestione (tutti gli anni)</span><strong>' + eur(all) + '</strong></div>';
    if (v.acquisto) {
      var ai = acquistoInfo(v.acquisto);
      h += '<div class="kv"><span>Acquisto già pagato</span><strong>' + eur(ai.pagato) + '</strong></div><div class="kv"><span>Totale finora</span><strong>' + eur(all + ai.pagato) + '</strong></div>';
    } else {
      h += '<p class="muted small" style="margin-top:6px">Registra l\'acquisto nella scheda Acquisto per vedere il costo completo.</p>';
    }
    h += '</div><button class="btn" data-act="addE">' + ico('plus') + ' Aggiungi spesa</button>';
    return h;
  }

  function vExpenses(v) {
    var years = yearsFor(v.id);
    if (years.indexOf(Number(S.year)) < 0) S.year = String(years[0]);
    var list = expensesOf(v.id, S.year).sort(function (a, b) { return a.data < b.data ? 1 : a.data > b.data ? -1 : 0; });
    var h = '<div class="row" style="margin-bottom:14px"><div class="grow">' + yearSelect(S.year, years, 'year') + '</div><button class="btn sm" data-act="addE">' + ico('plus') + ' Spesa</button></div>';
    if (!list.length) return h + '<div class="empty"><p>Nessuna spesa in questo anno.</p></div>';
    h += '<div class="muted small" style="margin:0 4px 8px">Totale ' + S.year + ': <b>' + eur(sum(list, function (e) { return e.importo; })) + '</b></div>';
    list.forEach(function (e) {
      var meta = [fmtDate(e.data), e.km != null ? num(e.km) + ' km' : '', e.litri ? num(e.litri, 2) + ' l' : '', e.note].filter(Boolean).join(' · ');
      h += '<button class="item" data-act="editE" data-id="' + e.id + '"><span class="dot" style="background:' + catColor(e.categoria) + '"></span>' +
        '<div class="grow"><div class="title ell">' + esc(e.categoria) + '</div><div class="meta ell">' + esc(meta) + '</div></div><div class="amt">' + eur(e.importo) + '</div></button>';
    });
    return h;
  }

  function vKm(v) {
    var recs = db.yearly.filter(function (r) { return r.vehicleId === v.id; }).sort(function (a, b) { return b.anno - a.anno; });
    var h = '<button class="btn" data-act="addY" style="margin-bottom:14px">' + ico('plus') + ' Registra chilometri annuali</button>';
    if (!recs.length) {
      return h + '<div class="empty"><p>Inserisci i km a inizio e fine anno e, se vuoi, il consumo medio (km/l). Se non lo conosci, lo stimo dai litri dei rifornimenti.</p></div>';
    }
    recs.forEach(function (r) {
      var st = yearStats(v.id, r.anno);
      h += '<button class="item" data-act="editY" data-id="' + r.id + '" style="display:block"><div class="row"><div class="title grow">' + r.anno + '</div><div class="meta">' + (r.kmInizio != null && r.kmFine != null ? num(r.kmInizio) + ' → ' + num(r.kmFine) + ' km' : '') + '</div></div>' +
        '<div class="kv"><span>Km percorsi</span><strong>' + (st.km ? num(st.km) + ' km' : '—') + '</strong></div>' +
        '<div class="kv"><span>Consumo medio</span><strong>' + (st.cons ? num(st.cons, 1) + ' km/l' + (st.est ? ' (stimato)' : '') : '—') + '</strong></div>' +
        '<div class="kv"><span>Spese dell\'anno</span><strong>' + eur(st.tot) + '</strong></div>' +
        '<div class="kv"><span>Costo al km</span><strong>' + (st.costKm ? eur(st.costKm) : '—') + '</strong></div></button>';
    });
    return h;
  }

  function vPurchase(v) {
    var a = v.acquisto;
    if (!a) return '<div class="empty"><p>Registra prezzo, anticipo, rate e saldo finale dell\'acquisto.</p><button class="btn" data-act="editP">' + ico('plus') + ' Registra acquisto</button></div>';
    var i = acquistoInfo(a);
    var h = '<div class="card"><h2>Acquisto' + (a.data ? ' · ' + fmtDate(a.data) : '') + '</h2>' +
      '<div class="kv"><span>Prezzo del veicolo</span><strong>' + (a.prezzo != null ? eur(a.prezzo) : '—') + '</strong></div>' +
      '<div class="kv"><span>Anticipo</span><strong>' + eur(a.anticipo) + '</strong></div>' +
      '<div class="kv"><span>Rate</span><strong>' + (a.nRate ? a.nRate + ' × ' + eur(a.importoRata) : '—') + '</strong></div>' +
      '<div class="kv"><span>Saldo finale</span><strong>' + eur(a.saldo) + (a.saldo ? (a.saldoPagato === 'si' ? ' · pagato' : ' · da pagare') : '') + '</strong></div>' +
      '<div class="kv"><span>Totale da pagare</span><strong>' + eur(i.totale) + '</strong></div>' +
      (i.interessi != null && i.interessi > 0.5 ? '<div class="kv"><span>Costo del finanziamento</span><strong>' + eur(i.interessi) + '</strong></div>' : '') + '</div>';
    h += '<div class="card"><h2>Avanzamento pagamenti</h2><div class="row"><div class="grow"><strong style="font-size:22px">' + eur(i.pagato) + '</strong><div class="muted small">pagato su ' + eur(i.totale) + '</div></div><span class="pill ' + (i.residuo === 0 ? 'ok' : 'warn') + '">' + (i.residuo === 0 ? 'Completato' : 'Restano ' + eur(i.residuo)) + '</span></div>' +
      '<div class="progress"><i style="width:' + i.perc.toFixed(1) + '%"></i></div>' +
      '<div class="muted small">' + (a.nRate ? 'Rate pagate: ' + Math.min(a.ratePagate || 0, a.nRate) + ' di ' + a.nRate : 'Nessuna rata prevista') + '</div></div>';
    if (a.nRate) {
      h += '<div class="btns" style="margin-bottom:10px"><button class="btn" data-act="payRata">Segna rata pagata</button><button class="btn sec" data-act="unpayRata">Annulla ultima</button></div>';
    }
    h += '<button class="btn sec" data-act="editP">Modifica acquisto</button>';
    return h;
  }

  function dlItem(d, showVeh) {
    return '<button class="item" data-act="editD" data-id="' + d.id + '"><div class="grow"><div class="title ell">' + esc(d.tipo) + (d.note ? ' · ' + esc(d.note) : '') + '</div>' +
      '<div class="meta ell">' + (showVeh ? esc(vName(d.vehicleId)) + ' · ' : '') + fmtDate(d.data) + (Number(d.ricorrenza) ? ' · si ripete' : '') + '</div></div>' +
      '<span class="pill ' + dueClass(d) + '">' + dueText(d) + '</span></button>';
  }
  function vDeadlines(v) {
    var list = sortedDeadlines(v.id);
    var h = '<button class="btn" data-act="addD" style="margin-bottom:14px">' + ico('plus') + ' Aggiungi scadenza</button>';
    if (!list.length) return h + '<div class="empty"><p>Nessuna scadenza. Aggiungi bollo, assicurazione, revisione o tagliando.</p></div>';
    return h + list.map(function (d) { return dlItem(d, false); }).join('');
  }
  function viewDeadlines() {
    var list = sortedDeadlines();
    var h = '<div class="topbar"><h1>Scadenze</h1><button class="btn sm" data-act="addD">' + ico('plus') + ' Nuova</button></div>';
    if (!list.length) return h + '<div class="empty"><p>Nessuna scadenza registrata. Aggiungi bollo, assicurazione, revisione o tagliando per non dimenticarli.</p></div>';
    return h + list.map(function (d) { return dlItem(d, true); }).join('');
  }

  /* ---------- grafici ---------- */
  function barChart(vals, labels) {
    var W = 340, H = 172, pl = 6, pr = 6, pt = 18, pb = 22, n = vals.length;
    var max = Math.max.apply(null, vals.concat([0])), bw = (W - pl - pr) / n, g = '';
    g += '<line class="grid" x1="' + pl + '" x2="' + (W - pr) + '" y1="' + (H - pb) + '" y2="' + (H - pb) + '"/>';
    vals.forEach(function (v, i) {
      var h = max > 0 ? (v / max) * (H - pt - pb) : 0, x = pl + i * bw + bw * 0.18, w = bw * 0.64, y = H - pb - h;
      g += '<rect class="bar" x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + w.toFixed(1) + '" height="' + (v > 0 ? Math.max(h, 2) : 0).toFixed(1) + '" rx="4"/>';
      if (v > 0) g += '<text class="val" x="' + (x + w / 2).toFixed(1) + '" y="' + (y - 4).toFixed(1) + '" text-anchor="middle">' + short(v) + '</text>';
      g += '<text class="lbl" x="' + (x + w / 2).toFixed(1) + '" y="' + (H - 6) + '" text-anchor="middle">' + labels[i] + '</text>';
    });
    return '<svg class="chart" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Grafico a barre">' + g + '</svg>';
  }
  function hbars(items, total, byCategory) {
    return items.map(function (it, i) {
      var pct = total > 0 ? it.value / total * 100 : 0;
      var col = byCategory ? catColor(it.label) : 'var(--c' + (i % 8 + 1) + ')';
      return '<div class="hb"><div class="top"><span class="ell">' + esc(it.label) + '</span><span><b>' + eur(it.value) + '</b> <span class="muted">' + Math.round(pct) + '%</span></span></div>' +
        '<div class="track"><i style="width:' + pct.toFixed(1) + '%;background:' + col + '"></i></div></div>';
    }).join('');
  }
  function viewCharts() {
    var vopts = '<option value="all"' + (S.stV === 'all' ? ' selected' : '') + '>Tutti i veicoli</option>' + db.vehicles.map(function (v) {
      return '<option value="' + v.id + '"' + (S.stV === v.id ? ' selected' : '') + '>' + esc(v.nome) + '</option>';
    }).join('');
    if (S.stV !== 'all' && !vById(S.stV)) S.stV = 'all';
    var years = yearsFor(S.stV);
    if (S.stY !== 'all' && years.indexOf(Number(S.stY)) < 0) S.stY = String(years[0]);
    var h = '<div class="topbar"><h1>Grafici</h1></div>';
    if (!db.vehicles.length) return h + '<div class="empty"><p>Aggiungi un veicolo e qualche spesa per vedere i grafici.</p></div>';
    h += '<div class="filters"><select data-chg="stV" aria-label="Veicolo">' + vopts + '</select>' + yearSelect(S.stY, years, 'stY', true) + '</div>';
    var list = expensesOf(S.stV, S.stY), tot = sum(list, function (e) { return e.importo; });
    h += '<div class="metrics"><div class="metric"><span>Totale spese</span><strong>' + eur(tot) + '</strong><small>' + list.length + ' voci</small></div>' +
      '<div class="metric"><span>Media mensile</span><strong>' + (S.stY === 'all' ? '—' : eur(tot / 12)) + '</strong><small>' + (S.stY === 'all' ? 'scegli un anno' : 'su 12 mesi') + '</small></div></div>';
    if (S.stY !== 'all') {
      var months = []; for (var m = 0; m < 12; m++) months.push(0);
      list.forEach(function (e) { months[Number(e.data.slice(5, 7)) - 1] += e.importo; });
      h += '<div class="card"><h2>Spese per mese · ' + S.stY + '</h2>' + barChart(months, MONTHS) + '</div>';
    }
    var yrs = yearsFor(S.stV).slice().reverse();
    if (yrs.length > 1) {
      h += '<div class="card"><h2>Spese per anno</h2>' + barChart(yrs.map(function (y) { return sum(expensesOf(S.stV, y), function (e) { return e.importo; }); }), yrs.map(String)) + '</div>';
    }
    var cats = byCat(list);
    h += '<div class="card"><h2>Per categoria</h2>' + (cats.length ? hbars(cats, tot, true) : '<p class="muted small">Nessuna spesa nel periodo.</p>') + '</div>';
    if (S.stV === 'all' && db.vehicles.length > 1) {
      var vs = db.vehicles.map(function (v) { return { label: v.nome, value: sum(expensesOf(v.id, S.stY), function (e) { return e.importo; }) }; })
        .sort(function (a, b) { return b.value - a.value; });
      h += '<div class="card"><h2>Confronto veicoli</h2>' + hbars(vs, tot, false) + '</div>';
    }
    if (S.stV !== 'all' && S.stY !== 'all') {
      var st = yearStats(S.stV, S.stY);
      h += '<div class="card"><h2>Efficienza ' + S.stY + '</h2><div class="kv"><span>Km percorsi</span><strong>' + (st.km ? num(st.km) : '—') + '</strong></div>' +
        '<div class="kv"><span>Consumo medio</span><strong>' + (st.cons ? num(st.cons, 1) + ' km/l' : '—') + '</strong></div>' +
        '<div class="kv"><span>Costo al km</span><strong>' + (st.costKm ? eur(st.costKm) : '—') + '</strong></div></div>';
    }
    return h;
  }

  function viewSettings() {
    var custom = db.cats;
    var h = '<div class="topbar"><h1>Impostazioni</h1></div>';
    h += '<div class="card"><h2>Voci di costo</h2><div class="chips">' + DEFAULT_CATS.map(function (c) { return '<span class="chip" style="background:var(--bg);color:var(--text)">' + esc(c) + '</span>'; }).join('') +
      custom.map(function (c) { return '<span class="chip">' + esc(c) + ' <button data-act="delCat" data-name="' + esc(c) + '" aria-label="Elimina ' + esc(c) + '">×</button></span>'; }).join('') + '</div>' +
      '<div class="addrow"><input id="newCat" type="text" placeholder="Nuova voce, es. Autolavaggio" maxlength="30" aria-label="Nome nuova voce"><button class="btn" data-act="addCat">Aggiungi</button></div></div>';
    h += '<div class="card"><h2>Backup e esportazione</h2><p class="muted small" style="margin-bottom:12px">Ultimo backup: <b>' + (db.lastBackup ? fmtDate(db.lastBackup.slice(0, 10)) : 'mai') + '</b></p>' +
      '<button class="btn" data-act="export">Esporta backup completo</button><button class="btn sec" data-act="import">Importa backup</button><button class="btn sec" data-act="csv">Esporta spese in CSV (Excel)</button></div>';
    h += '<div class="card"><h2>Privacy</h2><p class="muted small">I dati sono salvati solo su questo dispositivo, nel browser dell\'app. Non c\'è nessun server, account o abbonamento. Se cancelli i dati del sito da Safari o disinstalli l\'app, i dati si perdono: per questo ti consiglio un backup ogni tanto.</p></div>';
    h += '<button class="btn danger" data-act="wipe">Cancella tutti i dati</button><p class="muted small right" style="margin-top:14px">CarManager 1.0</p>';
    return h;
  }

  /* ============ moduli (finestre a scomparsa) ============ */
  function optHtml(opts, sel) {
    return opts.map(function (o) {
      var v = typeof o === 'object' ? o.v : o, l = typeof o === 'object' ? o.l : o;
      return '<option value="' + esc(v) + '"' + (String(v) === String(sel) ? ' selected' : '') + '>' + esc(l) + '</option>';
    }).join('');
  }
  function fieldHtml(f, vals) {
    var val = vals[f.k], id = 'f_' + f.k, ctl;
    if (f.t === 'select') ctl = '<select id="' + id + '">' + optHtml(f.opts, val) + '</select>';
    else if (f.t === 'area') ctl = '<textarea id="' + id + '" rows="3">' + esc(val || '') + '</textarea>';
    else if (f.t === 'date') ctl = '<input id="' + id + '" type="date" value="' + esc(val || '') + '">';
    else if (f.t === 'num') ctl = '<input id="' + id + '" type="text" inputmode="decimal" autocomplete="off" value="' + esc(fieldNum(val)) + '" placeholder="' + esc(f.ph || '') + '">';
    else if (f.t === 'int') ctl = '<input id="' + id + '" type="text" inputmode="numeric" autocomplete="off" value="' + esc(val == null ? '' : val) + '" placeholder="' + esc(f.ph || '') + '">';
    else ctl = '<input id="' + id + '" type="text" autocomplete="off" value="' + esc(val || '') + '" placeholder="' + esc(f.ph || '') + '">';
    return '<label class="f' + (f.half ? ' h' : '') + '"><span>' + esc(f.l) + (f.req ? ' *' : '') + '</span>' + ctl + (f.hint ? '<small class="hint">' + esc(f.hint) + '</small>' : '') + '</label>';
  }
  function closeSheet() { $('#sheet-root').innerHTML = ''; }
  function openSheet(o) {
    var vals = o.values || {};
    var html = '<div class="overlay" id="ov"><form class="sheet" id="shform" novalidate><div class="grab"></div><h2>' + esc(o.title) + '</h2>' +
      '<div class="fgrid">' + o.fields.map(function (f) { return fieldHtml(f, vals); }).join('') + '</div>' +
      '<button class="btn" type="submit">' + esc(o.saveLabel || 'Salva') + '</button>' +
      (o.extra || []).map(function (x, i) { return '<button class="btn ' + (x.cls || 'sec') + '" type="button" data-x="' + i + '">' + esc(x.label) + '</button>'; }).join('') +
      '<button class="btn sec" type="button" data-x="cancel">Annulla</button></form></div>';
    $('#sheet-root').innerHTML = html;
    var form = $('#shform');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var out = {};
      for (var i = 0; i < o.fields.length; i++) {
        var f = o.fields[i], raw = $('#f_' + f.k).value, v;
        if (f.t === 'num') v = parseNum(raw);
        else if (f.t === 'int') { v = parseNum(raw); if (v != null) v = Math.round(v); }
        else v = String(raw).trim();
        if (f.req && (v === '' || v == null)) { toast('Compila il campo: ' + f.l); return; }
        if ((f.t === 'num' || f.t === 'int') && raw.trim() !== '' && v == null) { toast('Numero non valido: ' + f.l); return; }
        if ((f.t === 'num' || f.t === 'int') && v != null && v < 0) { toast('Il valore non può essere negativo: ' + f.l); return; }
        out[f.k] = v;
      }
      if (o.onSave(out) === false) return;
      closeSheet(); save(); render();
    });
    form.addEventListener('click', function (e) {
      var b = e.target.closest('[data-x]'); if (!b) return;
      if (b.dataset.x === 'cancel') { closeSheet(); return; }
      var x = o.extra[Number(b.dataset.x)];
      if (x && x.fn() !== false) { closeSheet(); save(); render(); }
    });
    $('#ov').addEventListener('click', function (e) { if (e.target.id === 'ov') closeSheet(); });
  }

  function vehicleOptions() { return db.vehicles.map(function (v) { return { v: v.id, l: v.nome }; }); }
  function needVehicle() {
    if (db.vehicles.length) return false;
    toast('Aggiungi prima un veicolo'); editVehicle(null); return true;
  }

  function editVehicle(id) {
    var v = id ? vById(id) : null;
    openSheet({
      title: v ? 'Modifica veicolo' : 'Nuovo veicolo',
      values: v || {},
      fields: [
        { k: 'nome', l: 'Nome del veicolo', req: true, ph: 'es. Fiat Panda' },
        { k: 'targa', l: 'Targa', half: true, ph: 'AB123CD' },
        { k: 'anno', l: 'Anno', t: 'int', half: true, ph: '2020' },
        { k: 'carburante', l: 'Carburante', t: 'select', opts: [{ v: '', l: '—' }].concat(FUELS), half: true },
        { k: 'kmAttuali', l: 'Km attuali', t: 'int', half: true },
        { k: 'note', l: 'Note', t: 'area' }
      ],
      extra: v ? [{ label: 'Elimina veicolo', cls: 'danger', fn: function () {
        if (!confirm('Eliminare "' + v.nome + '" con tutte le sue spese, km e scadenze?')) return false;
        db.vehicles = db.vehicles.filter(function (x) { return x.id !== v.id; });
        db.expenses = db.expenses.filter(function (x) { return x.vehicleId !== v.id; });
        db.yearly = db.yearly.filter(function (x) { return x.vehicleId !== v.id; });
        db.deadlines = db.deadlines.filter(function (x) { return x.vehicleId !== v.id; });
        S.vid = null;
      } }] : [],
      onSave: function (o) {
        if (v) Object.assign(v, o);
        else { o.id = uid(); o.acquisto = null; db.vehicles.push(o); }
      }
    });
  }

  function editExpense(id, pre) {
    if (!id && needVehicle()) return;
    var e = id ? db.expenses.filter(function (x) { return x.id === id; })[0] : null;
    var vals = e ? e : Object.assign({ data: today(), categoria: 'Carburante', vehicleId: S.vid || (db.vehicles[0] && db.vehicles[0].id) }, pre || {});
    var fields = [];
    if (!S.vid) fields.push({ k: 'vehicleId', l: 'Veicolo', t: 'select', opts: vehicleOptions() });
    fields.push(
      { k: 'data', l: 'Data', t: 'date', req: true, half: true },
      { k: 'importo', l: 'Importo (€)', t: 'num', req: true, half: true, ph: '0,00' },
      { k: 'categoria', l: 'Voce di costo', t: 'select', opts: allCats() },
      { k: 'km', l: 'Km contachilometri', t: 'int', half: true },
      { k: 'litri', l: 'Litri (carburante)', t: 'num', half: true },
      { k: 'note', l: 'Note', ph: 'facoltativo' }
    );
    openSheet({
      title: e ? 'Modifica spesa' : (pre && pre.fromDeadline ? 'Registra la spesa (facoltativo)' : 'Nuova spesa'),
      values: vals, fields: fields,
      extra: e ? [{ label: 'Elimina spesa', cls: 'danger', fn: function () {
        if (!confirm('Eliminare questa spesa?')) return false;
        db.expenses = db.expenses.filter(function (x) { return x.id !== e.id; });
      } }] : [],
      onSave: function (o) {
        if (!o.data) return false;
        o.vehicleId = o.vehicleId || S.vid;
        if (e) Object.assign(e, o); else { o.id = uid(); db.expenses.push(o); }
        var v = vById(o.vehicleId);
        if (v && o.km != null && o.km > (v.kmAttuali || 0)) v.kmAttuali = o.km;
      }
    });
  }

  function editYearly(id) {
    var r = id ? db.yearly.filter(function (x) { return x.id === id; })[0] : null;
    openSheet({
      title: r ? 'Modifica chilometri ' + r.anno : 'Chilometri annuali',
      values: r || { anno: YEAR },
      fields: [
        { k: 'anno', l: 'Anno', t: 'int', req: true },
        { k: 'kmInizio', l: 'Km a inizio anno', t: 'int', half: true },
        { k: 'kmFine', l: 'Km a fine anno', t: 'int', half: true },
        { k: 'consumo', l: 'Consumo medio (km/l)', t: 'num', hint: 'Facoltativo. Se lo lasci vuoto lo stimo dai litri dei rifornimenti.' }
      ],
      extra: r ? [{ label: 'Elimina', cls: 'danger', fn: function () {
        if (!confirm('Eliminare i dati km di questo anno?')) return false;
        db.yearly = db.yearly.filter(function (x) { return x.id !== r.id; });
      } }] : [],
      onSave: function (o) {
        if (o.anno < 1980 || o.anno > 2100) { toast('Anno non valido'); return false; }
        if (o.kmInizio != null && o.kmFine != null && o.kmFine < o.kmInizio) { toast('I km di fine anno devono essere maggiori di quelli di inizio'); return false; }
        var dup = db.yearly.filter(function (x) { return x.vehicleId === S.vid && x.anno === o.anno && (!r || x.id !== r.id); })[0];
        if (dup) { toast('Esiste già un record per il ' + o.anno); return false; }
        if (r) Object.assign(r, o); else { o.id = uid(); o.vehicleId = S.vid; db.yearly.push(o); }
        var v = vById(S.vid);
        if (v && o.kmFine != null && o.kmFine > (v.kmAttuali || 0) && o.anno >= YEAR) v.kmAttuali = o.kmFine;
      }
    });
  }

  function editPurchase() {
    var v = vById(S.vid), a = v.acquisto;
    openSheet({
      title: 'Acquisto veicolo',
      values: a ? a : { data: '', saldoPagato: 'no', ratePagate: 0 },
      fields: [
        { k: 'prezzo', l: 'Prezzo del veicolo (€)', t: 'num' },
        { k: 'data', l: 'Data acquisto', t: 'date' },
        { k: 'anticipo', l: 'Anticipo versato (€)', t: 'num', half: true },
        { k: 'saldo', l: 'Saldo finale (€)', t: 'num', half: true },
        { k: 'nRate', l: 'Numero di rate', t: 'int', half: true },
        { k: 'importoRata', l: 'Importo rata (€)', t: 'num', half: true },
        { k: 'ratePagate', l: 'Rate già pagate', t: 'int', half: true },
        { k: 'saldoPagato', l: 'Saldo finale pagato?', t: 'select', opts: [{ v: 'no', l: 'No' }, { v: 'si', l: 'Sì' }], half: true }
      ],
      extra: a ? [{ label: 'Elimina acquisto', cls: 'danger', fn: function () {
        if (!confirm('Eliminare i dati di acquisto?')) return false;
        v.acquisto = null;
      } }] : [],
      onSave: function (o) {
        if (o.nRate != null && o.ratePagate != null && o.ratePagate > o.nRate) { toast('Le rate pagate non possono superare il numero di rate'); return false; }
        v.acquisto = o;
      }
    });
  }

  function editDeadline(id) {
    if (!id && needVehicle()) return;
    var d = id ? db.deadlines.filter(function (x) { return x.id === id; })[0] : null;
    var fields = [];
    if (!S.vid) fields.push({ k: 'vehicleId', l: 'Veicolo', t: 'select', opts: vehicleOptions() });
    fields.push(
      { k: 'tipo', l: 'Tipo di scadenza', t: 'select', opts: DEADLINE_TYPES },
      { k: 'data', l: 'Data di scadenza', t: 'date', req: true },
      { k: 'ricorrenza', l: 'Ripetizione', t: 'select', opts: RECUR },
      { k: 'note', l: 'Note', ph: 'es. polizza n. 123' }
    );
    openSheet({
      title: d ? 'Modifica scadenza' : 'Nuova scadenza',
      values: d ? d : { vehicleId: S.vid || db.vehicles[0].id, tipo: 'Bollo', ricorrenza: '12', data: addMonths(today(), 1) },
      fields: fields,
      extra: d ? [
        { label: 'Fatto: segna come completata', cls: '', fn: function () { markDone(d); return false; } },
        { label: 'Aggiungi al calendario', fn: function () { exportIcs(d); return false; } },
        { label: 'Elimina scadenza', cls: 'danger', fn: function () {
          if (!confirm('Eliminare questa scadenza?')) return false;
          db.deadlines = db.deadlines.filter(function (x) { return x.id !== d.id; });
        } }
      ] : [],
      onSave: function (o) {
        o.vehicleId = o.vehicleId || S.vid;
        if (d) Object.assign(d, o); else { o.id = uid(); db.deadlines.push(o); }
      }
    });
  }

  function markDone(d) {
    var ric = Number(d.ricorrenza), tipo = d.tipo, vid = d.vehicleId;
    if (ric > 0) {
      var nd = addMonths(d.data, ric);
      while (daysUntil(nd) < 0) nd = addMonths(nd, ric);
      d.data = nd;
      toast('Fatto! Prossima scadenza: ' + fmtDate(nd));
    } else {
      db.deadlines = db.deadlines.filter(function (x) { return x.id !== d.id; });
      toast('Scadenza completata');
    }
    save(); closeSheet(); render();
    setTimeout(function () { editExpense(null, { vehicleId: vid, categoria: DEADLINE_TO_CAT[tipo] || 'Altro', fromDeadline: true }); }, 250);
  }

  /* ============ esportazioni ============ */
  function saveFile(name, type, content) {
    var blob = new Blob([content], { type: type });
    try {
      var file = new File([blob], name, { type: type });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        return navigator.share({ files: [file], title: name }).then(function () { return true; }, function (e) {
          if (e && e.name === 'AbortError') return false;
          download(blob, name); return true;
        });
      }
    } catch (e) { /* ripiego sul download */ }
    download(blob, name);
    return Promise.resolve(true);
  }
  function download(blob, name) {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 2500);
  }
  function exportBackup() {
    var data = Object.assign({ app: 'CarManager', exportedAt: new Date().toISOString() }, db);
    saveFile('CarManager-backup-' + today() + '.json', 'application/json', JSON.stringify(data, null, 1)).then(function (ok) {
      if (ok) { db.lastBackup = new Date().toISOString(); save(); render(); toast('Backup creato'); }
    });
  }
  function exportCsv() {
    var q = function (s) { return '"' + String(s == null ? '' : s).replace(/"/g, '""') + '"'; };
    var rows = [['Veicolo', 'Targa', 'Data', 'Voce di costo', 'Importo', 'Km', 'Litri', 'Note'].map(q).join(';')];
    db.expenses.slice().sort(function (a, b) { return a.data < b.data ? -1 : 1; }).forEach(function (e) {
      var v = vById(e.vehicleId) || {};
      rows.push([q(v.nome), q(v.targa), q(e.data), q(e.categoria), q(fieldNum(e.importo)), q(e.km == null ? '' : e.km), q(fieldNum(e.litri)), q(e.note)].join(';'));
    });
    saveFile('CarManager-spese-' + today() + '.csv', 'text/csv', '\ufeff' + rows.join('\r\n')).then(function (ok) { if (ok) toast('File CSV creato'); });
  }
  function exportIcs(d) {
    var ics = function (s) { return String(s || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n'); };
    var rule = { '12': 'FREQ=YEARLY', '6': 'FREQ=MONTHLY;INTERVAL=6', '3': 'FREQ=MONTHLY;INTERVAL=3', '24': 'FREQ=YEARLY;INTERVAL=2' }[String(d.ricorrenza)];
    var L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//CarManager//IT', 'CALSCALE:GREGORIAN', 'BEGIN:VEVENT',
      'UID:' + d.id + '@carmanager', 'DTSTAMP:' + new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, ''),
      'DTSTART;VALUE=DATE:' + d.data.replace(/-/g, ''), 'DTEND;VALUE=DATE:' + addDays(d.data, 1).replace(/-/g, ''),
      'SUMMARY:' + ics(d.tipo + ' ' + vName(d.vehicleId)), 'DESCRIPTION:' + ics(d.note || 'Scadenza auto')];
    if (rule) L.push('RRULE:' + rule);
    L.push('BEGIN:VALARM', 'TRIGGER:-P7D', 'ACTION:DISPLAY', 'DESCRIPTION:Scadenza tra una settimana', 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR');
    saveFile('scadenza-' + d.tipo.toLowerCase().replace(/\s+/g, '-') + '.ics', 'text/calendar', L.join('\r\n')).then(function (ok) { if (ok) toast('Scadenza pronta per il calendario'); });
  }
  function importBackup(file) {
    var r = new FileReader();
    r.onload = function () {
      try {
        var d = JSON.parse(r.result);
        if (!d || !Array.isArray(d.vehicles) || !Array.isArray(d.expenses)) throw new Error('formato');
        if (!confirm('Importare il backup? I dati attuali su questo dispositivo verranno sostituiti.')) return;
        db = Object.assign(emptyDb(), d); delete db.app; delete db.exportedAt;
        save(); S.vid = null; S.tab = 'veicoli'; render(); toast('Backup importato');
      } catch (e) { toast('File non valido: scegli un backup di CarManager'); }
    };
    r.readAsText(file);
  }

  /* ============ eventi ============ */
  document.addEventListener('click', function (ev) {
    var t = ev.target.closest('[data-act]');
    if (!t || t.closest('#sheet-root')) return;
    var a = t.dataset.act, id = t.dataset.id;
    if (a === 'tab') { S.tab = t.dataset.tab; S.vid = null; render(); window.scrollTo(0, 0); }
    else if (a === 'openV') { S.vid = id; S.vtab = 'riepilogo'; render(); window.scrollTo(0, 0); }
    else if (a === 'back') { S.vid = null; render(); window.scrollTo(0, 0); }
    else if (a === 'vtab') { S.vtab = t.dataset.t; render(); }
    else if (a === 'addV') editVehicle(null);
    else if (a === 'editV') editVehicle(S.vid);
    else if (a === 'addE') editExpense(null);
    else if (a === 'editE') editExpense(id);
    else if (a === 'addY') editYearly(null);
    else if (a === 'editY') editYearly(id);
    else if (a === 'editP') editPurchase();
    else if (a === 'payRata') {
      var p = vById(S.vid).acquisto;
      if ((p.ratePagate || 0) < (p.nRate || 0)) { p.ratePagate = (p.ratePagate || 0) + 1; save(); render(); toast('Rata registrata'); }
      else toast('Tutte le rate risultano già pagate');
    }
    else if (a === 'unpayRata') {
      var q = vById(S.vid).acquisto;
      if ((q.ratePagate || 0) > 0) { q.ratePagate -= 1; save(); render(); }
    }
    else if (a === 'addD') editDeadline(null);
    else if (a === 'editD') editDeadline(id);
    else if (a === 'addCat') {
      var inp = $('#newCat'), name = inp.value.trim();
      if (!name) { toast('Scrivi il nome della voce'); return; }
      if (allCats().some(function (c) { return c.toLowerCase() === name.toLowerCase(); })) { toast('Questa voce esiste già'); return; }
      db.cats.push(name); save(); render(); toast('Voce aggiunta');
    }
    else if (a === 'delCat') {
      var nm = t.dataset.name;
      var used = db.expenses.filter(function (e) { return e.categoria === nm; }).length;
      if (!confirm('Eliminare la voce "' + nm + '"?' + (used ? '\n' + used + ' spese già registrate manterranno questa voce.' : ''))) return;
      db.cats = db.cats.filter(function (c) { return c !== nm; }); save(); render();
    }
    else if (a === 'export') exportBackup();
    else if (a === 'csv') exportCsv();
    else if (a === 'import') $('#impFile').click();
    else if (a === 'wipe') {
      if (confirm('Cancellare TUTTI i dati? L\'operazione non si può annullare.') && confirm('Sei sicuro? Se non hai un backup perderai tutto.')) {
        db = emptyDb(); save(); S.vid = null; render(); toast('Dati cancellati');
      }
    }
  });
  document.addEventListener('change', function (ev) {
    var t = ev.target, c = t.dataset && t.dataset.chg;
    if (!c) return;
    if (c === 'year') S.year = t.value;
    else if (c === 'stV') { S.stV = t.value; }
    else if (c === 'stY') S.stY = t.value;
    render();
  });

  /* ============ avvio ============ */
  var imp = document.createElement('input');
  imp.type = 'file'; imp.id = 'impFile'; imp.accept = '.json,application/json'; imp.style.display = 'none';
  imp.addEventListener('change', function () { if (imp.files[0]) importBackup(imp.files[0]); imp.value = ''; });
  document.body.appendChild(imp);

  document.addEventListener('visibilitychange', function () {
    if (!document.hidden && !$('#shform')) { YEAR = new Date().getFullYear(); render(); }
  });

  render();
  if (navigator.storage && navigator.storage.persist) { navigator.storage.persist().catch(function () { }); }
  if ('serviceWorker' in navigator && location.protocol.indexOf('http') === 0) {
    window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function () { }); });
  }
})();
