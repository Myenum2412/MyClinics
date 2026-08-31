// Reusable branded icons — same SVG used in Login + "Join our community" sections
// Update hrefs via NEXT_PUBLIC_WHATSAPP_URL / NEXT_PUBLIC_DISCORD_URL or edit COMMUNITY_LINKS below.

export const COMMUNITY_LINKS = {
  whatsapp:
    process.env.NEXT_PUBLIC_WHATSAPP_URL ||
    "https://chat.whatsapp.com/your-invite-link",
  discord:
    process.env.NEXT_PUBLIC_DISCORD_URL || "https://discord.gg/your-invite-link",
};

export function WhatsAppIcon({
  className,
  size = 20,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <path
        fill="currentColor"
        d="M19.05 4.91A9.82 9.82 0 0 0 12.04 2C6.58 2 2.14 6.44 2.14 10.9c0 1.57.41 3.1 1.19 4.45L2 22l6.84-1.79a9.87 9.87 0 0 0 3.2.54h.01c5.46 0 9.9-4.44 9.9-9.9 0-2.64-1.03-5.13-2.9-6.84ZM12.04 19.1a7.87 7.87 0 0 1-4.01-1.1l-.29-.17-4.06 1.06 1.08-3.96-.19-.31a7.88 7.88 0 0 1-1.21-4.22c0-4.34 3.53-7.87 7.88-7.87 2.1 0 4.08.82 5.56 2.31a7.84 7.84 0 0 1 2.31 5.56c0 4.34-3.53 7.87-7.87 7.87Zm6.42-5.91c-.35-.18-2.08-1.03-2.4-1.15-.32-.12-.55-.18-.78.18-.23.35-.9 1.15-1.11 1.39-.2.23-.41.26-.76.09-.35-.18-1.48-.55-2.82-1.74-1.04-.93-1.75-2.08-1.95-2.43-.2-.35-.02-.54.15-.71.15-.15.35-.4.52-.6.17-.2.23-.35.35-.58.12-.23.06-.43-.03-.6-.09-.18-.78-1.88-1.07-2.57-.28-.67-.57-.58-.78-.59l-.67-.01c-.23 0-.6.09-.92.43-.32.35-1.21 1.18-1.21 2.88s1.24 3.34 1.41 3.57c.17.23 2.44 3.73 5.91 5.23.83.36 1.47.57 1.97.73.83.26 1.58.22 2.18.14.66-.1 2.08-.85 2.37-1.67.29-.82.29-1.52.2-1.67-.09-.15-.32-.23-.67-.41Z"
      />
    </svg>
  );
}

export function DiscordIcon({
  className,
  size = 20,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <path
        fill="currentColor"
        d="M20.317 4.37a19.79 19.79 0 0 0-4.885-1.515.07.07 0 0 0-.079.037c-.21.385-.444.89-.608 1.285a18.44 18.44 0 0 0-5.5 0 12.3 12.3 0 0 0-.617-1.285.07.07 0 0 0-.078-.037A19.74 19.74 0 0 0 3.677 4.37a.07.07 0 0 0-.033.028C.533 9.045-.32 13.58.099 18.058a.08.08 0 0 0 .031.055A19.9 19.9 0 0 0 6.123 21.14a.07.07 0 0 0 .084-.027 14.1 14.1 0 0 0 1.226-1.994.07.07 0 0 0-.038-.104 13.1 13.1 0 0 1-1.873-.894.07.07 0 0 1-.007-.119c.126-.094.252-.192.372-.291a.07.07 0 0 1 .078-.01c3.927 1.793 8.18 1.793 12.062 0a.07.07 0 0 1 .078.01c.12.099.246.198.373.292a.07.07 0 0 1-.006.119 12.7 12.7 0 0 1-1.873.895.07.07 0 0 0-.038.104c.36.687.772 1.352 1.225 1.994a.07.07 0 0 0 .084.028A19.84 19.84 0 0 0 22.54 18.113a.08.08 0 0 0 .031-.055c.5-5.178-.838-9.674-3.55-13.66a.06.06 0 0 0-.032-.028ZM8.02 15.331c-1.183 0-2.157-1.068-2.157-2.38 0-1.312.955-2.38 2.157-2.38 1.21 0 2.176 1.077 2.157 2.38 0 1.312-.947 2.38-2.157 2.38Zm7.974 0c-1.183 0-2.157-1.068-2.157-2.38 0-1.312.955-2.38 2.157-2.38 1.21 0 2.176 1.077 2.157 2.38 0 1.312-.947 2.38-2.157 2.38Z"
      />
    </svg>
  );
}

type CommunityLinksProps = {
  size?: number;
  className?: string;
  iconClassName?: string;
  whatsappHref?: string;
  discordHref?: string;
};

export function CommunityLinks({
  size = 20,
  className,
  iconClassName,
  whatsappHref = COMMUNITY_LINKS.whatsapp,
  discordHref = COMMUNITY_LINKS.discord,
}: CommunityLinksProps) {
  return (
    <div className={className}>
      <a
        href={whatsappHref}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Join us on WhatsApp"
        title="Join us on WhatsApp"
        className="flex size-10 items-center justify-center rounded-full bg-[#25D366] text-white shadow-sm transition hover:bg-[#20bd5a] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25D366] focus-visible:ring-offset-2"
      >
        <WhatsAppIcon size={size} className={iconClassName} />
      </a>
      <a
        href={discordHref}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Join us on Discord"
        title="Join us on Discord"
        className="flex size-10 items-center justify-center rounded-full bg-[#5865F2] text-white shadow-sm transition hover:bg-[#4752c4] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5865F2] focus-visible:ring-offset-2"
      >
        <DiscordIcon size={size} className={iconClassName} />
      </a>
    </div>
  );
}
