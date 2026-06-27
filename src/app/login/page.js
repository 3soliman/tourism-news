import LoginPage from '@/views/LoginPage';

export const metadata = {
  title: 'Sign in',
  robots: { index: false, follow: false }
};

export default function LoginRoute() {
  return <LoginPage />;
}
