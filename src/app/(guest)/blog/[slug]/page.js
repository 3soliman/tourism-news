import BlogPostPage from '@/views/BlogPostPage';
import { fetchPublicBlogPostBySlugServer } from '@/lib/server/blog';
import { getBlogPostMetaDescription, getBlogPostMetaTitle } from '@/utils/blogDisplay';

export async function generateMetadata({ params }) {
  const { slug } = await params;
  try {
    const post = await fetchPublicBlogPostBySlugServer(slug);
    if (!post) return { title: 'Article not found' };

    const title = getBlogPostMetaTitle(post, post.locale);
    const description = getBlogPostMetaDescription(post, post.locale).slice(0, 160);

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        type: 'article',
        publishedTime: post.publishedAt || undefined,
        images: post.featuredImage ? [{ url: post.featuredImage, alt: post.featuredImageAlt || post.title }] : []
      },
      alternates: {
        canonical: `/blog/${slug}`
      }
    };
  } catch {
    return { title: 'Blog article' };
  }
}

export default async function BlogPostRoute({ params }) {
  const { slug } = await params;
  let post = null;
  try {
    post = await fetchPublicBlogPostBySlugServer(slug);
  } catch {
    post = null;
  }

  return <BlogPostPage post={post} />;
}
