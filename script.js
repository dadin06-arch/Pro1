// script.js - AI StyleMate Logic (Final Version with Virtual Try-On)

// ----------------------------------------------------
// 1. MODEL PATHS, VARIABLES & DATA DEFINITION
// ----------------------------------------------------
const URL_MODEL_1 = "./models/model_1/"; 
const URL_MODEL_2 = "./models/model_2/"; 

let model1, model2, webcam;
let faceDetectorModel; // 💡 얼굴 감지 모델 변수
let labelContainer = document.getElementById("label-container");
let currentModel = 0; 
let requestID; 
let isRunning = false; 
let isInitialized = false; 
let currentSource = 'webcam'; 

// 💡 얼굴 감지 임계값 (필요 시 조정 가능)
const FACE_DETECTION_THRESHOLD = 0.9; // 얼굴 감지 신뢰도
const MIN_FACE_SIZE = 50; // 최소 얼굴 크기 (픽셀)

// 💡 VIRTUAL TRY-ON VARIABLES (신규 추가)
let tryOnWebcam; // 가상 체험용 별도 웹캠 객체
let isTryOnActive = false; 

// 💡 얼굴형별 추천 데이터 및 이미지 URL 정의 (Sticker 필드 추가)
const faceTypeData = {
    "Oval": {
        summary: "The most versatile face shape. Naturally suits most hairstyles.",
        short: "Crop cut, undercut, bob.",
        long: "Layered cuts, natural waves.",
        shortImage: 'images/oval_short.png',
        longImage: 'images/oval_long.png',
        shortSticker: 'images/oval_short_sticker.png', // 💡 스티커 이미지 추가
        longSticker: 'images/oval_long_sticker.png'     // 💡 스티커 이미지 추가
    },
    "Round": {
        summary: "Styles that look longer and sharper work well. Best with styles that add vertical length and slim the sides.",
        short: "Asymmetrical cuts, volume on top.",
        long: "Long bob, side-flowing layers.",
        shortImage: 'images/round_short.png',
        longImage: 'images/round_long.png',
        shortSticker: 'images/round_short_sticker.png', // 💡 스티커 이미지 추가
        longSticker: 'images/round_long_sticker.png'     // 💡 스티커 이미지 추가
    },
    "Square": {
        summary: "Reduce sharp angles and add soft lines. Softens a strong jawline with gentle curves.",
        short: "Textured cuts, side-swept styles.",
        long: "Waves with face-framing layers.",
        shortImage: 'images/square_short.png',
        longImage: 'images/square_long.png',
        shortSticker: 'images/square_short_sticker.png', 
        longSticker: 'images/square_long_sticker.png'
    },
    "Heart": {
        summary: "Keep the top light and add volume toward the bottom. Balances a wider forehead and narrower chin.",
        short: "Side bangs, face-hugging layers.",
        long: "Heavier layers below the chin, side parts.",
        shortImage: 'images/heart_short.png',
        longImage: 'images/heart_long.png',
        shortSticker: 'images/heart_short_sticker.png', 
        longSticker: 'images/heart_long_sticker.png'
    },
    "Oblong": {
        summary: "Shorten the appearance of length and widen the silhouette. Works best with styles that reduce length and increase width.",
        short: "Jaw-line bobs, forehead-covering bangs.",
        long: "Medium-length layers, styles with side volume.",
        shortImage: 'images/oblong_short.png',
        longImage: 'images/oblong_long.png',
        shortSticker: 'images/oblong_short_sticker.png', 
        longSticker: 'images/oblong_long_sticker.png'
    }
};

// 💡 퍼스널 톤 추천 데이터
const personalToneData = {
    "Warm": {
        hair: "Ash brown, Copper, Gold highlights.",
        clothing: "Orange, Yellow, Khaki, Ivory.",
        makeup: "Coral, Terracotta, Gold.",
        image: 'images/warm_palette.png'
    },
    "Cool": {
        hair: "Jet black, Blue black, Wine red, Platinum.",
        clothing: "Navy, Blue, White, Pink.",
        makeup: "Pink, Burgundy, Silver.",
        image: 'images/cool_palette.png'
    }
};

// ----------------------------------------------------
// 2. Event Listeners and Setup
// ----------------------------------------------------

document.addEventListener("DOMContentLoaded", () => {
    // 💡 초기 모델 로드 시작 (비동기 처리)
    loadModels(); 

    // 💡 이미지 업로드 리스너
    document.getElementById('image-upload').addEventListener('change', handleImageUpload);
    document.getElementById('uploaded-image').onload = handleImageLoad;

    // 💡 얼굴형 버튼 리스너 (Manual Selection)
    document.querySelectorAll('.face-select-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const faceType = e.target.getAttribute('data-facetype');
            showRecommendation(faceType);
        });
    });

    // 💡 퍼스널 톤 버튼 리스너 (Manual Selection)
    document.querySelectorAll('.tone-select-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const toneType = e.target.getAttribute('data-tonetype');
            showToneRecommendation(toneType);
        });
    });

    // 💡 신규 추가: 모달 닫기 버튼 리스너
    document.getElementById("close-try-on-modal").addEventListener("click", stopVirtualTryOn);
    // 💡 모달 배경 클릭 시 닫기
    document.getElementById("try-on-modal").addEventListener("click", (e) => {
        if (e.target.id === 'try-on-modal') {
            stopVirtualTryOn();
        }
    });

    // 💡 초기 UI 업데이트 (모델 1 기본 활성화)
    handleModelChange(1);
    document.getElementById("status-message").innerText = "Ready to start analysis.";
});

// ----------------------------------------------------
// 3. Model Loading and Initialization
// ----------------------------------------------------

async function loadModels() {
    try {
        document.getElementById("status-message").innerText = "Loading Teachable Machine models and BlazeFace...";
        
        // 💡 Teachable Machine Models
        model1 = await tmImage.load(URL_MODEL_1 + "model.json", URL_MODEL_1 + "metadata.json");
        model2 = await tmImage.load(URL_MODEL_2 + "model.json", URL_MODEL_2 + "metadata.json");

        // 💡 BlazeFace Model (for face detection)
        faceDetectorModel = await blazeface.load();

        isInitialized = true;
        document.getElementById("status-message").innerText = "Models loaded successfully. Ready!";

    } catch (e) {
        console.error("Model loading failed:", e);
        document.getElementById("status-message").innerText = `Error: Model loading failed. Check console for details. (${e.message})`;
    }
}

// ----------------------------------------------------
// 4. Input Source and UI Control
// ----------------------------------------------------

function switchSource(source) {
    if (isRunning) {
        toggleAnalysis(); // 분석 중이면 정지
    }
    
    currentSource = source;
    const webcamContainer = document.getElementById('webcam-container');
    const imageUploadContainer = document.getElementById('image-upload-container');
    const toggleBtn = document.getElementById('toggle-analysis-btn');
    const processImgBtn = document.getElementById('process-image-btn');
    const webcamModeBtn = document.getElementById('webcam-mode-btn');
    const imageModeBtn = document.getElementById('image-mode-btn');

    if (source === 'webcam') {
        webcamContainer.style.display = 'flex';
        imageUploadContainer.style.display = 'none';
        toggleBtn.style.display = 'block';
        processImgBtn.style.display = 'none';
        webcamModeBtn.classList.add('active');
        imageModeBtn.classList.remove('active');
    } else if (source === 'image') {
        webcamContainer.style.display = 'none';
        imageUploadContainer.style.display = 'flex';
        toggleBtn.style.display = 'none';
        
        // 이미지가 업로드되었으면 'Analyze' 버튼 표시
        if (document.getElementById('uploaded-image').style.display !== 'none') {
            processImgBtn.style.display = 'block';
        } else {
            processImgBtn.style.display = 'none';
        }
        
        webcamModeBtn.classList.remove('active');
        imageModeBtn.classList.add('active');
    }
}

function handleImageUpload(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const uploadedImage = document.getElementById('uploaded-image');
            uploadedImage.src = e.target.result;
            uploadedImage.style.display = 'block';
            document.getElementById('upload-placeholder-text').style.display = 'none';
            document.getElementById('process-image-btn').style.display = 'block';
        };
        reader.readAsDataURL(file);
    }
}

function handleImageLoad() {
    // 이미지가 로드되면 분석 버튼 텍스트 업데이트
    document.getElementById("process-image-btn").innerText = 'Analyze Image';
}

function handleModelChange(newModel) {
    if (isRunning) {
        toggleAnalysis(); // 분석 중이면 정지
    }
    currentModel = newModel;
    updateModelInfo();
    
    // UI 섹션 토글
    document.getElementById('face-selection-controls').style.display = (newModel === 1) ? 'block' : 'none';
    document.getElementById('tone-selection-controls').style.display = (newModel === 2) ? 'block' : 'none';
    
    // 분석/추천 결과 초기화
    document.getElementById("recommendation-output").innerHTML = '<p>Select a model to begin the analysis or selection.</p>';
}

function updateModelInfo() {
    const infoElement = document.getElementById("current-model-info");
    const btn1 = document.getElementById("model1-btn");
    const btn2 = document.getElementById("model2-btn");

    if (currentModel === 1) {
        infoElement.innerHTML = "Active Model: **Face Type Analysis**";
        btn1.classList.add('active');
        btn2.classList.remove('active');
    } else if (currentModel === 2) {
        infoElement.innerHTML = "Active Model: **Personal Tone Analysis**";
        btn1.classList.remove('active');
        btn2.classList.add('active');
    }

    if (currentSource === 'image' && document.getElementById('uploaded-image').style.display !== 'none') {
         document.getElementById("process-image-btn").innerText = 'Analyze Image';
    }
}

// ----------------------------------------------------
// 5. Webcam Analysis Logic
// ----------------------------------------------------

async function toggleAnalysis() {
    if (!isInitialized) {
        alert("Models are still loading. Please wait a moment.");
        return;
    }

    if (isRunning) {
        // 정지 로직
        isRunning = false;
        cancelAnimationFrame(requestID);
        webcam.stop();
        document.getElementById("webcam-container").innerHTML = '<div class="webcam-placeholder"><p>Webcam Preview will appear here.</p></div>';
        document.getElementById("toggle-analysis-btn").innerText = 'Start Analysis';
        document.getElementById("status-message").innerText = "Analysis stopped.";
        document.getElementById("face-warning").style.display = 'none';
        document.getElementById("label-container").innerText = 'Waiting for analysis...';
    } else {
        // 시작 로직 (웹캠 모드에서만 실행 가능)
        if (currentSource === 'image') return;

        isRunning = true;
        document.getElementById("toggle-analysis-btn").innerText = 'Stop Analysis';
        document.getElementById("status-message").innerText = "Starting webcam and prediction loop...";
        document.getElementById("label-container").innerText = 'Please position your face clearly in the center.';

        try {
            const webcamContainer = document.getElementById("webcam-container");
            webcamContainer.innerHTML = ''; // 플레이스홀더 제거

            const flip = true; // 좌우 반전
            // 💡 웹캠 크기 설정: 400x300 (Teachable Machine 권장)
            webcam = new tmImage.Webcam(400, 300, flip); 
            await webcam.setup(); 
            await webcam.play();
            
            webcamContainer.appendChild(webcam.canvas);
            
            // 캔버스 크기를 컨테이너 크기에 맞게 조정 (CSS에서 처리)
            webcam.canvas.style.width = '100%';
            webcam.canvas.style.height = '100%';

            requestID = window.requestAnimationFrame(loop);

        } catch (e) {
            isRunning = false;
            document.getElementById("toggle-analysis-btn").innerText = 'Start Analysis';
            document.getElementById("status-message").innerText = `Error: Cannot access webcam. (${e.message})`;
            console.error("Webcam setup failed:", e);
        }
    }
}

async function loop() {
    if (isRunning) {
        webcam.update(); 
        await predict(webcam.canvas);
        requestID = window.requestAnimationFrame(loop);
    }
}

// ----------------------------------------------------
// 6. Image Analysis Logic
// ----------------------------------------------------

async function analyzeImage() {
    if (!isInitialized) {
        alert("Models are still loading. Please wait a moment.");
        return;
    }
    
    if (currentSource !== 'image') return;
    
    const uploadedImage = document.getElementById('uploaded-image');
    if (uploadedImage.style.display === 'none' || !uploadedImage.src) {
        alert("Please upload an image first.");
        return;
    }

    document.getElementById("process-image-btn").innerText = 'Analyzing...';
    document.getElementById("label-container").innerText = 'Analyzing image...';
    document.getElementById("face-warning").style.display = 'none';
    
    await predict(uploadedImage);
    
    document.getElementById("process-image-btn").innerText = 'Re-Analyze Image';
}

// ----------------------------------------------------
// 7. Core Prediction Function (Handles both Webcam/Image)
// ----------------------------------------------------

async function predict(element) {
    if (!faceDetectorModel) return;

    // 1. 얼굴 감지 (BlazeFace)
    const predictions = await faceDetectorModel.estimateFaces(element, false);
    
    // 2. 얼굴 유효성 검사
    if (predictions.length === 0) {
        document.getElementById("face-warning").style.display = 'block';
        document.getElementById("label-container").innerHTML = '⚠️ 경고: 얼굴이 명확하게 감지되지 않았습니다! (재조정 필요)';
        document.getElementById("recommendation-output").innerHTML = '<p>Analyze failed. Please adjust your face or upload a clearer image.</p>';
        return;
    }
    
    // 💡 얼굴이 감지되면 경고 숨김
    document.getElementById("face-warning").style.display = 'none';

    // 💡 가장 신뢰도 높은 첫 번째 얼굴 사용
    const face = predictions[0];
    const faceWidth = face.bottomRight[0] - face.topLeft[0];
    const faceHeight = face.bottomRight[1] - face.topLeft[1];

    if (faceWidth < MIN_FACE_SIZE || faceHeight < MIN_FACE_SIZE || face.probability < FACE_DETECTION_THRESHOLD) {
         document.getElementById("face-warning").style.display = 'block';
         document.getElementById("label-container").innerHTML = '⚠️ 경고: 얼굴이 너무 작거나, 신뢰도가 낮습니다! (재조정 필요)';
         document.getElementById("recommendation-output").innerHTML = '<p>Analyze failed. Please adjust your face or upload a clearer image.</p>';
         return;
    }

    // 3. 분류 모델 실행
    const modelToUse = (currentModel === 1) ? model1 : model2;
    const prediction = await modelToUse.predict(element);
    
    // 4. 결과 처리
    let maxProbability = -1;
    let predictedClass = '';
    let resultsHTML = '';
    
    for (let i = 0; i < modelToUse.getTotalClasses(); i++) {
        const classPrediction = prediction[i].probability.toFixed(2);
        const className = modelToUse.getLabels()[i];
        
        resultsHTML += `<div>${className}: ${Math.round(classPrediction * 100)}%</div>`;
        
        if (prediction[i].probability > maxProbability) {
            maxProbability = prediction[i].probability;
            predictedClass = className;
        }
    }

    // 5. UI 업데이트
    labelContainer.innerHTML = resultsHTML;
    document.getElementById("status-message").innerText = `Prediction Complete: ${predictedClass}`;

    // 6. 추천 출력 (자동)
    if (currentModel === 1) {
        showRecommendation(predictedClass);
    } else if (currentModel === 2) {
        showToneRecommendation(predictedClass);
    }
}

// ----------------------------------------------------
// 8. Manual Recommendation Output (Face Type)
// ----------------------------------------------------

function showRecommendation(faceType) {
    const data = faceTypeData[faceType]; 
    const outputContainer = document.getElementById("recommendation-output");
    
    if (!data) {
        outputContainer.innerHTML = `<p style="color:red;">Error: No recommendation data found for ${faceType}.</p>`;
        return;
    }

    const recommendationHTML = `
        <div class="recommendation-content">
            <h4>✨ Hairstyle Guide for ${faceType} Face Shape</h4>
            
            <p class="summary-text">${data.summary}</p>
            
            <div class="hair-styles-container">
                <div class="style-column">
                    <h5>
                        <i class="fas fa-cut"></i> Short Hair: ${data.short}
                        <button class="btn try-on-btn" onclick="startVirtualTryOn('${faceType}', 'short')">Try Short</button>
                    </h5>
                    <img src="${data.shortImage}" alt="${faceType} Short Hairstyle">
                </div>
                
                <div class="style-column">
                    <h5>
                        <i class="fas fa-spa"></i> Long Hair: ${data.long}
                        <button class="btn try-on-btn" onclick="startVirtualTryOn('${faceType}', 'long')">Try Long</button>
                    </h5>
                    <img src="${data.longImage}" alt="${faceType} Long Hairstyle">
                </div>
            </div>
        </div>
    `;
    outputContainer.innerHTML = recommendationHTML; 
}


// ----------------------------------------------------
// 9. Manual Recommendation Output (Personal Tone)
// ----------------------------------------------------

function showToneRecommendation(toneType) {
    const data = personalToneData[toneType]; 
    const outputContainer = document.getElementById("recommendation-output");
    
    if (!data) {
        outputContainer.innerHTML = `<p style="color:red;">Error: No recommendation data found for ${toneType}.</p>`;
        return;
    }

    const recommendationHTML = `
        <div class="recommendation-content">
            <h4>🎨 Personal Tone Guide: ${toneType} Tone</h4>
            
            <div class="tone-styles-container">
                <div class="tone-info-column">
                    <div class="tone-category">
                        <h5><i class="fas fa-paint-brush"></i> Recommended Hair Colors</h5>
                        <p>${data.hair}</p>
                    </div>
                    <div class="tone-category">
                        <h5><i class="fas fa-tshirt"></i> Clothing Colors</h5>
                        <p>${data.clothing}</p>
                    </div>
                    <div class="tone-category">
                        <h5><i class="fas fa-gem"></i> Makeup Colors</h5>
                        <p>${data.makeup}</p>
                    </div>
                </div>
                <div class="tone-image-column">
                    <img src="${data.image}" alt="${toneType} Color Palette">
                </div>
            </div>
        </div>
    `;
    outputContainer.innerHTML = recommendationHTML; 
}

// ----------------------------------------------------
// 🌟 VIRTUAL TRY-ON LOGIC (신규 섹션)
// ----------------------------------------------------

// 가상 체험 시작 함수
async function startVirtualTryOn(faceType, length) {
    if (!isInitialized) {
        alert("Models are still loading. Please wait a moment.");
        return;
    }

    if (isTryOnActive) return;
    isTryOnActive = true;

    // 분석 웹캠이 실행 중이면 정지
    if (isRunning) {
        toggleAnalysis(); 
    }
    
    const data = faceTypeData[faceType];
    const stickerUrl = (length === 'short') ? data.shortSticker : data.longSticker;
    const styleName = (length === 'short') ? `${faceType} Short Style` : `${faceType} Long Style`;

    const tryOnModal = document.getElementById("try-on-modal");
    const tryOnContainer = document.getElementById("try-on-webcam-container");
    const stickerImg = document.getElementById("sticker-overlay-img");

    tryOnModal.style.display = 'flex'; // 모달 표시
    tryOnContainer.innerHTML = '<p>Starting webcam...</p>';
    document.getElementById("try-on-style-name").innerText = styleName;

    // 1. 스티커 이미지 설정 및 표시
    stickerImg.src = stickerUrl;
    stickerImg.style.display = 'block';

    try {
        // 2. 가상 체험용 웹캠 설정 및 시작 (400x300 분석 웹캠과 동일하게 설정)
        const flip = true; 
        tryOnWebcam = new tmImage.Webcam(400, 300, flip); 
        await tryOnWebcam.setup(); 
        await tryOnWebcam.play();
        
        // 3. 웹캠 캔버스를 컨테이너에 추가 (스티커의 배경이 됨)
        tryOnContainer.innerHTML = '';
        tryOnContainer.appendChild(tryOnWebcam.canvas); 
        
        // 4. 스티커 이미지 오버레이를 컨테이너에 추가 (CSS로 위치 고정)
        tryOnContainer.appendChild(stickerImg); 

        // 5. 사용자에게 상태 알림
        document.getElementById("try-on-info").querySelector('p').innerText = 'Please align your face with the displayed hairstyle to try it on.';

    } catch (e) {
        isTryOnActive = false;
        tryOnModal.style.display = 'none';
        tryOnContainer.innerHTML = '<p>Error loading webcam for try-on.</p>';
        console.error("Virtual Try-On webcam setup failed:", e);
        alert("가상 체험 웹캠을 실행할 수 없습니다. 카메라 권한을 확인해주세요.");
    }
}

// 가상 체험 중지 함수
function stopVirtualTryOn() {
    if (!isTryOnActive) return;
    isTryOnActive = false;

    const tryOnModal = document.getElementById("try-on-modal");
    
    // 웹캠 정지
    if (tryOnWebcam) {
        tryOnWebcam.stop();
    }

    // 웹캠 컨테이너 및 스티커 정리
    const tryOnContainer = document.getElementById("try-on-webcam-container");
    const stickerImg = document.getElementById("sticker-overlay-img");
    
    // 캔버스 제거
    if (tryOnWebcam && tryOnContainer.contains(tryOnWebcam.canvas)) {
        tryOnContainer.removeChild(tryOnWebcam.canvas);
    }
    // 스티커 이미지 제거
    if (tryOnContainer.contains(stickerImg)) {
        tryOnContainer.removeChild(stickerImg);
    }
    
    stickerImg.style.display = 'none'; // 스티커 이미지 숨김
    tryOnModal.style.display = 'none'; // 모달 숨김
    tryOnContainer.innerHTML = '<p>Loading virtual try-on...</p>';

    // 기존 UI 복원 (Analysis/Image mode)
    if (currentSource === 'webcam' && document.getElementById("toggle-analysis-btn").innerText === 'Start Analysis') {
         document.getElementById("webcam-container").innerHTML = '<div class="webcam-placeholder"><p>Webcam Preview will appear here.</p></div>';
    }
}
