"use client"

export default function Section({ children }: { children: React.ReactNode }) {
    return (
        <section className="bg-[var(--semiaccent)] p-4 rounded-2xl w-full gap-8">
            <div className="flex flex-col gap-4">
                {children}
            </div>
        </section>
    );
}