import Link from "next/link";
import { Users, FileText, Handshake, ArrowRight } from "lucide-react";

const agents = [
  {
    id: "leads",
    name: "Lead Generation",
    description:
      "Find, enrich, and reach ideal customers with automated outreach campaigns.",
    icon: Users,
    href: "/dashboard/agents/leads",
    color: "from-indigo-500/20 to-blue-500/20",
    borderColor: "hover:border-indigo-500/50",
  },
  {
    id: "content",
    name: "SEO Content",
    description:
      "Research keywords and publish SEO-optimized articles automatically.",
    icon: FileText,
    href: "/dashboard/agents/content",
    color: "from-emerald-500/20 to-teal-500/20",
    borderColor: "hover:border-emerald-500/50",
  },
  {
    id: "partners",
    name: "Partnerships",
    description: "Discover and recruit affiliates and technology partners.",
    icon: Handshake,
    href: "/dashboard/agents/partners",
    color: "from-pink-500/20 to-purple-500/20",
    borderColor: "hover:border-pink-500/50",
  },
];

export default function AgentsIndexPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-host font-bold text-white">AI Agents</h1>
        <p className="mt-2 text-gray-400">
          Select an agent to configure and monitor its automated workflows.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {agents.map((agent) => {
          const Icon = agent.icon;
          return (
            <Link
              key={agent.id}
              href={agent.href}
              className={`group relative overflow-hidden rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-md transition-all ${agent.borderColor} hover:bg-white/10`}
            >
              <div
                className={`absolute inset-0 bg-linear-to-br ${agent.color} opacity-0 transition-opacity group-hover:opacity-100`}
              />

              <div className="relative">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-white/10">
                  <Icon className="h-6 w-6 text-white" />
                </div>

                <h3 className="mb-2 font-host text-xl font-bold text-white">
                  {agent.name}
                </h3>
                <p className="mb-4 text-sm text-gray-400">
                  {agent.description}
                </p>

                <div className="flex items-center text-sm font-medium text-white/70 group-hover:text-white transition-colors">
                  Open Agent
                  <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

