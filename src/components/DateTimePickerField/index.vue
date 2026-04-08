<template>
  <view class="datetime-field">
    <view class="datetime-preview" :class="{ 'is-empty': !modelValue }">
      {{ modelValue || placeholder }}
    </view>

    <picker mode="multiSelector" :range="pickerRange" :value="pickerValue" @change="handleChange">
      <view class="datetime-trigger">
        <text class="datetime-label">一键选择日期时间</text>
      </view>
    </picker>
  </view>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'

interface Props {
  placeholder?: string
  startOffsetDays?: number
  endOffsetDays?: number
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: '请选择日期时间',
  startOffsetDays: -30,
  endOffsetDays: 365,
})

const modelValue = defineModel<string>({
  default: '',
})

const dateOptions = computed(() => {
  const values: string[] = []
  const now = new Date()
  now.setHours(0, 0, 0, 0)

  for (let offset = props.startOffsetDays; offset <= props.endOffsetDays; offset += 1) {
    const date = new Date(now)
    date.setDate(now.getDate() + offset)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    values.push(`${year}-${month}-${day}`)
  }

  return values
})

const hourOptions = Array.from({ length: 24 }, (_, idx) => String(idx).padStart(2, '0'))
const minuteOptions = Array.from({ length: 60 }, (_, idx) => String(idx).padStart(2, '0'))

const pickerRange = computed(() => [dateOptions.value, hourOptions, minuteOptions])
const pickerValue = ref<[number, number, number]>([0, 0, 0])

function syncPickerValue(value: string) {
  if (!value) {
    const today = new Date()
    const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    const defaultDateIndex = Math.max(dateOptions.value.indexOf(todayKey), 0)
    pickerValue.value = [defaultDateIndex, today.getHours(), today.getMinutes()]
    return
  }

  const [datePart, timePart = '00:00:00'] = value.split(' ')
  const [hourPart = '00', minutePart = '00'] = timePart.split(':')

  const dateIndex = Math.max(dateOptions.value.indexOf(datePart), 0)
  const hourIndex = Math.min(Math.max(Number.parseInt(hourPart, 10) || 0, 0), 23)
  const minuteIndex = Math.min(Math.max(Number.parseInt(minutePart, 10) || 0, 0), 59)

  pickerValue.value = [dateIndex, hourIndex, minuteIndex]
}

watch(
  () => modelValue.value,
  (val) => {
    syncPickerValue(val)
  },
  { immediate: true },
)

function handleChange(event: any) {
  const selected = event?.detail?.value as number[]
  if (!selected || selected.length < 3) {
    return
  }

  const [dateIndex, hourIndex, minuteIndex] = selected
  const date = dateOptions.value[dateIndex]
  const hour = hourOptions[hourIndex]
  const minute = minuteOptions[minuteIndex]

  if (!date || hour === undefined || minute === undefined) {
    return
  }

  pickerValue.value = [dateIndex, hourIndex, minuteIndex]
  modelValue.value = `${date} ${hour}:${minute}:00`
}
</script>

<style scoped>
.datetime-preview {
  min-height: 44px;
  margin-bottom: 10px;
  padding: 10px 12px;
  border: 1px solid #e5edf5;
  border-radius: 16px;
  background: linear-gradient(180deg, #f8fbff 0%, #f3f8ff 100%);
  color: #334155;
  font-size: 14px;
  line-height: 22px;
  box-sizing: border-box;
}

.datetime-preview.is-empty {
  color: #94a3b8;
}

.datetime-trigger {
  height: 52px;
  border: 1px solid #e5edf5;
  border-radius: 16px;
  background: linear-gradient(135deg, #1f92ff 0%, #68e0f6 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
}

.datetime-label {
  color: #ffffff;
  font-size: 14px;
  font-weight: 500;
}
</style>
