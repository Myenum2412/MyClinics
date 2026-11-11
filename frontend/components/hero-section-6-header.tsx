'use client'
import Image from 'next/image'
import Link from 'next/link'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import React from 'react'

const menuItems = [
    { name: 'Features', href: '/#features' },
    { name: 'Pricing', href: '/pricing' },
    { name: 'Integrations', href: '/integrations' },
    { name: 'Partners', href: '/partners' },
    { name: 'Contact', href: '/#contact' },
]

export const HeroHeader = () => {
    const [menuState, setMenuState] = React.useState(false)

    React.useEffect(() => {
        if (!menuState) return

        const mediaQuery = window.matchMedia('(max-width: 1023px)')
        const updateOverflow = () => {
            document.documentElement.classList.toggle('overflow-hidden', mediaQuery.matches)
        }

        updateOverflow()
        mediaQuery.addEventListener('change', updateOverflow)

        return () => {
            mediaQuery.removeEventListener('change', updateOverflow)
            document.documentElement.classList.remove('overflow-hidden')
        }
    }, [menuState])

    return (
        <header>
            <nav
                data-state={menuState && 'active'}
                className="fixed top-0 z-20 w-full border-b border-blue-900/50 bg-black/80 text-white backdrop-blur-xl max-lg:data-[state=active]:bottom-0 max-lg:data-[state=active]:bg-black"
            >
                <div className="mx-auto max-w-7xl px-6">
                    <div className="relative flex items-center justify-between py-5">
                        {/* Left: Logo */}
                        <div className="flex items-center">
                            <Link
                                href="/"
                                aria-label="My Clinics home"
                                className="flex items-center space-x-2"
                            >
                                <Image
                                    src="/logo-wordmark.png"
                                    alt="My Clinics"
                                    width={433}
                                    height={138}
                                    priority
                                    className="h-9 w-auto"
                                />
                            </Link>
                        </div>

                        {/* Center: Navigation Links */}
                        <div className="hidden lg:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                            <ul className="flex items-center gap-8 text-sm font-medium">
                                {menuItems.map((item, index) => (
                                    <li key={index}>
                                        <Link
                                            href={item.href}
                                            className="block text-white/70 transition-colors duration-150 hover:text-white"
                                        >
                                            <span>{item.name}</span>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Right: Actions (Desktop) + Hamburger (Mobile) */}
                        <div className="flex items-center gap-3">
                            <div className="hidden lg:flex items-center gap-3">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    nativeButton={false}
                                    className="border-blue-500/40 bg-transparent text-white hover:bg-blue-950 hover:text-blue-300 focus-visible:border-blue-500 focus-visible:ring-blue-500/60 dark:border-blue-500/40 dark:bg-transparent dark:hover:bg-blue-950 dark:hover:text-blue-300"
                                    render={
                                        <Link href="/login">
                                            <span>Login</span>
                                        </Link>
                                    }
                                />
                                <Button
                                    size="sm"
                                    nativeButton={false}
                                    className="bg-blue-600 text-white hover:bg-blue-500 focus-visible:border-blue-500 focus-visible:ring-blue-500/60"
                                    render={
                                        <Link href="/signup/clinic">
                                            <span>Sign Up</span>
                                        </Link>
                                    }
                                />
                            </div>

                            {/* Mobile Hamburger Button */}
                            <button
                                onClick={() => setMenuState(!menuState)}
                                aria-label={menuState ? 'Close Menu' : 'Open Menu'}
                                className="relative z-20 block cursor-pointer p-2 lg:hidden"
                            >
                                <div
                                    aria-hidden
                                    className="in-data-[state=active]:rotate-180 in-data-[state=active]:scale-0 in-data-[state=active]:opacity-0 size-4.5 m-auto flex flex-col items-center justify-center gap-[7px] duration-200"
                                >
                                    <span className="h-0.5 w-full rounded-full bg-white" />
                                    <span className="h-0.5 w-full rounded-full bg-white" />
                                </div>

                                <X className="in-data-[state=active]:rotate-0 in-data-[state=active]:scale-100 in-data-[state=active]:opacity-100 absolute inset-0 m-auto size-6 translate-x-[-3px] -rotate-180 scale-0 text-white opacity-0 duration-200" />
                            </button>
                        </div>
                    </div>

                    {/* Mobile Menu Panel */}
                    {menuState && (
                        <div className="lg:hidden flex flex-col justify-between pb-8 pt-4">
                            <ul className="flex flex-col space-y-4">
                                {menuItems.map((item, index) => (
                                    <li key={index}>
                                        <Link
                                            href={item.href}
                                            onClick={() => setMenuState(false)}
                                            className="block py-2 text-xl font-medium text-white hover:text-blue-400"
                                        >
                                            <span>{item.name}</span>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                            <div className="mt-8 flex flex-col gap-3">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    nativeButton={false}
                                    className="w-full border-blue-500/40 bg-transparent text-white hover:bg-blue-950 hover:text-blue-300"
                                    render={
                                        <Link href="/login" onClick={() => setMenuState(false)}>
                                            <span>Login</span>
                                        </Link>
                                    }
                                />
                                <Button
                                    size="sm"
                                    nativeButton={false}
                                    className="w-full bg-blue-600 text-white hover:bg-blue-500"
                                    render={
                                        <Link href="/signup/clinic" onClick={() => setMenuState(false)}>
                                            <span>Sign Up</span>
                                        </Link>
                                    }
                                />
                            </div>
                        </div>
                    )}
                </div>
            </nav>
        </header>
    )
}
