import type { Ref } from 'vue'
import { onMounted, ref } from 'vue'

/**
 * 通用滚动分页 Hook 入参
 */
interface UseScrollOptions<T> {
  /**
   * 分页数据获取函数
   * @param page 当前页码（从 1 开始）
   * @param pageSize 每页条数
   */
  fetchData: (page: number, pageSize: number) => Promise<T[]>
  /**
   * 每页条数，默认 10
   */
  pageSize?: number
}

/**
 * 通用滚动分页 Hook 返回值
 */
interface UseScrollReturn<T> {
  /** 列表数据 */
  list: Ref<T[]>
  /** 是否正在加载 */
  loading: Ref<boolean>
  /** 是否已加载完成（无更多数据） */
  finished: Ref<boolean>
  /** 最近一次请求错误 */
  error: Ref<any>
  /** 重新加载（重置页码、清空列表后请求第一页） */
  refresh: () => Promise<void>
  /** 加载下一页 */
  loadMore: () => Promise<void>
}

/**
 * 通用滚动分页逻辑
 *
 * 适用场景：列表页上拉加载、分页查询。
 * 默认在组件挂载时会自动触发一次 refresh()。
 */
export function useScroll<T>({
  fetchData,
  pageSize = 10,
}: UseScrollOptions<T>): UseScrollReturn<T> {
  // 列表数据
  const list = ref<T[]>([]) as Ref<T[]>
  // 当前是否处于请求中
  const loading = ref(false)
  // 是否已无更多数据
  const finished = ref(false)
  // 错误对象
  const error = ref<any>(null)
  // 当前页码（从 1 开始）
  const page = ref(1)

  /**
   * 内部加载方法：负责请求数据并更新分页状态
   */
  const loadData = async () => {
    // 正在加载或已结束时，直接返回，避免重复请求
    if (loading.value || finished.value)
      return

    loading.value = true
    error.value = null

    try {
      const data = await fetchData(page.value, pageSize)
      // 返回条数小于 pageSize，视为最后一页
      if (data.length < pageSize) {
        finished.value = true
      }
      // 追加到现有列表
      list.value.push(...data)
      // 页码自增，供下一次请求使用
      page.value++
    }
    catch (err) {
      error.value = err
    }
    finally {
      loading.value = false
    }
  }

  /**
   * 刷新列表：重置分页状态并重新加载第一页
   */
  const refresh = async () => {
    page.value = 1
    finished.value = false
    list.value = []
    await loadData()
  }

  /**
   * 加载更多：请求下一页数据
   */
  const loadMore = async () => {
    await loadData()
  }

  // 组件挂载后自动触发首屏加载
  onMounted(() => {
    refresh()
  })

  return {
    list,
    loading,
    finished,
    error,
    refresh,
    loadMore,
  }
}
