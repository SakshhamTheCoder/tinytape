import * as Tone from 'tone'

// GrainPlayer gets much slower as audio gets longer, so it works on short pieces
const PIECE = 5
const WARMUP = 0.2
const FADE = 0.05

async function offline(buffer, seconds, build) {
  const result = await Tone.Offline(build, seconds, buffer.numberOfChannels, buffer.sampleRate)
  return result.get()
}

async function stretch(buffer, settings) {
  const rate = buffer.sampleRate
  const total = Math.ceil((buffer.duration / settings.tempo) * rate)
  const output = new AudioBuffer({ numberOfChannels: buffer.numberOfChannels, length: total, sampleRate: rate })
  const fade = Math.round(FADE * rate)

  for (let start = 0; start < total; start += PIECE * rate) {
    // each piece starts a little early, because the first grain fades in
    const lead = start ? Math.round(WARMUP * rate) : 0
    const length = lead + Math.min(PIECE * rate, total - start)
    const piece = await offline(buffer, length / rate, () => {
      const player = new Tone.GrainPlayer(buffer)
      player.playbackRate = settings.tempo
      player.detune = settings.pitch * 100
      player.grainSize = 0.1
      // the fade has to be shorter than the gap between grains, or fast tempos get quiet
      player.overlap = 0.05
      player.toDestination()
      // GrainPlayer multiplies this offset by the tempo itself, so it is in output time
      player.start(0, (start - lead) / rate)
    })

    for (let c = 0; c < output.numberOfChannels; c++) {
      const from = piece.getChannelData(c)
      const to = output.getChannelData(c)
      to.set(from.subarray(lead, lead + total - start), start)
      // blend into the end of the previous piece so the join does not click
      for (let i = 0; start && i < fade; i++) {
        const mix = i / fade
        to[start - fade + i] = to[start - fade + i] * (1 - mix) + from[lead - fade + i] * mix
      }
    }
  }

  return output
}

export async function render(buffer, settings) {
  const stretched = await stretch(buffer, settings)
  if (!settings.reverb) return stretched

  return offline(stretched, stretched.duration + 3, async () => {
    const player = new Tone.Player(stretched)
    const room = new Tone.Reverb({ decay: 3, wet: settings.reverb })
    await room.ready
    player.chain(room, Tone.getDestination())
    player.start(0)
  })
}
