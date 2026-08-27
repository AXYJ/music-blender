"use client";

import Image from "next/image";

export default function Logo() {
  return (
    <Image
      src="/logo-white.svg"
      alt="Museek"
      width={400}
      height={200}
      className="w-72"
    />
  );
}
