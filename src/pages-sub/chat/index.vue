<script setup lang="ts">
import type { IChatMessage, IChatSession } from '@/api/types/chat'
import { nextTick, ref } from 'vue'
import { getChatSessionList, getChatSessionMessages, sendChatMessage } from '@/api/chat'
import { useUserStore } from '@/store/user'

defineOptions({
  name: 'ChatPage',
})

definePage({
  style: {
    navigationStyle: 'custom',
    navigationBarTitleText: '智慧校园助手',
    disableScroll: true,
  },
})

const sessionId = ref('')
const messages = ref<IChatMessage[]>([])
const inputText = ref('')
const sending = ref(false)
const showHistory = ref(false)
const sessionList = ref<IChatSession[]>([])
const sessionLoading = ref(false)
const scrollIntoView = ref('')
const userStore = useUserStore()
const aiBotAvatar = '/static/icons/ai-bot.svg'

const navBarHeight = ref('88rpx')
const navPaddingTop = ref('44rpx')

// #ifdef MP-WEIXIN
onLoad(() => {
  try {
    const menuRect = wx.getMenuButtonBoundingClientRect()
    const systemInfo = uni.getSystemInfoSync()
    const pxToRpx = 750 / systemInfo.windowWidth
    const statusBarHeightPx = systemInfo.statusBarHeight || 0
    const menuTopPx = menuRect.top
    const menuHeightPx = menuRect.height
    const navHeightPx = (menuTopPx - statusBarHeightPx) * 2 + menuHeightPx + statusBarHeightPx
    navPaddingTop.value = `${Math.ceil(statusBarHeightPx * pxToRpx)}rpx`
    navBarHeight.value = `${Math.ceil(navHeightPx * pxToRpx)}rpx`
  }
  catch {
    navPaddingTop.value = '44rpx'
    navBarHeight.value = '88rpx'
  }
})
// #endif

function formatTime(time?: string) {
  if (!time)
    return '--'
  const date = new Date(time)
  if (Number.isNaN(date.getTime())) {
    return time.replace('T', ' ').slice(0, 16)
  }
  const yyyy = date.getFullYear()
  const MM = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  const HH = String(date.getHours()).padStart(2, '0')
  const mm = String(date.getMinutes()).padStart(2, '0')
  return `${yyyy}-${MM}-${dd} ${HH}:${mm}`
}

function scrollToBottom() {
  nextTick(() => {
    if (messages.value.length > 0) {
      scrollIntoView.value = `msg-${messages.value.length - 1}`
    }
  })
}

async function handleSend() {
  const text = inputText.value.trim()
  if (!text || sending.value)
    return

  messages.value.push({ role: 'user', content: text })
  inputText.value = ''
  scrollToBottom()

  sending.value = true
  try {
    const res = await sendChatMessage({
      sessionId: sessionId.value || undefined,
      message: text,
    })
    sessionId.value = res.sessionId
    messages.value.push({ role: 'assistant', content: res.reply })
    scrollToBottom()
  }
  catch {
    uni.showToast({ title: 'AI 服务暂时不可用', icon: 'none' })
  }
  finally {
    sending.value = false
  }
}

async function loadSessionMessages(sid: string) {
  try {
    const data = await getChatSessionMessages(sid)
    messages.value = data.filter(msg => msg.content.trim() !== '')
    scrollToBottom()
  }
  catch {
    uni.showToast({ title: '消息加载失败', icon: 'none' })
  }
}

async function handleOpenHistory() {
  showHistory.value = true
  sessionLoading.value = true
  try {
    sessionList.value = await getChatSessionList()
  }
  catch {
    uni.showToast({ title: '会话列表加载失败', icon: 'none' })
  }
  finally {
    sessionLoading.value = false
  }
}

function handleSelectSession(session: IChatSession) {
  sessionId.value = session.id
  showHistory.value = false
  void loadSessionMessages(session.id)
}

function handleNewSession() {
  sessionId.value = ''
  messages.value = []
  showHistory.value = false
}

function handleBack() {
  const pages = getCurrentPages()
  if (pages.length > 1) {
    uni.navigateBack()
    return
  }
  uni.switchTab({ url: '/pages/index/index' })
}
</script>

<template>
  <view class="h-screen flex flex-col bg-#f5f7fb">
    <!-- 自定义导航栏 -->
    <view class="flex items-center justify-between bg-white px-24rpx pb-16rpx shadow-sm" :style="{ paddingTop: navPaddingTop, height: navBarHeight }">
      <view class="h-80rpx w-80rpx flex items-center justify-center" @tap="handleBack">
        <view class="i-carbon-arrow-left text-36rpx text-gray-700" />
      </view>
      <text class="text-34rpx text-gray-800 font-bold">智慧校园助手</text>
      <view class="mr-20rpx h-80rpx w-80rpx flex items-center justify-center" @tap="handleOpenHistory">
        <view class="i-carbon-chat text-36rpx text-gray-700" />
      </view>
    </view>

    <!-- 消息列表 -->
    <scroll-view
      scroll-y
      :scroll-into-view="scrollIntoView"
      :scroll-with-animation="true"
      class="flex-1 overflow-hidden px-24rpx pt-24rpx"
    >
      <!-- 空状态 -->
      <view v-if="messages.length === 0 && !sending" class="flex flex-col items-center pt-200rpx">
        <view class="i-carbon-chat-bot mb-24rpx text-80rpx text-blue-400" />
        <text class="text-28rpx text-gray-400">你好，我是小智，CLMS 智能助手</text>
        <text class="mt-8rpx text-24rpx text-gray-300">可以向我咨询讲座相关问题</text>
      </view>

      <!-- 消息列表 -->
      <view
        v-for="(msg, index) in messages"
        :id="`msg-${index}`"
        :key="index"
        class="mb-24rpx"
      >
        <!-- 用户消息 -->
        <view v-if="msg.role === 'user'" class="flex items-start">
          <view class="ml-auto break-all rounded-24rpx rounded-br-8rpx bg-blue-500 px-24rpx py-16rpx text-28rpx text-white">
            {{ msg.content }}
          </view>
          <view class="ml-12rpx mr-32rpx h-56rpx w-56rpx shrink-0 overflow-hidden rounded-9999rpx"><image :src="userStore.userInfo.avatar" class="h-full w-full" mode="aspectFill" /></view>
        </view>

        <!-- AI 消息 -->
        <view v-else class="flex items-start justify-start">
          <view class="mr-12rpx h-56rpx w-56rpx shrink-0 overflow-hidden rounded-9999rpx"><image :src="aiBotAvatar" class="h-full w-full" mode="aspectFit" /></view>
          <view class="max-w-70% break-all rounded-24rpx rounded-bl-8rpx bg-blue-50 px-24rpx py-16rpx text-28rpx text-blue-900 shadow-sm">
            {{ msg.content }}
          </view>
        </view>
      </view>

      <!-- AI 思考中 -->
      <view v-if="sending" class="mb-24rpx flex items-start">
        <view class="mr-12rpx h-56rpx w-56rpx shrink-0 overflow-hidden rounded-9999rpx"><image :src="aiBotAvatar" class="h-full w-full" mode="aspectFit" /></view>
        <view class="rounded-24rpx rounded-bl-8rpx bg-blue-50 px-24rpx py-16rpx text-26rpx text-blue-400 shadow-sm">
          AI 正在思考...
        </view>
      </view>

      <!-- 底部占位，确保最后一条消息不被输入栏遮挡 -->
      <view id="msg-bottom" class="h-24rpx" />
    </scroll-view>

    <!-- 输入栏 -->
    <view class="flex shrink-0 items-center gap-16rpx border-t border-gray-100 bg-white px-24rpx pt-16rpx pb-safe">
      <input
        v-model="inputText"
        class="min-w-0 flex-1 rounded-9999rpx bg-#f3f4f6 px-28rpx py-16rpx text-28rpx"
        placeholder="输入你的问题..."
        :adjust-position="true"
        :disabled="sending"
        @confirm="handleSend"
      >
      <view
        class="shrink-0 flex h-72rpx w-120rpx items-center justify-center rounded-9999rpx bg-blue-500"
        :class="{ 'opacity-50': sending || !inputText.trim() }"
        @tap="handleSend"
      >
        <text class="text-28rpx text-white font-bold">发送</text>
      </view>
    </view>

    <!-- 历史会话弹窗 -->
    <view v-if="showHistory" class="fixed inset-0 z-999">
      <view class="absolute inset-0 bg-black/50" @tap="showHistory = false" />
      <view class="absolute bottom-0 left-0 right-0 max-h-70vh flex flex-col rounded-t-32rpx bg-white">
        <view class="flex items-center justify-between border-b border-gray-100 px-32rpx py-24rpx">
          <text class="text-32rpx text-gray-800 font-bold">历史会话</text>
          <view @tap="handleNewSession">
            <text class="text-28rpx text-blue-500">新会话</text>
          </view>
        </view>

        <scroll-view scroll-y class="flex-1 overflow-hidden">
          <view v-if="sessionLoading" class="py-40rpx text-center text-26rpx text-gray-400">
            加载中...
          </view>
          <view v-else-if="sessionList.length === 0" class="py-40rpx text-center text-26rpx text-gray-400">
            暂无历史会话
          </view>
          <view v-else>
            <view
              v-for="session in sessionList"
              :key="session.id"
              class="flex items-center justify-between border-b border-gray-50 px-32rpx py-24rpx active:bg-gray-50"
              @tap="handleSelectSession(session)"
            >
              <view class="mr-20rpx flex-1 overflow-hidden">
                <text class="block truncate text-28rpx text-gray-800">{{ session.title }}</text>
                <text class="mt-4rpx block text-22rpx text-gray-400">{{ formatTime(session.updateTime) }}</text>
              </view>
              <view class="i-carbon-chevron-right text-28rpx text-gray-300" />
            </view>
          </view>
        </scroll-view>
      </view>
    </view>
  </view>
</template>
