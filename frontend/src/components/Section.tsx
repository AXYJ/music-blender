"use client";

interface SectionProps {
  children: React.ReactNode;
  className?: string;
}

export default function Section({ children, className }: SectionProps) {
  return (
    <section className="bg-(--semiaccent) p-4 rounded-2xl w-full gap-4 flex flex-col">
      <div className={className || "flex flex-col gap-4"}>{children}</div>
    </section>
  );
}
