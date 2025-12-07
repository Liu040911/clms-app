<template>
  <view class="min-h-screen bg-gray-100">
    <view class="bg-white px-40rpx py-40rpx">
      <view class="mb-20rpx text-center text-40rpx text-gray-900 font-bold">
        {{ title }}
      </view>
      <view class="mb-40rpx text-center text-24rpx text-gray-400">
        更新时间：{{ updateTime }}
      </view>

      <view class="text-28rpx text-gray-600 leading-relaxed">
        <rich-text :nodes="content" />
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'

const title = ref('')
const updateTime = ref('2025-12-01')
const content = ref('')

onMounted(() => {
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1] as any
  const type = currentPage.route?.query?.type || 'user'

  if (type === 'user') {
    title.value = '用户协议'
    content.value = getUserAgreement()
  }
  else {
    title.value = '隐私政策'
    content.value = getPrivacyPolicy()
  }
})

function getUserAgreement() {
  return `
    <h2>用户协议</h2>
    <p>欢迎使用 CLMS 系统。请您仔细阅读以下条款：</p>
    
    <h3>1. 服务条款的接受</h3>
    <p>您使用本系统即表示您已阅读、理解并同意接受本协议的所有内容。</p>
    
    <h3>2. 用户账号</h3>
    <p>2.1 您应当提供真实、准确、完整的注册信息。</p>
    <p>2.2 您应当妥善保管您的账号和密码。</p>
    
    <h3>3. 用户行为规范</h3>
    <p>3.1 您不得利用本系统从事违法违规活动。</p>
    <p>3.2 您应遵守相关法律法规及本协议的约定。</p>
    
    <h3>4. 知识产权</h3>
    <p>本系统的所有内容，包括但不限于文字、图片、软件等，其知识产权归我们所有。</p>
    
    <h3>5. 免责声明</h3>
    <p>我们不对因不可抗力或第三方原因导致的服务中断承担责任。</p>
  `
}

function getPrivacyPolicy() {
  return `
    <h2>隐私政策</h2>
    <p>我们非常重视您的隐私保护，特制定本隐私政策：</p>
    
    <h3>1. 信息收集</h3>
    <p>1.1 我们可能收集您的个人信息，包括但不限于姓名、手机号、邮箱等。</p>
    <p>1.2 我们可能收集您的设备信息、日志信息等。</p>
    
    <h3>2. 信息使用</h3>
    <p>2.1 我们会将收集的信息用于提供服务、改进产品等。</p>
    <p>2.2 未经您的同意，我们不会向第三方提供您的个人信息。</p>
    
    <h3>3. 信息存储</h3>
    <p>我们会采取合理的安全措施保护您的个人信息。</p>
    
    <h3>4. 信息安全</h3>
    <p>我们会采用行业标准的安全技术和程序保护您的个人信息。</p>
    
    <h3>5. 您的权利</h3>
    <p>您有权访问、更正、删除您的个人信息。</p>
  `
}
</script>
