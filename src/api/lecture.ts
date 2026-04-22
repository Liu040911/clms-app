import type {
  HotLectureListItem,
  IBackendPageResult,
  IClassroomItem,
  ICreateLectureApplyReq,
  ILectureInfo,
  ILectureCheckInQrCodeInfo,
  IUserLectureAppointmentItem,
  IUserLectureAppointmentQuery,
  ILectureRegistrationInfo,
  ILectureRegistrationReq,
  LectureTagListItem,
  ITeacherLectureItem,
  ITeacherLectureListQuery,
  LectureDetailInfo,
} from './types/lecture'
import { BASE_URL } from '@/api/types'
import { http } from '@/http/http'

const lectureDetailMapMock: Record<string, LectureDetailInfo> = {
  L001: {
    id: 'L001',
    title: 'AI 前沿技术讲座',
    category: '学术提升',
    speaker: '张一鸣（企业技术导师）',
    poster: '/static/images/default-avatar.png',
    content: '本次讲座将围绕 AI 工具在学习、简历优化、岗位分析和面试准备中的实践展开。\\n通过真实案例拆解，帮助同学建立从校园到职场的能力迁移路径。\\n讲座结束后提供现场问答与资料领取入口。',
    signupStartTime: '2026-04-02 09:00',
    signupEndTime: '2026-04-09 18:00',
    lectureStartTime: '2026-04-10 14:30',
    lectureEndTime: '2026-04-10 16:30',
    address: '创新楼 A301 报告厅',
    maxParticipants: 200,
    registeredCount: 136,
  },
  L002: {
    id: 'L002',
    title: '保研经验分享会',
    category: '近期热门',
    speaker: '李晨曦（2025 届保研学长）',
    poster: '/static/images/default-avatar.png',
    content: '围绕院校选择、夏令营准备、联系导师和材料打磨进行实战拆解。\\n重点分享时间线管理与面试高频问题。',
    signupStartTime: '2026-04-01 10:00',
    signupEndTime: '2026-04-07 20:00',
    lectureStartTime: '2026-04-08 19:00',
    lectureEndTime: '2026-04-08 21:00',
    address: '图书馆学术报告厅',
    maxParticipants: 160,
    registeredCount: 121,
  },
  L003: {
    id: 'L003',
    title: '校友求职公开课',
    category: '就业指导',
    speaker: '王晓宁（头部互联网校友）',
    poster: '/static/images/default-avatar.png',
    content: '聚焦春招秋招流程、岗位选择策略和简历投递优化。\\n涵盖面试复盘与常见坑位总结。',
    signupStartTime: '2026-04-03 09:00',
    signupEndTime: '2026-04-11 12:00',
    lectureStartTime: '2026-04-12 15:00',
    lectureEndTime: '2026-04-12 17:00',
    address: '教学楼 B201',
    maxParticipants: 180,
    registeredCount: 170,
  },
  L004: {
    id: 'L004',
    title: '科研立项方法论',
    category: '学术提升',
    speaker: '赵明哲（青年教师）',
    poster: '/static/images/default-avatar.png',
    content: '从选题、文献综述、研究设计到成果表达全流程讲解。\\n适合准备科研项目与竞赛的同学。',
    signupStartTime: '2026-04-05 08:30',
    signupEndTime: '2026-04-13 18:00',
    lectureStartTime: '2026-04-14 14:00',
    lectureEndTime: '2026-04-14 16:00',
    address: '创新楼 C105',
    maxParticipants: 120,
    registeredCount: 87,
  },
  L005: {
    id: 'L005',
    title: '面试实战训练营',
    category: '就业指导',
    speaker: '周岚（企业 HR 导师）',
    poster: '/static/images/default-avatar.png',
    content: '通过结构化面试、群面和行为面试三类题型进行模拟演练。\\n提供简历修改与答题反馈建议。',
    signupStartTime: '2026-04-06 09:00',
    signupEndTime: '2026-04-15 18:00',
    lectureStartTime: '2026-04-16 13:30',
    lectureEndTime: '2026-04-16 17:30',
    address: '就业指导中心 302',
    maxParticipants: 90,
    registeredCount: 90,
  },
  L006: {
    id: 'L006',
    title: '跨学科创新论坛',
    category: '综合素养',
    speaker: '陈可（跨学科项目负责人）',
    poster: '/static/images/default-avatar.png',
    content: '分享跨学科项目协作的组织方式、沟通机制与成果产出方法。\\n帮助同学建立复合型学习路径。',
    signupStartTime: '2026-04-07 09:00',
    signupEndTime: '2026-04-17 18:00',
    lectureStartTime: '2026-04-18 10:00',
    lectureEndTime: '2026-04-18 12:00',
    address: '大学生活动中心多功能厅',
    maxParticipants: 150,
    registeredCount: 72,
  },
}

function wait(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(() => resolve(), ms)
  })
}

/**
 * 获取近期热门讲座列表（真实接口）
 */
export function getRecentHotLectureList(query?: IHotLectureListQuery) {
  return http.get<HotLectureListItem[]>(`${BASE_URL}/lecture/hot/list`, query)
}

/**
 * 获取讲座标签列表（真实接口）
 */
export function getLectureTagList() {
  return http.get<LectureTagListItem[]>(`${BASE_URL}/lecture/tag/list`)
}

/**
 * 根据讲座 ID 获取讲座详情（Mock）
 */
export async function getLectureDetailById(lectureId: string) {
  await wait(250)
  const detail = lectureDetailMapMock[lectureId]
  if (!detail) {
    throw new Error('讲座不存在')
  }
  return detail
}

/**
 * 获取可选教室列表
 */
export function getClassroomList() {
  return http.get<IClassroomItem[]>(`${BASE_URL}/class/available/list`)
}

/**
 * 提交讲座申请
 */
export function createLectureApply(data: ICreateLectureApplyReq) {
  return http.post<void>(`${BASE_URL}/lecture/create`, data)
}

/**
 * 更新讲座申请
 */
export function updateLectureApply(lectureId: string, data: ICreateLectureApplyReq) {
  return http.post<void>(`${BASE_URL}/lecture/update`, data, { lectureId })
}

/**
 * 获取讲座详情（真实接口）
 */
export function getLectureInfoById(lectureId: string) {
  return http.get<ILectureInfo>(`${BASE_URL}/lecture/info`, { lectureId })
}

/**
 * 用户报名讲座
 */
export function registerLecture(data: ILectureRegistrationReq) {
  return http.post<ILectureRegistrationInfo>(`${BASE_URL}/user/registration/create`, data, undefined, undefined, {
    hideErrorToast: true,
    rejectOnBusinessError: true,
  })
}

/**
 * 用户取消讲座报名
 */
export function cancelLectureRegistration(data: ILectureRegistrationReq) {
  return http.post<ILectureRegistrationInfo>(`${BASE_URL}/user/registration/cancel`, data, undefined, undefined, {
    hideErrorToast: true,
    rejectOnBusinessError: true,
  })
}

/**
 * 分页获取我的预约讲座
 */
export function getUserLectureAppointmentList(query: IUserLectureAppointmentQuery) {
  return http.get<IBackendPageResult<IUserLectureAppointmentItem>>(`${BASE_URL}/user/registration/list`, query)
}

/**
 * 获取教师申请的讲座列表
 */
export function getTeacherLectureList(query: ITeacherLectureListQuery) {
  return http.get<IBackendPageResult<ITeacherLectureItem>>(`${BASE_URL}/lecture/list`, query)
}

/**
 * 删除讲座
 */
export function deleteLectureById(lectureId: string) {
  return http.post<void>(`${BASE_URL}/lecture/delete`, {}, { lectureId })
}

/**
 * 教师端获取讲座签到二维码
 */
export function getLectureCheckInQrCode(lectureId: string) {
  return http.get<ILectureCheckInQrCodeInfo>(`${BASE_URL}/lecture/check-in/qrcode`, { lectureId }, undefined, {
    hideErrorToast: true,
    rejectOnBusinessError: true,
  })
}

/**
 * 用户扫码讲座签到
 */
export function checkInLectureByQrCode(qrToken: string) {
  return http.post<ILectureRegistrationInfo>(`${BASE_URL}/user/registration/check-in/scan`, {}, { qrToken }, undefined, {
    hideErrorToast: true,
    rejectOnBusinessError: true,
  })
}

export interface IHotLectureListQuery {
  tagId?: string
  limit?: number
}
