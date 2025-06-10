import { FC } from "react";

export const SuccessCheck: FC = () => (
  <svg
    width="96"
    height="96"
    viewBox="0 0 96 96"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="mx-auto animate-fade-in"
  >
    <circle cx="48" cy="48" r="44" fill="#F0FAF4" />
    <circle cx="48" cy="48" r="44" stroke="#F05023" strokeWidth="2" />
    <path
      d="M32 48L44 60L64 36"
      stroke="#F05023"
      strokeWidth="4"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="animate-slide-in"
    />
  </svg>
);
