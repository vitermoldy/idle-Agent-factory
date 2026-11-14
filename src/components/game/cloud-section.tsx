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
