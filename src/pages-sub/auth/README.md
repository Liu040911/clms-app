# 登录认证子包 (pages-sub/auth)

## 目录结构

```text
pages-sub/auth/
├── login/              # 登录页面
│   └── index.vue
├── register/           # 注册页面
│   └── index.vue
├── forgot-password/    # 忘记密码
│   └── index.vue
└── agreement/          # 协议详情
    └── index.vue
```

## 页面说明

### 1. 登录页面 (`/pages-sub/auth/login/index`)

- 支持用户名/手机号/邮箱登录
- 支持密码登录
- 支持微信小程序一键登录
- 记住密码功能
- 跳转注册、忘记密码

### 2. 注册页面 (`/pages-sub/auth/register/index`)

- 用户名、手机号、邮箱注册
- 密码强度验证
- 用户协议和隐私政策同意
- 返回登录页面

### 3. 忘记密码页面 (`/pages-sub/auth/forgot-password/index`)

- 手机号找回密码
- 邮箱找回密码
- 验证码验证
- 密码重置

### 4. 协议详情页面 (`/pages-sub/auth/agreement/index`)

- 用户协议展示
- 隐私政策展示
- 通过 query 参数区分类型：`?type=user` 或 `?type=privacy`

## 使用方式

### 跳转到登录页

```typescript
import { toLoginPage } from '@/utils/toLoginPage'

// 默认跳转
toLoginPage()

// 带重定向
toLoginPage({ queryString: '?redirect=/pages/index/index' })

// 使用 reLaunch 模式
toLoginPage({ mode: 'reLaunch' })
```

### 登录流程

```typescript
import { useTokenStore } from '@/store/token'

const tokenStore = useTokenStore()

// 账号密码登录
await tokenStore.login({ username: 'xxx', password: 'xxx' })

// 微信登录
await tokenStore.wxLogin()
```

## 分包配置

在 `pages.json` 中已配置：

```json
{
  "subPackages": [
    {
      "root": "pages-sub/auth",
      "pages": [
        // 登录相关页面
      ]
    }
  ]
}
```

## 注意事项

1. **图片资源**：需要将以下图片放到 `/static/images/` 目录：
   - `logo.png` - 应用 Logo
   - `wechat.png` - 微信图标

2. **API 接口**：需要在后端实现以下接口：
   - 登录接口：`POST /auth/login`
   - 注册接口：`POST /auth/register`
   - 忘记密码接口：`POST /auth/reset-password`
   - 发送验证码接口：`POST /auth/send-code`

3. **路由拦截**：登录拦截逻辑在 `src/router/interceptor.ts` 中配置

4. **Token 管理**：Token 存储和刷新逻辑在 `src/store/token.ts` 中
