import Image from "next/image";
import Link from "next/link";
import leaf from "@/public/leaf.png";
import { RegisterForm } from "@/components/forms/RegisterForms";

export default function Register() {
  return (
    <div className="min-h-screen w-screen flex items-center justify-center">
      <div className="flex w-full max-w-sm flex-col gap-6 ">
        <Link href="/" className="flex items-center gap-2 self-center">
          <Image src={leaf} alt="Logo" className="size-10" />
          <h1 className="text-2xl font-bold">
            Job<span className="text-primary">Vert</span>
          </h1>
        </Link>
        <RegisterForm />

        <div className="text-center text-sm text-muted-foreground [&_a]">
          Vous avez déjà un compte ?{" "}
          <Link
            href="/login"
            className="font-medium text-primary hover:underline"
          >
            Connectez-vous
          </Link>
        </div>
        
      </div>
    </div>
  );
}