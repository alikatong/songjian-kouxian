import { useEffect } from 'react'
import { authAPI } from './api/client'
import useGameStore from './stores/gameStore'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import GamePage from './pages/GamePage'
import Loading from './components/Loading'

function redirect(path) {
  if (window.location.pathname !== path) window.location.replace(path)
  return null
}

function App() {
  const user = useGameStore((state) => state.user)
  const sessionChecked = useGameStore((state) => state.sessionChecked)
  const setAuth = useGameStore((state) => state.setAuth)
  const logout = useGameStore((state) => state.logout)

  useEffect(() => {
    let active = true
    authAPI.session()
      .then((response) => { if (active) setAuth(response.data.user) })
      .catch(() => { if (active) logout() })
    return () => { active = false }
  }, [logout, setAuth])

  if (!sessionChecked) return <Loading />
  switch (window.location.pathname) {
    case '/login': return user ? redirect('/game') : <LoginPage />
    case '/register': return user ? redirect('/game') : <RegisterPage />
    case '/game': return user ? <GamePage /> : redirect('/login')
    case '/': return redirect(user ? '/game' : '/login')
    default: return redirect('/')
  }
}

export default App
