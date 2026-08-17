"use client";

interface SectionProps {
  children: React.ReactNode;
  className?: string;
  sectionClassName?: string;
}

export default function Section({
  children,
  className,
  sectionClassName,
}: SectionProps) {
  return (
    <section
      className={`bg-(--semiaccent) p-4 rounded-2xl w-full gap-4 flex flex-col ${sectionClassName || ""}`}
    >
      <div className={className || "flex flex-col gap-4"}>{children}</div>
    </section>
  );
}
