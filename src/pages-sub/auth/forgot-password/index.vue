<template>
  <view class="bg-linear-to-br h-screen flex flex-col justify-center from-blue-500 to-purple-600 px-60rpx">
    <view class="mb-80rpx text-center">
      <text class="mb-20rpx block text-52rpx text-blue-600 font-bold">忘记密码</text>
      <text class="block text-28rpx text-gray-600">{{ stepTitle }}</text>
    </view>

    <view class="mb-60rpx">
      <!-- 步骤1：输入凭证和验证码 -->
      <view v-if="currentStep === 1">
        <CommonInput
          v-model="resetForm.credential"
          type="text"
          placeholder="请输入手机号/邮箱"
        />

        <view class="mb-32rpx flex gap-16rpx">
          <view class="flex-1">
            <CommonInput
              v-model="resetForm.code"
              type="text"
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

        <GradientButton
          custom-class="mb-40rpx"
          :loading="verifying"
          :text="verifying ? '验证中...' : '下一步'"
          @click="handleVerifyCode"
        />
      </view>

      <!-- 步骤2：设置新密码 -->
      <view v-else-if="currentStep === 2">
        <CommonInput
          v-model="resetForm.password"
          type="text"
          placeholder="请输入新密码（6-20位）"
          :password="true"
        />

        <CommonInput
          v-model="resetForm.confirmPassword"
          type="text"
          placeholder="请确认新密码"
          :password="true"
        />

        <GradientButton
          custom-class="mb-40rpx"
          :loading="loading"
          :text="loading ? '提交中...' : '重置密码'"
          @click="handleReset"
        />
      </view>

      <view class="text-center">
        <text class="text-28rpx text-gray-500">想起密码了？</text>
        <text class="ml-8rpx cursor-pointer text-28rpx text-blue-500 font-bold underline" @tap="handleBackToLogin">返回登录</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

import { getEmailCode, getPhoneCode, resetPassword, verifyCode } from '@/api/auth'
import CommonInput from '@/components/CommonInput/index.vue'
import GradientButton from '@/components/GradientButton/index.vue'

definePage({
  style: {
    navigationBarTitleText: '忘记密码',
    navigationStyle: 'custom',
  },
})

interface ResetForm {
  credential: string
  code: string
  password: string
  confirmPassword: string
}

const currentStep = ref(1) // 1: 输入验证码, 2: 设置新密码
const stepToken = ref('') // 步骤令牌

const resetForm = ref<ResetForm>({
  credential: '',
  code: '',
  password: '',
  confirmPassword: '',
})

const loading = ref(false)
const verifying = ref(false)
const codeSending = ref(false)
const countdown = ref(0)

// 计算步骤标题
const stepTitle = computed(() => {
  return currentStep.value === 1 ? '通过手机号或邮箱重置密码' : '设置新密码'
})

// 发送验证码
function handleSendCode() {
  return (async () => {
    const credential = resetForm.value.credential.trim()
    if (!credential) {
      uni.showToast({
        title: '请输入手机号/邮箱',
        icon: 'none',
      })
      return
    }

    // 判断是手机号还是邮箱
    const isPhone = /^1[3-9]\d{9}$/.test(credential)
    const isEmail = /^[\w.-]+@[\w.-]+\.\w+$/.test(credential)

    if (!isPhone && !isEmail) {
      uni.showToast({ title: '请输入正确的手机号或邮箱', icon: 'none' })
      return
    }

    codeSending.value = true
    try {
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

      // 开始倒计时
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

// 验证验证码
function handleVerifyCode() {
  return (async () => {
    if (!resetForm.value.credential) {
      uni.showToast({ title: '请输入手机号/邮箱', icon: 'none' })
      return
    }
    if (!resetForm.value.code) {
      uni.showToast({ title: '请输入验证码', icon: 'none' })
      return
    }

    verifying.value = true
    try {
      const token = await verifyCode(resetForm.value.credential, resetForm.value.code)
      stepToken.value = token
      currentStep.value = 2
      uni.showToast({
        title: '验证成功',
        icon: 'success',
      })
    }
    catch (error) {
      console.error('验证失败:', error)
      uni.showToast({ title: error.data.msg, icon: 'none' })
    }
    finally {
      verifying.value = false
    }
  })()
}

// 重置密码
function handleReset() {
  return (async () => {
    if (!resetForm.value.password) {
      uni.showToast({ title: '请输入新密码', icon: 'none' })
      return
    }
    if (resetForm.value.password.length < 6 || resetForm.value.password.length > 20) {
      uni.showToast({ title: '密码长度必须在6-20位之间', icon: 'none' })
      return
    }
    if (resetForm.value.password !== resetForm.value.confirmPassword) {
      uni.showToast({ title: '两次密码不一致', icon: 'none' })
      return
    }

    loading.value = true
    try {
      await resetPassword(stepToken.value, resetForm.value.password)
      uni.showToast({
        title: '密码重置成功',
        icon: 'success',
      })
      setTimeout(() => {
        uni.navigateBack()
      }, 1500)
    }
    catch (error) {
      console.error('重置密码失败:', error)
      uni.showToast({ title: '密码重置失败', icon: 'none' })
    }
    finally {
      loading.value = false
    }
  })()
}

// 返回登录
function handleBackToLogin() {
  return (() => {
    uni.navigateBack()
  })()
}
</script>
