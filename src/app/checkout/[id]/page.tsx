import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { CheckoutPageClient } from "./CheckoutPageClient";
import { getPlatformSettings } from "@/actions/settings";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ items?: string | string[] }>;
}

async function getEvent(id: string) {
  const event = await prisma.event.findUnique({
    where: { id },
    include: { categories: true },
  });
  if (!event) return null;
  return {
    id: event.id,
    title: event.title,
    categories: event.categories.map((c) => ({
      id: c.id,
      name: c.name,
      price: c.price,
      soldQuantity: c.soldQuantity,
    })),
  };
}

export default async function CheckoutPage({ params, searchParams }: Props) {
  const { id } = await params;
  const event = await getEvent(id);
  if (!event) notFound();

  const itemsParam = (await searchParams).items;
  const itemsArr = Array.isArray(itemsParam) ? itemsParam : itemsParam ? [itemsParam] : [];

  const cart = itemsArr
    .map((s) => {
      const [catId, qtyStr] = s.split(":");
      const qty = parseInt(qtyStr, 10);
      const cat = event.categories.find((c) => c.id === catId);
      if (!cat || qty <= 0) return null;
      return { categoryId: cat.id, name: cat.name, price: cat.price, quantity: qty };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  if (cart.length === 0) notFound();

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const settings = await getPlatformSettings();

  return (
    <main className="min-h-screen py-10 px-4">
      <CheckoutPageClient
        eventId={event.id}
        eventTitle={event.title}
        cart={cart}
        total={total}
        paySettings={{
          beneficiaryName: settings.beneficiaryName,
          moovNumber: settings.moovNumber,
          mtnNumber: settings.mtnNumber,
        }}
      />
    </main>
  );
}
