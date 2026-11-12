import { describe, expect, it } from 'vitest'
import * as E from '../src/game/engine'
import { FACTORIES, FACTORY_BY_ID } from '../src/game/factories'

const video = FACTORY_BY_ID.video
const rich = (cash: number) => ({ ...E.newGame(0), cash })

