/**
 * API: Tra cứu kết quả xét nghiệm bằng mã (Mini App)
 * GET /api/miniapp/test-results?code=xxx
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code")?.trim();

    if (!code) {
      return NextResponse.json({ error: "Vui lòng nhập mã tra cứu" }, { status: 400 });
    }

    const result = await prisma.testResult.findUnique({
      where: { resultCode: code },
      select: {
        id:        true,
        fullName:  true,
        resultCode: true,
        content:   true,
        testedAt:  true,
        createdAt: true,
        // Không trả phone để bảo mật
      },
    });

    if (!result) {
      return NextResponse.json(
        { error: "Không tìm thấy kết quả với mã này. Vui lòng kiểm tra lại." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    console.error("[miniapp/test-results]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
