<template>
  <div class="app-container">
    <div class="search-bar">
      <el-tabs v-model="activeTab" type="border-card" class="demo-tabs">
        <el-tab-pane name="text">
          <template #label>
            <span class="custom-tabs-label">
              <span>文本信息抽取</span>
            </span>
          </template>
        </el-tab-pane>

        <el-tab-pane name="smiles">
          <template #label>
            <span class="custom-tabs-label">
              <span>分子结构识别</span>
            </span>
          </template>
        </el-tab-pane>

        <el-tab-pane name="reaction">
          <template #label>
            <span class="custom-tabs-label">
              <span>方程式解析</span>
            </span>
          </template>
        </el-tab-pane>

        <el-tab-pane name="reaction">
          <template #label>
            <span class="custom-tabs-label">
              <span>文献示意图解析</span>
            </span>
          </template>
        </el-tab-pane>

        <el-tab-pane name="mulit">
          <template #label>
            <span class="custom-tabs-label">
              <span>多模态化学信息抽取</span>
            </span>
          </template>

          <div class="chat-container">
            <div ref="chatHistory" class="chat-history">
              <div v-for="(msg, index) in chatList" :key="index" :class="['chat-message', msg.role]">
                <div class="avatar">
                  {{ msg.role === "ai" ? "AI" : "Admin" }}
                </div>
                <div class="message-content">
                  <div v-if="msg.images && msg.images.length > 0" class="msg-images">
                    <el-image v-for="(img, i) in msg.images" :key="i" :src="img.url" :preview-src-list="[img.url]"
                      fit="cover" class="chat-img" />
                  </div>
                  <div v-if="msg.text" class="msg-text">{{ msg.text }}</div>
                </div>
              </div>

              <div v-if="isThinking" class="chat-message ai">
                <div class="avatar">AI</div>
                <div class="message-content thinking-content">
                  <span class="dot-typing">正在处理...</span>
                </div>
              </div>
            </div>

            <div class="chat-input-area">
              <div v-if="inputImages.length > 0" class="preview-area">
                <div v-for="(img, idx) in inputImages" :key="idx" class="preview-item">
                  <img :src="img.url" alt="preview" />
                  <div class="remove-icon" @click="removeImage(idx)">×</div>
                </div>
              </div>

              <div class="input-wrapper">
                <input ref="fileInput" type="file" style="display: none" multiple accept="image/*"
                  @change="handleFileSelect" />
                <el-button circle title="上传图片" @click="$refs.fileInput.click()">图</el-button>

                <el-input v-model="inputText" type="textarea" :rows="2" placeholder="请输入内容，或直接使用 Ctrl+V 粘贴图片..."
                  resize="none" class="chat-input" @paste="handlePaste" @keydown.enter.prevent="sendMessage" />

                <el-button type="primary" :disabled="isThinking || (!inputText.trim() && inputImages.length === 0)"
                  @click="sendMessage">
                  发送
                </el-button>
              </div>
            </div>
          </div>
        </el-tab-pane>

        <el-tab-pane name="reaxys">
          <template #label>
            <span class="custom-tabs-label">
              <span>Reaxys化学文献端到端解析</span>
            </span>
          </template>

          <div v-loading="pdfLoading" element-loading-text="正在端到端深度解析文献 PDF，请稍候..." class="upload-card">
            <el-upload class="pdf-uploader" drag action="" :auto-upload="false" :show-file-list="false"
              :on-change="handleFileChange" accept=".pdf">
              <div class="el-icon--upload" style="font-size: 48px; color: #909399; margin-bottom: 10px">
                ↑
              </div>
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
                <el-table :data="item.reaction?.steps || []" border stripe style="width: 100%; margin-bottom: 20px">
                  <el-table-column label="步骤" type="index" width="60" align="center" />
                  <el-table-column label="底物 SMILES (Reactants)">
                    <template #default="scope">
                      <div v-for="(r, i) in scope.row.reactants" :key="'r-' + i" class="smiles-text">
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
                <el-table :data="item.table_items" border stripe style="width: 100%" class="result-table">
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
                      <el-tag v-for="c in scope.row.conditions[0]?.catalyst" :key="c" size="small" class="m-1">
                        {{ c }}
                      </el-tag>
                    </template>
                  </el-table-column>
                  <el-table-column label="溶剂 (Solvent)" min-width="120">
                    <template #default="scope">
                      <el-tag v-for="s in scope.row.conditions[0]?.solvent" :key="s" type="success" size="small"
                        class="m-1">
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
                  <el-table-column label="产率 (Yield)" width="100" align="center" prop="yield_rate">
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

export default {
  data() {
    return {
      activeTab: "mulit", // 当前激活的Tab名称
      form: {
        smiles: "",
        smiles1: "",
        smiles2: "",
      },
      predictedYield: null,

      // === Reaxys 业务原有状态 ===
      pdfLoading: false,
      originalFilename: "",
      reaxysResults: [],

      // === 新增：多模态对话 Agent 状态 ===
      chatList: [
        {
          role: "ai",
          text: "你好，欢迎使用多模态化学信息提取系统。请发送相关图片或输入你需要提取的内容。",
        },
      ],
      inputText: "",
      inputImages: [], // 存储待发送的图片 { file: File, url: String }
      isThinking: false, // 控制思考状态显示
    };
  },
  methods: {
    // ==================== 原有：Reaxys PDF 解析 ====================
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
        this.$message.error("网络或服务器异常，解析PDF失败");
      } finally {
        this.pdfLoading = false;
      }
    },

    // ==================== 新增：多模态 Agent 对话交互 ====================
    // 监听输入框 Ctrl+V 粘贴事件
    handlePaste(event) {
      const items = (event.clipboardData || window.clipboardData).items;
      for (let item of items) {
        if (item.type.indexOf("image") !== -1) {
          const file = item.getAsFile();
          if (file) {
            this.inputImages.push({
              file: file,
              url: URL.createObjectURL(file),
            });
          }
        }
      }
    },

    // 手动点击按钮选择本地图片
    handleFileSelect(event) {
      const files = event.target.files;
      for (let file of files) {
        this.inputImages.push({
          file: file,
          url: URL.createObjectURL(file),
        });
      }
      // 清空 value 允许重复选同一个文件
      event.target.value = null;
    },

    // 移除待发送的图片
    removeImage(index) {
      URL.revokeObjectURL(this.inputImages[index].url);
      this.inputImages.splice(index, 1);
    },

    // 自动滚动到聊天底部
    scrollToBottom() {
      this.$nextTick(() => {
        const history = this.$refs.chatHistory;
        if (history) {
          history.scrollTop = history.scrollHeight;
        }
      });
    },

    // 发送消息到后端 Multi-Agents 接口
    async sendMessage() {
      if (!this.inputText.trim() && this.inputImages.length === 0) return;

      // 1. 将用户的输入组装并放入聊天历史列表
      const userMsg = {
        role: "user",
        text: this.inputText.trim(),
        images: [...this.inputImages],
      };
      this.chatList.push(userMsg);
      this.scrollToBottom();

      // 2. 构造发送给后端的 FormData
      const formData = new FormData();
      if (this.inputText.trim()) {
        formData.append("text", this.inputText.trim());
      }
      this.inputImages.forEach((imgObj) => {
        // 根据你后端的具体接收字段名，这里默认以 "images" 传入
        formData.append("images", imgObj.file);
      });

      // 3. 状态重置：清空输入区，开启 AI 思考动画
      this.inputText = "";
      this.inputImages = [];
      this.isThinking = true;
      this.scrollToBottom();

      try {
        const response = await axios.post("http://localhost:9001/ie/mulit-agents", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        // 假设后端成功返回的结构为 { code: 200, data: "提取的文本信息..." }
        if (response.data && response.data.code === 200) {
          this.chatList.push({
            role: "ai",
            text: response.data.data || response.data.msg || "信息已处理完毕。",
            images: [],
          });
        } else {
          this.chatList.push({
            role: "ai",
            text: "处理失败：" + (response.data.msg || "后端返回异常状态"),
          });
        }
      } catch (error) {
        console.error("Agents interaction failed:", error);
        this.chatList.push({
          role: "ai",
          text: "网络或服务异常，无法连接到 Agents 进行处理。",
        });
      } finally {
        this.isThinking = false;
        this.scrollToBottom();
      }
    },
  },
};
</script>

<style scoped>
/* ==================== 原有样式 ==================== */
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

.pdf-uploader {
  margin-bottom: 25px;
}

.m-1 {
  margin: 2px;
}

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

/* ==================== 新增：Agent 对话界面样式 ==================== */
.chat-container {
  display: flex;
  flex-direction: column;
  height: 600px;
  border: 1px solid #dcdfe6;
  border-radius: 8px;
  background-color: #f9fbfc;
  margin-top: 20px;
}

.chat-history {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
}

.chat-message {
  display: flex;
  margin-bottom: 20px;
  align-items: flex-start;
}

/* AI 气泡靠左 */
.chat-message.ai {
  flex-direction: row;
}

.chat-message.ai .message-content {
  background-color: #ffffff;
  border: 1px solid #e4e7ed;
  margin-left: 10px;
  border-radius: 4px 12px 12px 12px;
}

/* 用户气泡靠右 */
.chat-message.user {
  flex-direction: row-reverse;
}

.chat-message.user .message-content {
  background-color: #c1e7e3;
  color: #333;
  margin-right: 10px;
  border-radius: 12px 4px 12px 12px;
}

.avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: rgb(1, 70, 138);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: bold;
  flex-shrink: 0;
}

.chat-message.user .avatar {
  background-color: #67c23a;
}

.message-content {
  padding: 12px 16px;
  max-width: 70%;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  word-break: break-all;
  white-space: pre-wrap;
  line-height: 1.5;
}

.msg-images {
  margin-bottom: 8px;
}

.chat-img {
  width: 150px;
  border-radius: 4px;
  margin-right: 8px;
  margin-bottom: 8px;
  border: 1px solid #ebeef5;
}

.thinking-content {
  color: #909399;
  font-style: italic;
}

/* 底部输入区 */
.chat-input-area {
  border-top: 1px solid #dcdfe6;
  background-color: #ffffff;
  padding: 15px;
  border-radius: 0 0 8px 8px;
}

.preview-area {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 10px;
}

.preview-item {
  position: relative;
  width: 60px;
  height: 60px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
}

.preview-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 4px;
}

.remove-icon {
  position: absolute;
  top: -6px;
  right: -6px;
  background: #f56c6c;
  color: white;
  border-radius: 50%;
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 12px;
  line-height: 1;
}

.input-wrapper {
  display: flex;
  align-items: center;
  gap: 10px;
}

.chat-input {
  flex: 1;
}
</style>
