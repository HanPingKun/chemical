import axios from "axios";
import qs from "qs";
import { useUserStoreHook } from "@/store/modules/user.store";
import { ResultEnum } from "@/enums/api/result.enum";
// import { getAccessToken } from "@/utils/auth";
import { getAccessToken, getCurrentUser } from "@/utils/auth";
import router from "@/router";

// 创建 axios 实例
const service = axios.create({
  baseURL: import.meta.env.VITE_APP_BASE_API,
  timeout: 70000,
  headers: { "Content-Type": "application/json;charset=utf-8" },
  paramsSerializer: (params) => qs.stringify(params),
});

// // 请求拦截器
// service.interceptors.request.use(
//   (config) => {
//     // 如果请求的数据是 FormData 类型（通常用于文件上传），
//     // 则删除 Content-Type 请求头，让浏览器自动设置为 multipart/form-data 并附加 boundary。
//     // 这是处理 FormData 上传的正确且健壮的方式。
//     if (config.data instanceof FormData) {
//       delete config.headers["Content-Type"];
//     }
//     const accessToken = getAccessToken();
//     // 如果 Authorization 设置为 no-auth，则不携带 Token
//     if (config.headers.Authorization !== "no-auth" && accessToken) {
//       config.headers.Authorization = `Bearer ${accessToken}`;
//     } else {
//       delete config.headers.Authorization;
//     }
//     return config;
//   },
//   (error) => Promise.reject(error)
// );
// 请求拦截器
service.interceptors.request.use(
  (config) => {
    // 如果请求的数据是 FormData 类型（通常用于文件上传），
    // 则删除 Content-Type 请求头，让浏览器自动设置为 multipart/form-data 并附加 boundary。
    if (config.data instanceof FormData) {
      delete config.headers["Content-Type"];
    }

    // 1. 注入 Token
    const accessToken = getAccessToken();
    if (config.headers.Authorization !== "no-auth" && accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    } else {
      delete config.headers.Authorization;
    }

    // 2. 注入用户身份信息（userId/username/email/phone）
    //    注意：当前登录功能未完成，从 auth.js 的 getCurrentUser 返回写死数据；
    //    未来登录完成后，改 getCurrentUser 内部实现即可，业务代码不用变。
    const user = getCurrentUser();
    if (user) {
      config.headers.userId = user.userId;
      config.headers.username = user.username;
      config.headers.email = user.email;
      config.headers.phone = user.phone;
    }

    return config;
  },
  async (error) => {
    console.error("request error", error); // for debug
    const { config, response, code, message: errMessage } = error;

    // 1. 网络层错误（无 response）：超时、断网、服务挂了
    if (!response) {
      if (code === "ECONNABORTED" || errMessage?.includes("timeout")) {
        ElMessage.error("请求超时，请稍后重试");
      } else {
        ElMessage.error("网络异常，请检查网络或稍后重试");
      }
      return Promise.reject(error);
    }

    // 2. 业务层错误（有 response）：原有逻辑
    const { code: bizCode, message } = response.data;
    if (bizCode === ResultEnum.ACCESS_TOKEN_INVALID) {
      return handleTokenRefresh(config);
    } else if (bizCode === ResultEnum.REFRESH_TOKEN_INVALID) {
      await handleSessionExpired();
      return Promise.reject(new Error(message || "Error"));
    } else {
      ElMessage.error(message || "系统出错");
    }
    return Promise.reject(error.message);
  }
);

// 响应拦截器
service.interceptors.response.use(
  (response) => {
    // 如果响应是二进制流，则直接返回，用于下载文件、Excel 导出等
    if (response.config.responseType === "blob") {
      return response;
    }
    const { code, data, message } = response.data;
    if (code === ResultEnum.SUCCESS) {
      return data;
    }
    ElMessage.error(message || "系统出错");
    return Promise.reject(new Error(message || "Error"));
  },
  async (error) => {
    console.error("request error", error); // for debug
    const { config, response } = error;
    if (response) {
      const { code, message } = response.data;
      if (code === ResultEnum.ACCESS_TOKEN_INVALID) {
        // Token 过期，刷新 Token
        return handleTokenRefresh(config);
      } else if (code === ResultEnum.REFRESH_TOKEN_INVALID) {
        // 刷新 Token 过期，跳转登录页
        await handleSessionExpired();
        return Promise.reject(new Error(message || "Error"));
      } else {
        ElMessage.error(message || "系统出错");
      }
    }
    return Promise.reject(error.message);
  }
);

export default service;

// 是否正在刷新标识，避免重复刷新
let isRefreshing = false;
// 因 Token 过期导致的请求等待队列
const waitingQueue = [];

// 刷新 Token 处理
async function handleTokenRefresh(config) {
  return new Promise((resolve) => {
    // 封装需要重试的请求
    const retryRequest = () => {
      config.headers.Authorization = `Bearer ${getAccessToken()}`;
      resolve(service(config));
    };
    waitingQueue.push(retryRequest);
    if (!isRefreshing) {
      isRefreshing = true;
      useUserStoreHook()
        .refreshToken()
        .then(() => {
          // 依次重试队列中所有请求, 重试后清空队列
          waitingQueue.forEach((callback) => callback());
          waitingQueue.length = 0;
        })
        .catch(async (error) => {
          console.error("handleTokenRefresh error", error);
          // 刷新 Token 失败，跳转登录页
          await handleSessionExpired();
        })
        .finally(() => {
          isRefreshing = false;
        });
    }
  });
}

// 处理会话过期
async function handleSessionExpired() {
  ElNotification({
    title: "提示",
    message: "您的会话已过期，请重新登录",
    type: "info",
  });
  await useUserStoreHook().clearSessionAndCache();
  router.push("/login");
}
