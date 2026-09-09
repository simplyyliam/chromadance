import { useState, useRef, type DragEvent, type ChangeEvent } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Image01Icon } from '@hugeicons/core-free-icons'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Button } from '@/components/ui/button';
import { ExtractionProbe } from '@/features/extraction';

export default function ImageContainer() {
  const [image, setImage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [imageVersion, setImageVersion] = useState(0)
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  

  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      handleFile(files[0]);
    }
  };

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      handleFile(files[0]);
    }
  };

  const handleFile = (file: File) => {
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
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
  
    setImageVersion(v => v + 1);
    setTimeout(() => setImageVersion(v => v + 1), 100);
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div
      className={`relative flex items-center justify-center w-[55svw] h-[60svh] bg-klein overflow-hidden transition-colors shadow-2xl ${isDragging ? 'ring-2 ring-primary ring-inset' : ''
        }`}
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
      <ExtractionProbe x={0} y={0} size={10} canvasRef={canvasRef} imageVersion={imageVersion}/>
      {image ? (
        <img
          ref={imageRef}
          src={image}
          alt="Uploaded content"
          onLoad={handleImageLoad}
          className="w-full h-full object-cover"
        />
      ) : (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <HugeiconsIcon icon={Image01Icon} className='size-7' />
            </EmptyMedia>
            <EmptyTitle className='text-white'>No image selected</EmptyTitle>
            <EmptyDescription className='text-white'>Drag & drop an image here</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button onClick={handleClick}>Browse files</Button>
          </EmptyContent>
        </Empty>
      )}
    </div>
  );
}
