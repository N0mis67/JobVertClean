"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { UploadDropzone } from "@/components/general/UploadThingReExport";
import { toast } from "sonner";
import { XIcon } from "lucide-react";
import Image from "next/image";
import file from "@/public/file.svg"
// Image icône PDF pour prévisualisation du CV uploadé

// Schéma de validation Zod pour le formulaire de candidature
const applicationSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Please enter a valid email"),
  phone: z.string().min(1, "Phone number is required"),
  coverLetter: z.string().min(10, "Cover letter must be at least 10 characters"),
  resume: z.string().min(1, "Please upload a resume"),    // URL du CV une fois uploadé
  jobId: z.string().min(1, "Job ID is required"),         // id de l'offre d'emploi
});
type ApplicationFormData = z.infer<typeof applicationSchema>;

interface ApplyFormProps {
  jobId: string;
  firstName: string;
  lastName: string;
  email: string;
}

export function ApplyForm({ jobId, firstName, lastName, email }: ApplyFormProps) {
  // Configuration du formulaire avec valeurs par défaut pré-remplies
  const form = useForm<ApplicationFormData>({
    resolver: zodResolver(applicationSchema),
    defaultValues: {
      jobId,
      firstName,
      lastName,
      email,
      phone: "",
      coverLetter: "",
      resume: "",
    },
  });
  const [pending, setPending] = useState(false);

  // Gestion de la soumission du formulaire
  const onSubmit = async (values: ApplicationFormData) => {
    try {
      setPending(true);
      const res = await fetch("/api/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        throw new Error("Failed to submit application");
      }
      toast.success("Application submitted successfully!");  // Succès de l’envoi
      // TODO: éventuellement rediriger ou afficher une confirmation supplémentaire
    } catch (error) {
      toast.error("Something went wrong. Please try again."); // Erreur lors de l’envoi
    } finally {
      setPending(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Champs Prénom et Nom */}
        <div className="grid md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="firstName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Prénom</FormLabel>
                <FormControl>
                  <Input placeholder="Entrez votre prénom" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="lastName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nom</FormLabel>
                <FormControl>
                  <Input placeholder="Entrez votre nom" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Champs Email et Téléphone */}
        <div className="grid md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="Entrez votre email" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Téléphone</FormLabel>
                <FormControl>
                  <Input type="tel" placeholder="Entrez votre numéro de téléphone" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Champ Lettre de motivation */}
        <FormField
          control={form.control}
          name="coverLetter"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Lettre de motivation</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Expliquez pourquoi vous postulez pour ce poste..."
                  className="resize-none"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Champ CV (UploadThing) */}
        <FormField
          control={form.control}
          name="resume"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Curriculum Vitae (PDF)</FormLabel>
              <FormControl>
                <div>
                  {/* Si une URL de CV est déjà présente, afficher une icône PDF avec option de suppression */}
                  {field.value ? (
                    <div className="relative w-fit">
                     <Image
                        src={file}
                        alt="CV uploadé"
                        width={100}
                        height={100}
                        className="rounded-lg"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute -top-2 -right-2"
                        onClick={() => field.onChange("")}
                      >
                        <XIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    /* Sinon, afficher le composant d’upload UploadThing */
                    <UploadDropzone
                      endpoint="resumeUploader"
                      onClientUploadComplete={(res) => {
                        // Insérer l'URL du fichier uploadé dans le champ formulaire
                        field.onChange(res[0].url);
                        toast.success("Resume uploaded successfully!");
                      }}
                      onUploadError={() => {
                        toast.error("Something went wrong. Please try again.");
                      }}
                      className="ut-button:bg-primary ut-button:text-white ut-button:hover:bg-primary/90 ut-label:text-muted-foreground ut-allowed-content:text-muted-foreground border-primary"
                    />
                  )}
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Champ caché pour jobId (nécessaire à la soumission) */}
        <input type="hidden" {...form.register("jobId")} />

        {/* Bouton de soumission */}
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Chargement..." : "Envoyer la candidature"}
        </Button>
      </form>
    </Form>
  );
}
