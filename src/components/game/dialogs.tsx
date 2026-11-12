import { useEffect, useId, useRef, type ReactNode } from 'react'
import { useGame } from '@/game/store'
import * as E from '@/game/engine'
import { duration, money, short } from '@/lib/format'
import { Close } from './icons'

/** Native modal dialog: focus is trapped, Escape and the backdrop close it. */
export function Dialog({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  footer?: ReactNode
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const id = useId()
  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal()
    else if (!open && d.open) d.close()
  }, [open])
  return (
    <dialog
      ref={ref}
      aria-labelledby={id}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className="dialog"
    >
      <div className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <h2 id={id} className="font-display text-[19px] leading-snug font-semibold">
            {title}
          </h2>
          <button type="button" className="icon-btn -mt-1.5 -mr-2" aria-label="Tutup" onClick={onClose}>
            <Close />
          </button>
        </div>
        <div className="mt-3 text-[14px] leading-relaxed text-soft">{children}</div>
        {footer && <div className="mt-5 flex flex-wrap justify-end gap-2">{footer}</div>}
      </div>
    </dialog>
  )
}

export function AwayDialog() {
  const away = useGame((s) => s.away)
  const dismiss = useGame((s) => s.dismissAway)
  return (
    <Dialog
      open={!!away}
      onClose={dismiss}
      title="Agenmu tetap bekerja"
      footer={
        <button type="button" className="btn btn-primary" onClick={dismiss}>
          Ambil hasilnya
        </button>
      }
    >
      {away && (
        <>
          <p>
            Kamu pergi {duration(away.seconds)}. Lini yang punya agen menyelesaikan {short(away.orders)} order.
          </p>
          <p className="mt-3 font-display text-[28px] font-semibold text-ink tabular-nums">+{money(away.cash)}</p>
          {away.capped && (
            <p className="mt-2 text-[13px] text-muted">
              Hasil saat offline dihitung sampai {duration(E.OFFLINE_CAP)}.
            </p>
          )}
        </>
      )}
    </Dialog>
  )
}

