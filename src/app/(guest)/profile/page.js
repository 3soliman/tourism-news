import MyProfilePage from '@/views/MyProfilePage';

export const metadata = {
  title: 'My profile',
  robots: { index: false, follow: false }
};

export default function ProfileRoute() {
  return <MyProfilePage />;
}
