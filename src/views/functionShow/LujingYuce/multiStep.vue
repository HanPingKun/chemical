<!-- 字典项 -->
<template>
  <div class="app-container">

    <!--    搜索栏   -->
    <div class="search-bar mt-5">
      <div slot="header" class="clearfix_search">
        <span>历史搜索</span>
      </div>
      <el-form ref="queryFormRef" :model="queryParams" :inline="true"> <!--  表单   -->
        <el-form-item label="Smiles:" prop="keywords"> <!--  表单   -->
          <el-input v-model="queryParams.keywords" placeholder="例如:COC(=O)C=CC1=C[C@@H](C(C)C)CC[C@H]1C" clearable
            @keyup.enter="handleQuery" style="width: 500px;" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" icon="search" @click="handleQuery()">搜索</el-button>
          <el-button icon="refresh" @click="handleResetQuery()">重置</el-button>
        </el-form-item>
      </el-form>
    </div>

    <!-- 模型选择 -->
    <el-card shadow="never" class="model-card">
      <div slot="header" class="clearfix">
        <span>模型选择</span>
      </div>
      <el-row :gutter="20">
        <el-col :span="12">
          <el-card shadow="hover" class="model-card">
            <div slot="header" class="clearfix">
              <span>当前模型</span>
            </div>
            <el-select v-model="selectedModel" placeholder="请选择模型">
              <el-option v-for="model in models" :key="model.value" :label="model.label" :value="model.value">
              </el-option>
            </el-select>
          </el-card>
        </el-col>
      </el-row>
    </el-card>

    <el-card shadow="never">
      <!--      新增、删除、下载-->
      <div class="mb-[10px]">
        <el-button type="success" icon="plus" @click="handleOpenDialog()">新增</el-button>
        <el-button type="primary" icon="download" @click="download_distry()">下载</el-button>
        <el-button type="danger" :disabled="ids.length === 0" icon="delete" @click="handleDelete()">
          删除
        </el-button>
      </div>

      <el-table v-loading="loading" highlight-current-row :data="tableData" border
        @selection-change="handleSelectionChange">
        <el-table-column type="selection" width="55" align="center" />
        <el-table-column label="ID" prop="ID" />
        <el-table-column label="Smiles" prop="Smiles" />
        <el-table-column label="模型名称" prop="modelName" />
        <el-table-column label="上传时间" prop="uploadTime" />
        <el-table-column label="状态">
          <template #default="scope">
            <el-tag :type="scope.row.status === 1 ? 'success' :
              scope.row.status === 0 ? 'info' :
                scope.row.status === 2 ? 'warning' : 'default'
              ">
              {{
                scope.row.status === 1 ? "成功" :
                  scope.row.status === 0 ? "失败" :
                    scope.row.status === 2 ? "等待" : "未知"
              }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column fixed="right" label="操作" align="center" width="220">
          <template #default="scope">
            <el-button type="primary" link size="small" icon="link" @click.stop="getDetails(scope.row)"><!-- 查询结果 -->
              详情
            </el-button>
            <el-button type="danger" link size="small" icon="delete" @click.stop="handleDelete(scope.row.id)"><!-- 删除-->
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <pagination v-if="total > 0" v-model:total="total" v-model:page="queryParams.pageNum"
        v-model:limit="queryParams.pageSize" @pagination="handleQuery" /> <!--pagination是一个组件 分页变化时触发查询 -->
    </el-card>

    <!--字典项弹窗-->
    <el-dialog v-model="dialog.visible" :title="dialog.title" width="820px" @close="handleCloseDialog">
      <el-form ref="dataFormRef" :model="formData" :rules="computedRules" label-width="100px">
        <el-card shadow="never">
          <!-- 必填项：Smiles -->
          <el-form-item label="Smiles" prop="Smiles">
            <el-input v-model="formData.Smiles" placeholder="请输入Smiles" />
          </el-form-item>

          <!-- 必填项：其他参数 -->
          <el-form-item label="参数1" prop="num1">
            <el-input v-model="formData.num1" placeholder="请输入x1" />
          </el-form-item>

          <el-form-item label="参数2" prop="num2">
            <el-input v-model="formData.num2" placeholder="请输入x2" />
          </el-form-item>

          <el-form-item label="参数3" prop="num3">
            <el-input v-model="formData.num3" placeholder="请输入x3" />
          </el-form-item>
        </el-card>
      </el-form>

      <template #footer>
        <div class="dialog-footer">
          <el-button type="primary" @click="handleSubmitClick">确 定</el-button>
          <el-button @click="handleCloseDialog">取 消</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import DictAPI from "@/api/system/dict.api";
import { useRouter, useRoute } from 'vue-router';
const router = useRouter();

const route = useRoute();

const dictCode = ref(route.query.dictCode);

const queryFormRef = ref();
const dataFormRef = ref();

const loading = ref(false);
const ids = ref([]);
const total = ref(0);

const queryParams = reactive({
  pageNum: 1,
  pageSize: 10,
});

const tableData = ref();

const dialog = reactive({
  title: "",
  visible: false,
});

const formData = reactive({});

const computedRules = computed(() => {
  const rules = {
    value: [{ required: true, message: "请输入字典值", trigger: "blur" }],
    label: [{ required: true, message: "请输入字典标签", trigger: "blur" }],
  };
  return rules;
});



// 查询
function handleQuery() {
  loading.value = true;
  DictAPI.getDictItemPage(dictCode.value, queryParams)  // 调用数据
    .then((data) => {
      tableData.value = data.list;
      total.value = data.total;
    })
    .finally(() => {
      loading.value = false;
    });
}

// 重置查询
function handleResetQuery() {
  queryFormRef.value.resetFields();
  queryParams.pageNum = 1;
  handleQuery();
}

// 行选择
function handleSelectionChange(selection) {
  ids.value = selection.map((item) => item.id);
}

// 打开弹窗
function handleOpenDialog(row) {
  dialog.visible = true;
  // dialog.title = row ? "编辑字典项" : "新增字典项";
  dialog.title = "多步逆合成";

  if (row?.id) {
    DictAPI.getDictItemFormData(dictCode.value, row.id).then((data) => {
      Object.assign(formData, data);
    });
  } else {
    formData.id = undefined;
    formData.status = 1;
    formData.sort = 0;
  }
}

function download_distry(row) {

}

// 详情页
function getDetails(row) {
  console.log(row);
  router.push({
    name: 'DetailPage_multi',
    params: {
      id: row.ID,
    },
    query: {
      id: row.ID,
      smiles: row.Smiles,
      submissionTime: row.uploadTime,
      status: row.status,
      modelName: row.modelName,
    }
  });
}
// function getDetails(row) {
//   console.log(row)
//   router.push({
//     name: 'DetailPage',  // 目标路由名称（需在路由配置中定义）
//     params: {
//       id: row.ID,        // 传递ID作为参数
//       smiles: row.Smiles, // 可选：传递其他字段
//       submissionTime:row.uploadTime,
//       status:row.status,
//       modelName:row.modelName,
//     }
//   });
// }

// 提交表单
function handleSubmitClick() {
  dataFormRef.value.validate((valid) => {
    if (valid) {
      const id = formData.id;
      if (id) {
        DictAPI.updateDictItem(dictCode.value, id, formData).then(() => {
          ElMessage.success("修改成功");
          handleCloseDialog();
          handleResetQuery();
        });
      } else {
        DictAPI.createDictItem(dictCode.value, formData).then(() => {
          ElMessage.success("新增成功");
          handleCloseDialog();
          handleResetQuery();
        });
      }
    }
  });
}

// 关闭弹窗
function handleCloseDialog() {
  dialog.visible = false;
  dataFormRef.value.resetFields();
  dataFormRef.value.clearValidate();
  formData.id = undefined;
}

// 删除字典项
function handleDelete(id) {
  const itemIds = [id || ids.value].join(",");
  if (!itemIds) {
    ElMessage.warning("请勾选删除项");
    return;
  }
  ElMessageBox.confirm("确认删除已选中的数据项?", "警告", {
    confirmButtonText: "确定",
    cancelButtonText: "取消",
    type: "warning",
  }).then(
    () => {
      DictAPI.deleteDictItems(dictCode.value, itemIds).then(() => {
        ElMessage.success("删除成功");
        handleResetQuery();
      });
    },
    () => {
      ElMessage.info("已取消删除");
    }
  );
}

onMounted(() => {
  handleQuery();
});
</script>

<style scoped>
.model-card {
  margin-bottom: 20px;
}

.clearfix {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.clearfix_search {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.upload-demo {
  width: 100%;
  height: 200px;
  border: 1px dashed #d9d9d9;
  border-radius: 6px;
  background-color: #fafafa;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  font-size: 20px;
  color: #909399;
}
</style>
