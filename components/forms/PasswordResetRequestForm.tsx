"use client";

import { useActionState } from "react";
import { requestPasswordReset } from "@/app/reset-password/actions";
import type { PasswordResetRequestState } from "@/app/reset-password/actions";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { GeneralSubmitButton } from "../general/SubmitButtons";

const initialState: PasswordResetRequestState = { status: "idle" };

export function PasswordResetRequestForm() {
  const [state, formAction] = useActionState(
    requestPasswordReset,
    initialState,
  );

  return (
    <form action={formAction} className="grid gap-3 text-left">
      <div className="grid gap-2">
        <Label htmlFor="reset-email">Adresse mail</Label>
        <Input
          id="reset-email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="vous@exemple.com"
          required
        />
      </div>

      <GeneralSubmitButton text="Envoyer le lien de reinitialisation" />

      {state.status === "success" ? (
        <p className="text-sm text-green-600">{state.message}</p>
      ) : null}

      {state.status === "error" ? (
        <p className="text-sm text-destructive">{state.message}</p>
      ) : null}
    </form>
  );
}
