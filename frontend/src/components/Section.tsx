"use client"

export default function Section({ children }: { children: React.ReactNode }) {
    return (
        <section className="bg-(--semiaccent) p-4 rounded-2xl w-full gap-4 flex flex-col">
            <div className="flex flex-col gap-4">
                {children}
            </div>
        </section>
    );
}