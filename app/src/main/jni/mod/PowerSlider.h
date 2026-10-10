#pragma once

#include "include/input.h"

#include "game/inc/AutoPlay.h"

#define ifl(cond) if ([&](){ bool b = (cond); if (b) LOGI(#cond); return b; }())

struct PowerSlider {
    bool Active = false;
    float ElapsedTime = 0.f, Duration = 0.f;
    float HoldTime = 0.f, HoldDuration = 0.f;
    ImVec2 StartPos;
    ImVec2 EndPos; // Max drag position
    ImVec2 TargetPos; // Actual target based on power
    ImVec2 CurrentPos;

    float ShotPower = 666.0f;
    int TouchIndex = 1; // Standard secondary touch index

    enum State {
        IDLE,
        STARTING,
        MOVING,
        ENDING,
        RETURNING,
    } state = IDLE;
    
    void Start(ImVec2 start, ImVec2 end) {
        this->StartPos = start;
        this->EndPos = end;
        this->CurrentPos = this->StartPos;
        this->ElapsedTime = 0.f;
        this->HoldTime = 0.f;

        this->Active = true;
        this->state = STARTING;
    }
    
    void Start(ImVec4 Rect) {
        float center = Rect.x + Rect.z / 2.0f;
        Start(ImVec2(center, Rect.y), ImVec2(center, Rect.y + Rect.w));
    }

    void End() {
        if (sharedGameManager && sharedGameManager.mVisualCue()) {
            sharedGameManager.mVisualCue().mPower(ShotPowerToPower(this->ShotPower));
        }
        LOGI("ending at power %f", sharedGameManager.mVisualCue().getShotPower(true));
        NativeTouchesEnd(this->TouchIndex, this->CurrentPos.x, this->CurrentPos.y);
        this->Active = false;
        this->state = IDLE;
        AutoPlay::g_CurrentCandidate.idx = -1;
    }

    void Cancel() {
        LOGI("Canceling power slider at power %f", sharedGameManager.mVisualCue().getShotPower(true));
        // NativeTouchesMove(this->TouchIndex, this->StartPos.x, this->StartPos.y);
        // this->End();
        this->EndPos = this->CurrentPos; // Use EndPos as start of return animation
        this->TargetPos = this->StartPos; // Return to origin
        this->ElapsedTime = 0.f;
        this->HoldTime = 0.f;
        this->Duration = 0.3f; // Fast return
        this->state = RETURNING;

        AutoPlay::g_CurrentCandidate.idx = -1;
        AutoPlay::lastFailedCuePos = { -1000.0, -1000.0 };

    }
    
    // DragTime is time to reach MAX power (666.0f)
    void SimulateDrag(ImVec4 Rect, float ShotPower = 0.f, float DragTime = .7f, float HoldTime = 0.35f) {
        if (this->Active) return;
        
        this->ShotPower = ShotPower > 0.f ? ShotPower : 666.0f;
        float powerRatio = (float)ShotPowerToPower(this->ShotPower);
        if (powerRatio > 1.0f) powerRatio = 1.0f;
        if (powerRatio < 0.0f) powerRatio = 0.0f;
        
        Start(Rect);
        
        // Calculate exact target position for the requested power
        this->TargetPos = ImVec2(
            this->StartPos.x + (this->EndPos.x - this->StartPos.x) * powerRatio,
            this->StartPos.y + (this->EndPos.y - this->StartPos.y) * powerRatio
        );
        
        this->Duration = DragTime * powerRatio;
        this->HoldDuration = HoldTime;
    }

    void Update() {
        if (!this->Active) return;
        
        float dt = ImGui::GetIO().DeltaTime;
        
        if (this->state == STARTING) {
            this->HoldTime += dt;
            if (this->HoldTime >= 0.05f) {
                NativeTouchesBegin(this->TouchIndex, this->StartPos.x, this->StartPos.y);
                this->state = MOVING;
                this->HoldTime = 0.f;
            }
        }
        
        if (this->state == MOVING) {
            this->ElapsedTime += dt;
            
            if (this->ElapsedTime < this->Duration) {
                // Calculate interpolated position
                float t = this->ElapsedTime / this->Duration;
                this->CurrentPos = ImVec2(
                    this->StartPos.x + (this->TargetPos.x - this->StartPos.x) * t,
                    this->StartPos.y + (this->TargetPos.y - this->StartPos.y) * t
                );

                if (sharedGameManager && sharedGameManager.mVisualCue()) {
                    sharedGameManager.mVisualCue().mPower(ShotPowerToPower(this->ShotPower * t));
                }

                NativeTouchesMove(this->TouchIndex, this->CurrentPos.x, this->CurrentPos.y);
            } else {
                // Ensure we hit the target exactly
                this->CurrentPos = this->TargetPos;
                if (sharedGameManager && sharedGameManager.mVisualCue()) {
                    sharedGameManager.mVisualCue().mPower(ShotPowerToPower(this->ShotPower));
                }
                NativeTouchesMove(this->TouchIndex, this->CurrentPos.x, this->CurrentPos.y);
                this->state = ENDING;
                this->HoldTime = 0.f;
            }

            if (false) {
                ImDrawList* fg = ImGui::GetForegroundDrawList();
                fg->AddCircleFilled(this->CurrentPos, 15.0f, IM_COL32(255, 255, 255, 100)); // Semi-transparent white circle
                fg->AddCircle(this->CurrentPos, 15.0f, IM_COL32(255, 255, 255, 200), 0.0f, 2.0f); // White outline
            }
        }

        if (this->state == ENDING) {
            if (sharedGameManager && sharedGameManager.mVisualCue()) {
                sharedGameManager.mVisualCue().mPower(ShotPowerToPower(this->ShotPower));
            }
            this->HoldTime += dt;
            if (this->HoldTime >= this->HoldDuration) {
                if (AutoPlay::g_CurrentCandidate.idx != -1) {
                    this->End();
                } else {
                    LOGI("Shot invalid before release. Canceling.");
                    this->Cancel();
                }
            }
        }

        if (this->state == RETURNING) {
            this->ElapsedTime += dt;

            if (this->ElapsedTime < this->Duration) {
                float t = this->ElapsedTime / this->Duration;
                // Interpolate from EndPos (captured CurrentPos) to TargetPos (StartPos)
                this->CurrentPos = ImVec2(
                    this->EndPos.x + (this->TargetPos.x - this->EndPos.x) * t,
                    this->EndPos.y + (this->TargetPos.y - this->EndPos.y) * t
                );
                NativeTouchesMove(this->TouchIndex, this->CurrentPos.x, this->CurrentPos.y);
            } else {
                // Finished returning
                this->CurrentPos = this->TargetPos;
                NativeTouchesMove(this->TouchIndex, this->CurrentPos.x, this->CurrentPos.y);
                End();
            }

            if (false) {
                ImDrawList* fg = ImGui::GetForegroundDrawList();
                fg->AddCircleFilled(this->CurrentPos, 15.0f, IM_COL32(255, 255, 255, 100));
                fg->AddCircle(this->CurrentPos, 15.0f, IM_COL32(255, 255, 255, 200), 0.0f, 2.0f);
            }
        }

    }
};

PowerSlider powerSlider;
