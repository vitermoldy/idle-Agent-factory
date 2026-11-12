// The five production lines. Each one reuses the same five-station machine (the slots are
// the geometry archetypes of the 3D scene) with its own product, economy and painted screens.

export type FactoryId = 'video' | 'web' | 'podcast' | 'app' | 'ebook'
export type SlotId = 'cabinet' | 'engine' | 'admin' | 'storefront' | 'cashdesk'
export type PropKind = 'reels' | 'rack' | 'mic' | 'phone' | 'books'

