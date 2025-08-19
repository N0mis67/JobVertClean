"use client";

import { countryList } from "@/app/utils/countriesList";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/form";
import { Input } from "../ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Textarea } from "../ui/textarea";
import { XIcon } from "lucide-react";
import { Button } from "../ui/button";
import Image from "next/image";
import { toast } from "sonner";
import { UploadDropzone } from "../general/UploadThingReExport";
import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { jobSchema } from "@/app/utils/zodSchemas";
import { SalaryRangeSelector } from "../general/SalaryRangeSelector";
import JobDescriptionEditor from "../richTextEditor/JobDescriptionEditor";
import BenefitsSelector from "../general/BenefitsSelector";
import { createJob } from "@/app/actions";
import { jobListingDurationPricing } from "@/app/utils/pricingTiers";

interface CreateJobFormProps {
  companyName: string;
  companyLocation: string;
  companyAbout: string;    
  companyLogo: string;
  companyXAccount: string | null;
  companyWebsite: string | null;
}

export function CreateJobForm({
  companyAbout,
  companyLocation,    
  companyLogo,
  companyXAccount,
  companyName,
  companyWebsite,
}: CreateJobFormProps) {
  const form = useForm<z.infer<typeof jobSchema>>({
    resolver: zodResolver(jobSchema),
    defaultValues: {
      benefits: [],
      companyDescription: companyAbout,
      companyLocation: companyLocation,
      companyName: companyName,
      companyWebsite: companyWebsite || "",
      companyXAccount: companyXAccount || "",
      employmentType: "",
      jobDescription: "",
      jobTitle: "",
      location: "",
      salaryFrom: 0,
      salaryTo: 0,
      companyLogo: companyLogo,
      listingPlan: "Bonsai",
    },
  });    

  const [pending, setPending] = useState(false);
  async function onSubmit(values: z.infer<typeof jobSchema>) {
    try {
      setPending(true);

      await createJob(values);
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setPending(false);
    }
  }

  
  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="col-span-1   lg:col-span-2  flex flex-col gap-8"
      >
        <Card>
          <CardHeader>
            <CardTitle>Description du job</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="jobTitle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Titre</FormLabel>
                    <FormControl>
                      <Input placeholder="Titre du job" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="employmentType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type d'emploi</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner un type d'emploi" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectGroup>
                          <SelectLabel>Type d'emploi</SelectLabel>
                          <SelectItem value="Temps plein">Temps plein</SelectItem>
                          <SelectItem value="Temps partiel">Temps partiel</SelectItem>
                          <SelectItem value="Intérim">Intérim</SelectItem>
                          <SelectItem value="apprentissage">Stage/apprentissage</SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>

                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid md:grid-cols-2 gap-6">
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
                          <SelectValue placeholder="Sélectionner la localisation" />
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

              <FormItem>
                <FormLabel>Échelle salariale</FormLabel>
                <FormControl>
                  <SalaryRangeSelector
                    control={form.control}
                    minSalary={22000}
                    maxSalary={200000}
                  />
                </FormControl>
                <FormMessage>
                  {form.formState.errors.salaryFrom?.message ||
                    form.formState.errors.salaryTo?.message}
                </FormMessage>
              </FormItem>
            </div>

            <FormField
              control={form.control}
              name="jobDescription"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <JobDescriptionEditor field={field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="benefits"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Avantages</FormLabel>
                  <FormControl>
                    <BenefitsSelector field={field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Informations de l'entreprise</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="companyName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom de l'entreprise</FormLabel>
                    <FormControl>
                      <Input placeholder="Nom de l'entreprise..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="companyLocation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Localisation</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select Location" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectGroup>
                          <SelectLabel>Localisation</SelectLabel>
                          {countryList.map((country) => (
                            <SelectItem value={country.name} key={country.name}>
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
            <div className="grid md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="companyWebsite"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Site web</FormLabel>
                    <FormControl>
                      <div className="flex ">
                        <span className="flex items-center justify-center px-3 border border-r-0 border-input rounded-l-md bg-muted text-muted-foreground text-sm">
                          https://
                        </span>
                        <Input
                          {...field}
                          placeholder="Site web..."
                          className="rounded-l-none"
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="companyXAccount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Compte X</FormLabel>
                    <FormControl>
                      <div className="flex ">
                        <span className="flex items-center justify-center px-3 border border-r-0 border-input rounded-l-md bg-muted text-muted-foreground text-sm">
                          @
                        </span>
                        <Input
                          {...field}
                          placeholder="Compte X (Twitter)..."
                          className="rounded-l-none"
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="companyDescription"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description de l'entreprise</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Company Description"
                      className="min-h-[120px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="companyLogo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Logo de l'entreprise</FormLabel>
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
                            field.onChange(res[0].url);
                            toast.success("Logo uploaded successfully!");
                          }}
                          onUploadError={() => {
                            toast.error(
                              "Something went wrong. Please try again."
                            );
                          }}
                        />
                      )}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Abonnements</CardTitle>
          </CardHeader>
          <CardContent>
          <FormField
  control={form.control}
  name="listingPlan"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Choisissez un abonnement</FormLabel>
      <Select onValueChange={field.onChange} defaultValue={field.value}>
        <FormControl>
          <SelectTrigger>
            <SelectValue placeholder="Sélectionner un abonnement" />
          </SelectTrigger>
        </FormControl>
        <SelectContent>
          {jobListingDurationPricing.map((plan) => (
            <SelectItem key={plan.name} value={plan.name}>
              {`${plan.name} – ${plan.jobLimit} job${plan.jobLimit > 1 ? "s" : ""} / ${plan.durationDays} jours – ${plan.priceMonthly}€`}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <FormMessage />
    </FormItem>
  )}
/>
          </CardContent>
        </Card>
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Traitement..." : "Continuer"}
        </Button>
      </form>
    </Form>
  );
}