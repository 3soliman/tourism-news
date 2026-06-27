import MyBookingsPage from '@/views/MyBookingsPage';

export const metadata = {
  title: 'My trips',
  robots: { index: false, follow: false }
};

export default function MyBookingsRoute() {
  return <MyBookingsPage />;
}
