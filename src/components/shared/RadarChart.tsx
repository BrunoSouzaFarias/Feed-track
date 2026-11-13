import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface RadarScores {
  communication: number;
  teamwork: number;
  technical: number;
  proactivity: number;
  attendance: number;
}

interface RadarChartProps {
  selfAssessment?: RadarScores | null;
  supervisor?: RadarScores | null;
  selfLabel?: string;
  supervisorLabel?: string;
}

const AXIS_KEYS: (keyof RadarScores)[] = ['communication', 'teamwork', 'technical', 'proactivity', 'attendance'];

const AXIS_LABELS: Record<keyof RadarScores, string> = {
  communication: 'Comunicação',
  teamwork: 'Trabalho em Equipe',
  technical: 'Conhecimento Técnico',
  proactivity: 'Proatividade',
  attendance: 'Comprometimento',
};

export default function RadarChart({
  selfAssessment,
  supervisor,
  selfLabel = 'Minha Autoavaliação',
  supervisorLabel = 'Avaliação do Supervisor',
}: RadarChartProps) {
  const [hoveredPoint, setHoveredPoint] = useState<{
    label: string;
    value: number;
    type: 'self' | 'supervisor';
    x: number;
    y: number;
  } | null>(null);

  const [visibleDatasets, setVisibleDatasets] = useState({
    self: true,
    supervisor: true,
  });

  const width = 420;
  const height = 360;
  const cx = width / 2;
  const cy = height / 2;
  const r = 120; // Radius

  // Angles for the 5 vertices
  const angles = useMemo(() => {
    return AXIS_KEYS.map((_, i) => (i * 2 * Math.PI) / 5 - Math.PI / 2);
  }, []);

  // Compute point coordinate
  const getCoordinates = useCallback((axisIndex: number, value: number) => {
    const angle = angles[axisIndex];
    // Map value (1 to 5) to radius (0 to r)
    const distance = (value / 5) * r;
    return {
      x: cx + distance * Math.cos(angle),
      y: cy + distance * Math.sin(angle),
    };
  }, [angles, cx, cy, r]);

  // Coordinates for labels positioning
  const getLabelCoordinates = (axisIndex: number) => {
    const angle = angles[axisIndex];
    // Push label further out
    const distance = r + 25;
    return {
      x: cx + distance * Math.cos(angle),
      y: cy + distance * Math.sin(angle),
    };
  };

  // Generate paths for background grids (1 to 5)
  const gridPolygons = useMemo(() => {
    return [1, 2, 3, 4, 5].map((level) => {
      const points = angles.map((angle) => {
        const distance = (level / 5) * r;
        const x = cx + distance * Math.cos(angle);
        const y = cy + distance * Math.sin(angle);
        return `${x},${y}`;
      });
      return {
        level,
        pointsString: points.join(' '),
      };
    });
  }, [angles, cx, cy, r]);

  // Points string for self assessment polygon
  const selfPoints = useMemo(() => {
    if (!selfAssessment) return '';
    return AXIS_KEYS.map((key, i) => {
      const val = selfAssessment[key] || 0;
      const { x, y } = getCoordinates(i, val);
      return `${x},${y}`;
    }).join(' ');
  }, [selfAssessment, getCoordinates]);

  // Points string for supervisor assessment polygon
  const supervisorPoints = useMemo(() => {
    if (!supervisor) return '';
    return AXIS_KEYS.map((key, i) => {
      const val = supervisor[key] || 0;
      const { x, y } = getCoordinates(i, val);
      return `${x},${y}`;
    }).join(' ');
  }, [supervisor, getCoordinates]);

  // Points arrays for rendering interactive circles
  const selfCircles = useMemo(() => {
    if (!selfAssessment) return [];
    return AXIS_KEYS.map((key, i) => {
      const val = selfAssessment[key] || 0;
      const { x, y } = getCoordinates(i, val);
      return { label: AXIS_LABELS[key], value: val, x, y };
    });
  }, [selfAssessment, getCoordinates]);

  const supervisorCircles = useMemo(() => {
    if (!supervisor) return [];
    return AXIS_KEYS.map((key, i) => {
      const val = supervisor[key] || 0;
      const { x, y } = getCoordinates(i, val);
      return { label: AXIS_LABELS[key], value: val, x, y };
    });
  }, [supervisor, getCoordinates]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 200, damping: 20 }}
      className="relative flex flex-col items-center bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm select-none w-full"
    >
      {/* Interactive Legend / Toggle */}
      <div className="flex gap-4 mb-4 text-xs font-semibold">
        {selfAssessment && (
          <button
            onClick={() => setVisibleDatasets((prev) => ({ ...prev, self: !prev.self }))}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all ${
              visibleDatasets.self
                ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-600 dark:text-indigo-400'
                : 'bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-400 dark:text-zinc-500'
            }`}
          >
            <span className={`w-2 h-2 rounded-full bg-indigo-500 ${!visibleDatasets.self && 'opacity-30'}`} />
            {selfLabel}
          </button>
        )}
        {supervisor && (
          <button
            onClick={() => setVisibleDatasets((prev) => ({ ...prev, supervisor: !prev.supervisor }))}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all ${
              visibleDatasets.supervisor
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                : 'bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-400 dark:text-zinc-500'
            }`}
          >
            <span className={`w-2 h-2 rounded-full bg-emerald-500 ${!visibleDatasets.supervisor && 'opacity-30'}`} />
            {supervisorLabel}
          </button>
        )}
      </div>

      <div className="relative w-full max-w-[420px] aspect-[420/360]">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-full text-zinc-400 dark:text-zinc-500"
        >
          {/* Concentric grid pentagons — staggered entrance */}
          {gridPolygons.map(({ level, pointsString }, index) => (
            <motion.polygon
              key={level}
              points={pointsString}
              fill="none"
              stroke="currentColor"
              strokeOpacity="0.12"
              strokeWidth="1"
              initial={{ opacity: 0, scale: 0.4 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{
                type: 'spring',
                stiffness: 200,
                damping: 20,
                delay: index * 0.05,
              }}
              style={{ transformOrigin: `${cx}px ${cy}px` }}
            />
          ))}

          {/* Grid lines from center to vertices — staggered entrance */}
          {angles.map((angle, i) => {
            const x = cx + r * Math.cos(angle);
            const y = cy + r * Math.sin(angle);
            return (
              <motion.line
                key={i}
                x1={cx}
                y1={cy}
                x2={x}
                y2={y}
                stroke="currentColor"
                strokeOpacity="0.12"
                strokeWidth="1.2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.05, duration: 0.3 }}
              />
            );
          })}

          {/* Scale labels (1 to 5) */}
          {[1, 2, 3, 4, 5].map((level) => {
            const distance = (level / 5) * r;
            return (
              <text
                key={level}
                x={cx + 4}
                y={cy - distance + 4}
                fontSize="9"
                className="fill-zinc-400/80 dark:fill-zinc-500/80 font-bold"
              >
                {level}
              </text>
            );
          })}

          {/* Axis Labels — fade in with delay */}
          {AXIS_KEYS.map((key, i) => {
            const { x, y } = getLabelCoordinates(i);
            // Label alignment helpers
            let textAnchor: 'inherit' | 'end' | 'middle' | 'start' = 'middle';
            let dy = '0.35em';
            if (Math.abs(x - cx) > 10) {
              textAnchor = x > cx ? 'start' : 'end';
            }
            if (y < cy - 10) {
              dy = '-0.2em';
            } else if (y > cy + 10) {
              dy = '0.8em';
            }

            return (
              <motion.text
                key={key}
                x={x}
                y={y}
                textAnchor={textAnchor}
                dy={dy}
                fontSize="10"
                className="fill-zinc-650 dark:fill-zinc-350 font-bold tracking-tight"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 + i * 0.04, duration: 0.35 }}
              >
                {AXIS_LABELS[key]}
              </motion.text>
            );
          })}

          {/* Self-Assessment Polygon (Blue/Indigo) */}
          {selfAssessment && visibleDatasets.self && (
            <g>
              <motion.polygon
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 20, delay: 0.25 }}
                style={{ transformOrigin: `${cx}px ${cy}px` }}
                points={selfPoints}
                fill="rgba(99, 102, 241, 0.18)"
                stroke="rgba(99, 102, 241, 0.85)"
                strokeWidth="2.5"
              />
              {selfCircles.map((circle, i) => (
                <motion.circle
                  key={i}
                  cx={circle.x}
                  cy={circle.y}
                  r="5.5"
                  className="fill-white dark:fill-zinc-900 stroke-indigo-500 cursor-pointer hover:r-[7.5px]"
                  strokeWidth="2.5"
                  whileHover={{ scale: 1.3, strokeWidth: 3 }}
                  onMouseEnter={() =>
                    setHoveredPoint({
                      label: circle.label,
                      value: circle.value,
                      type: 'self',
                      x: circle.x,
                      y: circle.y,
                    })
                  }
                  onMouseLeave={() => setHoveredPoint(null)}
                />
              ))}
            </g>
          )}

          {/* Supervisor Assessment Polygon (Green/Teal) */}
          {supervisor && visibleDatasets.supervisor && (
            <g>
              <motion.polygon
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 20, delay: 0.35 }}
                style={{ transformOrigin: `${cx}px ${cy}px` }}
                points={supervisorPoints}
                fill="rgba(16, 185, 129, 0.18)"
                stroke="rgba(16, 185, 129, 0.85)"
                strokeWidth="2.5"
              />
              {supervisorCircles.map((circle, i) => (
                <motion.circle
                  key={i}
                  cx={circle.x}
                  cy={circle.y}
                  r="5.5"
                  className="fill-white dark:fill-zinc-900 stroke-emerald-500 cursor-pointer"
                  strokeWidth="2.5"
                  whileHover={{ scale: 1.3, strokeWidth: 3 }}
                  onMouseEnter={() =>
                    setHoveredPoint({
                      label: circle.label,
                      value: circle.value,
                      type: 'supervisor',
                      x: circle.x,
                      y: circle.y,
                    })
                  }
                  onMouseLeave={() => setHoveredPoint(null)}
                />
              ))}
            </g>
          )}
        </svg>

        {/* Dynamic Tooltip overlaid over container */}
        <AnimatePresence>
          {hoveredPoint && (
            <motion.div
              initial={{ opacity: 0, y: 5, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.12 }}
              className="absolute pointer-events-none bg-zinc-950/95 dark:bg-zinc-900/95 backdrop-blur-md border border-zinc-800 dark:border-zinc-700/60 text-white rounded-lg px-3 py-2 text-left text-[11px] shadow-xl z-30"
              style={{
                left: `${(hoveredPoint.x / width) * 100}%`,
                top: `${(hoveredPoint.y / height) * 100 - 15}%`,
                transform: 'translate(-50%, -100%)',
              }}
            >
              <p className="font-bold tracking-tight text-zinc-200">
                {hoveredPoint.label}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    hoveredPoint.type === 'self' ? 'bg-indigo-500' : 'bg-emerald-500'
                  }`}
                />
                <span className="text-zinc-400 font-medium">
                  {hoveredPoint.type === 'self' ? selfLabel : supervisorLabel}:
                </span>
                <span className="font-extrabold text-white text-xs">{hoveredPoint.value} / 5</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
