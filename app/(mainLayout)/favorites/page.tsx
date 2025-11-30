import { EmptyState } from "@/components/general/EmptyState";
import React from "react";
import { JobCard } from "@/components/general/JobCard";
import { prisma } from "@/app/utils/db";
import { requireUser } from "@/app/utils/hook";

async function getFavorites(userId: string) {
  const data = await prisma.savedJobPost.findMany({
    where: {
      userId: userId,
    },
    select: {
      job: {
        select: {
          id: true,
          jobTitle: true,
          salaryFrom: true,
          salaryTo: true,
          employmentType: true,
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
      },
    },
  });

  return data;
}

const FavoritesPage = async () => {
  const session = await requireUser();
  const favorites = await getFavorites(session.id as string);

  if (favorites.length === 0) {
    return (
      <EmptyState
        title="Aucun favori trouvé"
        description="Vous n'avez pas encore de favoris."
        buttonText="Trouver un job"
        href="/job"
      />
    );
  }

  return (
    <div className="grid grid-cols-1 mt-5   gap-4">
      {favorites.map((favorite, index) => (
        <JobCard job={favorite.job} key={favorite.job.id} index={index}/>
      ))}
    </div>
  );
};

export default FavoritesPage;