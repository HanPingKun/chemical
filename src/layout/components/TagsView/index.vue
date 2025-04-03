<template>
  <div class="tags-container">
    <el-scrollbar class="scroll-container" :vertical="false" @wheel="handleScroll">
      <router-link
        v-for="tag in visitedViews"
        ref="tagRef"
        :key="tag.fullPath"
        :class="'tags-item ' + (tagsViewStore.isActive(tag) ? 'active' : '')"
        :to="{ path: tag.path, query: tag.query }"
        @click.middle="!isAffix(tag) ? closeSelectedTag(tag) : ''"
        @contextmenu.prevent="openContentMenu(tag, $event)"
      >
        {{ translateRouteTitle(tag.title) }}
        <el-icon
          v-if="!isAffix(tag)"
          class="tag-close-icon"
          @click.prevent.stop="closeSelectedTag(tag)"
        >
          <Close />
        </el-icon>
      </router-link>
    </el-scrollbar>

    <!-- tag标签操作菜单 -->
    <ul
      v-show="contentMenuVisible"
      class="contextmenu"
      :style="{ left: left + 'px', top: top + 'px' }"
    >
      <li @click="refreshSelectedTag(selectedTag)">
        <div class="i-svg:refresh" />
        刷新
      </li>
      <li v-if="!isAffix(selectedTag)" @click="closeSelectedTag(selectedTag)">
        <div class="i-svg:close" />
        关闭
      </li>
      <li @click="closeOtherTags">
        <div class="i-svg:close_other" />
        关闭其它
      </li>
      <li v-if="!isFirstView()" @click="closeLeftTags">
        <div class="i-svg:close_left" />
        关闭左侧
      </li>
      <li v-if="!isLastView()" @click="closeRightTags">
        <div class="i-svg:close_right" />
        关闭右侧
      </li>
      <li @click="closeAllTags(selectedTag)">
        <div class="i-svg:close_all" />
        关闭所有
      </li>
    </ul>
  </div>
</template>

<script setup>
import { useRoute, useRouter } from "vue-router";
import { resolve } from "path-browserify";
import { translateRouteTitle } from "@/utils/i18n";

import { usePermissionStore, useTagsViewStore, useSettingsStore, useAppStore } from "@/store";

const { proxy } = getCurrentInstance();
const router = useRouter();
const route = useRoute();

const permissionStore = usePermissionStore();
const tagsViewStore = useTagsViewStore();
const appStore = useAppStore();

const { visitedViews } = storeToRefs(tagsViewStore);
const settingsStore = useSettingsStore();
const layout = computed(() => settingsStore.layout);

const selectedTag = ref({
  path: "",
  fullPath: "",
  name: "",
  title: "",
  affix: false,
  keepAlive: false,
});

const affixTags = ref([]);
const left = ref(0);
const top = ref(0);

watch(
  route,
  () => {
    addTags();
    moveToCurrentTag();
  },
  {
    immediate: true, //初始化立即执行
  }
);

const contentMenuVisible = ref(false); // 右键菜单是否显示
watch(contentMenuVisible, (value) => {
  if (value) {
    document.body.addEventListener("click", closeContentMenu);
  } else {
    document.body.removeEventListener("click", closeContentMenu);
  }
});

/**
 * 过滤出需要固定的标签
 */
function filterAffixTags(routes, basePath = "/") {
  let tags = [];
  routes.forEach((route) => {
    const tagPath = resolve(basePath, route.path);
    if (route.meta?.affix) {
      tags.push({
        path: tagPath,
        fullPath: tagPath,
        name: String(route.name),
        title: route.meta?.title || "no-name",
        affix: route.meta?.affix,
        keepAlive: route.meta?.keepAlive,
      });
    }
    if (route.children) {
      const tempTags = filterAffixTags(route.children, basePath + route.path);
      if (tempTags.length >= 1) {
        tags = [...tags, ...tempTags];
      }
    }
  });
  return tags;
}

function initTags() {
  const tags = filterAffixTags(permissionStore.routes);
  affixTags.value = tags;
  for (const tag of tags) {
    // Must have tag name
    if (tag.name) {
      tagsViewStore.addVisitedView(tag);
    }
  }
}

function addTags() {
  if (route.meta.title) {
    tagsViewStore.addView({
      name: route.name,
      title: route.meta.title,
      path: route.path,
      fullPath: route.fullPath,
      affix: route.meta?.affix,
      keepAlive: route.meta?.keepAlive,
      query: route.query,
    });
  }
}

function moveToCurrentTag() {
  // 使用 nextTick() 的目的是确保在更新 tagsView 组件之前，scrollPaneRef 对象已经滚动到了正确的位置。
  nextTick(() => {
    for (const tag of visitedViews.value) {
      if (tag.path === route.path) {
        // when query is different then update
        // route.query = { ...route.query, ...tag.query };
        if (tag.fullPath !== route.fullPath) {
          tagsViewStore.updateVisitedView({
            name: route.name,
            title: route.meta.title || "",
            path: route.path,
            fullPath: route.fullPath,
            affix: route.meta?.affix,
            keepAlive: route.meta?.keepAlive,
            query: route.query,
          });
        }
      }
    }
  });
}

function isAffix(tag) {
  return tag?.affix;
}

function isFirstView() {
  return (
    selectedTag.value.path === "/dashboard" ||
    selectedTag.value.fullPath === tagsViewStore.visitedViews[1]?.fullPath
  );
}

function isLastView() {
  return (
    selectedTag.value.fullPath ===
    tagsViewStore.visitedViews[tagsViewStore.visitedViews.length - 1]?.fullPath
  );
}

function refreshSelectedTag(view) {
  tagsViewStore.delCachedView(view);
  const { fullPath } = view;
  nextTick(() => {
    router.replace("/redirect" + fullPath);
  });
}

function closeSelectedTag(view) {
  tagsViewStore.delView(view).then((res) => {
    if (tagsViewStore.isActive(view)) {
      tagsViewStore.toLastView(res.visitedViews, view);
    }
  });
}

function closeLeftTags() {
  tagsViewStore.delLeftViews(selectedTag.value).then((res) => {
    if (!res.visitedViews.find((item) => item.path === route.path)) {
      tagsViewStore.toLastView(res.visitedViews);
    }
  });
}

function closeRightTags() {
  tagsViewStore.delRightViews(selectedTag.value).then((res) => {
    if (!res.visitedViews.find((item) => item.path === route.path)) {
      tagsViewStore.toLastView(res.visitedViews);
    }
  });
}

function closeOtherTags() {
  router.push(selectedTag.value);
  tagsViewStore.delOtherViews(selectedTag.value).then(() => {
    moveToCurrentTag();
  });
}

function closeAllTags(view) {
  tagsViewStore.delAllViews().then((res) => {
    tagsViewStore.toLastView(res.visitedViews, view);
  });
}

/**
 * 打开右键菜单
 */
function openContentMenu(tag, e) {
  const menuMinWidth = 105;
  const offsetLeft = proxy?.$el.getBoundingClientRect().left; // container margin left
  const offsetWidth = proxy?.$el.offsetWidth; // container width
  const maxLeft = offsetWidth - menuMinWidth; // left boundary
  const left = e.clientX - offsetLeft + 15; // 15: margin right

  if (left > maxLeft) {
    left.value = maxLeft;
  } else {
    left.value = left;
  }
  top.value = e.clientY;
  contentMenuVisible.value = true;
  selectedTag.value = tag;
}

/**
 * 关闭右键菜单
 */
function closeContentMenu() {
  contentMenuVisible.value = false;
}

/**
 * 处理鼠标滚轮事件
 */
function handleScroll(e) {
  const eventDelta = e.wheelDelta || -e.deltaY * 40;
  const $scrollWrapper = proxy?.$el.querySelector(".scroll-container");
  $scrollWrapper.scrollLeft = $scrollWrapper.scrollLeft + eventDelta / 4;
}

onMounted(() => {
  initTags();
});
</script>

<style lang="scss" scoped>
.tags-container {
  height: 34px;
  width: 100%;
  background: #fff;
  border-bottom: 1px solid #d8dce5;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.12), 0 0 3px 0 rgba(0, 0, 0, 0.04);

  .scroll-container {
    position: relative;
    width: 100%;
    height: 100%;
    white-space: nowrap;
    overflow: hidden;

    :deep(.el-scrollbar__bar) {
      bottom: 0px;
    }

    :deep(.el-scrollbar__wrap) {
      height: 49px;
    }
  }

  .tags-item {
    display: inline-block;
    position: relative;
    height: 26px;
    line-height: 26px;
    border: 1px solid #d8dce5;
    color: #495060;
    background: #fff;
    padding: 0 8px;
    font-size: 12px;
    margin-left: 5px;
    margin-top: 4px;
    &:first-of-type {
      margin-left: 15px;
    }
    &:last-of-type {
      margin-right: 15px;
    }
    &.active {
      background-color: #42b983;
      color: #fff;
      border-color: #42b983;
      &::before {
        content: "";
        background: #fff;
        display: inline-block;
        width: 8px;
        height: 8px;
        border-radius: 50%;
        position: relative;
        margin-right: 2px;
      }
    }
  }

  .contextmenu {
    margin: 0;
    background: #fff;
    z-index: 3000;
    position: absolute;
    list-style-type: none;
    padding: 5px 0;
    border-radius: 4px;
    font-size: 12px;
    font-weight: 400;
    color: #333;
    box-shadow: 2px 2px 3px 0 rgba(0, 0, 0, 0.3);
    li {
      margin: 0;
      padding: 7px 16px;
      cursor: pointer;
      &:hover {
        background: #eee;
      }
    }
  }
}

//reset element css of el-icon-close
.tags-item {
  .el-icon-close {
    width: 16px;
    height: 16px;
    vertical-align: 2px;
    border-radius: 50%;
    text-align: center;
    transition: all 0.3s cubic-bezier(0.645, 0.045, 0.355, 1);
    transform-origin: 100% 50%;
    &:before {
      transform: scale(0.6);
      display: inline-block;
      vertical-align: -3px;
    }
    &:hover {
      background-color: #b4bccc;
      color: #fff;
    }
  }
}
</style>
