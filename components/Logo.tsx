/**
 * Juan Diaz LLC — primary mark.
 *
 * "The Plumb" — a construction plumb-bob suspended from a fixed beam.
 *
 * Reads as:
 *   · Plumb-bob — construction-trained operator (literal heritage)
 *   · Scales of justice — fairness, judgment, weighing honestly
 *   · Pendulum — time, precision, operating in the window
 *   · Lower-case j — anchor dot, cord stem, bob descender
 *   · Hunter's plumb — el cazador's stillness before action
 *
 * One mark from 1500 BC that still operates in 2026.
 * Works monochrome via currentColor.
 */
export function Logo({
  size = 28,
  animated = false,
  draw = false,
}: {
  size?: number;
  animated?: boolean;
  draw?: boolean;
}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 96 96"
      width={size}
      height={size}
      fill="none"
      aria-hidden="true"
      style={{ display: "block", flexShrink: 0, overflow: "visible" }}
    >
      {/* Fixed-origin beam — structural reference */}
      <g
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        style={
          draw
            ? { opacity: 0, animation: "jfade 0.5s 1.0s var(--ease) forwards" }
            : undefined
        }
      >
        <line x1="30" y1="8" x2="66" y2="8" opacity="0.5" />
        <line x1="22" y1="8" x2="26" y2="8" opacity="0.35" />
        <line x1="70" y1="8" x2="74" y2="8" opacity="0.35" />
      </g>

      {/* Suspension anchor */}
      <circle
        cx="48"
        cy="8"
        r="3.4"
        fill="currentColor"
        style={
          animated
            ? { transformOrigin: "48px 8px", animation: "pulse 2.4s ease-in-out infinite" }
            : draw
            ? { opacity: 0, animation: "jfade 0.4s 0.05s var(--ease) forwards" }
            : undefined
        }
      />

      {/* Pendulum group — cord + bob, swings as one unit */}
      <g
        style={{
          transformOrigin: "48px 8px",
          animation: animated ? "plumbswing 5s ease-in-out infinite" : undefined,
        }}
      >
        <line
          x1="48"
          y1="14"
          x2="48"
          y2="50"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          style={
            draw
              ? {
                  strokeDasharray: 40,
                  strokeDashoffset: 40,
                  animation: "jdraw 0.7s 0.2s var(--ease) forwards",
                }
              : undefined
          }
        />
        <path
          d="M 48 50 Q 30 50 30 64 L 48 86 L 66 64 Q 66 50 48 50 Z M 51 64 a 3 3 0 1 0 -6 0 a 3 3 0 1 0 6 0 Z"
          fill="currentColor"
          fillRule="evenodd"
          style={
            draw
              ? {
                  opacity: 0,
                  transformOrigin: "48px 50px",
                  animation: "plumbdrop 0.6s 0.85s var(--ease) forwards",
                }
              : undefined
          }
        />
      </g>

      {/* Horizon — level reference at bob's center of mass */}
      <g
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinecap="round"
        opacity="0.4"
        style={
          draw
            ? { opacity: 0, animation: "jfade 0.5s 1.25s var(--ease) forwards" }
            : undefined
        }
      >
        <line x1="6" y1="64" x2="22" y2="64" />
        <line x1="74" y1="64" x2="90" y2="64" />
      </g>

      {/* Swing-arc reference */}
      <path
        d="M 22 70 A 40 40 0 0 1 74 70"
        fill="none"
        stroke="currentColor"
        strokeWidth="0.7"
        strokeDasharray="1 4"
        opacity="0.3"
        style={
          draw
            ? { opacity: 0, animation: "jfade 0.6s 1.5s var(--ease) forwards" }
            : undefined
        }
      />
    </svg>
  );
}
