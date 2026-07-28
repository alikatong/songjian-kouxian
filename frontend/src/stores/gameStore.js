// Zustand 全局状态管理
import { create } from 'zustand'

/**
 * 游戏状态 Store
 * 身份由 HttpOnly 会话 Cookie 保存，前端只保留当前页面所需的用户摘要。
 */
const useGameStore = create((set) => ({
  // 用户信息 { id, username }
  user: null,
  // 页面启动时先向服务端确认 HttpOnly 会话，避免信任本地持久化状态。
  sessionChecked: false,
  // 完整角色数据
  character: null,

  /** @param {{ id: number, username: string }} user */
  setAuth: (user) => set({ user, sessionChecked: true }),
  markSessionChecked: () => set({ sessionChecked: true }),

  /** @param {object} char */
  setCharacter: (char) => set({ character: char }),

  /** 登出：仅清理内存状态；服务端负责销毁 HttpOnly 会话。 */
  logout: () => set({ user: null, character: null, sessionChecked: true }),
}))

export default useGameStore
