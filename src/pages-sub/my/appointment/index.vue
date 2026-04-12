<script lang="ts" setup>
import type { IUserLectureAppointmentItem } from '@/api/types/lecture'
import { computed, ref } from 'vue'
import { cancelLectureRegistration, getUserLectureAppointmentList, registerLecture } from '@/api/lecture'

definePage({
  style: {
    navigationStyle: 'custom',
    navigationBarTitleText: '我的预约',
  },
})

const systemInfo = uni.getSystemInfoSync()
const safeTop = systemInfo.safeAreaInsets?.top ?? systemInfo.statusBarHeight ?? 0

const tabs = [
  { label: '全部', value: '' },
  { label: '已预约', value: 'pending' },
  { label: '已签到', value: 'checked_in' },
  { label: '未签到', value: 'not_signed_in' },
  { label: '已取消', value: 'cancelled' },
]

const activeStatus = ref('')
const pageNum = ref(1)
const pageSize = 10
const hasMore = ref(true)
const loading = ref(false)
const actionLoadingId = ref('')
const list = ref<IUserLectureAppointmentItem[]>([])

const registrationStatusMap: Record<string, string> = {
  pending: '已预约',
  cancelled: '已取消',
  checked_in: '已签到',
  not_signed_in: '未签到',
}

const lectureStatusMap: Record<string, string> = {
  draft: '草稿',
  pending: '待审核',
  published: '已发布',
  finished: '已结束',
  cancelled: '已取消',
  deleted: '已删除',
}

const emptyText = computed(() => {
  if (loading.value) {
    return '加载中...'
  }
  return '暂无预约记录'
})

const showEmpty = computed(() => !loading.value && list.value.length === 0)

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

function getRegistrationStatusText(status?: string) {
  if (!status) {
    return '未知状态'
  }
  return registrationStatusMap[status] || status
}

function getLectureStatusText(status?: string) {
  if (!status) {
    return '未知状态'
  }
  return lectureStatusMap[status] || status
}

function getRegistrationStatusClass(status?: string) {
  if (status === 'checked_in') {
    return 'tag-success'
  }
  if (status === 'cancelled') {
    return 'tag-danger'
  }
  if (status === 'not_signed_in') {
    return 'tag-warning'
  }
  return 'tag-primary'
}

function getLectureStatusClass(status?: string) {
  if (status === 'published') {
    return 'tag-success'
  }
  if (status === 'pending') {
    return 'tag-warning'
  }
  if (status === 'cancelled' || status === 'deleted') {
    return 'tag-danger'
  }
  return 'tag-default'
}

function getErrorMessage(err: any) {
  return err?.msg
    || err?.responseData?.msg
    || err?.responseData?.message
    || err?.data?.msg
    || err?.data?.message
    || err?.message
    || '操作失败，请稍后重试'
}

function canCancel(item: IUserLectureAppointmentItem) {
  return item.registrationStatus !== 'cancelled'
}

function canReRegister(item: IUserLectureAppointmentItem) {
  return item.registrationStatus === 'cancelled' && item.lectureStatus === 'published'
}

async function loadAppointments(reset = false) {
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
    const res = await getUserLectureAppointmentList({
      status: activeStatus.value || undefined,
      page: pageNum.value,
      size: pageSize,
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
      title: '预约列表加载失败',
      icon: 'none',
    })
  }
  finally {
    loading.value = false
    uni.stopPullDownRefresh()
  }
}

function handleSwitchTab(status: string) {
  if (activeStatus.value === status) {
    return
  }

  activeStatus.value = status
  void loadAppointments(true)
}

function handleToLectureDetail(item: IUserLectureAppointmentItem) {
  if (!item.lectureId || item.lectureStatus === 'deleted') {
    uni.showToast({
      title: '该讲座已不可查看',
      icon: 'none',
    })
    return
  }

  uni.navigateTo({
    url: `/pages-sub/lecture/detail/index?id=${item.lectureId}&status=${item.lectureStatus || ''}`,
  })
}

function handleCancel(item: IUserLectureAppointmentItem) {
  if (!canCancel(item) || !item.lectureId) {
    return
  }

  uni.showModal({
    title: '取消预约',
    content: `确认取消“${item.title || '该讲座'}”的预约吗？`,
    success: async (res) => {
      if (!res.confirm) {
        return
      }

      try {
        actionLoadingId.value = item.id
        await cancelLectureRegistration({ lectureId: item.lectureId })
        uni.showToast({
          title: '已取消预约',
          icon: 'success',
        })
        await loadAppointments(true)
      }
      catch (err: any) {
        uni.showToast({
          title: getErrorMessage(err),
          icon: 'none',
        })
      }
      finally {
        actionLoadingId.value = ''
      }
    },
  })
}

function handleReRegister(item: IUserLectureAppointmentItem) {
  if (!canReRegister(item) || !item.lectureId) {
    return
  }

  uni.showModal({
    title: '重新报名',
    content: `确认重新报名“${item.title || '该讲座'}”吗？`,
    success: async (res) => {
      if (!res.confirm) {
        return
      }

      try {
        actionLoadingId.value = item.id
        await registerLecture({ lectureId: item.lectureId })
        uni.showToast({
          title: '重新报名成功',
          icon: 'success',
        })
        await loadAppointments(true)
      }
      catch (err: any) {
        uni.showToast({
          title: getErrorMessage(err),
          icon: 'none',
        })
      }
      finally {
        actionLoadingId.value = ''
      }
    },
  })
}

onShow(() => {
  void loadAppointments(true)
})

onPullDownRefresh(() => {
  void loadAppointments(true)
})

onReachBottom(() => {
  void loadAppointments(false)
})
</script>

<template>
  <view class="appointment-page" :style="{ paddingTop: `${safeTop + 12}px` }">
    <view class="header">
      <text class="title">我的预约</text>
    </view>

    <view class="tabs">
      <view
        v-for="tab in tabs"
        :key="tab.value || 'all'"
        class="tab-item"
        :class="activeStatus === tab.value ? 'tab-active' : ''"
        @click="handleSwitchTab(tab.value)"
      >
        {{ tab.label }}
      </view>
    </view>

    <view v-if="showEmpty" class="empty-wrap">
      <text class="empty-text">{{ emptyText }}</text>
    </view>

    <view v-else-if="loading && list.length === 0" class="empty-wrap">
      <text class="empty-text">加载中...</text>
    </view>

    <view v-else class="list-wrap">
      <view
        v-for="item in list"
        :key="item.id"
        class="appointment-card"
      >
        <view class="card-head">
          <text class="card-title">{{ item.title || '讲座信息缺失' }}</text>
        </view>

        <view class="card-row">
          <text class="label">预约状态</text>
          <text class="status-tag value-tag" :class="getRegistrationStatusClass(item.registrationStatus)">
            {{ getRegistrationStatusText(item.registrationStatus) }}
          </text>
        </view>

        <view class="card-row">
          <text class="label">讲座状态</text>
          <text class="status-tag value-tag" :class="getLectureStatusClass(item.lectureStatus)">
            {{ getLectureStatusText(item.lectureStatus) }}
          </text>
        </view>

        <view class="card-row">
          <text class="label">主讲人</text>
          <text class="value">{{ item.teacherName || item.teacherId || '--' }}</text>
        </view>

        <view class="card-row">
          <text class="label">预约时间</text>
          <text class="value">{{ formatTime(item.registrationTime) }}</text>
        </view>

        <view class="card-row">
          <text class="label">讲座时间</text>
          <text class="value">{{ formatTime(item.lectureStartTime) }} - {{ formatTime(item.lectureEndTime) }}</text>
        </view>

        <view class="card-row">
          <text class="label">地点</text>
          <text class="value">{{ item.location || '--' }}</text>
        </view>

        <view class="card-actions">
          <button class="action-btn action-secondary" @click="handleToLectureDetail(item)">
            查看详情
          </button>
          <button
            class="action-btn action-danger"
            :disabled="!canCancel(item) || actionLoadingId === item.id"
            @click="handleCancel(item)"
          >
            {{ actionLoadingId === item.id ? '处理中...' : '取消预约' }}
          </button>
          <button
            class="action-btn action-primary"
            :disabled="!canReRegister(item) || actionLoadingId === item.id"
            @click="handleReRegister(item)"
          >
            {{ actionLoadingId === item.id ? '处理中...' : '重新报名' }}
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
.appointment-page {
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

.tabs {
  display: flex;
  gap: 10px;
  padding: 0 12px 12px;
}

.tab-item {
  padding: 8px 14px;
  border-radius: 999px;
  background: #e5e7eb;
  color: #374151;
  font-size: 13px;
}

.tab-active {
  background: #2563eb;
  color: #fff;
}

.list-wrap {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 0 12px;
}

.appointment-card {
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
  margin-bottom: 6px;
}

.card-title {
  color: #111827;
  font-size: 16px;
  font-weight: 600;
  line-height: 1.4;
  flex: 1;
}

.status-tag {
  border-radius: 999px;
  font-size: 12px;
  line-height: 1;
  padding: 6px 10px;
}

.value-tag {
  text-align: center;
}

.tag-primary {
  background: #dbeafe;
  color: #1d4ed8;
}

.tag-success {
  background: #dcfce7;
  color: #15803d;
}

.tag-warning {
  background: #fef3c7;
  color: #b45309;
}

.tag-danger {
  background: #fee2e2;
  color: #b91c1c;
}

.tag-default {
  background: #e5e7eb;
  color: #374151;
}

.card-row {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  margin-top: 8px;
}

.label {
  color: #6b7280;
  font-size: 13px;
  white-space: nowrap;
}

.value {
  color: #111827;
  font-size: 13px;
  text-align: right;
  line-height: 1.4;
}

.card-actions {
  display: flex;
  gap: 10px;
  margin-top: 12px;
}

.action-btn {
  flex: 1;
  border-radius: 10px;
  height: 34px;
  line-height: 34px;
  font-size: 13px;
  border: none;
}

.action-primary {
  background: #2563eb;
  color: #fff;
}

.action-secondary {
  background: #eef2ff;
  color: #1e3a8a;
}

.action-danger {
  background: #fee2e2;
  color: #b91c1c;
}

.action-btn[disabled] {
  opacity: 0.5;
}

.empty-wrap {
  margin: 40px 12px 0;
  border-radius: 14px;
  background: #fff;
  padding: 40px 16px;
  text-align: center;
}

.empty-text {
  color: #9ca3af;
  font-size: 14px;
}

.load-more {
  text-align: center;
  padding: 12px 0 6px;
}

.load-text {
  color: #9ca3af;
  font-size: 12px;
}
</style>
