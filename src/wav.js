// 16-bit PCM WAV from anything shaped like an AudioBuffer
export function toWav(buffer) {
  const { numberOfChannels, sampleRate, length } = buffer
  const blockSize = numberOfChannels * 2
  const dataSize = length * blockSize
  const view = new DataView(new ArrayBuffer(44 + dataSize))
  const text = (offset, value) =>
    [...value].forEach((char, i) => view.setUint8(offset + i, char.charCodeAt(0)))

  text(0, 'RIFF')
  view.setUint32(4, 36 + dataSize, true)
  text(8, 'WAVE')
  text(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, numberOfChannels, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * blockSize, true)
  view.setUint16(32, blockSize, true)
  view.setUint16(34, 16, true)
  text(36, 'data')
  view.setUint32(40, dataSize, true)

  const channels = Array.from({ length: numberOfChannels }, (_, i) => buffer.getChannelData(i))
  let offset = 44
  for (let frame = 0; frame < length; frame++) {
    for (const channel of channels) {
      const sample = Math.max(-1, Math.min(1, channel[frame]))
      view.setInt16(offset, sample * 0x7fff, true)
      offset += 2
    }
  }

  return view.buffer
}
