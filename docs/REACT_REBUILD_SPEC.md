# Panduan Strategis: Rebuild SiJaga Jiwa ke React

Dokumen ini adalah spesifikasi teknis mendalam untuk melakukan porting/rebuild aplikasi **SiJaga Jiwa** dari basis Vanilla JavaScript ke **React (Vite)**.

---

## 1. Arsitektur Tujuan

- **Framework**: React 18+ (Vite)
- **State Management**: Zustand atau React Context (untuk data global Firestore)
- **Routing**: React Router v6
- **Styling**: Lanjutkan menggunakan CSS Variables yang ada (style.css) namun dipecah menjadi CSS Modules atau Tailwind CSS.
- **Backend Connector**: Firebase SDK v10+ (Modular)

---

## 2. Pemetaan State & Data (Global State)

Aplikasi saat ini menggunakan variabel global di `js/data.js`. Dalam React, ini harus dikelola menggunakan hooks.

### Kolaborasi Koleksi Firestore

| Koleksi    | Variabel Vanilla | React Store/Context    |
| :--------- | :--------------- | :--------------------- |
| `patients` | `PATIENTS`       | `usePatientStore`      |
| `drugs`    | `DRUGS`          | `useDrugStore`         |
| `pickups`  | `PICKUPS`        | `useScheduleStore`     |
| `notifs`   | `NOTIFS`         | `useNotificationStore` |
| `users`    | `session`        | `useAuthStore`         |

### Logika Sinkronisasi (Hook Custom)

Gunakan `useEffect` dengan `onSnapshot` di dalam hook untuk langganan real-time:

```javascript
// Contoh implementasi di React
export const usePatients = () => {
  const [patients, setPatients] = useState([]);
  useEffect(() => {
    const q = query(collection(db, "patients"));
    return onSnapshot(q, (snapshot) => {
      setPatients(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });
  }, []);
  return patients;
};
```

---

## 3. Struktur Komponen (Atomic Design)

### Standar UI Reusable

- **`StatCard`**: (Baris 203-228 `index.html`) - Menerima props: color, label, value, icon, changeText.
- **`PatientItem`**: (Fungsi `patientHTML` di `js/pages.js`) - Menerima props patient object dan role.
- **`Modal`**: Wrapper general untuk semua pop-up (PMO, Stok, Tambah Pasien).
- **`ProgressBar`**: Komponen visual kepatuhan PMO.

### Struktur Halaman (Pages)

| Halaman Vanilla       | Komponen React        | Kontrol Akses (RBAC)                    |
| :-------------------- | :-------------------- | :-------------------------------------- |
| `page-dashboard`      | `Dashboard.jsx`       | Semua Role (Konten Terfilter)           |
| `page-data-pasien`    | `PatientList.jsx`     | Admin, Pemegang, Petugas, Dokter        |
| `page-patient-detail` | `PatientDetail.jsx`   | Semua Role (Read-only untuk Pendamping) |
| `page-pmo`            | `PMOMonitor.jsx`      | Semua Role                              |
| `page-stok-obat`      | `StockManagement.jsx` | Admin, Pemegang Program                 |
| `page-jadwal-ambil`   | `Schedule.jsx`        | Semua Role                              |

---

## 4. Keamanan & RBAC (Role-Based Access Control)

### Konfigurasi Navigasi (`ROLE_NAVS` & `ROLE_INFO`)

Pindahkan konstanta dari `js/data.js` ke file konfigurasi (`src/config/roles.js`).

### Proteksi Route

Implementasikan `ProtectedRoute` wrapper:

```jsx
<Route
  path="/stok-obat"
  element={
    <ProtectedRoute allowedRoles={["admin", "pemegang"]}>
      <StockManagement />
    </ProtectedRoute>
  }
/>
```

---

## 5. Schema Data Firestore (Detailed)

### `patients` Collection

- `firebaseId`: string (ID Dokumen)
- `name`: string
- `nik`: string (16 digit)
- `age`: number
- `gender`: string (L/P)
- `diagnosis`: string
- `status`: string ('stable', 'monitor', 'critical')
- `alamat`: string
- `desa`: string (Field kunci untuk filtering regional)
- `pendamping`: string
- `obat`: string
- `pmo`: number (0-100)
- `pmo_sessions`: array [boolean, boolean, boolean] (Pagi, Siang, Malam)
- `assignedDoctorId`: string (Username ID)

### `drugs` Collection

- `name`: string
- `stok`: number
- `min`: number (Threshold alert)
- `kadaluarsa`: string (YYYY-MM)
- `pemasok`: string

---

## 6. PWA & Service Worker

Alih-alih `sw.js` manual, gunakan `@vite-pwa/plugin`.

- **Konfigurasi**: Pindahkan `manifest.json` ke `vite.config.js` plugin settings.
- **Caching Strategi**: Gunakan `Stale-While-Revalidate` untuk UI dan `Network-First` untuk data Firebase.

---

## 7. Roadmap Migrasi (Step-by-Step)

1.  **Fase 1: Setup Proyek**: Inisialisasi Vite + React + Tailwind + Firebase Modular SDK.
2.  **Fase 2: Auth Layer**: Reimplementasi `js/auth.js` menggunakan Firebase Auth terpadu dengan Firestore profile.
3.  **Fase 3: State & Sync**: Buat hooks global untuk sinkronisasi 4 koleksi utama.
4.  **Fase 4: UI Framework**: Migrasi `index.html` menjadi `Layout.jsx` (Sidebar + Topbar).
5.  **Fase 5: Feature Porting**: Satu per satu pindahkan logika rendering dari `js/pages.js` ke komponen React fungsional.
6.  **Fase 6: PWA Integration**: Aktivasi plugin PWA dan optimasi offline.
7.  **Fase 7: Data Migration**: Sinkronisasi data Firestore lama ke struktur baru (jika ada perubahan field).

---

## 8. Catatan Penting untuk Developer React

- **Filtering Regional**: Logika di Baris 14-25 `js/pages.js` harus dipindahkan ke level **Selector** atau **States** agar efisien. Jangan melakukan filtering di dalam `render()` secara berulang.
- **Modal Logic**: Ganti sistem `openModal('id')` dengan state-driven modal (misal: `const [isModalOpen, setOpen] = useState(false)`).
- **Chart.js**: Gunakan wrapper `react-chartjs-2` untuk integrasi grafik yang lebih "React-way".
