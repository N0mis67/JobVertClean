import {
    Eye,
    SmileIcon as Tooth,
    Heart,
    Umbrella,
    Clock,
    Calendar,
    GraduationCap,
    Dumbbell,
    Brain,
    PieChart,
    Coins,
    UserPlus,
  } from "lucide-react";
  
  interface Benefit {
    id: string;
    label: string;
    icon: React.ReactNode;
  }
  
  export const benefits: Benefit[] = [
    {
      id: "medical",
      label: "Bonne mutuelle santé",
      icon: <Heart className="w-3 h-3" />,
    },
    {
      id: "dental",
      label: "Assurance dentaire complémentaire",
      icon: <Tooth className="w-3 h-3" />,
    },
    {
      id: "vision",
      label: "Assurance optique complémentaire",
      icon: <Eye className="w-3 h-3" />,
    },
    {
      id: "pto",
      label: "Congés payés supplémentaires",
      icon: <Clock className="w-3 h-3" />,
    },
    {
      id: "unlimited_vacation",
      label: "RTT ou congés flexibles",
      icon: <Umbrella className="w-3 h-3" />,
    },
    {
      id: "four_day",
      label: "Semaine de 4 jours possible",
      icon: <Calendar className="w-3 h-3" />,
    },
    {
      id: "learning_budget",
      label: "Budget formation professionnelle",
      icon: <GraduationCap className="w-3 h-3" />,
    },
    {
      id: "mental_wellness",
      label: "Budget bien-être mental",
      icon: <Brain className="w-3 h-3" />,
    },
    {
      id: "gym",
      label: "Abonnement à une salle de sport",
      icon: <Dumbbell className="w-3 h-3" />,
    },
    {
      id: "profit_sharing",
      label: "Partage des bénéfices (intéressement)",
      icon: <PieChart className="w-3 h-3" />,
    },
    {
      id: "equity",
      label: "Participation au capital (si éligible)",
      icon: <Coins className="w-3 h-3" />,
    },
    {
      id: "hire_old_young",
      label: "Ouvert aux jeunes et aux seniors",
      icon: <UserPlus className="w-3 h-3" />,
    },
  ];
  