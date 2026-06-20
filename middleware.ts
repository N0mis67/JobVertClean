import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
    secureCookie: request.nextUrl.protocol === "https:",
  });

  if (!token) {
    return NextResponse.next();
  }

  const isOnboardingRoute =
    request.nextUrl.pathname.startsWith("/onboarding");

  const onboardingCompleted = token.onboardingCompleted;

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
