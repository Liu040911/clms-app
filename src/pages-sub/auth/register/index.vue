<template>
  <view class="bg-linear-to-br h-screen flex flex-col justify-center from-blue-500 to-purple-600 px-60rpx">
    <view class="mb-80rpx text-center">
      <text class="mb-20rpx block text-52rpx text-blue-600 font-bold">注册账号</text>
      <text class="block text-28rpx text-gray-600">创建您的 讲座通 账号</text>
    </view>

    <view class="mb-60rpx">
      <CommonInput
        v-model="registerForm.nickname"
        type="text"
        placeholder="请输入昵称"
      />

      <CommonInput
        v-model="registerForm.phone"
        type="number"
        placeholder="请输入手机号"
      />

      <view class="mb-32rpx flex gap-16rpx">
        <view class="flex-1">
          <CommonInput
            v-model="registerForm.verificationCode"
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
          :disabled="countdown > 0"
          :text="countdown > 0 ? `${countdown}s` : '获取验证码'"
          @click="handleSendCode"
        />
      </view>

      <CommonInput
        v-model="registerForm.password"
        type="text"
        placeholder="请输入密码（6-20位）"
        :password="true"
      />

      <CommonInput
        v-model="registerForm.confirmPassword"
        type="text"
        placeholder="请再次输入密码"
        :password="true"
      />

      <view class="mb-40rpx">
        <checkbox-group @change="handleAgreeChange">
          <label class="flex items-start">
            <checkbox
              value="agreed"
              color="#409EFF"
              :checked="agreed"
            />
            <text class="ml-12rpx text-26rpx text-gray-600 leading-relaxed">
              我已阅读并同意
              <text class="text-blue-500 underline" @tap="handleViewAgreement">《用户协议》</text>
              和
              <text class="text-blue-500 underline" @tap="handleViewPrivacy">《隐私政策》</text>
            </text>
          </label>
        </checkbox-group>
      </view>

      <GradientButton
        custom-class="mb-40rpx"
        :loading="loading"
        :text="loading ? '注册中...' : '注册'"
        @click="handleRegister"
      />

      <view class="text-center text-28rpx">
        <text class="text-gray-500">已有账号？</text>
        <text class="ml-8rpx cursor-pointer text-blue-500 font-bold underline" @tap="handleGoLogin">立即登录</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'

import { getPhoneCode, register } from '@/api/auth'
import CommonInput from '@/components/CommonInput/index.vue'
import GradientButton from '@/components/GradientButton/index.vue'
import { useTokenStore } from '@/store/token'
import { useUserStore } from '@/store/user'

definePage({
  style: {
    navigationBarTitleText: '注册',
    navigationStyle: 'custom',
  },
})

interface RegisterForm {
  nickname: string
  phone: string
  verificationCode: string
  password: string
  confirmPassword: string
}

const registerForm = ref<RegisterForm>({
  nickname: '',
  phone: '',
  verificationCode: '',
  password: '',
  confirmPassword: '',
})

const agreed = ref(false)
const loading = ref(false)
const codeSending = ref(false)
const countdown = ref(0)

const tokenStore = useTokenStore()
const userStore = useUserStore()

// 注册处理
function handleRegister() {
  return (async () => {
    // 验证
    if (!registerForm.value.nickname) {
      uni.showToast({ title: '请输入昵称', icon: 'none' })
      return
    }
    if (!registerForm.value.phone) {
      uni.showToast({ title: '请输入手机号', icon: 'none' })
      return
    }
    // 验证手机号格式
    if (!/^1[3-9]\d{9}$/.test(registerForm.value.phone)) {
      uni.showToast({ title: '请输入正确的手机号', icon: 'none' })
      return
    }
    if (!registerForm.value.verificationCode) {
      uni.showToast({ title: '请输入验证码', icon: 'none' })
      return
    }
    if (!registerForm.value.password) {
      uni.showToast({ title: '请输入密码', icon: 'none' })
      return
    }
    if (registerForm.value.password.length < 6 || registerForm.value.password.length > 20) {
      uni.showToast({ title: '密码长度需在6-20位之间', icon: 'none' })
      return
    }
    if (registerForm.value.password !== registerForm.value.confirmPassword) {
      uni.showToast({ title: '两次密码不一致', icon: 'none' })
      return
    }
    if (!agreed.value) {
      uni.showToast({ title: '请阅读并同意用户协议和隐私政策', icon: 'none' })
      return
    }

    loading.value = true
    try {
      // 调用注册接口获取token信息（与登录流程一致）
      const tokenInfo = await register({
        nickname: registerForm.value.nickname,
        phone: registerForm.value.phone,
        verificationCode: registerForm.value.verificationCode,
        password: registerForm.value.password,
      })

      // 注册成功，保存token信息
      tokenStore.setTokenInfo(tokenInfo)

      // 获取用户信息
      await userStore.fetchUserInfo()

      uni.showToast({
        title: '注册成功',
        icon: 'success',
      })

      // 跳转到首页
      setTimeout(() => {
        uni.switchTab({
          url: '/pages/index/index',
        })
      }, 1500)
    }
    catch (error: any) {
      console.error('注册失败:', error)
      uni.showToast({
        title: error?.message || '注册失败',
        icon: 'none',
      })
    }
    finally {
      loading.value = false
    }
  })()
}

// 获取验证码
function handleSendCode() {
  return (async () => {
    const phone = registerForm.value.phone.trim()
    if (!phone) {
      uni.showToast({ title: '请输入手机号', icon: 'none' })
      return
    }

    // 验证手机号格式
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      uni.showToast({ title: '请输入正确的手机号', icon: 'none' })
      return
    }

    codeSending.value = true
    try {
      await getPhoneCode(phone)
      uni.showToast({
        title: '验证码已发送',
        icon: 'success',
      })
      countdown.value = 60
      const timer = setInterval(() => {
        countdown.value--
        if (countdown.value <= 0) {
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

function handleAgreeChange(e: any) {
  agreed.value = e.detail.value.length > 0
}

function handleViewAgreement() {
  uni.navigateTo({
    url: '/pages-sub/auth/agreement/index?type=user',
  })
}

function handleViewPrivacy() {
  uni.navigateTo({
    url: '/pages-sub/auth/agreement/index?type=privacy',
  })
}

function handleGoLogin() {
  uni.redirectTo({
    url: '/pages-sub/auth/login/index',
  })
}
</script>
