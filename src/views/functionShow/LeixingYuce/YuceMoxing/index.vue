<!-- src\views\functionShow\LeixingYuce\YuceMoxing\index.vue -->
<template>
  <div class="app-container">
    <!-- 🔎 搜索区 -->
    <div class="search-bar">
      <!-- ref="queryFormRef" 用于给该表单组件设置引用，可以在 JavaScript 中直接访问该表单。:model="queryParams" 是绑定数据模型 queryParams -->
      <el-form ref="queryFormRef" :model="queryParams" :inline="true">
        <el-form-item prop="reactionSmiles" label="关键字">
          <el-input v-model="queryParams.reactionSmiles" placeholder="反应smiles搜索" clearable @keyup.enter="handleQuery" />
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
      <!-- ref="dataTableRef"：给这个表格组件设置了一个引用名称 dataTableRef，可以通过 Vue 的 this.$refs.dataTableRef 来访问该表格实例。
       表格的数据源是 reactionList，它是绑定到 Vue 实例的一个数据属性，通常是一个数组或对象，表格将显示这个数据。 -->
      <el-table ref="dataTableRef" v-loading="loading" :data="reactionList" highlight-current-row border
        @selection-change="handleSelectionChange">
        <el-table-column type="selection" width="55" align="center" />
        <el-table-column label="反应smiles表达式" prop="reactionSmiles" min-width="160" />
        <el-table-column label="预测模型" prop="predictModel" width="150" align="center" />
        <el-table-column label="反应类型" prop="reactionClass" width="150" align="center" />
        <el-table-column label="创建时间" prop="createTime" width="200" align="center">
          <template #default="{ row }">
            <span>{{ formatDateTime(row.createTime) }}</span>
          </template>
        </el-table-column>
      </el-table>

      <pagination v-if="total > 0" v-model:total="total" v-model:page="queryParams.current"
        v-model:limit="queryParams.size" @pagination="handleQuery" />
    </el-card>

    <!-- 📝 表单弹窗 
     v-model="dialog.visible"：控制对话框的显示与隐藏。dialog.visible 是 Vue 数据模型中的一个变量，用于绑定对话框的显示状态。
    :title="dialog.title"：动态设置对话框的标题，标题内容来自 Vue 数据模型中的 dialog.title。
    width="760px"：设置对话框的宽度为 760px。
    @close="handleCloseDialog"：当对话框关闭时触发 handleCloseDialog 方法。-->
    <el-dialog v-model="dialog.visible" :title="dialog.title" width="760px" :close-on-click-modal="false"
      :before-close="handleBeforeClose" @close="handleAfterClose">
      <!-- 给表单设置引用，允许通过 this.$refs.reactionFormRef 在代码中访问该表单。
       表单数据与 formData 变量进行双向绑定，formData 包含了表单中所有输入字段的值。 -->
      <el-form ref="reactionFormRef" :model="formData" :rules="formRules" label-width="140px" class="custom-form"
        status-icon>
        <el-form-item label="输入方式" prop="singleInputType">
          <el-radio-group v-model="formData.singleInputType">
            <el-radio label="smiles">完整smiles表达式输入</el-radio>
            <el-radio label="split">单独输入反应物、反应条件、产物</el-radio>
          </el-radio-group>
        </el-form-item>

        <!-- ✔ smiles 一行输入 -->
        <el-form-item v-if="formData.singleInputType === 'smiles'" label="smiles字符串" prop="reactionsmiles">
          <el-input v-model="formData.reactionsmiles" placeholder="请输入完整的smiles表达式" />
        </el-form-item>

        <!-- ✔ 拆分输入 -->
        <!-- v-else：这是 Vue.js 的条件渲染指令。在 v-if 为 false 时，这段代码将会被渲染出来。即当 formData.singleInputType 不是 'smiles' 时，渲染这部分内容。 -->
        <template v-else>
          <el-divider content-position="left">拆分输入区</el-divider>
          <!-- v-for="(section, sectionKey) in splitInputSections"：v-for 是 Vue.js 的一个循环指令，用于遍历数组或对象。
           在这里，splitInputSections 是一个数组（或对象），每个元素代表一个拆分输入的部分。
           section 是每一项的值（一个对象），sectionKey 是该项的键（唯一标识符）。
          :key="sectionKey"：在循环中为每个元素设置一个唯一的 key，以便 Vue 更高效地渲染和更新 DOM。 -->
          <div v-for="(section, sectionKey) in splitInputSections" :key="sectionKey">
            <el-form-item :label="section.label">
              <div v-for="(item, idx) in formData[sectionKey]" :key="idx" class="split-row">
                <el-input v-model="item.value" placeholder="请输入 SMILES" class="input-smiles" />
                <el-button :icon="Plus" size="small" circle plain @click="addInput(sectionKey)" />
                <el-button v-if="formData[sectionKey].length > 1" :icon="Minus" size="small" circle plain
                  @click="removeInput(sectionKey, idx)" />
              </div>
            </el-form-item>
          </div>
        </template>

        <!-- 模型选择 -->
        <el-divider content-position="left">模型配置</el-divider>
        <el-form-item label="选择反应模型" prop="defaultmodel">
          <el-select v-model="formData.defaultmodel" placeholder="选择模型" style="width: 260px">
            <el-option label="10大类分类模型" :value="10" />
            <el-option label="50类分类模型" :value="50" />
            <el-option label="自行上传模型文件" :value="'custom'" />
          </el-select>
        </el-form-item>

        <!-- 自定义模型上传，仅当选择 custom 时展示 -->
        <el-form-item v-if="formData.defaultmodel === 'custom'" label="上传模型文件" prop="modelFile">
          <el-upload ref="modelUploadRef" v-model:file-list="modelFileList" action="/api/upload/model" name="usermodel"
            drag :limit="1" :auto-upload="false" :on-change="handleModelFileChange" :show-file-list="true"
            :on-success="handleModelUploadSuccess" class="upload-area">
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

      <!-- ✅ Dialog footer 放在 el-dialog 作用域 -->
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="CloseDialog" :disabled="submitting">取消</el-button>
          <el-button type="primary" @click="handleSubmit" :loading="submitting" :disabled="submitting">
            {{ submitting ? '处理中...' : '提交' }}
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from "vue";
import { ElMessage, ElMessageBox, ElLoading } from "element-plus";
import { UploadFilled, Plus, Minus, Search, Refresh, Delete } from "@element-plus/icons-vue";
import ClassifySingleAPI from "@/api/system/classifysingle.api";
function formatDateTime(isoString) {
  if (!isoString) return "";
  // new Date() 会自动将 ISO 字符串转换为浏览器本地时区的时间
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
const reactionFormRef = ref(null);
const modelUploadRef = ref(null); // For custom model upload component

// --- Table and Query State ---
const loading = ref(false);
const ids = ref([]);
const total = ref(0);
const reactionList = ref([]);
const queryParams = reactive({ current: 1, size: 15, reactionSmiles: "" });

// --- Dialog and Form State ---
const dialog = reactive({ title: "新建任务", visible: false });
const modelFileList = ref([]); // For custom model file list

const getInitialFormData = () => ({
  singleInputType: "smiles",
  reactionsmiles: "",
  defaultmodel: 10,
  Reactant: [{ value: "", inputType: "smiles" }],
  condition: [{ value: "", inputType: "smiles" }],
  product: [{ value: "", inputType: "smiles" }],
});

const formData = reactive(getInitialFormData());

// --- Form Validation Rules ---
const validateModelFile = (rule, value, callback) => {
  if (formData.defaultmodel === "custom" && modelFileList.value.length === 0) {
    callback(new Error("请上传模型文件"));
  } else {
    callback();
  }
};

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
  modelFile: [{ validator: validateModelFile, trigger: "change" }],
});

const splitInputSections = {
  Reactant: { label: "反应物" },
  condition: { label: "反应条件" },
  product: { label: "产物" },
};

// --- Core Functions ---

function handleQuery() {
  loading.value = true;
  ClassifySingleAPI.getPage(queryParams)
    .then((data) => {
      reactionList.value = data.records;
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
    ClassifySingleAPI.deleteByIds(ids.value)
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

/**
 * 关闭前钩子：用户点 X / 按 Esc 时触发，可拦截
 */
function handleBeforeClose(done) {
  if (submitting.value) {
    ElMessage.warning("正在提交中，请稍候...");
    return;  // 不调 done()，弹窗保持打开
  }
  done();  // 放行
}

/**
 * 关闭后清理：弹窗实际关闭后执行（无论哪种关闭方式都触发）
 * 这里只做清理，不再做拦截判断，避免循环触发
 */
function handleAfterClose() {
  Object.assign(formData, getInitialFormData());
  if (reactionFormRef.value) reactionFormRef.value.resetFields();
  modelFileList.value = [];
  if (modelUploadRef.value) modelUploadRef.value.clearFiles();
}

/**
 * 主动关闭弹窗（取消按钮、代码内部调用）
 */
function closeDialog() {
  dialog.visible = false;
}


// 标记是否正在提交，防止重复触发（即使按钮没禁用也保险）
const submitting = ref(false);

function handleSubmit() {
  // 第 1 道防线：JS 标记位拦截快速重复点击
  if (submitting.value) {
    return;
  }

  reactionFormRef.value.validate((valid) => {
    if (!valid) return;

    // ===== 表单数据组装（保持原有逻辑） =====
    const formDataPayload = new FormData();
    formDataPayload.append("inputType", formData.singleInputType);
    const customModelValue = formData.defaultmodel === "custom" ? 0 : 1;
    formDataPayload.append("customModel", String(customModelValue));

    let predictModelValue = "";
    if (formData.defaultmodel === 10) {
      predictModelValue = "10";
    } else if (formData.defaultmodel === 50) {
      predictModelValue = "50";
    } else if (formData.defaultmodel === "custom" && modelFileList.value.length > 0) {
      predictModelValue = modelFileList.value[0].name;
    }
    formDataPayload.append("predictModel", predictModelValue);

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

    if (customModelValue === 0 && modelFileList.value.length > 0) {
      formDataPayload.append("modelFile", modelFileList.value[0].raw);
    }

    // ===== 提交流程：上锁 + Loading =====
    submitting.value = true;       // 第 1 道：上锁
    loading.value = true;          // 旧的 loading 标志（按钮状态用）

    // 第 2 道：全屏遮罩
    const loadingInstance = ElLoading.service({
      lock: true,                                // 锁住背景
      text: "正在预测中，请稍候...（预计耗时几秒到几十秒）",
      background: "rgba(0, 0, 0, 0.6)",
    });

    ClassifySingleAPI.createSingleTask(formDataPayload)
      .then(() => {
        ElMessage.success("预测成功");
        closeDialog();
        handleQuery();              // 自动刷新历史记录
      })
      .catch((err) => {
        console.error("任务提交失败:", err);
        // 不再额外弹错误提示，因为 axios 拦截器已经统一处理了 ElMessage.error
        // 只在控制台打印，方便排查
      })
      .finally(() => {
        loadingInstance.close();    // 关闭遮罩
        loading.value = false;
        submitting.value = false;   // 第 1 道：解锁
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

function handleModelFileChange(file, fileList) {
  // If a new file is added (and it's the only one due to limit:1)
  if (fileList.length === 1 && file.status === "ready") {
    modelFileList.value = [file];
    ElMessage.success(`模型文件 ${file.name} 已准备好，将在提交时上传`);
  } else if (fileList.length === 0) {
    // If the file is removed
    modelFileList.value = [];
  }
}

onMounted(() => {
  handleQuery();
});
</script>

<style scoped>
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

.dialog-footer {
  text-align: right;
}

.mb-10px {
  margin-bottom: 10px;
}
</style>
