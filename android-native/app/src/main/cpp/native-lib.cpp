#include <jni.h>
#include <string>
#include <android/log.h>
#include "crypto_engine.h"
#include "audio_processor.h"

#define TAG "SunaoNative"
#define LOGI(...) __android_log_print(ANDROID_LOG_INFO, TAG, __VA_ARGS__)
#define LOGE(...) __android_log_print(ANDROID_LOG_ERROR, TAG, __VA_ARGS__)

static sunao::crypto::CryptoEngine gCryptoEngine;
static sunao::audio::AudioProcessor gAudioProcessor;

extern "C" {

JNIEXPORT jstring JNICALL
Java_com_sunao_app_webrtc_NativeBridge_getNativeEngineVersion(
        JNIEnv* env,
        jobject /* this */) {
    std::string version = "Sunao C++ Native Core v2.0 (NDK C++17)";
    LOGI("Native engine version requested: %s", version.c_str());
    return env->NewStringUTF(version.c_str());
}

JNIEXPORT jstring JNICALL
Java_com_sunao_app_webrtc_NativeBridge_encryptMessagePayload(
        JNIEnv* env,
        jobject /* this */,
        jstring text,
        jstring key) {
    const char* nativeText = env->GetStringUTFChars(text, nullptr);
    const char* nativeKey = env->GetStringUTFChars(key, nullptr);

    std::string cipher = gCryptoEngine.encryptPayload(nativeText, nativeKey);

    env->ReleaseStringUTFChars(text, nativeText);
    env->ReleaseStringUTFChars(key, nativeKey);
    return env->NewStringUTF(cipher.c_str());
}

JNIEXPORT jstring JNICALL
Java_com_sunao_app_webrtc_NativeBridge_decryptMessagePayload(
        JNIEnv* env,
        jobject /* this */,
        jstring cipher,
        jstring key) {
    const char* nativeCipher = env->GetStringUTFChars(cipher, nullptr);
    const char* nativeKey = env->GetStringUTFChars(key, nullptr);

    std::string plain = gCryptoEngine.decryptPayload(nativeCipher, nativeKey);

    env->ReleaseStringUTFChars(cipher, nativeCipher);
    env->ReleaseStringUTFChars(key, nativeKey);
    return env->NewStringUTF(plain.c_str());
}

JNIEXPORT jfloat JNICALL
Java_com_sunao_app_webrtc_NativeBridge_processAudioBuffer(
        JNIEnv* env,
        jobject /* this */,
        jshortArray pcmData,
        jint length,
        jfloat gain) {
    jshort* elements = env->GetShortArrayElements(pcmData, nullptr);
    
    gAudioProcessor.processPcmFrame(elements, length, gain, true);
    float rms = gAudioProcessor.calculateRmsPower(elements, length);

    env->ReleaseShortArrayElements(pcmData, elements, 0);
    return rms;
}

} // extern "C"
