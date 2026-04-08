export interface HotLectureListItem {
  id: string
  title: string
  tag: string
  posterUrl: string
}

export interface LectureDetailInfo {
  id: string
  title: string
  category: string
  speaker: string
  poster: string
  content: string
  signupStartTime: string
  signupEndTime: string
  lectureStartTime: string
  lectureEndTime: string
  address: string
  maxParticipants: number
  registeredCount: number
  status?: string
}

export interface IClassroomItem {
  id: string
  location: string
  capacity: number
  status?: string
}

export interface IClassListQuery {
  location?: string
  status?: string
  page?: number
  size?: number
  sort?: string
  order?: string
}

export interface IBackendPageResult<T> {
  records: T[]
  total: number
  size: number
  current: number
}

export interface ICreateLectureApplyReq {
  title: string
  description: string
  coverImageUrl: string
  registrationStartsTime: string
  registrationEndsTime: string
  lectureStartsTime: string
  lectureEndsTime: string
  teacherId?: string
  classIds: string[]
}

export interface ITeacherLectureItem {
  id: string
  title: string
  description: string
  coverImageUrl: string
  teacherId: string
  registrationStartsTime: string
  registrationEndsTime: string
  lectureStartTime: string
  lectureEndTime: string
  remaining: number
  status: string
  classId?: string
  location?: string
  createTime?: string
  updateTime?: string
}

export interface ITeacherLectureListQuery {
  teacherId: string
  title?: string
  status?: string
  page?: number
  size?: number
  sort?: string
  order?: string
}

export interface ILectureInfo {
  id: string
  title: string
  description: string
  coverImageUrl: string
  teacherId?: string
  teacherName?: string
  registrationStartsTime: string
  registrationEndsTime: string
  lectureStartTime: string
  lectureEndTime: string
  remaining: number
  status: string
  classId?: string
  location?: string
  createTime?: string
  updateTime?: string
}
