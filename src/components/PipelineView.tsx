import React, { useEffect, useState } from 'react';
import { Check, Download } from 'lucide-react';
import { OrbitalHorizonBackdrop, SatelliteLogoIcon } from './BrandMark';

interface PipelineViewProps {
  onNavigateDashboard: () => void;
}

interface AdminPipelineStats {
  activeCheckpoint: string;
  datasetsAvailable: string[];
  totalRuns: number;
  rice1Runs: number;
  rice2Runs: number;
  customRuns: number;
  avgPsnrDb: number;
  avgReductionPct: number;
}

const SIMPLE_WORKFLOW = [
  {
    index: '01',
    title: 'Select or Upload Image',
    description: 'Upload a satellite photo or choose one of the built-in sample satellite scenes.',
  },
  {
    index: '02',
    title: 'Prepare & Detect Clouds',
    description: 'Resize and balance the image while highlighting cloud and haze areas.',
  },
  {
    index: '03',
    title: 'Remove Clouds',
    description: 'Generate a sharp, cloud-free view while keeping clear ground untouched.',
  },
  {
    index: '04',
    title: 'Compare & Explore Similar Scenes',
    description: 'Compare input, cloud-free, and original images, and browse matching scenes.',
  },
];

export function PipelineView({ onNavigateDashboard }: PipelineViewProps) {
  const [downloading, setDownloading] = useState(false);
  const [adminStats, setAdminStats] = useState<AdminPipelineStats>({
    activeCheckpoint: 'gen_model_epoch_200.pth',
    datasetsAvailable: ['RICE1', 'RICE2'],
    totalRuns: 5,
    rice1Runs: 2,
    rice2Runs: 3,
    customRuns: 0,
    avgPsnrDb: 32.6,
    avgReductionPct: 59.1,
  });

  useEffect(() => {
    fetch('/api/admin/pipeline-stats')
      .then((r) => r.json())
      .then((data) => {
        if (data && typeof data.totalRuns === 'number') {
          setAdminStats(data as AdminPipelineStats);
        }
      })
      .catch(() => {});
  }, []);

  const handleDownloadPyTorchScript = async () => {
    setDownloading(true);
    try {
      const res = await fetch('/api/pipeline/export');
      const data = await res.json();
      const blob = new Blob([data.code || ''], { type: 'text/x-python' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = data.filename || 'altaria_cloud_removal.py';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Clean Overview Card */}
      <div className="relative overflow-hidden rounded-xl border border-[#1A314D] bg-[#07111F]">
        <div className="absolute inset-0 opacity-80">
          <OrbitalHorizonBackdrop variant="horizon-bottom" />
        </div>

        <div className="relative z-10 p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="max-w-xl">
              <div className="inline-flex items-center gap-2.5">
                <SatelliteLogoIcon size={30} />
                <span className="text-2xl font-bold tracking-tight text-white">
                  System Overview
                </span>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-[#C9DBEE]">
                Satellite cloud removal, attention mapping, image comparison, and scene recommendations.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={onNavigateDashboard}
                className="rounded-lg bg-[#0EA5E9] px-4 py-2.5 text-xs font-semibold text-[#04101D] transition-colors hover:bg-[#38BDF8] whitespace-nowrap shrink-0"
              >
                Go to Dashboard
              </button>
              <button
                type="button"
                disabled={downloading}
                onClick={handleDownloadPyTorchScript}
                className="flex items-center gap-1.5 rounded-lg border border-[#25466B] bg-[#091628]/90 px-4 py-2.5 text-xs font-medium text-[#DCE8F5] transition-colors hover:border-[#38BDF8] hover:text-white whitespace-nowrap shrink-0"
              >
                <Download className="h-3.5 w-3.5 text-[#38BDF8]" />
                {downloading ? 'Downloading...' : 'Download Python Script'}
              </button>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-lg border border-[#1E3856] bg-[#091628]/90 p-4">
              <span className="text-xs text-[#88A2BE]">Total Processed</span>
              <p className="mt-1 font-mono text-lg font-semibold text-white tabular-nums">
                {adminStats.totalRuns}
              </p>
            </div>
            <div className="rounded-lg border border-[#1E3856] bg-[#091628]/90 p-4">
              <span className="text-xs text-[#88A2BE]">Sample / Uploaded Runs</span>
              <p className="mt-1 font-mono text-lg font-semibold text-white tabular-nums">
                {adminStats.rice1Runs + adminStats.rice2Runs} / {adminStats.customRuns}
              </p>
            </div>
            <div className="rounded-lg border border-[#1E3856] bg-[#091628]/90 p-4">
              <span className="text-xs text-[#88A2BE]">Average PSNR</span>
              <p className="mt-1 font-mono text-lg font-semibold text-white tabular-nums">
                {adminStats.avgPsnrDb.toFixed(1)} dB
              </p>
            </div>
            <div className="rounded-lg border border-[#1E3856] bg-[#091628]/90 p-4">
              <span className="text-xs text-[#88A2BE]">Avg Cloud Removed</span>
              <p className="mt-1 font-mono text-lg font-semibold text-emerald-400 tabular-nums">
                {adminStats.avgReductionPct}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Simple 4-Step Summary */}
      <section className="rounded-xl border border-[#1A314D] bg-[#0B1829] p-6">
        <h2 className="border-b border-[#152840] pb-4 text-base font-semibold text-white">
          Workflow Summary
        </h2>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {SIMPLE_WORKFLOW.map((step) => (
            <div
              key={step.index}
              className="rounded-lg border border-[#182E49] bg-[#081322] p-4"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-semibold text-[#38BDF8]">
                  {step.index}.
                </span>
                <Check className="h-3.5 w-3.5 text-emerald-400" />
              </div>
              <h3 className="mt-2 text-xs font-semibold text-white">
                {step.title}
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-[#9DB4CC]">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
