"use client";
import { HotlinesPanel } from "@/app/settings/HotlinesSchedulesPanel";

export default function MiniAppHotlinesPage() {
  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">📞 Tổng đài tư vấn</h1>
          <p className="page-desc">
            Quản lý danh sách số điện thoại tổng đài hiển thị trong Zalo Mini App. 
            Thay đổi sẽ áp dụng ngay mà không cần deploy lại Mini App.
          </p>
        </div>
      </div>
      <div className="card">
        <HotlinesPanel />
      </div>
    </div>
  );
}
