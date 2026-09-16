import {
  FilesetResolver,
  HandLandmarker,
} from "@mediapipe/tasks-vision";

let handLandmarker = null;


// ==========================================
// INITIALIZE MEDIAPIPE
// ==========================================

export async function initializeGestureEngine() {
  const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm"
  );

  handLandmarker =
    await HandLandmarker.createFromOptions(
      vision,
      {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
        },

        runningMode: "VIDEO",

        numHands: 1,
      }
    );

  return handLandmarker;
}


// ==========================================
// DISTANCE
// ==========================================

function distance(p1, p2) {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  const dz = p1.z - p2.z;

  return Math.sqrt(
    dx * dx +
    dy * dy +
    dz * dz
  );
}


// ==========================================
// DETECT GESTURE
// ==========================================

export function detectGesture(video) {

  if (!handLandmarker) {
    return null;
  }


  const results =
    handLandmarker.detectForVideo(
      video,
      performance.now()
    );


  if (
    !results.landmarks ||
    results.landmarks.length === 0
  ) {
    return null;
  }


  const hand =
    results.landmarks[0];


  // ========================================
  // LANDMARKS
  // ========================================

  const wrist = hand[0];

  const thumbCmc = hand[1];
  const thumbMcp = hand[2];
  const thumbIp = hand[3];
  const thumbTip = hand[4];

  const indexMcp = hand[5];
  const indexPip = hand[6];
  const indexDip = hand[7];
  const indexTip = hand[8];

  const middleMcp = hand[9];
  const middlePip = hand[10];
  const middleDip = hand[11];
  const middleTip = hand[12];

  const ringMcp = hand[13];
  const ringPip = hand[14];
  const ringDip = hand[15];
  const ringTip = hand[16];

  const pinkyMcp = hand[17];
  const pinkyPip = hand[18];
  const pinkyDip = hand[19];
  const pinkyTip = hand[20];


  // ========================================
  // HAND SIZE
  // ========================================

  const handSize =
    distance(
      wrist,
      middleMcp
    );


  if (handSize < 0.001) {
    return null;
  }


  // ========================================
  // FINGER EXTENSION
  // ========================================

  /*
    We use both:
    1. Tip vs PIP vertical position
    2. Tip distance from MCP

    This makes detection more stable.
  */

  const indexExtended =
    indexTip.y < indexPip.y &&
    distance(
      indexTip,
      indexMcp
    ) > handSize * 0.85;


  const middleExtended =
    middleTip.y < middlePip.y &&
    distance(
      middleTip,
      middleMcp
    ) > handSize * 0.85;


  const ringExtended =
    ringTip.y < ringPip.y &&
    distance(
      ringTip,
      ringMcp
    ) > handSize * 0.75;


  const pinkyExtended =
    pinkyTip.y < pinkyPip.y &&
    distance(
      pinkyTip,
      pinkyMcp
    ) > handSize * 0.65;


  // ========================================
  // FINGER FOLDED
  // ========================================

  const indexFolded =
    distance(
      indexTip,
      indexMcp
    ) < handSize * 0.85;


  const middleFolded =
    distance(
      middleTip,
      middleMcp
    ) < handSize * 0.85;


  const ringFolded =
    distance(
      ringTip,
      ringMcp
    ) < handSize * 0.80;


  const pinkyFolded =
    distance(
      pinkyTip,
      pinkyMcp
    ) < handSize * 0.75;


  // ========================================
  // PINCH
  // ========================================

  const thumbIndexDistance =
    distance(
      thumbTip,
      indexTip
    );


  const pinchRatio =
    thumbIndexDistance /
    handSize;


  /*
    Thumb + index very close.

    0.30 = tight pinch
    0.38 = normal pinch
  */

  const isPinching =
    pinchRatio < 0.38;


  if (isPinching) {

    return {
      name: "Pinch",
      action: "Click",
      icon: "👌",
      confidence: 96,
      hand: hand,
    };

  }


  // ========================================
  // THUMB UP
  // ========================================

  /*
    Thumb must point upward.

    The other four fingers must be folded.
  */

  const thumbPointingUp =
    thumbTip.y < thumbIp.y &&
    thumbIp.y < thumbMcp.y &&
    thumbTip.y < wrist.y;


  const otherFingersFolded =
    indexFolded &&
    middleFolded &&
    ringFolded &&
    pinkyFolded;


  const thumbUp =
    thumbPointingUp &&
    otherFingersFolded;


  if (thumbUp) {

    return {
      name: "Thumb Up",
      action: "Double Click",
      icon: "👍",
      confidence: 97,
      hand: hand,
    };

  }


  // ========================================
  // TWO FINGERS
  // ========================================

  const twoFingers =
    indexExtended &&
    middleExtended &&
    !ringExtended &&
    !pinkyExtended;


  if (twoFingers) {

    return {
      name: "Two Fingers",
      action: "Scroll",
      icon: "✌️",
      confidence: 95,
      hand: hand,
    };

  }


  // ========================================
  // INDEX FINGER
  // ========================================

  if (indexExtended) {

    return {
      name: "Index Finger",
      action: "Cursor Move",
      icon: "☝️",
      confidence: 96,
      hand: hand,
    };

  }


  // ========================================
  // OPEN HAND
  // ========================================

  const openHand =
    indexExtended &&
    middleExtended &&
    ringExtended &&
    pinkyExtended;


  if (openHand) {

    return {
      name: "Hand",
      action: "Waiting...",
      icon: "✋",
      confidence: 90,
      hand: hand,
    };

  }


  // ========================================
  // DEFAULT
  // ========================================

  return {
    name: "Hand",
    action: "Waiting...",
    icon: "✋",
    confidence: 70,
    hand: hand,
  };
}