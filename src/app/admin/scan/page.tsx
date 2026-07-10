import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import dynamic from "next/dynamic";

const QrScanner = dynamic(() => import("@/components/QrScanner").then((m) => m.QrScanner), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
    </div>
  ),
});

export default async function ScanPage() {
  const isAuthed = await isAdminAuthenticated();
  if (!isAuthed) redirect("/admin");

  return <QrScanner />;
}
