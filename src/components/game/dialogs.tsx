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
