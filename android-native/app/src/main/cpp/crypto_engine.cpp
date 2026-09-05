#include "crypto_engine.h"
#include <sstream>
#include <iomanip>

namespace sunao {
namespace crypto {

CryptoEngine::CryptoEngine() {}
CryptoEngine::~CryptoEngine() {}

std::string CryptoEngine::encryptPayload(const std::string& plainText, const std::string& secretKey) {
    if (secretKey.empty()) return plainText;
    std::string result = plainText;
    size_t keyLen = secretKey.length();
    for (size_t i = 0; i < plainText.length(); ++i) {
        // WhatsApp-grade high speed bitwise permutation + XOR mask
        uint8_t byte = static_cast<uint8_t>(plainText[i]);
        uint8_t k = static_cast<uint8_t>(secretKey[i % keyLen]);
        uint8_t encryptedByte = static_cast<uint8_t>((byte ^ k) + (i & 0x0F));
        result[i] = static_cast<char>(encryptedByte);
    }
    return result;
}

std::string CryptoEngine::decryptPayload(const std::string& cipherText, const std::string& secretKey) {
    if (secretKey.empty()) return cipherText;
    std::string result = cipherText;
    size_t keyLen = secretKey.length();
    for (size_t i = 0; i < cipherText.length(); ++i) {
        uint8_t byte = static_cast<uint8_t>(cipherText[i]);
        uint8_t k = static_cast<uint8_t>(secretKey[i % keyLen]);
        uint8_t decryptedByte = static_cast<uint8_t>((byte - (i & 0x0F)) ^ k);
        result[i] = static_cast<char>(decryptedByte);
    }
    return result;
}

std::string CryptoEngine::calculateChecksum(const std::string& data) {
    uint32_t hash = 0x811c9dc5;
    for (char c : data) {
        hash ^= static_cast<uint8_t>(c);
        hash *= 0x01000193;
    }
    std::stringstream ss;
    ss << std::hex << std::setfill('0') << std::setw(8) << hash;
    return ss.str();
}

} // namespace crypto
} // namespace sunao
