import Stripe from 'stripe';

export const stripe = new Stripe(process.env.SECRET_STRIPE_KEY!, {
    apiVersion: "2025-11-17.clover",
    typescript: true,
});

