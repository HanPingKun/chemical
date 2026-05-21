<template>
  <div class="app-container">
    <!-- 🔎 搜索区 -->
    <div class="search-bar">
      <el-form ref="queryFormRef" :model="queryParams" :inline="true">
        <el-form-item prop="keywords" label="关键字">
          <el-input
            v-model="queryParams.keywords"
            placeholder="文件名搜索"
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
        :data="reactionList"
        highlight-current-row
        border
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="55" align="center" />
        <el-table-column label="模型文件" prop="modelname" min-width="200" />
        <el-table-column label="下载" width="100" align="center">
          <template #default="{ row }">
            <el-button type="primary" link @click="downloadFile(row)">下载</el-button>
          </template>
        </el-table-column>
        <el-table-column label="创建时间" prop="time" width="220" align="center" />
      </el-table>

      <pagination
        v-if="total > 0"
        v-model:total="total"
        v-model:page="queryParams.pageNum"
        v-model:limit="queryParams.pageSize"
        @pagination="handleQuery"
      />
    </el-card>

    <!-- 📝 表单弹窗 -->
    <el-dialog
      v-model="dialog.visible"
      :title="dialog.title"
      width="700px"
      @close="handleCloseDialog"
    >
      <el-form ref="reactionFormRef" :model="formData" class="custom-form" status-icon>
        <div class="upload-wrapper">
          <label class="upload-label">上传模型文件</label>
          <el-upload
            v-model:file-list="formData.fileList"
            drag
            :show-file-list="true"
            name="modelfile"
            action="/api/upload/model"
            :before-upload="beforeUpload"
            :on-success="handleUploadSuccess"
            class="upload-area"
          >
            <el-icon><UploadFilled /></el-icon>
            <div class="el-upload__text">
              请上传excel格式文件并将待预测反应完整smiles列名设置为reaction，标签数据列名设置为ClassId并从0开始顺序排列，真实类型名列名设置为ClassName
            </div>
          </el-upload>
        </div>
      </el-form>
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
import RoleAPI from "@/api/system/role.api";

const queryFormRef = ref(null);
const reactionFormRef = ref(null);
const loading = ref(false);
const ids = ref([]);
const total = ref(0);
const reactionList = ref([]);

const queryParams = reactive({ pageNum: 1, pageSize: 20, keywords: "" });

function handleQuery() {
  loading.value = true;
  RoleAPI.getPage(queryParams)
    .then((data) => {
      reactionList.value = data.list;
      total.value = data.total;
    })
    .finally(() => {
      loading.value = false;
    });
}

function handleResetQuery() {
  if (queryFormRef.value) queryFormRef.value.resetFields();
  queryParams.pageNum = 1;
  handleQuery();
}

function handleSelectionChange(selection) {
  ids.value = selection.map((item) => item.id);
}

const dialog = reactive({ title: "新建任务", visible: false });

const formData = reactive({
  modelFile: null,
  fileList: [],
});

function handleOpenDialog() {
  dialog.visible = true;
}

function handleCloseDialog() {
  dialog.visible = false;
  formData.fileList = [];
  if (reactionFormRef.value) reactionFormRef.value.resetFields();
}

function beforeUpload(file) {
  const isExcel =
    file.type === "application/vnd.ms-excel" ||
    file.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  if (!isExcel) {
    ElMessage.error("只能上传 Excel 格式文件 (.xls 或 .xlsx)");
    return false;
  }
  return true;
}

function handleUploadSuccess(response, file, _fileList) {
  ElMessage.success(`${file.name} 上传成功`);
}

function handleSubmit() {
  if (formData.fileList.length === 0) {
    ElMessage.warning("请先上传文件");
    return;
  }
  ElMessage.success("提交成功");
  handleCloseDialog();
  handleQuery();
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
    RoleAPI.deleteByIds(ids.value.join(","))
      .then(() => {
        ElMessage.success("删除成功");
        handleQuery();
      })
      .finally(() => {
        loading.value = false;
      });
  });
}

function downloadFile(row) {
  const url = `/api/download/model/${row.id}`;
  const link = document.createElement("a");
  link.href = url;
  link.download = row.modelname || "model.xlsx";
  link.click();
}

onMounted(() => {
  handleQuery();
});
</script>

<style scoped>
.custom-form .el-form-item {
  margin-bottom: 22px;
}

.upload-wrapper {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.upload-label {
  font-weight: 600;
  align-self: flex-start;
  margin-bottom: 4px;
  font-size: 14px;
}

.upload-area {
  width: 100%;
  border: 2px dashed var(--el-border-color);
  border-radius: 6px;
  background-color: var(--el-fill-color-light);
  padding: 18px;
  text-align: center;
}

.dialog-footer {
  text-align: right;
}

.mb-10px {
  margin-bottom: 10px;
}
</style>
