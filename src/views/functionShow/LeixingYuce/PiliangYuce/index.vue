<!-- src\views\functionShow\LeixingYuce\PiliangYuce -->
<template>
  <div class="app-container">
    <!-- 🔎 搜索区 -->
    <div class="search-bar">
      <el-form ref="queryFormRef" :model="queryParams" :inline="true">
        <el-form-item prop="taskName" label="关键字">
          <el-input v-model="queryParams.taskName" placeholder="任务名称搜索" clearable @keyup.enter="handleQuery" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Search" @click="handleQuery">搜索</el-button>
          <el-button :icon="Refresh" @click="handleResetQuery">重置</el-button>
        </el-form-item>
      </el-form>
    </div>

    <!-- 📄 数据区 -->
    <el-card shadow="never">
      <div class="mb-10px header-bar">
        <div>
          <el-button type="success" :icon="Plus" @click="handleOpenDialog">新增</el-button>
          <el-button type="danger" :disabled="ids.length === 0" :icon="Delete" @click="handleDelete">
            删除
          </el-button>
        </div>
        <!-- 轮询提示 -->
        <div v-if="isPolling" class="polling-tip">
          <el-icon class="is-loading">
            <Loading />
          </el-icon>
          <span>检测到处理中的任务，每 5 秒自动刷新</span>
        </div>
      </div>

      <el-table ref="dataTableRef" v-loading="loading" :data="taskList" highlight-current-row border
        @selection-change="handleSelectionChange">
        <el-table-column type="selection" width="55" align="center" />
        <el-table-column label="任务名称" prop="taskName" min-width="160" />
        <el-table-column label="预测模型" prop="predictModel" width="150" align="center" />

        <!-- 状态列：彩色 tag + 失败原因 tooltip -->
        <el-table-column label="状态" prop="status" width="120" align="center">
          <template #default="{ row }">
            <el-tooltip v-if="row.status === 'FAILED' && row.remark" :content="row.remark" placement="top" effect="dark">
              <el-tag :type="getStatusTagType(row.status)" effect="light">
                {{ getStatusText(row.status) }}
              </el-tag>
            </el-tooltip>
            <el-tag v-else :type="getStatusTagType(row.status)" effect="light">
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="结果下载" width="100" align="center">
          <template #default="{ row }">
            <el-button :disabled="!row.excelDownload" type="primary" link @click="downloadFile(row)">
              下载
            </el-button>
          </template>
        </el-table-column>
        <el-table-column label="创建时间" prop="createTime" width="200" align="center">
          <template #default="{ row }">
            <span>{{ formatDateTime(row.createTime) }}</span>
          </template>
        </el-table-column>
      </el-table>

      <pagination v-if="total > 0" v-model:total="total" v-model:page="queryParams.current"
        v-model:limit="queryParams.size" @pagination="handleQuery" />
    </el-card>

    <!-- 📝 表单弹窗 -->
    <el-dialog v-model="dialog.visible" :title="dialog.title" width="760px" :close-on-click-modal="false"
      :before-close="handleBeforeClose" @close="handleAfterClose">
      <el-form ref="batchFormRef" :model="formData" :rules="formRules" label-width="140px" class="custom-form"
        status-icon>
        <el-divider content-position="left">批量预测数据</el-divider>
        <el-form-item label="任务名称" prop="taskName">
          <el-input v-model="formData.taskName" placeholder="请输入任务名称" />
        </el-form-item>
        <el-form-item label="上传excel反应数据" prop="excelFile">
          <el-upload ref="excelUploadRef" v-model:file-list="excelFileList" drag :limit="1" :auto-upload="false"
            :on-change="handleExcelFileChange" class="upload-area">
            <el-icon>
              <UploadFilled />
            </el-icon>
            <div class="el-upload__text">
              请上传excel格式文件并将待预测反应完整smiles列名设置为"reaction"
            </div>
          </el-upload>
        </el-form-item>

        <el-divider content-position="left">模型配置</el-divider>
        <el-form-item label="选择反应模型" prop="defaultmodel">
          <el-select v-model="formData.defaultmodel" placeholder="选择模型" style="width: 260px">
            <el-option label="10大类分类模型" :value="10" />
            <el-option label="50类分类模型" :value="50" />
            <el-option label="自行上传模型文件" :value="'custom'" />
          </el-select>
        </el-form-item>

        <el-form-item v-if="formData.defaultmodel === 'custom'" label="上传模型文件" prop="modelFile">
          <el-upload ref="modelUploadRef" v-model:file-list="modelFileList" drag :limit="1" :auto-upload="false"
            :on-change="handleModelFileChange" class="upload-area">
            <el-icon>
              <UploadFilled />
            </el-icon>
            <div class="el-upload__text">
              拖拽文件到此处，或
              <em>点击上传</em>
            </div>
          </el-upload>
        </el-form-item>
      </el-form>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="closeDialog" :disabled="submitting">取消</el-button>
          <el-button type="primary" @click="handleSubmit" :loading="submitting" :disabled="submitting">
            {{ submitting ? '提交中...' : '提交' }}
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onBeforeUnmount, computed } from "vue";
import { ElMessage, ElMessageBox, ElLoading } from "element-plus";
import { UploadFilled, Plus, Search, Refresh, Delete, Loading } from "@element-plus/icons-vue";
import ClassifyBatchAPI from "@/api/system/classifybatch.api";

// --- Refs for components ---
const queryFormRef = ref(null);
const batchFormRef = ref(null);
const excelUploadRef = ref(null);
const modelUploadRef = ref(null);

// --- Table and Query State ---
const loading = ref(false);
const ids = ref([]);
const total = ref(0);
const taskList = ref([]);
const queryParams = reactive({ current: 1, size: 15, taskName: "" });

// --- Dialog and Form State ---
const dialog = reactive({ title: "新建批量任务", visible: false });
const excelFileList = ref([]);
const modelFileList = ref([]);

// 提交锁
const submitting = ref(false);

// --- 轮询相关 ---
const POLL_INTERVAL = 5000; // 5 秒
const pollingTimer = ref(null);
const isPolling = computed(() => pollingTimer.value !== null);

const getInitialFormData = () => ({
  taskName: "",
  defaultmodel: 10,
});
const formData = reactive(getInitialFormData());

const formRules = reactive({
  taskName: [{ required: true, message: "请输入任务名称", trigger: "blur" }],
  excelFile: [
    {
      required: true,
      validator: (rule, value, callback) => {
        if (excelFileList.value.length === 0) {
          callback(new Error("请上传Excel文件"));
        } else {
          callback();
        }
      },
      trigger: "change",
    },
  ],
  modelFile: [
    {
      validator: (rule, value, callback) => {
        if (formData.defaultmodel === "custom" && modelFileList.value.length === 0) {
          callback(new Error("请上传模型文件"));
        } else {
          callback();
        }
      },
      trigger: "change",
    },
  ],
});

// ===== 工具函数 =====
function formatDateTime(isoString) {
  if (!isoString) return "";
  const date = new Date(isoString);
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  const seconds = date.getSeconds().toString().padStart(2, "0");
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * 状态对应的 tag 颜色类型
 */
function getStatusTagType(status) {
  switch (status) {
    case 'SUCCESS':
      return 'success';     // 绿色
    case 'FAILED':
      return 'danger';      // 红色
    case 'PROCESSING':
      return 'warning';     // 橙色
    case 'SUBMITTED':
    default:
      return 'info';        // 灰色
  }
}

/**
 * 状态对应的中文文案
 */
function getStatusText(status) {
  switch (status) {
    case 'SUCCESS':
      return '已完成';
    case 'FAILED':
      return '失败';
    case 'PROCESSING':
      return '处理中';
    case 'SUBMITTED':
      return '处理中';
    default:
      return status || '未知';
  }
}

/**
 * 任务"长时间未完成"的超时阈值（毫秒）
 * 超过这个时间还在 SUBMITTED/PROCESSING 状态的，视为"已僵尸"，不再轮询
 */
const TASK_PENDING_TIMEOUT_MS = 30 * 60 * 1000; // 30 分钟

/**
 * 判断任务是否处于"待完成"状态
 * 1. 状态必须是 SUBMITTED 或 PROCESSING
 * 2. 创建时间必须在超时阈值内
 *    （超过阈值的视为僵尸任务，可能是服务异常导致，不应导致前端永远轮询）
 */
function isTaskPending(task) {
  if (task.status !== 'SUBMITTED' && task.status !== 'PROCESSING') {
    return false;
  }
  // 创建时间超过阈值 → 视为僵尸，不算 pending
  if (task.createTime) {
    const createMs = new Date(task.createTime).getTime();
    const elapsed = Date.now() - createMs;
    if (elapsed > TASK_PENDING_TIMEOUT_MS) {
      return false;
    }
  }
  return true;
}

/**
 * 当前列表里是否有未完成任务
 */
function hasPendingTasks() {
  return taskList.value.some(isTaskPending);
}

// ===== 轮询逻辑 =====
function startPolling() {
  if (pollingTimer.value !== null) return;
  pollingTimer.value = setInterval(() => {
    if (!hasPendingTasks()) {
      stopPolling();
      return;
    }
    silentRefresh();
  }, POLL_INTERVAL);
  console.log('[轮询] 已启动，每 5 秒刷新一次');
}

function stopPolling() {
  if (pollingTimer.value !== null) {
    clearInterval(pollingTimer.value);
    pollingTimer.value = null;
    console.log('[轮询] 已停止');
  }
}

/**
 * 静默刷新：不显示 loading，不打扰用户
 */
function silentRefresh() {
  ClassifyBatchAPI.getPage(queryParams)
    .then((data) => {
      taskList.value = data.records;
      total.value = data.total;
      // 如果刷新后没有 pending 任务了，停止轮询
      if (!hasPendingTasks()) {
        stopPolling();
      }
    })
    .catch(() => {
      // 静默失败，避免不停弹错误提示骚扰用户
      console.warn('[轮询] 刷新失败');
    });
}

// ===== 主查询函数（带 loading 的） =====
function handleQuery() {
  loading.value = true;
  ClassifyBatchAPI.getPage(queryParams)
    .then((data) => {
      taskList.value = data.records;
      total.value = data.total;
      // 根据数据状态决定是否启动轮询
      if (hasPendingTasks()) {
        startPolling();
      } else {
        stopPolling();
      }
    })
    .catch(() => ElMessage.error("数据加载失败"))
    .finally(() => {
      loading.value = false;
    });
}

function handleResetQuery() {
  if (queryFormRef.value) queryFormRef.value.resetFields();
  queryParams.current = 1;
  handleQuery();
}

function handleSelectionChange(selection) {
  ids.value = selection.map((item) => item.batchId);
}

function handleDelete() {
  if (!ids.value.length) {
    ElMessage.warning("请先选择数据");
    return;
  }
  ElMessageBox.confirm("确认删除已选中的数据项?", "警告", {
    confirmButtonText: "确定",
    cancelButtonText: "取消",
    type: "warning",
  }).then(() => {
    loading.value = true;
    ClassifyBatchAPI.deleteByIds(ids.value)
      .then(() => {
        ElMessage.success("删除成功");
        handleQuery();
      })
      .finally(() => {
        loading.value = false;
      });
  });
}

function handleOpenDialog() {
  dialog.visible = true;
}

function handleBeforeClose(done) {
  if (submitting.value) {
    ElMessage.warning("正在提交中，请稍候...");
    return;
  }
  done();
}

function handleAfterClose() {
  Object.assign(formData, getInitialFormData());
  if (batchFormRef.value) batchFormRef.value.resetFields();
  excelFileList.value = [];
  modelFileList.value = [];
  if (excelUploadRef.value) excelUploadRef.value.clearFiles();
  if (modelUploadRef.value) modelUploadRef.value.clearFiles();
}

function closeDialog() {
  dialog.visible = false;
}

function handleSubmit() {
  if (submitting.value) return;

  batchFormRef.value.validate((valid) => {
    if (!valid) return;

    const formDataPayload = new FormData();
    formDataPayload.append("taskName", formData.taskName);
    formDataPayload.append("excelFile", excelFileList.value[0].raw);

    const customModelValue = formData.defaultmodel === "custom" ? 0 : 1;
    formDataPayload.append("customModel", String(customModelValue));

    let predictModelValue = "";
    if (formData.defaultmodel === 10) {
      predictModelValue = "10";
    } else if (formData.defaultmodel === 50) {
      predictModelValue = "50";
    } else if (formData.defaultmodel === "custom") {
      predictModelValue = modelFileList.value[0].name;
    }
    formDataPayload.append("predictModel", predictModelValue);

    if (customModelValue === 0) {
      formDataPayload.append("modelFile", modelFileList.value[0].raw);
    }

    submitting.value = true;
    loading.value = true;

    const loadingInstance = ElLoading.service({
      lock: true,
      text: "正在提交批量任务，请稍候...",
      background: "rgba(0, 0, 0, 0.6)",
    });

    ClassifyBatchAPI.create(formDataPayload)
      .then(() => {
        ElMessage.success("任务已提交，正在后台处理");
        closeDialog();
        handleQuery();   // 提交成功后会自动启动轮询（因为新任务是 SUBMITTED 状态）
      })
      .catch((err) => {
        console.error("提交失败:", err);
      })
      .finally(() => {
        loadingInstance.close();
        loading.value = false;
        submitting.value = false;
      });
  });
}

function downloadFile(row) {
  if (row.excelDownload) {
    window.open(row.excelDownload, "_blank");
  } else {
    ElMessage.warning("文件链接无效或任务尚未完成");
  }
}

function handleExcelFileChange(file, fileList) {
  if (fileList.length > 1) fileList.splice(0, 1);
  excelFileList.value = fileList;
  if (batchFormRef.value) batchFormRef.value.validateField("excelFile");
}

function handleModelFileChange(file, fileList) {
  if (fileList.length > 1) fileList.splice(0, 1);
  modelFileList.value = fileList;
  if (batchFormRef.value) batchFormRef.value.validateField("modelFile");
}

// ===== 生命周期 =====
onMounted(() => {
  handleQuery();
});

// 组件销毁前停止轮询，防止内存泄漏
onBeforeUnmount(() => {
  stopPolling();
});
</script>

<style scoped>
.custom-form .el-form-item {
  margin-bottom: 22px;
}

.upload-area {
  width: 100%;
}

.dialog-footer {
  text-align: right;
}

.mb-10px {
  margin-bottom: 10px;
}

.header-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.polling-tip {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--el-color-primary);
  font-size: 13px;
}

.polling-tip .el-icon {
  font-size: 14px;
}
</style>
