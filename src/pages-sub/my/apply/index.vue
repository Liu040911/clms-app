<script lang="ts" setup>
import type { ICreateLectureApplyReq } from '@/api/types/lecture'
import { computed, reactive, ref, watch } from 'vue'
import { createLectureApply, getClassroomList, getLectureInfoById, updateLectureApply } from '@/api/lecture'
import { BASE_URL } from '@/api/types'
import DateTimePickerField from '@/components/DateTimePickerField/index.vue'
import useRequest from '@/hooks/useRequest'
import { http } from '@/http/http'
import { useUserStore } from '@/store/user'
import dayjs from 'dayjs'

definePage({
  style: {
    navigationStyle: 'custom',
    navigationBarTitleText: '申请讲座',
  },
})

const userStore = useUserStore()
const systemInfo = uni.getSystemInfoSync()
const safeAreaInsets = systemInfo.safeAreaInsets || { top: 0, right: 0, bottom: 0, left: 0 }
const isEditMode = ref(false)
const currentLectureId = ref('')
const currentLectureStatus = ref('')
const loadingLectureDetail = ref(false)
const currentLectureClassOption = ref<{
  id: string
  location: string
  capacity?: number
  displayLabel: string
} | null>(null)

// ============ 表单数据 ============
const formData = reactive({
  title: '',
  description: '',
  coverImageUrl: '',
  registrationStartsTime: '',
  registrationEndsTime: '',
  lectureStartsTime: '',
  lectureEndsTime: '',
  classIds: [] as string[],
})

// ============ 教室列表 ============
const { data: classList, loading: classLoading } = useRequest(
  () => getClassroomList(),
  { immediate: true },
)

// ============ 表单验证 ============
const errors = reactive({
  title: '',
  description: '',
  coverImageUrl: '',
  registrationStartsTime: '',
  registrationEndsTime: '',
  lectureStartsTime: '',
  lectureEndsTime: '',
  classIds: '',
})

const hasErrors = computed(() => Object.values(errors).some(error => error !== ''))

const classPickerRange = computed(() => {
  const list = classList.value || []
  return list.map(item => ({
    ...item,
    displayLabel: `${item.location}（容量: ${item.capacity} 人）`,
  }))
})

const classOptions = computed(() => {
  const options = [...classPickerRange.value]
  const current = currentLectureClassOption.value

  if (!current) {
    return options
  }

  const existed = options.some(item => item.id === current.id)
  if (existed) {
    return options
  }

  return [current, ...options]
})

const selectedClassId = computed(() => formData.classIds[0] || '')

const selectedClassIndex = computed(() => {
  const index = classOptions.value.findIndex(item => item.id === selectedClassId.value)
  return index >= 0 ? index : 0
})

const selectedClassLabel = computed(() => {
  const selected = classOptions.value.find(item => item.id === selectedClassId.value)
  if (!selected) {
    return '请选择教室'
  }
  return selected.displayLabel
})

function handleClassChange(event: any) {
  const index = Number(event?.detail?.value)
  if (Number.isNaN(index) || index < 0 || index >= classOptions.value.length) {
    return
  }

  const selected = classOptions.value[index]
  formData.classIds = selected?.id ? [selected.id] : []
}

function formatLectureTime(value?: string) {
  if (!value) {
    return ''
  }

  const parsed = dayjs(value)
  return parsed.isValid() ? parsed.format('YYYY-MM-DD HH:mm:ss') : value.replace('T', ' ')
}

async function loadLectureForEdit(lectureId: string) {
  loadingLectureDetail.value = true
  try {
    const res = await getLectureInfoById(lectureId)
    if (!res) {
      throw new Error('讲座信息不存在')
    }

    formData.title = res.title || ''
    formData.description = res.description || ''
    formData.coverImageUrl = res.coverImageUrl || ''
    formData.registrationStartsTime = formatLectureTime(res.registrationStartsTime)
    formData.registrationEndsTime = formatLectureTime(res.registrationEndsTime)
    formData.lectureStartsTime = formatLectureTime(res.lectureStartTime)
    formData.lectureEndsTime = formatLectureTime(res.lectureEndTime)
    formData.classIds = res.classId ? [res.classId] : []
    currentLectureClassOption.value = res.classId
      ? {
          id: res.classId,
          location: res.location || '未知教室',
          displayLabel: res.location ? `${res.location}（当前讲座教室）` : '当前讲座教室',
        }
      : null
    currentLectureStatus.value = res.status || ''
  }
  catch (error) {
    console.error('加载讲座信息失败:', error)
    uni.showToast({
      title: '加载讲座信息失败',
      icon: 'none',
    })
  }
  finally {
    loadingLectureDetail.value = false
  }
}

function validateForm(): boolean {
  // 重置错误
  Object.keys(errors).forEach((key) => {
    errors[key as keyof typeof errors] = ''
  })

  let isValid = true

  if (!formData.title.trim()) {
    errors.title = '讲座名称不能为空'
    isValid = false
  }

  if (!formData.description.trim()) {
    errors.description = '讲座内容不能为空'
    isValid = false
  }

  if (!formData.coverImageUrl) {
    errors.coverImageUrl = '讲座海报不能为空'
    isValid = false
  }

  if (!formData.registrationStartsTime) {
    errors.registrationStartsTime = '报名开始时间不能为空'
    isValid = false
  }

  if (!formData.registrationEndsTime) {
    errors.registrationEndsTime = '报名结束时间不能为空'
    isValid = false
  }

  if (formData.registrationStartsTime && formData.registrationEndsTime) {
    if (new Date(formData.registrationStartsTime) >= new Date(formData.registrationEndsTime)) {
      errors.registrationEndsTime = '报名结束时间必须晚于开始时间'
      isValid = false
    }
  }

  if (!formData.lectureStartsTime) {
    errors.lectureStartsTime = '讲座开始时间不能为空'
    isValid = false
  }

  if (!formData.lectureEndsTime) {
    errors.lectureEndsTime = '讲座结束时间不能为空'
    isValid = false
  }

  if (formData.lectureStartsTime && formData.lectureEndsTime) {
    if (new Date(formData.lectureStartsTime) >= new Date(formData.lectureEndsTime)) {
      errors.lectureEndsTime = '讲座结束时间必须晚于开始时间'
      isValid = false
    }
  }

  if (formData.registrationEndsTime && formData.lectureStartsTime) {
    if (new Date(formData.registrationEndsTime) > new Date(formData.lectureStartsTime)) {
      errors.lectureStartsTime = '报名必须在讲座开始前结束'
      isValid = false
    }
  }

  if (formData.classIds.length === 0) {
    errors.classIds = '请至少选择一个教室'
    isValid = false
  }

  return isValid
}

// ============ 上传海报 ============
const uploadLoading = ref(false)

function normalizeTempFilePath(path: string) {
  if (!path)
    return ''

  // #ifdef MP-WEIXIN
  if (path.startsWith('http://tmp/')) {
    return path.replace('http://tmp/', 'wxfile://tmp/')
  }
  if (path.startsWith('/tmp/')) {
    return `wxfile://${path}`
  }
  // #endif

  return path
}

function denormalizeTempFilePath(path: string) {
  if (!path)
    return ''

  // #ifdef MP-WEIXIN
  if (path.startsWith('wxfile://tmp/')) {
    return path.replace('wxfile://tmp/', 'http://tmp/')
  }
  // #endif

  return path
}

function getPathCandidates(path: string) {
  const candidates = [
    path,
    normalizeTempFilePath(path),
    denormalizeTempFilePath(path),
  ].filter(Boolean)

  return Array.from(new Set(candidates))
}

function choosePosterFilePath(): Promise<string> {
  return new Promise((resolve, reject) => {
    uni.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (chooseRes) => {
        const rawPath = (chooseRes as any)?.tempFilePaths?.[0] || (chooseRes as any)?.tempFiles?.[0]?.tempFilePath || ''
        resolve(rawPath)
      },
      fail: err => reject(err),
    })
  })
}

function compressPoster(localPath: string): Promise<string> {
  return new Promise((resolve) => {
    const candidates = getPathCandidates(localPath)
    let current = 0

    const tryCompress = () => {
      if (current >= candidates.length) {
        // 压缩失败时降级使用原图，避免流程中断
        resolve(localPath)
        return
      }

      const src = candidates[current]
      current += 1

      uni.compressImage({
        src,
        quality: 80,
        success: (compressRes) => {
          resolve(compressRes.tempFilePath || src)
        },
        fail: () => {
          tryCompress()
        },
      })
    }

    tryCompress()
  })
}

function uploadPosterByFilePath(filePath: string, token: string, key: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const candidates = getPathCandidates(filePath)
    let current = 0

    const tryUpload = () => {
      if (current >= candidates.length) {
        reject(new Error('uploadFile failed on all path candidates'))
        return
      }

      const targetPath = candidates[current]
      current += 1

      uni.uploadFile({
        url: 'https://up-z2.qiniup.com',
        filePath: targetPath,
        name: 'file',
        formData: {
          token,
          key,
        },
        success: (uploadRes) => {
          if (uploadRes.statusCode >= 200 && uploadRes.statusCode < 300) {
            const uploadData = typeof uploadRes.data === 'string'
              ? JSON.parse(uploadRes.data || '{}')
              : (uploadRes.data as Record<string, any>)
            resolve(`http://td4d4v1ov.hn-bkt.clouddn.com/${uploadData?.key || key}`)
            return
          }
          tryUpload()
        },
        fail: () => {
          tryUpload()
        },
      },
      )
    }

    tryUpload()
  })
}

async function handleChoosePoster() {
  try {
    const localPath = await choosePosterFilePath()
    if (!localPath) {
      return
    }

    uploadLoading.value = true
    uni.showLoading({ title: '海报上传中...' })

    const token = await getUploadToken()
    const compressedPath = await compressPoster(localPath)
    const key = `${Date.now()}-${userStore.userInfo?.id || 'anonymous'}-${Math.random().toString(36).slice(2)}`
    const imageUrl = await uploadPosterByFilePath(compressedPath, token, key)

    formData.coverImageUrl = imageUrl
    uni.showToast({
      title: '海报上传成功',
      icon: 'success',
    })
  }
  catch (error) {
    console.error('海报上传失败:', error)
    uni.showToast({
      title: '上传失败，请重试',
      icon: 'none',
    })
  }
  finally {
    uploadLoading.value = false
    uni.hideLoading()
  }
}

// ============ 删除海报 ============
function handleRemovePoster() {
  formData.coverImageUrl = ''
}

// ============ 提交表单 ============
const submitting = ref(false)

async function handleSubmit() {
  if (!validateForm()) {
    uni.showToast({
      title: '请填写完整表单',
      icon: 'none',
    })
    return
  }

  submitting.value = true
  uni.showLoading({ title: '提交中...' })

  try {
    const submitData: ICreateLectureApplyReq = {
      title: formData.title,
      description: formData.description,
      coverImageUrl: formData.coverImageUrl,
      registrationStartsTime: new Date(formData.registrationStartsTime).toISOString(),
      registrationEndsTime: new Date(formData.registrationEndsTime).toISOString(),
      lectureStartsTime: new Date(formData.lectureStartsTime).toISOString(),
      lectureEndsTime: new Date(formData.lectureEndsTime).toISOString(),
      teacherId: userStore.userInfo?.id,
      classIds: formData.classIds,
    }

    if (isEditMode.value && currentLectureId.value) {
      await updateLectureApply(currentLectureId.value, submitData)
    }
    else {
      await createLectureApply(submitData)
    }

    uni.hideLoading()
    uni.showToast({
      title: isEditMode.value ? '讲座修改成功！' : '讲座申请成功！',
      icon: 'success',
    })

    // 延迟返回上级页面
    setTimeout(() => {
      uni.navigateBack({ delta: 1 })
    }, 1500)
  }
  catch (error) {
    uni.hideLoading()
    console.error('提交失败:', error)
    uni.showToast({
      title: error instanceof Error ? error.message : '提交失败，请重试',
      icon: 'none',
    })
  }
  finally {
    submitting.value = false
  }
}

function getUploadToken() {
  return http.get<string>(`${BASE_URL}/api/upload/token`)
}

// ============ 重置表单 ============
function handleReset() {
  formData.title = ''
  formData.description = ''
  formData.coverImageUrl = ''
  formData.registrationStartsTime = ''
  formData.registrationEndsTime = ''
  formData.lectureStartsTime = ''
  formData.lectureEndsTime = ''
  formData.classIds = []
}

const submitButtonText = computed(() => {
  if (submitting.value) {
    return '提交中...'
  }

  if (isEditMode.value && currentLectureStatus.value === 'reject') {
    return '重新申请'
  }

  if (isEditMode.value) {
    return '保存修改'
  }

  return '提交申请'
})

onLoad((options) => {
  const lectureId = typeof options?.lectureId === 'string' ? options.lectureId : ''
  const mode = typeof options?.mode === 'string' ? options.mode : ''
  if (mode === 'edit' && lectureId) {
    isEditMode.value = true
    currentLectureId.value = lectureId
    void loadLectureForEdit(lectureId)
  }
})
</script>

<template>
  <view class="min-h-screen bg-gray-50 pb-6" :style="{ paddingTop: `${safeAreaInsets.top + 12}px` }">
    <!-- 表单容器 -->
    <view class="p-4 space-y-4">
      <!-- 讲座名称 -->
      <view class="border border-gray-200 rounded-lg bg-white p-4">
        <view class="mb-2 text-sm text-gray-700 font-medium">
          讲座名称
          <text class="text-red-500">*</text>
        </view>
        <input
          v-model="formData.title"
          type="text"
          placeholder="请输入讲座名称"
          class="h-10 w-full border border-gray-300 rounded px-3 text-base focus:border-blue-500 focus:outline-none"
          :style="{ fontSize: '16px' }"
        >
        <text v-if="errors.title" class="mt-1 block text-xs text-red-500">{{ errors.title }}</text>
      </view>

      <!-- 讲座内容 -->
      <view class="border border-gray-200 rounded-lg bg-white p-4">
        <view class="mb-2 text-sm text-gray-700 font-medium">
          讲座内容
          <text class="text-red-500">*</text>
        </view>
        <textarea
          v-model="formData.description"
          placeholder="请输入讲座内容描述"
          class="h-24 w-full resize-none border border-gray-300 rounded px-3 py-2 text-base focus:border-blue-500 focus:outline-none"
          :style="{ fontSize: '16px' }"
        />
        <text v-if="errors.description" class="mt-1 block text-xs text-red-500">{{ errors.description }}</text>
      </view>

      <!-- 讲座海报 -->
      <view class="border border-gray-200 rounded-lg bg-white p-4">
        <view class="mb-3 text-sm text-gray-700 font-medium">
          讲座海报
          <text class="text-red-500">*</text>
        </view>
        <view v-if="formData.coverImageUrl" class="mb-3">
          <image
            :src="formData.coverImageUrl"
            mode="aspectFit"
            class="h-48 w-full border border-gray-300 rounded-lg"
          />
          <button
            class="mt-2 w-full border border-red-200 rounded bg-red-50 py-2 text-sm text-red-600 font-medium"
            @click="handleRemovePoster"
          >
            删除海报
          </button>
        </view>
        <button
          v-else
          :disabled="uploadLoading"
          class="w-full border-2 border-blue-300 rounded border-dashed bg-blue-50 py-3 text-sm text-blue-600 font-medium disabled:opacity-50"
          @click="handleChoosePoster"
        >
          {{ uploadLoading ? '上传中...' : '点击选择海报' }}
        </button>
        <text v-if="errors.coverImageUrl" class="mt-2 block text-xs text-red-500">{{ errors.coverImageUrl }}</text>
      </view>

      <!-- 报名时间 -->
      <view class="border border-gray-200 rounded-lg bg-white p-4">
        <view class="mb-3 text-sm text-gray-700 font-medium">
          报名开始时间
          <text class="text-red-500">*</text>
        </view>
        <DateTimePickerField
          v-model="formData.registrationStartsTime"
          placeholder="请选择报名开始时间"
        />
        <text v-if="errors.registrationStartsTime" class="mt-1 block text-xs text-red-500">
          {{ errors.registrationStartsTime }}
        </text>
      </view>

      <view class="border border-gray-200 rounded-lg bg-white p-4">
        <view class="mb-3 text-sm text-gray-700 font-medium">
          报名结束时间
          <text class="text-red-500">*</text>
        </view>
        <DateTimePickerField
          v-model="formData.registrationEndsTime"
          placeholder="请选择报名结束时间"
        />
        <text v-if="errors.registrationEndsTime" class="mt-1 block text-xs text-red-500">
          {{ errors.registrationEndsTime }}
        </text>
      </view>

      <!-- 讲座时间 -->
      <view class="border border-gray-200 rounded-lg bg-white p-4">
        <view class="mb-3 text-sm text-gray-700 font-medium">
          讲座开始时间
          <text class="text-red-500">*</text>
        </view>
        <DateTimePickerField
          v-model="formData.lectureStartsTime"
          placeholder="请选择讲座开始时间"
        />
        <text v-if="errors.lectureStartsTime" class="mt-1 block text-xs text-red-500">
          {{ errors.lectureStartsTime }}
        </text>
      </view>

      <view class="border border-gray-200 rounded-lg bg-white p-4">
        <view class="mb-3 text-sm text-gray-700 font-medium">
          讲座结束时间
          <text class="text-red-500">*</text>
        </view>
        <DateTimePickerField
          v-model="formData.lectureEndsTime"
          placeholder="请选择讲座结束时间"
        />
        <text v-if="errors.lectureEndsTime" class="mt-1 block text-xs text-red-500">
          {{ errors.lectureEndsTime }}
        </text>
      </view>

      <!-- 教室选择 -->
      <view class="border border-gray-200 rounded-lg bg-white p-4">
        <view class="mb-3 text-sm text-gray-700 font-medium">
          选择教室
          <text class="text-red-500">*</text>
        </view>
        <view v-if="classLoading" class="py-4 text-center text-gray-500">
          加载中...
        </view>
        <view v-else>
          <view v-if="classOptions.length === 0" class="py-2 text-center text-gray-500">
            暂无可用教室
          </view>

          <picker
            v-else
            mode="selector"
            :range="classOptions"
            range-key="displayLabel"
            :value="selectedClassIndex"
            @change="handleClassChange"
          >
            <view class="h-12 flex items-center justify-between border border-gray-300 rounded bg-white px-3 text-sm text-gray-700">
              <text>{{ selectedClassLabel }}</text>
              <text class="text-xs text-gray-400">点击选择</text>
            </view>
          </picker>
        </view>
        <text v-if="errors.classIds" class="mt-2 block text-xs text-red-500">{{ errors.classIds }}</text>
      </view>

      <!-- 操作按钮 -->
      <view class="flex gap-3 pt-4">
        <button
          :disabled="submitting || uploadLoading"
          class="flex-1 rounded-lg bg-blue-500 py-3 text-white font-medium disabled:cursor-not-allowed disabled:opacity-50"
          @click="handleSubmit"
        >
          {{ submitButtonText }}
        </button>
        <button
          :disabled="submitting"
          class="flex-1 rounded-lg bg-gray-200 py-3 text-gray-700 font-medium disabled:opacity-50"
          @click="handleReset"
        >
          重置
        </button>
      </view>
    </view>
  </view>
</template>

<style scoped>
/* uni-app 中的样式支持 */
:deep(input),
:deep(textarea) {
  box-sizing: border-box;
}

:deep(input:focus),
:deep(textarea:focus) {
  outline: none;
}
</style>
