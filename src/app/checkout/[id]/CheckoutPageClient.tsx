"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { createOrder } from "@/actions/tickets";
import { formatPrice } from "@/lib/utils";
import { ArrowLeft, Smartphone, User, Mail, Phone, KeyRound, Info } from "lucide-react";

interface CheckoutPageClientProps {
  eventId: string;
  eventTitle: string;
  cart: { categoryId: string; name: string; price: number; quantity: number }[];
  total: number;
}

export function CheckoutPageClient({ eventId, eventTitle, cart, total }: CheckoutPageClientProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ buyerName: "", buyerEmail: "", buyerPhone: "", referenceMomo: "" });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.buyerName.trim()) errs.buyerName = "Requis";
    if (!form.buyerEmail.trim()) errs.buyerEmail = "Requis";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.buyerEmail)) errs.buyerEmail = "Email invalide";
    if (!form.buyerPhone.trim()) errs.buyerPhone = "Requis";
    if (!form.referenceMomo.trim()) errs.referenceMomo = "Requis";
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setError("");
    setIsLoading(true);

    const fd = new FormData();
    fd.append("eventId", eventId);
    fd.append("buyerName", form.buyerName);
    fd.append("buyerEmail", form.buyerEmail);
    fd.append("buyerPhone", form.buyerPhone);
    fd.append("referenceMomo", form.referenceMomo);
    fd.append("cart", JSON.stringify(cart.map((c) => ({ categoryId: c.categoryId, quantity: c.quantity }))));

    const result = await createOrder(fd);
    setIsLoading(false);

    if (result.success && result.orderId) {
      router.push(`/order-status/${result.orderId}`);
    } else {
      setError(result.error || "Erreur lors de la commande");
    }
  };

  return (
    <div className="max-w-lg mx-auto">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-zinc-400 hover:text-gala-400 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Retour
      </button>

      <h1 className="font-display text-2xl font-bold text-white mb-2">{eventTitle}</h1>
      <p className="text-zinc-400 text-sm mb-6">Finalisez votre commande</p>

      <Card className="p-5 mb-6 border-gala-500/20 bg-gala-500/5">
        <div className="flex items-start gap-3">
          <Smartphone className="w-5 h-5 text-gala-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-white text-sm">Paiement par MTN MoMo</h3>
            <p className="text-zinc-400 text-xs mt-1 leading-relaxed">
              Effectuez votre transfert MTN MoMo vers le <strong className="text-gala-400">{process.env.NEXT_PUBLIC_MOMO_PHONE_NUMBER?.replace(/(\d{2})(?=\d)/g, "$1 ")}</strong> (Koffi A.)
              du montant exact de <strong className="text-gala-400">{formatPrice(total)}</strong>,
              puis saisissez la référence SMS reçue ci-dessous.
            </p>
          </div>
        </div>
      </Card>

      <Card className="p-5 mb-6">
        <h3 className="text-sm text-zinc-400 mb-3">Récapitulatif de la commande</h3>
        <div className="space-y-2">
          {cart.map((item) => (
            <div key={item.categoryId} className="flex justify-between text-sm">
              <span className="text-zinc-400">{item.name} × {item.quantity}</span>
              <span className="text-white font-medium">{formatPrice(item.price * item.quantity)}</span>
            </div>
          ))}
          <div className="border-t border-zinc-800 pt-2 flex justify-between">
            <span className="font-bold text-white">Total à payer</span>
            <span className="font-bold text-gala-400 text-lg">{formatPrice(total)}</span>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Nom complet *"
            placeholder="Jean Dupont"
            value={form.buyerName}
            onChange={(e) => setForm({ ...form, buyerName: e.target.value })}
            error={fieldErrors.buyerName}
            icon={<User className="w-4 h-4" />}
          />
          <Input
            label="Email *"
            type="email"
            placeholder="jean@email.com"
            value={form.buyerEmail}
            onChange={(e) => setForm({ ...form, buyerEmail: e.target.value })}
            error={fieldErrors.buyerEmail}
            icon={<Mail className="w-4 h-4" />}
          />
          <Input
            label="Téléphone *"
            type="tel"
            placeholder="+229 97 00 00 00"
            value={form.buyerPhone}
            onChange={(e) => setForm({ ...form, buyerPhone: e.target.value })}
            error={fieldErrors.buyerPhone}
            icon={<Phone className="w-4 h-4" />}
          />
          <Input
            label="Référence MTN MoMo *"
            placeholder="Ex: MOMO123456"
            value={form.referenceMomo}
            onChange={(e) => setForm({ ...form, referenceMomo: e.target.value })}
            error={fieldErrors.referenceMomo}
            icon={<KeyRound className="w-4 h-4" />}
          />

          {error && (
            <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
              <Info className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          <Button type="submit" fullWidth variant="gold" isLoading={isLoading} className="mt-2">
            Confirmer la commande
          </Button>

          <p className="text-xs text-zinc-600 text-center">
            Un email de confirmation vous sera envoyé après validation manuelle du paiement par notre équipe.
          </p>
        </form>
      </Card>
    </div>
  );
}
