# Tech Stack & Implementation Rules

When generating code or UI components for Soothly AI, you **MUST** strictly adhere to the following technology choices.

## Core Stack

- **Framework:** Next.js 16 (App Router) with TypeScript (Mandatory)
- **Styling Engine:** Tailwind CSS v4 using CSS variables for theming
- **Component Library:** shadcn/ui (Radix Primitives as base)
- **Icons:** Lucide React
- **Animations:** Framer Motion (for micro-interactions)
- **Forms:** react-hook-form + Zod resolver
- **State:** Zustand (client) & React Query (server state)

## Backend Integration

- **Database:** Supabase (PostgreSQL)
- **Auth:** Supabase Auth
- **Background Jobs:** Inngest
- **Validation:** Zod (all API inputs/outputs)
- **Default AI Model:** `gemini-3-flash` (must allow user selection at runtime)

## Implementation Guidelines

### 1. Component Architecture

- **Server Components:** Default for data fetching (`await supabase.from(...)`).
- **Client Islands:** Use `"use client"` only for interactive elements (forms, buttons, state).
- **Styling:** Use design tokens from `design-tokens.json` via CSS variables (e.g., `bg-primary`, `text-primary-foreground`).

### 2. Tailwind Usage

- Use utility classes directly in JSX.
- **Dark Mode:** Fully supported via `next-themes`. Always include `dark:` variants.
- **Responsive:** Mobile-first. Build for `base`, then add `md:`, `lg:`.

### 3. Glassmorphism Pattern

```tsx
<div className="relative overflow-hidden rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-md transition-all hover:border-white/20 hover:bg-white/10">
  <div className="absolute inset-0 bg-linear-to-br from-violet-500/10 to-indigo-500/10 opacity-0 transition-opacity group-hover:opacity-100" />
  {/* Content */}
</div>
```

### 4. Form Pattern

```tsx
const form = useForm<z.infer<typeof schema>>({
  resolver: zodResolver(schema),
  defaultValues: { ... }
});

return (
  <Form {...form}>
    <form onSubmit={form.handleSubmit(onSubmit)}>
      {/* Input styling must match design-tokens.ui.components.input */}
      <FormField ... />
    </form>
  </Form>
)
```

### 5. Forbidden Patterns

- Do NOT use `any` type.
- Do NOT use jQuery or Bootstrap.
- Do NOT hardcode hex colors; use CSS variables.
- Do NOT create separate CSS files; use Tailwind utilities.
- Do NOT use console.log in production code.
