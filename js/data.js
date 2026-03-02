/**
 * SIODGJ - Data & Constants
 * Role configs, walkthrough steps. Data from Firestore only (no mock data).
 */

// ============ PERSISTENT DATA (synced from Firestore) ============
let PATIENTS = [];
let DRUGS = [];
let PICKUPS = [];
let NOTIFS = [];
let CHATS = {}; // Will be used per-conversation
let CHAT_UNSUBSCRIBE = null; // Real-time listener
let PATIENT_DETAIL_UNSUBSCRIBE = null; // Real-time listener for pmo_logs in detail view

let dataLoaded = false;
let GLOBAL_UNSUBSCRIBES = [];

// Track initial synchronization for each critical collection
const CRITICAL_COLLECTIONS = ["patients", "users", "drugs", "pickups", "notifs", "chats"];
const SYNC_STATUS = {
  isReady: false,
  collections: {}
};
CRITICAL_COLLECTIONS.forEach(c => SYNC_STATUS.collections[c] = false);

/**
 * Promise that resolves when all critical collections have received their first snapshot
 */
function waitForInitialSync() {
  return new Promise((resolve) => {
    if (SYNC_STATUS.isReady) return resolve();
    
    const checkInterval = setInterval(() => {
      const allLoaded = CRITICAL_COLLECTIONS.every(c => SYNC_STATUS.collections[c]);
      if (allLoaded) {
        clearInterval(checkInterval);
        SYNC_STATUS.isReady = true;
        resolve();
      }
    }, 100);

    // Timeout fallback after 5 seconds to avoid infinite loading if a collection is empty/denied
    setTimeout(() => {
      if (!SYNC_STATUS.isReady) {
        console.warn("Sync timeout reached. Resolving with partial data.");
        clearInterval(checkInterval);
        SYNC_STATUS.isReady = true;
        resolve();
      }
    }, 5000);
  });
}

// Start real-time synchronization for all collections
function startGlobalRealTimeSync() {
  // Clean up existing listeners if any
  stopGlobalRealTimeSync();

  console.log("Starting global real-time synchronization...");

  const collections = [
    { name: "patients", setter: (data) => (PATIENTS = data) },
    { name: "drugs", setter: (data) => (DRUGS = data) },
    { name: "pickups", setter: (data) => (PICKUPS = data) },
    { name: "notifs", setter: (data) => (NOTIFS = data) },
    { name: "users", setter: (data) => {
        // Update local session if current user info changes
        const session = getCurrentSession();
        const myProfile = data.find(u => u.firebaseId === session?.username);
        if (myProfile && JSON.stringify(myProfile) !== JSON.stringify(session)) {
            console.log("Profile updated via real-time sync, updating session...");
            const newSession = { ...session, ...myProfile };
            localStorage.setItem('siodgj_session', JSON.stringify(newSession));
            if (typeof syncUserUI === 'function') syncUserUI();
        }
    }},
    { name: "chats", setter: (data) => (CHATS = data) },
  ];

  collections.forEach((col) => {
    const unsub = db.collection(col.name).onSnapshot(
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          firebaseId: doc.id,
          ...doc.data(),
        }));
        col.setter(data);
        console.log(`Real-time update: ${col.name} (${data.length} items)`);
        
        // Mark as loaded for initial sync tracking
        if (SYNC_STATUS.collections.hasOwnProperty(col.name)) {
          SYNC_STATUS.collections[col.name] = true;
        }

        // Trigger UI update if app is initialized
        if (typeof initPages === "function") {
          initPages();
        }
      },
      (err) => {
        console.error(`Error in real-time sync for ${col.name}:`, err);
      }
    );
    GLOBAL_UNSUBSCRIBES.push(unsub);
  });

  dataLoaded = true;
}

function stopGlobalRealTimeSync() {
  console.log("Stopping global real-time synchronization...");
  GLOBAL_UNSUBSCRIBES.forEach((unsub) => unsub());
  GLOBAL_UNSUBSCRIBES = [];
  dataLoaded = false;
}

// Deprecated: Use startGlobalRealTimeSync instead
async function loadDataFromFirestore() {
  startGlobalRealTimeSync();
}

/**
 * Reset all dynamic data collections to empty (Purge all records)
 * DANGER: This will permanently delete data from Firestore
 */
async function resetDatabaseToEmpty(isSilent = false) {
  if (!isSilent) {
    const isConfirmed = window.confirm("⚠️ Anda akan menghapus data operasional (Pasien, PMO, Jadwal, Stok, Chat, & Notifikasi). Akun pengguna TETAP TERJAGA. Lanjutkan?");
    if (!isConfirmed) return;
  }
  
  const collections = ["patients", "pickups", "notifs", "chats", "drugs"];
  console.log("Starting database reset (preserving users)...");
  showToast("⏳ Sedang menghapus data operasional...", "info");
  
  for (const colName of collections) {
    try {
      const snapshot = await db.collection(colName).get();
      
      for (const doc of snapshot.docs) {
        // Handle Subcollections first
        if (colName === 'patients') {
          const logs = await doc.ref.collection('pmo_logs').get();
          const logBatch = db.batch();
          logs.forEach(l => logBatch.delete(l.ref));
          await logBatch.commit();
        }
        if (colName === 'chats') {
          const msgs = await doc.ref.collection('messages').get();
          const msgBatch = db.batch();
          msgs.forEach(m => msgBatch.delete(m.ref));
          await msgBatch.commit();
        }

        // Delete parent doc
        await doc.ref.delete();
      }
      
      console.log(`✅ Collection ${colName} (and subcollections) cleared.`);
    } catch (err) {
      console.error(`❌ Failed to clear collection ${colName}:`, err);
    }
  }
  
  showToast("✅ Berhasil! Data operasional telah dibersihkan.", "success");
  setTimeout(() => window.location.reload(), 2000);
}

// Function to replace localStorage saves
async function saveToStorage() {
  // We no longer blindly save arrays to storage.
  // Individual write functions in pages.js will update Firestore directly.
  console.log(
    "saveToStorage called but ignored. Data should be written directly to Firestore.",
  );
}

// ============ APP STATE ============
let currentRole = "dokter";
let currentPage = "dashboard";
let wtStep = 0;
let selectedContact = "dr. Moslihin";

// ============ WALKTHROUGH STEPS ============
const WT_STEPS = [
  {
    icon: "🏥",
    title: "Selamat Datang di SiJaga Jiwa",
    desc: "Jaga Jiwa, Jaga Keluarga. Sistem terintegrasi untuk pencatatan, pelaporan, dan pemantauan data Orang Dengan Gangguan Jiwa secara real-time.",
  },
  {
    icon: "👥",
    title: "Pencatatan Data Pasien",
    desc: "Catat dan pantau data semua pasien ODGJ dalam satu sistem yang dapat diakses oleh pasien, pendamping, petugas kesehatan, dokter dan pemegang program jiwa.",
  },
  {
    icon: "💊",
    title: "Pemantauan Minum Obat (PMO)",
    desc: "Monitor kepatuhan minum obat pasien secara langsung selama 24 jam oleh dokter, petugas kesehatan dan pemegang program jiwa.",
  },
  {
    icon: "💬",
    title: "Chat Langsung dengan Dokter",
    desc: "Pasien dan pendamping dapat langsung terhubung dengan dokter melalui fitur chat yang tersedia di aplikasi.",
  },
  {
    icon: "🟢",
    title: "Data Real-Time",
    desc: "Pantau dan laporkan kondisi pasien ODGJ secara real-time. Semua data diperbarui otomatis tanpa delay.",
  },
  {
    icon: "📦",
    title: "Pengingat Stok Obat",
    desc: "Sistem memberi notifikasi otomatis saat obat hampir habis (Out of Stock), sehingga obat tidak sampai putus.",
  },
  {
    icon: "🚗",
    title: "Antar-Jemput Obat Terjadwal",
    desc: "Layanan antar-jemput obat oleh pendamping lebih efisien karena sudah terjadwal dalam sistem.",
  },
];

// ============ ROLE-BASED NAVIGATION ============
const ROLE_NAVS = {
  pendamping: [
    { icon: "🏠", label: "Dashboard", page: "dashboard" },
    { icon: "💊", label: "PMO", page: "pmo" },
    { icon: "🚗", label: "Jadwal", page: "jadwal-ambil" },
    { icon: "⚙️", label: "Profil", page: "profil" },
  ],
  petugas: [
    { icon: "🏠", label: "Dashboard", page: "dashboard" },
    { icon: "👥", label: "Pasien", page: "data-pasien" },
    { icon: "💊", label: "PMO", page: "pmo" },
    { icon: "🚗", label: "Jadwal", page: "jadwal-ambil" },
    { icon: "🔔", label: "Notifikasi", page: "notifikasi" },
    { icon: "⚙️", label: "Profil", page: "profil" },
  ],
  dokter: [
    { icon: "🏠", label: "Dashboard", page: "dashboard" },
    { icon: "👥", label: "Pasien", page: "data-pasien" },
    { icon: "💬", label: "Chat", page: "chat" },
  ],
  pemegang: [
    { icon: "🏠", label: "Dashboard", page: "dashboard" },
    { icon: "👥", label: "Pasien", page: "data-pasien" },
    { icon: "💊", label: "PMO", page: "pmo" },
    { icon: "📊", label: "Laporan", page: "laporan" },
    { icon: "📦", label: "Stok Obat", page: "stok-obat" },
    { icon: "🚗", label: "Jadwal", page: "jadwal-ambil" },
    { icon: "🔔", label: "Notifikasi", page: "notifikasi" },
    { icon: "⚙️", label: "Profil", page: "profil" },
  ],
  admin: [
    { icon: "🏠", label: "Dashboard", page: "dashboard" },
    { icon: "👥", label: "Pasien", page: "data-pasien" },
    { icon: "💊", label: "PMO", page: "pmo" },
    { icon: "📊", label: "Laporan", page: "laporan" },
    { icon: "📦", label: "Stok Obat", page: "stok-obat" },
    { icon: "🚗", label: "Jadwal", page: "jadwal-ambil" },
    { icon: "🔔", label: "Notifikasi", page: "notifikasi" },
    { icon: "💬", label: "Chat", page: "chat" },
    { icon: "👤", label: "Profil", page: "profil" },
  ],
};

// ============ ROLE INFO ============
const ROLE_INFO = {
  pendamping: { name: "Keluarga Pasien", icon: "👨‍👩‍👧", label: "Pendamping" },
  petugas: {
    name: "Ns. Sari Wulandari",
    icon: "🏥",
    label: "Petugas Kesehatan",
  },
  dokter: { name: "dr. Moslihin", icon: "👨‍⚕️", label: "Dokter" },
  pemegang: {
    name: "Kemenkes Program",
    icon: "📊",
    label: "Pemegang Program Jiwa",
  },
  admin: {
    name: "Super Administrator",
    icon: "👑",
    label: "Super Admin",
  },
};

// ============ REGISTRATION FIELD CONFIG PER ROLE ============
const REGISTER_FIELDS = {
  pendamping: [
    {
      name: "nama",
      label: "Nama Lengkap",
      type: "text",
      placeholder: "Nama lengkap Anda",
      required: true,
    },
    {
      name: "nik",
      label: "NIK",
      type: "text",
      placeholder: "16 digit NIK",
      required: true,
    },
    {
      name: "hubungan",
      label: "Hubungan dengan Pasien",
      type: "select",
      options: [
        "- Pilih Hubungan -",
        "Suami/Istri",
        "Orang Tua",
        "Anak",
        "Saudara",
        "Kerabat",
        "Kader",
        "Perangkat Desa",
        "Lainnya",
      ],
      required: false,
    },
    {
      name: "alamat",
      label: "Alamat",
      type: "textarea",
      placeholder: "Alamat lengkap...",
      required: true,
    },
    {
      name: "desa",
      label: "Desa / Wilayah",
      type: "select",
      options: [
        "Alas Rajah", "Bates", "Blega", "Blega Oloh", "Gigir", "Kajjan", 
        "Kampao", "Karang Gayam", "Karang Nangkah", "Karang Panasan", 
        "Karpote", "Ko'olan", "Lomaer", "Lombang Dajah", "Lombang Laok", 
        "Nyor Manes", "Pangeran Gedungan", "Panjalinan", "Rosep"
      ],
      required: true,
    },
    {
      name: "no_hp",
      label: "No. HP",
      type: "tel",
      placeholder: "08xxxxxxxxxx",
      required: true,
    },
    {
      name: "username",
      label: "Username",
      type: "text",
      placeholder: "Username login",
      required: true,
    },
    {
      name: "password",
      label: "Password",
      type: "password",
      placeholder: "Minimal 6 karakter",
      required: true,
    },
    {
      name: "password_confirm",
      label: "Konfirmasi Password",
      type: "password",
      placeholder: "Ulangi password",
      required: true,
    },
  ],
  petugas: [
    {
      name: "nama",
      label: "Nama Lengkap",
      type: "text",
      placeholder: "Nama lengkap Anda",
      required: true,
    },
    {
      name: "nip",
      label: "NIP",
      type: "text",
      placeholder: "Nomor Induk Pegawai",
      required: true,
    },
    {
      name: "instansi",
      label: "Puskesmas / Instansi",
      type: "text",
      placeholder: "Nama puskesmas/instansi",
      required: true,
    },
    {
      name: "desa",
      label: "Wilayah Tugas (Desa)",
      type: "select",
      options: [
        "Alas Rajah", "Bates", "Blega", "Blega Oloh", "Gigir", "Kajjan", 
        "Kampao", "Karang Gayam", "Karang Nangkah", "Karang Panasan", 
        "Karpote", "Ko'olan", "Lomaer", "Lombang Dajah", "Lombang Laok", 
        "Nyor Manes", "Pangeran Gedungan", "Panjalinan", "Rosep"
      ],
      required: true,
    },
    {
      name: "no_hp",
      label: "No. HP",
      type: "tel",
      placeholder: "08xxxxxxxxxx",
      required: true,
    },
    {
      name: "username",
      label: "Username",
      type: "text",
      placeholder: "Username untuk login",
      required: true,
    },
    {
      name: "password",
      label: "Password",
      type: "password",
      placeholder: "Minimal 6 karakter",
      required: true,
    },
    {
      name: "password_confirm",
      label: "Konfirmasi Password",
      type: "password",
      placeholder: "Ulangi password",
      required: true,
    },
  ],
  dokter: [
    {
      name: "nama",
      label: "Nama Lengkap",
      type: "text",
      placeholder: "Nama lengkap Anda",
      required: true,
    },
    {
      name: "nip",
      label: "NIP",
      type: "text",
      placeholder: "Nomor Induk Pegawai",
      required: true,
    },
    {
      name: "spesialisasi",
      label: "Spesialisasi",
      type: "select",
      options: ["Psikiater", "Dokter Umum", "Neurolog", "Psikolog Klinis"],
      required: true,
    },
    {
      name: "instansi",
      label: "RS / Puskesmas",
      type: "text",
      placeholder: "Nama rumah sakit/puskesmas",
      required: true,
    },
    {
      name: "no_hp",
      label: "No. HP",
      type: "tel",
      placeholder: "08xxxxxxxxxx",
      required: true,
    },
    {
      name: "username",
      label: "Username",
      type: "text",
      placeholder: "Username untuk login",
      required: true,
    },
    {
      name: "password",
      label: "Password",
      type: "password",
      placeholder: "Minimal 6 karakter",
      required: true,
    },
    {
      name: "password_confirm",
      label: "Konfirmasi Password",
      type: "password",
      placeholder: "Ulangi password",
      required: true,
    },
  ],
  pemegang: [
    {
      name: "nama",
      label: "Nama Lengkap",
      type: "text",
      placeholder: "Nama lengkap Anda",
      required: true,
    },
    {
      name: "nip",
      label: "NIP",
      type: "text",
      placeholder: "Nomor Induk Pegawai",
      required: true,
    },
    {
      name: "instansi",
      label: "Instansi",
      type: "text",
      placeholder: "Nama instansi/dinas",
      required: true,
    },
    {
      name: "jabatan",
      label: "Jabatan",
      type: "text",
      placeholder: "Jabatan Anda",
      required: true,
    },
    {
      name: "no_hp",
      label: "No. HP",
      type: "tel",
      placeholder: "08xxxxxxxxxx",
      required: true,
    },
    {
      name: "username",
      label: "Username",
      type: "text",
      placeholder: "Username untuk login",
      required: true,
    },
    {
      name: "password",
      label: "Password",
      type: "password",
      placeholder: "Minimal 6 karakter",
      required: true,
    },
    {
      name: "password_confirm",
      label: "Konfirmasi Password",
      type: "password",
      placeholder: "Ulangi password",
      required: true,
    },
  ],
};
