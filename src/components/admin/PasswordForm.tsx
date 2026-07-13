"use client";

import { useState } from "react";
import { updateAdminPassword } from "@/actions/auth";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { Lock, Eye, EyeOff } from "lucide-react";

export function PasswordForm() {
  const [form, setForm] = useState({ oldPassword: "", newPassword: "", confirmPassword: "" });
  const [showPasswords, setShowPasswords] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (form.newPassword.length < 8) {
      setError("Le nouveau mot de passe doit contenir au moins 8 caractères");
      return;
    }

    if (form.newPassword !== form.confirmPassword) {
      setError("Les nouveaux mots de passe ne correspondent pas");
      return;
    }

    setIsLoading(true);

    const result = await updateAdminPassword(form.oldPassword, form.newPassword);
    setIsLoading(false);

    if (result.success) {
      setSuccess(result.message || "Mot de passe modifié avec succès !");
      setForm({ oldPassword: "", newPassword: "", confirmPassword: "" });
    } else {
      setError(result.error || "Erreur");
    }
  };

  const toggleVisibility = () => setShowPasswords(!showPasswords);

  return (
    <Card className="p-6 space-y-5 border-slate-700/50">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
          <Lock className="w-5 h-5 text-amber-400" />
        </div>
        <div>
          <h2 className="font-display text-lg font-bold text-white">Mot de passe administrateur</h2>
          <p className="text-sm text-zinc-500">Modifiez votre mot de passe de connexion</p>
        </div>
        <button
          type="button"
          onClick={toggleVisibility}
          className="ml-auto p-2 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
          title={showPasswords ? "Masquer les mots de passe" : "Afficher les mots de passe"}
        >
          {showPasswords ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Ancien mot de passe"
          type={showPasswords ? "text" : "password"}
          placeholder="Votre mot de passe actuel"
          value={form.oldPassword}
          onChange={(e) => setForm({ ...form, oldPassword: e.target.value })}
          required
        />

        <Input
          label="Nouveau mot de passe"
          type={showPasswords ? "text" : "password"}
          placeholder="8 caractères minimum"
          value={form.newPassword}
          onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
          required
        />
        <p className="-mt-3 text-xs text-zinc-600">8 caractères minimum</p>

        <Input
          label="Confirmer le nouveau mot de passe"
          type={showPasswords ? "text" : "password"}
          placeholder="Ressaisissez le nouveau mot de passe"
          value={form.confirmPassword}
          onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
          required
        />

        {success && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-5 py-3">
            <p className="text-emerald-400 text-sm">{success}</p>
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-5 py-3">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        <Button type="submit" fullWidth variant="gold" isLoading={isLoading}>
          Modifier le mot de passe
        </Button>
      </form>
    </Card>
  );
}
