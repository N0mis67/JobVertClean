"use client";

import { Card, CardContent } from "@/components/ui/card";
import { useState } from "react";

import CompanyForm from "./CompanyForm";
import JobSeekerForm from "./JobSeekerForm";

import Image from "next/image";
import leaf from "@/public/leaf.png";
import UserTypeSelection from "./UserTypeSelection";


type UserType = "Entreprise" | "Demandeur d'emploi" | null;

export default function OnboardingForm() {
  const [step, setStep] = useState(1);
  const [userType, setUserType] = useState<UserType>(null);

  const handleUserTypeSelect = (type: UserType) => {
    setUserType(type);
    setStep(2);
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return <UserTypeSelection onSelect={handleUserTypeSelect} />;
      case 2:
        return userType === "Entreprise" ? <CompanyForm /> : <JobSeekerForm />;
      default:
        return null;
    }
  };

  return (
    <>
      <div className="flex items-center gap-3 mb-10">
        <Image src={leaf} alt="JobMarshal Logo" width={50} height={50} />
        <span className="text-4xl font-bold">
          Job<span className="text-primary">Vert</span>
        </span>
      </div>
      <Card className="w-full max-w-lg">
        <CardContent className="p-6">{renderStep()}</CardContent>
      </Card>
    </>
  );
}