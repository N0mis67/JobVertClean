"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { jobSeekerSchema } from "@/app/utils/zodSchemas";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { XIcon } from "lucide-react";

import image from "@/public/image.png"
import Image from "next/image";
import { UploadDropzone } from "@/components/general/UploadThingReExport";
import { createJobSeeker } from "@/app/actions";

export default function JobSeekerForm() {
  const form = useForm<z.infer<typeof jobSeekerSchema>>({
    resolver: zodResolver(jobSeekerSchema),
    defaultValues: {
      about: "",
      resume: "",
      name: "",
    },
  });
  const [pending, setPending] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const submitting = useRef(false);

  async function onSubmit(values: z.infer<typeof jobSeekerSchema>) {
    if (submitting.current) return;
    submitting.current = true;
    setSubmitError(null);
    setPending(true);

    try {
      const result = await createJobSeeker(values);
      if (result?.success === false) {
        setSubmitError(result.message);
      }
    } catch {
      setSubmitError("L'enregistrement du profil a échoué. Veuillez réessayer.");
    } finally {
      submitting.current = false;
      setPending(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nom complet</FormLabel>
              <FormControl>
                <Input placeholder="Entrez votre nom" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="about"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Biographie</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Parlez-nous de vous..."
                  className="resize-none"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="resume"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Curriculum Vitae (PDF)</FormLabel>
              <FormControl>
                <div>
                  {field.value ? (
                    <div className="relative w-fit">
                      <Image
                        src={image}
                        alt="CV téléversé"
                        width={100}
                        height={100}
                        className="rounded-lg"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute -top-2 -right-2 "
                        onClick={() => field.onChange("")}
                      >
                        <XIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <UploadDropzone
                      endpoint="resumeUploader"
                      onClientUploadComplete={(res) => {
                        const url = res?.[0]?.ufsUrl;
                        if (!url) {
                          setSubmitError("Impossible de récupérer l'URL du CV. Veuillez réessayer.");
                          return;
                        }
                        field.onChange(url);
                        setSubmitError(null);
                        toast.success("CV téléversé avec succès !");
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

        {submitError && <p role="alert" className="text-sm text-destructive">{submitError}</p>}
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Chargement..." : "Continuer"}
        </Button>
      </form>
    </Form>
  );
}
