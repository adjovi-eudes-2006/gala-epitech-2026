"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";
import { verifyAndUseTicket } from "@/actions/tickets";
import { Check, X, AlertTriangle, Camera, ScanLine } from "lucide-react";
import type { VerificationResult } from "@/types";

type DisplayState = "idle" | "scanning" | "success" | "used" | "invalid";

function useSound() {
  const audioCtxRef = useRef<AudioContext | null>(null);

  const getCtx = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
    return audioCtxRef.current;
  }, []);

  const playBeep = useCallback((freq: number, duration: number, times = 1) => {
    try {
      const ctx = getCtx();
      for (let i = 0; i < times; i++) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, ctx.currentTime + i * (duration + 0.05) / 1000);
        gain.gain.setValueAtTime(0.5, ctx.currentTime + i * (duration + 0.05) / 1000);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * (duration + 0.05) / 1000 + duration / 1000);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + i * (duration + 0.05) / 1000);
        osc.stop(ctx.currentTime + i * (duration + 0.05) / 1000 + duration / 1000);
      }
    } catch {}
  }, [getCtx]);

  return {
    playSuccess: useCallback(() => playBeep(880, 200), [playBeep]),
    playError: useCallback(() => playBeep(280, 250, 2), [playBeep]),
  };
}

export function QrScanner() {
  const [display, setDisplay] = useState<DisplayState>("idle");
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [manualCode, setManualCode] = useState("");
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const containerId = "qr-scanner-container";
  const { playSuccess, playError } = useSound();

  const handleResult = useCallback(async (code: string) => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.pause(true);
      } catch {}
    }

    try {
      const res = await verifyAndUseTicket(code);
      setResult(res);
      if (res.status === "SUCCESS") {
        setDisplay("success");
        playSuccess();
      } else if (res.status === "ALREADY_USED") {
        setDisplay("used");
        playError();
      } else {
        setDisplay("invalid");
        playError();
      }
    } catch {
      setResult({ status: "INVALID", message: "Erreur de vérification" });
      setDisplay("invalid");
      playError();
    }
  }, [playSuccess, playError]);

  const resetScanner = useCallback(() => {
    setDisplay("idle");
    setResult(null);
    setManualCode("");

    const el = document.getElementById(containerId);
    if (el) el.innerHTML = "";

    if (scannerRef.current) {
      try {
        scannerRef.current.clear();
      } catch {}
    }

    const scanner = new Html5QrcodeScanner(
      containerId,
      {
        fps: 10,
        qrbox: { width: 280, height: 280 },
        rememberLastUsedCamera: true,
        showTorchButtonIfSupported: true,
        aspectRatio: 1,
      },
      false
    );

    scannerRef.current = scanner;
    scanner.render(
      (decoded) => handleResult(decoded),
      () => {}
    );
    setDisplay("scanning");
  }, [handleResult]);

  useEffect(() => {
    const scanner = new Html5QrcodeScanner(
      containerId,
      {
        fps: 10,
        qrbox: { width: 280, height: 280 },
        rememberLastUsedCamera: true,
        showTorchButtonIfSupported: true,
        aspectRatio: 1,
      },
      false
    );

    scannerRef.current = scanner;

    try {
      scanner.render(
        (decoded) => handleResult(decoded),
        () => {}
      );
      setDisplay("scanning");
    } catch {
      setDisplay("idle");
    }

    return () => {
      try {
        scanner.clear();
      } catch {}
    };
  }, [handleResult]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      if (scannerRef.current) {
        try {
          scannerRef.current.pause(true);
        } catch {}
      }
      handleResult(manualCode.trim());
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <header className="px-4 py-4 flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-3">
          <ScanLine className="w-5 h-5 text-amber-400" />
          <h1 className="font-display text-lg font-bold text-white">Scan</h1>
        </div>
        <span className="text-xs text-slate-500 uppercase tracking-widest">Contrôle d&apos;accès</span>
      </header>

      <div className="flex-1 flex flex-col">
        {display === "scanning" && (
          <div className="flex-1 flex flex-col items-center justify-center px-4 py-6">
            <div className="relative w-full max-w-sm">
              <div id={containerId} className="w-full rounded-2xl overflow-hidden border-2 border-amber-500/30" />
              <div className="absolute inset-0 rounded-2xl ring-2 ring-amber-400/20 pointer-events-none" />
            </div>
            <p className="text-slate-400 text-sm mt-4 text-center">
              Placez le QR code dans le cadre
            </p>
          </div>
        )}

        {display === "idle" && (
          <div className="flex-1 flex flex-col items-center justify-center px-6 gap-6 text-center">
            <div className="w-24 h-24 rounded-full bg-slate-800 border-2 border-dashed border-slate-600 flex items-center justify-center">
              <Camera className="w-10 h-10 text-slate-500" />
            </div>
            <p className="text-slate-400 text-sm max-w-xs">
              Autorisez l&apos;accès à la caméra pour scanner les tickets.
            </p>
            <button
              onClick={resetScanner}
              className="px-8 py-4 rounded-2xl bg-amber-600 text-white font-bold text-base shadow-lg shadow-amber-600/25 active:scale-95 transition-transform"
            >
              Activer la caméra
            </button>
            <div className="w-full max-w-xs border-t border-slate-800 pt-6">
              <form onSubmit={handleManualSubmit} className="space-y-3">
                <p className="text-sm text-slate-500">Saisie manuelle</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    placeholder="UUID du ticket"
                    className="flex-1 px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder:text-slate-600 focus:border-amber-500 focus:outline-none text-sm"
                  />
                  <button
                    type="submit"
                    disabled={!manualCode.trim()}
                    className="px-5 py-3 rounded-xl bg-slate-800 text-white font-medium disabled:opacity-40 active:scale-95 transition-all"
                  >
                    OK
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {display === "success" && result && (
          <div className="flex-1 flex flex-col items-center justify-center px-6 animate-fadeInUp">
            <div className="w-full max-w-sm bg-emerald-600 rounded-3xl p-8 text-center shadow-xl shadow-emerald-600/30">
              <div className="w-20 h-20 mx-auto rounded-full bg-emerald-400/20 flex items-center justify-center mb-5">
                <Check className="w-10 h-10 text-emerald-200" />
              </div>
              <p className="text-3xl font-black text-white mb-3">ACCÈS AUTORISÉ</p>
              <div className="w-12 h-px bg-emerald-400/40 mx-auto mb-3" />
              <p className="text-emerald-100 text-lg font-bold">{result.buyer}</p>
              <p className="text-emerald-200/70 text-sm mt-1">{result.category}</p>
            </div>
            <button
              onClick={resetScanner}
              className="mt-8 w-full max-w-xs py-4 rounded-2xl bg-amber-600 text-white font-bold text-base shadow-lg active:scale-95 transition-all"
            >
              Scanner le billet suivant
            </button>
          </div>
        )}

        {display === "used" && result && (
          <div className="flex-1 flex flex-col items-center justify-center px-6 animate-fadeInUp">
            <div className="w-full max-w-sm bg-yellow-600 rounded-3xl p-8 text-center shadow-xl shadow-yellow-600/30">
              <div className="w-20 h-20 mx-auto rounded-full bg-yellow-400/20 flex items-center justify-center mb-5">
                <AlertTriangle className="w-10 h-10 text-yellow-200" />
              </div>
              <p className="text-2xl font-black text-white mb-3">DÉJÀ SCANNÉ</p>
              <div className="w-12 h-px bg-yellow-400/40 mx-auto mb-3" />
              <p className="text-yellow-100 text-lg font-bold">{result.buyer}</p>
              <p className="text-yellow-200/70 text-sm mt-1">{result.category}</p>
              {result.date && (
                <p className="text-yellow-200/50 text-xs mt-3">{new Date(result.date).toLocaleString("fr-FR")}</p>
              )}
            </div>
            <button
              onClick={resetScanner}
              className="mt-8 w-full max-w-xs py-4 rounded-2xl bg-amber-600 text-white font-bold text-base shadow-lg active:scale-95 transition-all"
            >
              Scanner le billet suivant
            </button>
          </div>
        )}

        {display === "invalid" && result && (
          <div className="flex-1 flex flex-col items-center justify-center px-6 animate-fadeInUp">
            <div className="w-full max-w-sm bg-red-600 rounded-3xl p-8 text-center shadow-xl shadow-red-600/30">
              <div className="w-20 h-20 mx-auto rounded-full bg-red-400/20 flex items-center justify-center mb-5">
                <X className="w-10 h-10 text-red-200" />
              </div>
              <p className="text-2xl font-black text-white mb-3">TICKET INVALIDE</p>
              <div className="w-12 h-px bg-red-400/40 mx-auto mb-3" />
              <p className="text-red-100">{result.message}</p>
            </div>
            <button
              onClick={resetScanner}
              className="mt-8 w-full max-w-xs py-4 rounded-2xl bg-amber-600 text-white font-bold text-base shadow-lg active:scale-95 transition-all"
            >
              Scanner le billet suivant
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
