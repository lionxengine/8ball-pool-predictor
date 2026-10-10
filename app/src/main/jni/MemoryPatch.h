#pragma once

#include <stdint.h>
#include <unistd.h>
#include <sys/mman.h>
#include <string.h>
#include <stdio.h>
#include "include/includes.h"

// --- [ OFFSETS SECTION - Version 56.19.0 ] ---
// --- [ MEMORY PATCHING TOOL ] ---
inline void patch_memory(uintptr_t absolute_address, double value) {
    if (!absolute_address) return;
    
    uintptr_t page_size = getpagesize();
    uintptr_t page_start = absolute_address & ~(page_size - 1);
    
    // Unlock memory protection
    if (mprotect((void *)page_start, page_size, PROT_READ | PROT_WRITE | PROT_EXEC) == 0) {
        // Write the new double value
        *(double *)(absolute_address) = value;
        // LOGI("Memory Patched: %p -> %f", (void*)absolute_address, value);
    } else {
        LOGE("Failed to mprotect: %p", (void*)absolute_address);
    }
}

// --- [ APPLY MOD FUNCTION ] ---
inline void ApplyInternalLinePatch(bool active) {
    if (!libmain || !g_Vault.is_loaded) {
        LOGE("ApplyInternalLinePatch: libmain or g_Vault not ready!");
        return;
    }

    if ((g_Vault.v[9] ^ XOR_KEY) == 0) return; // Prevent crash if Internal Line offsets are missing

    if (active) {
        LOGI("Applying Internal Line Extension (Scrambled Vault)...");
        patch_memory(libmain + (g_Vault.v[9] ^ XOR_KEY), 1000.0);
        patch_memory(libmain + (g_Vault.v[1] ^ XOR_KEY), 0.0);
        patch_memory(libmain + (g_Vault.v[6] ^ XOR_KEY), 0.00000000001);
    } else {
        LOGI("Reverting Internal Line Extension...");
        patch_memory(libmain + (g_Vault.v[9] ^ XOR_KEY), 2.0);
        patch_memory(libmain + (g_Vault.v[1] ^ XOR_KEY), 0.0);
        patch_memory(libmain + (g_Vault.v[6] ^ XOR_KEY), 0.00001); 
    }
}
