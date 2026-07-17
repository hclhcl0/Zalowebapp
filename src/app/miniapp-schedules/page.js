"use client";
import { SchedulesPanel } from "@/app/settings/HotlinesSchedulesPanel";

export default function MiniAppSchedulesPage() {
  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">🗓 Lịch làm việc</h1>
          <p className="page-desc">
            Quản lý lịch tiêm chủng và lịch xét nghiệm hiển thị trong Zalo Mini App. 
            Thay đổi sẽ áp dụng ngay mà không cần deploy lại Mini App.
          </p>
        </div>
      </div>
      <div className="card">
        <SchedulesPanel />
      </div>
    </div>
  );
}
