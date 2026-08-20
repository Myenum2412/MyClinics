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
  BellIcon as NotificationsActiveIcon,
  ChevronUpDownIcon as ChevronsUpDownIcon,
  UserCircleIcon as BadgeCheckIcon,
} from "@heroicons/react/24/outline";
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
          <div className="flex items-center">
            <SidebarMenuButton
              size="lg"
              render={
                <a href="/clinic/account" onClick={() => isMobile && setOpenMobile(false)} />
              }
              className="flex-1"
            >
              {avatar}
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{user.name}</span>
                <span className="truncate text-xs">{user.email}</span>
              </div>
            </SidebarMenuButton>
            <DropdownMenuTrigger
              render={
                <button
                  type="button"
                  aria-label="Open account menu"
                  className="mr-2 flex size-6 shrink-0 items-center justify-center rounded-sm transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                />
              }
            >
              <ChevronsUpDownIcon className="size-4" />
            </DropdownMenuTrigger>
          </div>
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
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
