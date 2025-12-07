import type { IAuthLoginRes, ICaptcha, IDoubleTokenRes, IUpdateInfo, IUpdatePassword, IUserInfoRes } from './types/login'
import { BASE_URL } from '@/api/types'
import { http } from '@/http/http'
/**
 * 登录表单
 */
export interface ILoginForm {
  credential: string
  password?: string
  code?: string
}

/**
 * 注册表单（与后端 AccountRegisterDTO 对应）
 */
export interface IRegisterForm {
  nickname: string
  phone: string
  verificationCode: string
  password: string
}

/**
 * 获取验证码
 * @returns ICaptcha 验证码
 */
export function getCode() {
  return http.get<ICaptcha>('/user/getCode')
}

/**
 * 获取手机验证码
 * @param phone 手机号
 */
export function getPhoneCode(phone: string) {
  return http.get<string>(`${BASE_URL}/auth/phone/code`, { phone })
}

/**
 * 获取邮箱验证码
 * @param email 邮箱地址
 */
export function getEmailCode(email: string) {
  return http.get<string>(`${BASE_URL}/auth/email/code`, { email })
}

/**
 * 验证验证码并获取重置密码令牌
 * @param credential 手机号或邮箱
 * @param code 验证码
 */
export function verifyCode(credential: string, code: string) {
  return http.post<string>(`${BASE_URL}/auth/verify-code`, null, { credential, code })
}

/**
 * 重置密码
 * @param stepToken 步骤令牌
 * @param newPassword 新密码
 */
export function resetPassword(stepToken: string, newPassword: string) {
  return http.post<void>(`${BASE_URL}/auth/reset-password`, null, { stepToken, newPassword })
}

/**
 * 用户登录
 * @param loginForm 登录表单
 * @returns token信息（accessToken, refreshToken, expires）
 */
export function login(loginForm: ILoginForm) {
  return http.post<IDoubleTokenRes>(`${BASE_URL}/auth/login`, loginForm)
}

/**
 * 用户注册
 * @param registerForm 注册表单
 * @returns token信息（与登录返回一致）
 */
export function register(registerForm: IRegisterForm) {
  return http.post<IDoubleTokenRes>(`${BASE_URL}/auth/register`, registerForm)
}

/**
 * 刷新token
 * @param refreshToken 刷新token
 */
export function refreshToken(refreshToken: string) {
  return http.get<IDoubleTokenRes>(`${BASE_URL}/auth/refreshToken`, { refreshToken })
}

/**
 * 获取用户信息
 */
export function getUserInfo() {
  return http.get<IUserInfoRes>(`${BASE_URL}/user/info`)
}

/**
 * 退出登录
 */
export function logout() {
  return http.get<void>(`${BASE_URL}/auth/logout`)
}

/**
 * 修改用户信息
 */
export function updateInfo(data: IUpdateInfo) {
  return http.post(`${BASE_URL}/user/updateInfo`, data)
}

/**
 * 修改用户密码
 */
export function updateUserPassword(data: IUpdatePassword) {
  return http.post(`${BASE_URL}/user/updatePassword`, data)
}

/**
 * 获取微信登录凭证
 * @returns Promise 包含微信登录凭证(code)
 */
export function getWxCode() {
  return new Promise<UniApp.LoginRes>((resolve, reject) => {
    uni.login({
      provider: 'weixin',
      success: res => resolve(res),
      fail: err => reject(new Error(err)),
    })
  })
}

/**
 * 微信登录
 * @param params 微信登录参数，包含code
 * @returns Promise 包含登录结果
 */
export function wxLogin(data: { code: string }) {
  return http.post<IAuthLoginRes>(`${BASE_URL}/auth/wxLogin`, data)
}
