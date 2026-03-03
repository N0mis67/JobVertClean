import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {authBaseConfig} from "@/app/utils/auth-config";

const { auth } = NextAuth(authBaseConfig);

export async function middleware(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.next();
  }

  const isOnboardingRoute =
    request.nextUrl.pathname.startsWith("/onboarding");

  const onboardingCompleted = (session.user as any)
    ?.onboardingCompleted;

  if (onboardingCompleted === false && !isOnboardingRoute) {
    return NextResponse.redirect(
      new URL("/onboarding", request.url)
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|_next/data|favicon.ico).*)"],
};