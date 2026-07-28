import { Eye, EyeOff, LockKeyhole, Sparkles, UserRound } from 'lucide-react'
import { useState } from 'react'
import './AuthPage.css'

function AuthPage({
  mode,
  username,
  setUsername,
  password,
  setPassword,
  confirmPassword,
  setConfirmPassword,
  error,
  loading,
  onSubmit,
}) {
  const [passwordVisible, setPasswordVisible] = useState(false)
  const isRegister = mode === 'register'

  return (
    <main className="auth-page">
      <div className="auth-backdrop" aria-hidden="true" />
      <div className="auth-layout">
        <section className="auth-story" aria-label="松间叩仙介绍">
          <div className="auth-story-brand">
            <img src="/songjian-logo-v2.png" alt="松间叩仙" />
            <span>一念入山，百年问道</span>
          </div>
          <div className="auth-story-copy">
            <span className="auth-kicker">MOUNTAIN · DAO · DESTINY</span>
            <h2>在松风与月色之间，<em>落下一子。</em></h2>
            <p>从凡人起步，修功法、炼器物、游山河。每一次选择，都将写进你的道途。</p>
          </div>
          <div className="auth-feature-list">
            <span><Sparkles size={15} />灵气自然增长，闭关也有所得</span>
            <span><UserRound size={15} />随机出身，形成独一无二的命数</span>
            <span><LockKeyhole size={15} />轻量存档，随时回到你的洞府</span>
          </div>
        </section>

        <section className="auth-card">
          <div className="auth-card-topline">
            <span className="auth-kicker">{isRegister ? 'BEGIN YOUR JOURNEY' : 'WELCOME BACK, CULTIVATOR'}</span>
            <span className="auth-step">{isRegister ? '01 / 01' : '道友请'}</span>
          </div>
          <div className="auth-mobile-brand">
            <img src="/songjian-logo-v2.png" alt="松间叩仙" />
          </div>
          <h1>{isRegister ? '立下道号' : '踏入修仙路'}</h1>
          <p className="auth-description">
            {isRegister ? '开辟你的仙缘，之后便可在山河之间自由游历。' : '欢迎回到洞府，今日的灵气正在等你收取。'}
          </p>

          <form className="auth-form" onSubmit={onSubmit}>
            <label className="auth-field">
              <span>道号</span>
              <div className="auth-input-wrap">
                <UserRound size={17} aria-hidden="true" />
                <input
                  type="text"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  placeholder={isRegister ? '为自己取一个道号' : '输入你的道号'}
                  autoComplete="username"
                  maxLength={20}
                />
              </div>
              {isRegister && <small>2-20 个字符，进入游戏后可创建角色</small>}
            </label>

            <label className="auth-field">
              <span>{isRegister ? '秘法口令' : '秘法'}</span>
              <div className="auth-input-wrap">
                <LockKeyhole size={17} aria-hidden="true" />
                <input
                  type={passwordVisible ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder={isRegister ? '至少 8 位口令' : '输入秘法口令'}
                  autoComplete={isRegister ? 'new-password' : 'current-password'}
                  maxLength={128}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setPasswordVisible((visible) => !visible)}
                  aria-label={passwordVisible ? '隐藏秘法口令' : '显示秘法口令'}
                >
                  {passwordVisible ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </label>

            {isRegister && (
              <label className="auth-field">
                <span>确认口令</span>
                <div className="auth-input-wrap">
                  <LockKeyhole size={17} aria-hidden="true" />
                  <input
                    type={passwordVisible ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder="再次输入秘法口令"
                    autoComplete="new-password"
                    maxLength={128}
                  />
                </div>
              </label>
            )}

            {error && <p className="auth-error" role="alert">{error}</p>}

            <button className="auth-submit" type="submit" disabled={loading}>
              <span>{loading ? (isRegister ? '开辟仙缘中…' : '正在入定…') : (isRegister ? '踏入修仙界' : '踏入修仙路')}</span>
              <Sparkles size={17} aria-hidden="true" />
            </button>
          </form>

          <div className="auth-divider"><span>松间 · 云深不知处</span></div>
          <p className="auth-footer">
            {isRegister ? '已有道号？' : '尚未踏入修仙界？'}{' '}
            <a href={isRegister ? '/login' : '/register'}>{isRegister ? '返回登录' : '立即入道'}</a>
          </p>
        </section>
      </div>
      <p className="auth-page-note">WEB REALM · 仅支持 Web 端体验</p>
    </main>
  )
}

export default AuthPage
