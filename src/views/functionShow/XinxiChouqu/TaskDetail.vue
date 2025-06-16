<template>
  <div class="task-detail-container">
    <div class="page-header flex items-center justify-between mb-4">
      <h3>任务详情</h3>
      <el-button type="text" @click="goBack">返回</el-button>
    </div>

    <el-card class="mb-4">
      <el-descriptions column="2" border>
        <el-descriptions-item label="任务ID">{{ taskData.taskId }}</el-descriptions-item>
        <el-descriptions-item label="任务类型">{{ taskData.taskType }}</el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag :type="getStatusType(taskData.status)">
            {{ getStatusText(taskData.status) }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="创建时间">{{ taskData.createTime }}</el-descriptions-item>
      </el-descriptions>
    </el-card>

    <!-- 可以根据需要添加更多详情内容 -->
    <el-card>
      <div v-if="taskData.status === 2" class="result-content">
        <!-- 成功结果展示 -->

        <!-- 文本类型任务 - 修改后的两列展示 -->
        <div v-if="taskData.taskCode === TASK_TYPE.TEXT">
          <!-- 新增：展示 chemicalText 的卡片区域 -->
          <el-card class="mb-4">
            <template #header>
              <div class="card-header">
                <span>化学有机合成反应文本</span>
              </div>
            </template>
            <div class="text-gray-600 text-sm">
              {{ taskDetailData.chemicalText }}
            </div>
          </el-card>
          <el-card v-for="(item, index) in taskDetailData.result" :key="index" class="mb-4">
            <template #header>
              <div class="card-header">
                <span>反应步骤 {{ index + 1 }} 化合反应参数详情</span>
              </div>
            </template>
            <el-descriptions column="1" border :label-width="100">
              <el-descriptions-item label="反应物">
                {{ item.reactant.join("、") }}
              </el-descriptions-item>
              <el-descriptions-item label="产物">
                {{ item.product.join("、") }}
              </el-descriptions-item>
              <el-descriptions-item label="溶剂">
                {{ item.solvent.length > 0 ? item.solvent.join("、") : "无" }}
              </el-descriptions-item>
              <el-descriptions-item label="催化剂">
                {{ item.catalyst.length > 0 ? item.catalyst.join("、") : "无" }}
              </el-descriptions-item>
              <el-descriptions-item label="试剂">
                {{ item.reagent.length > 0 ? item.reagent.join("、") : "无" }}
              </el-descriptions-item>
              <el-descriptions-item label="后处理">
                {{ item.after.length > 0 ? item.after.join("、") : "无" }}
              </el-descriptions-item>
              <el-descriptions-item label="温度">
                {{ item.temperature.length > 0 ? item.temperature[0] : "未指定" }}
              </el-descriptions-item>
              <el-descriptions-item label="时间">
                {{ item.time.length > 0 ? item.time[0] : "未指定" }}
              </el-descriptions-item>
              <el-descriptions-item label="产率">
                {{ item.yieldRate.length > 0 ? item.yieldRate[0] : "未指定" }}
              </el-descriptions-item>
            </el-descriptions>
          </el-card>
        </div>

        <!-- SMILES类型任务 -->
        <div v-if="taskData.taskCode === TASK_TYPE.SMILES">
          <el-card>
            <template #header>
              <div class="card-header">
                <span>分子结构图至SMILES映射详情</span>
              </div>
            </template>
            <el-descriptions column="1" border :label-width="120">
              <el-descriptions-item label="分子结构图">
                <img :src="taskDetailData.ossUrl" alt="分子结构" class="img-preview" />
              </el-descriptions-item>
              <el-descriptions-item label="SMILES表达式">
                {{ taskDetailData.smiles }}
              </el-descriptions-item>
            </el-descriptions>
          </el-card>
        </div>

        <!-- 反应类型任务 -->
        <div v-if="taskData.taskCode === TASK_TYPE.REACTION">
          <el-card>
            <template #header>
              <div class="card-header">
                <span>化合反应示意图数据源</span>
              </div>
            </template>
            <el-descriptions column="1" border :label-width="150">
              <el-descriptions-item label="化合反应示意图">
                <img :src="taskDetailData.ossUrl" alt="分子结构" class="img-preview" />
              </el-descriptions-item>
            </el-descriptions>
          </el-card>
          <br />
          <el-card v-for="(reaction, index) in taskDetailData.result" :key="index" class="mb-3">
            <template #header>
              <div class="card-header">
                <span>反应步骤 {{ index + 1 }} 结构化反应参数详情</span>
              </div>
            </template>
            <el-descriptions column="2" border>
              <el-descriptions-item label="反应物">
                <div v-for="(reactant, idx) in reaction.reactant" :key="idx">
                  {{ reaction.reactantNameList[idx] || reactant }}
                </div>
              </el-descriptions-item>
              <el-descriptions-item label="产物">
                <div v-for="(product, idx) in reaction.product" :key="idx">
                  {{ reaction.productNameList[idx] || product }}
                </div>
              </el-descriptions-item>
              <el-descriptions-item label="条件">
                <div v-for="(condition, idx) in reaction.conditionList" :key="idx">
                  {{ reaction.conditionContentList[idx] || "条件" }}: {{ condition }}
                </div>
              </el-descriptions-item>
            </el-descriptions>
          </el-card>
        </div>

        <!-- Reaxys类型任务 - 修改后的展示 -->
        <div v-if="taskData.taskCode === TASK_TYPE.REAXYS">
          <el-card
            v-for="(reaction, reactionIndex) in taskDetailData.result"
            :key="reactionIndex"
            class="mb-4"
          >
            <template #header>
              <div class="card-header d-flex justify-between items-center">
                <span>
                  Reaxys反应数据 #{{ reactionIndex + 1 }} (Reaxys_ID: {{ reaction.reaxysId }})
                </span>
                <el-tag type="info">{{ reaction.reactantNameList.length }}个反应物</el-tag>
              </div>
            </template>

            <!-- 基础反应信息 -->
            <el-descriptions column="2" border class="mb-3">
              <el-descriptions-item label="Reaxys ID">{{ reaction.reaxysId }}</el-descriptions-item>
              <el-descriptions-item label="反应来源">
                <a :href="taskDetailData.ossUrl" target="_blank" class="text-primary">
                  查看完整PDF
                </a>
              </el-descriptions-item>
            </el-descriptions>

            <!-- 反应物展示区 -->
            <el-card class="mb-3">
              <template #header>
                <div class="card-header">
                  <span>反应物详情</span>
                </div>
              </template>
              <el-descriptions column="2" border :label-width="150">
                <el-descriptions-item label="SMILES表达式">
                  <div v-for="(reactant, idx) in reaction.reactant" :key="idx">
                    {{ reactant }}
                  </div>
                </el-descriptions-item>
                <el-descriptions-item label="化合物名称">
                  <div v-for="(name, idx) in reaction.reactantNameList" :key="idx">
                    {{ name || "未命名" }}
                  </div>
                </el-descriptions-item>
                <el-descriptions-item label="分子结构" :span="2">
                  <div class="reactant-img-container">
                    <img
                      v-for="(imgUrl, idx) in reaction.reactantOssList"
                      :key="idx"
                      :src="imgUrl"
                      alt="反应物结构"
                      class="img-preview"
                    />
                  </div>
                </el-descriptions-item>
              </el-descriptions>
            </el-card>

            <!-- 产物展示区 -->
            <el-card class="mb-3">
              <template #header>
                <div class="card-header">
                  <span>产物详情</span>
                </div>
              </template>
              <el-descriptions column="2" border :label-width="150">
                <el-descriptions-item label="SMILES表达式">
                  <div v-for="(product, idx) in reaction.product" :key="idx">
                    {{ product }}
                  </div>
                </el-descriptions-item>
                <el-descriptions-item label="化合物名称">
                  <div v-for="(name, idx) in reaction.productNameList" :key="idx">
                    {{ name || "未命名" }}
                  </div>
                </el-descriptions-item>
                <el-descriptions-item label="分子结构" :span="2">
                  <div class="product-img-container">
                    <img
                      v-for="(imgUrl, idx) in reaction.productOssList"
                      :key="idx"
                      :src="imgUrl"
                      alt="产物结构"
                      class="img-preview"
                    />
                  </div>
                </el-descriptions-item>
              </el-descriptions>
            </el-card>

            <!-- 反应条件展示区 -->
            <el-card
              v-for="(table, tableIdx) in reaction.tableComponentList"
              :key="tableIdx"
              class="mb-3"
            >
              <template #header>
                <div class="card-header d-flex justify-between items-center">
                  <span>反应条件组 #{{ tableIdx + 1 }}</span>
                  <el-tag
                    :type="table.yieldRate && table.yieldRate.includes('%') ? 'success' : 'info'"
                  >
                    产率: {{ table.yieldRate }}
                  </el-tag>
                </div>
              </template>
              <div
                v-for="(condition, condIdx) in table.tableConditionList"
                :key="condIdx"
                style="margin-bottom: 16px"
              >
                <el-descriptions column="2" border :label-width="150">
                  <el-descriptions-item label="溶剂">
                    <div v-if="condition.solvent && condition.solvent.length">
                      <div v-for="(solvent, idx) in condition.solvent" :key="idx">
                        {{ solvent }}
                      </div>
                    </div>
                    <div v-else>无</div>
                  </el-descriptions-item>
                  <el-descriptions-item label="催化剂">
                    <div v-if="condition.catalyst && condition.catalyst.length">
                      <div v-for="(catalyst, idx) in condition.catalyst" :key="idx">
                        {{ catalyst }}
                      </div>
                    </div>
                    <div v-else>无</div>
                  </el-descriptions-item>
                  <el-descriptions-item label="反应温度">
                    {{
                      condition.temperature && condition.temperature.length > 0
                        ? condition.temperature[0]
                        : "未指定"
                    }}
                  </el-descriptions-item>
                  <el-descriptions-item label="反应时间">
                    {{ condition.time && condition.time.length > 0 ? condition.time[0] : "未指定" }}
                  </el-descriptions-item>
                  <el-descriptions-item label="后处理">
                    <div v-if="condition.after && condition.after.length">
                      <div v-for="(after, idx) in condition.after" :key="idx">
                        {{ after }}
                      </div>
                    </div>
                    <div v-else>无</div>
                  </el-descriptions-item>
                </el-descriptions>
              </div>
            </el-card>
          </el-card>
        </div>
      </div>
      <div v-else-if="taskData.status === 3" class="result-content">
        <!-- 失败结果展示 -->
        <p class="text-danger">任务执行失败，错误信息：</p>
        <pre>{{ taskData.error || "未知错误" }}</pre>
      </div>
      <div v-else class="result-content">
        <!-- 处理中或待处理状态 -->
        <p>任务正在处理中，请稍后查看结果</p>
        <el-progress :percentage="50" status="active"></el-progress>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";

const route = useRoute();
const router = useRouter();
const taskData = ref({});
let taskDetailData = ref({});

// 任务状态常量
const TASK_STATUS = {
  CREATE_BUT_NOT_START: 0,
  RUNNING: 1,
  SUCCESS: 2,
  FAIL: 3,
};
// 任务类型常量
const TASK_TYPE = {
  TEXT: "text",
  SMILES: "smiles",
  REACTION: "reaction",
  REAXYS: "reaxys",
};

// 获取状态文本
const getStatusText = (status) => {
  switch (status) {
    case TASK_STATUS.CREATE_BUT_NOT_START:
      return "待处理";
    case TASK_STATUS.RUNNING:
      return "处理中";
    case TASK_STATUS.SUCCESS:
      return "已完成";
    case TASK_STATUS.FAIL:
      return "已失败";
    default:
      return "未知状态";
  }
};

// 获取状态标签类型
const getStatusType = (status) => {
  switch (status) {
    case TASK_STATUS.CREATE_BUT_NOT_START:
      return "info";
    case TASK_STATUS.RUNNING:
      return "primary";
    case TASK_STATUS.SUCCESS:
      return "success";
    case TASK_STATUS.FAIL:
      return "danger";
    default:
      return "default";
  }
};

const textMockData = {
  id: "507f1f77bcf86cd79943903",
  chemicalText: "在25℃下，将苯(1.0mol)与硝酸(1.2mol)在浓硫酸催化下反应2小时，得到硝基苯，产率85%。",
  result: [
    {
      reactant: ["苯"],
      product: ["硝基苯"],
      solvent: [],
      catalyst: ["浓硫酸"],
      reagent: ["硝酸"],
      after: [],
      temperature: ["25℃"],
      time: ["2小时"],
      yieldRate: ["85%"],
    },
    {
      reactant: ["乙醇", "乙酸"],
      product: ["乙酸乙酯", "水"],
      solvent: ["苯"],
      catalyst: ["浓硫酸"],
      reagent: [],
      after: ["碳酸钠溶液", "饱和食盐水"],
      temperature: ["回流温度"],
      time: ["4小时"],
      yieldRate: ["72%"],
    },
  ],
};
const smilesMockData = {
  id: "507f1f77bcf86cd79943902",
  ossUrl: "https://picsum.photos/200/200?random=2",
  smiles: "C1=CC=CC=C1",
};
const reactionMockData = {
  id: "507f1f77bcf86cd79943901",
  ossUrl: "https://picsum.photos/200/200?random=2",
  result: [
    {
      reactant: ["CCO", "CCOC(=O)C=C"],
      reactantOssList: [
        "https://picsum.photos/200/200?random=2",
        "https://picsum.photos/200/200?random=2",
      ],
      reactantNameList: ["Ethanol", "Ethyl acrylate"],
      conditionList: ["25°C", "1 atm", "12h"],
      conditionContentList: ["Temperature", "Pressure", "Reaction Time"],
      product: ["CCOC(=O)CCCO", "H2O"],
      productOssList: [
        "https://picsum.photos/200/200?random=2",
        "https://picsum.photos/200/200?random=2",
      ],
      productNameList: ["Ethyl 3-hydroxypropionate", "Water"],
    },
    {
      reactant: ["C1=CC=C(C=C1)O", "CCO"],
      reactantNameList: ["Phenol", "Ethanol"],
      conditionList: ["50°C", "2 atm", "6h"],
      conditionContentList: ["Temperature", "Pressure", "Reaction Time"],
      product: ["C1=CC=C(C=C1)OCC", "H2O"],
      productNameList: ["Ethyl phenyl ether", "Water"],
    },
  ],
};
const reaxysMockData = {
  id: "507f1f77bcf86cd79943904",
  ossUrl: "https://example.oss-cn-hangzhou.aliyuncs.com/reaxys-pdfs/article-246.pdf",
  result: [
    {
      reaxysId: "RX0012345",
      reactant: ["CCO", "C1=CC=C(C=C1)C(=O)Cl"],
      reactantOssList: [
        "https://picsum.photos/200/200?random=2",
        "https://picsum.photos/200/200?random=2",
      ],
      reactantNameList: ["Ethanol", "Benzoyl chloride"],
      product: ["CCOC(=O)C1=CC=CC=C1", "HCl"],
      productOssList: [
        "https://picsum.photos/200/200?random=2",
        "https://picsum.photos/200/200?random=2",
      ],
      productNameList: ["Ethyl benzoate", "Hydrogen chloride"],
      tableComponentList: [
        {
          yieldRate: "85%",
          tableConditionList: [
            {
              solvent: ["Diethyl ether"],
              catalyst: ["Pyridine"],
              reagent: [],
              after: ["5% NaOH solution", "Water"],
              temperature: ["0-5°C"],
              time: ["2 hours"],
            },
          ],
        },
      ],
    },
    {
      reaxysId: "RX0012346",
      reactant: ["C1=CC=C(C=C1)O", "CC(=O)Cl"],
      reactantOssList: [
        "https://picsum.photos/200/200?random=2",
        "https://picsum.photos/200/200?random=2",
      ],
      reactantNameList: ["Phenol", "Acetyl chloride"],
      product: ["C1=CC=C(C=C1)OC(=O)C", "HCl"],
      productOssList: [
        "https://picsum.photos/200/200?random=2",
        "https://picsum.photos/200/200?random=2",
      ],
      productNameList: ["Phenyl acetate", "Hydrogen chloride"],
      tableComponentList: [
        {
          yieldRate: "78%",
          tableConditionList: [
            {
              solvent: ["Chloroform"],
              catalyst: ["Aluminium chloride (AlCl3)"],
              reagent: [],
              after: ["Cold water", "Sodium bicarbonate solution"],
              temperature: ["Reflux"],
              time: ["3 hours"],
            },
            {
              solvent: ["Chloroform"],
              catalyst: ["Aluminium chloride (AlCl3)"],
              reagent: [],
              after: ["Cold water", "Sodium bicarbonate solution"],
              temperature: ["Reflux"],
              time: ["3 hours"],
            },
            {
              solvent: ["Chloroform"],
              catalyst: ["Aluminium chloride (AlCl3)"],
              reagent: [],
              after: ["Cold water", "Sodium bicarbonate solution"],
              temperature: ["Reflux"],
              time: ["3 hours"],
            },
          ],
        },
      ],
    },
  ],
};

// 返回上一页
const goBack = () => {
  router.back();
};

onMounted(() => {
  try {
    // 从路由参数中解析任务数据
    const taskParam = route.query.task;
    if (taskParam) {
      taskData.value = JSON.parse(taskParam);
      // 修正：使用 taskData.value.taskCode 而不是 taskData.taskCode
      if (taskData.value.taskCode === TASK_TYPE.TEXT) {
        taskDetailData.value = textMockData;
      } else if (taskData.value.taskCode === TASK_TYPE.SMILES) {
        taskDetailData.value = smilesMockData;
      } else if (taskData.value.taskCode === TASK_TYPE.REACTION) {
        taskDetailData.value = reactionMockData;
      } else if (taskData.value.taskCode === TASK_TYPE.REAXYS) {
        taskDetailData.value = reaxysMockData;
      }
    } else {
      // 如果没有传递任务数据，显示错误信息
      console.error("未找到任务数据");
      router.push({ path: "/404" });
    }
  } catch (error) {
    console.error("解析任务数据失败:", error);
    router.push({ path: "/404" });
  }
});
</script>

<style scoped>
.task-detail-container {
  padding: 20px;
}

.page-header {
  padding-bottom: 10px;
  border-bottom: 1px solid #eee;
}

.result-content {
  min-height: 100px;
  padding: 15px;
}

pre {
  padding: 10px;
  word-break: break-all;
  white-space: pre-wrap;
  background-color: #f5f5f5;
  border-radius: 4px;
}

.text-danger {
  color: #f56c6c;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.d-flex {
  display: flex;
}

.justify-between {
  justify-content: space-between;
}

.items-center {
  align-items: center;
}

.reactant-img-container,
.product-img-container {
  display: flex;
  flex-wrap: wrap; /* 超出自动换行 */
  gap: 15px; /* 图片间距 */
  justify-content: flex-start; /* 横向左对齐 */
  margin-top: 10px;
}

.img-preview {
  display: block;
  max-width: 160px;
  height: auto;
  padding: 8px;
  margin: 0;
  cursor: pointer;
  background-color: white;
  border: 1px solid #ebeef5;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  transition: all 0.3s ease;
}

.img-preview:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transform: scale(1.02);
}

/* 响应式调整：小屏幕时减少图片宽度 */
@media (max-width: 768px) {
  .img-preview {
    max-width: 120px;
  }
}
</style>
