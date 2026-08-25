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
      className={`flex w-full flex-col gap-4 rounded-2xl border border-(--white)/20 bg-(--accent)/10 p-4 backdrop-blur-md ${sectionClassName || ""}`}
    >
      <div className={className || "flex flex-col gap-4"}>{children}</div>
    </section>
  );
}
