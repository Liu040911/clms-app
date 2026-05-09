import type { IChatMessage, IChatSendReq, IChatSendRes, IChatSession } from './types/chat'
import { BASE_URL } from '@/api/types'
import { http } from '@/http/http'

export function sendChatMessage(data: IChatSendReq) {
  return http.post<IChatSendRes>(`${BASE_URL}/chat/send`, data)
}

export function getChatSessionList() {
  return http.get<IChatSession[]>(`${BASE_URL}/chat/sessions`)
}

export function getChatSessionMessages(sessionId: string) {
  return http.get<IChatMessage[]>(`${BASE_URL}/chat/sessions/messages`, { sessionId })
}

export function deleteChatSession(sessionId: string) {
  return http.post<void>(`${BASE_URL}/chat/sessions/delete`, null, { sessionId })
}
