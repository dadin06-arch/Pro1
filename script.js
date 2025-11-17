// script.js - 최종 통합 버전 (AR 스티커 위치/크기 조정 로직 추가)

const URL = "https://teachablemachine.withgoogle.com/models/p_Q5Vp8pU/"; // Teachable Machine 모델 URL

let model1, model2, webcam, labelContainer, maxPredictions;
let currentModel = null;
let currentFaceType = null; // 현재 선택된 얼굴형
let currentToneType = null; // 현재 선택된 퍼스널 톤
let currentImageSrc = null; // 업로드된 이미지 URL 저장
let isWebcamMode = true; // 현재 모드 (웹캠/이미지 업로드)

// AR Try-On 관련 변수
let arVideo = null;
let arSticker = null;
let faceDetector = null;
let arAnimationFrameId = null;

// AR 스티커 위치 및 크기 조정 상수 (이 값을 조정하여 스티커 위치와 크기를 미세 조정합니다)
const AR_STICKER_Y_OFFSET_RATIO = 0.05; // 얼굴 높이 대비 스티커 Y축 오프셋 (0.05 = 5% 아래로)
const AR_STICKER_WIDTH_SCALE = 1.2; // 얼굴 너비 대비 스티커 너비 스케일 (1.2 = 120%)
const AR_STICKER_HEIGHT_SCALE = 1.2; // 얼굴 높이 대비 스티커 높이 스케일 (1.2 = 120%)


// 얼굴형에 따른 추천 헤어스타일 데이터
const faceTypeData = {
    "Oval": {
        description: "An oval face is well-balanced and symmetrical, allowing for a wide variety of hairstyles. Styles that keep hair off the face to highlight its natural shape are often recommended. Consider soft layers, waves, or a classic bob. Avoid heavy bangs that might cover the forehead too much.",
        styles: [
            { name: "Layered Waves", image: "images/hair_oval_layers.jpg", sticker: "stickers/sticker_oval_layers.png" },
            { name: "Long Bob (Lob)", image: "images/hair_oval_lob.jpg", sticker: "stickers/sticker_oval_lob.png" }
        ]
    },
    "Round": {
        description: "A round face is characterized by soft curves and similar width and length. Hairstyles that add height and length, or create angles, work best. Styles with volume at the crown and minimal volume at the sides, or long layers, can be flattering. Avoid blunt bangs or chin-length bobs that emphasize roundness.",
        styles: [
            { name: "Long Layers with Side Part", image: "images/hair_round_layers.jpg", sticker: "stickers/sticker_round_layers.png" },
            { name: "P.R.M Perm", image: "images/hair_round_c_curl_perm.jpg", sticker: "stickers/sticker_round_c_curl_perm.png" }
        ]
    },
    "Square": {
        description: "A square face has a strong, angular jawline and forehead. Soft, layered styles that reduce harshness and add softness around the face are ideal. Wavy or curly styles, side-swept bangs, or long, soft layers can complement the face shape. Avoid straight, blunt cuts or very short styles that highlight the jaw.",
        styles: [
            { name: "Soft Waves with Side Bangs", image: "images/hair_square_waves.jpg", sticker: "stickers/sticker_square_waves.png" },
            { name: "Long C-Curl Perm", image: "images/hair_square_long_c_curl.jpg", sticker: "stickers/sticker_square_long_c_curl.png" }
        ]
    },
    "Heart": {
        description: "A heart-shaped face has a wider forehead and cheekbones, tapering to a narrower jawline and pointed chin. Styles that add width around the jawline or chin, or soften the forehead, work well. Side-swept bangs, a long bob, or layered cuts that start around the chin can balance the face. Avoid high updos that emphasize the forehead.",
        styles: [
            { name: "Side-Swept Bangs & Waves", image: "images/hair_heart_side_bangs.jpg", sticker: "stickers/sticker_heart_side_bangs.png" },
            { name: "Shoulder-Length Layers", image: "images/hair_heart_layers.jpg", sticker: "stickers/sticker_heart_layers.png" }
        ]
    },
    "Oblong": {
        description: "An oblong (or rectangular) face is longer than it is wide. Hairstyles that add width to the sides of the face and reduce vertical length are flattering. Soft waves, curls, full bangs, or shoulder-length cuts can add balance. Avoid very long, straight hair or styles with too much volume at the crown.",
        styles: [
            { name: "Full Bangs with Wavy Hair", image: "images/hair_oblong_full_bangs.jpg", sticker: "stickers/sticker_oblong_full_bangs.png" },
            { name: "Shoulder-Length Curls", image: "images/hair_oblong_shoulder_curls.jpg", sticker: "stickers/sticker_oblong_shoulder_curls.png" }
        ]
    }
};

// 퍼스널 톤에 따른 추천 색상 데이터
const toneTypeData = {
    "Cool": {
        description: "Cool tones generally have pink, red, or blue undertones in their skin. They often look best in colors like blues, greens, purples, cool browns, and silver jewelry. Hair colors such as ash blonde, platinum, cool brown, and burgundy can enhance their complexion.",
        recommendations: [
            { category: "Best Hair Colors", items: ["Ash Blonde", "Platinum Blonde", "Cool Brown", "Burgundy", "Jet Black"] },
            { category: "Best Makeup Colors", items: ["Cool Pink Lipstick", "Blue/Silver Eyeshadow", "Cool-toned Blush"] },
            { category: "Best Jewelry", items: ["Silver", "White Gold"] }
        ]
    },
    "Warm": {
        description: "Warm tones typically have golden, peach, or yellow undertones in their skin. They often shine in colors like yellows, oranges, warm reds, olive greens, and gold jewelry. Hair colors such as golden blonde, caramel, warm brown, and copper red can complement their features.",
        recommendations: [
            { category: "Best Hair Colors", items: ["Golden Blonde", "Caramel Brown", "Copper Red", "Warm Chocolate", "Honey Blonde"] },
            { category: "Best Makeup Colors", items: ["Coral Lipstick", "Gold/Bronze Eyeshadow", "Warm-toned Blush"] },
            { category: "Best Jewelry", items: ["Gold", "Rose Gold"] }
        ]
    }
};

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', function() {
    initModel1(); // 페이지 로드 시 기본으로 얼굴형 모델 로드
    setupEventListeners();
    updateModelInfo("Not yet loaded"); // 초기 상태 표시
});

async function initModel1() {
    await init(URL + "model.json");
    currentModel = 'model1';
    updateModelInfo("Face Type Analysis");
    document.getElementById('model1-btn').classList.add('active');
    document.getElementById('model2-btn').classList.remove('active');
    
    document.getElementById('style-selection-controls').style.display = 'block'; // 얼굴형 선택창 표시
    document.getElementById('tone-selection-controls').style.display = 'none'; // 톤 선택창 숨기기
    document.getElementById('ar-container').style.display = 'none'; // AR 컨테이너 숨기기
    document.getElementById('recommendation-output').innerHTML = '<p>Select a face type to view recommendations.</p>';
}

async function initModel2() {
    await init(URL + "model2.json"); // Personal Tone 모델 로드 (URL + model2.json으로 변경)
    currentModel = 'model2';
    updateModelInfo("Personal Tone Analysis");
    document.getElementById('model2-btn').classList.add('active');
    document.getElementById('model1-btn').classList.remove('active');

    document.getElementById('tone-selection-controls').style.display = 'block'; // 톤 선택창 표시
    document.getElementById('style-selection-controls').style.display = 'none'; // 얼굴형 선택창 숨기기
    document.getElementById('ar-container').style.display = 'none'; // AR 컨테이너 숨기기
    document.getElementById('recommendation-output').innerHTML = '<p>Select a tone to view recommendations.</p>';
}


async function init(modelURL) {
    const modelURL_json = modelURL;
    const metadataURL = URL + "metadata.json";

    // 모델 로드
    if (currentModel === 'model1') {
        model1 = await tmImage.load(modelURL_json, metadataURL);
        maxPredictions = model1.getTotalClasses();
    } else if (currentModel === 'model2') {
        model2 = await tmImage.load(modelURL_json, metadataURL);
        maxPredictions = model2.getTotalClasses();
    }
    
    // 웹캠 설정
    if (!webcam) { // 웹캠이 아직 초기화되지 않았다면
        const flip = true; // 웹캠 좌우 반전
        webcam = new tmImage.Webcam(400, 300, flip); // 가로 400px, 세로 300px
        await webcam.setup(); // 웹캠 스트림 로드
        await webcam.play(); // 웹캠 재생
        
        const webcamContainer = document.getElementById("webcam-container");
        webcamContainer.innerHTML = ''; // 초기 메시지 제거
        webcamContainer.appendChild(webcam.canvas); // 캔버스를 컨테이너에 추가
    }

    // 예측 결과 표시 영역 설정
    if (!labelContainer) { // labelContainer가 아직 초기화되지 않았다면
        labelContainer = document.getElementById("label-container");
        for (let i = 0; i < maxPredictions; i++) { // 각 클래스별 예측 막대 생성
            const predictionItem = document.createElement("div");
            predictionItem.classList.add("prediction-item");
            labelContainer.appendChild(predictionItem);
        }
    }
}

function setupEventListeners() {
    document.getElementById('model1-btn').addEventListener('click', initModel1);
    document.getElementById('model2-btn').addEventListener('click', initModel2);

    document.getElementById('start-button').addEventListener('click', startAnalysis);
    document.getElementById('image-upload').addEventListener('change', handleImageUpload);
    document.getElementById('process-image-btn').addEventListener('click', processUploadedImage);

    document.getElementById('mode-webcam').addEventListener('click', () => setMode('webcam'));
    document.getElementById('mode-upload').addEventListener('click', () => setMode('upload'));

    // 얼굴형 선택 버튼 이벤트 리스너
    document.querySelectorAll('.face-select-btn').forEach(button => {
        button.addEventListener('click', function() {
            document.querySelectorAll('.face-select-btn').forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            currentFaceType = this.dataset.facetype;
            displayFaceTypeRecommendation(currentFaceType);
        });
    });

    // 퍼스널 톤 선택 버튼 이벤트 리스너
    document.querySelectorAll('.tone-select-btn').forEach(button => {
        button.addEventListener('click', function() {
            document.querySelectorAll('.tone-select-btn').forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            currentToneType = this.dataset.tonetype;
            displayPersonalToneRecommendation(currentToneType);
        });
    });
    
    // AR Stop 버튼 이벤트 리스너
    document.getElementById('ar-stop-button').addEventListener('click', stopArTryOn);
}


function setMode(mode) {
    if (mode === 'webcam') {
        isWebcamMode = true;
        document.getElementById('mode-webcam').classList.add('active');
        document.getElementById('mode-upload').classList.remove('active');
        document.getElementById('webcam-controls').style.display = 'block';
        document.getElementById('upload-controls').style.display = 'none';
        
        // 웹캠 모드로 전환 시 웹캠 다시 시작 또는 초기화 (필요하다면)
        if (webcam && !webcam.isPlaying()) {
            webcam.play();
            loop(); // 웹캠 예측 루프 다시 시작
        } else if (!webcam) {
            // 웹캠이 초기화되지 않았다면 init() 호출하여 초기화
            if (currentModel === 'model1') initModel1();
            else if (currentModel === 'model2') initModel2();
        }

        document.getElementById('webcam-container').style.display = 'block';
        document.getElementById('initial-message').style.display = 'none';

        stopArTryOn(); // AR 모드 종료
        
    } else { // upload mode
        isWebcamMode = false;
        document.getElementById('mode-webcam').classList.remove('active');
        document.getElementById('mode-upload').classList.add('active');
        document.getElementById('webcam-controls').style.display = 'none';
        document.getElementById('upload-controls').style.display = 'block';
        
        // 이미지 업로드 모드로 전환 시 웹캠 중지
        if (webcam && webcam.isPlaying()) {
            webcam.pause();
        }
        document.getElementById('webcam-container').innerHTML = '<p id="initial-message">Please upload an image.</p>';
        document.getElementById('webcam-container').style.display = 'flex'; /* 메시지 중앙 정렬 */
        document.getElementById('initial-message').style.display = 'block';
        document.getElementById('label-container').innerHTML = 'Waiting for analysis...'; // 예측 결과 초기화
        document.getElementById('recommendation-output').innerHTML = '<p>Upload an image and click "Process Uploaded Image".</p>'; // 추천 결과 초기화

        stopArTryOn(); // AR 모드 종료
    }
}

async function startAnalysis() {
    if (webcam && webcam.canvas) {
        document.getElementById('initial-message').style.display = 'none'; // 'Click to start' 메시지 숨김
        document.getElementById('webcam-container').appendChild(webcam.canvas); // 웹캠 캔버스 다시 표시
        webcam.play(); // 웹캠 재생
        loop(); // 예측 시작
    } else {
        // 웹캠이 없으면 init()을 통해 웹캠을 초기화하고 예측 시작
        if (currentModel === 'model1') await initModel1();
        else if (currentModel === 'model2') await initModel2();
        loop();
    }
}

async function loop() {
    if (webcam && webcam.isPlaying()) {
        webcam.update(); // 웹캠 프레임 업데이트
        await predict(); // 예측 수행
        window.requestAnimationFrame(loop); // 다음 프레임 요청
    }
}

async function predict() {
    if (!currentModel) {
        labelContainer.innerHTML = 'Please select a model first.';
        return;
    }

    let prediction;
    let imageSource;

    if (isWebcamMode) {
        imageSource = webcam.canvas;
        if (currentModel === 'model1' && model1) {
            prediction = await model1.predict(webcam.canvas);
        } else if (currentModel === 'model2' && model2) {
            prediction = await model2.predict(webcam.canvas);
        }
    } else { // Image Upload Mode
        if (currentImageSrc) {
            const imgElement = document.createElement('img');
            imgElement.src = currentImageSrc;
            imgElement.width = webcam.canvas.width; // 캔버스 크기에 맞춤
            imgElement.height = webcam.canvas.height;
            imageSource = imgElement;

            if (currentModel === 'model1' && model1) {
                prediction = await model1.predict(imgElement);
            } else if (currentModel === 'model2' && model2) {
                prediction = await model2.predict(imgElement);
            }
        }
    }

    if (!prediction) {
        labelContainer.innerHTML = 'No prediction available.';
        return;
    }

    // 예측 결과 표시
    labelContainer.innerHTML = ''; // 기존 내용 지우기
    let highestPrediction = { className: '', probability: 0 };

    for (let i = 0; i < maxPredictions; i++) {
        const classPrediction =
            prediction[i].className + ": " + prediction[i].probability.toFixed(1) * 100 + "%";
        
        const predictionItem = document.createElement("div");
        predictionItem.classList.add("prediction-item");
        predictionItem.innerHTML = `<span>${prediction[i].className}:</span> <strong>${(prediction[i].probability * 100).toFixed(1)}%</strong>`;
        labelContainer.appendChild(predictionItem);

        if (prediction[i].probability > highestPrediction.probability) {
            highestPrediction = prediction[i];
        }
    }

    // 가장 높은 확률의 결과에 따라 추천 표시
    if (currentModel === 'model1') {
        currentFaceType = highestPrediction.className;
        document.querySelectorAll('.face-select-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.facetype === currentFaceType) {
                btn.classList.add('active');
            }
        });
        displayFaceTypeRecommendation(currentFaceType);
    } else if (currentModel === 'model2') {
        currentToneType = highestPrediction.className;
        document.querySelectorAll('.tone-select-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.tonetype === currentToneType) {
                btn.classList.add('active');
            }
        });
        displayPersonalToneRecommendation(currentToneType);
    }
}

function handleImageUpload(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            currentImageSrc = e.target.result;
            const img = document.createElement('img');
            img.src = currentImageSrc;
            img.onload = () => {
                const webcamContainer = document.getElementById("webcam-container");
                webcamContainer.innerHTML = '';
                webcamContainer.appendChild(img);
                img.style.maxWidth = '400px';
                img.style.height = 'auto';
                img.style.borderRadius = '10px';
                img.style.border = '4px solid';
                img.style.borderImage = 'linear-gradient(to right, #6a82fb, #fc5c7d) 1';
                img.style.boxShadow = '0 0 12px rgba(106, 130, 251, 0.3)';
                
                document.getElementById('process-image-btn').disabled = false;
            };
        };
        reader.readAsDataURL(file);
    } else {
        currentImageSrc = null;
        document.getElementById('webcam-container').innerHTML = '<p id="initial-message">Please upload an image.</p>';
        document.getElementById('process-image-btn').disabled = true;
    }
}

async function processUploadedImage() {
    if (currentImageSrc && currentModel) {
        // 이미 웹캠 캔버스 자리에 이미지가 표시되어 있으므로 별도의 표시 로직은 필요 없음.
        // 바로 예측 시작.
        predict();
    } else {
        alert('Please upload an image and select a model first.');
    }
}


function updateModelInfo(info) {
    document.getElementById('current-model-info').innerHTML = `Active Model: <strong>${info}</strong>`;
}


// 얼굴형 추천 정보 표시 함수
function displayFaceTypeRecommendation(faceType) {
    const outputDiv = document.getElementById('recommendation-output');
    outputDiv.innerHTML = ''; // 기존 내용 지우기

    const data = faceTypeData[faceType];
    if (data) {
        const recommendationHtml = `
            <div class="recommendation-content">
                <h4><i class="fas fa-venus"></i> ${faceType} Face Type Recommendation</h4>
                <p class="summary-text">${data.description}</p>
                <div class="hair-styles-container">
                    ${data.styles.map(style => `
                        <div class="style-column">
                            <h5>${style.name}</h5>
                            <img src="${style.image}" alt="${style.name}" class="recommendation-img">
                            <button class="btn ar-try-on-btn" data-sticker="${style.sticker}" data-facetype="${faceType}">
                                <i class="fas fa-cut"></i> AR Try-On
                            </button>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
        outputDiv.innerHTML = recommendationHtml;

        // AR Try-On 버튼에 이벤트 리스너 추가
        document.querySelectorAll('.ar-try-on-btn').forEach(button => {
            button.addEventListener('click', function() {
                const stickerPath = this.dataset.sticker;
                const selectedFaceType = this.dataset.facetype;
                startArTryOn(stickerPath, selectedFaceType);
            });
        });

    } else {
        outputDiv.innerHTML = `<p>No recommendation available for ${faceType} face type.</p>`;
    }
}

// 퍼스널 톤 추천 정보 표시 함수
function displayPersonalToneRecommendation(toneType) {
    const outputDiv = document.getElementById('recommendation-output');
    outputDiv.innerHTML = ''; // 기존 내용 지우기

    const data = toneTypeData[toneType];
    if (data) {
        const recommendationHtml = `
            <div class="recommendation-content">
                <h4><i class="fas fa-palette"></i> ${toneType} Tone Recommendation</h4>
                <p class="summary-text">${data.description}</p>
                <div class="tone-styles-container">
                    <div class="tone-image-column">
                        <img src="images/tone_${toneType.toLowerCase()}.jpg" alt="${toneType} Tone" class="recommendation-img">
                    </div>
                    <div class="tone-text-column">
                        ${data.recommendations.map(cat => `
                            <div class="tone-category">
                                <h5><i class="fas fa-check-circle"></i> ${cat.category}</h5>
                                <p>${cat.items.join(', ')}</p>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
        outputDiv.innerHTML = recommendationHtml;
    } else {
        outputDiv.innerHTML = `<p>No recommendation available for ${toneType} tone type.</p>`;
    }
}

// ----------------------------------------------------
// AR Try-On 기능 관련 스크립트
// ----------------------------------------------------

async function startArTryOn(stickerPath, faceType) {
    // 기존 웹캠 분석 중지
    if (webcam && webcam.isPlaying()) {
        webcam.pause();
    }
    window.cancelAnimationFrame(arAnimationFrameId); // 기존 AR 루프 중지
    document.getElementById('webcam-container').style.display = 'none'; // 기존 웹캠/이미지 영역 숨기기
    document.getElementById('label-container').innerHTML = ''; // 예측 결과 지우기
    
    // AR 컨테이너 보이기
    document.getElementById('ar-container').style.display = 'flex'; 

    arVideo = document.getElementById('ar-webcam-video');
    arSticker = document.getElementById('ar-sticker-overlay');
    arSticker.src = stickerPath;
    arSticker.style.display = 'block';

    if (!faceDetector) {
        faceDetector = await blazeface.load();
    }

    // AR 웹캠 스트림 가져오기
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ 'video': true });
        arVideo.srcObject = stream;
        await arVideo.play();
        arVideo.addEventListener('loadeddata', () => {
            arVideo.width = arVideo.videoWidth;
            arVideo.height = arVideo.videoHeight;
            arLoop();
        });
    } catch (err) {
        console.error("Error accessing AR webcam: ", err);
        alert("AR 웹캠을 시작할 수 없습니다. 카메라 접근을 허용했는지 확인해주세요.");
        stopArTryOn();
    }
}

async function arLoop() {
    if (!arVideo || arVideo.paused || arVideo.ended) {
        return;
    }

    const predictions = await faceDetector.estimateFaces(arVideo, false); // false로 설정하여 flipped 이미지를 사용하지 않음
    
    // AR 오버레이 초기화
    arSticker.style.left = '0px';
    arSticker.style.top = '0px';
    arSticker.style.width = '0px';
    arSticker.style.height = '0px';
    arSticker.style.transform = 'none'; // 기존 변형 초기화

    if (predictions.length > 0) {
        // 첫 번째 얼굴 감지 사용
        const face = predictions[0];
        drawSticker(face);
    }

    arAnimationFrameId = window.requestAnimationFrame(arLoop);
}

function drawSticker(face) {
    const videoWidth = arVideo.offsetWidth;
    const videoHeight = arVideo.offsetHeight;

    // 얼굴 bounding box 정보
    const start = face.topLeft;
    const end = face.bottomRight;
    const width = end[0] - start[0];
    const height = end[1] - start[1];

    // 스티커의 중심을 얼굴의 중심에 맞춥니다.
    // X축 위치 (좌우 반전된 비디오에 맞게 조정)
    const stickerX = videoWidth - (start[0] + width); 
    
    // Y축 위치 조정: 얼굴의 상단에서 시작하되, 오프셋 비율을 적용하여 스티커를 아래로 내립니다.
    const stickerY = start[1] + (height * AR_STICKER_Y_OFFSET_RATIO); 

    // 스티커 크기 조정: 얼굴 너비/높이에 스케일 팩터 적용
    const stickerWidth = width * AR_STICKER_WIDTH_SCALE;
    const stickerHeight = height * AR_STICKER_HEIGHT_SCALE;

    // 스티커 CSS 업데이트
    arSticker.style.left = `${stickerX - (stickerWidth - width) / 2}px`; // 스티커 중앙 정렬
    arSticker.style.top = `${stickerY - (stickerHeight - height) / 2}px`; // 스티커 중앙 정렬
    arSticker.style.width = `${stickerWidth}px`;
    arSticker.style.height = `${stickerHeight}px`;

    // 스티커 회전 (얼굴 각도에 따라)
    if (face.rotation) {
        const angle = face.rotation.angle;
        arSticker.style.transform = `rotate(${angle}rad) scaleX(-1)`; // 거울 효과 유지
    } else {
        arSticker.style.transform = 'scaleX(-1)'; // 거울 효과만 유지
    }
    arSticker.style.transformOrigin = 'center center'; // 변형의 기준점을 스티커 중앙으로 설정
    arSticker.style.position = 'absolute';
}


function stopArTryOn() {
    // AR 애니메이션 프레임 중지
    window.cancelAnimationFrame(arAnimationFrameId);

    // AR 웹캠 스트림 중지
    if (arVideo && arVideo.srcObject) {
        arVideo.srcObject.getTracks().forEach(track => track.stop());
        arVideo.srcObject = null;
    }
    
    // AR 관련 DOM 요소 숨기기 및 초기화
    document.getElementById('ar-container').style.display = 'none';
    if (arSticker) {
        arSticker.src = '';
        arSticker.style.display = 'none';
    }

    // 기존 웹캠 모드 상태로 복원
    if (isWebcamMode) {
        document.getElementById('webcam-container').style.display = 'block';
        if (webcam && !webcam.isPlaying()) {
            webcam.play();
            loop(); // 분석 루프 재시작
        }
    } else { // 이미지 업로드 모드였다면
        document.getElementById('webcam-container').style.display = 'flex';
        document.getElementById('initial-message').style.display = 'block';
    }
    
    document.getElementById('label-container').innerHTML = 'Waiting for analysis...'; // 예측 결과 초기화
    document.getElementById('recommendation-output').innerHTML = '<p>Select a model to begin the analysis or selection.</p>'; // 추천 결과 초기화
}
