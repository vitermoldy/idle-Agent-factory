/**
 * What Agentic Factory keeps in MySQL: a copy of the game save (so a factory can
 * be carried to another browser), every new series started and every factory
 * opened.
 */
export default {
  name: 'Agentic Factory',
  database: 'agentic_factory',
  port: 8796,
  maxSaveBytes: 512 * 1024,
  events: {
    /** A new series (prestige): the stars it paid out and the earnings traded for them. */
    series(data) {
      const stars = Number(data?.stars)
      const earned = Number(data?.earned)
      if (!Number.isFinite(stars) || stars < 0 || stars > 1e12) return null
      return { stars: Math.floor(stars), ...(Number.isFinite(earned) && earned >= 0 ? { earned } : {}) }
    },
    /** A factory (production line) opened for the first time. */
    factory(data) {
      const id = typeof data?.id === 'string' ? data.id : ''
      if (!/^[a-z0-9-]{2,40}$/.test(id)) return null
      return { id }
    },
  },
  async stats(pool, device) {
