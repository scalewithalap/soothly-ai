import { Checkout } from "@polar-sh/nextjs";

// Polar checkout route for subscription upgrades
export const GET = Checkout({
  accessToken: process.env.POLAR_ACCESS_TOKEN!,
  successUrl: "/settings/billing?checkout=success&checkout_id={CHECKOUT_ID}",
  server: process.env.NODE_ENV === "production" ? "production" : "sandbox",
});
