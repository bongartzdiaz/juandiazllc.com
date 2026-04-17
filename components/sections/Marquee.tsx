export function Marquee() {
  const inner = (
    <>
      Revenue engines <span className="sep">✦</span> <em>Energy</em> · Real estate · Hospitality <span className="sep">✦</span> Construction-trained <span className="sep">✦</span> Five phases <span className="sep">✦</span> <em>Blueprint</em> before build <span className="sep">✦</span> Shipped, not pitched <span className="sep">✦</span>
    </>
  );
  return (
    <div className="marquee">
      <div className="marquee-track">
        <span>{inner}</span>
        <span>{inner}</span>
      </div>
    </div>
  );
}
