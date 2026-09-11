import { motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { useExtractionStore, type ExtractedColor } from "@/store/extractionStore";
import { fight, scoreContender, type SeedBattle } from "./lib/SeedRule";

/** How many colors survive the cull to fight one-on-one. Battles = LIMIT - 1,  so this is the dial that controls total runtime. 64 -> 63 duels. */
const CONTENDER_LIMIT = 64;

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

type Phase = "admiring" | "culling" | "dueling" | "crowned";
type Step = "facing" | "resolving";

const rgbString = (color: ExtractedColor) =>
  `rgb(${color.rgb.r}, ${color.rgb.g}, ${color.rgb.b})`;

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

  const currentBattle = phase === "dueling" ? battles[battleIndex] : undefined;

  return (
    <div className="relative h-[60svh] w-[55svw] overflow-hidden ">
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
            // Staggered dissolve, weakest first.
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
            // The winner easing back into its own cell.
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
                // Keep the duelling pair above their neighbours while swollen.
                zIndex: isFighting ? 10 : 1,
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
          transition={{ duration: 0.6, ease: "easeInOut" }}
          style={{ backgroundColor: rgbString(champion) }}
        />
      )}
    </div>
  );
};
