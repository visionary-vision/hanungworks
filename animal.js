// 1. 최신 Teachable Machine 공유 모델 URL 적용
const URL = "https://teachablemachine.withgoogle.com/models/gjRkgVUga/"; 

let model, webcam, maxPredictions;

// 2. 동물상별 센스 있는 문구 설정
const animalDescriptions = {
    "dog": "충성심 강하고 귀여운 🐶강아지상이에요~",
    "cat": "도도하면서도 신비로운 매력의 🐱고양이상이에요!",
    "pig": "복을 가득 불러오는 여유로운 🐷돼지상이에요~",
    "bird": "자유롭고 맑은 영혼을 가진 🐦새상이에요!",
    "sheep": "포근하고 순수한 매력의 🐏양상이에요~",
    "capybara": "세상 모든 것과 친해질 수 있는 친화력 갑! 🦫카피바라상이에요~",
    "bear": "듬직하고 포근한 매력의 🐻곰상이에요!",
    "rabbit": "깜찍하고 발랄한 매력의 🐰토끼상이에요~"
};

// 드래그 앤 드롭 설정
const dropZone = document.getElementById('drop-zone');
if (dropZone) {
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(name => {
        dropZone.addEventListener(name, (e) => { e.preventDefault(); e.stopPropagation(); });
    });
    ['dragenter', 'dragover'].forEach(name => dropZone.addEventListener(name, () => dropZone.classList.add('dragover')));
    ['dragleave', 'drop'].forEach(name => dropZone.addEventListener(name, () => dropZone.classList.remove('dragover')));
    dropZone.addEventListener('drop', (e) => handleImageUpload({ target: { files: e.dataTransfer.files } }));
}

// 모델 로드
async function loadModel() {
    if (model) return true;
    try {
        model = await tmImage.load(URL + "model.json", URL + "metadata.json");
        maxPredictions = model.getTotalClasses();
        return true;
    } catch (e) {
        console.error(e);
        alert("모델 로드에 실패했습니다.");
        return false;
    }
}

// 사진 업로드 처리
async function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    document.getElementById("upload-container").classList.add("hidden");
    document.getElementById("result-area").classList.remove("hidden");
    document.getElementById("loading").classList.remove("hidden");
    document.getElementById("image-preview").classList.remove("hidden");

    const reader = new FileReader();
    reader.onload = (e) => document.getElementById("image-preview").src = e.target.result;
    reader.readAsDataURL(file);

    if (await loadModel()) {
        const img = new Image();
        img.src = window.URL.createObjectURL(file);
        img.onload = async () => {
            document.getElementById("loading").classList.add("hidden");
            document.getElementById("analysis-result").classList.remove("hidden");
            await predict(img);
        };
    }
}

// 실시간 카메라 시작
async function initWebcam() {
    document.getElementById("upload-container").classList.add("hidden");
    document.getElementById("result-area").classList.remove("hidden");
    document.getElementById("loading").classList.remove("hidden");
    document.getElementById("webcam-container").classList.remove("hidden");

    if (await loadModel()) {
        try {
            webcam = new tmImage.Webcam(250, 250, true);
            await webcam.setup();
            await webcam.play();
            document.getElementById("loading").classList.add("hidden");
            document.getElementById("webcam-container").appendChild(webcam.canvas);
            document.getElementById("analysis-result").classList.remove("hidden");
            window.requestAnimationFrame(loop);
        } catch (e) {
            alert("카메라 권한을 허용해주세요.");
        }
    }
}

async function loop() {
    if (webcam && webcam.canvas) {
        webcam.update();
        await predict(webcam.canvas);
        window.requestAnimationFrame(loop);
    }
}

// 예측 및 UI 업데이트
async function predict(inputElement) {
    const prediction = await model.predict(inputElement);
    prediction.sort((a, b) => b.probability - a.probability);

    const topResult = prediction[0];
    const prob = (topResult.probability * 100).toFixed(0);
    const description = animalDescriptions[topResult.className] || `${topResult.className}상이에요!`;

    const resultTitle = document.getElementById("top-result-title");
    resultTitle.innerHTML = description;

    const labelContainer = document.getElementById("label-container");
    labelContainer.innerHTML = `
        <div class="main-result-box">
            <div class="match-percentage">일치율: <span>${prob}%</span></div>
            <div class="bar-bg">
                <div class="bar-fill" style="width: ${prob}%"></div>
            </div>
        </div>
    `;
}