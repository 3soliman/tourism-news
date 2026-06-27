import BlogPage from '@/views/BlogPage';
import { fetchPublicBlogPostsPageServer } from '@/lib/server/blog';

export const metadata = {
  title: 'Blog',
  description: 'Travel guides, hotel tips, and stories from our team.'
};

export default async function BlogRoute() {
  let initialData = null;
  try {
    initialData = await fetchPublicBlogPostsPageServer({ page: 1, pageSize: 12 });
  } catch {
    initialData = null;
  }

  return <BlogPage initialData={initialData} />;
}
