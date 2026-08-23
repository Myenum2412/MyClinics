"use client"

import { useState } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { articleHref, ARTICLES } from "@/lib/blog-posts"
import { CATALOG } from "@/lib/blog-catalog"
import { resolveCatalogArticle } from "@/lib/blog-content"
import { Bookmark, Clock, ArrowRight } from "lucide-react"

const featured = ARTICLES[0]
const posts = [
  ...ARTICLES.slice(1).map((a) => ({ ...a })),
  ...CATALOG.map((c) => {
    const r = resolveCatalogArticle(c)
    return {
      category: c.cluster,
      title: c.title,
      excerpt: c.excerpt,
      image: `/blog/cover/${c.slug}`,
      author: r.author,
      date: r.date,
      readTime: r.readTime,
    }
  }),
]

const categories = [
  "All",
  "Guides",
  "Clinic Software",
  "Appointments",
  "Records",
  "Prescriptions",
  "Billing",
  "WhatsApp",
  "AI",
  "Organic Social",
  "Specialties",
  "Buying Guide",
  "Product",
  "Engineering",
  "Security",
  "Telehealth",
] as const

export default function BlogBlock() {
  const [active, setActive] = useState<(typeof categories)[number]>("All")

  const visible =
    active === "All" ? posts : posts.filter((p) => p.category === active)

  return (
    <section className="flex min-h-svh w-full justify-center bg-background px-6 py-16 text-foreground">
      <div className="mx-auto w-full max-w-6xl">
        <div className="mb-10 flex flex-col gap-3">
          <Badge variant="secondary" className="w-fit">
            <Bookmark data-icon="inline-start" />
            The My Clinics Blog
          </Badge>
          <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
            Insights on running a modern clinic
          </h1>
          <p className="max-w-2xl text-muted-foreground">
            Product updates, engineering deep dives, and practical guides on
            appointments, records, prescriptions and billing â€” from the team
            building My Clinics.
          </p>
        </div>

        <Card className="group mb-12 overflow-hidden p-0 md:grid md:grid-cols-2">
          <div className="relative aspect-video overflow-hidden bg-muted md:aspect-auto md:h-full">
            <img
              src={featured.image}
              alt={featured.title}
              className="size-full object-cover grayscale transition-all duration-300 group-hover:grayscale-0"
            />
            <span className="absolute top-4 right-4 flex items-center gap-1 rounded-4xl bg-background/85 px-2 py-0.5 text-xs font-medium text-foreground backdrop-blur-sm">
              <Clock className="size-3" />
              {featured.readTime}
            </span>
          </div>
          <div className="flex flex-col justify-center gap-4 p-6 sm:p-8">
            <Badge className="w-fit">{featured.category}</Badge>
            <h2 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
              {featured.title}
            </h2>
            <p className="text-muted-foreground">{featured.excerpt}</p>
            <div className="flex items-center gap-3">
              <Avatar className="size-9 border border-border">
                <AvatarImage
                  src={`https://i.pravatar.cc/150?img=${featured.author.img}`}
                  alt={featured.author.name}
                  className="grayscale"
                />
                <AvatarFallback>{featured.author.initials}</AvatarFallback>
              </Avatar>
              <div className="text-sm">
                <p className="font-medium">{featured.author.name}</p>
                <p className="text-muted-foreground">{featured.date}</p>
              </div>
            </div>
            <div>
              <Button
                render={<a href={articleHref(featured.title)} />}
                nativeButton={false}
              >
                Read Article
                <ArrowRight data-icon="inline-end" />
              </Button>
            </div>
          </div>
        </Card>

        <div className="mb-8 flex flex-wrap gap-2">
          {categories.map((category) => {
            const isActive = active === category
            return (
              <button
                key={category}
                type="button"
                onClick={() => setActive(category)}
                aria-pressed={isActive}
                className={cn(
                  "rounded-md border px-4 py-1.5 text-sm font-medium transition-colors",
                  isActive
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {category}
              </button>
            )
          })}
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3">
          {visible.map((post) => (
            <Card
              key={post.title}
              className="group flex h-full flex-col overflow-hidden p-0 transition-shadow hover:shadow-md"
            >
              <div className="relative aspect-video overflow-hidden bg-muted">
                <img
                  src={post.image}
                  alt={post.title}
                  className="size-full object-cover grayscale transition-all duration-300 group-hover:grayscale-0"
                />
                <span className="absolute top-3 right-3 flex items-center gap-1 rounded-4xl bg-background/85 px-2 py-0.5 text-[11px] font-medium text-foreground backdrop-blur-sm">
                  <Clock className="size-3" />
                  {post.readTime}
                </span>
              </div>
              <CardHeader className="gap-2 px-5 pt-5">
                <Badge variant="secondary" className="w-fit">
                  {post.category}
                </Badge>
                <CardTitle className="text-lg leading-snug">
                  <a
                    href={articleHref(post.title)}
                    className="transition-colors group-hover:text-primary"
                  >
                    {post.title}
                  </a>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 px-5">
                <p className="text-sm text-muted-foreground">{post.excerpt}</p>
              </CardContent>
              <CardFooter className="items-center justify-between gap-3 px-5 pb-5">
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar className="size-8 border border-border">
                    <AvatarImage
                      src={`https://i.pravatar.cc/150?img=${post.author.img}`}
                      alt={post.author.name}
                      className="grayscale"
                    />
                    <AvatarFallback className="text-xs">
                      {post.author.initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 text-xs">
                    <p className="truncate font-medium text-foreground">
                      {post.author.name}
                    </p>
                    <p className="text-muted-foreground">{post.date}</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  render={<a href={articleHref(post.title)} />}
                  nativeButton={false}
                >
                  Read Article
                  <ArrowRight data-icon="inline-end" />
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
