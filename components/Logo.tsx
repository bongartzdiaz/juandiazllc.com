/**
 * Juan Diaz LLC — primary mark.
 *
 * A precision-instrument composition:
 *   · outer dashed bezel — calibrated frame
 *   · corner viewfinder brackets — operator's lens
 *   · cardinal tick marks — measurement scale
 *   · the J gesture — Juan, hunter's bow, plumb line, dial pointer
 *   · target-acquired dot — follow-through complete
 *
 * Reads as instrument first, monogram second, story third.
 * Works monochrome via currentColor.
 */
export function Logo({
  size = 28,
  animated = false,
  draw = false,
  detail = "full",
}: {
  size?: number;
  animated?: boolean;
  draw?: boolean;
  /** "full" includes bezel + brackets + ticks; "simple" is just the J */
  detail?: "full" | "simple";
}) {
  const showFrame = detail === "full";
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 80 80"
      width={size}
      height={size}
      fill="none"
      aria-hidden="true"
      style={{ display: "block", flexShrink: 0, overflow: "visible" }}
    >
      {showFrame && (
        <>
          {/* Outer precision bezel */}
          <circle
            cx="40"
            cy="40"
            r="36.5"
            stroke="currentColor"
            strokeWidth="0.7"
            strokeDasharray="1 4"
            opacity="0.4"
            style={
              animated
                ? { transformOrigin: "40px 40px", animation: "spin 60s linear infinite" }
                : undefined
            }
          />

          {/* Corner brackets */}
          <g
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.55"
            style={
              draw
                ? { opacity: 0, animation: "jfade 0.6s 0.6s var(--ease) forwards" }
                : undefined
            }
          >
            <path d="M 8 14 L 8 8 L 14 8" />
            <path d="M 72 14 L 72 8 L 66 8" />
            <path d="M 8 66 L 8 72 L 14 72" />
            <path d="M 72 66 L 72 72 L 66 72" />
          </g>

          {/* Cardinal ticks */}
          <g
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            opacity="0.55"
            style={
              draw
                ? { opacity: 0, animation: "jfade 0.5s 0.85s var(--ease) forwards" }
                : undefined
            }
          >
            <line x1="40" y1="3" x2="40" y2="7" />
            <line x1="40" y1="73" x2="40" y2="77" />
            <line x1="3" y1="40" x2="7" y2="40" />
            <line x1="73" y1="40" x2="77" y2="40" />
          </g>
        </>
      )}

      {/* The J gesture */}
      <g
        stroke="currentColor"
        strokeWidth="3.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <line
          x1="54"
          y1="28"
          x2="54"
          y2="48"
          style={
            draw
              ? {
                  strokeDasharray: 22,
                  strokeDashoffset: 22,
                  animation: "jdraw 0.8s 0.15s var(--ease) forwards",
                }
              : undefined
          }
        />
        <path
          d="M 54 48 C 54 63, 40 67, 27 65.5 C 16 64, 11 56, 11 48"
          style={
            draw
              ? {
                  strokeDasharray: 95,
                  strokeDashoffset: 95,
                  animation: "jdraw 1.4s 0.35s var(--ease) forwards",
                }
              : undefined
          }
        />
      </g>

      {/* J's dot — aim target */}
      <circle
        cx="54"
        cy="14"
        r="3.8"
        fill="currentColor"
        style={
          animated
            ? { transformOrigin: "54px 14px", animation: "pulse 2.4s ease-in-out infinite" }
            : draw
            ? { opacity: 0, animation: "jfade 0.4s 0.05s var(--ease) forwards" }
            : undefined
        }
      />

      {/* Target-acquired terminus */}
      <circle
        cx="11"
        cy="48"
        r="1.6"
        fill="currentColor"
        opacity="0.7"
        style={
          draw
            ? { opacity: 0, animation: "jfade 0.4s 1.5s var(--ease) forwards" }
            : undefined
        }
      />
    </svg>
  );
}
