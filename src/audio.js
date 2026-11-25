import * as Tone from 'tone'

export async function render(buffer, settings) {
  const length = buffer.duration / settings.tempo

  const result = await Tone.Offline(
    async () => {
      const player = new Tone.GrainPlayer(buffer)
      player.playbackRate = settings.tempo
      player.detune = settings.pitch * 100
      player.grainSize = 0.1
      player.toDestination()
      player.start(0)
    },
    length,
    buffer.numberOfChannels,
    buffer.sampleRate,
  )

  return result.get()
}
