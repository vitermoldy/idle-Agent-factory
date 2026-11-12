// The five production lines. Each one reuses the same five-station machine (the slots are
// the geometry archetypes of the 3D scene) with its own product, economy and painted screens.

export type FactoryId = 'video' | 'web' | 'podcast' | 'app' | 'ebook'
export type SlotId = 'cabinet' | 'engine' | 'admin' | 'storefront' | 'cashdesk'
export type PropKind = 'reels' | 'rack' | 'mic' | 'phone' | 'books'

/** Order flow through the machine: an order enters at the cabinet and is paid at the cash desk. */
export const PIPELINE: SlotId[] = ['cabinet', 'engine', 'admin', 'storefront', 'cashdesk']

export interface StationDef {
  slot: SlotId
  name: string
  desc: string
  /** What this station hands to the next one. */
  output: string
  /** Base speed relative to the line's rate. */
  speed: number
  /** Price of the first upgrade. */
  cost: number
}

type Three = [string, string, string]
type Two = [string, string]

export interface SceneTheme {
  accent: string
  accentDeep: string
  shell: string
  prop: PropKind
  plate: { title: string; line: string }
  queue: { title: string; items: Three; active: string; waiting: string }
  wip: { title: string; sub: string }
  store: {
    brand: string
    nav: string
    tag: Two
    head: Two
    sub: Two
    cta: string
    foot: string
  }
  post: string
  orders: { title: string; sub: string; customers: Three; statuses: Three }
  incoming: string
  cashTitle: string
  receipt: { shop: string }
  screen: { kicker: string; head: string; lines: [string, string, string, string] }
  journey: [Two, Two, Two, Two, Two]
}

/**
 * Something a line can make. Pricier products pay more per order but load some stations
 * harder (`work`, in pipeline order), so the best pick depends on which stations are upgraded.
 */
export interface ProductDef {
  id: string
  name: string
  desc: string
  /** Revenue of one order before bonuses. */
  price: number
  /** Work per order at each station; 1 is the line's base product. */
  work: [number, number, number, number, number]
  unlockCost: number
}

export interface FactoryDef {
  id: FactoryId
  no: string
  name: string
  unit: string
  blurb: string
  /** The first product is owned as soon as the line opens. */
  products: ProductDef[]
  /** Orders per second of a level-1 station with speed 1. */
  rate: number
  /** Cost growth per station level. */
  growth: number
  unlockCost: number
  agentCost: number
  stations: StationDef[]
  theme: SceneTheme
}

export const FACTORIES: FactoryDef[] = [
  {
    id: 'video',
    no: '01',
    name: 'Studio Video',
    unit: 'video',
    blurb: 'Agen menulis naskah, mengisi suara, lalu merender video untuk toko online.',
    products: [
      { id: 'short', name: 'Video pendek', desc: 'Video 30 detik untuk media sosial.', price: 29, work: [1, 1, 1, 1, 1], unlockCost: 0 },
      { id: 'ads', name: 'Video iklan', desc: 'Iklan 15 detik dengan efek. Render berat di Admin.', price: 100, work: [1, 1.5, 2.2, 1.2, 1], unlockCost: 12_000 },
      { id: 'explainer', name: 'Video penjelas', desc: 'Video 2 menit. Naskah panjang membebani Mesin.', price: 290, work: [1.3, 3.2, 2.4, 1.6, 1.2], unlockCost: 360_000 },
    ],
    rate: 0.25,
    growth: 1.15,
    unlockCost: 0,
    agentCost: 230,
    stations: [
      { slot: 'cabinet', name: 'Kabinet', desc: 'Pelanggan, order baru, dan riwayat kerja.', output: 'order', speed: 1.3, cost: 9 },
      { slot: 'engine', name: 'Mesin', desc: 'Naskah, suara, dan subtitle dirakit jadi satu video.', output: 'naskah', speed: 1, cost: 16 },
      { slot: 'admin', name: 'Admin', desc: 'Antrean render dan kendali seluruh lini.', output: 'video', speed: 1.1, cost: 12 },
      { slot: 'storefront', name: 'Etalase', desc: 'Video jadi tampil di halaman produk.', output: 'posting', speed: 1.2, cost: 11 },
      { slot: 'cashdesk', name: 'Kasir', desc: 'Pembayaran masuk, struk tercetak.', output: 'pembayaran', speed: 1.5, cost: 7 },
    ],
    theme: {
      accent: '#ff7a1a',
      accentDeep: '#c57e45',
      shell: '#e0ded4',
      prop: 'reels',
      plate: {
        title: 'STUDIO VIDEO',
        line: 'naskah, suara, render, lalu posting',
      },
      queue: { title: 'ANTREAN VIDEO', items: ['Ulasan produk', 'Cerita merek', 'Koleksi baru'], active: 'RENDER', waiting: 'ANTRE' },
      wip: { title: 'NASKAH', sub: '01 / Pembuka' },
      store: {
        brand: 'TOKO KAMU',
        nav: 'Beranda    Katalog    Akun',
        tag: ['DARI IDE', 'JADI VIDEO.'],
        head: ['Idemu.', 'Sudah tayang.'],
        sub: ['Video 30 detik yang', 'menjual produkmu.'],
        cta: 'Pesan video',
        foot: 'DIBUAT OLEH AGEN',
      },
      post: 'KANAL',
      orders: {
        title: 'ORDER MASUK',
        sub: '3 order baru hari ini',
        customers: ['Sari', 'Bima', 'Dewi'],
        statuses: ['Order baru', 'Diproduksi', 'Video siap'],
      },
      incoming: 'Order baru  +',
      cashTitle: 'PEMBAYARAN DITERIMA',
      receipt: { shop: 'STUDIO VIDEO' },
      screen: { kicker: 'DIBUAT', head: 'OLEH AGEN.', lines: ['Dari sebuah ide,', 'jadi produk nyata.', 'Agenmu', 'sudah bekerja.'] },
      journey: [
        ['Order baru', 'Order dari Sari masuk ke Kabinet'],
        ['Menulis naskah', 'Mesin mengubah ide jadi cerita'],
        ['Merakit video', 'Admin menyatukan suara, gambar, dan subtitle'],
        ['Tayang di etalase', 'Video tampil di halaman toko'],
        ['Pembayaran masuk', 'Kasir mencetak struk, koin masuk'],
      ],
    },
  },
  {
    id: 'web',
    no: '02',
    name: 'Pabrik Website',
    unit: 'situs',
    blurb: 'Brief masuk pagi, situs tayang sore. Agen merancang, menulis kode, lalu merilis.',
    products: [
      { id: 'landing', name: 'Landing page', desc: 'Satu halaman untuk satu penawaran.', price: 1_450, work: [1, 1, 1, 1, 1], unlockCost: 0 },
      { id: 'shop', name: 'Toko online', desc: 'Katalog dan keranjang. Kode jadi kerja terberat.', price: 5_000, work: [1.2, 1.4, 2.4, 1.6, 1], unlockCost: 2_300_000 },
      { id: 'portal', name: 'Portal anggota', desc: 'Login, langganan, dasbor. Perancang dan Kode sama sibuk.', price: 14_500, work: [1.6, 2.6, 3.2, 1.8, 1.3], unlockCost: 68_000_000 },
    ],
    rate: 0.2,
    growth: 1.15,
    unlockCost: 4_500_000,
    agentCost: 180_000,
    stations: [
      { slot: 'cabinet', name: 'Brief', desc: 'Brief klien masuk dan dirangkum.', output: 'brief', speed: 1.25, cost: 450 },
      { slot: 'engine', name: 'Perancang', desc: 'Wireframe dan susunan halaman.', output: 'wireframe', speed: 1.1, cost: 800 },
      { slot: 'admin', name: 'Kode', desc: 'Agen menulis kode dan menjalankan tes.', output: 'build', speed: 1, cost: 600 },
      { slot: 'storefront', name: 'Rilis', desc: 'Halaman tayang di domain klien.', output: 'situs', speed: 1.4, cost: 550 },
      { slot: 'cashdesk', name: 'Tagihan', desc: 'Invoice terkirim, langsung lunas.', output: 'invoice', speed: 1.5, cost: 350 },
    ],
    theme: {
      accent: '#45b4ff',
      accentDeep: '#3a7fb0',
      shell: '#dde2e6',
      prop: 'rack',
      plate: {
        title: 'PABRIK WEBSITE',
        line: 'brief, wireframe, kode, lalu rilis',
      },
      queue: { title: 'ANTREAN BUILD', items: ['Kedai kopi', 'Klinik gigi', 'Kelas yoga'], active: 'BUILD', waiting: 'ANTRE' },
      wip: { title: 'WIREFRAME', sub: '02 / Beranda' },
      store: {
        brand: 'KOPI PAGI',
        nav: 'Menu    Lokasi    Pesan',
        tag: ['SEDUH', 'SETIAP PAGI.'],
        head: ['Kopi enak.', 'Dekat rumah.'],
        sub: ['Pesan dari halaman,', 'ambil di kedai.'],
        cta: 'Pesan kopi',
        foot: 'DIRILIS OLEH AGEN',
      },
      post: 'RILIS',
      orders: {
        title: 'BRIEF MASUK',
        sub: '3 brief baru hari ini',
        customers: ['Rina', 'Adi', 'Maya'],
        statuses: ['Brief baru', 'Dirancang', 'Sudah tayang'],
      },
      incoming: 'Brief baru  +',
      cashTitle: 'INVOICE LUNAS',
      receipt: { shop: 'PABRIK WEBSITE' },
      screen: { kicker: 'RILIS', head: 'HARI INI.', lines: ['Brief pagi,', 'tayang sore.', 'Agen menulis', 'kodenya.'] },
      journey: [
        ['Brief masuk', 'Permintaan Rina dicatat di meja Brief'],
        ['Merancang halaman', 'Perancang menyusun wireframe'],
        ['Menulis kode', 'Agen menulis kode dan menjalankan tes'],
        ['Halaman tayang', 'Situs aktif di domain klien'],
        ['Invoice lunas', 'Invoice klien terbayar'],
      ],
    },
  },
  {
    id: 'podcast',
    no: '03',
    name: 'Pabrik Podcast',
    unit: 'episode',
    blurb: 'Topik dipilih, suara direkam dan dimixing, lalu episode tayang dengan sponsor.',
    products: [
      { id: 'episode', name: 'Episode reguler', desc: 'Obrolan 40 menit, satu pembawa acara.', price: 72_500, work: [1, 1, 1, 1, 1], unlockCost: 0 },
      { id: 'interview', name: 'Episode wawancara', desc: 'Tamu harus dijadwalkan. Topik jadi sibuk.', price: 250_000, work: [2.2, 1.6, 1.4, 1, 1.1], unlockCost: 110_000_000 },
      { id: 'docu', name: 'Serial dokumenter', desc: 'Enam bagian dengan musik asli. Rekam dan mixing panjang.', price: 725_000, work: [1.8, 3, 3, 1.4, 1.2], unlockCost: 3_300_000_000 },
    ],
    rate: 0.16,
    growth: 1.15,
    unlockCost: 230_000_000,
    agentCost: 9_000_000,
    stations: [
      { slot: 'cabinet', name: 'Topik', desc: 'Ide episode dan tamu dijadwalkan.', output: 'topik', speed: 1.3, cost: 22_500 },
      { slot: 'engine', name: 'Studio Suara', desc: 'Agen merekam narasi dan wawancara.', output: 'rekaman', speed: 1, cost: 40_000 },
      { slot: 'admin', name: 'Mixing', desc: 'Suara dibersihkan, musik ditambahkan.', output: 'master', speed: 1.15, cost: 30_000 },
      { slot: 'storefront', name: 'Siaran', desc: 'Episode tayang di semua aplikasi podcast.', output: 'episode', speed: 1.35, cost: 27_500 },
      { slot: 'cashdesk', name: 'Sponsor', desc: 'Iklan sponsor dibayar per episode.', output: 'sponsor', speed: 1.5, cost: 17_500 },
    ],
    theme: {
      accent: '#3ddc97',
      accentDeep: '#2f9e6f',
      shell: '#e2e0d6',
      prop: 'mic',
      plate: {
        title: 'PABRIK PODCAST',
        line: 'topik, rekam, mixing, lalu siaran',
      },
      queue: { title: 'ANTREAN MIXING', items: ['Obrolan bisnis', 'Kisah perantau', 'Tanya pakar'], active: 'MIXING', waiting: 'ANTRE' },
      wip: { title: 'RUNDOWN', sub: '03 / Segmen tamu' },
      store: {
        brand: 'SUARA SORE',
        nav: 'Episode    Tamu    Ikuti',
        tag: ['DENGAR', 'DI JALAN.'],
        head: ['Episode baru.', 'Tiap Senin.'],
        sub: ['Obrolan 40 menit', 'tentang usaha kecil.'],
        cta: 'Putar episode',
        foot: 'DIPRODUKSI OLEH AGEN',
      },
      post: 'EPISODE',
      orders: {
        title: 'TOPIK MASUK',
        sub: '3 topik baru minggu ini',
        customers: ['Tari', 'Gilang', 'Nina'],
        statuses: ['Topik baru', 'Direkam', 'Siap tayang'],
      },
      incoming: 'Topik baru  +',
      cashTitle: 'SPONSOR MEMBAYAR',
      receipt: { shop: 'PABRIK PODCAST' },
      screen: { kicker: 'SUARA', head: 'DARI AGEN.', lines: ['Topik dipilih,', 'suara direkam.', 'Episode', 'siap tayang.'] },
      journey: [
        ['Topik masuk', 'Usulan Tari masuk ke meja Topik'],
        ['Merekam suara', 'Studio Suara merekam narasi'],
        ['Mixing', 'Musik dan efek ditambahkan'],
        ['Episode tayang', 'Episode muncul di semua aplikasi podcast'],
        ['Sponsor membayar', 'Iklan sponsor terbayar'],
      ],
    },
  },
  {
    id: 'app',
    no: '04',
    name: 'Pabrik Aplikasi',
    unit: 'aplikasi',
    blurb: 'Spesifikasi jadi desain, desain jadi build, build lolos review dan masuk toko aplikasi.',
    products: [
      { id: 'tool', name: 'Aplikasi alat', desc: 'Kasir, absensi, jadwal. Fitur sedikit, rapi.', price: 3_600_000, work: [1, 1, 1, 1, 1], unlockCost: 0 },
      { id: 'shop', name: 'Aplikasi belanja', desc: 'Katalog dan pembayaran. Desain paling lama.', price: 12_500_000, work: [1.2, 2.3, 1.7, 1.5, 1], unlockCost: 9_000_000_000 },
      { id: 'game', name: 'Game kasual', desc: 'Level, grafis, dan review toko yang ketat.', price: 36_000_000, work: [1.4, 3.2, 2.6, 2.4, 1.2], unlockCost: 270_000_000_000 },
    ],
    rate: 0.13,
    growth: 1.15,
    unlockCost: 18_000_000_000,
    agentCost: 750_000_000,
    stations: [
      { slot: 'cabinet', name: 'Spesifikasi', desc: 'Kebutuhan klien ditulis jadi daftar fitur.', output: 'spesifikasi', speed: 1.3, cost: 1_120_000 },
      { slot: 'engine', name: 'Desain', desc: 'Layar aplikasi digambar lalu diuji.', output: 'desain', speed: 1.1, cost: 2_000_000 },
      { slot: 'admin', name: 'Build', desc: 'Kode dikompilasi untuk Android dan iOS.', output: 'build', speed: 1, cost: 1_500_000 },
      { slot: 'storefront', name: 'Review', desc: 'Aplikasi lolos review dan tayang di toko.', output: 'rilis', speed: 1.2, cost: 1_380_000 },
      { slot: 'cashdesk', name: 'Lisensi', desc: 'Klien membayar lisensi tahunan.', output: 'lisensi', speed: 1.5, cost: 870_000 },
    ],
    theme: {
      accent: '#ff5d6c',
      accentDeep: '#b5525b',
      shell: '#e4e2dc',
      prop: 'phone',
      plate: {
        title: 'PABRIK APLIKASI',
        line: 'spesifikasi, desain, build, lalu review',
      },
      queue: { title: 'ANTREAN BUILD', items: ['Kasir warung', 'Absensi kantor', 'Jadwal servis'], active: 'KOMPILASI', waiting: 'ANTRE' },
      wip: { title: 'SPESIFIKASI', sub: '04 / Layar masuk' },
      store: {
        brand: 'TOKO APLIKASI',
        nav: 'Teratas    Baru    Kategori',
        tag: ['KASIR', 'DI SAKU.'],
        head: ['Kasir warung.', 'Di ponselmu.'],
        sub: ['Catat jualan, stok,', 'dan utang pelanggan.'],
        cta: 'Pasang aplikasi',
        foot: 'DIBANGUN OLEH AGEN',
      },
      post: 'RILIS',
      orders: {
        title: 'PROYEK MASUK',
        sub: '3 proyek baru bulan ini',
        customers: ['Putri', 'Fajar', 'Lina'],
        statuses: ['Spesifikasi', 'Dibangun', 'Di toko'],
      },
      incoming: 'Proyek baru  +',
      cashTitle: 'LISENSI DIBAYAR',
      receipt: { shop: 'PABRIK APLIKASI' },
      screen: { kicker: 'APLIKASI', head: 'SIAP PASANG.', lines: ['Dari daftar fitur', 'jadi aplikasi.', 'Agen menguji', 'setiap layar.'] },
