import type { ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

/** A purchase: the action on the left, its price on the right, read aloud as one sentence. */
export function PriceButton({
  label,
  price,
  className,
  ...props
}: { label: string; price: string } & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'>) {
  return (
    <button
      type="button"
      aria-label={`${label}, ${price}`}
      className={cn('btn btn-primary justify-between gap-4 px-4', className)}
      {...props}
    >
