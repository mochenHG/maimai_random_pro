import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { countdownAt } from '../src/lib/obsCountdown.ts'
import { broadcastCapacity } from '../src/lib/standings.ts'

test('countdown aligns to absolute second boundaries and stops at zero', () => {
  assert.deepEqual(countdownAt(61000, 0), { remaining:61, minutes:'01', seconds:'01', nextDelay:1000 })
  assert.equal(countdownAt(61000, 1000).seconds, '00')
  assert.equal(countdownAt(61000, 1450).nextDelay, 555)
  assert.equal(countdownAt(61000, 60999).nextDelay, 16)
  assert.deepEqual(countdownAt(61000, 61000), { remaining:0, minutes:'00', seconds:'00', nextDelay:null })
  assert.equal(countdownAt(61000, 99999).nextDelay, null)
})

test('countdown resumes after a long suspension without accumulating drift', () => {
  const endAt = 10_000_000
  const before = countdownAt(endAt, endAt - 120_000)
  const after = countdownAt(endAt, endAt - 17_401)
  assert.equal(before.remaining, 120)
  assert.equal(after.remaining, 18)
  assert.equal(after.nextDelay, 406)
  assert.equal(countdownAt(7_200_000, 0).minutes, '120')
})

test('countdown leaves a bounded ranking page at 1080p and 720p', () => {
  for (const height of [1080, 720]) for (const songs of [true, false]) {
    const normal = broadcastCapacity(1920, height, songs)
    const countdown = broadcastCapacity(1920, height - 128, songs)
    assert.ok(countdown.size <= normal.size)
    assert.ok(countdown.size >= 4 && countdown.size <= 16)
  }
})

test('early transparency matches OBS routes, legacy URLs and controller precedence', () => {
  const script = readFileSync(new URL('../public/obs-bootstrap.js', import.meta.url), 'utf8').replace(/^\uFEFF/, '')
  for (const [url, expected] of [
    ['/obs',true], ['/obs-live?clean=1',true], ['/obs-tournament',true], ['/obs-raffle',true],
    ['/?obs=1',true], ['/?obs-tournament=1',true], ['/?obs-raffle=1',true],
    ['/',false], ['/director',false], ['/director?obs=1',false], ['/raffle?obs=1',false], ['/tournament',false], ['/?obs=0',false],
  ]) {
    const location = new URL(url, 'http://localhost'), document = {documentElement:{dataset:{}}}
    runInNewContext(script, {location, document, URLSearchParams})
    assert.equal(document.documentElement.dataset.presentation === 'obs', expected, url)
  }
})
