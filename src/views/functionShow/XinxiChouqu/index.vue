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

          <div v-loading="textLoading" element-loading-text="正在抽取文本信息，请稍候..." class="upload-card">
            <el-input v-model="textInput" type="textarea" :rows="6" placeholder="请输入需要抽取的化学文献或反应段落文本..."
              resize="vertical" style="margin-bottom: 20px" />

            <div class="button-row">
              <el-button type="primary" :disabled="!textInput.trim() || textLoading" @click="handleTextExtract">
                开始抽取
              </el-button>
            </div>

            <div v-if="textResults.length > 0" class="reaxys-result-container">
              <div class="table-title">抽取结果明细</div>
              <el-table :data="textResults" border stripe style="width: 100%" class="result-table">
                <el-table-column label="序号" type="index" width="60" align="center" />

                <el-table-column label="反应物 (Reactant)" min-width="150">
                  <template #default="scope">
                    <div v-for="(r, i) in scope.row.reactant" :key="'r-' + i" class="smiles-text">
                      {{ r }}
                    </div>
                  </template>
                </el-table-column>

                <el-table-column label="产物 (Product)" min-width="150">
                  <template #default="scope">
                    <div v-for="(p, i) in scope.row.product" :key="'p-' + i" class="smiles-text">
                      {{ p }}
                    </div>
                  </template>
                </el-table-column>

                <el-table-column label="催化剂 (Catalyst)" min-width="120">
                  <template #default="scope">
                    <el-tag v-for="c in scope.row.catalyst" :key="c" size="small" class="m-1">
                      {{ c }}
                    </el-tag>
                    <span v-if="!scope.row.catalyst || scope.row.catalyst.length === 0">-</span>
                  </template>
                </el-table-column>

                <el-table-column label="溶剂 (Solvent)" min-width="120">
                  <template #default="scope">
                    <el-tag v-for="s in scope.row.solvent" :key="s" type="success" size="small" class="m-1">
                      {{ s }}
                    </el-tag>
                    <span v-if="!scope.row.solvent || scope.row.solvent.length === 0">-</span>
                  </template>
                </el-table-column>

                <el-table-column label="试剂 (Reagent)" min-width="120">
                  <template #default="scope">
                    <span>{{ scope.row.reagent?.join(", ") || "-" }}</span>
                  </template>
                </el-table-column>

                <el-table-column label="温度 (Temp)" width="100" align="center">
                  <template #default="scope">
                    <span>{{ scope.row.temperature?.join(", ") || "-" }}</span>
                  </template>
                </el-table-column>

                <el-table-column label="时间 (Time)" width="100" align="center">
                  <template #default="scope">
                    <span>{{ scope.row.time?.join(", ") || "-" }}</span>
                  </template>
                </el-table-column>

                <el-table-column label="后处理 (After)" min-width="120">
                  <template #default="scope">
                    <span class="after-text">
                      {{ scope.row.after?.join(" → ") || "-" }}
                    </span>
                  </template>
                </el-table-column>

                <el-table-column label="产率 (Yield)" width="100" align="center">
                  <template #default="scope">
                    <span class="yield-highlight">
                      {{ scope.row.yield_rate?.join(", ") || "-" }}
                    </span>
                  </template>
                </el-table-column>
              </el-table>
            </div>
          </div>
        </el-tab-pane>

        <el-tab-pane name="smiles">
          <template #label>
            <span class="custom-tabs-label">
              <span>分子结构识别</span>
            </span>
          </template>

          <div v-loading="smilesLoading" element-loading-text="正在识别分子结构，请稍候..." class="upload-card">
            <el-upload class="pdf-uploader" drag action="" :auto-upload="false" multiple accept="image/*"
              :file-list="smilesFileList" :on-change="handleSmilesChange" :on-remove="handleSmilesRemove">
              <div class="el-icon--upload" style="font-size: 48px; color: #909399; margin-bottom: 10px">
                +
              </div>
              <div class="el-upload__text">
                将分子结构图片拖到此处，或
                <em>点击上传</em>
                (支持多张)
              </div>
            </el-upload>

            <div class="button-row" style="text-align: center; margin-top: 20px">
              <el-button type="primary" :disabled="smilesFileList.length === 0 || smilesLoading"
                @click="handleSmilesExtract">
                开始抽取
              </el-button>
            </div>

            <div v-if="smilesResults.length > 0" class="reaxys-result-container">
              <div class="table-title">识别结果明细</div>

              <div v-for="(item, idx) in smilesResults" :key="idx" class="rx-block">
                <div class="rx-header">
                  <span class="rx-id-tag">结构 #{{ idx + 1 }}</span>
                </div>

                <div class="reaction-img-box">
                  <el-image :src="item.image_url" fit="contain" class="rx-img" :preview-src-list="[item.image_url]">
                    <template #placeholder>
                      <div class="image-slot">加载中...</div>
                    </template>
                  </el-image>
                </div>

                <el-table :data="[item]" border stripe style="width: 100%">
                  <el-table-column label="SMILES 序列" min-width="200">
                    <template #default="scope">
                      <div class="smiles-text" style="font-size: 16px; padding: 8px">
                        {{ scope.row.smiles }}
                      </div>
                    </template>
                  </el-table-column>
                </el-table>
              </div>
            </div>
          </div>
        </el-tab-pane>

        <el-tab-pane name="reaction_parse">
          <template #label>
            <span class="custom-tabs-label">
              <span>方程式解析</span>
            </span>
          </template>

          <div v-loading="reactionLoading" element-loading-text="正在解析方程式结构，请稍候..." class="upload-card">
            <el-upload class="pdf-uploader" drag action="" :auto-upload="false" multiple accept="image/*"
              :file-list="reactionFileList" :on-change="handleReactionChange" :on-remove="handleReactionRemove">
              <div class="el-icon--upload" style="font-size: 48px; color: #909399; margin-bottom: 10px">
                +
              </div>
              <div class="el-upload__text">
                将反应方程式图片拖到此处，或
                <em>点击上传</em>
                (支持多张)
              </div>
            </el-upload>

            <div class="button-row" style="text-align: center; margin-top: 20px">
              <el-button type="primary" :disabled="reactionFileList.length === 0 || reactionLoading"
                @click="handleReactionExtract">
                开始抽取
              </el-button>
            </div>

            <div v-if="reactionResults.length > 0" class="reaxys-result-container">
              <div class="table-title">解析结果明细</div>

              <div v-for="(item, idx) in reactionResults" :key="idx" class="rx-block">
                <div class="rx-header">
                  <span class="rx-id-tag">反应图 #{{ idx + 1 }}</span>
                </div>

                <div class="reaction-img-box">
                  <el-image :src="item.image_url" fit="contain" class="rx-img" :preview-src-list="[item.image_url]">
                    <template #placeholder>
                      <div class="image-slot">加载中...</div>
                    </template>
                  </el-image>
                </div>

                <div class="table-title">解析步骤详情</div>
                <el-table :data="item.reactions || []" border stripe style="width: 100%">
                  <el-table-column label="步骤" prop="step" width="80" align="center" />

                  <el-table-column label="底物 (Reactants)">
                    <template #default="scope">
                      <div v-for="(r, i) in scope.row.detail?.reactants_smiles" :key="'rr-' + i" class="smiles-text">
                        {{ r }}
                      </div>
                    </template>
                  </el-table-column>

                  <el-table-column label="产物 (Products)">
                    <template #default="scope">
                      <div v-for="(p, i) in scope.row.detail?.products_smiles" :key="'pp-' + i" class="smiles-text">
                        {{ p }}
                      </div>
                    </template>
                  </el-table-column>

                  <el-table-column label="反应条件 (Conditions)" min-width="120">
                    <template #default="scope">
                      <el-tag v-for="(c, i) in scope.row.detail?.conditions_text" :key="'cc-' + i" size="small"
                        class="m-1">
                        {{ c }}
                      </el-tag>
                    </template>
                  </el-table-column>
                </el-table>
              </div>
            </div>
          </div>
        </el-tab-pane>

        <el-tab-pane name="diagram">
          <template #label>
            <span class="custom-tabs-label">
              <span>文献示意图解析</span>
            </span>
          </template>

          <div v-loading="diagramLoading" element-loading-text="正在解析文献示意图，请稍候..." class="upload-card">
            <el-upload class="pdf-uploader" drag action="" :auto-upload="false" multiple accept="image/*"
              :file-list="diagramFileList" :on-change="handleDiagramChange" :on-remove="handleDiagramRemove">
              <div class="el-icon--upload" style="font-size: 48px; color: #909399; margin-bottom: 10px">
                +
              </div>
              <div class="el-upload__text">
                将文献示意图拖到此处，或
                <em>点击上传</em>
                (支持多张)
              </div>
            </el-upload>

            <div class="button-row" style="text-align: center; margin-top: 20px">
              <el-button type="primary" :disabled="diagramFileList.length === 0 || diagramLoading"
                @click="handleDiagramExtract">
                开始抽取
              </el-button>
            </div>

            <div v-if="diagramResults.length > 0" class="reaxys-result-container">
              <div class="table-title">解析结果明细</div>

              <div v-for="(item, idx) in diagramResults" :key="idx" class="rx-block">
                <div class="rx-header">
                  <span class="rx-id-tag">文献示意图 #{{ idx + 1 }}</span>
                </div>

                <div class="reaction-img-box">
                  <el-image :src="item.image_url" fit="contain" class="rx-img" :preview-src-list="[item.image_url]">
                    <template #placeholder>
                      <div class="image-slot">加载中...</div>
                    </template>
                  </el-image>
                </div>

                <div v-if="item.detail?.reactions && item.detail.reactions.length > 0">
                  <div class="table-title">反应步骤解析</div>
                  <el-table :data="item.detail.reactions" border stripe style="width: 100%; margin-bottom: 20px">
                    <el-table-column type="expand">
                      <template #default="props">
                        <div class="raw-content-box">
                          <strong>反应条件原始文本:</strong>
                          <p v-for="(txt, i) in props.row.conditions?.raw_content" :key="'rc-' + i" class="raw-text">
                            {{ txt }}
                          </p>
                        </div>
                      </template>
                    </el-table-column>
                    <el-table-column label="步骤" prop="step" width="60" align="center" />

                    <el-table-column label="底物 (Reactants)">
                      <template #default="scope">
                        <div v-for="(r, i) in scope.row.reactants" :key="'r-' + i">
                          <div class="smiles-text" style="margin-bottom: 5px">{{ r.smiles }}</div>
                          <div v-if="r.identifier && r.identifier.length > 0">
                            <el-tag v-for="(tag, tidx) in r.identifier" :key="'rtag-' + tidx" size="small" type="info"
                              class="m-1">
                              {{ tag }}
                            </el-tag>
                          </div>
                        </div>
                      </template>
                    </el-table-column>

                    <el-table-column label="产物 (Products)">
                      <template #default="scope">
                        <div v-for="(p, i) in scope.row.products" :key="'p-' + i">
                          <div class="smiles-text" style="margin-bottom: 5px">{{ p.smiles }}</div>
                          <div v-if="p.identifier && p.identifier.length > 0">
                            <el-tag v-for="(tag, tidx) in p.identifier" :key="'ptag-' + tidx" size="small" type="info"
                              class="m-1">
                              {{ tag }}
                            </el-tag>
                          </div>
                        </div>
                      </template>
                    </el-table-column>

                    <el-table-column label="反应条件 (Conditions)" min-width="150">
                      <template #default="scope">
                        <div v-if="scope.row.conditions?.solvent?.length">
                          <strong>溶剂:</strong>
                          <span>{{ scope.row.conditions.solvent.join(", ") }}</span>
                        </div>
                        <div v-if="scope.row.conditions?.reagent?.length">
                          <strong>试剂:</strong>
                          <span>{{ scope.row.conditions.reagent.join(", ") }}</span>
                        </div>
                        <div v-if="scope.row.conditions?.temperature?.length">
                          <strong>温度:</strong>
                          <span>{{ scope.row.conditions.temperature.join(", ") }}</span>
                        </div>
                        <div v-if="scope.row.conditions?.time?.length">
                          <strong>时间:</strong>
                          <span>{{ scope.row.conditions.time.join(", ") }}</span>
                        </div>
                        <div v-if="scope.row.conditions?.yield?.length">
                          <strong>产率:</strong>
                          <span class="yield-highlight">
                            {{ scope.row.conditions.yield.join(", ") }}
                          </span>
                        </div>
                      </template>
                    </el-table-column>
                  </el-table>
                </div>

                <div v-if="item.detail?.r_group && item.detail.r_group.length > 0">
                  <div class="table-title">R基团信息</div>
                  <el-table :data="item.detail.r_group" border stripe style="width: 100%; margin-bottom: 20px">
                    <el-table-column label="标识符 (Identifier)" prop="identifier" width="180" />
                    <el-table-column label="目标组合 (Target)">
                      <template #default="scope">
                        <div v-for="(t, i) in scope.row.target" :key="'tgt-' + i" class="smiles-text">
                          {{ t }}
                        </div>
                      </template>
                    </el-table-column>
                  </el-table>
                </div>

                <div v-if="item.detail?.table_content && item.detail.table_content.length > 0">
                  <div v-for="(tbLine, tbIdx) in item.detail.table_content" :key="'tb-' + tbIdx">
                    <div class="table-title">表格信息: {{ tbLine.table_name }}</div>
                    <el-table v-if="tbLine.content && tbLine.content.length > 0" :data="tbLine.content" border stripe
                      style="width: 100%; margin-bottom: 20px">
                      <el-table-column v-for="colKey in Object.keys(tbLine.content[0])" :key="colKey" :label="colKey"
                        :prop="colKey">
                        <template #default="scope">
                          <span :class="{ 'yield-highlight': colKey.toLowerCase().includes('yield') }">
                            {{ scope.row[colKey] }}
                          </span>
                        </template>
                      </el-table-column>
                    </el-table>
                  </div>
                </div>
              </div>
            </div>
          </div>
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
      activeTab: "text",
      form: {
        smiles: "",
        smiles1: "",
        smiles2: "",
      },
      predictedYield: null,

      textInput: "",
      textLoading: false,
      textResults: [],

      smilesLoading: false,
      smilesFileList: [],
      smilesResults: [],

      reactionLoading: false,
      reactionFileList: [],
      reactionResults: [],

      diagramLoading: false,
      diagramFileList: [],
      diagramResults: [],

      pdfLoading: false,
      originalFilename: "",
      reaxysResults: [],

      chatList: [
        {
          role: "ai",
          text: "你好，欢迎使用多模态化学信息提取系统。请发送相关图片或输入你需要提取的内容。",
        },
      ],
      inputText: "",
      inputImages: [],
      isThinking: false,
    };
  },
  methods: {
    async handleTextExtract() {
      if (!this.textInput.trim()) return;

      this.textLoading = true;
      this.textResults = [];

      const formData = new FormData();
      formData.append("text", this.textInput.trim());

      try {
        const response = await axios.post("http://localhost:9001/ie/text", formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });

        if (response.data && response.data.code === 200) {
          this.textResults = response.data.data || [];
          this.$message.success("文本信息抽取成功！");
        } else {
          this.$message.error(response.data.msg || "抽取失败，请稍后重试");
        }
      } catch (error) {
        console.error("Text extraction error:", error);
        this.$message.error("网络或服务器异常，无法完成文本抽取");
      } finally {
        this.textLoading = false;
      }
    },

    handleSmilesChange(uploadFile, uploadFiles) {
      this.smilesFileList = uploadFiles;
    },

    handleSmilesRemove(uploadFile, uploadFiles) {
      this.smilesFileList = uploadFiles;
    },

    async handleSmilesExtract() {
      if (this.smilesFileList.length === 0) return;

      this.smilesLoading = true;
      this.smilesResults = [];

      const formData = new FormData();
      this.smilesFileList.forEach((file) => {
        if (file.raw) {
          formData.append("images", file.raw);
        }
      });

      try {
        const response = await axios.post("http://localhost:9001/ie/smiles", formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });

        if (response.data && response.data.code === 200) {
          this.smilesResults = response.data.data || [];
          this.$message.success("分子结构识别成功！");
        } else {
          this.$message.error(response.data.msg || "识别失败，请稍后重试");
        }
      } catch (error) {
        console.error("Smiles extraction error:", error);
        this.$message.error("网络或服务器异常，无法完成识别");
      } finally {
        this.smilesLoading = false;
      }
    },

    handleReactionChange(uploadFile, uploadFiles) {
      this.reactionFileList = uploadFiles;
    },

    handleReactionRemove(uploadFile, uploadFiles) {
      this.reactionFileList = uploadFiles;
    },

    async handleReactionExtract() {
      if (this.reactionFileList.length === 0) return;

      this.reactionLoading = true;
      this.reactionResults = [];

      const formData = new FormData();
      this.reactionFileList.forEach((file) => {
        if (file.raw) {
          formData.append("images", file.raw);
        }
      });

      try {
        const response = await axios.post("http://localhost:9001/ie/reaction", formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });

        if (response.data && response.data.code === 200) {
          this.reactionResults = response.data.data || [];
          this.$message.success("方程式解析成功！");
        } else {
          this.$message.error(response.data.msg || "解析失败，请稍后重试");
        }
      } catch (error) {
        console.error("Reaction parsing error:", error);
        this.$message.error("网络或服务器异常，无法完成方程式解析");
      } finally {
        this.reactionLoading = false;
      }
    },

    handleDiagramChange(uploadFile, uploadFiles) {
      this.diagramFileList = uploadFiles;
    },

    handleDiagramRemove(uploadFile, uploadFiles) {
      this.diagramFileList = uploadFiles;
    },

    async handleDiagramExtract() {
      if (this.diagramFileList.length === 0) return;

      this.diagramLoading = true;
      this.diagramResults = [];

      const formData = new FormData();
      this.diagramFileList.forEach((file) => {
        if (file.raw) {
          formData.append("images", file.raw);
        }
      });

      try {
        const response = await axios.post("http://localhost:9001/ie/schematic", formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });

        if (response.data && response.data.code === 200) {
          this.diagramResults = response.data.data || [];
          this.$message.success("示意图解析成功！");
        } else {
          this.$message.error(response.data.msg || "解析失败，请稍后重试");
        }
      } catch (error) {
        console.error("Diagram parsing error:", error);
        this.$message.error("网络或服务器异常，无法完成示意图解析");
      } finally {
        this.diagramLoading = false;
      }
    },

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

    handleFileSelect(event) {
      const files = event.target.files;
      for (let file of files) {
        this.inputImages.push({
          file: file,
          url: URL.createObjectURL(file),
        });
      }
      event.target.value = null;
    },

    removeImage(index) {
      URL.revokeObjectURL(this.inputImages[index].url);
      this.inputImages.splice(index, 1);
    },

    scrollToBottom() {
      this.$nextTick(() => {
        const history = this.$refs.chatHistory;
        if (history) {
          history.scrollTop = history.scrollHeight;
        }
      });
    },

    async sendMessage() {
      if (!this.inputText.trim() && this.inputImages.length === 0) return;

      const userMsg = {
        role: "user",
        text: this.inputText.trim(),
        images: [...this.inputImages],
      };
      this.chatList.push(userMsg);
      this.scrollToBottom();

      const formData = new FormData();
      if (this.inputText.trim()) {
        formData.append("text", this.inputText.trim());
      }
      this.inputImages.forEach((imgObj) => {
        formData.append("images", imgObj.file);
      });

      this.inputText = "";
      this.inputImages = [];
      this.isThinking = true;
      this.scrollToBottom();

      try {
        const response = await axios.post("http://localhost:9001/ie/mulit-agents", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });

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

.chat-message.ai {
  flex-direction: row;
}

.chat-message.ai .message-content {
  background-color: #ffffff;
  border: 1px solid #e4e7ed;
  margin-left: 10px;
  border-radius: 4px 12px 12px 12px;
}

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
