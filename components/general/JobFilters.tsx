"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import { ChevronDown, X } from "lucide-react";
import { countryList } from "@/app/utils/countriesList";
import { benefits } from "@/app/utils/listOfBenefits";
import {
  CONTRACT_TYPE_OPTIONS,
  EMPLOYMENT_TYPE_OPTIONS,
} from "@/app/utils/jobOptions";

const inputClassName =
  "w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder:text-white/35 outline-none transition-colors focus:border-green-400/60 focus:bg-white/10";

const applyButtonClassName =
  "px-4 py-2 bg-green-500/90 hover:bg-green-600 text-white rounded-lg text-sm transition-colors";

export function JobFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);

  const currentJobTypes = searchParams.get("jobTypes")?.split(",") || [];
  const currentContractTypes =
    searchParams.get("contractTypes")?.split(",") || [];
  const currentLocation = searchParams.get("location") || "";
  const currentBenefits = searchParams.get("benefits")?.split(",").filter(Boolean) || [];
  const currentSort = searchParams.get("sort") || "recent";

  const [keyword, setKeyword] = useState(searchParams.get("keyword") || "");
  const [salaryMin, setSalaryMin] = useState(searchParams.get("salaryMin") || "");
  const [salaryMax, setSalaryMax] = useState(searchParams.get("salaryMax") || "");
  const [city, setCity] = useState(searchParams.get("city") || "");
  const [postalCode, setPostalCode] = useState(searchParams.get("postalCode") || "");
  const [company, setCompany] = useState(searchParams.get("company") || "");

  useEffect(() => {
    setKeyword(searchParams.get("keyword") || "");
    setSalaryMin(searchParams.get("salaryMin") || "");
    setSalaryMax(searchParams.get("salaryMax") || "");
    setCity(searchParams.get("city") || "");
    setPostalCode(searchParams.get("postalCode") || "");
    setCompany(searchParams.get("company") || "");
  }, [searchParams]);

  function clearAllFilter() {
    router.push("/");
  }

  const createQueryString = useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());

      if (name !== "page") {
        params.delete("page");
      }

      if (value) {
        params.set(name, value);
      } else {
        params.delete(name);
      }

      return params.toString();
    },
    [searchParams]
  );

  const createQueryStringFromValues = useCallback(
    (values: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());

      params.delete("page");

      Object.entries(values).forEach(([name, value]) => {
        if (value) {
          params.set(name, value);
        } else {
          params.delete(name);
        }
      });

      return params.toString();
    },
    [searchParams]
  );

  function pushQueryString(queryString: string) {
    router.push(queryString ? `?${queryString}` : "/");
  }

  function handleJobTypeChange(jobType: string, checked: boolean) {
    const current = new Set(currentJobTypes);

    if (checked) {
      current.add(jobType);
    } else {
      current.delete(jobType);
    }

    const newValue = Array.from(current).join(",");

    pushQueryString(createQueryString("jobTypes", newValue));
  }

  function handleContractTypeChange(contractType: string, checked: boolean) {
    const current = new Set(currentContractTypes);

    if (checked) {
      current.add(contractType);
    } else {
      current.delete(contractType);
    }

    const newValue = Array.from(current).join(",");

    pushQueryString(createQueryString("contractTypes", newValue));
  }

  function handleLocationChange(location: string) {
    pushQueryString(createQueryString("location", location));
  }

  function handleBenefitChange(benefitId: string, checked: boolean) {
    const current = new Set(currentBenefits);

    if (checked) {
      current.add(benefitId);
    } else {
      current.delete(benefitId);
    }

    pushQueryString(createQueryString("benefits", Array.from(current).join(",")));
  }

  function handleKeywordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    pushQueryString(createQueryString("keyword", keyword.trim()));
  }

  function handleSalarySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    pushQueryString(
      createQueryStringFromValues({
        salaryMin: salaryMin.trim(),
        salaryMax: salaryMax.trim(),
      })
    );
  }

  function handleFieldSubmit(
    event: FormEvent<HTMLFormElement>,
    name: string,
    value: string
  ) {
    event.preventDefault();
    pushQueryString(createQueryString(name, value.trim()));
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
          type="button"
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

      {/* Keyword Filter */}
      <motion.form
        variants={itemVariants}
        className="mb-6"
        onSubmit={handleKeywordSubmit}
      >
        <h4 className="text-white mb-4">Recherche</h4>
        <div className="flex flex-col gap-3">
          <input
            type="search"
            name="keyword"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="Titre, metier, entreprise..."
            className={inputClassName}
          />
          <button type="submit" className={applyButtonClassName}>
            Rechercher
          </button>
        </div>
      </motion.form>

      {/* Work Schedule Filter */}
      <motion.div variants={itemVariants} className="mb-6">
        <h4 className="text-white mb-4">Temps de travail</h4>
        <div className="space-y-3">
          {EMPLOYMENT_TYPE_OPTIONS.map((option) => (
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
                    animate={{
                      scale: currentJobTypes.includes(option.value) ? 0.5 : 0,
                    }}
                  />
                </div>
              </div>
              <span className="text-sm">{option.label}</span>
            </motion.label>
          ))}
        </div>
      </motion.div>

      {/* Contract Type Filter */}
      <motion.div variants={itemVariants} className="mb-6">
        <h4 className="text-white mb-4">Type de contrat</h4>
        <div className="space-y-3">
          {CONTRACT_TYPE_OPTIONS.map((option) => (
            <motion.label
              key={option.value}
              className="flex items-center gap-3 text-white/70 hover:text-white cursor-pointer group"
              whileHover={{ x: 4 }}
              transition={{ duration: 0.2 }}
            >
              <div className="relative">
                <input
                  type="checkbox"
                  name="contractType"
                  value={option.value}
                  className="peer sr-only"
                  checked={currentContractTypes.includes(option.value)}
                  onChange={(event) =>
                    handleContractTypeChange(
                      option.value,
                      event.target.checked
                    )
                  }
                />
                <div className="w-5 h-5 rounded-full border-2 border-white/30 peer-checked:border-green-400 transition-all group-hover:border-white/50">
                  <motion.div
                    className="w-full h-full rounded-full bg-green-400 scale-0 peer-checked:scale-50"
                    initial={false}
                    animate={{
                      scale: currentContractTypes.includes(option.value)
                        ? 0.5
                        : 0,
                    }}
                  />
                </div>
              </div>
              <span className="text-sm">{option.label}</span>
            </motion.label>
          ))}
        </div>
      </motion.div>

      {/* Salary Filter */}
      <motion.form
        variants={itemVariants}
        className="mb-6"
        onSubmit={handleSalarySubmit}
      >
        <h4 className="text-white mb-4">Salaire annuel</h4>
        <div className="grid grid-cols-2 gap-3">
          <input
            type="number"
            name="salaryMin"
            value={salaryMin}
            onChange={(event) => setSalaryMin(event.target.value)}
            placeholder="22000"
            min="0"
            className={inputClassName}
            aria-label="Salaire minimum"
          />
          <input
            type="number"
            name="salaryMax"
            value={salaryMax}
            onChange={(event) => setSalaryMax(event.target.value)}
            placeholder="45000"
            min="0"
            className={inputClassName}
            aria-label="Salaire maximum"
          />
        </div>
        <button type="submit" className={`${applyButtonClassName} mt-3 w-full`}>
          Appliquer
        </button>
      </motion.form>

      {/* Localisation Filter */}
      <motion.div variants={itemVariants} className="mb-6">
        <h4 className="text-white mb-4">Localisation</h4>
        <motion.button
          type="button"
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
                type="button"
                className={`w-full text-left px-4 py-2 rounded-lg border border-white/5 bg-white/[0.02] hover:bg-white/10 text-white/70 flex items-center gap-2 transition-colors ${
                  currentLocation === country.name
                    ? "border-green-400/60 text-white"
                    : ""
                }`}
                whileHover={{ x: 4 }}
                onClick={() => {
                  handleLocationChange(country.name);
                  setIsOpen(false);
                }}
              >
                <span className="text-sm">
                  {country.code} - {country.name}
                </span>
              </motion.button>
            ))}
          </motion.div>
        ) : null}
      </motion.div>

      {/* City Filter */}
      <motion.form
        variants={itemVariants}
        className="mb-6"
        onSubmit={(event) => handleFieldSubmit(event, "city", city)}
      >
        <h4 className="text-white mb-4">Ville</h4>
        <div className="flex flex-col gap-3">
          <input
            type="text"
            name="city"
            value={city}
            onChange={(event) => setCity(event.target.value)}
            placeholder="Paris, Lyon, Strasbourg..."
            className={inputClassName}
          />
          <button type="submit" className={applyButtonClassName}>
            Appliquer
          </button>
        </div>
      </motion.form>

      {/* Postal Code Filter */}
      <motion.form
        variants={itemVariants}
        className="mb-6"
        onSubmit={(event) => handleFieldSubmit(event, "postalCode", postalCode)}
      >
        <h4 className="text-white mb-4">Code postal</h4>
        <div className="flex flex-col gap-3">
          <input
            type="text"
            name="postalCode"
            value={postalCode}
            onChange={(event) => setPostalCode(event.target.value)}
            placeholder="75000, 67, 69000..."
            className={inputClassName}
          />
          <button type="submit" className={applyButtonClassName}>
            Appliquer
          </button>
        </div>
      </motion.form>

      {/* Benefits Filter */}
      <motion.div variants={itemVariants} className="mb-6">
        <h4 className="text-white mb-4">Avantages</h4>
        <div className="space-y-3">
          {benefits.map((benefit) => (
            <motion.label
              key={benefit.id}
              className="flex items-center gap-3 text-white/70 hover:text-white cursor-pointer group"
              whileHover={{ x: 4 }}
              transition={{ duration: 0.2 }}
            >
              <div className="relative">
                <input
                  type="checkbox"
                  name="benefits"
                  value={benefit.id}
                  className="peer sr-only"
                  checked={currentBenefits.includes(benefit.id)}
                  onChange={(event) =>
                    handleBenefitChange(benefit.id, event.target.checked)
                  }
                />
                <div className="w-5 h-5 rounded-full border-2 border-white/30 peer-checked:border-green-400 transition-all group-hover:border-white/50">
                  <motion.div
                    className="w-full h-full rounded-full bg-green-400 scale-0 peer-checked:scale-50"
                    initial={false}
                    animate={{
                      scale: currentBenefits.includes(benefit.id) ? 0.5 : 0,
                    }}
                  />
                </div>
              </div>
              <span className="text-sm">{benefit.label}</span>
            </motion.label>
          ))}
        </div>
      </motion.div>

      {/* Company Filter */}
      <motion.form
        variants={itemVariants}
        className="mb-6"
        onSubmit={(event) => handleFieldSubmit(event, "company", company)}
      >
        <h4 className="text-white mb-4">Entreprise</h4>
        <div className="flex flex-col gap-3">
          <input
            type="text"
            name="company"
            value={company}
            onChange={(event) => setCompany(event.target.value)}
            placeholder="Nom de l'entreprise"
            className={inputClassName}
          />
          <button type="submit" className={applyButtonClassName}>
            Appliquer
          </button>
        </div>
      </motion.form>

      {/* Sort Filter */}
      <motion.div variants={itemVariants}>
        <h4 className="text-white mb-4">Trier par</h4>
        <select
          name="sort"
          value={currentSort}
          onChange={(event) =>
            pushQueryString(createQueryString("sort", event.target.value))
          }
          className={inputClassName}
        >
          <option value="recent">Plus recentes</option>
          <option value="oldest">Plus anciennes</option>
          <option value="salary_desc">Salaire decroissant</option>
          <option value="salary_asc">Salaire croissant</option>
        </select>
      </motion.div>
    </motion.div>
  );
}
