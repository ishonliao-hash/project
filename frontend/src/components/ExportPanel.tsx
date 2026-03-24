import { useState, useEffect } from 'react';
import { Download, Loader2, CheckCircle, AlertCircle, Film } from 'lucide-react';
import type { Project } from '../types';
import { startExport, getExportStatus, getExportDownloadUrl } from '../api/client';

interface Props { project: Project; }

export default function ExportPanel({ project }: Props) {
  const [quality, setQuality] = useState<'low' | 'medium' | 'high'>('high');
  const [status, setStatus] = useState<'idle' | 'processing' | 'complete' | 'error'>('idle');
  const [jobId, setJobId] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!jobId || status !== 'processing') return;
    const poll = setInterval(async () => {
      const s = await getExportStatus(jobId);
      if (s.status === 'complete') { setStatus('complete'); clearInterval(poll); }
      else if (s.status === 'error') { setError(s.error ?? 'Export failed'); setStatus('error'); clearInterval(poll); }
    }, 2000);
    return () => clearInterval(poll);
  }, [jobId, status]);

  const handleExport = async () => {
    setStatus('processing'); setError('');
    try {
      const job = await startExport(project.id, quality);
      setJobId(job.job_id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Export failed');
      setStatus('error');
    }
  };

  const hasClips = (project.edit_plan?.decisions.length ?? 0) > 0;

  return (
    <div className="panel p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Film size={15} className="text-film-accent" />
        <h2 className="font-semibold text-sm">Export Film</h2>
      </div>

      <div className="flex items-center gap-3">
        <label className="text-xs text-gray-400 whitespace-nowrap">Quality</label>
        <select
          className="flex-1 bg-film-dark border border-film-border rounded-lg text-sm text-white px-3 py-1.5"
          value={quality}
          onChange={e => setQuality(e.target.value as typeof quality)}
          disabled={status === 'processing'}
        >
          <option value="low">Low (fast render)</option>
          <option value="medium">Medium</option>
          <option value="high">High (slow render)</option>
        </select>
      </div>

      {error && (
        <p className="text-film-red text-xs bg-film-red/10 rounded-lg px-3 py-2 flex items-center gap-2">
          <AlertCircle size={12} /> {error}
        </p>
      )}

      {status === 'complete' && jobId ? (
        <a href={getExportDownloadUrl(jobId)} download
          className="btn-primary w-full flex items-center justify-center gap-2 py-2.5 no-underline"
        >
          <Download size={15} />
          <span className="text-sm font-semibold">Download MP4</span>
        </a>
      ) : (
        <button
          className="btn-primary w-full flex items-center justify-center gap-2 py-2.5"
          onClick={handleExport}
          disabled={status === 'processing' || !hasClips}
        >
          {status === 'processing' ? (
            <><Loader2 size={15} className="animate-spin" /><span className="text-sm">Rendering...</span></>
          ) : (
            <><Download size={15} /><span className="text-sm font-semibold">Export to MP4</span></>
          )}
        </button>
      )}

      {status === 'complete' && (
        <p className="text-film-green text-xs flex items-center gap-1.5">
          <CheckCircle size={13} /> Export complete — click download above.
        </p>
      )}
      {!hasClips && status === 'idle' && (
        <p className="text-xs text-gray-500 text-center">Add clips to the timeline first</p>
      )}
    </div>
  );
}
