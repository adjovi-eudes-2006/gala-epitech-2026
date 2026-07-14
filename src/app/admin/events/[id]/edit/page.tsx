import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { EventEditForm } from "@/components/admin/EventEditForm";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditEventPage({ params }: Props) {
  const { id } = await params;
  const isAuthed = await isAdminAuthenticated();
  if (!isAuthed) redirect("/admin");

  const event = await prisma.event.findUnique({
    where: { id },
    include: { categories: true },
  });

  if (!event) notFound();

  return (
    <EventEditForm
      event={{
        id: event.id,
        title: event.title,
        description: event.description,
        date: event.date.toISOString(),
        location: event.location,
        coverImage: event.coverImage,
        ticketBackgroundUrl: event.ticketBackgroundUrl,
        ticketEyebrowText: event.ticketEyebrowText ?? "INVITATION",
        ticketQuoteText: event.ticketQuoteText ?? "Une soirée d'exception vous attend",
        categories: event.categories.map((c) => ({
          id: c.id,
          name: c.name,
          price: c.price,
          soldQuantity: c.soldQuantity,
        })),
      }}
    />
  );
}
