import type { CSSProperties } from 'react'
import { useGame } from '@/game/store'
import { incomePerSec } from '@/game/engine'
import { FACTORIES, type FactoryId } from '@/game/factories'
import { money } from '@/lib/format'
import { cn } from '@/lib/utils'
import { FactoryGlyph, Lock } from './icons'

/** The five lines. Each keeps its own colour here, so a line is recognisable before it is opened. */
export function FactoryList({ onPick }: { onPick?: (id: FactoryId) => void }) {
  const game = useGame((s) => s.game)
  const setActive = useGame((s) => s.setActive)
  return (
    <ul className="flex flex-col gap-1.5">
      {FACTORIES.map((def) => {
        const fs = game.factories[def.id]
        const active = game.active === def.id
        const affordable = !fs.unlocked && game.cash >= def.unlockCost
        const status = fs.unlocked
          ? fs.agent
            ? `${money(incomePerSec(def, fs, game.stars))}/dtk`
            : fs.queue > 0
              ? `${fs.queue} order antre`
              : 'Tanpa agen'
          : affordable
            ? 'Bisa dibuka'
            : 'Terkunci'
        return (
          <li key={def.id}>
            <button
              type="button"
              aria-pressed={active}
              onClick={() => {
                setActive(def.id)
                onPick?.(def.id)
              }}
              style={{ '--item': def.theme.accent } as CSSProperties}
              className={cn(
                'group flex min-h-[60px] w-full items-center gap-3 rounded-[10px] border px-3 py-2.5 text-left transition-colors',
                active
                  ? 'border-line-strong bg-raised'
                  : 'border-transparent hover:border-line hover:bg-raised/60'
              )}
            >
              <span className={cn('w-5 font-mono text-[10px]', active ? 'text-(--item)' : 'text-muted')}>
                {def.no}
              </span>
              <span
                className={cn(
                  'grid size-8 shrink-0 place-items-center rounded-md border',
                  fs.unlocked ? 'border-line-strong text-(--item)' : 'border-line text-muted'
                )}
              >
                {fs.unlocked ? <FactoryGlyph id={def.id} /> : <Lock />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14px] font-medium text-ink">{def.name}</span>
                <span
                  className={cn(
                    'mt-0.5 flex items-baseline justify-between gap-2 text-[12px] tabular-nums',
                    affordable ? 'font-medium text-(--item)' : 'text-muted'
                  )}
                >
                  <span className="truncate">{status}</span>
                  {!fs.unlocked && (
                    <span className={cn('shrink-0', !affordable && 'text-soft')}>
                      <span className="sr-only">, harga </span>
                      {money(def.unlockCost)}
                    </span>
                  )}
                </span>
                {!fs.unlocked && !affordable && (
                  <span className="mt-1.5 block h-0.5 overflow-hidden rounded bg-line" aria-hidden="true">
                    <span
                      className="block h-full bg-(--item)"
                      style={{ width: `${Math.min(100, (game.cash / def.unlockCost) * 100)}%` }}
                    />
