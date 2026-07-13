import { isAdminAuthenticated } from "@/lib/admin-auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { SettingsForm } from "./SettingsForm";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const isAuthed = await isAdminAuthenticated();
  if (!isAuthed) redirect("/admin");

  const settings = await prisma.platformSettings.findUnique({
    where: { id: "singleton" },
  });

  return (
    <SettingsForm
      defaultValues={{
        beneficiaryName: settings?.beneficiaryName || "MELE AMEN MELVIE",
        moovNumber: settings?.moovNumber || "0145912093",
        mtnNumber: settings?.mtnNumber || "0146343485",
      }}
    />
  );
}
