"use client";

import { deleteAccount } from "@/app/actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TriangleAlert } from "lucide-react";
import { FormEvent, useEffect, useRef, useState } from "react";

const CONFIRMATION_TEXT = "SUPPRIMER";

export function DeleteAccountSection() {
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const submissionInProgress = useRef(false);

  const isConfirmed = confirmation === CONFIRMATION_TEXT;

  useEffect(() => {
    if (isConfirmationOpen) {
      inputRef.current?.focus();
    }
  }, [isConfirmationOpen]);

  function openConfirmation() {
    setConfirmation("");
    setError(null);
    setIsConfirmationOpen(true);
  }

  function closeConfirmation() {
    if (submissionInProgress.current) {
      return;
    }

    setConfirmation("");
    setError(null);
    setIsConfirmationOpen(false);
  }

  async function handleDelete(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isConfirmed || submissionInProgress.current) {
      return;
    }

    submissionInProgress.current = true;
    setIsDeleting(true);
    setError(null);

    let shouldResetAfterFailure = false;

    try {
      const result = await deleteAccount();

      if (result?.success === false) {
        shouldResetAfterFailure = true;
        setError(
          "La suppression du compte a échoué. Veuillez réessayer dans quelques instants."
        );
      }
    } catch {
      shouldResetAfterFailure = true;
      setError(
        "Une erreur est survenue. Votre compte n’a pas pu être supprimé. Veuillez réessayer."
      );
    } finally {
      if (shouldResetAfterFailure) {
        submissionInProgress.current = false;
        setIsDeleting(false);
      }
    }
  }

  return (
    <Card className="border-destructive/50">
      <CardHeader>
        <div className="flex items-center gap-2 text-destructive">
          <TriangleAlert className="h-5 w-5" aria-hidden="true" />
          <CardTitle id="danger-zone-title">Zone dangereuse</CardTitle>
        </div>
        <CardDescription>
          La suppression de votre compte est définitive. Vos données JobVert
          associées seront supprimées et cette action ne pourra pas être
          annulée.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!isConfirmationOpen ? (
          <Button
            type="button"
            variant="destructive"
            aria-expanded="false"
            aria-controls="delete-account-confirmation"
            onClick={openConfirmation}
          >
            Supprimer mon compte
          </Button>
        ) : (
          <div
            id="delete-account-confirmation"
            role="region"
            aria-labelledby="delete-account-confirmation-title"
            aria-describedby="delete-account-confirmation-description"
            className="space-y-4 rounded-lg border border-destructive/40 bg-destructive/5 p-4"
          >
            <div className="space-y-2">
              <h2
                id="delete-account-confirmation-title"
                className="font-semibold text-destructive"
              >
                Confirmer la suppression définitive
              </h2>
              <p
                id="delete-account-confirmation-description"
                className="text-sm text-muted-foreground"
              >
                Cette action est irréversible. Saisissez exactement{" "}
                <strong className="text-foreground">{CONFIRMATION_TEXT}</strong>{" "}
                pour continuer.
              </p>
            </div>

            <form className="space-y-4" onSubmit={handleDelete}>
              <div className="space-y-2">
                <Label htmlFor="delete-account-confirmation-input">
                  Texte de confirmation
                </Label>
                <Input
                  ref={inputRef}
                  id="delete-account-confirmation-input"
                  name="confirmation"
                  type="text"
                  value={confirmation}
                  autoComplete="off"
                  spellCheck={false}
                  disabled={isDeleting}
                  aria-describedby="delete-account-confirmation-description"
                  onChange={(event) => setConfirmation(event.target.value)}
                />
              </div>

              {error && (
                <p className="text-sm text-destructive" role="alert">
                  {error}
                </p>
              )}

              <div className="flex flex-col-reverse gap-2 sm:flex-row">
                <Button
                  type="button"
                  variant="outline"
                  disabled={isDeleting}
                  onClick={closeConfirmation}
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  variant="destructive"
                  disabled={!isConfirmed || isDeleting}
                >
                  {isDeleting
                    ? "Suppression..."
                    : "Supprimer définitivement mon compte"}
                </Button>
              </div>
            </form>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
