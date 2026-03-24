# HR 系统 TODO

## 数据库 & 后端
- [x] 创建 employees 员工信息数据表（员工ID、姓名、部门、职位、邮箱、电话、入职日期）
- [x] 创建 leaves 请假记录数据表（请假类型、开始日期、结束日期、请假天数、审批状态、申请原因）
- [x] 执行数据库迁移
- [x] 写入模拟员工数据（12 条）
- [x] 写入模拟请假记录数据（25 条）
- [x] tRPC 接口：获取所有员工列表（支持搜索/部门筛选）
- [x] tRPC 接口：按 ID 获取员工详情（含请假记录）
- [x] tRPC 接口：获取所有请假记录（支持按员工ID、状态筛选）
- [x] REST API：GET /api/employees
- [x] REST API：GET /api/employees/:id
- [x] REST API：GET /api/leaves（支持 ?employee_id= 筛选）

## 前端界面
- [x] 全局样式设计（优雅配色、Inter 字体）
- [x] DashboardLayout 侧边栏导航（HR 管理系统专属菜单）
- [x] 首页 Dashboard（统计卡片：员工总数、请假中、待审批等）
- [x] 员工列表页（卡片展示、搜索、部门筛选）
- [x] 员工详情页（基本信息 + 该员工请假记录）
- [x] 请假记录页（表格展示、状态筛选、类型筛选）
- [x] API 文档页（Dify 工作流调用说明）

## 测试 & 交付
- [x] 编写 vitest 单元测试（11 个测试全部通过）
- [x] 保存检查点

## 新增功能（请假申请 & 审批）
- [x] tRPC mutation：提交请假申请（leaves.submit）
- [x] tRPC mutation：审批请假（leaves.approve / leaves.reject / leaves.cancel）
- [x] REST API：POST /api/leaves（提交申请）
- [x] REST API：PATCH /api/leaves/:id/approve（批准）
- [x] REST API：PATCH /api/leaves/:id/reject（拒绝）
- [x] 前端：请假申请表单弹窗（员工选择、类型、日期范围、原因）
- [x] 前端：请假记录页审批操作按钮（批准/拒绝）
- [x] 前端：员工详情页审批操作按钮
- [x] 更新 API 文档页（新增申请和审批接口说明）
- [x] 编写新功能单元测试（17 个全部通过）
