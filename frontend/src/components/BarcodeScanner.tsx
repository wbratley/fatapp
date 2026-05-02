import { useEffect, useRef, useState } from 'react'
import { BrowserMultiFormatReader, IScannerControls } from '@zxing/browser'
import { X, AlertCircle, ArrowRight } from 'lucide-react'

interface Props {
  onDetected: (barcode: string) => void
  onClose: () => void
}

export function BarcodeScanner({ onDetected, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const controlsRef = useRef<IScannerControls | null>(null)
  const hasDetected = useRef(false)
  const [fallback, setFallback] = useState(false)
  const [manualBarcode, setManualBarcode] = useState('')

  useEffect(() => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setFallback(true)
      return
    }

    const reader = new BrowserMultiFormatReader()

    reader
      .decodeFromVideoDevice(undefined, videoRef.current!, (result) => {
        if (result && !hasDetected.current) {
          hasDetected.current = true
          controlsRef.current?.stop()
          onDetected(result.getText())
        }
      })
      .then((controls) => {
        controlsRef.current = controls
      })
      .catch(() => {
        setFallback(true)
      })

    return () => {
      controlsRef.current?.stop()
    }
  }, []) // intentionally no deps — onDetected is stable from parent

  function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault()
    const code = manualBarcode.trim()
    if (code) onDetected(code)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 pt-safe py-4">
        <span className="text-white font-medium">Scan barcode</span>
        <button onClick={onClose} className="text-white p-2 -mr-2">
          <X size={22} />
        </button>
      </div>

      {!fallback ? (
        <>
          {/* Live camera */}
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            autoPlay
            playsInline
            muted
          />

          {/* Reticle overlay */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div
              className="w-72 h-44 rounded-2xl border-2 border-white"
              style={{ boxShadow: '0 0 0 9999px rgba(0,0,0,0.55)' }}
            />
          </div>

          <p className="absolute bottom-12 left-0 right-0 text-center text-white/60 text-sm">
            Point the camera at a barcode
          </p>
        </>
      ) : (
        /* Fallback: manual entry */
        <div className="flex-1 flex flex-col items-center justify-center px-8 text-center gap-6 mt-16">
          <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center">
            <AlertCircle size={28} className="text-zinc-400" />
          </div>
          <div>
            <p className="text-white font-semibold mb-2">Camera not available</p>
            <p className="text-zinc-400 text-sm leading-relaxed">
              Camera access requires HTTPS. Enter the barcode number below to look it up manually.
            </p>
          </div>
          <form onSubmit={handleManualSubmit} className="w-full max-w-xs space-y-3">
            <input
              type="text"
              inputMode="numeric"
              placeholder="e.g. 3017620422003"
              value={manualBarcode}
              onChange={(e) => setManualBarcode(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-zinc-800 text-white placeholder-zinc-500 border border-zinc-700 focus:outline-none focus:border-indigo-500 font-mono text-center tracking-wider"
              autoFocus
            />
            <button
              type="submit"
              disabled={!manualBarcode.trim()}
              className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-medium flex items-center justify-center gap-2 transition-colors"
            >
              Look up
              <ArrowRight size={16} />
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
