"use client";

import { useCallback, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import { ChevronDown, X } from "lucide-react";
import { countryList } from "@/app/utils/countriesList";

const jobTypes = [
  { label: "Temps plein", value: "Temps plein" },
  { label: "Temps partiel", value: "Temps partiel" },
  { label: "Intérim", value: "Intérim" },
  { label: "Stage/Apprenti", value: "apprentissage" },
];

export function JobFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);

  //get currnet filters from the URL
  const currentJobTypes = searchParams.get("jobTypes")?.split(",") || [];
  const currentLocation = searchParams.get("location") || "";

  function clearAllFilter() {
    router.push("/");
  }

  const createQueryString = useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());

      if (value) {
        params.set(name, value);
      } else {
        params.delete(name);
      }

      return params.toString();
    },
    [searchParams]
  );

  function handleJobTypeChange(jobType: string, checked: boolean) {
    const current = new Set(currentJobTypes);

    if (checked) {
      current.add(jobType);
    } else {
      current.delete(jobType);
    }

    const newValue = Array.from(current).join(",");

    router.push(`?${createQueryString("jobTypes", newValue)}`);
  }

  function handleLocationChange(location: string) {
    router.push(`?${createQueryString("location", location)}`);
  }

  const containerVariants = {
    hidden: { opacity: 0, x: -50 },
    visible: {
      opacity: 1,
      x: 0,
      transition: {
        duration: 0.5,
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0 },
  };

  return (
    <motion.div
      className="col-span-1 h-fit bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-sm border border-white/10 rounded-2xl p-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <div className="flex items-center justify-between mb-6">
        <motion.h3 className="text-white text-xl" variants={itemVariants}>
          Filtres
        </motion.h3>
        <motion.button
          className="px-4 py-2 bg-red-500/90 hover:bg-red-600 text-white rounded-lg text-sm flex items-center gap-2 transition-colors"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          variants={itemVariants}
          onClick={clearAllFilter}
          >
            Tout effacer
          <X className="w-4 h-4" />
        </motion.button>
      </div>

      {/* Type Filter */}
      <motion.div variants={itemVariants} className="mb-6">
        <h4 className="text-white mb-4">Type</h4>
        <div className="space-y-3">
          {jobTypes.map((option) => (
            <motion.label
              key={option.value}
              className="flex items-center gap-3 text-white/70 hover:text-white cursor-pointer group"
              whileHover={{ x: 4 }}
              transition={{ duration: 0.2 }}
            >
              <div className="relative">
                <input
                  type="checkbox"
                  name="type"
                  value={option.value}
                  className="peer sr-only"
                  checked={currentJobTypes.includes(option.value)}
                  onChange={(event) =>
                    handleJobTypeChange(option.value, event.target.checked)
                  }
                />
                <div className="w-5 h-5 rounded-full border-2 border-white/30 peer-checked:border-green-400 transition-all group-hover:border-white/50">
                  <motion.div
                    className="w-full h-full rounded-full bg-green-400 scale-0 peer-checked:scale-50"
                    initial={false}
                    animate={{ scale: currentJobTypes.includes(option.value) ? 0.5 : 0 }}
                  />
                </div>
              </div>
              <span className="text-sm">{option.label}</span>
            </motion.label>
          ))}
        </div>
         </motion.div>

      {/* Localisation Filter */}
      <motion.div variants={itemVariants}>
        <h4 className="text-white mb-4">Localisation</h4>
        <motion.button
          className="w-full px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white/70 flex items-center justify-between transition-colors"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setIsOpen(!isOpen)}
        >
          <span className="text-sm">{currentLocation || "Localisation"}</span>
          <motion.div
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.3 }}
          >
            <ChevronDown className="w-4 h-4" />
          </motion.div>
        </motion.button>
        {isOpen ? (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 max-h-60 overflow-y-auto space-y-2"
          >
            {countryList.map((country) => (
              <motion.button
                key={country.code}
                className={`w-full text-left px-4 py-2 rounded-lg border border-white/5 bg-white/[0.02] hover:bg-white/10 text-white/70 flex items-center gap-2 transition-colors ${
                  currentLocation === country.name ? "border-green-400/60 text-white" : ""
                }`}
                whileHover={{ x: 4 }}
                onClick={() => {
                  handleLocationChange(country.name);
                  setIsOpen(false);
                }}
              >
                <span>{country.flagEmoji}</span>
                <span className="text-sm">{country.name}</span>
              </motion.button>
            ))}
          </motion.div>
        ) : null}
      </motion.div>
    </motion.div>
  );
}

