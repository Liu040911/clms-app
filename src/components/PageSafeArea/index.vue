<template>
  <view :class="wrapperClass" :style="wrapperStyle">
    <slot />
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

interface Props {
  useCapsuleTop?: boolean
  topInset?: boolean
  bottomInset?: boolean
  extraTopRpx?: number
  extraBottomRpx?: number
  fullHeight?: boolean
  customClass?: string
}

const props = withDefaults(defineProps<Props>(), {
  useCapsuleTop: true,
  topInset: true,
  bottomInset: false,
  extraTopRpx: 24,
  extraBottomRpx: 24,
  fullHeight: true,
  customClass: '',
})

const topPadding = ref(`calc(env(safe-area-inset-top) + ${props.extraTopRpx}rpx)`)

onLoad(() => {
  // #ifdef MP-WEIXIN
  if (props.useCapsuleTop && props.topInset) {
    try {
      const menuRect = wx.getMenuButtonBoundingClientRect()
      const systemInfo = uni.getSystemInfoSync()
      const pxToRpx = 750 / systemInfo.windowWidth
      const capsuleBottomRpx = Math.ceil(menuRect.bottom * pxToRpx)
      topPadding.value = `${capsuleBottomRpx + props.extraTopRpx}rpx`
    }
    catch {
      topPadding.value = `calc(env(safe-area-inset-top) + ${props.extraTopRpx}rpx)`
    }
  }
  // #endif
})

const wrapperStyle = computed(() => {
  const style: Record<string, string> = {}

  style.paddingTop = props.topInset ? topPadding.value : `${props.extraTopRpx}rpx`
  style.paddingBottom = props.bottomInset
    ? `calc(env(safe-area-inset-bottom) + ${props.extraBottomRpx}rpx)`
    : `${props.extraBottomRpx}rpx`

  return style
})

const wrapperClass = computed(() => {
  const baseClass = props.fullHeight ? 'h-screen' : ''
  return props.customClass ? `${baseClass} ${props.customClass}`.trim() : baseClass
})
</script>
