import type { ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

/** A purchase: the action on the left, its price on the right, read aloud as one sentence. */
export function PriceButton({
  label,
  price,
