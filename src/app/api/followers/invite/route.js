import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";

// Zalo API utils
import { getAccessToken } from "@/lib/zalo";

function normalizePhone(phone) {
  if (!phone) return null;
  // Remove spaces, dashes, dots, parentheses
  let p = phone.replace(/[\s\-\.\(\)]/g, "");
  // Replace +84 with 84
  if (p.startsWith("+84")) p = p.replace("+84", "84");
  // Replace leading 0 with 84
  if (p.startsWith("0")) p = "84" + p.slice(1);
  return p;
}

export async function POST(request) {
  try {
    const session = await getServerSession();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { phones, messageText } = await request.json();

    if (!phones || !Array.isArray(phones) || phones.length === 0) {
      return NextResponse.json({ error: "Danh sách số điện thoại trống" }, { status: 400 });
    }

    if (!messageText || messageText.trim().length === 0) {
      return NextResponse.json({ error: "Nội dung tin nhắn không được để trống" }, { status: 400 });
    }

    // Lọc và chuẩn hóa SĐT
    const validPhones = new Set();
    for (const p of phones) {
      const normalized = normalizePhone(p);
      if (normalized && normalized.length >= 10 && normalized.length <= 15) {
        validPhones.add(normalized);
      }
    }

    const uniquePhones = Array.from(validPhones);
    if (uniquePhones.length === 0) {
      return NextResponse.json({ error: "Không có số điện thoại nào hợp lệ" }, { status: 400 });
    }

    // 1. Tìm các SĐT đã tồn tại trong Follower (để bỏ qua)
    const existingFollowers = await prisma.follower.findMany({
      where: { phone: { in: uniquePhones } },
      select: { phone: true }
    });
    
    // 2. Tìm các SĐT trong bảng StaffZaloLink (để bỏ qua)
    const existingStaff = await prisma.staffZaloLink.findMany({
      where: { phone: { in: uniquePhones } },
      select: { phone: true }
    });

    const followedSet = new Set([
      ...existingFollowers.map(f => f.phone).filter(Boolean),
      ...existingStaff.map(s => normalizePhone(s.phone)).filter(Boolean)
    ]);

    // Các số cần gửi
    const phonesToSend = uniquePhones.filter(p => !followedSet.has(p));

    let successCount = 0;
    let errorCount = 0;
    let skippedCount = followedSet.size;

    // Lấy token Zalo OA
    const token = await getAccessToken();

    // Gửi tin nhắn
    for (const phone of phonesToSend) {
      try {
        const res = await fetch("https://openapi.zalo.me/v2.0/oa/message", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            access_token: token,
          },
          body: JSON.stringify({
            recipient: { phone: phone },
            message: {
              text: messageText,
              attachment: {
                type: "template",
                payload: {
                  template_type: "list",
                  elements: [{
                    title: "Sở Y tế / CDC Đà Nẵng",
                    subtitle: "Bấm vào đây để Xem hồ sơ & Quan tâm",
                    image_url: "https://zcdc.vnos.org/images/banner-zcdc-new.png",
                    default_action: {
                      type: "oa.profile.show"
                    }
                  }]
                }
              }
            }
          })
        });

        const data = await res.json();
        
        if (data.error === 0) {
          successCount++;
        } else {
          console.error(`Lỗi gửi tin mời cho ${phone}:`, data);
          errorCount++;
        }
      } catch (err) {
        console.error(`Lỗi exception khi gửi tin cho ${phone}:`, err);
        errorCount++;
      }
      
      // Delay nhỏ để tránh rate limit Zalo
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return NextResponse.json({
      success: true,
      totalReceived: phones.length,
      valid: uniquePhones.length,
      skipped: skippedCount,
      successCount,
      errorCount
    });

  } catch (error) {
    console.error("Invite API error:", error);
    return NextResponse.json({ error: "Lỗi hệ thống: " + error.message }, { status: 500 });
  }
}
