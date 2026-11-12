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
