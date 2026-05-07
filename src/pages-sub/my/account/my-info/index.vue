<script lang="ts" setup>
import { onMounted, reactive, ref } from 'vue'
import { updateInfo } from '@/api/auth'
import { useUserStore } from '@/store/user'
import CommonInput from '@/components/CommonInput/index.vue'
import GradientButton from '@/components/GradientButton/index.vue'

definePage({
  style: {
    navigationStyle: 'custom',
    navigationBarTitleText: '我的信息',
  },
})

const userStore = useUserStore()
const systemInfo = uni.getSystemInfoSync()
const safeAreaInsets = systemInfo.safeAreaInsets || { top: 0, right: 0, bottom: 0, left: 0 }

const form = reactive({
  nickname: '',
  gender: '0',
  phone: '',
  email: '',
})

const loading = ref(false)

onMounted(() => {
  const info = userStore.userInfo
  form.nickname = info.nickname || ''
  form.gender = info.gender || '0'
  form.phone = info.phone || ''
  form.email = info.email || ''
})

function handleGenderSelect(gender: string) {
  form.gender = gender
}

async function handleSave() {
  if (!form.nickname.trim()) {
    uni.showToast({ title: '请输入昵称', icon: 'none' })
    return
  }

  loading.value = true
  try {
    await updateInfo({ nickname: form.nickname, gender: form.gender })
    await userStore.fetchUserInfo()
    const info = userStore.userInfo
    form.nickname = info.nickname || ''
    form.gender = info.gender || '0'
    form.phone = info.phone || ''
    form.email = info.email || ''
    uni.showToast({ title: '保存成功', icon: 'success' })
    setTimeout(() => uni.navigateBack(), 1000)
  }
  catch (e: any) {
    uni.showToast({ title: e?.data?.msg || '保存失败', icon: 'none' })
  }
  finally {
    loading.value = false
  }
}

function goUpdatePhone() {
  uni.navigateTo({ url: '/pages-sub/my/account/update-credential/index?type=phone' })
}

function goUpdateEmail() {
  uni.navigateTo({ url: '/pages-sub/my/account/update-credential/index?type=email' })
}

function goBindEmail() {
  uni.navigateTo({ url: '/pages-sub/my/account/bind-email/index' })
}
</script>

<template>
  <view class="my-info-page">
    <view v-show="safeAreaInsets.top === 0" class="safe-gap" />
    <view :style="{ height: `${safeAreaInsets.top}px` }" />

    <view class="title-bar">
      <text class="title-text">我的信息</text>
    </view>

    <view class="card-wrap">
      <view class="card card-shadow">
        <view class="form-item">
          <text class="label">昵称</text>
          <view class="input-wrap">
            <CommonInput
              v-model="form.nickname"
              type="text"
              placeholder="请输入昵称"
              :show-margin="false"
            />
          </view>
        </view>

        <view class="form-item">
          <text class="label">性别</text>
          <view class="gender-wrap">
            <view
              class="gender-btn"
              :class="{ active: form.gender === '1' }"
              @click="handleGenderSelect('1')"
            >
              <text class="gender-text">男</text>
            </view>
            <view
              class="gender-btn"
              :class="{ active: form.gender === '2' }"
              @click="handleGenderSelect('2')"
            >
              <text class="gender-text">女</text>
            </view>
          </view>
        </view>

        <view class="form-item no-border">
          <text class="label">手机号</text>
          <view class="contact-row">
            <text class="contact-value">{{ form.phone || '未绑定' }}</text>
            <text class="contact-link" @click="goUpdatePhone">去修改</text>
          </view>
        </view>
      </view>

      <view class="card card-shadow email-card">
        <view class="form-item no-border">
          <text class="label">邮箱</text>
          <view class="contact-row">
            <text class="contact-value">{{ form.email || '未绑定' }}</text>
            <text
              v-if="form.email"
              class="contact-link"
              @click="goUpdateEmail"
            >去修改</text>
            <text
              v-else
              class="contact-link"
              @click="goBindEmail"
            >去绑定</text>
          </view>
        </view>
      </view>

      <view class="save-btn-wrap">
        <GradientButton
          text="保存"
          :loading="loading"
          @click="handleSave"
        />
      </view>
    </view>
  </view>
</template>

<style scoped>
.my-info-page {
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
  padding: 0 20px;
  margin-bottom: 12px;
}

.card-shadow {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.form-item {
  display: flex;
  align-items: center;
  min-height: 52px;
  border-bottom: 1px solid #f0f0f0;
  padding: 8px 0;
}

.no-border {
  border-bottom: none;
}

.label {
  font-size: 15px;
  color: #6b7280;
  width: 60px;
  flex-shrink: 0;
}

.input-wrap {
  flex: 1;
}

.gender-wrap {
  display: flex;
  gap: 12px;
}

.gender-btn {
  width: 64px;
  height: 36px;
  border-radius: 18px;
  border: 2px solid #d1d5db;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  transition: all 0.2s;
}

.gender-btn.active {
  border-color: #3b82f6;
  background: #eff6ff;
}

.gender-text {
  font-size: 14px;
  color: #6b7280;
}

.gender-btn.active .gender-text {
  color: #3b82f6;
  font-weight: 500;
}

.contact-row {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.contact-value {
  font-size: 15px;
  color: #111827;
}

.contact-link {
  font-size: 14px;
  color: #3b82f6;
  font-weight: 500;
}

.email-card {
  margin-top: 0;
}

.save-btn-wrap {
  margin-top: 28px;
}
</style>
