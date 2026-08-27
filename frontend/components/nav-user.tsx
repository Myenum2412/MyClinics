"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  Avatar,
  AvatarFallback,
} from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import {
  ArrowLeftStartOnRectangleIcon as LogOutIcon,
  BellIcon as NotificationsActiveIcon,
  UserCircleIcon as BadgeCheckIcon,
} from "@heroicons/react/24/outline";
import { logout } from "@/lib/clinic-api";
import { PersonAvatar } from "@/components/clinic/person-avatar";

export function NavUser({
  user,
  clinicId,
}: {
  user: {
    name: string
    email: string
    role?: string
  }
  clinicId?: string
}) {
  const { isMobile, setOpenMobile } = useSidebar()
  const router = useRouter()

  const go = (href: string) => {
    if (isMobile) setOpenMobile(false)
    router.push(href)
  }

  const handleLogout = async () => {
    await logout()
    router.replace("/login")
  }

  const avatar = clinicId ? (
    <PersonAvatar
      clinicId={clinicId}
      ownerType="clinic"
      ownerId={clinicId}
      name={user.name}
      size="sm"
      className="size-8"
    />
  ) : (
    <Avatar className="size-8">
      <AvatarFallback>
        {user.name
          .split(" ")
          .map((n) => n[0])
          .join("")
          .slice(0, 2)
          .toUpperCase()}
      </AvatarFallback>
    </Avatar>
  )

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                size="lg"
                className="w-full text-left"
              />
            }
          >
            {avatar}
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{user.name}</span>
              <span className="truncate text-xs">{user.email}</span>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-fit"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                {avatar}
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{user.name}</span>
                  <span className="truncate text-xs">{user.email}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={() => go("/clinic/account")}>
                <BadgeCheckIcon />
                Account
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => go("/clinic/notifications")}>
                <NotificationsActiveIcon />
                Notifications
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              <LogOutIcon />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
