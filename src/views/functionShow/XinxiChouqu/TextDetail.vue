<template>
  <div class="task-detail-container">
    <h3>任务详情</h3>
    <el-descriptions column="1" border>
      <el-descriptions-item label="任务ID">{{ taskData.taskId }}</el-descriptions-item>
      <el-descriptions-item label="任务类型">{{ taskData.taskName }}</el-descriptions-item>
      <el-descriptions-item label="状态">{{ getStatusText(taskData.status) }}</el-descriptions-item>
      <el-descriptions-item label="创建时间">{{ taskData.createTime }}</el-descriptions-item>
    </el-descriptions>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { useRoute } from "vue-router";
import { TASK_STATUS } from "./你的原组件路径"; // 引入原组件的任务状态常量，替换实际路径

const route = useRoute();
const taskData = ref({});

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

onMounted(() => {
  // 从路由参数中获取任务数据
  taskData.value = route.query.task;
});
</script>

<style scoped>
.task-detail-container {
  padding: 20px;
}
</style>
