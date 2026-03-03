"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "cookie-consent";

export function CookieConsentBanner() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const savedChoice = window.localStorage.getItem(STORAGE_KEY);

    if (!savedChoice) {
      setIsVisible(true);
    }
  }, []);

  const handleConsent = (choice: "accepted" | "declined") => {
    window.localStorage.setItem(STORAGE_KEY, choice);
    setIsVisible(false);
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto w-full max-w-3xl rounded-lg border bg-background/95 p-4 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-background/85">
      <p className="text-sm text-foreground">
        Nous utilisons des cookies pour améliorer votre expérience, mesurer l&apos;audience
        et proposer des contenus pertinents. Vous pouvez accepter ou refuser les cookies
        non essentiels. Consultez notre{" "}
        <Link href="/pdc" className="underline underline-offset-4 hover:text-primary">
          politique de confidentialité
        </Link>
        .
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button size="sm" onClick={() => handleConsent("accepted")}>
          Accepter
        </Button>
        <Button variant="outline" size="sm" onClick={() => handleConsent("declined")}>
          Refuser
        </Button>
      </div>
    </div>
  );
}