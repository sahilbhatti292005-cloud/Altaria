import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  Check,
  Cloud,
  Columns2,
  Download,
  Loader2,
  SlidersHorizontal,
} from 'lucide-react';
import type {
  ActiveRestorationResult,
  AugmentationMode,
  ProcessingOptions,
  RestorationSubTab,
  StagedSatelliteImage,
} from '../types/altaria';
import {
  MAX_IMAGE_DIM,
  analyzeAtmosphericObstruction,
  buildPreprocessedData,
  dataUrlToRgba,
  renderAttentionHeatmapDataUrl,
  renderAttentionHighlightDataUrl,
  triggerDataUrlDownload,
} from '../utils/restorationEngine';

interface CircularGaugeProps {
  label: string;
  valuePct: number;
  strokeColor: string;
}

function CircularGauge({ label, valuePct, strokeColor }: CircularGaugeProps) {
  const clamped = Math.max(0, Math.min(100, Math.round(valuePct)));
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (clamped / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <span className="text-xs font-medium text-[#9BB3CC] whitespace-nowrap">
        {label}
      </span>
      <div className="relative mt-2 h-22 w-22">
        <svg className="h-full w-full -rotate-90" viewBox="0 0 92 92">
          <circle
            cx="46"
            cy="46"
            r={radius}
            fill="none"
            stroke="#162942"
            strokeWidth="7"
          />
          <circle
            cx="46"
            cy="46"
            r={radius}
            fill="none"
            stroke={strokeColor}
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-mono text-base font-semibold text-white tabular-nums">
            {clamped}%
          </span>
        </div>
      </div>
    </div>
  );
}

interface ImageRestorationViewProps {
  subTab: RestorationSubTab;
  onChangeSubTab: (tab: RestorationSubTab) => void;
  stagedImages: StagedSatelliteImage[];
  options: ProcessingOptions;
  onChangeOptions: (opts: ProcessingOptions) => void;
  isProcessing: boolean;
  progressPct: number;
  activeStepIndex: number;
  onStartRestoration: () => void;
  activeResult: ActiveRestorationResult | null;
  onNavigateDashboard: () => void;
  onNavigateResults: () => void;
}

export function ImageRestorationView({
  subTab,
  onChangeSubTab,
  stagedImages,
  options,
  onChangeOptions,
  isProcessing,
  progressPct,
  activeStepIndex,
  onStartRestoration,
  activeResult,
  onNavigateDashboard,
  onNavigateResults,
}: ImageRestorationViewProps) {
  const [previewStage, setPreviewStage] = useState<
    'preprocessed' | 'attention_highlight' | 'attention_heatmap'
  >('preprocessed');
  const [attentionInspectorMode, setAttentionInspectorMode] = useState<
    'highlight' | 'heatmap'
  >('highlight');
  const [comparisonMode, setComparisonMode] = useState<
    'side-by-side' | 'curtain'
  >('side-by-side');
  const [comparisonPair, setComparisonPair] = useState<
    'input_vs_restored' | 'input_vs_original' | 'restored_vs_original'
  >('input_vs_restored');
  const [curtainPct, setCurtainPct] = useState(50);
  const curtainRef = useRef<HTMLDivElement | null>(null);

  const [livePreprocessedUrl, setLivePreprocessedUrl] = useState<string>('');
  const [liveHeatmapUrl, setLiveHeatmapUrl] = useState<string>('');
  const [liveHighlightUrl, setLiveHighlightUrl] = useState<string>('');
  const [previewDims, setPreviewDims] = useState<{ width: number; height: number }>({
    width: 640,
    height: 640,
  });

  const primaryStaged = stagedImages[0];
  const cloudCov =
    primaryStaged?.cloudPct ?? activeResult?.metrics.cloudCoveragePct ?? 38;
  const fogCov =
    primaryStaged?.fogPct ?? activeResult?.metrics.fogCoveragePct ?? 24;
  const totalObs =
    primaryStaged?.totalObstructionPct ??
    activeResult?.metrics.totalObstructionPct ??
    56;

  useEffect(() => {
    if (!primaryStaged) {
      setLivePreprocessedUrl('');
      setLiveHeatmapUrl('');
      setLiveHighlightUrl('');
      return;
    }

    let cancelled = false;
    dataUrlToRgba(primaryStaged.dataUrl, MAX_IMAGE_DIM)
      .then((decoded) => {
        if (cancelled) return;
        const w = decoded.width;
        const h = decoded.height;
        const prep = buildPreprocessedData(
          decoded.rgba,
          w,
          h,
          options,
          primaryStaged.name
        );
        const obs = analyzeAtmosphericObstruction(decoded.rgba, w, h);
        const heat = renderAttentionHeatmapDataUrl(obs.attentionMap, w, h);
        const highlight = renderAttentionHighlightDataUrl(
          decoded.rgba,
          obs.attentionMap,
          obs.cloudCoreMap,
          w,
          h
        );
        if (!cancelled) {
          setPreviewDims({ width: w, height: h });
          setLivePreprocessedUrl(prep.preprocessedUrl);
          setLiveHeatmapUrl(heat);
          setLiveHighlightUrl(highlight);
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [
    primaryStaged,
    options.normalization,
    options.augmentation,
    options.radiometricBalance,
  ]);

  const handleCurtainPointer = (clientX: number) => {
    const el = curtainRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const rel = ((clientX - rect.left) / Math.max(1, rect.width)) * 100;
    setCurtainPct(Math.max(4, Math.min(96, Math.round(rel))));
  };

  const processingSteps = [
    'Checking input image',
    'Preparing and resizing image',
    'Finding cloud and haze areas',
    'Generating clear cloud-free image',
  ];

  const activeHeatmapSrc = liveHeatmapUrl || activeResult?.heatmapUrl || '';
  const activeHighlightSrc =
    liveHighlightUrl || activeResult?.attentionHighlightUrl || '';
  const activePreprocessedSrc =
    livePreprocessedUrl ||
    activeResult?.preprocessedInputUrl ||
    primaryStaged?.dataUrl ||
    '';

  return (
    <div className="space-y-6">
      {/* Top Sub-Navigation Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 rounded-lg border border-[#1A314D] bg-[#0A1626] p-1">
          <button
            type="button"
            onClick={() => onChangeSubTab('configure')}
            className={`rounded-md px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
              subTab === 'configure'
                ? 'bg-[#0EA5E9] text-[#04101D]'
                : 'text-[#9DB4CC] hover:bg-[#11233A] hover:text-white'
            }`}
          >
            Cloud Removal
          </button>
          <button
            type="button"
            onClick={() => onChangeSubTab('heatmap')}
            className={`rounded-md px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
              subTab === 'heatmap'
                ? 'bg-[#0EA5E9] text-[#04101D]'
                : 'text-[#9DB4CC] hover:bg-[#11233A] hover:text-white'
            }`}
          >
            Attention Map
          </button>
          <button
            type="button"
            onClick={() => onChangeSubTab('comparison')}
            className={`rounded-md px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
              subTab === 'comparison'
                ? 'bg-[#0EA5E9] text-[#04101D]'
                : 'text-[#9DB4CC] hover:bg-[#11233A] hover:text-white'
            }`}
          >
            Comparison
          </button>
        </div>

        {activeResult && (
          <button
            type="button"
            onClick={onNavigateResults}
            className="rounded-lg border border-[#223F60] bg-[#0B1829] px-3.5 py-2 text-xs font-medium text-[#DCE8F5] transition-colors hover:border-[#38BDF8] hover:text-white whitespace-nowrap shrink-0"
          >
            View Full Results
          </button>
        )}
      </div>

      {/* ================= TAB 1: CLOUD REMOVAL & PREVIEW ================= */}
      {subTab === 'configure' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* Left Column: Simple Settings */}
            <section className="flex flex-col justify-between rounded-xl border border-[#1A314D] bg-[#0B1829] p-6 lg:col-span-6">
              <div>
                <h2 className="text-lg font-semibold text-white">
                  Cloud Removal Settings
                </h2>
                <p className="mt-1 text-xs text-[#88A2BE]">
                  Adjust image preparation and run cloud removal for{' '}
                  <span className="font-medium text-[#DCE8F5]">
                    {primaryStaged ? primaryStaged.name : 'your selected image'}
                  </span>
                  .
                </p>

                <div className="mt-5 space-y-4">
                  {/* Model Mode */}
                  <div className="flex items-center justify-between gap-4 border-b border-[#152840] pb-3.5">
                    <div>
                      <label
                        htmlFor="arch-select"
                        className="text-sm font-medium text-[#E6EEF8]"
                      >
                        Removal Mode
                      </label>
                      <p className="mt-0.5 text-xs text-[#7E99B6]">
                        Choose how clouds and haze are cleared
                      </p>
                    </div>
                    <select
                      id="arch-select"
                      value={options.architecture}
                      onChange={(e) =>
                        onChangeOptions({
                          ...options,
                          architecture: e.target
                            .value as ProcessingOptions['architecture'],
                        })
                      }
                      className="rounded-lg border border-[#1E3856] bg-[#081322] px-3 py-1.5 text-xs font-medium text-white focus:border-[#0EA5E9] focus:outline-none"
                    >
                      <option value="spa_gan_epoch200">
                        Standard Cloud Removal
                      </option>
                      <option value="temporal_resnet3d">
                        Multi-Image Blending
                      </option>
                      <option value="uncrtaints_attention">
                        High Detail Recovery
                      </option>
                      <option value="dcp_guided">Light Haze Removal</option>
                    </select>
                  </div>

                  {/* Image Scaling */}
                  <div className="flex items-center justify-between gap-4 border-b border-[#152840] pb-3.5">
                    <div>
                      <label
                        htmlFor="norm-select"
                        className="text-sm font-medium text-[#E6EEF8]"
                      >
                        Image Scaling
                      </label>
                      <p className="mt-0.5 text-xs text-[#7E99B6]">
                        Standardize brightness before cloud removal
                      </p>
                    </div>
                    <select
                      id="norm-select"
                      value={options.normalization}
                      onChange={(e) =>
                        onChangeOptions({
                          ...options,
                          normalization: e.target
                            .value as ProcessingOptions['normalization'],
                        })
                      }
                      className="rounded-lg border border-[#1E3856] bg-[#081322] px-3 py-1.5 text-xs font-medium text-white focus:border-[#0EA5E9] focus:outline-none"
                    >
                      <option value="neg1_pos1">Standard (-1 to 1)</option>
                      <option value="zero_one">0 to 1 Scale</option>
                    </select>
                  </div>

                  {/* Image Adjustment */}
                  <div className="flex items-center justify-between gap-4 border-b border-[#152840] pb-3.5">
                    <div>
                      <label
                        htmlFor="aug-select"
                        className="text-sm font-medium text-[#E6EEF8]"
                      >
                        Image Adjustment
                      </label>
                      <p className="mt-0.5 text-xs text-[#7E99B6]">
                        Optional flip or contrast boost
                      </p>
                    </div>
                    <select
                      id="aug-select"
                      value={options.augmentation}
                      onChange={(e) =>
                        onChangeOptions({
                          ...options,
                          augmentation: e.target.value as AugmentationMode,
                        })
                      }
                      className="rounded-lg border border-[#1E3856] bg-[#081322] px-3 py-1.5 text-xs font-medium text-white focus:border-[#0EA5E9] focus:outline-none"
                    >
                      <option value="none">None</option>
                      <option value="horizontal_flip">Flip Horizontal</option>
                      <option value="tta_enhance">Boost Contrast</option>
                    </select>
                  </div>

                  {/* Auto Color Balance */}
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <span className="text-sm font-medium text-[#E6EEF8]">
                        Auto Color Balance
                      </span>
                      <p className="mt-0.5 text-xs text-[#7E99B6]">
                        Keep natural ground colors crisp
                      </p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={options.radiometricBalance}
                      onClick={() =>
                        onChangeOptions({
                          ...options,
                          radiometricBalance: !options.radiometricBalance,
                        })
                      }
                      className={`relative h-6 w-11 rounded-full transition-colors shrink-0 ${
                        options.radiometricBalance
                          ? 'bg-[#0EA5E9]'
                          : 'bg-[#1D3552]'
                      }`}
                    >
                      <span
                        className={`block h-4 w-4 rounded-full bg-white transition-transform ${
                          options.radiometricBalance
                            ? 'translate-x-6'
                            : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                {stagedImages.length > 0 ? (
                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={onStartRestoration}
                    className="w-full rounded-lg bg-[#0EA5E9] px-5 py-3 text-sm font-semibold text-[#04101D] transition-colors hover:bg-[#38BDF8] disabled:opacity-60 whitespace-nowrap shrink-0"
                  >
                    {isProcessing ? 'Removing Clouds...' : 'Remove Clouds'}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onNavigateDashboard}
                    className="w-full rounded-lg border border-[#244366] bg-[#0D1E34] px-5 py-3 text-sm font-medium text-white hover:border-[#38BDF8] whitespace-nowrap shrink-0"
                  >
                    Select an Image on Dashboard
                  </button>
                )}
              </div>
            </section>

            {/* Right Column: Live Preprocessed & Attention Preview */}
            <section className="flex flex-col justify-between rounded-xl border border-[#1A314D] bg-[#0B1829] p-6 lg:col-span-6">
              <div>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Cloud className="h-4 w-4 text-[#38BDF8]" />
                    <h2 className="text-base font-semibold text-white">
                      Image &amp; Cloud Preview
                    </h2>
                  </div>

                  <div className="flex items-center gap-1 rounded-lg border border-[#1C3553] bg-[#081322] p-1">
                    <button
                      type="button"
                      onClick={() => setPreviewStage('preprocessed')}
                      className={`rounded px-2.5 py-1 text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 ${
                        previewStage === 'preprocessed'
                          ? 'bg-[#0EA5E9] font-semibold text-[#04101D]'
                          : 'text-[#9DB4CC] hover:text-white'
                      }`}
                    >
                      Preprocessed
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewStage('attention_highlight')}
                      className={`rounded px-2.5 py-1 text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 ${
                        previewStage === 'attention_highlight'
                          ? 'bg-[#0EA5E9] font-semibold text-[#04101D]'
                          : 'text-[#9DB4CC] hover:text-white'
                      }`}
                    >
                      Cloud Highlights
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewStage('attention_heatmap')}
                      className={`rounded px-2.5 py-1 text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 ${
                        previewStage === 'attention_heatmap'
                          ? 'bg-[#0EA5E9] font-semibold text-[#04101D]'
                          : 'text-[#9DB4CC] hover:text-white'
                      }`}
                    >
                      Heatmap
                    </button>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 items-center gap-5 sm:grid-cols-12">
                  <div className="sm:col-span-6">
                    <div className="flex aspect-square w-full items-center justify-center overflow-hidden rounded-lg border border-[#1E3856] bg-[#060E1A]">
                      {activePreprocessedSrc ? (
                        <img
                          src={
                            previewStage === 'preprocessed'
                              ? activePreprocessedSrc
                              : previewStage === 'attention_highlight'
                              ? activeHighlightSrc || activePreprocessedSrc
                              : activeHeatmapSrc || activePreprocessedSrc
                          }
                          alt="Image preview"
                          referrerPolicy="no-referrer"
                          className="h-full w-full object-contain"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center p-4 text-center text-xs text-[#6E89A6]">
                          No image selected
                        </div>
                      )}
                    </div>
                    <p className="mt-2 text-[11px] text-[#88A2BE]">
                      {previewStage === 'preprocessed'
                        ? `Prepared ${previewDims.width}×${previewDims.height} px image`
                        : previewStage === 'attention_highlight'
                        ? 'Detected clouds (orange/yellow) and haze (blue)'
                        : 'Cloud density map'}
                    </p>
                  </div>

                  {/* Simple Cloud Gauges */}
                  <div className="space-y-4 sm:col-span-6">
                    <div className="grid grid-cols-2 gap-3">
                      <CircularGauge
                        label="Clouds"
                        valuePct={cloudCov}
                        strokeColor="#0EA5E9"
                      />
                      <CircularGauge
                        label="Haze"
                        valuePct={fogCov}
                        strokeColor="#38BDF8"
                      />
                    </div>
                    <div className="rounded-lg border border-[#172C46] bg-[#081322] p-3 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[#88A2BE]">Total Covered</span>
                        <span className="font-mono font-semibold text-amber-400 tabular-nums">
                          {totalObs}%
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => onChangeSubTab('heatmap')}
                        className="mt-2 text-[11px] font-medium text-[#38BDF8] hover:text-[#7DD3FC] whitespace-nowrap"
                      >
                        View Larger Attention Map →
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>

          {/* Simple Progress Bar Card */}
          <section className="rounded-xl border border-[#1A314D] bg-[#0B1829] p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#1E3B5C] bg-[#081322] text-[#38BDF8]">
                {isProcessing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <SlidersHorizontal className="h-4 w-4" />
                )}
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">
                  {isProcessing
                    ? 'Removing Clouds...'
                    : activeResult
                    ? 'Cloud removal complete'
                    : 'Ready to remove clouds'}
                </h3>
                <p className="text-xs text-[#88A2BE]">
                  {stagedImages.length}{' '}
                  {stagedImages.length === 1 ? 'image' : 'images'} selected
                </p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {processingSteps.map((stepText, idx) => {
                const done =
                  (!isProcessing && activeResult !== null) ||
                  (isProcessing && activeStepIndex > idx);
                const current = isProcessing && activeStepIndex === idx;
                return (
                  <div
                    key={stepText}
                    className={`flex items-center gap-2 text-xs ${
                      done
                        ? 'text-[#DCE8F5]'
                        : current
                        ? 'font-medium text-[#38BDF8]'
                        : 'text-[#6A85A2]'
                    }`}
                  >
                    <Check
                      className={`h-3.5 w-3.5 shrink-0 ${
                        done || current ? 'text-[#38BDF8]' : 'text-[#35506E]'
                      }`}
                    />
                    <span>{stepText}</span>
                  </div>
                );
              })}
            </div>

            <div className="mt-5 flex items-center gap-4">
              <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-[#081322]">
                <div
                  className="h-full rounded-full bg-[#0EA5E9] transition-all duration-200"
                  style={{
                    width: `${
                      isProcessing ? progressPct : activeResult ? 100 : 0
                    }%`,
                  }}
                />
              </div>
              <span className="w-11 text-right font-mono text-xs font-semibold text-[#DCE8F5] tabular-nums">
                {isProcessing ? progressPct : activeResult ? 100 : 0}%
              </span>
            </div>
          </section>
        </div>
      )}

      {/* ================= TAB 2: ATTENTION MAP ================= */}
      {subTab === 'heatmap' && (
        <section className="rounded-xl border border-[#1A314D] bg-[#0B1829] p-6">
          {!activeHeatmapSrc ? (
            <div className="py-10 text-center">
              <p className="text-sm font-medium text-white">
                Select an image first to view its Attention Map.
              </p>
              <button
                type="button"
                onClick={onNavigateDashboard}
                className="mt-4 rounded-lg bg-[#0EA5E9] px-4 py-2 text-xs font-semibold text-[#04101D] hover:bg-[#38BDF8] whitespace-nowrap shrink-0"
              >
                Go to Dashboard
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
              <div className="lg:col-span-5">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-[#DCE8F5]">
                    {attentionInspectorMode === 'highlight'
                      ? 'Cloud Highlights'
                      : 'Attention Heatmap'}
                  </span>
                  <div className="flex items-center gap-1 rounded-lg border border-[#1C3553] bg-[#081322] p-1">
                    <button
                      type="button"
                      onClick={() => setAttentionInspectorMode('highlight')}
                      className={`rounded px-2.5 py-1 text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 ${
                        attentionInspectorMode === 'highlight'
                          ? 'bg-[#0EA5E9] font-semibold text-[#04101D]'
                          : 'text-[#88A2BE] hover:text-white'
                      }`}
                    >
                      Cloud Highlights
                    </button>
                    <button
                      type="button"
                      onClick={() => setAttentionInspectorMode('heatmap')}
                      className={`rounded px-2.5 py-1 text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 ${
                        attentionInspectorMode === 'heatmap'
                          ? 'bg-[#0EA5E9] font-semibold text-[#04101D]'
                          : 'text-[#88A2BE] hover:text-white'
                      }`}
                    >
                      Heatmap
                    </button>
                  </div>
                </div>

                <div className="flex aspect-square w-full items-center justify-center overflow-hidden rounded-lg border border-[#1E3856] bg-[#060E1A]">
                  <img
                    src={
                      attentionInspectorMode === 'highlight'
                        ? activeHighlightSrc
                        : activeHeatmapSrc
                    }
                    alt="Cloud attention map"
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-contain"
                  />
                </div>

                <div className="mt-3">
                  <div
                    className="h-2.5 w-full rounded"
                    style={{
                      background:
                        'linear-gradient(90deg, #0e2476 0%, #1ac2f4 25%, #52ee60 50%, #faca18 75%, #e82e10 100%)',
                    }}
                  />
                  <div className="mt-1.5 flex justify-between text-[11px] text-[#88A2BE]">
                    <span>Clear Ground</span>
                    <span>Light Haze</span>
                    <span>Dense Cloud</span>
                  </div>
                </div>
              </div>

              <div className="space-y-5 lg:col-span-7">
                <div>
                  <h2 className="text-lg font-semibold text-white">
                    Cloud &amp; Haze Detection Map
                  </h2>
                  <p className="mt-1 text-xs leading-relaxed text-[#9DB4CC]">
                    Highlights cloudy and hazy areas so only covered regions are cleaned while clear ground stays sharp.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  <div className="rounded-lg border border-[#182E49] bg-[#081322] p-4">
                    <span className="text-xs text-[#88A2BE]">Clouds</span>
                    <p className="mt-1 font-mono text-xl font-semibold text-white tabular-nums">
                      {cloudCov}%
                    </p>
                  </div>
                  <div className="rounded-lg border border-[#182E49] bg-[#081322] p-4">
                    <span className="text-xs text-[#88A2BE]">Haze</span>
                    <p className="mt-1 font-mono text-xl font-semibold text-white tabular-nums">
                      {fogCov}%
                    </p>
                  </div>
                  <div className="rounded-lg border border-[#182E49] bg-[#081322] p-4">
                    <span className="text-xs text-[#88A2BE]">Remaining</span>
                    <p className="mt-1 font-mono text-xl font-semibold text-emerald-400 tabular-nums">
                      {activeResult
                        ? `${activeResult.metrics.residualObstructionPct}%`
                        : '--'}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3 pt-2">
                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={onStartRestoration}
                    className="rounded-lg bg-[#0EA5E9] px-4 py-2.5 text-xs font-semibold text-[#04101D] transition-colors hover:bg-[#38BDF8] whitespace-nowrap shrink-0"
                  >
                    {isProcessing ? 'Removing Clouds...' : 'Remove Clouds'}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      triggerDataUrlDownload(
                        attentionInspectorMode === 'highlight'
                          ? activeHighlightSrc
                          : activeHeatmapSrc,
                        `altaria_attention_${
                          (primaryStaged?.name || 'satellite').replace(/\.[^.]+$/, '')
                        }.png`
                      )
                    }
                    className="flex items-center gap-2 rounded-lg border border-[#223F60] bg-[#081322] px-4 py-2.5 text-xs font-medium text-[#DCE8F5] hover:border-[#38BDF8] whitespace-nowrap shrink-0"
                  >
                    <Download className="h-4 w-4 text-[#38BDF8]" />
                    Download Attention Map
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {/* ================= TAB 3: INPUT & ORIGINAL COMPARISON ================= */}
      {subTab === 'comparison' && (
        <div className="space-y-6">
          {!activeResult ? (
            <div className="rounded-xl border border-[#1A314D] bg-[#0B1829] p-10 text-center">
              <p className="text-sm font-medium text-white">
                No cloud-free image generated yet.
              </p>
              <p className="mt-1 text-xs text-[#88A2BE]">
                Run cloud removal first to compare images.
              </p>
              <button
                type="button"
                onClick={() => onChangeSubTab('configure')}
                className="mt-5 rounded-lg bg-[#0EA5E9] px-4 py-2 text-xs font-semibold text-[#04101D] hover:bg-[#38BDF8] whitespace-nowrap shrink-0"
              >
                Go to Cloud Removal
              </button>
            </div>
          ) : (
            <section className="rounded-xl border border-[#1A314D] bg-[#0B1829] p-6">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#152840] pb-4">
                <div>
                  <h2 className="text-base font-semibold text-white">
                    Input &amp; Original Image Comparison
                  </h2>
                  <p className="mt-0.5 text-xs text-[#88A2BE]">
                    {activeResult.imageName}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1 rounded-lg border border-[#1C3553] bg-[#081322] p-1">
                    <button
                      type="button"
                      onClick={() => setComparisonPair('input_vs_restored')}
                      className={`rounded px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                        comparisonPair === 'input_vs_restored'
                          ? 'bg-[#0EA5E9] font-semibold text-[#04101D]'
                          : 'text-[#88A2BE] hover:text-white'
                      }`}
                    >
                      Input vs. Cloud-Free
                    </button>
                    <button
                      type="button"
                      onClick={() => setComparisonPair('input_vs_original')}
                      className={`rounded px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                        comparisonPair === 'input_vs_original'
                          ? 'bg-[#0EA5E9] font-semibold text-[#04101D]'
                          : 'text-[#88A2BE] hover:text-white'
                      }`}
                    >
                      Input vs. Original
                    </button>
                    <button
                      type="button"
                      onClick={() => setComparisonPair('restored_vs_original')}
                      className={`rounded px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                        comparisonPair === 'restored_vs_original'
                          ? 'bg-[#0EA5E9] font-semibold text-[#04101D]'
                          : 'text-[#88A2BE] hover:text-white'
                      }`}
                    >
                      Cloud-Free vs. Original
                    </button>
                  </div>

                  <div className="flex items-center gap-1 rounded-lg border border-[#1C3553] bg-[#081322] p-1">
                    <button
                      type="button"
                      onClick={() => setComparisonMode('side-by-side')}
                      className={`rounded px-3 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                        comparisonMode === 'side-by-side'
                          ? 'bg-[#152C47] text-white'
                          : 'text-[#88A2BE] hover:text-white'
                      }`}
                    >
                      Side by Side
                    </button>
                    <button
                      type="button"
                      onClick={() => setComparisonMode('curtain')}
                      className={`flex items-center gap-1.5 rounded px-3 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                        comparisonMode === 'curtain'
                          ? 'bg-[#152C47] text-white'
                          : 'text-[#88A2BE] hover:text-white'
                      }`}
                    >
                      <Columns2 className="h-3.5 w-3.5" />
                      Split Slider
                    </button>
                  </div>
                </div>
              </div>

              {(() => {
                const leftLabel =
                  comparisonPair === 'restored_vs_original'
                    ? 'Cloud-Free Image'
                    : 'Input Image';
                const rightLabel =
                  comparisonPair === 'input_vs_restored'
                    ? 'Cloud-Free Image'
                    : 'Original Image';
                const leftSrc =
                  comparisonPair === 'restored_vs_original'
                    ? activeResult.restoredOutputUrl
                    : activeResult.cloudyInputUrl;
                const rightSrc =
                  comparisonPair === 'input_vs_restored'
                    ? activeResult.restoredOutputUrl
                    : activeResult.groundTruthUrl;

                return comparisonMode === 'side-by-side' ? (
                  <div className="relative mt-6 grid grid-cols-1 items-center gap-6 md:grid-cols-2">
                    <div>
                      <div className="mb-2.5 flex items-baseline justify-between gap-2">
                        <p className="text-xs font-semibold text-white">
                          {leftLabel}
                        </p>
                      </div>
                      <div className="flex w-full items-center justify-center overflow-hidden rounded-lg border border-[#1E3856] bg-[#060E1A]">
                        <img
                          src={leftSrc}
                          alt={leftLabel}
                          referrerPolicy="no-referrer"
                          className="block h-auto max-h-[420px] w-full object-contain"
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
                        <p className="text-xs font-semibold text-white">
                          {rightLabel}
                        </p>
                      </div>
                      <div className="flex w-full items-center justify-center overflow-hidden rounded-lg border border-[#1E3856] bg-[#060E1A]">
                        <img
                          src={rightSrc}
                          alt={rightLabel}
                          referrerPolicy="no-referrer"
                          className="block h-auto max-h-[420px] w-full object-contain"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-6">
                    <div className="mx-auto max-w-[520px]">
                      <div className="mb-2 flex justify-between text-xs text-[#88A2BE]">
                        <span>Left: {leftLabel}</span>
                        <span>Right: {rightLabel}</span>
                      </div>
                      <div
                        ref={curtainRef}
                        onMouseDown={(e) => handleCurtainPointer(e.clientX)}
                        onMouseMove={(e) => {
                          if (e.buttons === 1) handleCurtainPointer(e.clientX);
                        }}
                        onTouchMove={(e) => {
                          if (e.touches[0])
                            handleCurtainPointer(e.touches[0].clientX);
                        }}
                        className="relative w-full cursor-ew-resize select-none overflow-hidden rounded-lg border border-[#1E3856] bg-[#060E1A]"
                      >
                        <img
                          src={rightSrc}
                          alt={rightLabel}
                          referrerPolicy="no-referrer"
                          className="block h-auto max-h-[460px] w-full object-contain"
                        />
                        <div
                          className="absolute inset-0 overflow-hidden"
                          style={{ clipPath: `inset(0 ${100 - curtainPct}% 0 0)` }}
                        >
                          <img
                            src={leftSrc}
                            alt={leftLabel}
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
                    </div>
                  </div>
                );
              })()}
            </section>
          )}
        </div>
      )}
    </div>
  );
}
