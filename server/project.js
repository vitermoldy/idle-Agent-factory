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
