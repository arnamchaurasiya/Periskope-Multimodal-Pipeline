/**
 * Phase 2 Test Suite: Edge Image Preprocessing & Vision OCR Pipeline
 */

import { ImagePreprocessor } from '../src/vision/preprocessor.ts';
import { VisionOcrExtractor } from '../src/vision/ocr-extractor.ts';

async function runPhase2Tests() {
  console.log('\n================================================================');
  console.log('🧪 RUNNING PHASE 2 TESTS: EDGE IMAGE PREPROCESSING & VISION OCR');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName} ${detail ? `(${detail})` : ''}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName} ${detail ? `(${detail})` : ''}`);
      failed++;
    }
  }

  try {
    // Test 1: Image Preprocessing, Bounding & SHA-256 Hash
    console.log('[Test 1] Image Preprocessing & 2048px Dimension Clamping...');
    const syntheticReceipt = ImagePreprocessor.createSyntheticImageBuffer('TEST_LR_MANIFEST_001');
    assert(syntheticReceipt.length > 500, 'Synthetic image buffer created in RAM', `${syntheticReceipt.length} bytes`);

    const preprocessed = await ImagePreprocessor.preprocess(syntheticReceipt);
    assert(preprocessed.sha256Hash.length === 64, 'Deterministic SHA-256 hash computed', preprocessed.sha256Hash.substring(0, 16) + '...');
    assert(preprocessed.contrastEnhanced === true, 'Adaptive contrast equalization applied');
    assert(preprocessed.latencyMs < 100, 'Preprocessing completed within operational SLA', `${preprocessed.latencyMs} ms`);

    // Test 2: Structured Document OCR Extraction (Logistics Lorry Receipt)
    console.log('\n[Test 2] Structured OCR Extraction for Logistics Lorry Receipt (LR)...');
    const ocrResult = await VisionOcrExtractor.extractFromImage(syntheticReceipt, 'LOGISTICS');
    assert(ocrResult.fromCache === false, 'First call: extracted via Vision pipeline');
    assert(ocrResult.payload.mediaType === 'IMAGE_DOCUMENT', 'Media type correctly classified as IMAGE_DOCUMENT');
    assert(ocrResult.payload.entities.trackingOrLRNumbers?.[0] === 'LR-88219', 'Lorry Receipt number extracted', ocrResult.payload.entities.trackingOrLRNumbers?.[0]);
    assert(ocrResult.payload.entities.vehiclePlateNumbers?.[0] === 'MH-04-AB-1234', 'Vehicle registration plate extracted', ocrResult.payload.entities.vehiclePlateNumbers?.[0]);
    assert(ocrResult.payload.entities.financialAmounts?.[0]?.amount === 42500, 'Freight amount accurately extracted', `INR ${ocrResult.payload.entities.financialAmounts?.[0]?.amount}`);
    assert(ocrResult.payload.recommendedActions.length >= 2, 'Actionable CTAs generated', `${ocrResult.payload.recommendedActions.length} CTAs`);

    // Test 3: Deduplication & Redis/Memory OCR Caching
    console.log('\n[Test 3] Media Deduplication & Instant Cache Retrieval (<5ms)...');
    const cachedResult = await VisionOcrExtractor.extractFromImage(syntheticReceipt, 'LOGISTICS');
    assert(cachedResult.fromCache === true, 'Duplicate forwarded image recognized via SHA-256');
    assert(cachedResult.latencyMs < 15, 'Cached extraction returned instantly', `${cachedResult.latencyMs} ms`);
    assert(cachedResult.payload.entities.trackingOrLRNumbers?.[0] === 'LR-88219', 'Cached payload data integrity verified');

    // Test 4: Healthcare Discharge Summary Extraction
    console.log('\n[Test 4] Healthcare Discharge Summary & Cashless Pre-Auth OCR...');
    const medicalReceipt = ImagePreprocessor.createSyntheticImageBuffer('HOSPITAL_DISCHARGE_SUMMARY');
    const medicalResult = await VisionOcrExtractor.extractFromImage(medicalReceipt, 'HEALTHCARE_INSURANCE');
    assert(medicalResult.payload.domainCategory === 'HEALTHCARE_INSURANCE', 'Domain categorized as HEALTHCARE_INSURANCE');
    assert(medicalResult.payload.urgencyLevel === 'CRITICAL', 'Emergency admission flagged with CRITICAL urgency');
    assert(medicalResult.payload.entities.policyOrUHIDNumbers?.[0] === 'PLUM-882103', 'Employee insurance UHID policy extracted');
    assert(medicalResult.payload.entities.locations?.[0] === 'Apollo Hospital Mumbai', 'Hospital location accurately resolved');

  } catch (err: any) {
    console.error('Unexpected test exception:', err);
    failed++;
  }

  console.log('\n----------------------------------------------------------------');
  console.log(`Phase 2 Test Results: ${passed} passed, ${failed} failed`);
  console.log('----------------------------------------------------------------\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase2Tests();
