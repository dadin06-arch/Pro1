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
    // 💡 [수정] 'Start Analysis' 버튼 클릭 시 toggleAnalysis 대신 showConsentModalForWebcam 호출
    document.getElementById("start-button").addEventListener("click", showConsentModalForWebcam);
    
    document.getElementById("model1-btn").addEventListener("click", () => handleModelChange(1));
    document.getElementById("model2-btn").addEventListener("click", () => handleModelChange(2));
    
    document.getElementById("mode-webcam").addEventListener("click", () => switchMode('webcam'));
    document.getElementById("mode-upload").addEventListener("click", () => switchMode('image'));

    document.getElementById("image-upload").addEventListener("change", handleImageUpload);
    // 💡 [참고] Upload 모드 시작 버튼은 기존 로직 유지 (파일 선택 완료 후 바로 분석 시작 가능)
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
    
    // 💡 (추가) 초상권 동의 모달 이벤트 리스너
    const consentModal = document.getElementById('consent-modal');
    const consentAgreeBtn = document.getElementById('consent-agree-btn');
    const consentCancelBtn = document.getElementById('consent-cancel-btn');
    // 팝업 내의 X 버튼을 정확히 선택
    const closeModalSpan = document.querySelector('#consent-modal .close-btn');
    
    if (consentModal) {
        // '동의 및 분석 시작' 버튼 클릭 이벤트
        consentAgreeBtn.addEventListener('click', handleConsentAndStartAnalysis);
        
        // '취소' 버튼 클릭 이벤트
        consentCancelBtn.addEventListener('click', () => {
            consentModal.style.display = 'none';
            // 취소 시 사용자에게 알림 (선택 사항)
            // alert('분석이 취소되었습니다. 초상권 동의를 하셔야 분석을 진행할 수 있습니다.');
        });
        
        // 팝업의 X 버튼 클릭 이벤트
        closeModalSpan.addEventListener('click', () => {
            consentModal.style.display = 'none';
        });
        
        // 팝업 바깥 영역 클릭 시 닫기
        window.addEventListener('click', (event) => {
            if (event.target == consentModal) {
                consentModal.style.display = 'none';
            }
        });
    }

    switchMode('webcam');
    
    document.getElementById("style-selection-controls").style.display = 'none';
    document.getElementById("tone-selection-controls").style.display = 'none';
});

// ----------------------------------------------------
// 2.5. Consent Modal & Analysis Execution Logic (추가)
// ----------------------------------------------------

// 'Start Analysis' 버튼 클릭 시 웹캠 모드일 때만 모달을 띄우는 함수
function showConsentModalForWebcam() {
    const analysisMode = document.querySelector('input[name="analysis-mode"]:checked').value;
    const startButton = document.getElementById("start-button");
    
    // 이미 실행 중이면, 그냥 일시 정지/재개 로직을 따릅니다.
    if (isRunning) {
        toggleAnalysis(); 
        return;
    }
    
    // 웹캠 모드인 경우에만 팝업을 띄웁니다.
    if (analysisMode === 'webcam') {
        document.getElementById('consent-modal').style.display = 'block';
    } else {
        // 이미지 업로드 모드에서 실수로 이 버튼이 눌린 경우를 대비
        alert('이미지 업로드 모드에서는 "Process Uploaded Image" 버튼을 사용해 주세요.');
    }
}

// 동의 후 분석을 시작하는 핸들러. Webcam 모드 시작.
function handleConsentAndStartAnalysis() {
    document.getElementById('consent-modal').style.display = 'none';
    // 초상권 동의 후, 기존의 웹캠 시작/초기화 로직을 실행합니다.
    toggleAnalysis(); 
}


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
    if (!imgElement) {
        alert('Please upload an image first.');
        return;
    }
    
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
    labelContainer.innerHTML = 'Analyzing...';
    
    // Upload 모드에서도 얼굴 감지 수행
    predict(modelToUse, modelName, imgElement); 
    
    document.getElementById("process-image-btn").innerText = 'Re-Analyze Image';
}


// ===============================================
// 7. Prediction Logic (Core AI)
// ===============================================

async function predict(modelToUse, modelName, element) {
    if (isRunning && currentSource === 'webcam') {
        // Webcam 모드일 경우 얼굴 감지 (BlazeFace)를 통해 얼굴 위치를 찾고 크롭
        const predictions = await faceDetectorModel.estimateFaces(element, false); 
        
        if (predictions.length > 0) {
            const largestFace = predictions[0]; // 가장 큰 얼굴만 사용
            const start = largestFace.topLeft;
            const end = largestFace.bottomRight;
            const size = [end[0] - start[0], end[1] - start[1]]; 
            
            // 💡 얼굴 크기 검사
            if (size[0] < MIN_FACE_SIZE || size[1] < MIN_FACE_SIZE) {
                // ... (생략된 경고 메시지 코드)
            }
            
            // 💡 캔버스에서 얼굴 영역만 크롭
            const faceCanvas = document.createElement('canvas');
            faceCanvas.width = size[0];
            faceCanvas.height = size[1];
            const ctx = faceCanvas.getContext('2d');
            ctx.drawImage(element, start[0], start[1], size[0], size[1], 0, 0, size[0], size[1]);
            
            // 💡 크롭된 얼굴 영역으로 예측 수행
            const prediction = await modelToUse.predict(faceCanvas);
            
            displayPredictionResults(prediction, modelName);
            
        } else {
            // 얼굴 감지 실패 시
            labelContainer.innerHTML = '<div style="color: red; font-weight: bold; padding: 10px;">🔴 Face Not Found!</div><p>A clear face could not be detected.</p>';
            document.getElementById("style-selection-controls").style.display = 'none';
            document.getElementById("tone-selection-controls").style.display = 'none';
        }
    } else {
        // Image Upload 모드 또는 Webcam Pause 모드
        
        // 1. 얼굴 감지 수행 (크롭을 위해)
        const predictions = await faceDetectorModel.estimateFaces(element, false);
        
        if (predictions.length === 0) {
            // 얼굴 감지 실패 시
            labelContainer.innerHTML = '<div style="color: red; font-weight: bold; padding: 10px;">🔴 Face Not Found!</div><p>A clear face could not be detected.</p>';
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
        
        displayPredictionResults(prediction, modelName);
    }
}

function displayPredictionResults(prediction, modelName) {
    const currentMaxPredictions = prediction.length;
    let resultHTML = `<div class="model-name-title"><h3>${modelName} Results:</h3></div>`;
    for (let i = 0; i < currentMaxPredictions; i++) {
        const classPrediction = `<strong>${prediction[i].className}</strong>: ${(prediction[i].probability * 100).toFixed(1)}%`;
        resultHTML += `<div class="prediction-item">${classPrediction}</div>`;
    }
    labelContainer.innerHTML = resultHTML;

    if (currentModel === 1) {
        document.getElementById("style-selection-controls").style.display = 'block';
        document.getElementById("tone-selection-controls").style.display = 'none';
        
        // 가장 높은 확률의 얼굴형을 자동으로 선택하여 추천 표시
        const topResult = prediction.reduce((prev, current) => (prev.probability > current.probability) ? prev : current);
        const topFaceType = topResult.className;
        
        document.querySelectorAll('.face-select-btn').forEach(btn => btn.classList.remove('active'));
        const autoSelectBtn = document.querySelector(`.face-select-btn[data-facetype="${topFaceType}"]`);
        if (autoSelectBtn) {
            autoSelectBtn.classList.add('active');
            showRecommendation(topFaceType);
        }
        
    } else if (currentModel === 2) {
        document.getElementById("tone-selection-controls").style.display = 'block';
        document.getElementById("style-selection-controls").style.display = 'none';
        
        // 가장 높은 확률의 톤을 자동으로 선택하여 추천 표시
        const topResult = prediction.reduce((prev, current) => (prev.probability > current.probability) ? prev : current);
        const topToneType = topResult.className;
        
        document.querySelectorAll('.tone-select-btn').forEach(btn => btn.classList.remove('active'));
        const autoSelectBtn = document.querySelector(`.tone-select-btn[data-tonetype="${topToneType}"]`);
        if (autoSelectBtn) {
            autoSelectBtn.classList.add('active');
            showToneRecommendation(topToneType);
        }
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
    
    // 추천 HTML 생성
    const recommendationHTML = `
        <h4>⭐ Recommended Hairstyle Guide for ${faceType} Face Type</h4>
        <p class="summary-text">${data.summary}</p>
        
        <div class="hair-styles-container">
            <div class="style-column">
                <h5><i class="fas fa-cut"></i> Short Styles</h5>
                <img src="${data.shortImage}" alt="${faceType} Short Style">
                <p>${data.short}</p>
                <button class="btn ar-try-on-btn" onclick="startArTryOn('${data.shortSticker}')">AR Try-On</button>
            </div>
            <div class="style-column">
                <h5><i class="fas fa-cut"></i> Long Styles</h5>
                <img src="${data.longImage}" alt="${faceType} Long Style">
                <p>${data.long}</p>
                <button class="btn ar-try-on-btn" onclick="startArTryOn('${data.longSticker}')">AR Try-On</button>
            </div>
        </div>
    `;
    outputContainer.innerHTML = recommendationHTML;
}

// 퍼스널 톤 추천 출력
function showToneRecommendation(toneType) {
    const data = personalToneData[toneType];
    const outputContainer = document.getElementById("recommendation-output");
    if (!data) {
        outputContainer.innerHTML = `<p style="color:red;">Error: No recommendation data found for ${toneType} Tone.</p>`;
        return;
    }
    
    // 추천 HTML 생성
    const recommendationHTML = `
        <h4>⭐ Recommended Color Guide for ${toneType} Tone</h4>
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
// 9. AR Try-On Logic (기존 핵심 기능)
// ===============================================

// AR 웹캠 활성화 및 스티커 오버레이
async function startArTryOn(stickerPath) {
    // 분석 웹캠이 실행 중이면 정지
    if (isRunning) {
        toggleAnalysis();
    }
    
    // AR 컨테이너 표시
    arContainer.style.display = 'flex';
    
    // 스티커 이미지 설정
    arStickerOverlay.src = stickerPath;
    arStickerOverlay.style.display = 'block';
    
    // 💡 [수정] 현재 스티커 기본 이름 및 길이 정보 저장 (파일명: oval_long_sticker.png 가정)
    const parts = stickerPath.split('/');
    const fileName = parts[parts.length - 1]; // 파일명 (예: oval_long_sticker.png)
    currentStickerBaseName = fileName.replace('_sticker.png', ''); // 예: oval_long

    // 웹캠 스트림이 없으면 새로 시작
    if (!arWebcamStream) {
        try {
            arWebcamStream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: 400,
                    height: 300
                }
            });
            arWebcamVideo.srcObject = arWebcamStream;
            
            // 웹캠 피드가 재생될 때 얼굴 감지 루프 시작
            arWebcamVideo.onloadedmetadata = () => {
                arWebcamVideo.play();
                arLoop();
            };
        } catch (error) {
            console.error("Error accessing AR webcam:", error);
            alert("AR Try-On을 시작할 수 없습니다. 웹캠 접근 권한을 확인해주세요.");
            arContainer.style.display = 'none';
            arWebcamStream = null;
            return;
        }
    } else {
        // 이미 스트림이 있으면 루프만 재시작
        arLoop();
    }
    
    // 색상 버튼 초기화 및 오리지널 활성화
    document.querySelectorAll('.color-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById("color-original-btn").classList.add('active');
}

// AR 얼굴 감지 및 스티커 위치 업데이트 루프
async function arLoop() {
    // arWebcamVideo가 일시 중지된 상태라면 루프 실행 방지
    if (arWebcamVideo.paused || arWebcamVideo.ended || arContainer.style.display === 'none') return;
    
    const videoWidth = arWebcamVideo.videoWidth;
    const videoHeight = arWebcamVideo.videoHeight;
    
    if (faceDetectorModel) {
        const predictions = await faceDetectorModel.estimateFaces(arWebcamVideo, false);
        
        if (predictions.length > 0) {
            const largestFace = predictions[0];
            const start = largestFace.topLeft;
            const end = largestFace.bottomRight;
            const size = [end[0] - start[0], end[1] - start[1]];
            
            // 얼굴 영역 중앙에 스티커를 위치시키고 크기를 조정 (조정 계수 필요)
            // 얼굴 너비의 약 1.5배 (스타일에 따라 조정)
            const STICKER_SCALE = 1.6; 
            const STICKER_OFFSET_Y_RATIO = 0.3; // 얼굴 상단에서 아래로 내리는 비율
            
            const stickerWidth = size[0] * STICKER_SCALE;
            const stickerHeight = size[1] * STICKER_SCALE;

            // 스티커의 시작 위치
            const stickerX = start[0] - ((stickerWidth - size[0]) / 2);
            const stickerY = start[1] - (size[1] * STICKER_OFFSET_Y_RATIO);
            
            arStickerOverlay.style.left = `${stickerX}px`;
            arStickerOverlay.style.top = `${stickerY}px`;
            arStickerOverlay.style.width = `${stickerWidth}px`;
            arStickerOverlay.style.height = `${stickerHeight}px`;
            arStickerOverlay.style.display = 'block';

        } else {
            arStickerOverlay.style.display = 'none'; // 얼굴이 감지되지 않으면 스티커 숨김
        }
    }
    
    requestAnimationFrame(arLoop);
}

// AR 체험 중지
function stopArTryOn() {
    if (arWebcamStream) {
        arWebcamStream.getTracks().forEach(track => track.stop());
        arWebcamStream = null;
    }
    if (arWebcamVideo) {
        arWebcamVideo.srcObject = null;
    }
    arContainer.style.display = 'none';
    arStickerOverlay.style.display = 'none';
    
    // 변수 초기화
    currentStickerBaseName = '';
}

// 💡 (추가) AR 스티커 컬러를 변경하는 함수
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
        newStickerPath = `images/${currentStickerBaseName}_sticker.png`;
    } else {
        // 컬러 이미지 경로: images/oval_long_warm.png (고객님 규칙 반영)
        newStickerPath = `images/${currentStickerBaseName}_${colorType}.png`;
    }
    
    // 이미지 스티커 소스 업데이트
    arStickerOverlay.src = newStickerPath;
}


// ===============================================
// 10. AR Screenshot Logic (새 기능)
// ===============================================

function captureArScreenshot() {
    if (arWebcamVideo.paused || arWebcamVideo.ended || arContainer.style.display === 'none') {
        alert('AR Try-On이 실행 중이지 않습니다.');
        return;
    }
    
    const videoWidth = arWebcamVideo.videoWidth;
    const videoHeight = arWebcamVideo.videoHeight;
    const canvas = document.createElement('canvas');
    canvas.width = videoWidth;
    canvas.height = videoHeight;
    const ctx = canvas.getContext('2d');
    
    // 1. 웹캠 비디오 프레임 그리기
    // 💡 웹캠 비디오는 거울 모드를 위해 CSS transform: scaleX(-1)이 적용되어 있습니다.
    // 캔버스에 그릴 때는 이 변환을 수동으로 적용해야 합니다.
    ctx.translate(videoWidth, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(arWebcamVideo, 0, 0, videoWidth, videoHeight);
    
    // 2. 변환 초기화
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    
    // 3. 스티커 이미지 그리기
    if (arStickerOverlay.style.display !== 'none' && arStickerOverlay.src) {
        const stickerImg = new Image();
        stickerImg.crossOrigin = "anonymous"; // CORS 문제 방지
        
        // 이미지 로드 후 캔버스에 그리기
        stickerImg.onload = () => {            
            // AR 웹캠 Wrapper 크기
            const arWrapper = document.getElementById("ar-webcam-wrapper");
            const wrapperWidth = arWrapper.clientWidth; // 400
            const wrapperHeight = arWrapper.clientHeight; // 300

            // 스티커의 현재 위치/크기 (CSS 픽셀)
            const stickerX = parseFloat(arStickerOverlay.style.left);
            const stickerY = parseFloat(arStickerOverlay.style.top);
            const stickerW = parseFloat(arStickerOverlay.style.width);
            const stickerH = parseFloat(arStickerOverlay.style.height);

            // 캔버스에 직접 그리기 (Webcam 크기에 맞춰 조정)
            ctx.drawImage(stickerImg, stickerX, stickerY, stickerW, stickerH);

            // 4. 다운로드 실행
            triggerDownload(canvas, 'AI_StyleMate_Screenshot.png');
        };
        stickerImg.onerror = () => {
            alert("스티커 이미지 로드에 실패했습니다. 스크린샷을 저장할 수 없습니다.");
        };
        stickerImg.src = arStickerOverlay.src;
        
    } else {
        // 스티커가 없으면 비디오만 다운로드
        triggerDownload(canvas, 'AI_StyleMate_Webcam_Capture.png');
    }
}

function triggerDownload(canvas, filename) {
    const dataURL = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataURL;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}
