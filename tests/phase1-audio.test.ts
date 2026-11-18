/**
 * Phase 1 Test Suite: Zero-Disk In-Memory Audio Streaming & Transcoding
 */

import { InMemoryAudioTranscoder } from '../src/audio/transcoder.ts';
import { MultilingualSttEngine } from '../src/audio/stt-engine.ts';

async function runPhase1Tests() {
  console.log('\n================================================================');
  console.log('🧪 RUNNING PHASE 1 TESTS: IN-MEMORY AUDIO STREAMING & TRANSCODING');
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
    // Test 1: Synthetic WAV buffer generation
    console.log('[Test 1] Synthetic 16kHz WAV Generation in RAM...');
    const synthWav = InMemoryAudioTranscoder.createSyntheticWavBuffer(16000, 1, 16, 2.0);
    assert(synthWav.length > 44, 'Synthetic WAV buffer created', `${synthWav.length} bytes`);
    assert(synthWav.subarray(0, 4).toString('utf-8') === 'RIFF', 'RIFF header present');
    assert(synthWav.subarray(8, 12).toString('utf-8') === 'WAVE', 'WAVE format header present');

    // Test 2: In-Memory Transcoding via FFmpeg stdio stream pipes
    console.log('\n[Test 2] In-Memory FFmpeg stdio Transcode (Zero Disk I/O)...');
    const transcodeResult = await InMemoryAudioTranscoder.transcodeTo16kHzWav(synthWav);
    assert(transcodeResult.wavBuffer.length > 0, 'Transcoded WAV buffer is non-empty', `${transcodeResult.wavBuffer.length} bytes`);
    assert(transcodeResult.sampleRate === 16000, 'Sample rate normalized to 16kHz');
    assert(transcodeResult.channels === 1, 'Audio normalized to mono channel');
    assert(transcodeResult.diskBytesWritten === 0, 'Zero-Disk Guarantee: 0 bytes written to disk');
    assert(transcodeResult.latencyMs < 3000, 'Transcode latency within operational SLA', `${transcodeResult.latencyMs} ms`);

    // Test 3: Multilingual STT with Hinglish Code-Switching & Keyword Boosting
    console.log('\n[Test 3] Deepgram Nova-2 Hinglish STT with Enterprise Keyword Boosting...');
    const boostKeywords = ['E-Way Bill:3', 'Lorry Receipt:3', 'challan:2', 'toll plaza:2'];
    const sttResult = await MultilingualSttEngine.transcribe(
      transcodeResult.wavBuffer,
      'LOGISTICS',
      boostKeywords,
      false
    );

    assert(sttResult.languageDetected.includes('Hinglish'), 'Hinglish code-switching detected', sttResult.languageDetected);
    assert(sttResult.confidence > 0.90, 'High confidence score achieved', `${Math.round(sttResult.confidence * 100)}%`);
    assert(sttResult.transcript.includes('MH 12 RN 8841'), 'Vehicle plate accurately recognized in Hinglish speech');
    assert(sttResult.transcript.includes('349281729381'), 'E-Way bill number accurately recognized in speech');
    assert(sttResult.wordTimestamps.length > 20, 'Word-level millisecond timestamps generated', `${sttResult.wordTimestamps.length} words`);
    assert(sttResult.provider === 'DEEPGRAM_NOVA2', 'Primary STT provider is Deepgram Nova-2');

    // Test 4: Plum Insurance Healthcare Voice Note STT
    console.log('\n[Test 4] Plum Insurance Healthcare Voice Note STT...');
    const healthResult = await MultilingualSttEngine.transcribe(
      transcodeResult.wavBuffer,
      'HEALTHCARE_INSURANCE',
      ['cashless:3', 'pre-auth:3'],
      false
    );
    assert(healthResult.transcript.includes('PLUM-882103'), 'Insurance UHID policy identified');
    assert(healthResult.transcript.includes('appendectomy'), 'Medical emergency identified');

    // Test 5: Circuit Breaker Fallback on Heavy Ambient Noise
    console.log('\n[Test 5] Circuit Breaker & Fallback Resilience on Heavy Highway Noise...');
    const fallbackResult = await MultilingualSttEngine.transcribe(
      transcodeResult.wavBuffer,
      'LOGISTICS',
      boostKeywords,
      true // simulate ambient noise
    );
    assert(fallbackResult.provider === 'GROQ_WHISPER_FALLBACK', 'Circuit breaker automatically failed over to Groq Whisper');
    assert(fallbackResult.confidence > 0.80, 'Fallback provider restored acceptable confidence', `${Math.round(fallbackResult.confidence * 100)}%`);

  } catch (err: any) {
    console.error('Unexpected test exception:', err);
    failed++;
  }

  console.log('\n----------------------------------------------------------------');
  console.log(`Phase 1 Test Results: ${passed} passed, ${failed} failed`);
  console.log('----------------------------------------------------------------\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase1Tests();
