"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import QrScannerLib from "qr-scanner";
import { validateTicketEntry } from "@/actions/tickets";
import { Check, X, AlertTriangle, ScanLine, CameraOff, ShieldAlert } from "lucide-react";

type Step = "init" | "scanning" | "success" | "used" | "invalid";

type ScanResult = {
  step: Step;
  buyer?: string;
  category?: string;
  date?: string;
  message: string;
};

type CamError = { type: string; message: string } | null;

function useSound() {
  const audioCtxRef = useRef<AudioContext | null>(null);

  const play = useCallback((freq: number, duration: number, times = 1) => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
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
  }, []);

  return {
    success: useCallback(() => play(880, 200), [play]),
    error: useCallback(() => play(280, 250, 2), [play]),
  };
}

function camErrorToMessage(err: Error): string {
  const name = ("name" in err ? (err as DOMException).name : null) || "Error";
  const msg = err.message || "Erreur inconnue";
  console.log("Camera error:", name, msg);
  if (name === "NotAllowedError") {
    return "Permission caméra refusée. Va dans les réglages du site (icône cadenas) et autorise la caméra.";
  }
  if (name === "NotFoundError") {
    return "Aucune caméra détectée sur cet appareil.";
  }
  if (name === "NotReadableError") {
    return "La caméra est déjà utilisée par une autre application.";
  }
  return `${name}: ${msg}`;
}

export function QrScanner() {
  const [step, setStep] = useState<Step>("init");
  const [result, setResult] = useState<ScanResult | null>(null);
  const [camError, setCamError] = useState<CamError>(null);
  const [momoRef, setMomoRef] = useState("");
  const [httpsWarning, setHttpsWarning] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<QrScannerLib | null>(null);
  const sound = useSound();

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.protocol !== "https:" && !window.location.hostname.includes("localhost")) {
      setHttpsWarning(true);
    }
  }, []);

  const processToken = useCallback(async (token: string) => {
    console.log("processToken:", token.slice(0, 16) + "...");
    scannerRef.current?.stop();
    try {
      const res = await validateTicketEntry(token);
      console.log("processToken result:", res.status);
      if (res.status === "SUCCESS") {
        setResult({ step: "success", buyer: res.buyer, category: res.category, message: "Accès autorisé" });
        sound.success();
      } else if (res.status === "ALREADY_USED") {
        setResult({ step: "used", buyer: res.buyer, category: res.category, date: res.date, message: "ALERTE : BILLET DÉJÀ UTILISÉ" });
        sound.error();
      } else {
        setResult({ step: "invalid", message: "FAUX BILLET / NON RECONNU" });
        sound.error();
      }
    } catch (e) {
      console.log("processToken catch:", e);
      setResult({ step: "invalid", message: "Erreur de vérification" });
      sound.error();
    }
  }, [sound]);

  const onDecodeRef = useRef(processToken);
  onDecodeRef.current = processToken;

  const onDecodeErrorRef = useRef<(err: Error | string) => void>(() => {});
  onDecodeErrorRef.current = (error) => {
      if (error !== QrScannerLib.NO_QR_CODE_FOUND) {
        console.log("Scanner error:", error);
      }
  };
  const initGuard = useRef(false);

  useEffect(() => {
    if (initGuard.current) return;
    initGuard.current = true;

    if (!videoRef.current) {
      console.error("QrScanner: videoRef.current is null — <video> not mounted");
      return;
    }

    const scanner = new QrScannerLib(
      videoRef.current,
      (res) => {
        onDecodeRef.current(res.data);
      },
      {
        preferredCamera: "environment",
        returnDetailedScanResult: true,
        highlightScanRegion: true,
        highlightCodeOutline: true,
        onDecodeError: (error) => {
          onDecodeErrorRef.current(error);
        },
      }
    );

    scannerRef.current = scanner;
    console.log("QrScanner: scanner instance created");

    return () => {
      console.log("QrScanner: cleanup");
      scanner.stop();
      scanner.destroy();
      scannerRef.current = null;
      initGuard.current = false;
    };
  }, []);

  const startCamera = useCallback(async () => {
    console.log("startCamera: starting scanner...");
    setCamError(null);
    if (!scannerRef.current) return;

    try {
      await scannerRef.current.start();
      console.log("startCamera: scanner started successfully");
      setStep("scanning");
    } catch (err) {
      console.log("startCamera failed:", err);
      const error = err instanceof Error ? err : new Error(String(err));
      const msg = camErrorToMessage(error);
      setCamError({ type: err instanceof DOMException ? err.name : "Unknown", message: msg });
    }
  }, []);

  const handleMomoManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!momoRef.trim()) return;

    scannerRef.current?.stop();

    try {
      const res = await validateTicketEntry(momoRef.trim());
      if (res.status === "SUCCESS") {
        setResult({ step: "success", buyer: res.buyer, category: res.category, message: "Accès autorisé" });
        sound.success();
      } else if (res.status === "ALREADY_USED") {
        setResult({ step: "used", buyer: res.buyer, category: res.category, date: res.date, message: "ALERTE : BILLET DÉJÀ UTILISÉ" });
        sound.error();
      } else {
        setResult({ step: "invalid", message: "FAUX BILLET / NON RECONNU" });
        sound.error();
      }
    } catch {
      setResult({ step: "invalid", message: "Erreur de vérification" });
      sound.error();
    }
  };

  const next = () => {
    console.log("next: resetting scanner");
    setStep("init");
    setResult(null);
    setMomoRef("");
    setCamError(null);
  };

  const isResultView = result && step !== "init" && step !== "scanning";

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <header className="px-4 py-4 flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-3">
          <ScanLine className="w-5 h-5 text-amber-400" />
          <h1 className="font-display text-lg font-bold text-white">Scan</h1>
        </div>
        <span className="text-xs text-slate-500 uppercase tracking-widest">Contrôle d&apos;accès</span>
      </header>

      {httpsWarning && (
        <div className="mx-4 mt-4 px-4 py-3 rounded-xl bg-red-600/20 border border-red-500/30 text-red-400 text-sm flex items-center gap-3">
          <ShieldAlert className="w-5 h-5 flex-shrink-0" />
          <span>La caméra nécessite une connexion HTTPS sécurisée. Ouvre cette page via HTTPS ou localhost.</span>
        </div>
      )}

      {camError && (
        <div className="mx-4 mt-4 px-4 py-3 rounded-xl bg-red-600/20 border border-red-500/30 text-red-400 text-sm">
          <p className="font-bold mb-1">Erreur caméra</p>
          <p>{camError.message}</p>
        </div>
      )}

      <div className="flex-1 flex flex-col px-4 py-4">
        {!isResultView && (
          <>
            <div className="flex-1 flex flex-col items-center justify-center">
              {step === "init" && !camError && (
                <div className="text-center space-y-6">
                  <div className="w-24 h-24 rounded-full bg-slate-800 border-2 border-dashed border-slate-600 flex items-center justify-center mx-auto">
                    <CameraOff className="w-10 h-10 text-slate-500" />
                  </div>
                  <p className="text-slate-400 text-sm">Appuie sur le bouton pour activer la caméra</p>
                  <button
                    onClick={startCamera}
                    className="px-8 py-4 rounded-2xl bg-amber-600 text-white font-bold text-base shadow-lg shadow-amber-600/25 active:scale-95 transition-transform"
                  >
                    Activer la caméra
                  </button>
                </div>
              )}

              {camError && (
                <div className="text-center space-y-6">
                  <div className="w-24 h-24 rounded-full bg-red-900/30 border-2 border-dashed border-red-700 flex items-center justify-center mx-auto">
                    <CameraOff className="w-10 h-10 text-red-500" />
                  </div>
                  <p className="text-slate-400 text-sm max-w-xs">{camError.message}</p>
                  <div className="flex gap-3 justify-center">
                    <button
                      onClick={startCamera}
                      className="px-6 py-3 rounded-xl bg-amber-600 text-white font-bold text-sm active:scale-95 transition-transform"
                    >
                      Réessayer
                    </button>
                    <button
                      onClick={() => setCamError(null)}
                      className="px-6 py-3 rounded-xl bg-slate-800 text-slate-300 font-medium text-sm active:scale-95 transition-transform"
                    >
                      Ignorer
                    </button>
                  </div>
                </div>
              )}

              <div className={`w-full max-w-sm ${step === "scanning" && !camError ? "" : "hidden"}`}>
                <div className="w-full min-h-[300px] rounded-2xl overflow-hidden border-2 border-amber-500/30 bg-black">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover min-h-[300px]"
                  />
                </div>
              </div>
              {step === "scanning" && !camError && (
                <p className="text-slate-400 text-sm mt-4 text-center">Placez le QR code dans le cadre</p>
              )}
            </div>

            <div className="pt-4 pb-2 border-t border-slate-800 mt-auto">
              <form onSubmit={handleMomoManual} className="max-w-sm mx-auto space-y-3">
                <p className="text-xs text-slate-500 text-center">Caméra indisponible ? Valider par Référence MoMo</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={momoRef}
                    onChange={(e) => setMomoRef(e.target.value)}
                    placeholder="Référence MTN MoMo ou token"
                    className="flex-1 px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder:text-slate-600 focus:border-amber-500 focus:outline-none text-sm"
                  />
                  <button
                    type="submit"
                    disabled={!momoRef.trim()}
                    className="px-5 py-3 rounded-xl bg-amber-600 text-white font-medium disabled:opacity-40 active:scale-95 transition-all"
                  >
                    OK
                  </button>
                </div>
              </form>
            </div>
          </>
        )}

        {result?.step === "success" && (
          <div className="flex-1 flex flex-col items-center justify-center animate-fade-in-up">
            <div className="w-full max-w-sm bg-emerald-600 rounded-3xl p-8 text-center shadow-xl shadow-emerald-600/30">
              <div className="w-20 h-20 mx-auto rounded-full bg-emerald-400/20 flex items-center justify-center mb-5">
                <Check className="w-10 h-10 text-emerald-200" />
              </div>
              <p className="text-3xl font-black text-white mb-3">ACCÈS AUTORISÉ</p>
              <div className="w-12 h-px bg-emerald-400/40 mx-auto mb-3" />
              <p className="text-emerald-100 text-lg font-bold">{result.buyer}</p>
              <p className="text-emerald-200/70 text-sm mt-1">{result.category}</p>
            </div>
            <button onClick={next} className="mt-8 w-full max-w-xs py-4 rounded-2xl bg-amber-600 text-white font-bold text-base shadow-lg active:scale-95 transition-all">
              Scanner le billet suivant
            </button>
          </div>
        )}

        {result?.step === "used" && (
          <div className="flex-1 flex flex-col items-center justify-center animate-fade-in-up">
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
            <button onClick={next} className="mt-8 w-full max-w-xs py-4 rounded-2xl bg-amber-600 text-white font-bold text-base shadow-lg active:scale-95 transition-all">
              Scanner le billet suivant
            </button>
          </div>
        )}

        {result?.step === "invalid" && (
          <div className="flex-1 flex flex-col items-center justify-center animate-fade-in-up">
            <div className="w-full max-w-sm bg-red-600 rounded-3xl p-8 text-center shadow-xl shadow-red-600/30">
              <div className="w-20 h-20 mx-auto rounded-full bg-red-400/20 flex items-center justify-center mb-5">
                <X className="w-10 h-10 text-red-200" />
              </div>
              <p className="text-2xl font-black text-white mb-3">TICKET INVALIDE</p>
              <div className="w-12 h-px bg-red-400/40 mx-auto mb-3" />
              <p className="text-red-100">{result.message}</p>
            </div>
            <button onClick={next} className="mt-8 w-full max-w-xs py-4 rounded-2xl bg-amber-600 text-white font-bold text-base shadow-lg active:scale-95 transition-all">
              Scanner le billet suivant
            </button>
          </div>
        )}
      </div>

      <style jsx global>{`
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
