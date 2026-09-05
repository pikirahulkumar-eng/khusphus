cmake_minimum_required(VERSION 3.22.1)

project("sunao_native_core")

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

include_directories(src/main/cpp/include)

add_library(
    sunao_core
    SHARED
    src/main/cpp/native-lib.cpp
    src/main/cpp/crypto_engine.cpp
    src/main/cpp/audio_processor.cpp
)

find_library(log-lib log)
find_library(android-lib android)

target_link_libraries(
    sunao_core
    ${log-lib}
    ${android-lib}
)
