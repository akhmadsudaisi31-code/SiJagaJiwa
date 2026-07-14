# Catatan Perubahan (Changelog) SiJagaJiwa

**Tanggal: 14 Juli 2026**

Berikut adalah log penyempurnaan dan perbaikan *bug* yang telah diterapkan pada *production*:

### 1. Perbaikan Bug PWA / Service Worker (Cache)
- **Masalah:** Halaman (terutama Manajemen Akun) sering tidak memuat *update* kode terbaru kecuali dengan *Hard Refresh* (F5).
- **Solusi:** File `sw.js` telah diperbarui ke versi `v5`. Logika rute root (`/`) kini dimasukkan dalam daftar proteksi *Network-First* alih-alih *Cache-First*. Pengguna kini bisa mendapatkan *update* hanya dengan _refresh_ biasa.

### 2. Form Edit Pasien & Hapus Pasien
- **Masalah Edit Status:** Tombol *Edit Biodata* dan *Hapus Pasien* sempat tidak berfungsi akibat elemen "Lencana Status" terbaca bersambung dengan nama pasien.
- **Solusi Teks Nama:** Membungkus spesifik teks nama pasien ke dalam `<span id="detail-name-text">` sehingga tidak tercampur dengan teks lencana status.
- **Penambahan Kolom:** Form Edit Data Pasien kini telah dilengkapi dengan isian *Tanggal Lahir, Jenis Kelamin, Nama Pendamping*, dan *Obat Utama*.
- **Bug Firebase (Umur Undefined):** Memperbaiki *crash* yang menimpa dokumen pasien lama yang belum memiliki kolom umur `age`. Sistem kini menggunakan `age = 30` sebagai nilai *fallback* jika tanggal lahir masih kosong.

### 3. Laporan Kepatuhan Obat (Responsivitas & Filter)
- **Masalah:** Daftar kepatuhan sangat panjang dan desain UI tabel sedikit berantakan.
- **Solusi:** Menambahkan kolom **Pencarian Nama (Search)** dan fitur **Pagination (Halaman)** dengan maksimal 20 baris pasien per halaman. Desain kotak/kartu tabel juga telah disesuaikan agar bisa di-*scroll* dengan rapi ke bawah (Responsif).

### 4. Monitor Kinerja Petugas (PMO)
- **Masalah:** Data hitungan kinerja tidak bertambah saat tombol *Refresh* ditekan.
- **Solusi:** Menghapus batas artifisial (`.slice(0, 10)`) pada perhitungan jumlah pasien milik petugas tersebut. Kini setiap kali tombol refresh ditekan, perhitungan jumlah seluruh Log PMO yang dilakukan oleh petugas bersangkutan akan di- *query* ulang dan dijumlahkan dengan benar.

### 5. Optimasi Bacaan Database (Firebase Quota)
- **Masalah:** Penarikan seluruh riwayat PMO (`pmo_logs.get()`) menyebabkan ratusan hingga ribuan _Reads_ Firestore dalam satu kali buka dashboard, sangat berisiko menghabiskan limit gratis harian.
- **Solusi:** 
   1. Menerapkan optimasi `.get()` secara bijak dan menghindari penarikan `.size` buta.
   2. Pada grafik 7 Hari (Dashboard), fitur query difilter secara ketat dengan `.where('timestamp', '>=', tujuhHariLaluStr)` agar sistem hanya memuat dokumen PMO minggu terakhir saja.

### 6. Pagination di Halaman Catat PMO
- **Masalah:** Antarmuka "Jadwal Minum Obat" dan "Kepatuhan" di halaman PMO melebar dan terlalu panjang ke bawah ketika jumlah pasien banyak.
- **Solusi:** Menambahkan *Pagination* (15 pasien per Halaman) untuk kedua kartu data (List & Compliance) di dalam `page-pmo`.
