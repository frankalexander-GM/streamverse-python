'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, ZoomIn, Download } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

/**
 * Lightbox reutilizable para ver imágenes a tamaño completo.
 * Se renderiza via portal (fuera del DOM normal) para evitar z-index issues.
 */
export function ImageWithLightbox({
  src,
  alt = '',
  className = '',
  rounded = 'rounded-xl',
}: {
  src: string
  alt?: string
  className?: string
  rounded?: string
}) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open])

  return (
    <>
      <div
        className={`group relative cursor-pointer overflow-hidden ${rounded} ${className}`}
        onClick={() => setOpen(true)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(true) } }}
      >
        <img src={src} alt={alt} className="h-full w-full object-cover" loading="lazy" />
        {/* Overlay siempre visible, suavecito y transparente */}
        <div className="absolute inset-0 flex items-end justify-center bg-gradient-to-t from-black/50 via-transparent to-transparent">
          <div className="mb-2 flex items-center gap-1.5 rounded-full bg-black/40 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-sm">
            <ZoomIn className="h-3 w-3" />
            Haz clic para ver tamaño completo
          </div>
        </div>
      </div>

      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
              onClick={() => setOpen(false)}
            >
              <button
                className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-md transition-colors hover:bg-white/20"
                onClick={(e) => { e.stopPropagation(); setOpen(false) }}
                aria-label="Cerrar"
              >
                <X className="h-6 w-6" />
              </button>

              <a
                href={src}
                download
                onClick={(e) => e.stopPropagation()}
                className="absolute right-4 bottom-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-md transition-colors hover:bg-white/20"
                aria-label="Descargar"
              >
                <Download className="h-5 w-5" />
              </a>

              <motion.img
                src={src}
                alt={alt}
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="max-h-[90vh] max-w-[95vw] rounded-lg object-contain shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              />
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  )
}
