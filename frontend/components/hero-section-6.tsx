import { Button } from '@/components/ui/button'
import { ArrowRight, ChevronRight } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

// Dusk hero layout (@tailark-oss/dusk-hero-section-6), adapted to My Clinics:
// copy, CTAs and colours follow the site theme (primary violet + brand).
// Note: the stock HeroHeader / LogoCloud are intentionally not used —
// the page already renders SiteHeader and the trust marquee below this hero.
export default function HeroSection() {
    return (
        <main>
            <section className="overflow-hidden">
                <div className="relative pt-24 lg:pt-40">
                    <div className="space-y-12 md:space-y-16">
                        <div className="relative mx-auto max-w-7xl px-6">
                            <Link
                                href="/signup/clinic"
                                className="flex w-fit items-center gap-2 font-medium">
                                <span>New</span>
                                <span className="text-muted-foreground">WhatsApp booking is live</span>

                                <ArrowRight className="size-3.5" />
                            </Link>

                            <div className="mt-8 grid items-end gap-4 md:grid-cols-2 md:gap-6">
                                <h1 className="text-balance text-5xl font-medium tracking-tight md:text-6xl xl:text-7xl">Your Health, Simplified</h1>
                                <div className="mx-auto flex max-w-md flex-col gap-6">
                                    <p className="text-muted-foreground text-balance text-lg">Book appointments in seconds, manage patient records, prescriptions, billing & pharmacy — one trusted platform for your family&apos;s healthcare.</p>

                                    <div className="flex items-center gap-3">
                                        <Button
                                            className="w-fit pr-4.5"
                                            nativeButton={false}
                                            render={
                                                <Link href="/signup/clinic">
                                                    <span className="text-nowrap">Get Started</span>
                                                    <ChevronRight className="opacity-50" />
                                                </Link>
                                            }
                                        />
                                        <Button
                                            className="w-fit"
                                            variant="outline"
                                            nativeButton={false}
                                            render={
                                                <Link href="/login">
                                                    <span className="text-nowrap">Sign In</span>
                                                </Link>
                                            }
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="mx-auto max-w-7xl max-xl:px-2">
                            <div className="relative aspect-square overflow-hidden rounded-3xl bg-muted md:aspect-5/3 lg:aspect-video">
                                <div className="bg-background min-w-4xl lg:min-w-5xl xl:min-w-7xl ring-foreground/6.5 before:mask-radial-at-top-left before:mask-radial-from-65% before:mask-radial-[100%_60%] before:ring-foreground before:border-foreground/10 absolute left-4 top-4 z-10 rounded-2xl p-2 shadow-lg ring before:absolute before:-inset-px before:z-10 before:size-56 before:rounded-tl-2xl before:border-l before:border-t lg:left-16 lg:top-16">
                                    <div
                                        aria-hidden
                                        className="bg-foreground/2 z-1 absolute inset-0 rounded-2xl"
                                    />
                                    <Image
                                        className="bg-background aspect-15/8 relative rounded-2xl"
                                        src="/bghome.png"
                                        alt="My Clinics dashboard"
                                        width="2880"
                                        height="1842"
                                    />
                                </div>

                                <div
                                    aria-hidden
                                    className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--primary)_0%,var(--brand)_45%,transparent_75%)] opacity-25"
                                />
                                <div
                                    aria-hidden
                                    className="absolute inset-0 bg-linear-to-b from-primary/15 via-brand/10 to-background"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </main>
    )
}
