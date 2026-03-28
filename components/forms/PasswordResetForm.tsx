"use client";

import Link from "next/link";
import { useActionState } from "react";
import { resetPassword } from "@/app/reset-password/actions";
import type { PasswordResetState } from "@/app/reset-password/actions";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { GeneralSubmitButton } from "../general/SubmitButtons";

const initialState: PasswordResetState = { status: "idle" };

export function PasswordResetForm({ token }: { token: string }) {
  const [state, formAction] = useActionState(resetPassword, initialState);

  return (
    <form action={formAction} className="grid gap-3 text-left">
      <input type="hidden" name="token" value={token} />

      <div className="grid gap-2">
        <Label htmlFor="new-password">Nouveau mot de passe</Label>
        <Input
          id="new-password"
          name="password"
          type="password"
          autoComplete="new-password"
          placeholder="********"
          required
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="confirm-new-password">Confirmer le mot de passe</Label>
        <Input
          id="confirm-new-password"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          placeholder="********"
          required
        />
      </div>

      <GeneralSubmitButton text="Mettre a jour mon mot de passe" />

      {state.status === "success" ? (
        <p className="text-sm text-green-600">
          {state.message}{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Se connecter
          </Link>
        </p>
      ) : null}

      {state.status === "error" ? (
        <p className="text-sm text-destructive">{state.message}</p>
      ) : null}
    </form>
  );
}
