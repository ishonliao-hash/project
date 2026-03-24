import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Film, AlertCircle } from 'lucide-react';
import { uploadScene } from '../api/client';
import type { Scene } from '../types';

interface Props {
  projectId: string;
  onSceneAdded: (scene: Scene) => void;
}

interface UploadingFile {
  name: string;
  progress: 'uploading' | 'done' | 'error';
  error?: string;
}

export default function SceneUploader({ projectId, onSceneAdded }: Props) {
  const [uploading, setUploading] = useState<UploadingFile[]>([]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    for (const file of acceptedFiles) {
      setUploading(prev => [...prev, { name: file.name, progress: 'uploading' }]);
      try {
        const scene = await uploadScene(projectId, file);
        onSceneAdded(scene);
        setUploading(prev =>
          prev.map(u => u.name === file.name ? { ...u, progress: 'done' } : u)
        );
        setTimeout(() => {
          setUploading(prev => prev.filter(u => u.name !== file.name));
        }, 2000);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Upload failed';
        setUploading(prev =>
          prev.map(u => u.name === file.name ? { ...u, progress: 'error', error: msg } : u)
        );
      }
    }
  }, [projectId, onSceneAdded]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'video/*': ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.m4v']
    },
    multiple: true
  });

  return (
    <div className="space-y-3">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
          isDragActive
            ? 'border-film-accent bg-film-accent/5'
            : 'border-film-border hover:border-gray-500 hover:bg-film-dark/50'
        }`}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-3">
          <div className={`p-3 rounded-full ${isDragActive ? 'bg-film-accent/20' : 'bg-film-border'}`}>
            <Upload size={24} className={isDragActive ? 'text-film-accent' : 'text-gray-400'} />
          </div>
          <div>
            <p className="font-medium text-sm">
              {isDragActive ? 'Drop scenes here...' : 'Drag & drop video scenes'}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              MP4, MOV, AVI, MKV, WebM · Multiple files OK
            </p>
          </div>
          <button className="btn-secondary text-xs py-1.5 px-3">
            Browse Files
          </button>
        </div>
      </div>

      {uploading.length > 0 && (
        <div className="space-y-1.5">
          {uploading.map(u => (
            <div key={u.name} className="flex items-center gap-2 bg-film-dark rounded-lg px-3 py-2">
              {u.progress === 'uploading' && (
                <div className="flex gap-1">
                  {[0,1,2].map(i => (
                    <div key={i} className="thinking-dot w-1.5 h-1.5 bg-film-accent rounded-full" style={{animationDelay:`${i*0.2}s`}} />
                  ))}
                </div>
              )}
              {u.progress === 'done' && <Film size={14} className="text-film-green" />}
              {u.progress === 'error' && <AlertCircle size={14} className="text-film-red" />}
              <span className="text-xs text-gray-300 truncate flex-1">{u.name}</span>
              <span className={`text-xs badge ${
                u.progress === 'uploading' ? 'bg-film-accent/20 text-film-accent' :
                u.progress === 'done' ? 'bg-film-green/20 text-film-green' :
                'bg-film-red/20 text-film-red'
              }`}>
                {u.progress === 'uploading' ? 'Uploading' : u.progress === 'done' ? 'Done' : 'Error'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
