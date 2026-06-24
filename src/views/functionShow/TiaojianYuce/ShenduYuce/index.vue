<template>
  <div class="app-container">
    <div class="search-bar">
      <el-tabs v-model="activeTab" type="border-card" class="demo-tabs">
        <el-tab-pane name="predict">
          <template #label>
            <span class="custom-tabs-label">
              <span>深度预测工作台</span>
            </span>
          </template>

          <div class="predict-wrapper">
            <el-card class="sidebar-card" shadow="never">
              <div class="sidebar-header">
                <div class="title">预测状态</div>
                <el-tag :type="backendReady ? 'success' : 'danger'" size="small" effect="dark">
                  {{ backendReady ? "Backend Ready" : "Backend Offline" }}
                </el-tag>
              </div>

              <div class="evidence-info">
                <div class="evidence-item">
                  <el-icon><Document /></el-icon>
                  <span>模板检索</span>
                </div>
                <div class="evidence-item">
                  <el-icon><Cpu /></el-icon>
                  <span>反应相似性检索</span>
                </div>
                <div class="evidence-item">
                  <el-icon><Connection /></el-icon>
                  <span>大模型反应条件输出</span>
                </div>
              </div>

              <el-divider content-position="left">历史任务</el-divider>

              <div class="history-list">
                <div
                  v-for="item in historyList"
                  :key="item.id"
                  class="history-item"
                  :class="{ active: currentSessionId === item.id }"
                  @click="switchSession(item.id)"
                >
                  <div class="history-title">{{ item.title }}</div>
                  <div class="history-time">{{ item.time }}</div>
                </div>
              </div>

              <div class="new-task-btn">
                <el-button type="primary" plain class="w-100" @click="createNewSession">
                  <el-icon class="mr-1"><Plus /></el-icon>
                  新建预测任务
                </el-button>
              </div>
            </el-card>

            <el-card class="main-card" shadow="never">
              <div ref="messagesRef" class="message-list">
                <div v-if="messages.length === 0" class="empty-state">
                  <div class="icon-box">🧬</div>
                  <h3>请输入反应 SMILES</h3>
                  <p>系统将自动完成反应条件预测</p>
                  <div class="quick-actions">
                    <el-button
                      size="small"
                      @click="
                        fillInput('CC(C)(CO)C(=O)C1CCCC2=C1OC=C2>>CC(C)(C=O)C(=O)C1CCCC2=C1OC=C2')
                      "
                    >
                      示例 1: 跨数据来源样本
                    </el-button>
                    <el-button
                      size="small"
                      @click="fillInput('C[Mg]Br.CCOC(=O)CC([O-])=O>>CCOC(=O)\C=C(\O)[O-]')"
                    >
                      示例 2: 模板未命中样本
                    </el-button>
                  </div>
                </div>

                <div
                  v-for="(msg, index) in messages"
                  :key="index"
                  class="chat-item"
                  :class="msg.role"
                >
                  <div class="chat-avatar">
                    <el-avatar v-if="msg.role === 'user'" :icon="UserFilled" />
                    <div v-else class="system-avatar">AI</div>
                  </div>

                  <div class="chat-content">
                    <div v-if="msg.role === 'user'" class="user-message">
                      {{ msg.content }}
                    </div>

                    <div v-else class="system-message">
                      <div v-if="msg.isThinking || hasEvidence(msg)" class="evidence-section">
                        <el-collapse v-model="msg.activePanels">
                          <el-collapse-item name="thinking">
                            <template #title>
                              <el-icon
                                v-if="msg.isThinking"
                                class="is-loading"
                                style="margin-right: 5px"
                              >
                                <Loading />
                              </el-icon>
                              <el-icon v-else style="margin-right: 5px; color: #67c23a">
                                <CircleCheck />
                              </el-icon>
                              <span>证据链路与后验决策</span>
                            </template>

                            <el-steps
                              v-if="msg.isThinking"
                              direction="vertical"
                              :active="msg.currentStep"
                              finish-status="success"
                              size="small"
                            >
                              <el-step title="生成先验候选" />
                              <el-step title="模板/检索证据构建" />
                              <el-step title="基准证据路径判定" />
                              <el-step title="受限后验决策与证据路径一致性约束" />
                            </el-steps>

                            <div v-else class="evidence-detail">
                              <div class="result-tags">
                                <el-tag size="small" :type="routeTagType(msg.meta?.selected_from)">
                                  最终路线：{{ routeLabel(msg.meta?.selected_from) || "-" }}
                                </el-tag>
                                <el-tag size="small" type="info">
                                  基线路线：{{ routeLabel(msg.meta?.baseline_route) || "-" }}
                                </el-tag>
                                <el-tag size="small" type="warning">
                                  模糊区：{{ boolLabel(msg.meta?.is_fuzzy_zone) }}
                                </el-tag>
                                <el-tag
                                  size="small"
                                  :type="msg.meta?.llm_used ? 'success' : 'info'"
                                >
                                  LLM：{{ boolLabel(msg.meta?.llm_used) }}
                                </el-tag>
                              </div>

                              <el-divider content-position="left">最终条件结果</el-divider>
                              <div class="condition-grid">
                                <div class="condition-card">
                                  <div class="condition-label">催化剂</div>
                                  <div class="condition-value">
                                    <el-tag
                                      v-for="(item, i) in msg.meta?.catalysts || []"
                                      :key="`cat-${i}`"
                                      size="small"
                                    >
                                      {{ item }}
                                    </el-tag>
                                    <span
                                      v-if="!(msg.meta?.catalysts || []).length"
                                      class="empty-hint"
                                    >
                                      无
                                    </span>
                                  </div>
                                </div>

                                <div class="condition-card">
                                  <div class="condition-label">溶剂</div>
                                  <div class="condition-value">
                                    <el-tag
                                      v-for="(item, i) in msg.meta?.solvents || []"
                                      :key="`sol-${i}`"
                                      type="warning"
                                      size="small"
                                    >
                                      {{ item }}
                                    </el-tag>
                                    <span
                                      v-if="!(msg.meta?.solvents || []).length"
                                      class="empty-hint"
                                    >
                                      无
                                    </span>
                                  </div>
                                </div>

                                <div class="condition-card">
                                  <div class="condition-label">试剂</div>
                                  <div class="condition-value">
                                    <el-tag
                                      v-for="(item, i) in msg.meta?.reagents || []"
                                      :key="`rea-${i}`"
                                      type="success"
                                      size="small"
                                    >
                                      {{ item }}
                                    </el-tag>
                                    <span
                                      v-if="!(msg.meta?.reagents || []).length"
                                      class="empty-hint"
                                    >
                                      无
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <el-divider content-position="left">决策概览</el-divider>
                              <div class="summary-panel">
                                <div class="summary-item">
                                  <div class="summary-label">LLM 选择路线</div>
                                  <div class="summary-value">
                                    {{ routeLabel(msg.meta?.llm_selected_route) || "-" }}
                                  </div>
                                </div>
                                <div class="summary-item">
                                  <div class="summary-label">一致性约束</div>
                                  <div class="summary-value">
                                    {{ boolLabel(msg.meta?.route_consistency_enforced) }}
                                  </div>
                                </div>
                                <div class="summary-item">
                                  <div class="summary-label">化学一致性修复</div>
                                  <div class="summary-value">
                                    {{ boolLabel(msg.meta?.chemical_consistency_repaired) }}
                                  </div>
                                </div>
                                <div class="summary-item">
                                  <div class="summary-label">回退原因</div>
                                  <div class="summary-value text-wrap">
                                    {{ msg.meta?.guard_fallback_reason || "-" }}
                                  </div>
                                </div>
                              </div>

                              <el-divider content-position="left">证据分支</el-divider>
                              <div class="branch-panel">
                                <div class="branch-item">
                                  <div class="branch-label">生成先验</div>
                                  <div class="branch-value">
                                    Top 候选：{{ (msg.meta?.generator_candidates || []).length }}
                                  </div>
                                </div>
                                <div class="branch-item">
                                  <div class="branch-label">模板证据</div>
                                  <div class="branch-value">
                                    候选：{{
                                      evidenceCaseCount(
                                        msg.meta?.template_evidence,
                                        "template_candidates"
                                      )
                                    }}
                                  </div>
                                </div>
                                <div class="branch-item">
                                  <div class="branch-label">目标域主检索</div>
                                  <div class="branch-value">
                                    案例：{{
                                      evidenceCaseCount(
                                        msg.meta?.reaxys_retrieval_evidence,
                                        "retrieved_cases"
                                      )
                                    }}
                                  </div>
                                </div>
                                <div class="branch-item">
                                  <div class="branch-label">辅助域检索</div>
                                  <div class="branch-value">
                                    案例：{{
                                      evidenceCaseCount(
                                        msg.meta?.uspto_retrieval_evidence,
                                        "retrieved_cases"
                                      )
                                    }}
                                  </div>
                                </div>
                              </div>

                              <el-divider content-position="left">详细证据</el-divider>
                              <el-collapse>
                                <el-collapse-item
                                  :title="`生成候选 (${(msg.meta?.generator_candidates || []).length})`"
                                  name="gen"
                                >
                                  <pre class="json-content">{{
                                    formatJson(msg.meta?.generator_candidates || [])
                                  }}</pre>
                                </el-collapse-item>
                                <el-collapse-item
                                  :title="`模板证据 (${evidenceCaseCount(msg.meta?.template_evidence, 'template_candidates')})`"
                                  name="tpl"
                                >
                                  <pre class="json-content">{{
                                    formatJson(msg.meta?.template_evidence || {})
                                  }}</pre>
                                </el-collapse-item>
                                <el-collapse-item
                                  :title="`目标域主检索 (${evidenceCaseCount(msg.meta?.reaxys_retrieval_evidence, 'retrieved_cases')})`"
                                  name="reaxys"
                                >
                                  <pre class="json-content">{{
                                    formatJson(msg.meta?.reaxys_retrieval_evidence || {})
                                  }}</pre>
                                </el-collapse-item>
                                <el-collapse-item
                                  :title="`辅助域检索 (${evidenceCaseCount(msg.meta?.uspto_retrieval_evidence, 'retrieved_cases')})`"
                                  name="uspto"
                                >
                                  <pre class="json-content">{{
                                    formatJson(msg.meta?.uspto_retrieval_evidence || {})
                                  }}</pre>
                                </el-collapse-item>
                                <el-collapse-item title="路线候选" name="routes">
                                  <pre class="json-content">{{
                                    formatJson(msg.meta?.route_candidates || {})
                                  }}</pre>
                                </el-collapse-item>
                                <el-collapse-item title="决策状态" name="state">
                                  <pre class="json-content">{{
                                    formatJson(msg.meta?.decision_state || {})
                                  }}</pre>
                                </el-collapse-item>
                                <el-collapse-item title="证据摘要" name="summary">
                                  <pre class="json-content">{{
                                    formatJson(msg.meta?.evidence_summary || {})
                                  }}</pre>
                                </el-collapse-item>
                              </el-collapse>
                            </div>
                          </el-collapse-item>
                        </el-collapse>
                      </div>

                      <div class="text-content" v-html="formatText(msg.content)"></div>
                    </div>
                  </div>
                </div>
              </div>

              <div class="input-panel">
                <div class="config-section">
                  <el-collapse>
                    <el-collapse-item name="runtime-config">
                      <template #title>
                        <span>运行时配置（可选，JSON）</span>
                      </template>
                      <div class="config-actions">
                        <el-button size="small" @click="loadExampleRuntimeConfig">
                          填充第四章示例配置
                        </el-button>
                        <el-button size="small" @click="runtimeConfigText = ''">清空配置</el-button>
                      </div>
                      <el-input
                        v-model="runtimeConfigText"
                        type="textarea"
                        :rows="6"
                        placeholder="可选：粘贴 runtime_config JSON"
                        resize="vertical"
                      />
                    </el-collapse-item>
                  </el-collapse>
                </div>

                <el-input
                  v-model="inputQuery"
                  type="textarea"
                  :rows="3"
                  placeholder="输入反应 SMILES 或描述您的反应需求..."
                  resize="none"
                  @keydown.ctrl.enter.prevent="sendMessage"
                  @keydown.meta.enter.prevent="sendMessage"
                />
                <div class="action-row">
                  <el-tooltip content="清空当前上下文" placement="top">
                    <el-button circle size="small" :icon="Refresh" @click="resetContext" />
                  </el-tooltip>
                  <el-checkbox v-model="forceReinitialize" class="force-reinit">
                    强制重载后端配置
                  </el-checkbox>
                  <el-button type="primary" :loading="isGenerating" @click="sendMessage">
                    运行决策
                    <el-icon class="el-icon--right"><Promotion /></el-icon>
                  </el-button>
                </div>
              </div>
            </el-card>
          </div>
        </el-tab-pane>
      </el-tabs>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, nextTick, onMounted } from "vue";
import { ElMessage } from "element-plus";
import {
  UserFilled,
  Promotion,
  Document,
  Cpu,
  Connection,
  Plus,
  Loading,
  CircleCheck,
  Refresh,
} from "@element-plus/icons-vue";

const activeTab = ref("predict");
const API_BASE_URL = "http://localhost:5004";

const inputQuery = ref("");
const runtimeConfigText = ref("");
const forceReinitialize = ref(false);
const isGenerating = ref(false);
const messagesRef = ref(null);
const currentSessionId = ref(1);
const backendReady = ref(true);

const historyList = ref([{ id: 1, title: "默认任务", time: "刚刚" }]);

const sessionMap = reactive({
  1: [],
});

const messages = ref(sessionMap[1]);

const routeMap = {
  tpl: "模板证据路线",
  reaxys: "目标域主检索路线",
  uspto: "辅助域检索路线",
  gen: "生成先验路线",
  exact: "知识图谱精确匹配",
  mixed: "混合路线",
};

const fillInput = (text) => {
  inputQuery.value = text;
};

const createNewSession = () => {
  const id = Date.now();
  sessionMap[id] = [];
  historyList.value.unshift({
    id,
    title: "新对话",
    time: "刚刚",
  });
  currentSessionId.value = id;
  messages.value = sessionMap[id];
};

const switchSession = (id) => {
  currentSessionId.value = id;
  if (!sessionMap[id]) {
    sessionMap[id] = [];
  }
  messages.value = sessionMap[id];
  scrollToBottom();
};

const scrollToBottom = () => {
  nextTick(() => {
    if (messagesRef.value) {
      messagesRef.value.scrollTop = messagesRef.value.scrollHeight;
    }
  });
};

const formatText = (text) => {
  if (!text) return "";
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br/>");
};

const formatJson = (obj) => {
  try {
    return JSON.stringify(obj, null, 2);
  } catch {
    return "{}";
  }
};

const routeLabel = (val) => {
  const key = String(val || "").trim();
  return routeMap[key] || key;
};

const boolLabel = (val) => (val ? "是" : "否");

const routeTagType = (route) => {
  const mapping = {
    tpl: "success",
    reaxys: "warning",
    uspto: "info",
    gen: "",
    exact: "success",
  };
  return mapping[String(route || "").trim()] || "info";
};

const evidenceCaseCount = (obj, key) => {
  const arr = obj?.[key];
  return Array.isArray(arr) ? arr.length : 0;
};

const hasEvidence = (msg) => {
  if (!msg?.meta) return false;
  return (
    (msg.meta.generator_candidates || []).length > 0 ||
    evidenceCaseCount(msg.meta.template_evidence, "template_candidates") > 0 ||
    evidenceCaseCount(msg.meta.reaxys_retrieval_evidence, "retrieved_cases") > 0 ||
    evidenceCaseCount(msg.meta.uspto_retrieval_evidence, "retrieved_cases") > 0 ||
    Object.keys(msg.meta.route_candidates || {}).length > 0 ||
    Object.keys(msg.meta.decision_state || {}).length > 0
  );
};

const loadExampleRuntimeConfig = () => {
  runtimeConfigText.value = JSON.stringify(
    {
      pipeline_path: "F:/gitFiles/Parrot/inference_pipeline_v4_ch4_final_standalone.py",
      config_path: "F:/gitFiles/Parrot/configs/config_inference_use_uspto.yaml",
      neo4j_uri: "bolt://localhost:7687",
      neo4j_user: "neo4j",
      neo4j_pwd: "123456cz",
      template_bank_csv_path:
        "F:/gitFiles/Parrot/dataset/dataset_template/dataset_process/templates_output_split_with_conditions.csv",
      primary_faiss_index_path:
        "F:/gitFiles/Parrot/dataset/reaxys_chapter4/reaxys_faiss/rxn.index.faiss",
      primary_rxn_ids_path: "F:/gitFiles/Parrot/dataset/reaxys_chapter4/reaxys_faiss/rxn_ids.json",
      primary_dataset_csv_path:
        "F:/gitFiles/Parrot/dataset/reaxys_chapter4/reaxys_faiss/rxn_metadata_dedup.csv",
      auxiliary_faiss_index_path:
        "F:/gitFiles/Parrot/dataset/uspto_chapter4/uspto_faiss/rxn.index.faiss",
      auxiliary_rxn_ids_path: "F:/gitFiles/Parrot/dataset/uspto_chapter4/uspto_faiss/rxn_ids.json",
      auxiliary_dataset_csv_path:
        "F:/gitFiles/Parrot/dataset/uspto_chapter4/uspto_faiss/rxn_metadata_dedup.csv",
      condition_vocab_path: "F:/gitFiles/Parrot/dataset/pretrain_data/vocab.txt",
      llm_model: "qwen3.5-plus-2026-02-15",
    },
    null,
    2
  );
};

const parseRuntimeConfig = () => {
  const text = runtimeConfigText.value.trim();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    throw new Error("运行时配置 JSON 解析失败，请检查格式");
  }
};

const buildAiMessage = () =>
  reactive({
    role: "ai",
    content: "",
    isThinking: true,
    currentStep: 0,
    meta: null,
    activePanels: ["thinking"],
  });

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const runFakeProgress = async (aiMsg) => {
  aiMsg.currentStep = 1;
  await sleep(300);
  aiMsg.currentStep = 2;
  await sleep(350);
  aiMsg.currentStep = 3;
  await sleep(350);
  aiMsg.currentStep = 4;
};

const sendMessage = async () => {
  const text = inputQuery.value.trim();
  if (!text || isGenerating.value) return;

  messages.value.push({
    role: "user",
    content: text,
  });

  const current = historyList.value.find((item) => item.id === currentSessionId.value);
  if (current && current.title === "新对话") {
    current.title = text.length > 16 ? `${text.slice(0, 16)}...` : text;
  }

  inputQuery.value = "";
  isGenerating.value = true;
  scrollToBottom();

  const aiMsg = buildAiMessage();
  messages.value.push(aiMsg);
  scrollToBottom();

  try {
    const progressTask = runFakeProgress(aiMsg);

    const response = await fetch(`${API_BASE_URL}/api/llm/predict`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        input_text: text,
        runtime_config: parseRuntimeConfig(),
        force_reinitialize: forceReinitialize.value,
      }),
    });

    const responseText = await response.text();
    let raw = null;
    try {
      raw = JSON.parse(responseText);
    } catch (parseError) {
      console.error("Raw backend response:", responseText, parseError);
      const preview = responseText ? responseText.slice(0, 500) : "<empty response>";
      throw new Error(
        `后端返回无法解析为 JSON，HTTP ${response.status}，响应前500字符：${preview}`
      );
    }

    await progressTask;

    if (!response.ok) {
      throw new Error(raw?.message || `请求失败: HTTP ${response.status}`);
    }
    if (Number(raw?.code) !== 0) {
      throw new Error(raw?.message || "后端返回失败");
    }

    const payload = raw?.data ?? {};
    if (!payload?.answer && !payload?.result) {
      throw new Error("后端返回格式异常：缺少 answer/result");
    }

    aiMsg.content = payload?.answer || "未返回可展示答案";
    aiMsg.meta = payload?.result || {};
    aiMsg.isThinking = false;
    aiMsg.activePanels = [];

    backendReady.value = true;
    ElMessage.success("推理完成");
  } catch (error) {
    console.error("LLM predict error:", error);
    backendReady.value = false;
    aiMsg.isThinking = false;
    aiMsg.content =
      error?.message || "后端调用失败，请检查 /api/llm/predict 接口、模型初始化和配置路径。";
    aiMsg.meta = {
      source: "error",
      path: "request_failed",
      reasoning: String(error?.message || error),
    };
    aiMsg.activePanels = [];
    ElMessage.error(aiMsg.content);
  } finally {
    isGenerating.value = false;
    scrollToBottom();
  }
};

const resetContext = () => {
  sessionMap[currentSessionId.value] = [];
  messages.value = sessionMap[currentSessionId.value];
};

onMounted(() => {
  scrollToBottom();
});
</script>

<style scoped>
.predict-wrapper {
  display: flex;
  gap: 15px;
  height: calc(100vh - 180px);
  margin-top: 15px;
}

.sidebar-card {
  width: 280px;
  background-color: var(--el-bg-color-overlay);
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 15px;
}

.sidebar-header .title {
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.evidence-info {
  padding: 12px;
  margin-bottom: 15px;
  background-color: var(--el-fill-color-light);
  border-radius: 8px;
}

.evidence-item {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
  font-size: 13px;
  color: var(--el-text-color-regular);
}

.evidence-item:last-child {
  margin-bottom: 0;
}

.evidence-item .el-icon {
  margin-right: 8px;
  color: var(--el-color-primary);
}

.history-list {
  flex: 1;
  margin-bottom: 15px; /* 给底部的按钮留出间距 */
  overflow-y: auto;
}

.history-item {
  padding: 10px;
  margin-bottom: 6px;
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.2s;
}

.history-item:hover {
  background-color: var(--el-fill-color-light);
}

.history-item.active {
  background-color: var(--el-color-primary-light-9);
  border-left: 3px solid var(--el-color-primary);
}

.history-title {
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 13px;
  font-weight: 500;
  color: var(--el-text-color-primary);
  white-space: nowrap;
}

.history-time {
  margin-top: 4px;
  font-size: 11px;
  color: var(--el-text-color-placeholder);
}

.new-task-btn {
  flex-shrink: 0;
  margin-top: auto; /* 利用 auto 将按钮自动推到最底部 */
}

.w-100 {
  width: 100%;
}

.main-card {
  flex: 1;
  overflow: hidden;
  background-color: var(--el-bg-color-overlay);
}

/* ================= 核心修复：强制接管 el-card 内部 ================= */
.sidebar-card :deep(.el-card__body),
.main-card :deep(.el-card__body) {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.main-card :deep(.el-card__body) {
  padding: 0;
}
/* ================================================================= */

.message-list {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 300px;
  color: var(--el-text-color-placeholder);
}

.empty-state .icon-box {
  margin-bottom: 20px;
  font-size: 64px;
}

.empty-state h3 {
  margin-bottom: 8px;
  font-size: 18px;
  font-weight: 500;
  color: var(--el-text-color-primary);
}

.empty-state p {
  margin-bottom: 20px;
  font-size: 14px;
}

.quick-actions {
  display: flex;
  gap: 10px;
}

.chat-item {
  display: flex;
  margin-bottom: 20px;
}

.chat-avatar {
  margin-right: 12px;
}

.system-avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  font-size: 14px;
  font-weight: bold;
  color: #fff;
  background: linear-gradient(135deg, var(--el-color-primary) 0%, #764ba2 100%);
  border-radius: 50%;
}

.chat-content {
  flex: 1;
}

.user-message {
  max-width: 80%;
  padding: 12px 16px;
  font-size: 14px;
  line-height: 1.5;
  color: #fff;
  background-color: var(--el-color-primary);
  border-radius: 0 12px 12px 12px;
}

.system-message {
  padding: 15px;
  background-color: var(--el-fill-color-light);
  border: 1px solid var(--el-border-color-light);
  border-radius: 12px;
}

.evidence-detail {
  padding-top: 10px;
}

.result-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 15px;
}

.condition-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 15px;
  margin-bottom: 15px;
}

.condition-card {
  padding: 12px;
  background-color: var(--el-bg-color);
  border: 1px solid var(--el-border-color-light);
  border-radius: 8px;
}

.condition-label {
  margin-bottom: 8px;
  font-size: 12px;
  color: var(--el-text-color-placeholder);
}

.condition-value {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.empty-hint {
  font-size: 13px;
  color: var(--el-text-color-placeholder);
}

.summary-panel {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 15px;
}

.summary-item {
  padding: 12px;
  background-color: var(--el-bg-color);
  border: 1px solid var(--el-border-color-light);
  border-radius: 8px;
}

.summary-label {
  margin-bottom: 6px;
  font-size: 12px;
  color: var(--el-text-color-placeholder);
}

.summary-value {
  font-size: 14px;
  font-weight: 500;
  color: var(--el-text-color-primary);
}

.summary-value.text-wrap {
  word-break: break-all;
}

.branch-panel {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 15px;
}

.branch-item {
  padding: 12px;
  background-color: var(--el-bg-color);
  border: 1px solid var(--el-border-color-light);
  border-radius: 8px;
}

.branch-label {
  margin-bottom: 6px;
  font-size: 12px;
  color: var(--el-text-color-placeholder);
}

.branch-value {
  font-size: 13px;
  color: var(--el-text-color-primary);
}

.json-content {
  padding: 12px;
  overflow-x: auto;
  font-size: 12px;
  line-height: 1.6;
  color: var(--el-text-color-primary);
  background-color: var(--el-fill-color-dark);
  border-radius: 6px;
}

.text-content {
  font-size: 14px;
  line-height: 1.6;
  color: var(--el-text-color-primary);
  white-space: pre-wrap;
}

.input-panel {
  flex-shrink: 0;
  padding: 15px 20px;
  background-color: var(--el-bg-color);
  border-top: 1px solid var(--el-border-color-light);
}

.config-section {
  margin-bottom: 15px;
}

.config-actions {
  display: flex;
  gap: 10px;
  margin-bottom: 10px;
}

.action-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 10px;
}

.force-reinit {
  margin: 0 15px;
}
</style>
