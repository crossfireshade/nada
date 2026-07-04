const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const TARGET_WIDTH = 1000;
const TARGET_HEIGHT = 1500;
const TARGET_DPI = 72;
const FACE_HEIGHT_FRACTION = 0.30; // face occupies ~30% of portrait height
const HEAD_TOP_MARGIN = 0.12;      // 12% of portrait height above forehead
const CHIN_MARGIN = 0.05;          // 5% of portrait height below chin

// Lazy-loaded face detection state
let faceDetectionState = null; // null=uninitialised, true=ready, false=unavailable
let faceapi = null;
let tf = null;

const MODELS_PATH = path.join(
  path.dirname(require.resolve('@vladmandic/face-api/package.json')),
  'model'
);

async function initFaceDetection() {
  if (faceDetectionState !== null) return faceDetectionState;
  try {
    tf = require('@tensorflow/tfjs-node');
    faceapi = require('@vladmandic/face-api');
    await faceapi.nets.ssdMobilenetv1.loadFromDisk(MODELS_PATH);
    faceDetectionState = true;
    console.log('[imageProcessor] Face detection ready (SSD MobileNetV1)');
  } catch (err) {
    console.warn('[imageProcessor] Face detection unavailable, using attention strategy:', err.message);
    faceDetectionState = false;
  }
  return faceDetectionState;
}

// Call this at server startup to warm up the model
async function warmup() {
  return initFaceDetection();
}

async function detectFaces(imageBuffer) {
  const tensor = tf.node.decodeImage(imageBuffer, 3);
  try {
    const detections = await faceapi.detectAllFaces(
      tensor,
      new faceapi.SsdMobilenetv1Options({ minConfidence: 0.3 })
    );
    return detections;
  } finally {
    tensor.dispose();
  }
}

function selectBestFace(detections, imageWidth) {
  if (detections.length === 1) return detections[0];
  const centerX = imageWidth / 2;
  return detections.reduce((best, det) => {
    const b = det.box;
    const score = b.width * b.height - Math.abs(b.x + b.width / 2 - centerX) * 80;
    const bb = best.box;
    const bestScore = bb.width * bb.height - Math.abs(bb.x + bb.width / 2 - centerX) * 80;
    return score > bestScore ? det : best;
  });
}

function computeFaceCropBox(faceBox, imageWidth, imageHeight) {
  const { x: fx, y: fy, width: fw, height: fh } = faceBox;
  const faceCenterX = fx + fw / 2;
  const ratio = TARGET_WIDTH / TARGET_HEIGHT; // 2/3

  // Determine portrait dimensions from face size
  let ph = fh / FACE_HEIGHT_FRACTION;
  let pw = ph * ratio;

  // Constrain to image size
  if (pw > imageWidth) { pw = imageWidth; ph = pw / ratio; }
  if (ph > imageHeight) { ph = imageHeight; pw = ph * ratio; }

  // Position: 12% margin above forehead, centered horizontally on face
  let cropY = fy - HEAD_TOP_MARGIN * ph;
  let cropX = faceCenterX - pw / 2;

  // Ensure chin is included with a small margin
  const minBottom = fy + fh + CHIN_MARGIN * ph;
  if (cropY + ph < minBottom) cropY = minBottom - ph;

  // Clamp to image bounds
  cropY = Math.max(0, cropY);
  cropX = Math.max(0, cropX);
  if (cropX + pw > imageWidth) cropX = imageWidth - pw;
  if (cropY + ph > imageHeight) cropY = imageHeight - ph;

  // Final safety clamp (floating point edge cases)
  const left = Math.round(Math.max(0, cropX));
  const top = Math.round(Math.max(0, cropY));
  const width = Math.round(Math.min(pw, imageWidth - left));
  const height = Math.round(Math.min(ph, imageHeight - top));

  if (width < 50 || height < 75) return null; // degenerate box

  return { left, top, width, height };
}

/**
 * Process an uploaded guest photo:
 *   – Detect the main face and compute a smart crop
 *   – Resize to TARGET_WIDTH × TARGET_HEIGHT @ TARGET_DPI
 *   – Save as JPEG (overwrites source; changes extension if needed)
 *
 * Returns the final file path.
 */
async function processGuestPhoto(sourcePath) {
  const imageBuffer = fs.readFileSync(sourcePath);
  const { width, height } = await sharp(imageBuffer).metadata();

  let pipeline = sharp(imageBuffer);
  let faceUsed = false;

  const hasFaceDetection = await initFaceDetection();

  if (hasFaceDetection) {
    try {
      const detections = await detectFaces(imageBuffer);
      if (detections.length > 0) {
        const best = selectBestFace(detections, width);
        const cropBox = computeFaceCropBox(best.box, width, height);
        if (cropBox) {
          pipeline = pipeline.extract(cropBox);
          faceUsed = true;
          console.log(`[imageProcessor] ${detections.length} face(s) found – smart crop applied`);
        }
      } else {
        console.log('[imageProcessor] No face detected – falling back to attention crop');
      }
    } catch (err) {
      console.warn('[imageProcessor] Detection error, falling back:', err.message);
    }
  }

  // Resize to final dimensions
  pipeline = pipeline.resize(TARGET_WIDTH, TARGET_HEIGHT, {
    fit: 'cover',
    position: faceUsed ? 'center' : sharp.strategy.attention,
    kernel: sharp.kernel.lanczos3,
  });

  const outputBuffer = await pipeline
    .withMetadata({ density: TARGET_DPI })
    .jpeg({ quality: 92, chromaSubsampling: '4:4:4' })
    .toBuffer();

  // Always output as .jpg
  const outputPath = sourcePath.replace(/\.[^/.]+$/, '.jpg');
  fs.writeFileSync(outputPath, outputBuffer);

  // Remove original if extension changed
  if (outputPath !== sourcePath) {
    try { fs.unlinkSync(sourcePath); } catch (_) { /* ignore */ }
  }

  return outputPath;
}

module.exports = { processGuestPhoto, warmup };
