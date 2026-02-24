/**
 * SIODGJ - Main Application Logic
 * Init, walkthrough, role selection, navigation, live time
 */

// ============ INITIALIZATION ============
window.onload = () => {
  console.log("App loading...");

  // 1. Initial Data check/sync (Starts listeners)
  if (typeof loadDataFromFirestore === 'function') loadDataFromFirestore();

  // 2. Background seeding and maintenance
  (async () => {
    try {
      if (typeof seedDefaultUsers === 'function') await seedDefaultUsers();
      if (typeof seedDefaultData === 'function') await seedDefaultData();
    } catch (e) {
      console.error("Background tasks failed:", e);
    }
  })();

  // 3. UI Entrance (Don't wait for seeding)
  const session = getCurrentSession();
  setTimeout(() => {
    document.getElementById('splash').classList.add('hide');

    if (session) {
      document.getElementById('walkthrough').classList.add('hide');
      document.getElementById('role-select').classList.add('hide');
      enterApp(session.role, session.nama, ROLE_INFO[session.role]?.icon || '👤');
      showToast(`✅ Selamat datang kembali, ${session.nama}!`, 'success');
    } else {
      renderWalkthrough();
    }
  }, 1000);

  // Live time updater
  setInterval(() => {
    const now = new Date();
    const el = document.getElementById('live-time');
    if (el) {
      el.textContent =
        now.getHours().toString().padStart(2, '0') + ':' +
        now.getMinutes().toString().padStart(2, '0') + ':' +
        now.getSeconds().toString().padStart(2, '0');
    }
  }, 1000);
};

// ============ WALKTHROUGH ============
function renderWalkthrough() {
  const s = WT_STEPS[wtStep];
  document.getElementById('wt-icon').textContent = s.icon;
  document.getElementById('wt-title').textContent = s.title;
  document.getElementById('wt-desc').textContent = s.desc;
  const dots = document.getElementById('wt-dots');
  dots.innerHTML = WT_STEPS.map((_, i) => `<div class="wt-dot ${i === wtStep ? 'active' : ''}"></div>`).join('');
  document.getElementById('wt-next').textContent = wtStep === WT_STEPS.length - 1 ? 'Mulai Aplikasi ✓' : 'Selanjutnya →';
}

function nextWalkthrough() {
  if (wtStep < WT_STEPS.length - 1) {
    wtStep++;
    renderWalkthrough();
  } else {
    skipWalkthrough();
  }
}

function skipWalkthrough() {
  document.getElementById('walkthrough').classList.add('hide');
  // Role select is already visible
}

// ============ ROLE SELECT ============
function selectRole(role, name, icon) {
  currentRole = role;
  document.getElementById('role-select').classList.add('hide');

  // Show auth page instead of going directly to app
  showAuthPage(role);
}

// ============ ENTER APP (after auth) ============
function enterApp(role, name, icon) {
  // Always prioritize session data if available
  const session = getCurrentSession();
  if (session) {
    currentRole = session.role;
  } else {
    currentRole = role;
  }

  document.getElementById('role-select').classList.add('hide');
  document.getElementById('auth-page').classList.remove('show');
  document.getElementById('app').classList.add('show');

  // Start real-time sync
  if (typeof startGlobalRealTimeSync === 'function') startGlobalRealTimeSync();

  // Sync all user UI elements from session
  syncUserUI();

  buildNav(currentRole);
  initPages();
  showPage('dashboard');
}

/**
 * Synchronize all User-specific UI (Sidebar, Topbar, etc) with current session
 */
function syncUserUI() {
  const session = getCurrentSession();
  if (!session) return;

  const role = session.role;
  const name = session.nama;
  const icon = ROLE_INFO[role]?.icon || '👤';

  // Update Sidebar
  const userNameEl = document.getElementById('user-name');
  const userRoleEl = document.getElementById('user-role');
  const userAvatarEl = document.getElementById('user-avatar');

  if (userNameEl) userNameEl.textContent = name;
  if (userRoleEl) userRoleEl.textContent = ROLE_INFO[role]?.label || role;

  if (userAvatarEl) {
    if (session.photo) {
      userAvatarEl.innerHTML = `<img src="${session.photo}" style="width:28px;height:28px;object-fit:cover;border-radius:50%;">`;
    } else {
      userAvatarEl.textContent = icon;
    }
  }

  // Hide chat icon for unauthorized roles
  const chatBtn = document.querySelector('button[onclick="openModal(\'modal-chat\')"]');
  if (chatBtn) {
    chatBtn.style.display = (role === 'dokter' || role === 'pemegang' || role === 'admin') ? 'flex' : 'none';
  }
}

// ============ NAVIGATION ============
function buildNav(role) {
  const navs = ROLE_NAVS[role];
  const sidebarNav = document.getElementById('sidebar-nav');
  const mobileNav = document.getElementById('mobile-nav');

  sidebarNav.innerHTML = '<div class="nav-section">Menu Utama</div>' +
    navs.map(n => `<div class="nav-item" id="nav-${n.page}" onclick="showPage('${n.page}')"><span class="nav-icon">${n.icon}</span>${n.label}</div>`).join('');

  mobileNav.innerHTML = navs.slice(0, 6).map(n =>
    `<div class="mobile-nav-item" id="mnav-${n.page}" onclick="showPage('${n.page}')"><div class="m-icon">${n.icon}</div><div class="m-label">${n.label}</div></div>`
  ).join('');

  // Hide/show dashboard widgets based on role
  const stokWidget = document.getElementById('dash-stok-widget');
  const stokAlertCard = document.getElementById('dash-stok-alert-card');
  const pmoStat = document.getElementById('dash-pmo-stat');
  const jemputStat = document.getElementById('dash-jemput-stat');
  const pmoListCard = document.getElementById('dash-pmo-list-card');
  const chartCard = document.getElementById('dash-chart-card');

  const isFullDashboard = (role === 'pemegang' || role === 'admin' || role === 'petugas');
  const isCaretaker = (role === 'pendamping');

  if (stokWidget) stokWidget.style.display = isFullDashboard ? 'block' : 'none';
  if (stokAlertCard) stokAlertCard.style.display = isFullDashboard ? 'block' : 'none';
  if (pmoStat) pmoStat.style.display = (isFullDashboard || isCaretaker) ? 'block' : 'none';
  if (jemputStat) jemputStat.style.display = (isFullDashboard || isCaretaker) ? 'block' : 'none';
  if (pmoListCard) pmoListCard.style.display = (isFullDashboard || isCaretaker) ? 'block' : 'none';
  if (chartCard) chartCard.style.display = isFullDashboard ? 'block' : 'none';
}

function showPage(page) {
  // If the page is "chat" or "notifikasi", open the modal instead
  if (page === 'chat') {
    openModal('modal-chat');
    return;
  }
  if (page === 'notifikasi') {
    openModal('modal-notif');
    return;
  }

  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.querySelectorAll('.mobile-nav-item').forEach(n => n.classList.remove('active'));

  const el = document.getElementById('page-' + page);
  if (el) el.classList.add('active');
  const nav = document.getElementById('nav-' + page);
  if (nav) nav.classList.add('active');
  const mnav = document.getElementById('mnav-' + page);
  if (mnav) mnav.classList.add('active');

  const titles = {
    dashboard: 'Dashboard',
    'data-pasien': 'Pasien',
    'patient-detail': 'Detail Pasien',
    pmo: 'Monitor PMO',
    chat: 'Chat',
    notifikasi: 'Notifikasi',
    'stok-obat': 'Stok Obat',
    'jadwal-ambil': 'Jadwal Antar',
    laporan: 'Laporan',
    profil: 'Profil',
  };
  document.getElementById('topbar-title').textContent = titles[page] || page;
  currentPage = page;
  if (page === 'profil') renderProfil();
  closeSidebar();
}

let initTimeout = null;
function initPages() {
  if (initTimeout) clearTimeout(initTimeout);
  initTimeout = setTimeout(() => {
    console.log("Re-rendering all pages (Debounced)...");
    renderDashboardPatients();
    renderDashboardPMO();
    renderBarChart();
    renderStockAlerts();
    renderFullPatients();
    renderPMOFull();
    renderChat();
    renderNotifications();
    renderStokFull();
    renderPickupSchedule();
    renderLaporan();
    renderProfil();
  }, 100);
}
