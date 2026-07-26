// 登录页面
import React, { useState } from 'react'
import { authAPI } from '../api/client'
import useGameStore from '../stores/gameStore'

const LoginPage = () => {
  const setAuth = useGameStore((state) => state.setAuth)

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // 处理登录提交
  const handleLogin = async (e) => {
    e.preventDefault()
    if (!username.trim() || !password) {
      setError('请填写用户名和密码')
      return
    }
    setError('')
    setLoading(true)
    try {
      const res = await authAPI.login({ username: username.trim(), password })
      const { token, user } = res.data
      // 存入 zustand store（同时持久化到 localStorage）
      setAuth(token, user)
      window.location.replace('/game')
    } catch (err) {
      const msg = err.response?.data?.error || '登录失败，请检查用户名和密码'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.page}>
      {/* 背景装饰 */}
      <div style={styles.bg}></div>

      <div style={styles.card}>
        {/* 标题 */}
        <div style={styles.titleWrapper}>
          <img src="/songjian-logo-v2.png" alt="松间叩仙" style={styles.logo} />
          <p style={styles.subtitle}>踏入修仙之途，问道苍穹之上</p>
        </div>

        {/* 登录表单 */}
        <form onSubmit={handleLogin} style={styles.form}>
          <div style={styles.fieldGroup}>
            <label style={styles.label}>道号</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="输入你的道号"
              style={styles.input}
              className="auth-input"
              autoComplete="username"
              maxLength={20}
            />
          </div>

          <div style={styles.fieldGroup}>
            <label style={styles.label}>秘法</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="输入秘法口令"
              style={styles.input}
              className="auth-input"
              autoComplete="current-password"
              maxLength={128}
            />
          </div>

          {/* 错误提示 */}
          {error && <p style={styles.error}>{error}</p>}

          {/* 登录按钮 */}
          <button
            type="submit"
            disabled={loading}
            style={{
              ...styles.btn,
              ...(loading ? styles.btnDisabled : {}),
            }}
            className="auth-button"
          >
            {loading ? '登录中...' : '踏入修仙路'}
          </button>
        </form>

        {/* 跳转注册 */}
        <p style={styles.footer}>
          尚未踏入修仙界？{' '}
          <a href="/register" style={styles.link}>
            立即入道
          </a>
        </p>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes textGlow {
          0% { text-shadow: 0 0 8px #8a7020; }
          50% { text-shadow: 0 0 20px #d4af37, 0 0 40px #8a7020; }
          100% { text-shadow: 0 0 8px #8a7020; }
        }
        .auth-input:focus {
          border-color: #d4af37 !important;
          box-shadow: 0 0 0 2px rgba(212, 175, 55, 0.2) !important;
        }
        .auth-button:hover:not(:disabled) {
          background: linear-gradient(135deg, #e8c84a, #b8961c) !important;
          box-shadow: 0 0 20px rgba(212, 175, 55, 0.5) !important;
          transform: translateY(-1px);
        }
      `}</style>
    </div>
  )
}

const styles = {
  page: {
    minHeight: '100vh',
    backgroundColor: '#101412',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    position: 'relative',
    overflow: 'hidden',
  },
  bg: {
    position: 'absolute',
    inset: 0,
    background: "linear-gradient(90deg, rgba(11,16,13,.78), rgba(11,16,13,.9)), url('/ink-mountains.svg') center/cover",
    pointerEvents: 'none',
  },
  card: {
    width: '100%',
    maxWidth: '400px',
    backgroundColor: 'rgba(24, 32, 27, .94)',
    border: '1px solid #596057',
    borderTop: '3px solid #b9472f',
    borderRadius: '6px',
    padding: '40px 32px',
    animation: 'fadeIn 0.6s ease-out',
    position: 'relative',
    zIndex: 1,
    boxShadow: '0 0 40px rgba(0,0,0,0.5), 0 0 80px rgba(212, 175, 55, 0.03)',
  },
  titleWrapper: {
    textAlign: 'center',
    marginBottom: '28px',
  },
  logo: {
    display: 'block',
    width: 'min(100%, 220px)',
    height: 'auto',
    margin: '-24px auto -12px',
    filter: 'drop-shadow(0 8px 18px rgba(0, 0, 0, .38))',
  },
  subtitle: {
    fontSize: '13px',
    color: '#8b949e',
    letterSpacing: '2px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  label: {
    fontSize: '13px',
    color: '#d4af37',
    letterSpacing: '2px',
  },
  input: {
    backgroundColor: '#21262d',
    border: '1px solid #30363d',
    borderRadius: '6px',
    padding: '12px 14px',
    color: '#e6e1dc',
    fontSize: '15px',
    width: '100%',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  },
  error: {
    color: '#f85149',
    fontSize: '13px',
    textAlign: 'center',
    padding: '8px',
    backgroundColor: 'rgba(248, 81, 73, 0.1)',
    borderRadius: '6px',
    border: '1px solid rgba(248, 81, 73, 0.2)',
  },
  btn: {
    marginTop: '4px',
    padding: '14px',
    background: 'linear-gradient(135deg, #d4af37, #a07c20)',
    color: '#0d1117',
    borderRadius: '6px',
    fontSize: '16px',
    fontWeight: 'bold',
    letterSpacing: '4px',
    fontFamily: '"仿宋", "FangSong", "楷体", serif',
    transition: 'all 0.2s',
    cursor: 'pointer',
  },
  btnDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
  footer: {
    textAlign: 'center',
    marginTop: '24px',
    fontSize: '13px',
    color: '#8b949e',
  },
  link: {
    color: '#d4af37',
    textDecoration: 'none',
  },
}

export default LoginPage
