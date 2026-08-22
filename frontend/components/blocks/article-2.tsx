"use client"

import * as React from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { ARTICLES } from "@/lib/blog-posts"
import { Clock } from "lucide-react"

export default function ArticleBlock({ slug }: { slug?: string }) {
  const article =
    (slug
      ? ARTICLES.find(
          (a) => a.slug === slug || slug.endsWith(`/${a.slug}`)
        )
      : undefined) ?? ARTICLES[0]
  const sections = article.sections

  const [active, setActive] = React.useState(sections[0].id)
  const scrollRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    setActive(sections[0].id)
    const root = scrollRef.current
    if (!root) return

    const update = () => {
      const rootTop = root.getBoundingClientRect().top
      const threshold = root.clientHeight * 0.3
      let current = sections[0].id
      for (const section of sections) {
        const el = document.getElementById(section.id)
        if (el && el.getBoundingClientRect().top - rootTop <= threshold) {
          current = section.id
        }
      }
      const atBottom =
        root.scrollTop + root.clientHeight >= root.scrollHeight - 48
      setActive(atBottom ? sections[sections.length - 1].id : current)
    }

    update()
    root.addEventListener("scroll", update, { passive: true })
    return () => root.removeEventListener("scroll", update)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [article.slug])

  return (
    <section className="flex min-h-svh w-full justify-center bg-background px-6 py-16 text-foreground">
      <div className="mx-auto w-full max-w-4xl">
        <div className="max-w-2xl">
          <Badge variant="secondary" className="mb-4">
            {article.category}
          </Badge>
          <h1 className="font-heading text-3xl font-bold tracking-tight text-balance">
            {article.title}
          </h1>
          <div className="mt-5 flex items-center gap-3">
            <Avatar className="size-9">
              <AvatarImage
                src={`https://i.pravatar.cc/80?img=${article.author.img}`}
                alt={article.author.name}
                className="grayscale"
              />
              <AvatarFallback>{article.author.initials}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="text-sm font-medium">{article.author.name}</span>
              <span className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="tabular-nums">{article.date}</span>
                <span className="flex items-center gap-1">
                  <Clock className="size-3.5" aria-hidden="true" />
                  {article.readTime}
                </span>
              </span>
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-10 md:flex-row md:gap-12">
          <div
            ref={scrollRef}
            className="flex min-w-0 flex-1 flex-col gap-10 md:max-h-[26rem] md:overflow-y-auto md:pr-5"
          >
            {sections.map((section) => (
              <section key={section.id} id={section.id} className="scroll-mt-2">
                <h2 className="font-heading text-xl font-semibold tracking-tight">
                  {section.title}
                </h2>
                <div className="mt-3 flex flex-col gap-4 text-[15px]/relaxed text-foreground/80">
                  {section.body.map((paragraph, pIndex) => (
                    <p key={`${section.id}-${pIndex}`}>{paragraph}</p>
                  ))}
                </div>
              </section>
            ))}
          </div>

          <aside className="hidden w-52 shrink-0 md:block">
            <p className="mb-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">
              On This Page
            </p>
            <nav className="flex flex-col border-l border-border">
              {sections.map((section) => (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  onClick={() => setActive(section.id)}
                  aria-current={active === section.id ? "page" : undefined}
                  className={cn(
                    "-ml-px border-l py-1.5 pl-4 text-sm transition-colors",
                    active === section.id
                      ? "border-primary font-medium text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  {section.title}
                </a>
              ))}
            </nav>
          </aside>
        </div>
      </div>
    </section>
  )
}
