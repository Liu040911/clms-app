import { ref } from 'vue'

/**
 * 页面可滚动高度 Hook 入参
 */
interface UsePageScrollableHeightOptions {
  /**
   * 自定义底部 tabbar 的高度（单位 px，不含安全区）
   * 默认值 50，与项目自定义 tabbar 高度一致
   */
  customTabbarHeightPx?: number
  /**
   * 兜底高度（无法获取系统信息时使用）
   */
  fallbackHeight?: string
}

/**
 * 计算“页面可滚动区域高度”的 Hook
 *
 * 目标：让页面滚动区域止于底部导航栏上方，避免滚到导航栏下方空白区域。
 */
export function usePageScrollableHeight(options: UsePageScrollableHeightOptions = {}) {
  const {
    customTabbarHeightPx = 50,
    fallbackHeight = `calc(100vh - ${customTabbarHeightPx}px)`,
  } = options

  // 页面可滚动区域高度，可直接绑定到容器 style.height
  const pageScrollableHeight = ref(fallbackHeight)

  /**
   * 重新计算可滚动高度
   *
   * 公式：windowHeight - (自定义 tabbar 高度 + 底部安全区高度)
   */
  function updatePageScrollableHeight() {
    try {
      const systemInfo = uni.getSystemInfoSync()
      // 底部安全区高度（如 iPhone Home Indicator 区域）
      const safeAreaBottomPx = systemInfo.safeArea
        ? (systemInfo.screenHeight - systemInfo.safeArea.bottom)
        : 0
      // 底部总占用高度 = tabbar + 安全区
      const totalTabbarHeightPx = customTabbarHeightPx + safeAreaBottomPx
      // 页面可滚动区域高度
      const scrollableHeightPx = Math.max(0, systemInfo.windowHeight - totalTabbarHeightPx)
      pageScrollableHeight.value = `${scrollableHeightPx}px`
    }
    catch {
      // 异常时回退到兜底高度，保证页面可用
      pageScrollableHeight.value = fallbackHeight
    }
  }

  return {
    pageScrollableHeight,
    updatePageScrollableHeight,
  }
}
