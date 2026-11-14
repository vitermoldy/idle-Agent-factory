import { useEffect, useState, type FormEvent } from 'react'
import { useGame } from '@/game/store'
import * as E from '@/game/engine'
import { cloudState, fetchStats, onCloud, recoveryCode, restoreFrom } from '@/game/cloud'

/** What the server (npm run server) has recorded for this browser's code. */
interface Stats {
  series: number
  stars: number
  factories: { id: string; opened: string }[]
}

const clock = (t: number) => new Date(t).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })

function useCloudState() {
  const [state, setState] = useState(cloudState)
  useEffect(() => {
    const off = onCloud(setState)
    return () => {
      off()
    }
  }, [])
  return state
}

function errorText(e: { code?: string; status?: number }) {
  if (e.code === 'format' || e.status === 400) return 'Kode pemulihan terdiri dari 12 huruf dan angka.'
  if (e.code === 'offline') return 'Server tidak terhubung. Jalankan server dulu, lalu coba lagi.'
  if (e.code === 'unreadable') return 'Simpanan di kode itu tidak bisa dibaca oleh versi game ini.'
  if (e.status === 404) return 'Tidak ada simpanan dengan kode itu.'
  return 'Kode itu belum bisa dipakai. Coba lagi sebentar lagi.'
}

/**
 * The copy of the save on the server: its status, what it recorded, and the recovery
 * code that brings the same factory to another browser.
 */
export function CloudSection({ open }: { open: boolean }) {
  const cloud = useCloudState()
  const adoptSave = useGame((s) => s.adoptSave)
  const [stats, setStats] = useState<Stats | null>(null)
  const [copied, setCopied] = useState<'no' | 'yes' | 'refused'>('no')
  const [input, setInput] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (open) void fetchStats<Stats>().then(setStats)
  }, [open])

  useEffect(() => {
    if (copied !== 'yes') return
    const t = setTimeout(() => setCopied('no'), 1600)
    return () => clearTimeout(t)
  }, [copied])

  const waiting = cloud.pending > 0 ? ` ${cloud.pending} catatan menunggu dikirim.` : ''
  const status =
    cloud.status === 'online'
      ? `Tersambung ke server.${cloud.lastSaved ? ` Salinan terakhir terkirim pukul ${clock(cloud.lastSaved)}.` : ''}${waiting}`
      : cloud.status === 'offline'
        ? `Server tidak terhubung. Progres tetap tersimpan di browser ini dan disalin lagi saat server menyala.${waiting}`
        : 'Memeriksa server…'

  const parts = stats
    ? [
        stats.series > 0 ? `${stats.series} series baru dengan ${stats.stars} bintang` : '',
        stats.factories.length > 0 ? `${stats.factories.length} lini dibuka` : '',
      ].filter(Boolean)
    : []
  const recorded = !stats
    ? null
    : parts.length === 0
      ? 'Series baru dan lini yang kamu buka tercatat di sini.'
      : `Tercatat: ${parts.join(' dan ')}.`

