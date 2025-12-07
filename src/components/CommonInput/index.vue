<template>
  <view :class="showMargin ? 'mb-32rpx' : ''" class="relative">
    <input
      :value="modelValue"
      :type="computedInputType as any"
      :password="computedPasswordMode"
      :placeholder="placeholder"
      placeholder-class="placeholder"
      :disabled="disabled"
      :class="[isFocused ? 'focused' : '', password ? 'pr-88rpx' : '']"
      class="common-input"
      @input="$emit('update:modelValue', $event.detail.value)"
      @focus="isFocused = true"
      @blur="isFocused = false"
    >
    <!-- 密码显示/隐藏按钮 - 内嵌在输入框右侧 -->
    <view
      v-if="password"
      class="password-toggle-btn"
      @tap.stop="togglePassword"
    >
      <!-- 显示密码图标 - 使用 ?mask 强制 mask 模式 -->
      <text
        v-if="showPassword"
        key="show"
        class="i-carbon-view?mask"
        style="width: 36rpx; height: 36rpx; color: #3b82f6; display: inline-block;"
      />
      <!-- 隐藏密码图标 - 使用 ?mask 强制 mask 模式 -->
      <text
        v-else
        key="hide"
        class="i-carbon-view-off?mask"
        style="width: 36rpx; height: 36rpx; color: #9ca3af; display: inline-block;"
      />
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

interface Props {
  modelValue?: string
  type?: 'text' | 'number' | 'tel' | 'email'
  placeholder?: string
  password?: boolean
  disabled?: boolean
  showMargin?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  type: 'text',
  placeholder: '',
  password: false,
  disabled: false,
  showMargin: true,
})

defineEmits<{
  'update:modelValue': [value: string]
}>()

const isFocused = ref(false)
const showPassword = ref(false)

function togglePassword() {
  showPassword.value = !showPassword.value
  console.log('密码显示状态切换:', showPassword.value ? '显示' : '隐藏')
}

// 计算 input 的 type 属性
const computedInputType = computed(() => {
  // 如果是密码框，始终使用 text 类型，通过 password 属性控制显示
  if (props.password) {
    return 'text'
  }
  return props.type
})

// 计算 input 的 password 属性（uni-app 特有）
const computedPasswordMode = computed(() => {
  if (!props.password) {
    return false
  }
  // 当 showPassword 为 true 时，不使用密码模式（显示明文）
  // 当 showPassword 为 false 时，使用密码模式（显示黑点）
  return !showPassword.value
})
</script>

<style scoped>
.common-input {
  box-sizing: border-box;
  height: 96rpx;
  width: 100%;
  border: 2px solid #d1d5db;
  border-radius: 16rpx;
  background-color: rgba(255, 255, 255, 0.9);
  padding: 0 32rpx;
  font-size: 28rpx;
  color: #111827;
  transition: border-color 0.2s ease;
}

input::placeholder {
  color: #d1d5db;
}

.common-input:focus,
.common-input.focused {
  outline: none;
  border-color: #3b82f6;
}

input::placeholder {
  color: #d1d5db;
}

input:focus {
  outline: none;
}

/* 密码显示/隐藏按钮样式 */
.password-toggle-btn {
  position: absolute;
  right: 24rpx;
  top: 0;
  height: 96rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 10;
}
</style>
