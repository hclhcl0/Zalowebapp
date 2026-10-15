/**
 * API Webhook Tổng Hợp: Thu phí kiểm dịch oneCDC -> Zalo OA CDC Đà Nẵng
 * POST /api/webhook/kiem-dich (hoặc rewrite từ /webhook)
 * Headers: X-Api-Key: <KHOA>, Content-Type: application/json
 * Body event: 'chuyen_ke_toan' | 'ke_toan_tu_choi'
 */
import { NextResponse } from "next/server";
import { processKiemDichWebhook, getExpectedApiKey } from "@/lib/kiemDichWebhook";

export const dynamic = "force-dynamic";

export async function POST(request) {
  return processKiemDichWebhook(request, null);
}

export async function GET() {
  const currentKey = await getExpectedApiKey();
  const maskedKey =
    currentKey && currentKey.length > 8
      ? `${currentKey.substring(0, 4)}...${currentKey.slice(-4)}`
      : "********";

  return NextResponse.json({
    service: "CDC Đà Nẵng - Webhook Thông báo Thu phí Kiểm dịch (oneCDC)",
    status: "active",
    endpoints: {
      all_events: "/api/webhook/kiem-dich (hoặc /webhook)",
      chuyen_ke_toan: "/api/webhook/kiem-dich/chuyen-ke-toan",
      ke_toan_tu_choi: "/api/webhook/kiem-dich/ke-toan-tu-choi",
    },
    supported_events: ["chuyen_ke_toan", "ke_toan_tu_choi"],
    auth: {
      type: "Header",
      header_name: "X-Api-Key",
      key_status: "configured",
      key_masked: maskedKey,
    },
    timestamp: new Date().toISOString(),
  });
}
