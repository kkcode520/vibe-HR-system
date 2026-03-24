import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { Search, Users, Phone, Mail, Calendar, ChevronRight } from "lucide-react";
import { useState, useMemo } from "react";
import { useLocation } from "wouter";

export default function Employees() {
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("all");
  const [, setLocation] = useLocation();
  const currentYear = new Date().getFullYear();

  const { data: departments } = trpc.employees.departments.useQuery();
  const { data: employees, isLoading } = trpc.employees.list.useQuery({
    search: search || undefined,
    department: department === "all" ? undefined : department,
  });
  // 获取所有员工的配额摘要（用于卡片展示）
  const { data: quotaSummary } = trpc.employees.quotaSummary.useQuery({ year: currentYear });

  // 构建 employeeId -> quotas 的 Map
  const quotaMap = useMemo(() => {
    const map = new Map<number, { leaveType: string; totalDays: number; usedDays: number; remainingDays: number }[]>();
    quotaSummary?.forEach(s => map.set(s.employeeId, s.quotas));
    return map;
  }, [quotaSummary]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-foreground tracking-tight">员工管理</h1>
            <p className="text-sm text-muted-foreground mt-1">
              共 <span className="font-medium text-foreground">{employees?.length ?? 0}</span> 名员工
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索员工姓名、工号、职位..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 bg-background"
            />
          </div>
          <Select value={department} onValueChange={setDepartment}>
            <SelectTrigger className="w-full sm:w-44 bg-background">
              <SelectValue placeholder="全部部门" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部部门</SelectItem>
              {departments?.map(d => (
                <SelectItem key={d} value={d}>{d}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Employee Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-52 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : !employees || employees.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Users className="h-12 w-12 mb-4 opacity-20" />
            <p className="text-base font-medium">暂无员工数据</p>
            <p className="text-sm mt-1">请调整搜索条件或添加员工</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {employees.map(emp => (
              <EmployeeCard
                key={emp.id}
                employee={emp}
                quotas={quotaMap.get(emp.id) ?? []}
                onClick={() => setLocation(`/employees/${emp.id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

type Employee = {
  id: number;
  employeeNo: string;
  name: string;
  department: string;
  position: string;
  email?: string | null;
  phone?: string | null;
  hireDate: string | Date;
  status: "active" | "inactive";
};

type QuotaItem = {
  leaveType: string;
  totalDays: number;
  usedDays: number;
  remainingDays: number;
};

const quotaStyle: Record<string, { label: string; color: string; bg: string; track: string }> = {
  annual:   { label: "年假", color: "text-blue-600",  bg: "bg-blue-500",  track: "bg-blue-100" },
  sick:     { label: "病假", color: "text-rose-600",  bg: "bg-rose-500",  track: "bg-rose-100" },
  personal: { label: "事假", color: "text-amber-600", bg: "bg-amber-500", track: "bg-amber-100" },
};

function QuotaMiniBar({ quota }: { quota: QuotaItem }) {
  const style = quotaStyle[quota.leaveType] ?? { label: quota.leaveType, color: "text-gray-600", bg: "bg-gray-500", track: "bg-gray-100" };
  const pct = quota.totalDays > 0 ? Math.min(100, (quota.usedDays / quota.totalDays) * 100) : 0;
  const isLow = quota.remainingDays <= 2 && quota.remainingDays > 0;
  const isDepleted = quota.remainingDays <= 0;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className={`font-medium ${style.color}`}>{style.label}</span>
        <span className={`font-semibold ${isDepleted ? "text-red-500" : isLow ? "text-amber-500" : "text-foreground"}`}>
          剩 {quota.remainingDays}<span className="text-muted-foreground font-normal">/{quota.totalDays}天</span>
        </span>
      </div>
      <div className={`h-1.5 rounded-full overflow-hidden ${style.track}`}>
        <div
          className={`h-full rounded-full ${isDepleted ? "bg-red-500" : style.bg}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function EmployeeCard({ employee, quotas, onClick }: { employee: Employee; quotas: QuotaItem[]; onClick: () => void }) {
  const initials = employee.name.slice(0, 2);
  const colors = [
    "bg-blue-100 text-blue-700",
    "bg-indigo-100 text-indigo-700",
    "bg-violet-100 text-violet-700",
    "bg-emerald-100 text-emerald-700",
    "bg-amber-100 text-amber-700",
    "bg-rose-100 text-rose-700",
  ];
  const colorIndex = employee.id % colors.length;

  // 只展示年假、病假、事假三种主要配额
  const mainQuotas = quotas.filter(q => ["annual", "sick", "personal"].includes(q.leaveType));

  return (
    <Card
      className="border-border/60 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 cursor-pointer group"
      onClick={onClick}
    >
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          <div className={`h-12 w-12 rounded-xl flex items-center justify-center text-base font-semibold shrink-0 ${colors[colorIndex]}`}>
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="font-semibold text-foreground truncate">{employee.name}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{employee.employeeNo}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary transition-colors shrink-0 mt-0.5" />
            </div>

            <div className="mt-3 space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-xs px-2 py-0.5 rounded-md bg-accent text-accent-foreground font-medium">
                  {employee.department}
                </span>
                <span className="text-xs text-muted-foreground truncate">{employee.position}</span>
              </div>
              {employee.email && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Mail className="h-3 w-3 shrink-0" />
                  <span className="truncate">{employee.email}</span>
                </div>
              )}
              {employee.phone && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Phone className="h-3 w-3 shrink-0" />
                  <span>{employee.phone}</span>
                </div>
              )}
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3 shrink-0" />
                <span>入职 {String(employee.hireDate).slice(0, 10)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 假期配额迷你进度条 */}
        {mainQuotas.length > 0 && (
          <div className="mt-4 pt-3 border-t border-border/50 space-y-2">
            <p className="text-xs text-muted-foreground font-medium mb-2">{new Date().getFullYear()} 年假期余额</p>
            {mainQuotas.map(q => (
              <QuotaMiniBar key={q.leaveType} quota={q} />
            ))}
          </div>
        )}

        <div className="mt-3 pt-3 border-t border-border/50 flex items-center justify-between">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            employee.status === "active"
              ? "bg-emerald-100 text-emerald-700"
              : "bg-gray-100 text-gray-500"
          }`}>
            {employee.status === "active" ? "在职" : "离职"}
          </span>
          <span className="text-xs text-primary group-hover:underline">查看详情 →</span>
        </div>
      </CardContent>
    </Card>
  );
}
