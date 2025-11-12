"use client";

import { useFormState } from "react-dom";
import { requestEmailSignIn } from "@/app/login/actions";
import type { EmailSignInState } from "@/app/login/actions";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { GeneralSubmitButton } from "../general/SubmitButtons";
import { useActionState } from "react";

type EmailSignUpFormProps = {
  submitLabel?: string;
};

const initialState: EmailSignInState = { status: "idle" };

export function EmailSignUpForm({ submitLabel }: EmailSignUpFormProps) {
  const [state, formAction] = useActionState(requestEmailSignIn, initialState);

  return (
    <form action={formAction} className="grid gap-3">
      <div className="grid gap-2 text-left">
        <Label htmlFor="email">Adresse mail</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="vous@exemple.com"
          required
        />
      </div>

      <GeneralSubmitButton text={submitLabel ?? "Continuer avec mon e-mail"} />

      {state.status === "success" ? (
        <p className="text-sm text-green-600">{state.message}</p>
      ) : null}

      {state.status === "error" ? (
        <p className="text-sm text-destructive">{state.message}</p>
      ) : null}
    </form>
  );
}