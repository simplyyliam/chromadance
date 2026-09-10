import { useState, useRef, useEffect, type DragEvent, type ChangeEvent } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Image01Icon } from '@hugeicons/core-free-icons';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Countdown, ExtractionShaderOverlay, ProbeGrid, useExtractionTimeline } from '@/features/extraction';
import { useExtractionStore } from '@/store/extractionStore';
import { motion } from 'motion/react';

type ImageContainerProps = {
  shouldCollapse: boolean;
};



export default function ImageContainer({ shouldCollapse }: ImageContainerProps) {
  const image = useExtractionStore((s) => s.image);
  const setImage = useExtractionStore((s) => s.setImage);
  const isHydrated = useExtractionStore((s) => s.isHydrated);
  const phase = useExtractionStore((s) => s.phase);
  const isShaderEnabled = useExtractionStore((s) => s.isShaderEnabled);
  const toggleImageExpanded = useExtractionStore((s) => s.toggleImageExpanded);
  const areProbesVisible = useExtractionStore((s) => s.areProbesVisible);

  const { stage, startAtRef } = useExtractionTimeline();
  const [isAnimating, setIsAnimating] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [imageVersion, setImageVersion] = useState(0);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  // const [gridStage, setGridStage] = useState<GridStage | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (!image) return;

    const img = imageRef.current;
    const canvas = canvasRef.current;
    if (!img || !canvas || !img.complete || img.naturalWidth === 0) return;

    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(img, 0, 0);
    setImageVersion((version) => version + 1);
  }, [image]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateSize = (width: number, height: number) => setContainerSize({ width, height });
    const rect = container.getBoundingClientRect();
    updateSize(rect.width, rect.height);

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        updateSize(width, height);
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // useEffect(() => {
  //   if (phase !== 'extracting') setGridStage(null);
  // }, [phase]);

  // const handleStageChange = useCallback((stage: GridStage) => {
  //   setGridStage(stage);
  // }, []);

  const handleDragEnter = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) return;

    const reader = new FileReader();
    reader.onload = (event) => setImage(event.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);

    const file = event.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleFileSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleImageLoad = () => {
    const img = imageRef.current;
    const canvas = canvasRef.current;
    if (!img || !canvas) return;

    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(img, 0, 0);
    setImageVersion((version) => version + 1);
  };

  return (
    <>
      <motion.div
        ref={containerRef}
        animate={
          shouldCollapse
            ? { y: 620, scale: 0.95 }
            : { y: 0, scale: 1 }
        }
        whileHover={
          shouldCollapse && !isAnimating
            ? { y: 590, scale: 0.95 }
            : undefined
        }
        transition={{
          type: 'spring',
          stiffness: 140,
          damping: 18,
          mass: 0.5,
        }}
        whileTap={
          shouldCollapse && !isAnimating
            ? { y: 585, scale: 0.945 }
            : undefined
        }
        onAnimationComplete={() => setIsAnimating(false)}
        onClick={() => phase === 'contenders' && toggleImageExpanded()}
        className={`relative z-40 flex h-[60svh] w-[55svw] items-center justify-center overflow-hidden bg-klein shadow-2xl transition-colors ${isDragging ? 'ring-2 ring-inset ring-primary' : ''}`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />

        <canvas ref={canvasRef} className="hidden" />

        {!isHydrated ? (
          <Spinner className="text-white" />
        ) : image ? (
          <>
            <img
              ref={imageRef}
              src={image}
              alt="Uploaded content"
              onLoad={handleImageLoad}
              className="relative z-0 h-full w-full object-cover"
            />
            {isShaderEnabled && (
              <ExtractionShaderOverlay
                imageRef={imageRef}
                imageVersion={imageVersion}
                startAtRef={startAtRef}
                stage={stage}
                width={containerSize.width}
                height={containerSize.height}
              />
            )}
            {areProbesVisible && (
              <ProbeGrid
                canvasRef={canvasRef}
                startAtRef={startAtRef}
                stage={stage}
                imageVersion={imageVersion}
                containerWidth={containerSize.width}
                containerHeight={containerSize.height}
              />
            )}
            {phase === 'countdown' && <Countdown />}

          </>
        ) : (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <HugeiconsIcon icon={Image01Icon} className="size-7" />
              </EmptyMedia>
              <EmptyTitle className="text-white">No image selected</EmptyTitle>
              <EmptyDescription className="text-white">Drag & drop an image here</EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button onClick={() => fileInputRef.current?.click()}>Browse files</Button>
            </EmptyContent>
          </Empty>
        )}
      </motion.div>
      {!isHydrated && (
        <div className="mt-4 flex items-center justify-center">
          <Spinner className="size-6 text-white" />
        </div>
      )}
    </>
  );
}
