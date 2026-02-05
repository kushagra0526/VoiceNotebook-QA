export class SpeechService {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private recognition: SpeechRecognition | null = null;
  private isRecording = false;
  private finalTranscript = '';
  public onTranscriptionUpdate: ((text: string, isFinal: boolean) => void) | null = null;

  constructor() {
    if (this.isSupported()) {
      const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = true; // Enable interim results for real-time updates
      this.recognition.lang = 'en-US';
    }
  }

  isSupported(): boolean {
    return !!(window.SpeechRecognition || (window as any).webkitSpeechRecognition) && 
           !!navigator.mediaDevices?.getUserMedia;
  }

  async startRecording(): Promise<void> {
    if (this.isRecording) {
      throw new Error('Already recording');
    }

    try {
      // Reset transcript
      this.finalTranscript = '';
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.mediaRecorder = new MediaRecorder(stream);
      this.audioChunks = [];

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.start();
      this.isRecording = true;

      if (this.recognition) {
        // Set up real-time transcription
        this.recognition.onresult = (event) => {
          let interimTranscript = '';
          
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            const isFinal = event.results[i].isFinal;
            
            if (isFinal) {
              this.finalTranscript += transcript + ' ';
              if (this.onTranscriptionUpdate) {
                this.onTranscriptionUpdate(transcript, true);
              }
            } else {
              interimTranscript += transcript;
              if (this.onTranscriptionUpdate) {
                this.onTranscriptionUpdate(transcript, false);
              }
            }
          }
        };

        this.recognition.onerror = (event) => {
          console.warn('Speech recognition error:', event.error);
        };

        this.recognition.start();
      }
    } catch (error) {
      throw new Error(`Failed to start recording: ${error}`);
    }
  }

  async stopRecording(): Promise<{ text: string; audioBlob: Blob }> {
    if (!this.isRecording || !this.mediaRecorder) {
      throw new Error('Not currently recording');
    }

    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error('MediaRecorder not available'));
        return;
      }

      // Stop speech recognition first
      if (this.recognition) {
        this.recognition.stop();
      }

      this.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/wav' });
        this.isRecording = false;
        
        // Stop all tracks to release microphone
        if (this.mediaRecorder?.stream) {
          this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
        }

        // Use the accumulated final transcript
        let transcriptionText = this.finalTranscript.trim();
        
        // If no transcription, provide fallback
        if (!transcriptionText) {
          transcriptionText = `Voice note from ${new Date().toLocaleString()}`;
        }

        console.log('Final transcription:', transcriptionText);

        resolve({
          text: transcriptionText,
          audioBlob
        });
      };

      this.mediaRecorder.onerror = (event) => {
        reject(new Error(`Recording failed: ${event}`));
      };

      this.mediaRecorder.stop();
    });
  }

  async recognizeSpeech(audioBlob: Blob): Promise<string> {
    // For this implementation, we'll use the live recognition during recording
    // This method can be extended for offline audio processing if needed
    return new Promise((resolve, reject) => {
      if (!this.recognition) {
        reject(new Error('Speech recognition not supported'));
        return;
      }

      let result = '';
      
      this.recognition.onresult = (event) => {
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            result += event.results[i][0].transcript + ' ';
          }
        }
      };

      this.recognition.onerror = (event) => {
        reject(new Error(`Speech recognition failed: ${event.error}`));
      };

      this.recognition.onend = () => {
        resolve(result.trim() || 'Could not transcribe audio');
      };

      // For blob processing, we'd need to convert to audio URL and play
      // This is a simplified version - in production, you might use Web Audio API
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      
      audio.onplay = () => {
        this.recognition?.start();
      };

      audio.onended = () => {
        setTimeout(() => {
          this.recognition?.stop();
        }, 1000);
      };

      audio.play().catch(reject);
    });
  }
}