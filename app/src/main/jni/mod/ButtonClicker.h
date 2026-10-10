#pragma once

#include "include/input.h"

struct ButtonClicker {
    bool Active = false;
    float ElapsedTime = 0.f;
    float HoldDuration = 0.15f;
    ImVec2 ClickPos;
    int TouchIndex = 12;

    enum State {
        IDLE,
        PRESSING,
    } state = IDLE;
    
    void Click(ImVec2 pos, float duration = 0.15f) {
        if (this->Active) return;
        
        this->ClickPos = pos;
        this->HoldDuration = duration;
        this->ElapsedTime = 0.f;
        this->Active = true;
        this->state = PRESSING;
        
        NativeTouchesBegin(this->TouchIndex, this->ClickPos.x, this->ClickPos.y);
    }
    
    void Update() {
        if (!this->Active) return;
        
        float dt = ImGui::GetIO().DeltaTime;
        
        if (this->state == PRESSING) {
            this->ElapsedTime += dt;

            NativeTouchesMove(this->TouchIndex, this->ClickPos.x, this->ClickPos.y);

            if (false) {
                ImDrawList* fg = ImGui::GetForegroundDrawList();
                fg->AddCircleFilled(this->ClickPos, 15.0f, IM_COL32(255, 255, 255, 100));
                fg->AddCircle(this->ClickPos, 15.0f, IM_COL32(255, 255, 255, 200), 0.0f, 2.0f);
            }
            
            if (this->ElapsedTime >= this->HoldDuration) {
                NativeTouchesEnd(this->TouchIndex, this->ClickPos.x, this->ClickPos.y);
                this->Active = false;
                this->state = IDLE;
            }
        }
    }
};

ButtonClicker buttonClicker;
