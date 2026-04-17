import Link from "next/link";

export function FloatCta() {
  return (
    <Link className="float-cta" id="floatCta" href="/contact">
      ◉ Book a call <span className="arr">→</span>
    </Link>
  );
}
