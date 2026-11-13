/** Logotipo Liberty Health + nome do produto (antes duplicado inline no dashboard). */
export default function BrandLogo() {
  return (
          <div className="flex items-center gap-3 text-left">
            <div className="p-1.5 rounded-xl bg-gradient-to-tr from-[#10b981]/15 to-[#059669]/5 dark:from-[#34d399]/15 dark:to-[#059669]/5 shadow-inner border border-emerald-500/10 flex items-center justify-center shrink-0 animate-float-slow">
              <svg className="h-6 w-6" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Liberty Health Flame/Leaf vector path replica */}
                <path d="M 48.5 14.3 L 48.5 15.7 L 48.5 18.6 L 48.5 21.4 L 50.0 24.3 L 51.6 27.1 L 53.1 30.0 L 56.2 32.8 L 59.3 35.7 L 62.3 38.6 L 65.4 41.4 L 67.0 44.3 L 70.0 47.1 L 71.6 50.0 L 73.1 52.8 L 74.6 55.7 L 74.6 58.6 L 74.6 61.4 L 73.1 64.3 L 71.6 67.1 L 68.5 70.0 L 65.4 72.8 L 62.3 75.7 L 59.3 77.1 L 60.8 74.3 L 60.8 71.4 L 59.3 68.6 L 57.7 65.7 L 56.2 62.8 L 53.1 60.0 L 50.0 58.6 L 47.0 55.7 L 43.9 54.3 L 40.8 51.4 L 37.7 48.6 L 36.2 45.7 L 34.6 42.8 L 34.6 40.0 L 34.6 37.1 L 34.6 34.3 L 34.6 31.4 L 36.2 28.6 L 36.2 25.7 L 39.3 22.8 L 40.8 20.0 L 43.9 17.1 L 47.0 15.7 L 48.5 14.3 Z" fill="url(#libertyHealthGlow)" />
                <path d="M 30.0 48.6 L 30.0 50.0 L 33.1 52.8 L 34.6 55.7 L 37.7 58.6 L 40.8 60.0 L 43.9 62.8 L 47.0 64.3 L 50.0 67.1 L 53.1 70.0 L 53.1 72.8 L 53.1 75.7 L 53.1 78.6 L 51.6 81.4 L 48.5 84.3 L 45.4 85.7 L 45.4 82.8 L 43.9 80.0 L 40.8 77.1 L 37.7 74.3 L 34.6 72.8 L 31.6 71.4 L 28.5 68.6 L 27.0 65.7 L 25.4 62.8 L 25.4 60.0 L 25.4 57.1 L 25.4 54.3 L 27.0 51.4 L 30.0 48.6 Z" fill="url(#libertyHealthGlow)" />
                
                <path d="M 48.5 14.3 L 48.5 15.7 L 48.5 18.6 L 48.5 21.4 L 50.0 24.3 L 51.6 27.1 L 53.1 30.0 L 56.2 32.8 L 59.3 35.7 L 62.3 38.6 L 65.4 41.4 L 67.0 44.3 L 70.0 47.1 L 71.6 50.0 L 73.1 52.8 L 74.6 55.7 L 74.6 58.6 L 74.6 61.4 L 73.1 64.3 L 71.6 67.1 L 68.5 70.0 L 65.4 72.8 L 62.3 75.7 L 59.3 77.1 L 60.8 74.3 L 60.8 71.4 L 59.3 68.6 L 57.7 65.7 L 56.2 62.8 L 53.1 60.0 L 50.0 58.6 L 47.0 55.7 L 43.9 54.3 L 40.8 51.4 L 37.7 48.6 L 36.2 45.7 L 34.6 42.8 L 34.6 40.0 L 34.6 37.1 L 34.6 34.3 L 34.6 31.4 L 36.2 28.6 L 36.2 25.7 L 39.3 22.8 L 40.8 20.0 L 43.9 17.1 L 47.0 15.7 L 48.5 14.3 Z" fill="url(#libertyHealthLogo)" />
                <path d="M 30.0 48.6 L 30.0 50.0 L 33.1 52.8 L 34.6 55.7 L 37.7 58.6 L 40.8 60.0 L 43.9 62.8 L 47.0 64.3 L 50.0 67.1 L 53.1 70.0 L 53.1 72.8 L 53.1 75.7 L 53.1 78.6 L 51.6 81.4 L 48.5 84.3 L 45.4 85.7 L 45.4 82.8 L 43.9 80.0 L 40.8 77.1 L 37.7 74.3 L 34.6 72.8 L 31.6 71.4 L 28.5 68.6 L 27.0 65.7 L 25.4 62.8 L 25.4 60.0 L 25.4 57.1 L 25.4 54.3 L 27.0 51.4 L 30.0 48.6 Z" fill="url(#libertyHealthLogo)" />
                <defs>
                  <linearGradient id="libertyHealthLogo" x1="20" y1="15" x2="80" y2="95" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#6ee7b7" />
                    <stop offset="50%" stopColor="#10b981" />
                    <stop offset="100%" stopColor="#047857" />
                  </linearGradient>
                  <radialGradient id="libertyHealthGlow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                  </radialGradient>
                </defs>
              </svg>
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-extrabold text-[#006c49] dark:text-[#4bdfa1] tracking-wider brand-text leading-tight">
                FEED-TRACK
              </span>
              <span className="text-[8px] text-zinc-400 dark:text-zinc-550 uppercase tracking-widest font-semibold leading-none mt-0.5">
                LIBERTY HEALTH
              </span>
            </div>
          </div>
  );
}
