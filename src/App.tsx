import React, { useEffect, useRef, useState } from 'react';
import {
  ChevronDown,
  Cpu,
  FileCheck2,
  History,
  LayoutGrid,
  LogOut,
  SlidersHorizontal,
  User,
} from 'lucide-react';
import { AuthViews } from './components/AuthViews';
import { SatelliteLogoIcon } from './components/BrandMark';
import { DashboardView } from './components/DashboardView';
import { ImageRestorationView } from './components/ImageRestorationView';
import { PipelineView } from './components/PipelineView';
import { ProfileView } from './components/ProfileView';
import { ResultsView } from './components/ResultsView';
import type {
  ActiveRestorationResult,
  ActiveWorkspaceView,
  HistoryRecord,
  ProcessingOptions,
  RestorationSubTab,
  ResultsSubTab,
  ScenePresetId,
  StagedSatelliteImage,
  UserProfile,
} from './types/altaria';
import {
  MAX_IMAGE_DIM,
  buildPresetStagedImages,
  computeReferenceMetrics,
  createCompactThumbUrl,
  dataUrlToRgba,
  executeSatelliteRestoration,
  hydrateHistoryRecordResult,
  rgbaToDataUrl,
} from './utils/restorationEngine';

const SESSION_STORAGE_KEY = 'altaria_active_user_v1';

const VIEW_LABELS: Record<ActiveWorkspaceView, string> = {
  dashboard: 'Dashboard',
  restoration: 'Cloud Removal',
  results: 'Results',
  profile: 'My Profile',
  pipeline: 'Overview',
};

export default function App() {
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem(SESSION_STORAGE_KEY);
      return saved ? (JSON.parse(saved) as UserProfile) : null;
    } catch {
      return null;
    }
  });

  const [activeView, setActiveView] = useState<ActiveWorkspaceView>('dashboard');
  const [restorationSubTab, setRestorationSubTab] =
    useState<RestorationSubTab>('configure');
  const [resultsSubTab, setResultsSubTab] = useState<ResultsSubTab>('output');

  const [stagedImages, setStagedImages] = useState<StagedSatelliteImage[]>([]);
  const [customGroundTruthUrl, setCustomGroundTruthUrl] = useState<string | null>(
    null
  );

  const [options, setOptions] = useState<ProcessingOptions>({
    generateHeatmap: true,
    enableComparison: true,
    sarStructuralGuidance: true,
    architecture: 'spa_gan_epoch200',
    normalization: 'neg1_pos1',
    augmentation: 'none',
    radiometricBalance: true,
  });

  const [isProcessing, setIsProcessing] = useState(false);
  const [progressPct, setProgressPct] = useState(0);
  const [activeStepIndex, setActiveStepIndex] = useState(0);

  const [activeResult, setActiveResult] =
    useState<ActiveRestorationResult | null>(null);
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [loadingHistoryId, setLoadingHistoryId] = useState<string | null>(null);

  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  // Initialize default RICE1 benchmark scene and pre-hydrated baseline output
  useEffect(() => {
    const initialFrames = buildPresetStagedImages('bohemia_valley', 2);
    setStagedImages(initialFrames);

    executeSatelliteRestoration({
      stagedImages: initialFrames,
      options: {
        generateHeatmap: true,
        enableComparison: true,
        sarStructuralGuidance: true,
        architecture: 'spa_gan_epoch200',
        normalization: 'neg1_pos1',
        augmentation: 'none',
        radiometricBalance: true,
      },
    })
      .then((res) => setActiveResult(res))
      .catch(() => {});
  }, []);

  // Load processing history from backend
  useEffect(() => {
    if (!currentUser) return;
    fetch('/api/history')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data.history)) {
          setHistory(data.history as HistoryRecord[]);
        }
      })
      .catch(() => {});
  }, [currentUser]);

  const handleAuthenticated = (user: UserProfile) => {
    setCurrentUser(user);
    try {
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(user));
    } catch {
      // Ignore storage quota issues
    }
    setActiveView('dashboard');
  };

  const handleUpdateUser = (updated: UserProfile) => {
    setCurrentUser(updated);
    try {
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // Ignore storage quota issues
    }
  };

  const handleLogout = () => {
    setUserMenuOpen(false);
    setCurrentUser(null);
    setAuthMode('login');
    try {
      localStorage.removeItem(SESSION_STORAGE_KEY);
    } catch {
      // Ignore storage issues
    }
  };

  const handleProceedToProcess = () => {
    setRestorationSubTab('configure');
    setActiveView('restoration');
  };

  const runRestorationForFrames = async (
    framesToRun: StagedSatelliteImage[],
    groundTruthOverride: string | null
  ) => {
    if (framesToRun.length === 0 || isProcessing) return;

    setIsProcessing(true);
    setProgressPct(14);
    setActiveStepIndex(0);

    const stepTimer1 = window.setTimeout(() => {
      setProgressPct(42);
      setActiveStepIndex(1);
    }, 220);

    const stepTimer2 = window.setTimeout(() => {
      setProgressPct(72);
      setActiveStepIndex(2);
    }, 480);

    const stepTimer3 = window.setTimeout(() => {
      setProgressPct(90);
      setActiveStepIndex(3);
    }, 740);

    try {
      const computed = await executeSatelliteRestoration({
        stagedImages: framesToRun,
        options,
        customGroundTruthUrl: groundTruthOverride,
      });

      await new Promise((resolve) => setTimeout(resolve, 680));
      setProgressPct(100);
      setActiveStepIndex(4);
      setActiveResult(computed);

      // Persist restoration run to backend history store using compact high-quality thumbnails
      try {
        const [cloudyThumb, restoredThumb, gtThumb, heatmapThumb] =
          await Promise.all([
            createCompactThumbUrl(computed.cloudyInputUrl, 384),
            createCompactThumbUrl(computed.restoredOutputUrl, 384),
            createCompactThumbUrl(computed.groundTruthUrl, 384),
            createCompactThumbUrl(computed.heatmapUrl, 384),
          ]);

        const res = await fetch('/api/history', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageName: computed.imageName,
            dateLabel: computed.dateLabel,
            frameCount: computed.frameCount,
            datasetSource: computed.datasetSource,
            presetId: computed.presetId,
            metrics: computed.metrics,
            options: computed.options,
            cloudyThumbUrl: cloudyThumb,
            restoredThumbUrl: restoredThumb,
            groundTruthThumbUrl: gtThumb,
            heatmapThumbUrl: heatmapThumb,
          }),
        });
        const saved = await res.json();
        if (res.ok && Array.isArray(saved.history)) {
          setHistory(saved.history as HistoryRecord[]);
        }
      } catch {
        // Fallback local state if offline
      }

      setResultsSubTab('output');
      setActiveView('results');
    } finally {
      window.clearTimeout(stepTimer1);
      window.clearTimeout(stepTimer2);
      window.clearTimeout(stepTimer3);
      setIsProcessing(false);
    }
  };

  const handleStartRestoration = () => {
    void runRestorationForFrames(stagedImages, customGroundTruthUrl);
  };

  const handleLoadRecommendedPreset = (presetId: ScenePresetId) => {
    const newFrames = buildPresetStagedImages(presetId, 2);
    setCustomGroundTruthUrl(null);
    setStagedImages(newFrames);
    void runRestorationForFrames(newFrames, null);
  };

  const handleSelectHistoryRecord = async (record: HistoryRecord) => {
    setLoadingHistoryId(record.id);
    try {
      const hydrated = await hydrateHistoryRecordResult(record);
      setActiveResult(hydrated);
      setResultsSubTab('output');
      setActiveView('results');
    } finally {
      setLoadingHistoryId(null);
    }
  };

  const handleDeleteHistoryRecord = async (id: string) => {
    setHistory((prev) => prev.filter((item) => item.id !== id));
    try {
      const res = await fetch(`/api/history/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok && Array.isArray(data.history)) {
        setHistory(data.history as HistoryRecord[]);
      }
    } catch {
      // Already optimistically updated
    }
  };

  const handleUploadGroundTruthForResult = async (file: File) => {
    if (!activeResult || !file.type.startsWith('image/')) return;
    const rawDataUrl = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.readAsDataURL(file);
    });

    const restoredDecoded = await dataUrlToRgba(
      activeResult.restoredOutputUrl,
      MAX_IMAGE_DIM
    );
    const gtDecoded = await dataUrlToRgba(rawDataUrl, MAX_IMAGE_DIM, {
      width: restoredDecoded.width,
      height: restoredDecoded.height,
    });

    const gtUrl = rgbaToDataUrl(
      gtDecoded.rgba,
      restoredDecoded.width,
      restoredDecoded.height
    );
    const refMetrics = computeReferenceMetrics(
      restoredDecoded.rgba,
      gtDecoded.rgba,
      restoredDecoded.width,
      restoredDecoded.height
    );

    setCustomGroundTruthUrl(gtUrl);
    setActiveResult({
      ...activeResult,
      groundTruthUrl: gtUrl,
      groundTruthSource: 'user_uploaded',
      metrics: {
        ...activeResult.metrics,
        psnrDb: refMetrics.psnrDb,
        ssim: refMetrics.ssim,
        mse: refMetrics.mse,
        hasGroundTruth: true,
        groundTruthSource: 'user_uploaded',
      },
    });
  };

  if (!currentUser) {
    return (
      <AuthViews
        mode={authMode}
        onSwitchMode={setAuthMode}
        onAuthenticated={handleAuthenticated}
      />
    );
  }

  const sidebarItems: Array<{
    id: ActiveWorkspaceView;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutGrid },
    { id: 'restoration', label: 'Cloud Removal', icon: SlidersHorizontal },
    { id: 'results', label: 'Results', icon: FileCheck2 },
    { id: 'profile', label: 'My Profile', icon: User },
    { id: 'pipeline', label: 'Overview', icon: Cpu },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-[#07101C] text-[#E6EEF8]">
      {/* Top Workspace Header following 3-zone SaaS Top Bar Contract */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-8 border-b border-[#162B44] bg-[#081322]/95 px-5 backdrop-blur-sm">
        {/* Zone 1: Brand Wordmark */}
        <button
          type="button"
          onClick={() => setActiveView('dashboard')}
          className="flex items-center gap-2.5 text-left whitespace-nowrap shrink-0"
        >
          <SatelliteLogoIcon size={25} />
          <span className="text-lg font-bold tracking-tight text-white">
            Altaria
          </span>
        </button>

        {/* Zone 2: Contextual Breadcrumb */}
        <div className="hidden items-center gap-2 text-xs text-[#88A2BE] md:flex whitespace-nowrap">
          <span>Satellite Cloud Removal</span>
          <span aria-hidden="true">/</span>
          <span className="font-medium text-[#E2ECF7]">
            {VIEW_LABELS[activeView]}
          </span>
        </div>

        {/* Zone 3: Account Profile Dropdown + Logout */}
        <div className="flex items-center gap-3 shrink-0" ref={menuRef}>
          <div className="relative">
            <button
              type="button"
              onClick={() => setUserMenuOpen((v) => !v)}
              className="flex items-center gap-2.5 rounded-lg border border-[#1B3350] bg-[#0B192C] px-3 py-1.5 text-xs font-medium text-[#E6EEF8] transition-colors hover:border-[#305784] whitespace-nowrap shrink-0"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#153152] text-[11px] font-semibold text-[#7DD3FC]">
                {currentUser.fullName
                  .split(' ')
                  .map((p) => p[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase()}
              </span>
              <span className="max-w-[140px] truncate">{currentUser.fullName}</span>
              <ChevronDown className="h-3.5 w-3.5 text-[#7E99B6]" />
            </button>

            {userMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 rounded-lg border border-[#1E3856] bg-[#091525] py-1.5 shadow-lg">
                <button
                  type="button"
                  onClick={() => {
                    setUserMenuOpen(false);
                    setActiveView('profile');
                  }}
                  className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-xs text-[#DCE8F5] hover:bg-[#11233B]"
                >
                  <User className="h-3.5 w-3.5 text-[#7DD3FC]" />
                  My Profile
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setUserMenuOpen(false);
                    setResultsSubTab('history');
                    setActiveView('results');
                  }}
                  className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-xs text-[#DCE8F5] hover:bg-[#11233B]"
                >
                  <History className="h-3.5 w-3.5 text-[#7DD3FC]" />
                  Processing History
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setUserMenuOpen(false);
                    setActiveView('pipeline');
                  }}
                  className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-xs text-[#DCE8F5] hover:bg-[#11233B]"
                >
                  <Cpu className="h-3.5 w-3.5 text-[#7DD3FC]" />
                  Overview
                </button>
                <div className="my-1 border-t border-[#162B44]" />
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-xs text-rose-300 hover:bg-rose-950/40"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Logout
                </button>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleLogout}
            title="Sign out"
            aria-label="Sign out"
            className="rounded-lg border border-[#1B3350] bg-[#0B192C] p-2 text-[#94ADC8] transition-colors hover:border-rose-500/40 hover:text-rose-300 shrink-0"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Mobile Horizontal Navigation Strip */}
      <nav className="flex items-center gap-1 overflow-x-auto border-b border-[#162B44] bg-[#081322] px-4 py-2 lg:hidden">
        {sidebarItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveView(item.id)}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                isActive
                  ? 'bg-[#0EA5E9] font-semibold text-[#04101D]'
                  : 'text-[#9DB4CC] hover:bg-[#102238] hover:text-white'
              }`}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Main Desktop Sidebar + Content Viewport */}
      <div className="flex flex-1">
        {/* Left Fixed Sidebar (240px) */}
        <aside className="hidden w-[240px] shrink-0 flex-col justify-between border-r border-[#162B44] bg-[#081322] p-4 lg:flex">
          <div className="space-y-1.5">
            {sidebarItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeView === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveView(item.id)}
                  className={`flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-left text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                    isActive
                      ? 'bg-[#0EA5E9] font-semibold text-[#04101D]'
                      : 'text-[#A8BFD6] hover:bg-[#0F2138] hover:text-white'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}

            <div className="pt-2">
              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-left text-xs font-medium text-[#94ADC8] transition-colors hover:bg-rose-950/35 hover:text-rose-300 whitespace-nowrap shrink-0"
              >
                <LogOut className="h-4 w-4 shrink-0" />
                <span>Logout</span>
              </button>
            </div>
          </div>

          <div className="border-t border-[#14273E] pt-4 text-[11px] leading-relaxed text-[#6E89A6]">
            <p className="font-medium text-[#9DB4CC]">Altaria</p>
            <p className="mt-0.5">Satellite Cloud Removal</p>
          </div>
        </aside>

        {/* Main Content Stage */}
        <main className="flex-1 overflow-y-auto px-5 py-6 sm:px-8 sm:py-8">
          <div className="mx-auto max-w-[1160px]">
            {activeView === 'dashboard' && (
              <DashboardView
                user={currentUser}
                stagedImages={stagedImages}
                onChangeStagedImages={setStagedImages}
                customGroundTruthUrl={customGroundTruthUrl}
                onChangeCustomGroundTruth={setCustomGroundTruthUrl}
                onProceedToProcess={handleProceedToProcess}
              />
            )}

            {activeView === 'restoration' && (
              <ImageRestorationView
                subTab={restorationSubTab}
                onChangeSubTab={setRestorationSubTab}
                stagedImages={stagedImages}
                options={options}
                onChangeOptions={setOptions}
                isProcessing={isProcessing}
                progressPct={progressPct}
                activeStepIndex={activeStepIndex}
                onStartRestoration={handleStartRestoration}
                activeResult={activeResult}
                onNavigateDashboard={() => setActiveView('dashboard')}
                onNavigateResults={() => {
                  setResultsSubTab('output');
                  setActiveView('results');
                }}
              />
            )}

            {activeView === 'results' && (
              <ResultsView
                subTab={resultsSubTab}
                onChangeSubTab={setResultsSubTab}
                activeResult={activeResult}
                history={history}
                loadingHistoryId={loadingHistoryId}
                onSelectHistoryRecord={handleSelectHistoryRecord}
                onDeleteHistoryRecord={handleDeleteHistoryRecord}
                onUploadGroundTruthForResult={handleUploadGroundTruthForResult}
                onOpenComparisonInspector={() => {
                  setRestorationSubTab('heatmap');
                  setActiveView('restoration');
                }}
                onLoadRecommendedPreset={handleLoadRecommendedPreset}
                onNavigateDashboard={() => setActiveView('dashboard')}
              />
            )}

            {activeView === 'profile' && (
              <ProfileView
                user={currentUser}
                onUpdateUser={handleUpdateUser}
                onBackToDashboard={() => setActiveView('dashboard')}
                onLogout={handleLogout}
              />
            )}

            {activeView === 'pipeline' && (
              <PipelineView
                onNavigateDashboard={() => setActiveView('dashboard')}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
