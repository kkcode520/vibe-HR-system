import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { CalendarDays, Plus, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import LeaveApplyDialog from "@/components/LeaveApplyDialog";

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
  const [applyOpen, setApplyOpen] = useState(false);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [, setLocation] = useLocation();

  const utils = trpc.useUtils();
  const { data: employees } = trpc.employees.list.useQuery({});
  const { data: leaves, isLoading } = trpc.leaves.list.useQuery({
    status: status === "all" ? undefined : status,
    leaveType: leaveType === "all" ? undefined : leaveType,
  });

  const employeeMap = new Map(employees?.map(e => [e.id, e]) ?? []);

  const approveMutation = trpc.leaves.approve.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      utils.leaves.list.invalidate();
      utils.leaves.stats.invalidate();
      setProcessingId(null);
    },
    onError: (err) => {
      toast.error(err.message || "操作失败");
      setProcessingId(null);
    },
  });

  const rejectMutation = trpc.leaves.reject.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      utils.leaves.list.invalidate();
      utils.leaves.stats.invalidate();
      setProcessingId(null);
    },
    onError: (err) => {
      toast.error(err.message || "操作失败");
      setProcessingId(null);
    },
  });

  const handleApprove = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setProcessingId(id);
    approveMutation.mutate({ id, approvedBy: "管理员" });
  };

  const handleReject = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setProcessingId(id);
    rejectMutation.mutate({ id, approvedBy: "管理员" });
  };

  const allLeaves = trpc.leaves.list.useQuery({});
  const pendingCount = allLeaves.data?.filter(l => l.status === "pending").length ?? 0;
  const approvedCount = allLeaves.data?.filter(l => l.status === "approved").length ?? 0;
  const rejectedCount = allLeaves.data?.filter(l => l.status === "rejected").length ?? 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-foreground tracking-tight">请假记录</h1>
            <p className="text-sm text-muted-foreground mt-1">
              共 <span className="font-medium text-foreground">{leaves?.length ?? 0}</span> 条记录
            </p>
          </div>
          <Button onClick={() => setApplyOpen(true)} className="gap-2 w-fit">
            <Plus className="h-4 w-4" />
            提交请假申请
          </Button>
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

        {/* Status Summary Pills */}
        <div className="flex flex-wrap gap-2">
          {[
            { key: "all", label: "全部", count: (allLeaves.data?.length ?? 0) },
            { key: "pending", label: "待审批", count: pendingCount },
            { key: "approved", label: "已批准", count: approvedCount },
            { key: "rejected", label: "已拒绝", count: rejectedCount },
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
              <p className="text-sm mt-1">请调整筛选条件或提交新申请</p>
              <Button variant="outline" className="mt-4 gap-2" onClick={() => setApplyOpen(true)}>
                <Plus className="h-4 w-4" />
                提交请假申请
              </Button>
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
                    <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3.5 whitespace-nowrap">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {leaves.map(leave => {
                    const emp = employeeMap.get(leave.employeeId);
                    const colors = ["bg-blue-100 text-blue-700", "bg-indigo-100 text-indigo-700", "bg-violet-100 text-violet-700", "bg-emerald-100 text-emerald-700", "bg-amber-100 text-amber-700", "bg-rose-100 text-rose-700"];
                    const colorIndex = leave.employeeId % colors.length;
                    const isProcessing = processingId === leave.id;
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
                          <span className="text-xs text-muted-foreground line-clamp-1 max-w-[180px]">
                            {leave.reason ?? "—"}
                          </span>
                        </td>
                        <td className="px-4 py-4" onClick={e => e.stopPropagation()}>
                          {leave.status === "pending" ? (
                            <div className="flex items-center gap-1.5">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-2.5 text-xs gap-1 text-emerald-700 border-emerald-200 hover:bg-emerald-50 hover:border-emerald-300"
                                disabled={isProcessing}
                                onClick={(e) => handleApprove(leave.id, e)}
                              >
                                {isProcessing && approveMutation.isPending ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <CheckCircle2 className="h-3 w-3" />
                                )}
                                批准
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-2.5 text-xs gap-1 text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
                                disabled={isProcessing}
                                onClick={(e) => handleReject(leave.id, e)}
                              >
                                {isProcessing && rejectMutation.isPending ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <XCircle className="h-3 w-3" />
                                )}
                                拒绝
                              </Button>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              {leave.approvedBy ? `by ${leave.approvedBy}` : "—"}
                            </span>
                          )}
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

      {/* Leave Apply Dialog */}
      <LeaveApplyDialog
        open={applyOpen}
        onOpenChange={setApplyOpen}
      />
    </DashboardLayout>
  );
}
