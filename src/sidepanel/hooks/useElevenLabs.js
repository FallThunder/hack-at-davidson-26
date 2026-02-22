import { useState, useRef, useCallback } from 'react'

const TTS_PROXY_URL = import.meta.env.VITE_TTS_PROXY_URL

export function useElevenLabs() {
  const [isLoading, setIsLoading] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [ttsError, setTtsError] = useState(null)
  const audioRef = useRef(null)
  const objectUrlRef = useRef(null)

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current)
      objectUrlRef.current = null
    }
    setIsPlaying(false)
  }, [])

  const speak = useCallback(async ({ trustScore, flags, siteProfile, headline }) => {
    if (!TTS_PROXY_URL) {
      setTtsError('TTS proxy URL not configured')
      return
    }

    if (isPlaying) {
      stop()
      return
    }

    setIsLoading(true)
    setTtsError(null)

    try {
      const response = await fetch(`${TTS_PROXY_URL}/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ headline, trustScore, flags, siteProfile }),
      })

      if (!response.ok) throw new Error('TTS request failed')

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      objectUrlRef.current = url

      const audio = new Audio(url)
      audioRef.current = audio

      audio.onended = () => {
        setIsPlaying(false)
        URL.revokeObjectURL(url)
        objectUrlRef.current = null
      }
      audio.onerror = () => {
        setIsPlaying(false)
        setTtsError('Audio playback failed')
      }

      await audio.play()
      setIsPlaying(true)
    } catch (err) {
      setTtsError(err.message)
    } finally {
      setIsLoading(false)
    }
  }, [isPlaying, stop])

  return { speak, stop, isLoading, isPlaying, ttsError }
}
