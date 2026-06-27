import TrustPage from '@/views/TrustPage';

export const metadata = {
  title: 'Cancellation & refunds',
  description: 'Cancellation, modification, and refund policies for bookings.'
};

export default function CancellationPage() {
  return <TrustPage pageId="cancellation" />;
}
