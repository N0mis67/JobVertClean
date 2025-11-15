"use client";

import { registerWithPassword } from "@/app/register/actions";
import type { RegisterState } from "@/app/register/actions";
import { signInWithGoogle } from "@/app/utils/auth-actions";
import { useActionState } from "react";
import { GoogleIcon } from "../icons/GoogleIcon";
import { GeneralSubmitButton } from "../general/SubmitButtons";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";

const initialState: RegisterState = { status: "idle" };

export function RegisterForm() {
  const [state, formAction] = useActionState(registerWithPassword, initialState);

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Créez votre compte JobVert</CardTitle>
          <CardDescription>
            Utilisez votre adresse mail et un mot de passe pour rejoindre la communauté JobVert.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6">
            <form action={signInWithGoogle} className="flex flex-col gap-4">
              <GeneralSubmitButton
                text="Créer un compte avec Google"
                icon={<GoogleIcon />}
                variant="outline"
              />
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">
                  ou créez votre compte avec votre email
                </span>
              </div>
            </div>

            <form action={formAction} className="grid gap-3 text-left">
              <div className="grid gap-2">
                <Label htmlFor="register-email">Adresse mail</Label>
                <Input
                  id="register-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="vous@exemple.com"
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="register-password">Mot de passe</Label>
                <Input
                  id="register-password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="••••••••"
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="register-confirm-password">
                  Confirmer le mot de passe
                </Label>
                <Input
                  id="register-confirm-password"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  placeholder="••••••••"
                  required
                />
              </div>

              <GeneralSubmitButton text="Créer mon compte" />

              {state.status === "success" ? (
                <p className="text-sm text-green-600">{state.message}</p>
              ) : null}

              {state.status === "error" ? (
                <p className="text-sm text-destructive">{state.message}</p>
              ) : null}
            </form>
          </div>
        </CardContent>
      </Card>

      <div className="text-balance text-center text-xs text-muted-foreground [&_a]">
        En créant un compte, vous acceptez les conditions d&apos;utilisation et la politique de confidentialité de JobVert.
      </div>
    </div>
  );
}