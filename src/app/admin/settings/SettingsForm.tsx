"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updatePlatformSettings } from "@/actions/settings";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { Save, Smartphone } from "lucide-react";

interface SettingsFormProps {
  defaultValues: {
    beneficiaryName: string;
    moovNumber: string;
    mtnNumber: string;
  };
}

export function SettingsForm({ defaultValues }: SettingsFormProps) {
  const router = useRouter();
  const [form, setForm] = useState(defaultValues);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);
    setIsLoading(true);

    const result = await updatePlatformSettings(form);
    setIsLoading(false);

    if (result.success) {
      setSuccess(true);
      router.refresh();
    } else {
      setError(result.error || "Erreur");
    }
  };

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="font-display text-3xl font-bold text-white mb-2">Paiement Mobile</h1>
      <p className="text-zinc-400 text-sm mb-8">
        Numéros de transfert affichés lors de l&apos;achat.
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Input
          label="Nom du bénéficiaire"
          placeholder="MELE AMEN MELVIE"
          value={form.beneficiaryName}
          onChange={(e) => setForm({ ...form, beneficiaryName: e.target.value })}
          required
        />

        <Card className="p-5 space-y-4 border-blue-500/20 bg-blue-500/5">
          <div className="flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-blue-400" />
            <h3 className="font-semibold text-white text-sm">Moov Money</h3>
          </div>
          <Input
            label="Numéro Moov"
            placeholder="0145912093"
            value={form.moovNumber}
            onChange={(e) => setForm({ ...form, moovNumber: e.target.value })}
            required
          />
        </Card>

        <Card className="p-5 space-y-4 border-gala-500/20 bg-gala-500/5">
          <div className="flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-gala-400" />
            <h3 className="font-semibold text-white text-sm">MTN MoMo</h3>
          </div>
          <Input
            label="Numéro MTN"
            placeholder="0146343485"
            value={form.mtnNumber}
            onChange={(e) => setForm({ ...form, mtnNumber: e.target.value })}
            required
          />
        </Card>

        {success && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-5 py-3">
            <p className="text-emerald-400 text-sm">Paramètres mis à jour avec succès.</p>
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-5 py-3">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        <Button type="submit" fullWidth variant="gold" isLoading={isLoading}>
          <Save className="w-4 h-4" /> Enregistrer
        </Button>
      </form>
    </div>
  );
}
