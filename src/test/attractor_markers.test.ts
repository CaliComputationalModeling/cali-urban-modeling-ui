import { describe, expect, it } from 'vitest'
import * as Emojis from '@/features/simulation/components/atractorEmojis'

describe('Etapa 4 — Atractores como emojis en Leaflet', () => {
  it('cada tipo real del backend tiene emoji definido y no vacío', () => {
    const tiposReales: Array<keyof typeof Emojis.ATRACTOR_EMOJI_CATALOG> = [
      'fachadas_ciegas',
      'vias_deterioradas',
      'residuos',
      'deficiencia_iluminacion',
    ]
    for (const t of tiposReales) {
      expect(Emojis.ATRACTOR_EMOJI_CATALOG[t]).toBeDefined()
      expect(Emojis.ATRACTOR_EMOJI_CATALOG[t]).not.toBe('')
    }
  })

  it('cada tipo tiene un emoji distinto y consistente', () => {
    const emojis = Object.values(Emojis.ATRACTOR_EMOJI_CATALOG)
    expect(new Set(emojis).size).toBe(emojis.length)
  })

  it('emojiForAtractor devuelve el emoji del catálogo para cada tipo conocido', () => {
    for (const [tipo, emoji] of Object.entries(Emojis.ATRACTOR_EMOJI_CATALOG)) {
      expect(Emojis.emojiForAtractor(tipo)).toBe(emoji)
    }
  })

  it('emojiForAtractor cae al fallback para tipos desconocidos / null', () => {
    expect(Emojis.emojiForAtractor('inventado')).toBe(Emojis.DEFAULT_ATTRACTOR_EMOJI)
    expect(Emojis.emojiForAtractor(undefined)).toBe(Emojis.DEFAULT_ATTRACTOR_EMOJI)
    expect(Emojis.emojiForAtractor(null)).toBe(Emojis.DEFAULT_ATTRACTOR_EMOJI)
    expect(Emojis.emojiForAtractor('')).toBe(Emojis.DEFAULT_ATTRACTOR_EMOJI)
  })

  it('cobertura: el catálogo no contiene categorías inventadas (fuente: TIPOS_ATRACTOR_FISICO)', () => {
    const tiposBackend = [
      'fachadas_ciegas',
      'vias_deterioradas',
      'residuos',
      'deficiencia_iluminacion',
    ]
    expect(Object.keys(Emojis.ATRACTOR_EMOJI_CATALOG).sort()).toEqual(tiposBackend.sort())
  })
})
