<template>
  <view class="bg-linear-to-br flex flex-col from-blue-500 to-purple-600 px-60rpx py-80rpx">
    <!-- Logo 区域 -->
    <view class="mb-80rpx flex flex-col items-center">
      <image src="/static/images/logo.png" mode="aspectFit" class="mb-32rpx h-160rpx w-160rpx" />
      <text class="text-48rpx text-blue-600 font-bold">讲座通</text>
    </view>

    <!-- 登录表单 -->
    <view class="mb-60rpx">
      <!-- 密码登录模式 -->
      <view v-if="loginType === 'password'">
        <CommonInput
          v-model="loginForm.credential"
          type="text"
          placeholder="请输入手机号/邮箱"
        />

        <CommonInput
          v-model="loginForm.password"
          type="text"
          placeholder="请输入密码"
          :password="true"
        />

        <view class="mb-32rpx flex items-center justify-end">
          <text class="cursor-pointer text-28rpx text-blue-500 font-bold underline" @tap="handleForgotPassword">忘记密码？</text>
        </view>

        <GradientButton
          custom-class="mb-32rpx"
          :loading="loading"
          :text="loading ? '登录中...' : '登录'"
          @click="handleLogin"
        />

        <view class="mb-32rpx text-center text-28rpx">
          <text class="text-gray-500">或者</text>
          <text class="ml-8rpx cursor-pointer text-blue-500 font-bold underline" @tap="loginType = 'code'">验证码登录</text>
        </view>

        <!-- 微信登录按钮（仅微信小程序显示） -->
        <!-- #ifdef MP-WEIXIN -->
        <!-- <GradientButton
          custom-class="mb-40rpx"
          gradient-color="green"
          text="微信登录"
          @click="handleWechatLogin"
        /> -->
        <!-- #endif -->
      </view>

      <!-- 验证码登录模式 -->
      <view v-else>
        <CommonInput
          v-model="codeLoginForm.credential"
          type="text"
          placeholder="请输入手机号/邮箱"
        />

        <view class="mb-32rpx flex gap-16rpx">
          <view class="flex-1">
            <CommonInput
              v-model="codeLoginForm.code"
              type="number"
              placeholder="请输入验证码"
              :show-margin="false"
            />
          </view>
          <GradientButton
            width="220rpx"
            height="96rpx"
            font-size="28rpx"
            :loading="codeSending"
            :disabled="codeCountdown > 0"
            :text="codeCountdown > 0 ? `${codeCountdown}s` : '获取验证码'"
            @click="handleSendCode"
          />
        </view>

        <GradientButton
          custom-class="mb-32rpx"
          :loading="loading"
          :text="loading ? '登录中...' : '登录'"
          @click="handleCodeLogin"
        />

        <view class="mb-32rpx text-center text-28rpx">
          <text class="text-gray-500">或者</text>
          <text class="ml-8rpx cursor-pointer text-blue-500 font-bold underline" @tap="loginType = 'password'">密码登录</text>
        </view>
      </view>
    </view>

    <!-- 注册入口 -->
    <view class="text-center text-28rpx">
      <text class="text-gray-500">还没有账号？</text>
      <text class="ml-8rpx cursor-pointer text-blue-500 font-bold underline" @tap="handleRegister">立即注册</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import type { ILoginForm } from '@/api/auth'
import { ref } from 'vue'
import { getEmailCode, getPhoneCode } from '@/api/auth'
import CommonInput from '@/components/CommonInput/index.vue'
import GradientButton from '@/components/GradientButton/index.vue'
import { useTokenStore } from '@/store/token'

const tokenStore = useTokenStore()

// 登录方式
const loginType = ref<'password' | 'code'>('password')

// 密码登录表单
const loginForm = ref<ILoginForm>({
  credential: '',
  password: '',
})

// 验证码登录表单
const codeLoginForm = ref<ILoginForm>({
  credential: '',
  code: '',
})

const loading = ref(false)
const codeSending = ref(false)
const codeCountdown = ref(0)
const redirectPath = ref('/pages/index/index')

const TAB_PAGE_PATHS = new Set(['/pages/index/index', '/pages/my/my'])

function getSafeRedirectPath(rawRedirect?: string) {
  if (!rawRedirect) {
    return '/pages/index/index'
  }

  let decoded = rawRedirect
  try {
    decoded = decodeURIComponent(rawRedirect)
  }
  catch {
    decoded = rawRedirect
  }

  if (!decoded.startsWith('/')) {
    return '/pages/index/index'
  }

  return decoded
}

function navigateAfterLogin() {
  const targetPath = getSafeRedirectPath(redirectPath.value)

  if (TAB_PAGE_PATHS.has(targetPath)) {
    uni.switchTab({ url: targetPath })
    return
  }

  uni.redirectTo({ url: targetPath })
}

onLoad((options) => {
  redirectPath.value = getSafeRedirectPath(typeof options?.redirect === 'string' ? options.redirect : undefined)
})

// 密码登录
function handleLogin() {
  return (async () => {
    if (!loginForm.value.credential || !loginForm.value.password) {
      uni.showToast({
        title: '请输入手机号/邮箱和密码',
        icon: 'none',
      })
      return
    }

    loading.value = true
    try {
      await tokenStore.login(loginForm.value)

      uni.showToast({
        title: '登录成功',
        icon: 'success',
      })

      setTimeout(() => {
        navigateAfterLogin()
      }, 500)
    }
    catch (error) {
      console.error('登录失败:', error)
    }
    finally {
      loading.value = false
    }
  })()
}

// 验证码登录
function handleCodeLogin() {
  return (async () => {
    if (!codeLoginForm.value.credential || !codeLoginForm.value.code) {
      uni.showToast({
        title: '请输入手机号/邮箱和验证码',
        icon: 'none',
      })
      return
    }

    loading.value = true
    try {
      // 使用验证码登录，复用 tokenStore.login
      await tokenStore.login(codeLoginForm.value)

      uni.showToast({
        title: '登录成功',
        icon: 'success',
      })

      setTimeout(() => {
        navigateAfterLogin()
      }, 500)
    }
    catch (error) {
      console.error('验证码登录失败:', error)
    }
    finally {
      loading.value = false
    }
  })()
}

// 发送验证码
function handleSendCode() {
  return (async () => {
    const credential = codeLoginForm.value.credential.trim()
    if (!credential) {
      uni.showToast({ title: '请输入手机号/邮箱', icon: 'none' })
      return
    }

    codeSending.value = true
    try {
      // 判断是手机号还是邮箱
      const isPhone = /^1[3-9]\d{9}$/.test(credential)
      const isEmail = /^[\w.-]+@[\w.-]+\.\w+$/.test(credential)

      if (!isPhone && !isEmail) {
        uni.showToast({ title: '请输入正确的手机号或邮箱', icon: 'none' })
        return
      }

      if (isPhone) {
        await getPhoneCode(credential)
      }
      else {
        await getEmailCode(credential)
      }

      uni.showToast({
        title: '验证码已发送',
        icon: 'success',
      })
      codeCountdown.value = 60
      const timer = setInterval(() => {
        codeCountdown.value--
        if (codeCountdown.value <= 0) {
          clearInterval(timer)
        }
      }, 1000)
    }
    catch (error) {
      console.error('发送验证码失败:', error)
      uni.showToast({ title: '发送验证码失败', icon: 'none' })
    }
    finally {
      codeSending.value = false
    }
  })()
}

// 微信登录
// function handleWechatLogin() {
//   return (async () => {
//     loading.value = true
//     try {
//       await tokenStore.wxLogin()
//       uni.reLaunch({
//         url: '/pages/index/index',
//       })
//     }
//     catch (error) {
//       console.error('微信登录失败:', error)
//     }
//     finally {
//       loading.value = false
//     }
//   })()
// }

// 忘记密码
function handleForgotPassword() {
  uni.navigateTo({
    url: '/pages-sub/auth/forgot-password/index',
  })
}

// 注册
function handleRegister() {
  uni.redirectTo({
    url: '/pages-sub/auth/register/index',
  })
}
</script>
