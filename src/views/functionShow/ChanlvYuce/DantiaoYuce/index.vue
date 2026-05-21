<template>
  <div class="app-container">
    <!-- 🔎 搜索区 -->
    <div class="search-bar">
      <el-form ref="queryFormRef" :model="queryParams" :inline="true">
        <el-form-item prop="reactionSmiles" label="关键字">
          <el-input
            v-model="queryParams.reactionSmiles"
            placeholder="反应smiles搜索"
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
        :data="yieldList"
        highlight-current-row
        border
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="55" align="center" />
        <el-table-column label="反应smiles表达式" prop="reactionSmiles" min-width="160" />
        <el-table-column label="预测产率" prop="reactionYield" width="150" align="center" />
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
        ref="yieldFormRef"
        :model="formData"
        :rules="formRules"
        label-width="140px"
        class="custom-form"
        status-icon
      >
        <el-form-item label="输入方式" prop="singleInputType">
          <el-radio-group v-model="formData.singleInputType">
            <el-radio label="smiles">完整smiles表达式输入</el-radio>
            <el-radio label="split">单独输入反应物、反应条件、产物</el-radio>
          </el-radio-group>
        </el-form-item>

        <!-- ✔ smiles 一行输入 -->
        <el-form-item
          v-if="formData.singleInputType === 'smiles'"
          label="smiles字符串"
          prop="reactionsmiles"
        >
          <el-input v-model="formData.reactionsmiles" placeholder="请输入完整的smiles表达式" />
        </el-form-item>

        <!-- ✔ 拆分输入 -->
        <template v-else>
          <el-divider content-position="left">拆分输入区</el-divider>
          <div v-for="(section, sectionKey) in splitInputSections" :key="sectionKey">
            <el-form-item :label="section.label">
              <div v-for="(item, idx) in formData[sectionKey]" :key="idx" class="split-row">
                <el-radio-group v-model="item.inputType" size="small">
                  <el-radio-button label="smiles">smiles</el-radio-button>
                  <el-radio-button label="mol">mol文件</el-radio-button>
                </el-radio-group>

                <el-input
                  v-if="item.inputType === 'smiles'"
                  v-model="item.value"
                  placeholder="输入smiles"
                  class="input-smiles"
                />

                <el-upload
                  v-if="item.inputType === 'mol'"
                  :before-upload="(file) => handleMolUpload(file, sectionKey, idx)"
                  :show-file-list="true"
                  class="upload-mol"
                >
                  <el-button type="primary" link>点击上传mol文件</el-button>
                </el-upload>

                <el-button :icon="Plus" size="small" circle plain @click="addInput(sectionKey)" />
                <el-button
                  v-if="formData[sectionKey].length > 1"
                  :icon="Minus"
                  size="small"
                  circle
                  plain
                  @click="removeInput(sectionKey, idx)"
                />
              </div>
            </el-form-item>
          </div>
        </template>
      </el-form>

      <!-- ✅ Dialog footer -->
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
import { Plus, Minus, Search, Refresh, Delete } from "@element-plus/icons-vue";
import YieldSingleAPI from "@/api/system/yieldsingle.api"; // 导入新的API

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

// --- Refs for components ---
const queryFormRef = ref(null);
const yieldFormRef = ref(null); // 修改 Ref 名称

// --- Table and Query State ---
const loading = ref(false);
const ids = ref([]);
const total = ref(0);
const yieldList = ref([]); // 修改列表名称
const queryParams = reactive({ current: 1, size: 15, reactionSmiles: "" });

// --- Dialog and Form State ---
const dialog = reactive({ title: "新建产率预测任务", visible: false }); // 修改对话框标题

const getInitialFormData = () => ({
  singleInputType: "smiles",
  reactionsmiles: "",
  // 移除模型相关的字段
  Reactant: [{ value: "", inputType: "smiles" }],
  condition: [{ value: "", inputType: "smiles" }],
  product: [{ value: "", inputType: "smiles" }],
});

const formData = reactive(getInitialFormData());

// --- Form Validation Rules ---
const formRules = reactive({
  reactionsmiles: [
    {
      validator: (rule, value, callback) => {
        if (formData.singleInputType === "smiles" && !formData.reactionsmiles) {
          callback(new Error("请输入完整的smiles表达式"));
        } else {
          callback();
        }
      },
      trigger: "blur",
    },
  ],
  // 移除模型文件校验
});

const splitInputSections = {
  Reactant: { label: "反应物" },
  condition: { label: "反应条件" },
  product: { label: "产物" },
};

// --- Core Functions ---

function handleQuery() {
  loading.value = true;
  YieldSingleAPI.getPage(queryParams) // 使用新的API
    .then((data) => {
      yieldList.value = data.records; // 更新列表数据
      total.value = data.total;
    })
    .catch((err) => {
      console.error("获取分页数据失败:", err);
      ElMessage.error("数据加载失败，请稍后重试");
    })
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
  ids.value = selection.map((item) => item.id);
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
    YieldSingleAPI.deleteByIds(ids.value) // 使用新的API
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
  if (yieldFormRef.value) yieldFormRef.value.resetFields();
  // 移除模型相关的重置逻辑
}

function handleSubmit() {
  yieldFormRef.value.validate((valid) => {
    if (!valid) return;

    const formDataPayload = new FormData();

    // 1. inputType: "smiles" or "split"
    formDataPayload.append("inputType", formData.singleInputType);

    // 2. Append other data based on input type
    if (formData.singleInputType === "smiles") {
      formDataPayload.append("reactionSmiles", formData.reactionsmiles);
    } else {
      const reactants = formData.Reactant.map((item) => ({
        inputType: item.inputType,
        value: item.value,
      }));
      const conditions = formData.condition.map((item) => ({
        inputType: item.inputType,
        value: item.value,
      }));
      const products = formData.product.map((item) => ({
        inputType: item.inputType,
        value: item.value,
      }));

      if (reactants.length > 0 && reactants.some((r) => r.value))
        formDataPayload.append(
          "reactants",
          new Blob([JSON.stringify(reactants)], { type: "application/json" })
        );
      if (conditions.length > 0 && conditions.some((c) => c.value))
        formDataPayload.append(
          "conditions",
          new Blob([JSON.stringify(conditions)], { type: "application/json" })
        );
      if (products.length > 0 && products.some((p) => p.value))
        formDataPayload.append(
          "products",
          new Blob([JSON.stringify(products)], { type: "application/json" })
        );
    }

    loading.value = true;
    YieldSingleAPI.createSingleTask(formDataPayload) // 使用新的API
      .then(() => {
        ElMessage.success("提交成功");
        handleCloseDialog();
        handleQuery();
      })
      .catch((err) => {
        console.error("任务提交失败:", err);
        ElMessage.error(err.message ? `提交失败: ${err.message}` : "请检查输入或联系管理员");
      })
      .finally(() => {
        loading.value = false;
      });
  });
}

// --- Helper functions for the form ---

function addInput(key) {
  formData[key].push({ value: "", inputType: "smiles" });
}

function removeInput(key, index) {
  formData[key].splice(index, 1);
}

function handleMolUpload(file, key, index) {
  const reader = new FileReader();
  reader.onload = (e) => {
    formData[key][index].value = e.target.result;
    ElMessage.success(`文件 ${file.name} 已加载`);
  };
  reader.onerror = () => {
    ElMessage.error(`读取文件 ${file.name} 失败`);
  };
  reader.readAsText(file);
  return false;
}

onMounted(() => {
  handleQuery();
});
</script>

<style scoped>
/* 样式与原文件保持一致，无需修改 */
.custom-form .el-form-item {
  margin-bottom: 22px;
}

.split-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 14px;
  padding-left: 14px;
}

.input-smiles {
  width: 260px;
}

.upload-area {
  width: 100%;
  border: 2px dashed var(--el-border-color);
  border-radius: 6px;
  background-color: var(--el-fill-color-light);
  padding: 18px;
  text-align: center;
}

.upload-mol {
  width: 260px;
  display: inline-block;
}

.dialog-footer {
  text-align: right;
}

.mb-10px {
  margin-bottom: 10px;
}

.upload-mol {
  display: flex;
  align-items: center; /* 垂直居中 */
  line-height: normal; /* 重置按钮默认 line-height */
  margin-left: 8px;
}
.upload-mol .el-button {
  padding: 0;
  font-size: 14px;
  height: 32px;
  line-height: 32px;
}
</style>
