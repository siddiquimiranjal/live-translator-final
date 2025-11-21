import { useState, useRef, useCallback, useEffect } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { ConnectionState, Language } from '../types';
import { createBlob, decode, decodeAudioData } from '../utils/audioUtils';

interface UseLiveTranslatorProps {
  sourceLang: Language;
  targetLang: Language;
  voiceName?: string;
  onTranscript?: (text: string, isUser: boolean) => void;
}

export const useLiveTranslator = ({ sourceLang, targetLang, voiceName = 'Puck', onTranscript }: UseLiveTranslatorProps) => {
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.DISCONNECTED);
  const [error, setError] = useState<string | null>(null);
  
  // Refs for audio context and processing
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const inputSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const outputNodeRef = useRef<GainNode | null>(null);
  const activeSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  
  // Analysers for visualization
  const inputAnalyserRef = useRef<AnalyserNode | null>(null);
  const outputAnalyserRef = useRef<AnalyserNode | null>(null);
  const [analysers, setAnalysers] = useState<{ input: AnalyserNode | null, output: AnalyserNode | null }>({ input: null, output: null });

  // Timing cursor for smooth playback
  const nextStartTimeRef = useRef<number>(0);
  
  // Session promise ref to avoid stale closures
  const sessionPromiseRef = useRef<Promise<any> | null>(null);

  const disconnect = useCallback(() => {
    // Close session if possible (Currently no direct close method on session object in SDK, 
    // we rely on closing the contexts and stream which cuts the connection effectively or waiting for server timeout)
    // NOTE: In a real implementation, if the SDK exposes a .close(), call it.
    // The guidance says: "Use session.close() to close the connection".
    
    if (sessionPromiseRef.current) {
        sessionPromiseRef.current.then(session => {
            if (session && typeof session.close === 'function') {
                session.close();
            }
        }).catch(() => {});
        sessionPromiseRef.current = null;
    }

    // Stop media stream
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }

    // Close Audio Contexts
    if (inputAudioContextRef.current) {
      inputAudioContextRef.current.close();
      inputAudioContextRef.current = null;
    }
    if (outputAudioContextRef.current) {
      outputAudioContextRef.current.close();
      outputAudioContextRef.current = null;
    }

    // Stop all playing sources
    activeSourcesRef.current.forEach(source => {
        try { source.stop(); } catch (e) {}
    });
    activeSourcesRef.current.clear();

    setConnectionState(ConnectionState.DISCONNECTED);
    setAnalysers({ input: null, output: null });
  }, []);

  const connect = useCallback(async () => {
    try {
      setConnectionState(ConnectionState.CONNECTING);
      setError(null);

      // 1. Initialize Audio Contexts
      inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      
      const inputCtx = inputAudioContextRef.current;
      const outputCtx = outputAudioContextRef.current;

      // Setup Audio Graph for Input
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      
      const source = inputCtx.createMediaStreamSource(stream);
      inputSourceRef.current = source;
      
      const inputAnalyser = inputCtx.createAnalyser();
      inputAnalyser.fftSize = 256;
      inputAnalyserRef.current = inputAnalyser;
      
      // ScriptProcessor (using 4096 buffer size for balance between latency and stability)
      const processor = inputCtx.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      source.connect(inputAnalyser);
      inputAnalyser.connect(processor);
      processor.connect(inputCtx.destination);

      // Setup Audio Graph for Output
      const outputNode = outputCtx.createGain();
      outputNodeRef.current = outputNode;
      
      const outputAnalyser = outputCtx.createAnalyser();
      outputAnalyser.fftSize = 256;
      outputAnalyserRef.current = outputAnalyser;
      
      outputNode.connect(outputAnalyser);
      outputAnalyser.connect(outputCtx.destination);

      // Update state with analysers
      setAnalysers({ input: inputAnalyser, output: outputAnalyser });

      // 2. Initialize Gemini Client
      const apiKey = process.env.API_KEY;
      if (!apiKey) throw new Error("API Key not found");

      const ai = new GoogleGenAI({ apiKey });
      
      // 3. Define System Instruction based on languages
      const systemInstruction = `You are a professional simultaneous interpreter. 
      Your task is to translate spoken text between ${sourceLang.name} and ${targetLang.name}.
      - If you hear ${sourceLang.name}, translate it to ${targetLang.name}.
      - If you hear ${targetLang.name}, translate it to ${sourceLang.name}.
      - Maintain the tone and emotion of the speaker.
      - Do not add pleasantries or conversational filler. Just output the translation.
      - Be concise and accurate.`;

      // 4. Connect to Live API
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: { parts: [{ text: systemInstruction }] },
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceName } },
          },
          // Transcription to help user verify
          inputAudioTranscription: {},
          outputAudioTranscription: {},
        },
        callbacks: {
          onopen: () => {
            setConnectionState(ConnectionState.CONNECTED);
          },
          onmessage: async (message: LiveServerMessage) => {
            // Handle Audio Output
            const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            
            if (base64Audio) {
              try {
                const audioCtx = outputAudioContextRef.current;
                if (audioCtx) {
                    // Ensure strict timing
                    nextStartTimeRef.current = Math.max(nextStartTimeRef.current, audioCtx.currentTime);

                    const audioBuffer = await decodeAudioData(
                        decode(base64Audio),
                        audioCtx,
                        24000,
                        1
                    );

                    const source = audioCtx.createBufferSource();
                    source.buffer = audioBuffer;
                    source.connect(outputNodeRef.current!); // Connect to gain -> analyser -> dest
                    
                    source.addEventListener('ended', () => {
                        activeSourcesRef.current.delete(source);
                    });

                    source.start(nextStartTimeRef.current);
                    nextStartTimeRef.current += audioBuffer.duration;
                    activeSourcesRef.current.add(source);
                }
              } catch (e) {
                console.error("Error decoding/playing audio", e);
              }
            }

            // Handle Interruptions
            if (message.serverContent?.interrupted) {
                activeSourcesRef.current.forEach(src => {
                    try { src.stop(); } catch(e) {}
                });
                activeSourcesRef.current.clear();
                nextStartTimeRef.current = 0;
            }

            // Handle Transcriptions (Optional UI feedback)
            if (message.serverContent?.inputTranscription && onTranscript) {
                 onTranscript(message.serverContent.inputTranscription.text, true);
            }
            if (message.serverContent?.outputTranscription && onTranscript) {
                onTranscript(message.serverContent.outputTranscription.text, false);
            }
          },
          onclose: () => {
            setConnectionState(ConnectionState.DISCONNECTED);
          },
          onerror: (err) => {
            console.error(err);
            setError("Connection error occurred.");
            setConnectionState(ConnectionState.ERROR);
            disconnect(); // Safety cleanup
          }
        }
      });

      sessionPromiseRef.current = sessionPromise;

      // 5. Setup Audio Processing Loop
      processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        const pcmBlob = createBlob(inputData);
        
        // Send to Gemini
        if (sessionPromiseRef.current) {
            sessionPromiseRef.current.then(session => {
                session.sendRealtimeInput({ media: pcmBlob });
            }).catch(err => {
                // Session might be closed or failed
                console.warn("Failed to send audio", err);
            });
        }
      };

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to start translator");
      setConnectionState(ConnectionState.ERROR);
      disconnect();
    }
  }, [sourceLang, targetLang, voiceName, disconnect, onTranscript]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
        disconnect();
    }
  }, [disconnect]);

  return {
    connectionState,
    error,
    connect,
    disconnect,
    analysers
  };
};
