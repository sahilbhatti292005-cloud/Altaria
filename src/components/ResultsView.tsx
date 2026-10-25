import React, { useRef, useState } from 'react';
import {
  ArrowRight,
  Columns2,
  Database,
  Download,
  Eye,
  ImagePlus,
  Layers,
  Search,
  Trash2,
} from 'lucide-react';
import type {
  ActiveRestorationResult,
  HistoryRecord,
  ResultsSubTab,
  ScenePresetId,
} from '../types/altaria';
import { triggerDataUrlDownload } from '../utils/restorationEngine';

type ComparisonPair =
  | 'input_vs_restored'
  | 'input_vs_original'
  | 'restored_vs_original';

interface ResultsViewProps {
  subTab: ResultsSubTab;
  onChangeSubTab: (tab: ResultsSubTab) => void;
  activeResult: ActiveRestorationResult | null;
  history: HistoryRecord[];
  loadingHistoryId: string | null;
  onSelectHistoryRecord: (record: HistoryRecord) => void;
  onDeleteHistoryRecord: (id: string) => void;
  onUploadGroundTruthForResult: (file: File) => void;
  onOpenComparisonInspector: () => void;
  onLoadRecommendedPreset: (presetId: ScenePresetId) => void;
  onNavigateDashboard: () => void;
}

export function ResultsView({
  subTab,
  onChangeSubTab,
  activeResult,
  history,
  loadingHistoryId,
  onSelectHistoryRecord,
  onDeleteHistoryRecord,
  onUploadGroundTruthForResult,
  onOpenComparisonInspector,
  onLoadRecommendedPreset,
  onNavigateDashboard,
}: ResultsViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [slot1Mode, setSlot1Mode] = useState<'raw' | 'preprocessed'>('raw');
  const [slot3Mode, setSlot3Mode] = useState<'heatmap' | 'highlight'>('heatmap');
  const [comparisonPair, setComparisonPair] =
    useState<ComparisonPair>('input_vs_restored');
  const [comparisonLayout, setComparisonLayout] = useState<
    'side-by-side' | 'curtain'
  >('side-by-side');
  const [curtainPct, setCurtainPct] = useState(50);

  const gtFileRef = useRef<HTMLInputElement | null>(null);
  const curtainRef = useRef<HTMLDivElement | null>(null);

  const filteredHistory = history.filter((item) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    const sourceLabel =
      item.datasetSource === 'CUSTOM' || (!item.datasetSource && !item.presetId)
        ? 'uploaded'
        : 'sample scene';
    return (
      item.imageName.toLowerCase().includes(q) ||
      item.dateLabel.toLowerCase().includes(q) ||
      sourceLabel.includes(q)
    );
  });

  const handleCurtainPointer = (clientX: number) => {
    const el = curtainRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const rel = ((clientX - rect.left) / Math.max(1, rect.width)) * 100;
    setCurtainPct(Math.max(4, Math.min(96, Math.round(rel))));
  };

  const originalSourceCaption = !activeResult
    ? ''
    : activeResult.groundTruthSource === 'user_uploaded'
    ? 'Uploaded original image'
    : activeResult.groundTruthSource === 'paired_benchmark'
    ? 'Clean reference image'
    : 'Reference clean image';

  const getComparisonImages = () => {
    if (!activeResult) {
      return {
        leftTitle: '',
        leftSub: '',
        leftUrl: '',
        rightTitle: '',
        rightSub: '',
        rightUrl: '',
      };
    }

    if (comparisonPair === 'input_vs_original') {
      return {
        leftTitle: 'Input Image',
        leftSub: activeResult.imageName,
        leftUrl: activeResult.cloudyInputUrl,
        rightTitle: 'Original Image',
        rightSub: originalSourceCaption,
        rightUrl: activeResult.groundTruthUrl,
      };
    }

    if (comparisonPair === 'restored_vs_original') {
      return {
        leftTitle: 'Cloud-Free Image',
        leftSub: `${activeResult.analytics.clearSurfaceAfterPct}% clear`,
        leftUrl: activeResult.restoredOutputUrl,
        rightTitle: 'Original Image',
        rightSub: originalSourceCaption,
        rightUrl: activeResult.groundTruthUrl,
      };
    }

    return {
      leftTitle: 'Input Image',
      leftSub: activeResult.imageName,
      leftUrl: activeResult.cloudyInputUrl,
      rightTitle: 'Cloud-Free Image',
      rightSub: `${activeResult.analytics.clearSurfaceAfterPct}% clear`,
      rightUrl: activeResult.restoredOutputUrl,
    };
  };

  const comp = getComparisonImages();

  return (
    <div className="space-y-6">
      {/* Simple Header + View Switcher */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            {subTab === 'output' ? 'Cloud Removal Results' : 'Processing History'}
          </h1>
          <p className="mt-1 text-sm text-[#8EA6C0]">
            {subTab === 'output'
              ? 'View your cloud-free image, attention map, coverage stats, and similar scenes.'
              : 'Browse and reopen previous cloud removal runs.'}
          </p>
        </div>

        <div className="flex items-center gap-1 rounded-lg border border-[#1A314D] bg-[#0A1626] p-1">
          <button
            type="button"
            onClick={() => onChangeSubTab('output')}
            className={`rounded-md px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
              subTab === 'output'
                ? 'bg-[#0EA5E9] text-[#04101D]'
                : 'text-[#9DB4CC] hover:bg-[#11233A] hover:text-white'
            }`}
          >
            Results
          </button>
          <button
            type="button"
            onClick={() => onChangeSubTab('history')}
            className={`rounded-md px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
              subTab === 'history'
                ? 'bg-[#0EA5E9] text-[#04101D]'
                : 'text-[#9DB4CC] hover:bg-[#11233A] hover:text-white'
            }`}
          >
            History ({history.length})
          </button>
        </div>
      </div>

      {/* ================= RESULTS VIEW ================= */}
      {subTab === 'output' && (
        <>
          {!activeResult ? (
            <div className="rounded-xl border border-[#1A314D] bg-[#0B1829] p-12 text-center">
              <p className="text-base font-semibold text-white">
                No Results Yet
              </p>
              <p className="mt-1.5 text-xs text-[#8EA6C0]">
                Upload a satellite image or choose a sample scene on the Dashboard.
              </p>
              <div className="mt-5 flex justify-center gap-3">
                <button
                  type="button"
                  onClick={onNavigateDashboard}
                  className="rounded-lg bg-[#0EA5E9] px-4 py-2.5 text-xs font-semibold text-[#04101D] hover:bg-[#38BDF8] whitespace-nowrap shrink-0"
                >
                  Go to Dashboard
                </button>
                {history.length > 0 && (
                  <button
                    type="button"
                    onClick={() => onChangeSubTab('history')}
                    className="rounded-lg border border-[#223F60] bg-[#081322] px-4 py-2.5 text-xs font-medium text-[#DCE8F5] hover:border-[#38BDF8] whitespace-nowrap shrink-0"
                  >
                    Open History
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* SECTION 1: Top 3-Column Visual Output */}
              <section className="rounded-xl border border-[#1A314D] bg-[#0B1829] p-6">
                <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                  {/* 1. Input / Preprocessed Image */}
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <h2 className="text-xs font-semibold text-[#DCE8F5]">
                        {slot1Mode === 'raw'
                          ? '1. Input Image'
                          : '1. Preprocessed Image'}
                      </h2>
                      <div className="flex items-center gap-1 rounded border border-[#1C3553] bg-[#081322] p-0.5">
                        <button
                          type="button"
                          onClick={() => setSlot1Mode('raw')}
                          className={`rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors whitespace-nowrap ${
                            slot1Mode === 'raw'
                              ? 'bg-[#0EA5E9] font-semibold text-[#04101D]'
                              : 'text-[#88A2BE] hover:text-white'
                          }`}
                        >
                          Input
                        </button>
                        <button
                          type="button"
                          onClick={() => setSlot1Mode('preprocessed')}
                          className={`rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors whitespace-nowrap ${
                            slot1Mode === 'preprocessed'
                              ? 'bg-[#0EA5E9] font-semibold text-[#04101D]'
                              : 'text-[#88A2BE] hover:text-white'
                          }`}
                        >
                          Preprocessed
                        </button>
                      </div>
                    </div>

                    <div className="mt-2.5 flex aspect-square w-full items-center justify-center overflow-hidden rounded-lg border border-[#1E3856] bg-[#060E1A]">
                      <img
                        src={
                          slot1Mode === 'raw'
                            ? activeResult.cloudyInputUrl
                            : activeResult.preprocessedInputUrl ||
                              activeResult.cloudyInputUrl
                        }
                        alt="Input satellite image"
                        referrerPolicy="no-referrer"
                        className="h-full w-full object-contain"
                      />
                    </div>
                    <p className="mt-2 truncate text-xs text-[#88A2BE]">
                      {slot1Mode === 'raw'
                        ? activeResult.imageName
                        : `Normalized · ${activeResult.preprocess.resizedDimensions.split(' ')[0]} px`}
                    </p>
                  </div>

                  {/* 2. Cloud-Free Image */}
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <h2 className="text-xs font-semibold text-[#DCE8F5]">
                        2. Cloud-Free Image
                      </h2>
                      <span className="font-mono text-[11px] text-emerald-400 tabular-nums whitespace-nowrap">
                        {activeResult.analytics.clearSurfaceAfterPct}% clear
                      </span>
                    </div>
                    <div className="mt-2.5 flex aspect-square w-full items-center justify-center overflow-hidden rounded-lg border border-[#1E3856] bg-[#060E1A]">
                      <img
                        src={activeResult.restoredOutputUrl}
                        alt="Cloud-free satellite image"
                        referrerPolicy="no-referrer"
                        className="h-full w-full object-contain"
                      />
                    </div>
                    <p className="mt-2 truncate text-xs text-[#88A2BE]">
                      Clouds removed · Clear areas preserved ({activeResult.preprocess.resizedDimensions.split(' ')[0]} px)
                    </p>
                  </div>

                  {/* 3. Attention Map */}
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <h2 className="text-xs font-semibold text-[#DCE8F5]">
                        3. Attention Map
                      </h2>
                      <div className="flex items-center gap-1 rounded border border-[#1C3553] bg-[#081322] p-0.5">
                        <button
                          type="button"
                          onClick={() => setSlot3Mode('heatmap')}
                          className={`rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors whitespace-nowrap ${
                            slot3Mode === 'heatmap'
                              ? 'bg-[#0EA5E9] font-semibold text-[#04101D]'
                              : 'text-[#88A2BE] hover:text-white'
                          }`}
                        >
                          Heatmap
                        </button>
                        <button
                          type="button"
                          onClick={() => setSlot3Mode('highlight')}
                          className={`rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors whitespace-nowrap ${
                            slot3Mode === 'highlight'
                              ? 'bg-[#0EA5E9] font-semibold text-[#04101D]'
                              : 'text-[#88A2BE] hover:text-white'
                          }`}
                        >
                          Highlights
                        </button>
                      </div>
                    </div>

                    <div className="mt-2.5 flex aspect-square w-full items-center justify-center overflow-hidden rounded-lg border border-[#1E3856] bg-[#060E1A]">
                      <img
                        src={
                          slot3Mode === 'heatmap'
                            ? activeResult.heatmapUrl
                            : activeResult.attentionHighlightUrl ||
                              activeResult.heatmapUrl
                        }
                        alt="Cloud attention map"
                        referrerPolicy="no-referrer"
                        className="h-full w-full object-contain"
                      />
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-3">
                      <p className="truncate font-mono text-xs text-[#88A2BE] tabular-nums">
                        Cloud {activeResult.metrics.cloudCoveragePct}% · Haze{' '}
                        {activeResult.metrics.fogCoveragePct}%
                      </p>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[10px] text-[#7893AF]">Clear</span>
                        <div
                          className="h-1.5 w-16 rounded-sm"
                          style={{
                            background:
                              'linear-gradient(90deg, #0e2476 0%, #1ac2f4 30%, #52ee60 55%, #faca18 78%, #e82e10 100%)',
                          }}
                        />
                        <span className="text-[10px] text-[#7893AF]">Cloud</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Simple Action Row */}
                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[#152840] pt-4">
                  <button
                    type="button"
                    onClick={onOpenComparisonInspector}
                    className="inline-flex items-center gap-2 rounded-lg border border-[#244366] bg-[#081322] px-3.5 py-2 text-xs font-medium text-[#DCE8F5] transition-colors hover:border-[#38BDF8] hover:text-white whitespace-nowrap shrink-0"
                  >
                    <Eye className="h-3.5 w-3.5 text-[#38BDF8]" />
                    Open Attention &amp; Comparison View
                  </button>

                  <div className="flex flex-wrap items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() =>
                        triggerDataUrlDownload(
                          activeResult.restoredOutputUrl,
                          `altaria_cloudfree_${activeResult.imageName.replace(
                            /\.[^.]+$/,
                            ''
                          )}.png`
                        )
                      }
                      className="inline-flex items-center gap-2 rounded-lg bg-[#0EA5E9] px-3.5 py-2 text-xs font-semibold text-[#04101D] transition-colors hover:bg-[#38BDF8] whitespace-nowrap shrink-0"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Download Cloud-Free Image
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        triggerDataUrlDownload(
                          slot3Mode === 'heatmap'
                            ? activeResult.heatmapUrl
                            : activeResult.attentionHighlightUrl,
                          `altaria_attention_${activeResult.imageName.replace(
                            /\.[^.]+$/,
                            ''
                          )}.png`
                        )
                      }
                      className="inline-flex items-center gap-2 rounded-lg border border-[#244366] bg-[#081322] px-3.5 py-2 text-xs font-medium text-[#DCE8F5] transition-colors hover:border-[#38BDF8] hover:text-white whitespace-nowrap shrink-0"
                    >
                      <Download className="h-3.5 w-3.5 text-[#38BDF8]" />
                      Download Attention Map
                    </button>
                  </div>
                </div>
              </section>

              {/* SECTION 2: Input & Original Image Comparison (Input FIRST, then Original!) */}
              <section className="rounded-xl border border-[#1A314D] bg-[#0B1829] p-6">
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#152840] pb-4">
                  <div>
                    <h2 className="text-base font-semibold text-white">
                      Input &amp; Original Image Comparison
                    </h2>
                    <p className="mt-1 text-xs text-[#88A2BE]">
                      Compare your input image first, then inspect the cloud-free output or original image.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5">
                    <div className="flex items-center gap-1 rounded-lg border border-[#1C3553] bg-[#081322] p-1">
                      <button
                        type="button"
                        onClick={() => setComparisonPair('input_vs_restored')}
                        className={`rounded px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                          comparisonPair === 'input_vs_restored'
                            ? 'bg-[#0EA5E9] font-semibold text-[#04101D]'
                            : 'text-[#9DB4CC] hover:text-white'
                        }`}
                      >
                        Input vs. Cloud-Free
                      </button>
                      <button
                        type="button"
                        onClick={() => setComparisonPair('input_vs_original')}
                        className={`rounded px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                          comparisonPair === 'input_vs_original'
                            ? 'bg-[#0EA5E9] font-semibold text-[#04101D]'
                            : 'text-[#9DB4CC] hover:text-white'
                        }`}
                      >
                        Input vs. Original
                      </button>
                      <button
                        type="button"
                        onClick={() => setComparisonPair('restored_vs_original')}
                        className={`rounded px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                          comparisonPair === 'restored_vs_original'
                            ? 'bg-[#0EA5E9] font-semibold text-[#04101D]'
                            : 'text-[#9DB4CC] hover:text-white'
                        }`}
                      >
                        Cloud-Free vs. Original
                      </button>
                    </div>

                    <div className="flex items-center gap-1 rounded-lg border border-[#1C3553] bg-[#081322] p-1">
                      <button
                        type="button"
                        onClick={() => setComparisonLayout('side-by-side')}
                        className={`rounded px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                          comparisonLayout === 'side-by-side'
                            ? 'bg-[#152C47] text-white'
                            : 'text-[#88A2BE] hover:text-white'
                        }`}
                      >
                        Side by Side
                      </button>
                      <button
                        type="button"
                        onClick={() => setComparisonLayout('curtain')}
                        className={`flex items-center gap-1.5 rounded px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                          comparisonLayout === 'curtain'
                            ? 'bg-[#152C47] text-white'
                            : 'text-[#88A2BE] hover:text-white'
                        }`}
                      >
                        <Columns2 className="h-3.5 w-3.5" />
                        Split Slider
                      </button>
                    </div>

                    <input
                      ref={gtFileRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          onUploadGroundTruthForResult(file);
                          setComparisonPair('input_vs_original');
                        }
                        e.target.value = '';
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => gtFileRef.current?.click()}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[#244366] bg-[#081322] px-3 py-2 text-xs font-medium text-[#DCE8F5] transition-colors hover:border-[#38BDF8] hover:text-white whitespace-nowrap shrink-0"
                    >
                      <ImagePlus className="h-3.5 w-3.5 text-[#38BDF8]" />
                      {activeResult.groundTruthSource === 'user_uploaded'
                        ? 'Change Original Image'
                        : 'Upload Original Image'}
                    </button>
                  </div>
                </div>

                {comparisonLayout === 'side-by-side' ? (
                  <div className="relative mt-6 grid grid-cols-1 items-center gap-6 md:grid-cols-2">
                    <div>
                      <div className="mb-2.5 flex items-baseline justify-between gap-2">
                        <h3 className="text-xs font-semibold text-white">
                          {comp.leftTitle}
                        </h3>
                        <span className="truncate text-xs text-[#88A2BE]">
                          {comp.leftSub}
                        </span>
                      </div>
                      <div className="flex w-full items-center justify-center overflow-hidden rounded-lg border border-[#1E3856] bg-[#060E1A]">
                        <img
                          src={comp.leftUrl}
                          alt={comp.leftTitle}
                          referrerPolicy="no-referrer"
                          className="block h-auto max-h-[440px] w-full object-contain"
                        />
                      </div>
                    </div>

                    <div className="pointer-events-none hidden md:flex md:absolute md:left-1/2 md:top-[54%] md:-translate-x-1/2 md:-translate-y-1/2 md:z-10">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full border border-[#7DD3FC]/50 bg-[#0EA5E9] text-[#04101D]">
                        <ArrowRight className="h-4 w-4" />
                      </div>
                    </div>

                    <div>
                      <div className="mb-2.5 flex items-baseline justify-between gap-2">
                        <h3 className="text-xs font-semibold text-white">
                          {comp.rightTitle}
                        </h3>
                        <span className="truncate text-xs text-[#88A2BE]">
                          {comp.rightSub}
                        </span>
                      </div>
                      <div className="flex w-full items-center justify-center overflow-hidden rounded-lg border border-[#1E3856] bg-[#060E1A]">
                        <img
                          src={comp.rightUrl}
                          alt={comp.rightTitle}
                          referrerPolicy="no-referrer"
                          className="block h-auto max-h-[440px] w-full object-contain"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-6">
                    <div className="mx-auto max-w-[540px]">
                      <div className="mb-2 flex justify-between gap-4 text-xs text-[#88A2BE]">
                        <span className="truncate font-medium text-[#DCE8F5]">
                          Left: {comp.leftTitle}
                        </span>
                        <span className="truncate font-medium text-[#DCE8F5]">
                          Right: {comp.rightTitle}
                        </span>
                      </div>
                      <div
                        ref={curtainRef}
                        onMouseDown={(e) => handleCurtainPointer(e.clientX)}
                        onMouseMove={(e) => {
                          if (e.buttons === 1) handleCurtainPointer(e.clientX);
                        }}
                        onTouchMove={(e) => {
                          if (e.touches[0]) {
                            handleCurtainPointer(e.touches[0].clientX);
                          }
                        }}
                        className="relative w-full cursor-ew-resize select-none overflow-hidden rounded-lg border border-[#1E3856] bg-[#060E1A]"
                      >
                        <img
                          src={comp.rightUrl}
                          alt={comp.rightTitle}
                          referrerPolicy="no-referrer"
                          className="block h-auto max-h-[460px] w-full object-contain"
                        />
                        <div
                          className="absolute inset-0 overflow-hidden"
                          style={{ clipPath: `inset(0 ${100 - curtainPct}% 0 0)` }}
                        >
                          <img
                            src={comp.leftUrl}
                            alt={comp.leftTitle}
                            referrerPolicy="no-referrer"
                            className="block h-full w-full object-contain"
                          />
                        </div>
                        <div
                          className="pointer-events-none absolute inset-y-0 w-0.5 bg-[#38BDF8]"
                          style={{ left: `${curtainPct}%` }}
                        >
                          <div className="absolute left-1/2 top-1/2 flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-[#0EA5E9] text-[11px] font-bold text-[#04101D]">
                            ↔
                          </div>
                        </div>
                      </div>
                      <p className="mt-2 text-center text-[11px] text-[#7893AF]">
                        Drag across the image to compare ({curtainPct}% split).
                      </p>
                    </div>
                  </div>
                )}
              </section>

              {/* SECTION 3: Simple Cloud Coverage & Quality Analytics (No Server Log!) */}
              <section className="rounded-xl border border-[#1A314D] bg-[#0B1829] p-6">
                <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-[#152840] pb-4">
                  <h2 className="text-base font-semibold text-white">
                    Cloud Coverage &amp; Image Quality
                  </h2>
                  <span className="font-mono text-xs text-emerald-400 tabular-nums">
                    {activeResult.analytics.clearSurfaceAfterPct}% clear image
                  </span>
                </div>

                <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-12">
                  {/* Left: 4 Key Numbers */}
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:col-span-7">
                    <div className="rounded-lg border border-[#172C46] bg-[#081322] p-4">
                      <span className="block text-xs text-[#88A2BE]">Initial Cloud</span>
                      <span className="mt-1 block font-mono text-xl font-bold text-amber-400 tabular-nums">
                        {activeResult.metrics.totalObstructionPct}%
                      </span>
                    </div>
                    <div className="rounded-lg border border-[#172C46] bg-[#081322] p-4">
                      <span className="block text-xs text-[#88A2BE]">Remaining</span>
                      <span className="mt-1 block font-mono text-xl font-bold text-emerald-400 tabular-nums">
                        {activeResult.metrics.residualObstructionPct}%
                      </span>
                    </div>
                    <div className="rounded-lg border border-[#172C46] bg-[#081322] p-4">
                      <span className="block text-xs text-[#88A2BE]">PSNR</span>
                      <span className="mt-1 block font-mono text-xl font-bold text-white tabular-nums">
                        {activeResult.metrics.psnrDb !== null
                          ? `${activeResult.metrics.psnrDb.toFixed(1)} dB`
                          : '--'}
                      </span>
                    </div>
                    <div className="rounded-lg border border-[#172C46] bg-[#081322] p-4">
                      <span className="block text-xs text-[#88A2BE]">SSIM</span>
                      <span className="mt-1 block font-mono text-xl font-bold text-white tabular-nums">
                        {activeResult.metrics.ssim !== null
                          ? activeResult.metrics.ssim.toFixed(3)
                          : '--'}
                      </span>
                    </div>
                  </div>

                  {/* Right: Simple Land Breakdown */}
                  <div className="space-y-3 lg:col-span-5">
                    <span className="block text-xs font-medium text-[#DCE8F5]">
                      Visible Surface Breakdown
                    </span>

                    <div className="space-y-2.5 text-xs">
                      <div>
                        <div className="flex justify-between text-[#9DB4CC]">
                          <span>Greenery &amp; Crops</span>
                          <span className="font-mono text-white tabular-nums">
                            {activeResult.analytics.vegetationPct}%
                          </span>
                        </div>
                        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-[#081322]">
                          <div
                            className="h-full rounded-full bg-emerald-500"
                            style={{ width: `${activeResult.analytics.vegetationPct}%` }}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-[#9DB4CC]">
                          <span>Rivers &amp; Water</span>
                          <span className="font-mono text-white tabular-nums">
                            {activeResult.analytics.waterPct}%
                          </span>
                        </div>
                        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-[#081322]">
                          <div
                            className="h-full rounded-full bg-[#0EA5E9]"
                            style={{ width: `${activeResult.analytics.waterPct}%` }}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-[#9DB4CC]">
                          <span>Land &amp; Soil</span>
                          <span className="font-mono text-white tabular-nums">
                            {activeResult.analytics.soilUrbanPct}%
                          </span>
                        </div>
                        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-[#081322]">
                          <div
                            className="h-full rounded-full bg-amber-400"
                            style={{ width: `${activeResult.analytics.soilUrbanPct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* SECTION 4: Simple Recommendations */}
              <section className="rounded-xl border border-[#1A314D] bg-[#0B1829] p-6">
                <div className="border-b border-[#152840] pb-4">
                  <h2 className="text-base font-semibold text-white">
                    Recommended Images &amp; Related Data
                  </h2>
                  <p className="mt-1 text-xs text-[#88A2BE]">
                    Similar satellite scenes and helpful map layers based on surface features and cloud cover.
                  </p>
                </div>

                {/* Similar Satellite Scenes */}
                <div className="mt-5">
                  <div className="flex items-center gap-2 text-xs font-semibold text-[#DCE8F5]">
                    <Database className="h-3.5 w-3.5 text-[#38BDF8]" />
                    <span>Similar Satellite Scenes</span>
                  </div>

                  <div className="mt-3.5 grid grid-cols-1 gap-4 md:grid-cols-3">
                    {activeResult.recommendations.similarImages.map((rec) => (
                      <div
                        key={rec.id}
                        className="flex flex-col justify-between rounded-lg border border-[#1C3553] bg-[#081322] p-3.5"
                      >
                        <div>
                          <div className="flex gap-3">
                            {rec.previewUrl && (
                              <img
                                src={rec.previewUrl}
                                alt={rec.title}
                                referrerPolicy="no-referrer"
                                className="h-20 w-20 shrink-0 rounded-md border border-[#1E3856] object-cover"
                              />
                            )}
                            <div className="min-w-0">
                              <div className="font-mono text-[11px] text-[#38BDF8] tabular-nums">
                                {rec.sampleCode} · {rec.similarityPct}% match
                              </div>
                              <h3 className="mt-0.5 truncate text-xs font-semibold text-white">
                                {rec.title}
                              </h3>
                              <p className="mt-1 font-mono text-[11px] text-[#9DB4CC] tabular-nums">
                                {rec.cloudCoveragePct}% cloud · {rec.fogCoveragePct}% haze
                              </p>
                            </div>
                          </div>

                          <p className="mt-2.5 text-xs text-[#9DB4CC]">
                            {rec.matchReason}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => onLoadRecommendedPreset(rec.presetId)}
                          className="mt-3.5 w-full rounded-md border border-[#24466B] bg-[#0C1D33] px-3 py-2 text-xs font-semibold text-[#DCE8F5] transition-colors hover:border-[#38BDF8] hover:bg-[#0EA5E9] hover:text-[#04101D] whitespace-nowrap shrink-0"
                        >
                          Try This Image
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Related Map Layers */}
                <div className="mt-6 border-t border-[#152840] pt-5">
                  <div className="flex items-center gap-2 text-xs font-semibold text-[#DCE8F5]">
                    <Layers className="h-3.5 w-3.5 text-[#38BDF8]" />
                    <span>Related Map Layers</span>
                  </div>

                  <div className="mt-3.5 grid grid-cols-1 gap-4 md:grid-cols-3">
                    {activeResult.recommendations.relevantData.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-lg border border-[#1C3553] bg-[#081322] p-4"
                      >
                        <div className="flex items-baseline justify-between gap-2 text-[11px] text-[#88A2BE]">
                          <span className="truncate">{item.category}</span>
                          <span className="font-mono font-semibold text-emerald-400 tabular-nums shrink-0">
                            {item.relevanceScorePct}% match
                          </span>
                        </div>
                        <h3 className="mt-1 text-xs font-semibold text-white">
                          {item.title}
                        </h3>
                        <p className="mt-1.5 text-xs leading-relaxed text-[#9DB4CC]">
                          {item.rationale}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            </div>
          )}
        </>
      )}

      {/* ================= HISTORY TABLE ================= */}
      {subTab === 'history' && (
        <section className="rounded-xl border border-[#1A314D] bg-[#0B1829] p-6">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-5">
            <div className="relative w-full max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6E89A6]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by image name or date..."
                className="w-full rounded-lg border border-[#1E3856] bg-[#081322] py-2 pl-9 pr-3 text-xs text-white placeholder-[#607B98] focus:border-[#0EA5E9] focus:outline-none"
              />
            </div>

            <span className="font-mono text-xs text-[#88A2BE] tabular-nums">
              {filteredHistory.length} of {history.length} runs
            </span>
          </div>

          {filteredHistory.length === 0 ? (
            <div className="rounded-lg border border-[#162A43] bg-[#081322] py-12 text-center">
              <p className="text-sm font-medium text-white">
                No matching runs found.
              </p>
              <button
                type="button"
                onClick={() => {
                  if (searchQuery) setSearchQuery('');
                  else onNavigateDashboard();
                }}
                className="mt-4 rounded-lg bg-[#0EA5E9] px-4 py-2 text-xs font-semibold text-[#04101D] hover:bg-[#38BDF8] whitespace-nowrap shrink-0"
              >
                {searchQuery ? 'Clear Search' : 'Go to Dashboard'}
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-[#182E49] text-[#88A2BE]">
                    <th className="py-3 pr-4 font-medium">Image</th>
                    <th className="px-4 py-3 font-medium">Source</th>
                    <th className="px-4 py-3 font-medium">Date</th>
                    <th className="px-4 py-3 text-right font-medium">Cloud</th>
                    <th className="px-4 py-3 text-right font-medium">PSNR</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="py-3 pl-4 text-right font-medium">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#14273E]">
                  {filteredHistory.map((item) => {
                    const isLoadingRow = loadingHistoryId === item.id;
                    return (
                      <tr
                        key={item.id}
                        className="transition-colors hover:bg-[#0F2138]"
                      >
                        <td className="py-3.5 pr-4 font-medium text-white whitespace-nowrap">
                          {item.imageName}
                        </td>
                        <td className="px-4 py-3.5 font-mono text-[#9DB4CC] whitespace-nowrap">
                          {item.datasetSource === 'CUSTOM' ||
                          (!item.datasetSource && !item.presetId)
                            ? 'Uploaded'
                            : 'Sample Scene'}
                        </td>
                        <td className="px-4 py-3.5 font-mono text-[#A8BFD6] tabular-nums whitespace-nowrap">
                          {item.dateLabel}
                        </td>
                        <td className="px-4 py-3.5 text-right font-mono text-[#A8BFD6] tabular-nums whitespace-nowrap">
                          {item.metrics.totalObstructionPct}% → {item.metrics.residualObstructionPct}%
                        </td>
                        <td className="px-4 py-3.5 text-right font-mono text-white tabular-nums whitespace-nowrap">
                          {item.metrics.psnrDb !== null
                            ? `${item.metrics.psnrDb.toFixed(1)} dB`
                            : '--'}
                        </td>
                        <td className="px-4 py-3.5 font-medium text-emerald-400 whitespace-nowrap">
                          ✓ {item.status}
                        </td>
                        <td className="py-3.5 pl-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-3">
                            <button
                              type="button"
                              disabled={isLoadingRow}
                              onClick={() => onSelectHistoryRecord(item)}
                              className="font-semibold text-[#38BDF8] transition-colors hover:text-[#7DD3FC] disabled:opacity-50 whitespace-nowrap shrink-0"
                            >
                              {isLoadingRow ? 'Opening...' : 'Open'}
                            </button>
                            <button
                              type="button"
                              onClick={() => onDeleteHistoryRecord(item.id)}
                              aria-label={`Delete ${item.imageName}`}
                              className="rounded p-1 text-[#6884A3] transition-colors hover:bg-rose-950/50 hover:text-rose-300"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
