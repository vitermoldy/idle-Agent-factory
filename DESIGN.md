# DESIGN.md: Agentic Factory (game idle)

## Arah

Arah visual datang dari komponen yang diberikan pemilik proyek: **Agentic Factory 3D** (Prompt.txt dan
screenshot-nya). Panggung hitam, mesin berwarna ivory dan baja, satu aksen oranye, dan label pelat
bergaya nomenklatur mesin. Game ini meneruskan bahasa itu ke seluruh antarmuka, tidak menggantinya.

Design read: game idle manajemen untuk pemain yang senang melihat mesin bekerja, dengan bahasa pelat
dan rambu industri dari mesin 3D tersebut.

Dial: ENERGY 2 / RHYTHM 2 / MOTION 2

- ENERGY 2: mesin 3D menjadi pusat perhatian; panel tenang supaya angka mudah dibaca.
- RHYTHM 2: tiga kolom yang konsisten (lini, mesin, panel) dengan satu perubahan besar: lini terkunci
  memakai kartu buka di tengah panggung.
- MOTION 2: gerak hanya ada di mesin (kecepatannya mengikuti lini), tombol yang naik saat disorot dan
  turun saat ditekan, serta angka uang yang naik dari kasir.

## Keputusan dan alasannya

| Keputusan | Alasan |
|---|---|
| Latar nyaris hitam (#050607), tanpa tema terang | Mesin dirancang untuk panggung gelap: strip emisif, penangkap bayangan, vignette. Versi terang butuh pencahayaan ulang, dan game layar penuh lazim gelap. |
| Panel #0e1013, panel naik #161920, garis ivory 9% dan 18% | Dua tingkat permukaan cukup untuk membedakan daftar dan kartu tanpa bayangan besar. |
| Satu aksen per lini: oranye #ff7a1a (video), biru #45b4ff (website), hijau #3ddc97 (podcast), koral #ff5d6c (aplikasi), kuning #f2c230 (e-book) | Warna menandai lini, sehingga daftar pabrik, mesin, dan tombol terasa satu sistem. Hanya satu aksen aktif di layar pada satu waktu; daftar pabrik memakai warna masing-masing lini agar tiap lini dikenali sebelum dibuka. Tidak ada ungu. |
| Aksen hanya untuk tindakan yang bisa dilakukan, bottleneck, dan progres | Aksen menunjukkan apa yang bisa diklik atau apa yang menahan lini. Angka uang tetap ivory karena fokusnya ukuran, bukan warna. |
| Sora untuk judul dan angka besar | Dipilih oleh `start.mjs deal --page gaming` dari taste-skill (pilihan pertama). Bentuknya lebar dan geometris, sehingga angka seperti $4.38B tetap terbaca di ukuran 26 px. |
| Figtree untuk teks | Pasangan Sora dari deal yang sama: sans yang ramah untuk paragraf pendek di panel. |
| Martian Mono hanya untuk label 10 px huruf kapital | Meniru tulisan terukir pada pelat mesin ("LINI 01"). Tidak dipakai untuk judul. |
| Pasangan nomor dan nama ("01 Kabinet") | Motif identitas dari plakat stasiun di mesin aslinya, dipakai ulang di daftar lini, baris stasiun, dan label 3D. |
| Desktop tiga kolom, ponsel bertumpuk | Di desktop mesin tetap terlihat saat panel digulir. Di ponsel mesin mendapat kotaknya sendiri, dan tombol order berada di bawahnya supaya tidak menutupi mesin. |
| Kartu berbeda menurut isi | Agen dan lini terkunci memakai kartu menonjol (garis 18%); stasiun dan produk memakai baris; bottleneck dan produk aktif mendapat garis aksen. |
| Radius 9 px (tombol), 10 sampai 14 px (kartu, dialog) | Mengikuti sudut membulat kecil pada mesin; tidak ada elemen berbentuk pil. |
| Ikon digambar sendiri: bingkai film, jendela browser, mikrofon, ponsel, buku | Setiap ikon menggambarkan produk lininya. Tidak ada pustaka ikon. |
