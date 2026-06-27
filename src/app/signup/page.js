import SignupPage from '@/views/SignupPage';

export const metadata = {
  title: 'Create account',
  robots: { index: false, follow: false }
};

export default function SignupRoute() {
  return <SignupPage />;
}
