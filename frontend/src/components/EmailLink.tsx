"use client";

import { useEffect, useState } from "react";
import type { JSX } from "react/jsx-runtime";

// Adresse assemblée après le montage : absente du HTML servi aux bots sans JS.
export default function EmailLink({ className }: { className?: string }): JSX.Element {
  const [email, setEmail] = useState<string>("");

  useEffect(() => {
    setEmail(["contact", "xiao-web.com"].join("@"));
  }, []);

  if (!email) {
    return <span className={className}>contact [at] xiao-web [dot] com</span>;
  }

  return (
    <a className={className} href={`mailto:${email}`}>
      {email}
    </a>
  );
}
