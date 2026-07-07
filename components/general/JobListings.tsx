import { prisma } from "@/app/utils/db";
import { EmptyState } from "./EmptyState";
import { PaginationComponent } from "./PaginationComponent";
import { JobCard } from "./JobCard";
import { JobPostStatus, Prisma } from "@prisma/client";
import {
  CONTRACT_TYPE_VALUES,
  type ContractTypeValue,
} from "@/app/utils/jobOptions";

async function getJobs(
  page: number = 1,
  pageSize: number = 10,
  jobTypes: string[] = [],
  contractTypes: string[] = [],
  location: string = "",
  keyword: string = "",
  salaryMin?: number,
  salaryMax?: number,
  city: string = "",
  postalCode: string = "",
  benefits: string[] = [],
  company: string = "",
  sort: string = "recent"
) {
  const skip = (page - 1) * pageSize;
  const validContractTypes = contractTypes.filter(
    (contractType): contractType is ContractTypeValue =>
      CONTRACT_TYPE_VALUES.includes(contractType as ContractTypeValue)
  );

  const orderBy: Prisma.JobPostOrderByWithRelationInput =
    sort === "oldest"
      ? { createdAt: "asc" }
      : sort === "salary_desc"
        ? { salaryTo: "desc" }
        : sort === "salary_asc"
          ? { salaryFrom: "asc" }
          : { createdAt: "desc" };

  const where: Prisma.JobPostWhereInput = {
    status: JobPostStatus.ACTIVE,
    ...(jobTypes.length > 0 && {
      employmentType: {
        in: jobTypes,
      },
    }),
    ...(validContractTypes.length > 0 && {
      contractType: {
        in: validContractTypes,
      },
    }),
    ...(location &&
      location !== "worldwide" && {
        location: location,
      }),
    ...(keyword && {
      OR: [
        { jobTitle: { contains: keyword, mode: "insensitive" } },
        { jobDescription: { contains: keyword, mode: "insensitive" } },
        {
          company: {
            name: { contains: keyword, mode: "insensitive" },
          },
        },
      ],
    }),
    ...(salaryMin !== undefined && {
      salaryTo: {
        gte: salaryMin,
      },
    }),
    ...(salaryMax !== undefined && {
      salaryFrom: {
        lte: salaryMax,
      },
    }),
    ...(city && {
      workplaceAddressLocality: {
        contains: city,
        mode: "insensitive",
      },
    }),
    ...(postalCode && {
      workplacePostalCode: {
        startsWith: postalCode,
      },
    }),
    ...(benefits.length > 0 && {
      benefits: {
        hasEvery: benefits,
      },
    }),
    ...(company && {
      company: {
        name: {
          contains: company,
          mode: "insensitive",
        },
      },
    }),
  };

  const [data, totalCount] = await Promise.all([
    prisma.jobPost.findMany({
      skip,
      take: pageSize,
      where,
      select: {
        jobTitle: true,
        jobDescription: true,
        id: true,
        slug: true,
        salaryFrom: true,
        salaryTo: true,
        employmentType: true,
        contractType: true,
        location: true,
        createdAt: true,
        company: {
          select: {
            name: true,
            logo: true,
            location: true,
            about: true,
          },
        },
      },
      orderBy,
    }),
    prisma.jobPost.count({ where }),
  ]);

  return {
    jobs: data,
    totalPages: Math.ceil(totalCount / pageSize),
    currentPage: page,
  };
}

export default async function JobListings({
  currentPage,
  jobTypes,
  contractTypes,
  location,
  keyword,
  salaryMin,
  salaryMax,
  city,
  postalCode,
  benefits,
  company,
  sort,
}: {
  currentPage: number;
  jobTypes: string[];
  contractTypes: string[];
  location: string;
  keyword?: string;
  salaryMin?: number;
  salaryMax?: number;
  city?: string;
  postalCode?: string;
  benefits?: string[];
  company?: string;
  sort?: string;
}) {
  const {
    jobs,
    totalPages,
    currentPage: page,
  } = await getJobs(
    currentPage,
    7,
    jobTypes,
    contractTypes,
    location,
    keyword,
    salaryMin,
    salaryMax,
    city,
    postalCode,
    benefits,
    company,
    sort
  );

  return (
    <>
      {jobs.length > 0 ? (
        <div className="flex flex-col gap-6">
          {jobs.map((job, index) => (
            <JobCard job={job} key={index} index={index}/>
          ))}
        </div>
      ) : (
        <EmptyState
          title="Aucun emploi trouvé"
          description="Essayez de rechercher un autre titre de poste ou un autre lieu."
          buttonText="Supprimer tous les filtres"
          href="/"
        />
      )}

      <div className="flex justify-center mt-6">
        <PaginationComponent totalPages={totalPages} currentPage={page} />
      </div>
    </>
  );
}
