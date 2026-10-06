import test from 'node:test'
import assert from 'node:assert/strict'
import { parseRangeInput, normalizeRangeInput, editRangeEndpoint } from '../src/lib/rangeInput.ts'

test('editable grades accept plus and full-width input without treating unfinished drafts as zero', () => {
  assert.equal(parseRangeInput('１３＋', 'level'), 13.5)
  assert.equal(parseRangeInput('14.8', 'level'), null)
  for (const draft of ['', '.', '-', 'hello']) assert.equal(parseRangeInput(draft, 'constant'), null)
  assert.equal(parseRangeInput('１４．８', 'constant'), 14.8)
  assert.equal(parseRangeInput('14.', 'constant'), 14)
})
test('typed constants respect 0.1 precision, 15.0 maximum and 1 minimum', () => {
  assert.equal(normalizeRangeInput(14.86, 'constant'), 14.9)
  assert.equal(normalizeRangeInput(15.9, 'constant'), 15)
  assert.equal(normalizeRangeInput(0, 'constant'), 1)
  assert.equal(normalizeRangeInput(parseRangeInput('15+', 'level'), 'level'), 15)
})
test('editing either range endpoint keeps ordering and updates the other endpoint when crossed', () => {
  assert.deepEqual(editRangeEndpoint(14.8, 15, 13.5, 'max', 'constant'), [13.5, 13.5])
  assert.deepEqual(editRangeEndpoint(13, 14, 14.7, 'min', 'constant'), [14.7, 14.7])
  assert.deepEqual(editRangeEndpoint(13, 15, 13.5, 'min', 'level'), [13.5, 15])
})
