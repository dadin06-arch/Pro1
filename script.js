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
    
    // 💡 AR Stop Button Listener
    document.getElementById("ar-stop-button").addEventListener('click', stopArTryOn);
    
    // 🌟 AR Screenshot Button Listener 등록
    if (arScreenshotBtn) {
        arScreenshotBtn.addEventListener('click', captureArScreenshot);
    }
    
    // 💡 분석 피드백 버튼 이벤트 리스너 추가 (새로 추가된 부분)
    const feedbackMessage = document.getElementById("feedback-message");
    const feedbackButtons = document.querySelectorAll('#feedback-container .feedback-buttons button');
    
    feedbackButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            // 버튼 비활성화 (중복 클릭 방지)
            feedbackButtons.forEach(btn => btn.disabled = true);
            
            // 메시지 표시 ("Thank you for your feedback!")
            feedbackMessage.style.display = 'block';
            
            // 2초 후 메시지 숨김 및 버튼 재활성화 (피드백은 한 번만 받도록 재활성화는 주석 처리)
            setTimeout(() => {
                feedbackMessage.style.display = 'none';
                // feedbackButtons.forEach(btn => btn.disabled = false); 
            }, 2000); 
        });
    });

    
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
    
    // 💡 모드 변경 시 피드백 초기화
    document.getElementById("feedback-message").style.display = 'none';
    document.querySelectorAll('#feedback-container .feedback-buttons button').forEach(btn => btn.disabled = false);
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
    
    // 이미지 모드에서 모델 변경 시 즉시 재분석 시도
    if (currentSource === 'image' && document.getElementById('uploaded-image')) {
        processUploadedImage();
    } else {
        // 웹캠 모드에서 분석이 멈춘 상태라면, 결과 영역을 초기화하거나 다시 시작 메시지를 띄웁니다.
        if (!isRunning) {
            labelContainer.innerHTML = 'Waiting for analysis...';
        }
    }
    
    // 💡 모델 변경 시 피드백 초기화
    document.getElementById("feedback-message").style.display = 'none';
    document.querySelectorAll('#feedback-container .feedback-buttons button').forEach(btn => btn.disabled = false);
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
    
    // 💡 이미지 업로드 시 피드백 초기화
    document.getElementById("feedback-message").style.display = 'none';
    document.querySelectorAll('#feedback-container .feedback-buttons button').forEach(btn => btn.disabled = false);
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
    // 💡 1. 얼굴 감지(Face Detection) 로직
    // ----------------------------------------------------------------
    const predictions = await faceDetectorModel.estimateFaces(element, false); // false: flipHorizontal 
    
    if (predictions.length === 0 || predictions[0].probability < FACE_DETECTION_THRESHOLD) {
        labelContainer.innerHTML = '<div style="color: red; font-weight: bold; padding: 10px;">⚠️ Face Not Detected!</div><p>Please adjust your position or upload a clearer image.</p>';
        document.getElementById("recommendation-output").innerHTML = '<p>Face detection failed. Adjust image/position.</p>';
        document.getElementById("style-selection-controls").style.display = 'none';
        document.getElementById("tone-selection-controls").style.display = 'none';
        return;
    }
    
    // 감지된 얼굴의 크기 계산
    const faceBox = predictions[0].boundingBox;
    const faceWidth = faceBox.bottomRight[0] - faceBox.topLeft[0];
    const faceHeight = faceBox.bottomRight[1] - faceBox.topLeft[1];

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
        // 소수점 첫째 자리까지만 표시
        const classPrediction = `<strong>${prediction[i].className}</strong>: ${(prediction[i].probability * 100).toFixed(1)}%`;
        resultHTML += `<div class="prediction-item">${classPrediction}</div>`;
    }
    
    labelContainer.innerHTML = resultHTML;

    // 추천 가이드 버튼 활성화/비활성화
    if (currentModel === 1) {
        document.getElementById("style-selection-controls").style.display = 'block';
        document.getElementById("tone-selection-controls").style.display = 'none'; 
    } else if (currentModel === 2) {
        document.getElementById("tone-selection-controls").style.display = 'block';
        document.getElementById("style-selection-controls").style.display = 'none'; 
    }
    
    // 💡 분석 결과가 새로 나오면 피드백 버튼을 초기 상태로 되돌립니다. (새로 추가된 부분)
    document.getElementById("feedback-message").style.display = 'none';
    document.querySelectorAll('#feedback-container .feedback-buttons button').forEach(btn => btn.disabled = false); // 버튼 재활성화
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
                    <button class="btn ar-try-on-btn" data-sticker="${data.shortSticker}">Try AR Style</button>
                </div>
                <div class="style-column">
                    <h5><i class="fas fa-cut"></i> Long Hair: ${data.long}</h5>
                    <img src="${data.longImage}" alt="${faceType} Long Hairstyle">
                    <button class="btn ar-try-on-btn" data-sticker="${data.longSticker}">Try AR Style</button>
                </div>
            </div>
        </div>
    `;
    outputContainer.innerHTML = recommendationHTML;

    // AR 버튼에 이벤트 리스너 재등록
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

    const recommendationHTML = `
        <div class="recommendation-content">
            <h4>🎨 Personal Tone Guide: ${toneType} Tone</h4>
            <p class="summary-text">${data.summary}</p>
            <div class="tone-styles-container">
                <div class="tone-image-column">
                    <img src="${data.image}" alt="${toneType} Tone Palette">
                </div>
                <div class="tone-details-column">
                    <h5><i class="fas fa-palette"></i> Recommended Hair Color</h5>
                    <p>${data.hair}</p>
                    <h5><i class="fas fa-tshirt"></i> Recommended Clothing Colors</h5>
                    <p>Light tones: ${data.clothing.split('|')[0]}</p>
                    <p>Dark tones: ${data.clothing.split('|')[1]}</p>
                    <p>Neutrals: ${data.clothing.split('|')[2]}</p>
                    <h5><i class="fas fa-flask"></i> Recommended Makeup Colors</h5>
                    <p>Lips: ${data.makeup.split('|')[0]}</p>
                    <p>Eyes: ${data.makeup.split('|')[1]}</p>
                    <p>Blush: ${data.makeup.split('|')[2]}</p>
                </div>
            </div>
        </div>
    `;
    outputContainer.innerHTML = recommendationHTML;
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

    // 웹캠 스트림 설정
    try {
        if (arWebcamStream) {
            stopArWebcamStream(); // 기존 스트림이 있다면 정지
        }
        arWebcamStream = await navigator.mediaDevices.getUserMedia({
            video: {
                width: 400,
                height: 300,
                facingMode: "user"
            }
        });
        arWebcamVideo.srcObject = arWebcamStream;
        arWebcamVideo.play();
    } catch (err) {
        console.error("Error accessing AR webcam: ", err);
        arContainer.innerHTML = "<p style='color:red;'>AR Webcam access failed. (Ensure HTTPS/permissions)</p>";
    }
}

// AR 웹캠 스트림 정지
function stopArWebcamStream() {
    if (arWebcamStream) {
        arWebcamStream.getTracks().forEach(track => track.stop());
        arWebcamStream = null;
    }
}

// AR Try-On 전체 정지
function stopArTryOn() {
    stopArWebcamStream();
    arContainer.style.display = 'none';
    arStickerOverlay.src = '';
    arStickerOverlay.style.display = 'none';
}

// 🌟 AR 스크린샷 캡처 및 다운로드 (기존 핵심 기능)
function captureArScreenshot() {
    if (!arWebcamVideo.srcObject) {
        alert("AR Try-On is not active. Please start AR mode first.");
        return;
    }

    const videoWidth = arWebcamVideo.videoWidth;
    const videoHeight = arWebcamVideo.videoHeight;

    const canvas = document.createElement('canvas');
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
            // AR 스티커의 현재 CSS 위치와 크기(px)를 가져와서 캔버스에 그릴 좌표로 사용합니다.
            const wrapper = document.getElementById('ar-webcam-wrapper');
            const wrapperRect = wrapper.getBoundingClientRect();
            
            // 이미지 크기가 400x300인 경우를 가정하고 비율을 계산합니다.
            const ratioX = videoWidth / wrapperRect.width;
            const ratioY = videoHeight / wrapperRect.height;

            const stickerComputedStyle = window.getComputedStyle(arStickerOverlay);
            
            // CSS에서 계산된 위치와 크기를 실제 비디오/캔버스 크기에 맞춰 조정
            const drawX_css = parseFloat(stickerComputedStyle.left);
            const drawY_css = parseFloat(stickerComputedStyle.top);
            const drawWidth_css = parseFloat(stickerComputedStyle.width);
            const drawHeight_css = parseFloat(stickerComputedStyle.height);
            
            // 캔버스 좌표계에 맞게 변환
            const drawX = drawX_css * ratioX;
            const drawY = drawY_css * ratioY;
            const drawWidth = drawWidth_css * ratioX;
            const drawHeight = drawHeight_css * ratioY;

            // 스티커 이미지를 그립니다. 스티커는 반전되지 않아야 합니다.
            // 캔버스의 변환이 restore()로 초기화되었기 때문에 별도의 반전이 필요 없습니다.
            ctx.drawImage(stickerImg, drawX, drawY, drawWidth, drawHeight);

            // 4. 캡처된 이미지 다운로드
            const dataURL = canvas.toDataURL('image/png');
            const a = document.createElement('a');
            a.href = dataURL;
            a.download = 'AI_StyleMate_AR_Screenshot.png';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        };
        stickerImg.src = arStickerOverlay.src;
    } else {
        // 스티커가 없는 경우 비디오만 다운로드
        const dataURL = canvas.toDataURL('image/png');
        const a = document.createElement('a');
        a.href = dataURL;
        a.download = 'AI_StyleMate_Webcam_Screenshot.png';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }
}
