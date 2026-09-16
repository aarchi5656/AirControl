import { useEffect, useRef, useState } from "react";
import "./App.css";

import {
  initializeGestureEngine,
  detectGesture,
} from "./gestureEngine.js";

import { startCamera } from "./camera";


// ==========================================
// APP
// ==========================================

function App() {
  // ========================================
  // REFS
  // ========================================

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const animationRef = useRef(null);

  const lastGestureRef = useRef("");
  const lastActionTimeRef = useRef(0);
  const previousMiddleYRef = useRef(null);
  const startingRef = useRef(false);

  // IMPORTANT:
  // React state update asynchronous hota hai.
  // Isliye click ke liye cursorRef immediately
  // latest cursor position store karega.
  const cursorRef = useRef({
    x: window.innerWidth / 2,
    y: window.innerHeight / 2,
    visible: false,
  });


  // ========================================
  // STATE
  // ========================================

  const [cameraOn, setCameraOn] = useState(false);
  const [active, setActive] = useState(false);

  const [cursor, setCursor] = useState({
    x: window.innerWidth / 2,
    y: window.innerHeight / 2,
    visible: false,
  });

  const [liveData, setLiveData] = useState({
    gesture: "Waiting...",
    action: "Camera Off",
    confidence: 0,
    response_time: 0,
    gesture_count: 0,
  });

  const [history, setHistory] = useState([]);


  // ==========================================
  // GESTURE ICON
  // ==========================================

  const getGestureIcon = (gesture) => {
    switch (gesture) {
      case "Thumb Up":
        return "👍";

      case "Pinch":
        return "👌";

      case "Two Fingers":
        return "✌️";

      case "Index Finger":
        return "☝️";

      case "Hand":
        return "✋";

      default:
        return "✦";
    }
  };


  // ==========================================
  // ADD ACTIVITY
  // ==========================================

  const addActivity = (gesture) => {
    const newActivity = {
      icon: gesture.icon,
      gesture: gesture.name,
      action: gesture.action,
      time: "Now",
    };

    setHistory((previous) =>
      [
        newActivity,
        ...previous,
      ].slice(0, 6)
    );
  };


  // ==========================================
  // GET ELEMENT UNDER VIRTUAL CURSOR
  // ==========================================

  const getTargetElement = () => {
    const { x, y } = cursorRef.current;

    const element = document.elementFromPoint(x, y);

    if (!element) {
      console.log("❌ No element under cursor");
      return null;
    }

    // Virtual cursor itself ignore karo
    if (
      element.closest(".virtual-cursor") ||
      element.closest("video")
    ) {
      return null;
    }

    return element;
  };


  // ==========================================
  // FIND CLICKABLE ELEMENT
  // ==========================================

  const getClickableElement = () => {
    const element = getTargetElement();

    if (!element) {
      return null;
    }

    const clickable = element.closest(
      "button, a, input, select, textarea, [role='button'], [onclick]"
    );

    return clickable;
  };


  // ==========================================
  // BROWSER CLICK
  // ==========================================

  const performClick = () => {
    const clickable = getClickableElement();

    if (!clickable) {
      console.log(
        "❌ No clickable element at:",
        cursorRef.current.x,
        cursorRef.current.y
      );

      return;
    }

    console.log("🖱️ CLICK:", clickable);

    // Focus first
    if (typeof clickable.focus === "function") {
      clickable.focus();
    }

    // Native click
    if (typeof clickable.click === "function") {
      clickable.click();
    }

    // Extra mouse event for custom web elements
    const { x, y } = cursorRef.current;

    clickable.dispatchEvent(
      new MouseEvent("mousedown", {
        bubbles: true,
        cancelable: true,
        clientX: x,
        clientY: y,
        view: window,
      })
    );

    clickable.dispatchEvent(
      new MouseEvent("mouseup", {
        bubbles: true,
        cancelable: true,
        clientX: x,
        clientY: y,
        view: window,
      })
    );
  };


  // ==========================================
  // BROWSER DOUBLE CLICK
  // ==========================================

  const performDoubleClick = () => {
    const element = getTargetElement();

    if (!element) {
      console.log("❌ No element for double click");
      return;
    }

    const clickable =
      element.closest(
        "button, a, input, select, textarea, [role='button'], [onclick]"
      ) || element;

    const { x, y } = cursorRef.current;

    console.log("🖱️ DOUBLE CLICK:", clickable);

    if (typeof clickable.focus === "function") {
      clickable.focus();
    }

    // First click
    clickable.dispatchEvent(
      new MouseEvent("mousedown", {
        bubbles: true,
        cancelable: true,
        clientX: x,
        clientY: y,
        view: window,
        detail: 1,
      })
    );

    clickable.dispatchEvent(
      new MouseEvent("mouseup", {
        bubbles: true,
        cancelable: true,
        clientX: x,
        clientY: y,
        view: window,
        detail: 1,
      })
    );

    clickable.dispatchEvent(
      new MouseEvent("click", {
        bubbles: true,
        cancelable: true,
        clientX: x,
        clientY: y,
        view: window,
        detail: 1,
      })
    );

    // Second click
    clickable.dispatchEvent(
      new MouseEvent("mousedown", {
        bubbles: true,
        cancelable: true,
        clientX: x,
        clientY: y,
        view: window,
        detail: 2,
      })
    );

    clickable.dispatchEvent(
      new MouseEvent("mouseup", {
        bubbles: true,
        cancelable: true,
        clientX: x,
        clientY: y,
        view: window,
        detail: 2,
      })
    );

    clickable.dispatchEvent(
      new MouseEvent("click", {
        bubbles: true,
        cancelable: true,
        clientX: x,
        clientY: y,
        view: window,
        detail: 2,
      })
    );

    // Actual dblclick
    clickable.dispatchEvent(
      new MouseEvent("dblclick", {
        bubbles: true,
        cancelable: true,
        clientX: x,
        clientY: y,
        view: window,
        detail: 2,
      })
    );
  };


  // ==========================================
  // BROWSER SCROLL
  // ==========================================

  const performScroll = (direction) => {
    window.scrollBy({
      top: direction,
      left: 0,
      behavior: "auto",
    });
  };


  // ==========================================
  // UPDATE VIRTUAL CURSOR
  // ==========================================

  const updateVirtualCursor = (hand) => {
    if (!hand || !hand[8]) {
      return;
    }

    const indexTip = hand[8];

    /*
      Camera video is mirrored using scaleX(-1),
      therefore X is reversed.
    */

    const x =
      (1 - indexTip.x) *
      window.innerWidth;

    const y =
      indexTip.y *
      window.innerHeight;


    const safeX = Math.max(
      15,
      Math.min(
        window.innerWidth - 15,
        x
      )
    );

    const safeY = Math.max(
      15,
      Math.min(
        window.innerHeight - 15,
        y
      )
    );


    // ======================================
    // IMPORTANT
    // ======================================
    // Ref immediately update hota hai.
    // Isse pinch ke moment par latest cursor
    // position milti hai.

    cursorRef.current = {
      x: safeX,
      y: safeY,
      visible: true,
    };


    // UI cursor
    setCursor({
      x: safeX,
      y: safeY,
      visible: true,
    });
  };


  // ==========================================
  // HANDLE GESTURE
  // ==========================================

  const handleGesture = (gesture) => {
    if (!gesture) {
      return;
    }

    const now = performance.now();

    const previousGesture =
      lastGestureRef.current;


    // ========================================
    // INDEX FINGER → CURSOR
    // ========================================

    if (
      gesture.name === "Index Finger" &&
      gesture.hand
    ) {
      updateVirtualCursor(
        gesture.hand
      );
    }


    // ========================================
    // PINCH → CLICK
    // ========================================

    if (
      gesture.name === "Pinch" &&
      previousGesture !== "Pinch"
    ) {

      if (
        now -
          lastActionTimeRef.current >
        700
      ) {

        console.log(
          "👌 PINCH DETECTED"
        );

        performClick();

        lastActionTimeRef.current =
          now;


        addActivity({
          icon: "👌",
          name: "Pinch",
          action: "Click",
        });


        setLiveData((previous) => ({
          ...previous,
          action: "Click",
          gesture_count:
            previous.gesture_count + 1,
        }));
      }
    }


    // ========================================
    // THUMB UP → DOUBLE CLICK
    // ========================================

    if (
      gesture.name === "Thumb Up" &&
      previousGesture !== "Thumb Up"
    ) {

      if (
        now -
          lastActionTimeRef.current >
        900
      ) {

        console.log(
          "👍 THUMB UP DETECTED"
        );

        performDoubleClick();

        lastActionTimeRef.current =
          now;


        addActivity({
          icon: "👍",
          name: "Thumb Up",
          action: "Double Click",
        });


        setLiveData((previous) => ({
          ...previous,
          action: "Double Click",
          gesture_count:
            previous.gesture_count + 1,
        }));
      }
    }


    // ========================================
    // TWO FINGERS → SCROLL
    // ========================================

    if (
      gesture.name === "Two Fingers" &&
      gesture.hand
    ) {

      const middleY =
        gesture.hand[12].y;


      if (
        previousMiddleYRef.current !==
        null
      ) {

        const movement =
          previousMiddleYRef.current -
          middleY;


        if (
          movement > 0.015
        ) {

          performScroll(-100);

          setLiveData((previous) => ({
            ...previous,
            action: "Scroll Up",
          }));

        } else if (
          movement < -0.015
        ) {

          performScroll(100);

          setLiveData((previous) => ({
            ...previous,
            action: "Scroll Down",
          }));
        }
      }


      previousMiddleYRef.current =
        middleY;

    } else {

      previousMiddleYRef.current =
        null;
    }


    // ========================================
    // ACTIVITY
    // ========================================

    if (
      gesture.name !== previousGesture
    ) {

      addActivity(gesture);


      if (
        gesture.name !== "Index Finger"
      ) {

        setLiveData((previous) => ({
          ...previous,

          gesture_count:
            previous.gesture_count + 1,
        }));
      }
    }


    // ========================================
    // LIVE DATA
    // ========================================

    setLiveData((previous) => ({
      ...previous,

      gesture:
        gesture.name,

      action:
        gesture.name === "Index Finger"
          ? "Cursor Move"
          : gesture.action,

      confidence:
        gesture.confidence,
    }));


    lastGestureRef.current =
      gesture.name;
  };


  // ==========================================
  // DETECTION LOOP
  // ==========================================

  const detectionLoop = () => {

    if (!videoRef.current) {
      return;
    }


    if (
      videoRef.current.readyState >= 2
    ) {

      const start =
        performance.now();


      const result =
        detectGesture(
          videoRef.current
        );


      const responseTime =
        Math.round(
          performance.now() - start
        );


      if (result) {

        setLiveData((previous) => ({
          ...previous,

          gesture:
            result.name,

          action:
            result.action,

          confidence:
            result.confidence,

          response_time:
            responseTime,
        }));


        handleGesture(result);

      } else {

        setLiveData((previous) => ({
          ...previous,

          gesture: "No Hand",

          action: "Waiting...",

          confidence: 0,

          response_time:
            responseTime,
        }));


        lastGestureRef.current =
          "";

        previousMiddleYRef.current =
          null;
      }
    }


    animationRef.current =
      requestAnimationFrame(
        detectionLoop
      );
  };


  // ==========================================
  // START AIRCONTROL
  // ==========================================

  const startAirControl =
    async () => {

      if (startingRef.current) {
        return;
      }


      startingRef.current = true;


      try {

        await initializeGestureEngine();


        const stream =
          await startCamera(
            videoRef.current
          );


        streamRef.current =
          stream;


        setCameraOn(true);
        setActive(true);


        // Center cursor
        const centerCursor = {
          x:
            window.innerWidth / 2,

          y:
            window.innerHeight / 2,

          visible: true,
        };


        cursorRef.current =
          centerCursor;


        setCursor(
          centerCursor
        );


        setLiveData((previous) => ({
          ...previous,

          gesture:
            "Detecting...",

          action:
            "Ready",

          confidence: 0,
        }));


        lastGestureRef.current =
          "";

        previousMiddleYRef.current =
          null;

        lastActionTimeRef.current =
          0;


        detectionLoop();

      } catch (error) {

        console.error(
          "AirControl startup error:",
          error
        );


        alert(
          "AirControl could not start. Please check camera permission and try again."
        );

      } finally {

        startingRef.current =
          false;
      }
    };


  // ==========================================
  // STOP AIRCONTROL
  // ==========================================

  const stopAirControl = () => {

    if (
      animationRef.current
    ) {

      cancelAnimationFrame(
        animationRef.current
      );

      animationRef.current =
        null;
    }


    if (
      streamRef.current
    ) {

      streamRef.current
        .getTracks()
        .forEach(
          (track) =>
            track.stop()
        );


      streamRef.current =
        null;
    }


    if (
      videoRef.current
    ) {

      videoRef.current.srcObject =
        null;
    }


    setCameraOn(false);
    setActive(false);


    setCursor((previous) => ({
      ...previous,
      visible: false,
    }));


    cursorRef.current = {
      ...cursorRef.current,
      visible: false,
    };


    setLiveData((previous) => ({
      ...previous,

      gesture:
        "Waiting...",

      action:
        "Camera Off",

      confidence: 0,
    }));


    lastGestureRef.current =
      "";

    previousMiddleYRef.current =
      null;
  };


  // ==========================================
  // CLEANUP
  // ==========================================

  useEffect(() => {

    return () => {

      if (
        animationRef.current
      ) {

        cancelAnimationFrame(
          animationRef.current
        );
      }


      if (
        streamRef.current
      ) {

        streamRef.current
          .getTracks()
          .forEach(
            (track) =>
              track.stop()
          );
      }
    };

  }, []);


  // ==========================================
  // WINDOW RESIZE
  // ==========================================

  useEffect(() => {

    const handleResize = () => {

      const safeX =
        Math.min(
          cursorRef.current.x,
          window.innerWidth - 15
        );

      const safeY =
        Math.min(
          cursorRef.current.y,
          window.innerHeight - 15
        );


      cursorRef.current = {
        ...cursorRef.current,
        x: safeX,
        y: safeY,
      };


      setCursor((previous) => ({
        ...previous,

        x: safeX,

        y: safeY,
      }));
    };


    window.addEventListener(
      "resize",
      handleResize
    );


    return () => {

      window.removeEventListener(
        "resize",
        handleResize
      );
    };

  }, []);


  // ==========================================
  // GESTURES
  // ==========================================

  const gestures = [
    {
      icon: "☝️",
      name: "Cursor Move",
      action: "Move pointer",
    },

    {
      icon: "👌",
      name: "Single Click",
      action: "Click",
    },

    {
      icon: "✌️",
      name: "Scroll",
      action: "Scroll page",
    },

    {
      icon: "👍",
      name: "Double Click",
      action: "Open item",
    },
  ];


  // ==========================================
  // UI
  // ==========================================

  return (

    <div className="app">

      {/* ======================================
          VIRTUAL CURSOR
      ====================================== */}

      {cursor.visible && cameraOn && (

        <div
          className="virtual-cursor"
          style={{
            position: "fixed",

            left:
              `${cursor.x}px`,

            top:
              `${cursor.y}px`,

            transform:
              "translate(-50%, -50%)",

            width: "32px",
            height: "32px",

            zIndex: 999999,

            pointerEvents: "none",

            display: "flex",

            alignItems: "center",

            justifyContent: "center",
          }}
        >

          <div
            style={{
              width: "18px",
              height: "18px",

              borderRadius: "50%",

              border:
                "3px solid white",

              background:
                "rgba(124, 58, 237, 0.9)",

              boxShadow:
                "0 0 0 5px rgba(124, 58, 237, 0.20), 0 0 22px rgba(168, 85, 247, 0.95)",
            }}
          />

        </div>

      )}


      {/* ======================================
          SIDEBAR
      ====================================== */}

      <aside className="sidebar">

        <div className="brand">

          <div className="brand-icon">
            ✦
          </div>

          <div>

            <h2>
              AirControl
            </h2>

            <span>
              AI Gesture Desktop
            </span>

          </div>

        </div>


        <nav>

          <div className="nav-item active">

            <span>⌂</span>

            Dashboard

          </div>


          <div className="nav-item">

            <span>☝</span>

            Gestures

          </div>


          <div className="nav-item">

            <span>◉</span>

            Activity

          </div>


          <div className="nav-item">

            <span>⚙</span>

            Settings

          </div>

        </nav>


        <div className="sidebar-bottom">

          <div className="system-mini">

            <span
              className={
                active
                  ? "dot online"
                  : "dot"
              }
            ></span>

            <div>

              <strong>

                {active
                  ? "System Active"
                  : "System Offline"}

              </strong>

              <small>
                Browser AI Engine
              </small>

            </div>

          </div>

        </div>

      </aside>


      {/* ======================================
          MAIN
      ====================================== */}

      <main className="main">


        {/* HEADER */}

        <header className="header">

          <div>

            <p className="eyebrow">
              CONTROL CENTER
            </p>

            <h1>

              Welcome to AirControl{" "}

              <span>
                ✦
              </span>

            </h1>

            <p className="subtitle">

              Control your browser naturally
              with hand gestures.

            </p>

          </div>


          <button
            className={
              active
                ? "power-btn active"
                : "power-btn"
            }

            onClick={
              active
                ? stopAirControl
                : startAirControl
            }
          >

            <span className="power-dot"></span>

            {active
              ? "ACTIVE"
              : "START"}

          </button>

        </header>


        {/* ======================================
            CAMERA
        ====================================== */}

        <section className="panel camera-panel">

          <div className="panel-header">

            <div>

              <h2>
                Gesture Camera
              </h2>

              <p>
                Allow camera access to start
                gesture detection.
              </p>

            </div>


            {!cameraOn && (

              <button
                className="outline-btn"
                onClick={
                  startAirControl
                }
              >

                📷 Start Camera

              </button>

            )}

          </div>


          <div
            style={{
              position: "relative",
              width: "100%",
              maxWidth: "640px",
              margin: "20px auto",
              borderRadius: "18px",
              overflow: "hidden",
              background: "#111",
            }}
          >

            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted

              style={{
                width: "100%",

                display:
                  cameraOn
                    ? "block"
                    : "none",

                transform:
                  "scaleX(-1)",
              }}
            />


            {!cameraOn && (

              <div
                style={{
                  height: "260px",

                  display: "flex",

                  alignItems: "center",

                  justifyContent:
                    "center",

                  color: "#aaa",

                  fontSize: "16px",
                }}
              >

                📷 Camera is off

              </div>

            )}

          </div>

        </section>


        {/* ======================================
            TOP CARDS
        ====================================== */}

        <section className="stats-grid">


          {/* CURRENT GESTURE */}

          <div className="stat-card hero-card">

            <div className="card-top">

              <span>
                Current Gesture
              </span>


              <span className="live-badge">

                {cameraOn
                  ? "● LIVE"
                  : "○ OFFLINE"}

              </span>

            </div>


            <div className="gesture-display">

              <div className="gesture-icon big">

                {getGestureIcon(
                  liveData.gesture
                )}

              </div>


              <div>

                <h2>

                  {liveData.gesture}

                </h2>


                <p>

                  {liveData.action}

                </p>

              </div>

            </div>


            <div className="confidence">

              <div className="confidence-label">

                <span>
                  Detection confidence
                </span>

                <strong>

                  {liveData.confidence}%

                </strong>

              </div>


              <div className="progress">

                <div
                  style={{
                    width:
                      `${liveData.confidence}%`,
                  }}
                ></div>

              </div>

            </div>

          </div>


          {/* GESTURES TODAY */}

          <div className="stat-card">

            <div className="card-top">

              <span>
                Gestures Today
              </span>


              <span className="stat-icon">
                ◌
              </span>

            </div>


            <h2 className="big-number">

              {liveData.gesture_count}

            </h2>


            <p className="green-text">

              ● Live session

            </p>

          </div>


          {/* RESPONSE TIME */}

          <div className="stat-card">

            <div className="card-top">

              <span>
                Response Time
              </span>


              <span className="stat-icon">
                ϟ
              </span>

            </div>


            <h2 className="big-number">

              {liveData.response_time}

              <span>
                ms
              </span>

            </h2>


            <p className="green-text">

              ● Browser detection

            </p>

          </div>

        </section>


        {/* ======================================
            CONTENT
        ====================================== */}

        <section className="content-grid">


          {/* GESTURE CONTROLS */}

          <div className="panel">

            <div className="panel-header">

              <div>

                <h2>
                  Gesture Controls
                </h2>

                <p>
                  Available interactions
                </p>

              </div>

            </div>


            <div className="gesture-list">

              {gestures.map(
                (gesture, index) => (

                  <div
                    className="gesture-row"
                    key={index}
                  >

                    <div className="row-icon">

                      {gesture.icon}

                    </div>


                    <div className="row-info">

                      <strong>

                        {gesture.name}

                      </strong>


                      <span>

                        {gesture.action}

                      </span>

                    </div>


                    <div className="toggle on">

                      <div></div>

                    </div>

                  </div>

                )
              )}

            </div>

          </div>


          {/* LIVE ACTIVITY */}

          <div className="panel">

            <div className="panel-header">

              <div>

                <h2>
                  Recent Activity
                </h2>

                <p>
                  Latest detected gestures
                </p>

              </div>

            </div>


            <div className="activity-list">

              {history.length > 0 ? (

                history.map(
                  (item, index) => (

                    <div
                      className="activity-row"
                      key={index}
                    >

                      <div className="activity-icon">

                        {item.icon}

                      </div>


                      <div className="activity-info">

                        <strong>

                          {item.gesture}

                        </strong>


                        <span>

                          {item.action}

                        </span>

                      </div>


                      <time>

                        {index === 0
                          ? "Now"
                          : "Recent"}

                      </time>

                    </div>

                  )
                )

              ) : (

                <div className="activity-row">

                  <div className="activity-icon">
                    ✦
                  </div>


                  <div className="activity-info">

                    <strong>
                      No activity yet
                    </strong>


                    <span>
                      Start camera and
                      perform a gesture
                    </span>

                  </div>


                  <time>
                    —
                  </time>

                </div>

              )}

            </div>

          </div>

        </section>


        {/* ======================================
            BOTTOM
        ====================================== */}

        <section className="bottom-grid">


          {/* QUICK CONTROLS */}

          <div className="panel quick-panel">

            <div className="panel-header">

              <div>

                <h2>
                  Quick Controls
                </h2>

                <p>
                  Manage AirControl
                </p>

              </div>

            </div>


            <div className="quick-buttons">

              <button
                onClick={
                  active
                    ? stopAirControl
                    : startAirControl
                }
              >

                <span>

                  {active
                    ? "⏸"
                    : "▶"}

                </span>


                {active
                  ? "Stop Detection"
                  : "Start Detection"}

              </button>


              <button
                onClick={() =>
                  setHistory([])
                }
              >

                <span>
                  ↻
                </span>

                Reset Activity

              </button>


              <button>

                <span>
                  ⚙
                </span>

                Preferences

              </button>

            </div>

          </div>


          {/* SYSTEM HEALTH */}

          <div className="panel status-panel">

            <div className="panel-header">

              <div>

                <h2>
                  System Health
                </h2>

                <p>
                  Browser-based AI engine
                </p>

              </div>


              <div className="health-circle">

                ✓

              </div>

            </div>


            <div className="health-items">


              <div>

                <span>
                  ●
                </span>

                Camera

                <strong>

                  {cameraOn
                    ? "Connected"
                    : "Offline"}

                </strong>

              </div>


              <div>

                <span>
                  ●
                </span>

                MediaPipe

                <strong>

                  {cameraOn
                    ? "Running"
                    : "Ready"}

                </strong>

              </div>


              <div>

                <span>
                  ●
                </span>

                AI Engine

                <strong>

                  {cameraOn
                    ? "Active"
                    : "Standby"}

                </strong>

              </div>

            </div>

          </div>

        </section>


        {/* ======================================
            FOOTER
        ====================================== */}

        <footer>

          <span>
            AirControl v2.0 Web
          </span>


          <span>
            AI-powered browser gesture control •
            Runs locally
          </span>

        </footer>


      </main>

    </div>
  );
}


export default App;