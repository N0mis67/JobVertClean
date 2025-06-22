import { JobFilters } from "@/components/general/JobFilters";
import JobListings from "@/components/general/JobListings";
import JobListingsLoading from "@/components/general/JobListingLoading";
import Link from "next/link";
import { Suspense } from "react";

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
    <>
      <div className="relative text-center py-20 overflow-hidden">
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
          soyez paysagiste, élagueur, architecte ou technicien espaces verts
        </p>
      </div>

      {/* Section principale avec filtres et offres */}
      <section className="px-8 pb-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <JobFilters />

          <div className="md:col-span-2 flex flex-col gap-6">
            <Suspense key={filterKey} fallback={<JobListingsLoading />}>
              <JobListings
                currentPage={currentPage}
                jobTypes={jobTypes}
                location={location}
              />
            </Suspense>
          </div>
        </div>
      </section>
    </>
  );
}
