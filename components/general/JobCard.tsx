"use client"

import Link from "next/link";
import { motion } from "motion/react";
import { Clock, Euro, MapPin, User2 } from "lucide-react";
import { formatCurrency } from "@/app/utils/formatCurrency";
import Image from "next/image";
import { formatRelativeTime } from "@/app/utils/formatRelativeTime";

interface iAppProps {
    job: {
        id: string;
        jobTitle: string;
        salaryFrom: number;
        salaryTo: number;
        employmentType: string;
        location: string;
        createdAt: Date;
        company: {
          logo: string | null;
          name: string;
          about: string;
          location: string;
        };
    };
    index?: number;
}

export function JobCard({ job, index = 0 }: iAppProps) {
    const salary = `${formatCurrency(job.salaryFrom)} - ${formatCurrency(job.salaryTo)}`;
    const postedTime = formatRelativeTime(job.createdAt);

    return (
        <Link href={`/job/${job.id}`} className="block">
          <motion.div
            className="group relative bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:border-green-500/50 transition-all cursor-pointer overflow-hidden"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1, duration: 0.5 }}
            whileHover={{ 
              y: -8,
              transition: { duration: 0.3 }
            }}
          >
            {/* Hover gradient effect */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-br from-green-500/0 to-green-500/0 group-hover:from-green-500/5 group-hover:to-green-600/5 transition-all duration-500 rounded-2xl"
              initial={false}
            />

            <div className="relative z-10">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                  <motion.div
                    className="w-14 h-14 bg-gradient-to-br from-green-400/20 to-green-600/20 backdrop-blur-sm rounded-xl flex items-center justify-center border border-green-500/30"
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    transition={{ duration: 0.3 }}
                  >
                    {job.company.logo ? (
                        <Image
                        src={job.company.logo}
                        alt={job.company.name}
                        width={40}
                        height={40}
                        className="w-10 h-10 rounded-lg object-cover"
                      />
                    ) : (
                        <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
                        <User2 className="w-6 h-6 text-green-400" />
                      </div>
                    )}
                    </motion.div>
                    <div>
                    <motion.h3 
                      className="text-white text-xl mb-1"
                      whileHover={{ x: 4 }}
                      transition={{ duration: 0.2 }}
                    >
                      {job.jobTitle}
                    </motion.h3>
                    <div className="flex items-center gap-2">
                      <span className="text-white/60 text-sm">{job.company.name}</span>
                      <span className="text-white/40">•</span>
                      <span className="text-white/60 text-sm">{job.employmentType}</span>
                    </div>
                  </div>
                </div>

                <motion.div
                  className="px-3 py-1.5 bg-green-500/20 border border-green-500/30 text-green-400 text-xs rounded-full"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: index * 0.1 + 0.3, type: "spring", stiffness: 200 }}
                >
                  {job.location}
                </motion.div>
              </div>

              {/* Description */}
              <p className="text-white/70 text-sm mb-4 line-clamp-2">{job.company.about}</p>

              {/* Footer */}
              <div className="flex items-center justify-between pt-4 border-t border-white/5">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5 text-white/60 text-sm">
                    <Euro className="w-4 h-4 text-green-400" />
                    <span>{salary}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-white/60 text-sm">
                    <MapPin className="w-4 h-4 text-green-400" />
                    <span>{job.location}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-white/40 text-xs">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{postedTime}</span>
                </div>
                </div>
            </div>

            {/* Animated border on hover */}
            <motion.div
              className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
              style={{
                background: 'linear-gradient(90deg, transparent, rgba(34, 197, 94, 0.2), transparent)',
                backgroundSize: '200% 100%',
              }}
              animate={{
                backgroundPosition: ['200% 0', '-200% 0'],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "linear"
              }}
            />
          </motion.div>
        </Link>
    )
}