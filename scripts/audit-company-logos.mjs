import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const allowedHostnames = [
  "ufs.sh",
  "utfs.io",
  "res.cloudinary.com",
  "avatar.vercel.sh",
];

function getLogoIssue(logo) {
  if (!logo || !logo.trim()) {
    return "empty";
  }

  try {
    const url = new URL(logo);

    if (url.protocol !== "https:") {
      return "invalid-protocol";
    }

    const isAllowed =
      allowedHostnames.includes(url.hostname) || url.hostname.endsWith(".ufs.sh");

    if (!isAllowed) {
      return `unauthorized-domain:${url.hostname}`;
    }

    return null;
  } catch {
    return "invalid-url";
  }
}

async function main() {
  const companies = await prisma.company.findMany({
    select: {
      id: true,
      name: true,
      logo: true,
    },
    orderBy: {
      name: "asc",
    },
  });

  const invalidCompanies = companies
    .map((company) => ({
      ...company,
      issue: getLogoIssue(company.logo),
    }))
    .filter((company) => company.issue);

  if (invalidCompanies.length === 0) {
    console.log("All company logos look valid for next/image.");
    return;
  }

  console.table(
    invalidCompanies.map((company) => ({
      id: company.id,
      name: company.name,
      issue: company.issue,
      logo: company.logo,
    }))
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
