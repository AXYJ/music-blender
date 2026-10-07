"use client";

import type { JSX } from "react/jsx-runtime";
import { useIsClient } from "@/utils/useLocalStorage";

// Adresse assemblée après le montage : absente du HTML servi aux bots sans JS.
export default function EmailLink({ className }: { className?: string }): JSX.Element {
  const email = useIsClient() ? ["contact", "xiao-web.com"].join("@") : "";

  if (!email) {
    return <span className={className}>contact [at] xiao-web [dot] com</span>;
  }

  return (
    <a className={className} href={`mailto:${email}`}>
      {email}
    </a>
  );
}
