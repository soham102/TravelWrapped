/* Illustrated destination scenes — pure SVG so they always export cleanly. */

export type SceneKind = "mountain" | "beach" | "city" | "desert" | "spiritual" | "heritage" | "nature";

export function sceneFor(tags: string[] = []): SceneKind {
  const order: [string, SceneKind][] = [
    ["mountain", "mountain"],
    ["hill-station", "mountain"],
    ["beach", "beach"],
    ["island", "beach"],
    ["desert", "desert"],
    ["spiritual", "spiritual"],
    ["heritage", "heritage"],
    ["nature", "nature"],
    ["city", "city"],
  ];
  for (const [t, k] of order) if (tags.includes(t)) return k;
  return "city";
}

export function Scene({
  kind,
  className,
  sky = "transparent",
  tone = "dark",
}: {
  kind: SceneKind;
  className?: string;
  sky?: string;
  tone?: "dark" | "light";
}) {
  const a = tone === "dark" ? "#1c0f38" : "#faf7f3";
  const b = tone === "dark" ? "#341864" : "rgba(250,247,243,0.6)";
  const c = tone === "dark" ? "#4b2d85" : "rgba(250,247,243,0.35)";
  const sun = "#ffcc00";
  return (
    <svg viewBox="0 0 360 200" className={className} preserveAspectRatio="xMidYMax slice" aria-hidden>
      <rect width="360" height="200" fill={sky} />
      {kind === "mountain" && (
        <>
          <circle cx="262" cy="64" r="26" fill={sun} />
          <path d="M0 200 L70 90 L120 150 L190 50 L260 140 L300 100 L360 170 L360 200Z" fill={c} />
          <path d="M190 50 L172 78 L186 72 L196 84 L206 70 L212 76Z" fill="#faf7f3" />
          <path d="M70 90 L58 110 L70 104 L80 112Z" fill="#faf7f3" />
          <path d="M0 200 L40 150 L100 185 L160 120 L230 180 L300 140 L360 190 L360 200Z" fill={b} />
          <path d="M0 200 L60 180 L130 195 L200 172 L280 192 L360 178 L360 200Z" fill={a} />
        </>
      )}
      {kind === "beach" && (
        <>
          <circle cx="180" cy="110" r="44" fill={sun} />
          <rect x="0" y="120" width="360" height="80" fill={c} />
          <path d="M0 140 Q30 132 60 140 T120 140 T180 140 T240 140 T300 140 T360 140 V200 H0Z" fill={b} />
          <path d="M0 165 Q30 157 60 165 T120 165 T180 165 T240 165 T300 165 T360 165 V200 H0Z" fill={a} />
          <path d="M300 200 Q296 150 312 112" stroke={a} strokeWidth="6" fill="none" strokeLinecap="round" />
          <path d="M312 112 q-30 -6 -44 10 M312 112 q-14 -26 -40 -24 M312 112 q22 -22 44 -12 M312 112 q26 0 36 22 M312 112 q4 -28 -6 -40" stroke={a} strokeWidth="5" fill="none" strokeLinecap="round" />
        </>
      )}
      {kind === "city" && (
        <>
          <circle cx="90" cy="70" r="24" fill={sun} />
          <path d="M0 200 V150 H30 V120 H55 V160 H80 V100 H110 V140 H130 V85 H150 V70 H165 V85 H185 V150 H210 V110 H240 V130 H260 V95 H290 V150 H320 V125 H360 V200Z" fill={b} />
          <path d="M0 200 V170 H40 V150 H70 V175 H120 V155 H150 V180 H200 V160 H250 V175 H300 V158 H360 V200Z" fill={a} />
          {[[140, 95], [140, 110], [270, 110], [270, 125], [90, 115], [220, 125]].map(([x, y], i) => (
            <rect key={i} x={x} y={y} width="6" height="6" fill={sun} opacity="0.8" />
          ))}
        </>
      )}
      {kind === "desert" && (
        <>
          <circle cx="250" cy="80" r="34" fill={sun} />
          <path d="M0 160 Q90 110 180 150 T360 140 V200 H0Z" fill={c} />
          <path d="M0 180 Q120 140 220 175 T360 165 V200 H0Z" fill={b} />
          <path d="M60 172 q6 -14 14 -10 q4 -10 10 -4 l4 -8 q4 6 0 10 q8 4 6 14" stroke={a} strokeWidth="4" fill="none" strokeLinecap="round" />
          <path d="M0 200 Q140 175 360 192 V200Z" fill={a} />
        </>
      )}
      {kind === "spiritual" && (
        <>
          <circle cx="180" cy="96" r="52" fill={sun} opacity="0.95" />
          <path d="M150 200 V140 H158 L170 80 L180 56 L190 80 L202 140 H210 V200Z" fill={b} />
          <path d="M120 200 V160 L132 130 L144 160 V200Z M216 200 V160 L228 130 L240 160 V200Z" fill={b} />
          <path d="M180 48 v-12" stroke={b} strokeWidth="3" />
          <path d="M180 36 l12 4 -12 4z" fill="#ff3366" />
          <path d="M0 200 V185 Q90 172 180 182 T360 180 V200Z" fill={a} />
        </>
      )}
      {kind === "heritage" && (
        <>
          <circle cx="280" cy="64" r="22" fill={sun} />
          <path d="M40 200 V130 H70 V112 Q100 70 130 112 V130 H160 V100 Q180 50 200 100 V130 H230 V112 Q260 70 290 112 V130 H320 V200Z" fill={b} />
          {[70, 130, 190, 250].map((x) => (
            <path key={x} d={`M${x + 12} 200 V165 Q${x + 25} 145 ${x + 38} 165 V200Z`} fill={a} />
          ))}
          <path d="M0 200 V188 H360 V200Z" fill={a} />
        </>
      )}
      {kind === "nature" && (
        <>
          <circle cx="110" cy="70" r="24" fill={sun} />
          <path d="M0 200 Q80 120 180 160 T360 130 V200Z" fill={c} />
          {[40, 80, 250, 290, 320].map((x, i) => (
            <path key={x} d={`M${x} ${168 - (i % 2) * 8} l14 -40 l14 40z`} fill={b} />
          ))}
          <path d="M0 200 Q120 165 240 185 T360 175 V200Z" fill={a} />
        </>
      )}
    </svg>
  );
}
