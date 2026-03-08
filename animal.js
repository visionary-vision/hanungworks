// 1. 모델 경로 설정 
// - 공유 링크가 있다면 아래 URL에 따옴표 사이(https://...)를 채워주세요.
// - 로컬 파일을 쓰려면 "./my_model/" 그대로 두시면 됩니다.
const URL = "./my_model/"; 

let model, webcam, maxPredictions;

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

// 2. 모델 로드 함수 (재사용 가능하게 분리)
async function loadModel() {
    if (model) return true; // 이미 로드됨

    try {
        const modelURL = URL + "model.json";
        const metadataURL = URL + "metadata.json";
        
        console.log("Loading model from:", modelURL);
        model = await tmImage.load(modelURL, metadataURL);
        maxPredictions = model.getTotalClasses();
        console.log("Model loaded successfully!");
        return true;
    } catch (e) {
        console.error("Model Load Error:", e);
        alert("모델 파일을 찾을 수 없거나 올바르지 않습니다.\n\n해결방법:\n1. my_model 폴더 안에 model.json, metadata.json, weights.bin 파일이 있는지 확인해주세요.\n2. 혹은 Teachable Machine에서 발급받은 공유 링크(https://...)를 코드의 URL 변수에 넣어주세요.");
        document.getElementById("loading").classList.add("hidden");
        document.getElementById("upload-container").classList.remove("hidden");
        return false;
    }
}

// 3. 사진 파일 업로드 처리
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

// 4. 실시간 카메라 시작
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
            alert("카메라를 시작할 수 없습니다. 권한을 허용해주세요.");
            console.error(e);
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

// 5. 예측 및 UI 업데이트 (사용자 제공 로직 적용)
async function predict(inputElement) {
    const prediction = await model.predict(inputElement);
    
    // 확률 순 정렬
    prediction.sort((a, b) => b.probability - a.probability);

    // 결과 텍스트 업데이트
    const resultTitle = document.getElementById("top-result-title");
    resultTitle.innerHTML = `당신은 <strong>${prediction[0].className}상</strong>입니다!`;

    // 프로그레스 바 업데이트
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