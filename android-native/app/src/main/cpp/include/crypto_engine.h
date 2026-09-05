#ifndef SUNAO_CRYPTO_ENGINE_H
#define SUNAO_CRYPTO_ENGINE_H

#include <string>
#include <vector>
#include <cstdint>

namespace sunao {
namespace crypto {

class CryptoEngine {
public:
    CryptoEngine();
    ~CryptoEngine();

    // Fast symmetric XOR/AES-like block cipher for zero-latency in-memory message framing
    std::string encryptPayload(const std::string& plainText, const std::string& secretKey);
    std::string decryptPayload(const std::string& cipherText, const std::string& secretKey);
    
    // Cryptographic hash for message integrity (HMAC-SHA256 simulation)
    std::string calculateChecksum(const std::string& data);
};

} // namespace crypto
} // namespace sunao

#endif // SUNAO_CRYPTO_ENGINE_H
