<template>
  <div class="app-container">
    <div class="search-bar">
      <el-tabs v-model="activeTab" type="border-card" class="demo-tabs">
        <el-tab-pane name="smiles">
          <template #label>
            <span class="custom-tabs-label">
              <span>多模态化学信息抽取</span>
            </span>
          </template>
        </el-tab-pane>

        <el-tab-pane name="reaxys">
          <template #label>
            <span class="custom-tabs-label">
              <span>Reaxys化学文献端到端解析</span>
            </span>
          </template>

          <div
            v-loading="pdfLoading"
            element-loading-text="正在端到端深度解析文献 PDF，请稍候..."
            class="upload-card"
          >
            <el-upload
              class="pdf-uploader"
              drag
              action=""
              :auto-upload="false"
              :show-file-list="false"
              :on-change="handleFileChange"
              accept=".pdf"
            >
              <el-icon class="el-icon--upload"><upload-filled /></el-icon>
              <div class="el-upload__text">
                将 Reaxys 文献 PDF 拖到此处，或
                <em>点击上传</em>
              </div>
              <template #tip>
                <div class="el-upload__tip">仅支持上传 PDF 格式文献档案</div>
              </template>
            </el-upload>

            <div v-if="reaxysResults.length > 0" class="reaxys-result-container">
              <div class="filename-banner">
                <span>
                  原始文件:
                  <strong>{{ originalFilename }}</strong>
                </span>
              </div>

              <div v-for="(item, idx) in reaxysResults" :key="idx" class="rx-block">
                <div class="rx-header">
                  <span class="rx-id-tag">Rx-ID: {{ item["Rx-ID"] }}</span>
                  <span class="reaxys-id-sub">Reaxys ID: {{ item.reaction?.reaxys_id }}</span>
                </div>

                <div v-if="item.reaction?.img_path" class="reaction-img-box">
                  <div class="box-title">反应结构式图</div>
                  <el-image :src="item.reaction.img_path" fit="contain" class="rx-img">
                    <template #placeholder>
                      <div class="image-slot">加载结构式中...</div>
                    </template>
                  </el-image>
                </div>

                <div class="table-title">底物与产物信息</div>
                <!-- 新增：底物与产物 SMILES 表格 -->
                <el-table
                  :data="item.reaction?.steps || []"
                  border
                  stripe
                  style="width: 100%; margin-bottom: 20px"
                >
                  <el-table-column label="步骤" type="index" width="60" align="center" />
                  <el-table-column label="底物 SMILES (Reactants)">
                    <template #default="scope">
                      <div
                        v-for="(r, i) in scope.row.reactants"
                        :key="'r-' + i"
                        class="smiles-text"
                      >
                        {{ r }}
                      </div>
                    </template>
                  </el-table-column>
                  <el-table-column label="产物 SMILES (Products)">
                    <template #default="scope">
                      <div v-for="(p, i) in scope.row.products" :key="'p-' + i" class="smiles-text">
                        {{ p }}
                      </div>
                    </template>
                  </el-table-column>
                </el-table>

                <div class="table-title">提取的反应条件与产率明细</div>
                <el-table
                  :data="item.table_items"
                  border
                  stripe
                  style="width: 100%"
                  class="result-table"
                >
                  <el-table-column type="expand">
                    <template #default="props">
                      <div class="raw-content-box">
                        <strong>文献原始文本 (Raw Content):</strong>
                        <p class="raw-text">{{ props.row.raw_content }}</p>
                      </div>
                    </template>
                  </el-table-column>
                  <el-table-column label="序号" type="index" width="60" align="center" />
                  <el-table-column label="催化剂 (Catalyst)" min-width="120">
                    <template #default="scope">
                      <el-tag
                        v-for="c in scope.row.conditions[0]?.catalyst"
                        :key="c"
                        size="small"
                        class="m-1"
                      >
                        {{ c }}
                      </el-tag>
                    </template>
                  </el-table-column>
                  <el-table-column label="溶剂 (Solvent)" min-width="120">
                    <template #default="scope">
                      <el-tag
                        v-for="s in scope.row.conditions[0]?.solvent"
                        :key="s"
                        type="success"
                        size="small"
                        class="m-1"
                      >
                        {{ s }}
                      </el-tag>
                    </template>
                  </el-table-column>
                  <el-table-column label="试剂 (Reagent)" min-width="100">
                    <template #default="scope">
                      <span>{{ scope.row.conditions[0]?.reagent?.join(", ") || "-" }}</span>
                    </template>
                  </el-table-column>
                  <el-table-column label="温度 (Temp)" width="110" align="center">
                    <template #default="scope">
                      <span>{{ scope.row.conditions[0]?.temperature?.join(", ") || "-" }}</span>
                    </template>
                  </el-table-column>
                  <el-table-column label="时间 (Time)" width="90" align="center">
                    <template #default="scope">
                      <span>{{ scope.row.conditions[0]?.time?.join(", ") || "-" }}</span>
                    </template>
                  </el-table-column>
                  <el-table-column label="后处理 (After)" min-width="120">
                    <template #default="scope">
                      <span class="after-text">
                        {{ scope.row.conditions[0]?.after?.join(" → ") || "-" }}
                      </span>
                    </template>
                  </el-table-column>
                  <el-table-column
                    label="产率 (Yield)"
                    width="100"
                    align="center"
                    prop="yield_rate"
                  >
                    <template #default="scope">
                      <span class="yield-highlight">{{ scope.row.yield_rate || "-" }}</span>
                    </template>
                  </el-table-column>
                </el-table>
              </div>
            </div>
          </div>
        </el-tab-pane>
      </el-tabs>
    </div>
  </div>
</template>

<script>
import axios from "axios";
// 如果您使用的是 Element Plus，请取消下方图标组件的注释 (或确保您的项目已全局引入图标)
// import { UploadFilled } from '@element-plus/icons-vue'

export default {
  // components: { UploadFilled },
  data() {
    return {
      activeTab: "smiles", // 当前激活的Tab名称
      form: {
        smiles: "",
        smiles1: "",
        smiles2: "",
      },
      predictedYield: null,

      // 新增 Reaxys 业务相关状态
      pdfLoading: false, // 上传转圈等待状态
      originalFilename: "", // 原始上传文件名
      reaxysResults: [], // 后端返回的解析数组
    };
  },
  methods: {
    async handleFileChange(uploadFile) {
      if (!uploadFile) return;
      const formData = new FormData();
      formData.append("file", uploadFile.raw);

      this.pdfLoading = true;
      this.reaxysResults = [];

      try {
        const response = await axios.post("http://localhost:9001/ie/reaxys", formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });

        if (response.data && response.data.code === 200) {
          this.originalFilename = response.data.original_filename;
          this.reaxysResults = response.data.data || [];
          this.$message.success("文献解析成功！");
        } else {
          this.$message.error(response.data.msg || "后端解析业务异常");
        }
      } catch (error) {
        console.error("Failed to analyze Reaxys PDF:", error);
        this.$message.error("网络或服务器异常，解吸PDF失败");
      } finally {
        this.pdfLoading = false; // 关闭转圈等待
      }
    },
  },
};
</script>

<style scoped>
.header {
  padding: 0px 0;
  color: white;
  text-align: center;
  background-color: rgb(1, 70, 138);
}

.upload-card {
  padding: 24px;
  margin-top: 20px;
  background-color: #ffffff;
  border: 1px solid #dcdfe6;
  border-radius: 8px;
}

/* PDF 上传拖拽区域美化 */
.pdf-uploader {
  margin-bottom: 25px;
}

.el-icon--upload {
  margin-bottom: 10px;
  font-size: 48px;
  color: #909399;
}

.m-1 {
  margin: 2px;
}

/* 解析结果样式集 */
.reaxys-result-container {
  padding-top: 20px;
  margin-top: 30px;
  text-align: left;
  border-top: 2px dashed #e4e7ed;
}

.filename-banner {
  padding: 12px 20px;
  margin-bottom: 25px;
  font-size: 15px;
  background-color: #f5f7fa;
  border-left: 5px solid rgb(1, 70, 138);
  border-radius: 4px;
}

.rx-block {
  padding: 20px;
  margin-bottom: 30px;
  background: #fff;
  border: 1px solid #e4e7ed;
  border-radius: 6px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.05);
}

.rx-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 10px;
  margin-bottom: 15px;
  border-bottom: 1px solid #ebeef5;
}

.rx-id-tag {
  font-size: 18px;
  font-weight: bold;
  color: rgb(1, 70, 138);
}

.reaxys-id-sub {
  font-size: 14px;
  color: #909399;
}

.reaction-img-box {
  padding: 15px;
  margin-bottom: 20px;
  text-align: center;
  background: #fafafa;
  border-radius: 4px;
}

.box-title {
  margin-bottom: 10px;
  font-size: 14px;
  font-weight: 500;
  color: #606266;
  text-align: left;
}

.rx-img {
  display: block;
  width: 100%;
  max-width: 700px;
  height: 220px;
  margin: 0 auto;
  background-color: #fff;
  border: 1px solid #f0f0f0;
  border-radius: 4px;
}

.table-title {
  margin-bottom: 10px;
  font-size: 15px;
  font-weight: bold;
  color: #303133;
}

.smiles-text {
  display: inline-block;
  padding: 4px 8px;
  margin: 2px 0;
  font-family: Consolas, Monaco, monospace;
  line-height: 1.4;
  color: #606266;
  word-break: break-all;
  background-color: #f4f4f5;
  border-radius: 4px;
}

.yield-highlight {
  font-size: 15px;
  font-weight: bold;
  color: #67c23a;
}

.after-text {
  font-size: 12px;
  color: #606266;
}

.raw-content-box {
  padding: 15px 20px;
  font-size: 13px;
  background-color: #fcfcfc;
}

.raw-text {
  margin-top: 8px;
  line-height: 1.6;
  color: #666;
  white-space: pre-line;
}

/* 原有样式保留并兼容 */
.button-row {
  margin-bottom: 20px;
}

.el-button {
  color: #333;
  background-color: #c1e7e3;
}

.result-card {
  flex: 1;
  padding: 20px;
  margin-top: 20px;
  text-align: center;
  border: 1px solid #dcdfe6;
  border-radius: 8px;
}

.result-card h3 {
  margin-bottom: 10px;
  font-size: 24px;
}

.result-card p {
  font-size: 24px;
  font-weight: bold;
  color: #5d9cec;
}

::v-deep(.title) {
  font-size: 32px !important;
}

::v-deep(.el-form-item__label) {
  font-size: 20px;
}

::v-deep(.el-button--primary) {
  color: #ffffff !important;
  background-color: rgb(1, 70, 138) !important;
  border-color: rgb(1, 70, 138) !important;
}

.result-title {
  font-size: 32px !important;
  color: rgb(1, 70, 138) !important;
}
</style>
