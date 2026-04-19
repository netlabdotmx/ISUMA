"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Camera, X, Keyboard, Loader2 } from "lucide-react";

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  scanning: boolean;
}

/**
 * Barcode scanner with two modes:
 * 1. Camera mode — uses getUserMedia + BarcodeDetector API (Chrome/Edge/Android)
 * 2. Manual mode — text input for fallback or hardware scanners
 */
export function BarcodeScanner({ onScan, scanning }: BarcodeScannerProps) {
  const [mode, setMode] = useState<"idle" | "camera" | "manual">("idle");
  const [cameraError, setCameraError] = useState("");
  const [manualCode, setManualCode] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<BarcodeDetector | null>(null);
  const animFrameRef = useRef<number>(0);

  const stopCamera = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = 0;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  const startCamera = useCallback(async () => {
    setCameraError("");
    try {
      // Check BarcodeDetector support
      if (!("BarcodeDetector" in window)) {
        setCameraError(
          "Tu navegador no soporta detección de códigos. Usa Chrome/Edge o el modo manual."
        );
        setMode("manual");
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      detectorRef.current = new BarcodeDetector({
        formats: ["ean_13", "ean_8", "code_128", "code_39", "qr_code", "upc_a", "upc_e"],
      });

      const detect = async () => {
        if (!videoRef.current || !detectorRef.current || !streamRef.current) return;
        try {
          const barcodes = await detectorRef.current.detect(videoRef.current);
          if (barcodes.length > 0) {
            const code = barcodes[0].rawValue;
            if (code) {
              onScan(code);
              stopCamera();
              setMode("idle");
              return;
            }
          }
        } catch {
          // Detection failed for this frame, continue
        }
        animFrameRef.current = requestAnimationFrame(detect);
      };
      animFrameRef.current = requestAnimationFrame(detect);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error de cámara";
      if (msg.includes("NotAllowed") || msg.includes("Permission")) {
        setCameraError("Permiso de cámara denegado. Habilítalo en la configuración del navegador.");
      } else {
        setCameraError(`No se pudo abrir la cámara: ${msg}`);
      }
      setMode("manual");
    }
  }, [onScan, stopCamera]);

  useEffect(() => {
    if (mode === "camera") {
      startCamera();
    }
    return () => stopCamera();
  }, [mode, startCamera, stopCamera]);

  function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    const code = manualCode.trim();
    if (!code) return;
    onScan(code);
    setManualCode("");
    setMode("idle");
  }

  if (mode === "idle") {
    return (
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={scanning}
          onClick={() => setMode("camera")}
          className="flex items-center gap-1.5 text-xs text-slate-300 bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
        >
          {scanning ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Camera className="h-3.5 w-3.5" />
          )}
          Escanear
        </button>
        <button
          type="button"
          disabled={scanning}
          onClick={() => setMode("manual")}
          className="flex items-center gap-1.5 text-xs text-slate-400 bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
        >
          <Keyboard className="h-3.5 w-3.5" />
          Código manual
        </button>
      </div>
    );
  }

  if (mode === "manual") {
    return (
      <form onSubmit={handleManualSubmit} className="space-y-2">
        {cameraError && (
          <p className="text-[11px] text-amber-400">{cameraError}</p>
        )}
        <div className="flex gap-2">
          <input
            type="text"
            autoFocus
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            placeholder="Escanea o escribe el código de barras..."
            className="flex-1 rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
          />
          <button
            type="submit"
            disabled={!manualCode.trim() || scanning}
            className="px-3 py-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold text-sm rounded-lg transition-colors disabled:opacity-50"
          >
            {scanning ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Buscar"
            )}
          </button>
          <button
            type="button"
            onClick={() => { setMode("idle"); setManualCode(""); setCameraError(""); }}
            className="px-2 py-2 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="text-[10px] text-slate-600">
          Puedes usar un lector de código de barras USB/Bluetooth aquí
        </p>
      </form>
    );
  }

  // Camera mode
  return (
    <div className="space-y-2">
      <div className="relative rounded-xl overflow-hidden border border-slate-700 bg-black">
        <video
          ref={videoRef}
          className="w-full h-48 object-cover"
          muted
          playsInline
        />
        {/* Scan line overlay */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-3/4 h-0.5 bg-amber-400/70 animate-pulse rounded-full shadow-lg shadow-amber-400/50" />
        </div>
        <div className="absolute top-2 right-2">
          <button
            type="button"
            onClick={() => { stopCamera(); setMode("idle"); }}
            className="p-1.5 rounded-lg bg-slate-900/80 text-slate-300 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="absolute bottom-2 left-2">
          <button
            type="button"
            onClick={() => { stopCamera(); setMode("manual"); }}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-900/80 text-xs text-slate-300 hover:text-white transition-colors"
          >
            <Keyboard className="h-3 w-3" />
            Manual
          </button>
        </div>
      </div>
      <p className="text-[10px] text-slate-500 text-center">
        Apunta la cámara al código de barras del producto
      </p>
    </div>
  );
}

// TypeScript declaration for BarcodeDetector (not in all TS libs)
declare global {
  interface BarcodeDetectorOptions {
    formats?: string[];
  }
  class BarcodeDetector {
    constructor(options?: BarcodeDetectorOptions);
    detect(image: ImageBitmapSource): Promise<{ rawValue: string; format: string }[]>;
  }
}
