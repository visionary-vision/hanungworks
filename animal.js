// Teachable Machine 모델 경로 (내 로컬 폴더 기준)
const URL = "./my_model/";

let model, webcam, labelContainer, maxPredictions;

// 1. 웹캠으로 시작하기
async function initWebcam() {
    // UI 전환
    document.getElementById("upload-area").classList.add("hidden");
    document.getElementById("result-area").classList.remove("hidden");
    document.getElementById("loading").classList.remove("hidden");

    const modelURL = URL + "model.json";
    const metadataURL = URL + "metadata.json";

    try {
        model = await tmImage.load(modelURL, metadataURL);
        maxPredictions = model.getTotalClasses();

        // 웹캠 설정
        const flip = true; 
        webcam = new tmImage.Webcam(250, 250, flip);
        await webcam.setup(); 
        await webcam.play();
        
        document.getElementById("loading").classList.add("hidden");
        document.getElementById("webcam-container").appendChild(webcam.canvas);
        document.getElementById("analysis-result").classList.remove("hidden");

        window.requestAnimationFrame(loop);
    } catch (e) {
        alert("모델을 불러오지 못했습니다. my_model 폴더에 모델 파일들이 있는지 확인해주세요.");
        console.error(e);
    }
}

async function loop() {
    webcam.update(); 
    await predict(webcam.canvas);
    window.requestAnimationFrame(loop);
}

// 2. 사진 파일 업로드로 시작하기
async function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    // UI 전환
    document.getElementById("upload-area").classList.add("hidden");
    document.getElementById("result-area").classList.remove("hidden");
    document.getElementById("loading").classList.remove("hidden");
    document.getElementById("image-preview").classList.remove("hidden");

    // 이미지 프리뷰
    const reader = new FileReader();
    reader.onload = function(e) {
        document.getElementById("image-preview").src = e.target.result;
    };
    reader.readAsDataURL(file);

    const modelURL = URL + "model.json";
    const metadataURL = URL + "metadata.json";

    try {
        if (!model) {
            model = await tmImage.load(modelURL, metadataURL);
            maxPredictions = model.getTotalClasses();
        }

        document.getElementById("loading").classList.add("hidden");
        document.getElementById("analysis-result").classList.remove("hidden");

        // 이미지 로드 후 예측
        const img = new Image();
        img.src = window.URL.createObjectURL(file);
        img.onload = async function() {
            await predict(img);
        };
    } catch (e) {
        alert("분석 중 오류가 발생했습니다.");
        console.error(e);
    }
}

// 3. AI 예측 및 결과 UI 업데이트
async function predict(inputElement) {
    const prediction = await model.predict(inputElement);
    
    // 확률이 가장 높은 순으로 정렬
    prediction.sort((a, b) => b.probability - a.probability);

    const resultTitle = document.getElementById("top-result-title");
    resultTitle.innerHTML = `당신은 ${prediction[0].className}상!`;

    const labelContainer = document.getElementById("label-container");
    labelContainer.innerHTML = ""; // 초기화

    // 상위 5개 결과만 표시 (프로그레스 바 형태)
    for (let i = 0; i < Math.min(maxPredictions, 5); i++) {
        const classTitle = prediction[i].className;
        const prob = (prediction[i].probability * 100).toFixed(0);

        const barHtml = `
            <div class="bar-container">
                <div class="bar-label">
                    <span>${classTitle}</span>
                    <span>${prob}%</span>
                </div>
                <div class="bar-bg">
                    <div class="bar-fill" style="width: ${prob}%"></div>
                </div>
            </div>
        `;
        labelContainer.innerHTML += barHtml;
    }
}