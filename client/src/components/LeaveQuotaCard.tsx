import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldCheck } from "lucide-react";

const leaveTypeMap: Record<string, { label: string; color: string; bg: string; track: string }> = {
  annual:      { label: "年假",  color: "text-blue-600",   bg: "bg-blue-500",   track: "bg-blue-100" },
  sick:        { label: "病假",  color: "text-rose-600",   bg: "bg-rose-500",   track: "bg-rose-100" },
  personal:    { label: "事假",  color: "text-amber-600",  bg: "bg-amber-500",  track: "bg-amber-100" },
  maternity:   { label: "产假",  color: "text-pink-600",   bg: "bg-pink-500",   track: "bg-pink-100" },
  paternity:   { label: "陪产假", color: "text-indigo-600", bg: "bg-indigo-500", track: "bg-indigo-100" },
  bereavement: { label: "丧假",  color: "text-gray-600",   bg: "bg-gray-500",   track: "bg-gray-100" },
  other:       { label: "其他",  color: "text-teal-600",   bg: "bg-teal-500",   track: "bg-teal-100" },
};

type Props = {
  employeeId: number;
  year?: number;
};

export default function LeaveQuotaCard({ employeeId, year }: Props) {
  const currentYear = year ?? new Date().getFullYear();
  const { data: quotas, isLoading } = trpc.leaves.quotas.useQuery({ employeeId, year: currentYear });

  if (isLoading) {
    return (
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-3">
          <div className="h-5 w-32 bg-muted animate-pulse rounded" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="space-y-2">
              <div className="h-4 w-24 bg-muted animate-pulse rounded" />
              <div className="h-2.5 bg-muted animate-pulse rounded-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!quotas || quotas.length === 0) {
    return (
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            {currentYear} 年假期配额
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">暂无配额数据</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            {currentYear} 年假期配额
          </CardTitle>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            已批准记录统计
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {quotas.map(quota => {
          const style = leaveTypeMap[quota.leaveType] ?? leaveTypeMap.other;
          const usedPct = quota.totalDays > 0 ? Math.min(100, (quota.usedDays / quota.totalDays) * 100) : 0;
          const isOverused = quota.usedDays > quota.totalDays;

          return (
            <div key={quota.leaveType} className="space-y-2">
              {/* Header row */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-semibold ${style.color}`}>{style.label}</span>
                  {isOverused && (
                    <span className="text-xs text-red-500 font-medium">超额</span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-muted-foreground">
                    已用 <span className={`font-bold ${isOverused ? "text-red-500" : "text-foreground"}`}>{quota.usedDays}</span> 天
                  </span>
                  <span className="text-muted-foreground/50">/</span>
                  <span className="text-muted-foreground">
                    总额 <span className="font-bold text-foreground">{quota.totalDays}</span> 天
                  </span>
                  <span className={`font-bold ${quota.remainingDays <= 0 ? "text-red-500" : quota.remainingDays <= 3 ? "text-amber-500" : style.color}`}>
                    剩余 {quota.remainingDays} 天
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div className={`h-2.5 rounded-full overflow-hidden ${style.track}`}>
                <div
                  className={`h-full rounded-full transition-all duration-500 ${isOverused ? "bg-red-500" : style.bg}`}
                  style={{ width: `${usedPct}%` }}
                />
              </div>

              {/* Percentage label */}
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>已使用 {usedPct.toFixed(0)}%</span>
                {quota.remainingDays > 0 && (
                  <span>剩余 {((quota.remainingDays / quota.totalDays) * 100).toFixed(0)}%</span>
                )}
              </div>
            </div>
          );
        })}

        {/* Summary row */}
        <div className="pt-2 border-t border-border/50">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>合计已用</span>
            <span className="font-semibold text-foreground">
              {quotas.reduce((sum, q) => sum + q.usedDays, 0)} 天
            </span>
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
            <span>合计剩余</span>
            <span className="font-semibold text-foreground">
              {quotas.reduce((sum, q) => sum + q.remainingDays, 0)} 天
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
