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
      <el-button type="primary" class="task-btn">Reaxys文献多模态信息抽取</el-button>
    </div>

    <!-- 历史任务及结果查询区标题 -->
    <div class="flex items-center mb-2">
      <div class="i-svg:close_right mr-2" />
      <h2>历史任务及结果查询区</h2>
    </div>

    <!-- 快速查询区域 -->
    <div class="query-area">
      <el-card class="query-card">
        <!-- 调整为完整的Flex容器，并设置换行 -->
        <div class="flex flex-col md:flex-row gap-3">
          <!-- 表单区域占据主要空间 -->
          <div class="flex-1">
            <el-form :inline="true" :model="queryParams" class="flex flex-wrap gap-3">
              <el-form-item label="任务ID">
                <el-input
                  v-model="queryParams.taskId"
                  placeholder="请输入任务ID"
                  clearable
                ></el-input>
              </el-form-item>
              <el-form-item label="任务类型">
                <el-select
                  v-model="queryParams.taskType"
                  placeholder="请选择任务类型"
                  clearable
                  style="width: 200px"
                >
                  <el-option label="全部" value=""></el-option>
                  <el-option label="化学有机合成文本描述信息抽取" value="text"></el-option>
                  <el-option label="分子结构SMILES转换" value="smiles"></el-option>
                  <el-option label="反应方程式结构化信息提取" value="reaction"></el-option>
                  <el-option label="Reaxys化学文献ETE结构化信息抽取" value="reaxys"></el-option>
                </el-select>
              </el-form-item>
              <el-form-item label="任务状态">
                <el-select
                  v-model="queryParams.status"
                  placeholder="请选择任务状态"
                  clearable
                  style="width: 200px"
                >
                  <el-option label="全部" value=""></el-option>
                  <el-option label="待处理" value="0"></el-option>
                  <el-option label="处理中" value="1"></el-option>
                  <el-option label="已完成" value="2"></el-option>
                  <el-option label="已失败" value="3"></el-option>
                </el-select>
              </el-form-item>
              <el-form-item label="创建时间">
                <el-date-picker
                  v-model="queryParams.dateRange"
                  type="daterange"
                  range-separator="至"
                  start-placeholder="开始日期"
                  end-placeholder="结束日期"
                  value-format="YYYY-MM-DD"
                  style="width: 300px"
                ></el-date-picker>
              </el-form-item>
            </el-form>
          </div>

          <!-- 按钮区域移至第二行，使用flex-column实现垂直排列 -->
          <div class="flex flex-col md:flex-row gap-2 mt-3 md:mt-0 md:ml-0 md:ml-auto">
            <el-button type="primary" @click="searchTasks">查询</el-button>
            <el-button @click="resetQuery">重置</el-button>
          </div>
        </div>
      </el-card>
    </div>

    <!-- 表格加载状态 -->
    <div v-if="loading" class="flex justify-center items-center py-20">
      <el-loading v-show="loading" :fullscreen="false"></el-loading>
    </div>

    <!-- 表格数据为空状态 -->
    <div v-else-if="tableData.length === 0" class="flex flex-col items-center justify-center py-20">
      <img
        src="https://picsum.photos/seed/nodata/100/100"
        alt="无数据"
        class="w-16 h-16 mb-3 opacity-50"
      />
      <p class="text-gray-400">暂无数据</p>
      <el-button type="text" class="mt-2" @click="searchTasks">
        <i class="el-icon-refresh-right mr-1"></i>
        刷新
      </el-button>
    </div>

    <!-- 表格 -->
    <el-table v-else :data="tableData" style="width: 100%" @sort-change="handleSortChange">
      <el-table-column
        prop="taskId"
        label="任务ID"
        align="center"
        sortable="custom"
      ></el-table-column>
      <el-table-column
        prop="taskType"
        label="任务类型"
        align="center"
        sortable="custom"
      ></el-table-column>
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
      <el-table-column
        prop="createTime"
        label="创建时间"
        align="center"
        sortable="custom"
      ></el-table-column>
    </el-table>

    <!-- 分页控件 -->
    <div class="pagination flex justify-center items-center mt-3">
      <el-pagination
        :current-page="currentPage"
        :page-sizes="[5, 10, 20, 50]"
        :page-size="pageSize"
        layout="total, sizes, prev, pager, next, jumper"
        :total="total"
        @size-change="handlePageSizeChange"
        @current-change="handleCurrentChange"
      ></el-pagination>
    </div>
  </div>
</template>
<script setup>
import { ref, reactive, onMounted } from "vue";
import { useRouter } from "vue-router";

// 引入路由
const router = useRouter();

// 任务状态常量
const TASK_STATUS = {
  CREATE_BUT_NOT_START: 0,
  RUNNING: 1,
  SUCCESS: 2,
  FAIL: 3,
};
// 任务类型常量
const TASK_TYPE = {
  TEXT: "text",
  SMILES: "smiles",
  REACTION: "reaction",
  REAXYS: "reaxys",
};

// 模拟API返回的数据
const mockApiData = [
  {
    taskId: "1",
    taskCode: "text",
    taskType: "化学有机合成文本描述信息抽取",
    createTime: "2023-10-15 09:30",
    status: TASK_STATUS.SUCCESS,
  },
  {
    taskId: "2",
    taskCode: "smiles",
    taskType: "分子结构SMILES转换",
    createTime: "2023-10-15 10:45",
    status: TASK_STATUS.RUNNING,
  },
  {
    taskId: "3",
    taskCode: "reaction",
    taskType: "反应方程式结构化信息提取",
    createTime: "2023-10-15 11:20",
    status: TASK_STATUS.CREATE_BUT_NOT_START,
  },
  {
    taskId: "4",
    taskCode: "reaxys",
    taskType: "Reaxys化学文献ETE结构化信息抽取",
    createTime: "2023-10-14 16:10",
    status: TASK_STATUS.FAIL,
  },
  {
    taskId: "5",
    taskCode: "text",
    taskType: "化学有机合成文本描述信息抽取",
    createTime: "2023-10-14 14:25",
    status: TASK_STATUS.SUCCESS,
  },
  {
    taskId: "6",
    taskCode: "smiles",
    taskType: "分子结构SMILES转换",
    createTime: "2023-10-13 11:30",
    status: TASK_STATUS.SUCCESS,
  },
  {
    taskId: "7",
    taskCode: "reaction",
    taskType: "反应方程式结构化信息提取",
    createTime: "2023-10-13 09:45",
    status: TASK_STATUS.FAIL,
  },
  {
    taskId: "8",
    taskCode: "reaxys",
    taskType: "Reaxys化学文献ETE结构化信息抽取",
    createTime: "2023-10-12 15:20",
    status: TASK_STATUS.RUNNING,
  },
  {
    taskId: "9",
    taskCode: "text",
    taskType: "化学有机合成文本描述信息抽取",
    createTime: "2023-10-12 10:15",
    status: TASK_STATUS.CREATE_BUT_NOT_START,
  },
  {
    taskId: "10",
    taskCode: "smiles",
    taskType: "分子结构SMILES转换",
    createTime: "2023-10-11 16:40",
    status: TASK_STATUS.SUCCESS,
  },
  {
    taskId: "11",
    taskCode: "smiles",
    taskType: "分子结构SMILES转换",
    createTime: "2023-10-11 16:40",
    status: TASK_STATUS.SUCCESS,
  },
];

// 分页和查询参数
const currentPage = ref(1);
const pageSize = ref(5);
const total = ref(0);
const loading = ref(false);

// 查询参数
const queryParams = reactive({
  taskId: "",
  taskType: "",
  status: "",
  dateRange: [],
  sortField: "",
  sortOrder: "",
});

// 表格数据
const tableData = ref([]);

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
  // 使用路由跳转到详情页并传递任务数据
  router.push({
    path: "/task-detail",
    query: {
      task: JSON.stringify(row),
    },
  });
};

// 模拟API请求获取任务列表
const fetchTasks = async () => {
  loading.value = true;

  // 模拟网络延迟
  await new Promise((resolve) => setTimeout(resolve, 500));

  // 筛选数据
  let filteredData = [...mockApiData];

  // 根据任务ID筛选
  if (queryParams.taskId) {
    filteredData = filteredData.filter((item) => item.taskId.includes(queryParams.taskId));
  }

  // 根据任务类型筛选
  if (queryParams.taskType) {
    filteredData = filteredData.filter((item) => item.taskCode === queryParams.taskType);
  }

  // 根据状态筛选
  if (queryParams.status !== "") {
    filteredData = filteredData.filter((item) => item.status === parseInt(queryParams.status));
  }

  // 根据日期范围筛选
  if (queryParams.dateRange && queryParams.dateRange.length === 2) {
    const [startDate, endDate] = queryParams.dateRange;
    filteredData = filteredData.filter((item) => {
      const taskDate = new Date(item.createTime);
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      return taskDate >= start && taskDate <= end;
    });
  }

  // 根据排序字段排序
  if (queryParams.sortField) {
    filteredData.sort((a, b) => {
      const field = queryParams.sortField;
      if (field === "taskId" || field === "createTime") {
        if (queryParams.sortOrder === "ascending") {
          return a[field] > b[field] ? 1 : -1;
        } else {
          return a[field] < b[field] ? 1 : -1;
        }
      } else if (field === "taskType") {
        if (queryParams.sortOrder === "ascending") {
          return a.taskCode > b.taskCode ? 1 : -1;
        } else {
          return a.taskCode < b.taskCode ? 1 : -1;
        }
      }
      return 0;
    });
  }

  // 更新总记录数
  total.value = filteredData.length;

  // 分页
  const startIndex = (currentPage.value - 1) * pageSize.value;
  const endIndex = startIndex + pageSize.value;
  tableData.value = filteredData.slice(startIndex, endIndex);

  loading.value = false;
};

// 搜索任务
const searchTasks = () => {
  currentPage.value = 1; // 重置为第一页
  fetchTasks();
};

// 重置查询条件
const resetQuery = () => {
  queryParams.taskId = "";
  queryParams.taskType = "";
  queryParams.status = "";
  queryParams.dateRange = [];
  queryParams.sortField = "";
  queryParams.sortOrder = "";
  currentPage.value = 1;
  fetchTasks();
};

// 刷新任务列表 - 虽然保留方法定义，但不再有调用入口
// const refreshTasks = () => {
//   fetchTasks();
// };

// 处理分页大小变化
const handlePageSizeChange = (newSize) => {
  pageSize.value = newSize;
  currentPage.value = 1; // 重置为第一页
  fetchTasks();
};

// 处理当前页码变化
const handleCurrentChange = (newPage) => {
  currentPage.value = newPage;
  fetchTasks();
};

// 处理表格排序变化
const handleSortChange = ({ prop, order }) => {
  queryParams.sortField = prop;
  queryParams.sortOrder = order === "ascending" ? "ascending" : "descending";
  currentPage.value = 1; // 重置为第一页
  fetchTasks();
};

// 页面加载时获取任务列表
onMounted(() => {
  fetchTasks();
});
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

/* 查询区域样式 */
.query-area {
  margin-bottom: 15px;
}

.query-card {
  padding: 15px;
  background-color: #f8fafc;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

/* 表格加载状态样式 */
.el-loading {
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 表格无数据状态样式 */
.no-data {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 50px 0;
}

/* 表格样式优化 */
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

/* 分页控件样式 */
.pagination {
  padding: 10px 0;
  margin-top: 20px;
  border-top: 1px solid #eee;
}

.pagination .el-pagination {
  display: flex;
  align-items: center;
}

.pagination .el-pagination__total {
  margin-right: 10px;
}

.pagination .el-pagination__sizes {
  margin-right: 10px;
}

.pagination .el-pagination__jump {
  margin-left: 10px;
}

/* 分页统计信息样式 */
.pagination .text-sm {
  font-size: 13px;
  color: #606266;
}
</style>
