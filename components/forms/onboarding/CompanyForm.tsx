"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
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
import Image from "next/image";
import { XIcon } from "lucide-react";
import { toast } from "sonner";
import { companySchema } from "@/app/utils/zodSchemas";
import { useState } from "react";
import { createCompany } from "@/app/actions";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { countryList } from "@/app/utils/countriesList";
import { UploadDropzone } from "@/components/general/UploadThingReExport";
import type { ListingPlanName } from "@/types/subscription";

const ALWAYS_ASK_VALUE = "always-ask";



export default function CompanyForm() {
    const form = useForm<z.infer<typeof companySchema>>({
        resolver: zodResolver(companySchema),
        defaultValues: {
            about:"",
            location:"",
            logo:"",
            name:"",
            website:"",
            xAccount:"",
            defaultListingPlan: null,
        },
    });

    const [pending, setPending] = useState(false);

    async function onSubmit(values: z.infer<typeof companySchema>) {
        try {
            setPending(true);
            await createCompany(values);
        } catch (error) {
            console.log(error);
            if (error instanceof Error && error.message !== "NEXT REDIRECT") {
                toast.error("Une erreur s'est produite. Veuillez réessayer.");
            }
        } finally {
            setPending(false);
        }
    }

    return (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Two column layout for basic info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom de l&apos;entreprise</FormLabel>
                    <FormControl>
                      <Input placeholder="Entrer le nom de l'entreprise" {...field} />
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
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
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
    
            {/* Two column layout for website and X account */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="website"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Site Web</FormLabel>
                    <FormControl>
                      <Input placeholder="https://your-company.com" {...field} />
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
                      <Input placeholder="@yourcompany" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
    
            {/* Full width for about section */}
            <FormField
              control={form.control}
              name="about"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>À propos</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Parlez nous de votre entreprise..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
    
            {/* Full width for logo upload */}
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
                      endpoint="imageUploader"
                      onClientUploadComplete={(res) => {
                        field.onChange(res[0].ufsUrl);
                        toast.success("Logo téléchargé avec succès !");
                      }}
                      onUploadError={() => {
                        toast.error("Quelque chose s'est mal passé. Veuillez réessayer.");
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

            <FormField
              control={form.control}
              name="defaultListingPlan"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Plan sélectionné par défaut</FormLabel>
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
                      <SelectItem value={ALWAYS_ASK_VALUE}>Toujours me demander</SelectItem>
                      <SelectGroup>
                        <SelectLabel>Abonnements disponibles</SelectLabel>
                        <SelectItem value="Bonsai">Bonsai</SelectItem>
                        <SelectItem value="Arbuste">Arbuste</SelectItem>
                        <SelectItem value="Forêt">Forêt</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Cette préférence sera utilisée pour pré-remplir vos prochaines offres.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
    
            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? "Chargement..." : "Continuer"}
            </Button>
          </form>
        </Form>
      );
    }