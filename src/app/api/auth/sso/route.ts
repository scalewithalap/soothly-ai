/**
 * SSO Sign-In API
 *
 * POST: Initiate SAML SSO sign-in for enterprise users
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const ssoSchema = z.object({
  email: z.string().email().optional(),
  domain: z.string().optional(),
  providerId: z.string().uuid().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, domain, providerId } = ssoSchema.parse(body);

    const supabase = await createClient();

    // Determine SSO provider
    if (providerId) {
      // Direct provider ID specified
      const { data, error } = await supabase.auth.signInWithSSO({
        providerId,
      });

      if (error) {
        return NextResponse.json(
          { error: "sso/signin_failed", message: error.message },
          { status: 400 },
        );
      }

      return NextResponse.json({ url: data.url });
    } else if (domain) {
      // Domain-based lookup
      const { data, error } = await supabase.auth.signInWithSSO({
        domain,
      });

      if (error) {
        return NextResponse.json(
          {
            error: "sso/no_provider",
            message: "No SSO provider for this domain",
          },
          { status: 404 },
        );
      }

      return NextResponse.json({ url: data.url });
    } else if (email) {
      // Email domain extraction
      const emailDomain = email.split("@")[1];

      const { data, error } = await supabase.auth.signInWithSSO({
        domain: emailDomain,
      });

      if (error) {
        return NextResponse.json(
          {
            error: "sso/no_provider",
            message: "No SSO provider for this email domain",
          },
          { status: 404 },
        );
      }

      return NextResponse.json({ url: data.url });
    }

    return NextResponse.json(
      { error: "validation/missing_identifier" },
      { status: 400 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "validation/invalid_input" },
        { status: 400 },
      );
    }
    console.error("SSO sign-in error:", error);
    return NextResponse.json({ error: "sso/signin_failed" }, { status: 500 });
  }
}

/**
 * GET: Check if SSO is available for a domain
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const domain = searchParams.get("domain");
  const email = searchParams.get("email");

  const targetDomain = domain || (email ? email.split("@")[1] : null);

  if (!targetDomain) {
    return NextResponse.json(
      { error: "validation/missing_domain" },
      { status: 400 },
    );
  }

  const supabase = await createClient();

  try {
    // Try to get SSO URL to check if provider exists
    const { data, error } = await supabase.auth.signInWithSSO({
      domain: targetDomain,
    });

    if (error) {
      return NextResponse.json({ available: false, domain: targetDomain });
    }

    return NextResponse.json({
      available: true,
      domain: targetDomain,
      url: data.url,
    });
  } catch {
    return NextResponse.json({ available: false, domain: targetDomain });
  }
}
