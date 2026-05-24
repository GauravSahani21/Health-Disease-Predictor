#!/bin/bash

# ============================================================
#  Health Disease Predictor — Smart Auto-Training Script
# ============================================================
#  Automatically finds datasets on your machine and trains
#  all 4 ML models with the correct paths.
#
#  Dataset auto-search locations:
#    • <project>/ml_*/data/        (default locations)
#    • ~/Downloads/                (Kaggle zip extracts)
#    • ~/Desktop/                  (common drop location)
#    • ~/Documents/                (common storage)
#    • Any path you pass via env vars (see below)
#
#  Usage:
#    ./scripts/train-models.sh                  # auto-find + train all
#    ./scripts/train-models.sh --quick          # 5 epochs (fast test)
#    ./scripts/train-models.sh --model face     # one model only
#    ./scripts/train-models.sh --model brain
#    ./scripts/train-models.sh --model skin
#    ./scripts/train-models.sh --model text
#
#  Override dataset paths (optional):
#    BRAIN_DATA=/path/to/brain ./scripts/train-models.sh
#    FACE_DATA=/path/to/acne   ./scripts/train-models.sh
#    SKIN_DATA=/path/to/HAM    ./scripts/train-models.sh
# ============================================================

set -e

# ── Colours ──────────────────────────────────────────────────
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
DIM='\033[2m'
NC='\033[0m'

log_header() {
    echo ""
    echo -e "${BOLD}${BLUE}╔══════════════════════════════════════════════╗${NC}"
    echo -e "${BOLD}${BLUE}║  $1${NC}"
    echo -e "${BOLD}${BLUE}╚══════════════════════════════════════════════╝${NC}"
}
log_ok()     { echo -e "${GREEN}  ✅ $1${NC}"; }
log_warn()   { echo -e "${YELLOW}  ⚠️  $1${NC}"; }
log_err()    { echo -e "${RED}  ❌ $1${NC}"; }
log_info()   { echo -e "${CYAN}  ➤  $1${NC}"; }
log_found()  { echo -e "${GREEN}  📂 Found: ${BOLD}$1${NC}"; }
log_search() { echo -e "${DIM}     searching: $1${NC}"; }

# ── Parse args ────────────────────────────────────────────────
QUICK=false
ONLY_MODEL=""
PREV=""
for arg in "$@"; do
    case $arg in
        --quick)   QUICK=true ;;
        --model=*) ONLY_MODEL="${arg#*=}" ;;
        --model)   ;;
    esac
    [ "$PREV" = "--model" ] && ONLY_MODEL="$arg"
    PREV="$arg"
done

QUICK_FLAG=""
$QUICK && QUICK_FLAG="--quick-test"

# ── Paths ─────────────────────────────────────────────────────
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LOG_DIR="$PROJECT_ROOT/logs"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
mkdir -p "$LOG_DIR"

# ── Result tracking ───────────────────────────────────────────
declare -A M_STATUS
declare -A M_DATA
declare -A M_ACC
PASS=0; SKIP=0; FAIL=0

# ── Helper: activate or create venv ──────────────────────────
use_venv() {
    local dir="$1"
    if [ ! -d "$dir/venv" ]; then
        log_info "Creating virtual environment in $dir/venv ..."
        python3 -m venv "$dir/venv"
    fi
    # shellcheck disable=SC1090
    source "$dir/venv/bin/activate"
}

# ─────────────────────────────────────────────────────────────
# DATASET AUTO-FINDER
# ─────────────────────────────────────────────────────────────

# find_brain_data — looks for a folder that contains Training/ and Testing/ subfolders
find_brain_data() {
    local candidates=(
        "$PROJECT_ROOT/ml_brain/data"
        "$PROJECT_ROOT/Dataset/brain_mri"
        "$PROJECT_ROOT/Dataset/Brain_Tumor"
        "$HOME/Downloads/Brain_Tumor_MRI_Dataset"
        "$HOME/Downloads/brain-tumor-mri-dataset"
        "$HOME/Downloads/brain_tumor_mri_dataset"
        "$HOME/Downloads/Brain Tumor MRI Dataset"
        "$HOME/Desktop/brain_mri"
        "$HOME/Desktop/Brain_Tumor"
        "$HOME/Desktop/Brain_Tumor_MRI_Dataset"
        "$HOME/Documents/brain_mri"
        "$HOME/Documents/Brain_Tumor"
    )

    # First: user env override
    if [ -n "$BRAIN_DATA" ] && [ -d "$BRAIN_DATA/Training" ]; then
        echo "$BRAIN_DATA"; return
    fi

    # Check candidate list
    for p in "${candidates[@]}"; do
        log_search "$p"
        if [ -d "$p/Training" ] && [ -n "$(ls -A "$p/Training" 2>/dev/null)" ]; then
            echo "$p"; return
        fi
    done

    # Deep search in Downloads / Desktop / Documents
    for base in "$HOME/Downloads" "$HOME/Desktop" "$HOME/Documents"; do
        local found
        found=$(find "$base" -maxdepth 5 -type d -name "Training" 2>/dev/null \
            | while read -r d; do
                # Confirm it has at least 2 subfolders (glioma, meningioma, etc.)
                count=$(find "$d" -maxdepth 1 -mindepth 1 -type d 2>/dev/null | wc -l)
                [ "$count" -ge 2 ] && dirname "$d" && break
              done | head -1)
        if [ -n "$found" ] && [ -d "$found/Training" ]; then
            echo "$found"; return
        fi
    done

    echo ""  # not found
}

# find_face_data — looks for Acne image folder or already-organised acne_organized
find_face_data() {
    local candidates=(
        "$PROJECT_ROOT/ml_face/data/Acne"
        "$PROJECT_ROOT/ml_face/data/acne_organized"
        "$PROJECT_ROOT/Dataset/Acne"
        "$HOME/Downloads/Acne"
        "$HOME/Downloads/acne-grading-dataset-4-levels"
        "$HOME/Downloads/acne_dataset"
        "$HOME/Desktop/Acne"
        "$HOME/Documents/Acne"
    )

    if [ -n "$FACE_DATA" ]; then
        if [ -d "$FACE_DATA" ] && find "$FACE_DATA" -maxdepth 1 -name "*.jpg" -o -name "*.jpeg" -o -name "*.png" 2>/dev/null | grep -q .; then
            echo "$FACE_DATA"; return
        fi
    fi

    for p in "${candidates[@]}"; do
        log_search "$p"
        if [ -d "$p" ]; then
            # Check it has image files or subfolders with images
            img_count=$(find "$p" -maxdepth 2 \( -name "*.jpg" -o -name "*.jpeg" -o -name "*.png" \) 2>/dev/null | wc -l)
            if [ "$img_count" -gt 10 ]; then
                echo "$p"; return
            fi
        fi
    done

    # Deep search
    for base in "$HOME/Downloads" "$HOME/Desktop" "$HOME/Documents"; do
        local found
        found=$(find "$base" -maxdepth 4 -type d \( -iname "*acne*" -o -iname "*skin*face*" \) 2>/dev/null \
            | while read -r d; do
                count=$(find "$d" -maxdepth 2 -name "*.jpg" -o -name "*.jpeg" -o -name "*.png" 2>/dev/null | wc -l)
                [ "$count" -gt 10 ] && echo "$d" && break
              done | head -1)
        if [ -n "$found" ]; then
            echo "$found"; return
        fi
    done

    echo ""
}

# find_skin_data — looks for HAM10000_metadata.csv + image folders
find_skin_data() {
    local candidates=(
        "$PROJECT_ROOT/ml_image/data"
        "$PROJECT_ROOT/Dataset/HAM10000"
        "$HOME/Downloads/HAM10000"
        "$HOME/Downloads/ham10000"
        "$HOME/Downloads/skin-lesion-analysis-toward-melanoma-detection"
        "$HOME/Desktop/HAM10000"
        "$HOME/Documents/HAM10000"
    )

    if [ -n "$SKIN_DATA" ] && [ -f "$SKIN_DATA/HAM10000_metadata.csv" ]; then
        echo "$SKIN_DATA"; return
    fi

    for p in "${candidates[@]}"; do
        log_search "$p"
        if [ -f "$p/HAM10000_metadata.csv" ]; then
            echo "$p"; return
        fi
    done

    # Deep search for metadata CSV
    for base in "$HOME/Downloads" "$HOME/Desktop" "$HOME/Documents"; do
        local found
        found=$(find "$base" -maxdepth 5 -name "HAM10000_metadata.csv" 2>/dev/null | head -1)
        if [ -n "$found" ]; then
            dirname "$found"; return
        fi
    done

    echo ""
}

# ─────────────────────────────────────────────────────────────
# BANNER
# ─────────────────────────────────────────────────────────────
log_header "Health Disease Predictor — Smart Auto-Train"
echo ""
echo -e "  ${BOLD}Project :${NC} $PROJECT_ROOT"
echo -e "  ${BOLD}Started :${NC} $(date)"
$QUICK && echo -e "  ${YELLOW}${BOLD}QUICK MODE — 5 epochs per model${NC}"
[ -n "$ONLY_MODEL" ] && echo -e "  ${CYAN}${BOLD}SINGLE MODEL — training: $ONLY_MODEL${NC}"

# ─────────────────────────────────────────────────────────────
# PRE-FLIGHT DATASET SCAN
# ─────────────────────────────────────────────────────────────
log_header "Dataset Auto-Detection"

echo -e "  ${DIM}Scanning filesystem for datasets...${NC}"
echo ""

# ── Brain ──────────────────────────────────────────────────
if [ -z "$ONLY_MODEL" ] || [ "$ONLY_MODEL" = "brain" ]; then
    echo -e "  ${BOLD}🫀 Brain MRI dataset:${NC}"
    BRAIN_DIR=$(find_brain_data)
    if [ -n "$BRAIN_DIR" ]; then
        BRAIN_CLASS_COUNT=$(find "$BRAIN_DIR/Training" -maxdepth 1 -mindepth 1 -type d 2>/dev/null | wc -l | tr -d ' ')
        BRAIN_IMG_COUNT=$(find "$BRAIN_DIR/Training" -name "*.jpg" -o -name "*.jpeg" -o -name "*.png" 2>/dev/null | wc -l | tr -d ' ')
        log_found "$BRAIN_DIR"
        log_info "$BRAIN_CLASS_COUNT classes, ~$BRAIN_IMG_COUNT training images"
        M_DATA[brain]="$BRAIN_DIR"
    else
        log_warn "Not found on this machine"
        log_info "Download: https://www.kaggle.com/datasets/masoudnickparvar/brain-tumor-mri-dataset"
        M_DATA[brain]=""
    fi
    echo ""
fi

# ── Face ───────────────────────────────────────────────────
if [ -z "$ONLY_MODEL" ] || [ "$ONLY_MODEL" = "face" ]; then
    echo -e "  ${BOLD}😷 Face / Acne dataset:${NC}"
    FACE_DIR=$(find_face_data)
    if [ -n "$FACE_DIR" ]; then
        FACE_IMG_COUNT=$(find "$FACE_DIR" -maxdepth 2 \( -name "*.jpg" -o -name "*.jpeg" -o -name "*.png" \) 2>/dev/null | wc -l | tr -d ' ')
        log_found "$FACE_DIR"
        log_info "~$FACE_IMG_COUNT images"
        M_DATA[face]="$FACE_DIR"
    else
        log_warn "Not found on this machine"
        log_info "Download: https://www.kaggle.com/datasets/rutviklathiyateksun/acne-grading-dataset-4-levels"
        M_DATA[face]=""
    fi
    echo ""
fi

# ── Skin ───────────────────────────────────────────────────
if [ -z "$ONLY_MODEL" ] || [ "$ONLY_MODEL" = "skin" ]; then
    echo -e "  ${BOLD}🔬 Skin Lesion (HAM10000) dataset:${NC}"
    SKIN_DIR=$(find_skin_data)
    if [ -n "$SKIN_DIR" ]; then
        SKIN_IMG_COUNT=$(find "$SKIN_DIR" -name "*.jpg" 2>/dev/null | wc -l | tr -d ' ')
        log_found "$SKIN_DIR"
        log_info "~$SKIN_IMG_COUNT images + metadata CSV"
        M_DATA[skin]="$SKIN_DIR"
    else
        log_warn "Not found on this machine"
        log_info "Download: https://www.kaggle.com/datasets/kmader/skin-lesion-analysis-toward-melanoma-detection"
        M_DATA[skin]=""
    fi
    echo ""
fi

# ── Text (no dataset needed) ───────────────────────────────
if [ -z "$ONLY_MODEL" ] || [ "$ONLY_MODEL" = "text" ]; then
    echo -e "  ${BOLD}🧠 Text / Symptoms dataset:${NC}"
    log_found "Synthetic — auto-generated (no file needed)"
    M_DATA[text]="synthetic"
    echo ""
fi

# ─────────────────────────────────────────────────────────────
# CONFIRM PLAN
# ─────────────────────────────────────────────────────────────
log_header "Training Plan"

for m in text brain face skin; do
    [ -n "$ONLY_MODEL" ] && [ "$ONLY_MODEL" != "$m" ] && continue
    case $m in
        text)  label="🧠 Text / Symptoms   " ;;
        brain) label="🫀 Brain MRI Tumor   " ;;
        face)  label="😷 Face / Acne       " ;;
        skin)  label="🔬 Skin Lesion       " ;;
    esac
    if [ -n "${M_DATA[$m]}" ]; then
        echo -e "  ${GREEN}✅ $label → WILL TRAIN${NC}"
    else
        echo -e "  ${YELLOW}⏭️  $label → SKIPPED (dataset not found)${NC}"
    fi
done

echo ""
echo -e "  ${BOLD}Starting in 3 seconds... (Ctrl+C to abort)${NC}"
sleep 3

# ═════════════════════════════════════════════════════════════
# TRAINING
# ═════════════════════════════════════════════════════════════

# ─────────────────────────────────────────────────────────────
# MODEL 1 — TEXT / SYMPTOM CLASSIFIER
# ─────────────────────────────────────────────────────────────
if [ -z "$ONLY_MODEL" ] || [ "$ONLY_MODEL" = "text" ]; then
    log_header "MODEL 1/4 — 🧠 Text / Symptom Classifier"
    log_info "Script       : ml_text/train_model.py"
    log_info "Architecture : TF-IDF + Random Forest (37 disease classes)"
    log_info "Dataset      : Synthetic — auto-generated inside script"
    log_info "Output       : ml_text/models/symptom_model.joblib"

    TEXT_LOG="$LOG_DIR/train_text_${TIMESTAMP}.log"
    cd "$PROJECT_ROOT/ml_text"
    use_venv "."

    log_info "Installing: scikit-learn joblib numpy pandas ..."
    pip install --quiet --upgrade pip
    pip install --quiet scikit-learn joblib numpy pandas

    log_info "Training..."
    if python train_model.py 2>&1 | tee "$TEXT_LOG"; then
        M_STATUS[text]="✅ Complete"
        ACC=$(grep -oP "\d+\.\d+" "$TEXT_LOG" 2>/dev/null | tail -1 || echo "—")
        M_ACC[text]="$ACC"
        log_ok "Text model done! → ml_text/models/symptom_model.joblib"
        ((PASS++)) || true
    else
        M_STATUS[text]="❌ Failed"
        log_err "Training failed. See: $TEXT_LOG"
        ((FAIL++)) || true
    fi

    deactivate
    cd "$PROJECT_ROOT"
fi

# ─────────────────────────────────────────────────────────────
# MODEL 2 — BRAIN MRI TUMOR CLASSIFIER
# ─────────────────────────────────────────────────────────────
if [ -z "$ONLY_MODEL" ] || [ "$ONLY_MODEL" = "brain" ]; then
    log_header "MODEL 2/4 — 🫀 Brain MRI Tumor Classifier"
    log_info "Script       : ml_brain/train_brain.py"
    log_info "Architecture : EfficientNet-B1 (4 classes: glioma/meningioma/notumor/pituitary)"

    if [ -n "${M_DATA[brain]}" ]; then
        log_info "Dataset      : ${M_DATA[brain]}"
        log_info "Output       : ml_brain/models/brain_model/best_model.pth"

        # Copy or symlink data if not already in expected location
        BRAIN_EXPECTED="$PROJECT_ROOT/ml_brain/data"
        if [ "${M_DATA[brain]}" != "$BRAIN_EXPECTED" ]; then
            log_info "Linking dataset into ml_brain/data/ ..."
            mkdir -p "$BRAIN_EXPECTED"
            # Create symlinks so train_brain.py finds data/Training and data/Testing
            [ ! -e "$BRAIN_EXPECTED/Training" ] && ln -sfn "${M_DATA[brain]}/Training" "$BRAIN_EXPECTED/Training"
            [ ! -e "$BRAIN_EXPECTED/Testing"  ] && ln -sfn "${M_DATA[brain]}/Testing"  "$BRAIN_EXPECTED/Testing"
        fi

        BRAIN_LOG="$LOG_DIR/train_brain_${TIMESTAMP}.log"
        cd "$PROJECT_ROOT/ml_brain"
        use_venv "."

        log_info "Installing: torch torchvision tqdm matplotlib scikit-learn ..."
        pip install --quiet --upgrade pip
        pip install --quiet torch torchvision tqdm matplotlib scikit-learn

        log_info "Training (--data-dir data --output-dir models/brain_model) ..."
        if python train_brain.py \
            --data-dir data \
            --output-dir models/brain_model \
            $QUICK_FLAG \
            2>&1 | tee "$BRAIN_LOG"; then
            M_STATUS[brain]="✅ Complete"
            ACC=$(grep -oP "(?<=acc: )\d+\.\d+" "$BRAIN_LOG" 2>/dev/null | tail -1 || echo "—")
            M_ACC[brain]="${ACC}%"
            log_ok "Brain model done! → ml_brain/models/brain_model/best_model.pth"
            ((PASS++)) || true
        else
            M_STATUS[brain]="❌ Failed"
            log_err "Training failed. See: $BRAIN_LOG"
            ((FAIL++)) || true
        fi

        deactivate
        cd "$PROJECT_ROOT"
    else
        log_warn "Dataset not found — skipping Brain MRI model."
        log_warn "Download dataset from Kaggle and re-run:"
        echo -e "  ${CYAN}  https://www.kaggle.com/datasets/masoudnickparvar/brain-tumor-mri-dataset${NC}"
        echo -e "  ${CYAN}  Extract to: ml_brain/data/ (needs Training/ and Testing/ subfolders)${NC}"
        echo -e "  ${CYAN}  Or: BRAIN_DATA=/your/path ./scripts/train-models.sh${NC}"
        M_STATUS[brain]="⏭️  Skipped (dataset not found)"
        M_ACC[brain]="—"
        ((SKIP++)) || true
    fi
fi

# ─────────────────────────────────────────────────────────────
# MODEL 3 — FACE / ACNE CLASSIFIER
# ─────────────────────────────────────────────────────────────
if [ -z "$ONLY_MODEL" ] || [ "$ONLY_MODEL" = "face" ]; then
    log_header "MODEL 3/4 — 😷 Face / Acne Classifier"
    log_info "Script       : ml_face/train_face.py"
    log_info "Architecture : MobileNetV2 (5 classes: Acne/Rosacea/Healthy/Perioral/Other)"

    if [ -n "${M_DATA[face]}" ]; then
        log_info "Dataset      : ${M_DATA[face]}"
        log_info "Output       : ml_face/models/face_model/best_model.pth"

        # Ensure dataset is in expected location for train_face.py
        # train_face.py uses hardcoded 'data/Acne' as source — copy/link if elsewhere
        FACE_EXPECTED_SOURCE="$PROJECT_ROOT/ml_face/data/Acne"
        FACE_EXPECTED_ORG="$PROJECT_ROOT/ml_face/data/acne_organized"

        if [ "${M_DATA[face]}" != "$FACE_EXPECTED_SOURCE" ] && \
           [ "${M_DATA[face]}" != "$FACE_EXPECTED_ORG" ] && \
           [ ! -d "$FACE_EXPECTED_SOURCE" ] && \
           [ ! -d "$FACE_EXPECTED_ORG" ]; then
            log_info "Linking dataset into ml_face/data/Acne ..."
            mkdir -p "$PROJECT_ROOT/ml_face/data"
            ln -sfn "${M_DATA[face]}" "$FACE_EXPECTED_SOURCE"
        fi

        FACE_LOG="$LOG_DIR/train_face_${TIMESTAMP}.log"
        cd "$PROJECT_ROOT/ml_face"
        use_venv "."

        log_info "Installing: torch torchvision tqdm matplotlib pillow ..."
        pip install --quiet --upgrade pip
        pip install --quiet torch torchvision tqdm matplotlib pillow

        log_info "Training (--output-dir models/face_model) ..."
        if python train_face.py \
            --output-dir models/face_model \
            $QUICK_FLAG \
            2>&1 | tee "$FACE_LOG"; then
            M_STATUS[face]="✅ Complete"
            ACC=$(grep -oP "(?<=acc: )\d+\.\d+" "$FACE_LOG" 2>/dev/null | tail -1 || echo "—")
            M_ACC[face]="${ACC}%"
            log_ok "Face model done! → ml_face/models/face_model/best_model.pth"
            ((PASS++)) || true
        else
            M_STATUS[face]="❌ Failed"
            log_err "Training failed. See: $FACE_LOG"
            ((FAIL++)) || true
        fi

        deactivate
        cd "$PROJECT_ROOT"
    else
        log_warn "Dataset not found — skipping Face/Acne model."
        log_warn "Download dataset from Kaggle and re-run:"
        echo -e "  ${CYAN}  https://www.kaggle.com/datasets/rutviklathiyateksun/acne-grading-dataset-4-levels${NC}"
        echo -e "  ${CYAN}  Extract images to: ml_face/data/Acne/${NC}"
        echo -e "  ${CYAN}  Or: FACE_DATA=/your/path ./scripts/train-models.sh${NC}"
        M_STATUS[face]="⏭️  Skipped (dataset not found)"
        M_ACC[face]="—"
        ((SKIP++)) || true
    fi
fi

# ─────────────────────────────────────────────────────────────
# MODEL 4 — SKIN LESION / HAM10000
# ─────────────────────────────────────────────────────────────
if [ -z "$ONLY_MODEL" ] || [ "$ONLY_MODEL" = "skin" ]; then
    log_header "MODEL 4/4 — 🔬 Skin Lesion Classifier (HAM10000)"
    log_info "Script       : ml_image/train_image.py"
    log_info "Architecture : EfficientNet-B0 (7 lesion classes)"

    if [ -n "${M_DATA[skin]}" ]; then
        log_info "Dataset      : ${M_DATA[skin]}"
        log_info "Output       : ml_image/models/image_model/best_model.pth"

        # Ensure data is in expected location for train_image.py
        SKIN_EXPECTED="$PROJECT_ROOT/ml_image/data"
        if [ "${M_DATA[skin]}" != "$SKIN_EXPECTED" ] && [ ! -f "$SKIN_EXPECTED/HAM10000_metadata.csv" ]; then
            log_info "Linking dataset into ml_image/data/ ..."
            mkdir -p "$SKIN_EXPECTED"
            ln -sfn "${M_DATA[skin]}/HAM10000_metadata.csv"     "$SKIN_EXPECTED/HAM10000_metadata.csv"     2>/dev/null || true
            ln -sfn "${M_DATA[skin]}/HAM10000_images_part_1"    "$SKIN_EXPECTED/HAM10000_images_part_1"    2>/dev/null || true
            ln -sfn "${M_DATA[skin]}/HAM10000_images_part_2"    "$SKIN_EXPECTED/HAM10000_images_part_2"    2>/dev/null || true
        fi

        SKIN_LOG="$LOG_DIR/train_skin_${TIMESTAMP}.log"
        cd "$PROJECT_ROOT/ml_image"
        use_venv "."

        log_info "Installing: torch torchvision tqdm matplotlib pillow pandas scikit-learn ..."
        pip install --quiet --upgrade pip
        pip install --quiet torch torchvision tqdm matplotlib pillow pandas scikit-learn

        log_info "Training (--data-dir data --output-dir models/image_model) ..."
        if python train_image.py \
            --data-dir data \
            --output-dir models/image_model \
            $QUICK_FLAG \
            2>&1 | tee "$SKIN_LOG"; then
            M_STATUS[skin]="✅ Complete"
            ACC=$(grep -oP "(?<=acc: )\d+\.\d+" "$SKIN_LOG" 2>/dev/null | tail -1 || echo "—")
            M_ACC[skin]="${ACC}%"
            log_ok "Skin model done! → ml_image/models/image_model/best_model.pth"
            ((PASS++)) || true
        else
            M_STATUS[skin]="❌ Failed"
            log_err "Training failed. See: $SKIN_LOG"
            ((FAIL++)) || true
        fi

        deactivate
        cd "$PROJECT_ROOT"
    else
        log_warn "Dataset not found — skipping Skin Lesion model."
        log_warn "Download dataset from Kaggle and re-run:"
        echo -e "  ${CYAN}  https://www.kaggle.com/datasets/kmader/skin-lesion-analysis-toward-melanoma-detection${NC}"
        echo -e "  ${CYAN}  Extract to: ml_image/data/ (needs HAM10000_metadata.csv + image folders)${NC}"
        echo -e "  ${CYAN}  Or: SKIN_DATA=/your/path ./scripts/train-models.sh${NC}"
        M_STATUS[skin]="⏭️  Skipped (dataset not found)"
        M_ACC[skin]="—"
        ((SKIP++)) || true
    fi
fi

# ─────────────────────────────────────────────────────────────
# FINAL SUMMARY
# ─────────────────────────────────────────────────────────────
log_header "Training Complete — Summary"

printf "\n  ${BOLD}%-34s %-32s %s${NC}\n" "Model" "Status" "Best Accuracy"
printf "  %-34s %-32s %s\n" \
    "$(printf '%.0s─' {1..34})" \
    "$(printf '%.0s─' {1..32})" \
    "$(printf '%.0s─' {1..14})"

for m in text brain face skin; do
    [ -n "$ONLY_MODEL" ] && [ "$ONLY_MODEL" != "$m" ] && continue
    case $m in
        text)  label="🧠 Text / Symptoms" ;;
        brain) label="🫀 Brain MRI Tumor" ;;
        face)  label="😷 Face / Acne" ;;
        skin)  label="🔬 Skin Lesion (HAM10000)" ;;
    esac
    st="${M_STATUS[$m]:-— not run}"
    ac="${M_ACC[$m]:-—}"
    printf "  %-34s %-32s %s\n" "$label" "$st" "$ac"
done

echo ""
printf "  Trained: %d  |  Skipped: %d  |  Failed: %d\n" "$PASS" "$SKIP" "$FAIL"
echo "  Finished : $(date)"
echo "  Logs dir : $LOG_DIR"
echo ""
echo "  Model output locations:"
echo "    ml_text/models/symptom_model.joblib"
echo "    ml_brain/models/brain_model/best_model.pth"
echo "    ml_face/models/face_model/best_model.pth"
echo "    ml_image/models/image_model/best_model.pth"
echo ""

if [ "$SKIP" -gt 0 ]; then
    echo -e "  ${YELLOW}💡 ${SKIP} model(s) skipped — download their datasets from Kaggle${NC}"
    echo -e "     ${CYAN}then re-run: ./scripts/train-models.sh${NC}"
    echo -e "     ${DIM}(the script will auto-detect them in ~/Downloads automatically)${NC}"
    echo ""
fi

[ "$FAIL" -gt 0 ] && exit 1 || exit 0
