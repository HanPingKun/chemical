<template>
  <div class="app-container">
    <!-- 任务创建区标题 - 使用flex容器使其在同一行显示 -->
    <div class="flex items-center mb-2">
      <div class="i-svg:close_right mr-2" />
      <h2>任务创建区</h2>
    </div>
    <div class="task-create-area">
      <el-button type="primary" class="task-btn">化合反应文本信息抽取</el-button>
      <el-button type="primary" class="task-btn">分子结构图SMILES识别</el-button>
      <el-button type="primary" class="task-btn">反应示意图信息挖掘</el-button>
      <el-button type="primary" class="task-btn">多模态信息抽取</el-button>
    </div>
    <!-- 历史任务及结果查询区标题 -->
    <div class="flex items-center mb-2">
      <div class="i-svg:close_right mr-2" />
      <h2>历史任务及结果查询区</h2>
    </div>
    <el-table :data="tableData" style="width: 100%">
      <el-table-column prop="taskId" label="任务ID" align="center"></el-table-column>
      <el-table-column prop="taskName" label="任务类型" align="center"></el-table-column>
      <el-table-column prop="status" label="状态" align="center">
        <template #default="scope">
          <el-tag :type="getStatusType(scope.row.status)" :class="['status-tag', 'el-tag--mini']">
            {{ getStatusText(scope.row.status) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="detail" label="详情" align="center">
        <template #default="scope">
          <el-button type="text" size="mini" @click="viewDetail(scope.row)">查看详情</el-button>
        </template>
      </el-table-column>
      <el-table-column prop="createTime" label="创建时间" align="center"></el-table-column>
    </el-table>
  </div>
</template>

<script setup>
import { ref } from "vue";

// 任务状态常量
const TASK_STATUS = {
  CREATE_BUT_NOT_START: 0,
  RUNNING: 1,
  SUCCESS: 2,
  FAIL: 3,
};

// 获取状态文本
const getStatusText = (status) => {
  switch (status) {
    case TASK_STATUS.CREATE_BUT_NOT_START:
      return "待处理";
    case TASK_STATUS.RUNNING:
      return "处理中";
    case TASK_STATUS.SUCCESS:
      return "已完成";
    case TASK_STATUS.FAIL:
      return "已失败";
    default:
      return "未知状态";
  }
};

// 获取状态标签类型
const getStatusType = (status) => {
  switch (status) {
    case TASK_STATUS.CREATE_BUT_NOT_START:
      return "info";
    case TASK_STATUS.RUNNING:
      return "primary";
    case TASK_STATUS.SUCCESS:
      return "success";
    case TASK_STATUS.FAIL:
      return "danger";
    default:
      return "default";
  }
};

// 查看详情方法
const viewDetail = (row) => {
  console.log("查看任务详情:", row);
  // 这里可以添加查看详情的逻辑，如弹出对话框等
};

// 模拟表格数据
const tableData = ref([
  {
    taskId: "T20231015001",
    taskName: "化合反应文本信息抽取",
    createTime: "2023-10-15 09:30",
    status: TASK_STATUS.SUCCESS,
  },
  {
    taskId: "T20231015002",
    taskName: "分子结构图SMILES识别",
    createTime: "2023-10-15 10:45",
    status: TASK_STATUS.RUNNING,
  },
  {
    taskId: "T20231015003",
    taskName: "反应示意图信息挖掘",
    createTime: "2023-10-15 11:20",
    status: TASK_STATUS.CREATE_BUT_NOT_START,
  },
  {
    taskId: "T20231014001",
    taskName: "化学文献端到端多模态信息抽取",
    createTime: "2023-10-14 16:10",
    status: TASK_STATUS.FAIL,
  },
]);
</script>

<style scoped>
.app-container {
  /* 调整容器内边距，顶部内边距减小 */
  padding: 10px 20px;
}

/* 任务创建区标题样式优化 */
.flex.items-center.mb-2 {
  /* 减少标题底部边距 */
  margin-bottom: 10px;
}

.task-create-area {
  display: flex;
  gap: 10px;
  /* 移除顶部负边距，避免布局问题 */
  margin-top: 0;
  margin-bottom: 20px;
}

.task-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 240px;
  height: 100px;
  padding: 10px;
  font-size: 15px;
  color: #606266;
  text-align: center;
  word-break: break-all;
  background-color: #fff;
  border: 2px solid #e4e7ed;
  border-radius: 16px;
  transition: all 0.2s ease;
}

.task-btn:hover {
  color: #409eff;
  border-color: #409eff;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.el-table {
  /* 调整表格顶部间距 */
  margin-top: 10px;
  /* 添加表格外边界框 */
  border: 1px solid #e4e7ed;
  border-radius: 4px;
}

/* 表格内容字体大小 */
.el-table .el-table__cell {
  font-size: 15px;
}

/* 表格表头字体大小 */
.el-table .el-table__header th {
  font-size: 15px;
}

/* 状态标签样式优化 */
.status-tag {
  height: 22px;
  padding: 0 8px;
  font-size: 12px;
  line-height: 20px;
}

/* 状态标签图标样式 */
.status-tag::before {
  display: inline-block;
  width: 8px;
  height: 8px;
  margin-right: 4px;
  content: "";
  border-radius: 50%;
}

.status-tag.el-tag--info::before {
  background-color: #909399;
}

.status-tag.el-tag--primary::before {
  background-color: #409eff;
}

.status-tag.el-tag--success::before {
  background-color: #67c23a;
}

.status-tag.el-tag--danger::before {
  background-color: #f56c6c;
}
</style>
