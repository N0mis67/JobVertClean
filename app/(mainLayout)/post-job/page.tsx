import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
  } from "@/components/ui/card";
import React from "react";
import Image from "next/image";
import ArcJetLogo from "@/public/arcjet.jpg";
import InngestLogo from "@/public/inngest-locale.png";
import { CreateJobForm } from "@/components/forms/CreateJobForm";
import { prisma } from "@/app/utils/db";
import { requireUser } from "@/app/utils/hook";
import { redirect } from "next/navigation";
import {
  getCompanyPlanUsage,
  resolveInitialPlan,
} from "@/app/utils/subscription";

const companies = [
  { id: 0, name: "ArcJet", logo: ArcJetLogo },
  { id: 1, name: "Inngest", logo: InngestLogo },
  { id: 2, name: "ArcJet", logo: ArcJetLogo },
  { id: 3, name: "Inngest", logo: InngestLogo },
  { id: 4, name: "ArcJet", logo: ArcJetLogo },
  { id: 5, name: "Inngest", logo: InngestLogo },
];

const testimonials = [
  {
    quote:
      "J’ai posté une offre et reçu 3 candidatures qualifiées dans la journée.",
    author: "Retour client"
  },
  {
    quote:
      "The platform made hiring remote talent incredibly simple. Highly recommended!",
    author: "Mark Johnson",
    company: "StartupX",
  },
  {
    quote:
      "We've consistently found high-quality candidates here. It's our go-to platform for all our hiring needs.",
    author: "Emily Rodriguez",
    company: "InnovateNow",
  },
];

const stats = [
  { value: "10k+", label: "Monthly active job seekers" },
  { value: "48h", label: "Average time to hire" },
  { value: "95%", label: "Employer satisfaction rate" },
  { value: "500+", label: "Companies hiring monthly" },
];

async function getCompany(userId: string) {
  const data = await prisma.company.findUnique({
    where: {
      userId: userId,
    },
    select: {
      id: true,
      name: true,
      location: true,
      about: true,
      logo: true,
      xAccount: true,
      website: true,
      defaultListingPlan: true,
      lastUsedListingPlan: true,
    },
  });

  if (!data) {
    return redirect("/");
  }
  return data;
}

const PostJobPage = async () => {
  const session = await requireUser();
  const data = await getCompany(session.id as string);
  const planUsage = await getCompanyPlanUsage(data.id);
  const { plan: initialPlan, reason } = resolveInitialPlan(planUsage, {
    lastUsed: data.lastUsedListingPlan,
    defaultPlan: data.defaultListingPlan,
  });
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-5">
      <CreateJobForm
        companyAbout={data.about}
        companyLocation={data.location}
        companyLogo={data.logo}
        companyName={data.name}
        companyXAccount={data.xAccount}
        companyWebsite={data.website}
        planUsage={planUsage}
        initialPlan={initialPlan}
        autoSelectionReason={reason}
        defaultListingPlan={data.defaultListingPlan ?? null}
      />

      <div className="col-span-1">
        <Card className="lg:sticky lg:top-4">
          <CardHeader>
            <CardTitle className="text-xl">
            100% dédié aux métiers des espaces verts
            </CardTitle>
            <CardDescription>
            Rejoignez les entreprises qui recrutent les meilleurs talents
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Company Logos */}
            <div className="grid grid-cols-3 gap-4">
              {companies.map((company) => (
                <div
                  key={company.id}
                  className="flex items-center justify-center"
                >
                  <Image
                    src={company.logo}
                    alt={company.name}
                    height={80}
                    width={80}
                    className="opacity-75 transition-opacity hover:opacity-100 rounded-lg"
                  />{" "}
                </div>
              ))}
            </div>

            {/* Testimonials */}
            <div className="space-y-4">
              {testimonials.map((testimonial, index) => (
                <blockquote
                  key={index}
                  className="border-l-2 border-primary pl-4"
                >
                  <p className="text-sm italic text-muted-foreground">
                    "{testimonial.quote}"
                  </p>
                  <footer className="mt-2 text-sm font-medium">
                    - {testimonial.author}, {testimonial.company}
                  </footer>
                </blockquote>
              ))}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4">
              {stats.map((stat, index) => (
                <div key={index} className="rounded-lg bg-muted p-4">
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <div className="text-sm text-muted-foreground">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PostJobPage;