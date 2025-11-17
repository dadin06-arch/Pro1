// script.js - AI StyleMate Logic (Final Version with Face Detection + AR Try-On + Capture)

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
    
    // 💡 AR Stop Button Listener - 초기에는 stopArTryOn으로 연결
    document.getElementById("ar-stop-button").addEventListener('click', stopArTryOn);
    
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
        labelContainer.innerHTML = '<div style="color: red; font-weight: bold; padding: 10px;">⚠️ 경고: 얼굴이 명확하게 감지되지 않았습니다!</div><p>분석을 진행하려면 얼굴이 정면으로 잘 보이고, 충분히 밝으며, 가려지지 않았는지 확인해 주세요.</p>';
        document.getElementById("recommendation-output").innerHTML = '<p>얼굴 인식 실패: 명확한 얼굴을 감지할 수 없습니다.</p>';
        
        document.getElementById("style-selection-controls").style.display = 'none';
        document.getElementById("tone-selection-controls").style.display = 'none';
        return; 
    }
    
    // 선택적: 얼굴 크기 검사 (너무 멀리 있거나 작게 찍힌 경우)
    const largestFace = predictions[0]; 
    const faceWidth = largestFace.bottomRight[0] - largestFace.topLeft[0];
    const faceHeight = largestFace.bottomRight[1] - largestFace.topLeft[1];

    if (faceWidth < MIN_FACE_SIZE || faceHeight < MIN_FACE_SIZE) {
        labelContainer.innerHTML = '<div style="color: orange; font-weight: bold; padding: 10px;">⚠️ 경고: 얼굴 크기가 너무 작습니다!</div><p>카메라에 더 가까이 다가가거나, 사진에서 얼굴이 더 크게 보이도록 해 주세요.</p>';
        document.getElementById("recommendation-output").innerHTML = '<p>얼굴 인식 실패: 얼굴 크기가 너무 작습니다.</p>';
        
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
                    <button class="btn ar-try-on-btn" data-sticker="${data.shortSticker}" data-face="${faceType}" data-length="short">합성 체험 (Short)</button>
                </div>
                
                <div class="style-column">
                    <h5><i class="fas fa-spa"></i> Long Hair: ${data.long}</h5>
                    <img src="${data.longImage}" alt="${faceType} Long Hairstyle">
                    <button class="btn ar-try-on-btn" data-sticker="${data.longSticker}" data-face="${faceType}" data-length="long">합성 체험 (Long)</button>
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
// 9. AR Try-On Logic (캡처 및 화면 고정 기능 포함)
// ===============================================

// AR 웹캠 활성화 및 스티커 오버레이
async function startArTryOn(stickerPath) {
    // 분석 웹캠이 실행 중이면 정지
    if (isRunning) {
        toggleAnalysis();
    }
    
    // AR 컨테이너 표시
    arContainer.style.display = 'block';
    
    // 💡 캡처 후 남은 이미지 제거 및 비디오 다시 표시
    const capturedImage = document.getElementById('ar-captured-image');
    if (capturedImage) {
        capturedImage.remove();
    }
    arWebcamVideo.style.display = 'block';

    // 스티커 이미지 설정
    arStickerOverlay.src = stickerPath;
    arStickerOverlay.style.display = 'block';
    
    // 💡 캡처/정지 버튼 설정
    const stopButton = document.getElementById("ar-stop-button");
    stopButton.innerText = "📸 Capture & Stop";
    stopButton.removeEventListener('click', stopArTryOn); // 기존 리스너 제거
    stopButton.addEventListener('click', captureAndSave); // 새로운 캡처 리스너 연결
    
    // 웹캠 스트림 설정
    try {
        if (arWebcamStream) {
            stopArWebcamStream(); // 기존 스트림이 있다면 정지
        }
        
        // 💡 주의: 실제 사용 시 실시간 얼굴 감지 및 스티커 위치 업데이트 로직(arLoop)을 추가해야 합니다.
        // 이 코드에는 실시간 스티커 움직임 로직은 포함되어 있지 않지만, 캡처 로직은 추가했습니다.

        arWebcamStream = await navigator.mediaDevices.getUserMedia({
            video: {
                width: 400,
                height: 300,
                facingMode: "user" // 전면 카메라 사용
            }
        });

        arWebcamVideo.srcObject = arWebcamStream;
        arWebcamVideo.play();
        
        // 거울 효과를 위해 비디오 플립 
        arWebcamVideo.style.transform = 'scaleX(-1)';
        
    } catch (err) {
        console.error("AR Webcam activation error: ", err);
        arContainer.innerHTML = '<p style="color:red;">⚠️ AR 체험에 필요한 웹캠을 활성화할 수 없습니다. 카메라 권한을 확인해 주세요.</p>';
        stopArTryOn();
    }
}


// 💡 [새로 추가] 캡처 및 저장 기능
async function captureAndSave() {
    // 1. 웹캠 스트림 정지 (화면 고정)
    stopArWebcamStream(); 
    
    const video = arWebcamVideo;
    const sticker = arStickerOverlay;

    // 2. 캔버스 생성 및 설정
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');

    // 3. 비디오(캡처된 배경) 그리기
    // 플립 상태를 유지하여 캡처된 이미지가 웹캠에서 보던 대로 나오도록 합니다.
    ctx.translate(canvas.width, 0); // X축 기준으로 캔버스를 이동
    ctx.scale(-1, 1); // 좌우 반전

    // 캔버스에 비디오 프레임 그리기
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // 캔버스 변환 상태 되돌리기 (스티커를 올바른 위치에 그리기 위해)
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    // 4. 스티커 그리기
    if (sticker.style.display !== 'none' && sticker.src) {
        // AR 스티커의 현재 위치와 크기 가져오기 (CSS 스타일에서)
        // **주의: 이 로직이 작동하려면 스티커의 위치와 크기가 실시간으로 CSS에 업데이트되어야 합니다.**
        // 현재 코드에 실시간 업데이트 로직은 없지만, 이 코드는 최종적으로 캡처 로직을 구현합니다.
        const stickerX = parseFloat(sticker.style.left) || 0; 
        const stickerY = parseFloat(sticker.style.top) || 0;
        const stickerW = parseFloat(sticker.style.width) || canvas.width;
        const stickerH = parseFloat(sticker.style.height) || canvas.height;

        ctx.drawImage(sticker, stickerX, stickerY, stickerW, stickerH);
    }
    
    // 5. 저장 및 다운로드 링크 생성
    const dataURL = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = dataURL;
    link.download = 'AI_StyleMate_AR_Capture.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // 6. 캡처된 이미지로 웹캠 요소 대체 (화면 고정)
    // 캡처된 이미지를 생성하고 비디오 대신 표시합니다.
    const capturedImage = document.createElement('img');
    capturedImage.src = dataURL;
    capturedImage.style.transform = 'scaleX(-1)'; // 거울처럼 보이도록 다시 플립
    capturedImage.id = 'ar-captured-image';

    // 비디오/스티커 대신 캡처된 이미지 표시
    const parent = arWebcamVideo.parentNode;
    if (parent) {
        parent.insertBefore(capturedImage, arWebcamVideo);
        arWebcamVideo.style.display = 'none';
        arStickerOverlay.style.display = 'none'; 
    }

    // 7. 버튼 역할 변경
    const stopButton = document.getElementById("ar-stop-button");
    stopButton.innerText = "❌ Close AR";
    stopButton.removeEventListener('click', captureAndSave);
    stopButton.addEventListener('click', stopArTryOn); // 버튼의 역할을 '종료'로 변경
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
    stopArWebcamStream();
    
    // 💡 캡처된 이미지가 있다면 제거
    const capturedImage = document.getElementById('ar-captured-image');
    if (capturedImage) {
        capturedImage.remove();
    }
    
    // 비디오 요소 다시 보이게 처리
    arWebcamVideo.style.display = 'block';

    // 💡 버튼 리스너 초기화 (초기 상태로 복구)
    const stopButton = document.getElementById("ar-stop-button");
    stopButton.removeEventListener('click', captureAndSave);
    stopButton.removeEventListener('click', stopArTryOn); 
    stopButton.addEventListener('click', stopArTryOn); // 기본 stopArTryOn 리스너 다시 연결 (startArTryOn에서 오버라이드 됨)
    stopButton.innerText = "Stop AR";
    
    arContainer.style.display = 'none';
    arStickerOverlay.style.display = 'none';
    arStickerOverlay.src = "";
}
