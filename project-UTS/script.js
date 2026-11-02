/* ==========================================================
   JEMPUTIN - script.js
   Satu file JavaScript untuk semua halaman.
   Setiap halaman memiliki <body data-page="..."> dan fungsi
   inisialisasinya ada di objek PAGES di bagian bawah.

   CATATAN PENTING:
   Ini PROTOTIPE FRONTEND. Semua data (akun, pesanan, tarif)
   disimpan di localStorage browser, BUKAN di server/database.
   Login, pembayaran, chat, telepon, dan pencarian pengemudi
   hanya SIMULASI. Pada tahap UAS, bagian "DATA LAYER" di bawah
   diganti dengan pemanggilan PHP + MySQL (lihat README.md).
   ========================================================== */
(() => {
  'use strict';

  /* ==================== KONSTANTA ==================== */
  const KEY = {
    users: 'jmp_users', session: 'jmp_session', orders: 'jmp_orders',
    draft: 'jmp_draft', tarif: 'jmp_tarif', chat: 'jmp_chat', seed: 'jmp_seed_v1'
  };
  const ST = {
    CARI: 'Mencari pengemudi', JEMPUT: 'Pengemudi menuju lokasi', JALAN: 'Dalam perjalanan',
    SELESAI: 'Selesai', BATAL: 'Dibatalkan'
  };
  const ACTIVE = [ST.CARI, ST.JEMPUT, ST.JALAN];

  // Contoh lokasi (koordinat contoh untuk demo peta)
  const PLACES = [
    { id: 'kost', nama: 'Kost Mawar', alamat: 'Jl. Melati No. 12', lat: -7.7830, lng: 110.3670 },
    { id: 'kampus', nama: 'Kampus Universitas', alamat: 'Jl. Pendidikan No. 1', lat: -7.7713, lng: 110.3775 },
    { id: 'stasiun', nama: 'Stasiun Kota', alamat: 'Jl. Stasiun No. 5', lat: -7.7893, lng: 110.3636 },
    { id: 'mall', nama: 'Mall Central', alamat: 'Jl. Raya Utama No. 20', lat: -7.7829, lng: 110.4009 },
    { id: 'rs', nama: 'Rumah Sakit Umum', alamat: 'Jl. Kesehatan No. 8', lat: -7.7600, lng: 110.3700 },
    { id: 'terminal', nama: 'Terminal Bus', alamat: 'Jl. Terminal No. 3', lat: -7.8100, lng: 110.3900 },
    { id: 'pasar', nama: 'Pasar Raya', alamat: 'Jl. Pasar No. 15', lat: -7.7990, lng: 110.3600 },
    { id: 'perpus', nama: 'Perpustakaan Kota', alamat: 'Jl. Literasi No. 7', lat: -7.7750, lng: 110.3850 },
    { id: 'taman', nama: 'Taman Kota', alamat: 'Jl. Taman No. 2', lat: -7.7900, lng: 110.3800 }
  ];

  const DEFAULT_TARIF = {
    motor: { nama: 'JemputMotor', dasar: 5000, perKm: 2000, eta: 3, kapasitas: '1 penumpang', ikon: 'M' },
    mobil: { nama: 'JemputMobil', dasar: 8000, perKm: 4000, eta: 6, kapasitas: '4 penumpang', ikon: 'C' }
  };
  const PAYMENTS = ['Tunai', 'E-Wallet (simulasi)', 'Transfer Bank (simulasi)'];

  /* ==================== UTILITAS ==================== */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const load = (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } };
  const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* abaikan */ } };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const rupiah = n => 'Rp' + Math.round(Number(n) || 0).toLocaleString('id-ID');
  const pad = n => String(n).padStart(2, '0');
  const fmtDate = iso => {
    const d = new Date(iso);
    if (isNaN(d)) return String(iso);
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) + ' · ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  };
  const isToday = iso => new Date(iso).toDateString() === new Date().toDateString();
  const validEmail = e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
  const go = url => location.href = url;
  const goReplace = url => location.replace(url);

  /* ==================== MODAL & TOAST ==================== */
  function openModal(html, opts = {}) {
    const bg = document.createElement('div');
    bg.className = 'modal-bg';
    bg.innerHTML = '<div class="modal' + (opts.left ? ' left' : '') + '">' + html + '</div>';
    document.body.appendChild(bg);
    bg.addEventListener('click', e => { if (e.target === bg && !opts.sticky) closeModal(bg); });
    return bg;
  }
  function closeModal(bg) { if (bg && bg.parentNode) bg.parentNode.removeChild(bg); }

  // dialog({icon, tone, title, text, buttons:[{label, cls, onClick}]})
  function dialog(o) {
    const btns = (o.buttons || []).map((b, i) => '<button type="button" class="btn ' + (b.cls || '') + '" data-i="' + i + '">' + esc(b.label) + '</button>').join('');
    const bg = openModal(
      (o.icon ? '<div class="m-ic ' + (o.tone || '') + '">' + o.icon + '</div>' : '') +
      '<h3>' + esc(o.title) + '</h3><p>' + (o.text || '') + '</p>' +
      '<div class="btns">' + btns + '</div>', { sticky: o.sticky });
    $$('button[data-i]', bg).forEach(btn => btn.addEventListener('click', () => {
      const b = o.buttons[+btn.dataset.i];
      const keep = b.onClick ? b.onClick(bg) === false : false;
      if (!keep) closeModal(bg);
    }));
    return bg;
  }
  function loadingDialog(text) {
    return openModal('<div class="spin"></div><h3>' + esc(text) + '</h3><p>Mohon tunggu sebentar...</p>', { sticky: true });
  }
  function confirmDialog(title, text, yes, onYes, noLabel) {
    return dialog({
      icon: '?', title, text,
      buttons: [{ label: noLabel || 'Tidak', cls: 'o' }, { label: yes || 'Ya', onClick: () => { onYes(); } }]
    });
  }
  function toast(msg, tone) {
    const old = $('.toast'); if (old) old.remove();
    const t = document.createElement('div');
    t.className = 'toast ' + (tone || '');
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2800);
  }
  function modalForm(title, fieldsHtml, submitLabel, onSubmit) {
    const bg = openModal('<h3>' + esc(title) + '</h3><form id="mf" novalidate>' + fieldsHtml +
      '<div class="alert err" id="mfErr" hidden></div><div class="btns"><button type="button" class="btn o" id="mfCancel">Batal</button>' +
      '<button type="submit" class="btn">' + esc(submitLabel) + '</button></div></form>', { left: true, sticky: true });
    $('#mfCancel', bg).addEventListener('click', () => closeModal(bg));
    $('#mf', bg).addEventListener('submit', e => {
      e.preventDefault();
      const data = {};
      new FormData(e.target).forEach((v, k) => { data[k] = String(v).trim(); });
      const err = onSubmit(data);
      if (err) { const a = $('#mfErr', bg); a.textContent = err; a.hidden = false; } else closeModal(bg);
    });
    return bg;
  }

  /* ==================== DATA LAYER (localStorage) ====================
     Pada UAS: setiap fungsi di bagian ini diganti dengan fetch() ke
     file PHP (api/*.php) yang membaca/menulis tabel MySQL.            */
  const getUsers = () => load(KEY.users, []);
  const setUsers = u => save(KEY.users, u);
  const getOrders = () => load(KEY.orders, []);
  const setOrders = o => save(KEY.orders, o);
  const getTarif = () => load(KEY.tarif, DEFAULT_TARIF);
  const getOrder = id => getOrders().find(o => o.id === id) || null;
  const userById = id => getUsers().find(u => u.id === id) || null;
  const updateOrder = (id, patch) => {
    const all = getOrders(); const i = all.findIndex(o => o.id === id);
    if (i < 0) return null;
    all[i] = Object.assign({}, all[i], patch); setOrders(all); return all[i];
  };
  const updateUser = (id, patch) => {
    const all = getUsers(); const i = all.findIndex(u => u.id === id);
    if (i < 0) return null;
    all[i] = Object.assign({}, all[i], patch); setUsers(all); return all[i];
  };
  const nextOrderId = () => {
    const max = getOrders().reduce((m, o) => Math.max(m, parseInt(String(o.id).replace(/\D/g, ''), 10) || 0), 0);
    return 'ORD-' + String(max + 1).padStart(4, '0');
  };
  const nextUserId = () => getUsers().reduce((m, u) => Math.max(m, u.id), 0) + 1;

  function distanceKm(a, b) {
    const R = 6371, rad = x => x * Math.PI / 180;
    const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
    const km = 2 * R * Math.asin(Math.sqrt(h)) * 1.3; // faktor 1.3 = perkiraan jalan berkelok
    return Math.max(1, Math.round(km * 10) / 10);
  }
  function calcFare(service, km) {
    const t = getTarif()[service];
    return Math.round((t.dasar + t.perKm * km) / 500) * 500;
  }
  const activeOrderOf = uid => getOrders().filter(o => o.userId === uid && ACTIVE.includes(o.status)).pop() || null;
  const busyDriverIds = () => getOrders().filter(o => o.driverId && [ST.JEMPUT, ST.JALAN].includes(o.status)).map(o => o.driverId);
  const availableDrivers = service => {
    const busy = busyDriverIds();
    return getUsers().filter(u => u.role === 'pengemudi' && u.status === 'aktif' && u.online && u.jenis === service && !busy.includes(u.id));
  };
  function driverRating(d) {
    const r = getOrders().filter(o => o.driverId === d.id && o.rating).map(o => o.rating);
    if (!r.length) return Number(d.rating || 5).toFixed(1);
    return (r.reduce((a, b) => a + b, 0) / r.length).toFixed(1);
  }
  const placeByText = txt => {
    const t = String(txt || '').trim().toLowerCase();
    if (!t) return null;
    return PLACES.find(p => p.nama.toLowerCase() === t) || PLACES.find(p => (p.nama + ' ' + p.alamat).toLowerCase().includes(t)) || null;
  };
  function getDraft() {
    const d = load(KEY.draft, null) || {};
    return Object.assign({ pickup: PLACES[0], dest: null, service: 'motor', jadwal: 'Sekarang', payment: PAYMENTS[0] }, d);
  }
  const setDraft = d => save(KEY.draft, d);
  const badgeCls = s => ({ [ST.SELESAI]: '', [ST.BATAL]: 'rd', [ST.JALAN]: 'y', [ST.JEMPUT]: 'y', [ST.CARI]: 'bl' }[s] || 'gr');

  /* ----- Data awal (demo) ----- */
  function seed() {
    if (load(KEY.seed, false)) return;
    save(KEY.users, [
      { id: 1, nama: 'Admin Jemputin', email: 'admin@jemputin.com', hp: '081100000000', password: 'admin123', role: 'admin', status: 'aktif' },
      { id: 2, nama: 'Budi Santoso', email: 'budi@jemputin.com', hp: '081211111111', password: 'driver123', role: 'pengemudi', status: 'aktif', online: true, jenis: 'motor', kendaraan: 'Honda Vario', plat: 'AB 1234 CD', rating: 4.9 },
      { id: 3, nama: 'Andi Wijaya', email: 'andi@jemputin.com', hp: '081222222222', password: 'driver123', role: 'pengemudi', status: 'aktif', online: true, jenis: 'mobil', kendaraan: 'Toyota Avanza', plat: 'AB 5678 EF', rating: 4.8 },
      { id: 4, nama: 'Willy Haykal P', email: 'willy@jemputin.com', hp: '081234567890', password: 'user123', role: 'pelanggan', status: 'aktif' }
    ]);
    save(KEY.tarif, DEFAULT_TARIF);
    const ago = (n, h) => { const d = new Date(); d.setDate(d.getDate() - n); d.setHours(h, 15, 0, 0); return d.toISOString(); };
    const P = id => PLACES.find(p => p.id === id);
    const mk = (n, drv, from, to, svc, status, date, rating) => {
      const km = distanceKm(P(from), P(to));
      return { id: 'ORD-' + String(n).padStart(4, '0'), userId: 4, driverId: status === ST.BATAL ? null : drv, pickup: P(from), dest: P(to),
        service: svc, km, fare: status === ST.BATAL ? 0 : calcFare(svc, km), schedule: 'Sekarang', payment: 'Tunai', status, createdAt: date, rating: rating || null, review: '' };
    };
    save(KEY.orders, [
      mk(1, 2, 'kost', 'kampus', 'motor', ST.SELESAI, ago(5, 7), 5),
      mk(2, 3, 'kampus', 'stasiun', 'mobil', ST.SELESAI, ago(3, 16), 5),
      mk(3, 2, 'kost', 'mall', 'motor', ST.SELESAI, ago(2, 19), 4),
      mk(4, null, 'kampus', 'kost', 'motor', ST.BATAL, ago(1, 12), null)
    ]);
    save(KEY.seed, true);
  }
  function resetDemo() {
    Object.values(KEY).forEach(k => { try { localStorage.removeItem(k); sessionStorage.removeItem(k); } catch (e) { /* abaikan */ } });
  }

  /* ==================== SESI & HAK AKSES ==================== */
  // Sesi login disimpan per TAB (sessionStorage) agar pelanggan dan pengemudi bisa login bersamaan di tab berbeda,
  // sedangkan data pesanan tetap dibagi lewat localStorage. Pada UAS diganti $_SESSION PHP.
  const getSession = () => { try { return JSON.parse(sessionStorage.getItem(KEY.session)); } catch (e) { return null; } };
  const setSession = v => { try { sessionStorage.setItem(KEY.session, JSON.stringify(v)); } catch (e) { /* abaikan */ } };
  const me = () => { const s = getSession(); return s ? userById(s.id) : null; };
  const homeOf = role => role === 'admin' ? 'admin.html' : role === 'pengemudi' ? 'driver.html' : 'index.html';
  function logout() { try { sessionStorage.removeItem(KEY.session); } catch (e) { /* abaikan */ } goReplace('login.html'); }
  // guard: hanya peran dalam daftar yang boleh membuka halaman
  function guard(roles) {
    const u = me();
    if (!u) { goReplace('login.html'); return null; }
    if (u.status !== 'aktif') { logout(); return null; }
    if (!roles.includes(u.role)) { goReplace(homeOf(u.role)); return null; }
    return u;
  }

  /* ==================== NAVIGASI BAWAH ==================== */
  const ICON = {
    home: '<svg viewBox="0 0 24 24"><path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/></svg>',
    pin: '<svg viewBox="0 0 24 24"><path d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5z"/></svg>',
    clock: '<svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm1 5v5.4l4 2.4-.8 1.3L11 13V7z"/></svg>',
    user: '<svg viewBox="0 0 24 24"><path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10zm0 2c-4.4 0-8 2.2-8 5v3h16v-3c0-2.8-3.6-5-8-5z"/></svg>',
    list: '<svg viewBox="0 0 24 24"><path d="M4 5h16v3H4zm0 5.5h16v3H4zm0 5.5h16v3H4z"/></svg>'
  };
  function renderNav(active) {
    const u = me(); const el = $('#nav'); if (!u || !el) return;
    const items = u.role === 'pengemudi'
      ? [['driver', 'driver.html', 'Pesanan', ICON.list], ['profil', 'profil.html', 'Profil', ICON.user]]
      : [['index', 'index.html', 'Beranda', ICON.home], ['lokasi', 'lokasi.html', 'Pesan', ICON.pin], ['riwayat', 'riwayat.html', 'Riwayat', ICON.clock], ['profil', 'profil.html', 'Profil', ICON.user]];
    el.innerHTML = items.map(i => '<a href="' + i[1] + '" class="' + (i[0] === active ? 'on' : '') + '">' + i[3] + i[2] + '</a>').join('');
  }

  /* ==================== PETA (Leaflet + fallback) ==================== */
  function fallbackMap(el, a, b) {
    const lats = PLACES.map(p => p.lat), lngs = PLACES.map(p => p.lng);
    const minLat = Math.min(...lats), maxLat = Math.max(...lats), minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
    const X = p => 40 + (p.lng - minLng) / (maxLng - minLng || 1) * 310;
    const Y = p => 40 + (maxLat - p.lat) / (maxLat - minLat || 1) * 220;
    let route = '', marks = '';
    if (a && b) {
      const x1 = X(a), y1 = Y(a), x2 = X(b), y2 = Y(b), cx = (x1 + x2) / 2 + 30, cy = (y1 + y2) / 2 - 30;
      route = '<path d="M' + x1 + ' ' + y1 + ' Q' + cx + ' ' + cy + ' ' + x2 + ' ' + y2 + '" stroke="#1d4ed8" stroke-width="5" fill="none" stroke-linecap="round"/>';
    }
    if (a) marks += '<circle cx="' + X(a) + '" cy="' + Y(a) + '" r="9" fill="#1d4ed8" stroke="#fff" stroke-width="3"/>';
    if (b) marks += '<rect x="' + (X(b) - 9) + '" y="' + (Y(b) - 9) + '" width="18" height="18" rx="4" fill="#ef4444" stroke="#fff" stroke-width="3"/>';
    el.classList.remove('leaflet-container');
    el.innerHTML = '<svg viewBox="0 0 390 300" width="100%" height="100%" preserveAspectRatio="xMidYMid slice"><rect width="390" height="300" fill="#e6efe6"/>' +
      '<rect x="20" y="20" width="110" height="70" rx="8" fill="#d3e4cf"/><rect x="250" y="190" width="120" height="80" rx="8" fill="#cfe0f2"/>' +
      '<g stroke="#fff" stroke-width="12" fill="none"><path d="M-10 120 L400 150"/><path d="M130 -10 L170 310"/><path d="M-10 240 L400 215"/><path d="M290 -10 L260 310"/></g>' +
      route + marks +
      '<text x="195" y="292" font-size="10" fill="#64748b" text-anchor="middle">Peta tidak dapat dimuat - tampilan cadangan</text></svg>';
  }
  function drawMap(el, a, b) {
    if (!el) return;
    el._tok = (el._tok || 0) + 1; const tok = el._tok;
    if (el._jmap) { try { el._jmap.remove(); } catch (e) { /* abaikan */ } el._jmap = null; }
    el.innerHTML = '';
    if (!window.L || (!a && !b)) { fallbackMap(el, a, b); return; }
    try {
      const map = L.map(el, { zoomControl: false, attributionControl: true });
      el._jmap = map;
      let loaded = false;
      const layer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap' }).addTo(map);
      layer.on('tileload', () => { loaded = true; });
      const pts = [];
      if (a) { L.circleMarker([a.lat, a.lng], { radius: 9, color: '#fff', weight: 3, fillColor: '#1d4ed8', fillOpacity: 1 }).addTo(map); pts.push([a.lat, a.lng]); }
      if (b) { L.circleMarker([b.lat, b.lng], { radius: 9, color: '#fff', weight: 3, fillColor: '#ef4444', fillOpacity: 1 }).addTo(map); pts.push([b.lat, b.lng]); }
      if (pts.length === 2) { L.polyline(pts, { color: '#1d4ed8', weight: 5 }).addTo(map); map.fitBounds(pts, { padding: [30, 30] }); }
      else map.setView(pts[0], 15);
      setTimeout(() => { try { map.invalidateSize(); } catch (e) { /* abaikan */ } }, 200);
      // jika tile peta tidak termuat (offline), pakai tampilan cadangan
      setTimeout(() => {
        if (tok === el._tok && !loaded) { try { map.remove(); } catch (e) { /* abaikan */ } el._jmap = null; fallbackMap(el, a, b); }
      }, 4500);
    } catch (e) { fallbackMap(el, a, b); }
  }

  /* ==================== HALAMAN ==================== */
  const PAGES = {};

  /* ---------- LOGIN ---------- */
  PAGES.login = () => {
    const u = me(); if (u && u.status === 'aktif') { goReplace(homeOf(u.role)); return; }
    const form = $('#loginForm'), alertBox = $('#alertBox');
    const showAlert = (msg, cls) => { alertBox.textContent = msg; alertBox.className = 'alert ' + cls; alertBox.hidden = false; };
    form.addEventListener('submit', e => {
      e.preventDefault();
      const email = $('#email').value.trim().toLowerCase(), pw = $('#password').value;
      $$('.f', form).forEach(f => f.classList.remove('err'));
      alertBox.hidden = true;
      if (!email || !pw) {
        if (!email) $('#email').closest('.f').classList.add('err');
        if (!pw) $('#password').closest('.f').classList.add('err');
        showAlert('Email dan kata sandi wajib diisi.', 'err'); return;
      }
      const user = getUsers().find(x => x.email.toLowerCase() === email && x.password === pw);
      if (!user) {
        $('#password').closest('.f').classList.add('err');
        showAlert('Login gagal. Email atau kata sandi salah.', 'err'); return;
      }
      if (user.status === 'menunggu') { showAlert('Akun pengemudi Anda masih menunggu persetujuan admin.', 'err'); return; }
      if (user.status !== 'aktif') { showAlert('Akun Anda dinonaktifkan. Hubungi admin.', 'err'); return; }
      setSession({ id: user.id });
      showAlert('Login berhasil. Mengalihkan...', 'ok');
      setTimeout(() => goReplace(homeOf(user.role)), 900);
    });
    $$('.fill', document).forEach(b => b.addEventListener('click', () => {
      $('#email').value = b.dataset.email; $('#password').value = b.dataset.pw;
    }));
  };

  /* ---------- REGISTER ---------- */
  PAGES.register = () => {
    if (me()) { goReplace(homeOf(me().role)); return; }
    const form = $('#regForm'), roleSel = $('#role'), alertBox = $('#alertBox');
    const toggle = () => { $('#driverFields').hidden = roleSel.value !== 'pengemudi'; };
    roleSel.addEventListener('change', toggle); toggle();
    const bad = (id, msg) => { const f = $('#' + id).closest('.f'); f.classList.add('err'); $('.msg', f).textContent = msg; return false; };
    form.addEventListener('submit', e => {
      e.preventDefault();
      $$('.f', form).forEach(f => f.classList.remove('err'));
      alertBox.hidden = true;
      const v = id => $('#' + id).value.trim();
      const role = roleSel.value, email = v('email').toLowerCase();
      let ok = true;
      if (v('nama').length < 3) ok = bad('nama', 'Nama minimal 3 karakter.') && ok;
      if (!validEmail(email)) ok = bad('email', 'Format email tidak valid.') && ok;
      else if (getUsers().some(x => x.email.toLowerCase() === email)) ok = bad('email', 'Email sudah terdaftar.') && ok;
      if (!/^\d{9,15}$/.test(v('hp'))) ok = bad('hp', 'Nomor HP 9-15 digit angka.') && ok;
      if (v('password').length < 6) ok = bad('password', 'Kata sandi minimal 6 karakter.') && ok;
      if (role === 'pengemudi') {
        if (!v('kendaraan')) ok = bad('kendaraan', 'Isi tipe kendaraan.') && ok;
        if (!v('plat')) ok = bad('plat', 'Isi plat nomor.') && ok;
      }
      if (!ok) { alertBox.textContent = 'Periksa kembali data yang ditandai merah.'; alertBox.className = 'alert err'; alertBox.hidden = false; return; }
      const user = { id: nextUserId(), nama: v('nama'), email, hp: v('hp'), password: v('password'), role, status: role === 'pengemudi' ? 'menunggu' : 'aktif' };
      if (role === 'pengemudi') Object.assign(user, { online: false, jenis: $('#jenis').value, kendaraan: v('kendaraan'), plat: v('plat').toUpperCase(), rating: 5 });
      setUsers(getUsers().concat(user));
      dialog({
        icon: '✓', tone: 'ok', title: 'Registrasi Berhasil',
        text: role === 'pengemudi' ? 'Akun pengemudi Anda menunggu persetujuan admin sebelum bisa dipakai login.' : 'Akun Anda sudah dibuat. Silakan masuk.',
        sticky: true, buttons: [{ label: 'Ke Halaman Login', onClick: () => { go('login.html'); return false; } }]
      });
    });
  };

  /* ---------- BERANDA ---------- */
  PAGES.index = () => {
    const u = guard(['pelanggan']); if (!u) return;
    renderNav('index');
    $('#hello').textContent = u.nama.split(' ')[0];
    const d = getDraft();
    $('#pickupText').textContent = d.pickup.nama + ', ' + d.pickup.alamat;
    $('#destText').textContent = d.dest ? d.dest.nama : 'Mau ke mana hari ini?';
    $$('.svc-opt').forEach(b => {
      b.classList.toggle('on', b.dataset.svc === d.service);
      b.addEventListener('click', () => {
        d.service = b.dataset.svc; setDraft(d);
        $$('.svc-opt').forEach(x => x.classList.toggle('on', x === b));
      });
    });
    $('#promo').addEventListener('click', () => toast('Kode JEMPUT30 berlaku di perjalanan pertama (simulasi)', 'ok'));
    const act = activeOrderOf(u.id);
    if (act) {
      $('#activeBanner').innerHTML = '<a class="card" href="' + (act.status === ST.CARI ? 'mencari-driver.html' : 'perjalanan.html') + '" style="display:block;border-left:5px solid var(--b)"><b>Pesanan aktif ' + esc(act.id) + '</b><div class="sub">' + esc(act.status) + ' · ketuk untuk melihat</div></a>';
    }
    const recent = getOrders().filter(o => o.userId === u.id).slice(-2).reverse();
    $('#recent').innerHTML = recent.length ? recent.map(o =>
      '<div class="li"><div class="ic">' + (o.service === 'motor' ? 'M' : 'C') + '</div><div class="grow"><b>' + esc(o.pickup.nama) + ' → ' + esc(o.dest.nama) +
      '</b><span class="sub">' + fmtDate(o.createdAt) + ' · ' + (o.service === 'motor' ? 'Motor' : 'Mobil') + '</span></div><b>' + rupiah(o.fare) + '</b></div>').join('')
      : '<div class="empty">Belum ada perjalanan. Yuk pesan sekarang!</div>';
  };

  /* ---------- LOKASI ---------- */
  PAGES.lokasi = () => {
    const u = guard(['pelanggan']); if (!u) return;
    renderNav('lokasi');
    const d = getDraft(), pi = $('#pickupInput'), di = $('#destInput'), errBox = $('#err');
    pi.value = d.pickup ? d.pickup.nama : ''; di.value = d.dest ? d.dest.nama : '';
    let active = d.pickup ? 'dest' : 'pickup';
    const resolve = () => [placeByText(pi.value), placeByText(di.value)];
    const refreshMap = () => { const [a, b] = resolve(); drawMap($('#map'), a, b); };
    const render = q => {
      const t = String(q || '').toLowerCase();
      const list = PLACES.filter(p => !t || (p.nama + ' ' + p.alamat).toLowerCase().includes(t));
      $('#placeList').innerHTML = list.length ? list.map(p =>
        '<div class="li click" data-id="' + p.id + '"><div class="ic">' + esc(p.nama[0]) + '</div><div class="grow"><b>' + esc(p.nama) + '</b><span class="sub">' + esc(p.alamat) + '</span></div></div>').join('')
        : '<div class="empty">Alamat tidak ditemukan.</div>';
    };
    let timer;
    const typed = () => { clearTimeout(timer); timer = setTimeout(refreshMap, 400); };
    pi.addEventListener('focus', () => { active = 'pickup'; render(pi.value); });
    di.addEventListener('focus', () => { active = 'dest'; render(di.value); });
    pi.addEventListener('input', () => { render(pi.value); typed(); });
    di.addEventListener('input', () => { render(di.value); typed(); });
    $('#placeList').addEventListener('click', e => {
      const row = e.target.closest('.li[data-id]'); if (!row) return;
      const p = PLACES.find(x => x.id === row.dataset.id);
      if (active === 'pickup') { pi.value = p.nama; active = 'dest'; di.focus(); } else { di.value = p.nama; }
      errBox.hidden = true; render(''); refreshMap();
    });
    $('#nextBtn').addEventListener('click', () => {
      const [a, b] = resolve();
      const fail = m => { errBox.textContent = m; errBox.hidden = false; };
      if (!a) return fail('Pilih lokasi jemput dari daftar alamat.');
      if (!b) return fail('Pilih tujuan dari daftar alamat.');
      if (a.id === b.id) return fail('Lokasi jemput dan tujuan tidak boleh sama.');
      d.pickup = a; d.dest = b; setDraft(d); go('layanan.html');
    });
    render(''); refreshMap();
  };

  /* ---------- LAYANAN & PEMESANAN ---------- */
  PAGES.layanan = () => {
    const u = guard(['pelanggan']); if (!u) return;
    renderNav('lokasi');
    const d = getDraft();
    if (!d.pickup || !d.dest) { goReplace('lokasi.html'); return; }
    const km = distanceKm(d.pickup, d.dest), tarif = getTarif();
    drawMap($('#map'), d.pickup, d.dest);
    $('#routeInfo').innerHTML = '<div class="row"><span class="dot"></span><b class="grow">' + esc(d.pickup.nama) + '</b></div><div class="gap"></div><div class="row"><span class="dot r"></span><b class="grow">' + esc(d.dest.nama) + '</b><span class="sub">' + km + ' km</span></div>';

    const renderOpts = () => {
      $('#svcList').innerHTML = Object.keys(tarif).map(k => {
        const t = tarif[k];
        return '<label class="opt ' + (d.service === k ? 'on' : '') + '"><input type="radio" name="svc" value="' + k + '"' + (d.service === k ? ' checked' : '') + '><div class="ic">' + esc(t.ikon) +
          '</div><div class="grow"><b>' + esc(t.nama) + '</b><span class="sub">' + t.eta + ' menit · ' + esc(t.kapasitas) + '</span></div><b>' + rupiah(calcFare(k, km)) + '</b></label>';
      }).join('');
      $('#payList').innerHTML = PAYMENTS.map(p =>
        '<label class="opt ' + (d.payment === p ? 'on' : '') + '"><input type="radio" name="pay" value="' + esc(p) + '"' + (d.payment === p ? ' checked' : '') + '><div class="grow"><b>' + esc(p) + '</b></div></label>').join('');
      $('#orderBtn').textContent = 'Pesan ' + tarif[d.service].nama + ' · ' + rupiah(calcFare(d.service, km));
    };
    $('#svcList').addEventListener('change', e => { d.service = e.target.value; setDraft(d); renderOpts(); });
    $('#payList').addEventListener('change', e => { d.payment = e.target.value; setDraft(d); renderOpts(); });
    const jadwalSel = $('#jadwalSel'), jadwalTime = $('#jadwalTime');
    const now = new Date(); now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    jadwalTime.min = now.toISOString().slice(0, 16);
    jadwalSel.addEventListener('change', () => { $('#jadwalWrap').hidden = jadwalSel.value !== 'nanti'; });
    renderOpts();

    $('#orderBtn').addEventListener('click', () => {
      let jadwal = 'Sekarang';
      if (jadwalSel.value === 'nanti') {
        if (!jadwalTime.value || new Date(jadwalTime.value) <= new Date()) { toast('Pilih jadwal di waktu yang akan datang.', 'err'); return; }
        jadwal = new Date(jadwalTime.value).toISOString();
      }
      if (activeOrderOf(u.id)) { toast('Masih ada pesanan aktif. Selesaikan atau batalkan dulu.', 'err'); return; }
      const fare = calcFare(d.service, km);
      confirmDialog('Anda yakin ingin memesan ini?',
        esc(d.pickup.nama) + ' → ' + esc(d.dest.nama) + '<br>' + esc(tarif[d.service].nama) + ' · ' + km + ' km<br><b style="color:#0f172a">Estimasi ' + rupiah(fare) + ' (' + esc(d.payment) + ')</b>',
        'Ya, Pesan', () => submitOrder(jadwal, fare), 'Tidak');
    });

    function submitOrder(jadwal, fare) {
      const wait = loadingDialog('Memproses pesanan...');
      setTimeout(() => {
        closeModal(wait);
        let reason = null;
        if ($('#simFail').checked) reason = 'Koneksi terputus saat memproses pesanan (simulasi kegagalan).';
        else if (!availableDrivers(d.service).length && jadwal === 'Sekarang') reason = 'Belum ada pengemudi ' + (d.service === 'motor' ? 'motor' : 'mobil') + ' yang tersedia saat ini.';
        if (reason) {
          dialog({ icon: '!', tone: 'err', title: 'Pesanan Gagal', text: esc(reason) + ' Silakan coba lagi.', buttons: [{ label: 'Tutup', cls: 'o' }, { label: 'Coba Lagi', onClick: () => { setTimeout(() => $('#orderBtn').click(), 50); } }] });
          return;
        }
        const order = { id: nextOrderId(), userId: u.id, driverId: null, pickup: d.pickup, dest: d.dest, service: d.service, km, fare, schedule: jadwal, payment: d.payment, status: ST.CARI, createdAt: new Date().toISOString(), rating: null, review: '' };
        setOrders(getOrders().concat(order));
        setDraft(Object.assign({}, d, { dest: null }));
        dialog({
          icon: '✓', tone: 'ok', title: 'Pesanan Berhasil!', sticky: true,
          text: 'Pesanan <b>' + esc(order.id) + '</b> telah dibuat. Kami sedang mencarikan pengemudi terdekat untuk Anda.',
          buttons: [{ label: 'Lihat Pesanan', onClick: () => { go('mencari-driver.html'); return false; } }]
        });
      }, 1200);
    }
  };

  /* ---------- MENCARI PENGEMUDI ---------- */
  PAGES['mencari-driver'] = () => {
    const u = guard(['pelanggan']); if (!u) return;
    const o0 = activeOrderOf(u.id);
    if (!o0) { goReplace('index.html'); return; }
    if (o0.status !== ST.CARI) { goReplace('perjalanan.html'); return; }
    const id = o0.id, t = getTarif()[o0.service];
    $('#info').innerHTML = '<div class="row between"><span class="sub">' + esc(t.nama) + ' · ' + esc(o0.id) + '</span><b>' + rupiah(o0.fare) + '</b></div>' +
      '<div class="li" style="border:0;padding-bottom:0"><span class="dot"></span><div class="grow">' + esc(o0.pickup.nama) + '</div></div>' +
      '<div class="li" style="border:0;padding-bottom:0"><span class="dot r"></span><div class="grow">' + esc(o0.dest.nama) + '</div></div>';
    const t0 = Date.now();
    const tick = () => {
      const cur = getOrder(id);
      if (!cur || cur.status === ST.BATAL) { clearInterval(iv); goReplace('index.html'); return; }
      if (cur.status !== ST.CARI) { clearInterval(iv); goReplace('perjalanan.html'); return; }
      const sec = Math.floor((Date.now() - t0) / 1000);
      $('#timer').textContent = 'Menunggu ' + sec + ' detik';
      // SIMULASI: jika belum ada yang menerima dalam 8 detik, sistem menugaskan pengemudi tersedia
      if (sec >= 8) {
        const av = availableDrivers(cur.service);
        if (av.length) updateOrder(id, { driverId: av[0].id, status: ST.JEMPUT });
      }
      if (sec >= 25) {
        updateOrder(id, { status: ST.BATAL, fare: 0 }); clearInterval(iv);
        dialog({ icon: '!', tone: 'err', title: 'Pengemudi Tidak Ditemukan', text: 'Belum ada pengemudi yang menerima pesanan. Pesanan dibatalkan otomatis.', sticky: true, buttons: [{ label: 'Kembali ke Beranda', onClick: () => { goReplace('index.html'); return false; } }] });
      }
    };
    const iv = setInterval(tick, 1000); tick();
    $('#cancelBtn').addEventListener('click', () => confirmDialog('Batalkan pesanan?', 'Pesanan ' + esc(id) + ' akan dibatalkan.', 'Ya, Batalkan', () => {
      updateOrder(id, { status: ST.BATAL, fare: 0 }); clearInterval(iv); toast('Pesanan dibatalkan.'); setTimeout(() => goReplace('index.html'), 700);
    }, 'Tidak'));
  };

  /* ---------- PERJALANAN ---------- */
  PAGES.perjalanan = () => {
    const u = guard(['pelanggan']); if (!u) return;
    const o0 = activeOrderOf(u.id);
    if (!o0) { goReplace('index.html'); return; }
    if (o0.status === ST.CARI) { goReplace('mencari-driver.html'); return; }
    const id = o0.id;
    drawMap($('#map'), o0.pickup, o0.dest);
    const steps = ['Pesanan diterima', 'Pengemudi menuju lokasi jemput', 'Dalam perjalanan ke tujuan', 'Tiba di tujuan'];
    const idx = s => s === ST.JEMPUT ? 1 : s === ST.JALAN ? 2 : s === ST.SELESAI ? 3 : 0;
    const render = () => {
      const o = getOrder(id);
      if (!o) { goReplace('index.html'); return; }
      if (o.status === ST.SELESAI) { clearInterval(iv); goReplace('selesai.html?id=' + encodeURIComponent(id)); return; }
      if (o.status === ST.BATAL) { clearInterval(iv); goReplace('index.html'); return; }
      const drv = userById(o.driverId); if (!drv) return;
      $('#driverCard').innerHTML = '<div class="row"><div class="ic round">' + esc(drv.nama.split(' ').map(x => x[0]).join('').slice(0, 2)) + '</div><div class="grow"><b>' + esc(drv.nama) +
        '</b><div class="sub">' + esc(drv.kendaraan) + ' · ' + esc(drv.plat) + ' · ★ ' + driverRating(drv) + '</div></div>' +
        '<button type="button" class="ic btn-ic" id="chatBtn" title="Chat">C</button><button type="button" class="ic btn-ic" id="callBtn" title="Telepon">T</button></div>';
      const cur = idx(o.status);
      $('#steps').innerHTML = steps.map((s, i) => '<div class="step ' + (i < cur || i === 0 ? 'done' : i === cur ? 'now' : 'todo') + '"><span class="dot ' + (i === cur && i > 0 ? 'g' : i > cur ? 'off' : '') + '"></span>' + esc(s) + '</div>').join('');
      $('#statusBadge').className = 'badge ' + badgeCls(o.status); $('#statusBadge').textContent = o.status;
      $('#cancelBtn').hidden = o.status !== ST.JEMPUT;
      $('#chatBtn').onclick = () => openChat(o, drv);
      $('#callBtn').onclick = () => openCall(drv);
    };
    const iv = setInterval(render, 1500); render();
    $('#nextBtn').addEventListener('click', () => {
      const o = getOrder(id);
      updateOrder(id, { status: o.status === ST.JEMPUT ? ST.JALAN : ST.SELESAI });
      render();
    });
    $('#cancelBtn').addEventListener('click', () => confirmDialog('Batalkan perjalanan?', 'Pengemudi sedang menuju lokasi Anda. Yakin ingin membatalkan?', 'Ya, Batalkan', () => {
      updateOrder(id, { status: ST.BATAL, fare: 0 }); toast('Pesanan dibatalkan.'); setTimeout(() => goReplace('index.html'), 700);
    }, 'Tidak'));

    function openChat(o, drv) {
      const chats = load(KEY.chat, {});
      const render = bg => {
        $('#chatBox', bg).innerHTML = (chats[o.id] || []).map(m => '<div class="bubble ' + m.from + '">' + esc(m.text) + '</div>').join('') || '<div class="empty">Belum ada pesan.</div>';
        $('#chatBox', bg).scrollTop = 9999;
      };
      const bg = openModal('<h3>Chat dengan ' + esc(drv.nama) + '</h3><div class="chat" id="chatBox"></div><form id="chatForm" class="row"><input class="field" id="chatText" placeholder="Tulis pesan..." autocomplete="off"><button class="btn sm" type="submit">Kirim</button></form><p>Chat ini hanya simulasi.</p>', { left: true });
      render(bg);
      $('#chatForm', bg).addEventListener('submit', e => {
        e.preventDefault();
        const v = $('#chatText', bg).value.trim(); if (!v) return;
        (chats[o.id] = chats[o.id] || []).push({ from: 'me', text: v }); save(KEY.chat, chats); $('#chatText', bg).value = ''; render(bg);
        setTimeout(() => {
          const replies = ['Baik, saya segera sampai.', 'Siap, mohon ditunggu ya.', 'Saya sudah dekat dari lokasi jemput.', 'Oke, terima kasih infonya.'];
          chats[o.id].push({ from: 'them', text: replies[Math.floor(Math.random() * replies.length)] }); save(KEY.chat, chats);
          if (document.body.contains(bg)) render(bg);
        }, 1200);
      });
    }
    function openCall(drv) {
      let sec = 0;
      const bg = openModal('<div class="m-ic">T</div><h3>Memanggil ' + esc(drv.nama) + '...</h3><p id="callTime">00:00 (simulasi, tidak ada panggilan nyata)</p><button type="button" class="btn danger in" id="endCall">Akhiri Panggilan</button>', { sticky: true });
      const iv2 = setInterval(() => { sec++; const el = $('#callTime', bg); if (el) el.textContent = pad(Math.floor(sec / 60)) + ':' + pad(sec % 60) + ' (simulasi, tidak ada panggilan nyata)'; }, 1000);
      $('#endCall', bg).addEventListener('click', () => { clearInterval(iv2); closeModal(bg); });
    }
  };

  /* ---------- SELESAI & RATING ---------- */
  PAGES.selesai = () => {
    const u = guard(['pelanggan']); if (!u) return;
    const id = new URLSearchParams(location.search).get('id');
    const o = id ? getOrder(id) : getOrders().filter(x => x.userId === u.id && x.status === ST.SELESAI).pop();
    if (!o || o.userId !== u.id || o.status !== ST.SELESAI) { goReplace('index.html'); return; }
    const drv = userById(o.driverId), t = getTarif()[o.service];
    const tarifDasar = t.dasar, jarak = o.fare - tarifDasar;
    $('#summary').innerHTML = '<b>Ringkasan Biaya</b>' +
      '<div class="li"><span class="grow">Tarif dasar</span><span>' + rupiah(tarifDasar) + '</span></div>' +
      '<div class="li"><span class="grow">Jarak ' + o.km + ' km</span><span>' + rupiah(jarak) + '</span></div>' +
      '<div class="li"><b class="grow">Total (' + esc(o.payment) + ')</b><b style="color:var(--b);font-size:16px">' + rupiah(o.fare) + '</b></div>';
    $('#rateTitle').textContent = 'Beri rating untuk ' + (drv ? drv.nama : 'pengemudi');
    let val = o.rating || 0;
    const paint = () => $$('#stars button').forEach((b, i) => b.classList.toggle('on', i < val));
    $('#stars').innerHTML = [1, 2, 3, 4, 5].map(n => '<button type="button" data-n="' + n + '" aria-label="' + n + ' bintang">★</button>').join('');
    $('#stars').addEventListener('click', e => { const b = e.target.closest('button'); if (b && !o.rating) { val = +b.dataset.n; paint(); } });
    paint();
    if (o.rating) { $('#review').value = o.review || ''; $('#review').disabled = true; $('#sendRating').hidden = true; $('#skipBtn').textContent = 'Lihat Riwayat'; }
    $('#sendRating').addEventListener('click', () => {
      if (!val) { toast('Pilih jumlah bintang dulu.', 'err'); return; }
      updateOrder(o.id, { rating: val, review: $('#review').value.trim() });
      toast('Terima kasih atas rating Anda!', 'ok'); setTimeout(() => go('riwayat.html'), 900);
    });
  };

  /* ---------- RIWAYAT ---------- */
  PAGES.riwayat = () => {
    const u = guard(['pelanggan']); if (!u) return;
    renderNav('riwayat');
    let fs = 'Semua', fv = 'Semua';
    const render = () => {
      let list = getOrders().filter(o => o.userId === u.id).reverse();
      if (fs !== 'Semua') list = list.filter(o => fs === 'Aktif' ? ACTIVE.includes(o.status) : o.status === fs);
      if (fv !== 'Semua') list = list.filter(o => o.service === fv.toLowerCase());
      $('#list').innerHTML = list.length ? list.map(o =>
        '<div class="li click" data-id="' + esc(o.id) + '"><div class="ic">' + (o.service === 'motor' ? 'M' : 'C') + '</div><div class="grow"><b>' + esc(o.pickup.nama) + ' → ' + esc(o.dest.nama) +
        '</b><span class="sub">' + fmtDate(o.createdAt) + '</span></div><div class="r"><b>' + rupiah(o.fare) + '</b><span class="badge ' + badgeCls(o.status) + '">' + esc(o.status) + '</span></div></div>').join('')
        : '<div class="empty">Tidak ada pesanan yang cocok dengan filter.</div>';
    };
    const chipGroup = (sel, setter) => $$(sel + ' .chip').forEach(c => c.addEventListener('click', () => {
      setter(c.dataset.v); $$(sel + ' .chip').forEach(x => x.classList.toggle('on', x === c)); render();
    }));
    chipGroup('#fStatus', v => fs = v); chipGroup('#fSvc', v => fv = v);
    $('#list').addEventListener('click', e => {
      const row = e.target.closest('.li[data-id]'); if (!row) return;
      const o = getOrder(row.dataset.id), drv = userById(o.driverId);
      openModal('<h3>Detail ' + esc(o.id) + '</h3><div class="li"><span class="grow sub">Status</span><span class="badge ' + badgeCls(o.status) + '">' + esc(o.status) + '</span></div>' +
        '<div class="li"><span class="grow sub">Rute</span><b style="text-align:right">' + esc(o.pickup.nama) + ' → ' + esc(o.dest.nama) + '</b></div>' +
        '<div class="li"><span class="grow sub">Layanan</span><b>' + esc(getTarif()[o.service].nama) + ' · ' + o.km + ' km</b></div>' +
        '<div class="li"><span class="grow sub">Pengemudi</span><b>' + (drv ? esc(drv.nama) + ' (' + esc(drv.plat) + ')' : '-') + '</b></div>' +
        '<div class="li"><span class="grow sub">Pembayaran</span><b>' + esc(o.payment) + '</b></div>' +
        '<div class="li"><span class="grow sub">Total</span><b style="color:var(--b)">' + rupiah(o.fare) + '</b></div>' +
        '<div class="li"><span class="grow sub">Rating</span><b>' + (o.rating ? '★ '.repeat(o.rating) : '-') + '</b></div>' +
        '<button type="button" class="btn in" id="closeDetail">Tutup</button>', { left: true });
      $('#closeDetail').addEventListener('click', () => closeModal($('.modal-bg')));
    });
    render();
  };

  /* ---------- PROFIL (pelanggan & pengemudi) ---------- */
  PAGES.profil = () => {
    const u = guard(['pelanggan', 'pengemudi']); if (!u) return;
    renderNav('profil');
    $('#avatar').textContent = u.nama.split(' ').map(x => x[0]).join('').slice(0, 2).toUpperCase();
    $('#pName').textContent = u.nama; $('#pMail').textContent = u.email + ' · ' + (u.role === 'pengemudi' ? 'Pengemudi' : 'Pelanggan');
    const mine = getOrders().filter(o => (u.role === 'pengemudi' ? o.driverId : o.userId) === u.id && o.status === ST.SELESAI);
    $('#stTrips').textContent = mine.length;
    $('#stRating').textContent = u.role === 'pengemudi' ? driverRating(u) : (mine.filter(o => o.rating).length ? (mine.filter(o => o.rating).reduce((a, o) => a + o.rating, 0) / mine.filter(o => o.rating).length).toFixed(1) : '-');
    $('#stRatingLbl').textContent = u.role === 'pengemudi' ? 'Rating Anda' : 'Rata-rata rating Anda';
    $('#nama').value = u.nama; $('#hp').value = u.hp;
    const bad = (id, msg) => { const f = $('#' + id).closest('.f'); f.classList.add('err'); $('.msg', f).textContent = msg; };
    $('#profForm').addEventListener('submit', e => {
      e.preventDefault(); $$('#profForm .f').forEach(f => f.classList.remove('err'));
      const nama = $('#nama').value.trim(), hp = $('#hp').value.trim(); let ok = true;
      if (nama.length < 3) { bad('nama', 'Nama minimal 3 karakter.'); ok = false; }
      if (!/^\d{9,15}$/.test(hp)) { bad('hp', 'Nomor HP 9-15 digit angka.'); ok = false; }
      if (!ok) return;
      updateUser(u.id, { nama, hp }); toast('Profil diperbarui.', 'ok'); setTimeout(() => location.reload(), 700);
    });
    $('#pwForm').addEventListener('submit', e => {
      e.preventDefault(); $$('#pwForm .f').forEach(f => f.classList.remove('err'));
      const old = $('#pwOld').value, nw = $('#pwNew').value, cf = $('#pwConf').value; let ok = true;
      if (old !== u.password) { bad('pwOld', 'Kata sandi lama salah.'); ok = false; }
      if (nw.length < 6) { bad('pwNew', 'Minimal 6 karakter.'); ok = false; }
      if (nw !== cf) { bad('pwConf', 'Konfirmasi tidak sama.'); ok = false; }
      if (!ok) return;
      updateUser(u.id, { password: nw }); e.target.reset(); toast('Kata sandi diganti.', 'ok');
    });
    $('#logoutBtn').addEventListener('click', () => confirmDialog('Keluar dari akun?', 'Anda perlu login lagi untuk memesan.', 'Ya, Keluar', logout, 'Batal'));
    $('#resetBtn').addEventListener('click', () => confirmDialog('Reset data demo?', 'Semua akun, pesanan, dan tarif buatan Anda akan dikembalikan ke data awal.', 'Ya, Reset', () => { resetDemo(); goReplace('login.html'); }, 'Batal'));
  };

  /* ---------- DASHBOARD PENGEMUDI ---------- */
  PAGES.driver = () => {
    const u0 = guard(['pengemudi']); if (!u0) return;
    renderNav('driver');
    const rejKey = 'jmp_rejected';
    const rejected = () => { try { return JSON.parse(sessionStorage.getItem(rejKey) || '[]'); } catch (e) { return []; } };
    const addRejected = id => { try { sessionStorage.setItem(rejKey, JSON.stringify(rejected().concat(id))); } catch (e) { /* abaikan */ } };
    let sig = '';
    const render = (force) => {
      const u = me(); if (!u) return;
      const all = getOrders();
      const act = all.find(o => o.driverId === u.id && [ST.JEMPUT, ST.JALAN].includes(o.status));
      const incoming = all.filter(o => o.status === ST.CARI && o.service === u.jenis && !rejected().includes(o.id));
      const done = all.filter(o => o.driverId === u.id && o.status === ST.SELESAI);
      const s = JSON.stringify([u.online, act, incoming.map(o => o.id), done.length, driverRating(u)]);
      if (!force && s === sig) return; sig = s;
      $('#dName').textContent = u.nama; $('#onlineToggle').checked = !!u.online;
      $('#onlineLbl').textContent = u.online ? 'Online' : 'Offline';
      const today = done.filter(o => isToday(o.createdAt));
      $('#stToday').textContent = today.length; $('#stIncome').textContent = rupiah(today.reduce((a, o) => a + o.fare, 0)); $('#stRate').textContent = driverRating(u);
      if (act) {
        const c = userById(act.userId);
        $('#incomingTitle').textContent = 'Pesanan Berjalan';
        $('#incoming').innerHTML = '<div class="card"><div class="row between"><b>' + esc(c ? c.nama : 'Pelanggan') + '</b><span class="badge ' + badgeCls(act.status) + '">' + esc(act.status) + '</span></div>' +
          '<div class="sub" style="margin:6px 0">' + esc(act.id) + ' · ' + act.km + ' km · ' + esc(act.payment) + '</div>' +
          '<div class="li" style="border:0;padding:4px 0"><span class="dot"></span><div class="grow">' + esc(act.pickup.nama) + '</div></div>' +
          '<div class="li" style="border:0;padding:4px 0"><span class="dot r"></span><div class="grow">' + esc(act.dest.nama) + '</div></div>' +
          '<div class="row between mt"><b style="color:var(--b);font-size:16px">' + rupiah(act.fare) + '</b></div>' +
          '<button type="button" class="btn in" data-act="next" data-id="' + esc(act.id) + '">' + (act.status === ST.JEMPUT ? 'Mulai Perjalanan' : 'Selesaikan Perjalanan') + '</button></div>';
      } else if (!u.online) {
        $('#incomingTitle').textContent = 'Pesanan Masuk';
        $('#incoming').innerHTML = '<div class="card empty">Anda sedang offline. Aktifkan tombol Online untuk menerima pesanan.</div>';
      } else {
        $('#incomingTitle').textContent = 'Pesanan Masuk (' + incoming.length + ')';
        $('#incoming').innerHTML = incoming.length ? incoming.map(o => {
          const c = userById(o.userId);
          return '<div class="card"><div class="row between"><b>' + esc(c ? c.nama : 'Pelanggan') + '</b><b style="color:var(--b)">' + rupiah(o.fare) + '</b></div>' +
            '<div class="sub" style="margin:6px 0 10px">' + esc(o.pickup.nama) + ' → ' + esc(o.dest.nama) + ' · ' + o.km + ' km</div>' +
            '<div class="btns"><button type="button" class="btn" style="padding:10px" data-act="accept" data-id="' + esc(o.id) + '">Terima</button>' +
            '<button type="button" class="btn o" style="padding:10px" data-act="reject" data-id="' + esc(o.id) + '">Tolak</button></div></div>';
        }).join('') : '<div class="card empty">Belum ada pesanan masuk untuk ' + (u.jenis === 'motor' ? 'motor' : 'mobil') + '.<br>Halaman ini otomatis diperbarui.</div>';
      }
      $('#history').innerHTML = done.length ? done.slice(-5).reverse().map(o =>
        '<div class="li"><div class="grow"><b>' + esc(o.pickup.nama) + ' → ' + esc(o.dest.nama) + '</b><span class="sub">' + fmtDate(o.createdAt) + (o.rating ? ' · ★ ' + o.rating : '') + '</span></div><b>' + rupiah(o.fare) + '</b></div>').join('')
        : '<div class="empty">Belum ada perjalanan selesai.</div>';
    };
    $('#onlineToggle').addEventListener('change', e => {
      updateUser(u0.id, { online: e.target.checked }); toast(e.target.checked ? 'Anda online' : 'Anda offline'); render(true);
    });
    $('#incoming').addEventListener('click', e => {
      const b = e.target.closest('button[data-act]'); if (!b) return;
      const u = me(), id = b.dataset.id, o = getOrder(id); if (!o) return;
      if (b.dataset.act === 'reject') { addRejected(id); render(true); return; }
      if (b.dataset.act === 'accept') {
        if (o.status !== ST.CARI) { toast('Pesanan sudah tidak tersedia.', 'err'); render(true); return; }
        if (busyDriverIds().includes(u.id)) { toast('Selesaikan pesanan berjalan dulu.', 'err'); return; }
        updateOrder(id, { driverId: u.id, status: ST.JEMPUT }); toast('Pesanan diterima. Jemput pelanggan!', 'ok'); render(true); return;
      }
      if (b.dataset.act === 'next') {
        updateOrder(id, { status: o.status === ST.JEMPUT ? ST.JALAN : ST.SELESAI });
        toast(o.status === ST.JEMPUT ? 'Perjalanan dimulai.' : 'Perjalanan selesai. Pendapatan bertambah!', 'ok'); render(true);
      }
    });
    setInterval(() => render(false), 2000); render(true);
  };

  /* ---------- ADMIN ---------- */
  PAGES.admin = () => {
    const admin = guard(['admin']); if (!admin) return;
    const tabs = ['dashboard', 'pengguna', 'pesanan', 'tarif'];
    let tab = tabs.includes(location.hash.slice(1)) ? location.hash.slice(1) : 'dashboard';
    const uName = id => { const x = userById(id); return x ? x.nama : '-'; };
    const statusBadge = s => '<span class="badge ' + ({ aktif: '', menunggu: 'y', nonaktif: 'rd' }[s] || 'gr') + '">' + esc(s) + '</span>';

    function show() {
      tabs.forEach(t => { $('#tab-' + t).hidden = t !== tab; $('#nav-' + t).classList.toggle('on', t === tab); });
      ({ dashboard: rDash, pengguna: rUsers, pesanan: rOrders, tarif: rTarif })[tab]();
    }
    tabs.forEach(t => $('#nav-' + t).addEventListener('click', e => { e.preventDefault(); tab = t; location.hash = t; show(); }));
    $('#logoutBtn').addEventListener('click', () => confirmDialog('Keluar dari panel admin?', 'Anda akan kembali ke halaman login.', 'Ya, Keluar', logout, 'Batal'));

    /* --- Dashboard --- */
    function rDash() {
      const us = getUsers(), os = getOrders();
      const income = os.filter(o => o.status === ST.SELESAI).reduce((a, o) => a + o.fare, 0);
      $('#statBox').innerHTML = [['Pelanggan', us.filter(x => x.role === 'pelanggan').length], ['Pengemudi', us.filter(x => x.role === 'pengemudi').length],
        ['Pesanan Hari Ini', os.filter(o => isToday(o.createdAt)).length], ['Total Pendapatan', rupiah(income)]]
        .map(s => '<div class="card"><span class="sub">' + s[0] + '</span><b>' + s[1] + '</b></div>').join('');
      const waiting = us.filter(x => x.status === 'menunggu').length;
      $('#waitInfo').innerHTML = waiting ? '<div class="alert info" style="margin:0 0 16px">' + waiting + ' pengemudi menunggu persetujuan. Buka menu Pengguna.</div>' : '';
      $('#recentOrders').innerHTML = os.slice(-5).reverse().map(o =>
        '<tr><td>' + esc(o.id) + '</td><td>' + esc(uName(o.userId)) + '</td><td>' + esc(uName(o.driverId)) + '</td><td>' + esc(o.pickup.nama) + ' → ' + esc(o.dest.nama) +
        '</td><td>' + rupiah(o.fare) + '</td><td><span class="badge ' + badgeCls(o.status) + '">' + esc(o.status) + '</span></td></tr>').join('') || '<tr><td colspan="6" class="empty">Belum ada pesanan.</td></tr>';
    }

    /* --- Pengguna --- */
    function userForm(u) {
      const v = k => esc(u ? (u[k] == null ? '' : u[k]) : '');
      const sel = (k, opts) => opts.map(o => '<option value="' + o + '"' + ((u ? u[k] : opts[0]) === o ? ' selected' : '') + '>' + o + '</option>').join('');
      return '<div class="f"><label>NAMA</label><input name="nama" value="' + v('nama') + '"></div><div class="f"><label>EMAIL</label><input name="email" type="email" value="' + v('email') + '"></div>' +
        '<div class="f"><label>NOMOR HP</label><input name="hp" value="' + v('hp') + '"></div><div class="f"><label>KATA SANDI' + (u ? ' (kosongkan jika tidak diubah)' : '') + '</label><input name="password" type="text"></div>' +
        '<div class="f"><label>PERAN</label><select name="role">' + sel('role', ['pelanggan', 'pengemudi', 'admin']) + '</select></div><div class="f"><label>STATUS</label><select name="status">' + sel('status', ['aktif', 'menunggu', 'nonaktif']) + '</select></div>' +
        '<div class="f"><label>KENDARAAN (khusus pengemudi)</label><input name="kendaraan" value="' + v('kendaraan') + '"></div><div class="f"><label>PLAT NOMOR (khusus pengemudi)</label><input name="plat" value="' + v('plat') + '"></div>' +
        '<div class="f"><label>JENIS (khusus pengemudi)</label><select name="jenis">' + sel('jenis', ['motor', 'mobil']) + '</select></div>';
    }
    function saveUserForm(existing, d) {
      if (d.nama.length < 3) return 'Nama minimal 3 karakter.';
      if (!validEmail(d.email)) return 'Format email tidak valid.';
      if (getUsers().some(x => x.email.toLowerCase() === d.email.toLowerCase() && (!existing || x.id !== existing.id))) return 'Email sudah dipakai.';
      if (!/^\d{9,15}$/.test(d.hp)) return 'Nomor HP 9-15 digit angka.';
      if (!existing && d.password.length < 6) return 'Kata sandi minimal 6 karakter.';
      if (d.password && d.password.length < 6) return 'Kata sandi minimal 6 karakter.';
      if (d.role === 'pengemudi' && (!d.kendaraan || !d.plat)) return 'Kendaraan dan plat wajib diisi untuk pengemudi.';
      const data = { nama: d.nama, email: d.email, hp: d.hp, role: d.role, status: d.status };
      if (d.role === 'pengemudi') Object.assign(data, { kendaraan: d.kendaraan, plat: d.plat.toUpperCase(), jenis: d.jenis });
      if (d.password) data.password = d.password;
      if (existing) updateUser(existing.id, data);
      else setUsers(getUsers().concat(Object.assign({ id: nextUserId(), password: d.password, online: false, rating: 5 }, data)));
      rUsers(); return null;
    }
    function rUsers() {
      const q = $('#uSearch').value.trim().toLowerCase(), r = $('#uRole').value;
      const list = getUsers().filter(x => (!r || x.role === r) && (!q || (x.nama + ' ' + x.email).toLowerCase().includes(q)));
      $('#userRows').innerHTML = list.map(x =>
        '<tr><td>' + x.id + '</td><td><b>' + esc(x.nama) + '</b><div class="sub">' + esc(x.email) + '</div></td><td>' + esc(x.hp) + '</td><td>' + esc(x.role) +
        (x.role === 'pengemudi' ? '<div class="sub">' + esc(x.kendaraan) + ' · ' + esc(x.plat) + '</div>' : '') + '</td><td>' + statusBadge(x.status) + '</td><td>' +
        (x.status === 'menunggu' ? '<button class="btn sm" data-a="approve" data-id="' + x.id + '">Setujui</button>' : '') +
        '<button class="btn sm o" data-a="edit" data-id="' + x.id + '">Ubah</button>' +
        (x.id !== admin.id ? '<button class="btn sm o" data-a="toggle" data-id="' + x.id + '">' + (x.status === 'aktif' ? 'Nonaktifkan' : 'Aktifkan') + '</button><button class="btn sm danger" data-a="del" data-id="' + x.id + '">Hapus</button>' : '') +
        '</td></tr>').join('') || '<tr><td colspan="6" class="empty">Tidak ada pengguna.</td></tr>';
    }
    $('#uSearch').addEventListener('input', rUsers); $('#uRole').addEventListener('change', rUsers);
    $('#addUser').addEventListener('click', () => modalForm('Tambah Pengguna', userForm(null), 'Simpan', d => saveUserForm(null, d)));
    $('#userRows').addEventListener('click', e => {
      const b = e.target.closest('button[data-a]'); if (!b) return;
      const x = userById(+b.dataset.id); if (!x) return;
      if (b.dataset.a === 'approve') { updateUser(x.id, { status: 'aktif' }); toast('Pengemudi disetujui.', 'ok'); rUsers(); }
      if (b.dataset.a === 'toggle') { updateUser(x.id, { status: x.status === 'aktif' ? 'nonaktif' : 'aktif', online: false }); rUsers(); }
      if (b.dataset.a === 'edit') modalForm('Ubah Pengguna', userForm(x), 'Simpan', d => saveUserForm(x, d));
      if (b.dataset.a === 'del') confirmDialog('Hapus pengguna?', 'Akun ' + esc(x.nama) + ' akan dihapus permanen.', 'Ya, Hapus', () => { setUsers(getUsers().filter(y => y.id !== x.id)); toast('Pengguna dihapus.'); rUsers(); }, 'Batal');
    });

    /* --- Pesanan --- */
    function rOrders() {
      const f = $('#oStatus').value;
      const list = getOrders().filter(o => !f || o.status === f).reverse();
      $('#orderRows').innerHTML = list.map(o =>
        '<tr><td>' + esc(o.id) + '</td><td>' + esc(uName(o.userId)) + '</td><td>' + esc(uName(o.driverId)) + '</td><td>' + esc(o.pickup.nama) + ' → ' + esc(o.dest.nama) + '</td><td>' + esc(o.service) +
        '</td><td>' + rupiah(o.fare) + '</td><td><span class="badge ' + badgeCls(o.status) + '">' + esc(o.status) + '</span></td><td>' +
        (ACTIVE.includes(o.status) ? '<button class="btn sm o" data-a="cancel" data-id="' + esc(o.id) + '">Batalkan</button>' : '') +
        '<button class="btn sm danger" data-a="del" data-id="' + esc(o.id) + '">Hapus</button></td></tr>').join('') || '<tr><td colspan="8" class="empty">Tidak ada pesanan.</td></tr>';
    }
    $('#oStatus').addEventListener('change', rOrders);
    $('#orderRows').addEventListener('click', e => {
      const b = e.target.closest('button[data-a]'); if (!b) return;
      const id = b.dataset.id;
      if (b.dataset.a === 'cancel') confirmDialog('Batalkan pesanan?', esc(id) + ' akan dibatalkan.', 'Ya', () => { updateOrder(id, { status: ST.BATAL, fare: 0 }); rOrders(); }, 'Tidak');
      if (b.dataset.a === 'del') confirmDialog('Hapus pesanan?', esc(id) + ' akan dihapus permanen.', 'Ya, Hapus', () => { setOrders(getOrders().filter(o => o.id !== id)); toast('Pesanan dihapus.'); rOrders(); }, 'Batal');
    });

    /* --- Tarif --- */
    function rTarif() {
      const t = getTarif();
      $('#tarifForm').innerHTML = Object.keys(t).map(k => '<div class="card"><b>' + esc(t[k].nama) + '</b>' +
        '<label>TARIF DASAR (Rp)</label><input type="number" min="0" step="500" name="' + k + '_dasar" value="' + t[k].dasar + '">' +
        '<label>TARIF PER KM (Rp)</label><input type="number" min="0" step="500" name="' + k + '_perKm" value="' + t[k].perKm + '"></div>').join('');
    }
    $('#saveTarif').addEventListener('click', () => {
      const t = getTarif(); let ok = true;
      Object.keys(t).forEach(k => {
        const a = +$('[name="' + k + '_dasar"]').value, b = +$('[name="' + k + '_perKm"]').value;
        if (!(a >= 0) || !(b >= 0) || isNaN(a) || isNaN(b)) ok = false; else { t[k].dasar = a; t[k].perKm = b; }
      });
      if (!ok) { toast('Tarif harus berupa angka 0 atau lebih.', 'err'); return; }
      save(KEY.tarif, t); toast('Tarif disimpan.', 'ok');
    });
    show();
  };

  /* ==================== START ==================== */
  document.addEventListener('DOMContentLoaded', () => {
    seed();
    const page = document.body.getAttribute('data-page');
    if (PAGES[page]) PAGES[page]();
  });
})();
