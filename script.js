// script.js - AI StyleMate Logic (Final Version with Compositing Feature)

// ----------------------------------------------------
// 1. MODEL PATHS, VARIABLES & DATA DEFINITION
// ----------------------------------------------------
const URL_MODEL_1 = "./models/model_1/"; 
const URL_MODEL_2 = "./models/model_2/"; 

let model1, model2, webcam;
let faceDetectorModel; 
let labelContainer = document.getElementById("label-container");
let currentModel = 0; 
let requestID; 
let isRunning = false; 
let isInitialized = false; 
let currentSource = 'webcam'; 

// 💡 새로운 변수 추가
let currentCaptureCanvas = null; // 캡처된 이미지를 담을 캔버스
let capturedFaceBounds = null;   // 감지된 얼굴 영역 (좌표)

// 💡 얼굴 감지 임계값
const FACE_DETECTION_THRESHOLD = 0.9;
const MIN_FACE_SIZE = 50; 

// 💡 얼굴형별 추천 데이터 및 이미지 URL 정의 (원본 이미지)
const faceTypeData = {
    "Oval": {
        summary: "The most versatile face shape. Naturally suits most hairstyles.",
        short: "Crop cut, undercut, bob.",
        long: "Layered cuts, natural waves.",
        shortImage: 'images/oval_short.png',
        longImage: 'images/oval_long.png'
    },
    "Round": {
        summary: "Styles that look longer and sharper work well. Best with styles that add vertical length and slim the sides.",
        short: "Asymmetrical cuts, volume on top.",
        long: "Long bob, side-flowing layers.",
        shortImage: 'images/round_short.png',
        longImage: 'images/round_long.png'
    },
    "Square": {
        summary: "Reduce sharp angles and add soft lines. Softens a strong jawline with gentle curves.",
        short: "Textured cuts, side-swept styles.",
        long: "Waves with face-framing layers.",
        shortImage: 'images/square_short.png',
        longImage: 'images/square_long.png'
    },
    "Heart": {
        summary: "Keep the top light and add volume toward the bottom. Balances a wider forehead and narrower chin.",
        short: "Side bangs, face-hugging layers.",
        long: "Heavier layers below the chin, side parts.",
        shortImage: 'images/heart_short.png',
        longImage: 'images/heart_long.png'
    },
    "Oblong": {
        summary: "Shorten the appearance of length and widen the silhouette. Works best with styles that reduce length and increase width.",
        short: "Jaw-line bobs, forehead-covering bangs.",
        long: "Medium-length layers, styles with side volume.",
        shortImage: 'images/oblong_short.png',
        longImage: 'images/oblong_long.png'
    }
};

// 💡 합성 스티커 파일 경로 및 위치 조정 데이터 (images 폴더에 바로 저장된 파일 가정)
const STYLES = {
    "Oval_Short": { 
        stickerUrl: 'images/oval_short_sticker.png', 
        scaleFactor: 1.15, // 얼굴 너비의 115% 크기
        yOffsetRatio: -0.45 // 얼굴 상단 좌표(y)에서 -45%만큼 위로 올림
    },
    "Oval_Long": {
        stickerUrl: 'images/oval_long_sticker.png',
        scaleFactor: 1.5,
        yOffsetRatio: -0.2
    },
    "Round_Short": { stickerUrl: 'images/round_short_sticker.png', scaleFactor: 1.25, yOffsetRatio: -0.4 },
    "Round_Long": { stickerUrl: 'images/round_long_sticker.png', scaleFactor: 1.6, yOffsetRatio: -0.25 },
    "Square_Short": { stickerUrl: 'images/square_short_sticker.png', scaleFactor: 1.1, yOffsetRatio: -0.35 },
    "Square_Long": { stickerUrl: 'images/square_long_sticker.png', scaleFactor: 1.4, yOffsetRatio: -0.15 },
    "Heart_Short": { stickerUrl: 'images/heart_short_sticker.png', scaleFactor: 1.2, yOffsetRatio: -0.5 },
    "Heart_Long": { stickerUrl: 'images/heart_long_sticker.png', scaleFactor: 1.45, yOffsetRatio: -0.1 },
    "Oblong_Short": { stickerUrl: 'images/oblong_short_sticker.png', scaleFactor: 1.1, yOffsetRatio: -0.3 },
    "Oblong_Long": { stickerUrl: 'images/oblong_long_sticker.png', scaleFactor: 1.35, yOffsetRatio: -0.1 }
};

// 💡 퍼스널 톤 추천 데이터 (생략 없이 원본 유지)
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
        clothing: "Coral, peach, salmon | Dark tones: Olive, khaki, mustard | Neutrals: Beige, ivory, cream",
        makeup: "Lips: Coral, orange-red, brick | Eyes: Gold, bronze, warm brown | Blush: Peach, coral, apricot",
        image: 'images/warm_tone.png' 
    }
};


// ===============================================
// 2. Event Listeners and Setup (생략)
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
        });
    });

    document.querySelectorAll('.tone-select-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            document.querySelectorAll('.face-select-btn').forEach(btn => btn.classList.remove('active')); 
            document.querySelectorAll('.tone-select-btn').forEach(btn => btn.classList.remove('active'));
            e.target.classList.add('active');
            const toneType = e.target.getAttribute('data-tonetype');
            showToneRecommendation(toneType); 
        });
    });
    
    switchMode('webcam');
    
    document.getElementById("style-selection-controls").style.display = 'none';
    document.getElementById("tone-selection-controls").style.display = 'none';
});


// ===============================================
// 3. Mode Switching Logic (생략)
// ===============================================

function switchMode(mode) {
    if (currentSource === mode) return;

    if (isRunning) {
        toggleAnalysis(); 
    }
    
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

        // 💡 [수정] 분석 중지 시, 캡처 및 얼굴 영역 저장 (Canvas 생성)
        if (webcam && currentSource === 'webcam') {
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = webcam.canvas.width;
            tempCanvas.height = webcam.canvas.height;
            const ctx = tempCanvas.getContext('2d');
            ctx.drawImage(webcam.canvas, 0, 0);
            currentCaptureCanvas = tempCanvas;
            
            labelContainer.innerHTML += '<p style="color:#007bff; font-weight:bold;">✨ 결과 고정됨. 아래 스타일 버튼을 눌러 합성해 보세요!</p>';
        } else if (currentSource === 'image' && document.getElementById('uploaded-image')) {
            const imgElement = document.getElementById('uploaded-image');
            const tempCanvas = document.createElement('canvas');
            // 원본 이미지 크기 사용
            tempCanvas.width = imgElement.naturalWidth || imgElement.width;
            tempCanvas.height = imgElement.naturalHeight || imgElement.height;
            const ctx = tempCanvas.getContext('2d');
            ctx.drawImage(imgElement, 0, 0, tempCanvas.width, tempCanvas.height);
            currentCaptureCanvas = tempCanvas;
            
            labelContainer.innerHTML += '<p style="color:#007bff; font-weight:bold;">✨ 분석 결과 고정됨. 아래 스타일 버튼을 눌러 합성해 보세요!</p>';
        } else {
            currentCaptureCanvas = null; // 캡처할 이미지가 없는 경우 초기화
        }
        
        // 얼굴 영역은 predict 함수에서 전역 변수 capturedFaceBounds에 저장됨.
        
        return; 
    }
    
    if (!isInitialized) {
        // ... (기존 초기화 로직)
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
// 5. Webcam Prediction Loop and Model Change Handler (생략)
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
// 6. Image Upload Logic (생략)
// ===============================================

function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

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
    
    if (!isInitialized) {
        labelContainer.innerHTML = 'Loading models... Please wait.';
        try {
            model1 = await tmImage.load(URL_MODEL_1 + "model.json", URL_MODEL_1 + "metadata.json");
            model2 = await tmImage.load(URL_MODEL_2 + "model.json", URL_MODEL_2 + "metadata.json");
            faceDetectorModel = await blazeface.load(); 
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
        capturedFaceBounds = null; 
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
        
        capturedFaceBounds = null; 
        return; 
    }
    
    // 선택적: 얼굴 크기 검사
    const largestFace = predictions[0]; 
    const faceWidth = largestFace.bottomRight[0] - largestFace.topLeft[0];
    const faceHeight = largestFace.bottomRight[1] - largestFace.topLeft[1];

    if (faceWidth < MIN_FACE_SIZE || faceHeight < MIN_FACE_SIZE) {
        labelContainer.innerHTML = '<div style="color: orange; font-weight: bold; padding: 10px;">⚠️ 경고: 얼굴 크기가 너무 작습니다!</div><p>카메라에 더 가까이 다가가거나, 사진에서 얼굴이 더 크게 보이도록 해 주세요.</p>';
        document.getElementById("recommendation-output").innerHTML = '<p>얼굴 인식 실패: 얼굴 크기가 너무 작습니다.</p>';
        
        document.getElementById("style-selection-controls").style.display = 'none';
        document.getElementById("tone-selection-controls").style.display = 'none';
        
        capturedFaceBounds = null;
        return;
    }
    
    // 💡 2. 얼굴 감지 성공 시 좌표 저장
    capturedFaceBounds = {
        x: largestFace.topLeft[0],
        y: largestFace.topLeft[1],
        width: faceWidth,
        height: faceHeight
    };
    
    // ----------------------------------------------------------------
    // 💡 3. 분류(Classification) 로직: 얼굴이 명확할 때만 실행
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
// 8. Manual Recommendation Output (합성 버튼 로직)
// ===============================================

// 얼굴형 추천 출력 (Model 1)
function showRecommendation(faceType) {
    const data = faceTypeData[faceType]; 
    const outputContainer = document.getElementById("recommendation-output");
    
    if (!data) {
        outputContainer.innerHTML = `<p style="color:red;">Error: No recommendation data found for ${faceType}.</p>`;
        return;
    }
    
    const isReadyForComposite = currentCaptureCanvas && capturedFaceBounds;

    const compositeWarning = isReadyForComposite ? '' : `
        <p style="color:red; font-weight:bold; margin-top: 10px;">
            ⚠️ 경고: 합성할 이미지나 얼굴 영역이 감지되지 않았습니다. 
            웹캠/이미지 분석 후 "Pause & Lock Result" 버튼을 눌러 이미지를 캡처해 주세요.
        </p>`;


    const recommendationHTML = `
        <div class="recommendation-content">
            <h4>✨ Hairstyle Guide for ${faceType} Face Shape</h4>
            
            ${compositeWarning}
            <p class="summary-text">${data.summary}</p>
            
            <div class="hair-styles-container">
                <div class="style-column">
                    <h5><i class="fas fa-cut"></i> Short Hair: ${data.short}</h5>
                    <div id="canvas-container-short" class="composite-wrapper">
                        <img src="${data.shortImage}" alt="${faceType} Short Hairstyle">
                        <button class="btn primary-btn composite-btn ${isReadyForComposite ? '' : 'disabled'}" 
                                data-style="${faceType}_Short" 
                                ${isReadyForComposite ? `onclick="combineAndDisplayImage('${faceType}_Short', 'canvas-container-short')"` : 'disabled'}>
                            💇‍♀️ Short Style 합성!
                        </button>
                    </div>
                </div>
                
                <div class="style-column">
                    <h5><i class="fas fa-spa"></i> Long Hair: ${data.long}</h5>
                    <div id="canvas-container-long" class="composite-wrapper">
                        <img src="${data.longImage}" alt="${faceType} Long Hairstyle">
                         <button class="btn primary-btn composite-btn ${isReadyForComposite ? '' : 'disabled'}" 
                                data-style="${faceType}_Long" 
                                ${isReadyForComposite ? `onclick="combineAndDisplayImage('${faceType}_Long', 'canvas-container-long')"` : 'disabled'}>
                            💃 Long Style 합성!
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    outputContainer.innerHTML = recommendationHTML; 
}


// 퍼스널 톤 추천 출력 (Model 2) (생략 없이 원본 유지)
function showToneRecommendation(toneType) {
    const data = personalToneData[toneType]; 
    const outputContainer = document.getElementById("recommendation-output");
    
    if (!data) {
        outputContainer.innerHTML = `<p style="color:red;">Error: No recommendation data found for ${toneType}.</p>`;
        return;
    }

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


// 💡 9. Hair Style Image Compositing Logic (합성 기능)
// ===============================================

/**
 * 캡처된 이미지와 선택된 헤어 스타일 스티커를 합성하여 결과 컨테이너에 표시합니다.
 * @param {string} styleKey STYLES 객체의 키 (예: 'Oval_Short')
 * @param {string} containerId 결과를 표시할 HTML 요소의 ID (예: 'canvas-container-short')
 */
function combineAndDisplayImage(styleKey, containerId) {
    if (!currentCaptureCanvas || !capturedFaceBounds) {
        // 이 코드는 합성 버튼이 활성화된 후에만 실행되지만, 안전을 위해 남겨둡니다.
        alert("합성할 원본 이미지나 얼굴 영역이 감지되지 않았습니다. 분석을 일시 정지(Pause)하여 이미지를 캡처해 주세요.");
        return;
    }

    const styleData = STYLES[styleKey];
    if (!styleData) {
        alert(`Error: Style data not found for key: ${styleKey}`);
        return;
    }

    const container = document.getElementById(containerId);
    
    // 💡 로딩 메시지
    container.innerHTML = '<p style="color: #007bff;">합성 중... 잠시만 기다려 주세요.</p>';

    const stickerImg = new Image();
    stickerImg.crossOrigin = "anonymous"; 
    stickerImg.src = styleData.stickerUrl;

    stickerImg.onload = () => {
        // 1. 결과 캔버스 생성 (크기는 원본 캡처 이미지와 동일)
        const canvas = document.createElement('canvas');
        canvas.width = currentCaptureCanvas.width;
        canvas.height = currentCaptureCanvas.height;
        const ctx = canvas.getContext('2d');

        // 2. 원본 캡처 이미지를 캔버스에 그립니다.
        // **중요:** 캔버스의 크기가 웹캠/업로드 이미지의 실제 픽셀 크기이므로, 전체 크기로 그립니다.
        ctx.drawImage(currentCaptureCanvas, 0, 0);

        // 3. 얼굴 영역 정보를 가져옵니다.
        const faceX = capturedFaceBounds.x;
        const faceY = capturedFaceBounds.y;
        const faceWidth = capturedFaceBounds.width;
        
        // 4. 스티커의 최종 크기 및 위치 계산
        const stickerWidth = faceWidth * styleData.scaleFactor;
        const stickerHeight = (stickerWidth / stickerImg.width) * stickerImg.height; 
        
        // 스티커 위치: 얼굴 중앙(x) + Y 오프셋 적용
        const stickerX = faceX + (faceWidth - stickerWidth) / 2; 
        const stickerY = faceY + faceWidth * styleData.yOffsetRatio; 
        
        // 5. 헤어 스티커를 캔버스에 그립니다.
        ctx.drawImage(stickerImg, stickerX, stickerY, stickerWidth, stickerHeight);

        // 6. 결과 컨테이너 업데이트
        container.innerHTML = '';
        
        // 캔버스에 스타일 적용 (CSS에서 정의된 크기를 따르도록)
        canvas.classList.add('composite-result-canvas'); 
        
        container.appendChild(canvas);
        
        // 버튼 다시 추가 (캔버스가 이미지를 대체하고 버튼이 하단에 있도록)
        const button = document.querySelector(`#${containerId} button.composite-btn`);
        if(button) {
            container.appendChild(button);
        }
    };

    stickerImg.onerror = () => {
        container.innerHTML = '<p style="color: red;">⚠️ 합성 실패: 스티커 이미지(png)를 로드할 수 없습니다. 파일 경로(images/)를 확인해 주세요.</p>';
        const button = document.querySelector(`#${containerId} button.composite-btn`);
        if(button) {
             container.appendChild(button);
        }
    };
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
