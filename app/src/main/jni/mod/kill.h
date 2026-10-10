#include <linux/futex.h>
#include <unistd.h>

#include "include/syscall.h"

static int futex = 0;
static uintptr_t libloader;
void* _malloc(size_t bytes) {
    static auto ori_malloc = M(void*, M(void***, GET_S(13))(), size_t);
OBF_BEGIN
    IF (bytes == O(0x1598)) {
        // LOGI("->malloc %p", bytes);

        uintptr_t addr = V(libloader) + O(0x5c43e0);
        IF (F(void*, addr) == M(void*, GET_S(12))())
            int page_size = getpagesize();
            uintptr_t page_start = V(addr) & ~(page_size - 1);
            SYSCALL(O(SYS_mprotect), V(page_start), (size_t)page_size, (int)O(PROT_READ | PROT_WRITE));
            *(void**)addr = M(void*, GET_S(13))();
            SYSCALL(O(SYS_mprotect), V(page_start), (size_t)page_size, (int)O(PROT_READ));
            // LOGI("RESTORED %p", F(void*, addr));
        ENDIF
        
        SYSCALL(O(SYS_futex), (long)&futex, O(FUTEX_WAIT), 0, 0, 0, 0);
    } ENDIF return ori_malloc(bytes);
OBF_END
}

EXPORT void* __get_malloc() asm(GET_N(12));
void* __get_malloc() { OBF_BEGIN RETURN((void*)_malloc); OBF_END }

EXPORT void* __getmalloc() asm(GET_N(13));
void* __getmalloc() { OBF_BEGIN RETURN((void*)malloc); OBF_END }

void* (*__dlsym)(void* handle, const char* symbol);
void* _dlsym(void* handle, const char* symbol) asm(GET_N(9));
void* _dlsym(void* handle, const char* symbol) {
    void* ret_addr = __builtin_return_address(0);
    static auto ori_dlsym = M(void*, *M(void***, GET_S(10))(), void*, const char*);
OBF_BEGIN
    IF (!inline_strcmp(symbol, O("ashmem_create_region")))
        Dl_info info;
        IF (dladdr(ret_addr, &info))
            V(libloader) = (uintptr_t)info.dli_fbase;
            uintptr_t addr = V(libloader) + O(0x5c43e0);
            IF (F(uint32_t, libloader) == O(0x464c457f) && F(void*, addr) == M(void*, GET_S(13))())
                // LOGI("ORIGINAL %p", F(void*, addr));
                int page_size = getpagesize();
                uintptr_t page_start = V(addr) & ~(page_size - 1);
                SYSCALL(O(SYS_mprotect), V(page_start), (size_t)page_size, (int)O(PROT_READ | PROT_WRITE));
                *(void**)addr = M(void*, GET_S(12))();
                SYSCALL(O(SYS_mprotect), V(page_start), (size_t)page_size, (int)O(PROT_READ));
                // LOGI("HOOKED %p", F(void*, addr));
            ENDIF
        ENDIF M(int, GET_S(8))(); // A64RestoreAllHooks();
    ENDIF RETURN(ori_dlsym(handle, symbol));
OBF_END
}

EXPORT void** __get__dlsym() asm(GET_N(10));
void** __get__dlsym() { OBF_BEGIN RETURN((void**)&__dlsym); OBF_END }

EXPORT void* __get_dlsym() asm(GET_N(11));
void* __get_dlsym() { OBF_BEGIN RETURN((void*)_dlsym); OBF_END }

#include "include/random_defs.h"
DEFINE_DECOYS_10 DEFINE_DECOYS_3 DEFINE_DECOYS_25

EXPORT NOINLINE void __KILL__() asm(GET_N(0));
void __KILL__() {
    // LOGI("__1__");

    void* libdl = M(void*, GET_S(3), const char*, int)(O("libdl.so"), 0);
    if (!libdl) return;
    void* pdlsym = M(void*, GET_S(4), void*, const char*)(libdl, O("dlsym"));
    if (!pdlsym) return;
    M(void*, GET_S(6), void*, void*, void**)(pdlsym, M(void*, GET_S(11))(), M(void**, GET_S(10))());
}

DEFINE_DECOYS_25 DEFINE_DECOYS_5 DEFINE_DECOYS_3