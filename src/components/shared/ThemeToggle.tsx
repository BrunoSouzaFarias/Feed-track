import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      id="theme-toggle-btn"
      className="p-2 rounded-lg bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-liberty shadow-md flex items-center justify-center"
      aria-label="Alternar tema"
    >
      {theme === 'dark' ? (
        <Sun className="h-5 w-5 text-amber-400 animate-spin-slow" />
      ) : (
        <Moon className="h-5 w-5 text-liberty" />
      )}
    </button>
  );
}
