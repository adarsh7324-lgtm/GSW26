export class CameraManager {
  constructor() {
    this.stream = null;
    this.videoElement = null;
    this.facingMode = 'user'; // 'user' (front) or 'environment' (rear)
    this.isStreaming = false;
  }

  async startCamera(videoElement, facingMode = 'user') {
    this.videoElement = videoElement;
    this.facingMode = facingMode;

    if (this.stream) {
      this.stopCamera();
    }

    const constraints = {
      video: {
        facingMode: this.facingMode,
        width: { ideal: 1280 },
        height: { ideal: 720 }
      },
      audio: false
    };

    try {
      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      if (this.videoElement) {
        this.videoElement.srcObject = this.stream;
        await this.videoElement.play();
        this.isStreaming = true;
      }
      return { success: true, stream: this.stream };
    } catch (error) {
      console.warn('CameraManager: WebRTC user media failed or denied, using simulated stream mode:', error);
      this.isStreaming = false;
      return { success: false, error };
    }
  }

  toggleCamera() {
    const nextFacingMode = this.facingMode === 'user' ? 'environment' : 'user';
    if (this.videoElement) {
      return this.startCamera(this.videoElement, nextFacingMode);
    }
    return Promise.resolve({ success: false });
  }

  stopCamera() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    if (this.videoElement) {
      this.videoElement.srcObject = null;
    }
    this.isStreaming = false;
  }
}
