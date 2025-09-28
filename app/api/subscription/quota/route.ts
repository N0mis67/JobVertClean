import { NextResponse } from "next/server";

import { prisma } from "@/app/utils/db";
import { auth } from "@/app/utils/auth";
import { getCompanyPlanUsage } from "@/app/utils/subscription";

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ planUsage: [] }, { status: 401 });
  }

  const company = await prisma.company.findUnique({
    where: {
      userId: session.user.id as string,
    },
    select: {
      id: true,
    },
  });

  if (!company) {
    return NextResponse.json({ planUsage: [] });
  }

  const planUsage = await getCompanyPlanUsage(company.id);

  return NextResponse.json({ planUsage });
}