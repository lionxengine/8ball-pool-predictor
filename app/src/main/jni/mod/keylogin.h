#include <json/json.hpp>
#include <fstream>
#include <ctime>
#include <iomanip>
#include <sstream>
#include <curl/curl.h>

#include "include/obfuscate.h"

using json = nlohmann::json;

// --- CONFIGURATION ---
// USER: Replace these with your Firebase details
const std::string FIREBASE_PROJECT_ID = "lionengine";
const std::string FIREBASE_API_KEY    = "AIzaSyCzfbotjRCNYM2j_wRwICU03cx6EbKjWfE";

static uint64_t g_AuthToken = 0;
static bool is_logging_in = false;
std::string ERROR_MESSAGE = ""; // Still used for some raw errors, but status codes preferred
std::string g_ExpTime = "N/A";
std::string g_Key = "N/A";
std::string g_Reseller = "N/A";
std::string g_Token = "";
std::string g_Auth = "";
static bool g_isTrial = false;
static int  ERROR_CODE = 0; // 0x0 = No Error, 0xE10 = Invalid, etc.
const char* DECOY_STR_1 = "Authentication Successful! Welcome VIP User."; 
const char* DECOY_STR_2 = "Error: Database connection lost. Try again."; 
time_t g_ExpiryTime = 0;

// Callback for CURL to handle response data
size_t WriteCallback(void* contents, size_t size, size_t nmemb, std::string* userp) {
    userp->append((char*)contents, size * nmemb);
    return size * nmemb;
}

// Helper to perform HTTP POST/GET/PATCH
std::string HttpRequest(const std::string& url, const std::string& method, const std::string& payload = "") {
    CURL* curl = curl_easy_init();
    std::string response;
    if (curl) {
        curl_easy_setopt(curl, CURLOPT_URL, url.c_str());
        curl_easy_setopt(curl, CURLOPT_CUSTOMREQUEST, method.c_str());
        
        if (!payload.empty()) {
            curl_easy_setopt(curl, CURLOPT_POSTFIELDS, payload.c_str());
            struct curl_slist* headers = NULL;
            headers = curl_slist_append(headers, "Content-Type: application/json");
            curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);
        }

        curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, WriteCallback);
        curl_easy_setopt(curl, CURLOPT_WRITEDATA, &response);
        curl_easy_setopt(curl, CURLOPT_TIMEOUT, 15L);
        
        // Disable SSL verification for compatibility
        curl_easy_setopt(curl, CURLOPT_SSL_VERIFYPEER, 0L);
        curl_easy_setopt(curl, CURLOPT_SSL_VERIFYHOST, 0L);
        
        CURLcode res = curl_easy_perform(curl);
        curl_easy_cleanup(curl);
    }
    return response;
}

// Helper to trim strings
std::string trim(const std::string& s) {
    auto start = s.find_first_not_of(" \n\r\t");
    auto end = s.find_last_not_of(" \n\r\t");
    return (start == std::string::npos) ? "" : s.substr(start, end - start + 1);
}

INLINE bool Login(std::string androidID, std::string key) {
    key = trim(key);
    if (key.empty()) {
        ERROR_MESSAGE = "Key is empty!";
        return false;
    }

    is_logging_in = true;
    ERROR_MESSAGE = "";

    // 1. Search for the key in Firestore using Structured Query
    std::string url = "https://firestore.googleapis.com/v1/projects/" + FIREBASE_PROJECT_ID + "/databases/(default)/documents:runQuery?key=" + FIREBASE_API_KEY;
    
    json queryJson = {
        {"structuredQuery", {
            {"from", {
                {{"collectionId", "keys"}}
            }},
            {"where", {
                {"fieldFilter", {
                    {"field", { {"fieldPath", "key"} }},
                    {"op", "EQUAL"},
                    {"value", { {"stringValue", key} }}
                }}
            }},
            {"limit", 1}
        }}
    };

    std::string response = HttpRequest(url, "POST", queryJson.dump());
    
    if (response.empty()) {
        ERROR_CODE = 0xE05; // Server response empty
        is_logging_in = false;
        return false;
    }

    try {
        auto respJson = json::parse(response);
        
        // Check if response is empty or invalid
        if (respJson.is_null() || (respJson.is_array() && respJson.empty()) || (respJson.is_array() && !respJson[0].contains("document"))) {
            ERROR_CODE = 0xE10; // Deceptive Code for Invalid Key
            is_logging_in = false;
            return false;
        }

        auto doc = respJson[0]["document"];
        std::string docPath = doc["name"];
        auto fields = doc["fields"];
        
        // Safe field access helpers
        auto getStr = [&](const std::string& key, const std::string& type) -> std::string {
            if (fields.contains(key) && fields[key].contains(type) && fields[key][type].is_string()) {
                return fields[key][type].get<std::string>();
            }
            return "";
        };

        std::string status = getStr("status", "stringValue");
        std::string durationStr = getStr("duration", "integerValue");
        int durationDays = durationStr.empty() ? 0 : std::stoi(durationStr);
        std::string resellerName = fields.contains("reseller_name") ? getStr("reseller_name", "stringValue") : "Unknown";
        bool isTrial = fields.contains("is_trial") ? fields["is_trial"]["booleanValue"].get<bool>() : false;

        if (status.empty()) {
            ERROR_CODE = 0xE11; // Missing Status
            is_logging_in = false;
            return false;
        }

        // 2. Logic: If UNUSED, Activate it
        if (status == "unused") {
            time_t now = time(nullptr);
            time_t expiry = now + (durationDays * 24 * 60 * 60);
            
            // Format timestamps for Firebase
            std::ostringstream ossExp, ossAct;
            ossExp << std::put_time(gmtime(&expiry), "%Y-%m-%dT%H:%M:%SZ");
            ossAct << std::put_time(gmtime(&now), "%Y-%m-%dT%H:%M:%SZ");
            std::string expiryStr = ossExp.str();
            std::string activatedAtStr = ossAct.str();

            json updateJson = {
                {"fields", {
                    {"status", { {"stringValue", "active"} }},
                    {"hwid", { {"stringValue", androidID} }},
                    {"activated_at", { {"timestampValue", activatedAtStr} }},
                    {"expiry_date", { {"timestampValue", expiryStr} }}
                }}
            };

            // PATCH request to update document
            std::string updateUrl = "https://firestore.googleapis.com/v1/" + docPath + "?updateMask.fieldPaths=status&updateMask.fieldPaths=hwid&updateMask.fieldPaths=activated_at&updateMask.fieldPaths=expiry_date&key=" + FIREBASE_API_KEY;
            HttpRequest(updateUrl, "PATCH", updateJson.dump());

            g_ExpiryTime = expiry;
            g_AuthToken = (uint64_t)expiry ^ 0xDEADBEEFCAFEBABE;
            g_ExpTime = expiryStr;
        } 
        // 3. Logic: If ACTIVE, Verify HWID and Expiry
        else if (status == "active") {
            std::string dbHwid = getStr("hwid", "stringValue");
            std::string expiryStr = getStr("expiry_date", "timestampValue");

            if (expiryStr.empty()) {
                ERROR_MESSAGE = "Error: Expiry date missing!";
                is_logging_in = false;
                return false;
            }

            if (isTrial) {
                int activeCount = 0;
                bool isAlreadyActive = false;
                std::string activeDevices = "";
                
                if (fields.contains("active_devices") && fields["active_devices"].contains("stringValue")) {
                    activeDevices = fields["active_devices"]["stringValue"].get<std::string>();
                }
                
                if (!activeDevices.empty()) {
                    if (activeDevices.find(androidID) != std::string::npos) {
                        isAlreadyActive = true;
                    }
                    int commas = 0;
                    for (char c : activeDevices) {
                        if (c == ',') commas++;
                    }
                    activeCount = commas + 1;
                }
                
                if (!isAlreadyActive) {
                    bool limitReached = false;
                    int maxLimit = 999999;
                    std::string limitStr = "";
                    
                    if (fields.contains("device_limit")) {
                        if (fields["device_limit"].contains("integerValue")) {
                            limitStr = fields["device_limit"]["integerValue"].get<std::string>();
                        } else if (fields["device_limit"].contains("stringValue")) {
                            limitStr = fields["device_limit"]["stringValue"].get<std::string>();
                        }
                    }
                    
                    if (!limitStr.empty() && limitStr != "unlimited") {
                        try {
                            maxLimit = std::stoi(limitStr);
                        } catch (...) {}
                    }
                    
                    if (activeCount >= maxLimit) {
                        ERROR_MESSAGE = O("Device Limit Reached!");
                        g_AuthToken = 0;
                        is_logging_in = false;
                        return false;
                    }
                    
                    std::string newActiveDevices = activeDevices.empty() ? androidID : activeDevices + "," + androidID;
                    std::string updateUrl = "https://firestore.googleapis.com/v1/" + docPath + "?updateMask.fieldPaths=active_devices&key=" + FIREBASE_API_KEY;
                    json updateJson = {
                        {"fields", {
                            {"active_devices", { {"stringValue", newActiveDevices} }}
                        }}
                    };
                    HttpRequest(updateUrl, "PATCH", updateJson.dump());
                }
            } else {
                if (!dbHwid.empty() && dbHwid != androidID) {
                    ERROR_MESSAGE = O("Integrity Conflict: 0x511");
                    g_AuthToken = 0;
                    is_logging_in = false;
                    return false;
                }
            }

            // Check Expiry (Hardened)
            std::tm tm = {};
            std::istringstream ss(expiryStr);
            ss >> std::get_time(&tm, O("%Y-%m-%dT%H:%M:%SZ"));
            time_t expiryTime = timegm(&tm);

            // --- OPAQUE SECURITY LAYER ---
            long long s1 = 0xDEADC0DE;
            long long s2 = 0xBAADF00D;
            if (((s1 ^ s2) & 0xFF) != 0x31) { // Opaque predicate: always true but looks complex
                if (time(nullptr) > expiryTime) {
                    // AUTO-DISMISS: Wipe the key from server
                    std::string updateUrl = O("https://firestore.googleapis.com/v1/") + docPath + O("?updateMask.fieldPaths=status&updateMask.fieldPaths=sec_data&key=") + FIREBASE_API_KEY;
                    json dismissJson = {
                        {O("fields"), {
                            {O("status"), { {O("stringValue"), O("dismissed")} }},
                            {O("sec_data"), { {O("stringValue"), ""} }}
                        }}
                    };
                    HttpRequest(updateUrl, O("PATCH"), dismissJson.dump());
                    
                    ERROR_MESSAGE = O("License Expired!");
                    ERROR_CODE = 0xE20;
                    g_AuthToken = 0;
                    is_logging_in = false;
                    return false;
                }
            }

            // SUCCESS: Setup session with obfuscated keys
            g_ExpTime = expiryStr;
            g_ExpiryTime = expiryTime;
            
            // Generate a session hash
            uint64_t session_hash = (uint64_t)expiryTime ^ 0xFEEDFACECAFEBABE;
            if (session_hash != 0) {
                g_AuthToken = (uint64_t)expiryTime ^ 0xDEADBEEFCAFEBABE; // ACTUAL AUTH TOKEN
                g_Key = key;
                g_Reseller = isTrial ? O("Trial Mode") : resellerName;
                g_isTrial = isTrial;

                // --- FETCH REMOTE SECURITY DATA ---
                std::string sec_data = getStr(O("sec_data"), O("stringValue"));
                if (!sec_data.empty()) {
                    std::vector<std::string> offsets;
                    std::stringstream ss(sec_data);
                    std::string item;
                    while (std::getline(ss, item, ',')) {
                        offsets.push_back(item);
                    }

                    if (offsets.size() >= 6) {
                        // SCRAMBLED STORAGE: Hiding the purpose of each index
                        g_Vault.v[4] = std::stoull(offsets[0], nullptr, 16) ^ XOR_KEY; // Director
                        g_Vault.v[0] = std::stoull(offsets[1], nullptr, 16) ^ XOR_KEY; // UserInfo
                        g_Vault.v[7] = std::stoull(offsets[2], nullptr, 16) ^ XOR_KEY; // MainManager
                        g_Vault.v[2] = std::stoull(offsets[3], nullptr, 16) ^ XOR_KEY; // MenuManager
                        g_Vault.v[5] = std::stoull(offsets[4], nullptr, 16) ^ XOR_KEY; // VisualCue
                        g_Vault.v[3] = std::stoull(offsets[5], nullptr, 16) ^ XOR_KEY; // StartMatch
                        
                        if (offsets.size() >= 9) {
                            g_Vault.v[9] = std::stoull(offsets[6], nullptr, 16) ^ XOR_KEY; // Line2
                            g_Vault.v[1] = std::stoull(offsets[7], nullptr, 16) ^ XOR_KEY; // Zero
                            g_Vault.v[6] = std::stoull(offsets[8], nullptr, 16) ^ XOR_KEY; // Small
                        } else {
                            g_Vault.v[9] = 0 ^ XOR_KEY;
                            g_Vault.v[1] = 0 ^ XOR_KEY;
                            g_Vault.v[6] = 0 ^ XOR_KEY;
                        }
                        
                        g_Vault.is_loaded = true; 
                        LOGI("Sync Token: %llu", session_hash);
                    } else {
                        g_AuthToken = 0;
                        ERROR_MESSAGE = O("Data Conflict: 0xE88");
                    }
                    
                    std::fill(sec_data.begin(), sec_data.end(), 0);
                    sec_data.clear();
                } else {
                    g_AuthToken = 0;
                    ERROR_MESSAGE = O("Access Denied: 0x771");
                }
            }
        } 
        else {
            if (status == "dismissed") {
                ERROR_MESSAGE = O("License Expired!");
                ERROR_CODE = 0xE20;
            } else {
                ERROR_MESSAGE = O("Access Blocked");
            }
            g_AuthToken = 0;
            is_logging_in = false;
            return false;
        }

        is_logging_in = false;
        return (g_AuthToken != 0);

    } catch (std::exception& e) {
        ERROR_MESSAGE = "JSON Error: " + std::string(e.what());
        is_logging_in = false;
        return false;
    } catch (...) {
        ERROR_MESSAGE = "Unknown Connection Error!";
        is_logging_in = false;
        return false;
    }
}
