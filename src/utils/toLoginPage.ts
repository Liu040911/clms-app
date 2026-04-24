import { getLastPage } from '@/utils'
import { debounce } from '@/utils/debounce'

interface ToLoginPageOptions {
  /**
   * 跳转模式, uni.navigateTo | uni.reLaunch
   */
  mode?: 'navigateTo' | 'reLaunch'
  /**
   * 查询参数
   * @example '?redirect=/pages/home/index'
   */
  queryString?: string
}

// 登录页路径
const LOGIN_PAGE = '/pages-sub/auth/login/index'

function normalizeQueryString(queryString?: string) {
  if (!queryString) {
    return ''
  }
  return queryString.startsWith('?') ? queryString : `?${queryString}`
}

function h5HardRedirect(url: string) {
  // #ifdef H5
  const base = (import.meta.env.VITE_APP_PUBLIC_BASE || '/').replace(/\/$/, '')
  const origin = window.location.origin
  const target = `${origin}${base}${url}`
  window.location.replace(target)
  // #endif
}

function safeUniNavigate(url: string, mode: 'navigateTo' | 'reLaunch') {
  try {
    if (mode === 'navigateTo') {
      uni.navigateTo({
        url,
        fail() {
          uni.redirectTo({
            url,
            fail() {
              uni.reLaunch({
                url,
                fail() {
                  h5HardRedirect(url)
                },
              })
            },
          })
        },
      })
      return
    }

    uni.reLaunch({
      url,
      fail() {
        uni.redirectTo({
          url,
          fail() {
            uni.navigateTo({
              url,
              fail() {
                h5HardRedirect(url)
              },
            })
          },
        })
      },
    })
  }
  catch {
    h5HardRedirect(url)
  }
}

/**
 * 跳转到登录页, 带防抖处理
 *
 * 如果要立即跳转，不做延时，可以使用 `toLoginPage.flush()` 方法
 */
export const toLoginPage = debounce((options: ToLoginPageOptions = {}) => {
  const { mode = 'reLaunch', queryString = '' } = options

  const url = `${LOGIN_PAGE}${normalizeQueryString(queryString)}`

  // 获取当前页面路径
  const currentPage = getLastPage()
  const currentPath = currentPage?.route ? `/${currentPage.route}` : ''
  // 如果已经在登录页，则不跳转
  if (currentPath === LOGIN_PAGE) {
    return
  }

  safeUniNavigate(url, mode)
}, 500)
