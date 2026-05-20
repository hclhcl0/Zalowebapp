/**
 * API: Kiểm tra kết nối Zalo OA
 * GET /api/settings/test-zalo → Thử gọi API Zalo bằng token đang lưu
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // Đọc access token từ database
    const tokenConfig = await prisma.systemConfig.findUnique({
      where: { key: "zalo_access_token" },
    });

    if (!tokenConfig?.value) {
      return NextResponse.json(
        { success: false, message: "Chưa cấu hình Access Token." },
        { status: 400 }
      );
    }

    // Gọi thử API lấy thông tin OA
    const res = await fetch(
      "https://openapi.zalo.me/v2.0/oa/getoa",
      {
        headers: { access_token: tokenConfig.value },
      }
    );

    const data = await res.json();

    if (data.error === 0) {
      return NextResponse.json({
        success: true,
        message: "Kết nối thành công!",
        oa: {
          name: data.data?.name,
          id: data.data?.oa_id,
          followers: data.data?.num_follower,
          avatar: data.data?.avatar,
        },
      });
    } else {
      return NextResponse.json({
        success: false,
        message: `Lỗi Zalo API: ${data.message} (code ${data.error})`,
      });
    }
  } catch (err) {
    return NextResponse.json(
      { success: false, message: `Lỗi hệ thống: ${err.message}` },
      { status: 500 }
    );
  }
}
