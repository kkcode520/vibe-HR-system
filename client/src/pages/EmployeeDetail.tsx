import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Mail, Phone, Calendar, Building2, Briefcase, Hash, CalendarDays, Plus, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { useLocation, useParams } from "wouter";
import { useState } from "react";
import { toast } from "sonner";
import LeaveApplyDialog from "@/components/LeaveApplyDialog";
import LeaveQuotaCard from "@/components/LeaveQuotaCard";

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

export default function EmployeeDetail() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const id = parseInt(params.id ?? "0", 10);
  const [applyOpen, setApplyOpen] = useState(false);
  const [processingId, setProcessingId] = useState<number | null>(null);

  const utils = trpc.useUtils();
  const { data: employee, isLoading } = trpc.employees.byId.useQuery({ id });

  const approveMutation = trpc.leaves.approve.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      utils.employees.byId.invalidate({ id });
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
      utils.employees.byId.invalidate({ id });
      utils.leaves.list.invalidate();
      utils.leaves.stats.invalidate();
      setProcessingId(null);
    },
    onError: (err) => {
      toast.error(err.message || "操作失败");
      setProcessingId(null);
    },
  });

  const handleApprove = (leaveId: number) => {
    setProcessingId(leaveId);
    approveMutation.mutate({ id: leaveId, approvedBy: "管理员" });
  };

  const handleReject = (leaveId: number) => {
    setProcessingId(leaveId);
    rejectMutation.mutate({ id: leaveId, approvedBy: "管理员" });
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-4">
          <div className="h-8 w-48 bg-muted animate-pulse rounded-lg" />
          <div className="h-48 bg-muted animate-pulse rounded-xl" />
          <div className="h-64 bg-muted animate-pulse rounded-xl" />
        </div>
      </DashboardLayout>
    );
  }

  if (!employee) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <p className="text-lg font-medium">员工不存在</p>
          <button onClick={() => setLocation("/employees")} className="mt-4 text-sm text-primary hover:underline">
            返回员工列表
          </button>
        </div>
      </DashboardLayout>
    );
  }

  const colors = ["bg-blue-100 text-blue-700", "bg-indigo-100 text-indigo-700", "bg-violet-100 text-violet-700", "bg-emerald-100 text-emerald-700", "bg-amber-100 text-amber-700", "bg-rose-100 text-rose-700"];
  const colorIndex = employee.id % colors.length;

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl">
        {/* Back */}
        <button
          onClick={() => setLocation("/employees")}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          返回员工列表
        </button>

        {/* Profile Card */}
        <Card className="border-border/60 shadow-sm overflow-hidden">
          <div className="h-24 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent" />
          <CardContent className="px-6 pb-6 -mt-8">
            <div className="flex flex-col sm:flex-row sm:items-end gap-4">
              <div className={`h-16 w-16 rounded-2xl flex items-center justify-center text-xl font-bold border-4 border-background shadow-sm ${colors[colorIndex]}`}>
                {employee.name.slice(0, 2)}
              </div>
              <div className="flex-1 min-w-0 pb-1">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <h1 className="text-xl font-bold text-foreground">{employee.name}</h1>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium w-fit ${
                    employee.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"
                  }`}>
                    {employee.status === "active" ? "在职" : "离职"}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">{employee.position} · {employee.department}</p>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <InfoItem icon={<Hash className="h-4 w-4" />} label="工号" value={employee.employeeNo} />
              <InfoItem icon={<Building2 className="h-4 w-4" />} label="部门" value={employee.department} />
              <InfoItem icon={<Briefcase className="h-4 w-4" />} label="职位" value={employee.position} />
              <InfoItem icon={<Calendar className="h-4 w-4" />} label="入职日期" value={String(employee.hireDate).slice(0, 10)} />
              {employee.email && <InfoItem icon={<Mail className="h-4 w-4" />} label="邮箱" value={employee.email} />}
              {employee.phone && <InfoItem icon={<Phone className="h-4 w-4" />} label="电话" value={employee.phone} />}
            </div>
          </CardContent>
        </Card>

        {/* Leave Quota Card */}
        <LeaveQuotaCard employeeId={id} />

        {/* Leave Records */}
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-primary" />
                请假记录
                <span className="ml-1 text-xs font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                  {employee.leaves?.length ?? 0} 条
                </span>
              </CardTitle>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 h-8 text-xs"
                onClick={() => setApplyOpen(true)}
              >
                <Plus className="h-3.5 w-3.5" />
                申请请假
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {!employee.leaves || employee.leaves.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <CalendarDays className="h-10 w-10 mb-3 opacity-20" />
                <p className="text-sm">暂无请假记录</p>
                <Button variant="outline" size="sm" className="mt-3 gap-1.5 text-xs" onClick={() => setApplyOpen(true)}>
                  <Plus className="h-3.5 w-3.5" />
                  申请请假
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {employee.leaves.map(leave => {
                  const isProcessing = processingId === leave.id;
                  return (
                    <div key={leave.id} className="flex flex-col sm:flex-row sm:items-center justify-between px-6 py-4 gap-3 hover:bg-muted/20 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-lg bg-primary/8 flex items-center justify-center shrink-0">
                          <CalendarDays className="h-4 w-4 text-primary/70" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium text-foreground">
                              {leaveTypeMap[leave.leaveType] ?? leave.leaveType}
                            </span>
                            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${statusMap[leave.status]?.color}`}>
                              {statusMap[leave.status]?.label}
                            </span>
                          </div>
                          {leave.reason && (
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{leave.reason}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4 shrink-0">
                        <div className="text-sm text-muted-foreground text-right">
                          <div className="whitespace-nowrap">{String(leave.startDate).slice(0, 10)} ~ {String(leave.endDate).slice(0, 10)}</div>
                          <div className="font-semibold text-foreground">{String(leave.days)} 天</div>
                        </div>
                        {leave.status === "pending" && (
                          <div className="flex items-center gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2.5 text-xs gap-1 text-emerald-700 border-emerald-200 hover:bg-emerald-50 hover:border-emerald-300"
                              disabled={isProcessing}
                              onClick={() => handleApprove(leave.id)}
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
                              onClick={() => handleReject(leave.id)}
                            >
                              {isProcessing && rejectMutation.isPending ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <XCircle className="h-3 w-3" />
                              )}
                              拒绝
                            </Button>
                          </div>
                        )}
                        {(leave.status === "approved" || leave.status === "rejected") && leave.approvedBy && (
                          <span className="text-xs text-muted-foreground">by {leave.approvedBy}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Leave Apply Dialog */}
      <LeaveApplyDialog
        open={applyOpen}
        onOpenChange={setApplyOpen}
        defaultEmployeeId={id}
      />
    </DashboardLayout>
  );
}

function InfoItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2.5 p-3 rounded-lg bg-muted/40">
      <div className="text-muted-foreground mt-0.5 shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium text-foreground truncate mt-0.5">{value}</p>
      </div>
    </div>
  );
}
