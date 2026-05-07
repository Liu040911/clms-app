<script lang="ts" setup>
import { computed, ref } from 'vue'
import { getEmailCode, getPhoneCode, updateCredential, verifyCode } from '@/api/auth'
import { useUserStore } from '@/store/user'
import CommonInput from '@/components/CommonInput/index.vue'
import GradientButton from '@/components/GradientButton/index.vue'

definePage({
  style: {
    navigationStyle: 'custom',
    navigationBarTitleText: '更新手机号/邮箱',
  },
})

const userStore = useUserStore()
const systemInfo = uni.getSystemInfoSync()
const safeAreaInsets = systemInfo.safeAreaInsets || { top: 0, right: 0, bottom: 0, left: 0 }

const updateType = ref<'phone' | 'email'>('phone')

onLoad((options: any) => {
  if (options?.type === 'phone' || options?.type === 'email') {
    updateType.value = options.type
  }
})

interface VerifyForm {
  credential: string
  code: string
}

interface UpdateForm {
  value: string
  code: string
}

const currentStep = ref(1)
const stepToken = ref('')

const verifyForm = ref<VerifyForm>({
  credential: '',
  code: '',
})

const updateForm = ref<UpdateForm>({
  value: '',
  code: '',
})

const verifying = ref(false)
const codeSending = ref(false)
const countdown = ref(0)
const submitting = ref(false)

const typeLabel = computed(() => updateType.value === 'phone' ? '手机号' : '邮箱')

const stepTitle = computed(() => {
  return currentStep.value === 1
    ? `请验证当前${typeLabel.value}`
    : `设置新的${typeLabel.value}`
})

function switchUpdateType(type: 'phone' | 'email') {
  if (currentStep.value === 2) return // Step 2 不允许切换
  updateType.value = type
  verifyForm.value.credential = ''
  verifyForm.value.code = ''
  countdown.value = 0
}

async function handleSendCode() {
  let value: string
  if (currentStep.value === 1) {
    value = verifyForm.value.credential.trim()
  }
  else {
    value = updateForm.value.value.trim()
  }

  if (!value) {
    const hint = currentStep.value === 1
      ? `请输入当前${typeLabel.value}`
      : `请输入新${typeLabel.value}`
    uni.showToast({ title: hint, icon: 'none' })
    return
  }

  const isPhone = /^1[3-9]\d{9}$/.test(value)
  const isEmail = /^[\w.-]+@[\w.-]+\.\w+$/.test(value)

  if (!isPhone && !isEmail) {
    uni.showToast({ title: `请输入正确的${typeLabel.value}格式`, icon: 'none' })
    return
  }

  codeSending.value = true
  try {
    if (isPhone) {
      await getPhoneCode(value)
    }
    else {
      await getEmailCode(value)
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
  if (!verifyForm.value.credential.trim()) {
    uni.showToast({ title: `请输入当前${typeLabel.value}`, icon: 'none' })
    return
  }
  if (!verifyForm.value.code.trim()) {
    uni.showToast({ title: '请输入验证码', icon: 'none' })
    return
  }

  verifying.value = true
  try {
    const token = await verifyCode(verifyForm.value.credential.trim(), verifyForm.value.code.trim())
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

async function handleSubmit() {
  const value = updateForm.value.value.trim()
  if (!value) {
    uni.showToast({ title: `请输入新${typeLabel.value}`, icon: 'none' })
    return
  }

  const isPhone = updateType.value === 'phone'
  if (isPhone && !/^1[3-9]\d{9}$/.test(value)) {
    uni.showToast({ title: '手机号格式不正确', icon: 'none' })
    return
  }
  if (!isPhone && !/^[\w.-]+@[\w.-]+\.\w+$/.test(value)) {
    uni.showToast({ title: '邮箱格式不正确', icon: 'none' })
    return
  }

  if (!updateForm.value.code.trim()) {
    uni.showToast({ title: '请输入验证码', icon: 'none' })
    return
  }

  submitting.value = true
  try {
    await updateCredential({
      type: updateType.value,
      value,
      code: updateForm.value.code.trim(),
      stepToken: stepToken.value,
    })
    await userStore.fetchUserInfo()
    uni.showToast({ title: '更新成功', icon: 'success' })
    setTimeout(() => uni.navigateBack(), 1000)
  }
  catch (e: any) {
    uni.showToast({ title: e?.data?.msg || '更新失败', icon: 'none' })
  }
  finally {
    submitting.value = false
  }
}
</script>

<template>
  <view class="update-credential-page">
    <view v-show="safeAreaInsets.top === 0" class="safe-gap" />
    <view :style="{ height: `${safeAreaInsets.top}px` }" />

    <view class="title-bar">
      <text class="title-text">更新手机号/邮箱</text>
    </view>

    <view class="card-wrap">
      <!-- 类型切换（Step 1 可选，Step 2 仅展示） -->
      <view :class="['tab-card', 'card-shadow', { readonly: currentStep === 2 }]">
        <view
          class="tab-item"
          :class="{ active: updateType === 'phone' }"
          @click="switchUpdateType('phone')"
        >
          <text class="tab-text">手机号</text>
        </view>
        <view
          class="tab-item"
          :class="{ active: updateType === 'email' }"
          @click="switchUpdateType('email')"
        >
          <text class="tab-text">邮箱</text>
        </view>
      </view>

      <view class="card card-shadow">
        <text class="step-title">{{ stepTitle }}</text>

        <!-- 步骤1：验证当前手机号/邮箱 -->
        <view v-if="currentStep === 1" class="form-body">
          <CommonInput
            v-model="verifyForm.credential"
            type="text"
            :placeholder="`请输入当前${typeLabel}`"
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
              @click="handleSendCode"
            />
          </view>

          <GradientButton
            :loading="verifying"
            :text="verifying ? '验证中...' : '下一步'"
            @click="handleVerifyCode"
          />
        </view>

        <!-- 步骤2：设置新手机号/邮箱 -->
        <view v-if="currentStep === 2" class="form-body">
          <CommonInput
            v-model="updateForm.value"
            :type="updateType === 'phone' ? 'tel' : 'email'"
            :placeholder="`请输入新${typeLabel}`"
          />

          <view class="code-row">
            <view class="code-input">
              <CommonInput
                v-model="updateForm.code"
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
            :loading="submitting"
            :text="submitting ? '提交中...' : '确认更新'"
            @click="handleSubmit"
          />
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped>
.update-credential-page {
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

.tab-card {
  display: flex;
  height: 48px;
  margin-bottom: 12px;
  border-radius: 16px;
  background: #fff;
}

.tab-card.readonly .tab-item {
  pointer-events: none;
  opacity: 0.6;
}

.tab-item {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  border-bottom: 2px solid transparent;
  transition: all 0.2s;
}

.tab-item.active {
  border-bottom-color: #3b82f6;
}

.tab-text {
  font-size: 15px;
  color: #9ca3af;
}

.tab-item.active .tab-text {
  color: #3b82f6;
  font-weight: 500;
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
