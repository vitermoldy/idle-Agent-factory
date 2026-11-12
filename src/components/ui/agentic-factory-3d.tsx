import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { FactoryDef, SlotId } from '@/game/factories'
import {
  initMachineScene,
  type MachineCamera,
  type MachineMode,
  type SceneApi,
  type SceneLive,
} from '@/scene/machine-scene'
