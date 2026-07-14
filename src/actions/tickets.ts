"use server";

import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import { verifyAdminSessionOrThrow } from "@/lib/admin-auth";
import { orderSchema } from "@/lib/validations";
import type { VerificationResult } from "@/types";

export async function validateTicketEntry(
  secureToken: string
): Promise<VerificationResult> {
  try {
    await verifyAdminSessionOrThrow();

    if (!secureToken || secureToken.length < 16) {
      return { status: "INVALID", message: "Code billet invalide" };
    }

    const result = await prisma.ticket.updateMany({
      where: { secureToken, isUsed: false },
      data: { isUsed: true, usedAt: new Date() },
    });

    if (result.count === 0) {
      const existing = await prisma.ticket.findUnique({
        where: { secureToken },
        include: { order: true, category: true },
      });

      if (!existing) {
        return { status: "INVALID", message: "FAUX BILLET / NON RECONNU" };
      }

      return {
        status: "ALREADY_USED",
        message: "ALERTE : BILLET DÉJÀ UTILISÉ",
        buyer: existing.order.buyerName,
        category: existing.category.name,
        date: existing.usedAt?.toISOString(),
      };
    }

    const ticket = await prisma.ticket.findUnique({
      where: { secureToken },
      include: { order: true, category: true },
    });

    return {
      status: "SUCCESS",
      message: "Accès autorisé",
      buyer: ticket!.order.buyerName,
      category: ticket!.category.name,
    };
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes("Accès refusé")) {
      return { status: "INVALID", message: error.message };
    }
    console.error("Validate ticket error:", error);
    return { status: "INVALID", message: "Erreur de vérification" };
  }
}

export async function getMyTicket(
  phone: string,
  momoReference: string
): Promise<{
  success: boolean;
  error?: string;
  orderId?: string;
  buyerName?: string;
  eventTitle?: string;
  tickets?: { id: string; secureToken: string; categoryName: string }[];
}> {
  try {
    if (!phone || phone.trim().length < 4 || !momoReference || momoReference.trim().length < 4) {
      return { success: false, error: "Informations invalides ou billet introuvable" };
    }

    const order = await prisma.order.findFirst({
      where: {
        buyerPhone: phone.trim(),
        referenceMomo: momoReference.trim(),
      },
      include: {
        tickets: { include: { category: true } },
        event: true,
      },
    });

    if (!order) {
      return { success: false, error: "Informations invalides ou billet introuvable" };
    }

    return {
      success: true,
      orderId: order.id,
      buyerName: order.buyerName,
      eventTitle: order.event.title,
      tickets: order.tickets.map((t) => ({
        id: t.id,
        secureToken: t.secureToken,
        categoryName: t.category.name,
      })),
    };
  } catch {
    return { success: false, error: "Informations invalides ou billet introuvable" };
  }
}

export async function getOrderById(orderId: string) {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        tickets: { include: { category: true } },
        event: true,
      },
    });

    if (!order) return null;

    return {
      id: order.id,
      eventId: order.eventId,
      buyerName: order.buyerName,
      buyerEmail: order.buyerEmail,
      buyerPhone: order.buyerPhone,
      referenceMomo: order.referenceMomo,
      totalAmount: order.totalAmount,
      status: order.status,
      tickets: order.tickets.map((t) => ({
        id: t.id,
        orderId: t.orderId,
        categoryId: t.categoryId,
        categoryName: t.category.name,
        secureToken: t.secureToken,
        isUsed: t.isUsed,
        usedAt: t.usedAt?.toISOString() ?? null,
      })),
      eventTitle: order.event.title,
      eventDate: order.event.date.toISOString(),
      eventLocation: order.event.location,
      ticketBackgroundUrl: order.event.ticketBackgroundUrl ?? undefined,
      ticketEyebrowText: order.event.ticketEyebrowText ?? "INVITATION",
      ticketQuoteText: order.event.ticketQuoteText ?? "Une soirée d'exception vous attend",
      createdAt: order.createdAt.toISOString(),
    };
  } catch {
    return null;
  }
}

export async function createOrder(formData: FormData) {
  try {
    const eventId = formData.get("eventId") as string;
    const buyerName = formData.get("buyerName") as string;
    const buyerEmail = formData.get("buyerEmail") as string;
    const buyerPhone = formData.get("buyerPhone") as string;
    const referenceMomo = formData.get("referenceMomo") as string;
    const cartJson = formData.get("cart") as string;

    let cart: { categoryId: string; quantity: number }[];
    try {
      cart = JSON.parse(cartJson);
    } catch {
      return { success: false, error: "Format du panier invalide" };
    }

    const validated = orderSchema.parse({
      eventId,
      buyerName,
      buyerEmail,
      buyerPhone,
      referenceMomo,
      items: cart,
    });

    const event = await prisma.event.findUnique({
      where: { id: validated.eventId },
      include: { categories: true },
    });

    if (!event) return { success: false, error: "Événement introuvable" };

    const existingReference = await prisma.order.findUnique({
      where: { referenceMomo: validated.referenceMomo },
    });

    if (existingReference) {
      return { success: false, error: "Cette référence MTN MoMo a déjà été utilisée" };
    }

    let totalAmount = 0;
    const ticketEntries: { categoryId: string }[] = [];

    for (const item of validated.items) {
      if (item.quantity <= 0) continue;
      const category = event.categories.find((c) => c.id === item.categoryId);
      if (!category) return { success: false, error: `Catégorie introuvable: ${item.categoryId}` };



      totalAmount += category.price * item.quantity;
      for (let i = 0; i < item.quantity; i++) {
        ticketEntries.push({ categoryId: category.id });
      }
    }

    if (totalAmount === 0) {
      return { success: false, error: "Montant total invalide" };
    }

    const order = await prisma.order.create({
      data: {
        eventId: validated.eventId,
        buyerName: validated.buyerName,
        buyerEmail: validated.buyerEmail,
        buyerPhone: validated.buyerPhone,
        referenceMomo: validated.referenceMomo,
        totalAmount,
        status: "PENDING",
        tickets: {
          create: ticketEntries.map((te) => ({
            categoryId: te.categoryId,
            secureToken: crypto.randomBytes(32).toString("hex"),
          })),
        },
      },
    });

    return { success: true, orderId: order.id };
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "ZodError") {
      const zodError = JSON.parse(error.message);
      const messages = zodError.map((e: { message: string }) => e.message).join("; ");
      return { success: false, error: messages };
    }
    console.error("Create order error:", error);
    return { success: false, error: "Erreur lors de la création de la commande" };
  }
}

export async function checkOrderExists(orderId: string): Promise<boolean> {
  try {
    if (!orderId) return false;
    const order = await prisma.order.findUnique({ where: { id: orderId }, select: { id: true } });
    return order !== null;
  } catch {
    return false;
  }
}

export async function findOrdersByPhone(
  phone: string
): Promise<{ error?: string; orders?: { id: string; eventTitle: string; status: string; totalAmount: number }[] }> {
  try {
    if (!phone || phone.trim().length < 4) {
      return { error: "Numéro de téléphone invalide" };
    }

    const orders = await prisma.order.findMany({
      where: { buyerPhone: { contains: phone.trim() } },
      include: { event: true },
      orderBy: { createdAt: "desc" },
    });

    if (orders.length === 0) {
      return { error: "Aucune commande trouvée avec ce numéro." };
    }

    return {
      orders: orders.map((o) => ({
        id: o.id,
        eventTitle: o.event.title,
        status: o.status,
        totalAmount: o.totalAmount,
      })),
    };
  } catch {
    return { error: "Erreur lors de la recherche" };
  }
}
