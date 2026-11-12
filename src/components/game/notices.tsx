import { useEffect } from 'react'
import { useGame, type Notice } from '@/game/store'
import type { FactoryId } from '@/game/factories'
import { Close } from './icons'

export function Notices({ onOpen }: { onOpen: (id: FactoryId) => void }) {
  const notices = useGame((s) => s.notices)
  return (
    <div
