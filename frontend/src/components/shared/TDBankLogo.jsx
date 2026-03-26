/**
 * TD Bank logo mark — green rounded-square with bold white "TD" lettering.
 */
export default function TDBankLogo({ size = 24, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="TD Bank"
    >
      <rect width="40" height="40" rx="7" fill="#006B3C" />
      <text
        x="20"
        y="28"
        textAnchor="middle"
        fontFamily="'Arial Black', Arial, sans-serif"
        fontWeight="900"
        fontSize="20"
        fill="white"
        letterSpacing="-0.5"
      >
        TD
      </text>
    </svg>
  )
}
