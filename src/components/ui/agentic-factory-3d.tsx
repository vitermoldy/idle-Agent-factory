import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { FactoryDef, SlotId } from '@/game/factories'
import {
  initMachineScene,
  type MachineCamera,
  type MachineMode,
  type SceneApi,
  type SceneLive,
} from '@/scene/machine-scene'
import { cn } from '@/lib/utils'
import './agentic-factory-3d.css'

/**
 * Agentic Factory 3D, game edition: the interactive machine of one production line.
 * Fills its box. Remount it (React key) to switch lines; the game talks to it through
 * the `live` object, which must keep its identity for the life of the component.
