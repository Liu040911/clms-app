<script lang="ts" setup>
import { useTokenStore } from '@/store/token'

definePage({
  style: {
    navigationStyle: 'custom',
    navigationBarTitleText: '我的账户',
  },
})

const tokenStore = useTokenStore()
const systemInfo = uni.getSystemInfoSync()
const safeAreaInsets = systemInfo.safeAreaInsets || { top: 0, right: 0, bottom: 0, left: 0 }
const logoutPending = ref(false)

function handleToMyInfo() {
  uni.showToast({
    title: '功能暂未开放',
    icon: 'none',
  })
}

function handleToUpdateEmailPhone() {
  uni.showToast({
    title: '功能暂未开放',
    icon: 'none',
  })
}

function handleResetPassword() {
  uni.showToast({
    title: '功能暂未开放',
    icon: 'none',
  })
}

function handleToSwitchAccount() {
  uni.showModal({
    title: '切换账号',
    content: '确定要切换账号吗？',
    success: (res) => {
      if (res.confirm) {
        uni.navigateTo({
          url: '/pages-sub/auth/login/index',
        })
      }
    },
  })
}

async function goToLogin() {
  if (logoutPending.value) {
    return
  }

  logoutPending.value = true
  uni.showLoading({ title: '退出中...' })
  try {
    await tokenStore.logout()
    uni.showToast({
      title: '已退出登录',
      icon: 'success',
    })
    uni.reLaunch({
      url: '/pages-sub/auth/login/index',
      fail() {
        uni.navigateTo({
          url: '/pages-sub/auth/login/index',
        })
      },
    })
  }
  catch {
    uni.showToast({
      title: '退出失败，请重试',
      icon: 'none',
    })
  }
  finally {
    uni.hideLoading()
    logoutPending.value = false
  }
}

function showLogoutPopup() {
  if (logoutPending.value) {
    return
  }

  uni.showModal({
    title: '退出登录',
    content: '确定退出登录？',
    success: (res) => {
      if (res.confirm) {
        void goToLogin()
      }
    },
  })
}

function handleDeleteAccountClick() {
  uni.showToast({
    title: '功能暂未开放',
    icon: 'none',
  })
}
</script>

<template>
  <view class="account-page">
    <view v-show="safeAreaInsets.top === 0" class="safe-gap" />
    <view :style="{ height: `${safeAreaInsets.top}px` }" />

    <view class="title-bar">
      <text class="title-text">我的账户</text>
    </view>

    <view class="card-wrap">
      <view class="card card-shadow">
        <view class="row" @click="handleToMyInfo">
          <text class="row-text">我的信息</text>
          <view class="arrow i-codicon:chevron-right" />
        </view>

        <view class="row" @click="handleToUpdateEmailPhone">
          <text class="row-text">更新手机号/邮箱</text>
          <view class="arrow i-codicon:chevron-right" />
        </view>

        <view class="row no-border" @click="handleResetPassword">
          <text class="row-text">重置密码</text>
          <view class="arrow i-codicon:chevron-right" />
        </view>
      </view>
    </view>

    <view class="bottom-actions">
      <view class="action-btn card-shadow" @click="handleToSwitchAccount">
        <text class="action-text">切换账号</text>
      </view>
      <view class="action-btn card-shadow" @click="showLogoutPopup">
        <text class="action-text">退出登录</text>
      </view>
      <view class="action-btn card-shadow" @click="handleDeleteAccountClick">
        <text class="action-text action-text-danger">删除账号</text>
      </view>
    </view>
  </view>
</template>

<style scoped>
.account-page {
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
}

.row {
  height: 52px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #f0f0f0;
}

.no-border {
  border-bottom: none;
}

.row-text {
  font-size: 16px;
  color: #111827;
}

.arrow {
  font-size: 16px;
  color: #9ca3af;
}

.bottom-actions {
  position: fixed;
  left: 20px;
  right: 20px;
  bottom: 33px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.action-btn {
  height: 52px;
  border-radius: 16px;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
}

.action-text {
  font-size: 16px;
  color: #111827;
}

.action-text-danger {
  color: #ef4444;
}

.card-shadow {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}
</style>
