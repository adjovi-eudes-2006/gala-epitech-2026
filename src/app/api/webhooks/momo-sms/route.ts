import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import { parseMomoSms } from "@/lib/parseMomoSms";

export async function POST(request: NextRequest) {
  const secret = process.env.SMS_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Fonctionnalité SMS automatique désactivée" }, { status: 503 });
  }

  const authHeader = request.headers.get("x-webhook-secret");
  if (!authHeader || authHeader !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { text: string; sentTimestamp?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.text || typeof body.text !== "string" || body.text.trim().length === 0) {
    return NextResponse.json({ error: "Missing text field" }, { status: 400 });
  }

  const rawText = body.text.trim();
  console.log("Webhook received SMS:", rawText.slice(0, 120));

  const smsLog = await prisma.incomingSmsLog.create({
    data: { rawText },
  });

  const parsed = parseMomoSms(rawText);

  if (!parsed) {
    console.log("SMS log", smsLog.id, ": no amount/reference parsed — stored for manual review");
    return NextResponse.json({ status: "logged", matched: false, reason: "parse_failed" });
  }

  const existing = await prisma.order.findFirst({
    where: { momoTransactionId: parsed.reference, status: { in: ["VALIDATED", "PAID"] } },
  });

  if (existing) {
    console.warn("ANTI-REPLAY: reference", parsed.reference, "already used by order", existing.id);
    await prisma.incomingSmsLog.update({
      where: { id: smsLog.id },
      data: { parsedAmount: parsed.amount, parsedRef: parsed.reference, matched: false },
    });
    return NextResponse.json({ status: "logged", matched: false, reason: "duplicate_reference" });
  }

  const candidates = await prisma.order.findMany({
    where: { status: "PENDING" },
    include: { tickets: true },
  });

  let matchedOrder = candidates.find((o) => o.momoTransactionId === parsed.reference);

  if (!matchedOrder) {
    const amountCandidates = candidates.filter((o) => o.totalAmount === parsed.amount);
    if (amountCandidates.length === 1) {
      matchedOrder = amountCandidates[0];
    } else if (amountCandidates.length > 1) {
      console.log("SMS log", smsLog.id, ": ambiguous amount match,", amountCandidates.length, "orders at", parsed.amount, "FCFA");
      await prisma.incomingSmsLog.update({
        where: { id: smsLog.id },
        data: { parsedAmount: parsed.amount, parsedRef: parsed.reference, matched: false },
      });
      return NextResponse.json({ status: "logged", matched: false, reason: "ambiguous_amount" });
    }
  }

  if (!matchedOrder) {
    console.log("SMS log", smsLog.id, ": no matching PENDING order found");
    await prisma.incomingSmsLog.update({
      where: { id: smsLog.id },
      data: { parsedAmount: parsed.amount, parsedRef: parsed.reference, matched: false },
    });
    return NextResponse.json({ status: "logged", matched: false, reason: "no_match" });
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: matchedOrder!.id },
        data: { momoTransactionId: parsed.reference, status: "VALIDATED" },
      });

      for (const t of matchedOrder!.tickets) {
        await tx.ticket.update({
          where: { id: t.id },
          data: { secureToken: crypto.randomBytes(32).toString("hex") },
        });
      }


      await tx.incomingSmsLog.update({
        where: { id: smsLog.id },
        data: { parsedAmount: parsed.amount, parsedRef: parsed.reference, matched: true, orderId: matchedOrder!.id },
      });
    });

    console.log("SMS log", smsLog.id, ": auto-validated order", matchedOrder.id);
    return NextResponse.json({ status: "validated", matched: true, orderId: matchedOrder.id });
  } catch (error) {
    console.error("Auto-validation failed for SMS log", smsLog.id, error);
    return NextResponse.json({ status: "error", message: "Validation failed" }, { status: 500 });
  }
}
