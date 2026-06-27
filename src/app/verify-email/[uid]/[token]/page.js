import VerifyEmailPage from '@/views/VerifyEmailPage';

export const metadata = {
  title: 'Verify email',
  robots: { index: false, follow: false }
};

export default function VerifyEmailRoute() {
  return <VerifyEmailPage />;
}
