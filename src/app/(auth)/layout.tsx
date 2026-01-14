"use client";

import Link from "next/link";
import { useContent } from "@/hooks/use-content";
import { LanguageSwitcher } from "@/components/ui/language-switcher";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { content } = useContent();

  return (
    <div className="min-h-screen flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-linear-to-br from-violet-600 via-purple-600 to-indigo-700 p-12 flex-col justify-between relative">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <span className="text-white font-bold text-xl">Z</span>
            </div>
            <span className="text-white text-2xl font-bold">Zero Headache</span>
          </Link>
          <div className="bg-white/10 backdrop-blur-md rounded-lg p-1">
            <LanguageSwitcher />
          </div>
        </div>

        <div className="space-y-8">
          <div>
            <h1
              className="text-4xl font-bold text-white leading-tight"
              dangerouslySetInnerHTML={{ __html: content.auth.layout.headline }}
            />
            <p className="mt-4 text-lg text-white/80">
              {content.auth.layout.subheadline}
            </p>
          </div>

          <div className="space-y-4">
            {content.auth.layout.valueProps.map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">
                  <svg
                    className="w-3 h-3 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={3}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <span className="text-white/90">{item}</span>
              </div>
            ))}
          </div>

          {/* Testimonial */}
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
            <p className="text-white/90 italic">
              &quot;{content.auth.layout.testimonial.quote}&quot;
            </p>
            <div className="mt-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white font-semibold">
                SM
              </div>
              <div>
                <p className="text-white font-medium">
                  {content.auth.layout.testimonial.author}
                </p>
                <p className="text-white/60 text-sm">
                  {content.auth.layout.testimonial.role}
                </p>
              </div>
            </div>
          </div>
        </div>

        <p className="text-white/60 text-sm">
          © {new Date().getFullYear()} Zero Headache.{" "}
          {content.auth.layout.copyright}
        </p>
      </div>

      {/* Right side - Auth form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 bg-gray-50 dark:bg-gray-900 relative">
        <div className="absolute top-6 right-6 lg:hidden">
          <LanguageSwitcher />
        </div>
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
