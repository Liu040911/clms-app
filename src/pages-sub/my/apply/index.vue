<script lang="ts" setup>
import type { ICreateLectureApplyReq } from '@/api/types/lecture'
import { computed, reactive, ref } from 'vue'
import { createLectureApply, getClassroomList } from '@/api/lecture'
import { BASE_URL } from '@/api/types'
import DateTimePickerField from '@/components/DateTimePickerField/index.vue'
import useRequest from '@/hooks/useRequest'
import { http } from '@/http/http'
import { useUserStore } from '@/store/user'

definePage({
  style: {
    navigationStyle: 'custom',
    navigationBarTitleText: '申请讲座',
  },
})

const userStore = useUserStore()
const systemInfo = uni.getSystemInfoSync()
const safeAreaInsets = systemInfo.safeAreaInsets || { top: 0, right: 0, bottom: 0, left: 0 }

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

const selectedClassIndex = ref(-1)

const classPickerRange = computed(() => {
  const list = classList.value || []
  return list.map(item => ({
    ...item,
    displayLabel: `${item.location}（容量: ${item.capacity} 人）`,
  }))
})

const selectedClassLabel = computed(() => {
  const selected = classPickerRange.value[selectedClassIndex.value]
  if (!selected) {
    return '请选择教室'
  }
  return selected.displayLabel
})

function handleClassChange(event: any) {
  const index = Number(event?.detail?.value)
  if (Number.isNaN(index) || index < 0 || index >= classPickerRange.value.length) {
    return
  }

  selectedClassIndex.value = index
  const selected = classPickerRange.value[index]
  formData.classIds = selected?.id ? [selected.id] : []
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

async function handleChoosePoster() {
  try {
    const res = await new Promise<any>((resolve, reject) => {
      uni.chooseImage({
        count: 1,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera'],
        success: (chooseRes) => {
          const tempFilePath = (chooseRes as any)?.tempFilePaths?.[0] || (chooseRes as any)?.tempFiles?.[0]?.tempFilePath || ''
          resolve({ tempFilePath })
        },
        fail: err => reject(err),
      })
    })

    if (!res.tempFilePath) {
      return
    }

    uploadLoading.value = true
    uni.showLoading({ title: '海报上传中...' })

    // 使用上传逻辑 - 获取 token 后上传
    const getTokenRes = await getUploadToken()
    const tokenRes = getTokenRes

    // 读取文件
    const fileSystemManager = uni.getFileSystemManager()
    fileSystemManager.readFile({
      filePath: res.tempFilePath,
      encoding: 'base64',
      success: ({ data }) => {
        const key = `${Date.now()}-${userStore.userInfo?.id || 'anonymous'}-${Math.random().toString(36).slice(2)}`

        uni.request({
          url: 'https://up-z2.qiniup.com/putb64/-1',
          method: 'POST',
          data: data as any,
          header: {
            'Authorization': `UpToken ${tokenRes}`,
            'Content-Type': 'application/octet-stream',
          },
          success: (uploadRes) => {
            uni.hideLoading()
            uploadLoading.value = false
            if (uploadRes.statusCode >= 200 && uploadRes.statusCode < 300) {
              const uploadData = uploadRes.data as Record<string, any>
              formData.coverImageUrl = `http://td4d4v1ov.hn-bkt.clouddn.com/${uploadData?.key || key}`
              uni.showToast({
                title: '海报上传成功',
                icon: 'success',
              })
              return
            }
            console.error('上传失败:', uploadRes)
            uni.showToast({
              title: '上传失败，请重试',
              icon: 'none',
            })
          },
          fail: (err) => {
            uni.hideLoading()
            uploadLoading.value = false
            console.error('上传失败:', err)
            uni.showToast({
              title: '上传失败，请重试',
              icon: 'none',
            })
          },
        })
      },
      fail: (error) => {
        uni.hideLoading()
        uploadLoading.value = false
        console.error('读取文件失败:', error)
        uni.showToast({
          title: '读取文件失败',
          icon: 'none',
        })
      },
    })
  }
  catch (error) {
    uploadLoading.value = false
    console.error('选择文件失败:', error)
    uni.showToast({
      title: '选择文件失败',
      icon: 'none',
    })
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

    await createLectureApply(submitData)

    uni.hideLoading()
    uni.showToast({
      title: '讲座申请成功！',
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
  selectedClassIndex.value = -1
}
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
        <view v-else-if="!classList || classList.length === 0" class="py-4 text-center text-gray-500">
          暂无可用教室
        </view>
        <view v-else>
          <picker
            mode="selector"
            :range="classPickerRange"
            range-key="displayLabel"
            :value="selectedClassIndex < 0 ? 0 : selectedClassIndex"
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
          {{ submitting ? '提交中...' : '提交申请' }}
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
