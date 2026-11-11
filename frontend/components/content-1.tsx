import { Button } from '@/components/ui/button'
import { ChevronRight, Play } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

export default function ContentSection() {
    return (
        <section id="demo" className="py-16 md:py-24 text-white">
            <div className="mx-auto max-w-7xl space-y-12 px-6 md:space-y-16">
                <div className="relative aspect-video overflow-hidden rounded-2xl border border-blue-900/50 bg-blue-950/40 shadow-2xl ring-1 ring-white/10">
                    <Image
                        className="size-full object-cover object-top"
                        src="/homebg.png"
                        alt="My Clinics Live Demo"
                        height={1080}
                        width={1920}
                        priority
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
                    <Link
                        href="/rx-demo"
                        className="group absolute inset-0 flex items-center justify-center"
                        aria-label="Launch interactive demo"
                    >
                        <div className="flex size-16 sm:size-20 items-center justify-center rounded-full bg-blue-600/90 text-white shadow-xl backdrop-blur-md transition-all duration-300 group-hover:scale-110 group-hover:bg-blue-500">
                            <Play className="size-7 sm:size-8 fill-white translate-x-0.5" />
                        </div>
                    </Link>
                </div>

                <div className="grid gap-6 md:grid-cols-2 md:gap-8 lg:gap-16 items-start">
                    <div>
                        <span className="text-xs font-semibold uppercase tracking-widest text-blue-400">
                            Interactive Demo
                        </span>
                        <h2 className="mt-3 max-w-lg text-balance text-3xl font-semibold tracking-tight text-white sm:text-4xl lg:text-5xl">
                            A complete clinic workspace built for every patient interaction.
                        </h2>
                    </div>

                    <div className="space-y-6">
                        <p className="text-white/70 text-balance text-base sm:text-lg leading-relaxed">
                            Experience how My Clinics keeps queues, clinical notes, prescriptions, and billing unified — so doctors and staff can focus on patient care without tab switching.
                        </p>

                        <p className="text-white/60 text-balance text-base sm:text-lg leading-relaxed">
                            Watch our live interactive demo to test digital prescription creation, live WhatsApp queue sync, and instant revenue reconciliation.
                        </p>

                        <Button
                            size="lg"
                            className="bg-blue-600 text-white hover:bg-blue-500 gap-2 pr-4 shadow-lg shadow-blue-600/30 font-medium"
                            nativeButton={false}
                            render={
                                <Link href="/rx-demo">
                                    <span>Try Interactive Demo</span>
                                    <ChevronRight className="size-4" />
                                </Link>
                            }
                        />
                    </div>
                </div>
            </div>
        </section>
    )
}
