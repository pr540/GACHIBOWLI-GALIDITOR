"use client";

import { useMemo, useState } from "react";
import type { ExportExpense, ExportMember } from "../lib/excel-export";
import { useActiveUser } from "../lib/user-context";

interface MonthDashboardProps {
  expenses: ExportExpense[];
  members: ExportMember[];
  onSelectMonthFilter?: () => void;
}

export function MonthDashboard({
  expenses,
  members,
  onSelectMonthFilter,
}: MonthDashboardProps) {
  const { currentUser } = useActiveUser();
  const today = new Date();

  // Selected year and month (0-indexed)
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth());

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

  // Filter expenses strictly to selected month & year
  const monthExpenses = useMemo(() => {
    return expenses.filter((e) => {
      if (!e.spentAt) return false;
      const d = new Date(e.spentAt);
      return d.getFullYear() === selectedYear && d.getMonth() === selectedMonth;
    });
  }, [expenses, selectedYear, selectedMonth]);

  // Aggregated Month Statistics
  const stats = useMemo(() => {
    let totalGroupSpent = 0;
    const memberPaidMap = new Map<string, number>();
    const memberShareMap = new Map<string, number>();

    members.forEach((m) => {
      memberPaidMap.set(m.id, 0);
      memberShareMap.set(m.id, 0);
    });

    monthExpenses.forEach((exp) => {
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

    // Active user stats
    const activeId = currentUser?.id || members[0]?.id;
    const userPaid = memberPaidMap.get(activeId) || 0;
    const userShare = memberShareMap.get(activeId) || 0;
    const userNet = userPaid - userShare;

    // Find top spender
    let topSpender = { name: "None", amount: 0 };
    members.forEach((m) => {
      const paid = memberPaidMap.get(m.id) || 0;
      if (paid > topSpender.amount) {
        topSpender = { name: m.displayName, amount: paid };
      }
    });

    // Member contribution distribution for progress bar
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
      userPaid,
      userShare,
      userNet,
      topSpender,
      contributions,
    };
  }, [monthExpenses, members, currentUser]);

  return (
    <section className="rounded-[--radius-lg] border border-[--color-line-bright] bg-[--color-surface] p-4 sm:p-5 shadow-sm">
      {/* Month Navigator Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[--color-line]">
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
              Back to This Month
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-[--color-muted]">
            {stats.expenseCount} {stats.expenseCount === 1 ? "expense" : "expenses"} recorded
          </span>
          {onSelectMonthFilter && (
            <button
              onClick={onSelectMonthFilter}
              type="button"
              className="text-xs font-medium text-[--color-brass] hover:underline"
            >
              View in list ↓
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 mt-4">
        {/* Card 1: Total Spent */}
        <div className="rounded-[--radius] bg-[--color-surface-raised] border border-[--color-line] p-3">
          <p className="eyebrow text-[10px] text-[--color-muted]">Total Spent</p>
          <p className="text-base sm:text-lg font-semibold text-[--color-text] mt-1 tabular">
            ₹{stats.totalGroupSpent.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-[--color-faint] mt-0.5">Group overall</p>
        </div>

        {/* Card 2: Your Share */}
        <div className="rounded-[--radius] bg-[--color-surface-raised] border border-[--color-line] p-3">
          <p className="eyebrow text-[10px] text-[--color-muted]">Your Share</p>
          <p className="text-base sm:text-lg font-semibold text-[--color-text] mt-1 tabular">
            ₹{stats.userShare.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-[--color-faint] mt-0.5">Your consumption</p>
        </div>

        {/* Card 3: You Paid */}
        <div className="rounded-[--radius] bg-[--color-surface-raised] border border-[--color-line] p-3">
          <p className="eyebrow text-[10px] text-[--color-muted]">You Paid</p>
          <p className="text-base sm:text-lg font-semibold text-[--color-text] mt-1 tabular">
            ₹{stats.userPaid.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-[--color-faint] mt-0.5">Paid upfront</p>
        </div>

        {/* Card 4: Net Position */}
        <div className="rounded-[--radius] bg-[--color-surface-raised] border border-[--color-line] p-3">
          <p className="eyebrow text-[10px] text-[--color-muted]">Your Month Balance</p>
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
              : "All settled"}
          </p>
        </div>
      </div>

      {/* Highlights: Top Spender & Breakdown */}
      {stats.totalGroupSpent > 0 && (
        <div className="mt-4 pt-3 border-t border-[--color-line] space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[--color-muted]">
              Top Spender:{" "}
              <strong className="text-[--color-text] font-medium">{stats.topSpender.name}</strong>{" "}
              (₹{stats.topSpender.amount.toFixed(2)})
            </span>
            <span className="text-[11px] text-[--color-faint]">
              {members.length} members involved
            </span>
          </div>

          {/* Proportional Spending Distribution Bar */}
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

          {/* Quick Member Spending Chips */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {stats.contributions.slice(0, 6).map((c) => (
              <span
                key={c.id}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] bg-[--color-surface-raised] text-[--color-muted] border border-[--color-line]"
              >
                <span>{c.name}:</span>
                <strong className="text-[--color-text] font-mono">₹{c.paid.toFixed(0)}</strong>
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
