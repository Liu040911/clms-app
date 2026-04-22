<script lang="ts" setup>
import type { HotLectureListItem, LectureTagListItem } from '@/api/types/lecture'
import { checkInLectureByQrCode, getLectureTagList, getRecentHotLectureList } from '@/api/lecture'
import { usePageScrollableHeight } from '@/hooks/usePageScrollableHeight'

defineOptions({
  name: 'Home',
})
definePage({
  // 使用 type: "home" 属性设置首页，其他页面不需要设置，默认为page
  type: 'home',
  style: {
    // 'custom' 表示开启自定义导航栏，默认 'default'
    navigationStyle: 'custom',
    navigationBarTitleText: '首页',
  },
})

const iconKeyMap: Record<string, string> = {
  'teacher-talk': '🎤',
  'academic-salon': '💡',
  'college-special': '🏫',
  'research-share': '🧪',
  'career-guide': '💼',
  'signup-checkin': '📝',
  'postgraduate-plan': '📚',
  'career-navigation': '🧭',
  'competition-exp': '🏅',
  'more-lecture': '✨',
}

const categoryList = ref<LectureTagListItem[]>([])
const categoryLoading = ref(false)

const HOT_TAB_ALL = '近期热门'
const activeTab = ref(HOT_TAB_ALL)
const hotTabs = computed(() => {
  return [HOT_TAB_ALL, ...categoryList.value.map(item => item.name)]
})
const searchRightOffset = ref('0rpx')
const searchBarHeight = ref('72rpx')
const searchTopOffset = ref('20rpx')
const headerPaddingTop = ref('44rpx')
const { pageScrollableHeight, updatePageScrollableHeight } = usePageScrollableHeight({
  customTabbarHeightPx: 50,
})

const bannerList = [
  {
    title: '校园讲座上新，一键预约入场',
    subtitle: '讲座时间、地点与名额一目了然',
    tip: '讲座速递',
    bgColor: '#d8efb5',
  },
  {
    title: '职业发展专场持续开放报名',
    subtitle: '实习、求职、面试经验集中分享',
    tip: '就业专题',
    bgColor: '#cfe8ff',
  },
  {
    title: '科研与竞赛分享会本周开启',
    subtitle: '高频讲座支持快速收藏与提醒',
    tip: '本周精选',
    bgColor: '#e7dcff',
  },
]

const recommendList = ref<HotLectureListItem[]>([])
const recommendLoading = ref(false)

onLoad(() => {
  // #ifdef MP-WEIXIN
  try {
    const menuRect = wx.getMenuButtonBoundingClientRect()
    const systemInfo = uni.getSystemInfoSync()
    const pxToRpx = 750 / systemInfo.windowWidth
    const menuLeftRpx = menuRect.left * pxToRpx
    const contentRightRpx = 750 - 24
    const capsuleGapRpx = Math.ceil(5 * pxToRpx)
    const rightGapRpx = Math.max(0, Math.ceil(contentRightRpx - menuLeftRpx + capsuleGapRpx))
    const menuHeightRpx = Math.ceil(menuRect.height * pxToRpx)
    const statusBarHeightPx = systemInfo.statusBarHeight || 0
    const topOffsetRpx = Math.max(0, Math.ceil((menuRect.top - statusBarHeightPx) * pxToRpx))
    const statusBarHeightRpx = Math.ceil(statusBarHeightPx * pxToRpx)
    searchRightOffset.value = `${rightGapRpx}rpx`
    searchBarHeight.value = `${menuHeightRpx}rpx`
    searchTopOffset.value = `${topOffsetRpx}rpx`
    headerPaddingTop.value = `${statusBarHeightRpx}rpx`
  }
  catch {
    searchRightOffset.value = '180rpx'
    searchBarHeight.value = '72rpx'
    searchTopOffset.value = '20rpx'
    headerPaddingTop.value = '44rpx'
  }
  // #endif

  updatePageScrollableHeight()
  void fetchLectureTagList()

  console.log('首页加载完成')
})

function handleGoToLogin() {
  uni.navigateTo({
    url: '/pages-sub/auth/login/index',
  })
}

function handleSearch() {
  uni.showToast({ title: '搜索功能开发中', icon: 'none' })
}

function extractQrToken(scanText?: string) {
  if (!scanText) {
    return ''
  }

  const trimmed = scanText.trim()
  if (!trimmed) {
    return ''
  }

  try {
    if (/^https?:\/\//i.test(trimmed)) {
      const url = new URL(trimmed)
      return url.searchParams.get('qrToken') || url.searchParams.get('token') || ''
    }
  }
  catch {
    // 非 URL 内容按纯 token 处理。
  }

  return trimmed
}

async function handleScanLectureCheckIn() {
  try {
    const scanResult = await new Promise<UniApp.ScanCodeSuccessRes>((resolve, reject) => {
      uni.scanCode({
        onlyFromCamera: false,
        scanType: ['qrCode'],
        success: resolve,
        fail: reject,
      })
    })

    const qrToken = extractQrToken(scanResult.result)
    if (!qrToken) {
      uni.showToast({
        title: '未识别到有效签到码',
        icon: 'none',
      })
      return
    }

    await checkInLectureByQrCode(qrToken)
    uni.showToast({
      title: '签到成功',
      icon: 'success',
    })
  }
  catch (error: any) {
    const errMsg = error?.msg || error?.errMsg || ''
    // 用户主动取消扫码时不打扰。
    if (typeof errMsg === 'string' && errMsg.toLowerCase().includes('cancel')) {
      return
    }

    uni.showToast({
      title: error?.msg || '签到失败，请稍后重试',
      icon: 'none',
    })
  }
}

function handleCategoryClick(name: string) {
  uni.showToast({ title: `${name}开发中`, icon: 'none' })
}

function isImageUrl(value?: string) {
  if (!value)
    return false
  return /^https?:\/\//i.test(value) || value.startsWith('/')
}

function getCategoryIconEmoji(icon?: string) {
  if (!icon)
    return '✨'
  return iconKeyMap[icon] || icon
}

async function fetchLectureTagList() {
  categoryLoading.value = true
  try {
    const list = await getLectureTagList()
    categoryList.value = list || []

    if (!hotTabs.value.includes(activeTab.value)) {
      activeTab.value = HOT_TAB_ALL
    }

    void fetchRecentHotLectureList()
  }
  catch {
    // 标签加载失败时保底展示空态，不中断首页其它模块。
    categoryList.value = []
    activeTab.value = HOT_TAB_ALL
    void fetchRecentHotLectureList()
  }
  finally {
    categoryLoading.value = false
  }
}

function handleTabClick(tab: string) {
  if (activeTab.value === tab) {
    return
  }

  activeTab.value = tab
  void fetchRecentHotLectureList()
}

function resolveTagIdByTab(tab: string) {
  if (tab === HOT_TAB_ALL) {
    return undefined
  }

  return categoryList.value.find(item => item.name === tab)?.id
}

async function fetchRecentHotLectureList() {
  recommendLoading.value = true
  try {
    const list = await getRecentHotLectureList({
      tagId: resolveTagIdByTab(activeTab.value),
      limit: 6,
    })
    recommendList.value = list || []
  }
  catch {
    recommendList.value = []
    uni.showToast({
      title: '热门讲座加载失败',
      icon: 'none',
    })
  }
  finally {
    recommendLoading.value = false
  }
}

function handleRecommendClick(id: string) {
  uni.navigateTo({
    url: `/pages-sub/lecture/detail/index?id=${id}`,
  })
}
</script>

<template>
  <view class="overflow-hidden bg-gray-100" :style="{ height: pageScrollableHeight }">
    <scroll-view class="h-full" scroll-y>
      <view class="bg-linear-to-br from-blue-500 to-purple-600 px-24rpx pb-24rpx" :style="{ paddingTop: headerPaddingTop }">
        <view class="flex items-center" :style="{ marginTop: searchTopOffset }">
          <view class="scan-icon-trigger" :style="{ height: searchBarHeight, width: searchBarHeight }" @tap="handleScanLectureCheckIn">
            <image class="scan-icon-image" src="/static/icons/scan-code.svg" mode="aspectFit" />
          </view>
          <view
            class="flex flex-1 items-center rounded-9999rpx bg-white/90 px-24rpx"
            :style="{ marginRight: searchRightOffset, height: searchBarHeight }"
          >
            <text class="mr-12rpx text-28rpx text-gray-400">
              🔍
            </text>
            <text class="flex-1 text-26rpx text-gray-400" @tap="handleSearch">
              搜索讲座名称/主讲人/学院
            </text>
          </view>
        </view>
      </view>

      <view class="px-24rpx pb-24rpx">
        <swiper
          class="mt-20rpx h-160rpx overflow-hidden rounded-24rpx"
          :autoplay="true"
          :circular="true"
          :interval="3000"
          :duration="500"
          :indicator-dots="true"
          indicator-color="rgba(255,255,255,0.6)"
          indicator-active-color="#3b82f6"
        >
          <swiper-item v-for="item in bannerList" :key="item.title">
            <view class="h-full px-24rpx py-20rpx" :style="{ backgroundColor: item.bgColor }">
              <view class="mb-10rpx text-22rpx text-green-700 font-bold">
                {{ item.tip }}
              </view>
              <view class="text-36rpx text-gray-800 font-bold">
                {{ item.title }}
              </view>
              <view class="mt-10rpx text-24rpx text-gray-500">
                {{ item.subtitle }}
              </view>
            </view>
          </swiper-item>
        </swiper>

        <view class="mt-20rpx rounded-24rpx bg-white p-24rpx shadow-sm">
          <view class="mb-20rpx text-center text-24rpx text-gray-500">
            校园讲座专题，一键预约快速报名
          </view>

          <view v-if="categoryLoading" class="py-24rpx text-center text-24rpx text-gray-400">
            分类加载中...
          </view>

          <view v-else-if="categoryList.length === 0" class="py-24rpx text-center text-24rpx text-gray-400">
            暂无分类数据
          </view>

          <view v-else class="grid grid-cols-5 gap-y-24rpx">
            <view
              v-for="item in categoryList"
              :key="item.id"
              class="flex flex-col items-center"
              @tap="handleCategoryClick(item.name)"
            >
              <view class="mb-8rpx h-72rpx w-72rpx flex items-center justify-center rounded-9999rpx bg-blue-50 text-34rpx">
                <image
                  v-if="isImageUrl(item.icon)"
                  :src="item.icon"
                  mode="aspectFit"
                  class="h-38rpx w-38rpx"
                />
                <text v-else>{{ getCategoryIconEmoji(item.icon) }}</text>
              </view>
              <text class="text-20rpx text-gray-600">
                {{ item.name }}
              </text>
            </view>
          </view>
        </view>

        <view class="mt-20rpx rounded-24rpx bg-white p-24rpx shadow-sm">
          <view class="mb-18rpx text-center text-34rpx text-gray-800 font-bold">
            热门讲座推荐
          </view>

          <view class="hot-tabs-grid">
            <view
              v-for="tab in hotTabs"
              :key="tab"
              class="hot-tabs-item"
              :class="activeTab === tab ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600'"
              @tap="handleTabClick(tab)"
            >
              {{ tab }}
            </view>
          </view>

          <view v-if="recommendLoading" class="py-32rpx text-center text-24rpx text-gray-400">
            讲座数据加载中...
          </view>

          <view v-else-if="recommendList.length === 0" class="py-32rpx text-center text-24rpx text-gray-400">
            暂无近期热门讲座
          </view>

          <view v-else class="grid grid-cols-3 gap-14rpx">
            <view
              v-for="item in recommendList"
              :key="item.id"
              class="overflow-hidden rounded-16rpx bg-gray-50"
              @tap="handleRecommendClick(item.id)"
            >
              <image :src="item.posterUrl" mode="aspectFill" class="h-128rpx w-full" />
              <view class="px-10rpx py-10rpx text-center text-22rpx text-gray-700">
                {{ item.title }}
              </view>
            </view>
          </view>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<style scoped>
.hot-tabs-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 12rpx;
  margin-bottom: 20rpx;
}

.hot-tabs-item {
  min-height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 9999rpx;
  padding: 8rpx 10rpx;
  text-align: center;
  font-size: 20rpx;
  line-height: 1.2;
}

.scan-icon-trigger {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 12rpx;
  border-radius: 9999rpx;
  background: rgba(255, 255, 255, 0.92);
}

.scan-icon-image {
  width: 34rpx;
  height: 34rpx;
}
</style>
