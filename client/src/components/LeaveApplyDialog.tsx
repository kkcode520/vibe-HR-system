import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { CalendarDays, Loader2 } from "lucide-react";

const leaveTypeOptions = [
  { value: "annual", label: "年假" },
  { value: "sick", label: "病假" },
  { value: "personal", label: "事假" },
  { value: "maternity", label: "产假" },
  { value: "paternity", label: "陪产假" },
  { value: "bereavement", label: "丧假" },
  { value: "other", label: "其他" },
];

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultEmployeeId?: number;
  onSuccess?: () => void;
};

export default function LeaveApplyDialog({ open, onOpenChange, defaultEmployeeId, onSuccess }: Props) {
  const { data: employees } = trpc.employees.list.useQuery({});
  const utils = trpc.useUtils();

  const [employeeId, setEmployeeId] = useState<string>(defaultEmployeeId ? String(defaultEmployeeId) : "");
  const [leaveType, setLeaveType] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [reason, setReason] = useState<string>("");

  // 自动计算天数
  const days = (() => {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end < start) return 0;
    return Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  })();

  // 当 defaultEmployeeId 变化时同步
  useEffect(() => {
    if (defaultEmployeeId) setEmployeeId(String(defaultEmployeeId));
  }, [defaultEmployeeId]);

  const submitMutation = trpc.leaves.submit.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      // 刷新相关数据
      utils.leaves.list.invalidate();
      utils.leaves.stats.invalidate();
      utils.employees.byId.invalidate();
      // 重置表单
      setLeaveType("");
      setStartDate("");
      setEndDate("");
      setReason("");
      if (!defaultEmployeeId) setEmployeeId("");
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (err) => {
      toast.error(err.message || "提交失败，请重试");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeId || !leaveType || !startDate || !endDate) {
      toast.error("请填写所有必填项");
      return;
    }
    if (days <= 0) {
      toast.error("结束日期不能早于开始日期");
      return;
    }
    submitMutation.mutate({
      employeeId: parseInt(employeeId, 10),
      leaveType: leaveType as "annual" | "sick" | "personal" | "maternity" | "paternity" | "bereavement" | "other",
      startDate,
      endDate,
      days,
      reason: reason || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <CalendarDays className="h-4 w-4 text-primary" />
            提交请假申请
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {/* 员工选择 */}
          <div className="space-y-1.5">
            <Label htmlFor="employee" className="text-sm font-medium">
              员工 <span className="text-destructive">*</span>
            </Label>
            <Select
              value={employeeId}
              onValueChange={setEmployeeId}
              disabled={!!defaultEmployeeId}
            >
              <SelectTrigger id="employee" className="bg-background">
                <SelectValue placeholder="请选择员工" />
              </SelectTrigger>
              <SelectContent>
                {employees?.map(emp => (
                  <SelectItem key={emp.id} value={String(emp.id)}>
                    <span className="font-medium">{emp.name}</span>
                    <span className="text-muted-foreground ml-2 text-xs">{emp.department} · {emp.employeeNo}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 请假类型 */}
          <div className="space-y-1.5">
            <Label htmlFor="leaveType" className="text-sm font-medium">
              请假类型 <span className="text-destructive">*</span>
            </Label>
            <Select value={leaveType} onValueChange={setLeaveType}>
              <SelectTrigger id="leaveType" className="bg-background">
                <SelectValue placeholder="请选择请假类型" />
              </SelectTrigger>
              <SelectContent>
                {leaveTypeOptions.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 日期范围 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="startDate" className="text-sm font-medium">
                开始日期 <span className="text-destructive">*</span>
              </Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="bg-background"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="endDate" className="text-sm font-medium">
                结束日期 <span className="text-destructive">*</span>
              </Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                min={startDate}
                onChange={e => setEndDate(e.target.value)}
                className="bg-background"
              />
            </div>
          </div>

          {/* 自动计算天数 */}
          {days > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/5 border border-primary/15">
              <CalendarDays className="h-4 w-4 text-primary shrink-0" />
              <span className="text-sm text-foreground">
                共 <span className="font-bold text-primary">{days}</span> 天
              </span>
            </div>
          )}

          {/* 申请原因 */}
          <div className="space-y-1.5">
            <Label htmlFor="reason" className="text-sm font-medium">
              申请原因
              <span className="text-muted-foreground font-normal ml-1">（可选）</span>
            </Label>
            <Textarea
              id="reason"
              placeholder="请简要说明请假原因..."
              value={reason}
              onChange={e => setReason(e.target.value)}
              rows={3}
              maxLength={500}
              className="bg-background resize-none"
            />
            <p className="text-xs text-muted-foreground text-right">{reason.length}/500</p>
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitMutation.isPending}
            >
              取消
            </Button>
            <Button
              type="submit"
              disabled={submitMutation.isPending || !employeeId || !leaveType || !startDate || !endDate || days <= 0}
            >
              {submitMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              提交申请
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
