// script.js - AI StyleMate Logic (Final Version with Face Detection + AR Try-On)

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

// 💡 AR Try-On 관련 변수
let arWebcamStream = null;
const arWebcamVideo = document.getElementById("ar-webcam-video");
const arStickerOverlay = document.getElementById("ar-sticker-overlay");
const arContainer = document.getElementById("ar-container");
// 💡 AR 컬러 변경 관련 변수 추가
let currentStickerBaseName = ''; // 현재 스타일의 기본 이름 (예: oval_long)
let currentStickerLength = ''; // 현재 스타일의 길이 (예: short 또는 long)
// 🌟 스크린샷 버튼 DOM 요소 추가
const arScreenshotBtn = document.getElementById("ar-screenshot-btn");

// 💡 AR 실시간 추적 루프 ID 추가
let arRequestID; 


// 💡 얼굴 감지 임계값 (필요 시 조정 가능)
const FACE_DETECTION_THRESHOLD = 0.9; // 얼굴 감지 신뢰도
const MIN_FACE_SIZE = 50; // 최소 얼굴 크기 (픽셀)

// 💡 얼굴형별 추천 데이터 및 이미지 URL 정의
const faceTypeData = {
    "Oval": {
        summary: "The most versatile face shape. Naturally suits most hairstyles.",
        short: "Crop cut, undercut, bob.",
        long: "Layered cuts, natural waves.",
        shortImage: 'images/oval_short.png',
        longImage: 'images/oval_long.png',
        // 💡 AR 스티커 파일명 추가
        shortSticker: 'images/oval_short_sticker.png',
        longSticker: 'images/oval_long_sticker.png'
    },
    "Round": {
        summary: "Styles that look longer and sharper work well. Best with styles that add vertical length and slim the sides.",
        short: "Asymmetrical cuts, volume on top.",
        long: "Long bob, side-flowing layers.",
        shortImage: 'images/round_short.png',
        longImage: 'images/round_long.png',
        // 💡 AR 스티커 파일명 추가
        shortSticker: 'images/round_short_sticker.png',
        longSticker: 'images/round_long_sticker.png'
    },
    "Square": {
        summary: "Reduce sharp angles and add soft lines. Softens a strong jawline with gentle curves.",
        short: "Textured cuts, side-swept styles.",
        long: "Waves with face-framing layers.",
        shortImage: 'images/square_short.png',
        longImage: 'images/square_long.png',
        // 💡 AR 스티커 파일명 추가
        shortSticker: 'images/square_short_sticker.png',
        longSticker: 'images/square_long_sticker.png'
    },
    "Heart": {
        summary: "Keep the top light and add volume toward the bottom. Balances a wider forehead and narrower chin.",
        short: "Side bangs, face-hugging layers.",
        long: "Heavier layers below the chin, side parts.",
        shortImage: 'images/heart_short.png',
        longImage: 'images/heart_long.png',
        // 💡 AR 스티커 파일명 추가
        shortSticker: 'images/heart_short_sticker.png',
        longSticker: 'images/heart_long_sticker.png'
    },
    "Oblong": {
        summary: "Shorten the appearance of length and widen the silhouette. Works best with styles that reduce length and increase width.",
        short: "Jaw-line bobs, forehead-covering bangs.",
        long: "Medium-length layers, styles with side volume.",
        shortImage: 'images/oblong_short.png',
        longImage: 'images/oblong_long.png',
        // 💡 AR 스티커 파일명 추가
        shortSticker: 'images/oblong_short_sticker.png',
        longSticker: 'images/oblong_long_sticker.png'
    }
};

// 💡 퍼스널 톤 추천 데이터 및 이미지 URL 정의 (파일명 최종 수정됨)
const personalToneData = {
    "Cool": {
        summary: "Blue-based and purple-based cool hues make the skin look clearer and brighter.",
        hair: "Ash brown, ash blonde, blue-black",
        clothing: "Light tones: Ice blue, lavender, lilac pink | Dark tones: Navy, charcoal gray, burgundy | Neutrals: White, cool gray",
        makeup: "Lips: Raspberry, fuchsia, cool pink | Eyes: Mauve, silver, cool brown | Blush: Rose pink, lilac pink",
        image: 'images/cool_tone.png' 
    },
    "Warm": {
        summary: "Yellow-based and orange-based warm hues enhance natural warmth and give a healthy glow.",
        hair: "Golden brown, copper brown",
        clothing: "Light tones: Coral, peach, salmon | Dark tones: Olive, khaki, mustard | Neutrals: Beige, ivory, cream",
        makeup: "Lips: Coral, orange-red, brick | Eyes: Gold, bronze, warm brown | Blush: Peach, coral, apricot",
        image: 'images/warm_tone.png' 
    }
};


// ===============================================
// 2. Event Listeners and Setup
// ===============================================

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("start-button").addEventListener("click", toggleAnalysis);
    
    document.getElementById("model1-btn").addEventListener("click", () => handleModelChange(1));
    document.getElementById("model2-btn").addEventListener("click", () => handleModelChange(2));
    
    document.getElementById("mode-webcam").addEventListener("click", () => switchMode('webcam'));
    document.getElementById("mode-upload").addEventListener("click", () => switchMode('image'));

    document.getElementById("image-upload").addEventListener("change", handleImageUpload);
    document.getElementById("process-image-btn").addEventListener("click", processUploadedImage);
    
    document.querySelectorAll('.face-select-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            document.querySelectorAll('.face-select-btn').forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('.tone-select-btn').forEach(btn => btn.classList.remove('active')); 
            e.target.classList.add('active');
            const faceType = e.target.getAttribute('data-facetype');
            showRecommendation(faceType); 
            // 💡 AR Try-On 정지
            stopArTryOn();
        });
    });

    // 💡 컬러 선택 버튼 리스너 추가
    document.getElementById("color-original-btn").addEventListener("click", () => changeStickerColor("original"));
    document.getElementById("color-warm-btn").addEventListener("click", () => changeStickerColor("warm"));
    document.getElementById("color-cool-btn").addEventListener("click", () => changeStickerColor("cool"));
    
    document.querySelectorAll('.tone-select-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            document.querySelectorAll('.face-select-btn').forEach(btn => btn.classList.remove('active')); 
            document.querySelectorAll('.tone-select-btn').forEach(btn => btn.classList.remove('active'));
            e.target.classList.add('active');
            const toneType = e.target.getAttribute('data-tonetype');
            showToneRecommendation(toneType); 
             // 💡 AR Try-On 정지
            stopArTryOn();
        });
    });
    
    // 💡 AR Stop Button Listener
    document.getElementById("ar-stop-button").addEventListener('click', stopArTryOn);
    
    // 🌟 AR Screenshot Button Listener 등록
    if (arScreenshotBtn) {
        arScreenshotBtn.addEventListener('click', captureArScreenshot);
    }
    
    switchMode('webcam');
    
    document.getElementById("style-selection-controls").style.display = 'none';
    document.getElementById("tone-selection-controls").style.display = 'none';
});


// ===============================================
// 3. Mode Switching Logic 
// ===============================================

function switchMode(mode) {
    if (currentSource === mode) return;

    if (isRunning) {
        toggleAnalysis(); 
    }
    
    // 💡 AR Try-On 정지
    stopArTryOn();
    
    const webcamContainer = document.getElementById("webcam-container");
    webcamContainer.innerHTML = '';
    
    currentSource = mode;
    
    document.getElementById("mode-webcam").classList.remove('active');
    document.getElementById("mode-upload").classList.remove('active');
    
    const webcamControls = document.getElementById("webcam-controls");
    const uploadControls = document.getElementById("upload-controls");

    if (mode === 'webcam') {
        document.getElementById("mode-webcam").classList.add('active');
        webcamControls.style.display = 'block';
        uploadControls.style.display = 'none';
        webcamContainer.innerHTML = '<p id="initial-message">Click "Start Analysis" to load webcam.</p>';
        
        if(webcam && webcam.canvas) {
            webcamContainer.appendChild(webcam.canvas);
        }

    } else if (mode === 'image') {
        document.getElementById("mode-upload").classList.add('active');
        webcamControls.style.display = 'none';
        uploadControls.style.display = 'block';
        webcamContainer.innerHTML = '<p id="initial-message">Please upload an image.</p>';
        
        if(webcam) {
            webcam.pause();
        }
    }
    
    labelContainer.innerHTML = (mode === 'webcam' && isRunning) ? 'Running analysis...' : 'Waiting for analysis...';
    document.getElementById("recommendation-output").innerHTML = '<p>Select a model to begin the analysis or selection.</p>';
}


// ===============================================
// 4. Initialization, Webcam Loop Control (toggleAnalysis)
// ===============================================

async function toggleAnalysis() {
    const startButton = document.getElementById("start-button");
    
    if (isRunning) {
        window.cancelAnimationFrame(requestID);
        startButton.innerText = "▶️ Resume Analysis";
        startButton.classList.replace('primary-btn', 'secondary-btn');
        isRunning = false;
        return; 
    }
    
    // 💡 AR Try-On 정지
    stopArTryOn();
    
    if (!isInitialized) {
        startButton.innerText = "LOADING...";
        startButton.disabled = true;
        document.getElementById("webcam-container").innerHTML = "Loading models and setting up webcam. Please wait...";
        
        try {
            model1 = await tmImage.load(URL_MODEL_1 + "model.json", URL_MODEL_1 + "metadata.json");
            model2 = await tmImage.load(URL_MODEL_2 + "model.json", URL_MODEL_2 + "metadata.json");
            
            // 💡 얼굴 감지 모델 로드 추가
            faceDetectorModel = await blazeface.load();

            const flip = true; 
            webcam = new tmImage.Webcam(400, 300, flip); 
            await webcam.setup(); 
            await webcam.play();
            
            document.getElementById("webcam-container").innerHTML = ''; 
            document.getElementById("webcam-container").appendChild(webcam.canvas);
            
            currentModel = 1; 
            updateModelInfo();
            isInitialized = true;

        } catch (error) {
            console.error("Initialization error:", error);
            document.getElementById("webcam-container").innerHTML = "<p style='color:red;'>⚠️ Error! Check console. (Ensure files are present and running on HTTPS)</p>";
            startButton.innerText = "⚠️ Error. Retry";
            startButton.disabled = false;
            return;
        }
        startButton.disabled = false;
    }

    if(webcam) webcam.play(); 
    startButton.innerText = "⏸️ Pause & Lock Result";
    startButton.classList.replace('secondary-btn', 'primary-btn');
    isRunning = true;
    loop(); 
}


// ===============================================
// 5. Webcam Prediction Loop and Model Change Handler 
// ===============================================

function loop() {
    if (currentSource === 'webcam') {
        webcam.update(); 
        
        if (currentModel === 1 && model1) {
            predict(model1, "Face Type Analysis", webcam.canvas);
        } else if (currentModel === 2 && model2) {
            predict(model2, "Personal Tone Analysis", webcam.canvas);
        }
    }
    
    requestID = window.requestAnimationFrame(loop); 
}


function handleModelChange(newModel) {
    if (currentModel === newModel) return;

    currentModel = newModel;
    updateModelInfo();
    
    const styleControls = document.getElementById("style-selection-controls");
    const toneControls = document.getElementById("tone-selection-controls"); 
    const recommendationOutput = document.getElementById("recommendation-output");
    
    // 💡 AR Try-On 정지
    stopArTryOn();
    
    if (newModel === 1) { 
        styleControls.style.display = 'block';
        toneControls.style.display = 'none';
        recommendationOutput.innerHTML = '<p>Select a Face Type button from the **Hair Style Guide** to see recommendations.</p>';
        document.querySelectorAll('.tone-select-btn').forEach(btn => btn.classList.remove('active'));
        
    } else { 
        styleControls.style.display = 'none'; 
        toneControls.style.display = 'block'; 
        recommendationOutput.innerHTML = '<p>Select a Personal Tone button from the **Personal Tone Guide** to see recommendations.</p>';
        document.querySelectorAll('.face-select-btn').forEach(btn => btn.classList.remove('active'));
    }
    
    if ((currentSource === 'webcam' && !isRunning && isInitialized) || currentSource === 'image') {
        const modelToUse = (currentModel === 1) ? model1 : model2;
        const modelName = (currentModel === 1) ? "Face Type Analysis" : "Personal Tone Analysis";
        const element = (currentSource === 'webcam') ? webcam.canvas : document.getElementById('uploaded-image');
        
        if(element) {
            predict(modelToUse, modelName, element);
        }
    } 
}


// ===============================================
// 6. Image Upload Logic
// ===============================================

function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // 💡 AR Try-On 정지
    stopArTryOn();

    const reader = new FileReader();
    reader.onload = (e) => {
        const imgElement = document.createElement('img');
        imgElement.id = 'uploaded-image';
        imgElement.src = e.target.result;
        
        const container = document.getElementById("webcam-container");
        container.innerHTML = ''; 
        container.appendChild(imgElement);

        document.getElementById("process-image-btn").disabled = false;
        labelContainer.innerHTML = 'Image uploaded. Click "Process Uploaded Image" to analyze.';
    };
    reader.readAsDataURL(file);
}

async function processUploadedImage() {
    const imgElement = document.getElementById('uploaded-image');
    if (!imgElement) return;
    
    // 💡 AR Try-On 정지
    stopArTryOn();
    
    if (!isInitialized) {
        labelContainer.innerHTML = 'Loading models... Please wait.';
        try {
            model1 = await tmImage.load(URL_MODEL_1 + "model.json", URL_MODEL_1 + "metadata.json");
            model2 = await tmImage.load(URL_MODEL_2 + "model.json", URL_MODEL_2 + "metadata.json");
            faceDetectorModel = await blazeface.load(); // 💡 얼굴 감지 모델 로드
            isInitialized = true;
        } catch(e) {
            labelContainer.innerHTML = 'Error loading models. Check console.';
            return;
        }
    }

    const modelToUse = (currentModel === 1) ? model1 : model2;
    const modelName = (currentModel === 1) ? "Face Type Analysis" : "Personal Tone Analysis";

    labelContainer.innerHTML = 'Analyzing image...';
    await predict(modelToUse, modelName, imgElement); 
    
    document.getElementById("process-image-btn").innerText = 'Analysis Complete (Click to re-analyze)';
}


// ===============================================
// 7. Core Prediction and UI Update
// ===============================================

async function predict(modelToUse, modelName, element) {
    if (!modelToUse || !faceDetectorModel) {
        labelContainer.innerHTML = `Error: ${modelName} or Face Detector is not loaded.`;
        return;
    }
    
    // ----------------------------------------------------------------
    // 💡 1. 얼굴 감지(Face Detection) 로직: 얼굴의 명확성 확인
    // ----------------------------------------------------------------
    const predictions = await faceDetectorModel.estimateFaces(element, FACE_DETECTION_THRESHOLD);

    if (predictions.length === 0) {
        labelContainer.innerHTML = '<div style="color: red; font-weight: bold; padding: 10px;">⚠️ Warning: A clear face was not detected!</div><p>Please make sure your face is facing the camera, well-lit, unobstructed, and fully visible before continuing the analysis.</p>';
        document.getElementById("recommendation-output").innerHTML = '<p>Face detection failed: A clear face could not be detected.</p>';
        
        document.getElementById("style-selection-controls").style.display = 'none';
        document.getElementById("tone-selection-controls").style.display = 'none';
        return; 
    }
    
    // 선택적: 얼굴 크기 검사 (너무 멀리 있거나 작게 찍힌 경우)
    const largestFace = predictions[0]; 
    const faceWidth = largestFace.bottomRight[0] - largestFace.topLeft[0];
    const faceHeight = largestFace.bottomRight[1] - largestFace.topLeft[1];

    if (faceWidth < MIN_FACE_SIZE || faceHeight < MIN_FACE_SIZE) {
        labelContainer.innerHTML = '<div style="color: orange; font-weight: bold; padding: 10px;">⚠️ Warning: Your face appears too small!</div><p>Please move closer to the camera or adjust the image so your face appears larger.</p>';
        document.getElementById("recommendation-output").innerHTML = '<p>Face detection failed: The face is too small.</p>';
        
        document.getElementById("style-selection-controls").style.display = 'none';
        document.getElementById("tone-selection-controls").style.display = 'none';
        return;
    }
    
    // ----------------------------------------------------------------
    // 💡 2. 분류(Classification) 로직: 얼굴이 명확할 때만 실행
    // ----------------------------------------------------------------
    
    const currentMaxPredictions = modelToUse.getTotalClasses(); 
    const prediction = await modelToUse.predict(element);

    let resultHTML = `<div class="model-name-title"><h3>${modelName} Results:</h3></div>`;
    
    for (let i = 0; i < currentMaxPredictions; i++) {
        const classPrediction = 
            `<strong>${prediction[i].className}</strong>: ${(prediction[i].probability * 100).toFixed(1)}%`;
        resultHTML += `<div class="prediction-item">${classPrediction}</div>`;
    }
    labelContainer.innerHTML = resultHTML;
    
    if (currentModel === 1) {
        document.getElementById("style-selection-controls").style.display = 'block';
        document.getElementById("tone-selection-controls").style.display = 'none'; 
    } else if (currentModel === 2) {
        document.getElementById("tone-selection-controls").style.display = 'block';
        document.getElementById("style-selection-controls").style.display = 'none'; 
    }
}


// ===============================================
// 8. Manual Recommendation Output 
// ===============================================

// 얼굴형 추천 출력
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
                    <h5><i class="fas fa-cut"></i> Short Hair: ${data.short}</h5>
                    <img src="${data.shortImage}" alt="${faceType} Short Hairstyle">
                    <button class="btn ar-try-on-btn" data-sticker="${data.shortSticker}" data-face="${faceType}" data-length="short">AR sticker photo experience (Short)</button>
                </div>
                
                <div class="style-column">
                    <h5><i class="fas fa-spa"></i> Long Hair: ${data.long}</h5>
                    <img src="${data.longImage}" alt="${faceType} Long Hairstyle">
                    <button class="btn ar-try-on-btn" data-sticker="${data.longSticker}" data-face="${faceType}" data-length="long">AR sticker photo experience (Long)</button>
                </div>
            </div>
        </div>
    `;
    outputContainer.innerHTML = recommendationHTML; 
    
    // 💡 합성 버튼 이벤트 리스너 할당
    document.querySelectorAll('.ar-try-on-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const stickerPath = e.target.getAttribute('data-sticker');
            startArTryOn(stickerPath);
        });
    });
}

// 퍼스널 톤 추천 출력
function showToneRecommendation(toneType) {
    const data = personalToneData[toneType]; 
    const outputContainer = document.getElementById("recommendation-output");
    
    if (!data) {
        outputContainer.innerHTML = `<p style="color:red;">Error: No recommendation data found for ${toneType}.</p>`;
        return;
    }
    
    // 💡 AR Try-On 정지
    stopArTryOn();

    const recommendationHTML = `
        <div class="recommendation-content">
            <h4>✨ Personal Color Guide for ${toneType} Tone</h4>
            
            <p class="summary-text">${data.summary}</p>
            
            <div class="tone-styles-container">
                <div class="tone-text-column">
                    <div class="tone-category">
                        <h5><i class="fas fa-cut"></i> Hair Colors</h5>
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

    if (currentSource === 'image' && document.getElementById('uploaded-image')) {
         document.getElementById("process-image-btn").innerText = 'Re-Analyze Image';
    }
}


// ===============================================
// 9. AR Try-On Logic (기존 핵심 기능 + 실시간 추적 로직 추가)
// ===============================================

/**
 * 💡 새로운 함수: AR Try-On 모드에서 실시간 얼굴 추적 및 스티커 위치 업데이트 루프
 */
async function arLoop() {
    if (!arWebcamVideo || arWebcamVideo.paused || arWebcamVideo.ended || !faceDetectorModel) {
        // 비디오가 없거나 정지 상태이거나 모델이 없으면 루프를 중지합니다.
        if (arRequestID) window.cancelAnimationFrame(arRequestID);
        arRequestID = null;
        return;
    }

    // 1. 비디오 프레임으로 얼굴 감지 실행
    // estimateFaces는 비디오 요소 자체에서 감지합니다.
    const predictions = await faceDetectorModel.estimateFaces(arWebcamVideo, FACE_DETECTION_THRESHOLD);

    if (predictions.length > 0) {
        const p = predictions[0]; // 가장 큰 얼굴 하나만 사용
        const [x1, y1] = p.topLeft;
        const [x2, y2] = p.bottomRight;
        const faceWidth = x2 - x1;
        const faceHeight = y2 - y1;
        
        // 2. 얼굴 위치에 맞춰 스티커 CSS 업데이트 (헤어스타일 스티커에 맞게 조정)
        
        // ⭐ 핵심 계산: 스티커 위치와 크기 조정 ⭐
        // - 헤어스타일은 얼굴 영역보다 훨씬 넓게 (약 1.8배) 설정
        const stickerScaleFactor = 1.8; 
        const stickerWidth = faceWidth * stickerScaleFactor;
        const stickerHeight = faceHeight * stickerScaleFactor;
        
        // - X 위치: 얼굴 중앙에서 스티커 폭의 절반을 빼서 중앙에 오도록 조정
        const centerX = x1 + faceWidth / 2;
        const left = centerX - stickerWidth / 2;
        
        // - Y 위치: 이마 위쪽(헤어라인)에 맞추기 위해 얼굴 높이의 약 50%만큼 위로 이동
        const topOffsetFactor = 0.5; 
        const top = y1 - faceHeight * topOffsetFactor; 
        
        // 3. 스티커 CSS 업데이트
        arStickerOverlay.style.left = `${left}px`;
        arStickerOverlay.style.top = `${top}px`;
        arStickerOverlay.style.width = `${stickerWidth}px`;
        arStickerOverlay.style.height = `${stickerHeight}px`;
        
        arStickerOverlay.style.display = 'block';
    } else {
        // 얼굴이 감지되지 않으면 스티커 숨김
        arStickerOverlay.style.display = 'none';
    }

    // 4. 다음 프레임 요청
    arRequestID = window.requestAnimationFrame(arLoop);
}


// AR 웹캠 활성화 및 스티커 오버레이
async function startArTryOn(stickerPath) {
    // 분석 웹캠이 실행 중이면 정지
    if (isRunning) {
        toggleAnalysis();
    }
    
    // AR 컨테이너 표시
    arContainer.style.display = 'block';
    
    // 스티커 이미지 설정
    arStickerOverlay.src = stickerPath;
    
    // 💡 [수정] 현재 스티커 기본 이름 및 길이 정보 저장 (파일명: oval_long_sticker.png 가정)
    const parts = stickerPath.split('/');
    const fileName = parts[parts.length - 1]; // 파일명 (예: oval_long_sticker.png)
    
    // 파일명에서 ".png"와 "_sticker"를 제거한 기본 스타일 이름 저장 (예: oval_long)
    currentStickerBaseName = fileName.replace('.png', '').replace('_sticker', ''); 
    
    // 길이 정보 저장
    currentStickerLength = currentStickerBaseName.includes('short') ? 'short' : 'long'; 

    // 컬러 버튼 초기화 및 'Original' 활성화
    document.querySelectorAll('.color-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById("color-original-btn").classList.add('active');
    
    // 웹캠 스트림 설정
    try {
        if (arWebcamStream) {
            stopArWebcamStream(); // 기존 스트림이 있다면 정지
        }
        
        arWebcamStream = await navigator.mediaDevices.getUserMedia({
            video: {
                width: 400,
                height: 300,
                facingMode: "user" // 전면 카메라 사용
            }
        });

        arWebcamVideo.srcObject = arWebcamStream;
        arWebcamVideo.play();
        
        // 거울 효과를 위해 비디오 플립 (CSS에서 처리)
        arWebcamVideo.style.transform = 'scaleX(-1)';
        
        // ⭐ 수정 부분: 비디오가 준비되면 AR 루프 시작 ⭐
        arWebcamVideo.onloadeddata = () => {
            if (arRequestID) window.cancelAnimationFrame(arRequestID);
            arLoop();
        };
        
    } catch (err) {
        console.error("AR Webcam activation error: ", err);
        arContainer.innerHTML = '<p style="color:red;">⚠️ Unable to activate the webcam required for the AR experience. Please check your camera permissions.</p>';
        stopArTryOn();
    }
}

// AR 웹캠 스트림 정지
function stopArWebcamStream() {
    if (arWebcamStream) {
        arWebcamStream.getTracks().forEach(track => {
            track.stop();
        });
        arWebcamStream = null;
    }
    arWebcamVideo.srcObject = null;
}

// AR Try-On 전체 정지 및 UI 정리
function stopArTryOn() {
    // ⭐ 수정 부분: AR 루프 정지 ⭐
    if (arRequestID) window.cancelAnimationFrame(arRequestID);
    arRequestID = null;

    stopArWebcamStream();
    arContainer.style.display = 'none';
    arStickerOverlay.style.display = 'none';
    arStickerOverlay.src = "";
}

// AR 스티커 컬러를 변경하는 함수
function changeStickerColor(colorType) {
    if (!currentStickerBaseName) {
        alert('AR Try-On을 먼저 시작해 주세요.');
        return;
    }
    
    // 버튼 클래스 업데이트
    document.querySelectorAll('.color-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`.color-btn[data-color="${colorType}"]`).classList.add('active');

    let newStickerPath = '';
    
    if (colorType === 'original') {
        // 기본 이미지 경로: images/oval_long_sticker.png
        // (기존 스티커 이미지는 여전히 "_sticker" 접미사를 가지고 있다고 가정)
        newStickerPath = `images/${currentStickerBaseName}_sticker.png`; 
    } else {
        // 컬러 이미지 경로: images/oval_long_warm.png (고객님 규칙 반영)
        // currentStickerBaseName (예: oval_long) + colorType (예: warm)
        newStickerPath = `images/${currentStickerBaseName}_${colorType}.png`;
    }
    
    // 이미지 스티커 소스 업데이트
    arStickerOverlay.src = newStickerPath;
}


// ===============================================
// 10. AR Screenshot Logic (기존 기능)
// ===============================================

// 다운로드 처리 도우미 함수
function triggerDownload(canvas) {
    const dataURL = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = dataURL;
    link.download = 'AI_StyleMate_AR_Screenshot_' + new Date().toISOString().slice(0, 10) + '.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    // canvas.remove(); // 캔버스 제거는 호출 측에서 처리
}

function captureArScreenshot() {
    if (!arWebcamVideo || arWebcamVideo.paused || arWebcamVideo.ended || arContainer.style.display === 'none') {
        alert('AR 웹캠이 실행 중이지 않습니다.');
        return;
    }

    // 1. 캔버스 생성 및 크기 설정
    const canvas = document.createElement('canvas');
    // 비디오의 실제 해상도(400x300)를 사용
    const videoWidth = arWebcamVideo.videoWidth; 
    const videoHeight = arWebcamVideo.videoHeight;
    canvas.width = videoWidth;
    canvas.height = videoHeight;
    const ctx = canvas.getContext('2d');

    // 2. 웹캠 비디오 그리기 (거울 효과 적용)
    // 웹캠 비디오는 CSS transform: scaleX(-1)로 좌우 반전되어 있으므로, 캔버스에도 동일하게 적용해야 합니다.
    ctx.save(); // 현재 캔버스 상태 저장
    ctx.translate(videoWidth, 0); // x축 이동
    ctx.scale(-1, 1); // 좌우 반전
    ctx.drawImage(arWebcamVideo, 0, 0, videoWidth, videoHeight);
    ctx.restore(); // 변환 상태 초기화

    // 3. 스티커 이미지 그리기
    if (arStickerOverlay.style.display !== 'none' && arStickerOverlay.src) {
        const stickerImg = new Image();
        stickerImg.crossOrigin = "anonymous"; // CORS 문제 방지
        
        stickerImg.onload = () => {
            
            // ⭐ AR 스티커의 현재 위치와 크기를 가져와서 캔버스에 그립니다. ⭐
            // AR 루프에서 설정한 스티커의 CSS 속성을 캔버스 좌표로 변환하여 사용합니다.
            const stickerLeft = parseFloat(arStickerOverlay.style.left) || 0;
            const stickerTop = parseFloat(arStickerOverlay.style.top) || 0;
            const stickerDrawWidth = parseFloat(arStickerOverlay.style.width) || videoWidth;
            const stickerDrawHeight = parseFloat(arStickerOverlay.style.height) || videoHeight;

            // 스티커도 좌우 반전되어 표시되므로, 캔버스에도 동일하게 변환 후 그려야 합니다.
            ctx.save(); 
            ctx.translate(stickerLeft + stickerDrawWidth, stickerTop); // 스티커 영역의 오른쪽 상단으로 이동
            ctx.scale(-1, 1); // 좌우 반전
            
            // 그릴 때의 좌표는 변환된 좌표계에서 (0, 0)을 기준으로 합니다.
            // 따라서 이미 이동했으므로 x, y 시작점은 (0, 0)이 됩니다.
            ctx.drawImage(stickerImg, 0, 0, stickerDrawWidth, stickerDrawHeight);
            
            ctx.restore(); 

            // 4. 다운로드 실행
            triggerDownload(canvas);
            canvas.remove();
        };
        stickerImg.src = arStickerOverlay.src;
    } else {
        // 스티커가 없는 경우 비디오만 다운로드
        triggerDownload(canvas);
        canvas.remove();
    }
}
