import { create } from 'zustand'
import * as E from './engine'
import { FACTORIES, FACTORY_BY_ID, type FactoryId } from './factories'

const SAVE_KEY = 'agentic-factory-idle'
/** A gap longer than this between ticks (sleep, a closed tab) is counted as time away. */
const AWAY_AFTER = 30

export interface Notice {
