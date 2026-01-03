"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { XIcon } from "lucide-react";
import { toast } from "sonner";
import { createJob } from "@/app/actions";
import { countryList } from "@/app/utils/countriesList";
import { jobListingDurationPricing } from "@/app/utils/pricingTiers";
import { jobSchema } from "@/app/utils/zodSchemas";
import { cn } from "@/lib/utils";
import type {
  AutoSelectionReason,
  ListingPlanName,
  PlanUsage,
} from "@/types/subscription";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
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
import { PlanUsageSummary } from "../subscription/PlanUsageSummary";
import type { BenefitsSelectorProps } from "../general/BenefitsSelector";

const BenefitsSelector = dynamic<BenefitsSelectorProps>(
  () => import("../general/BenefitsSelector"),
  {
    ssr: false,
    loading: () => <div className="h-10 rounded-md bg-muted animate-pulse" />,
  }
);

const UploadDropzone = dynamic(
  () =>
    import("../general/UploadThingReExport").then(
      (mod) => mod.UploadDropzone
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-20 items-center justify-center rounded-md border border-dashed border-muted-foreground/50 bg-muted/30 text-sm text-muted-foreground">
        Préparation du téléchargement...
      </div>
    ),
  }
);

const SalaryRangeSelector = dynamic(
  () => import("../general/SalaryRangeSelector").then((mod) => mod.SalaryRangeSelector),
  {
    ssr: false,
    loading: () => <div className="h-12 rounded-md bg-muted animate-pulse" />,
  }
);

const JobDescriptionEditor = dynamic(
  () => import("../richTextEditor/JobDescriptionEditor"),
  {
    ssr: false,
    loading: () => (
      <div className="h-[360px] rounded-lg border bg-muted animate-pulse" />
    ),
  }
);

interface CreateJobFormProps {
  companyName: string;
  companyLocation: string;
  companyAbout: string;
  companyLogo: string;
  companyXAccount: string | null;
  companyWebsite: string | null;
  planUsage: PlanUsage[];
  initialPlan: ListingPlanName;
  autoSelectionReason: AutoSelectionReason;
  defaultListingPlan: ListingPlanName | null;
}

type FeedbackTone = "success" | "warning" | "error" | "info";

const QUOTA_STORAGE_KEY = "jobvert:last-listing-plan";

type QuotaFeedback = {
  tone: FeedbackTone;
  title: string;
  description: string;
  actions?: ReactNode;
};

export function CreateJobForm({
  companyAbout,
  companyLocation,
  companyLogo,
  companyXAccount,
  companyName,
  companyWebsite,
  planUsage,
  initialPlan,
  autoSelectionReason,
  defaultListingPlan,
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
      listingPlan: initialPlan,
    },
  });

  const [pending, setPending] = useState(false);
  const [deferHeavyFields, setDeferHeavyFields] = useState(false);
  const selectTriggerRef = useRef<HTMLButtonElement | null>(null);

  const currentPlan = form.watch("listingPlan") as ListingPlanName;

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const storedPlan = window.localStorage.getItem(QUOTA_STORAGE_KEY);
    const allowedPlan = jobListingDurationPricing.some(
      (plan) => plan.name === storedPlan
    );

    if (
      storedPlan &&
      allowedPlan &&
      storedPlan !== initialPlan
    ) {
      const matchingUsage = planUsage.find((item) => item.plan === storedPlan);
      if (matchingUsage && matchingUsage.remaining > 0) {
        form.setValue("listingPlan", storedPlan as ListingPlanName);
      }
    }
  }, [form, planUsage, initialPlan]);

  useEffect(() => {
    if (typeof window === "undefined" || !currentPlan) {
      return;
    }
    window.localStorage.setItem(QUOTA_STORAGE_KEY, currentPlan);
  }, [currentPlan]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handle =
      typeof window.requestIdleCallback === "function"
        ? window.requestIdleCallback(() => setDeferHeavyFields(true))
        : window.setTimeout(() => setDeferHeavyFields(true), 250);

    return () => {
      if (typeof window.cancelIdleCallback === "function") {
        window.cancelIdleCallback(handle as number);
      } else {
        clearTimeout(handle as number);
      }
    };
  }, []);

    const currentPlanUsage = useMemo(
    () => planUsage.find((item) => item.plan === currentPlan),
    [planUsage, currentPlan]
  );

  const currentPlanMetadata = useMemo(
    () => jobListingDurationPricing.find((plan) => plan.name === currentPlan),
    [currentPlan]
  );

  const canPublish = currentPlanUsage
    ? currentPlanUsage.remaining >= 0 || !Number.isFinite(currentPlanUsage.limit)
    : true;
  const isQuotaDepleted = Boolean(
    currentPlanUsage &&
      Number.isFinite(currentPlanUsage.limit) &&
      currentPlanUsage.remaining <= 0
  );

  const quotaFeedback = useMemo<QuotaFeedback | null>(() => {
    if (!currentPlan || !currentPlanUsage || !currentPlanMetadata) {
      return null;
    }

    if (!Number.isFinite(currentPlanUsage.limit)) {
      return {
        tone: "info" as FeedbackTone,
        title: `Plan ${currentPlan} illimité`,
        description: "Publiez autant d'offres que nécessaire avec ce plan.",
      };
    }

    if (currentPlanUsage.remaining <= 0) {
      return {
        tone: "error" as FeedbackTone,
        title: `Quota atteint pour ${currentPlan}`,
        description:
          "Vous avez utilisé toutes les offres incluses pour ce plan. Vous pouvez racheter cet abonnement ou sélectionner une autre formule pour continuer à publier.",
        actions: (
          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="submit" size="sm" disabled={pending}>
              Racheter le plan {currentPlan}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => selectTriggerRef.current?.click()}
            >
              Choisir un autre plan
            </Button>
          </div>
        ),
      };
    }

    const percent =
      currentPlanUsage.limit === 0
        ? 1
        : currentPlanUsage.used / currentPlanUsage.limit;

    if (percent >= 0.8) {
      return {
        tone: "warning" as FeedbackTone,
        title: `Plus que ${currentPlanUsage.remaining} offre${
          currentPlanUsage.remaining === 1 ? "" : "s"
        } avec ${currentPlan}`,
        description: `Pensez à anticiper une mise à niveau : ce plan couvre ${currentPlanMetadata.jobLimit} offre${
          currentPlanMetadata.jobLimit > 1 ? "s" : ""
        } sur ${currentPlanMetadata.durationDays} jours.`,
      };
    }

    return {
      tone: "success" as FeedbackTone,
      title: `Vous pouvez publier ${currentPlanUsage.remaining} nouvelle${
        currentPlanUsage.remaining === 1 ? "" : "s"
      } offre${currentPlanUsage.remaining === 1 ? "" : "s"} avec ${currentPlan}`,
      description: `Visibilité ${
        currentPlanMetadata.features[0] ?? "optimale"
      } pendant ${currentPlanMetadata.durationDays} jours.`,
    };
  }, [currentPlan, currentPlanUsage, currentPlanMetadata, pending]);

  const selectionMessage = useMemo(() => {
    if (!currentPlan) {
      return "";
    }

    if (currentPlan === initialPlan) {
      switch (autoSelectionReason) {
        case "lastUsed":
          return "Nous avons repris automatiquement le dernier abonnement utilisé.";
        case "default":
          return "Ce plan correspond à votre préférence définie dans le profil entreprise.";
        default:
          return "Choisissez l'abonnement le plus adapté pour chaque nouvelle offre.";
      }
    }

    return "Plan ajusté manuellement pour cette offre.";
  }, [autoSelectionReason, currentPlan, initialPlan]);

  const quotaToneClasses: Record<FeedbackTone, string> = {
    success: "border-green-200 bg-green-50 text-green-700",
    warning: "border-amber-200 bg-amber-50 text-amber-700",
    error: "border-red-200 bg-red-50 text-red-700",
    info: "border-blue-200 bg-blue-50 text-blue-700",
  };

  async function onSubmit(values: z.infer<typeof jobSchema>) {
    try {
      setPending(true);

      await createJob(values);
    } catch (error) {
      if (error instanceof Error && error.message === "JOB_LIMIT_REACHED") {
        toast.error(
          "Votre quota est épuisé. Rachetez cet abonnement via le bouton Continuer ou choisissez-en un autre pour publier votre offre."
        );
      } else {
        toast.error("Une erreur est survenue. Veuillez réessayer.");
      }
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
                    <FormLabel>Type d&apos;emploi</FormLabel>
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
                          <SelectLabel>Type d&apos;emploi</SelectLabel>
                          <SelectItem value="Temps plein">Temps plein</SelectItem>
                          <SelectItem value="Temps partiel">Temps partiel</SelectItem>
                          <SelectItem value="Intérim">Intérim</SelectItem>
                          <SelectItem value="apprentissage">Stage/Apprenti</SelectItem>
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
                  {deferHeavyFields ? (
                    <SalaryRangeSelector
                      control={form.control}
                      minSalary={22000}
                      maxSalary={200000}
                    />
                  ) : (
                    <div className="h-12 rounded-md bg-muted animate-pulse" />
                  )}
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
                  {deferHeavyFields ? (
                    <JobDescriptionEditor field={field} />
                  ) : (
                    <div className="h-[360px] rounded-lg border bg-muted animate-pulse" />
                  )}
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
                  {deferHeavyFields ? (
                    <BenefitsSelector field={field} />
                  ) : (
                    <div className="h-10 rounded-md bg-muted animate-pulse" />
                  )}
                </FormControl>
                <FormMessage />
              </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Informations de l&apos;entreprise</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="companyName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom de l&apos;entreprise</FormLabel>
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
                  <FormLabel>Description de l&apos;entreprise</FormLabel>
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
                      ) : deferHeavyFields ? (
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
                        ) : (
                        <div className="flex h-20 items-center justify-center rounded-md border border-dashed border-muted-foreground/50 bg-muted/30 text-sm text-muted-foreground">
                          Préparation du téléchargement...
                        </div>
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
          <CardHeader className="space-y-2">
            <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <CardTitle>Abonnements</CardTitle>
                <CardDescription>
                  Retrouvez votre plan préféré et ajustez-le si besoin pour cette offre.
                </CardDescription>
              </div>
              <Badge variant="secondary" className="w-fit">
                Plan {currentPlan}
              </Badge>
            </div>
            {selectionMessage ? (
              <p className="text-xs text-muted-foreground">{selectionMessage}</p>
            ) : null}
            {defaultListingPlan && (
              <p className="text-xs text-muted-foreground">
                Préférence entreprise actuelle : {defaultListingPlan}
              </p>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="listingPlan"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Choisissez un abonnement</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger ref={selectTriggerRef}>
                        <SelectValue placeholder="Sélectionner un abonnement" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {jobListingDurationPricing.map((plan) => {
                        const usage = planUsage.find(
                          (item) => item.plan === plan.name
                        );
                        const remaining = usage?.remaining ?? plan.jobLimit;
                        return (
                          <SelectItem key={plan.name} value={plan.name}>
                            <div className="flex flex-col gap-1 text-sm">
                              <span className="font-medium">{plan.name}</span>
                              <span className="text-xs text-muted-foreground">
                                {plan.jobLimit} offre{plan.jobLimit > 1 ? "s" : ""} / {plan.durationDays} jours •
                                {" "}
                                {remaining} restante{remaining === 1 ? "" : "s"}
                              </span>
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => selectTriggerRef.current?.click()}
                    >
                      Modifier
                    </Button>
                    <span>
                      Le plan sélectionné détermine la visibilité, la durée et le quota disponible.
                    </span>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {quotaFeedback ? (
              <div
                className={cn(
                  "rounded-md border p-3 text-sm",
                  quotaToneClasses[quotaFeedback.tone]
                )}
              >
                <p className="font-medium">{quotaFeedback.title}</p>
                <p className="text-xs mt-1">
                  {quotaFeedback.description}{" "}
                </p>
                {quotaFeedback.actions}
              </div>
            ) : null}

            <PlanUsageSummary
              planUsage={planUsage}
              highlightPlan={currentPlan}
              title="Quota restant par abonnement"
            />
          </CardContent>
        </Card>
        <Button
          type="submit"
          className="w-full"
          disabled={pending || !canPublish}
        >
          {pending
            ? "Traitement..."
            : isQuotaDepleted
              ? "Continuer pour racheter ce plan"
              : "Continuer"}
        </Button>
      </form>
    </Form>
  );
}