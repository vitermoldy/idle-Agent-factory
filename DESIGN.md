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
