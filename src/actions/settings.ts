"use server";

import { prisma } from "@/lib/prisma";
import { verifyAdminSessionOrThrow } from "@/lib/admin-auth";

export async function getPlatformSettings() {
  const settings = await prisma.platformSettings.findUnique({
    where: { id: "singleton" },
  });

  if (!settings) {
    return {
      beneficiaryName: "MELE AMEN MELVIE",
      moovNumber: "0145912093",
      mtnNumber: "0146343485",
    };
  }

  return settings;
}

export async function updatePlatformSettings(data: {
  beneficiaryName: string;
  moovNumber: string;
  mtnNumber: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    await verifyAdminSessionOrThrow();

    if (!data.beneficiaryName.trim()) {
      return { success: false, error: "Le nom du bénéficiaire est requis" };
    }
    if (!data.moovNumber.trim()) {
      return { success: false, error: "Le numéro Moov est requis" };
    }
    if (!data.mtnNumber.trim()) {
      return { success: false, error: "Le numéro MTN est requis" };
    }

    await prisma.platformSettings.upsert({
      where: { id: "singleton" },
      update: {
        beneficiaryName: data.beneficiaryName.trim(),
        moovNumber: data.moovNumber.trim(),
        mtnNumber: data.mtnNumber.trim(),
      },
      create: {
        id: "singleton",
        beneficiaryName: data.beneficiaryName.trim(),
        moovNumber: data.moovNumber.trim(),
        mtnNumber: data.mtnNumber.trim(),
      },
    });

    return { success: true };
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes("Accès refusé")) {
      return { success: false, error: error.message };
    }
    console.error("Update settings error:", error);
    return { success: false, error: "Erreur lors de la mise à jour" };
  }
}
