"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  Upload, Send, Plus, X, CheckCircle, XCircle,
  Loader2, Eye, EyeOff, AlertCircle, RefreshCw, Search,
  ChevronLeft, ChevronRight, Users, Settings2, Mail, Trash2, Zap
} from "lucide-react";

// Page size for tables pagination
const PAGE_SIZE = 8;

const fmt = (v) => {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "number") return v === 0 ? "0" : v.toLocaleString("vi-VN");
  const n = parseFloat(String(v));
  if (!isNaN(n) && String(v).trim() !== "") return n.toLocaleString("vi-VN");
  return String(v);
};

export default function SalaryEmailPage() {
  const [activeTab, setActiveTab] = useState("salary");

  // === accounts states ===
  const [accounts, setAccounts] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newPass, setNewPass] = useState("");

  const [batchSize, setBatchSize] = useState(10);
  const [delayMs, setDelayMs] = useState(2000);

  // Load Gmail pool from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("cdc_gmail_pool");
    if (saved) {
      try {
        setAccounts(JSON.parse(saved));
      } catch (e) {
        console.error(e);
      }
    }
    setIsLoaded(true);
  }, []);

  // Save Gmail pool to localStorage
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem("cdc_gmail_pool", JSON.stringify(accounts));
    }
  }, [accounts, isLoaded]);

  const addAccount = () => {
    if (!newEmail.trim() || !newPass.trim()) return;
    setAccounts((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        user: newEmail.trim(),
        appPassword: newPass.replace(/\s/g, ""),
        showPass: false,
      },
    ]);
    setNewEmail("");
    setNewPass("");
  };

  const removeAccount = (id) => setAccounts((prev) => prev.filter((a) => a.id !== id));
  const togglePass = (id) =>
    setAccounts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, showPass: !a.showPass } : a))
    );

  return (
    <div className="min-h-screen bg-slate-50/50 pb-12">
      {/* ── HEADER ── */}
      <div className="mb-6 bg-gradient-to-r from-blue-700 via-indigo-600 to-indigo-800 p-6 rounded-2xl shadow-md text-white">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl">📧</span>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Hệ Thống Gửi Email Tự Động</h1>
              <p className="text-indigo-100 text-sm">Gửi báo lương quý, thuế TNCN và email đính kèm Excel tùy biến cho nhân viên CDC Đà Nẵng</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {accounts.length > 0 ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 transition rounded-lg text-xs font-semibold backdrop-blur-sm">
                <Zap className="w-3.5 h-3.5 text-yellow-300 fill-yellow-300" />
                {accounts.length} tài khoản trong Pool
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-500/20 rounded-lg text-xs font-semibold border border-red-500/30">
                ⚠️ Chưa cấu hình Gmail Pool
              </span>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-1 mt-6 border-b border-white/10">
          <button
            onClick={() => setActiveTab("salary")}
            className={`px-4 py-2.5 text-sm font-semibold rounded-t-xl transition-all ${
              activeTab === "salary"
                ? "bg-white text-indigo-800 shadow-sm font-bold"
                : "text-indigo-100 hover:text-white hover:bg-white/10"
            }`}
          >
            📊 Báo Lương Quý
          </button>
          <button
            onClick={() => setActiveTab("custom")}
            className={`px-4 py-2.5 text-sm font-semibold rounded-t-xl transition-all ${
              activeTab === "custom"
                ? "bg-white text-indigo-800 shadow-sm font-bold"
                : "text-indigo-100 hover:text-white hover:bg-white/10"
            }`}
          >
            ⚙️ Email Tùy Chọn (Dynamic Excel)
          </button>
          <button
            onClick={() => setActiveTab("tax")}
            className={`px-4 py-2.5 text-sm font-semibold rounded-t-xl transition-all ${
              activeTab === "tax"
                ? "bg-white text-emerald-800 shadow-sm font-bold"
                : "text-indigo-100 hover:text-white hover:bg-white/10"
            }`}
          >
            🧾 Báo Thuế TNCN
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left main contents: tab switcher contents */}
        <div className="lg:col-span-2 space-y-6">
          {activeTab === "salary" && (
            <SalaryTab accounts={accounts} batchSize={batchSize} delayMs={delayMs} />
          )}
          {activeTab === "custom" && (
            <CustomSalaryTab accounts={accounts} batchSize={batchSize} delayMs={delayMs} />
          )}
          {activeTab === "tax" && (
            <TaxTab accounts={accounts} batchSize={batchSize} delayMs={delayMs} />
          )}
        </div>

        {/* Right side config panel: Gmail Pool Setup */}
        <div className="space-y-6">
          <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-slate-800 text-white text-xs font-bold flex items-center justify-center font-mono">@</span>
                <h2 className="font-bold text-slate-800 text-sm">Gmail Account Pool</h2>
              </div>
              {accounts.length > 0 && (
                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-xs font-medium">
                  {accounts.length} Active
                </span>
              )}
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-amber-800 text-xs leading-relaxed flex gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                <span>
                  Sử dụng <strong>Mật khẩu ứng dụng (App Password)</strong> của Gmail để bảo mật tài khoản. Hãy tạo trong <em>Google Account &rarr; Security &rarr; 2-Step Verification &rarr; App passwords</em>.
                </span>
              </div>

              {/* Form add Gmail account */}
              <div className="space-y-2">
                <input
                  type="email"
                  placeholder="email@gmail.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full h-9 rounded-lg border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
                <input
                  type="password"
                  placeholder="Mật khẩu ứng dụng (16 ký tự)"
                  value={newPass}
                  onChange={(e) => setNewPass(e.target.value)}
                  className="w-full h-9 rounded-lg border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
                <button
                  onClick={addAccount}
                  disabled={!newEmail.trim() || !newPass.trim()}
                  className="w-full h-9 bg-slate-800 hover:bg-slate-900 disabled:opacity-50 text-white font-semibold text-sm rounded-lg flex items-center justify-center gap-1.5 shadow-sm transition"
                >
                  <Plus className="w-4 h-4" /> Thêm tài khoản pool
                </button>
              </div>

              {/* List of Gmail accounts */}
              {accounts.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-xs border border-dashed border-slate-200 rounded-xl">
                  Chưa có tài khoản nào. Hãy thêm ít nhất 1 Gmail để bắt đầu gửi email.
                </div>
              ) : (
                <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                  {accounts.map((acc, idx) => (
                    <div key={acc.id} className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs">
                      <div className="w-5 h-5 rounded-full bg-slate-200 text-slate-600 text-[10px] font-bold flex items-center justify-center shrink-0">
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-800 truncate">{acc.user}</p>
                        <p className="text-slate-400 font-mono text-[10px]">
                          {acc.showPass ? acc.appPassword : "•••• •••• •••• ••••"}
                        </p>
                      </div>
                      <button
                        className="w-6 h-6 rounded hover:bg-slate-200 flex items-center justify-center text-slate-500"
                        onClick={() => togglePass(acc.id)}
                      >
                        {acc.showPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        className="w-6 h-6 rounded hover:bg-red-50 flex items-center justify-center text-red-500"
                        onClick={() => removeAccount(acc.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Batch config options */}
          <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50">
              <h2 className="font-bold text-slate-800 text-sm">⚙️ Cấu hình Tốc độ Gửi</h2>
            </div>
            <div className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Số email mỗi đợt (Batch size)</label>
                <input
                  type="number"
                  value={batchSize}
                  onChange={(e) => setBatchSize(Number(e.target.value))}
                  className="w-full h-9 rounded-lg border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
                <span className="text-[10px] text-slate-400">Nên để từ 5-15 email/lần gửi để tránh bị đánh dấu Spam.</span>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Thời gian nghỉ giữa các đợt (Milliseconds)</label>
                <input
                  type="number"
                  value={delayMs}
                  onChange={(e) => setDelayMs(Number(e.target.value))}
                  className="w-full h-9 rounded-lg border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
                <span className="text-[10px] text-slate-400">Ví dụ: 2000 = 2 giây nghỉ để giảm tải gửi.</span>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// COMPONENT 1: BÁO LƯƠNG QUÝ TAB
// ==========================================
import { generateSalaryEmail } from "@/lib/salaryEmailTemplate";

function SalaryTab({ accounts, batchSize, delayMs }) {
  const fileRef = useRef(null);
  const resultsRef = useRef(null);
  const abortControllerRef = useRef(null);

  const [records, setRecords] = useState([]);
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [fileName, setFileName] = useState("");
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState("");
  const [isDrag, setIsDrag] = useState(false);
  const [page, setPage] = useState(0);

  const [subject, setSubject] = useState("Thông báo tiền lương tăng thêm Quý I/2026 - CDC Đà Nẵng");
  const [customMessage, setCustomMessage] = useState("");

  const [isSending, setIsSending] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [prog, setProg] = useState({ sent: 0, total: 0, success: 0, failed: 0, results: [] });
  const [previewRecord, setPreviewRecord] = useState(null);

  const processFile = useCallback(async (file) => {
    setParseError("");
    setParsing(true);
    setRecords([]);
    setFileName(file.name);
    setPage(0);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/salary-email/parse-excel", { method: "POST", body: fd });
      const json = await res.json();
      if (json.records) {
        setRecords(
          json.records.map((r) => ({
            ...r,
            id: crypto.randomUUID(),
            selected: true,
            status: "idle",
          }))
        );
      } else {
        setParseError(json.error || "Lỗi đọc file");
      }
    } catch (e) {
      setParseError("Không thể kết nối server hoặc phân tích file.");
    } finally {
      setParsing(false);
    }
  }, []);

  const onDrop = useCallback(
    (e) => {
      e.preventDefault();
      setIsDrag(false);
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  const onFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const startSend = async () => {
    const selectedRecords = records.filter((r) => r.selected && r.status !== "success");
    if (!selectedRecords.length || !accounts.length || isSending) return;
    setIsSending(true);
    setIsDone(false);
    setProg({ sent: 0, total: selectedRecords.length, success: 0, failed: 0, results: [] });

    setRecords((prev) =>
      prev.map((r) =>
        selectedRecords.some((sr) => sr.id === r.id)
          ? { ...r, status: "idle", error: undefined }
          : r
      )
    );

    const ac = new AbortController();
    abortControllerRef.current = ac;

    try {
      const res = await fetch("/api/salary-email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: ac.signal,
        body: JSON.stringify({
          records: selectedRecords,
          accounts: accounts.map(({ id, user, appPassword }) => ({ id, user, appPassword })),
          subject,
          batchSize,
          batchDelayMs: delayMs,
          customMessage,
        }),
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || "Lỗi hệ thống khi gửi email.");
      }

      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const ev = JSON.parse(line.slice(6));
          if (ev.type === "progress") {
            const r = ev.result;
            setRecords((prev) =>
              prev.map((rec) =>
                rec.email === r.email && rec.tenNhanVien === r.tenNhanVien
                  ? { ...rec, status: r.status, error: r.error }
                  : rec
              )
            );
            setProg((p) => ({
              sent: ev.index,
              total: ev.total,
              success: p.success + (r.status === "success" ? 1 : 0),
              failed: p.failed + (r.status === "error" ? 1 : 0),
              results: [...p.results, r],
            }));
            setTimeout(() => {
              if (resultsRef.current) {
                resultsRef.current.scrollTop = resultsRef.current.scrollHeight;
              }
            }, 50);
          }
          if (ev.type === "done") setIsDone(true);
        }
      }
    } catch (e) {
      if (e.name === "AbortError") {
        console.log("Đã dừng gửi");
        setRecords((prev) =>
          prev.map((r) =>
            r.status === "idle" && selectedRecords.some((s) => s.id === r.id)
              ? { ...r, status: "idle" }
              : r
          )
        );
      } else {
        console.error(e);
        setParseError("Lỗi kết nối: " + e.message);
      }
    } finally {
      setIsSending(false);
      abortControllerRef.current = null;
    }
  };

  const pct = prog.total ? Math.round((prog.sent / prog.total) * 100) : 0;

  const filteredRecords = records.filter((r) => {
    if (searchQuery && !r.tenNhanVien.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (filterStatus === "selected") return r.selected;
    if (filterStatus === "success") return r.status === "success";
    if (filterStatus === "error") return r.status === "error";
    return true;
  });

  const totalPages = Math.ceil(filteredRecords.length / PAGE_SIZE);
  const pageRows = filteredRecords.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const selectedCount = records.filter((r) => r.selected && r.status !== "success").length;
  const canSend = selectedCount > 0 && accounts.length > 0 && !isSending;

  const toggleSelectAll = (checked) => {
    setRecords((prev) => prev.map((r) => ({ ...r, selected: checked })));
  };
  const toggleSelect = (id, checked) => {
    setRecords((prev) => prev.map((r) => (r.id === id ? { ...r, selected: checked } : r)));
  };

  return (
    <div className="space-y-6">
      {/* ── STEP 1: UPLOAD ── */}
      <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
          <span className="w-7 h-7 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center">1</span>
          <h2 className="font-semibold text-slate-800">Tải file Excel danh sách Báo lương</h2>
        </div>
        <div className="p-6">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDrag(true);
            }}
            onDragLeave={() => setIsDrag(false)}
            onDrop={onDrop}
            onClick={() => fileRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${
              isDrag ? "border-indigo-500 bg-indigo-50" : "border-slate-300 hover:border-indigo-400 hover:bg-indigo-50/50"
            }`}
          >
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={onFileChange} />
            {parsing ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
                <p className="text-slate-500 text-sm">Đang phân tích file...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center mb-1">
                  <Upload className="w-6 h-6 text-indigo-600" />
                </div>
                <p className="font-semibold text-slate-700 text-sm">Kéo thả hoặc click để chọn file Excel</p>
                <p className="text-slate-400 text-xs">Hỗ trợ: .xlsx, .xls, .csv</p>
              </div>
            )}
          </div>

          {parseError && (
            <div className="mt-3 flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" /> {parseError}
            </div>
          )}

          {records.length > 0 && (
            <div className="mt-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-xs font-semibold rounded border border-indigo-200 flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" /> {records.length} Nhân viên
                  </span>
                  <span className="text-slate-400 text-xs truncate max-w-[200px]">{fileName}</span>
                </div>
                <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1 text-xs">
                  <button
                    onClick={() => {
                      setFilterStatus("all");
                      setPage(0);
                    }}
                    className={`px-3 py-1.5 rounded-md font-medium transition ${
                      filterStatus === "all" ? "bg-white text-indigo-800 shadow-sm" : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Tất cả
                  </button>
                  <button
                    onClick={() => {
                      setFilterStatus("selected");
                      setPage(0);
                    }}
                    className={`px-3 py-1.5 rounded-md font-medium transition ${
                      filterStatus === "selected" ? "bg-white text-indigo-800 shadow-sm" : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Đã chọn ({records.filter((r) => r.selected).length})
                  </button>
                  <button
                    onClick={() => {
                      setFilterStatus("error");
                      setPage(0);
                    }}
                    className={`px-3 py-1.5 rounded-md font-medium transition ${
                      filterStatus === "error" ? "bg-white text-indigo-800 shadow-sm" : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Lỗi ({records.filter((r) => r.status === "error").length})
                  </button>
                  <button
                    onClick={() => {
                      setFilterStatus("success");
                      setPage(0);
                    }}
                    className={`px-3 py-1.5 rounded-md font-medium transition ${
                      filterStatus === "success" ? "bg-white text-indigo-800 shadow-sm" : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Đã gửi
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 mb-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Tìm kiếm tên nhân viên..."
                    className="w-full pl-9 h-9 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setPage(0);
                    }}
                  />
                </div>
                <button
                  onClick={() => fileRef.current?.click()}
                  className="px-3 h-9 text-xs border border-slate-200 hover:bg-slate-50 font-semibold rounded-lg text-slate-600 inline-flex items-center gap-1"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Đổi file
                </button>
              </div>

              {/* Table list */}
              <div className="rounded-xl border border-slate-200 overflow-hidden shadow-sm bg-white">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/70 border-b border-slate-200 text-slate-600 font-semibold">
                        <th className="px-4 py-2.5 w-10 text-center">
                          <input
                            type="checkbox"
                            checked={records.length > 0 && records.every((r) => r.selected)}
                            onChange={(e) => toggleSelectAll(e.target.checked)}
                            className="rounded border-slate-300 w-4 h-4 text-indigo-600 cursor-pointer"
                          />
                        </th>
                        <th className="px-4 py-2.5">Tên nhân viên</th>
                        <th className="px-4 py-2.5">Email nhận</th>
                        <th className="px-4 py-2.5 text-right">HS T1</th>
                        <th className="px-4 py-2.5 text-right">HS T2</th>
                        <th className="px-4 py-2.5 text-right">HS T3</th>
                        <th className="px-4 py-2.5 text-right text-indigo-700">Tổng thu nhập</th>
                        <th className="px-4 py-2.5 text-center">Trạng thái</th>
                        <th className="px-4 py-2.5 text-center">Xem</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {pageRows.map((r, i) => (
                        <tr
                          key={r.id}
                          className={`hover:bg-slate-50/50 transition-colors ${
                            r.status === "error" ? "bg-red-50/30" : r.status === "success" ? "bg-emerald-50/30" : ""
                          }`}
                        >
                          <td className="px-4 py-2 text-center">
                            <input
                              type="checkbox"
                              checked={r.selected}
                              onChange={(e) => toggleSelect(r.id, e.target.checked)}
                              className="rounded border-slate-300 w-4 h-4 text-indigo-600 cursor-pointer"
                            />
                          </td>
                          <td className="px-4 py-2 font-medium text-slate-800">{r.tenNhanVien}</td>
                          <td className="px-4 py-2 text-slate-500 font-mono">{r.email}</td>
                          <td className="px-4 py-2 text-right font-mono text-slate-600">{r.heSoLieuT1}</td>
                          <td className="px-4 py-2 text-right font-mono text-slate-600">{r.heSoLieuT2}</td>
                          <td className="px-4 py-2 text-right font-mono text-slate-600">{r.heSoLieuT3}</td>
                          <td className="px-4 py-2 text-right font-semibold font-mono text-indigo-700">{fmt(r.tongThuNhap)}</td>
                          <td className="px-4 py-2 text-center">
                            {r.status === "success" && <CheckCircle className="w-5 h-5 text-emerald-500 inline-block" />}
                            {r.status === "error" && <XCircle className="w-5 h-5 text-red-500 inline-block" title={r.error} />}
                            {r.status === "idle" && <span className="text-slate-300 font-semibold">—</span>}
                          </td>
                          <td className="px-4 py-2 text-center">
                            <button
                              onClick={() => setPreviewRecord(r)}
                              className="p-1 rounded text-indigo-600 hover:bg-indigo-50 hover:text-indigo-800 transition"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {pageRows.length === 0 && (
                        <tr>
                          <td colSpan="9" className="text-center py-6 text-slate-400">
                            Không tìm thấy kết quả phù hợp.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {totalPages > 1 && (
                  <div className="px-4 py-3 flex items-center justify-between border-t border-slate-100 bg-slate-50/50">
                    <span className="text-xs text-slate-500">
                      Trang {page + 1}/{totalPages}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setPage((p) => Math.max(0, p - 1))}
                        disabled={page === 0}
                        className="p-1.5 rounded hover:bg-slate-200 disabled:opacity-30"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                        disabled={page === totalPages - 1}
                        className="p-1.5 rounded hover:bg-slate-200 disabled:opacity-30"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── STEP 2: CẤU HÌNH GỬI ── */}
      <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
          <span className="w-7 h-7 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center">2</span>
          <h2 className="font-semibold text-slate-800">Cấu hình tiêu đề & Nội dung gửi kèm</h2>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Tiêu đề email (Subject)</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              placeholder="Nhập tiêu đề email..."
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Lời nhắn gửi kèm đầu email (Tùy chọn)</label>
            <textarea
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              rows="3"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              placeholder="Nhập lời mở đầu gửi kèm..."
            />
          </div>

          {records.length > 0 && (
            <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-xl text-xs space-y-1">
              <p className="text-indigo-800 font-semibold">
                Sẽ gửi {selectedCount} email báo lương thông qua {accounts.length} tài khoản Gmail.
              </p>
              {accounts.length > 0 && (
                <p className="text-indigo-600">
                  Trung bình mỗi tài khoản gửi {Math.ceil(selectedCount / accounts.length)} email (thuật toán Round-Robin).
                </p>
              )}
            </div>
          )}

          <button
            onClick={startSend}
            disabled={!canSend}
            className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-lg flex items-center justify-center gap-2 shadow-sm transition text-sm"
          >
            {isSending ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" /> Đang gửi {prog.sent}/{prog.total}...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" /> Gửi {selectedCount} Email Báo Lương
              </>
            )}
          </button>
        </div>
      </section>

      {/* ── PROGRESS & RESULTS ── */}
      {(isSending || isDone) && (
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isDone ? <CheckCircle className="w-5 h-5 text-emerald-500" /> : <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />}
              <h2 className="font-semibold text-slate-800 text-sm">{isDone ? "Hoàn tất chiến dịch!" : `Đang tiến hành... ${pct}%`}</h2>
            </div>
            <div className="flex items-center gap-4 text-xs font-semibold">
              {!isDone && isSending && (
                <button
                  onClick={() => abortControllerRef.current?.abort()}
                  className="px-2.5 py-1 text-red-600 border border-red-200 hover:bg-red-50 rounded-lg transition"
                >
                  Dừng gửi
                </button>
              )}
              <span className="text-slate-400 font-mono">
                {prog.sent}/{prog.total}
              </span>
            </div>
          </div>
          <div className="p-6 space-y-4">
            {/* Progress bar */}
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div className="bg-indigo-600 h-2 rounded-full transition-all duration-300" style={{ width: `${pct}%` }}></div>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                <p className="text-xl font-bold text-slate-800">{prog.sent}</p>
                <p className="text-[10px] font-semibold text-slate-500">Đã xử lý</p>
              </div>
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                <p className="text-xl font-bold text-emerald-700">{prog.success}</p>
                <p className="text-[10px] font-semibold text-emerald-600">Thành công</p>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                <p className="text-xl font-bold text-red-600">{prog.failed}</p>
                <p className="text-[10px] font-semibold text-red-500">Thất bại</p>
              </div>
            </div>

            <div ref={resultsRef} className="max-h-60 overflow-y-auto rounded-xl border border-slate-200 divide-y divide-slate-100 bg-slate-50/50">
              {prog.results.map((r, i) => (
                <div key={i} className={`flex items-center gap-2 px-3 py-2 text-xs ${r.status === "success" ? "bg-white" : "bg-red-50/50"}`}>
                  {r.status === "success" ? (
                    <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <span className="font-semibold text-slate-800">{r.tenNhanVien}</span>
                    <span className="text-slate-400 ml-2 font-mono">{r.email}</span>
                    {r.status === "error" && <p className="text-red-500 text-[10px] mt-0.5">{r.error}</p>}
                  </div>
                  <span className="text-slate-400 font-mono text-[10px]">{r.sentVia}</span>
                </div>
              ))}
            </div>

            {isDone && prog.failed > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 text-amber-800 text-xs flex gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                <span>Có {prog.failed} email gửi thất bại. Vui lòng rà soát lại thông tin email của nhân viên.</span>
              </div>
            )}
            {isDone && prog.failed === 0 && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2.5 text-emerald-800 text-xs flex gap-2">
                <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
                <span>Hoàn tất! Tất cả {prog.success} email báo lương đã gửi thành công! 🎉</span>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── PREVIEW MODAL ── */}
      {previewRecord && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 flex items-center gap-1.5">
                <Mail className="w-4 h-4 text-indigo-600" /> Xem trước: {previewRecord.tenNhanVien}
              </h3>
              <button onClick={() => setPreviewRecord(null)} className="p-1 rounded-full hover:bg-slate-200">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto bg-slate-100 p-4">
              <div
                className="bg-white border rounded shadow-sm max-w-full overflow-x-auto p-4"
                dangerouslySetInnerHTML={{
                  __html: generateSalaryEmail(previewRecord, { quarterTitle: subject, customMessage }),
                }}
              />
            </div>
            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex justify-end gap-2 text-xs">
              <button
                onClick={() => setPreviewRecord(null)}
                className="px-4 py-2 border border-slate-200 font-semibold rounded-lg hover:bg-slate-50 text-slate-600"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// COMPONENT 2: CUSTOM DYNAMIC EXCEL TAB
// ==========================================
import { generateCustomEmail } from "@/lib/customEmailTemplate";

function CustomSalaryTab({ accounts, batchSize, delayMs }) {
  const fileRef = useRef(null);
  const resultsRef = useRef(null);
  const abortControllerRef = useRef(null);

  const [fileBase64, setFileBase64] = useState("");
  const [fileName, setFileName] = useState("");
  const [headerRowIndex, setHeaderRowIndex] = useState(0);
  const [isSubHeader, setIsSubHeader] = useState(false);
  const [headers, setHeaders] = useState([]);

  const [step, setStep] = useState(1); // 1: Upload, 2: Mapping, 3: Preview/Send
  const [columnMapping, setColumnMapping] = useState({
    nameCol: "",
    emailCol: "",
    displayCols: [],
    totalCol: "",
  });

  const [records, setRecords] = useState([]);
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState("");
  const [isDrag, setIsDrag] = useState(false);

  const [page, setPage] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [subject, setSubject] = useState("Thông báo chi trả thu nhập - CDC Đà Nẵng");
  const [customMessage, setCustomMessage] = useState("");
  const [footerNote, setFooterNote] = useState("");

  const [isSending, setIsSending] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [prog, setProg] = useState({ sent: 0, total: 0, success: 0, failed: 0, results: [] });
  const [previewRecord, setPreviewRecord] = useState(null);

  const processFile = useCallback(async (file) => {
    setParseError("");
    setParsing(true);
    setStep(1);
    setRecords([]);
    setFileName(file.name);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const b64 = e.target.result.split(",")[1];
        setFileBase64(b64);

        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/salary-email/preview-excel", { method: "POST", body: fd });
        const json = await res.json();
        if (json.error) {
          setParseError(json.error);
        } else {
          setHeaders(json.headers);
          setHeaderRowIndex(json.headerRowIndex);
          setIsSubHeader(json.isSubHeader || false);

          const lowerHeaders = json.headers.map((h) => h.toLowerCase());
          const guessName =
            json.headers[lowerHeaders.findIndex((h) => h.includes("họ và tên") || h.includes("tên nhân viên") || h.includes("ho ten"))] ||
            "";
          const guessEmail = json.headers[lowerHeaders.findIndex((h) => h.includes("mail") || h.includes("email"))] || "";
          const guessTotal = json.headers[lowerHeaders.findIndex((h) => h.includes("tổng cộng") || h.includes("thành tiền") || h.includes("cong"))] || "";

          setColumnMapping({
            nameCol: guessName,
            emailCol: guessEmail,
            totalCol: guessTotal,
            displayCols: [],
          });
          setStep(2);
        }
        setParsing(false);
      };
      reader.readAsDataURL(file);
    } catch (e) {
      setParseError("Lỗi đọc file: " + e.message);
      setParsing(false);
    }
  }, []);

  const onDrop = useCallback(
    (e) => {
      e.preventDefault();
      setIsDrag(false);
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  const loadData = async () => {
    if (!columnMapping.nameCol || !columnMapping.emailCol) {
      setParseError("Vui lòng chọn cột Họ tên và cột Email.");
      return;
    }
    setParsing(true);
    setParseError("");
    try {
      const res = await fetch("/api/salary-email/send-custom", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileBase64, headerRowIndex, isSubHeader, columnMapping }),
      });
      const json = await res.json();
      if (json.records) {
        setRecords(
          json.records.map((r) => ({
            ...r,
            id: crypto.randomUUID(),
            selected: true,
            status: "idle",
          }))
        );
        setStep(3);
      } else {
        setParseError("Không thể tải thông tin dòng Excel.");
      }
    } catch (e) {
      setParseError("Lỗi máy chủ: " + e.message);
    } finally {
      setParsing(false);
    }
  };

  const toggleDisplayCol = (header, checked) => {
    setColumnMapping((prev) => {
      let newCols = [...prev.displayCols];
      if (checked) {
        if (!newCols.find((c) => c.key === header)) newCols.push({ key: header, label: header });
      } else {
        newCols = newCols.filter((c) => c.key !== header);
      }
      return { ...prev, displayCols: newCols };
    });
  };

  const startSend = async () => {
    const selected = records.filter((r) => r.selected && r.status !== "success");
    if (!selected.length || !accounts.length || isSending) return;
    setIsSending(true);
    setIsDone(false);
    setProg({ sent: 0, total: selected.length, success: 0, failed: 0, results: [] });

    setRecords((prev) =>
      prev.map((r) =>
        selected.some((s) => s.id === r.id) ? { ...r, status: "idle", error: undefined } : r
      )
    );

    const ac = new AbortController();
    abortControllerRef.current = ac;

    try {
      const emailTitle = subject || "Thông báo lương - CDC Đà Nẵng";
      const res = await fetch("/api/salary-email/send-custom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: ac.signal,
        body: JSON.stringify({
          fileBase64,
          fileName,
          headerRowIndex,
          isSubHeader,
          columnMapping,
          records: selected,
          accounts: accounts.map(({ id, user, appPassword }) => ({ id, user, appPassword })),
          subject: emailTitle,
          emailTitle,
          batchSize,
          batchDelayMs: delayMs,
          customMessage,
          footerNote,
        }),
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || "Lỗi hệ thống khi gửi email.");
      }

      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const ev = JSON.parse(line.slice(6));
          if (ev.type === "progress") {
            const r = ev.result;
            setRecords((prev) =>
              prev.map((rec) =>
                rec.email === r.email && rec.tenNhanVien === r.tenNhanVien
                  ? { ...rec, status: r.status, error: r.error }
                  : rec
              )
            );
            setProg((p) => ({
              sent: ev.index,
              total: ev.total,
              success: p.success + (r.status === "success" ? 1 : 0),
              failed: p.failed + (r.status === "error" ? 1 : 0),
              results: [...p.results, r],
            }));
            setTimeout(() => {
              if (resultsRef.current) {
                resultsRef.current.scrollTop = resultsRef.current.scrollHeight;
              }
            }, 50);
          }
          if (ev.type === "done") setIsDone(true);
        }
      }
    } catch (e) {
      if (e.name === "AbortError") {
        console.log("Đã dừng gửi");
        setRecords((prev) =>
          prev.map((r) =>
            r.status === "idle" && selected.some((s) => s.id === r.id)
              ? { ...r, status: "idle" }
              : r
          )
        );
      } else {
        console.error(e);
        setParseError("Lỗi kết nối: " + e.message);
      }
    } finally {
      setIsSending(false);
      abortControllerRef.current = null;
    }
  };

  const pct = prog.total ? Math.round((prog.sent / prog.total) * 100) : 0;
  const filteredRecords = records.filter((r) => {
    if (searchQuery && !r.tenNhanVien.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (filterStatus === "selected") return r.selected;
    if (filterStatus === "success") return r.status === "success";
    if (filterStatus === "error") return r.status === "error";
    return true;
  });

  const totalPages = Math.ceil(filteredRecords.length / PAGE_SIZE);
  const pageRows = filteredRecords.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const selectedCount = records.filter((r) => r.selected && r.status !== "success").length;
  const canSend = selectedCount > 0 && accounts.length > 0 && !isSending;

  return (
    <div className="space-y-6">
      {/* ── STEP 1: UPLOAD & MAP ── */}
      {step < 3 && (
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
            <span className="w-7 h-7 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center font-mono">1</span>
            <h2 className="font-semibold text-slate-800">Tải & Khớp Cột (Excel Tùy Chọn)</h2>
          </div>
          <div className="p-6">
            {step === 1 ? (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDrag(true);
                }}
                onDragLeave={() => setIsDrag(false)}
                onDrop={onDrop}
                onClick={() => fileRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${
                  isDrag ? "border-indigo-500 bg-indigo-50" : "border-slate-300 hover:border-indigo-400 hover:bg-indigo-50/50"
                }`}
              >
                <input
                  ref={fileRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) processFile(f);
                  }}
                />
                {parsing ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
                    <p className="text-slate-500 text-sm">Đang nạp file Excel...</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center mb-1">
                      <Upload className="w-6 h-6 text-indigo-600" />
                    </div>
                    <p className="font-semibold text-slate-700 text-sm">Thả file hoặc click để đọc Excel cấu trúc bất kỳ</p>
                    <p className="text-slate-400 text-xs">Hỗ trợ: .xlsx, .xls, .csv</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-slate-500">Đã đọc file:</span>
                    <span className="px-2 py-0.5 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded font-semibold">
                      {fileName}
                    </span>
                  </div>
                  <button onClick={() => setStep(1)} className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 font-semibold">
                    <RefreshCw className="w-3.5 h-3.5" /> Đổi file khác
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                  {/* Left: compulsory columns */}
                  <div className="space-y-4">
                    <h3 className="font-bold text-slate-800 border-b border-slate-100 pb-1.5">1. Thiết Lập Khớp Cột Cơ Bản</h3>
                    <div>
                      <label className="block text-slate-600 font-semibold mb-1">Cột Tên nhân viên <span className="text-red-500">*</span></label>
                      <select
                        value={columnMapping.nameCol}
                        onChange={(e) => setColumnMapping((p) => ({ ...p, nameCol: e.target.value }))}
                        className="w-full h-9 rounded-lg border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      >
                        <option value="">-- Chọn cột chứa Họ tên --</option>
                        {headers.map((h) => (
                          <option key={h} value={h}>
                            {h}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-600 font-semibold mb-1">Cột Email nhân viên <span className="text-red-500">*</span></label>
                      <select
                        value={columnMapping.emailCol}
                        onChange={(e) => setColumnMapping((p) => ({ ...p, emailCol: e.target.value }))}
                        className="w-full h-9 rounded-lg border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      >
                        <option value="">-- Chọn cột chứa Email --</option>
                        {headers.map((h) => (
                          <option key={h} value={h}>
                            {h}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-600 font-semibold mb-1">Cột Tổng thu nhập (Tùy chọn, tô đậm vàng ở cuối bảng)</label>
                      <select
                        value={columnMapping.totalCol}
                        onChange={(e) => setColumnMapping((p) => ({ ...p, totalCol: e.target.value }))}
                        className="w-full h-9 rounded-lg border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      >
                        <option value="">-- Không sử dụng --</option>
                        {headers.map((h) => (
                          <option key={h} value={h}>
                            {h}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Right: show columns options list */}
                  <div className="space-y-4">
                    <h3 className="font-bold text-slate-800 border-b border-slate-100 pb-1.5">2. Chọn Các Cột Sẽ Hiển Thị Trực Quan Trong Email</h3>
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 max-h-[220px] overflow-y-auto space-y-2">
                      {(() => {
                        const validHeaders = headers.filter((h) => h !== columnMapping.nameCol && h !== columnMapping.emailCol);
                        if (validHeaders.length === 0) return <p className="text-slate-400 text-center py-4">Vui lòng chọn cột tên và email trước.</p>;

                        const grouped = validHeaders.reduce((acc, h) => {
                          const parts = h.split(" - ");
                          const group = parts.length > 1 ? parts[0] : "Nội dung chung";
                          const sub = parts.length > 1 ? parts.slice(1).join(" - ") : h;
                          if (!acc[group]) acc[group] = [];
                          acc[group].push({ full: h, sub });
                          return acc;
                        }, {});

                        return Object.entries(grouped).map(([group, cols]) => (
                          <div key={group}>
                            <p className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded text-[10px] uppercase mb-1">{group}</p>
                            <div className="space-y-1 pl-1">
                              {cols.map((c) => {
                                const isChecked = !!columnMapping.displayCols.find((x) => x.key === c.full);
                                return (
                                  <label key={c.full} className="flex items-center gap-2 cursor-pointer hover:bg-slate-100 p-1 rounded">
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={(e) => toggleDisplayCol(c.full, e.target.checked)}
                                      className="rounded border-slate-300 text-indigo-600"
                                    />
                                    <span>{c.sub}</span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        ));
                      })()}
                    </div>
                  </div>
                </div>

                {parseError && (
                  <div className="text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                    {parseError}
                  </div>
                )}

                <button
                  onClick={loadData}
                  disabled={parsing || !columnMapping.nameCol || !columnMapping.emailCol}
                  className="w-full h-10 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg flex items-center justify-center gap-1.5 shadow"
                >
                  {parsing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Settings2 className="w-4 h-4" />}
                  Khớp tiêu chí & Nạp danh sách
                </button>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── STEP 3: PREVIEW & SEND ── */}
      {step === 3 && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center font-mono">2</span>
                <h2 className="font-semibold text-slate-800">Danh Sách Nhân Viên Từ Excel</h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setStep(2)}
                  className="px-2.5 py-1 text-xs border border-slate-200 rounded-lg hover:bg-slate-50 font-semibold text-slate-600 flex items-center gap-1"
                >
                  <Settings2 className="w-3 h-3" /> Chỉnh lại cột
                </button>
                <button onClick={() => setStep(1)} className="px-2.5 py-1 text-xs text-slate-500 hover:text-slate-700 font-semibold">
                  Đổi file
                </button>
              </div>
            </div>
            <div className="p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-3 text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="success">
                    <Users className="w-3.5 h-3.5 mr-1" /> {records.length} nhân sự
                  </Badge>
                  <span className="text-slate-400 font-mono">{fileName}</span>
                </div>
                <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
                  {["all", "selected", "error", "success"].map((st) => (
                    <button
                      key={st}
                      onClick={() => {
                        setFilterStatus(st);
                        setPage(0);
                      }}
                      className={`px-3 py-1.5 rounded-md font-semibold transition ${
                        filterStatus === st ? "bg-white text-indigo-800 shadow-sm" : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      {st === "all" ? "Tất cả" : st === "selected" ? `Đã chọn (${records.filter((r) => r.selected).length})` : st === "error" ? "Lỗi" : "Thành công"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="relative mb-3">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Tìm nhân viên..."
                  className="w-full pl-9 h-9 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setPage(0);
                  }}
                />
              </div>

              {/* Records preview table */}
              <div className="rounded-xl border border-slate-200 overflow-hidden shadow-sm bg-white text-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50/70 border-b border-slate-200 text-slate-600 font-semibold">
                        <th className="px-4 py-2.5 w-10 text-center">
                          <input
                            type="checkbox"
                            checked={records.length > 0 && records.every((r) => r.selected)}
                            onChange={(e) => setRecords((prev) => prev.map((r) => ({ ...r, selected: e.target.checked })))}
                            className="rounded border-slate-300 w-4 h-4 text-indigo-600 cursor-pointer"
                          />
                        </th>
                        <th className="px-4 py-2.5">Nhân viên</th>
                        <th className="px-4 py-2.5">Email</th>
                        {columnMapping.totalCol && <th className="px-4 py-2.5 text-right text-indigo-700">{columnMapping.totalCol}</th>}
                        <th className="px-4 py-2.5 text-center">Trạng thái</th>
                        <th className="px-4 py-2.5 text-center">Xem</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {pageRows.map((r, i) => (
                        <tr
                          key={r.id}
                          className={`hover:bg-slate-50/50 transition-colors ${
                            r.status === "error" ? "bg-red-50/30" : r.status === "success" ? "bg-emerald-50/30" : ""
                          }`}
                        >
                          <td className="px-4 py-2 text-center">
                            <input
                              type="checkbox"
                              checked={r.selected}
                              onChange={(e) =>
                                setRecords((prev) => prev.map((rec) => (rec.id === r.id ? { ...rec, selected: e.target.checked } : rec)))
                              }
                              className="rounded border-slate-300 w-4 h-4 text-indigo-600 cursor-pointer"
                            />
                          </td>
                          <td className="px-4 py-2 font-medium text-slate-800">{r.tenNhanVien}</td>
                          <td className="px-4 py-2 text-slate-500 font-mono">{r.email}</td>
                          {columnMapping.totalCol && <td className="px-4 py-2 text-right font-semibold text-indigo-700">{fmt(r.data[columnMapping.totalCol])}</td>}
                          <td className="px-4 py-2 text-center">
                            {r.status === "success" && <CheckCircle className="w-5 h-5 text-emerald-500 inline-block" />}
                            {r.status === "error" && <XCircle className="w-5 h-5 text-red-500 inline-block" title={r.error} />}
                            {r.status === "idle" && <span className="text-slate-300 font-semibold">—</span>}
                          </td>
                          <td className="px-4 py-2 text-center">
                            <button
                              onClick={() => setPreviewRecord(r)}
                              className="p-1 rounded text-indigo-600 hover:bg-indigo-50 transition"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {totalPages > 1 && (
                  <div className="px-4 py-3 flex items-center justify-between border-t border-slate-100 bg-slate-50/50">
                    <span className="text-xs text-slate-500">
                      Trang {page + 1}/{totalPages}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setPage((p) => Math.max(0, p - 1))}
                        disabled={page === 0}
                        className="p-1.5 rounded hover:bg-slate-200"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                        disabled={page === totalPages - 1}
                        className="p-1.5 rounded hover:bg-slate-200"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Gửi Email Tùy biến */}
          <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <h2 className="font-semibold text-slate-800 text-sm">3. Nội dung & Gửi Email Tùy Biến</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Tiêu đề gửi đi (Subject)</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Lời nhắn đầu email (Tùy chọn)</label>
                <textarea
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  rows="3"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  placeholder="Kính gửi ông/bà... Dưới đây là thông tin chi tiết..."
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Ghi chú chân email (Footer note - Tùy chọn)</label>
                <textarea
                  value={footerNote}
                  onChange={(e) => setFooterNote(e.target.value)}
                  rows="3"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  placeholder="Mọi thắc mắc xin phản hồi... Trân trọng."
                />
              </div>

              <button
                onClick={startSend}
                disabled={!canSend}
                className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg flex items-center justify-center gap-1.5 shadow"
              >
                {isSending ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" /> Đang gửi {prog.sent}/{prog.total}...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" /> Gửi {selectedCount} Email Khớp Cột
                  </>
                )}
              </button>
            </div>
          </section>
        </div>
      )}

      {/* ── PROGRESS & RESULTS ── */}
      {(isSending || isDone) && (
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isDone ? <CheckCircle className="w-5 h-5 text-emerald-500" /> : <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />}
              <h2 className="font-semibold text-slate-800 text-sm">{isDone ? "Hoàn tất!" : `Đang tiến hành... ${pct}%`}</h2>
            </div>
            <div className="flex items-center gap-4 text-xs font-semibold">
              {!isDone && isSending && (
                <button
                  onClick={() => abortControllerRef.current?.abort()}
                  className="px-2.5 py-1 text-red-600 border border-red-200 hover:bg-red-50 rounded-lg transition"
                >
                  Dừng
                </button>
              )}
              <span className="text-slate-400 font-mono">
                {prog.sent}/{prog.total}
              </span>
            </div>
          </div>
          <div className="p-6 space-y-4">
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div className="bg-indigo-600 h-2 rounded-full transition-all duration-300" style={{ width: `${pct}%` }}></div>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center text-xs font-semibold">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                <p className="text-xl font-bold text-slate-800">{prog.sent}</p>
                <p className="text-slate-500 mt-0.5">Đã gửi</p>
              </div>
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                <p className="text-xl font-bold text-emerald-700">{prog.success}</p>
                <p className="text-emerald-600 mt-0.5">Thành công</p>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                <p className="text-xl font-bold text-red-600">{prog.failed}</p>
                <p className="text-red-500 mt-0.5">Thất bại</p>
              </div>
            </div>

            <div ref={resultsRef} className="max-h-60 overflow-y-auto rounded-xl border border-slate-200 divide-y divide-slate-100 bg-slate-50/50">
              {prog.results.map((r, i) => (
                <div key={i} className={`flex items-center gap-2 px-3 py-2 text-xs ${r.status === "success" ? "bg-white" : "bg-red-50/50"}`}>
                  {r.status === "success" ? (
                    <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <span className="font-semibold text-slate-800">{r.tenNhanVien}</span>
                    <span className="text-slate-400 ml-2 font-mono">{r.email}</span>
                    {r.status === "error" && <p className="text-red-500 text-[10px] mt-0.5">{r.error}</p>}
                  </div>
                  <span className="text-slate-400 font-mono text-[10px]">{r.sentVia}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── PREVIEW MODAL ── */}
      {previewRecord && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 flex items-center gap-1.5">
                <Mail className="w-4 h-4 text-indigo-600" /> Xem trước: {previewRecord.tenNhanVien}
              </h3>
              <button onClick={() => setPreviewRecord(null)} className="p-1 rounded-full hover:bg-slate-200">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto bg-slate-100 p-4">
              <div
                className="bg-white border rounded shadow-sm max-w-full overflow-x-auto p-4"
                dangerouslySetInnerHTML={{
                  __html: generateCustomEmail(previewRecord, {
                    emailTitle: subject || "Thông báo lương - CDC Đà Nẵng",
                    customMessage,
                    footerNote,
                    columnMapping,
                  }),
                }}
              />
            </div>
            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex justify-end gap-2 text-xs">
              <button
                onClick={() => setPreviewRecord(null)}
                className="px-4 py-2 border border-slate-200 font-semibold rounded-lg hover:bg-slate-50 text-slate-600"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// COMPONENT 3: THUẾ TNCN TAB
// ==========================================
import { generateTaxEmail } from "@/lib/taxEmailTemplate";

function TaxTab({ accounts, batchSize, delayMs }) {
  const fileRef = useRef(null);
  const resultsRef = useRef(null);
  const abortControllerRef = useRef(null);

  const [records, setRecords] = useState([]);
  const [thang, setThang] = useState("");
  const [fileName, setFileName] = useState("");
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState("");
  const [isDrag, setIsDrag] = useState(false);

  const [page, setPage] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  const [subject, setSubject] = useState("");
  const [customMessage, setCustomMessage] = useState("");
  const [showKhoanDetail, setShowKhoanDetail] = useState(true);

  const [isSending, setIsSending] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [prog, setProg] = useState({ sent: 0, total: 0, success: 0, failed: 0, results: [] });
  const [previewRecord, setPreviewRecord] = useState(null);

  const processFile = useCallback(async (file) => {
    setParseError("");
    setParsing(true);
    setRecords([]);
    setFileName(file.name);
    setPage(0);
    setThang("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/salary-email/parse-tax-excel", { method: "POST", body: fd });
      const json = await res.json();
      if (json.error) {
        setParseError(json.error);
        return;
      }
      if (json.records) {
        const withTax = json.records.filter((r) => r.thueTNCN > 0);
        setRecords(withTax.map((r) => ({ ...r, id: crypto.randomUUID(), selected: true, status: "idle" })));
        setThang(json.thang || "");
        if (json.records.length !== withTax.length) {
          const skipped = json.records.length - withTax.length;
          setParseError(`ℹ️ Đã bỏ qua ${skipped} nhân viên không phát sinh thuế TNCN.`);
        }
      }
    } catch (e) {
      setParseError("Không thể kết nối hoặc phân tích file thuế: " + e.message);
    } finally {
      setParsing(false);
    }
  }, []);

  const onDrop = useCallback(
    (e) => {
      e.preventDefault();
      setIsDrag(false);
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  const startSend = async () => {
    const selected = records.filter((r) => r.selected && r.status !== "success");
    if (!selected.length || !accounts.length || isSending) return;
    setIsSending(true);
    setIsDone(false);
    setProg({ sent: 0, total: selected.length, success: 0, failed: 0, results: [] });
    setRecords((prev) =>
      prev.map((r) =>
        selected.some((s) => s.id === r.id) ? { ...r, status: "idle", error: undefined } : r
      )
    );

    const ac = new AbortController();
    abortControllerRef.current = ac;

    try {
      const emailTitle = subject || `Thông báo Thuế TNCN tháng ${thang} - CDC Đà Nẵng`;
      const res = await fetch("/api/salary-email/send-tax", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: ac.signal,
        body: JSON.stringify({
          records: selected,
          accounts: accounts.map(({ id, user, appPassword }) => ({ id, user, appPassword })),
          subject: emailTitle,
          batchSize,
          batchDelayMs: delayMs,
          customMessage,
          showKhoanDetail,
        }),
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || "Lỗi hệ thống khi gửi.");
      }

      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const ev = JSON.parse(line.slice(6));
          if (ev.type === "progress") {
            const r = ev.result;
            setRecords((prev) =>
              prev.map((rec) =>
                rec.email === r.email && rec.tenNhanVien === r.tenNhanVien
                  ? { ...rec, status: r.status, error: r.error }
                  : rec
              )
            );
            setProg((p) => ({
              sent: ev.index,
              total: ev.total,
              success: p.success + (r.status === "success" ? 1 : 0),
              failed: p.failed + (r.status === "error" ? 1 : 0),
              results: [...p.results, r],
            }));
            setTimeout(() => {
              if (resultsRef.current) {
                resultsRef.current.scrollTop = resultsRef.current.scrollHeight;
              }
            }, 50);
          }
          if (ev.type === "done") setIsDone(true);
        }
      }
    } catch (e) {
      if (e.name === "AbortError") {
        console.log("Đã dừng gửi");
        setRecords((prev) =>
          prev.map((r) =>
            r.status === "idle" && selected.some((s) => s.id === r.id)
              ? { ...r, status: "idle" }
              : r
          )
        );
      } else {
        console.error(e);
        setParseError("Lỗi kết nối: " + e.message);
      }
    } finally {
      setIsSending(false);
      abortControllerRef.current = null;
    }
  };

  const pct = prog.total ? Math.round((prog.sent / prog.total) * 100) : 0;
  const filteredRecords = records.filter((r) => {
    if (searchQuery && !r.tenNhanVien.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (filterStatus === "selected") return r.selected;
    if (filterStatus === "success") return r.status === "success";
    if (filterStatus === "error") return r.status === "error";
    return true;
  });

  const totalPages = Math.ceil(filteredRecords.length / PAGE_SIZE);
  const pageRows = filteredRecords.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const selectedCount = records.filter((r) => r.selected && r.status !== "success").length;
  const canSend = selectedCount > 0 && accounts.length > 0 && !isSending;

  return (
    <div className="space-y-6">
      {/* ── STEP 1: UPLOAD ── */}
      <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
          <span className="w-7 h-7 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center font-mono">1</span>
          <h2 className="font-semibold text-slate-800">Tải file Excel Thuế TNCN</h2>
        </div>
        <div className="p-6">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDrag(true);
            }}
            onDragLeave={() => setIsDrag(false)}
            onDrop={onDrop}
            onClick={() => fileRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${
              isDrag ? "border-emerald-500 bg-emerald-50" : "border-slate-300 hover:border-emerald-400 hover:bg-emerald-50/50"
            }`}
          >
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) processFile(f);
              }}
            />
            {parsing ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
                <p className="text-slate-500 text-sm">Đang phân tích file...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mb-1">
                  <Upload className="w-6 h-6 text-emerald-600" />
                </div>
                <p className="font-semibold text-slate-700 text-sm">Kéo thả hoặc nhấn để chọn file Thuế TNCN</p>
                <p className="text-slate-400 text-xs">Hỗ trợ: .xlsx, .xls, .csv</p>
              </div>
            )}
          </div>

          {parseError && (
            <div className={`mt-3 flex items-center gap-2 rounded-lg px-4 py-3 text-xs ${parseError.startsWith("ℹ️") ? "text-indigo-700 bg-indigo-50 border border-indigo-200" : "text-red-600 bg-red-50 border border-red-200"}`}>
              <AlertCircle className="w-4 h-4 shrink-0" /> {parseError}
            </div>
          )}

          {records.length > 0 && (
            <div className="mt-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-3 text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded border border-emerald-200 flex items-center gap-1 font-semibold">
                    <Users className="w-3.5 h-3.5" /> {records.length} Nhân viên phát sinh thuế
                  </span>
                  <span className="text-slate-400 font-mono">{fileName}</span>
                  {thang && <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded border border-indigo-200 font-bold">Tháng {thang}</span>}
                </div>
                <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
                  {["all", "selected", "error", "success"].map((st) => (
                    <button
                      key={st}
                      onClick={() => {
                        setFilterStatus(st);
                        setPage(0);
                      }}
                      className={`px-3 py-1.5 rounded-md font-semibold transition ${
                        filterStatus === st ? "bg-white text-emerald-800 shadow-sm" : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      {st === "all" ? "Tất cả" : st === "selected" ? `Đã chọn (${records.filter((r) => r.selected).length})` : st === "error" ? "Lỗi" : "Đã gửi"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2 mb-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Tìm tên nhân viên..."
                    className="w-full pl-9 h-9 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setPage(0);
                    }}
                  />
                </div>
                <button
                  onClick={() => fileRef.current?.click()}
                  className="px-3 h-9 text-xs border border-slate-200 hover:bg-slate-50 font-semibold rounded-lg text-slate-600 inline-flex items-center gap-1 shrink-0"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Đổi file
                </button>
              </div>

              {/* Table check list */}
              <div className="rounded-xl border border-slate-200 overflow-hidden shadow-sm bg-white text-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50/70 border-b border-slate-200 text-slate-600 font-semibold">
                        <th className="px-4 py-2.5 w-10 text-center">
                          <input
                            type="checkbox"
                            checked={records.length > 0 && records.every((r) => r.selected)}
                            onChange={(e) => setRecords((prev) => prev.map((r) => ({ ...r, selected: e.target.checked })))}
                            className="rounded border-slate-300 w-4 h-4 text-emerald-600 cursor-pointer"
                          />
                        </th>
                        <th className="px-4 py-2.5">Khoa/Phòng</th>
                        <th className="px-4 py-2.5">Tên nhân viên</th>
                        <th className="px-4 py-2.5">Email</th>
                        <th className="px-4 py-2.5 text-right">Tổng thu nhập</th>
                        <th className="px-4 py-2.5 text-right">TNTT</th>
                        <th className="px-4 py-2.5 text-right text-red-600">Thuế phải nộp</th>
                        <th className="px-4 py-2.5 text-center">TT</th>
                        <th className="px-4 py-2.5 text-center">Xem</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {pageRows.map((r, i) => (
                        <tr
                          key={r.id}
                          className={`hover:bg-slate-50/50 transition-colors ${
                            r.status === "error" ? "bg-red-50/30" : r.status === "success" ? "bg-emerald-50/30" : ""
                          }`}
                        >
                          <td className="px-4 py-2 text-center">
                            <input
                              type="checkbox"
                              checked={r.selected}
                              onChange={(e) =>
                                setRecords((prev) => prev.map((rec) => (rec.id === r.id ? { ...rec, selected: e.target.checked } : rec)))
                              }
                              className="rounded border-slate-300 w-4 h-4 text-emerald-600 cursor-pointer"
                            />
                          </td>
                          <td className="px-4 py-2 text-slate-500">{r.phong}</td>
                          <td className="px-4 py-2 font-medium text-slate-800">{r.tenNhanVien}</td>
                          <td className="px-4 py-2 text-slate-500 font-mono">{r.email}</td>
                          <td className="px-4 py-2 text-right font-mono text-slate-600">{fmt(r.cong)}</td>
                          <td className="px-4 py-2 text-right font-mono text-slate-600">{fmt(Math.max(0, r.thuNhapTinhThue))}</td>
                          <td className="px-4 py-2 text-right font-semibold font-mono text-red-600">{fmt(r.thueTNCN)}</td>
                          <td className="px-4 py-2 text-center">
                            {r.status === "success" && <CheckCircle className="w-5 h-5 text-emerald-500 inline-block" />}
                            {r.status === "error" && <XCircle className="w-5 h-5 text-red-500 inline-block" title={r.error} />}
                            {r.status === "idle" && <span className="text-slate-300 font-semibold">—</span>}
                          </td>
                          <td className="px-4 py-2 text-center">
                            <button
                              onClick={() => setPreviewRecord(r)}
                              className="p-1 rounded text-emerald-600 hover:bg-emerald-50 transition"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {totalPages > 1 && (
                  <div className="px-4 py-3 flex items-center justify-between border-t border-slate-100 bg-slate-50/50">
                    <span className="text-xs text-slate-500">
                      Trang {page + 1}/{totalPages}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setPage((p) => Math.max(0, p - 1))}
                        disabled={page === 0}
                        className="p-1.5 rounded hover:bg-slate-200"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                        disabled={page === totalPages - 1}
                        className="p-1.5 rounded hover:bg-slate-200"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── STEP 2: SEND CONFIG ── */}
      <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
          <span className="w-7 h-7 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center font-mono">2</span>
          <h2 className="font-semibold text-slate-800">Cấu hình &amp; Tiến hành gửi thuế</h2>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Tiêu đề email</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder={`Thông báo Thuế Thu Nhập Cá Nhân tháng ${thang || "__"} - CDC Đà Nẵng`}
              className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Nội dung đính kèm thêm (Tùy chọn)</label>
            <textarea
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              rows="3"
              placeholder="Nhập nội dung lưu ý thêm..."
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
            <input
              type="checkbox"
              id="showKhoanDetail"
              checked={showKhoanDetail}
              onChange={(e) => setShowKhoanDetail(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-emerald-600 cursor-pointer"
            />
            <label htmlFor="showKhoanDetail" className="text-sm text-slate-700 cursor-pointer select-none">
              <span className="font-semibold text-xs">Hiển thị chi tiết từng khoản thu nhập trong email</span>
            </label>
          </div>

          <button
            onClick={startSend}
            disabled={!canSend}
            className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg flex items-center justify-center gap-1.5 shadow transition text-sm"
          >
            {isSending ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" /> Đang gửi {prog.sent}/{prog.total}...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" /> Gửi {selectedCount} Email Thuế TNCN
              </>
            )}
          </button>
        </div>
      </section>

      {/* ── PROGRESS & RESULTS ── */}
      {(isSending || isDone) && (
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isDone ? <CheckCircle className="w-5 h-5 text-emerald-500" /> : <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />}
              <h2 className="font-semibold text-slate-800 text-sm">{isDone ? "Hoàn tất gửi thuế!" : `Đang tiến hành... ${pct}%`}</h2>
            </div>
            <div className="flex items-center gap-4 text-xs font-semibold">
              {!isDone && isSending && (
                <button
                  onClick={() => abortControllerRef.current?.abort()}
                  className="px-2.5 py-1 text-red-600 border border-red-200 hover:bg-red-50 rounded-lg transition"
                >
                  Dừng
                </button>
              )}
              <span className="text-slate-400 font-mono">
                {prog.sent}/{prog.total}
              </span>
            </div>
          </div>
          <div className="p-6 space-y-4">
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div className="bg-emerald-600 h-2 rounded-full transition-all duration-300" style={{ width: `${pct}%` }}></div>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center text-xs font-semibold">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                <p className="text-xl font-bold text-slate-800">{prog.sent}</p>
                <p className="text-slate-500 mt-0.5">Đã gửi</p>
              </div>
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                <p className="text-xl font-bold text-emerald-700">{prog.success}</p>
                <p className="text-emerald-600 mt-0.5">Thành công</p>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                <p className="text-xl font-bold text-red-600">{prog.failed}</p>
                <p className="text-red-500 mt-0.5">Thất bại</p>
              </div>
            </div>

            <div ref={resultsRef} className="max-h-60 overflow-y-auto rounded-xl border border-slate-200 divide-y divide-slate-100 bg-slate-50/50">
              {prog.results.map((r, i) => (
                <div key={i} className={`flex items-center gap-2 px-3 py-2 text-xs ${r.status === "success" ? "bg-white" : "bg-red-50/50"}`}>
                  {r.status === "success" ? (
                    <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <span className="font-semibold text-slate-800">{r.tenNhanVien}</span>
                    <span className="text-slate-400 ml-2 font-mono">{r.email}</span>
                    {r.status === "error" && <p className="text-red-500 text-[10px] mt-0.5">{r.error}</p>}
                  </div>
                  <span className="text-slate-400 font-mono text-[10px]">{r.sentVia}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── PREVIEW MODAL ── */}
      {previewRecord && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 flex items-center gap-1.5">
                <Mail className="w-4 h-4 text-emerald-600" /> Xem trước: {previewRecord.tenNhanVien}
              </h3>
              <button onClick={() => setPreviewRecord(null)} className="p-1 rounded-full hover:bg-slate-200">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto bg-slate-100 p-4">
              <div
                className="bg-white border rounded shadow-sm max-w-full overflow-x-auto p-4"
                dangerouslySetInnerHTML={{
                  __html: generateTaxEmail(previewRecord, {
                    emailTitle: subject || `Thông báo Thuế Thu Nhập Cá Nhân tháng ${thang}`,
                    customMessage,
                    showKhoanDetail,
                  }),
                }}
              />
            </div>
            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex justify-end gap-2 text-xs">
              <button
                onClick={() => setPreviewRecord(null)}
                className="px-4 py-2 border border-slate-200 font-semibold rounded-lg hover:bg-slate-50 text-slate-600"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
