import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Markdown } from "@/lib/contentsathi/Markdown.tsx";
import { formatDate, readingMinutes } from "@/lib/contentsathi/format.ts";
import { excerpt, getPublished, listPublished } from "@/lib/contentsathi/posts.ts";
import { site } from "@/lib/site";

export async function generateStaticParams() {
  return (await listPublished()).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPublished(slug);
  if (!post) return { title: "Not found", robots: { index: false } };
  const description = excerpt(post, 160);
  return {
    title: post.metaTitle || post.title,
    description,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      type: "article",
      title: post.metaTitle || post.title,
      description,
      publishedTime: post.publishedAt ?? undefined,
      modifiedTime: post.updatedAt,
      ...(post.featuredImage ? { images: [{ url: post.featuredImage }] } : {}),
    },
  };
}

export default async function Post({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPublished(slug);
  if (!post) notFound();

  const article = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
    author: { "@type": "Person", name: site.name },
    publisher: { "@id": `${site.url}/#org` },
    mainEntityOfPage: `${site.url}/blog/${post.slug}`,
    ...(post.featuredImage ? { image: post.featuredImage } : {}),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(article).replace(/</g, "\\u003c") }} />
      <article data-surface="paper">
        <div className="mx-auto max-w-3xl px-5 pb-20 pt-14 sm:px-8 md:pb-28 md:pt-20">
          <Link href="/blog" className="font-semibold text-maroon hover:underline">← Journal</Link>
          <p className="kicker mt-8">{post.category}</p>
          <h1 className="display rise mt-3 text-[clamp(2.2rem,5.5vw,3.8rem)] !leading-[1.04]">{post.title}</h1>
          <p className="mt-5 text-sm font-bold text-ink/60">{formatDate(post.publishedAt)} · {readingMinutes(post.body)} min read</p>

          {post.featuredImage && (
            <div className="relative mt-10 aspect-[16/9] overflow-hidden rounded-sm border border-line">
              <Image src={post.featuredImage} alt="" fill unoptimized priority sizes="(min-width: 768px) 48rem, 100vw" className="object-cover" />
            </div>
          )}

          <Markdown source={post.body} className="post-body mt-12" />

          {post.tags.length > 0 && (
            <ul className="mt-14 flex flex-wrap gap-2 border-t-2 border-line pt-8" aria-label="Tags">
              {post.tags.map((t) => <li key={t} className="chip">{t}</li>)}
            </ul>
          )}
        </div>
      </article>

      <section data-surface="stone">
        <div className="mx-auto max-w-[1280px] px-5 py-16 text-center sm:px-8 md:py-24">
          <p className="display mx-auto max-w-2xl text-[clamp(1.8rem,4.5vw,3rem)]">Ready to try a class?</p>
          <Link href="/contact" className="btn btn-primary mt-8">Book a trial class</Link>
        </div>
      </section>
    </>
  );
}
