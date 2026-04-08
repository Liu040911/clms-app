import { defineStore } from 'pinia'
import { ref } from 'vue'
import { http } from '@/http/http'

interface IMySubPageItem {
  title: string
  icon?: string
  url: string
  disabled?: boolean
}

interface IPageConfig {
  my?: IMySubPageItem[]
}

interface IAppConfig {
  pageConfig?: IPageConfig
  [key: string]: any
}

export const useAppStatus = defineStore(
  'appStatus',
  () => {
    const config = ref<IAppConfig | null>(null)

    const setConfig = (val: IAppConfig) => {
      config.value = val
    }

    const getConfig = () => {
      return config.value
    }

    const clearConfig = () => {
      config.value = null
    }

    const fetchConfig = async () => {
      const res = await http.get<any>('/app/config/get')
      const data = res?.data || res
      setConfig(data)
      return data
    }

    return {
      config,
      setConfig,
      getConfig,
      clearConfig,
      fetchConfig,
    }
  },
  {
    persist: true,
  },
)
