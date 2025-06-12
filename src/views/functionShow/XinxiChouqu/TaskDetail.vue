<template>
  <div class="task-detail-container">
    <div class="page-header flex items-center justify-between mb-4">
      <h3>任务详情</h3>
      <el-button type="text" @click="goBack">返回</el-button>
    </div>

    <el-card class="mb-4">
      <el-descriptions column="2" border>
        <el-descriptions-item label="任务ID">{{ taskData.taskId }}</el-descriptions-item>
        <el-descriptions-item label="任务类型">{{ taskData.taskType }}</el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag :type="getStatusType(taskData.status)">
            {{ getStatusText(taskData.status) }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="创建时间">{{ taskData.createTime }}</el-descriptions-item>
      </el-descriptions>
    </el-card>

    <!-- 可以根据需要添加更多详情内容 -->
    <el-card>
      <h4>任务结果</h4>
      <div v-if="taskData.status === 2" class="result-content">
        <!-- 成功结果展示 -->
        <p>任务已成功完成，结果数据如下：</p>
        <pre>{{ JSON.stringify(taskData.result || {}, null, 2) }}</pre>
      </div>
      <div v-else-if="taskData.status === 3" class="result-content">
        <!-- 失败结果展示 -->
        <p class="text-danger">任务执行失败，错误信息：</p>
        <pre>{{ taskData.error || "未知错误" }}</pre>
      </div>
      <div v-else class="result-content">
        <!-- 处理中或待处理状态 -->
        <p>任务正在处理中，请稍后查看结果</p>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";

const route = useRoute();
const router = useRouter();
const taskData = ref({});

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

// 返回上一页
const goBack = () => {
  router.back();
};

onMounted(() => {
  try {
    // 从路由参数中解析任务数据
    const taskParam = route.query.task;
    if (taskParam) {
      taskData.value = JSON.parse(taskParam);
    } else {
      // 如果没有传递任务数据，显示错误信息
      console.error("未找到任务数据");
      router.push({ path: "/404" });
    }
  } catch (error) {
    console.error("解析任务数据失败:", error);
    router.push({ path: "/404" });
  }
});
</script>

<style scoped>
.task-detail-container {
  padding: 20px;
}

.page-header {
  padding-bottom: 10px;
  border-bottom: 1px solid #eee;
}

.result-content {
  min-height: 100px;
  padding: 15px;
}

pre {
  padding: 10px;
  word-break: break-all;
  white-space: pre-wrap;
  background-color: #f5f5f5;
  border-radius: 4px;
}

.text-danger {
  color: #f56c6c;
}
</style>
