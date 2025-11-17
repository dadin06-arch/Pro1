// script.js - AI StyleMate Logic (Sticker Overlay Feature Added)

// ----------------------------------------------------
// 1. MODEL PATHS, VARIABLES & DATA DEFINITION (수정)
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

// 💡 얼굴 감지 임계값 (필요 시 조정 가능)
const FACE_DETECTION_THRESHOLD = 0.9; 
const MIN_FACE_SIZE = 50; 

// 💡 얼굴형별 추천 데이터 및 이미지 URL 정의 (스티커 이미지 경로 추가)
const faceTypeData = {
    "Oval": {
        summary: "The most versatile face shape. Naturally suits most hairstyles.",
        short: "Crop cut, undercut, bob.",
        long: "Layered cuts, natural waves.",
        shortImage: 'images/oval_short.png',
        longImage: 'images/oval_long.png',
        // 🌟 스티커 이미지 경로 추가
        shortSticker: 'images/oval_short_sticker.png', 
        longSticker: 'images/oval_long_sticker.png'
    },
    "Round": {
        summary: "Styles that look longer and sharper work well. Best with styles that add vertical length and slim the sides.",
        short: "Asymmetrical cuts, volume on top.",
        long: "Long bob, side-flowing layers.",
        shortImage: 'images/round_short.png',
        longImage: 'images/round_long.png',
        // 🌟 스티커 이미지 경로 추가
        shortSticker: 'images/round_short_sticker.png', 
        longSticker: 'images/round_long_sticker.png'
    },
    "Square": {
        summary: "Softening angles with curls or long layers works well. Avoid blunt cuts near the jawline.",
        short: "Soft bobs, side-swept fringe.",
        long: "Long layers, soft waves.",
        shortImage: 'images/square_short.png',
        longImage: 'images/square_long.png',
        // 🌟 스티커 이미지 경로 추가
        shortSticker: 'images/square_short_sticker.png', 
        longSticker: 'images/square_long_sticker.png'
    },
    "Heart": {
        summary: "Adding width at the jawline balances the face. Avoid too much volume on top.",
        short: "Chin-length bobs, pixie with side bangs.",
        long: "Long, sweeping layers, curtain bangs.",
        shortImage: 'images/heart_short.png',
        longImage: 'images/heart_long.png',
        // 🌟 스티커 이미지 경로 추가
        shortSticker: 'images/heart_short_sticker.png', 
        longSticker: 'images/heart_long_sticker.png'
    },
    "Oblong": {
        summary: "Creating horizontal width and avoiding height balances the length. Full bangs are effective.",
        short: "Shoulder-length bobs, layered bobs.",
        long: "Voluminous curls, full bangs.",
        shortImage: 'images/oblong_short.png',
        longImage: 'images/oblong_long.png',
        // 🌟 스티커 이미지 경로 추가
        shortSticker: 'images/oblong_short_sticker.png', 
        longSticker: 'images/oblong_long_sticker.png'
    },
};

// 💡 퍼스널 톤 추천 데이터 (수정 없음)
const personalToneData = {
    "Cool": {
        summary: "Best with silver, blue-based colors. Avoid yellow tones.",
        hair: "Ash brown, platinum blonde, cool black.",
        clothing: "Navy, royal blue, emerald green, white.",
        makeup: "Pink, berry, blue-based red.",
        image: 'images/cool_palette.png'
    },
    "Warm": {
        summary: "Best with gold, yellow-based colors. Avoid blue-based tones.",
        hair: "Copper red, golden blonde, warm brown.",
        clothing: "Khaki, olive green, coral, ivory.",
        makeup: "Coral, orange-based red, peach.",
        image: 'images/warm_palette.png'
    },
};

// ----------------------------------------------------
// 2. INITIALIZATION
// ----------------------------------------------------
async function init() {
    try {
        const modelURL1 = URL_MODEL_1 + "model.json";
        const metadataURL1 = URL_MODEL_1 + "metadata.json";
        const modelURL2 = URL_MODEL_2 + "model.json";
        const metadataURL2 = URL_MODEL_2 + "metadata.json";

        document.getElementById("loading-indicator").style.display = 'block';

        // Teachable Machine 모델 로드
        model1 = await tmImage.load(modelURL1, metadataURL1);
        model2 = await tmImage.load(modelURL2, metadataURL2);
        
        // BlazeFace 모델 로드
        faceDetectorModel = await blazeface.load();

        document.getElementById("loading-indicator").style.display = 'none';

        isInitialized = true;
        updateAnalysisButtonState();
        console.log("AI Models Initialized.");

    } catch (error) {
        console.error("Initialization failed:", error);
        document.getElementById("loading-indicator").innerHTML = "<i class=\"fas fa-exclamation-triangle\"></i> Initialization Failed. Check model paths.";
    }
}

// ----------------------------------------------------
// 3. ANALYSIS CONTROL AND MAIN LOOP
// ----------------------------------------------------
function updateAnalysisButtonState() {
    const btn = document.getElementById("analysis-btn");
    if (isInitialized && currentModel !== 0) {
        btn.disabled = false;
    } else {
        btn.disabled = true;
    }
}

async function toggleAnalysis() {
    const btn = document.getElementById("analysis-btn");
    
    if (isRunning) {
        // Stop
        isRunning = false;
        if (webcam) {
            webcam.stop();
        }
        window.cancelAnimationFrame(requestID);
        btn.innerHTML = `<i class="fas fa-play"></i> Start Analysis`;
        labelContainer.innerHTML = 'Analysis Stopped.';
        removeStickerOverlay(); // 💡 분석 중단 시 스티커 제거
    } else {
        // Start
        if (currentSource === 'webcam') {
            try {
                // 웹캠 초기화 및 시작
                if (!webcam) {
                    webcam = new tmImage.Webcam(400, 400, true); // width, height, flip
                    await webcam.setup(); 
                    document.getElementById("webcam-container").appendChild(webcam.webcam); 
                    webcam.webcam.style.display = 'block';
                    document.getElementById("webcam-container").style.width = 'fit-content'; 
                }
                await webcam.play();
                isRunning = true;
                btn.innerHTML = `<i class="fas fa-pause"></i> Stop Analysis`;
                window.requestAnimationFrame(loop);
                
                // 이미지 업로드 영역 숨기기
                document.getElementById("image-upload-area").style.display = 'none';
                document.getElementById('uploaded-image')?.remove();
                
            } catch (e) {
                alert("웹캠 접근에 실패했습니다. 카메라 권한을 확인해주세요.");
                console.error(e);
                isRunning = false;
                btn.innerHTML = `<i class="fas fa-play"></i> Start Analysis`;
                webcam = null;
            }
        }
        // 이미지 모드의 분석 로직은 processImage에서 처리
    }
}

async function loop() {
    if (webcam && webcam.webcam.videoWidth > 0) {
        webcam.update(); 
        await predict();
    }
    if (isRunning) {
        requestID = window.requestAnimationFrame(loop);
    }
}

// ----------------------------------------------------
// 4. PREDICTION LOGIC (얼굴 감지 포함)
// ----------------------------------------------------
async function predict() {
    let predictionResult = null;
    let canvasElement;

    if (currentSource === 'webcam') {
        canvasElement = webcam.canvas;
    } else if (currentSource === 'image') {
        canvasElement = document.getElementById('uploaded-image'); 
        if (!canvasElement) return;
    } else {
        return;
    }
    
    // 1. 얼굴 감지
    const predictions = await faceDetectorModel.estimateFaces(canvasElement, false); // flipHorizontal=false
    
    if (predictions.length > 0) {
        // 가장 큰 얼굴 감지 결과 사용
        const face = predictions[0];
        const box = face.boundingBox;
        const size = Math.max(box.bottom[0] - box.topLeft[0], box.bottom[1] - box.topLeft[1]);

        if (face.probability[0] > FACE_DETECTION_THRESHOLD && size > MIN_FACE_SIZE) {
            // 2. Teachable Machine 분류
            const modelToUse = currentModel === 1 ? model1 : model2;
            const prediction = await modelToUse.predict(canvasElement);
            
            // 3. 결과 처리
            prediction.sort((a, b) => b.probability - a.probability);
            predictionResult = prediction[0];
            
            // 4. 결과 출력
            let outputHTML = `
                <p>✅ **Analysis Complete!**</p>
                <div class="prediction-result">
                    <span class="result-label">Predicted Type:</span> 
                    <span class="result-value">${predictionResult.className}</span> 
                    <span class="result-conf">(${Math.round(predictionResult.probability * 100)}%)</span>
                </div>
                <div class="prediction-details">
            `;
            
            // 하위 결과 출력
            for (let i = 0; i < prediction.length; i++) {
                outputHTML += `<p>${prediction[i].className}: ${Math.round(prediction[i].probability * 100)}%</p>`;
            }
            outputHTML += '</div>';
            labelContainer.innerHTML = outputHTML;

            // 5. 추천 출력
            if (currentModel === 1) {
                showRecommendation(predictionResult.className);
            } else if (currentModel === 2) {
                showToneRecommendation(predictionResult.className);
            }

        } else {
            labelContainer.innerHTML = '<div class="warning-message">⚠️ **Face not clear.** Please move closer or look directly at the camera.</div>';
            document.getElementById("recommendation-output").innerHTML = "<p>Please adjust your position for accurate analysis.</p>";
        }
    } else {
        labelContainer.innerHTML = '<div class="warning-message">⚠️ **No face detected.** Ensure your face is visible.</div>';
        document.getElementById("recommendation-output").innerHTML = "<p>Please ensure your face is visible in the frame.</p>";
    }
}

// ----------------------------------------------------
// 5. MODE AND MODEL SWITCHING
// ----------------------------------------------------
function switchMode(mode) {
    if (isRunning) {
        toggleAnalysis(); // 분석 중지
    }
    
    currentSource = mode;
    
    document.getElementById("webcam-mode-btn").classList.remove('active');
    document.getElementById("image-mode-btn").classList.remove('active');
    
    if (mode === 'webcam') {
        document.getElementById("webcam-mode-btn").classList.add('active');
        document.getElementById("image-upload-area").style.display = 'none';
        document.getElementById("webcam-container").style.display = 'block';
        document.getElementById('uploaded-image')?.remove();
        document.getElementById("process-image-btn").style.display = 'none';

        if (webcam) {
            webcam.webcam.style.display = 'block';
        }
    } else {
        document.getElementById("image-mode-btn").classList.add('active');
        document.getElementById("image-upload-area").style.display = 'block';
        
        if (webcam) {
            webcam.stop();
            webcam.webcam.style.display = 'none';
        }
    }

    // 결과 및 컨트롤 초기화
    document.getElementById("recommendation-output").innerHTML = "<p>Select a model and start analysis.</p>";
    labelContainer.innerHTML = "Waiting for analysis...";
    updateModelInfo();
}

function switchModel(modelNumber) {
    if (isRunning) {
        toggleAnalysis(); // 기존 분석 중지
    }
    
    currentModel = modelNumber;
    updateModelInfo();
    updateAnalysisButtonState();
    
    // 수동 선택 컨트롤 토글
    document.getElementById("face-selection-controls").style.display = (modelNumber === 1) ? 'block' : 'none';
    document.getElementById("tone-selection-controls").style.display = (modelNumber === 2) ? 'block' : 'none';
    
    // 결과 초기화
    document.getElementById("recommendation-output").innerHTML = "<p>Select an option to view recommendations.</p>";
    labelContainer.innerHTML = "Waiting for analysis...";
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
    } else {
        infoElement.innerHTML = "Select a model to start analysis.";
        btn1.classList.remove('active');
        btn2.classList.remove('active');
    }

    if (currentSource === 'image' && document.getElementById('uploaded-image')) {
         document.getElementById("process-image-btn").innerText = 'Re-Analyze Image';
    } else if (currentSource === 'image') {
         document.getElementById("process-image-btn").innerText = 'Analyze Image';
    }
}

// ----------------------------------------------------
// 6. IMAGE UPLOAD & PROCESSING
// ----------------------------------------------------
document.getElementById('image-upload').addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const container = document.getElementById("webcam-container");
            document.getElementById('uploaded-image')?.remove(); 
            
            const img = document.createElement('img');
            img.id = 'uploaded-image';
            img.src = e.target.result;
            
            // Teachable Machine이 인식할 수 있도록 이미지를 캔버스에 그립니다.
            const canvas = document.createElement('canvas');
            canvas.id = 'uploaded-canvas'; // 캔버스 ID 추가
            
            img.onload = () => {
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, img.width, img.height);
                
                // 캔버스를 컨테이너에 추가 (분석 시 사용)
                container.appendChild(canvas);
                
                // CSS가 캔버스에도 적용되도록 설정
                canvas.style.maxWidth = '400px'; 
                canvas.style.width = '100%';
                
                document.getElementById("webcam-container").style.display = 'block';
                document.getElementById("process-image-btn").style.display = 'block';
                document.getElementById("process-image-btn").innerText = 'Analyze Image';
            };
        };
        reader.readAsDataURL(file);
    }
});

function processImage() {
    if (currentModel === 0) {
        alert("Please select a model (Face Type or Personal Tone) first.");
        return;
    }
    
    // 이미지 분석은 processImage를 호출할 때 한 번만 실행되도록 합니다.
    const canvas = document.getElementById('uploaded-canvas');
    if (canvas) {
        predict();
        document.getElementById("process-image-btn").innerText = 'Re-Analyze Image';
    } else {
        alert("Please upload an image first.");
    }
}

// ----------------------------------------------------
// 7. MANUAL SELECTION
// ----------------------------------------------------
document.querySelectorAll('.face-select-btn').forEach(button => {
    button.addEventListener('click', (e) => {
        showRecommendation(e.target.getAttribute('data-facetype'));
        labelContainer.innerHTML = `Manual Selection: **${e.target.getAttribute('data-facetype')}** Face Type`;
        removeStickerOverlay(); // 💡 수동 선택 시 스티커 제거
    });
});

document.querySelectorAll('.tone-select-btn').forEach(button => {
    button.addEventListener('click', (e) => {
        showToneRecommendation(e.target.getAttribute('data-tonetype'));
        labelContainer.innerHTML = `Manual Selection: **${e.target.getAttribute('data-tonetype')}** Tone`;
    });
});


// ----------------------------------------------------
// 8. RECOMMENDATION OUTPUT (수정)
// ----------------------------------------------------

// 얼굴형 추천 출력 (합성 버튼 추가)
function showRecommendation(faceType) {
    if (!faceTypeData[faceType]) {
        document.getElementById("recommendation-output").innerHTML = `<p class="error-message">Error: Recommendation data for ${faceType} not found.</p>`;
        return;
    }

    const data = faceTypeData[faceType]; 
    const outputContainer = document.getElementById("recommendation-output");
    
    const recommendationHTML = `
        <div class="recommendation-content">
            <h4>✨ Hairstyle Guide for ${faceType} Face Shape</h4>
            
            <p class="summary-text">${data.summary}</p>
            
            <div class="hair-styles-container">
                <div class="style-column">
                    <h5><i class="fas fa-cut"></i> Short Hair: ${data.short}</h5>
                    <img src="${data.shortImage}" alt="${faceType} Short Hairstyle">
                    <button class="btn primary-btn sticker-btn" 
                            data-sticker="${data.shortSticker}" 
                            data-type="short">🖼️ 합성 미리보기 (Short)</button>
                </div>
                
                <div class="style-column">
                    <h5><i class="fas fa-spa"></i> Long Hair: ${data.long}</h5>
                    <img src="${data.longImage}" alt="${faceType} Long Hairstyle">
                    <button class="btn primary-btn sticker-btn" 
                            data-sticker="${data.longSticker}" 
                            data-type="long">🖼️ 합성 미리보기 (Long)</button>
                </div>
            </div>
        </div>
    `;
    outputContainer.innerHTML = recommendationHTML; 
    
    // 💡 생성된 버튼에 이벤트 리스너 부착
    document.querySelectorAll('.sticker-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const stickerPath = e.target.getAttribute('data-sticker');
            startStickerWebcam(stickerPath);
        });
    });
}

// 퍼스널 톤 추천 출력 (수정 없음)
function showToneRecommendation(toneType) {
    if (!personalToneData[toneType]) {
        document.getElementById("recommendation-output").innerHTML = `<p class="error-message">Error: Recommendation data for ${toneType} not found.</p>`;
        return;
    }
    removeStickerOverlay(); // 💡 톤 추천 시 스티커 제거

    const data = personalToneData[toneType]; 
    const outputContainer = document.getElementById("recommendation-output");

    // ... (기존 showToneRecommendation 로직 유지)
    const recommendationHTML = `
        <div class="recommendation-content">
            <h4>✨ Personal Tone Guide for ${toneType} Tone</h4>
            <p class="summary-text">${data.summary}</p>
            
            <div class="tone-styles-container">
                <div class="tone-info-column">
                    <div class="tone-category">
                        <h5><i class="fas fa-paint-brush"></i> Hair Colors</h5>
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
// 9. New Function: Sticker Overlay Logic (새로 추가)
// ----------------------------------------------------

// 💡 스티커 오버레이를 제거하는 함수
function removeStickerOverlay() {
    const existingOverlay = document.getElementById('sticker-overlay');
    if (existingOverlay) {
        existingOverlay.remove();
        if (currentSource === 'webcam') {
            labelContainer.innerHTML = 'Analysis Stopped.';
        }
    }
}

async function startStickerWebcam(stickerPath) {
    const webcamContainer = document.getElementById("webcam-container");
    
    // 1. 분석 중이 아니라면 웹캠 모드로 전환하고 웹캠 시작
    if (!isRunning || currentSource === 'image') {
        if (currentSource === 'image') {
             // 이미지 모드에서 버튼을 누르면 웹캠 모드로 전환
            switchMode('webcam');
        }
        // 웹캠이 켜져 있지 않다면 켜기
        if (!isRunning) {
            await toggleAnalysis();
        }
    }
    
    // 2. 기존 스티커 오버레이 제거
    removeStickerOverlay();
    
    // 3. 스티커 오버레이 컨테이너 생성
    const stickerOverlay = document.createElement('div');
    stickerOverlay.id = 'sticker-overlay';
    
    // 4. 스티커 이미지 엘리먼트 생성
    const stickerImage = document.createElement('img');
    stickerImage.src = stickerPath;
    stickerImage.alt = 'Hairstyle Sticker Overlay';

    // 5. 스타일 적용 및 컨테이너에 추가
    stickerOverlay.appendChild(stickerImage);
    webcamContainer.appendChild(stickerOverlay);
    
    // 6. 상태 메시지 업데이트
    labelContainer.innerHTML = '<div style="color: #6a82fb; font-weight: bold; padding: 5px;">📸 합성 미리보기 모드 활성화: 얼굴을 스티커에 맞추세요!</div>';
}

// ----------------------------------------------------
// 10. INITIAL SETUP
// ----------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    init();
    updateModelInfo();
});
