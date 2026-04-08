<template>
  <button
    :style="buttonStyle"
    :class="buttonClass"
    :loading="loading"
    :disabled="disabled"
    @tap="handleClick"
  >
    <slot>{{ text }}</slot>
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  text?: string
  loading?: boolean
  disabled?: boolean
  width?: string
  height?: string
  fontSize?: string
  customClass?: string
  gradientColor?: 'blue' | 'green'
}

const props = withDefaults(defineProps<Props>(), {
  text: '确定',
  loading: false,
  disabled: false,
  width: '100%',
  height: '88rpx',
  fontSize: '32rpx',
  customClass: '',
  gradientColor: 'blue',
})

const emit = defineEmits<{
  (e: 'click'): void
}>()

const buttonStyle = computed(() => {
  const gradients: Record<string, string> = {
    blue: 'linear-gradient(to right, #60a5fa, #2563eb)',
    green: 'linear-gradient(to right, #34d399, #10b981)',
  }
  return {
    background: gradients[props.gradientColor] || gradients.blue,
    width: props.width,
    height: props.height,
    fontSize: props.fontSize,
  }
})

const buttonClass = computed(() => {
  const baseClass = 'flex items-center justify-center rounded-16rpx font-bold text-white'
  return props.customClass ? `${baseClass} ${props.customClass}` : baseClass
})

function handleClick() {
  if (!props.loading && !props.disabled) {
    emit('click')
  }
}
</script>
