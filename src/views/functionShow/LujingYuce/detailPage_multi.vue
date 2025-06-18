<template>
  <div class="detail-container">
    <el-card shadow="never" class="detail-card">
      <div>
        <h3>多步逆合成详情页面</h3>
      </div>
      <el-table :data="detailData" border style="width: 100%" :fit="true">
        <!-- 百分比宽度 -->
        <el-table-column prop="id" label="ID" width="75"></el-table-column>
        <el-table-column prop="smiles" label="Smiles" width="200"></el-table-column>
        <el-table-column prop="submissionTime" label="提交时间" width="200"></el-table-column>
        <el-table-column prop="status" label="任务状态" width="100">
          <template #default="scope">
            <!-- statusType(scope.row.status) -->
            <el-tag :type="statusType(scope.row.status)">
              {{

                scope.row.status === '1' ? "成功" :
                  scope.row.status === '0' ? "失败" :
                    scope.row.status === '2' ? "等待" : "未知"

              }}

            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="modelName" label="模型名称" width="100"></el-table-column>
        <el-table-column label="备注">
          <!-- 从数据库里面拿 -->
        </el-table-column>
      </el-table>
    </el-card>

    <el-card shadow="never" class="detail-card" style="margin-top: 20px;">
      <div class="reaction-results">
        <el-table :data="reactionData" border style="width: 100%">
          <el-table-column prop="topN" label="Top-N" width="100"></el-table-column>
          <el-table-column prop="score" label="分数" width="100"></el-table-column>
          <el-table-column prop="reaction" label="反应式"></el-table-column>
          <el-table-column prop="image" label="图片" width="180">
            <template #default="scope">
              <img :src="scope.row.image" alt="反应图片" style="max-width: 100%; height: auto;">
            </template>
          </el-table-column>
        </el-table>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted, watchEffect } from 'vue';
import { useRoute } from 'vue-router';
import { ElMessage } from 'element-plus';

const route = useRoute();

const detailData = ref([
  // 模拟数据
  { id: '12345', smiles: 'COC(=O)C=CC1=C[C@@H](C(C)C)CC[C@H]1C', submissionTime: '2024-05-20 10:00:00', status: 1, modelName: '模型A', remarks: '' },
]);

const reactionData = ref([]);

const statusType = (status) => {
  return status === '1' ? 'success' :
    status === '0' ? 'info' :
      status === '2' ? 'warning' : 'default'


  // scope.row.status === 1 ? 'success' : 
  //               scope.row.status === 0 ? 'info' : 
  //               scope.row.status === 2 ? 'warning' : 'default'


};

// 挂载组件的时候的操作：读取后端数据
onMounted(() => {
  fetchDetailData();
});

watchEffect(() => {
  const params = route.query;
  // console.log(params)
  detailData.value[0].id = params.id;
  detailData.value[0].smiles = params.smiles;
  detailData.value[0].submissionTime = params.submissionTime;
  detailData.value[0].status = params.status;
  detailData.value[0].modelName = params.modelName
  console.log(detailData)
});

function fetchDetailData() {
  // 模拟从后端获取数据
  reactionData.value = [
    { topN: 1, score: 0.9, reaction: 'COC(=O)C=CC1=C[C@@H](C(C)C)CC[C@H]1C', image: 'path/to/image1.png' },
    { topN: 2, score: 0.8, reaction: 'COC(=O)C=CC1=C[C@@H](C(C)C)CC[C@H]1C', image: 'path/to/image2.png' },
  ];
}

</script>

<style scoped>
.detail-container {
  padding: 20px;
}

.detail-card {
  margin-bottom: 20px;
}

.detail-header {
  margin-bottom: 10px;
}

.reaction-results {
  margin-top: 20px;
}
</style>