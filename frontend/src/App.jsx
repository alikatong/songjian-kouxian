import useGameStore from './stores/gameStore'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import GamePage from './pages/GamePage'

function redirect(path) {
  if (window.location.pathname !== path) window.location.replace(path)
  return null
}

function App() {
  const token = useGameStore((state) => state.token)
  switch (window.location.pathname) {
    case '/login': return token ? redirect('/game') : <LoginPage />
    case '/register': return token ? redirect('/game') : <RegisterPage />
    case '/game': return token ? <GamePage /> : redirect('/login')
    case '/': return redirect(token ? '/game' : '/login')
    default: return redirect('/')
  }
}

export default App
