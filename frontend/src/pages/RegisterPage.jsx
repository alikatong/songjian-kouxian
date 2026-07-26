// 注册页面
import React, { useState } from 'react'
import { authAPI } from '../api/client'
import useGameStore from '../stores/gameStore'

const RegisterPage = () => {
  const setAuth = useGameStore((state) => state.setAuth)

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // 处理注册提交
  const handleRegister = async (e) => {
    e.preventDefault()
    setError('')

    // 基础校验
    if (!username.trim() || !password || !confirmPassword) {
      setError('请填写所有字段')
      return
    }
    if (username.trim().length < 2) {
      setError('道号至少需要2个字符')
      return
    }
    if (password.length < 8) {
      setError('秘法口令至少需要8位')
      return
    }
    if (password !== confirmPassword) {
      setError('两次输入的秘法口令不一致')
      return
    }

    setLoading(true)
    try {
      // 调用注册接口
      const registerRes = await authAPI.register({ username: username.trim(), password })
      const { token, user } = registerRes.data
      setAuth(token, user)
      window.location.replace('/game')
    } catch (err) {
      const msg = err.response?.data?.error || '注册失败，请稍后重试'
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
          <p style={styles.subtitle}>开辟仙缘，踏上无尽修途</p>
        </div>

        {/* 注册表单 */}
        <form onSubmit={handleRegister} style={styles.form}>
          <div style={styles.fieldGroup}>
            <label style={styles.label}>道号</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="为自己取一个道号"
              style={styles.input}
              className="auth-input"
              autoComplete="username"
              maxLength={20}
            />
          </div>

          <div style={styles.fieldGroup}>
            <label style={styles.label}>秘法口令</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="设置秘法口令（至少8位）"
              style={styles.input}
              className="auth-input"
              autoComplete="new-password"
              maxLength={128}
            />
          </div>

          <div style={styles.fieldGroup}>
            <label style={styles.label}>确认口令</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="再次输入秘法口令"
              style={styles.input}
              className="auth-input"
              autoComplete="new-password"
              maxLength={128}
            />
          </div>

          {/* 错误提示 */}
          {error && <p style={styles.error}>{error}</p>}

          {/* 注册按钮 */}
          <button
            type="submit"
            disabled={loading}
            style={{
              ...styles.btn,
              ...(loading ? styles.btnDisabled : {}),
            }}
            className="auth-button"
          >
            {loading ? '开辟仙缘中...' : '踏入修仙界'}
          </button>
        </form>

        {/* 跳转登录 */}
        <p style={styles.footer}>
          已有道号？{' '}
          <a href="/login" style={styles.link}>
            返回登录
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
        .auth-input:focus { border-color: #d4af37 !important; box-shadow: 0 0 0 2px rgba(212,175,55,.18) !important; }
        .auth-button:hover:not(:disabled) { background: #dfbe6c !important; transform: translateY(-1px); }
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
    background: "linear-gradient(90deg, rgba(11,16,13,.82), rgba(11,16,13,.92)), url('/ink-mountains.svg') center/cover",
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
    marginBottom: '24px',
  },
  logo: {
    display: 'block',
    width: 'min(100%, 190px)',
    height: 'auto',
    margin: '-28px auto -10px',
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

export default RegisterPage
