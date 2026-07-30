import Image from "next/image";
import { cn } from "@/lib/utils";

interface LogoProps {
  size?: number;
  className?: string;
}

export function Logo({ size = 32, className }: LogoProps) {
  return (
    <Image
      src="/logo.png"
      alt="Resonance"
      width={size}
      height={size}
      className={cn("shrink-0", className)}
      priority
    />
  );
}
