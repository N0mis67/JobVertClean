import type { UserType } from "@prisma/client";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user?: DefaultSession["user"] & {
      id: string;
      onboardingCompleted: boolean;
      userType: UserType | null;
    };
  }

  interface User {
    onboardingCompleted: boolean;
    userType: UserType | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    onboardingCompleted?: boolean;
    userType?: UserType | null;
  }
}