import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Copy, CheckCheck, Globe, Zap, Code2, ChevronDown, ChevronRight, Send, ShieldCheck } from "lucide-react";
import { useState } from "react";

const BASE_URL = window.location.origin;

type ApiEndpoint = {
  method: "GET" | "POST" | "PATCH";
  path: string;
  title: string;
  description: string;
  params?: { name: string; type: string; required: boolean; description: string }[];
  responseExample: string;
  difyExample?: string;
};

const endpoints: ApiEndpoint[] = [
  {
    method: "GET",
    path: "/api/employees",
    title: "获取所有员工列表",
    description: "返回所有员工的基本信息，支持按部门、姓名、工号等条件筛选。",
    params: [
      { name: "department", type: "string", required: false, description: "按部门名称筛选，如：技术部、人事部" },
      { name: "search", type: "string", required: false, description: "模糊搜索员工姓名、工号或职位" },
      { name: "status", type: "string", required: false, description: "员工状态：active（在职）/ inactive（离职）" },
    ],
    responseExample: `{
  "success": true,
  "total": 12,
  "data": [
    {
      "id": 1,
      "employeeNo": "EMP001",
      "name": "张伟",
      "department": "技术部",
      "position": "高级工程师",
      "email": "zhangwei@company.com",
      "phone": "138-0000-0001",
      "hireDate": "2021-03-15",
      "status": "active"
    }
  ]
}`,
    difyExample: `在 Dify 工作流中添加 HTTP 节点：
• 方法：GET
• URL：${BASE_URL}/api/employees
• 可选参数（Query Params）：
  - department: {{#var.department#}}
  - search: {{#var.employee_name#}}`,
  },
  {
    method: "GET",
    path: "/api/employees/:id",
    title: "按 ID 查询员工详情",
    description: "根据员工 ID 返回该员工的详细信息，包含其所有请假记录。",
    params: [
      { name: "id", type: "number", required: true, description: "员工 ID（路径参数），如 /api/employees/1" },
    ],
    responseExample: `{
  "success": true,
  "data": {
    "id": 1,
    "employeeNo": "EMP001",
    "name": "张伟",
    "department": "技术部",
    "position": "高级工程师",
    "email": "zhangwei@company.com",
    "hireDate": "2021-03-15",
    "status": "active",
    "leaves": [
      {
        "id": 3,
        "leaveType": "annual",
        "startDate": "2025-01-20",
        "endDate": "2025-01-24",
        "days": "5.0",
        "reason": "春节假期",
        "status": "approved"
      }
    ]
  }
}`,
    difyExample: `在 Dify 工作流中添加 HTTP 节点：
• 方法：GET
• URL：${BASE_URL}/api/employees/{{#var.employee_id#}}
• 无需额外参数，ID 直接拼接在 URL 中`,
  },
  {
    method: "GET",
    path: "/api/leaves",
    title: "查询请假记录",
    description: "返回所有请假记录，支持按员工 ID、审批状态、请假类型筛选。",
    params: [
      { name: "employee_id", type: "number", required: false, description: "按员工 ID 筛选，如 employee_id=1" },
      { name: "status", type: "string", required: false, description: "审批状态：pending / approved / rejected / cancelled" },
      { name: "leave_type", type: "string", required: false, description: "请假类型：annual / sick / personal / maternity / paternity / bereavement / other" },
    ],
    responseExample: `{
  "success": true,
  "total": 5,
  "data": [
    {
      "id": 1,
      "employeeId": 2,
      "leaveType": "sick",
      "startDate": "2025-02-10",
      "endDate": "2025-02-12",
      "days": "3.0",
      "reason": "发烧感冒",
      "status": "approved",
      "approvedBy": "李经理",
      "approvedAt": "2025-02-09T10:30:00.000Z"
    }
  ]
}`,
    difyExample: `在 Dify 工作流中添加 HTTP 节点：
• 方法：GET
• URL：${BASE_URL}/api/leaves
• Query Params：
  - employee_id: {{#var.employee_id#}}
  - status: pending（查询待审批）`,
  },
  {
    method: "POST",
    path: "/api/leaves",
    title: "提交请假申请",
    description: "提交一条新的请假申请，初始状态为待审批（pending）。请求体需为 JSON 格式。",
    params: [
      { name: "employeeId", type: "number", required: true, description: "员工 ID，如 1" },
      { name: "leaveType", type: "string", required: true, description: "请假类型：annual / sick / personal / maternity / paternity / bereavement / other" },
      { name: "startDate", type: "string", required: true, description: "开始日期，格式 YYYY-MM-DD，如 2025-07-01" },
      { name: "endDate", type: "string", required: true, description: "结束日期，格式 YYYY-MM-DD，如 2025-07-05" },
      { name: "days", type: "number", required: true, description: "请假天数，如 5" },
      { name: "reason", type: "string", required: false, description: "申请原因，最多 500 字" },
    ],
    responseExample: `{
  "success": true,
  "message": "请假申请已提交，等待审批"
}`,
    difyExample: `在 Dify 工作流中添加 HTTP 节点：
• 方法：POST
• URL：${BASE_URL}/api/leaves
• Headers：Content-Type: application/json
• Body（JSON）：
  {
    "employeeId": {{#var.employee_id#}},
    "leaveType": "annual",
    "startDate": "{{#var.start_date#}}",
    "endDate": "{{#var.end_date#}}",
    "days": {{#var.days#}},
    "reason": "{{#var.reason#}}"
  }`,
  },
  {
    method: "PATCH",
    path: "/api/leaves/:id/approve",
    title: "批准请假申请",
    description: "将指定 ID 的请假申请状态从 pending 改为 approved。只有待审批状态的申请可以被批准。",
    params: [
      { name: "id", type: "number", required: true, description: "请假记录 ID（路径参数），如 /api/leaves/3/approve" },
      { name: "approvedBy", type: "string", required: false, description: "审批人姓名（请求体 JSON），默认为「管理员」" },
    ],
    responseExample: `{
  "success": true,
  "message": "已批准该请假申请"
}`,
    difyExample: `在 Dify 工作流中添加 HTTP 节点：
• 方法：PATCH
• URL：${BASE_URL}/api/leaves/{{#var.leave_id#}}/approve
• Headers：Content-Type: application/json
• Body（JSON，可选）：
  { "approvedBy": "{{#var.approver_name#}}" }`,
  },
  {
    method: "PATCH",
    path: "/api/leaves/:id/reject",
    title: "拒绝请假申请",
    description: "将指定 ID 的请假申请状态从 pending 改为 rejected。只有待审批状态的申请可以被拒绝。",
    params: [
      { name: "id", type: "number", required: true, description: "请假记录 ID（路径参数），如 /api/leaves/3/reject" },
      { name: "approvedBy", type: "string", required: false, description: "审批人姓名（请求体 JSON），默认为「管理员」" },
    ],
    responseExample: `{
  "success": true,
  "message": "已拒绝该请假申请"
}`,
    difyExample: `在 Dify 工作流中添加 HTTP 节点：
• 方法：PATCH
• URL：${BASE_URL}/api/leaves/{{#var.leave_id#}}/reject
• Headers：Content-Type: application/json
• Body（JSON，可选）：
  { "approvedBy": "{{#var.approver_name#}}" }`,
  },
];

const leaveTypeTable = [
  { value: "annual", label: "年假" },
  { value: "sick", label: "病假" },
  { value: "personal", label: "事假" },
  { value: "maternity", label: "产假" },
  { value: "paternity", label: "陪产假" },
  { value: "bereavement", label: "丧假" },
  { value: "other", label: "其他" },
];

export default function ApiDocs() {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" />
            API 接口文档
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            以下接口可直接在 Dify 工作流的 HTTP 节点中调用，无需身份验证。
          </p>
        </div>

        {/* Base URL */}
        <Card className="border-border/60 shadow-sm bg-primary/3">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Globe className="h-5 w-5 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground font-medium mb-1">Base URL</p>
                <code className="text-sm font-mono text-foreground break-all">{BASE_URL}</code>
              </div>
              <button
                onClick={() => copyToClipboard(BASE_URL, "base")}
                className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-accent transition-colors shrink-0"
              >
                {copiedKey === "base" ? <CheckCheck className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4 text-muted-foreground" />}
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Dify Quick Guide */}
        <Card className="border-primary/20 shadow-sm bg-gradient-to-br from-primary/3 to-transparent">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              Dify 工作流快速接入指南
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="space-y-3">
              {[
                { step: "1", title: "在 Dify 工作流中添加 HTTP 节点", desc: "从节点面板拖入「HTTP 请求」节点，放置在需要查询员工信息的位置。" },
                { step: "2", title: "配置请求方法和 URL", desc: `选择 GET 方法，输入完整 URL，例如：${BASE_URL}/api/employees` },
                { step: "3", title: "设置 Query 参数（可选）", desc: "在 Params 区域添加查询参数，值可以引用上游节点的变量，如 {{#var.employee_id#}}。" },
                { step: "4", title: "解析返回数据", desc: "HTTP 节点返回 JSON，在下游节点通过 body.data 访问员工列表，body.data[0].name 访问第一个员工姓名。" },
              ].map(item => (
                <div key={item.step} className="flex gap-3">
                  <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                    {item.step}
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{item.title}</p>
                    <p className="text-muted-foreground text-xs mt-0.5">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* API Endpoints */}
        <div className="space-y-3">
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <Code2 className="h-4 w-4 text-primary" />
            接口列表
          </h2>
          {endpoints.map((ep, index) => (
            <Card key={index} className="border-border/60 shadow-sm overflow-hidden">
              <button
                className="w-full text-left"
                onClick={() => setExpandedIndex(expandedIndex === index ? null : index)}
              >
                <CardHeader className="pb-3 pt-4 px-5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={`text-xs font-bold px-2 py-1 rounded-md shrink-0 ${
                        ep.method === "GET" ? "bg-blue-100 text-blue-700" :
                        ep.method === "POST" ? "bg-emerald-100 text-emerald-700" :
                        "bg-violet-100 text-violet-700"
                      }`}>
                        {ep.method}
                      </span>
                      <code className="text-sm font-mono text-foreground truncate">{ep.path}</code>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-sm text-muted-foreground hidden sm:block">{ep.title}</span>
                      {expandedIndex === index
                        ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        : <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      }
                    </div>
                  </div>
                </CardHeader>
              </button>

              {expandedIndex === index && (
                <CardContent className="px-5 pb-5 pt-0 space-y-4 border-t border-border/50">
                  <p className="text-sm text-muted-foreground">{ep.description}</p>

                  {/* Full URL */}
                  <div>
                    <p className="text-xs font-semibold text-foreground mb-2">完整 URL</p>
                    <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2.5">
                      <code className="text-xs font-mono text-foreground flex-1 break-all">
                        {BASE_URL}{ep.path}
                      </code>
                      <button
                        onClick={() => copyToClipboard(`${BASE_URL}${ep.path}`, `url-${index}`)}
                        className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-accent transition-colors shrink-0"
                      >
                        {copiedKey === `url-${index}` ? <CheckCheck className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5 text-muted-foreground" />}
                      </button>
                    </div>
                  </div>

                  {/* Parameters */}
                  {ep.params && ep.params.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-foreground mb-2">请求参数</p>
                      <div className="rounded-lg border border-border/60 overflow-hidden">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="bg-muted/40 border-b border-border/60">
                              <th className="text-left px-3 py-2 font-semibold text-muted-foreground">参数名</th>
                              <th className="text-left px-3 py-2 font-semibold text-muted-foreground">类型</th>
                              <th className="text-left px-3 py-2 font-semibold text-muted-foreground">必填</th>
                              <th className="text-left px-3 py-2 font-semibold text-muted-foreground">说明</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/40">
                            {ep.params.map(p => (
                              <tr key={p.name} className="hover:bg-muted/20">
                                <td className="px-3 py-2.5 font-mono text-primary">{p.name}</td>
                                <td className="px-3 py-2.5 text-muted-foreground">{p.type}</td>
                                <td className="px-3 py-2.5">
                                  <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${p.required ? "bg-red-100 text-red-600" : "bg-gray-100 text-gray-500"}`}>
                                    {p.required ? "必填" : "可选"}
                                  </span>
                                </td>
                                <td className="px-3 py-2.5 text-muted-foreground">{p.description}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Response Example */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-semibold text-foreground">响应示例</p>
                      <button
                        onClick={() => copyToClipboard(ep.responseExample, `resp-${index}`)}
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {copiedKey === `resp-${index}` ? <CheckCheck className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                        复制
                      </button>
                    </div>
                    <pre className="bg-foreground/5 rounded-lg p-3.5 text-xs font-mono text-foreground overflow-x-auto leading-relaxed">
                      {ep.responseExample}
                    </pre>
                  </div>

                  {/* Dify Example */}
                  {ep.difyExample && (
                    <div className="bg-primary/5 rounded-lg p-4 border border-primary/15">
                      <p className="text-xs font-semibold text-primary mb-2 flex items-center gap-1.5">
                        <Zap className="h-3.5 w-3.5" />
                        Dify 工作流配置示例
                      </p>
                      <pre className="text-xs text-foreground/80 whitespace-pre-wrap leading-relaxed font-mono">
                        {ep.difyExample}
                      </pre>
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          ))}
        </div>

        {/* Leave Type Reference */}
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">请假类型枚举值</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {leaveTypeTable.map(item => (
                <div key={item.value} className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/40">
                  <code className="text-xs font-mono text-primary">{item.value}</code>
                  <span className="text-xs text-muted-foreground">{item.label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Status Reference */}
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">审批状态枚举值</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { value: "pending", label: "待审批", color: "bg-amber-100 text-amber-700" },
                { value: "approved", label: "已批准", color: "bg-emerald-100 text-emerald-700" },
                { value: "rejected", label: "已拒绝", color: "bg-red-100 text-red-700" },
                { value: "cancelled", label: "已取消", color: "bg-gray-100 text-gray-600" },
              ].map(item => (
                <div key={item.value} className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/40">
                  <code className="text-xs font-mono text-primary">{item.value}</code>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${item.color}`}>{item.label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
