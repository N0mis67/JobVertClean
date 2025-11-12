import Link from "next/link";
import leaf from "@/public/leaf.png"
import Image from "next/image";
import { Button, buttonVariants } from "../ui/button";
import { auth } from "@/app/utils/auth";
import { Menu } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { UserDropdown } from "@/components/general/UserDropdown";
import { prisma} from "@/app/utils/db";

export async function Navbar() {
  const session = await auth();
  let companyId: string | null = null;

  if (session?.user?.id) {
    const company = await prisma.company.findUnique({
      where: {
        userId: session.user.id as string,
      },
      select: {
        id: true,
      },
    });

    companyId = company?.id ?? null;
  }
    return (
        <nav className="flex items-center justify-between py-5">
            <Link href="/" className="flex items-center gap-2">
            <Image src={leaf} alt="Logo leaf" width={40} height={40}/>
              <h1 className="text-2xl font-bold">
                Job<span className="text-primary">Vert</span>
              </h1>
            </Link>

            <div className="hidden md:flex items-center gap-4">
              <Link href="/post-job" className={buttonVariants({ size: "lg" })}>
                Publier un job
              </Link>
              {session?.user ? (
                <UserDropdown
                email={session.user.email as string}
                  name={session.user.name as string}
                  image={session.user.image as string}
                  companyId={companyId}
                />
              ) : (
                <div className="flex items-center gap-2">
                  <Link
                    href="/register"
                    className={buttonVariants({ size: "lg" })}
                  >
                    Créer un compte
                  </Link>
                  <Link
                    href="/login"
                    className={buttonVariants({ variant: "outline", size: "lg" })}
                  >
                    Connexion
                  </Link>
                </div>
              )}
            </div>
            <div className="md:hidden flex items-center gap-4">
       
        {session?.user ? (
          <UserDropdown
            email={session.user.email as string}
            name={session.user.name as string}
            image={session.user.image as string}
            companyId={companyId}
          />
        ) : (
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader className="text-left">
                <SheetTitle>
                  Job<span className="text-primary">Vert</span>
                </SheetTitle>
                <SheetDescription>
                Trouvez ou publiez votre prochain Job
                </SheetDescription>
              </SheetHeader>

              <div className="flex flex-col gap-4 mt-6">
                <Link
                  href="/"
                  className="text-lg px-4 py-2 rounded-md bg-secondary hover:bg-secondary/80 transition-colors duration-200"
                >
                  Trouver un Job
                </Link>
                <Link
                  href="/post-job"
                  className="text-lg px-4 py-2 rounded-md bg-secondary hover:bg-secondary/80 transition-colors duration-200"
                >
                  Publier un Job
                </Link>
                <Link
                  href="/register"
                  className="text-lg px-4 py-2 rounded-md bg-secondary hover:bg-secondary/80 transition-colors duration-200"
                >
                  Créer un compte
                </Link>
                <Link
                  href="/login"
                  className="text-lg px-4 py-2 rounded-md bg-secondary hover:bg-secondary/80 transition-colors duration-200"
                >
                  Connexion
                </Link>
              </div>
            </SheetContent>
          </Sheet>
        )}
      </div>

           
        </nav>
    );
}