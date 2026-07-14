"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { updateEvent } from "@/actions/admin";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { ImagePlus, Plus, Trash2, ArrowLeft, AlertTriangle } from "lucide-react";

interface CategoryField {
  id?: string;
  name: string;
  price: string;
}

interface EventEditFormProps {
  event: {
    id: string;
    title: string;
    description: string;
    date: string;
    location: string;
    coverImage: string;
    ticketBackgroundUrl?: string | null;
    ticketEyebrowText?: string | null;
    ticketQuoteText?: string | null;
    categories: { id: string; name: string; price: number; soldQuantity: number }[];
  };
}

export function EventEditForm({ event }: EventEditFormProps) {
  const router = useRouter();
  const coverFileRef = useRef<HTMLInputElement>(null);
  const bgFileRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [imageBase64, setImageBase64] = useState("");
  const [ticketBgBase64, setTicketBgBase64] = useState("");
  const [categories, setCategories] = useState<CategoryField[]>(
    event.categories.map((c) => ({ id: c.id, name: c.name, price: String(c.price) }))
  );
  const [form, setForm] = useState({
    title: event.title,
    description: event.description,
    date: event.date.slice(0, 16),
    location: event.location,
    ticketEyebrowText: event.ticketEyebrowText ?? "INVITATION",
    ticketQuoteText: event.ticketQuoteText ?? "Une soirée d'exception vous attend",
  });
  const [error, setError] = useState("");

  const addCategory = () => {
    setCategories([...categories, { name: "", price: "" }]);
  };

  const removeCategory = (idx: number) => {
    if (categories.length <= 1) return;
    setCategories(categories.filter((_, i) => i !== idx));
  };

  const updateCategory = (idx: number, field: keyof CategoryField, value: string) => {
    const updated = [...categories];
    (updated[idx] as any)[field] = value;
    setCategories(updated);
  };

  const handleImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setImageBase64(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    const parsed = categories
      .filter((c) => c.name.trim() && c.price)
      .map((c) => ({
        ...(c.id ? { id: c.id } : {}),
        name: c.name.trim(),
        price: parseInt(c.price, 10),
      }));

    if (parsed.length === 0) {
      setError("Ajoutez au moins une catégorie valide");
      setIsLoading(false);
      return;
    }

    const fd = new FormData();
    fd.append("title", form.title);
    fd.append("description", form.description);
    fd.append("date", form.date);
    fd.append("location", form.location);
    fd.append("coverImage", imageBase64);
    fd.append("ticketBackgroundUrl", ticketBgBase64);
    fd.append("ticketEyebrowText", form.ticketEyebrowText);
    fd.append("ticketQuoteText", form.ticketQuoteText);
    fd.append("categories", JSON.stringify(parsed));

    const result = await updateEvent(event.id, fd);
    setIsLoading(false);

    if (result.success) {
      router.push("/admin/dashboard");
      router.refresh();
    } else {
      setError(result.error || "Erreur");
    }
  };

  const hasSoldCategories = event.categories.some((c) => c.soldQuantity > 0);

  return (
    <div className="max-w-2xl mx-auto">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-zinc-400 hover:text-gala-400 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Retour
      </button>

      <h1 className="font-display text-3xl font-bold text-white mb-2">Modifier l&apos;événement</h1>

      {hasSoldCategories && (
        <div className="flex items-start gap-3 bg-amber-600/15 border border-amber-500/30 rounded-xl px-5 py-4 mb-6">
          <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-300">
            Des tickets ont déjà été vendus pour certaines catégories. Leurs noms et prix ne peuvent pas être modifiés.
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="p-6 space-y-5">
          <h2 className="font-display text-lg font-bold text-white">Informations générales</h2>

          <Input
            label="Titre de l'événement *"
            placeholder="Grand Gala 2026"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
          />

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={4}
              className="w-full px-4 py-3 rounded-xl bg-zinc-800/80 border border-zinc-700 text-white placeholder:text-zinc-500 focus:border-gala-500 focus:outline-none focus:ring-2 focus:ring-gala-500/20 transition-all"
              placeholder="Décrivez votre événement..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Date et heure *"
              type="datetime-local"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              required
            />
            <Input
              label="Lieu *"
              placeholder="Palais des Congrès"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">Image de couverture</label>
              <input ref={coverFileRef} type="file" accept="image/*" onChange={handleImage} className="hidden" />
              {(imageBase64 || event.coverImage) ? (
                <div className="relative rounded-xl overflow-hidden">
                  <img src={imageBase64 || event.coverImage} alt="Aperçu" className="w-full h-36 object-cover" />
                  {imageBase64 && (
                    <button type="button" onClick={() => setImageBase64("")} className="absolute top-2 right-2 p-2 rounded-lg bg-black/60 text-white hover:bg-black/80">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ) : (
                <button type="button" onClick={() => coverFileRef.current?.click()} className="w-full h-36 rounded-xl border-2 border-dashed border-zinc-700 flex flex-col items-center justify-center gap-2 text-zinc-500 hover:border-gala-500 hover:text-gala-400 transition-all">
                  <ImagePlus className="w-8 h-8" />
                  <span className="text-sm">Couverture</span>
                </button>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">Image de fond du billet</label>
              <input ref={bgFileRef} type="file" accept="image/*" onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (ev) => setTicketBgBase64(ev.target?.result as string);
                reader.readAsDataURL(file);
              }} className="hidden" />
              {(ticketBgBase64 || event.ticketBackgroundUrl) ? (
                <div className="relative rounded-xl overflow-hidden">
                  <img src={ticketBgBase64 || event.ticketBackgroundUrl!} alt="Aperçu fond billet" className="w-full h-36 object-cover" />
                  {ticketBgBase64 && (
                    <button type="button" onClick={() => setTicketBgBase64("")} className="absolute top-2 right-2 p-2 rounded-lg bg-black/60 text-white hover:bg-black/80">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ) : (
                <button type="button" onClick={() => bgFileRef.current?.click()} className="w-full h-36 rounded-xl border-2 border-dashed border-zinc-700 flex flex-col items-center justify-center gap-2 text-zinc-500 hover:border-gala-500 hover:text-gala-400 transition-all">
                  <ImagePlus className="w-8 h-8" />
                  <span className="text-sm">Fond billet</span>
                </button>
              )}
            </div>
          </div>

          <div className="border-t border-zinc-800 pt-4 mt-2">
            <h3 className="font-display text-base font-bold text-white mb-3">Personnalisation du billet</h3>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Texte d'en-tête du billet"
                placeholder="INVITATION"
                value={form.ticketEyebrowText}
                onChange={(e) => setForm({ ...form, ticketEyebrowText: e.target.value })}
              />
              <Input
                label="Citation en bas du billet"
                placeholder="Une soirée d'exception vous attend"
                value={form.ticketQuoteText}
                onChange={(e) => setForm({ ...form, ticketQuoteText: e.target.value })}
              />
            </div>
          </div>
        </Card>

        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold text-white">Catégories de tickets</h2>
            <Button type="button" variant="ghost" onClick={addCategory}>
              <Plus className="w-4 h-4" /> Ajouter
            </Button>
          </div>

          {categories.map((cat, idx) => {
            const original = event.categories.find((c) => c.id === cat.id);
            const isLocked = original ? original.soldQuantity > 0 : false;

            return (
              <div key={idx} className={`rounded-xl p-4 space-y-3 ${isLocked ? "bg-zinc-800/20 border border-zinc-800/50 opacity-60" : "bg-zinc-800/50 border border-zinc-800"}`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-500 font-medium">Catégorie #{idx + 1}</span>
                  {categories.length > 1 && !isLocked && (
                    <button type="button" onClick={() => removeCategory(idx)} className="text-red-400 hover:text-red-300">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    placeholder="Nom (ex: VIP)"
                    value={cat.name}
                    onChange={(e) => updateCategory(idx, "name", e.target.value)}
                    disabled={isLocked}
                  />
                  <Input
                    type="number"
                    placeholder="Prix (FCFA)"
                    value={cat.price}
                    onChange={(e) => updateCategory(idx, "price", e.target.value)}
                    disabled={isLocked}
                  />
                </div>
                {isLocked && (
                  <p className="text-xs text-zinc-600">{original!.soldQuantity} ticket(s) vendu(s) — verrouillé</p>
                )}
              </div>
            );
          })}
        </Card>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-5 py-3">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        <Button type="submit" fullWidth variant="gold" isLoading={isLoading}>
          Enregistrer les modifications
        </Button>
      </form>
    </div>
  );
}
