import { motion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useExtractionStore, type ExtractedColor } from "@/store/extractionStore";
import { fight, scoreContender, type SeedBattle } from "./lib/SeedRule";
import { darkenColor, rgbString } from "@/lib/colorUtils";
import { WaveText } from "@/shared";
import { generateHslPalette, generateHctPalette, generateHctTokens } from "./lib/palette";

/** How many colors survive the cull to fight one-on-one. Battles = LIMIT - 1,  so this is the dial that controls total runtime. 64 -> 63 duels. */
const CONTENDER_LIMIT = 1;

/** Beat where the untouched pixelated image just sits there to be admired. */
const APPRECIATION_MS = 1800;

/** The mass cull: everything that didn't qualify fades out, weakest first. */
const CULL_STEP_MS = 1.6;
const CULL_TAIL_MS = 900;

/** A single duel: both contenders swell, then one pops. */
const FACE_OFF_MS = 420;
const RESOLVE_MS = 480;

/** How far the two contenders expand while facing off. */
const FACE_OFF_SCALE = 2.4;

/** How long the finished reveal (background + text) sits before reversing. */
const CHAMPION_HOLD_MS = 1000;

/** How long the champion background takes to fade/shrink away. */
const BG_OUT_MS = 500;

type Phase = "admiring" | "culling" | "dueling" | "crowned";
type Step = "facing" | "resolving";
type RevealStep = "hold" | "textOut" | "bgOut" | "palette";

// Variants rather than inline keyframes, so a re-render can't retrigger a pop.
const cellVariants = {
  alive: { scale: 1, opacity: 1, filter: "blur(0px)" },
  facing: { scale: FACE_OFF_SCALE, opacity: 1, filter: "blur(0px)" },
  dying: {
    scale: [FACE_OFF_SCALE, FACE_OFF_SCALE * 1.08, 0.92],
    opacity: [1, 1, 0],
    filter: ["blur(0px)", "blur(1px)", "blur(8px)"],
  },
  gone: { scale: 0, opacity: 0, filter: "blur(0px)" },
};

export const SeedSelection = () => {
  const extractedColors = useExtractionStore((s) => s.extractedColors);
  const setChampion = useExtractionStore((s) => s.setChampion);

  const [phase, setPhase] = useState<Phase>("admiring");
  const [battleIndex, setBattleIndex] = useState(0);
  const [step, setStep] = useState<Step>("facing");
  const [deadIds, setDeadIds] = useState<Set<string>>(new Set());

  // Fixed geometry from the full original set. Every cell is placed explicitly,
  // so eliminating one never reflows its neighbours.
  const { columns, rows, placement } = useMemo(() => {
    const xs = [...new Set(extractedColors.map((c) => c.x))].sort((a, b) => a - b);
    const ys = [...new Set(extractedColors.map((c) => c.y))].sort((a, b) => a - b);

    const xIndex = new Map(xs.map((x, i) => [x, i]));
    const yIndex = new Map(ys.map((y, i) => [y, i]));

    return {
      columns: Math.max(1, xs.length),
      rows: Math.max(1, ys.length),
      placement: new Map(
        extractedColors.map((c) => [
          c.id,
          { col: (xIndex.get(c.x) ?? 0) + 1, row: (yIndex.get(c.y) ?? 0) + 1 },
        ]),
      ),
    };
  }, [extractedColors]);

  // Rank everything once, split into qualifiers and the culled remainder.
  // cullRank drives the stagger so the weakest colors dissolve first.
  const { qualifiers, cullRank } = useMemo(() => {
    const ranked = extractedColors
      .map((color) => ({ color, total: scoreContender(color).total }))
      .sort((a, b) => b.total - a.total);

    const qualifiers = ranked.slice(0, CONTENDER_LIMIT).map((entry) => entry.color);
    const culled = ranked.slice(CONTENDER_LIMIT);

    // Weakest is last in `ranked`, so reverse the index for the stagger.
    const cullRank = new Map(
      culled.map((entry, i) => [entry.color.id, culled.length - 1 - i]),
    );

    return { qualifiers, cullRank };
  }, [extractedColors]);

  const battles = useMemo<SeedBattle[]>(() => {
    let remaining = [...qualifiers];
    const all: SeedBattle[] = [];

    while (remaining.length > 1) {
      const advancing: ExtractedColor[] = [];

      for (let i = 0; i < remaining.length; i += 2) {
        const challenger = remaining[i];
        const defender = remaining[i + 1];

        if (!defender) {
          advancing.push(challenger); // bye
          continue;
        }

        const battle = fight(challenger, defender);
        all.push(battle);
        advancing.push(battle.winner);
      }

      remaining = advancing;
    }

    return all;
  }, [qualifiers]);

  const champion =
    phase === "crowned"
      ? battles[battles.length - 1]?.winner ?? qualifiers[0] ?? null
      : null;

  const hslPalette = useMemo(
    () => (champion ? generateHslPalette(champion) : []),
    [champion],
  );

  const hctPalette = useMemo(
    () => (champion ? generateHctPalette(champion) : []),
    [champion],
  );

  const hctTokens = useMemo(
    () => (champion ? generateHctTokens(champion, "light") : []),
    [champion],
  );

  // Matches the WaveText timing: two lines, each with its own per-letter
  // stagger, so the outro doesn't start until both waves have fully arrived.
  const line1 = `${champion?.rgb.r ?? 0} ${champion?.rgb.g ?? 0} ${champion?.rgb.b ?? 0}`;
  const line1Duration = 0.1 + line1.length * 0.025 + 0.5;
  const line2Delay = line1Duration + 0.15;
  const line2Duration = line2Delay + "Is The Seed".length * 0.025 + 0.5;

  const [revealStep, setRevealStep] = useState<RevealStep>("hold");

  // Counts how many of the two WaveText lines have finished their outro, so
  // we only advance once BOTH have actually left — not on a guessed timer.
  const outroCompleteRef = useRef(0);

  const handleTextOutroComplete = useCallback(() => {
    outroCompleteRef.current += 1;
    if (outroCompleteRef.current >= 2) {
      setRevealStep("bgOut");
    }
  }, []);

  // Reset the whole reveal sequence whenever a new champion is crowned.
  useEffect(() => {
    setRevealStep("hold");
    outroCompleteRef.current = 0;
  }, [champion]);

  // hold -> textOut: once both wave-in lines have fully arrived, sit for a
  // beat, then reverse them. (Entrance timing is a known formula, so this one
  // stays timer-based; the outro's completion above uses the real callback.)
  useEffect(() => {
    if (!champion || revealStep !== "hold") return;

    const timer = window.setTimeout(
      () => setRevealStep("textOut"),
      line2Duration * 1000 + CHAMPION_HOLD_MS,
    );
    return () => window.clearTimeout(timer);
  }, [champion, revealStep, line2Duration]);

  // Reset for a new set of colors.
  useEffect(() => {
    setPhase("admiring");
    setBattleIndex(0);
    setStep("facing");
    setDeadIds(new Set());
  }, [extractedColors]);

  // Act 1 -> 2: hold the intact image, then start the cull.
  useEffect(() => {
    if (phase !== "admiring") return;

    const timer = window.setTimeout(() => setPhase("culling"), APPRECIATION_MS);
    return () => window.clearTimeout(timer);
  }, [phase]);

  // Act 2 -> 3: wait out the staggered cull, then begin duelling.
  useEffect(() => {
    if (phase !== "culling") return;

    const cullDuration = cullRank.size * CULL_STEP_MS + CULL_TAIL_MS;
    const timer = window.setTimeout(() => setPhase("dueling"), cullDuration);
    return () => window.clearTimeout(timer);
  }, [phase, cullRank]);

  // Act 3: one duel at a time — face off, then resolve.
  useEffect(() => {
    if (phase !== "dueling") return;

    if (battleIndex >= battles.length) {
      setPhase("crowned");
      return;
    }

    if (step === "facing") {
      const timer = window.setTimeout(() => setStep("resolving"), FACE_OFF_MS);
      return () => window.clearTimeout(timer);
    }

    const loserId = battles[battleIndex].loser.id;
    const timer = window.setTimeout(() => {
      setDeadIds((prev) => new Set(prev).add(loserId));
      setBattleIndex((i) => i + 1);
      setStep("facing");
    }, RESOLVE_MS);

    return () => window.clearTimeout(timer);
  }, [phase, battleIndex, step, battles]);

  useEffect(() => {
    if (phase === "crowned") {
      const winner = battles[battles.length - 1]?.winner ?? qualifiers[0] ?? null;
      setChampion(winner);
    }
  }, [phase, battles, qualifiers, setChampion]);

  const currentBattle = phase === "dueling" ? battles[battleIndex] : undefined;

  return (
    <div className="relative h-[60svh] w-[55svw] overflow-hidden bg-accent shadow-2xs">
      <div
        className="absolute inset-0 grid"
        style={{
          gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
        }}
      >
        {extractedColors.map((color) => {
          if (champion && color.id === champion.id) return null;

          const spot = placement.get(color.id);
          const rank = cullRank.get(color.id);
          const isCulled = rank !== undefined;

          const isChallenger = currentBattle?.challenger.id === color.id;
          const isDefender = currentBattle?.defender.id === color.id;
          const isFighting = isChallenger || isDefender;
          const isLoser = currentBattle?.loser.id === color.id;

          let state: keyof typeof cellVariants = "alive";
          if (deadIds.has(color.id)) {
            state = "gone";
          } else if (isCulled) {
            state = phase === "admiring" ? "alive" : "gone";
          } else if (isFighting) {
            if (step === "facing") state = "facing";
            else state = isLoser ? "dying" : "alive";
          }

          let transition: Record<string, unknown> = { duration: 0 };
          if (state === "gone" && isCulled) {
            transition = { duration: 0.35, delay: (rank * CULL_STEP_MS) / 1000 };
          } else if (state === "facing") {
            transition = { duration: FACE_OFF_MS / 1000, ease: "easeOut" };
          } else if (state === "dying") {
            transition = {
              duration: RESOLVE_MS / 1000,
              times: [0, 0.35, 1],
              ease: "easeInOut",
            };
          } else if (isFighting) {
            transition = { duration: RESOLVE_MS / 1000, ease: "easeInOut" };
          }

          return (
            <motion.div
              key={color.id}
              variants={cellVariants}
              initial="alive"
              animate={state}
              transition={transition}
              style={{
                gridColumn: spot?.col,
                gridRow: spot?.row,
                backgroundColor: rgbString(color),
                zIndex: isFighting ? 10 : 1,
                outline: isFighting ? `3px solid ${darkenColor(color)}` : "none",
                outlineOffset: isFighting ? "-3px" : "0",
              }}
            />
          );
        })}
      </div>

      {champion && (
        <motion.div
          key={champion.id}
          layoutId={champion.id}
          className="absolute inset-0"
          animate={
            revealStep === "bgOut" || revealStep === "palette"
              ? { opacity: 0, scale: 0.92 }
              : { opacity: 1, scale: 1 }
          }
          transition={{ duration: BG_OUT_MS / 1000, ease: "easeInOut" }}
          onAnimationComplete={() => {
            // Only advance from the fade-out we triggered, never the initial
            // shared-layout pop-in from the winning cell.
            if (revealStep === "bgOut") setRevealStep("palette");
          }}
          style={{ backgroundColor: rgbString(champion) }}
        />
      )}

      {champion && revealStep !== "bgOut" && revealStep !== "palette" && (
        <motion.div
          key={`${champion.id}-text`}
          className="absolute bottom-0 flex flex-col p-5"
          style={{ color: darkenColor(champion) }}
        >
          <WaveText
            text={line1}
            className="text-8xl font-semibold"
            delay={0.1}
            show={revealStep === "hold"}
            onAnimationComplete={handleTextOutroComplete}
          />
          <WaveText
            text="Is The Seed"
            className="text-8xl font-semibold"
            delay={line2Delay}
            show={revealStep === "hold"}
            onAnimationComplete={handleTextOutroComplete}
          />
        </motion.div>
      )}

      {champion && (
        <motion.div className="absolute inset-0 flex flex-col items-center justify-center gap-8 pointer-events-none">
          {revealStep === "palette" && (
            <>
              {/* Row 1: HSL approximation — one hue, 5 lightness stops. */}
              <div className="flex items-center justify-center gap-3">
                {hslPalette.map((tone, i) => (
                  <motion.div
                    key={tone.id}
                    className="flex flex-col items-center gap-2"
                    initial={{ opacity: 0, y: 24, scale: 0.85 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{
                      duration: 0.5,
                      ease: [0.22, 1, 0.36, 1],
                      delay: i * 0.09,
                    }}
                  >
                    <div className="h-24 w-24" style={{ backgroundColor: tone.hex }} />
                    <span
                      className="text-xs uppercase tracking-widest"
                      style={{ color: darkenColor({ rgb: tone.rgb } as ExtractedColor) }}
                    >
                      {tone.name}
                    </span>
                  </motion.div>
                ))}
              </div>

              {/* Row 2: HCT roles — correct hue/chroma, shown at seed's tone. */}
              <div className="flex items-center justify-center gap-3">
                {hctPalette.map((tone, i) => (
                  <motion.div
                    key={tone.id}
                    className="flex flex-col items-center gap-2"
                    initial={{ opacity: 0, y: 24, scale: 0.85 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{
                      duration: 0.5,
                      ease: [0.22, 1, 0.36, 1],
                      delay: hslPalette.length * 0.09 + 0.3 + i * 0.09,
                    }}
                  >
                    <div className="h-24 w-24" style={{ backgroundColor: tone.hex }} />
                    <span
                      className="text-xs uppercase tracking-widest"
                      style={{ color: darkenColor({ rgb: tone.rgb } as ExtractedColor) }}
                    >
                      {tone.name}
                    </span>
                  </motion.div>
                ))}
              </div>

              {/* Row 3: HCT UI tokens — the actual resolved widget colors. */}
              <div className="grid grid-cols-4 grid-rows-2 gap-3">
                {hctTokens.map((token, i) => (
                  <motion.div
                    key={token.id}
                    className="flex flex-col items-center gap-2"
                    initial={{ opacity: 0, y: 24, scale: 0.85 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{
                      duration: 0.5,
                      ease: [0.22, 1, 0.36, 1],
                      delay:
                        hslPalette.length * 0.09 +
                        hctPalette.length * 0.09 +
                        0.6 +
                        i * 0.07,
                    }}
                  >
                    <div className="h-16 w-16" style={{ backgroundColor: token.hex }} />
                    <span
                      className="text-[10px] uppercase tracking-widest"
                      style={{ color: darkenColor({ rgb: token.rgb } as ExtractedColor) }}
                    >
                      {token.token}
                    </span>
                  </motion.div>
                ))}
              </div>
            </>
          )}
        </motion.div>
      )}
    </div>
  );
};
