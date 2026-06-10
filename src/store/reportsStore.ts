import { create } from 'zustand'
import { reportsEndpoints, type GenerateReportRequest, type ReportHistoryItem } from '@/services/endpoints'

function extractErrorMessage(data: unknown): string {
  if (data && typeof data === 'object' && 'detail' in data) return String((data as { detail: unknown }).detail)
  return 'No fue posible completar la operación'
}

function parseContentDispositionFilename(contentDisposition: string | null): string | null {
  if (!contentDisposition) return null
  // RFC 5987: filename*=UTF-8''...
  const utf8Match = /filename\*\s*=\s*UTF-8''([^;]+)/i.exec(contentDisposition)
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1])
    } catch {
      return utf8Match[1]
    }
  }

  const plainMatch = /filename\s*=\s*"?([^"]+)"?/i.exec(contentDisposition)
  return plainMatch?.[1] ?? null
}

function defaultFileName(payload: GenerateReportRequest): string {
  const ext = payload.formato === 'pdf' ? 'pdf' : 'xlsx'
  return `reporte_${payload.tipo_plantilla}_${payload.fecha_inicio}_a_${payload.fecha_fin}.${ext}`
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

interface ReportsState {
  history: ReportHistoryItem[]
  isLoadingHistory: boolean
  isGenerating: boolean
  error: string | null

  fetchHistory: () => Promise<void>
  generate: (payload: GenerateReportRequest) => Promise<void>
  clearError: () => void
}

export const useReportsStore = create<ReportsState>((set, get) => ({
  history: [],
  isLoadingHistory: false,
  isGenerating: false,
  error: null,

  fetchHistory: async () => {
    set({ isLoadingHistory: false, error: null })
  },

  generate: async (payload) => {
    const optimisticId = `local-${Date.now()}`
    const optimisticItem: ReportHistoryItem = {
      id: optimisticId,
      plantilla: payload.tipo_plantilla,
      formato: payload.formato,
      fecha_inicio: payload.fecha_inicio,
      fecha_fin: payload.fecha_fin,
      creado_en: new Date().toISOString(),
      estado: 'PENDIENTE',
      archivo_nombre: defaultFileName(payload),
    }

    // optimistic update
    const prevHistory = get().history
    set({
      isGenerating: true,
      error: null,
      history: [optimisticItem, ...prevHistory],
    })

    const res = await reportsEndpoints.generate(payload)
    if (!res.ok || !res.data) {
      // rollback
      set({
        isGenerating: false,
        error: extractErrorMessage(res.data),
        history: prevHistory,
      })
      return
    }

    const filename =
      parseContentDispositionFilename(res.headers.get('content-disposition')) ??
      defaultFileName(payload)

    try {
      triggerDownload(res.data, filename)
    } catch {
      // si el navegador bloquea descarga, igual mantenemos estado
    }

    // finalize optimistic item
    set((state) => ({
      isGenerating: false,
      history: state.history.map((h) =>
        h.id === optimisticId
          ? { ...h, estado: 'GENERADO', archivo_nombre: filename }
          : h
      ),
    }))

    // best-effort refresh (si existe)
    get().fetchHistory().catch(() => null)
  },

  clearError: () => set({ error: null }),
}))

