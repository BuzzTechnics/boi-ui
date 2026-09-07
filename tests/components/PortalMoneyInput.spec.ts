import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import PortalMoneyInput from '../../src/components/PortalMoneyInput.vue'

/**
 * Regression: a lone "0" must survive input sanitisation so 0 is a usable amount
 * (e.g. a first-time applicant's "consolidated amount accessed"). Leading zeros in
 * larger numbers are still stripped.
 */
describe('PortalMoneyInput — zero handling', () => {
  const type = async (raw: string) => {
    const wrapper = mount(PortalMoneyInput, { props: { id: 'amt', showCurrency: false } })
    const input = wrapper.find('input[data-slot="input"]')
    input.element.value = raw
    await input.trigger('input')
    return wrapper.emitted('update:modelAmount')?.at(-1)?.[0]
  }

  it('keeps a lone "0"', async () => {
    expect(await type('0')).toBe('0')
  })

  it('strips leading zeros on larger numbers', async () => {
    expect(await type('007')).toBe('7')
  })

  it('keeps a leading "0" before a decimal', async () => {
    expect(await type('0.5')).toBe('0.5')
  })
})
