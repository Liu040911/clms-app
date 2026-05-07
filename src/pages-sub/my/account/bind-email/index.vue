<script lang="ts" setup>
import { computed, ref } from 'vue'
import { getEmailCode, getPhoneCode, updateCredential, verifyCode } from '@/api/auth'
import { useUserStore } from '@/store/user'
import CommonInput from '@/components/CommonInput/index.vue'
import GradientButton from '@/components/GradientButton/index.vue'

definePage({
  style: {
    navigationStyle: 'custom',
    navigationBarTitleText: '绑定邮箱',
  },
})

const userStore = useUserStore()
const systemInfo = uni.getSystemInfoSync()
const safeAreaInsets = systemInfo.safeAreaInsets || { top: 0, right: 0, bottom: 0, left: 0 }

interface VerifyForm {
  phone: string
  code: string
}

interface BindForm {
  email: string
  code: string
}

const currentStep = ref(1)
const stepToken = ref('')

const verifyForm = ref<VerifyForm>({
  phone: '',
  code: '',
})

const bindForm = ref<BindForm>({
  email: '',
  code: '',
})

const verifying = ref(false)
const codeSending = ref(false)
const countdown = ref(0)
const submitting = ref(false)

const stepTitle = computed(() => {
  return currentStep.value === 1 ? '请先验证当前手机号' : '设置新邮箱'
})

async function handleSendPhoneCode() {
  const phone = verifyForm.value.phone.trim()
  if (!phone) {
    uni.showToast({ title: '请输入手机号', icon: 'none' })
    return
  }
  if (!/^1[3-9]\d{9}$/.test(phone)) {
    uni.showToast({ title: '手机号格式不正确', icon: 'none' })
    return
  }

  codeSending.value = true
  try {
    await getPhoneCode(phone)
    uni.showToast({ title: '验证码已发送', icon: 'success' })

    countdown.value = 60
    const timer = setInterval(() => {
      countdown.value--
      if (countdown.value <= 0) clearInterval(timer)
    }, 1000)
  }
  catch (e: any) {
    uni.showToast({ title: e?.data?.msg || '发送验证码失败', icon: 'none' })
  }
  finally {
    codeSending.value = false
  }
}

async function handleSendEmailCode() {
  const email = bindForm.value.email.trim()
  if (!email) {
    uni.showToast({ title: '请输入邮箱', icon: 'none' })
    return
  }
  if (!/^[\w.-]+@[\w.-]+\.\w+$/.test(email)) {
    uni.showToast({ title: '邮箱格式不正确', icon: 'none' })
    return
  }

  codeSending.value = true
  try {
    await getEmailCode(email)
    uni.showToast({ title: '验证码已发送', icon: 'success' })

    countdown.value = 60
    const timer = setInterval(() => {
      countdown.value--
      if (countdown.value <= 0) clearInterval(timer)
    }, 1000)
  }
  catch (e: any) {
    uni.showToast({ title: e?.data?.msg || '发送验证码失败', icon: 'none' })
  }
  finally {
    codeSending.value = false
  }
}

async function handleVerifyPhone() {
  if (!verifyForm.value.phone.trim()) {
    uni.showToast({ title: '请输入手机号', icon: 'none' })
    return
  }
  if (!verifyForm.value.code.trim()) {
    uni.showToast({ title: '请输入验证码', icon: 'none' })
    return
  }

  verifying.value = true
  try {
    const token = await verifyCode(verifyForm.value.phone.trim(), verifyForm.value.code.trim())
    stepToken.value = token
    currentStep.value = 2
    countdown.value = 0
    uni.showToast({ title: '验证成功', icon: 'success' })
  }
  catch (e: any) {
    uni.showToast({ title: e?.data?.msg || '验证失败', icon: 'none' })
  }
  finally {
    verifying.value = false
  }
}

async function handleBind() {
  const email = bindForm.value.email.trim()
  if (!email) {
    uni.showToast({ title: '请输入新邮箱', icon: 'none' })
    return
  }
  if (!/^[\w.-]+@[\w.-]+\.\w+$/.test(email)) {
    uni.showToast({ title: '邮箱格式不正确', icon: 'none' })
    return
  }
  if (!bindForm.value.code.trim()) {
    uni.showToast({ title: '请输入验证码', icon: 'none' })
    return
  }

  submitting.value = true
  try {
    await updateCredential({
      type: 'email',
      value: email,
      code: bindForm.value.code.trim(),
      stepToken: stepToken.value,
    })
    await userStore.fetchUserInfo()
    uni.showToast({ title: '邮箱绑定成功', icon: 'success' })
    setTimeout(() => uni.navigateBack(), 1000)
  }
  catch (e: any) {
    uni.showToast({ title: e?.data?.msg || '绑定失败', icon: 'none' })
  }
  finally {
    submitting.value = false
  }
}
</script>

<template>
  <view class="bind-email-page">
    <view v-show="safeAreaInsets.top === 0" class="safe-gap" />
    <view :style="{ height: `${safeAreaInsets.top}px` }" />

    <view class="title-bar">
      <text class="title-text">绑定邮箱</text>
    </view>

    <view class="card-wrap">
      <view class="card card-shadow">
        <text class="step-title">{{ stepTitle }}</text>

        <!-- 步骤1：验证手机号 -->
        <view v-if="currentStep === 1" class="form-body">
          <CommonInput
            v-model="verifyForm.phone"
            type="tel"
            placeholder="请输入当前手机号"
          />

          <view class="code-row">
            <view class="code-input">
              <CommonInput
                v-model="verifyForm.code"
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
              @click="handleSendPhoneCode"
            />
          </view>

          <GradientButton
            :loading="verifying"
            :text="verifying ? '验证中...' : '下一步'"
            @click="handleVerifyPhone"
          />
        </view>

        <!-- 步骤2：绑定邮箱 -->
        <view v-if="currentStep === 2" class="form-body">
          <CommonInput
            v-model="bindForm.email"
            type="email"
            placeholder="请输入新邮箱"
          />

          <view class="code-row">
            <view class="code-input">
              <CommonInput
                v-model="bindForm.code"
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
              @click="handleSendEmailCode"
            />
          </view>

          <GradientButton
            :loading="submitting"
            :text="submitting ? '提交中...' : '确认绑定'"
            @click="handleBind"
          />
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped>
.bind-email-page {
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
