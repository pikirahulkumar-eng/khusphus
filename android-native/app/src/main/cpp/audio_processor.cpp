#include "audio_processor.h"
#include <cmath>
#include <algorithm>

namespace sunao {
namespace audio {

AudioProcessor::AudioProcessor() {}
AudioProcessor::~AudioProcessor() {}

void AudioProcessor::processPcmFrame(int16_t* pcmBuffer, int sampleCount, float gainFactor, bool noiseSuppress) {
    if (!pcmBuffer || sampleCount <= 0) return;

    for (int i = 0; i < sampleCount; ++i) {
        int32_t sample = pcmBuffer[i];

        // Software Noise Gate (Zero-latency threshold cutoff)
        if (noiseSuppress && std::abs(sample) < 320) {
            pcmBuffer[i] = 0;
            continue;
        }

        // Automatic Gain Control (AGC) scaling
        sample = static_cast<int32_t>(sample * gainFactor);

        // Hardware audio clamping (Prevent distortion clipping)
        if (sample > 32767) sample = 32767;
        else if (sample < -32768) sample = -32768;

        pcmBuffer[i] = static_cast<int16_t>(sample);
    }
}

float AudioProcessor::calculateRmsPower(const int16_t* pcmBuffer, int sampleCount) {
    if (!pcmBuffer || sampleCount <= 0) return 0.0f;
    double sum = 0.0;
    for (int i = 0; i < sampleCount; ++i) {
        sum += pcmBuffer[i] * pcmBuffer[i];
    }
    double mean = sum / sampleCount;
    return static_cast<float>(std::sqrt(mean) / 32768.0);
}

} // namespace audio
} // namespace sunao
