<script lang="ts" setup>
import type { ITeacherLectureItem } from '@/api/types/lecture'
import { computed, ref } from 'vue'
import { deleteLectureById, getTeacherLectureList } from '@/api/lecture'
import { useUserStore } from '@/store/user'

definePage({
  style: {
    navigationStyle: 'custom',
    navigationBarTitleText: '管理讲座',
  },
})

const userStore = useUserStore()
const systemInfo = uni.getSystemInfoSync()
const safeAreaInsets = systemInfo.safeAreaInsets || { top: 0, right: 0, bottom: 0, left: 0 }

const pageNum = ref(1)
const pageSize = 10
const hasMore = ref(true)
const loading = ref(false)
const list = ref<ITeacherLectureItem[]>([])

const statusMap: Record<string, { text: string, type: 'default' | 'warning' | 'success' | 'danger' }> = {
  draft: { text: '草稿', type: 'default' },
  pending: { text: '待审核', type: 'warning' },
  reject: { text: '已驳回', type: 'danger' },
  published: { text: '已发布', type: 'success' },
  finished: { text: '已结束', type: 'default' },
  cancelled: { text: '已取消', type: 'danger' },
}

const emptyText = computed(() => {
  if (loading.value) {
    return '加载中...'
  }
  return '暂无讲座记录'
})

function formatTime(value?: string) {
  if (!value) {
    return '--'
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    const normalized = value.replace('T', ' ')
    return normalized.length >= 16 ? normalized.slice(0, 16) : normalized
  }

  const yyyy = date.getFullYear()
  const MM = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  const HH = String(date.getHours()).padStart(2, '0')
  const mm = String(date.getMinutes()).padStart(2, '0')
  return `${yyyy}-${MM}-${dd} ${HH}:${mm}`
}

function getStatusText(status: string) {
  return statusMap[status]?.text || status || '未知'
}

function getStatusClass(status: string) {
  const type = statusMap[status]?.type || 'default'
  if (type === 'warning') {
    return 'tag-warning'
  }
  if (type === 'success') {
    return 'tag-success'
  }
  if (type === 'danger') {
    return 'tag-danger'
  }
  return 'tag-default'
}

function formatLectureTags(item: ITeacherLectureItem) {
  const tags = item.tags || []
  if (tags.length === 0) {
    return '--'
  }
  return tags.map(tag => tag.name).filter(Boolean).join(' / ')
}

function isBeforeRegistrationStarts(value?: string) {
  if (!value) {
    return false
  }

  const normalized = value.replace(' ', 'T')
  const startTime = new Date(normalized)
  if (Number.isNaN(startTime.getTime())) {
    return false
  }

  return Date.now() < startTime.getTime()
}

async function loadLectures(reset = false) {
  const teacherId = userStore.userInfo?.id
  if (!teacherId) {
    uni.showToast({
      title: '用户信息异常，请重新登录',
      icon: 'none',
    })
    return
  }

  if (loading.value) {
    return
  }

  if (!reset && !hasMore.value) {
    return
  }

  if (reset) {
    pageNum.value = 1
    hasMore.value = true
  }

  loading.value = true
  try {
    const res = await getTeacherLectureList({
      teacherId,
      page: pageNum.value,
      size: pageSize,
      sort: 'createTime',
      order: 'desc',
    })

    const records = res?.records || []
    if (reset) {
      list.value = records
    }
    else {
      list.value = [...list.value, ...records]
    }

    hasMore.value = records.length >= pageSize
    if (records.length > 0) {
      pageNum.value += 1
    }
  }
  catch {
    uni.showToast({
      title: '讲座列表加载失败',
      icon: 'none',
    })
  }
  finally {
    loading.value = false
    uni.stopPullDownRefresh()
  }
}

function handleToDetail(item: ITeacherLectureItem) {
  uni.navigateTo({
    url: `/pages-sub/lecture/detail/index?id=${item.id}&status=${item.status}`,
  })
}

function handleEdit(item: ITeacherLectureItem) {
  if (item.status === 'published' && !isBeforeRegistrationStarts(item.registrationStartsTime)) {
    uni.showToast({
      title: '已通过讲座仅可在报名开始前重新编辑',
      icon: 'none',
    })
    return
  }

  uni.navigateTo({
    url: `/pages-sub/my/apply/index?mode=edit&lectureId=${item.id}`,
    fail: () => {
      uni.showToast({
        title: '编辑页面暂未开放',
        icon: 'none',
      })
    },
  })
}

function handleDelete(item: ITeacherLectureItem) {
  uni.showModal({
    title: '删除讲座',
    content: `确定删除“${item.title}”吗？`,
    success: async (res) => {
      if (!res.confirm) {
        return
      }

      try {
        uni.showLoading({ title: '删除中...' })
        await deleteLectureById(item.id)
        uni.showToast({
          title: '删除成功',
          icon: 'success',
        })
        await loadLectures(true)
      }
      catch {
        uni.showToast({
          title: '删除失败，请重试',
          icon: 'none',
        })
      }
      finally {
        uni.hideLoading()
      }
    },
  })
}

onShow(() => {
  void loadLectures(true)
})

onPullDownRefresh(() => {
  void loadLectures(true)
})

onReachBottom(() => {
  void loadLectures(false)
})
</script>

<template>
  <view class="lecture-manager-page" :style="{ paddingTop: `${safeAreaInsets.top + 12}px` }">
    <view class="header">
      <text class="title">管理讲座</text>
    </view>

    <view v-if="list.length === 0" class="empty-wrap">
      <text class="empty-text">{{ emptyText }}</text>
    </view>

    <view v-else class="list-wrap">
      <view
        v-for="item in list"
        :key="item.id"
        class="lecture-card"
      >
        <view class="card-head">
          <text class="card-title">{{ item.title }}</text>
          <text class="status-tag" :class="getStatusClass(item.status)">{{ getStatusText(item.status) }}</text>
        </view>

        <view class="card-row">
          <text class="label">教室</text>
          <text class="value">{{ item.location || '--' }}</text>
        </view>

        <view class="card-row">
          <text class="label">报名时间</text>
          <text class="value">{{ formatTime(item.registrationStartsTime) }} - {{ formatTime(item.registrationEndsTime) }}</text>
        </view>

        <view class="card-row">
          <text class="label">讲座时间</text>
          <text class="value">{{ formatTime(item.lectureStartTime) }} - {{ formatTime(item.lectureEndTime) }}</text>
        </view>

        <view class="card-row">
          <text class="label">标签</text>
          <text class="value">{{ formatLectureTags(item) }}</text>
        </view>

        <view class="card-row">
          <text class="label">剩余名额</text>
          <text class="value">{{ item.remaining ?? 0 }} 人</text>
        </view>

        <view v-if="item.status === 'reject'" class="card-row">
          <text class="label">驳回原因</text>
          <text class="value value-danger">{{ item.reason || '未填写驳回原因' }}</text>
        </view>

        <view class="card-actions">
          <button class="action-btn action-primary" @click="handleEdit(item)">
            编辑
          </button>
          <button class="action-btn action-secondary" @click="handleToDetail(item)">
            查看
          </button>
          <button class="action-btn action-danger" @click="handleDelete(item)">
            删除
          </button>
        </view>
      </view>

      <view class="load-more">
        <text class="load-text">{{ loading ? '加载中...' : (hasMore ? '上拉加载更多' : '没有更多了') }}</text>
      </view>
    </view>
  </view>
</template>

<style scoped>
.lecture-manager-page {
  min-height: 100vh;
  background: #f5f7fb;
  padding-bottom: 20px;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px 12px;
}

.title {
  color: #111827;
  font-size: 20px;
  font-weight: 600;
}

.create-btn {
  height: 32px;
  line-height: 32px;
  border-radius: 16px;
  background: #10b981;
  color: #fff;
  font-size: 13px;
  padding: 0 14px;
}

.list-wrap {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 0 12px;
}

.lecture-card {
  background: #fff;
  border-radius: 14px;
  padding: 12px;
  box-shadow: 0 2px 8px rgba(17, 24, 39, 0.06);
}

.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.card-title {
  color: #111827;
  font-size: 16px;
  font-weight: 600;
  line-height: 1.4;
  flex: 1;
}

.status-tag {
  border-radius: 10px;
  font-size: 12px;
  padding: 3px 8px;
  white-space: nowrap;
}

.tag-default {
  color: #6b7280;
  background: #f3f4f6;
}

.tag-warning {
  color: #b45309;
  background: #ffedd5;
}

.tag-success {
  color: #047857;
  background: #d1fae5;
}

.tag-danger {
  color: #b91c1c;
  background: #fee2e2;
}

.card-row {
  display: flex;
  align-items: flex-start;
  margin-top: 8px;
}

.label {
  min-width: 64px;
  color: #6b7280;
  font-size: 13px;
}

.value {
  color: #111827;
  font-size: 13px;
  line-height: 1.5;
  word-break: break-all;
}

.value-danger {
  color: #b91c1c;
}

.card-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 12px;
}

.action-btn {
  height: 30px;
  line-height: 30px;
  border-radius: 15px;
  font-size: 12px;
  padding: 0 12px;
}

.action-secondary {
  color: #1d4ed8;
  background: #eff6ff;
}

.action-primary {
  color: #0f766e;
  background: #ecfeff;
}

.action-danger {
  color: #b91c1c;
  background: #fee2e2;
}

.empty-wrap {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 50vh;
}

.empty-text {
  color: #9ca3af;
  font-size: 14px;
}

.load-more {
  display: flex;
  justify-content: center;
  padding: 6px 0 8px;
}

.load-text {
  color: #9ca3af;
  font-size: 12px;
}
</style>
