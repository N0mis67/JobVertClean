import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/app/utils/auth";

export async function middleware(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.next();
  }

  const onboardingCompleted = session.user.onboardingCompleted;
  const isOnboardingRoute = request.nextUrl.pathname.startsWith("/onboarding");

  if (onboardingCompleted === false && !isOnboardingRoute) {
    const onboardingUrl = new URL("/onboarding", request.url);
    return NextResponse.redirect(onboardingUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|_next/data|favicon.ico).*)"],
};