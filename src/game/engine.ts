// Pure game rules: no React, no DOM. Every function returns a new state, so the store and the
// balance script share exactly the same arithmetic.
import {
  FACTORIES,
  FACTORY_BY_ID,
  type FactoryDef,
  type FactoryId,
  type ProductDef,
} from './factories.ts'

export const SAVE_VERSION = 3
/** A station doubles its speed when it reaches each of these levels. */
