# Pengumpulan UTS Pemrograman Web Dasar

## Identitas Mahasiswa

- Nama: Willy Haykal P
- NIM: 2405101062
- Kelas: 5D
- Program Studi: Teknik Informatika
- Mata Kuliah: Pemrograman Web Dasar
- Tahun Akademik: 2026/2027 (Semester Ganjil)

## Deskripsi

Repository hasil pengerjaan Ujian Tengah Semester (UTS)
mata kuliah Pemrograman Web Dasar.

## Deskripsi Pengerjaan UTS

Aplikasi yang dibuat adalah **JEMPUTIN**, sebuah website pemesanan ojek online dan antar-jemput
dengan slogan *"Tinggal Pesan, Kami Jemput."* Aplikasi dibangun sebagai prototipe frontend
menggunakan HTML5, CSS3, dan JavaScript murni (tanpa framework). Peta memakai Leaflet dan
OpenStreetMap; jika peta gagal dimuat, aplikasi menampilkan peta cadangan berupa ilustrasi rute.

Seluruh data (pengguna, pesanan, tarif) disimpan di `localStorage` browser, sedangkan sesi login
disimpan di `sessionStorage`. Login, pembayaran, chat, telepon, dan pencarian pengemudi bersifat
simulasi. Aplikasi memiliki tiga peran: pelanggan, pengemudi, dan admin. Tampilan dirancang
mobile-first dengan satu stylesheet dan satu file JavaScript untuk semua halaman.

## Fitur yang Diimplementasikan

1. **Autentikasi**: halaman login satu pintu untuk semua peran, registrasi pelanggan dan pengemudi,
   validasi form, serta pembatasan akses halaman berdasarkan peran. Pengemudi baru berstatus
   "menunggu" sampai disetujui admin.
2. **Pemesanan (pelanggan)**: memilih lokasi jemput dan tujuan dengan pencarian alamat dan peta rute,
   memilih layanan motor atau mobil, estimasi tarif berdasarkan jarak, jadwal (sekarang atau nanti),
   metode pembayaran, dialog konfirmasi pesanan, serta simulasi pesanan berhasil dan gagal.
3. **Perjalanan**: pencarian pengemudi, detail pengemudi, chat dan telepon simulasi, status
   perjalanan yang diperbarui langsung, pembatalan pesanan, ringkasan biaya, dan rating.
4. **Riwayat dan profil**: riwayat pesanan dengan filter status dan layanan, detail pesanan,
   ubah profil, ganti kata sandi, dan keluar.
5. **Dashboard pengemudi**: status online/offline, pesanan masuk (terima/tolak), memperbarui status
   perjalanan, dan pendapatan hari ini.
6. **Dashboard admin**: statistik, pengelolaan pengguna (tambah, ubah, setujui pengemudi,
   aktif/nonaktif, hapus), pengelolaan pesanan, dan pengaturan tarif.

## Struktur Folder

- `uts/`: Source code dan file pendukung UTS.
  - `uts/login.html`, `uts/register.html`: login dan registrasi.
  - `uts/index.html`, `uts/lokasi.html`, `uts/layanan.html`, `uts/mencari-driver.html`,
    `uts/perjalanan.html`, `uts/selesai.html`, `uts/riwayat.html`, `uts/profil.html`: halaman pelanggan.
  - `uts/driver.html`: dashboard pengemudi.
  - `uts/admin.html`: dashboard admin.
  - `uts/css/style.css`: stylesheet untuk semua halaman.
  - `uts/js/script.js`: JavaScript untuk semua halaman.
- `uts/screenshots/`: Bukti visual hasil implementasi.

## Cara Menjalankan Aplikasi

Aplikasi hanya memakai HTML, CSS, dan JavaScript sehingga tidak memerlukan server atau database.

**Dengan Live Server (VS Code):**

1. Clone atau unduh repository ini, lalu buka folder `uts` di VS Code (**File > Open Folder**).
2. Pasang ekstensi **Live Server** (Ritwick Dey) dari tab Extensions.
3. Klik kanan `login.html`, pilih **Open with Live Server**.
4. Browser terbuka di `http://127.0.0.1:5500/login.html`.

**Tanpa Live Server:** buka `uts/login.html` langsung di browser. Peta membutuhkan koneksi internet.

**Akun demo:**

| Peran | Email | Kata sandi |
|---|---|---|
| Pelanggan | willy@jemputin.com | user123 |
| Pengemudi (motor) | budi@jemputin.com | driver123 |
| Pengemudi (mobil) | andi@jemputin.com | driver123 |
| Admin | admin@jemputin.com | admin123 |

**Alur demo yang disarankan (2 tab):**

1. Tab 1: login sebagai pelanggan, pilih **Pesan**, tentukan tujuan, **Lanjut**, pilih layanan, lalu **Pesan** dan **Ya, Pesan**.
2. Tab 2 (tab baru, jangan duplikat tab): buka `login.html`, login sebagai `budi@jemputin.com`, lalu tekan **Terima**.
   Tanpa tab kedua, pengemudi ditugaskan otomatis setelah 8 detik.
3. Di tab pengemudi tekan **Mulai Perjalanan** lalu **Selesaikan Perjalanan**. Tab pelanggan ikut berubah dan berakhir di halaman rating.
4. Login sebagai `admin@jemputin.com` untuk melihat statistik serta mengelola pengguna, pesanan, dan tarif.

## Screenshot Hasil Implementasi

Screenshot tersimpan di folder `uts/screenshots/`:

| Berkas | Keterangan |
|---|---|
| `01-login.png`, `02-register.png` | Login dan registrasi |
| `03-beranda.png` | Beranda pelanggan |
| `04-lokasi.png` | Pilih lokasi jemput dan tujuan |
| `05-layanan.png`, `06-konfirmasi-pesan.png`, `07-pesanan-berhasil.png` | Pilih layanan, konfirmasi, pesanan berhasil |
| `08-mencari-driver.png`, `10-perjalanan.png`, `11-chat.png` | Mencari pengemudi, status perjalanan, chat |
| `13-selesai-rating.png` | Ringkasan biaya dan rating |
| `14-riwayat.png`, `15-profil.png` | Riwayat dan profil |
| `09-driver-pesanan-masuk.png`, `12-driver-menjemput.png` | Dashboard pengemudi |
| `16-admin-dashboard.png` sampai `19-admin-tarif.png` | Dashboard admin: statistik, pengguna, pesanan, tarif |

## Referensi

- Leaflet 1.9.4, pustaka peta interaktif: https://leafletjs.com
- OpenStreetMap, data dan tile peta: https://www.openstreetmap.org
- MDN Web Docs (HTML, CSS, JavaScript, Web Storage API): https://developer.mozilla.org
