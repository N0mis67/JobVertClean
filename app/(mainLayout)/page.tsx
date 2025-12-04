import { JobFilters } from "@/components/general/JobFilters";
import JobListings from "@/components/general/JobListings";
import JobListingsLoading from "@/components/general/JobListingLoading";
import { Suspense } from "react";
import { Metadata } from "next";
import Hero from "./Hero";

export const metadata: Metadata = {
  title: "JobVert – Offres d’emploi en aménagement paysager",
  description: "Trouvez des offres d’emploi spécialisées dans le domaine du paysage : paysagiste, élagueur, architecte paysagiste, technicien espaces verts, et plus encore. Recherchez par type de contrat, localisation et niveau de salaire sur JobVert.",
};

type SearchParamsProps = {
  searchParams: Promise<{
    page?: string;
    jobTypes?: string;
    location?: string;
  }>;
};

export default async function Home({ searchParams }: SearchParamsProps) {
  const params = await searchParams;
  const currentPage = Number(params.page) || 1;
  const jobTypes = params.jobTypes?.split(",") || [];
  const location = params.location || "";

  // Create a composite key from all filter parameters
  const filterKey = `page=${currentPage};types=${jobTypes.join(",")};location=${location}`;

  return (
    <main>
      <Hero />

      <section className="px-4 sm:px-6 md:px-8 pb-16" aria-labelledby="offres-section">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <aside className="lg:col-span-1" aria-label="Filtres de recherche">
            <JobFilters />
          </aside>

          <section className="lg:col-span-2 flex flex-col gap-6" aria-label="Liste des offres d’emploi">
            <Suspense key={filterKey} fallback={<JobListingsLoading />}>
              <JobListings
                currentPage={currentPage}
                jobTypes={jobTypes}
                location={location}
              />
            </Suspense>
          </section>
        </div>
      </section>
    </main>
  );
}