<template>
  <div class="kg-page">
    <el-card class="search-card" shadow="never">
      <div class="search-grid">
        <div class="field">
          <div class="label">反应物（支持多个，空格分隔）</div>
          <el-input v-model="form.reactants" placeholder="例如: c1ccccc1 CC(=O)Cl" clearable />
        </div>

        <div class="field">
          <div class="label">产物（支持多个，空格分隔）</div>
          <el-input v-model="form.products" placeholder="SMILES / 名称（空格分隔）" clearable />
        </div>

        <div class="field field-wide">
          <div class="label">反应全式 / ID（Canonical RXN）</div>
          <el-input
            v-model="form.canonical_rxn"
            placeholder="输入部分反应式字符串进行匹配..."
            clearable
          />
        </div>

        <div class="field">
          <div class="label">催化剂（单种）</div>
          <el-input v-model="form.catalyst" placeholder="例如: Pd(OAc)2" clearable />
        </div>

        <div class="field">
          <div class="label">溶剂（支持多个，空格分隔）</div>
          <el-input v-model="form.solvent" placeholder="例如: THF H2O" clearable />
        </div>

        <div class="field">
          <div class="label">试剂（支持多个，空格分隔）</div>
          <el-input v-model="form.reagent" placeholder="例如: K2CO3 Cs2CO3" clearable />
        </div>

        <div class="actions">
          <el-button type="primary" :loading="searchLoading" @click="handleSearch">
            <el-icon><Search /></el-icon>
            组合搜索
          </el-button>
          <el-button type="success" :loading="statsLoading" @click="handleStats">统计</el-button>
          <el-button type="warning" plain @click="handleReset">重置</el-button>
        </div>
      </div>
    </el-card>

    <div class="toolbar">
      <div class="stats-line">
        <span class="stat-item">节点数：{{ stats.node_count }}</span>
        <span class="stat-item">边数：{{ stats.edge_count }}</span>
        <span class="stat-item">Seed：{{ stats.seed_count }}</span>
        <span v-if="reactionCount !== null" class="stat-item">命中反应：{{ reactionCount }}</span>
      </div>

      <div class="toolbar-actions">
        <el-tooltip content="缩小返回规模可以提升图渲染性能" placement="top">
          <div class="limit-box">
            <span>节点上限</span>
            <el-input-number v-model="limitNodes" :min="10" :max="120" :step="10" size="small" />
          </div>
        </el-tooltip>

        <div class="limit-box">
          <span>边上限</span>
          <el-input-number v-model="limitEdges" :min="20" :max="240" :step="20" size="small" />
        </div>

        <div class="limit-box">
          <span>扩展层数</span>
          <el-select v-model="expandHops" size="small" style="width: 90px">
            <el-option :value="1" label="1 hop" />
            <el-option :value="2" label="2 hop" />
          </el-select>
        </div>
      </div>
    </div>

    <el-card class="graph-card graph-card-full" shadow="never" body-style="padding: 0;">
      <div ref="chartRef" class="graph-canvas"></div>

      <div v-if="searchLoading" class="graph-overlay">
        <el-skeleton :rows="6" animated />
      </div>

      <div v-else-if="!searched" class="graph-overlay">
        <el-empty description="正在准备默认知识图谱..." :image-size="90" />
      </div>

      <div v-else-if="searched && graphData.nodes.length === 0" class="graph-overlay">
        <el-empty description="后端已返回，但当前条件未命中局部图数据" :image-size="90" />
      </div>
    </el-card>

    <el-drawer v-model="detailVisible" title="节点详情" direction="rtl" size="30%">
      <div v-if="selectedNode" class="detail-panel">
        <el-descriptions :column="1" border>
          <el-descriptions-item label="ID">{{ selectedNode.id }}</el-descriptions-item>
          <el-descriptions-item label="类型">{{ selectedNode.label }}</el-descriptions-item>
          <el-descriptions-item label="名称">{{ selectedNode.name }}</el-descriptions-item>
        </el-descriptions>

        <div class="detail-title">属性</div>
        <pre class="detail-json">{{ formatJson(selectedNode.properties || {}) }}</pre>
      </div>
    </el-drawer>

    <el-dialog v-model="statsDialogVisible" title="节点类型全局统计" width="800px" destroy-on-close>
      <div style="display: flex; gap: 20px; align-items: stretch; height: 450px">
        <div style="display: flex; flex: 0 0 360px; flex-direction: column">
          <div style="margin-bottom: 12px; font-size: 14px; color: var(--el-text-color-regular)">
            请勾选需要统计的节点类型：
          </div>
          <el-table
            :data="availableNodeTypes"
            height="100%"
            style="width: 100%"
            border
            stripe
            @selection-change="handleNodeSelectionChange"
          >
            <el-table-column type="selection" width="50" align="center" />
            <el-table-column prop="label" label="节点类型">
              <template #default="scope">
                <div style="display: flex; gap: 12px; align-items: center">
                  <el-tag
                    :color="getNodeColor(scope.row.label)"
                    style="
                      width: 130px;
                      font-weight: bold;
                      color: white;
                      text-align: center;
                      border: none;
                    "
                  >
                    {{ scope.row.label }}
                  </el-tag>
                  <span style="font-size: 13px; color: var(--el-text-color-regular)">
                    {{ scope.row.zh }}
                  </span>
                </div>
              </template>
            </el-table-column>
          </el-table>
        </div>

        <div
          style="
            display: flex;
            flex: 1;
            flex-direction: column;
            padding: 16px;
            background-color: var(--el-fill-color-light, #f5f7fa);
            border: 1px solid var(--el-border-color-lighter);
            border-radius: 8px;
          "
        >
          <template v-if="computedTypeStats.length > 0">
            <div
              style="
                padding-bottom: 12px;
                margin-bottom: 16px;
                font-size: 16px;
                font-weight: 600;
                color: var(--el-text-color-primary);
                border-bottom: 1px solid var(--el-border-color-lighter);
              "
            >
              全局数据库统计结果
            </div>

            <div
              style="
                display: flex;
                flex: 1;
                flex-wrap: wrap;
                gap: 12px;
                align-content: flex-start;
                overflow-y: auto;
              "
            >
              <el-tag
                v-for="item in computedTypeStats"
                :key="item.type"
                size="large"
                effect="light"
                style="height: auto; padding: 8px 12px; font-size: 14px; border-radius: 6px"
              >
                {{ item.type }}
                <span style="font-size: 12px; color: var(--el-text-color-secondary)">
                  ({{ item.zh }})
                </span>
                :
                <span
                  style="
                    margin-left: 4px;
                    font-size: 16px;
                    font-weight: bold;
                    color: var(--el-color-primary);
                  "
                >
                  {{ item.count }}
                </span>
              </el-tag>
            </div>

            <div
              style="
                display: flex;
                flex-shrink: 0;
                align-items: center;
                justify-content: space-between;
                padding: 12px 16px;
                margin-top: 16px;
                background-color: var(--el-color-primary-light-9);
                border: 1px solid var(--el-color-primary-light-5);
                border-radius: 6px;
              "
            >
              <span style="font-size: 14px; font-weight: 600; color: var(--el-color-primary)">
                勾选节点总计数量
              </span>
              <span style="font-size: 18px; font-weight: bold; color: var(--el-color-primary)">
                {{ computedTotalCount }}
              </span>
            </div>
          </template>

          <template v-else>
            <div style="display: flex; flex: 1; align-items: center; justify-content: center">
              <el-empty description="请在左侧勾选类型并点击右下角执行统计" :image-size="90" />
            </div>
          </template>
        </div>
      </div>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="statsDialogVisible = false">关闭</el-button>
          <el-button
            type="primary"
            :loading="statsDialogLoading"
            :disabled="selectedNodesForStats.length === 0"
            @click="calculateSelectedStats"
          >
            执行全局统计
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, nextTick, onMounted, onBeforeUnmount } from "vue";
import axios from "axios";
import * as echarts from "echarts";
import { ElMessage } from "element-plus";
import { Search } from "@element-plus/icons-vue";

const API_BASE_URL = "http://localhost:5004";

const chartRef = ref(null);
let chartInstance = null;

const searchLoading = ref(false);
const statsLoading = ref(false);
const searched = ref(false);

const reactionCount = ref(null);

const limitNodes = ref(40);
const limitEdges = ref(80);
const expandHops = ref(1);

const form = reactive({
  reactants: "",
  products: "",
  canonical_rxn: "",
  catalyst: "",
  solvent: "",
  reagent: "",
});

const stats = reactive({
  node_count: 0,
  edge_count: 0,
  seed_count: 0,
});

const graphData = reactive({
  nodes: [],
  edges: [],
});

const detailVisible = ref(false);
const selectedNode = ref(null);

// ==========================================
// 全局节点统计相关的响应式变量
// ==========================================
const statsDialogVisible = ref(false);
const statsDialogLoading = ref(false);
const availableNodeTypes = ref([]);
const selectedNodesForStats = ref([]);
const computedTypeStats = ref([]);
const computedTotalCount = ref(0); // 存储勾选节点的总计数量

// 全量 13 种节点中英文映射表
const ALL_NODE_TYPES = [
  { label: "Reaction", zh: "反应" },
  { label: "Reactant", zh: "反应物" },
  { label: "Product", zh: "产物" },
  { label: "Catalyst", zh: "催化剂" },
  { label: "Solvent", zh: "溶剂" },
  { label: "Reagent", zh: "试剂" },
  { label: "ConditionGroup", zh: "条件组" },
  { label: "TemplateR1", zh: "模板 R1" },
  { label: "TemplateR0", zh: "模板 R0" },
  { label: "TemplateR0Star", zh: "模板 R0*" },
  { label: "ClusterR1", zh: "聚类 R1" },
  { label: "ClusterR0", zh: "聚类 R0" },
  { label: "ClusterR0Star", zh: "聚类 R0*" },
];

const ensureChart = async () => {
  await nextTick();

  if (!chartRef.value) {
    console.warn("chartRef not ready");
    return false;
  }

  if (!chartInstance) {
    chartInstance = echarts.init(chartRef.value);
    window.addEventListener("resize", handleResize);
  }

  return true;
};

const handleResize = () => {
  if (chartInstance) {
    chartInstance.resize();
  }
};

onMounted(async () => {
  await nextTick();
  if (chartRef.value) {
    chartInstance = echarts.init(chartRef.value);
    window.addEventListener("resize", handleResize);
  }

  await loadDefaultGraph();
});

onBeforeUnmount(() => {
  window.removeEventListener("resize", handleResize);
  if (chartInstance) {
    chartInstance.dispose();
    chartInstance = null;
  }
});

const resetGraphState = () => {
  graphData.nodes = [];
  graphData.edges = [];
  stats.node_count = 0;
  stats.edge_count = 0;
  stats.seed_count = 0;
  selectedNode.value = null;
};

const truncateText = (text, max = 18) => {
  const s = String(text || "");
  return s.length > max ? `${s.slice(0, max)}...` : s;
};

const getDisplayName = (node) => {
  const label = node.label || "";
  const name = node.name || node.id || "";

  if (label === "Reaction") return "Reaction";
  if (label === "ConditionGroup") return "ConditionGroup";
  if (label === "TemplateR1") return "TemplateR1";
  if (label === "TemplateR0") return "TemplateR0";
  if (label === "TemplateR0Star") return "TemplateR0Star";
  if (label === "ClusterR1") return "ClusterR1";
  if (label === "ClusterR0") return "ClusterR0";
  if (label === "ClusterR0Star") return "ClusterR0Star";

  return `${label}: ${truncateText(name, 18)}`;
};

const getNodeColor = (label) => {
  const colorMap = {
    Reaction: "#4C6EF5",
    ConditionGroup: "#94D82D",

    Catalyst: "#495057",
    Solvent: "#F08C00",
    Reagent: "#1098AD",

    Reactant: "#2F9E44",
    Product: "#E64980",

    TemplateR1: "#5F3DC4",
    TemplateR0: "#845EF7",
    TemplateR0Star: "#B197FC",

    ClusterR1: "#5C7CFA",
    ClusterR0: "#748FFC",
    ClusterR0Star: "#91A7FF",
  };
  return colorMap[label] || "#868E96";
};

const getNodeSize = (label) => {
  const sizeMap = {
    Reaction: 70,
    ConditionGroup: 48,

    Catalyst: 30,
    Solvent: 30,
    Reagent: 30,

    Reactant: 32,
    Product: 32,

    TemplateR1: 26,
    TemplateR0: 26,
    TemplateR0Star: 26,

    ClusterR1: 28,
    ClusterR0: 28,
    ClusterR0Star: 28,
  };
  return sizeMap[label] || 24;
};

const renderGraph = async () => {
  const ok = await ensureChart();
  if (!ok || !chartInstance) return;

  const categoryNames = [...new Set(graphData.nodes.map((n) => n.label))];
  const categories = categoryNames.map((name) => ({
    name,
    itemStyle: {
      color: getNodeColor(name),
    },
  }));

  const categoryIndexMap = new Map(categoryNames.map((name, index) => [name, index]));

  const seriesData = graphData.nodes.map((n) => ({
    id: n.id,
    name: getDisplayName(n),
    category: categoryIndexMap.get(n.label),
    symbolSize: getNodeSize(n.label),
    value: n.properties || {},
    itemStyle: {
      color: getNodeColor(n.label),
    },
    label: {
      show: true,
    },
  }));

  const seriesLinks = graphData.edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    value: e.type,
    lineStyle: {
      color: "#999",
      width: 1.2,
      opacity: 0.9,
    },
    label: {
      show: false,
    },
  }));

  const option = {
    backgroundColor: "transparent",
    tooltip: {
      trigger: "item",
      confine: true,
      // 关键修复：追加全局 CSS，强制允许换行并限制最大宽度
      extraCssText: "max-width: 400px; white-space: normal; word-wrap: break-word;",
      formatter: (params) => {
        if (params.dataType === "node") {
          const n = graphData.nodes.find((x) => x.id === params.data.id) || {};
          return `
            <div style="width: 100%;">
              <div style="font-weight:bold;margin-bottom:4px;">
                ${n.label || ""}
              </div>
              <div style="word-break:break-all;">
                ${n.name || ""}
              </div>
              ${
                n.properties
                  ? `<div style="margin-top:6px;color:#999;font-size:12px;word-break:break-all;">
                      ${JSON.stringify(n.properties).slice(0, 200)}...
                    </div>`
                  : ""
              }
            </div>
          `;
        }
        if (params.dataType === "edge") {
          return params.data?.value || "";
        }
        return "";
      },
    },
    legend: {
      type: "scroll",
      left: "center",
      bottom: 6,
      orient: "horizontal",
      itemWidth: 14,
      itemHeight: 10,
      itemGap: 12,
      textStyle: {
        fontSize: 11,
        color: "#555",
      },
      data: categories.map((c) => c.name),
    },
    animationDuration: 500,
    series: [
      {
        name: "KG",
        type: "graph",
        layout: "force",
        top: 20,
        bottom: 55,
        roam: true,
        draggable: true,
        focusNodeAdjacency: true,
        categories,
        data: seriesData,
        links: seriesLinks,
        edgeSymbol: ["none", "arrow"],
        edgeSymbolSize: 6,
        force: {
          repulsion: 700,
          gravity: 0.03,
          edgeLength: 180,
          layoutAnimation: true,
        },
        label: {
          show: true,
          position: "right",
          fontSize: 11,
          color: "#333",
        },
        lineStyle: {
          color: "#b7b7b7",
          width: 1.2,
          curveness: 0.08,
          opacity: 0.9,
        },
        emphasis: {
          focus: "adjacency",
        },
      },
    ],
  };

  chartInstance.clear();
  chartInstance.setOption(option, true);
  chartInstance.resize();

  chartInstance.off("click");
  chartInstance.on("click", async (params) => {
    if (params.dataType !== "node" || !params.data?.id) return;

    const clicked = graphData.nodes.find((n) => n.id === params.data.id) || null;
    selectedNode.value = clicked;
    detailVisible.value = true;

    await expandNode(params.data.id);
  });
};

const mergeGraph = (newData) => {
  const nodeMap = new Map();
  const edgeMap = new Map();

  graphData.nodes.forEach((n) => nodeMap.set(n.id, n));
  (newData.nodes || []).forEach((n) => nodeMap.set(n.id, n));

  graphData.edges.forEach((e) => edgeMap.set(e.id, e));
  (newData.edges || []).forEach((e) => edgeMap.set(e.id, e));

  graphData.nodes = Array.from(nodeMap.values());
  graphData.edges = Array.from(edgeMap.values());

  stats.node_count = graphData.nodes.length;
  stats.edge_count = graphData.edges.length;
};

const applySearchResponse = async (payload) => {
  const data = payload?.data || {};

  graphData.nodes = data.nodes || [];
  graphData.edges = data.edges || [];

  stats.node_count = data.stats?.node_count || 0;
  stats.edge_count = data.stats?.edge_count || 0;
  stats.seed_count = data.stats?.seed_count || 0;

  searched.value = true;

  await nextTick();
  await renderGraph();

  if (stats.node_count >= limitNodes.value) {
    ElMessage.warning("节点数已达到当前上限，后端已做裁剪");
  }
  if (stats.edge_count >= limitEdges.value) {
    ElMessage.warning("边数已达到当前上限，后端已做裁剪");
  }
};

const loadDefaultGraph = async () => {
  searchLoading.value = true;
  reactionCount.value = null;
  resetGraphState();

  try {
    const response = await axios.post(`${API_BASE_URL}/api/kg/search`, {
      reactants: "",
      products: "",
      canonical_rxn: "",
      catalyst: "",
      solvent: "",
      reagent: "",
      limit_nodes: limitNodes.value,
      limit_edges: limitEdges.value,
      expand_hops: expandHops.value,
      use_default: true,
    });

    if (response.data?.code !== 0) {
      ElMessage.error(response.data?.message || "默认图谱加载失败");
      searched.value = true;
      return;
    }

    await applySearchResponse(response.data);
  } catch (error) {
    console.error("KG default search error:", error);
    ElMessage.error("默认图谱加载失败，请检查后端接口");
    searched.value = true;
  } finally {
    searchLoading.value = false;
  }
};

const handleSearch = async () => {
  searchLoading.value = true;
  reactionCount.value = null;
  resetGraphState();

  try {
    const response = await axios.post(`${API_BASE_URL}/api/kg/search`, {
      reactants: form.reactants,
      products: form.products,
      canonical_rxn: form.canonical_rxn,
      catalyst: form.catalyst,
      solvent: form.solvent,
      reagent: form.reagent,
      limit_nodes: limitNodes.value,
      limit_edges: limitEdges.value,
      expand_hops: expandHops.value,
      use_default: false,
    });

    if (response.data?.code !== 0) {
      ElMessage.error(response.data?.message || "知识图谱搜索失败");
      searched.value = true;
      return;
    }

    await applySearchResponse(response.data);

    if (!graphData.nodes.length) {
      ElMessage.warning("后端已返回，但当前条件下没有命中图谱数据");
    } else {
      ElMessage.success(`搜索完成：节点 ${stats.node_count}，边 ${stats.edge_count}`);
    }
  } catch (error) {
    console.error("KG search error:", error);
    ElMessage.error("知识图谱搜索失败，请检查后端接口");
    searched.value = true;
  } finally {
    searchLoading.value = false;
  }
};

// ==========================================
// 全局节点统计逻辑 (带中文对照与总计累加)
// ==========================================
const handleStats = () => {
  // 加载中英文映射数组
  availableNodeTypes.value = [...ALL_NODE_TYPES];

  // 初始化重置弹窗状态
  selectedNodesForStats.value = [];
  computedTypeStats.value = [];
  computedTotalCount.value = 0;
  statsDialogVisible.value = true;
};

const handleNodeSelectionChange = (val) => {
  selectedNodesForStats.value = val;
};

const calculateSelectedStats = async () => {
  const selectedLabels = selectedNodesForStats.value.map((item) => item.label);

  statsDialogLoading.value = true;
  try {
    // 向后端接口发起全局图谱统计请求
    const response = await axios.post(`${API_BASE_URL}/api/kg/count_labels`, {
      labels: selectedLabels,
    });

    if (response.data?.code === 0) {
      const counts = response.data.data || {};
      let totalSum = 0;

      // 组装统计明细，并进行数量降序排列，同时累加总数
      computedTypeStats.value = Object.entries(counts)
        .map(([type, count]) => {
          totalSum += count;
          const matchNode = ALL_NODE_TYPES.find((n) => n.label === type);
          return {
            type,
            count,
            zh: matchNode ? matchNode.zh : "未知",
          };
        })
        .sort((a, b) => b.count - a.count);

      // 更新总计数量响应式变量
      computedTotalCount.value = totalSum;
      ElMessage.success("全局统计完成！");
    } else {
      ElMessage.error(response.data?.message || "全局统计失败");
    }
  } catch (error) {
    console.error("统计接口报错:", error);
    ElMessage.error("请求失败，请确保后端已经添加了 /api/kg/count_labels 接口！");
  } finally {
    statsDialogLoading.value = false;
  }
};
// ==========================================

const expandNode = async (nodeId) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/kg/expand`, {
      params: {
        node_id: nodeId,
        limit_nodes: Math.min(30, limitNodes.value),
        limit_edges: Math.min(60, limitEdges.value),
        expand_hops: 1,
      },
    });

    if (response.data?.code !== 0) return;

    const data = response.data?.data || { nodes: [], edges: [], stats: {} };
    mergeGraph(data);
    await renderGraph();
  } catch (error) {
    console.error("KG expand error:", error);
  }
};

const handleReset = async () => {
  form.reactants = "";
  form.products = "";
  form.canonical_rxn = "";
  form.catalyst = "";
  form.solvent = "";
  form.reagent = "";

  reactionCount.value = null;
  detailVisible.value = false;
  resetGraphState();

  if (chartInstance) {
    chartInstance.clear();
  }

  await loadDefaultGraph();
};

const formatJson = (obj) => {
  try {
    return JSON.stringify(obj, null, 2);
  } catch {
    return "{}";
  }
};
</script>

<style scoped lang="scss">
.kg-page {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 14px;
  height: calc(100vh - 110px);
  min-height: 0;
  padding: 16px 18px;
  background-color: var(--el-bg-color-page);

  :deep(.el-card) {
    border-radius: 8px;
  }

  :deep(.el-input__wrapper),
  :deep(.el-select .el-input__wrapper) {
    border-radius: 6px;
  }
}

.search-card {
  flex-shrink: 0;
  box-shadow: var(--el-box-shadow);
}

.search-grid {
  display: grid;
  /* 修复 1：改为固定 4 列等分，确保最后一列的按钮区域拥有充足且稳定的空间 */
  grid-template-columns: repeat(4, 1fr);
  gap: 16px 16px;
  align-items: end;

  @media (max-width: 1400px) {
    grid-template-columns: repeat(3, 1fr);
  }

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
}

.field {
  min-width: 0;
}

.field-wide {
  grid-column: span 2;

  @media (max-width: 900px) {
    grid-column: span 1;
  }
}

.label {
  margin-bottom: 6px;
  font-size: 14px;
  font-weight: 500;
  color: var(--el-text-color-regular);
}

.actions {
  display: flex;
  flex-wrap: nowrap; /* 不允许换行，强制在一行显示 */
  gap: 12px;
  align-items: end;
  justify-content: flex-start;
  white-space: nowrap;
}

.toolbar {
  display: flex;
  flex-shrink: 0;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  padding: 8px 0;

  @media (max-width: 900px) {
    flex-direction: column;
    align-items: flex-start;
  }
}

.stats-line {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  align-items: center;
  font-weight: 600;
  color: var(--el-text-color-primary);

  .stat-item {
    font-size: 14px;
    color: var(--el-text-color-regular);

    &:first-child {
      font-weight: 700;
      color: var(--el-color-primary);
    }
  }
}

.toolbar-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  align-items: center;
}

.limit-box {
  display: flex;
  gap: 8px;
  align-items: center;
  font-size: 14px;
  color: var(--el-text-color-secondary);

  /* 修复 2：给计数器设置固定宽度，同时干掉强制 padding 的重写 */
  :deep(.el-input-number) {
    width: 120px;
  }
}

.graph-card {
  position: relative;
  flex: 1;
  min-height: 0;
  overflow: hidden;
  box-shadow: var(--el-box-shadow);
}

.graph-card-full :deep(.el-card__body) {
  position: relative;
  height: 100%;
  min-height: 0;
}

/* 修复 3：图谱背景改为透明色，让系统的深/浅主题背景色自然透过来 */
.graph-canvas {
  width: 100%;
  height: 100%;
  min-height: 500px;
  background: transparent;
}

/* 遮罩层适配主题背景色 */
.graph-overlay {
  position: absolute;
  inset: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: var(--el-bg-color-overlay);
}

.detail-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.detail-title {
  padding-bottom: 8px;
  margin-top: 10px;
  font-size: 16px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  border-bottom: 1px solid var(--el-border-color);
}

.detail-json {
  padding: 16px; /* 增加内边距让内容更舒展 */
  overflow: auto;
  font-family: "JetBrains Mono", "Fira Code", Consolas, Monaco, "Courier New", monospace;

  /* 关键修复：增大字号，并指定清晰的现代代码等宽字体 */
  font-size: 14px;
  line-height: 1.6;
  color: var(--el-text-color-primary);
  letter-spacing: 0.5px; /* 稍微增加字符间距，提升可读性 */
  overflow-wrap: break-word;
  white-space: pre-wrap;
  /* 使用更柔和的背景色区分层级 */
  background: var(--el-fill-color-light, #f5f7fa);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
}

:deep(.el-descriptions__header) {
  margin-bottom: 16px;
}

:deep(.el-descriptions__title) {
  font-size: 16px;
  font-weight: 600;
}

:deep(.el-drawer__body) {
  padding: 16px;
}

/* 仅保留圆角，已删除所有强制覆盖颜色的代码，恢复框架原本的 plain 和交互表现 */
:deep(.el-button) {
  border-radius: 6px;
}

.stats-result-panel {
  padding-top: 16px;
  margin-top: 20px;
  border-top: 1px dashed var(--el-border-color);
}

.result-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 12px;
}

.result-tag {
  height: auto;
  padding: 8px 12px;
  font-size: 14px;
  border-radius: 6px;

  .highlight-count {
    margin-left: 4px;
    font-size: 16px;
    font-weight: bold;
    color: var(--el-color-primary);
  }
}
</style>
