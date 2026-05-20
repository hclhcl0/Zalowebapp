"use client";

import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import NewsManager from "@/components/NewsManager";

const STATIC_MAPPING = {
  daily: {
    dbId: "daily_news",
    name: "Tin vắn dịch bệnh",
    desc: "Quản lý và soạn thảo tin vắn về dịch bệnh (sốt xuất huyết, tay chân miệng, v.v.). Nhân viên có thể soạn tin và lưu nháp; Quản trị viên kiểm tra, duyệt xuất bản và gửi tới Zalo OA."
  },
  "vaccination-schedule": {
    dbId: "vac_schedule",
    name: "Lịch tiêm chủng",
    desc: "Quản lý các tin tức và thông báo về lịch tiêm chủng tại địa phương. Nhân viên có thể soạn tin và lưu nháp; Quản trị viên kiểm tra, duyệt xuất bản và gửi tới Zalo OA."
  },
  alerts: {
    dbId: "alert",
    name: "Thông báo khẩn",
    desc: "Đăng tải và quản lý các thông báo khẩn cấp về y tế và dịch bệnh. Nhân viên có thể soạn tin và lưu nháp; Quản trị viên kiểm tra, duyệt xuất bản và gửi tới Zalo OA."
  }
};

export default function DynamicNewsPage() {
  const params = useParams();
  const categorySlug = params?.category;

  const [loading, setLoading] = useState(true);
  const [targetCategory, setTargetCategory] = useState(null);

  useEffect(() => {
    if (!categorySlug) return;

    // Check if it's one of the legacy/default paths
    if (STATIC_MAPPING[categorySlug]) {
      setTargetCategory({
        id: STATIC_MAPPING[categorySlug].dbId,
        name: STATIC_MAPPING[categorySlug].name,
        desc: STATIC_MAPPING[categorySlug].desc
      });
      setLoading(false);
      return;
    }

    // Otherwise, fetch custom categories from settings
    async function loadCustomCategory() {
      try {
        const res = await fetch("/api/settings");
        const json = await res.json();
        if (json.data && json.data.news_categories) {
          const parsed = JSON.parse(json.data.news_categories.value);
          if (Array.isArray(parsed)) {
            const found = parsed.find(c => c.id === categorySlug);
            if (found) {
              setTargetCategory({
                id: found.id,
                name: found.name,
                desc: `Quản lý chuyên mục tin tức "${found.name}". Soạn thảo, lưu nháp và duyệt gửi đến Zalo OA.`
              });
              setLoading(false);
              return;
            }
          }
        }
      } catch (e) {
        console.error("Failed to load custom category details:", e);
      }

      // Fallback in case not found or error
      setTargetCategory({
        id: categorySlug,
        name: `Chuyên mục ${categorySlug}`,
        desc: `Quản lý chuyên mục tin tức ${categorySlug}. Soạn thảo, lưu nháp và duyệt gửi đến Zalo OA.`
      });
      setLoading(false);
    }

    loadCustomCategory();
  }, [categorySlug]);

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "300px" }}>
        <div style={{ textAlign: "center", color: "var(--text-muted)" }}>
          <div className="spinner" style={{ borderColor: "var(--border)", borderTopColor: "var(--primary)", width: 32, height: 32, margin: "0 auto 12px" }} />
          Đang tải chuyên mục tin tức...
        </div>
      </div>
    );
  }

  if (!targetCategory) return null;

  return (
    <NewsManager
      category={targetCategory.id}
      title={targetCategory.name}
      description={targetCategory.desc}
    />
  );
}
