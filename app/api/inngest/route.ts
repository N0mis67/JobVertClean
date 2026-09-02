import { inngest } from "@/app/utils/inngest/client";
import { serve } from "inngest/next";
import {
  cleanupStripeCustomers,
  cleanupUnattachedUploadThingFiles,
  handleJobExpiration,
  helloWorld,
  sendPeriodicJobListings,
} from "./function";

// Create an API that serves zero functions
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    helloWorld,
    handleJobExpiration,
    sendPeriodicJobListings,
    cleanupStripeCustomers,
    cleanupUnattachedUploadThingFiles,
  ],
});
