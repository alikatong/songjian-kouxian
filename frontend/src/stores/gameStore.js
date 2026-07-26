// Zustand 全局状态管理
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * 游戏状态 Store
 * 使用 persist 中间件将 token 和 user 持久化到 localStorage
 */
const useGameStore = create(
  persist(
    (set) => ({
      // JWT 认证令牌
      token: null,
      // 用户信息 { id, username }
      user: null,
      // 完整角色数据
      character: null,

      /**
       * 设置认证信息（登录/注册成功后调用）
       * @param {string} token - JWT token
       * @param {{ id: number, username: string }} user - 用户信息
       */
      setAuth: (token, user) => set({ token, user }),

      /**
       * 更新角色数据
       * @param {object} char - 角色完整数据
       */
      setCharacter: (char) => set({ character: char }),

      /**
       * 登出：清除所有状态
       */
      logout: () => set({ token: null, user: null, character: null }),
    }),
    {
      name: 'xxgame-storage', // localStorage key
      // 只持久化 token 和 user，character 每次重新获取
      partialize: (state) => ({
        token: state.token,
        user: state.user,
      }),
    }
  )
)

export default useGameStore
