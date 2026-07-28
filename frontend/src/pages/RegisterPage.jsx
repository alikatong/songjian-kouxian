import { useState } from 'react'
import { authAPI } from '../api/client'
import AuthPage from '../components/AuthPage'
import useGameStore from '../stores/gameStore'

function RegisterPage() {
  const setAuth = useGameStore((state) => state.setAuth)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleRegister = async (event) => {
    event.preventDefault()
    setError('')

    if (!username.trim() || !password || !confirmPassword) {
      setError('请填写所有字段')
      return
    }
    if (username.trim().length < 2) {
      setError('道号至少需要 2 个字符')
      return
    }
    if (password.length < 8) {
      setError('秘法口令至少需要 8 位')
      return
    }
    if (password !== confirmPassword) {
      setError('两次输入的秘法口令不一致')
      return
    }

    setLoading(true)
    try {
      const response = await authAPI.register({ username: username.trim(), password })
      const { user } = response.data
      setPassword('')
      setConfirmPassword('')
      setAuth(user)
      window.location.replace('/game')
    } catch (requestError) {
      setError(requestError.response?.data?.error || '开辟仙缘失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthPage
      mode="register"
      username={username}
      setUsername={setUsername}
      password={password}
      setPassword={setPassword}
      confirmPassword={confirmPassword}
      setConfirmPassword={setConfirmPassword}
      error={error}
      loading={loading}
      onSubmit={handleRegister}
    />
  )
}

export default RegisterPage
