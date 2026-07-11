"use client";

import { useEffect, useRef } from "react";
import QRCode from "qrcode";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Printer, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { formatPrice, formatDateShort } from "@/lib/utils";

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
  };
}

export function OrderStatusView({ order }: OrderStatusViewProps) {
  const canvasRefs = useRef<Record<string, HTMLCanvasElement | null>>({});

  useEffect(() => {
    localStorage.setItem("last_gala_order_id", order.id);
  }, [order.id]);

  useEffect(() => {
    if (order.status === "VALIDATED") {
      order.tickets.forEach((ticket) => {
        const canvas = canvasRefs.current[ticket.id];
        if (canvas) {
          QRCode.toCanvas(canvas, ticket.secureToken, {
            width: 200, margin: 2, color: { dark: "#09090b", light: "#ffffff" },
          });
        }
      });
    }
  }, [order.status, order.tickets]);

  if (order.status === "PENDING") {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <Card className="p-10 max-w-lg w-full text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gala-500/20 text-gala-400 mb-6 animate-pulse-slow">
            <Clock className="w-10 h-10" />
          </div>
          <h1 className="font-display text-2xl font-bold text-white mb-3">Paiement en attente de vérification</h1>
          <p className="text-zinc-400 mb-2">Merci {order.buyerName} ! Votre commande est en cours de traitement.</p>
          <p className="text-zinc-500 text-sm mb-6">Notre équipe vérifie manuellement votre transfert MTN MoMo.</p>
          <div className="animate-blink inline-flex items-center gap-3 text-sm bg-zinc-800/80 rounded-xl px-5 py-3 mb-6">
            <div className="w-2 h-2 rounded-full bg-gala-400" />
            <span className="text-zinc-300">Vérification en cours...</span>
          </div>
          <Button variant="secondary" fullWidth onClick={() => window.location.reload()}>
            <Clock className="w-4 h-4" /> Rafraîchir le statut
          </Button>
        </Card>
      </div>
    );
  }

  if (order.status === "VALIDATED") {
    return (
      <div className="max-w-2xl mx-auto space-y-8 py-10 px-4">
        <div className="text-center space-y-3 no-print">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-500/20 text-emerald-400">
            <CheckCircle className="w-10 h-10" />
          </div>
          <h1 className="font-display text-3xl font-bold text-white">Paiement confirmé !</h1>
          <p className="text-zinc-400">{order.tickets.length} ticket{order.tickets.length > 1 ? "s" : ""} pour {order.buyerName}</p>
        </div>

        <Card className="p-6 no-print">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-zinc-400 text-sm">Total payé</p>
              <p className="text-2xl font-bold text-gala-400">{formatPrice(order.totalAmount)}</p>
            </div>
            <div className="text-right">
              <p className="text-zinc-400 text-sm">Statut</p>
              <p className="text-emerald-400 font-semibold">Validé</p>
            </div>
          </div>
        </Card>

        <div className="space-y-6">
          {order.tickets.map((ticket, idx) => (
            <div key={ticket.id} className="print-area">
              <Card className="overflow-hidden border border-gala-500/30">
                <div className="bg-gradient-to-r from-gala-700 to-gala-900 p-5 text-center">
                  <h2 className="font-display text-2xl font-bold text-white">{order.eventTitle}</h2>
                  <p className="text-gala-300 text-sm mt-1">Ticket d&apos;entrée</p>
                </div>
                <div className="p-6">
                  <div className="flex items-start justify-between gap-6">
                    <div className="space-y-3 flex-1">
                      <div>
                        <p className="text-xs text-zinc-500 uppercase tracking-wider">Participant</p>
                        <p className="text-white font-semibold text-lg">{order.buyerName}</p>
                      </div>
                      <div>
                        <p className="text-xs text-zinc-500 uppercase tracking-wider">Catégorie</p>
                        <p className="text-gala-400 font-bold">{ticket.categoryName}</p>
                      </div>
                      <div>
                        <p className="text-xs text-zinc-500 uppercase tracking-wider">Date</p>
                        <p className="text-zinc-300">{formatDateShort(order.eventDate)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-zinc-500 uppercase tracking-wider">Lieu</p>
                        <p className="text-zinc-300">{order.eventLocation}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-center gap-1 flex-shrink-0">
                      <canvas ref={(el) => { canvasRefs.current[ticket.id] = el; }} className="rounded-xl bg-white p-2" />
                      <span className="text-[10px] text-zinc-600 font-mono">#{ticket.secureToken.slice(0, 8).toUpperCase()}</span>
                    </div>
                  </div>
                  <div className="border-t border-zinc-800 pt-3 mt-4 flex justify-between items-center">
                    <span className={`text-xs font-semibold px-3 py-1 rounded-full ${ticket.isUsed ? "bg-red-500/20 text-red-400" : "bg-emerald-500/20 text-emerald-400"}`}>
                      {ticket.isUsed ? "Utilisé" : "Valide"}
                    </span>
                    <span className="text-xs text-zinc-600">Ticket {idx + 1}/{order.tickets.length}</span>
                  </div>
                </div>
              </Card>
            </div>
          ))}
        </div>

        <div className="flex justify-center no-print pt-4">
          <Button variant="secondary" onClick={() => window.print()}>
            <Printer className="w-4 h-4" /> Télécharger / Imprimer
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <Card className="p-10 max-w-lg w-full text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-500/20 text-red-400 mb-6">
          <AlertCircle className="w-10 h-10" />
        </div>
        <h1 className="font-display text-2xl font-bold text-white mb-3">Paiement rejeté</h1>
        <p className="text-zinc-400 mb-6">Votre commande a été rejetée. La référence MTN MoMo fournie est incorrecte.</p>
        <p className="text-zinc-500 text-sm">Veuillez réessayer ou contacter l&apos;organisateur.</p>
      </Card>
    </div>
  );
}
