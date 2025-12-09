import 'dotenv/config'
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: process.env.DATABASE_URL!, // Or use: process.env.DATABASE_URL ?? '' to provide a fallback value
  },
});