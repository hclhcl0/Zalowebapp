/**
 * API: Làm mới Access Token Zalo
 * POST /api/settings/refresh-token
 */
import { NextResponse } from "next/server";
import { refreshZaloAccessToken } from "@/lib/zalo";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const data = await refreshZaloAccessToken();
    if (data.access_token) {
      return NextResponse.json({
        success: true,
        message: "Làm mới token thành công! Token mới đã được lưu vào hệ thống.",
      });
    } else {
      return NextResponse.json({
        success: false,
        message: `Lỗi từ Zalo: ${data.message ?? "Không xác định"}`,
      });
    }
  } catch (err) {
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 }
    );
  }
}
