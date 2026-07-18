"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import QRCode from "qrcode";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Printer, CheckCircle, Clock, AlertCircle, Calendar, MapPin, Shirt } from "lucide-react";
import { formatPrice, formatDateShort } from "@/lib/utils";
import { getOrderById } from "@/actions/tickets";

interface OrderStatusViewProps {
  order: {
    id: string;
    status: string;
    buyerName: string;
    totalAmount: number;
    tickets: { id: string; categoryName: string; secureToken: string; isUsed: boolean }[];
    eventTitle: string;
    eventDate: string;
    eventLocation: string;
    ticketBackgroundUrl?: string;
    ticketEyebrowText?: string;
    ticketQuoteText?: string;
  };
}

function CornerOrnaments() {
  return (
    <>
      <div className="absolute top-2 left-2 sm:top-3 sm:left-3 w-4 h-4 sm:w-6 sm:h-6 border-t-2 border-l-2 border-amber-500/60 rounded-tl" />
      <div className="absolute top-2 right-2 sm:top-3 sm:right-3 w-4 h-4 sm:w-6 sm:h-6 border-t-2 border-r-2 border-amber-500/60 rounded-tr" />
      <div className="absolute bottom-2 left-2 sm:bottom-3 sm:left-3 w-4 h-4 sm:w-6 sm:h-6 border-b-2 border-l-2 border-amber-500/60 rounded-bl" />
      <div className="absolute bottom-2 right-2 sm:bottom-3 sm:right-3 w-4 h-4 sm:w-6 sm:h-6 border-b-2 border-r-2 border-amber-500/60 rounded-br" />
    </>
  );
}

function TicketCard({
  ticket,
  index,
  total,
  order,
  canvasRefs,
}: {
  ticket: { id: string; categoryName: string; secureToken: string; isUsed: boolean };
  index: number;
  total: number;
  order: OrderStatusViewProps["order"];
  canvasRefs: React.MutableRefObject<Record<string, HTMLCanvasElement | null>>;
}) {
  const bgUrl = order.ticketBackgroundUrl;
  const ticketRef = useRef<HTMLDivElement>(null);
  const eyebrowText = order.ticketEyebrowText || "INVITATION";
  const quoteText = order.ticketQuoteText || "Une soirée d'exception vous attend";

  useEffect(() => {
    const canvas = canvasRefs.current[ticket.id];
    if (canvas) {
      QRCode.toCanvas(canvas, ticket.secureToken, {
        width: 240,
        margin: 2,
        color: { dark: "#09090b", light: "#ffffff" },
      }, (error) => {
        if (!error && canvas) {
          canvas.style.width = "100%";
          canvas.style.height = "100%";
        }
      });
    }
  }, [ticket.id, ticket.secureToken, canvasRefs]);

  return (
    <div ref={ticketRef} className="print-area w-full">
      <div
        className="relative bg-zinc-950 border-2 border-amber-500/40 rounded-2xl overflow-hidden shadow-[0_0_40px_rgba(212,175,55,0.08)]"
        style={bgUrl ? { backgroundImage: `url(${bgUrl})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
      >
        {bgUrl && (
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/60 to-black/70" />
        )}

        <div className="relative z-10">
          <CornerOrnaments />

          <div className="flex flex-col sm:flex-row gap-0 sm:gap-x-4 md:gap-x-6">
            {/* TOP / LEFT — INFO SECTION */}
            <div className="flex-1 p-5 sm:p-6 md:p-7 relative overflow-hidden">
              <div className="absolute inset-0 opacity-[0.03]">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full bg-amber-400 blur-3xl" />
              </div>
              <div className="relative z-10 text-center">
                <p className="font-display text-amber-400/60 text-xs sm:text-sm tracking-[0.4em] uppercase mb-2">
                  {ticket.isUsed ? "UTILISÉ" : eyebrowText}
                </p>
                <h2 className="font-display text-xl sm:text-2xl md:text-3xl font-bold text-white leading-tight tracking-wide break-words">
                  {order.eventTitle}
                </h2>
                <p className="text-amber-400/80 text-xs sm:text-sm font-display italic mt-1">{ticket.categoryName}</p>

                <div className="w-10 sm:w-12 h-px bg-gradient-to-r from-transparent via-amber-500 to-transparent mx-auto my-3 sm:my-3.5" />

                <div className="space-y-3 sm:space-y-3 text-left max-w-xs mx-auto">
                  <div className="flex items-center gap-2.5 sm:gap-3">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                      <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[9px] sm:text-[10px] text-zinc-600 uppercase tracking-wider font-medium">Date</p>
                      <p className="text-zinc-200 text-xs sm:text-sm font-medium truncate">{formatDateShort(order.eventDate)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5 sm:gap-3">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[9px] sm:text-[10px] text-zinc-600 uppercase tracking-wider font-medium">Lieu</p>
                      <p className="text-zinc-200 text-xs sm:text-sm font-medium truncate">{order.eventLocation}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5 sm:gap-3">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                      <Shirt className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[9px] sm:text-[10px] text-zinc-600 uppercase tracking-wider font-medium">Dress Code</p>
                      <p className="text-zinc-200 text-xs sm:text-sm font-medium">Tenue de soirée</p>
                    </div>
                  </div>
                </div>

                {quoteText && (
                  <p className="text-amber-400/40 italic text-[10px] sm:text-xs mt-3.5 sm:mt-4 font-display">
                    &ldquo;{quoteText}&rdquo;
                  </p>
                )}
              </div>
            </div>

            {/* HORIZONTAL PERFORATED DIVIDER — mobile only */}
            <div className="sm:hidden relative w-[calc(100%-3rem)] mx-auto h-px my-0">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-full h-px"
                  style={{
                    backgroundImage: `repeating-linear-gradient(to right, #D4AF37 0px, #D4AF37 2px, transparent 2px, transparent 8px)`,
                  }}
                />
              </div>
              <div className="absolute left-0 top-1/2 -translate-y-1/2 -ml-1.5 w-2.5 h-2.5 rounded-full bg-zinc-950 border border-amber-500/40" />
              <div className="absolute right-0 top-1/2 -translate-y-1/2 -mr-1.5 w-2.5 h-2.5 rounded-full bg-zinc-950 border border-amber-500/40" />
            </div>

            {/* VERTICAL PERFORATED DIVIDER — sm+ */}
            <div className="hidden sm:block self-stretch border-l border-dashed border-amber-500/40 relative mx-3">
              <div className="absolute left-1/2 -translate-x-1/2 top-0 -mt-2 w-3 h-3 rounded-full bg-zinc-950 border border-amber-500/40 z-10" />
              <div className="absolute left-1/2 -translate-x-1/2 bottom-0 -mb-2 w-3 h-3 rounded-full bg-zinc-950 border border-amber-500/40 z-10" />
            </div>

            {/* BOTTOM / RIGHT — QR SECTION */}
            <div className="w-full sm:w-auto sm:min-w-[190px] md:min-w-[210px] p-5 sm:p-6 md:p-7 flex flex-col items-center justify-center flex-shrink-0 bg-zinc-900/80">
              <div className="bg-white rounded-xl p-1.5 shadow-lg w-full max-w-[200px] sm:max-w-[160px] md:max-w-[175px]">
                <div className="w-full aspect-square">
                  <canvas
                    ref={(el) => { canvasRefs.current[ticket.id] = el; }}
                    className="block w-full h-full"
                  />
                </div>
              </div>
              <p className="text-[9px] sm:text-[10px] text-amber-500/70 font-mono mt-2.5 sm:mt-3 tracking-wider break-all text-center max-w-full">
                N° {ticket.secureToken.slice(0, 8).toUpperCase()}
              </p>
              <div className={`mt-2.5 sm:mt-3 flex items-center gap-1.5 text-[9px] sm:text-[10px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${
                ticket.isUsed ? "bg-red-500/15 text-red-400" : "bg-emerald-500/15 text-emerald-400"
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${ticket.isUsed ? "bg-red-400" : "bg-emerald-400"}`} />
                {ticket.isUsed ? "Utilisé" : "Valide"}
              </div>
            </div>
          </div>

          {/* Used watermark */}
          {ticket.isUsed && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
              <p className="text-5xl sm:text-7xl md:text-8xl font-black text-red-500/10 rotate-[-25deg] font-display tracking-widest select-none">
                UTILISÉ
              </p>
            </div>
          )}
        </div>
      </div>

      {total > 1 && (
        <p className="text-center text-zinc-700 text-xs mt-2">
          Ticket {index + 1} sur {total}
        </p>
      )}
    </div>
  );
}

export function OrderStatusView({ order: initialOrder }: OrderStatusViewProps) {
  const canvasRefs = useRef<Record<string, HTMLCanvasElement | null>>({});
  const [order, setOrder] = useState(initialOrder);
  const [polling, setPolling] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchOrder = useCallback(async () => {
    const updated = await getOrderById(initialOrder.id);
    if (updated && updated.status !== order.status) {
      setOrder(updated as typeof order);
    }
  }, [initialOrder.id, order.status]);

  useEffect(() => {
    localStorage.setItem("last_gala_order_id", initialOrder.id);
  }, [initialOrder.id]);

  useEffect(() => {
    if (order.status !== "PENDING") {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
        setPolling(false);
      }
      return;
    }

    setPolling(true);
    pollRef.current = setInterval(fetchOrder, 5000);

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
        setPolling(false);
      }
    };
  }, [order.status, fetchOrder]);

  if (order.status === "PENDING") {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-zinc-950">
        <Card className="p-8 sm:p-10 max-w-lg w-full text-center border-zinc-800 bg-zinc-900">
          <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-amber-500/20 text-amber-400 mb-5 sm:mb-6 animate-pulse-slow">
            <Clock className="w-8 h-8 sm:w-10 sm:h-10" />
          </div>
          <h1 className="font-display text-xl sm:text-2xl font-bold text-white mb-3">Paiement en attente de vérification</h1>
          <p className="text-zinc-400 text-sm sm:text-base mb-2">Merci {order.buyerName} ! Votre commande est en cours de traitement.</p>
          <p className="text-zinc-500 text-xs sm:text-sm mb-5 sm:mb-6">Notre équipe vérifie manuellement votre transfert MTN MoMo.</p>
          <div className="animate-blink inline-flex items-center gap-2 sm:gap-3 text-xs sm:text-sm bg-zinc-800 rounded-xl px-4 sm:px-5 py-2.5 sm:py-3 mb-5 sm:mb-6">
            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-amber-400" />
            <span className="text-zinc-300">Vérification en cours...{polling ? " (auto)" : ""}</span>
          </div>
          <Button variant="secondary" fullWidth onClick={() => { fetchOrder(); }}>
            Rafraîchir le statut
          </Button>
        </Card>
      </div>
    );
  }

  if (order.status === "VALIDATED") {
    return (
      <div className="max-w-3xl mx-auto space-y-6 sm:space-y-8 py-8 sm:py-10 px-3 sm:px-4 bg-zinc-950 min-h-screen">
        <div className="text-center space-y-2 sm:space-y-3 no-print">
          <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-emerald-500/20 text-emerald-400">
            <CheckCircle className="w-8 h-8 sm:w-10 sm:h-10" />
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-white">Paiement confirmé !</h1>
          <p className="text-zinc-400 text-sm sm:text-base">{order.tickets.length} ticket{order.tickets.length > 1 ? "s" : ""} pour {order.buyerName}</p>
        </div>

        <Card className="p-4 sm:p-6 no-print border-zinc-800 bg-zinc-900/80">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-zinc-400 text-xs sm:text-sm">Total payé</p>
              <p className="text-lg sm:text-2xl font-bold text-amber-400">{formatPrice(order.totalAmount)}</p>
            </div>
            <div className="text-right">
              <p className="text-zinc-400 text-xs sm:text-sm">Statut</p>
              <p className="text-emerald-400 font-semibold text-sm sm:text-base">Validé</p>
            </div>
          </div>
        </Card>

        <div className="space-y-5 sm:space-y-6">
          {order.tickets.map((ticket, idx) => (
            <TicketCard
              key={ticket.id}
              ticket={ticket}
              index={idx}
              total={order.tickets.length}
              order={order}
              canvasRefs={canvasRefs}
            />
          ))}
        </div>

        <div className="flex justify-center no-print pt-2 sm:pt-4">
          <Button variant="secondary" onClick={() => window.print()}>
            <Printer className="w-4 h-4" /> Télécharger / Imprimer
          </Button>
        </div>

        <p className="text-center text-zinc-700 text-[10px] sm:text-xs no-print pb-6 sm:pb-8">
          Présentez ce billet (numérique ou imprimé) au contrôle d&apos;accès.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-zinc-950">
      <Card className="p-8 sm:p-10 max-w-lg w-full text-center border-zinc-800 bg-zinc-900">
        <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-red-500/20 text-red-400 mb-5 sm:mb-6">
          <AlertCircle className="w-8 h-8 sm:w-10 sm:h-10" />
        </div>
        <h1 className="font-display text-xl sm:text-2xl font-bold text-white mb-3">Paiement rejeté</h1>
        <p className="text-zinc-400 text-sm sm:text-base mb-5 sm:mb-6">Votre commande a été rejetée. L'ID de transaction MoMo fourni est incorrect.</p>
        <p className="text-zinc-500 text-xs sm:text-sm">Veuillez réessayer ou contacter l&apos;organisateur.</p>
      </Card>
    </div>
  );
}
