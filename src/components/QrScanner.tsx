"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";
import { validateTicketEntry } from "@/actions/tickets";
import { Check, X, AlertTriangle, ScanLine } from "lucide-react";

type DisplayState = "scanning" | "success" | "used" | "invalid";

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

type ScanResult = {
  status: DisplayState;
  buyer?: string;
  category?: string;
  date?: string;
  message: string;
};

export function QrScanner() {
  const [result, setResult] = useState<ScanResult | null>(null);
  const [momoRef, setMomoRef] = useState("");
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const mountedRef = useRef(false);
  const sound = useSound();

  const processToken = useCallback(async (token: string) => {
    if (scannerRef.current) {
      try { scannerRef.current.pause(true); } catch {}
    }

    try {
      const res = await validateTicketEntry(token);
      if (res.status === "SUCCESS") {
        setResult({ status: "success", buyer: res.buyer, category: res.category, message: "Accès autorisé" });
        sound.success();
      } else if (res.status === "ALREADY_USED") {
        setResult({ status: "used", buyer: res.buyer, category: res.category, date: res.date, message: "ALERTE : BILLET DÉJÀ UTILISÉ" });
        sound.error();
      } else {
        setResult({ status: "invalid", message: "FAUX BILLET / NON RECONNU" });
        sound.error();
      }
    } catch {
      setResult({ status: "invalid", message: "Erreur de vérification" });
      sound.error();
    }
  }, [sound]);

  const initScanner = useCallback(() => {
    const el = document.getElementById("qr-reader");
    if (el) el.innerHTML = "";

    if (scannerRef.current) {
      try { scannerRef.current.clear(); } catch {}
    }

    const scanner = new Html5QrcodeScanner(
      "qr-reader",
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
      (decoded) => { if (mountedRef.current) processToken(decoded); },
      () => {}
    );
  }, [processToken]);

  useEffect(() => {
    mountedRef.current = true;
    initScanner();

    return () => {
      mountedRef.current = false;
      if (scannerRef.current) {
        try { scannerRef.current.clear(); } catch {}
        scannerRef.current = null;
      }
    };
  }, [initScanner]);

  const handleMomoManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!momoRef.trim()) return;

    if (scannerRef.current) {
      try { scannerRef.current.pause(true); } catch {}
    }

    try {
      const res = await validateTicketEntry(momoRef.trim());
      if (res.status === "SUCCESS") {
        setResult({ status: "success", buyer: res.buyer, category: res.category, message: "Accès autorisé" });
        sound.success();
      } else if (res.status === "ALREADY_USED") {
        setResult({ status: "used", buyer: res.buyer, category: res.category, date: res.date, message: "ALERTE : BILLET DÉJÀ UTILISÉ" });
        sound.error();
      } else {
        setResult({ status: "invalid", message: "FAUX BILLET / NON RECONNU" });
        sound.error();
      }
    } catch {
      setResult({ status: "invalid", message: "Erreur de vérification" });
      sound.error();
    }
  };

  const next = () => {
    setResult(null);
    setMomoRef("");
    initScanner();
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
        {!result && (
          <>
            <div className="flex-1 flex flex-col items-center justify-center px-4 py-4">
              <div className="w-full max-w-sm">
                <div id="qr-reader" className="w-full rounded-2xl overflow-hidden border-2 border-amber-500/30 min-h-[300px]" />
              </div>
              <p className="text-slate-400 text-sm mt-3 text-center">Placez le QR code dans le cadre</p>
            </div>

            <div className="px-4 pb-6 border-t border-slate-800 pt-4">
              <form onSubmit={handleMomoManual} className="max-w-sm mx-auto space-y-3">
                <p className="text-xs text-slate-500 text-center">Caméra indisponible ? Valider par Référence MoMo</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={momoRef}
                    onChange={(e) => setMomoRef(e.target.value)}
                    placeholder="Référence MTN MoMo"
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

        {result?.status === "success" && (
          <div className="flex-1 flex flex-col items-center justify-center px-6 animate-fade-in-up">
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

        {result?.status === "used" && (
          <div className="flex-1 flex flex-col items-center justify-center px-6 animate-fade-in-up">
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

        {result?.status === "invalid" && (
          <div className="flex-1 flex flex-col items-center justify-center px-6 animate-fade-in-up">
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
        #qr-reader video { border-radius: 1rem !important; }
        #qr-reader img[alt="Info icon"] { display: none; }
        #qr-reader span { display: none; }
      `}</style>
    </div>
  );
}
