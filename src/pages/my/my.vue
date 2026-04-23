<script lang="ts" setup>
import { BASE_URL } from '@/api/types'
import { usePageScrollableHeight } from '@/hooks/usePageScrollableHeight'
import { http } from '@/http/http'
import { useAppStatus } from '@/store/app'
import { useUserStore } from '@/store/user'
import { toLoginPage } from '@/utils/toLoginPage'

interface IMySubPageItem {
  title: string
  icon?: string
  url: string
  disabled?: boolean
  role?: string
  roles?: string[]
}

definePage({
  style: {
    navigationStyle: 'custom',
    navigationBarTitleText: '我的',
  },
})

const userStore = useUserStore()
const appStatus = useAppStatus()
const subPages = ref<IMySubPageItem[] | undefined>(appStatus.getConfig()?.pageConfig?.my)
const navLoading = ref(false)
const avatarUploading = ref(false)
const systemInfo = uni.getSystemInfoSync()
const safeAreaInsets = systemInfo.safeAreaInsets || { top: 0, right: 0, bottom: 0, left: 0 }
const { pageScrollableHeight, updatePageScrollableHeight } = usePageScrollableHeight({
  customTabbarHeightPx: 50,
})

function chooseImageFromSource(sourceType: Array<'album' | 'camera'>): Promise<string> {
  return new Promise((resolve, reject) => {
    uni.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType,
      success: (res) => {
        const localPath = (res as any)?.tempFilePaths?.[0] || (res as any)?.tempFiles?.[0]?.tempFilePath || ''
        resolve(localPath)
      },
      fail: err => reject(err),
    })
  })
}

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

function compressLocalImage(localPath: string): Promise<string> {
  return new Promise((resolve) => {
    const candidates = getPathCandidates(localPath)
    let current = 0

    const tryCompress = () => {
      if (current >= candidates.length) {
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

function uploadImageByFilePath(filePath: string, token: string, key: string): Promise<string> {
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
      })
    }

    tryUpload()
  })
}

// 上传本地图片到服务器 - 使用与useUpload完全一致的逻辑
function uploadLocalImage(localPath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const key = `${Date.now()}-${userStore.userInfo?.id || 'anonymous'}-${Math.random().toString(36).slice(2)}`

    http
      .get<string>(`${BASE_URL}/api/upload/token`)
      .then(async (tokenRes) => {
        const compressedPath = await compressLocalImage(localPath)
        const imageUrl = await uploadImageByFilePath(compressedPath, tokenRes, key)
        resolve(imageUrl)
      })
      .catch((err) => {
        console.error('上传失败:', err)
        reject(err)
      })
  })
}

async function uploadAvatarBySource(sourceType: Array<'album' | 'camera'>) {
  if (avatarUploading.value) {
    return
  }

  try {
    const localPath = await chooseImageFromSource(sourceType)
    if (!localPath) {
      return
    }

    avatarUploading.value = true
    uni.showLoading({ title: '头像上传中...' })

    const avatarUrl = await uploadLocalImage(localPath)
    await http.post<void>(`${BASE_URL}/user/upload/avatar`, {}, { avatarUrl })
    userStore.setUserAvatar(avatarUrl)

    uni.showToast({
      title: '头像更新成功',
      icon: 'success',
    })
  }
  catch (error) {
    console.error('上传头像失败:', error)
    uni.showToast({
      title: '上传失败，请重试',
      icon: 'none',
    })
  }
  finally {
    avatarUploading.value = false
    uni.hideLoading()
  }
}

function handleUploadAvatar() {
  if (avatarUploading.value) {
    return
  }

  uni.showActionSheet({
    itemList: ['拍照', '从相册选择'],
    success: ({ tapIndex }) => {
      if (tapIndex === 0) {
        void uploadAvatarBySource(['camera'])
      }
      else if (tapIndex === 1) {
        void uploadAvatarBySource(['album'])
      }
    },
  })
}

function preparePage() {
  if (!subPages.value || subPages.value.length === 0) {
    return
  }

  const rolesFromInfo = Array.isArray(userStore.userInfo?.roles)
    ? userStore.userInfo.roles
    : []
  const roleSet = new Set(rolesFromInfo)

  // 先按角色过滤（配置中标记了 roles/role 的菜单项）
  subPages.value = subPages.value.filter((item) => {
    const requiredRoles = item.roles || (item.role ? [item.role] : [])
    if (!requiredRoles || requiredRoles.length === 0) {
      return true
    }
    return requiredRoles.some(role => roleSet.has(role))
  })
}

function navigateTo(url: string, disabled: boolean = false) {
  if (disabled) {
    return
  }

  let normalizedUrl = url.startsWith('/') ? url : `/${url}`
  normalizedUrl = normalizedUrl.replace('/pages/', '/pages-sub/')
  uni.navigateTo({
    url: normalizedUrl,
    fail() {
      uni.showToast({
        title: '页面暂未开放',
        icon: 'none',
      })
    },
  })
}

function isImageIcon(icon?: string) {
  if (!icon)
    return false
  return icon.startsWith('http://') || icon.startsWith('https://') || icon.startsWith('/')
}

function getIconClass(icon?: string) {
  if (!icon)
    return 'i-carbon-link'
  // #ifdef MP-WEIXIN
  return icon.replace(':', '_a_')
  // #endif
  // #ifndef MP-WEIXIN
  return icon
  // #endif
}

onShow(() => {
  updatePageScrollableHeight()
  // 标题已由页面配置处理，不需要再手动设置
  if (!useUserStore().userInfo || useUserStore().userInfo.id === '') {
    toLoginPage({ mode: 'reLaunch' })
  }
  else {
    if (!subPages.value) {
      navLoading.value = true
      http.get<any>(`${BASE_URL}/app/config/get`)
        .then((res) => {
          const configData = res?.data || res
          appStatus.setConfig(configData)
          subPages.value = configData?.pageConfig?.my || []
          preparePage()
        })
        .finally(() => {
          navLoading.value = false
        })
    }
    else {
      preparePage()
    }
  }
})
</script>

<template>
  <view class="my-page-shell" :style="{ height: pageScrollableHeight }">
    <scroll-view class="h-full" scroll-y>
      <view class="page-container">
        <view class="header-container">
          <view v-show="safeAreaInsets.top === 0" class="safe-gap" />
          <view :style="{ height: `${safeAreaInsets.top}px` }" />

          <view class="page-title-bar">
            <text class="page-title">我的</text>
          </view>

          <view class="profile-wrap">
            <view class="avatar-wrap" @click="handleUploadAvatar">
              <image
                v-if="userStore.userInfo?.avatar"
                :src="userStore.userInfo.avatar"
                alt=""
                class="avatar-image"
                mode="aspectFill"
              />
              <view v-else class="avatar-fallback">
                <view class="i-ic:round-person avatar-fallback-icon" />
              </view>
            </view>
          </view>
        </view>

        <view class="nav-section">
          <view class="nav-card card-shadow">
            <view v-if="navLoading" class="nav-state">
              导航加载中...
            </view>

            <view v-else-if="!subPages || subPages.length === 0" class="nav-state">
              暂无可用导航
            </view>

            <block v-for="(page, idx) in subPages" :key="`${page.title}-${idx}`">
              <view
                class="nav-row"
                :class="page.disabled ? 'is-disabled' : ''"
                hover-class="nav-row-hover"
                @click="navigateTo(page.url, !!page.disabled)"
              >
                <view class="nav-left">
                  <view class="nav-icon-shell">
                    <image
                      v-if="isImageIcon(page.icon)"
                      :src="page.icon"
                      mode="aspectFit"
                      class="nav-icon-image"
                    />
                    <view
                      v-else
                      :class="getIconClass(page.icon)"
                      class="nav-icon-font"
                    />
                  </view>
                  <text class="nav-title">{{ page.title }}</text>
                </view>
                <view class="nav-arrow i-codicon:chevron-right" />
              </view>
            </block>
          </view>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<style scoped>
.my-page-shell {
  overflow: hidden;
}

.page-container {
  position: relative;
  min-height: 100%;
  background-attachment: local;
}

.page-container::before {
  position: absolute;
  top: 0;
  right: 0;
  left: 0;
  z-index: -2;
  height: 370px;
  content: '';
  background: linear-gradient(180deg, #6cddf5 0%, #6c9af0 100%);
}

.page-container::after {
  position: absolute;
  top: 0;
  right: 0;
  left: 0;
  z-index: -1;
  width: 100%;
  height: 371px;
  content: '';
  background-image: url('https://file.bailetangren.cn/app/MasterDDSSlicePNGbbbada73e171f578c2f84b1d05983fb5.png');
  background-repeat: no-repeat;
  background-position: center top;
  background-size: cover;
}

.header-container {
  position: relative;
  padding-bottom: 20px;
}

.safe-gap {
  height: 24px;
}

.page-title-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  height: 44px;
}

.page-title {
  font-size: 18px;
  font-weight: 500;
  color: #111827;
}

.profile-wrap {
  margin-top: 8px;
}

.avatar-wrap {
  position: relative;
  cursor: pointer;
  display: flex;
  justify-content: center;
  margin-top: 8px;
}

.avatar-image,
.avatar-fallback {
  width: 86px;
  height: 86px;
  border-radius: 9999px;
  border: 3px solid #fff;
  overflow: hidden;
}

.avatar-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f6f5fa;
}

.avatar-fallback-icon {
  font-size: 42px;
  color: #1d92ff;
}

.profile-card {
  margin: 16px 20px 0;
  padding: 12px 20px 10px;
  border-radius: 16px;
  background: #fff;
}

.profile-card-title {
  font-size: 24px;
  font-weight: 700;
  color: #111827;
}

.profile-card-subtitle {
  margin-top: 4px;
  font-size: 16px;
  color: #6b7280;
}

.nav-section {
  padding: 0 20px;
  margin-top: 20px;
}

.nav-card {
  padding: 0 20px;
  border-radius: 16px;
  background: #fff;
}

.nav-state {
  padding: 28px 0;
  text-align: center;
  font-size: 14px;
  color: #9ca3af;
}

.nav-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 0;
}

.nav-row-hover {
  background: #f3f4f6;
}

.nav-row.is-disabled {
  color: #9ca3af;
}

.nav-left {
  display: flex;
  align-items: center;
}

.nav-icon-shell {
  width: 40px;
  height: 40px;
  margin-right: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  background: #eff6ff;
}

.nav-icon-image {
  width: 28px;
  height: 28px;
}

.nav-icon-font {
  font-size: 20px;
}

.nav-title {
  font-size: 20px;
}

.nav-arrow {
  font-size: 16px;
  color: #9ca3af;
}

.card-shadow {
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.06);
}
</style>
