"use client";

import { signOutToHome } from "@/app/utils/auth-actions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { motion } from "framer-motion";
import {
  Building2,
  ChevronDown,
  Heart,
  Layers2,
  LogOut,
  Settings2,
  UserCircle,
} from "lucide-react";
import Link from "next/link";

interface UserDropdownProps {
  email: string;
  name: string;
  image?: string | null;
  companyLogo?: string | null;
  companyName?: string | null;
  companyId?: string | null;
}

export function UserDropdown({
  email,
  name,
  image,
  companyLogo,
  companyName,
  companyId,
}: UserDropdownProps) {
  const displayName = companyName?.trim().length ? companyName : name;
  const fallbackText = displayName
    ? displayName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";
  const avatarSrc = companyLogo ?? image ?? undefined;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <motion.button
          className="flex items-center gap-2 text-white/80 hover:text-white transition-colors"
          whileHover={{ scale: 1.05 }}
        >
          <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center overflow-hidden">
            {avatarSrc ? (
              <Avatar className="h-10 w-10">
                <AvatarImage src={avatarSrc} alt="Profile image" />
                <AvatarFallback className="bg-transparent text-white/80">
                  {fallbackText}
                </AvatarFallback>
              </Avatar>
            ) : (
              <UserCircle className="w-5 h-5" />
            )}
          </div>
          <ChevronDown className="w-4 h-4" aria-hidden="true" />
        </motion.button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-48" align="end">
        <DropdownMenuLabel className="flex min-w-0 flex-col">
          <span className="truncate text-sm font-medium text-foreground">
            {name}
          </span>
          <span className="truncate text-xs font-normal text-muted-foreground">
            {email}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link href="/favorites">
              <Heart
                size={16}
                strokeWidth={2}
                className="opacity-60"
                aria-hidden="true"
              />
              <span>Mes favoris</span>
            </Link>
          </DropdownMenuItem>
          {companyId && (
            <>
              <DropdownMenuItem asChild>
                <Link href={`/company/${companyId}`}>
                  <Building2
                    size={16}
                    strokeWidth={2}
                    className="opacity-60"
                    aria-hidden="true"
                  />
                  <span>Profil entreprise</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/company/settings">
                  <Settings2
                    size={16}
                    strokeWidth={2}
                    className="opacity-60"
                    aria-hidden="true"
                  />
                  <span>Paramètres entreprise</span>
                </Link>
              </DropdownMenuItem>
            </>
          )}
          <DropdownMenuItem asChild>
            <Link href="/my-jobs">
              <Layers2
                size={16}
                strokeWidth={2}
                className="opacity-60"
                aria-hidden="true"
              />
              <span>Mes jobs</span>
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <form action={signOutToHome}>
            <button type="submit" className="w-full flex items-center gap-2">
              <LogOut
                size={16}
                strokeWidth={2}
                className="opacity-60"
                aria-hidden="true"
              />
              <span>Déconnexion</span>
            </button>
          </form>
        </DropdownMenuItem>
      </DropdownMenuContent>
        
    </DropdownMenu>

  );
}