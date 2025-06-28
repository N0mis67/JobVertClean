import { JobFilters } from "@/components/general/JobFilters";
import JobListings from "@/components/general/JobListings";
import JobListingsLoading from "@/components/general/JobListingLoading";
import { Suspense } from "react";
import { Metadata } from "next";

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
      <header className="relative text-center py-20 overflow-hidden">
        {/* Halo lumineux */}
        <div className="absolute inset-0 flex justify-center items-start pointer-events-none">
          <div className="w-96 h-96 bg-green-500 opacity-30 blur-3xl rounded-full mt-[-90px]" />
        </div>

        <h1 className="relative text-4xl md:text-5xl font-bold mb-4 z-10">
          Offres d’emploi pour{" "}
          <span className="bg-gradient-to-r from-[#81DE56] to-white bg-clip-text text-transparent">paysagistes</span>
        </h1>
        <p className="relative max-w-2xl mx-auto text-lg z-10">
          Découvrez des nouveaux emplois dans le secteur du paysage, que vous
          soyez paysagiste, élagueur, architecte ou technicien espaces verts.
          Trouvez un emploi qui correspond à votre expertise dans l’aménagement paysager.
        </p>
      </header>

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