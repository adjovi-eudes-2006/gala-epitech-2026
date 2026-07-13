"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  verifyAdminSessionOrThrow,
  createAdminSession,
  destroyAdminSession,
} from "@/lib/admin-auth";

export async function loginAdmin(
  password: string
): Promise<{ success: boolean; error?: string }> {
  try {
    let admin = await prisma.adminUser.findUnique({
      where: { username: "admin" },
    });

    if (!admin) {
      const defaultPassword = process.env.ADMIN_SECRET_TOKEN || "admin";
      const hash = await bcrypt.hash(defaultPassword, 10);
      admin = await prisma.adminUser.create({
        data: { username: "admin", passwordHash: hash },
      });
    }

    const match = await bcrypt.compare(password, admin.passwordHash);
    if (!match) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      return { success: false, error: "Code PIN incorrect" };
    }

    await createAdminSession();
    return { success: true };
  } catch (error) {
    console.error("Login error:", error);
    return { success: false, error: "Erreur de connexion" };
  }
}

export async function updateAdminPassword(
  oldPassword: string,
  newPassword: string
): Promise<{ success: boolean; error?: string; message?: string }> {
  try {
    await verifyAdminSessionOrThrow();

    if (!newPassword || newPassword.length < 8) {
      return { success: false, error: "Le nouveau mot de passe doit contenir au moins 8 caractères" };
    }

    const admin = await prisma.adminUser.findUnique({
      where: { username: "admin" },
    });

    if (!admin) {
      return { success: false, error: "Compte administrateur introuvable" };
    }

    const match = await bcrypt.compare(oldPassword, admin.passwordHash);
    if (!match) {
      return { success: false, error: "L'ancien mot de passe est incorrect" };
    }

    const hash = await bcrypt.hash(newPassword, 10);
    await prisma.adminUser.update({
      where: { id: admin.id },
      data: { passwordHash: hash },
    });

    return { success: true, message: "Mot de passe modifié avec succès !" };
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes("Accès refusé")) {
      return { success: false, error: error.message };
    }
    console.error("Update password error:", error);
    return { success: false, error: "Erreur lors de la modification du mot de passe" };
  }
}

export async function logoutAdmin(): Promise<void> {
  await destroyAdminSession();
  revalidatePath("/admin");
}

export async function checkAdminAuth(): Promise<boolean> {
  try {
    await verifyAdminSessionOrThrow();
    return true;
  } catch {
    return false;
  }
}
