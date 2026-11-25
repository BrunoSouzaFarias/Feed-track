import { useMemo, useState } from 'react';

interface AvatarProps {
  name: string;
  photoURL?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export default function Avatar({ name, photoURL, size = 'md', className = '' }: AvatarProps) {
  // A falha fica atrelada à URL que falhou: se photoURL mudar, tenta de novo (sem effect).
  const [failedUrl, setFailedUrl] = useState<string | undefined>(undefined);
  const imageFailed = failedUrl !== undefined && failedUrl === photoURL;

  const initials = useMemo(() => {
    if (!name) return '??';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }, [name]);

  const gradientClass = useMemo(() => {
    // Generate a consistent gradient color based on string hash
    const colors = [
      'from-blue-600 to-liberty',
      'from-teal-500 to-emerald-600',
      'from-indigo-500 to-purple-600',
      'from-rose-500 to-pink-600',
      'from-amber-500 to-orange-600',
      'from-cyan-500 to-blue-600',
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const idx = Math.abs(hash) % colors.length;
    return colors[idx];
  }, [name]);

  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm font-medium',
    lg: 'w-16 h-16 text-xl font-bold',
    xl: 'w-24 h-24 text-3xl font-extrabold',
  };

  return (
    <div className={`relative inline-flex items-center justify-center rounded-full overflow-hidden shrink-0 select-none shadow-md ${sizeClasses[size]} ${className}`}>
      {photoURL && !imageFailed ? (
        <img
          src={photoURL}
          alt={name}
          className="w-full h-full object-cover"
          onError={() => setFailedUrl(photoURL)}
        />
      ) : (
        <div className={`w-full h-full flex items-center justify-center bg-gradient-to-br ${gradientClass} text-white`}>
          {initials}
        </div>
      )}
    </div>
  );
}
