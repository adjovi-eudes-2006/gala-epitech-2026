"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { validateOrder, rejectOrder, deleteEvent, getDashboardData } from "@/actions/admin";
import { CheckCircle, XCircle, Clock, Search, DollarSign, Ticket, TrendingUp, Pencil } from "lucide-react";
import { formatPrice, formatDateShort } from "@/lib/utils";
import type { DashboardData } from "@/types";

interface DashboardContentProps {
  data: DashboardData;
}

export function DashboardContent({ data: initialData }: DashboardContentProps) {
  const router = useRouter();
  const [data, setData] = useState(initialData);
  const [search, setSearch] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [newOrdersCount, setNewOrdersCount] = useState(0);
  const prevIdsRef = useRef<Set<string>>(new Set(initialData.pendingOrders.map((o) => o.id)));

  const handleValidate = useCallback(async (orderId: string) => {
    setProcessingId(orderId);
    const result = await validateOrder(orderId);
    setProcessingId(null);
    if (result.success) router.refresh();
    else alert(result.error || "Erreur");
  }, [router]);

  const handleReject = useCallback(async (orderId: string) => {
    setProcessingId(orderId);
    const result = await rejectOrder(orderId);
    setProcessingId(null);
    if (result.success) router.refresh();
    else alert(result.error || "Erreur");
  }, [router]);

  useEffect(() => {
    const interval = setInterval(async () => {
      const fresh = await getDashboardData();
      if (!fresh) return;
      const newIds = fresh.pendingOrders.map((o) => o.id);
      const added = newIds.filter((id) => !prevIdsRef.current.has(id));
      if (added.length > 0) {
        setNewOrdersCount((c) => c + added.length);
        setTimeout(() => setNewOrdersCount(0), 6000);
      }
      prevIdsRef.current = new Set(newIds);
      setData(fresh);
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const pendingFiltered = data.pendingOrders.filter((o) =>
    o.buyerName.toLowerCase().includes(search.toLowerCase()) ||
    o.momoTransactionId.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-white">Dashboard</h1>
          <p className="text-zinc-400 mt-1">
            {data.eventCount} événement{data.eventCount > 1 ? "s" : ""} · {data.totalTicketsSold} tickets vendus
          </p>
        </div>
        <div className="relative hidden sm:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Rechercher..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2 rounded-xl bg-zinc-800 border border-zinc-700 text-white text-sm placeholder:text-zinc-500 focus:border-gala-500 focus:outline-none w-56"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gala-500/20 text-gala-400 flex items-center justify-center">
              <Ticket className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-zinc-400">Tickets vendus</p>
              <p className="text-2xl font-bold text-white">{data.totalTicketsSold}</p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-zinc-400">Revenu total</p>
              <p className="text-2xl font-bold text-white">{formatPrice(data.totalRevenue)}</p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-yellow-500/20 text-yellow-400 flex items-center justify-center">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-zinc-400">En attente</p>
              <p className="text-2xl font-bold text-white">{data.pendingOrders.length}</p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-lg font-bold text-white">
            Événements ({data.events.length})
          </h2>
        </div>
        <div className="space-y-2">
          {data.events.length === 0 ? (
            <p className="text-zinc-500 text-sm py-2">Aucun événement</p>
          ) : (
            data.events.map((event) => (
              <div key={event.id} className="flex items-center justify-between py-3 px-4 rounded-xl bg-zinc-800/30 border border-zinc-800">
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-white font-semibold truncate">{event.title}</p>
                  <p className="text-xs text-zinc-500">
                    {new Date(event.date).toLocaleDateString("fr-FR")} · {event.location}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                  <a
                    href={`/admin/events/${event.id}/edit`}
                    className="px-3 py-1.5 rounded-lg bg-gala-500/20 text-gala-400 hover:bg-gala-500/40 text-xs font-semibold transition-colors active:scale-95 flex items-center gap-1"
                  >
                    <Pencil className="w-3 h-3" /> Modifier
                  </a>
                  <button
                    onClick={async () => {
                      if (!window.confirm("Attention : suppression irréversible de l'événement et de toutes ses commandes. Confirmer ?")) return;
                      const result = await deleteEvent(event.id);
                      if (result.success) router.refresh();
                      else alert(result.error || "Erreur");
                    }}
                    className="px-3 py-1.5 rounded-lg bg-red-600/20 text-red-400 hover:bg-red-600/40 text-xs font-semibold transition-colors active:scale-95"
                  >
                    Supprimer
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-5 lg:col-span-1">
          <h2 className="font-display text-lg font-bold text-white mb-4">Ventes par catégorie</h2>
          <div className="space-y-4">
            {data.categoriesStats.map((cat) => (
              <div key={cat.name}>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="text-zinc-300 font-medium">{cat.name}</span>
                  <span className="text-zinc-400">{cat.sold} vendus</span>
                </div>
                <p className="text-xs text-zinc-500 mt-1">{formatPrice(cat.revenue)}</p>
              </div>
            ))}
            {data.categoriesStats.length === 0 && (
              <p className="text-zinc-500 text-sm">Aucune vente</p>
            )}
          </div>
        </Card>

        <div className="lg:col-span-2 space-y-6">
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg font-bold text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-yellow-400" />
                Commandes en attente ({data.pendingOrders.length})
                {newOrdersCount > 0 && (
                  <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-semibold animate-pulse">
                    +{newOrdersCount} nouvelle{newOrdersCount > 1 ? "s" : ""}
                  </span>
                )}
              </h2>
            </div>

            {pendingFiltered.length === 0 ? (
              <p className="text-zinc-500 text-sm py-4 text-center">
                {search ? "Aucun résultat" : "Aucune commande en attente"}
              </p>
            ) : (
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {pendingFiltered.map((order) => (
                  <div
                    key={order.id}
                    className="bg-zinc-800/50 border border-zinc-800 rounded-xl p-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-white truncate">{order.buyerName}</p>
                        <p className="text-xs text-zinc-500">{order.buyerEmail} · {order.buyerPhone}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="warning">{order.momoTransactionId}</Badge>
                          <span className="text-gala-400 font-bold text-sm">{formatPrice(order.totalAmount)}</span>
                        </div>
                        <p className="text-xs text-zinc-600 mt-1">{formatDateShort(order.createdAt)}</p>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <Button
                          variant="success"
                          isLoading={processingId === order.id}
                          onClick={() => handleValidate(order.id)}
                          className="px-3 py-2 text-xs"
                        >
                          <CheckCircle className="w-4 h-4" /> Valider
                        </Button>
                        <Button
                          variant="danger"
                          isLoading={processingId === order.id}
                          onClick={() => handleReject(order.id)}
                          className="px-3 py-2 text-xs"
                        >
                          <XCircle className="w-4 h-4" /> Rejeter
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="p-5">
            <h2 className="font-display text-lg font-bold text-white mb-4 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-400" />
              Dernières validations ({data.validatedOrders.length})
            </h2>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {data.validatedOrders.slice(0, 10).map((order) => (
                <div key={order.id} className="flex items-center justify-between py-2 border-b border-zinc-800/50 last:border-0">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-white font-medium truncate">{order.buyerName}</p>
                    <p className="text-xs text-zinc-500">{order.momoTransactionId}</p>
                  </div>
                  <span className="text-gala-400 font-bold text-sm flex-shrink-0 ml-3">
                    {formatPrice(order.totalAmount)}
                  </span>
                </div>
              ))}
              {data.validatedOrders.length === 0 && (
                <p className="text-zinc-500 text-sm">Aucune commande validée</p>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
