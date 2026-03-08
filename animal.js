const URL = "./my_model/";
let model, webcam, maxPredictions;

// 1. 드래그 앤 드롭 설정
const dropZone = document.getElementById('drop-zone');

if (dropZone) {
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => dropZone.classList.add('dragover'), false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => dropZone.classList.remove('dragover'), false);
    });

    dropZone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        handleImageUpload({ target: { files: files } });
    }, false);
}

// 2. 사진 파일 업로드 처리
async function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    // UI 전환
    document.getElementById("upload-container").classList.add("hidden");
    document.getElementById("result-area").classList.remove("hidden");
    document.getElementById("loading").classList.remove("hidden");
    document.getElementById("image-preview").classList.remove("hidden");
    document.getElementById("webcam-container").classList.add("hidden");

    // 이미지 프리뷰 표시
    const reader = new FileReader();
    reader.onload = (e) => document.getElementById("image-preview").src = e.target.result;
    reader.readAsDataURL(file);

    try {
        if (!model) {
            model = await tmImage.load(URL + "model.json", URL + "metadata.json");
            maxPredictions = model.getTotalClasses();
        }

        const img = new Image();
        img.src = window.URL.createObjectURL(file);
        img.onload = async () => {
            document.getElementById("loading").classList.add("hidden");
            document.getElementById("analysis-result").classList.remove("hidden");
            await predict(img);
        };
    } catch (e) {
        alert("분석 중 오류가 발생했습니다. 모델 파일이 있는지 확인해주세요.");
        console.error(e);
    }
}

// 3. 실시간 카메라 시작 (옵션)
async function initWebcam() {
    document.getElementById("upload-container").classList.add("hidden");
    document.getElementById("result-area").classList.remove("hidden");
    document.getElementById("loading").classList.remove("hidden");
    document.getElementById("image-preview").classList.add("hidden");
    document.getElementById("webcam-container").classList.remove("hidden");

    try {
        if (!model) {
            model = await tmImage.load(URL + "model.json", URL + "metadata.json");
            maxPredictions = model.getTotalClasses();
        }

        webcam = new tmImage.Webcam(250, 250, true);
        await webcam.setup();
        await webcam.play();
        
        document.getElementById("loading").classList.add("hidden");
        document.getElementById("webcam-container").appendChild(webcam.canvas);
        document.getElementById("analysis-result").classList.remove("hidden");
        
        window.requestAnimationFrame(loop);
    } catch (e) {
        alert("카메라를 시작할 수 없습니다.");
        console.error(e);
    }
}

async function loop() {
    if (webcam) {
        webcam.update();
        await predict(webcam.canvas);
        window.requestAnimationFrame(loop);
    }
}

// 4. AI 예측 및 결과 UI 업데이트
async function predict(inputElement) {
    const prediction = await model.predict(inputElement);
    prediction.sort((a, b) => b.probability - a.probability);

    const resultTitle = document.getElementById("top-result-title");
    resultTitle.innerHTML = `당신은 <strong>${prediction[0].className}상</strong>입니다!`;

    const labelContainer = document.getElementById("label-container");
    labelContainer.innerHTML = "";

    for (let i = 0; i < Math.min(maxPredictions, 5); i++) {
        const prob = (prediction[i].probability * 100).toFixed(0);
        labelContainer.innerHTML += `
            <div class="bar-container">
                <div class="bar-label">
                    <span>${prediction[i].className}</span>
                    <span>${prob}%</span>
                </div>
                <div class="bar-bg">
                    <div class="bar-fill" style="width: ${prob}%"></div>
                </div>
            </div>
        `;
    }
}