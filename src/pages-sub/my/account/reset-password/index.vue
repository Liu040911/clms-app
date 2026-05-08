<script lang="ts" setup>
import { computed, ref } from 'vue'
import { getEmailCode, getPhoneCode, resetPassword, verifyCode } from '@/api/auth'
import { useTokenStore } from '@/store/token'
import CommonInput from '@/components/CommonInput/index.vue'
import GradientButton from '@/components/GradientButton/index.vue'

definePage({
  style: {
    navigationStyle: 'custom',
    navigationBarTitleText: '重置密码',
  },
})

const tokenStore = useTokenStore()
const systemInfo = uni.getSystemInfoSync()
const safeAreaInsets = systemInfo.safeAreaInsets || { top: 0, right: 0, bottom: 0, left: 0 }

interface ResetForm {
  credential: string
  code: string
  password: string
  confirmPassword: string
}

const currentStep = ref(1)
const stepToken = ref('')

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

const stepTitle = computed(() => {
  return currentStep.value === 1 ? '通过手机号或邮箱重置密码' : '设置新密码'
})

async function handleSendCode() {
  const credential = resetForm.value.credential.trim()
  if (!credential) {
    uni.showToast({ title: '请输入手机号/邮箱', icon: 'none' })
    return
  }

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

    uni.showToast({ title: '验证码已发送', icon: 'success' })

    countdown.value = 60
    const timer = setInterval(() => {
      countdown.value--
      if (countdown.value <= 0) {
        clearInterval(timer)
      }
    }, 1000)
  }
  catch (e: any) {
    uni.showToast({ title: e?.data?.msg || '发送验证码失败', icon: 'none' })
  }
  finally {
    codeSending.value = false
  }
}

async function handleVerifyCode() {
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
    uni.showToast({ title: '验证成功', icon: 'success' })
  }
  catch (e: any) {
    uni.showToast({ title: e?.data?.msg || '验证失败', icon: 'none' })
  }
  finally {
    verifying.value = false
  }
}

async function handleReset() {
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
    uni.showToast({ title: '密码重置成功，请重新登录', icon: 'success' })
    setTimeout(async () => {
      await tokenStore.logout()
      uni.reLaunch({ url: '/pages-sub/auth/login/index' })
    }, 1500)
  }
  catch (e: any) {
    uni.showToast({ title: e?.data?.msg || '密码重置失败', icon: 'none' })
  }
  finally {
    loading.value = false
  }
}
</script>

<template>
  <view class="reset-password-page">
    <view v-show="safeAreaInsets.top === 0" class="safe-gap" />
    <view :style="{ height: `${safeAreaInsets.top}px` }" />

    <view class="title-bar">
      <text class="title-text">重置密码</text>
    </view>

    <view class="card-wrap">
      <view class="card card-shadow">
        <text class="step-title">{{ stepTitle }}</text>

        <!-- 步骤1：输入凭证和验证码 -->
        <view v-if="currentStep === 1" class="form-body">
          <CommonInput
            v-model="resetForm.credential"
            type="text"
            placeholder="请输入手机号/邮箱"
          />

          <view class="code-row">
            <view class="code-input">
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
            :loading="verifying"
            :text="verifying ? '验证中...' : '下一步'"
            @click="handleVerifyCode"
          />
        </view>

        <!-- 步骤2：设置新密码 -->
        <view v-if="currentStep === 2" class="form-body">
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
            :loading="loading"
            :text="loading ? '提交中...' : '重置密码'"
            @click="handleReset"
          />
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped>
.reset-password-page {
  min-height: 100vh;
  background: #f3f4f6;
}

.safe-gap {
  height: 24px;
}

.title-bar {
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.title-text {
  font-size: 18px;
  color: #111827;
  font-weight: 500;
}

.card-wrap {
  padding: 20px;
}

.card {
  border-radius: 16px;
  background: #fff;
  padding: 20px;
}

.card-shadow {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.step-title {
  display: block;
  font-size: 15px;
  color: #6b7280;
  margin-bottom: 20px;
  text-align: center;
}

.form-body {
  width: 100%;
}

.code-row {
  display: flex;
  gap: 16rpx;
  margin-bottom: 32rpx;
}

.code-input {
  flex: 1;
}
</style>
