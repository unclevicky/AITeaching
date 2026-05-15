import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAudioStore = defineStore('audio', () => {
  const isRecording = ref(false)
  const hasPermission = ref(false)
  const audioLevel = ref(0)
  const error = ref(null)

  function setRecording(recording) {
    isRecording.value = recording
  }

  function setPermission(granted) {
    hasPermission.value = granted
  }

  function setAudioLevel(level) {
    audioLevel.value = Math.max(0, Math.min(1, level))
  }

  function setError(err) {
    error.value = err
  }

  function clearError() {
    error.value = null
  }

  return {
    isRecording, hasPermission, audioLevel, error,
    setRecording, setPermission, setAudioLevel, setError, clearError
  }
})
