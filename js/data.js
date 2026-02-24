/**
 * SIODGJ - Data & Constants
 * Mock data, role configs, walkthrough steps
 */

// ============ ORIGINAL DATA ============
const DEFAULT_PATIENTS = [
  { id: 101, name: "Siti Aminah", age: 45, gender: "P", diagnosis: "Skizofrenia", status: "monitor", pendamping: "Ibu Siti Rahayu", obat: "Haloperidol 5mg", pmo: 75, nik: "3526010101750001", alamat: "Desa Alas Rajah", createdAt: "2024-01-15T10:00:00Z" },
  { id: 102, name: "Ahmad Fauzi", age: 32, gender: "L", diagnosis: "Bipolar", status: "stable", pendamping: "Bapak Ahmad Hidayat", obat: "Lithium 400mg", pmo: 90, nik: "3526010203850001", alamat: "Desa Bates", createdAt: "2024-02-20T11:00:00Z" },
  { id: 103, name: "Bambang Sugeng", age: 50, gender: "L", diagnosis: "Skizofrenia", status: "monitor", pendamping: "Sdr. Budi Santoso", obat: "Clozapine 25mg", pmo: 60, nik: "3526010305700001", alamat: "Desa Blega", createdAt: "2024-04-05T09:00:00Z" },
  { id: 104, name: "Dewi Sartika", age: 28, gender: "P", diagnosis: "Depresi Berat", status: "stable", pendamping: "Ibu Laila Sari", obat: "Fluoxetine 20mg", pmo: 85, nik: "3526010407950001", alamat: "Desa Blega Oloh", createdAt: "2024-05-12T14:30:00Z" },
  { id: 105, name: "Eko Prasetyo", age: 37, gender: "L", diagnosis: "OCD", status: "stable", pendamping: "Bapak Agus Setiawan", obat: "Sertraline 50mg", pmo: 80, nik: "3526010509850001", alamat: "Desa Gigir", createdAt: "2024-07-18T08:15:00Z" },
  { id: 106, name: "Farida Hasanah", age: 41, gender: "P", diagnosis: "Skizofrenia", status: "monitor", pendamping: "Sdri. Rina Marlina", obat: "Risperidone 2mg", pmo: 70, nik: "3526010611800001", alamat: "Desa Kajjan", createdAt: "2024-08-25T16:00:00Z" },
  { id: 107, name: "Gani Rohmat", age: 56, gender: "L", diagnosis: "Demensia", status: "stable", pendamping: "Bapak Yusuf Mansur", obat: "Donepezil 5mg", pmo: 95, nik: "3526010713650001", alamat: "Desa Kampao", createdAt: "2024-10-10T10:45:00Z" },
  { id: 108, name: "Hani Suci", age: 30, gender: "P", diagnosis: "Bipolar", status: "stable", pendamping: "Ibu Sri Wahyuni", obat: "Quetiapine 100mg", pmo: 88, nik: "3526010815900001", alamat: "Desa Karang Gayam", createdAt: "2024-12-01T09:30:00Z" },
  { id: 109, name: "Indra Jaya", age: 44, gender: "L", diagnosis: "Skizofrenia", status: "monitor", pendamping: "Bapak Bambang Heru", obat: "Haloperidol 5mg", pmo: 65, nik: "3526010917750001", alamat: "Desa Karang Nangkah", createdAt: "2025-01-22T13:20:00Z" },
  { id: 110, name: "Jaka Pratama", age: 33, gender: "L", diagnosis: "OCD", status: "stable", pendamping: "Ibu Ani Sumarni", obat: "Fluvoxamine 50mg", pmo: 82, nik: "3526011019880001", alamat: "Desa Karang Panasan", createdAt: "2025-03-14T11:10:00Z" },
  { id: 111, name: "Kurniawati", age: 29, gender: "P", diagnosis: "Depresi", status: "monitor", pendamping: "Sdr. Dedi Kurniawan", obat: "Escitalopram 10mg", pmo: 55, nik: "3526011121950001", alamat: "Desa Karpote", createdAt: "2025-05-05T15:00:00Z" },
  { id: 112, name: "Laila Mujiani", age: 52, gender: "P", diagnosis: "Skizofrenia", status: "stable", pendamping: "Sdri. Evi Rosita", obat: "Olanzapine 5mg", pmo: 92, nik: "3526011223700001", alamat: "Desa Ko'olan", createdAt: "2025-06-28T08:45:00Z" },
  { id: 113, name: "Mamat Slamet", age: 48, gender: "L", diagnosis: "Bipolar", status: "monitor", pendamping: "Bapak Toto Handoko", obat: "Valproate 250mg", pmo: 68, nik: "3526011325750001", alamat: "Desa Lomaer", createdAt: "2025-08-30T10:00:00Z" },
  { id: 114, name: "Nana Rohana", age: 39, gender: "P", diagnosis: "Skizofrenia", status: "stable", pendamping: "Ibu Wiwin Setyawati", obat: "Risperidone 2mg", pmo: 89, nik: "3526011427850001", alamat: "Desa Lombang Dajah", createdAt: "2025-10-12T14:15:00Z" },
  { id: 115, name: "Oman Kusnadi", age: 60, gender: "L", diagnosis: "Demensia", status: "monitor", pendamping: "Sdr. Udin Jaelani", obat: "Memantine 10mg", pmo: 62, nik: "3526011529600001", alamat: "Desa Lombang Laok", createdAt: "2025-11-20T09:50:00Z" },
  { id: 116, name: "Pipit Sundari", age: 27, gender: "P", diagnosis: "Depresi", status: "stable", pendamping: "Sdri. Vera Puspita", obat: "Amitriptyline 25mg", pmo: 91, nik: "3526011631980001", alamat: "Desa Nyor Manes", createdAt: "2026-01-05T11:30:00Z" },
  { id: 117, name: "Qori Amelia", age: 35, gender: "P", diagnosis: "Bipolar", status: "monitor", pendamping: "Bapak Wawan Bakri", obat: "Lamotrigine 50mg", pmo: 66, nik: "3526011701900001", alamat: "Desa Pangeran Gedungan", createdAt: "2026-01-15T08:00:00Z" },
  { id: 118, name: "Rahmat Bary", age: 43, gender: "L", diagnosis: "Skizofrenia", status: "stable", pendamping: "Ibu Yani Fitri", obat: "Clozapine 25mg", pmo: 94, nik: "3526011803780001", alamat: "Desa Panjalinan", createdAt: "2026-02-10T14:40:00Z" },
  { id: 119, name: "Shanti Dwi", age: 31, gender: "P", diagnosis: "OCD", status: "monitor", pendamping: "Bapak Rudi Hartono", obat: "Paroxetine 20mg", pmo: 63, nik: "3526011905920001", alamat: "Desa Rosep", createdAt: "2026-02-20T10:15:00Z" },
];

const DEFAULT_DRUGS = [
  {
    name: "Haloperidol 5mg",
    stok: 45,
    min: 50,
    kadaluarsa: "2025-08",
    pemasok: "Apotek Sehat",
  },
  {
    name: "Lithium 400mg",
    stok: 120,
    min: 60,
    kadaluarsa: "2026-03",
    pemasok: "Apotek Maju",
  },
  {
    name: "Clozapine 25mg",
    stok: 30,
    min: 40,
    kadaluarsa: "2025-12",
    pemasok: "Apotek Sehat",
  },
  {
    name: "Fluoxetine 20mg",
    stok: 200,
    min: 80,
    kadaluarsa: "2026-06",
    pemasok: "Apotek Raya",
  },
  {
    name: "Sertraline 50mg",
    stok: 22,
    min: 50,
    kadaluarsa: "2026-01",
    pemasok: "Apotek Maju",
  },
];

const DEFAULT_PICKUPS = [];

const DEFAULT_NOTIFS = [];

const DEFAULT_CHATS = {}; // No default mixed chats

// ============ PERSISTENT DATA ============
let PATIENTS = [];
let DRUGS = [];
let PICKUPS = [];
let NOTIFS = [];
let CHATS = {}; // Will be used per-conversation
let CHAT_UNSUBSCRIBE = null; // Real-time listener

let dataLoaded = false;
let GLOBAL_UNSUBSCRIBES = [];

// Seed defaults to Firebase if empty
async function seedDefaultData() {
  const collections = [
    { name: "patients", data: DEFAULT_PATIENTS },
    { name: "drugs", data: DEFAULT_DRUGS },
    { name: "pickups", data: DEFAULT_PICKUPS },
    { name: "notifs", data: DEFAULT_NOTIFS },
  ];

  for (const col of collections) {
    const snapshot = await db.collection(col.name).limit(1).get();
    if (snapshot.empty) {
      console.log(`Seeding ${col.name}...`);
      for (const item of col.data) {
        await db.collection(col.name).add(item);
      }
    }
  }

  // Chats is a map, handle slightly differently
  const chatSnap = await db.collection("chats").limit(1).get();
  if (chatSnap.empty) {
    console.log("Seeding chats...");
    for (const [contact, msgs] of Object.entries(DEFAULT_CHATS)) {
      await db.collection("chats").doc(contact).set({ messages: msgs });
    }
  }
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
    const isConfirmed = window.confirm("⚠️ Anda akan menghapus SELURUH data pasien, jadwal, dan catatan PMO. Lanjutkan?");
    if (!isConfirmed) return;
  }
  
  const collections = ["patients", "pickups", "notifs", "chats"];
  console.log("Starting database reset...");
  showToast("⏳ Sedang menghapus data...", "info");
  
  for (const colName of collections) {
    try {
      const snapshot = await db.collection(colName).get();
      const batch = db.batch();
      
      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });
      
      await batch.commit();
      console.log(`✅ Collection ${colName} cleared.`);
    } catch (err) {
      console.error(`❌ Failed to clear collection ${colName}:`, err);
    }
  }
  
  showToast("✅ Berhasil! Data baru akan dimuat otomatis.", "success");
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
    { icon: "🔔", label: "Notifikasi", page: "notifikasi" },
    { icon: "⚙️", label: "Profil", page: "profil" },
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
