import React, { useState, useEffect } from 'react';
import { SpeechService } from '../../services/SpeechService';
import styles from './VoiceRecorder.module.css';

interface VoiceRecorderProps {
  onTranscriptionComplete: (text: string) => void; // Only pass text, no audio
  onError: (error: string) => void;
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({ onTranscriptionComplete, onError }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [currentText, setCurrentText] = useState('');
  const [finalText, setFinalText] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState('');
  // Remove audioBlob state since we don't store audio
  const [speechService] = useState(() => new SpeechService());

  useEffect(() => {
    setIsSupported(speechService.isSupported());
  }, [speechService]);

  const startRecording = async () => {
    try {
      setCurrentText('');
      setFinalText('');

      // Set up real-time transcription updates BEFORE starting recording
      speechService.onTranscriptionUpdate = (text: string, isFinal: boolean) => {
        console.log('Transcription update:', text, 'isFinal:', isFinal);
        if (isFinal) {
          setFinalText(prev => prev + text + ' ');
          setCurrentText('');
        } else {
          setCurrentText(text);
        }
      };

      await speechService.startRecording();
      setIsRecording(true);
    } catch (error) {
      onError(`Failed to start recording: ${error}`);
    }
  };

  const stopRecording = async () => {
    try {
      const result = await speechService.stopRecording();
      setIsRecording(false);
      setCurrentText('');

      // Use the final text from the service (accumulated during recording)
      const completeText = finalText + result.text;
      setFinalText(completeText.trim());

      console.log('Complete transcription:', completeText);
      // We don't store the audio, only the text
    } catch (error) {
      setIsRecording(false);
      onError(`Failed to stop recording: ${error}`);
    }
  };

  const saveRecording = () => {
    const textToSave = isEditing ? editedText : finalText;
    if (textToSave) {
      onTranscriptionComplete(textToSave); // Only pass the text
      setFinalText('');
      setCurrentText('');
      setIsEditing(false);
      setEditedText('');
    }
  };

  const clearRecording = () => {
    setFinalText('');
    setCurrentText('');
    setIsEditing(false);
    setEditedText('');
  };

  const startEditing = () => {
    setEditedText(finalText);
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setEditedText('');
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditedText(e.target.value);
  };

  if (!isSupported) {
    return (
      <div className={styles.container}>
        <div className={styles.unsupported}>
          <p>Voice recording isn't available in this browser.</p>
          <p>Try using Chrome, Firefox, or Safari for the best experience.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.recorder}>
        <button
          className={`${styles.recordButton} ${isRecording ? styles.recording : ''}`}
          onClick={isRecording ? stopRecording : startRecording}
          disabled={false}
        >
          <div className={styles.buttonIcon}>
            {isRecording ? (
              <div className={styles.stopIcon}></div>
            ) : (
              <div className={styles.micIcon}></div>
            )}
          </div>
          <span className={styles.buttonText}>
            {isRecording ? 'Stop' : 'Record'}
          </span>
        </button>

        {isRecording && (
          <div className={styles.recordingIndicator}>
            <div className={styles.pulse}></div>
            <span>Listening...</span>
          </div>
        )}
      </div>

      {/* Text display box */}
      <div className={styles.textDisplay}>
        {isEditing ? (
          <div className={styles.editBox}>
            <textarea
              className={styles.editTextarea}
              value={editedText}
              onChange={handleTextChange}
              placeholder="Edit your text here..."
              autoFocus
            />
          </div>
        ) : (
          <div className={styles.textBox}>
            <div className={styles.finalText}>{finalText}</div>
            <div className={styles.currentText}>{currentText}</div>
            {!isRecording && !finalText && !currentText && (
              <div className={styles.placeholder}>
                Press record and start speaking
              </div>
            )}
          </div>
        )}

        {finalText && !isRecording && (
          <div className={styles.actionButtons}>
            {isEditing ? (
              <>
                <button
                  className={styles.saveButton}
                  onClick={saveRecording}
                >
                  💾 Save
                </button>
                <button
                  className={styles.cancelButton}
                  onClick={cancelEditing}
                >
                  ✕ Cancel
                </button>
              </>
            ) : (
              <>
                <button
                  className={styles.editButton}
                  onClick={startEditing}
                >
                  ✏️ Edit
                </button>
                <button
                  className={styles.saveButton}
                  onClick={saveRecording}
                >
                  💾 Save
                </button>
                <button
                  className={styles.clearButton}
                  onClick={clearRecording}
                >
                  🗑️ Clear
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};