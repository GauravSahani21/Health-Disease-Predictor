#!/bin/bash
# ============================================================
#  Health Disease Predictor — Training Progress Monitor
#  Monitors all 4 ML models in real time
#
#  Usage:
#    ./monitor_training.sh           # one-shot check
#    ./monitor_training.sh --watch   # refresh every 10s
# ============================================================

PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"
LOG_DIR="$PROJECT_ROOT/logs"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

WATCH=false
[[ "$1" == "--watch" ]] && WATCH=true

check_status() {
    local log_file="$1"
    local label="$2"

    echo -e "${BOLD}📊 $label${NC}"
    echo "  ─────────────────────────────────────────"

    if [ -z "$log_file" ] || [ ! -f "$log_file" ]; then
        echo -e "  ${YELLOW}⏳ Not started yet${NC}"
        echo ""
        return
    fi

    # Show last 5 relevant lines
    local recent
    recent=$(grep -E "(Epoch|Train|Val|Saved|completed|Accuracy|accuracy|Loss|loss)" "$log_file" 2>/dev/null | tail -5)
    if [ -n "$recent" ]; then
        echo "$recent" | while IFS= read -r line; do
            echo "  $line"
        done
    else
        echo "  (no training output yet)"
    fi

    # Completion status
    if grep -q "Training complete\|Training completed\|All models trained\|Model saved" "$log_file" 2>/dev/null; then
        local best_acc
        best_acc=$(grep -oP "(?<=acc[=: ])\d+\.\d+" "$log_file" 2>/dev/null | tail -1)
        echo -e "  ${GREEN}✅ COMPLETE${best_acc:+ — Best acc: ${best_acc}%}${NC}"
    else
        local lines
        lines=$(wc -l < "$log_file" 2>/dev/null || echo "0")
        echo -e "  ${CYAN}⏳ Training in progress... ($lines log lines)${NC}"
    fi
    echo ""
}

find_latest_log() {
    # Find latest timestamped log for a model type in logs/
    local pattern="$1"
    ls -t "$LOG_DIR"/train_${pattern}_*.log 2>/dev/null | head -1
}

print_all() {
    clear
    echo -e "${BOLD}╔══════════════════════════════════════════════╗${NC}"
    echo -e "${BOLD}║   Health Disease Predictor — Training Monitor  ║${NC}"
    echo -e "${BOLD}╚══════════════════════════════════════════════╝${NC}"
    echo -e "  Project root : $PROJECT_ROOT"
    echo -e "  Checked at   : $(date)"
    echo ""

    # ── Model 1: Text ─────────────────────────────────────────
    TEXT_LOG=$(find_latest_log "text")
    # Fallback to in-place logs
    [ -z "$TEXT_LOG" ] && TEXT_LOG="$PROJECT_ROOT/ml_text/training_enhanced.log"
    check_status "$TEXT_LOG" "MODEL 1 — 🧠 Text / Symptom Classifier"

    # ── Model 2: Brain ────────────────────────────────────────
    BRAIN_LOG=$(find_latest_log "brain")
    [ -z "$BRAIN_LOG" ] && BRAIN_LOG="$PROJECT_ROOT/ml_brain/training_full.log"
    check_status "$BRAIN_LOG" "MODEL 2 — 🫀 Brain MRI Tumor Classifier"

    # ── Model 3: Face ─────────────────────────────────────────
    FACE_LOG=$(find_latest_log "face")
    [ -z "$FACE_LOG" ] && FACE_LOG="$PROJECT_ROOT/ml_face/training_full.log"
    check_status "$FACE_LOG" "MODEL 3 — 😷 Face / Acne Classifier"

    # ── Model 4: Skin ─────────────────────────────────────────
    IMAGE_LOG=$(find_latest_log "image")
    [ -z "$IMAGE_LOG" ] && IMAGE_LOG="$PROJECT_ROOT/ml_image/training_full.log"
    check_status "$IMAGE_LOG" "MODEL 4 — 🔬 Skin Lesion Classifier"

    # ── Summary row ───────────────────────────────────────────
    echo -e "${BOLD}  Summary${NC}"
    echo "  ──────────────────────────────────────────"
    for label in "text:🧠 Text" "brain:🫀 Brain MRI" "face:😷 Face/Acne" "image:🔬 Skin Lesion"; do
        key="${label%%:*}"
        name="${label##*:}"
        log=$(find_latest_log "$key")
        [ -z "$log" ] && log="$PROJECT_ROOT/ml_${key}/training_full.log"
        if [ -f "$log" ] && grep -q "Training complete\|Training completed\|Model saved" "$log" 2>/dev/null; then
            echo -e "  ${GREEN}✅ $name${NC}"
        elif [ -f "$log" ]; then
            echo -e "  ${CYAN}⏳ $name — in progress${NC}"
        else
            echo -e "  ${YELLOW}⏸  $name — not started${NC}"
        fi
    done
    echo ""

    if $WATCH; then
        echo -e "  ${CYAN}[Refreshing every 10s — Ctrl+C to stop]${NC}"
    fi
}

if $WATCH; then
    while true; do
        print_all
        sleep 10
    done
else
    print_all
fi
