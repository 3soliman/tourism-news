import ContactPageRoute from '@/views/ContactPageRoute';
import { BRAND } from '@/config/brand';

export const metadata = {
  title: 'Contact us',
  description: `Get in touch with ${BRAND.name} — bookings, support, and inquiries.`
};

export default function ContactRoute() {
  return <ContactPageRoute />;
}
