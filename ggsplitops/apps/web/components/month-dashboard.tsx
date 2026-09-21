"use client";

import { useMemo, useState } from "react";
import type { ExportExpense, ExportMember } from "../lib/excel-export";
import { useActiveUser } from "../lib/user-context";

interface MonthDashboardProps {
  expenses: ExportExpense[];
  members: ExportMember[];
  onSelectMonthFilter?: () => void;
  onSelectDateFilter?: (dateStr: string) => void;
  personalOnly?: boolean;
  onTogglePersonalOnly?: (val: boolean) => void;
}

export function MonthDashboard({
  expenses,
  members,
  onSelectMonthFilter,
  onSelectDateFilter,
  personalOnly = false,
  onTogglePersonalOnly,
}: MonthDashboardProps) {
  const { currentUser } = useActiveUser();
  const today = new Date();

  // Selected year and month (0-indexed)
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth());

  // View Mode: Cards vs Calendar
  const [viewMode, setViewMode] = useState<"cards" | "calendar">("cards");
  const [showBanner, setShowBanner] = useState(true);

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const isCurrentMonth =
    selectedYear === today.getFullYear() && selectedMonth === today.getMonth();

  const handlePrevMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear((y) => y - 1);
    } else {
      setSelectedMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear((y) => y + 1);
    } else {
      setSelectedMonth((m) => m + 1);
    }
  };

  const handleResetToCurrent = () => {
    setSelectedYear(today.getFullYear());
    setSelectedMonth(today.getMonth());
  };

  const activeMemberId = currentUser?.id || members[0]?.id;

  // Filter expenses strictly to selected month & year
  const rawMonthExpenses = useMemo(() => {
    return expenses.filter((e) => {
      if (!e.spentAt) return false;
      const d = new Date(e.spentAt);
      return d.getFullYear() === selectedYear && d.getMonth() === selectedMonth;
    });
  }, [expenses, selectedYear, selectedMonth]);

  // If personalOnly is enabled, filter to only expenses involving the active member
  const monthExpenses = useMemo(() => {
    if (!personalOnly || !activeMemberId) return rawMonthExpenses;
    return rawMonthExpenses.filter((e) => {
      const isPayer = e.payerId === activeMemberId || e.payers?.some((p) => p.memberId === activeMemberId);
      const isPart = e.participants.some((p) => p.memberId === activeMemberId);
      return isPayer || isPart;
    });
  }, [rawMonthExpenses, personalOnly, activeMemberId]);

  // Aggregated Month Statistics
  const stats = useMemo(() => {
    let totalGroupSpent = 0;
    const memberPaidMap = new Map<string, number>();
    const memberShareMap = new Map<string, number>();

    members.forEach((m) => {
      memberPaidMap.set(m.id, 0);
      memberShareMap.set(m.id, 0);
    });

    rawMonthExpenses.forEach((exp) => {
      const expAmt = parseFloat(exp.amount) || 0;
      totalGroupSpent += expAmt;

      // 1. Paid by
      if (exp.payers && exp.payers.length > 0) {
        exp.payers.forEach((p) => {
          const pAmt = parseFloat(p.amount) || 0;
          memberPaidMap.set(p.memberId, (memberPaidMap.get(p.memberId) || 0) + pAmt);
        });
      } else {
        memberPaidMap.set(exp.payerId, (memberPaidMap.get(exp.payerId) || 0) + expAmt);
      }

      // 2. Shares
      exp.participants.forEach((part) => {
        const share =
          parseFloat(part.amount || "0") ||
          (exp.participants.length > 0 ? expAmt / exp.participants.length : 0);
        memberShareMap.set(part.memberId, (memberShareMap.get(part.memberId) || 0) + share);
      });
    });

    const userPaid = memberPaidMap.get(activeMemberId) || 0;
    const userShare = memberShareMap.get(activeMemberId) || 0;
    const userNet = userPaid - userShare;

    let topSpender = { name: "None", amount: 0 };
    members.forEach((m) => {
      const paid = memberPaidMap.get(m.id) || 0;
      if (paid > topSpender.amount) {
        topSpender = { name: m.displayName, amount: paid };
      }
    });

    const contributions = members
      .map((m) => ({
        id: m.id,
        name: m.displayName,
        paid: memberPaidMap.get(m.id) || 0,
        share: memberShareMap.get(m.id) || 0,
        percentage: totalGroupSpent > 0 ? ((memberPaidMap.get(m.id) || 0) / totalGroupSpent) * 100 : 0,
      }))
      .filter((c) => c.paid > 0 || c.share > 0);

    return {
      totalGroupSpent,
      expenseCount: monthExpenses.length,
      rawCount: rawMonthExpenses.length,
      userPaid,
      userShare,
      userNet,
      topSpender,
      contributions,
    };
  }, [rawMonthExpenses, monthExpenses, members, activeMemberId]);

  // Calendar Day Generation
  const calendarDays = useMemo(() => {
    const firstDay = new Date(selectedYear, selectedMonth, 1).getDay(); // 0 = Sun
    const totalDaysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();

    // Mapping date string -> total amount for that day
    const dayExpenseMap: Record<number, { count: number; total: number }> = {};
    rawMonthExpenses.forEach((exp) => {
      if (!exp.spentAt) return;
      const d = new Date(exp.spentAt);
      const dayNum = d.getDate();
      if (!dayExpenseMap[dayNum]) {
        dayExpenseMap[dayNum] = { count: 0, total: 0 };
      }
      dayExpenseMap[dayNum].count += 1;
      dayExpenseMap[dayNum].total += parseFloat(exp.amount) || 0;
    });

    const days = [];
    // Empty prefix slots
    for (let i = 0; i < firstDay; i++) {
      days.push({ day: null, count: 0, total: 0 });
    }
    // Days in current month
    for (let d = 1; d <= totalDaysInMonth; d++) {
      const data = dayExpenseMap[d] || { count: 0, total: 0 };
      days.push({ day: d, count: data.count, total: data.total });
    }
    return days;
  }, [selectedYear, selectedMonth, rawMonthExpenses]);

  return (
    <section className="rounded-[--radius-lg] border border-[--color-line-bright] bg-[--color-surface] overflow-hidden shadow-sm">
      {/* Optional Rich Dashboard Visual Banner */}
      {showBanner && (
        <div className="relative h-28 sm:h-36 w-full overflow-hidden bg-[#0a0f0d] border-b border-[--color-line]">
          <img
            src="/dashboard_banner.jpg"
            alt="Financial Dashboard"
            className="w-full h-full object-cover opacity-60 mix-blend-luminosity hover:opacity-80 transition-opacity"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[--color-surface] via-transparent to-transparent" />
          <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded bg-[--color-brass]/20 text-[--color-brass] border border-[--color-brass]/30">
                  {personalOnly ? `${currentUser?.name}'s Personal View` : "Group Overview"}
                </span>
                <span className="text-[10px] text-[--color-muted]">
                  {monthNames[selectedMonth]} {selectedYear}
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-semibold text-[--color-text] tracking-tight mt-0.5">
                {personalOnly
                  ? `${currentUser?.name} · Active Ledger`
                  : "Shared Expenses Dashboard"}
              </h3>
            </div>

            <button
              onClick={() => setShowBanner(false)}
              title="Collapse banner"
              className="text-xs text-[--color-muted] hover:text-[--color-text] px-1.5 py-0.5 rounded bg-black/40 backdrop-blur-sm"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <div className="p-4 sm:p-5">
        {/* Month Navigator Header & View Toggles */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[--color-line]">
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-[--color-surface-raised] rounded-[--radius] border border-[--color-line] p-0.5">
              <button
                onClick={handlePrevMonth}
                type="button"
                title="Previous month"
                className="px-2 py-1 text-xs text-[--color-muted] hover:text-[--color-text] transition-colors rounded"
              >
                ←
              </button>
              <span className="px-3 py-1 text-xs font-semibold text-[--color-text] tracking-wide">
                {monthNames[selectedMonth]} {selectedYear}
              </span>
              <button
                onClick={handleNextMonth}
                type="button"
                title="Next month"
                className="px-2 py-1 text-xs text-[--color-muted] hover:text-[--color-text] transition-colors rounded"
              >
                →
              </button>
            </div>

            {!isCurrentMonth && (
              <button
                onClick={handleResetToCurrent}
                type="button"
                className="text-[11px] px-2 py-1 rounded bg-[--color-brass-dim]/40 text-[--color-brass] hover:bg-[--color-brass-dim] transition-colors"
              >
                Today
              </button>
            )}

            {!showBanner && (
              <button
                onClick={() => setShowBanner(true)}
                className="text-[11px] text-[--color-faint] hover:text-[--color-muted]"
              >
                🖼 Show Banner
              </button>
            )}
          </div>

          {/* Mode Controls: Personal Filter & Cards vs Calendar */}
          <div className="flex items-center gap-2">
            {onTogglePersonalOnly && (
              <button
                onClick={() => onTogglePersonalOnly(!personalOnly)}
                type="button"
                title="Filter website to show only your personal activity when switching account"
                className={`text-xs px-2.5 py-1 rounded-[--radius] border transition-colors ${
                  personalOnly
                    ? "border-[--color-brass] bg-[--color-brass] text-[#0b0e0d] font-semibold"
                    : "border-[--color-line] bg-[--color-surface-raised] text-[--color-muted] hover:text-[--color-text]"
                }`}
              >
                👤 {personalOnly ? "My View" : "All Members"}
              </button>
            )}

            <div className="flex items-center rounded-[--radius] border border-[--color-line] bg-[--color-surface-raised] p-0.5 text-xs">
              <button
                onClick={() => setViewMode("cards")}
                type="button"
                className={`px-2 py-1 rounded transition-colors ${
                  viewMode === "cards"
                    ? "bg-[--color-surface] text-[--color-brass] font-medium shadow-sm"
                    : "text-[--color-muted] hover:text-[--color-text]"
                }`}
              >
                Cards
              </button>
              <button
                onClick={() => setViewMode("calendar")}
                type="button"
                className={`px-2 py-1 rounded transition-colors ${
                  viewMode === "calendar"
                    ? "bg-[--color-surface] text-[--color-brass] font-medium shadow-sm"
                    : "text-[--color-muted] hover:text-[--color-text]"
                }`}
              >
                📅 Calendar
              </button>
            </div>
          </div>
        </div>

        {/* View Mode 1: KPI Cards View */}
        {viewMode === "cards" ? (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 mt-4">
              {/* Card 1: Total Spent */}
              <div className="rounded-[--radius] bg-[--color-surface-raised] border border-[--color-line] p-3">
                <p className="eyebrow text-[10px] text-[--color-muted]">Total Spent</p>
                <p className="text-base sm:text-lg font-semibold text-[--color-text] mt-1 tabular">
                  ₹{stats.totalGroupSpent.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-[11px] text-[--color-faint] mt-0.5">{stats.rawCount} bills total</p>
              </div>

              {/* Card 2: Your Share */}
              <div className="rounded-[--radius] bg-[--color-surface-raised] border border-[--color-line] p-3">
                <p className="eyebrow text-[10px] text-[--color-muted]">
                  {currentUser?.name || "Your"} Share
                </p>
                <p className="text-base sm:text-lg font-semibold text-[--color-text] mt-1 tabular">
                  ₹{stats.userShare.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-[11px] text-[--color-faint] mt-0.5">Consumed</p>
              </div>

              {/* Card 3: You Paid */}
              <div className="rounded-[--radius] bg-[--color-surface-raised] border border-[--color-line] p-3">
                <p className="eyebrow text-[10px] text-[--color-muted]">
                  {currentUser?.name || "You"} Paid
                </p>
                <p className="text-base sm:text-lg font-semibold text-[--color-text] mt-1 tabular">
                  ₹{stats.userPaid.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-[11px] text-[--color-faint] mt-0.5">Paid upfront</p>
              </div>

              {/* Card 4: Net Position */}
              <div className="rounded-[--radius] bg-[--color-surface-raised] border border-[--color-line] p-3">
                <p className="eyebrow text-[10px] text-[--color-muted]">Month Balance</p>
                <p
                  className={`text-base sm:text-lg font-semibold mt-1 tabular ${
                    stats.userNet > 0.005
                      ? "text-[--color-credit]"
                      : stats.userNet < -0.005
                      ? "text-[--color-debit]"
                      : "text-[--color-muted]"
                  }`}
                >
                  {stats.userNet > 0.005 ? "+" : ""}
                  ₹{stats.userNet.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-[11px] text-[--color-faint] mt-0.5">
                  {stats.userNet > 0.005
                    ? "You get back"
                    : stats.userNet < -0.005
                    ? "You owe group"
                    : "Settled up"}
                </p>
              </div>
            </div>

            {/* Highlights: Top Spender & Distribution Bar */}
            {stats.totalGroupSpent > 0 && (
              <div className="mt-4 pt-3 border-t border-[--color-line] space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[--color-muted]">
                    Top Spender: <strong className="text-[--color-text] font-medium">{stats.topSpender.name}</strong> (₹{stats.topSpender.amount.toFixed(2)})
                  </span>
                  {onSelectMonthFilter && (
                    <button
                      onClick={onSelectMonthFilter}
                      type="button"
                      className="text-xs font-medium text-[--color-brass] hover:underline"
                    >
                      Filter History ↓
                    </button>
                  )}
                </div>

                <div className="w-full h-2 rounded-full bg-[--color-line] overflow-hidden flex">
                  {stats.contributions.map((c, i) => {
                    const colors = [
                      "bg-[--color-brass]",
                      "bg-[#4ade80]",
                      "bg-[#60a5fa]",
                      "bg-[#f472b6]",
                      "bg-[#fb923c]",
                      "bg-[#a78bfa]",
                    ];
                    return (
                      <div
                        key={c.id}
                        style={{ width: `${c.percentage}%` }}
                        className={`${colors[i % colors.length]} h-full transition-all duration-300`}
                        title={`${c.name}: paid ₹${c.paid.toFixed(2)} (${c.percentage.toFixed(1)}%)`}
                      />
                    );
                  })}
                </div>
              </div>
            )}
          </>
        ) : (
          /* View Mode 2: Interactive Month Calendar View */
          <div className="mt-4">
            <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-mono text-[--color-muted] pb-1 border-b border-[--color-line]">
              <span>Sun</span>
              <span>Mon</span>
              <span>Tue</span>
              <span>Wed</span>
              <span>Thu</span>
              <span>Fri</span>
              <span>Sat</span>
            </div>

            <div className="grid grid-cols-7 gap-1 mt-1">
              {calendarDays.map((slot, idx) => {
                if (slot.day === null) {
                  return <div key={`empty-${idx}`} className="h-14 rounded bg-[--color-canvas]/40" />;
                }

                const isToday =
                  isCurrentMonth && slot.day === today.getDate();
                const hasExpense = slot.count > 0;
                const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}-${String(slot.day).padStart(2, "0")}`;

                return (
                  <button
                    key={`day-${slot.day}`}
                    onClick={() => {
                      if (onSelectDateFilter && hasExpense) {
                        onSelectDateFilter(dateStr);
                      }
                    }}
                    type="button"
                    disabled={!hasExpense}
                    className={`h-14 rounded p-1 text-left flex flex-col justify-between border transition-all ${
                      isToday
                        ? "border-[--color-brass] bg-[--color-brass-dim]/20 font-bold"
                        : hasExpense
                        ? "border-[--color-line-bright] bg-[--color-surface-raised] hover:border-[--color-brass] cursor-pointer"
                        : "border-[--color-line]/40 bg-[--color-canvas]/60 opacity-60 cursor-default"
                    }`}
                  >
                    <span className={`text-[10px] ${isToday ? "text-[--color-brass]" : "text-[--color-text]"}`}>
                      {slot.day}
                    </span>

                    {hasExpense && (
                      <div className="text-[9px] font-mono leading-tight">
                        <span className="block text-[--color-credit] font-semibold truncate">
                          ₹{slot.total.toFixed(0)}
                        </span>
                        <span className="text-[8px] text-[--color-muted]">
                          {slot.count} bill{slot.count > 1 ? "s" : ""}
                        </span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
            <p className="text-[10px] text-[--color-faint] text-center mt-2">
              💡 Click on any day with expenses to filter the expense history.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
