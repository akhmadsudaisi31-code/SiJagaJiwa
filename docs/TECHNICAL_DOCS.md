# Dokumentasi Teknis SiJaga Jiwa

SiJaga Jiwa adalah Sistem Informasi & Pemantauan ODGJ (Orang Dengan Gangguan Jiwa) berbasis web yang dirancang sebagai Progressive Web App (PWA) menggunakan Vanilla JavaScript dan Firebase.

## 📁 Struktur Folder

```text
SiJagaJiwa/
├── assets/             # Aset gambar dan ikon
├── css/                # File styling (Vanilla CSS)
│   └── style.css       # Main stylesheet
├── docs/               # Dokumentasi teknis (Folder ini)
├── js/                 # Logika JavaScript Aplikasi
│   ├── app.js          # Inisialisasi aplikasi dan navigasi utama
│   ├── auth.js         # Logika autentikasi dan otorisasi (RBAC)
│   ├── data.js         # Sinkronisasi real-time Firestore dan data statis
│   ├── firebase-config.js # Konfigurasi Firebase SDK
│   ├── pages.js        # Fungsi rendering untuk setiap halaman dashboard
│   └── ui.js           # Utilitas UI (toast, modal, dll)
├── index.html          # Entry point utama (Single Page Application structure)
├── manifest.json       # Konfigurasi PWA (Web App Manifest)
├── sw.js               # Service Worker untuk offline caching
└── netlify.toml        # Konfigurasi deployment Netlify
```

## 🚀 Logika Utama Aplikasi (js/app.js)

Aplikasi ini menggunakan pendekatan **Single Page Application (SPA)** sederhana berbasis Vanilla JS. Logika utama di `js/app.js` (sebagai pengganti `App.jsx` dalam arsitektur ini) menangani:

1.  **Inisialisasi**: Menjalanakan fungsi `onload` untuk memeriksa session user dan memulai sinkronisasi Firestore.
2.  **Navigation (`showPage`)**: Mengatur visibilitas elemen `.page` berdasarkan ID halaman yang dipilih.
3.  **Role-Based Access Control (RBAC)**: Fungsi `buildNav` dan `syncUserUI` mengatur elemen sidebar dan widget dashboard yang muncul berdasarkan role user (Admin, Pemegang Program, Petugas, Dokter, Pendamping).
4.  **Debounced Rendering**: Menggunakan `initPages` dengan `setTimeout` untuk memastikan rendering halaman tidak berjalan terlalu sering saat terjadi update data real-time.

## 🛠️ Konfigurasi Proyek

Proyek ini tidak menggunakan **Vite** atau build tool modern lainnya (seperti `vite.config.js`), melainkan dijalankan secara langsung sebagai file statis. Hal ini memberikan keunggulan berupa:

- Tidak memerlukan langkah build (`npm run build`).
- Kompatibilitas langsung dengan browser modern.
- Deployment yang sangat cepat ke platform seperti Netlify.

## 📱 Progressive Web App (PWA) & Service Worker

Aplikasi ini telah mendukung PWA agar dapat diinstal di smartphone dan diakses secara offline (terbatas pada shell UI).

### Service Worker (`sw.js`)

Service Worker bertugas sebagai proxy antara aplikasi dan jaringan. Cara kerjanya:

- **Install Event**: Mengunduh dan menyimpan aset utama (`index.html`, `js/*.js`, `css/*.css`) ke dalam browser cache (`sijagajiwa-v2`).
- **Activate Event**: Membersihkan cache versi lama saat ada pembaruan aplikasi.
- **Fetch Event**: Menggunakan strategi **Cache-First**. Jika file tersedia di cache, maka akan langsung diambil dari sana untuk kecepatan akses. Jika tidak ada (atau permintaan data ke Firestore), maka akan diteruskan ke jaringan.

### Manifest (`manifest.json`)

Mendefinisikan nama aplikasi, warna tema, dan ikon yang akan muncul saat user menambahkan aplikasi ke layar utama (Home Screen).

---

## 🏗️ Rebuild ke React (Persiapan)

Untuk pengembangan masa depan, aplikasi ini direncanakan untuk dibangun ulang menggunakan basis **React (Vite)**. Dokumentasi teknis mendalam mengenai pemetaan state, pemecahan komponen fungsional, dan roadmap migrasi dapat ditemukan di:

👉 **[REACT_REBUILD_SPEC.md](file:///media/naya/073928ee-5d32-44d0-8651-11fa61e7a44b/naya/app_dev/jagajiwa/SiJagaJiwa/docs/REACT_REBUILD_SPEC.md)**

Dokumen tersebut berisi:

- Strategi State Management (Hooks & Context).
- Pemetaan Komponen (StatCard, PatientItem, dll).
- Roadmap implementasi modular Firebase SDK.
- Panduan integrasi PWA menggunakan Vite.

## 🗄️ Sinkronisasi Data (js/data.js)

Data dikelola secara real-time melalui **Cloud Firestore**:

- **Listeners**: Menggunakan `onSnapshot` untuk memantau perubahan pada koleksi `patients`, `drugs`, `pickups`, dan `notifs`.
- **Global State**: Data yang diterima disimpan dalam variabel global (seperti `PATIENTS`, `DRUGS`) dan memicu fungsi `initPages()` untuk memperbarui tampilan secara otomatis tanpa perlu refresh halaman.
