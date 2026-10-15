/**
 * API Webhook 1: KDV Chuyển Phiếu Cho Kế Toán (event: chuyen_ke_toan)
 * POST /api/webhook/kiem-dich/chuyen-ke-toan
 * Headers: X-Api-Key: <KHOA>, Content-Type: application/json
 */
import { NextResponse } from "next/server";
import { processKiemDichWebhook } from "@/lib/kiemDichWebhook";

export const dynamic = "force-dynamic";

export async function POST(request) {
  return processKiemDichWebhook(request, "chuyen_ke_toan");
}

export async function GET() {
  return NextResponse.json({
    service: "CDC Đà Nẵng - Webhook 1 (Chuyển kế toán)",
    event: "chuyen_ke_toan",
    status: "active",
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "X-Api-Key": "<KHOA>",
    },
    description: "Nhận thông báo khi Kiểm dịch viên chuyển phiếu thu phí sang Kế toán để xuất hóa đơn.",
  });
}
