import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useAvatarStore = defineStore('avatar', () => {
  const state = ref('IDLE')
  const isMicActive = ref(false)
  const isConnected = ref(false)
  const currentCommand = ref(null)

  const isIdle = computed(() => state.value === 'IDLE')
  const isListening = computed(() => state.value === 'LISTENING')
  const isSpeaking = computed(() => state.value === 'SPEAKING')

  function setState(newState) {
    state.value = newState
  }

  function setMicActive(active) {
    isMicActive.value = active
    if (active) {
      state.value = 'LISTENING'
    } else if (state.value === 'LISTENING') {
      state.value = 'IDLE'
    }
  }

  function setConnected(connected) {
    isConnected.value = connected
  }

  function setCommand(cmd) {
    currentCommand.value = cmd
  }

  function reset() {
    state.value = 'IDLE'
    isMicActive.value = false
    currentCommand.value = null
  }

  return {
    state, isMicActive, isConnected, currentCommand,
    isIdle, isListening, isSpeaking,
    setState, setMicActive, setConnected, setCommand, reset
  }
})
