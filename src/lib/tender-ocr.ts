import {
  TENDER_OCR_LIMITS,
  validateTenderOcrFileSize,
  validateTenderOcrPageCount,
} from "./tender-ocr-contract";

const PDFJS_SCRIPT = "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js";
const PDFJS_WORKER = "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js";
const TESSERACT_SCRIPT = "https://cdn.jsdelivr.net/npm/tesseract.js@5.0.0/dist/tesseract.min.js";
const TESSERACT_WORKER = "https://cdn.jsdelivr.net/npm/tesseract.js@5.0.0/dist/worker.min.js";
const TESSERACT_CORE = "https://cdn.jsdelivr.net/npm/tesseract.js-core@5.0.0";
const ENGLISH_DATA = "https://tessdata.projectnaptha.com/4.0.0";

type PdfPage = {
  getViewport: (options: { scale: number }) => { width: number; height: number };
  render: (options: {
    canvasContext: CanvasRenderingContext2D;
    viewport: { width: number; height: number };
  }) => { promise: Promise<void> };
  cleanup?: () => void;
};

type PdfDocument = {
  numPages: number;
  getPage: (pageNumber: number) => Promise<PdfPage>;
  destroy?: () => Promise<void>;
};

type PdfJsLibrary = {
  GlobalWorkerOptions: { workerSrc: string };
  getDocument: (options: { data: Uint8Array; isEvalSupported: boolean }) => {
    promise: Promise<PdfDocument>;
  };
};

type TesseractWorker = {
  recognize: (image: HTMLCanvasElement) => Promise<{ data: { text?: string } }>;
  terminate: () => Promise<void>;
};

type TesseractLibrary = {
  createWorker: (
    languages: string,
    oem: number,
    options: {
      workerPath: string;
      corePath: string;
      langPath: string;
    },
  ) => Promise<TesseractWorker>;
};

declare global {
  interface Window {
    pdfjsLib?: PdfJsLibrary;
    Tesseract?: TesseractLibrary;
  }
}

let pdfJsLoad: Promise<PdfJsLibrary> | null = null;
let tesseractLoad: Promise<TesseractLibrary> | null = null;

function loadScript<T>(key: string, source: string, isReady: () => T | undefined): Promise<T> {
  const existing = isReady();
  if (existing) return Promise.resolve(existing);

  return new Promise<T>((resolve, reject) => {
    const script = document.querySelector<HTMLScriptElement>(
      'script[data-jasmiq-ocr="' + key + '"]',
    );
    const element = script ?? document.createElement("script");
    const finish = () => {
      const loaded = isReady();
      if (loaded) resolve(loaded);
      else {
        element.remove();
        reject(new Error("The " + key + " library loaded without its expected API."));
      }
    };
    if (script) {
      element.addEventListener("load", finish, { once: true });
      element.addEventListener(
        "error",
        () => {
          element.remove();
          reject(new Error("Could not load the " + key + " library from its CDN."));
        },
        { once: true },
      );
      return;
    }
    element.src = source;
    element.async = true;
    element.crossOrigin = "anonymous";
    element.dataset.jasmiqOcr = key;
    element.addEventListener("load", finish, { once: true });
    element.addEventListener(
      "error",
      () => {
        element.remove();
        reject(new Error("Could not load the " + key + " library from its CDN."));
      },
      { once: true },
    );
    document.head.appendChild(element);
  });
}

async function loadPdfJs(): Promise<PdfJsLibrary> {
  if (!pdfJsLoad) {
    pdfJsLoad = loadScript("pdfjs", PDFJS_SCRIPT, () => window.pdfjsLib).then((library) => {
      library.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
      return library;
    });
  }
  try {
    return await pdfJsLoad;
  } catch (error) {
    pdfJsLoad = null;
    throw error;
  }
}

async function loadTesseract(): Promise<TesseractLibrary> {
  if (!tesseractLoad) {
    tesseractLoad = loadScript("tesseract", TESSERACT_SCRIPT, () => window.Tesseract);
  }
  try {
    return await tesseractLoad;
  } catch (error) {
    tesseractLoad = null;
    throw error;
  }
}

export async function extractScannedTenderPdfText(
  source: Blob,
  onPageProgress?: (page: number, total: number) => void,
): Promise<{ text: string; pageCount: number }> {
  if (typeof window === "undefined" || typeof document === "undefined") {
    throw new Error("Local OCR is available only in a browser.");
  }
  const fileSizeError = validateTenderOcrFileSize(source.size);
  if (fileSizeError) throw new Error(fileSizeError);

  const [pdfJs, tesseract] = await Promise.all([loadPdfJs(), loadTesseract()]);
  const pdf = await pdfJs.getDocument({
    data: new Uint8Array(await source.arrayBuffer()),
    isEvalSupported: false,
  }).promise;

  const pageCountError = validateTenderOcrPageCount(pdf.numPages);
  if (pageCountError) {
    await pdf.destroy?.();
    throw new Error(pageCountError);
  }

  let worker: TesseractWorker | null = null;
  let processedPages = 0;
  const pages: string[] = [];
  try {
    worker = await tesseract.createWorker("eng", 1, {
      workerPath: TESSERACT_WORKER,
      corePath: TESSERACT_CORE,
      langPath: ENGLISH_DATA,
    });

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const baseViewport = page.getViewport({ scale: 1 });
      const scale = Math.min(1.5, 1800 / Math.max(baseViewport.width, baseViewport.height));
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement("canvas");
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      const context = canvas.getContext("2d", { alpha: false });
      if (!context) throw new Error("Could not prepare a page for local OCR.");

      await page.render({ canvasContext: context, viewport }).promise;
      const result = await worker.recognize(canvas);
      const pageText = (result.data.text ?? "").trim();
      if (pageText) pages.push("[Page " + pageNumber + "]\n" + pageText);
      canvas.width = 0;
      canvas.height = 0;
      page.cleanup?.();
      processedPages = pageNumber;
      onPageProgress?.(pageNumber, pdf.numPages);
      if (pages.join("\n\n").length >= TENDER_OCR_LIMITS.maxTextCharacters) break;
    }
  } finally {
    await worker?.terminate();
    await pdf.destroy?.();
  }

  return {
    text: pages.join("\n\n").slice(0, TENDER_OCR_LIMITS.maxTextCharacters).trim(),
    pageCount: processedPages,
  };
}
