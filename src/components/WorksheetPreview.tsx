import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import type { WorksheetSource } from '../content/worksheetSource';

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;

interface WorksheetPreviewProps {
  source: WorksheetSource;
  loadingLabel: string;
  fallbackLabel: string;
  overlay?: ReactNode;
  className?: string;
}

export function WorksheetPreview({
  source,
  loadingLabel,
  fallbackLabel,
  overlay,
  className,
}: WorksheetPreviewProps) {
  return (
    <div className={['k1-paper-card relative aspect-[203/259] h-[530px] overflow-hidden bg-white', className ?? ''].join(' ')}>
      {source.assetKind === 'pdf' ? (
        <PdfWorksheetPage
          source={source}
          loadingLabel={loadingLabel}
          fallbackLabel={fallbackLabel}
        />
      ) : (
        <img
          src={source.previewSrc}
          alt={source.previewAlt}
          className="h-full w-full object-contain bg-white"
        />
      )}

      {overlay ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center px-4">
          {overlay}
        </div>
      ) : null}
    </div>
  );
}

function PdfWorksheetPage({
  source,
  loadingLabel,
  fallbackLabel,
}: {
  source: WorksheetSource;
  loadingLabel: string;
  fallbackLabel: string;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [pageWidth, setPageWidth] = useState(0);
  const [useNativeFallback, setUseNativeFallback] = useState(false);

  useEffect(() => {
    setUseNativeFallback(false);
  }, [source.previewSrc, source.pageNumber]);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) {
      return;
    }

    const updateWidth = () => {
      setPageWidth(Math.max(0, Math.floor(element.clientWidth)));
    };

    updateWidth();

    const observer = new ResizeObserver(() => {
      updateWidth();
    });

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="flex h-full w-full items-start justify-center overflow-hidden bg-white"
    >
      {useNativeFallback ? (
        <iframe
          src={buildPdfFallbackUrl(source.previewSrc, source.pageNumber ?? 1)}
          title={source.title}
          className="w-full h-full border-0 bg-white"
        />
      ) : pageWidth > 0 ? (
        <Document
          file={{ url: source.previewSrc }}
          loading={<PreviewMessage>{loadingLabel}</PreviewMessage>}
          error={<PreviewMessage>{fallbackLabel}</PreviewMessage>}
          onLoadError={(error) => {
            console.error('PDF preview failed, using native fallback:', error);
            setUseNativeFallback(true);
          }}
          className="flex items-start justify-center"
        >
          <Page
            pageNumber={source.pageNumber ?? 1}
            width={pageWidth}
            renderAnnotationLayer={false}
            renderTextLayer={false}
            loading={<PreviewMessage>{loadingLabel}</PreviewMessage>}
          />
        </Document>
      ) : (
        <PreviewMessage>{loadingLabel}</PreviewMessage>
      )}
    </div>
  );
}

function PreviewMessage({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-full w-full items-center justify-center bg-white px-6 text-center text-sm font-semibold text-text-secondary">
      {children}
    </div>
  );
}

function buildPdfFallbackUrl(src: string, pageNumber: number): string {
  return `${src}#page=${pageNumber}&toolbar=0&navpanes=0&scrollbar=0&view=FitH`;
}
