import { requireUser } from "@/app/utils/hook";
import { redirect } from "next/navigation";
import { ApplyForm } from "@/components/forms/ApplyForm";  // Composant du formulaire de candidature

interface ApplyPageProps {
  params: { jobId: string };
}

const ApplyPage = async ({ params }: ApplyPageProps) => {
  // Vérification de l'authentification de l'utilisateur
  const user = await requireUser();
  if (!user) {
    return redirect("/login");
  }

  // Préparation des valeurs par défaut à partir des infos utilisateur
  const { name, email } = user;
  let firstName = "";
  let lastName = "";
  if (name) {
    const parts = name.split(" ");
    firstName = parts[0] ?? "";
    lastName = parts.slice(1).join(" ");
  }

  return (
    <div className="container mx-auto py-8">  
      {/* Formulaire de candidature */}
      <ApplyForm 
        jobId={params.jobId} 
        firstName={firstName} 
        lastName={lastName} 
        email={email ?? ""} 
      />
    </div>
  );
};

export default ApplyPage;
