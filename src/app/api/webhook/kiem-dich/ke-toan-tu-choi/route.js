/**
 * API Webhook 2: Kế Toán Từ Chối Phiếu, Báo Về KDV (event: ke_toan_tu_choi)
 * POST /api/webhook/kiem-dich/ke-toan-tu-choi
 * Headers: X-Api-Key: <KHOA>, Content-Type: application/json
 */
import { NextResponse } from "next/server";
import { processKiemDichWebhook } from "@/lib/kiemDichWebhook";

export const dynamic = "force-dynamic";

export async function POST(request) {
  return processKiemDichWebhook(request, "ke_toan_tu_choi");
}

export async function GET() {
  return NextResponse.json({
    service: "CDC Đà Nẵng - Webhook 2 (Kế toán từ chối)",
    event: "ke_toan_tu_choi",
    status: "active",
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "X-Api-Key": "<KHOA>",
    },
    description: "Nhận thông báo khi Kế toán từ chối phiếu thu phí kèm lý do, gửi ngược lại cho KDV sửa.",
  });
}
