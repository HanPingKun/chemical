# 化学反应预测平台前端（hpk 分支）

> 维护者：HanPingKun  
> 最后更新：2026-05-21

---

## 1. 项目说明

本前端项目基于 [vue3-element-admin](https://github.com/youlaitech/vue3-element-admin) 框架二次开发，作为化学反应预测平台的演示前端。

**hpk 分支**承担的功能：

- 反应类型预测（单条 / 批量 / 训练模型）
- 反应产率预测（单条 / 批量）

---

## 2. 技术栈

- Vue 3 + Vite + Element Plus + Pinia + Vue Router
- 包管理：pnpm

---

## 3. 启动方式

---

# 补丁 3：前端的部署前置步骤补充

在 `README-CLASSIFY-FRONTEND.md` 的 **3. 启动方式** 后面，补充生产环境部署步骤：

```markdown
### 3.2 生产环境部署（Nginx）

**前置环境要求**：
1. 安装 Node.js 16+
2. 安装 pnpm (`npm install -g pnpm`)
3. 安装 Nginx

**编译与部署**：
```bash
# 1. 编译打包
pnpm build

# 2. 产物在 dist/ 目录下，将 dist 目录复制到 Nginx 的 html 目录
cp -r dist/ /usr/share/nginx/html/chemical-frontend/
```

```bash
# 1. 安装依赖（首次运行必须）
pnpm install

# 2. 开发模式启动
pnpm dev
```

启动后访问 http://localhost:12000

---

## 4. 后端依赖

本前端依赖以下后端服务，启动前必须确保它们运行：

| 服务                  | 仓库                                                        | 端口 |
| --------------------- | ----------------------------------------------------------- | ---- |
| Java classify-service | https://github.com/Songshilongi/chemical-data-java/tree/hpk | 9600 |
| Python 算法服务       | https://github.com/HanPingKun/chemical-classify-python      | 8000 |

---

## 5. 关键改动说明

相对于 master 分支，hpk 分支做了以下修改：

### 5.1 新增功能页面

```
src/views/functionShow/
├── LeixingYuce/        # 反应类型预测
│   ├── PiliangYuce/    # 批量预测
│   ├── XunlianMoxing/  # 训练模型（占位页）
│   └── YuceMoxing/     # 单条预测
└── ChanlvYuce/         # 反应产率预测
    ├── DantiaoYuce/    # 单条预测
    └── PiliangYuce/    # 批量预测
```

### 5.2 新增 API 文件

```
src/api/system/
├── classifysingle.api.js   # 分类预测-单条
├── classifybatch.api.js    # 分类预测-批量
├── yieldsingle.api.js      # 产率预测-单条
└── yieldbatch.api.js       # 产率预测-批量
```

### 5.3 公共文件改动

| 文件                           | 改动                               | 用途                                  |
| ------------------------------ | ---------------------------------- | ------------------------------------- |
| `src/utils/request.js`         | 拦截器统一注入用户身份 header      | 兼容当前后端的 header 认证            |
| `src/utils/auth.js`            | 加 `getCurrentUser()` 返回写死用户 | 等真实登录功能做好后改这一处即可      |
| `src/enums/api/result.enum.js` | `'00000'` → `200`                  | 兼容当前后端的返回 code               |
| `vite.config.js`               | 注释掉 rewrite                     | 后端配了 context-path，不需要 rewrite |
| `.env.development`             | api-dev → api                      | 调整路径前缀                          |

> ⚠️ 上述公共文件改动可能与其他分支冲突。**合并到 master 前需要协调其他开发者**。

---

## 6. 与登录功能对接

目前 `src/utils/auth.js` 的 `getCurrentUser()` 返回写死用户：

```js
{
  userId: "12345",
  username: "testuser",
  email: "testuser@example.com",
  phone: "1234567890"
}
```

未来对接真实登录功能后，**只需修改这一个函数**，从 Pinia store 取真实用户信息即可：

```js
import { useUserStoreHook } from "@/store/modules/user.store";

export function getCurrentUser() {
  const userInfo = useUserStoreHook().userInfo;
  if (!userInfo || !userInfo.userId) return null;
  return {
    userId: String(userInfo.userId),
    username: userInfo.username,
    email: userInfo.email,
    phone: userInfo.phone,
  };
}
```

业务代码（vue 文件 + api.js）无需任何改动。

---

## 7. 演示注意事项

### 7.1 启动顺序

1. MySQL / Redis / RocketMQ
2. Python 算法服务（端口 8000）
3. Java classify-service（端口 9600）
4. 前端 Vite（`pnpm dev`，端口 12000）

### 7.2 测试账号

- userId: 12345
- username: testuser

（写死在前端，与后端 header 中的 userId 一致即可）

---

## 8. 联系方式

如对本前端有疑问，请联系：HanPingKun（hpk）