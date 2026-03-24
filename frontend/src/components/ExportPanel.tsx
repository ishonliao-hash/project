import { useState, useEffect } from 'react';
import { Download, Loader2, CheckCircle, AlertCircle, Film } from 'lucide-react';
import type { Project } from '../types';
import { startExport, getExportStatus, getExportDownloadUrl } from '../api/client';

interface Props {
  project: Project;
}

type Status = 'idle' | 'processing' | 'complete' | 'error';

export default function ExportPanel({ project }: Props) {
  const [quality, setQuality] = useState<'low' | 'medium' | 'high'>('high');
  const [status, setStatus] = useState<Status>('idle');
  const [jobId, setJobId] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!jobId || status !== 'processing') return;
    const poll = setInterval(async () => {
      try {
        const s = await getExportStatus(jobId);
        if (s.status === 'complete') {
          setStatus('complete');
          clearInterval(poll);
        } else if (s.status === 'error') {
          setError(s.error ?? 'Export failed');
          setStatus('error');
          clearInterval(poll);
        }
      } catch {
        // keep polling
      }
    }, 2000);
    return () => clearInterval(poll);
  }, [jobId, status]);

  const handleExport = async () => {
    if (!project.edit_plan?.decisions.length) return;
    setStatus('processing');
    setError('');
    try {
      const job = await startExport(project.id, quality);
      setJobId(job.job_id);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Export failed';
      setError(msg);
      setStatus('error');
    }
  };

  const hasEditPlan = project.edit_plan && project.edit_plan.decisions.length > 0;

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
          <option value="low">Low (fast)</option>
          <option value="medium">Medium</option>
          <option value="high">High (slow)</option>
        </select>
      </div>

      {error && (
        <p className="text-film-red text-xs bg-film-red/10 rounded-lg px-3 py-2 flex items-center gap-2">
          <AlertCircle size={12} /> {error}
        </p>
      )}

      {status === 'complete' && jobId && (
        <a
          href={getExportDownloadUrl(jobId)}
          download
          className="btn-primary w-full flex items-center justify-center gap-2 py-2.5 no-underline"
        >
          <Download size={15} />
          <span className="text-sm font-semibold">Download MP4</span>
        </a>
      )}

      {status !== 'complete' && (
        <button
          className="btn-primary w-full flex items-center justify-center gap-2 py-2.5"
          onClick={handleExport}
          disabled={status === 'processing' || !hasEditPlan}
        >
          {status === 'processing' ? (
            <>
              <Loader2 size={15} className="animate-spin" />
              <span className="text-sm">Exporting with FFmpeg...</span>
            </>
          ) : (
            <>
              <Download size={15} />
              <span className="text-sm font-semibold">Export to MP4</span>
            </>
          )}
        </button>
      )}

      {status === 'complete' && (
        <div className="flex items-center gap-2 text-film-green text-xs">
          <CheckCircle size={13} />
          <span>Export complete! Click download above.</span>
        </div>
      )}

      {!hasEditPlan && (
        <p className="text-xs text-gray-500 text-center">Generate an edit plan first</p>
      )}
    </div>
  );
}
