<template>
  <div class="app-container">
    <!-- 🔎 搜索区 -->
    <div class="search-bar">
      <el-form ref="queryFormRef" :model="queryParams" :inline="true">
        <el-form-item prop="taskName" label="关键字">
          <el-input
            v-model="queryParams.taskName"
            placeholder="任务名称搜索"
            clearable
            @keyup.enter="handleQuery"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Search" @click="handleQuery">搜索</el-button>
          <el-button :icon="Refresh" @click="handleResetQuery">重置</el-button>
        </el-form-item>
      </el-form>
    </div>

    <!-- 📄 数据区 -->
    <el-card shadow="never">
      <div class="mb-10px">
        <el-button type="success" :icon="Plus" @click="handleOpenDialog">新增</el-button>
        <el-button type="danger" :disabled="ids.length === 0" :icon="Delete" @click="handleDelete">
          删除
        </el-button>
      </div>

      <el-table
        ref="dataTableRef"
        v-loading="loading"
        :data="taskList"
        highlight-current-row
        border
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="55" align="center" />
        <el-table-column label="任务名称" prop="taskName" min-width="160" />
        <!-- Removed 预测模型 column -->
        <el-table-column label="结果下载" width="100" align="center">
          <template #default="{ row }">
            <el-button
              :disabled="!row.excelDownload"
              type="primary"
              link
              @click="downloadFile(row)"
            >
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

      <pagination
        v-if="total > 0"
        v-model:total="total"
        v-model:page="queryParams.current"
        v-model:limit="queryParams.size"
        @pagination="handleQuery"
      />
    </el-card>

    <!-- 📝 表单弹窗 -->
    <el-dialog
      v-model="dialog.visible"
      :title="dialog.title"
      width="760px"
      @close="handleCloseDialog"
    >
      <el-form
        ref="batchFormRef"
        :model="formData"
        :rules="formRules"
        label-width="140px"
        class="custom-form"
        status-icon
      >
        <el-divider content-position="left">批量预测数据</el-divider>
        <el-form-item label="任务名称" prop="taskName">
          <el-input v-model="formData.taskName" placeholder="请输入任务名称" />
        </el-form-item>
        <el-form-item label="上传excel反应数据" prop="excelFile">
          <el-upload
            ref="excelUploadRef"
            v-model:file-list="excelFileList"
            drag
            :limit="1"
            :auto-upload="false"
            :on-change="handleExcelFileChange"
            class="upload-area"
          >
            <el-icon><UploadFilled /></el-icon>
            <div class="el-upload__text">
              请上传excel格式文件并将待预测反应完整smiles列名设置为"reaction"
            </div>
          </el-upload>
        </el-form-item>

        <!-- Removed 模型选择 and 自定义模型上传 sections -->
      </el-form>

      <!-- ✅ Dialog footer 放在 el-dialog 作用域 -->
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="handleCloseDialog">取消</el-button>
          <el-button type="primary" @click="handleSubmit">提交</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { UploadFilled, Plus, Search, Refresh, Delete } from "@element-plus/icons-vue";
// Updated API import
import YieldBatchAPI from "@/api/system/yieldbatch.api";

// --- Refs for components ---
const queryFormRef = ref(null);
const batchFormRef = ref(null);
const excelUploadRef = ref(null);
// Removed modelUploadRef

// --- Table and Query State ---
const loading = ref(false);
const ids = ref([]);
const total = ref(0);
const taskList = ref([]);
const queryParams = reactive({ current: 1, size: 15, taskName: "" });

// --- Dialog and Form State ---
const dialog = reactive({ title: "新建批量产率预测任务", visible: false }); // Updated title
const excelFileList = ref([]);
// Removed modelFileList

const getInitialFormData = () => ({
  taskName: "",
  // Removed defaultmodel
});
const formData = reactive(getInitialFormData());

// --- Form Validation ---
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
  // Removed modelFile validation
});

/**
 * 格式化日期时间
 */
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

// --- Core Functions ---
function handleQuery() {
  loading.value = true;
  YieldBatchAPI.getPage(queryParams) // Updated API call
    .then((data) => {
      taskList.value = data.records;
      total.value = data.total;
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
    YieldBatchAPI.deleteByIds(ids.value) // Updated API call
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

function handleCloseDialog() {
  dialog.visible = false;
  Object.assign(formData, getInitialFormData());
  if (batchFormRef.value) batchFormRef.value.resetFields();
  excelFileList.value = [];
  // Removed modelFileList reset
  if (excelUploadRef.value) excelUploadRef.value.clearFiles();
  // Removed modelUploadRef clearFiles
}

function handleSubmit() {
  batchFormRef.value.validate((valid) => {
    if (!valid) return;

    const formDataPayload = new FormData();

    // 1. 任务名称
    formDataPayload.append("taskName", formData.taskName);

    // 2. Excel 文件
    formDataPayload.append("excelFile", excelFileList.value[0].raw);

    // Removed logic for customModel, predictModel, and modelFile

    loading.value = true;
    YieldBatchAPI.create(formDataPayload) // Updated API call
      .then(() => {
        ElMessage.success("提交成功");
        handleCloseDialog();
        handleQuery();
      })
      .catch((err) => {
        ElMessage.error(err.message || "提交失败，请检查输入");
      })
      .finally(() => {
        loading.value = false;
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

// --- Helper functions for file uploads ---
function handleExcelFileChange(file, fileList) {
  if (fileList.length > 1) {
    fileList.splice(0, 1);
  }
  excelFileList.value = fileList;
  if (batchFormRef.value) {
    batchFormRef.value.validateField("excelFile");
  }
}

// Removed handleModelFileChange

onMounted(() => {
  handleQuery();
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
</style>
