import { z } from "zod";
import { CONTRACT_TYPE_VALUES } from "./jobOptions";

export const companySchema = z.object({
  name: z.string().min(2, "Company name must be at least 2 characters"),
  location: z.string().min(2, "Location must be at least 2 characters"),
  about: z
    .string()
    .min(10, "Please provide more information about your company"),
  logo: z.string().url("Veuillez téléverser un logo valide"),
  website: z.string().url("Please enter a valid website URL"),
  xAccount: z.string().optional(),
  defaultListingPlan: z.enum(["Bonsai", "Arbuste", "Forêt"]).nullable().optional(),
});

export const jobSeekerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  about: z.string().min(10, "Please provide more information about yourself"),
  resume: z.string().min(1, "Please upload a resume"),
});

export const jobSchema = z.object({
  jobTitle: z.string().min(2, "Job title must be at least 2 characters"),
  employmentType: z.enum(["Temps plein", "Temps partiel"], {
    error: "Please select a work schedule",
  }),
  contractType: z.enum(CONTRACT_TYPE_VALUES, {
    error: "Please select a contract type",
  }),
  location: z.string().min(1, "Please select a location"),
  workplaceStreetAddress: z
    .string()
    .trim()
    .min(1, "Workplace street address is required"),
  workplacePostalCode: z
    .string()
    .trim()
    .min(1, "Workplace postal code is required"),
  workplaceAddressLocality: z
    .string()
    .trim()
    .min(1, "Workplace city is required"),
  salaryFrom: z.number().min(1, "Salary from is required"),
  salaryTo: z.number().min(1, "Salary to is required"),
  jobDescription: z.string().min(1, "Job description is required"),
  benefits: z.array(z.string()).min(1, "Please select at least one benefit"),
  companyName: z.string().min(1, "Company name is required"),
  companyLocation: z.string().min(1, "Company location is required"),
  companyLogo: z.string().url("Veuillez téléverser un logo valide"),
  companyWebsite: z.string().min(1, "Company website is required"),
  companyXAccount: z.string().optional(),
  companyDescription: z.string().min(1, "Company description is required"),
  listingPlan: z.enum(["Bonsai", "Arbuste", "Forêt"]),
});
