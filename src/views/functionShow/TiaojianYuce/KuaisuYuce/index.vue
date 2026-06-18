<template>
  <div class="app-container">
    <el-row :gutter="20" class="h-100">
      <el-col :span="8" class="left-panel">
        <el-card class="h-100" shadow="never">
          <template #header>
            <div class="card-header">
              <span>反应条件预测</span>
            </div>
          </template>

          <el-tabs v-model="activeTab" type="border-card" class="input-tabs">
            <el-tab-pane label="完整 SMILES" name="manual">
              <el-form label-position="top">
                <el-form-item label="反应 SMILES">
                  <el-input
                    v-model="form.fullSmiles"
                    type="textarea"
                    :rows="6"
                    placeholder="例如: c1ccccc1CC>>c1ccccc1C(=O)O"
                    spellcheck="false"
                  />
                </el-form-item>

                <el-form-item>
                  <el-checkbox v-model="enableCluster">聚类优化推荐</el-checkbox>
                </el-form-item>

                <el-button
                  type="primary"
                  :icon="Search"
                  :loading="predictLoading"
                  class="btn-submit"
                  @click="handlePredict"
                >
                  运行预测
                </el-button>
              </el-form>
            </el-tab-pane>

            <el-tab-pane label="反应物+产物" name="manual2">
              <el-form label-position="top">
                <el-form-item label="反应物">
                  <el-input v-model="form.reactant" placeholder="输入反应物 SMILES" />
                </el-form-item>

                <el-form-item label="产物">
                  <el-input v-model="form.product" placeholder="输入产物 SMILES" />
                </el-form-item>

                <el-form-item>
                  <el-checkbox v-model="enableCluster">聚类优化推荐</el-checkbox>
                </el-form-item>

                <el-button
                  type="primary"
                  :icon="Search"
                  :loading="predictLoading"
                  class="btn-submit"
                  @click="handleManual2Predict"
                >
                  运行预测
                </el-button>
              </el-form>
            </el-tab-pane>

            <el-tab-pane label="文件上传" name="upload">
              <el-form label-position="top">
                <el-form-item>
                  <el-upload
                    ref="uploadRef"
                    class="upload-demo"
                    drag
                    :auto-upload="false"
                    :limit="1"
                    accept=".txt"
                    :show-file-list="true"
                    :before-upload="beforeUpload"
                    :on-change="handleFileChange"
                    :on-remove="handleFileRemove"
                  >
                    <el-icon class="el-icon--upload">
                      <UploadFilled />
                    </el-icon>
                    <div class="el-upload__text">
                      拖拽文件到此处 或
                      <em>点击上传</em>
                    </div>
                    <template #tip>
                      <div class="el-upload__tip">
                        仅支持 .txt 文件；每行一条反应 SMILES，例如：A>>B
                      </div>
                    </template>
                  </el-upload>
                </el-form-item>

                <el-form-item>
                  <el-checkbox v-model="enableCluster">聚类优化推荐</el-checkbox>
                </el-form-item>

                <el-button
                  type="primary"
                  :icon="Search"
                  :loading="predictLoading"
                  class="btn-submit"
                  @click="handleFilePredict"
                >
                  上传并预测
                </el-button>
              </el-form>
            </el-tab-pane>
          </el-tabs>

          <div class="accuracy-action-wrapper">
            <el-button
              type="success"
              :icon="Cpu"
              :loading="accuracyLoading"
              class="btn-accuracy"
              @click="handleCalculateAccuracy"
            >
              {{ accuracyLoading ? "正在执行准确率计算..." : "计算预测准确率" }}
            </el-button>
          </div>
        </el-card>
      </el-col>

      <el-col :span="16" class="right-panel">
        <el-card class="mb-20 top-panel-card" shadow="never">
          <template #header>
            <div class="card-header">
              <div style="display: inline-flex; gap: 6px; align-items: center">
                <span>聚类优化推荐</span>
                <el-tooltip
                  effect="dark"
                  content="核心算法：基于知识图谱与聚类算法，对模型预测出的数十组候选条件进行重排去重，为您挑选出 3 组置信度最高且相互之间具有显著配方差异（多样化）的专属实验方案，避免单一方向的盲目试错。"
                  placement="top"
                >
                  <el-icon color="#909399" style="font-size: 14px; cursor: help">
                    <InfoFilled />
                  </el-icon>
                </el-tooltip>
              </div>
              <div class="header-actions">
                <el-switch
                  v-model="enableCluster"
                  inline-prompt
                  active-text="开"
                  inactive-text="关"
                />
                <el-tag v-if="clusterRows.length > 0" type="warning" effect="dark">
                  Top-3 Ready
                </el-tag>
              </div>
            </div>
          </template>

          <div v-if="predictLoading" class="loading-state">
            <el-skeleton :rows="5" animated />
          </div>

          <div v-else-if="!hasPrediction" class="empty-state">
            <el-empty description="请先在左侧提交反应 SMILES 进行预测" :image-size="80" />
          </div>

          <div v-else-if="!enableCluster" class="empty-state">
            <el-empty description="当前未开启聚类优化推荐" :image-size="80" />
          </div>

          <div v-else-if="clusterRows.length === 0" class="empty-state">
            <el-empty description="本次未返回聚类优化结果" :image-size="80" />
          </div>

          <el-row v-else :gutter="20" class="top-cards-container">
            <el-col v-for="(item, index) in top3Results" :key="index" :span="8">
              <div class="rank-card" :class="'rank-' + (index + 1)">
                <div class="rank-badge">
                  <span v-if="index === 0">🥇 NO.1</span>
                  <span v-else-if="index === 1">🥈 NO.2</span>
                  <span v-else>🥉 NO.3</span>
                </div>

                <div class="card-score">
                  <span class="label">Score</span>
                  <span class="value">{{ formatScore(item.score) }}</span>
                </div>

                <el-divider class="card-divider" />

                <div class="chem-details">
                  <div class="detail-item">
                    <span class="chem-label">催化剂:</span>
                    <span class="chem-value">{{ displayText(item.catalyst) }}</span>
                  </div>
                  <div class="detail-item">
                    <span class="chem-label">溶剂:</span>
                    <span class="chem-value">{{ joinPair(item.solvent1, item.solvent2) }}</span>
                  </div>
                  <div class="detail-item">
                    <span class="chem-label">试剂:</span>
                    <span class="chem-value">{{ joinPair(item.reagent1, item.reagent2) }}</span>
                  </div>
                </div>
              </div>
            </el-col>
          </el-row>
        </el-card>

        <el-card class="result-table-card" shadow="never">
          <template #header>
            <div class="card-header">
              <span>详细候选列表</span>
              <div class="header-actions">
                <el-tag v-if="currentReaction" type="success" effect="plain">
                  当前反应：{{ currentReaction }}
                </el-tag>
                <el-tag v-if="candidateRows.length" type="info">
                  {{ candidateRows.length }} 条结果
                </el-tag>
              </div>
            </div>
          </template>

          <el-table
            v-loading="predictLoading"
            :data="candidateRows"
            border
            stripe
            empty-text="暂无预测结果"
          >
            <el-table-column prop="rank" label="Rank" width="70" align="center" />
            <el-table-column prop="catalyst" label="催化剂" min-width="130" />
            <el-table-column prop="solvent1" label="溶剂 1" min-width="110" />
            <el-table-column prop="solvent2" label="溶剂 2" min-width="110" />
            <el-table-column prop="reagent1" label="试剂 1" min-width="110" />
            <el-table-column prop="reagent2" label="试剂 2" min-width="110" />

            <el-table-column prop="score" width="125" fixed="right">
              <template #header>
                <div
                  style="
                    display: inline-flex;
                    gap: 4px;
                    align-items: center;
                    justify-content: center;
                    width: 100%;
                  "
                >
                  <span>置信得分</span>
                  <el-tooltip
                    effect="dark"
                    content="模型对该反应条件组合的置信度评分。数值越接近 1.0000，代表该条件在同类反应中的历史推荐置信度越高，不代表实际反应产率。"
                    placement="top"
                  >
                    <el-icon color="#909399" style="font-size: 13px; cursor: help">
                      <InfoFilled />
                    </el-icon>
                  </el-tooltip>
                </div>
              </template>
              <template #default="scope">
                <span class="score-text">{{ formatScore(scope.row.score) }}</span>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
    </el-row>

    <el-dialog
      v-model="evalDialogVisible"
      title="验证集预测准确率评估"
      width="750px"
      center
      class="eval-dialog"
      @closed="handleReEvaluate"
    >
      <div v-if="evalStep === 0" class="eval-step-selection">
        <p class="step-desc">请选择要验证的数据集通道，并上传对应的测试数据文件：</p>

        <el-row :gutter="20" class="channel-row">
          <el-col :span="12">
            <div
              class="channel-card"
              :class="{ active: evalDataset === 'uspto' }"
              @click="evalDataset = 'uspto'"
            >
              <div class="channel-title">USPTO condition 数据集</div>
              <div class="channel-desc">
                无温度预测
                <br />
                适用于USPTO反应条件验证
              </div>
              <el-icon v-if="evalDataset === 'uspto'" class="check-icon"><Select /></el-icon>

              <div v-if="historyCache.uspto" class="history-action-wrapper">
                <el-button type="primary" plain size="small" @click.stop="viewHistory('uspto')">
                  <el-icon><Clock /></el-icon>
                  查看历史数据
                </el-button>
              </div>
            </div>
          </el-col>

          <el-col :span="12">
            <div
              class="channel-card"
              :class="{ active: evalDataset === 'reaxys' }"
              @click="evalDataset = 'reaxys'"
            >
              <div class="channel-title">Reaxys 数据集</div>
              <div class="channel-desc">
                含温度预测
                <br />
                适用于Reaxys反应条件验证
              </div>
              <el-icon v-if="evalDataset === 'reaxys'" class="check-icon"><Select /></el-icon>

              <div v-if="historyCache.reaxys" class="history-action-wrapper">
                <el-button type="primary" plain size="small" @click.stop="viewHistory('reaxys')">
                  <el-icon><Clock /></el-icon>
                  查看历史数据
                </el-button>
              </div>
            </div>
          </el-col>
        </el-row>

        <div v-if="evalDataset" class="upload-section animate-fade-in">
          <el-upload
            ref="evalUploadRef"
            drag
            action="#"
            :auto-upload="false"
            :limit="1"
            :on-change="handleEvalFileChange"
            :on-remove="handleEvalFileRemove"
          >
            <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
            <div class="el-upload__text">
              拖拽 {{ evalDataset === "uspto" ? "USPTO" : "Reaxys" }} 测试集到此处 或
              <em>点击上传</em>
            </div>
          </el-upload>

          <div class="action-footer">
            <el-button type="primary" size="large" :disabled="!evalFile" @click="startEvaluation">
              开始计算准确率
            </el-button>
          </div>
        </div>
      </div>

      <div v-else-if="evalStep === 1" class="eval-step-loading">
        <el-skeleton :rows="6" animated />
        <div class="loading-text">
          <el-icon class="is-loading"><Loading /></el-icon>
          正在执行模型推理与结果评估，请耐心等待...
        </div>
      </div>

      <div v-else-if="evalStep === 2" class="eval-step-results animate-fade-in">
        <div class="results-header">
          <el-tag type="success" effect="dark" size="large">
            当前数据集：{{ evalDataset === "uspto" ? "USPTO (无温度)" : "Reaxys (含温度)" }}
          </el-tag>
          <el-radio-group v-model="activeTopK" size="large" class="topk-selector">
            <el-radio-button label="top-1">Top-1</el-radio-button>
            <el-radio-button label="top-3">Top-3</el-radio-button>
            <el-radio-button label="top-5">Top-5</el-radio-button>
            <el-radio-button label="top-10">Top-10</el-radio-button>
            <el-radio-button label="top-15">Top-15</el-radio-button>
          </el-radio-group>
        </div>

        <el-table
          :data="currentEvalTableData"
          border
          stripe
          style="width: 100%"
          class="custom-eval-table"
        >
          <el-table-column label="评估维度" min-width="170" align="center">
            <template #default="scope">
              <div
                style="
                  display: inline-flex;
                  gap: 6px;
                  align-items: center;
                  justify-content: center;
                  width: 100%;
                "
              >
                <span style="font-weight: 500">{{ scope.row.metric }}</span>

                <el-tooltip
                  v-if="scope.row.metric.includes('MAE')"
                  effect="dark"
                  content="Mean Absolute Error (平均绝对误差)：表示模型预测温度与真实温度之间的平均绝对偏差。数值越低，说明温度预测的精确度越高。"
                  placement="top"
                >
                  <el-icon color="#409eff" style="font-size: 14px; cursor: help">
                    <InfoFilled />
                  </el-icon>
                </el-tooltip>

                <el-tooltip
                  v-if="scope.row.metric.includes('R²') || scope.row.metric.includes('R2')"
                  effect="dark"
                  content="R-squared (决定系数)：衡量模型对温度变化趋势的拟合优度。最大值为 1，数值越接近 1 说明模型对温度趋势的掌控能力越强。"
                  placement="top"
                >
                  <el-icon color="#409eff" style="font-size: 14px; cursor: help">
                    <InfoFilled />
                  </el-icon>
                </el-tooltip>
              </div>
            </template>
          </el-table-column>

          <el-table-column label="Baseline基线模型(Parrot)" min-width="140" align="center">
            <template #default="scope">
              <span class="baseline-text">{{ scope.row.baseline }}</span>
            </template>
          </el-table-column>
          <el-table-column label="本研究方法" min-width="200" align="center">
            <template #default="scope">
              <span class="ours-text">{{ scope.row.ours }}</span>
            </template>
          </el-table-column>
        </el-table>

        <div class="action-footer mt-20">
          <el-button @click="handleReEvaluate">重新验证新文件</el-button>
          <el-button type="primary" @click="evalDialogVisible = false">关闭</el-button>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from "vue";
import axios from "axios";
import { ElMessage } from "element-plus";
// 引入新增的 Clock 图标用于展示历史按钮，Select 和 Loading 用于弹窗视图切换
import {
  Search,
  UploadFilled,
  Cpu,
  Select,
  Loading,
  Clock,
  InfoFilled,
} from "@element-plus/icons-vue";

const API_BASE_URL = "http://localhost:5004";

// ================= 基础预测状态 =================
const activeTab = ref("manual");
const predictLoading = ref(false);
const enableCluster = ref(true);

const form = reactive({
  fullSmiles: "",
  reactant: "",
  product: "",
});

const uploadRef = ref();
const selectedFile = ref(null);

const hasPrediction = ref(false);
const currentReaction = ref("");
const candidateRows = ref([]);
const clusterRows = ref([]);

const top3Results = computed(() => clusterRows.value.slice(0, 3));

// ================= 准确率验证集评估状态与逻辑 =================
const evalDialogVisible = ref(false);
const evalStep = ref(0); // 0: 选择与上传, 1: 计算中, 2: 结果展示
const evalDataset = ref(""); // 'uspto' 或 'reaxys'
const evalFile = ref(null);

const evalResults = ref({}); // 存储当前展示的各 Top-K 数据字典
const activeTopK = ref("top-10"); // 默认展示 Top-10 结果

// 新增：双通道独立历史缓存状态指示器
const historyCache = reactive({
  uspto: false,
  reaxys: false,
});

// 组件挂载时，静默检测两个数据集是否有历史缓存，用以点亮“历史数据”按钮
onMounted(() => {
  if (localStorage.getItem("eval_history_uspto")) {
    historyCache.uspto = true;
  }
  if (localStorage.getItem("eval_history_reaxys")) {
    historyCache.reaxys = true;
  }
});

// 根据当前选择的 Top-K 动态返回表格数据
const currentEvalTableData = computed(() => {
  return evalResults.value[activeTopK.value] || [];
});

// 点击主页面的“计算预测准确率”按钮打开弹窗
const handleCalculateAccuracy = () => {
  evalDialogVisible.value = true;
};

// 恢复对应通道的历史测算快照，瞬间切换至结果展示页 (秒级秒回)
const viewHistory = (datasetType) => {
  const localData = localStorage.getItem(`eval_history_${datasetType}`);
  if (localData) {
    try {
      evalResults.value = JSON.parse(localData);
      evalDataset.value = datasetType;
      evalStep.value = 2; // 跨越 Loading 直接展示表格结果
      ElMessage.success(`已恢复 ${datasetType.toUpperCase()} 数据集的最新历史计算快照`);
    } catch (e) {
      console.error("读取历史数据解析失败:", e);
      ElMessage.error("读取历史数据失败，本地存储可能已被清理或损坏");
      localStorage.removeItem(`eval_history_${datasetType}`);
      historyCache[datasetType] = false;
    }
  }
};

// 记录评估集上传文件
const handleEvalFileChange = (file) => {
  evalFile.value = file.raw || null;
};

const handleEvalFileRemove = () => {
  evalFile.value = null;
};

// 用户点击“重新验证新文件”或关闭弹窗时调用，将流转恢复至卡片首页，保留卡片上的历史记录按钮
const handleReEvaluate = () => {
  evalStep.value = 0;
  evalFile.value = null;
  evalDataset.value = "";
  evalResults.value = {};
  activeTopK.value = "top-10";
};

// 提交至后端进行全量模型评估测算
const startEvaluation = async () => {
  if (!evalFile.value || !evalDataset.value) return;

  evalStep.value = 1; // 进入全量测算 Loading 动画页面

  const formData = new FormData();
  formData.append("dataset_type", evalDataset.value);
  formData.append("file", evalFile.value);

  try {
    const response = await axios.post(`${API_BASE_URL}/api/reaction/evaluate`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    if (response.data.code === 0) {
      evalResults.value = response.data.data.results;
      evalStep.value = 2; // 切换至结果展示状态

      // === 【核心改动】：得到新结果后，根据通道名覆盖并刷新对应的历史缓存 ===
      const cacheKey = `eval_history_${evalDataset.value}`;
      localStorage.setItem(cacheKey, JSON.stringify(evalResults.value));
      historyCache[evalDataset.value] = true; // 激活该卡片的历史数据查看入口
      ElMessage.success("测算完成，最新结果已成功覆盖历史数据！");
    } else {
      ElMessage.error(response.data.message || "评估失败");
      evalStep.value = 0;
    }
  } catch (error) {
    console.error("Evaluation API Error:", error);
    ElMessage.error("后端推理服务异常，请检查后端模型显存与 Neo4j 连接");
    evalStep.value = 0;
  }
};
// ========================================================

// ================= 以下为原有的基础预测核心方法保留 =================
const normalizeValue = (val) => {
  if (val === null || val === undefined) return "-";
  const text = String(val).trim();
  if (!text || text.toLowerCase() === "nan" || text.toLowerCase() === "none") {
    return "-";
  }
  return text;
};

const normalizeRow = (item = {}, index = 0) => ({
  rank: item.rank ?? index + 1,
  catalyst: normalizeValue(item.catalyst ?? item.c1 ?? item.catalyst1),
  solvent1: normalizeValue(item.solvent1 ?? item.s1),
  solvent2: normalizeValue(item.solvent2 ?? item.s2),
  reagent1: normalizeValue(item.reagent1 ?? item.r1 ?? item.reagent),
  reagent2: normalizeValue(item.reagent2 ?? item.r2),
  score: Number(item.score ?? item.final_score ?? item.confidence_score ?? 0),
  sources: Array.isArray(item.sources) ? item.sources : [],
});

const displayText = (val) => normalizeValue(val);

const joinPair = (a, b) => {
  const left = normalizeValue(a);
  const right = normalizeValue(b);

  if (left === "-" && right === "-") return "-";
  if (left !== "-" && right !== "-") return `${left} + ${right}`;
  return left !== "-" ? left : right;
};

const formatScore = (val) => {
  let num = Number(val || 0);
  if (!Number.isFinite(num)) return "0.0000";

  if (num < 0) {
    const sequenceLength = 5;
    num = Math.exp(num / sequenceLength);
  }

  return num.toFixed(4);
};

const extractRowsFromResponse = (payload) => {
  if (!payload) return { candidates: [], clusters: [], reaction: "" };

  const data = payload.data ?? payload;
  const first = Array.isArray(data) ? data[0] : data;

  if (!first) return { candidates: [], clusters: [], reaction: "" };

  const candidates =
    first.candidates_top15 || first.candidates || first.results || first.top15 || [];

  const clusters =
    first.cluster_recommendations ||
    first.optimized_conditions ||
    first.cluster_results ||
    first.top3 ||
    [];

  const reaction = first.reaction_smiles || first.smiles || first.reaction || "";

  return {
    candidates: candidates.map(normalizeRow).slice(0, 15),
    clusters: clusters.map(normalizeRow).slice(0, 3),
    reaction,
  };
};

const clearResultState = () => {
  hasPrediction.value = false;
  currentReaction.value = "";
  candidateRows.value = [];
  clusterRows.value = [];
};

const applyResponse = (payload) => {
  const { candidates, clusters, reaction } = extractRowsFromResponse(payload);
  candidateRows.value = candidates;
  clusterRows.value = enableCluster.value ? clusters : [];
  currentReaction.value = reaction || currentReaction.value;
  hasPrediction.value = candidates.length > 0 || clusterRows.value.length > 0;
};

const buildDemoResponse = (reactionSmiles = "") => ({
  data: [
    {
      reaction_smiles: reactionSmiles || "c1ccccc1Br.CC(=O)O[K]>>c1ccccc1C(=O)O",
      candidates_top15: [
        {
          rank: 1,
          catalyst: "Pd(OAc)2",
          solvent1: "THF",
          solvent2: "H2O",
          reagent1: "K2CO3",
          reagent2: "-",
          score: 0.9854,
        },
        {
          rank: 2,
          catalyst: "Pd2(dba)3",
          solvent1: "1,4-dioxane",
          solvent2: "-",
          reagent1: "Cs2CO3",
          reagent2: "-",
          score: 0.9632,
        },
        {
          rank: 3,
          catalyst: "Ni(cod)2",
          solvent1: "Toluene",
          solvent2: "-",
          reagent1: "NaOtBu",
          reagent2: "-",
          score: 0.9421,
        },
        {
          rank: 4,
          catalyst: "CuI",
          solvent1: "DMSO",
          solvent2: "-",
          reagent1: "K3PO4",
          reagent2: "-",
          score: 0.921,
        },
        {
          rank: 5,
          catalyst: "Pd(PPh3)4",
          solvent1: "DMF",
          solvent2: "-",
          reagent1: "Et3N",
          reagent2: "-",
          score: 0.9055,
        },
        {
          rank: 6,
          catalyst: "PdCl2(dppf)",
          solvent1: "MeCN",
          solvent2: "-",
          reagent1: "K2CO3",
          reagent2: "-",
          score: 0.8912,
        },
        {
          rank: 7,
          catalyst: "NiCl2",
          solvent1: "THF",
          solvent2: "-",
          reagent1: "Zn",
          reagent2: "-",
          score: 0.8754,
        },
        {
          rank: 8,
          catalyst: "Pd(OAc)2",
          solvent1: "Toluene",
          solvent2: "H2O",
          reagent1: "Na2CO3",
          reagent2: "-",
          score: 0.8628,
        },
        {
          rank: 9,
          catalyst: "CuBr",
          solvent1: "DMSO",
          solvent2: "-",
          reagent1: "KOH",
          reagent2: "-",
          score: 0.8462,
        },
        {
          rank: 10,
          catalyst: "Pd2(dba)3",
          solvent1: "THF",
          solvent2: "-",
          reagent1: "CsF",
          reagent2: "-",
          score: 0.8331,
        },
        {
          rank: 11,
          catalyst: "FeCl3",
          solvent1: "EtOH",
          solvent2: "-",
          reagent1: "NaOH",
          reagent2: "-",
          score: 0.8203,
        },
        {
          rank: 12,
          catalyst: "Pd/C",
          solvent1: "MeOH",
          solvent2: "-",
          reagent1: "H2",
          reagent2: "-",
          score: 0.8112,
        },
        {
          rank: 13,
          catalyst: "RuPhos Pd G3",
          solvent1: "THF",
          solvent2: "H2O",
          reagent1: "K3PO4",
          reagent2: "-",
          score: 0.8048,
        },
        {
          rank: 14,
          catalyst: "Ni(acac)2",
          solvent1: "DMAc",
          solvent2: "-",
          reagent1: "Mn",
          reagent2: "-",
          score: 0.798,
        },
        {
          rank: 15,
          catalyst: "Pd(OAc)2",
          solvent1: "Acetone",
          solvent2: "-",
          reagent1: "NaOAc",
          reagent2: "-",
          score: 0.7865,
        },
      ],
      cluster_recommendations: [
        {
          rank: 1,
          catalyst: "Pd(OAc)2",
          solvent1: "THF",
          solvent2: "H2O",
          reagent1: "K2CO3",
          reagent2: "-",
          score: 0.9921,
          sources: ["parrot", "kg_template"],
        },
        {
          rank: 2,
          catalyst: "Pd2(dba)3",
          solvent1: "1,4-dioxane",
          solvent2: "-",
          reagent1: "Cs2CO3",
          reagent2: "-",
          score: 0.9544,
          sources: ["kg_cluster"],
        },
        {
          rank: 3,
          catalyst: "Ni(cod)2",
          solvent1: "Toluene",
          solvent2: "-",
          reagent1: "NaOtBu",
          reagent2: "-",
          score: 0.9318,
          sources: ["parrot"],
        },
      ],
    },
  ],
});

const submitPrediction = async (formData, reactionSmilesForFallback = "") => {
  predictLoading.value = true;
  clearResultState();

  try {
    const response = await axios.post(`${API_BASE_URL}/api/reaction/predict`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    applyResponse(response.data);
    currentReaction.value = currentReaction.value || reactionSmilesForFallback;

    if (!candidateRows.value.length) {
      ElMessage.warning("后端已返回，但未解析到候选结果");
      return;
    }

    ElMessage.success(
      `预测完成，Top-15 候选 ${candidateRows.value.length} 条${
        enableCluster.value ? `，聚类推荐 ${clusterRows.value.length} 条` : ""
      }`
    );
  } catch (error) {
    console.error("Prediction API Error:", error);
    ElMessage.warning("后端暂不可用，已切换为演示数据");
    applyResponse(buildDemoResponse(reactionSmilesForFallback));
  } finally {
    predictLoading.value = false;
  }
};

const handlePredict = async () => {
  const smilesList = form.fullSmiles
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);

  if (!smilesList.length) {
    ElMessage.warning("请输入至少一条完整反应 SMILES");
    return;
  }

  const invalid = smilesList.find((item) => !item.includes(">>"));
  if (invalid) {
    ElMessage.warning(`存在无效反应格式：${invalid}`);
    return;
  }

  const formData = new FormData();
  formData.append("input_mode", "full_smiles");
  formData.append("smiles_text", smilesList.join("\n"));
  formData.append("enable_cluster", String(enableCluster.value));

  await submitPrediction(formData, smilesList[0]);
};

const handleManual2Predict = async () => {
  const reactant = form.reactant.trim();
  const product = form.product.trim();

  if (!reactant || !product) {
    ElMessage.warning("请完整填写反应物和产物");
    return;
  }

  const reactionSmiles = `${reactant}>>${product}`;

  const formData = new FormData();
  formData.append("input_mode", "reactants_products");
  formData.append("reactants", reactant);
  formData.append("products", product);
  formData.append("enable_cluster", String(enableCluster.value));

  await submitPrediction(formData, reactionSmiles);
};

const beforeUpload = (file) => {
  const isTxt = file.name.toLowerCase().endsWith(".txt");
  if (!isTxt) {
    ElMessage.error("仅支持上传 .txt 文件");
  }
  return isTxt;
};

const handleFileChange = (file) => {
  selectedFile.value = file.raw || null;
};

const handleFileRemove = () => {
  selectedFile.value = null;
};

const handleFilePredict = async () => {
  if (!selectedFile.value) {
    ElMessage.warning("请先选择 .txt 文件");
    return;
  }

  const formData = new FormData();
  formData.append("input_mode", "file");
  formData.append("file", selectedFile.value);
  formData.append("enable_cluster", String(enableCluster.value));

  await submitPrediction(formData, selectedFile.value.name);
};
</script>

<style scoped>
.app-container {
  height: calc(100vh - 100px);
  padding: 0 20px;
}

.h-100 {
  height: 100%;
}

.mb-20 {
  margin-bottom: 20px;
}

.left-panel,
.right-panel {
  height: 100%;
}

.right-panel {
  display: flex;
  flex-direction: column;
}

/* ================= 弹性布局容纳底部按钮 ================= */
:deep(.left-panel .el-card__body) {
  display: flex;
  flex-direction: column;
  height: calc(100% - 52px);
}

.input-tabs {
  flex: 1;
  min-height: 0;
  border: none;
  box-shadow: none;
}

.accuracy-action-wrapper {
  flex-shrink: 0;
  padding-top: 15px;
  margin-top: 15px;
  border-top: 1px dashed #e4e7ed;
}

.btn-accuracy {
  width: 100%;
  font-weight: bold;
}
/* ======================================================== */

:deep(.el-tabs__content) {
  padding: 16px 0;
}

:deep(.input-tabs .el-tabs__content) {
  height: calc(100% - 36px);
}

:deep(.input-tabs .el-tab-pane) {
  height: 100%;
}

.card-header {
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  font-size: 16px;
  font-weight: 600;
}

.header-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
}

.btn-submit {
  width: 100%;
}

.top-panel-card {
  display: flex;
  flex-direction: column;
  height: 300px;
}

.loading-state,
.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}

.top-cards-container {
  height: 100%;
  padding: 10px 0;
}

.rank-card {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 12px;
  color: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s;
}

.rank-card:hover {
  transform: translateY(-3px);
}

.rank-1 {
  background: linear-gradient(135deg, #ffd700, #fdb931);
  border: 1px solid #e6c100;
}

.rank-2 {
  color: #555;
  background: linear-gradient(135deg, #e0e0e0, #bdbdbd);
  border: 1px solid #ccc;
}

.rank-3 {
  background: linear-gradient(135deg, #cd7f32, #a0522d);
  border: 1px solid #b87333;
}

.rank-badge {
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 700;
}

.card-score {
  margin-bottom: 8px;
  text-align: center;
}

.card-score .label {
  display: block;
  font-size: 11px;
  opacity: 0.85;
}

.card-score .value {
  font-size: 24px;
  font-weight: 700;
}

.card-divider {
  margin: 8px 0;
  opacity: 0.4;
}

.chem-details {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 6px;
  justify-content: center;
}

.detail-item {
  display: flex;
  gap: 6px;
  justify-content: space-between;
  padding: 5px 6px;
  font-size: 12px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 4px;
}

.chem-label {
  min-width: 50px;
  font-weight: 600;
  opacity: 0.9;
}

.chem-value {
  flex: 1;
  text-align: right;
  overflow-wrap: break-word;
}

.result-table-card {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
}

.score-text {
  font-weight: 600;
  color: #ff5722;
}

:deep(.result-table-card .el-card__body) {
  flex: 1;
  min-height: 0;
}

:deep(.result-table-card .el-table) {
  height: 100%;
}

:deep(.el-upload-dragger) {
  width: 100%;
}

:deep(.el-upload) {
  width: 100%;
}

:deep(.el-form-item__label) {
  font-size: 14px;
  font-weight: 500;
}

:deep(.el-input__placeholder) {
  font-size: 13px;
}

:deep(.el-table__header-wrapper) {
  font-size: 13px;
}

:deep(.el-table__cell) {
  font-size: 13px;
}

/* ================= 评估弹窗样式 ================= */
.eval-step-selection {
  padding: 10px 20px;
}
.step-desc {
  margin-bottom: 20px;
  font-size: 15px;
  color: #606266;
}
.channel-row {
  margin-bottom: 25px;
}
.channel-card {
  position: relative;
  padding: 20px;
  text-align: center;
  cursor: pointer;
  background-color: #fafafa;
  border: 2px solid #ebeef5;
  border-radius: 8px;
  transition: all 0.3s ease;
}
.channel-card:hover {
  border-color: #409eff;
  transform: translateY(-2px);
}
.channel-card.active {
  background-color: #ecf5ff;
  border-color: #409eff;
}
.channel-title {
  margin-bottom: 10px;
  font-size: 18px;
  font-weight: bold;
  color: #303133;
}
.channel-desc {
  font-size: 13px;
  line-height: 1.5;
  color: #909399;
}
.check-icon {
  position: absolute;
  top: 10px;
  right: 10px;
  font-size: 20px;
  color: #409eff;
}
.upload-section {
  margin-top: 20px;
  text-align: center;
}
.action-footer {
  display: flex;
  gap: 15px;
  justify-content: center;
  margin-top: 25px;
}
.eval-step-loading {
  padding: 40px 20px;
  text-align: center;
}
.loading-text {
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: center;
  margin-top: 20px;
  font-size: 16px;
  color: #409eff;
}
.results-header {
  display: flex;
  flex-direction: column;
  gap: 15px;
  align-items: center;
  margin-bottom: 20px;
}
.baseline-text {
  color: #606266;
}
.ours-text {
  font-size: 15px;
  font-weight: bold;
  color: #67c23a;
}
.mt-20 {
  margin-top: 20px;
}
.animate-fade-in {
  animation: fadeIn 0.4s ease-in-out;
}
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.history-action-wrapper {
  display: flex;
  justify-content: center;
  padding-top: 15px;
  margin-top: 15px;
  border-top: 1px dashed #ebeef5;
  transition: all 0.3s ease;
}

.channel-card:hover .history-action-wrapper {
  border-top-color: #c6e2ff;
}
</style>
