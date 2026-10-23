import { LoginCard } from '../../components/auth/LoginCard'

export function LoginPage({ mode = 'login' }: { mode?: 'login' | 'register' }) {
  return <LoginCard key={mode} mode={mode} />
}
