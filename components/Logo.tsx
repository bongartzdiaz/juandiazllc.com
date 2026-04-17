/**
 * Juan Diaz LLC — primary mark.
 *
 * A custom J monogram rendered as a single precise gesture:
 *   · precision dot (top) — the aim, the target, the J's dot
 *   · vertical stem   — the descent, focus
 *   · elongated hook  — the follow-through, the hunter's trajectory
 *
 * Reads as Juan's J, a hunter's bow (el cazador),
 * a surveyor's plumb line, an operator's dial pointer.
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
      viewBox="0 0 72 72"
      width={size}
      height={size}
      fill="none"
      aria-hidden="true"
      style={{ display: "block", flexShrink: 0, overflow: "visible" }}
    >
      <g
        stroke="currentColor"
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <line
          x1="50"
          y1="26"
          x2="50"
          y2="44"
          style={
            draw
              ? {
                  strokeDasharray: 22,
                  strokeDashoffset: 22,
                  animation: "jdraw 0.8s .15s var(--ease) forwards",
                }
              : undefined
          }
        />
        <path
          d="M 50 44 C 50 58, 38 62, 24 60 C 14 58.5, 8 50, 8 42"
          style={
            draw
              ? {
                  strokeDasharray: 90,
                  strokeDashoffset: 90,
                  animation: "jdraw 1.4s .35s var(--ease) forwards",
                }
              : undefined
          }
        />
      </g>
      <circle
        cx="50"
        cy="14"
        r="3.8"
        fill="currentColor"
        style={
          animated
            ? { transformOrigin: "50px 14px", animation: "pulse 2.4s ease-in-out infinite" }
            : draw
            ? { opacity: 0, animation: "jfade .4s .05s var(--ease) forwards" }
            : undefined
        }
      />
    </svg>
  );
}
