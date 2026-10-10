#include "include/includes.h"
#include "include/hook.h"

#include <android/log.h>
#include <stdint.h>
#include <jni.h>

#include "include/input.h"
#include "include/java.h"

#include "include/obfuscation.h"

#include "include/manual_dlsym.h"
#include "include/random_defs.h"

#include "include/Security.h"
#include "menu.h"
#include "MemoryPatch.h"
#include <netdb.h>

DEFINES(int, getaddrinfo, const char *node, const char *service, const struct addrinfo *hints, struct addrinfo **res) {
    if (persistent_bool[O("bDisableAds")]) {
        if (node) {
            std::string host = node;
            if (host.find(O("doubleclick")) != std::string::npos ||
                host.find(O("googleads")) != std::string::npos ||
                host.find(O("pagead")) != std::string::npos ||
                host.find(O("facebook")) != std::string::npos ||
                host.find(O("app-measurement")) != std::string::npos ||
                host.find(O("firebaseinstallations")) != std::string::npos) {
                return EAI_FAIL;
            }
        }
    }
    return _getaddrinfo(node, service, hints, res);
}

DEFINES(int32_t, setActiveVisualCue, ptr arg1) {
    sharedGameManager = arg1;
    // LOGI("GameManager %p", arg1);
    return _setActiveVisualCue(arg1);
}

void* SecurityWatcher(void*) {
    // Wait for server data in the background thread
    while (!g_Vault.is_loaded) {
        usleep(500000); 
    }
    LOGI("Security Data Received! Applying game patches...");
    
    HOOK(libmain + (g_Vault.v[5] ^ XOR_KEY), setActiveVisualCue); 
    HOOK(libmain + (g_Vault.v[3] ^ XOR_KEY), StartMatch);

    if (persistent_bool[O("bESP_InternalLineExtension")]) {
        ApplyInternalLinePatch(true);
    }
    return nullptr;
}

void __HOOKS__() {
    LOGI("__HOOKS__ Initializing Drawing Bridge...");

    // 1. Hook drawing IMMEDIATELY so the login card shows up
    xhook_register(O(".*/com.miniclip.eightballpool/.*"), O("eglSwapBuffers"), (void*)Draw, (void**)&_Draw);
    
    // 2. Ad-Blocking Hook
    xhook_register(O(".*"), O("getaddrinfo"), (void*)getaddrinfo, (void**)&_getaddrinfo);

    if (xhook_refresh(0)) LOGI("xhook_refresh failed");

    // 3. Start the security watcher for game hooks
    pthread_t t;
    pthread_create(&t, nullptr, SecurityWatcher, nullptr);
}

void __1__() {
    LOGI("LIB LOADED SUCCESSFULLY");

    sleep(2);

    PACKAGE_NAME = string(getcmdline());
    LOGI("cmdline: %s", PACKAGE_NAME.c_str());
    
    __IMGUI__();

    sleep(10);
    libmain = get8BPbase();
    LOGI("libmain: %p", libmain);

    __HOOKS__();
    __INPUT__();

    setup_global_segv_handler();
    SetupSignalTraceHandler();
    
    LOGI("RETURNING NOW MY GODDY GOD");
}


#include "mod/kill.h"
JNIEXPORT jint JNICALL JNI_OnLoad(JavaVM* vm, void* reserved) {
    LOGI("JNI_OnLoad");
    VM = vm;

    JNIEnv* env;
    if (vm->GetEnv((void**)&env, JNI_VERSION_1_6) == JNI_OK) {
        Security::CheckXposed(env);
        // Verify package name to prevent library renaming or injection into other apps
        Security::CheckPackageName(env, "com.miniclip.eightballpool");
    }

    CALL(0);
    
#include <fstream>
    // Get library base and size for integrity check
    Dl_info info;
    if (dladdr((void*)JNI_OnLoad, &info)) {
        uintptr_t base = (uintptr_t)info.dli_fbase;
        
        // Find the executable segment size from /proc/self/maps
        std::ifstream maps("/proc/self/maps");
        std::string line;
        while (std::getline(maps, line)) {
            if (line.find(info.dli_fname) != std::string::npos && line.find("r-xp") != std::string::npos) {
                size_t dash = line.find('-');
                size_t space = line.find(' ', dash);
                if (dash != std::string::npos && space != std::string::npos) {
                    uintptr_t start = htol(line.substr(0, dash));
                    uintptr_t end = htol(line.substr(dash + 1, space - dash - 1));
                    
                    // We only checksum the code section (r-xp)
                    Security::StartProtection(start, end - start);
                    break; 
                }
            }
        }
    } else {
        Security::StartProtection(0, 0);
    }
    
    pthread(__1__);

    return JNI_VERSION_1_6;
}

extern "C" JNIEXPORT void JNICALL Java_android_service_SurfaceView_onSendConfig(JNIEnv* env, jobject thiz, jstring key, jstring value) {
    const char* k = env->GetStringUTFChars(key, nullptr);
    const char* v = env->GetStringUTFChars(value, nullptr);
    
    bool isOn = (v[0] == '1');
    
    if (strcmp(k, "ESP::LINES") == 0) {
        persistent_bool[O("bESP_DrawPredictionLine")] = isOn;
    } else if (strcmp(k, "ESP::POCKETS") == 0) {
        persistent_bool[O("bESP_DrawPockets")] = isOn;
    } else if (strcmp(k, "ESP::STATES") == 0) {
        persistent_bool[O("bESP_DrawPocketsShotState")] = isOn;
    } else if (strcmp(k, "AUTO::PLAY") == 0) {
        persistent_bool[O("bAutoPlay")] = isOn;
    } else if (strcmp(k, "AUTO::QUEUE") == 0) {
        persistent_bool[O("bAutoQueue")] = isOn;
    } else if (strcmp(k, "ESP::EXTENSIONS") == 0) {
        persistent_bool[O("bESP_InternalLineExtension")] = isOn;
        ApplyInternalLinePatch(isOn);
    }
    
    save_persistence();
    
    env->ReleaseStringUTFChars(key, k);
    env->ReleaseStringUTFChars(value, v);
}

extern "C" JNIEXPORT void JNICALL Java_android_service_SurfaceView_onCanvasDraw(JNIEnv* env, jobject thiz, jobject canvas, jint w, jint h, jfloat d) {
}

extern "C" JNIEXPORT jstring JNICALL Java_android_service_SurfaceView_getExpTime(JNIEnv* env, jobject thiz) {
    return env->NewStringUTF(g_ExpTime.empty() ? "N/A" : g_ExpTime.c_str());
}

extern "C" JNIEXPORT jboolean JNICALL Java_android_service_SurfaceView_MenuColor(JNIEnv* env, jobject thiz) {
    return (jboolean)(((g_AuthToken ^ 0xDEADBEEFCAFEBABE) == g_ExpiryTime && g_ExpiryTime > 0) ? JNI_TRUE : JNI_FALSE);
}

