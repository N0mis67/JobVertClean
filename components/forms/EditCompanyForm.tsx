"use client";

import { useTransition } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormDescription,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Image from "next/image";
import { XIcon } from "lucide-react";
import { UploadDropzone } from "@/components/general/UploadThingReExport";
import { toast } from "sonner";
import { companySchema } from "@/app/utils/zodSchemas";
import { updateCompanyProfile } from "@/app/actions";
import { countryList } from "@/app/utils/countriesList";
import type { ListingPlanName } from "@/types/subscription";


interface EditCompanyFormProps {
  company: {
    name: string;
    location: string;
    about: string;
    logo: string;
    website: string | null;
    xAccount: string | null;
    defaultListingPlan: ListingPlanName | null;
  };
}

export function EditCompanyForm({ company }: EditCompanyFormProps) {
  const [isPending, startTransition] = useTransition();

  const form = useForm<z.infer<typeof companySchema>>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      name: company.name,
      location: company.location,
      about: company.about,
      logo: company.logo,
      website: company.website ?? "",
      xAccount: company.xAccount ?? "",
      defaultListingPlan: company.defaultListingPlan,
    },
  });

  function onSubmit(values: z.infer<typeof companySchema>) {
    startTransition(async () => {
      try {
        await updateCompanyProfile(values);
        toast.success("Profil entreprise mis à jour");
      } catch (error) {
        if (error instanceof Error && error.message !== "NEXT_REDIRECT") {
          toast.error("Une erreur s&apos;est produite. Veuillez réessayer.");
        }
      }
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nom de l&apos;entreprise</FormLabel>
                <FormControl>
                  <Input placeholder="Nom de l&apos;entreprise" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="location"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Localisation</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner une localisation" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Localisation</SelectLabel>
                      {countryList.map((country) => (
                        <SelectItem value={country.name} key={country.code}>
                          <span>{country.flagEmoji}</span>
                          <span className="pl-2">{country.name}</span>
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="website"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Site web</FormLabel>
                <FormControl>
                  <Input placeholder="https://votre-entreprise.fr" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="xAccount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Compte X (Twitter)</FormLabel>
                <FormControl>
                  <Input placeholder="@votreentreprise" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

         <FormField
          control={form.control}
          name="defaultListingPlan"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Plan préféré pour vos futures offres</FormLabel>
              <Select
                onValueChange={(value) =>
                  field.onChange(value === "" ? null : (value as ListingPlanName))
                }
                defaultValue={field.value ?? ""}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Toujours me demander" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="">Toujours me demander</SelectItem>
                  <SelectGroup>
                    <SelectLabel>Abonnements disponibles</SelectLabel>
                    <SelectItem value="Bonsai">Bonsai</SelectItem>
                    <SelectItem value="Arbuste">Arbuste</SelectItem>
                    <SelectItem value="Forêt">Forêt</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
              <FormDescription>
                Ce plan sera proposé par défaut lors de la création d'une nouvelle offre.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="about"
          render={({ field }) => (
            <FormItem>
              <FormLabel>À propos</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Parlez-nous de votre entreprise"
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
          name="logo"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Logo de l&apos;entreprise</FormLabel>
              <FormControl>
                <div>
                  {field.value ? (
                    <div className="relative w-fit">
                      <Image
                        src={field.value}
                        alt="Company Logo"
                        width={120}
                        height={120}
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
                    <UploadDropzone
                      endpoint="imageUploader"
                      onClientUploadComplete={(res) => {
                        const url = res?.[0]?.ufsUrl;
                        if (url) {
                          field.onChange(url);
                          toast.success("Logo téléchargé avec succès !");
                        }
                      }}
                      onUploadError={() => {
                        toast.error(
                          "Le téléchargement a échoué. Veuillez réessayer."
                        );
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

        <div className="flex justify-end">
          <Button type="submit" className="w-full md:w-auto" disabled={isPending}>
            {isPending ? "Enregistrement..." : "Enregistrer les modifications"}
          </Button>
        </div>
      </form>
    </Form>
  );
}