import { useRef, useState } from 'react'
import { render } from './audio.js'
import { toWav } from './wav.js'

const CONTROLS = [
  { key: 'tempo', label: 'Tempo', min: 0.5, max: 1.5, step: 0.05, start: 1, show: (v) => `${v.toFixed(2)}×` },
  { key: 'reverb', label: 'Reverb', min: 0, max: 1, step: 0.05, start: 0, show: (v) => `${Math.round(v * 100)}%` },
]

const startValues = () => Object.fromEntries(CONTROLS.map((c) => [c.key, c.start]))

const clock = (seconds) => {
  const total = Math.round(seconds)
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
}

export default function App() {
  const [song, setSong] = useState(null)
  const [settings, setSettings] = useState(startValues)
  const [busy, setBusy] = useState('')
  const [playing, setPlaying] = useState(false)
  const [error, setError] = useState('')
  const audio = useRef(null)
  const source = useRef(null)
  const picker = useRef(null)

  const context = () => (audio.current ??= new AudioContext())

  function stop() {
    if (source.current) {
      source.current.onended = null
      source.current.stop()
      source.current = null
    }
    setPlaying(false)
  }

  async function run(label, task, failure) {
    setError('')
    setBusy(label)
    try {
      await task()
    } catch (err) {
      console.error(err)
      setError(failure)
    } finally {
      setBusy('')
    }
  }

  function load(event) {
    const file = event.target.files[0]
    event.target.value = ''
    if (!file) return
    stop()
    run(
      'Reading file…',
      async () => {
        const buffer = await context().decodeAudioData(await file.arrayBuffer())
        setSong({ name: file.name, buffer })
      },
      'Could not read that file. Try an MP3 or WAV.',
    )
  }

  function play() {
    if (playing) return stop()
    // resume inside the click, before rendering, or Safari keeps it muted
    context().resume()
    run(
      'Processing…',
      async () => {
        const node = context().createBufferSource()
        node.buffer = await render(song.buffer, settings)
        node.connect(context().destination)
        node.onended = () => setPlaying(false)
        node.start()
        source.current = node
        setPlaying(true)
      },
      'Could not process this song. Try a shorter file.',
    )
  }

  function download() {
    run(
      'Processing…',
      async () => {
        const wav = toWav(await render(song.buffer, settings))
        const url = URL.createObjectURL(new Blob([wav], { type: 'audio/wav' }))
        const link = document.createElement('a')
        link.href = url
        link.download = `${song.name.replace(/\.[^.]+$/, '')}-tinytape.wav`
        link.click()
        setTimeout(() => URL.revokeObjectURL(url), 1000)
      },
      'Could not process this song. Try a shorter file.',
    )
  }

  function change(key, value) {
    stop()
    setSettings((old) => ({ ...old, [key]: value }))
  }

  const locked = !song || busy !== ''

  return (
    <>
      <header className="nav">
        <div className="wrap nav__bar">
          <span className="logo">
            <span className="logo__mark" aria-hidden="true">t</span>
            tinytape
          </span>
          <a className="nav__link" href="https://github.com/SakshhamTheCoder/tinytape">
            Source on GitHub
          </a>
        </div>
      </header>

      <main className="wrap stage">
        <div>
          <h1>Small audio editor</h1>
          <p className="lead">Load a song, change how it sounds and save it as a WAV file.</p>
          <p className="note">Your file stays in this browser. Nothing is uploaded.</p>
          <div className="buttons">
            <button className="btn btn--primary" onClick={() => picker.current.click()} disabled={busy !== ''}>
              {song ? 'Choose another file' : 'Choose audio file'}
            </button>
            <button className="btn btn--secondary" onClick={download} disabled={locked}>
              Download WAV
            </button>
            <input ref={picker} type="file" accept="audio/*" onChange={load} hidden />
          </div>
          <p className="error" role="alert">{error}</p>
        </div>

        <section className="panel" aria-label="Editor">
          <div className="panel__line panel__head">
            <span className="panel__name">{song ? song.name : 'No file loaded'}</span>
            <span className="mono">{song ? clock(song.buffer.duration) : '0:00'}</span>
          </div>

          {CONTROLS.map(({ key, label, min, max, step, show }) => (
            <label className="panel__line control" key={key}>
              <span>{label}</span>
              <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={settings[key]}
                disabled={locked}
                aria-valuetext={show(settings[key])}
                onChange={(e) => change(key, Number(e.target.value))}
              />
              <output className="mono">{show(settings[key])}</output>
            </label>
          ))}

          <div className="panel__line">
            <button className="btn btn--secondary" onClick={() => { stop(); setSettings(startValues()) }} disabled={locked}>
              Reset
            </button>
            <button className="btn btn--primary" onClick={play} disabled={locked}>
              {playing ? 'Stop' : 'Play preview'}
            </button>
          </div>

          <div className="panel__line panel__foot" aria-live="polite">
            <span>{busy || 'New length'}</span>
            <span className="mono">{song ? clock(song.buffer.duration / settings.tempo) : '0:00'}</span>
          </div>
        </section>
      </main>
    </>
  )
}
