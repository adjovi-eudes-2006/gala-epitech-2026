"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getMyTicket } from "@/actions/tickets";
import { X, Search } from "lucide-react";

export function TicketLookup() {
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [reference, setReference] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [found, setFound] = useState<{
    orderId: string;
    buyerName: string;
    eventTitle: string;
  } | null>(null);
  const router = useRouter();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    setFound(null);

    const result = await getMyTicket(phone, reference);
    setLoading(false);

    if (result.success && result.orderId) {
      setFound({
        orderId: result.orderId,
        buyerName: result.buyerName || "",
        eventTitle: result.eventTitle || "",
      });
    } else {
      setError(result.error || "Informations invalides ou billet introuvable");
    }
  };

  const goToOrder = (orderId: string) => {
    setOpen(false);
    setPhone("");
    setReference("");
    setFound(null);
    router.push(`/order-status/${orderId}`);
  };

  return (
    <>
      <button
        onClick={() => {
          setOpen(true);
          setFound(null);
          setError("");
        }}
        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-zinc-900 text-zinc-300 font-medium border border-zinc-700 hover:bg-zinc-800 hover:border-gala-500/50 transition-all active:scale-[0.98]"
      >
        <Search className="w-4 h-4" />
        Retrouver mon billet
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md p-6 shadow-2xl animate-fade-in-up">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display text-lg font-bold text-white">Retrouver mon billet</h2>
              <button
                onClick={() => { setOpen(false); setFound(null); setError(""); }}
                className="p-2 rounded-xl text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {!found ? (
              <form onSubmit={handleSearch} className="space-y-4">
                <p className="text-sm text-zinc-400">
                  Entrez le numéro de téléphone et l'ID de transaction MoMo utilisés lors de l&apos;achat.
                </p>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Numéro de téléphone"
                  className="w-full px-4 py-3 rounded-xl bg-zinc-800 border border-zinc-700 text-white placeholder:text-zinc-600 focus:border-gala-500 focus:outline-none text-lg"
                  autoFocus
                />
                <input
                  type="text"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="ID de transaction MoMo"
                  className="w-full px-4 py-3 rounded-xl bg-zinc-800 border border-zinc-700 text-white placeholder:text-zinc-600 focus:border-gala-500 focus:outline-none text-lg"
                />
                {error && (
                  <p className="text-red-400 text-sm">{error}</p>
                )}
                <button
                  type="submit"
                  disabled={loading || !phone.trim() || !reference.trim()}
                  className="w-full py-3 rounded-xl bg-gala-600 text-white font-bold text-base disabled:opacity-50 active:scale-[0.98] transition-all"
                >
                  {loading ? "Recherche..." : "Rechercher"}
                </button>
              </form>
            ) : (
              <div className="space-y-4 text-center">
                <div className="p-4 rounded-xl bg-zinc-800/50 border border-zinc-700">
                  <p className="text-white font-semibold">{found.buyerName}</p>
                  <p className="text-zinc-400 text-sm mt-1">{found.eventTitle}</p>
                </div>
                <button
                  onClick={() => goToOrder(found.orderId)}
                  className="w-full py-3 rounded-xl bg-gala-600 text-white font-bold text-base active:scale-[0.98] transition-all"
                >
                  Voir mon billet
                </button>
                <button
                  onClick={() => { setFound(null); setError(""); }}
                  className="w-full py-2 text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  Nouvelle recherche
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
