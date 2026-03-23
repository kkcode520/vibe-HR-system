import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { Search, CalendarDays, Users } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";

const leaveTypeMap: Record<string, string> = {
  annual: "年假",
  sick: "病假",
  personal: "事假",
  maternity: "产假",
  paternity: "陪产假",
  bereavement: "丧假",
  other: "其他",
};

const statusMap: Record<string, { label: string; color: string }> = {
  pending: { label: "待审批", color: "bg-amber-100 text-amber-700 border-amber-200" },
  approved: { label: "已批准", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  rejected: { label: "已拒绝", color: "bg-red-100 text-red-700 border-red-200" },
  cancelled: { label: "已取消", color: "bg-gray-100 text-gray-600 border-gray-200" },
};

export default function Leaves() {
  const [status, setStatus] = useState("all");
  const [leaveType, setLeaveType] = useState("all");
  const [, setLocation] = useLocation();

  const { data: employees } = trpc.employees.list.useQuery({});
  const { data: leaves, isLoading } = trpc.leaves.list.useQuery({
    status: status === "all" ? undefined : status,
    leaveType: leaveType === "all" ? undefined : leaveType,
  });

  const employeeMap = new Map(employees?.map(e => [e.id, e]) ?? []);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">请假记录</h1>
          <p className="text-sm text-muted-foreground mt-1">
            共 <span className="font-medium text-foreground">{leaves?.length ?? 0}</span> 条记录
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-full sm:w-36 bg-background">
              <SelectValue placeholder="审批状态" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部状态</SelectItem>
              <SelectItem value="pending">待审批</SelectItem>
              <SelectItem value="approved">已批准</SelectItem>
              <SelectItem value="rejected">已拒绝</SelectItem>
              <SelectItem value="cancelled">已取消</SelectItem>
            </SelectContent>
          </Select>
          <Select value={leaveType} onValueChange={setLeaveType}>
            <SelectTrigger className="w-full sm:w-36 bg-background">
              <SelectValue placeholder="请假类型" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部类型</SelectItem>
              {Object.entries(leaveTypeMap).map(([key, label]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Status Summary */}
        <div className="flex flex-wrap gap-2">
          {[
            { key: "all", label: "全部", count: leaves?.length ?? 0 },
            { key: "pending", label: "待审批", count: leaves?.filter(l => l.status === "pending").length ?? 0 },
            { key: "approved", label: "已批准", count: leaves?.filter(l => l.status === "approved").length ?? 0 },
            { key: "rejected", label: "已拒绝", count: leaves?.filter(l => l.status === "rejected").length ?? 0 },
          ].map(item => (
            <button
              key={item.key}
              onClick={() => setStatus(item.key)}
              className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-all ${
                status === item.key
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-muted-foreground border-border hover:border-primary/50 hover:text-foreground"
              }`}
            >
              {item.label} ({item.count})
            </button>
          ))}
        </div>

        {/* Table */}
        <Card className="border-border/60 shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="space-y-3 p-6">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
              ))}
            </div>
          ) : !leaves || leaves.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <CalendarDays className="h-12 w-12 mb-4 opacity-20" />
              <p className="text-base font-medium">暂无请假记录</p>
              <p className="text-sm mt-1">请调整筛选条件</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/60 bg-muted/30">
                    <th className="text-left text-xs font-semibold text-muted-foreground px-6 py-3.5 whitespace-nowrap">员工</th>
                    <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3.5 whitespace-nowrap">请假类型</th>
                    <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3.5 whitespace-nowrap">开始日期</th>
                    <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3.5 whitespace-nowrap">结束日期</th>
                    <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3.5 whitespace-nowrap">天数</th>
                    <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3.5 whitespace-nowrap">审批状态</th>
                    <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3.5 whitespace-nowrap hidden lg:table-cell">申请原因</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {leaves.map(leave => {
                    const emp = employeeMap.get(leave.employeeId);
                    const colors = ["bg-blue-100 text-blue-700", "bg-indigo-100 text-indigo-700", "bg-violet-100 text-violet-700", "bg-emerald-100 text-emerald-700", "bg-amber-100 text-amber-700", "bg-rose-100 text-rose-700"];
                    const colorIndex = leave.employeeId % colors.length;
                    return (
                      <tr
                        key={leave.id}
                        className="hover:bg-muted/20 transition-colors cursor-pointer"
                        onClick={() => setLocation(`/employees/${leave.employeeId}`)}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className={`h-8 w-8 rounded-lg flex items-center justify-center text-xs font-semibold shrink-0 ${colors[colorIndex]}`}>
                              {emp?.name.slice(0, 2) ?? "?"}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">{emp?.name ?? `#${leave.employeeId}`}</p>
                              <p className="text-xs text-muted-foreground">{emp?.department ?? ""}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-sm text-foreground">{leaveTypeMap[leave.leaveType] ?? leave.leaveType}</span>
                        </td>
                        <td className="px-4 py-4 text-sm text-muted-foreground whitespace-nowrap">
                          {String(leave.startDate).slice(0, 10)}
                        </td>
                        <td className="px-4 py-4 text-sm text-muted-foreground whitespace-nowrap">
                          {String(leave.endDate).slice(0, 10)}
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-sm font-semibold text-foreground">{String(leave.days)}</span>
                          <span className="text-xs text-muted-foreground ml-1">天</span>
                        </td>
                        <td className="px-4 py-4">
                          <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${statusMap[leave.status]?.color}`}>
                            {statusMap[leave.status]?.label}
                          </span>
                        </td>
                        <td className="px-4 py-4 hidden lg:table-cell">
                          <span className="text-xs text-muted-foreground line-clamp-1 max-w-[200px]">
                            {leave.reason ?? "—"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
}
