import { test } from 'node:test'
import assert from 'node:assert/strict'
import { toWav } from '../src/wav.js'

const fake = {
  numberOfChannels: 2,
  sampleRate: 8000,
  length: 3,
  getChannelData: (i) => (i === 0 ? [0, 1, 2] : [0, -1, -2]),
}

test('writes a wav header and clips loud samples', () => {
  const view = new DataView(toWav(fake))
  assert.equal(view.byteLength, 44 + 3 * 2 * 2)
  assert.equal(view.getUint16(22, true), 2)
  assert.equal(view.getUint32(24, true), 8000)
  assert.equal(view.getInt16(52, true), 32767)
  assert.equal(view.getInt16(54, true), -32767)
})
