export async function startCamera(video) {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: 640,
        height: 480,
        facingMode: "user",
      },
      audio: false,
    });
  
    video.srcObject = stream;
  
    await video.play();
  
    return stream;
  }