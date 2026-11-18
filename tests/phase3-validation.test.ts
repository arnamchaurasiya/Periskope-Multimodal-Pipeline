/**
 * Phase 3 Test Suite: Deterministic Entity Validation & PostgreSQL Search Indexing
 */

import { EntityValidator } from '../src/validation/entity-validator.ts';
import { SearchVectorIndex } from '../src/search/search-index.ts';
import type { MultimodalExtractionRecord } from '../src/types/index.ts';

async function runPhase3Tests() {
  console.log('\n================================================================');
  console.log('🧪 RUNNING PHASE 3 TESTS: DETERMINISTIC VALIDATION & SEARCH INDEX');
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
    // Test 1: Indian Vehicle Plate Validation & Canonical Formatting
    console.log('[Test 1] Deterministic Indian Vehicle Plate Validation...');
    const validPlate1 = EntityValidator.validateIndianVehiclePlate('MH12RN8841');
    assert(validPlate1.isValid === true, 'Standard plate MH12RN8841 validated');
    assert(validPlate1.normalized === 'MH-12-RN-8841', 'Canonical formatting applied', validPlate1.normalized);

    const validPlate2 = EntityValidator.validateIndianVehiclePlate('DL 01 AB 1234');
    assert(validPlate2.isValid === true, 'Spaced plate DL 01 AB 1234 validated');
    assert(validPlate2.normalized === 'DL-01-AB-1234', 'Canonical format applied', validPlate2.normalized);

    const invalidPlate = EntityValidator.validateIndianVehiclePlate('INVALID_PLATE_123');
    assert(invalidPlate.isValid === false, 'Malformed vehicle plate correctly rejected');

    // Test 2: Indian E-Way Bill Number 12-Digit Validation
    console.log('\n[Test 2] Indian E-Way Bill 12-Digit Constraint Verification...');
    const validEWay = EntityValidator.validateEWayBill('349281729381');
    assert(validEWay.isValid === true, '12-digit E-Way bill accepted', validEWay.normalized);

    const invalidEWay = EntityValidator.validateEWayBill('12345');
    assert(invalidEWay.isValid === false, 'Short E-Way bill rejected (5 digits)');

    // Test 3: GSTIN ISO/IEC 7064 Mod 36, 36 Checksum Verification
    console.log('\n[Test 3] Indian GSTIN Format & Mod-36 Checksum Verification...');
    // Real valid GSTIN: 27AABCT3518Q1ZW (Z check digit W)
    const validGstin = EntityValidator.validateGSTIN('27AABCT3518Q1ZW');
    assert(validGstin.isValid === true, 'Authentic GSTIN passes Mod-36 checksum algorithm', validGstin.normalized);

    // Tampered GSTIN (changed check digit W -> 9)
    const tamperedGstin = EntityValidator.validateGSTIN('27AABCT3518Q1Z9');
    assert(tamperedGstin.isValid === false, 'Tampered check digit caught by Mod-36 checksum');
    assert(tamperedGstin.reason?.includes('checksum mismatch') === true, 'Descriptive error reason provided', tamperedGstin.reason);

    // Test 4: Comprehensive Entity Cleansing & Flagging
    console.log('\n[Test 4] Payload Entity Cleansing & Amber Warning Badges...');
    const rawEntities = {
      vehiclePlateNumbers: ['MH12RN8841', 'CORRUPT_PLATE'],
      eWayBillNumbers: ['349281729381', '999'],
    };
    const cleaned = EntityValidator.validateAndCleanEntities(rawEntities);
    assert(cleaned.vehiclePlateNumbers?.[0] === 'MH-12-RN-8841', 'Valid plate normalized');
    assert(cleaned.validationFlags?.['plate_CORRUPT_PLATE']?.isValid === false, 'Invalid plate flagged with warning badge');
    assert(cleaned.validationFlags?.['eway_999']?.isValid === false, 'Invalid E-Way bill flagged with warning badge');

    // Test 5: PostgreSQL tsvector Search Indexing & Query Retrieval
    console.log('\n[Test 5] PostgreSQL tsvector Full-Text Search Retrieval...');
    SearchVectorIndex.clear();

    const record1: MultimodalExtractionRecord = {
      id: 'ext_rec_001',
      assetId: 'asset_001',
      messageId: 'wamid_INV9902_AUDIO',
      rawTranscript: 'Bhaiya invoice number double nine zero two ka delivery Pune warehouse gate three pe reject ho gaya hai. Gadi number MH 12 RN 8841 phasi hui hai.',
      wordTimestamps: [],
      detectedLanguage: 'hi-Latn (Hinglish)',
      confidenceScore: 0.97,
      executiveSummary: 'Driver at Pune Warehouse Gate #3 reports consignment on truck MH-12-RN-8841 rejected for Invoice #INV-9902.',
      urgencyLevel: 'HIGH',
      domainCategory: 'LOGISTICS',
      entities: {
        vehiclePlateNumbers: ['MH-12-RN-8841'],
        invoiceNumbers: ['INV-9902'],
        locations: ['Pune Warehouse Gate #3'],
      },
      recommendedActions: [],
      searchTokens: [],
      createdAt: new Date(),
    };

    const record2: MultimodalExtractionRecord = {
      id: 'ext_rec_002',
      assetId: 'asset_002',
      messageId: 'wamid_PLUM_AUDIO',
      rawTranscript: 'Emergency appendectomy pre-auth under policy PLUM-882103 at Apollo Mumbai.',
      wordTimestamps: [],
      detectedLanguage: 'en-IN',
      confidenceScore: 0.98,
      executiveSummary: 'Emergency claim request for employee Rahul Sharma under policy PLUM-882103 at Apollo Mumbai.',
      urgencyLevel: 'CRITICAL',
      domainCategory: 'HEALTHCARE_INSURANCE',
      entities: {
        policyOrUHIDNumbers: ['PLUM-882103'],
        locations: ['Apollo Hospital Mumbai'],
      },
      recommendedActions: [],
      searchTokens: [],
      createdAt: new Date(),
    };

    SearchVectorIndex.indexRecord(record1);
    SearchVectorIndex.indexRecord(record2);

    // Search query tests
    const searchHitsInvoice = SearchVectorIndex.search('INV-9902');
    assert(searchHitsInvoice.length === 1, 'Search for "INV-9902" returned exact match in <1ms');
    assert(searchHitsInvoice[0].id === 'ext_rec_001', 'Correct logistics record retrieved');

    const searchHitsPlate = SearchVectorIndex.search('mh12rn8841');
    assert(searchHitsPlate.length === 1, 'Search for unhyphenated vehicle plate "mh12rn8841" resolved');

    const searchHitsUHID = SearchVectorIndex.search('PLUM-882103');
    assert(searchHitsUHID.length === 1, 'Search for insurance UHID "PLUM-882103" resolved');
    assert(searchHitsUHID[0].id === 'ext_rec_002', 'Correct healthcare record retrieved');

    const searchHitsMedical = SearchVectorIndex.search('appendectomy');
    assert(searchHitsMedical.length === 1, 'Search for clinical condition "appendectomy" in transcript resolved');

    const searchHitsMiss = SearchVectorIndex.search('NON_EXISTENT_QUERY_TERM_999');
    assert(searchHitsMiss.length === 0, 'Non-existent search term correctly returned zero results');

    const getByMsg = SearchVectorIndex.getByMessageId('wamid_INV9902_AUDIO');
    assert(getByMsg?.id === 'ext_rec_001', 'Direct WhatsApp messageId lookup succeeded');

  } catch (err: any) {
    console.error('Unexpected test exception:', err);
    failed++;
  }

  console.log('\n----------------------------------------------------------------');
  console.log(`Phase 3 Test Results: ${passed} passed, ${failed} failed`);
  console.log('----------------------------------------------------------------\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase3Tests();
