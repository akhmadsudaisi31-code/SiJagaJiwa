/**
 * SIODGJ - Main Application Logic
 * Init, walkthrough, role selection, navigation, live time
 */

// ============ INITIALIZATION ============
window.onload = () => {
  console.log("App loading...");

  // 1. Initial Data check/sync (Starts listeners)
  if (typeof loadDataFromFirestore === "function") loadDataFromFirestore();

  // 2. Background seeding and maintenance
  (async () => {
    try {
      //  if (typeof seedDefaultUsers === 'function') await seedDefaultUsers();
      //  if (typeof seedDefaultData === 'function') await seedDefaultData();
    } catch (e) {
      console.error("Background tasks failed:", e);
    }
  })();

  // 3. UI Entrance (Don't wait for seeding)
  const session = getCurrentSession();
  setTimeout(() => {
    const splash = document.getElementById("splash");
    if (splash) splash.classList.add("hide");

    if (session) {
      const walk = document.getElementById("walkthrough");
      const roleSel = document.getElementById("role-select");
      if (walk) walk.classList.add("hide");
      if (roleSel) roleSel.classList.add("hide");
      enterApp(
        session.role,
        session.nama,
        ROLE_INFO[session.role]?.icon || "👤",
      );
      showToast(`✅ Selamat datang kembali, ${session.nama}!`, "success");
    } else {
      renderWalkthrough();
    }
  }, 1000);

  // Live time updater
  setInterval(() => {
    const now = new Date();
    const el = document.getElementById("live-time");
    if (el) {
      el.textContent =
        now.getHours().toString().padStart(2, "0") +
        ":" +
        now.getMinutes().toString().padStart(2, "0") +
        ":" +
        now.getSeconds().toString().padStart(2, "0");
    }
  }, 1000);
};

// ============ WALKTHROUGH ============
function renderWalkthrough() {
  const s = WT_STEPS[wtStep];
  document.getElementById("wt-icon").textContent = s.icon;
  document.getElementById("wt-title").textContent = s.title;
  document.getElementById("wt-desc").textContent = s.desc;
  const dots = document.getElementById("wt-dots");
  dots.innerHTML = WT_STEPS.map(
    (_, i) => `<div class="wt-dot ${i === wtStep ? "active" : ""}"></div>`,
  ).join("");
  document.getElementById("wt-next").textContent =
    wtStep === WT_STEPS.length - 1 ? "Mulai Aplikasi ✓" : "Selanjutnya →";
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
  document.getElementById("walkthrough").classList.add("hide");
  // Role select is already visible
}

// ============ ROLE SELECT ============
function selectRole(role, name, icon) {
  currentRole = role;
  document.getElementById("role-select").classList.add("hide");

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

  document.getElementById("role-select").classList.add("hide");
  document.getElementById("auth-page").classList.remove("show");
  document.getElementById("app").classList.add("show");

  // Start real-time sync
  if (typeof startGlobalRealTimeSync === "function") startGlobalRealTimeSync();

  // Sync all user UI elements from session
  syncUserUI();

  buildNav(currentRole);
  initPages();

  // Always redirect to dashboard on login per user request
  localStorage.removeItem('sijagajiwa_last_page');
  showPage("dashboard");

  // Initialize push notifications in background
  initPushNotifications();
}

/**
 * Synchronize all User-specific UI (Sidebar, Topbar, etc) with current session
 */
function syncUserUI() {
  const session = getCurrentSession();
  if (!session) return;

  const role = session.role;
  const name = session.nama;
  const icon = ROLE_INFO[role]?.icon || "👤";

  // Update Sidebar
  const userNameEl = document.getElementById("user-name");
  const userRoleEl = document.getElementById("user-role");
  const userAvatarEl = document.getElementById("user-avatar");

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
  const chatBtn = document.querySelector(
    "button[onclick=\"openModal('modal-chat')\"]",
  );
  if (chatBtn) {
    chatBtn.style.display =
      role === "dokter" || role === "pemegang" || role === "admin"
        ? "flex"
        : "none";
  }
}

// ============ NAVIGATION ============
function buildNav(role) {
  const navs = ROLE_NAVS[role];
  const sidebarNav = document.getElementById("sidebar-nav");
  const mobileNav = document.getElementById("mobile-nav");

  sidebarNav.innerHTML =
    '<div class="nav-section">Menu Utama</div>' +
    navs
      .map(
        (n) =>
          `<div class="nav-item" id="nav-${n.page}" onclick="showPage('${n.page}')"><span class="nav-icon">${n.icon}</span>${n.label}</div>`,
      )
      .join("");

  let mobileNavs = navs;
  if (role === 'petugas') {
    // Only show Dashboard, Pasien, PMO, and Jadwal in mobile nav for Petugas
    mobileNavs = navs.filter(n => ['dashboard', 'data-pasien', 'pmo', 'jadwal-ambil'].includes(n.page));
  } else {
    // Other roles might have up to 6 icons (though 4-5 is standard)
    mobileNavs = navs.slice(0, 6);
  }

  mobileNav.innerHTML = mobileNavs
    .map(
      (n) =>
        `<div class="mobile-nav-item" id="mnav-${n.page}" onclick="showPage('${n.page}')"><div class="m-icon">${n.icon}</div><div class="m-label">${n.label}</div></div>`,
    )
    .join("");

  // Hide/show dashboard widgets based on role
  const stokWidget = document.getElementById("dash-stok-widget");
  const stokAlertCard = document.getElementById("dash-stok-alert-card");
  const pmoStat = document.getElementById("dash-pmo-stat");
  const jemputStat = document.getElementById("dash-jemput-stat");
  const pmoListCard = document.getElementById("dash-pmo-list-card");
  const chartCard = document.getElementById("dash-chart-card");
  const pasienStat = document.getElementById("dash-pasien-stat");
  const patientCard = document.getElementById("dash-patient-card");
  const gejalaBaruCard = document.getElementById("dash-gejala-baru-card");

  const isFullDashboard =
    role === "pemegang" || role === "admin" || role === "petugas";
  const isCaretaker = role === "pendamping";

  const hasDrugAccess = role === "pemegang" || role === "admin";
  
  if (gejalaBaruCard) {
    gejalaBaruCard.style.display = role === "pemegang" || role === "admin" ? "block" : "none";
  }

  if (stokWidget) stokWidget.style.display = hasDrugAccess ? "block" : "none";
  if (stokAlertCard)
    stokAlertCard.style.display = hasDrugAccess ? "block" : "none";
  if (pmoStat)
    pmoStat.style.display = isFullDashboard || isCaretaker ? "block" : "none";
  if (jemputStat)
    jemputStat.style.display =
      isFullDashboard || isCaretaker ? "block" : "none";
  if (pmoListCard)
    pmoListCard.style.display =
      isFullDashboard || isCaretaker ? "block" : "none";
  if (chartCard) chartCard.style.display = isFullDashboard ? "block" : "none";
  if (pasienStat) pasienStat.style.display = (isFullDashboard || role === "dokter") ? "block" : "none";
  if (patientCard) patientCard.style.display = (isFullDashboard || role === "dokter") ? "block" : "none";
}

function showPage(page) {
  // If the page is "chat" or "notifikasi", open the modal instead
  if (page === "chat") {
    openModal("modal-chat");
    return;
  }
  if (page === "notifikasi") {
    openModal("modal-notif");
    return;
  }

  document
    .querySelectorAll(".page")
    .forEach((p) => p.classList.remove("active"));
  document
    .querySelectorAll(".nav-item")
    .forEach((n) => n.classList.remove("active"));
  document
    .querySelectorAll(".mobile-nav-item")
    .forEach((n) => n.classList.remove("active"));

  const el = document.getElementById("page-" + page);
  if (el) el.classList.add("active");
  const nav = document.getElementById("nav-" + page);
  if (nav) nav.classList.add("active");
  const mnav = document.getElementById("mnav-" + page);
  if (mnav) mnav.classList.add("active");

  const titles = {
    dashboard: "Dashboard",
    "data-pasien": "Pasien",
    "patient-detail": "Detail Pasien",
    pmo: "Monitor PMO",
    chat: "Chat",
    notifikasi: "Notifikasi",
    "stok-obat": "Stok Obat",
    "jadwal-ambil": "Jadwal Antar",
    laporan: "Laporan",
    profil: "Profil",
  };
  document.getElementById("topbar-title").textContent = titles[page] || page;
  currentPage = page;
  // Persist last page for session restore on reload
  if (page !== 'patient-detail') {
    localStorage.setItem('sijagajiwa_last_page', page);
  }
  if (page === "profil") renderProfil();
  closeSidebar();
}

// ============ PUSH NOTIFICATIONS INIT ============
async function initPushNotifications() {
  if (!('serviceWorker' in navigator) || !('Notification' in window)) return;

  try {
    // 1. Request permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return;

    // 2. Get active SW registration
    const registration = await navigator.serviceWorker.ready;

    // 3. Post session to SW so it can poll for notifs in background
    const session = getCurrentSession();
    if (session && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'SAVE_SESSION',
        session: { username: session.username, role: session.role }
      });
    }

    // 4. Register Periodic Background Sync if supported
    if ('periodicSync' in registration) {
      try {
        await registration.periodicSync.register('check-notifs', {
          minInterval: 5 * 60 * 1000 // Every 5 minutes minimum
        });
        console.log('[Push] Periodic background sync registered');
      } catch (e) {
        console.warn('[Push] Periodic sync not supported:', e);
      }
    }

    // 5. Listen for messages from SW (e.g. navigate-to-page from notif click)
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data?.type === 'NAVIGATE_TO' && event.data.page) {
        showPage(event.data.page);
      }
    });

    console.log('[Push] Push notifications initialized');
  } catch (e) {
    console.warn('[Push] Could not initialize push notifications:', e);
  }
}

let initTimeout = null;
function initPages() {
  if (initTimeout) clearTimeout(initTimeout);
  initTimeout = setTimeout(() => {
    console.log("Re-rendering all pages (Debounced)...");
    renderDashboardPatients();
    renderDashboardPMO();
    if(typeof renderDashboardGejalaBaru === 'function') renderDashboardGejalaBaru();
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
