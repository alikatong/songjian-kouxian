import { useState } from 'react'
import { authAPI } from '../api/client'
import AuthPage from '../components/AuthPage'
import useGameStore from '../stores/gameStore'

function LoginPage() {
  const setAuth = useGameStore((state) => state.setAuth)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (event) => {
    event.preventDefault()
    if (!username.trim() || !password) {
      setError('请填写道号和秘法口令')
      return
    }

    setError('')
    setLoading(true)
    try {
      const response = await authAPI.login({ username: username.trim(), password })
      const { user } = response.data
      setPassword('')
      setAuth(user)
      window.location.replace('/game')
    } catch (requestError) {
      setError(requestError.response?.data?.error || '登录失败，请检查道号和秘法口令')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthPage
      mode="login"
      username={username}
      setUsername={setUsername}
      password={password}
      setPassword={setPassword}
      error={error}
      loading={loading}
      onSubmit={handleLogin}
    />
  )
}

export default LoginPage
