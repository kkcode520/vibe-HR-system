import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { Users, CalendarDays, CheckCircle2, Clock, XCircle, TrendingUp, ArrowRight } from "lucide-react";
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

export default function Home() {
  const [, setLocation] = useLocation();
  const { data: empStats } = trpc.employees.stats.useQuery();
  const { data: leaveStats } = trpc.leaves.stats.useQuery();
  const { data: recentLeaves } = trpc.leaves.list.useQuery({ status: "pending" });
  const { data: employees } = trpc.employees.list.useQuery({});

  const employeeMap = new Map(employees?.map(e => [e.id, e.name]) ?? []);

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">工作台</h1>
          <p className="text-muted-foreground mt-1 text-sm">欢迎使用 HR 管理系统，以下是今日概览</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="员工总数"
            value={empStats?.total ?? 0}
            sub={`在职 ${empStats?.active ?? 0} 人`}
            icon={<Users className="h-5 w-5" />}
            color="blue"
            onClick={() => setLocation("/employees")}
          />
          <StatCard
            title="请假总数"
            value={leaveStats?.total ?? 0}
            sub="全部记录"
            icon={<CalendarDays className="h-5 w-5" />}
            color="indigo"
            onClick={() => setLocation("/leaves")}
          />
          <StatCard
            title="待审批"
            value={leaveStats?.pending ?? 0}
            sub="需要处理"
            icon={<Clock className="h-5 w-5" />}
            color="amber"
            onClick={() => setLocation("/leaves?status=pending")}
          />
          <StatCard
            title="已批准"
            value={leaveStats?.approved ?? 0}
            sub="本期批准"
            icon={<CheckCircle2 className="h-5 w-5" />}
            color="emerald"
            onClick={() => setLocation("/leaves?status=approved")}
          />
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Pending Leaves */}
          <div className="lg:col-span-2">
            <Card className="border-border/60 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-base font-semibold">待审批请假</CardTitle>
                <button
                  onClick={() => setLocation("/leaves")}
                  className="text-xs text-primary flex items-center gap-1 hover:underline"
                >
                  查看全部 <ArrowRight className="h-3 w-3" />
                </button>
              </CardHeader>
              <CardContent className="p-0">
                {!recentLeaves || recentLeaves.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <CheckCircle2 className="h-10 w-10 mb-3 opacity-30" />
                    <p className="text-sm">暂无待审批请假</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border/50">
                    {recentLeaves.slice(0, 6).map(leave => (
                      <div key={leave.id} className="flex items-center justify-between px-6 py-3.5 hover:bg-muted/30 transition-colors">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <span className="text-xs font-medium text-primary">
                              {employeeMap.get(leave.employeeId)?.charAt(0) ?? "?"}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">
                              {employeeMap.get(leave.employeeId) ?? `员工 #${leave.employeeId}`}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {leaveTypeMap[leave.leaveType] ?? leave.leaveType} · {String(leave.days)} 天
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-xs text-muted-foreground hidden sm:block">
                            {String(leave.startDate).slice(0, 10)} ~ {String(leave.endDate).slice(0, 10)}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${statusMap[leave.status]?.color}`}>
                            {statusMap[leave.status]?.label}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Quick Stats */}
          <div className="space-y-4">
            <Card className="border-border/60 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  请假分布
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { label: "已批准", value: leaveStats?.approved ?? 0, total: leaveStats?.total ?? 1, color: "bg-emerald-500" },
                  { label: "待审批", value: leaveStats?.pending ?? 0, total: leaveStats?.total ?? 1, color: "bg-amber-500" },
                  { label: "已拒绝", value: leaveStats?.rejected ?? 0, total: leaveStats?.total ?? 1, color: "bg-red-500" },
                ].map(item => (
                  <div key={item.label}>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-muted-foreground">{item.label}</span>
                      <span className="font-medium text-foreground">{item.value}</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full ${item.color} rounded-full transition-all duration-700`}
                        style={{ width: `${item.total > 0 ? (item.value / item.total) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border-border/60 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">快速入口</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {[
                  { label: "查看所有员工", path: "/employees", icon: Users },
                  { label: "请假记录管理", path: "/leaves", icon: CalendarDays },
                  { label: "API 接口文档", path: "/api-docs", icon: XCircle },
                ].map(item => (
                  <button
                    key={item.path}
                    onClick={() => setLocation(item.path)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-accent transition-colors text-left group"
                  >
                    <item.icon className="h-4 w-4 text-primary/70 group-hover:text-primary transition-colors" />
                    <span className="text-sm text-foreground/80 group-hover:text-foreground transition-colors">{item.label}</span>
                    <ArrowRight className="h-3 w-3 ml-auto text-muted-foreground/50 group-hover:text-primary transition-colors" />
                  </button>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

function StatCard({
  title, value, sub, icon, color, onClick,
}: {
  title: string;
  value: number;
  sub: string;
  icon: React.ReactNode;
  color: "blue" | "indigo" | "amber" | "emerald";
  onClick?: () => void;
}) {
  const colorMap = {
    blue: "bg-blue-50 text-blue-600",
    indigo: "bg-indigo-50 text-indigo-600",
    amber: "bg-amber-50 text-amber-600",
    emerald: "bg-emerald-50 text-emerald-600",
  };
  return (
    <Card
      className="border-border/60 shadow-sm cursor-pointer hover:shadow-md transition-all duration-200 hover:-translate-y-0.5"
      onClick={onClick}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground font-medium">{title}</p>
            <p className="text-3xl font-bold text-foreground mt-1 tracking-tight">{value}</p>
            <p className="text-xs text-muted-foreground mt-1">{sub}</p>
          </div>
          <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${colorMap[color]}`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
