ANIDŌ PWA — PETUNJUK PEMULA (HP ANDROID)

ISI PROYEK
- index.html    : struktur halaman
- style.css     : desain
- app.js        : katalog AniList, pencarian, genre, detail, favorit
- manifest.json : nama dan pengaturan instalasi PWA
- sw.js         : cache dasar untuk membuka shell aplikasi
- icon.svg      : ikon aplikasi

CARA MENJALANKAN
1. Ekstrak file ZIP ini di HP.
2. Buat repository baru di https://github.com/new
3. Unggah SEMUA file dari folder ini ke repository (jangan mengunggah ZIP saja).
4. Buka Settings repository > Pages.
5. Pada Build and deployment, pilih Deploy from a branch.
6. Pilih branch main dan folder /(root), lalu Save.
7. Tunggu proses selesai, lalu buka URL GitHub Pages yang muncul.
8. Di Chrome Android, buka menu ⋮ lalu pilih "Tambahkan ke layar utama" atau "Install app" jika tersedia.

CATATAN
- PWA harus dibuka melalui HTTPS atau localhost agar service worker berjalan.
- Katalog membutuhkan koneksi internet dan bergantung pada API publik AniList.
- Favorit disimpan di browser perangkat ini, bukan akun/cloud.
- Service worker hanya menyimpan file aplikasi; katalog dan video tidak tersedia offline.
- Tombol putar menggunakan video bunga demo CC0 dari MDN, bukan konten anime.
- Untuk streaming episode asli, gunakan URL player/API resmi dan lisensi distribusi yang sesuai.
- AniList adalah sumber metadata, bukan sumber video.
- Bila API publik sedang gagal atau membatasi permintaan, coba kembali beberapa saat lagi.
