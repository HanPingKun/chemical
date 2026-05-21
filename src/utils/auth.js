// 访问 token 缓存的 key
const ACCESS_TOKEN_KEY = "access_token";
// 刷新 token 缓存的 key
const REFRESH_TOKEN_KEY = "refresh_token";

function getAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY) || "";
}

function setAccessToken(token) {
  localStorage.setItem(ACCESS_TOKEN_KEY, token);
}

function getRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_KEY) || "";
}

function setRefreshToken(token) {
  localStorage.setItem(REFRESH_TOKEN_KEY, token);
}

function clearToken() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export { getAccessToken, setAccessToken, clearToken, getRefreshToken, setRefreshToken };

/**
 * 获取当前用户身份信息
 *
 * 【开发期间】返回写死的测试用户（因为登录/注册功能还未完成）
 * 【未来】登录功能做好后，从 useUserStore() 或 localStorage 取真实数据，
 *        本函数内部实现切换，所有业务代码不用改动。
 *
 * @returns {{userId: string, username: string, email: string, phone: string}}
 */
export function getCurrentUser() {
  // TODO: 真实登录功能完成后，改为：
  // import { useUserStoreHook } from "@/store/modules/user.store";
  // const userInfo = useUserStoreHook().userInfo;
  // return {
  //   userId: userInfo.userId,
  //   username: userInfo.username,
  //   email: userInfo.email,
  //   phone: userInfo.phone,
  // };

  return {
    userId: "12345",
    username: "testuser",
    email: "testuser@example.com",
    phone: "1234567890",
  };
}
