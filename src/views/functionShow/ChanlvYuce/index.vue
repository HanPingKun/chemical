<template>
  <div class="app-container">
    <div class="search-bar">
      <el-tabs type="border-card" class="demo-tabs">
        <el-tab-pane>
          <template #label>
            <span class="custom-tabs-label">
              <span>完整smiles输入</span>
            </span>
          </template>
          <el-form :model="form" label-width="100px" @submit.prevent="getPredictedYield">
            <el-form-item label="smiles">
              <el-input v-model="form.smiles" placeholder="输入化学反应的 SMILES 表达式"></el-input>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="getPredictedYield">提交</el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>
        <el-tab-pane label="Config">
          <template #label>
            <span class="custom-tabs-label">
              <span>反应物产物smiles</span>
            </span>
          </template>
          <el-form
            :model="form"
            label-width="100px"
            @submit.prevent="handleSmiles1Smiles2Submit"
          >
            <el-form-item label="反应物">
              <el-input v-model="form.smiles1" placeholder="输入反应物 SMILES"></el-input>
            </el-form-item>
            <el-form-item label="产物">
              <el-input v-model="form.smiles2" placeholder="输入产物 SMILES"></el-input>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="handleSmiles1Smiles2Submit">提交</el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>
      </el-tabs>
    </div>
  </div>
</template>

<script>
import axios from "axios";

export default {
  data() {
    return {
      form: {
        smiles: "",
        smiles1: "",
        smiles2: "",
      },
      activeTab: "smiles",
      predictedYield: null,
    };
  },
  methods: {
    // 完整 smiles 提交处理
    async getPredictedYield() {
      try {
        const response = await axios.post("http://localhost:5005/predict", {
          smiles: this.form.smiles,
        });
        this.predictedYield = response.data.predicted_yield;
      } catch (error) {
        console.error("Failed to fetch predicted yield:", error);
        this.$message.error("无法获取预测产率，请重试");
      }
    },
    // smiles1 和 smiles2 提交处理
    async handleSmiles1Smiles2Submit() {
      if (!this.form.smiles1 || !this.form.smiles2) {
        this.$message.error("请完整填写反应物和产物 SMILES");
        return;
      }
      // 拼接 smiles1 和 smiles2
      this.form.smiles = `${this.form.smiles1}>>${this.form.smiles2}`;
      await this.getPredictedYield();
    },
  },
};
</script>

<style scoped>
.header {
  background-color: rgb(1, 70, 138);
  color: white;
  text-align: center;
  padding: 0px 0;
}

.upload-card {
  margin-top: 20px;
  padding: 20px;
  border: 1px solid #dcdfe6;
  border-radius: 8px;
}

.button-row {
  margin-bottom: 20px;
}

.el-button {
  background-color: #c1e7e3;
  color: #333;
}

.result-card {
  margin-top: 20px;
  padding: 20px;
  text-align: center;
  border: 1px solid #dcdfe6;
  border-radius: 8px;
  flex: 1; /* 使结果卡片填满剩余空间 */
}

.result-card h3 {
  font-size: 24px;
  margin-bottom: 10px;
}

.result-card p {
  font-size: 24px;
  color: #5d9cec;
  font-weight: bold;
}
::v-deep(.title) {
  font-size: 32px !important;
}
::v-deep(.el-form-item__label) {
  font-size: 20px;
}
::v-deep(.el-button--primary) {
  background-color: rgb(1, 70, 138) !important; /* 修改背景颜色 */
  color: #ffffff !important; /* 修改字体颜色 */
  border-color: rgb(1, 70, 138) !important; /* 修改边框颜色 */
}
.result-title {
  font-size: 32px !important;
  color: rgb(1, 70, 138) !important;
}
</style>
