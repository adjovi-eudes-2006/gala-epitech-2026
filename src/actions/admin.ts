"use server";

import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import { verifyAdminSessionOrThrow } from "@/lib/admin-auth";
import { eventSchema } from "@/lib/validations";
import { revalidatePath } from "next/cache";
import type { DashboardData, OrderData, EventSummary } from "@/types";

export async function createEvent(
  formData: FormData
): Promise<{ success: boolean; error?: string; eventId?: string }> {
  try {
    await verifyAdminSessionOrThrow();

    const rawTitle = formData.get("title") as string;
    const rawDescription = (formData.get("description") as string) || "";
    const rawDate = formData.get("date") as string;
    const rawLocation = formData.get("location") as string;
    const rawCoverImage = (formData.get("coverImage") as string) || "";
    const rawTicketBackgroundUrl = (formData.get("ticketBackgroundUrl") as string) || "";
    const rawCategories = formData.get("categories") as string;

    let parsedCategories: { name: string; price: number }[];
    try {
      parsedCategories = JSON.parse(rawCategories);
    } catch {
      return { success: false, error: "Format des catégories invalide" };
    }

    const validated = eventSchema.parse({
      title: rawTitle,
      description: rawDescription,
      date: rawDate,
      location: rawLocation,
      coverImage: rawCoverImage,
      categories: parsedCategories,
    });

    const event = await prisma.event.create({
      data: {
        title: validated.title,
        description: validated.description,
        date: new Date(validated.date),
        location: validated.location,
        coverImage: validated.coverImage || "",
        ticketBackgroundUrl: rawTicketBackgroundUrl || null,
        categories: {
          create: validated.categories.map((cat) => ({
            name: cat.name,
            price: cat.price,
            maxQuantity: null,
          })),
        },
      },
    });

    revalidatePath("/");
    revalidatePath("/admin/dashboard");

    return { success: true, eventId: event.id };
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes("Accès refusé")) {
      return { success: false, error: error.message };
    }
    console.error("Create event error:", error);
    return { success: false, error: "Erreur lors de la création" };
  }
}

export async function validateOrder(
  orderId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await verifyAdminSessionOrThrow();

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { tickets: true },
    });

    if (!order) return { success: false, error: "Commande introuvable" };
    if (order.status !== "PENDING") {
      return { success: false, error: "Commande déjà traitée" };
    }

    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: orderId },
        data: { status: "VALIDATED" },
      });

      for (const t of order.tickets) {
        await tx.ticket.update({
          where: { id: t.id },
          data: { secureToken: crypto.randomBytes(32).toString("hex") },
        });
      }

    });

    revalidatePath("/admin/dashboard");
    return { success: true };
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes("Accès refusé")) {
      return { success: false, error: error.message };
    }
    console.error("Validate order error:", error);
    return { success: false, error: "Erreur de validation" };
  }
}

export async function rejectOrder(
  orderId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await verifyAdminSessionOrThrow();

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) return { success: false, error: "Commande introuvable" };
    if (order.status !== "PENDING") {
      return { success: false, error: "Commande déjà traitée" };
    }

    await prisma.order.update({
      where: { id: orderId },
      data: { status: "REJECTED" },
    });

    revalidatePath("/admin/dashboard");
    return { success: true };
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes("Accès refusé")) {
      return { success: false, error: error.message };
    }
    console.error("Reject order error:", error);
    return { success: false, error: "Erreur" };
  }
}

export async function getDashboardData(): Promise<DashboardData | null> {
  try {
    await verifyAdminSessionOrThrow();

    const orders = await prisma.order.findMany({
      include: {
        tickets: { include: { category: true } },
        event: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const pendingOrders: OrderData[] = [];
    const validatedOrders: OrderData[] = [];

    for (const o of orders) {
      const orderData: OrderData = {
        id: o.id,
        eventId: o.eventId,
        buyerName: o.buyerName,
        buyerEmail: o.buyerEmail,
        buyerPhone: o.buyerPhone,
        momoTransactionId: o.momoTransactionId,
        totalAmount: o.totalAmount,
        status: o.status,
        tickets: o.tickets.map((t) => ({
          id: t.id,
          orderId: t.orderId,
          categoryId: t.categoryId,
          categoryName: t.category.name,
          secureToken: t.secureToken,
          isUsed: t.isUsed,
          usedAt: t.usedAt?.toISOString() ?? null,
        })),
        createdAt: o.createdAt.toISOString(),
      };

      if (o.status === "PENDING") pendingOrders.push(orderData);
      if (o.status === "VALIDATED") validatedOrders.push(orderData);
    }

    const totalRevenue = validatedOrders.reduce((sum, o) => sum + o.totalAmount, 0);
    const totalTicketsSold = validatedOrders.reduce((sum, o) => sum + o.tickets.length, 0);

    const categories = await prisma.ticketCategory.findMany();
    const categoriesStats = categories.map((cat) => ({
      name: cat.name,
      sold: cat.soldQuantity,
      revenue: cat.soldQuantity * cat.price,
    }));

    const eventCount = await prisma.event.count();

    const rawEvents = await prisma.event.findMany({
      include: {
        _count: { select: { orders: true, categories: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const events: EventSummary[] = rawEvents.map((e) => ({
      id: e.id,
      title: e.title,
      date: e.date.toISOString(),
      location: e.location,
      totalTickets: e._count.categories,
      validatedOrders: e._count.orders,
    }));

    return {
      pendingOrders,
      validatedOrders,
      totalRevenue,
      totalTicketsSold,
      categoriesStats,
      eventCount,
      events,
    };
  } catch {
    return null;
  }
}

export async function updateEvent(
  eventId: string,
  formData: FormData
): Promise<{ success: boolean; error?: string }> {
  try {
    await verifyAdminSessionOrThrow();

    const title = formData.get("title") as string;
    const description = (formData.get("description") as string) || "";
    const date = formData.get("date") as string;
    const location = formData.get("location") as string;
    const coverImage = formData.get("coverImage") as string;
    const rawTicketBackgroundUrl = (formData.get("ticketBackgroundUrl") as string) || "";
    const rawTicketEyebrowText = (formData.get("ticketEyebrowText") as string) || "";
    const rawTicketQuoteText = (formData.get("ticketQuoteText") as string) || "";

    const rawCategories = formData.get("categories") as string;
    let parsedCategories: { id?: string; name: string; price: number }[];
    try {
      parsedCategories = JSON.parse(rawCategories);
    } catch {
      return { success: false, error: "Format des catégories invalide" };
    }

    if (!title || !date || !location) {
      return { success: false, error: "Champs obligatoires manquants" };
    }

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: { categories: true },
    });

    if (!event) return { success: false, error: "Événement introuvable" };

    await prisma.$transaction(async (tx) => {
      await tx.event.update({
        where: { id: eventId },
        data: {
          title,
          description,
          date: new Date(date),
          location,
          coverImage: coverImage || event.coverImage,
          ticketBackgroundUrl: rawTicketBackgroundUrl || event.ticketBackgroundUrl,
          ticketEyebrowText: rawTicketEyebrowText || event.ticketEyebrowText || "INVITATION",
          ticketQuoteText: rawTicketQuoteText || event.ticketQuoteText || "Une soirée d'exception vous attend",
        },
      });

      for (const cat of parsedCategories) {
        if (cat.id) {
          const existing = event.categories.find((c) => c.id === cat.id);
          if (existing) {
            const ticketCount = await tx.ticket.count({
              where: { categoryId: cat.id, order: { status: "VALIDATED" } },
            });
            if (ticketCount > 0) continue;
            await tx.ticketCategory.update({
              where: { id: cat.id },
              data: { name: cat.name, price: cat.price },
            });
          }
        } else {
          await tx.ticketCategory.create({
            data: {
              eventId,
              name: cat.name,
              price: cat.price,
            },
          });
        }
      }
    });

    revalidatePath("/");
    revalidatePath("/admin/dashboard");
    revalidatePath(`/event/${eventId}`);

    return { success: true };
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes("Accès refusé")) {
      return { success: false, error: error.message };
    }
    console.error("Update event error:", error);
    return { success: false, error: "Erreur lors de la modification" };
  }
}

export async function deleteEvent(
  eventId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await verifyAdminSessionOrThrow();

    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) return { success: false, error: "Événement introuvable" };

    await prisma.event.delete({ where: { id: eventId } });

    revalidatePath("/admin/dashboard");
    revalidatePath("/");

    return { success: true };
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes("Accès refusé")) {
      return { success: false, error: error.message };
    }
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    console.error("Delete event error:", message);
    return { success: false, error: message };
  }
}
