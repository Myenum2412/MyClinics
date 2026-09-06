import React from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ChevronRight, CirclePlay } from 'lucide-react'
import Image from 'next/image'

export default function HeroSection() {
    return (
        <>
            <main className="overflow-hidden">
                <section className="bg-linear-to-b to-muted from-background">
                    <div className="relative py-24 md:py-32">
                        <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-col items-center px-6 text-center">
                            <div className="mx-auto max-w-3xl flex flex-col items-center">
                                <div className="flex flex-col items-center">
                                    <h1 className="text-balance text-5xl font-medium md:text-6xl">Your Health, Simplified</h1>
                                    <p className="text-muted-foreground mx-auto my-8 max-w-2xl text-balance text-xl">Book appointments in seconds, manage patient records, prescriptions, billing & pharmacy — one trusted platform for your family&apos;s healthcare.</p>

                                    <div className="flex items-center justify-center gap-3">
                                        <Button
                                            nativeButton={false}
                                            size="lg"
                                            className="pr-4.5"
                                            render={
                                                <Link href="/login">
                                                    <span className="text-nowrap">Sign In</span>
                                                    <ChevronRight className="opacity-50" />
                                                </Link>
                                            }
                                        />
                                        <Button
                                            key={2}
                                            nativeButton={false}
                                            size="lg"
                                            variant="outline"
                                            className="pl-5"
                                            render={
                                                <Link href="/clinic">
                                                    <CirclePlay className="fill-primary/25 stroke-primary" />
                                                    <span className="text-nowrap">Go to Clinic</span>
                                                </Link>
                                            }
                                        />
                                    </div>
                                </div>

                                <div className="mt-10">
                                    <p className="text-muted-foreground">Trusted by 500+ clinics • Secure & Compliant • 24/7 Support</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </main>
        </>
    )
}
