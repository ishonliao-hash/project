import { Film, Scissors } from 'lucide-react';

export default function Header() {
  return (
    <header className="bg-film-dark border-b border-film-border px-6 py-3 flex items-center gap-3">
      <div className="flex items-center gap-2 text-film-accent">
        <Film size={24} />
        <Scissors size={18} />
      </div>
      <div>
        <h1 className="text-lg font-bold tracking-tight">AI Film Editor</h1>
        <p className="text-xs text-gray-400">Describe your vision. Let AI cut your film.</p>
      </div>
    </header>
  );
}
