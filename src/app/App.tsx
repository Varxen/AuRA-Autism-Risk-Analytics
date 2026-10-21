import { AuthDemoProvider } from './providers/AuthDemoProvider'
import { AppRouter } from './AppRouter'
import '../styles/entry.css'

export default function App() {
  return (
    <AuthDemoProvider>
      <AppRouter />
    </AuthDemoProvider>
  )
}
