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
npm run balance    # bot rakus memainkan game dan mencetak kapan tiap lini terbuka
```

Butuh Node 22 atau lebih baru. Di Windows, jalankan vitest dari `C:\...` (huruf besar), bukan
`c:\...`. Vite sudah dikunci ke satu ejaan lewat `vite.config.ts`.

## Database

Server kecil (Express dan MySQL) menyimpan salinan simpanan game dan mencatat setiap series baru serta setiap
lini yang dibuka. Game tetap jalan tanpa server, dengan simpanan di browser seperti biasa.

```bash
cp .env.example .env   # isi DB_USER dan DB_PASSWORD akun MySQL-mu
npm run server         # API di http://localhost:8796, membuat database agentic_factory dan tabelnya sendiri
npm run dev            # /api diteruskan ke server
```

Setelah `npm run build`, `npm start` menyajikan `dist/` dan API di port yang sama. Butuh MySQL 8.

Tidak ada akun. Setiap browser mendapat kode pemulihan 12 karakter di Pengaturan, bagian Salinan di server.
Kode itu, diketik di browser lain, membawa pabrik yang sama ke sana. Game menyimpan setiap 5 detik; salinan
ke server dikirim paling sering sekali per 30 detik, langsung saat Simpan sekarang, series baru, atau hapus
progres, dan sekali lagi saat tab ditutup. Tabelnya: `devices` (satu baris per kode), `saves` (salinan
simpanan terbaru), dan `events` (series baru dan lini yang dibuka).

## Struktur

```
src/
  components/ui/agentic-factory-3d.tsx   komponen mesin 3D (dari Prompt.txt, versi game)
  components/game/                       header, daftar lini, panel upgrade/produk/series, dialog
  scene/machine-scene.ts                 scene three.js: geometri, layar yang dilukis, animasi
  game/factories.ts                      data lima lini: stasiun, produk, harga, tema
  game/engine.ts                         aturan game murni (tanpa React), dipakai store dan tes
  game/store.ts                          state zustand: tick, simpan/muat, hasil offline, notifikasi
scripts/balance.ts                       simulasi keseimbangan ekonomi
tests/engine.test.ts                     tes aturan game
```

Proyek ini mengikuti struktur shadcn: `components.json` di root, alias `@/` ke `src/`, komponen UI
di `src/components/ui`, dan helper `cn()` di `src/lib/utils.ts`. Folder `components/ui` penting karena
CLI shadcn (`npx shadcn add ...`) menaruh komponen baru di sana dan import seperti
`@/components/ui/agentic-factory-3d` bergantung pada alias itu. Stack: React 19, TypeScript,
Tailwind CSS 4, three.js, zustand, Vite.

## Kredit

Mesin 3D diadaptasi dari [Agentic Factory 3D](https://github.com/eugeneshilow/agentic-3d-templates)
(dibuat dengan OpenAI Codex, port React oleh Claude). Versi ini menambahkan lima tema lini, properti
khas per lini, dan sambungan ke state game. Semua geometri dan tekstur prosedural: tanpa model atau gambar.
