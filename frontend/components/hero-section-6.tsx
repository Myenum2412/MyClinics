import { Button } from '@/components/ui/button'
import { ArrowRight } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { HeroHeader } from '@/components/hero-section-6-header'
import LogoCloud from '@/components/hero-section-6-logo-cloud'

export default function HeroSection() {
    return (
        <>
            <HeroHeader />

            <main className="bg-black text-white">
                <section className="relative overflow-hidden pt-20">
                    <div
                        aria-hidden
                        className="pointer-events-none absolute inset-x-0 top-0 h-[720px] bg-[radial-gradient(60%_60%_at_50%_0%,rgba(37,99,235,0.35),transparent_70%)]"
                    />

                    <div className="relative pt-24 lg:pt-40">
                        <div className="space-y-12 md:space-y-16">
                            <div className="relative mx-auto max-w-7xl px-6">
                                <Link
                                    href="/"
                                    className="flex w-fit items-center gap-2 font-medium text-white">
                                    <span className="text-blue-400">New</span>
                                    <span className="text-white/60">Introducing My Clinics 1.0</span>

                                    <ArrowRight className="size-3.5 text-blue-400" />
                                </Link>

                                <div className="mt-8 grid items-end gap-4 md:grid-cols-2 md:gap-6">
                                    <h1 className="text-balance text-5xl font-medium tracking-tight text-white md:text-6xl xl:text-7xl">Run your whole clinic on one platform</h1>
                                    <div className="mx-auto flex max-w-md flex-col gap-6">
                                        <p className="text-balance text-lg text-white/60">Appointments, live queues, EMR, prescriptions, billing and pharmacy — with WhatsApp booking and an AI assistant.</p>

                                        <Button
                                            className="w-fit bg-blue-600 text-white hover:bg-blue-500 focus-visible:border-blue-500 focus-visible:ring-blue-500/60"
                                            nativeButton={false}
                                            render={<Link href="/signup/clinic">Get Started</Link>}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="mx-auto max-w-7xl max-xl:px-2">
                                <div className="relative aspect-square overflow-hidden rounded-3xl bg-blue-950/60 ring-1 ring-blue-900 shadow-[0_0_140px_-40px_rgba(37,99,235,0.75)] md:aspect-5/3 lg:aspect-video">
                                    <div className="absolute left-4 top-4 z-10 min-w-4xl rounded-2xl bg-white p-2 shadow-lg ring ring-blue-500/40 before:absolute before:-inset-px before:z-10 before:size-56 before:rounded-tl-2xl before:border-l before:border-t before:border-blue-300/40 before:mask-radial-at-top-left before:mask-radial-from-65% before:mask-radial-[100%_60%] lg:left-16 lg:top-16 lg:min-w-5xl xl:min-w-7xl">
                                        <div
                                            aria-hidden
                                            className="absolute inset-0 z-1 rounded-2xl bg-blue-900/5"
                                        />
                                        <Image
                                            className="relative aspect-15/8 rounded-2xl bg-white object-cover object-top"
                                            src="/aidps.png"
                                            alt="My Clinics app screen"
                                            width={1254}
                                            height={1254}
                                        />
                                    </div>

                                    <Image
                                        src="/bghome.png"
                                        alt=""
                                        width={1672}
                                        height={941}
                                        sizes="(max-width: 768px) 100vw, 1280px"
                                        className="size-full rounded-3xl object-cover object-bottom"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
                <LogoCloud />
            </main>
        </>
    )
}
