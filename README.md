# Agentic Factory, game idle

Game idle di browser: kamu menjalankan lima lini produksi yang dikerjakan agen, di atas mesin 3D
yang bisa diputar. Setiap order masuk di Kabinet, melewati lima stasiun di sabuk berjalan, lalu
dibayar di Kasir.

## Cara main

1. **Ambil order** dengan tangan. Lini tanpa agen hanya bekerja selama antrean order masih ada.
2. **Rekrut agen** supaya lini berjalan sendiri, juga saat game ditutup (hasil offline dihitung sampai 8 jam).
3. **Upgrade stasiun.** Lini berjalan secepat stasiun paling lambat (bottleneck), jadi naikkan stasiun
   yang ditandai Bottleneck dulu. Setiap stasiun dua kali lebih cepat di level 10, 25, 50, 100, dan seterusnya.
4. **Tambah produk.** Setiap pabrik punya tiga produk. Setiap produk yang dibeli dibangun sebagai petak
   mesin baru di samping petak lain, dan semua petak berproduksi bersamaan (dua produk berarti dua
   petak). Level stasiun berlaku untuk semua petak. Produk mahal membayar lebih per order tetapi
   membebani stasiun tertentu; tab Produk menunjukkan berapa tambahan pendapatan tiap petak baru.
   Klik "Lihat petak ini" atau sebuah stasiun di petak mana pun untuk melihat petak itu dari dekat.
5. **Buka pabrik lain** begitu uangmu cukup. Game memberi tahu saat itu terjadi.
6. **Mulai series baru** untuk menukar pendapatan dengan bintang. Setiap bintang menambah 5% nilai
   setiap order untuk seterusnya.

| Lini | Produk | Properti khas di mesin |
|---|---|---|
| 01 Studio Video | Video pendek, video iklan, video penjelas | Gulungan film |
| 02 Pabrik Website | Landing page, toko online, portal anggota | Rak server |
| 03 Pabrik Podcast | Episode reguler, wawancara, serial dokumenter | Mikrofon dan meteran suara |
| 04 Pabrik Aplikasi | Aplikasi alat, aplikasi belanja, game kasual | Ponsel uji |
| 05 Penerbit E-book | Buku panduan, novel, kursus dan e-book | Tumpukan buku |

Progres disimpan otomatis di `localStorage` browser setiap 5 detik dan saat halaman ditutup.

## Menjalankan

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # hasil di dist/, bisa dibuka dari host statis mana pun
npm test           # tes aturan game (vitest)
