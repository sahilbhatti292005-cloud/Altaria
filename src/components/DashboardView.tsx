import React, { useRef, useState } from 'react';
import {
  AlertTriangle,
  Check,
  CloudUpload,
  Database,
  ImagePlus,
  Lightbulb,
  Plus,
  Upload,
  X,
} from 'lucide-react';
import type {
  ScenePresetId,
  StagedSatelliteImage,
  UserProfile,
} from '../types/altaria';
import {
  MAX_IMAGE_DIM,
  SCENE_PRESETS,
  analyzeAtmosphericObstruction,
  buildPresetStagedImages,
  dataUrlToRgba,
  getPresetPreviewThumbUrl,
  rgbaToDataUrl,
} from '../utils/restorationEngine';

interface DashboardViewProps {
  user: UserProfile;
  stagedImages: StagedSatelliteImage[];
  onChangeStagedImages: (images: StagedSatelliteImage[]) => void;
  customGroundTruthUrl: string | null;
  onChangeCustomGroundTruth: (url: string | null) => void;
  onProceedToProcess: () => void;
}

type InputSourceTab = 'upload' | 'RICE1' | 'RICE2';

export function DashboardView({
  user,
  stagedImages,
  onChangeStagedImages,
  customGroundTruthUrl,
  onChangeCustomGroundTruth,
  onProceedToProcess,
}: DashboardViewProps) {
  const replaceInputRef = useRef<HTMLInputElement | null>(null);
  const appendInputRef = useRef<HTMLInputElement | null>(null);
  const gtInputRef = useRef<HTMLInputElement | null>(null);

  const [sourceTab, setSourceTab] = useState<InputSourceTab>('RICE1');
  const [dragActive, setDragActive] = useState(false);
  const [uploadNotice, setUploadNotice] = useState<string | null>(null);

  const activePresetId = stagedImages[0]?.presetId;
  const hasCustomUploads =
    stagedImages.length > 0 && stagedImages[0].isCustomUpload;

  const handleFilesSelected = async (
    fileList: FileList | null,
    appendMode: boolean
  ) => {
    if (!fileList || fileList.length === 0) return;
    setUploadNotice(null);

    const baseList = appendMode && hasCustomUploads ? [...stagedImages] : [];
    const remainingSlots = 3 - baseList.length;
    if (remainingSlots <= 0) {
      setUploadNotice('You can select up to 3 images at a time.');
      return;
    }

    const maxToRead = Math.min(fileList.length, remainingSlots);
    const newFrames: StagedSatelliteImage[] = [];

    for (let i = 0; i < maxToRead; i++) {
      const file = fileList[i];
      if (!file.type.startsWith('image/')) continue;

      const rawDataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('File read error'));
        reader.readAsDataURL(file);
      });

      const targetSize =
        baseList.length > 0
          ? { width: baseList[0].width, height: baseList[0].height }
          : undefined;
      const decoded = await dataUrlToRgba(rawDataUrl, MAX_IMAGE_DIM, targetSize);
      const obs = analyzeAtmosphericObstruction(
        decoded.rgba,
        decoded.width,
        decoded.height
      );
      const normalizedUrl = rgbaToDataUrl(
        decoded.rgba,
        decoded.width,
        decoded.height
      );

      const idxNum = baseList.length + newFrames.length + 1;
      newFrames.push({
        id: `upload_${Date.now().toString(36)}_${i}`,
        name: file.name,
        label: `Image ${idxNum}`,
        dataUrl: normalizedUrl || rawDataUrl,
        width: decoded.width,
        height: decoded.height,
        cloudPct: obs.cloudCoveragePct,
        fogPct: obs.fogCoveragePct,
        totalObstructionPct: obs.totalObstructionPct,
        datasetSource: 'CUSTOM',
        frameIndex: idxNum - 1,
        isCustomUpload: true,
      });
    }

    if (newFrames.length > 0) {
      const merged = [...baseList, ...newFrames];
      onChangeStagedImages(merged);
      if (!appendMode) {
        onChangeCustomGroundTruth(null);
      }

      // Quietly validate input on the server without showing technical logs in UI
      fetch('/api/inference/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageName: merged[0].name,
          datasetSource: merged[0].datasetSource,
          width: merged[0].width,
          height: merged[0].height,
          cloudPct: merged[0].cloudPct,
        }),
      }).catch(() => {});
    }
  };

  const handleGroundTruthSelected = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const file = fileList[0];
    if (!file.type.startsWith('image/')) return;
    const rawDataUrl = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.readAsDataURL(file);
    });
    const targetSize = stagedImages[0]
      ? { width: stagedImages[0].width, height: stagedImages[0].height }
      : undefined;
    const decoded = await dataUrlToRgba(rawDataUrl, MAX_IMAGE_DIM, targetSize);
    const normalizedUrl = rgbaToDataUrl(decoded.rgba, decoded.width, decoded.height);
    if (normalizedUrl) {
      onChangeCustomGroundTruth(normalizedUrl);
    }
  };

  const handleRemoveImage = (id: string) => {
    const updated = stagedImages
      .filter((item) => item.id !== id)
      .map((item, idx) => ({
        ...item,
        label: `Image ${idx + 1}`,
        frameIndex: idx,
      }));
    onChangeStagedImages(updated);
  };

  const handleAddAdditionalFrame = () => {
    if (stagedImages.length >= 3) return;
    if (
      stagedImages.length > 0 &&
      !stagedImages[0].isCustomUpload &&
      stagedImages[0].presetId
    ) {
      const allThree = buildPresetStagedImages(stagedImages[0].presetId, 3);
      onChangeStagedImages([...stagedImages, allThree[stagedImages.length]]);
    } else {
      setSourceTab('upload');
      appendInputRef.current?.click();
    }
  };

  const handleLoadPreset = (presetId: ScenePresetId) => {
    setUploadNotice(null);
    onChangeCustomGroundTruth(null);
    const frames = buildPresetStagedImages(presetId, 2);
    onChangeStagedImages(frames);

    fetch('/api/inference/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imageName: frames[0].name,
        datasetSource: frames[0].datasetSource,
        width: frames[0].width,
        height: frames[0].height,
        cloudPct: frames[0].cloudPct,
      }),
    }).catch(() => {});
  };

  const datasetScenes = SCENE_PRESETS.filter((p) => p.dataset === sourceTab);

  return (
    <div className="space-y-6">
      {/* Greeting + Source Switcher */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Welcome, {user.fullName}
          </h1>
          <p className="mt-1 text-sm text-[#8EA6C0]">
            Upload a satellite image or choose a sample from RICE1 or RICE2.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1 rounded-lg border border-[#19304B] bg-[#0A1727] p-1">
          <button
            type="button"
            onClick={() => setSourceTab('upload')}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
              sourceTab === 'upload'
                ? 'bg-[#0EA5E9] text-[#04101D]'
                : 'text-[#9CB3CC] hover:bg-[#11243B] hover:text-white'
            }`}
          >
            <Upload className="h-3.5 w-3.5" />
            Upload Image
          </button>
          <button
            type="button"
            onClick={() => setSourceTab('RICE1')}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
              sourceTab === 'RICE1'
                ? 'bg-[#0EA5E9] text-[#04101D]'
                : 'text-[#9CB3CC] hover:bg-[#11243B] hover:text-white'
            }`}
          >
            <Database className="h-3.5 w-3.5" />
            RICE1 Dataset
          </button>
          <button
            type="button"
            onClick={() => setSourceTab('RICE2')}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
              sourceTab === 'RICE2'
                ? 'bg-[#0EA5E9] text-[#04101D]'
                : 'text-[#9CB3CC] hover:bg-[#11243B] hover:text-white'
            }`}
          >
            <Database className="h-3.5 w-3.5" />
            RICE2 Dataset
          </button>
        </div>
      </div>

      {/* Main 2-Column Layout */}
      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-12">
        {/* Left Selection Card */}
        <section className="rounded-xl border border-[#1A314D] bg-[#0B1829] p-6 xl:col-span-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              {sourceTab === 'upload' ? (
                <Upload className="h-4 w-4 text-[#38BDF8]" />
              ) : (
                <Database className="h-4 w-4 text-[#38BDF8]" />
              )}
              <h2 className="text-base font-semibold text-white">
                {sourceTab === 'upload'
                  ? 'Upload Satellite Image'
                  : sourceTab === 'RICE1'
                  ? 'RICE1 Dataset — Light Clouds'
                  : 'RICE2 Dataset — Dense Clouds'}
              </h2>
            </div>
            <span className="font-mono text-xs text-[#88A2BE] tabular-nums">
              {stagedImages.length}/3 Selected
            </span>
          </div>

          {uploadNotice && (
            <div className="mt-4 rounded-lg border border-amber-500/35 bg-amber-950/30 px-3.5 py-2 text-xs text-amber-200">
              {uploadNotice}
            </div>
          )}

          {/* Hidden File Inputs */}
          <input
            ref={replaceInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              handleFilesSelected(e.target.files, false);
              e.target.value = '';
            }}
          />
          <input
            ref={appendInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              handleFilesSelected(e.target.files, true);
              e.target.value = '';
            }}
          />

          {sourceTab === 'upload' ? (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragActive(false);
                handleFilesSelected(e.dataTransfer.files, false);
              }}
              onClick={() => replaceInputRef.current?.click()}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  replaceInputRef.current?.click();
                }
              }}
              className={`mt-4 flex flex-col items-center justify-center rounded-xl border border-dashed px-6 py-9 text-center transition-colors ${
                dragActive
                  ? 'border-[#38BDF8] bg-[#0F243D]'
                  : 'border-[#25456B] bg-[#081322] hover:border-[#38BDF8]/70 hover:bg-[#0C1B2F]'
              }`}
            >
              <CloudUpload className="h-10 w-10 text-[#38BDF8]" />
              <p className="mt-3 text-sm font-medium text-[#E2ECF7]">
                Drag &amp; drop a satellite image here or click to browse
              </p>
              <p className="mt-1 text-xs text-[#7E99B6]">
                Supports JPG, PNG, and WebP images
              </p>
            </div>
          ) : (
            <div className="mt-4">
              <p className="text-xs text-[#88A2BE]">
                {sourceTab === 'RICE1'
                  ? 'Select a sample scene with thin cloud and haze cover.'
                  : 'Select a sample scene with thicker cloud patches.'}
              </p>

              <div className="mt-3.5 grid grid-cols-1 gap-4 sm:grid-cols-3">
                {datasetScenes.map((preset) => {
                  const isSelected =
                    !hasCustomUploads && activePresetId === preset.id;
                  const thumbUrl = getPresetPreviewThumbUrl(preset.id, 160);

                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleLoadPreset(preset.id)}
                      className={`group flex flex-col overflow-hidden rounded-lg border p-2.5 text-left transition-colors ${
                        isSelected
                          ? 'border-[#38BDF8] bg-[#0E223A]'
                          : 'border-[#1E3856] bg-[#081322] hover:border-[#2F5785]'
                      }`}
                    >
                      <div className="aspect-square w-full overflow-hidden rounded-md bg-[#050C16]">
                        <img
                          src={thumbUrl}
                          alt={preset.title}
                          referrerPolicy="no-referrer"
                          className="h-full w-full object-cover"
                        />
                      </div>

                      <div className="mt-2.5 w-full">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-[11px] font-semibold text-[#38BDF8] tabular-nums">
                            {preset.sampleCode}
                          </span>
                          {isSelected && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
                              <Check className="h-3 w-3" />
                              Selected
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 truncate text-xs font-semibold text-white">
                          {preset.title}
                        </p>
                        <p className="mt-1 font-mono text-[11px] text-[#9DB4CC] tabular-nums">
                          {Math.round(preset.cloudTarget * 100)}% cloud ·{' '}
                          {Math.round(preset.fogTarget * 100)}% haze
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Selected Images Strip */}
          <div className="mt-6 border-t border-[#152840] pt-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-[#DCE8F5] tabular-nums">
                Selected Input ({stagedImages.length}/3)
              </h3>
              {stagedImages[0] && (
                <span className="text-xs text-[#88A2BE]">
                  Source:{' '}
                  <strong className="font-semibold text-white">
                    {stagedImages[0].datasetSource === 'CUSTOM'
                      ? 'Uploaded Image'
                      : stagedImages[0].datasetSource}
                  </strong>
                </span>
              )}
            </div>

            <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
              {stagedImages.map((img) => (
                <div
                  key={img.id}
                  className="group relative overflow-hidden rounded-lg border border-[#1E3856] bg-[#081322] p-2.5"
                >
                  <div className="aspect-square w-full overflow-hidden rounded-md bg-[#050C16]">
                    <img
                      src={img.dataUrl}
                      alt={img.name}
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="mt-2.5 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium text-white">
                        {img.name}
                      </p>
                      <p className="mt-0.5 font-mono text-[11px] text-[#7E99B6] tabular-nums">
                        {img.cloudPct}% cloud · {img.fogPct}% haze
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(img.id)}
                      aria-label={`Remove ${img.name}`}
                      className="rounded p-1 text-rose-400 transition-colors hover:bg-rose-950/60 hover:text-rose-300 shrink-0"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}

              {stagedImages.length < 3 && (
                <button
                  type="button"
                  onClick={handleAddAdditionalFrame}
                  className="flex min-h-[190px] flex-col items-center justify-center rounded-lg border border-dashed border-[#25456B] bg-[#081322]/70 p-4 text-center transition-colors hover:border-[#38BDF8] hover:bg-[#0D1E34]"
                >
                  <Plus className="h-6 w-6 text-[#93AFCB]" />
                  <span className="mt-2 text-xs font-semibold text-[#D5E3F3] whitespace-nowrap">
                    Add Another Image
                  </span>
                  <span className="mt-0.5 text-[11px] text-[#7893AF]">
                    Optional ({stagedImages.length + 1} of 3)
                  </span>
                </button>
              )}
            </div>
          </div>

          {/* Optional Original Clean Image */}
          <div className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-lg border border-[#182E49] bg-[#081322] px-4 py-3">
            <input
              ref={gtInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                handleGroundTruthSelected(e.target.files);
                e.target.value = '';
              }}
            />

            {customGroundTruthUrl ? (
              <div className="flex items-center gap-3">
                <img
                  src={customGroundTruthUrl}
                  alt="Uploaded original image"
                  referrerPolicy="no-referrer"
                  className="h-10 w-10 rounded border border-[#234368] object-cover"
                />
                <div>
                  <p className="text-xs font-semibold text-white">
                    Original Image Attached
                  </p>
                  <p className="text-[11px] text-[#88A2BE]">
                    Ready for Input vs. Original comparison.
                  </p>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-xs font-medium text-[#DCE8F5]">
                  Original Clean Image (Optional)
                </p>
                <p className="mt-0.5 text-[11px] text-[#88A2BE]">
                  {hasCustomUploads
                    ? 'Upload a clear photo of the same place if you want to compare them.'
                    : 'Dataset samples already include a clean original image.'}
                </p>
              </div>
            )}

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => gtInputRef.current?.click()}
                className="flex items-center gap-1.5 rounded-md border border-[#25466B] bg-[#0C1C31] px-3 py-1.5 text-xs font-medium text-[#DCE8F5] transition-colors hover:border-[#38BDF8] hover:text-white whitespace-nowrap shrink-0"
              >
                <ImagePlus className="h-3.5 w-3.5 text-[#38BDF8]" />
                {customGroundTruthUrl ? 'Change Original' : 'Upload Original'}
              </button>
              {customGroundTruthUrl && (
                <button
                  type="button"
                  onClick={() => onChangeCustomGroundTruth(null)}
                  className="rounded-md border border-[#25466B] bg-[#0C1C31] px-2.5 py-1.5 text-xs text-rose-300 hover:border-rose-500/50 whitespace-nowrap shrink-0"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Primary Action Button */}
          <div className="mt-5">
            <button
              type="button"
              disabled={stagedImages.length === 0}
              onClick={onProceedToProcess}
              className="w-full rounded-lg bg-[#0EA5E9] px-5 py-3 text-sm font-semibold text-[#04101D] transition-colors hover:bg-[#38BDF8] disabled:cursor-not-allowed disabled:opacity-50 whitespace-nowrap shrink-0"
            >
              Continue to Cloud Removal
            </button>
          </div>
        </section>

        {/* Simple Right Guide Cards */}
        <aside className="space-y-5 xl:col-span-4">
          <div className="rounded-xl border border-[#1A3554] bg-[#0B1A2D] p-5">
            <div className="flex items-center gap-2.5">
              <Lightbulb className="h-4 w-4 shrink-0 text-[#38BDF8]" />
              <h3 className="text-sm font-semibold text-white">How It Works</h3>
            </div>
            <ol className="mt-3 space-y-2 text-xs leading-relaxed text-[#9DB4CC]">
              <li>
                <strong className="text-[#DCE8F5]">1. Select Image:</strong>{' '}
                Upload your own satellite photo or pick a sample from RICE1 or RICE2.
              </li>
              <li>
                <strong className="text-[#DCE8F5]">2. Preview &amp; Check Clouds:</strong>{' '}
                View the preprocessed image and see where clouds are detected.
              </li>
              <li>
                <strong className="text-[#DCE8F5]">3. Remove Clouds:</strong>{' '}
                Generate a clear image, compare with your input, and view similar scenes.
              </li>
            </ol>
          </div>

          <div className="rounded-xl border border-[#493818] bg-[#161922] p-5">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="h-4 w-4 shrink-0 text-[#F59E0B]" />
              <h3 className="text-sm font-semibold text-[#FDE68A]">
                Tip for Best Results
              </h3>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-[#CBD5E1]">
              Cloud removal works best when clouds cover less than 70% of the image. For heavy clouds, you can add up to 3 images of the same location.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
