"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export function ContactForm() {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    message: "",
  });

  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.id]: e.target.value });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatus("loading");

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const result = await res.json();

      if (res.ok) {
        setStatus("success");
        setForm({ firstName: "", lastName: "", email: "", message: "" });
      } else {
        setStatus("error");
        setErrorMessage(result?.error || "Une erreur est survenue.");
      }
    } catch (error) {
      setStatus("error");
      setErrorMessage("Erreur réseau ou serveur.");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="lastName">Nom</Label>
          <Input
            id="lastName"
            type="text"
            required
            value={form.lastName}
            onChange={handleChange}
            autoComplete="family-name"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="firstName">Prénom</Label>
          <Input
            id="firstName"
            type="text"
            required
            value={form.firstName}
            onChange={handleChange}
            autoComplete="given-name"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Adresse e-mail</Label>
        <Input
          id="email"
          type="email"
          required
          value={form.email}
          onChange={handleChange}
          autoComplete="email"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="message">Message</Label>
        <textarea
          id="message"
          required
          rows={5}
          value={form.message}
          onChange={handleChange}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          placeholder="Écrivez votre message ici..."
        />
      </div>

      <Button type="submit" className="w-full" disabled={status === "loading"}>
        {status === "loading" ? "Envoi en cours..." : "Envoyer"}
      </Button>

      {status === "success" && (
        <p className="text-sm text-green-600">Votre message a bien été envoyé.</p>
      )}
      {status === "error" && (
        <p className="text-sm text-red-600">Erreur : {errorMessage}</p>
      )}
    </form>
  );
}

