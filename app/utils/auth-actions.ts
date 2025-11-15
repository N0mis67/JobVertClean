"use server";

import { signIn, signOut } from "./auth";

const ONBOARDING_REDIRECT = "/onboarding";
const HOME_REDIRECT = "/";

export async function signInWithGoogle() {
  await signIn("google", { redirectTo: ONBOARDING_REDIRECT });
}

export async function signOutToHome() {
  await signOut({ redirectTo: HOME_REDIRECT });
}