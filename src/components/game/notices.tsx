import { useEffect } from 'react'
import { useGame, type Notice } from '@/game/store'
import type { FactoryId } from '@/game/factories'
import { Close } from './icons'

export function Notices({ onOpen }: { onOpen: (id: FactoryId) => void }) {
  const notices = useGame((s) => s.notices)
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-3 bottom-3 z-40 flex flex-col gap-2 sm:right-auto sm:left-4 sm:w-[360px] lg:top-[80px] lg:right-[396px] lg:bottom-auto lg:left-auto xl:right-[404px]"
    >
      {notices.map((n) => (
        <NoticeCard key={n.id} notice={n} onOpen={onOpen} />
      ))}
    </div>
  )
}

function NoticeCard({ notice, onOpen }: { notice: Notice; onOpen: (id: FactoryId) => void }) {
  const dismiss = useGame((s) => s.dismissNotice)
  useEffect(() => {
    const t = setTimeout(() => dismiss(notice.id), 15000)
    return () => clearTimeout(t)
