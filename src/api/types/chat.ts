export interface IChatMessage {
  role: 'user' | 'assistant'
  content: string
  createTime?: string
}

export interface IChatSession {
  id: string
  title: string
  createTime: string
  updateTime: string
}

export interface IChatSendReq {
  sessionId?: string
  message: string
}

export interface IChatSendRes {
  sessionId: string
  reply: string
}
