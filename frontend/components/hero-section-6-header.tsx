'use client'
import Image from 'next/image'
import Link from 'next/link'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import React from 'react'

const menuItems = [
    { name: 'Product', href: '#link' },
    { name: 'Solutions', href: '#link' },
    { name: 'Pricing', href: '#link' },
    { name: 'Company', href: '#link' },
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
                    <div className="relative flex flex-wrap items-center justify-between gap-6 py-5 lg:gap-0">
                        <div className="flex w-full items-center justify-between gap-12 lg:w-auto">
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

                            <button
                                onClick={() => setMenuState(!menuState)}
                                aria-label={menuState == true ? 'Close Menu' : 'Open Menu'}
                                className="relative z-20 block cursor-pointer after:absolute after:-inset-4 lg:hidden"
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

                            <div className="max-lg:hidden">
                                <ul className="flex gap-8 text-sm">
                                    {menuItems.map((item, index) => (
                                        <li key={index}>
                                            <Link
                                                href={item.href}
                                                className="block text-white/60 duration-150 hover:text-blue-400"
                                            >
                                                <span>{item.name}</span>
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>

                        <div className="in-data-[state=active]:block lg:in-data-[state=active]:flex mb-6 hidden w-full flex-wrap items-center justify-end max-lg:space-y-8 md:flex-nowrap lg:m-0 lg:flex lg:w-fit lg:gap-6">
                            <div className="lg:hidden">
                                <ul>
                                    {menuItems.map((item, index) => (
                                        <li key={index}>
                                            <Link
                                                href={item.href}
                                                className="block py-3 text-2xl font-medium text-white hover:text-blue-400"
                                            >
                                                <span>{item.name}</span>
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div className="flex w-full flex-col space-y-3 sm:flex-row sm:gap-3 sm:space-y-0 md:w-fit">
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
                        </div>
                    </div>
                </div>
            </nav>
        </header>
    )
}
