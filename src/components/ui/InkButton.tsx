import { type ButtonHTMLAttributes } from "react";

interface InkButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "ghost" | "soft";
  className?: string;
}

export default function InkButton({
  variant = "primary",
  type = "button",
  className = "",
  children,
  ...rest
}: InkButtonProps) {
  const base = `
    inline-flex items-center justify-center gap-2
    px-5 py-2.5
    font-hand text-base leading-none
    rounded-lg
    transition-all duration-100
    cursor-pointer
    select-none
    relative
    active:translate-y-[1px] active:shadow-none
    disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:pointer-events-none
  `;

  const variants = {
    primary: `
      bg-clay-rust text-clay-cream
      border-2 border-clay-ink
      shadow-[2px_3px_0px_#2C1810]
      hover:bg-clay-rust-light
      hover:-translate-y-[1px]
      hover:shadow-[3px_4px_0px_#2C1810]
    `,
    ghost: `
      bg-transparent text-clay-ink
      border-2 border-clay-ink
      shadow-[2px_3px_0px_rgba(44,24,16,0.18)]
      hover:bg-clay-warm
      hover:-translate-y-[1px]
      hover:shadow-[3px_4px_0px_rgba(44,24,16,0.25)]
    `,
    soft: `
      bg-clay-warm text-clay-ink
      border-2 border-clay-ink
      shadow-[2px_3px_0px_rgba(44,24,16,0.18)]
      hover:bg-clay-warm-dark
      hover:-translate-y-[1px]
      hover:shadow-[3px_4px_0px_rgba(44,24,16,0.25)]
    `,
  };

  return (
    <button
      type={type}
      {...rest}
      className={`${base} ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
}
