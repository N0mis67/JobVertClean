"use client";

import Link from "next/link";
import { useActionState } from "react";
import { loginWithPassword } from "@/app/login/actions";
import type { PasswordLoginState } from "@/app/login/actions";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { GeneralSubmitButton } from "../general/SubmitButtons";

const initialState: PasswordLoginState = { status: "idle" };

export function PasswordLoginForm() {
  const [state, formAction] = useActionState(loginWithPassword, initialState);

  return (
    <form action={formAction} className="grid gap-3 text-left">
      <div className="grid gap-2">
        <Label htmlFor="login-email">Adresse mail</Label>
        <Input
          id="login-email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="vous@exemple.com"
          required
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="login-password">Mot de passe</Label>
        <Input
          id="login-password"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••••••"
          required
        />
        <div className="flex justify-end">
          <Link
            href="/reset-password"
            className="text-xs font-medium text-primary hover:underline"
          >
            Réinitialiser mon mot de passe
          </Link>
        </div>
      </div>

      <GeneralSubmitButton text="Me connecter" />

      {state.status === "error" ? (
        <p className="text-sm text-destructive">{state.message}</p>
      ) : null}
    </form>
  );
}
