import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const notificationEmail = process.env.NOTIFICATION_EMAIL || "gillio2323@gmail.com";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://decogef.vercel.app";

interface OrderNotification {
  id: string;
  buyerName: string;
  buyerPhone: string;
  buyerEmail: string;
  referenceMomo: string;
  totalAmount: number;
  eventTitle: string;
  ticketCount: number;
}

export async function sendNewOrderNotification(order: OrderNotification) {
  if (!resend) {
    console.warn("[email] RESEND_API_KEY not configured — skipping notification");
    return;
  }

  try {
    const adminLink = `${APP_URL}/admin/dashboard`;

    await resend.emails.send({
      from: "onboarding@resend.dev",
      to: notificationEmail,
      subject: `Nouvelle commande — ${order.eventTitle}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"></head>
        <body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f5f5f5;padding:24px;margin:0">
          <table align="center" width="100%" style="max-width:560px;background:white;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08)">
            <tr>
              <td style="background:linear-gradient(135deg,#0a0a0a,#1a1a2e);padding:32px;text-align:center">
                <h1 style="margin:0;color:#D4AF37;font-size:22px;font-weight:700;letter-spacing:2px">Nouvelle commande</h1>
                <p style="margin:6px 0 0;color:#D4AF37;opacity:0.7;font-size:13px">En attente de validation</p>
              </td>
            </tr>
            <tr>
              <td style="padding:32px">
                <table width="100%" style="border-collapse:collapse">
                  <tr><td style="padding:6px 0;color:#666;font-size:13px;width:40%">Événement</td><td style="padding:6px 0;font-size:14px;font-weight:600;color:#111">${order.eventTitle}</td></tr>
                  <tr><td style="padding:6px 0;color:#666;font-size:13px">Acheteur</td><td style="padding:6px 0;font-size:14px;font-weight:600;color:#111">${order.buyerName}</td></tr>
                  <tr><td style="padding:6px 0;color:#666;font-size:13px">Téléphone</td><td style="padding:6px 0;font-size:14px;color:#111">${order.buyerPhone}</td></tr>
                  <tr><td style="padding:6px 0;color:#666;font-size:13px">Email</td><td style="padding:6px 0;font-size:14px;color:#111">${order.buyerEmail || "—"}</td></tr>
                  <tr><td style="padding:6px 0;color:#666;font-size:13px">Référence MoMo</td><td style="padding:6px 0;font-size:14px;font-family:monospace;color:#111">${order.referenceMomo}</td></tr>
                  <tr><td style="padding:6px 0;color:#666;font-size:13px">Montant</td><td style="padding:6px 0;font-size:16px;font-weight:700;color:#D4AF37">${order.totalAmount.toLocaleString()} FCFA</td></tr>
                  <tr><td style="padding:6px 0;color:#666;font-size:13px">Tickets</td><td style="padding:6px 0;font-size:14px;color:#111">${order.ticketCount}</td></tr>
                </table>

                <div style="margin-top:28px;text-align:center">
                  <a href="${adminLink}" style="display:inline-block;background:#D4AF37;color:#0a0a0a;text-decoration:none;font-weight:700;font-size:14px;padding:14px 32px;border-radius:8px;letter-spacing:0.5px">
                    Voir dans l'admin
                  </a>
                </div>
              </td>
            </tr>
            <tr>
              <td style="background:#fafafa;padding:16px 32px;text-align:center;border-top:1px solid #eee">
                <p style="margin:0;font-size:12px;color:#999">Billeterie Gala — notification automatique</p>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
    });

    console.log(`[email] Notification sent for order ${order.id}`);
  } catch (error) {
    console.error("[email] Failed to send notification:", error);
  }
}
