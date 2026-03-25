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

## 假期配额功能
- [x] 新增 leaveQuotas 数据库表（员工ID、假期类型、年份、总配额）
- [x] 执行数据库迁移
- [x] 写入 12 名员工的 2026 年初始配额数据（年假/病假/事假）
- [x] 后端：getLeaveQuotasByEmployee 查询函数（含已用/剩余计算）
- [x] 后端：tRPC leaves.quotas 查询接口
- [x] 后端：REST GET /api/employees/:id/quotas 接口
- [x] 前端：员工详情页假期配额卡片（总额/已用/剩余进度条）
- [x] 前端：员工列表页年假/病假/事假剩余天数迷你进度条
- [x] 编写配额功能单元测试（21 个全部通过）

## API employeeNo 改造
- [x] 后端：GET /api/employees/:employeeNo 改用工号查询
- [x] 后端：GET /api/leaves?employee_no= 改用工号筛选
- [x] 后端：GET /api/employees/:employeeNo/quotas 改用工号查询
- [x] 后端：POST /api/leaves body 中 employeeId 改为 employeeNo
- [x] 前端：API 文档页更新所有接口参数说明
- [x] 新增 rest-api.test.ts，27 个测试全部通过

## 按工号审批接口
- [x] 后端：PATCH /api/leaves/approve-by-no（employeeNo + startDate）
- [x] 后端：PATCH /api/leaves/reject-by-no（employeeNo + startDate）
- [x] 前端：API 文档页新增两个接口说明（标注「推荐」）
- [x] 编写单元测试（30 个全部通过）

## Query 参数审批接口
- [x] 后端：PATCH /api/leaves/approve?leave_id=xxx
- [x] 后端：PATCH /api/leaves/reject?leave_id=xxx
- [x] 前端：API 文档页新增说明

## 全接口 Query 参数支持
- [x] GET /api/employees 已支持 Query 参数，无需改动
- [x] GET /api/employee?employee_no=xxx （新增）
- [x] GET /api/quotas?employee_no=xxx （新增）
- [x] POST /api/leaves 支持 body 或 Query 参数两种方式
- [x] PATCH /api/leaves/approve-by-no 支持 body 或 Query 参数
- [x] PATCH /api/leaves/reject-by-no 支持 body 或 Query 参数
- [x] 更新 API 文档页，所有接口均展示 Query 参数方式

## 接口字段类型兼容处理（Dify 友好）
- [x] POST /api/leaves：days 字符串转数字，日期支持 / 分隔符，所有字段自动 trim
- [x] PATCH approve/reject（所有方式）：leave_id 字符串转数字，同时支持 body.leaveId
- [x] PATCH approve-by-no / reject-by-no：employeeNo/startDate 自动 trim，日期支持 / 分隔符
- [x] GET 接口：year 字符串转数字（原已支持）
- [x] 30 个单元测试全部通过

## 参数大小写兼容
- [x] employeeNo 查询时自动转大写（EMP007/emp007/Emp007 均可匹配）
- [x] leaveType 查询时自动转小写（Sick/SICK/sick 均可匹配）
- [x] 30 个单元测试全部通过
