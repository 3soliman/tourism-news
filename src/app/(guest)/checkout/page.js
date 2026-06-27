import CheckoutPage from '@/views/CheckoutPage';

export const metadata = {
  title: 'Checkout',
  robots: { index: false, follow: false }
};

export default function CheckoutRoute() {
  return <CheckoutPage />;
}
