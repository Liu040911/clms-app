<script setup lang="ts">
import type { ILectureInfo } from '@/api/types/lecture'
import { computed, nextTick, ref, watch } from 'vue'
import { getLectureInfoById, registerLecture } from '@/api/lecture'
import GradientButton from '@/components/GradientButton/index.vue'
import PageSafeArea from '@/components/PageSafeArea/index.vue'

defineOptions({
  name: 'LectureDetail',
})

definePage({
  style: {
    navigationStyle: 'custom',
    navigationBarTitleText: '讲座详情',
    // 禁用页面原生滚动，只保留内部 scroll-view 控制
    disableScroll: true,
  },
})

const currentLectureId = ref('')
const lecture = ref<ILectureInfo | null>(null)
const detailLoading = ref(false)
const registerLoading = ref(false)
const scrollEnabled = ref(false)
const lectureStatus = ref('published')

const introParagraphs = computed(() => {
  return (lecture.value?.description || '').split('\n').filter(Boolean)
})

const remainingSeats = computed(() => {
  return Math.max(lecture.value?.remaining || 0, 0)
})

const currentStatus = computed(() => lecture.value?.status || lectureStatus.value)

const lectureTags = computed(() => {
  return lecture.value?.tags || []
})

const statusTextMap: Record<string, string> = {
  draft: '草稿',
  pending: '待审核',
  published: '已发布',
  finished: '已结束',
  cancelled: '已取消',
}

const statusText = computed(() => statusTextMap[currentStatus.value] || currentStatus.value || '未知状态')

const registerButtonText = computed(() => {
  if (registerLoading.value) {
    return '报名中...'
  }
  if (currentStatus.value === 'draft') {
    return '草稿中'
  }
  if (currentStatus.value === 'pending') {
    return '待审核'
  }
  if (currentStatus.value === 'cancelled') {
    return '已取消'
  }
  if (currentStatus.value === 'finished') {
    return '已结束'
  }
  if (remainingSeats.value <= 0) {
    return '名额已满'
  }
  return '立即报名'
})

const registerDisabled = computed(() => {
  if (registerLoading.value || detailLoading.value) {
    return true
  }
  if (currentStatus.value !== 'published') {
    return true
  }
  return remainingSeats.value <= 0
})

function formatTime(time?: string) {
  if (!time) {
    return '--'
  }

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

async function fetchLectureDetailById(lectureId: string) {
  detailLoading.value = true
  try {
    const data = await getLectureInfoById(lectureId)
    lecture.value = data
    if (data?.status) {
      lectureStatus.value = data.status
    }
  }
  catch {
    uni.showToast({
      title: '讲座详情加载失败',
      icon: 'none',
    })
    lecture.value = null
  }
  finally {
    detailLoading.value = false
  }
}

function updateScrollEnabled() {
  nextTick(() => {
    const query = uni.createSelectorQuery()
    query.select('#lecture-scroll').boundingClientRect()
    query.select('#lecture-content').boundingClientRect()
    query.exec((res) => {
      const scrollRect = res?.[0] as UniApp.NodeInfo | undefined
      const contentRect = res?.[1] as UniApp.NodeInfo | undefined
      if (!scrollRect?.height || !contentRect?.height) {
        scrollEnabled.value = false
        return
      }
      // 加一个微小阈值，避免边界浮点误差导致“看起来可滑动”
      scrollEnabled.value = (contentRect.height - scrollRect.height) > 2
    })
  })
}

onLoad((options) => {
  const lectureId = typeof options?.id === 'string' ? options.id : ''
  currentLectureId.value = lectureId
  const status = typeof options?.status === 'string' ? options.status : ''
  if (status) {
    lectureStatus.value = status
  }
})

onShow(() => {
  void fetchLectureDetailById(currentLectureId.value)
})

onReady(() => {
  updateScrollEnabled()
})

onResize(() => {
  updateScrollEnabled()
})

watch([lecture, detailLoading], () => {
  updateScrollEnabled()
})

function handleBack() {
  const pages = getCurrentPages()
  if (pages.length > 1) {
    uni.navigateBack()
    return
  }

  uni.switchTab({
    url: '/pages/index/index',
  })
}

async function handleRegister() {
  if (registerLoading.value) {
    return
  }

  if (currentStatus.value !== 'published') {
    uni.showToast({
      title: `当前状态：${registerButtonText.value}`,
      icon: 'none',
    })
    return
  }

  if (!lecture.value) {
    uni.showToast({
      title: '讲座信息尚未加载完成',
      icon: 'none',
    })
    return
  }

  if (remainingSeats.value <= 0) {
    uni.showToast({
      title: '当前讲座名额已满',
      icon: 'none',
    })
    return
  }

  const lectureId = lecture.value?.id || currentLectureId.value
  if (!lectureId) {
    uni.showToast({
      title: '缺少讲座ID，无法报名',
      icon: 'none',
    })
    return
  }

  const confirmRes = await uni.showModal({
    title: '确认报名',
    content: '确认报名该讲座吗？',
    confirmText: '确认报名',
    cancelText: '再想想',
  })
  if (!confirmRes.confirm) {
    return
  }

  registerLoading.value = true
  try {
    await registerLecture({ lectureId })
    uni.showToast({
      title: '报名成功，请准时参加',
      icon: 'success',
    })
    await fetchLectureDetailById(lectureId)
  }
  catch (err: any) {
    const backendMsg = err?.data?.msg
    uni.showToast({
      title: backendMsg || '报名失败，请稍后重试',
      icon: 'none',
    })
  }
  finally {
    registerLoading.value = false
  }
}
</script>

<template>
  <PageSafeArea custom-class="bg-#f5f7fb px-24rpx" :extra-top-rpx="24" :extra-bottom-rpx="24">
    <scroll-view
      id="lecture-scroll"
      class="h-full"
      :scroll-y="scrollEnabled"
      :show-scrollbar="false"
      :lower-threshold="0"
      :upper-threshold="0"
      :refresher-enabled="false"
      :enable-back-to-top="scrollEnabled"
      :bounces="scrollEnabled"
    >
      <view id="lecture-content" class="mb-20rpx rounded-24rpx bg-white p-24rpx shadow-sm">
        <view v-if="detailLoading" class="py-80rpx text-center text-26rpx text-gray-400">
          讲座详情加载中...
        </view>

        <view v-else-if="!lecture" class="py-80rpx text-center text-26rpx text-gray-400">
          暂无讲座详情数据
        </view>

        <template v-else>
          <view class="mb-24rpx flex items-center justify-between">
            <text class="text-38rpx text-#1f2937 font-bold">
              讲座详情
            </text>
            <text class="rounded-9999rpx bg-#e8f7ef px-20rpx py-6rpx text-22rpx text-#0d8a5f">
              {{ statusText }}
            </text>
          </view>

          <view class="mb-24rpx overflow-hidden rounded-20rpx bg-#e5e7eb">
            <image :src="lecture.coverImageUrl" mode="aspectFill" class="h-360rpx w-full" @load="updateScrollEnabled" />
          </view>

          <view class="mb-16rpx text-34rpx text-#111827 font-bold leading-tight">
            {{ lecture.title }}
          </view>

          <view class="mb-20rpx text-24rpx text-#6b7280">
            主讲人：{{ lecture.teacherName || lecture.teacherId || '--' }}
          </view>

          <view v-if="lectureTags.length" class="mb-20rpx flex flex-wrap gap-12rpx">
            <text
              v-for="tag in lectureTags"
              :key="tag.id"
              class="rounded-9999rpx bg-#ecfeff px-16rpx py-8rpx text-22rpx text-#0f766e"
            >
              #{{ tag.name }}
            </text>
          </view>

          <view class="mb-20rpx rounded-16rpx bg-#f3f4f6 p-20rpx">
            <view class="mb-14rpx text-26rpx text-#111827 font-bold">
              讲座内容
            </view>
            <view v-for="(paragraph, index) in introParagraphs" :key="index" class="mb-10rpx text-24rpx text-#4b5563 leading-relaxed last:mb-0">
              {{ paragraph }}
            </view>
          </view>

          <view class="mb-20rpx border border-#e5e7eb rounded-16rpx p-20rpx">
            <view class="mb-14rpx text-26rpx text-#111827 font-bold">
              时间与地点
            </view>
            <view class="mb-8rpx text-24rpx text-#374151">
              报名时间：{{ formatTime(lecture.registrationStartsTime) }} - {{ formatTime(lecture.registrationEndsTime) }}
            </view>
            <view class="mb-8rpx text-24rpx text-#374151">
              讲座时间：{{ formatTime(lecture.lectureStartTime) }} - {{ formatTime(lecture.lectureEndTime) }}
            </view>
            <view class="text-24rpx text-#374151">
              地址：{{ lecture.location || '--' }}
            </view>
          </view>

          <view class="mb-28rpx rounded-16rpx bg-#eff6ff p-20rpx">
            <view class="mb-8rpx text-24rpx text-#1d4ed8">
              剩余可报名人数：{{ lecture.remaining ?? 0 }} 人
            </view>
          </view>

          <view class="flex gap-16rpx">
            <view class="w-220rpx shrink-0">
              <GradientButton
                text="返回"
                gradient-color="green"
                @click="handleBack"
              />
            </view>
            <view class="flex-1">
              <GradientButton
                :text="registerButtonText"
                :disabled="registerDisabled"
                @click="handleRegister"
              />
            </view>
          </view>
        </template>
      </view>
    </scroll-view>
  </PageSafeArea>
</template>
