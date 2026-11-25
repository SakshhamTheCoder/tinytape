import * as Tone from 'tone'

export async function render(buffer, settings) {
  const length = buffer.duration / settings.tempo + (settings.reverb ? 3 : 0)

  const result = await Tone.Offline(
    async () => {
      const player = new Tone.GrainPlayer(buffer)
      player.playbackRate = settings.tempo
      const room = new Tone.Reverb({ decay: 3, wet: settings.reverb })
      await room.ready
      player.chain(room, Tone.getDestination())
      player.start(0)
    },
    length,
    buffer.numberOfChannels,
    buffer.sampleRate,
  )

  return result.get()
}
