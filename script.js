// script.js - AI StyleMate Logic (Final Version with Face Detection, Sticker Overlay, and Screenshot)

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

// 🌟 추가된 변수: 합성 가이드 상태 추적
let isGuideActive = false;
let guideStyleUrl = null; 

// 💡 얼굴 감지 임계값 (필요 시 조정 가능)
const FACE_DETECTION_THRESHOLD = 0.9; // 얼굴 감지 신뢰도
const MIN_FACE_SIZE = 50; // 최소 얼굴 크기 (픽셀)

// 💡 얼굴형별 추천 데이터 및 이미지 URL 정의 (🌟 스티커 이미지 경로 추가)
const faceTypeData = {
    "Oval": {
        summary: "The most versatile face shape. Naturally suits most hairstyles.",
        short: "Crop cut, undercut, bob.",
        long: "Layered cuts, natural waves.",
        shortImage: 'images/oval_short.png',
        longImage: 'images/oval_long.png',
        shortStickerImage: 'images/oval_short_sticker.png', // 🌟 웹캠 오버레이 가이드 사용
        longStickerImage: 'images/oval_long_sticker.png'    // 🌟 웹캠 오버레이 가이드 사용
    },
    "Round": {
        summary: "Styles that look longer and sharper work well. Best with styles that add vertical length and slim the sides.",
        short: "Asymmetrical cuts, volume on top.",
        long: "Long bob, side-flowing layers.",
        shortImage: 'images/round_short.png',
        longImage: 'images/round_long.png',
        shortStickerImage: 'images/round_short_sticker.png',
        longStickerImage: 'images/round_long_sticker.png'
    },
    "Square": {
        summary: "Reduce sharp angles and add soft lines. Softens a strong jawline with gentle curves.",
        short: "Textured cuts, side-swept styles.",
        long: "Waves with face-framing layers.",
        shortImage: 'images/square_short.png',
        longImage: 'images/square_long.png',
        shortStickerImage: 'images/square_short_sticker.png',
        longStickerImage: 'images/square_long_sticker.png'
    },
    "Heart": {
        summary: "Keep the top light and add volume toward the bottom. Balances a wider forehead and narrower chin.",
        short: "Side bangs, face-hugging layers.",
        long: "Heavier layers below the chin, side parts.",
        shortImage: 'images/heart_short.png',
        longImage: 'images/heart_long.png',
        shortStickerImage: 'images/heart_short_sticker.png',
        longStickerImage: 'images/heart_long_sticker.png'
    },
    "Oblong": {
        summary: "Shorten the appearance of length and widen the silhouette. Works best with styles that reduce length and increase width.",
        short: "Jaw-line bobs, forehead-covering bangs.",
        long: "Medium-length layers, styles with side volume.",
        shortImage: 'images/oblong_short.png',
        longImage: 'images/oblong_long.png',
        shortStickerImage: 'images/oblong_short_sticker.png',
        longStickerImage: 'images/oblong_long_sticker.png'
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
    
    // 🌟 스크린샷 버튼 이벤트 리스너 추가
    document.getElementById("screenshot-btn").addEventListener("click", takeScreenshot); 

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
// 3. Mode Switching Logic 
// ===============================================

function switchMode(mode) {
    if (currentSource === mode) return;

    if (isRunning) {
        toggleAnalysis(); 
    }
    
    const webcamContainer = document.getElementById("webcam-container");
    webcamContainer.innerHTML = '';
    
    currentSource = mode;
    
    // 🌟 모드 변경 시 가이드 비활성화 추가
    isGuideActive = false;
    guideStyleUrl = null;
    if (drawGuideOverlay.styleImage) { 
        drawGuideOverlay.styleImage = null;
    }
    // 이미지 모드일 경우 합성 캔버스 제거
    const synthCanvas = document.getElementById('synthesis-output-img');
    if (synthCanvas) synthCanvas.remove();
    
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
    // 🌟 웹캠 모드에서 primary-btn이 되도록 수정
    startButton.classList.remove('secondary-btn');
    startButton.classList.add('primary-btn'); 
    isRunning = true;
    loop(); 
}


// ===============================================
// 5. Webcam Prediction Loop and Model Change Handler 
// ===============================================

function loop() {
    if (currentSource === 'webcam') {
        webcam.update(); 
        
        const canvas = webcam.canvas;
        let modelToUse, modelName;

        if (currentModel === 1 && model1) {
            modelToUse = model1;
            modelName = "Face Type Analysis";
        } else if (currentModel === 2 && model2) {
            modelToUse = model2;
            modelName = "Personal Tone Analysis";
        }
        
        if (modelToUse) {
            predict(modelToUse, modelName, canvas);
        }
        
        // 🌟 실시간 오버레이 가이드 로직 (스티커)
        if (isGuideActive && guideStyleUrl) {
            drawGuideOverlay(canvas, guideStyleUrl);
        }
    }
    
    requestID = window.requestAnimationFrame(loop); 
}

// 🌟 오버레이를 그리는 함수 (스티커 이미지 사용) - 재도입
function drawGuideOverlay(canvas, imageUrl) {
    const ctx = canvas.getContext('2d');
    
    if (!drawGuideOverlay.styleImage || drawGuideOverlay.styleImage.src !== imageUrl) {
        drawGuideOverlay.styleImage = new Image();
        drawGuideOverlay.styleImage.crossOrigin = "Anonymous";
        drawGuideOverlay.styleImage.onload = () => {
            drawGuideOverlay.styleImage.isLoaded = true;
        };
        drawGuideOverlay.styleImage.onerror = () => {
            console.error("🚨 Failed to load sticker image from:", imageUrl);
        };
        drawGuideOverlay.styleImage.src = imageUrl;
        drawGuideOverlay.styleImage.isLoaded = false;
    }

    // 캔버스 내용을 지우지 않고, 현재 웹캠 프레임 위에 겹쳐 그립니다.
    if (drawGuideOverlay.styleImage.isLoaded) {
        ctx.save(); 
        ctx.globalAlpha = 0.5; // 투명도 설정 (50% 투명)
        
        const styleImg = drawGuideOverlay.styleImage;
        const targetWidth = canvas.width * 0.9; // 캔버스 너비의 90%로 키움
        const targetHeight = styleImg.height * (targetWidth / styleImg.width);
        const x = (canvas.width - targetWidth) / 2;
        const y = (canvas.height - targetHeight) / 2;
        
        // 스타일 이미지를 반투명하게 겹쳐 그립니다.
        ctx.drawImage(styleImg, x, y, targetWidth, targetHeight);
        
        ctx.restore(); 
    }
}


function handleModelChange(newModel) {
    if (currentModel === newModel) return;

    currentModel = newModel;
    updateModelInfo();
    
    // 🌟 모델 변경 시 가이드 비활성화
    isGuideActive = false;
    guideStyleUrl = null;
    if (drawGuideOverlay.styleImage) {
        drawGuideOverlay.styleImage = null;
    }
    const synthCanvas = document.getElementById('synthesis-output-img');
    if (synthCanvas) synthCanvas.remove();
    const uploadedImg = document.getElementById('uploaded-image');
    if (uploadedImg) uploadedImg.style.display = 'block';

    
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
// 6. Image Upload Logic
// ===============================================

function handleImageUpload(event) {
    // 🌟 이미지 업로드 시 가이드 비활성화 및 합성 캔버스 제거
    isGuideActive = false;
    guideStyleUrl = null;
    if (drawGuideOverlay.styleImage) {
        drawGuideOverlay.styleImage = null;
    }
    const synthCanvas = document.getElementById('synthesis-output-img');
    if (synthCanvas) synthCanvas.remove();
    
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        // 기존 이미지 요소가 있으면 제거 (혹시 모를 대비)
        const existingImg = document.getElementById('uploaded-image');
        if (existingImg) existingImg.remove();
        
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
            faceDetectorModel = await blazeface.load(); // 💡 얼굴 감지 모델 로드
            isInitialized = true;
        } catch(e) {
            labelContainer.innerHTML = 'Error loading models. Check console.';
            return;
        }
    }

    // 🌟 이미지 처리 시 기존 합성 캔버스 제거 및 가이드 비활성화
    isGuideActive = false;
    guideStyleUrl = null;
    if (drawGuideOverlay.styleImage) {
        drawGuideOverlay.styleImage = null;
    }
    const synthCanvas = document.getElementById('synthesis-output-img');
    if (synthCanvas) synthCanvas.remove();
    imgElement.style.display = 'block'; 

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
    // 💡 1. 얼굴 감지(Face Detection) 로직:
    // ----------------------------------------------------------------
    
    // 이미지를 텐서로 변환하여 감지 모델에 전달 (캔버스 요소는 직접 전달 가능)
    let elementForDetection = element;
    if (element.tagName === 'IMG') {
        // 이미지를 텐서로 변환 (BlazeFace가 이미지 요소를 처리하지만, 더 명시적으로 처리)
        const tensor = tf.browser.fromPixels(element);
        elementForDetection = tensor;
    }
    
    const predictions = await faceDetectorModel.estimateFaces(elementForDetection, FACE_DETECTION_THRESHOLD);

    if (element.tagName === 'IMG') {
        // 생성한 텐서 메모리 해제
        elementForDetection.dispose();
    }


    if (predictions.length === 0) {
        labelContainer.innerHTML = '<div style="color: red; font-weight: bold; padding: 10px;">⚠️ 경고: 얼굴이 명확하게 감지되지 않았습니다!</div><p>분석을 진행하려면 얼굴이 정면으로 잘 보이고, 충분히 밝으며, 가려지지 않았는지 확인해 주세요.</p>';
        document.getElementById("recommendation-output").innerHTML = '<p>얼굴 인식 실패: 명확한 얼굴을 감지할 수 없습니다.</p>';
        
        document.getElementById("style-selection-controls").style.display = 'none';
        document.getElementById("tone-selection-controls").style.display = 'none';
        return; 
    }
    
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
    // 💡 2. 분류(Classification) 로직:
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

// 얼굴형 추천 출력 (🌟 합성 버튼 추가)
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
                    
                    <button class="apply-style-btn" data-style="short" data-face="${faceType}">
                        ✂️ SHORT STYLE 합성!
                    </button>
                    
                </div>
                
                <div class="style-column">
                    <h5><i class="fas fa-spa"></i> Long Hair: ${data.long}</h5>
                    <img src="${data.longImage}" alt="${faceType} Long Hairstyle">

                    <button class="apply-style-btn" data-style="long" data-face="${faceType}">
                        🌸 LONG STYLE 합성!
                    </button>

                </div>
            </div>
        </div>
    `;
    outputContainer.innerHTML = recommendationHTML; 
    
    // 버튼 이벤트 리스너 연결
    document.querySelectorAll('.apply-style-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const style = e.target.getAttribute('data-style');
            const face = e.target.getAttribute('data-face');
            handleStyleOverlay(style, face); 
        });
    });
}

// 퍼스널 톤 추천 출력 (🌟 가이드 비활성화 로직 추가)
function showToneRecommendation(toneType) {
    // 🌟 톤 추천 선택 시 가이드 비활성화
    isGuideActive = false;
    guideStyleUrl = null;
    if (drawGuideOverlay.styleImage) {
        drawGuideOverlay.styleImage = null;
    }
    // 이미지 모드일 경우 원본 이미지를 다시 표시
    if (currentSource === 'image') {
        const uploadedImg = document.getElementById('uploaded-image');
        const synthCanvas = document.getElementById('synthesis-output-img');
        if (uploadedImg) uploadedImg.style.display = 'block';
        if (synthCanvas) synthCanvas.remove();
    }
    
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


// 🌟 스타일 합성 처리 함수 (스티커 이미지 경로 분리) - 재도입
function handleStyleOverlay(styleType, faceType) {
    const container = document.getElementById("webcam-container");
    const data = faceTypeData[faceType];
    
    // 🚨 변경: 웹캠 오버레이에는 스티커 이미지 경로를 사용합니다.
    const newStyleImgUrl = (styleType === 'short') 
        ? data.shortStickerImage 
        : data.longStickerImage;

    // 1. 가이드 토글 (Toggle) 로직
    if (isGuideActive && guideStyleUrl === newStyleImgUrl) {
        isGuideActive = false;
        guideStyleUrl = null;
        labelContainer.innerHTML = '<div style="color: #6c757d; font-weight: bold; padding: 10px;">✅ 오버레이 가이드가 비활성화되었습니다.</div>';
        
        if (drawGuideOverlay.styleImage) {
            drawGuideOverlay.styleImage = null;
        }
        
        // 이미지 모드일 경우 원본 이미지를 다시 표시
        if (currentSource === 'image') {
            const uploadedImg = document.getElementById('uploaded-image');
            const synthCanvas = document.getElementById('synthesis-output-img');
            if (synthCanvas) synthCanvas.remove(); 
            if (uploadedImg) uploadedImg.style.display = 'block';
        }
        return;
    }
    
    // 2. 새로운 가이드 활성화
    isGuideActive = true;
    guideStyleUrl = newStyleImgUrl;

    // 3. 메시지 업데이트
    labelContainer.innerHTML = `
        <div style="color: #6a82fb; font-weight: bold; padding: 10px;">
            ✨ **오버레이 가이드 활성화!** (${faceType} ${styleType.toUpperCase()} 스타일)
        </div>
        <p>웹캠 앞에서 얼굴을 **반투명 헤어 스타일 스티커**에 맞추어 포즈를 취해 보세요.</p>
        <p style="color:red;">⚠️ **(팁)** 가이드 이미지는 중앙에 고정되어 있으므로, 거리를 조절하여 크기를 맞춰주세요. 버튼을 다시 누르면 가이드가 사라집니다. **사진은 'Take Screenshot' 버튼으로 촬영하세요.**</p>
    `;
    
    // 4. 이미지 모드일 경우: 캔버스 합성 시뮬레이션 실행
    if (currentSource === 'image') {
        if (isRunning) toggleAnalysis();
        
        const sourceElement = document.getElementById('uploaded-image');
        if (!sourceElement) return;

        // 원본 이미지를 숨기고 캔버스를 표시
        sourceElement.style.display = 'none';

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const width = sourceElement.width || sourceElement.offsetWidth;
        const height = sourceElement.height || sourceElement.offsetHeight;
        
        const prevCanvas = document.getElementById('synthesis-output-img');
        if (prevCanvas) prevCanvas.remove();

        canvas.width = width;
        canvas.height = height;

        // 원본 이미지 그리기
        ctx.drawImage(sourceElement, 0, 0, width, height);
        
        const styleImg = new Image();
        styleImg.crossOrigin = "Anonymous";
        styleImg.onload = () => {
            const overlayWidth = width * 0.9; 
            const overlayHeight = styleImg.height * (overlayWidth / styleImg.width);
            const x = (width - overlayWidth) / 2;
            const y = (height - overlayHeight) / 2;
            
            // 이미지 모드에서는 불투명하게 겹쳐 그립니다. (웹캠 모드와 달리 영구적인 합성 시뮬레이션이므로)
            ctx.globalAlpha = 1.0; 
            ctx.drawImage(styleImg, x, y, overlayWidth, overlayHeight);
            
            container.appendChild(canvas);
            canvas.id = 'synthesis-output-img'; 
        };
        styleImg.src = newStyleImgUrl; 
    }
    
    // 웹캠 모드일 경우 loop() 함수가 자동으로 오버레이를 처리합니다.
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

// 🌟 스크린샷 기능 함수 (촬영 기능) - 재도입
function takeScreenshot() {
    const container = document.getElementById("webcam-container");
    let canvasElement = null;

    if (currentSource === 'webcam' && webcam && webcam.canvas) {
        canvasElement = webcam.canvas;
    } else if (currentSource === 'image') {
        // 이미지 모드에서는 합성 캔버스(있다면)를 캡처
        canvasElement = document.getElementById('synthesis-output-img');
        if (!canvasElement) {
             alert("캡처할 합성 이미지가 없습니다! 먼저 'Process Uploaded Image'를 클릭하거나 스타일 합성 버튼을 눌러주세요.");
             return;
        }
    }

    if (!canvasElement) {
        alert("캡처할 웹캠 화면이나 합성 이미지가 없습니다!");
        return;
    }

    // 캔버스 내용을 이미지 데이터 URL로 변환합니다.
    const imageURL = canvasElement.toDataURL('image/png');

    // 다운로드를 위한 임시 링크 생성
    const a = document.createElement('a');
    a.href = imageURL;
    a.download = `AI_StyleMate_Screenshot_${new Date().toISOString().slice(0, 10)}.png`;
    
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    alert("캡처된 이미지가 다운로드됩니다.");
}
