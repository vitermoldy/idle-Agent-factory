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
  }, [notice.id, dismiss])
  return (
    <div className="pointer-events-auto flex items-center gap-3 rounded-xl border border-line-strong bg-raised py-2 pr-2 pl-4">
      <p className="min-w-0 flex-1 text-[13px] leading-snug text-ink">{notice.text}</p>
      {notice.factory && notice.action && (
        <button
          type="button"
          className="btn btn-primary min-h-10 px-3 text-[13px]"
          onClick={() => {
            onOpen(notice.factory!)
            dismiss(notice.id)
          }}
        >
          {notice.action}
        </button>
      )}
      <button type="button" className="icon-btn" aria-label="Tutup pemberitahuan" onClick={() => dismiss(notice.id)}>
        <Close />
      </button>
