
import { GoogleGenAI, Modality } from "@google/genai";
import { getDispatchEndTime, getSharedAudioCtx } from "./audioService";

function decodeBase64(base64: string): Uint8Array {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

const formatIdForSpeech = (id: string) => {
  return id.replace(/\./g, ' titik ');
};

export const announceCall = async (station: string, model: string, ngReason: string, techType: string) => {
  const speechNgId = formatIdForSpeech(ngReason);
  const textPrompt = `Perhatian. Panggilan kepada ${techType} harap segera ke ${station} untuk model ${model}. Masalah terdeteksi ${speechNgId}. Mohon segera menuju lokasi.
  Sekali lagi. Panggilan kepada ${techType} dibutuhkan pada ${station} untuk model ${model}. Masalah terdeteksi ${speechNgId}. Mohon segera menuju lokasi.Terima kasih.`;
  
  const handleFallback = () => {
    window.speechSynthesis.cancel();
    
    setTimeout(() => {
      const msg = new SpeechSynthesisUtterance(textPrompt);
      msg.lang = 'id-ID';
      msg.rate = 0.95;
      msg.volume = 1;
      msg.pitch = 1;
      
      window.speechSynthesis.speak(msg);
    }, 1000);
  };

  if (!process.env.API_KEY) {
    handleFallback();
    return;
  }
  
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: textPrompt }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      const audioCtx = getSharedAudioCtx();
      
      if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
      }
      
      const decodedData = decodeBase64(base64Audio);
      const audioBuffer = await decodeAudioData(decodedData, audioCtx, 24000, 1);
      
      const source = audioCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioCtx.destination);
      
      const chimeEndTime = getDispatchEndTime();
      const startTime = Math.max(audioCtx.currentTime, chimeEndTime);
      
      source.start(startTime);
    } else {
      console.warn("No audio data in Gemini response, falling back to system TTS");
      handleFallback();
    }
  } catch (error) {
    console.error("Failed to announce call via Gemini TTS:", error);
    handleFallback();
  }
};
