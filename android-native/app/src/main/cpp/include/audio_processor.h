#ifndef SUNAO_AUDIO_PROCESSOR_H
#define SUNAO_AUDIO_PROCESSOR_H

#include <cstdint>
#include <vector>

namespace sunao {
namespace audio {

class AudioProcessor {
public:
    AudioProcessor();
    ~AudioProcessor();

    // Zero-lag 16-bit PCM voice processing for voice notes and WebRTC call stream
    void processPcmFrame(int16_t* pcmBuffer, int sampleCount, float gainFactor, bool noiseSuppress);
    
    // Instant calculate RMS audio power level for waveform visualization
    float calculateRmsPower(const int16_t* pcmBuffer, int sampleCount);
};

} // namespace audio
} // namespace sunao

#endif // SUNAO_AUDIO_PROCESSOR_H
