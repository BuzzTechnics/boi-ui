import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import BoiButton from '../../src/components/BoiButton.vue'

describe('BoiButton', () => {
  it('renders slot content', () => {
    const wrapper = mount(BoiButton, {
      slots: { default: 'Click me' },
    })
    expect(wrapper.text()).toBe('Click me')
  })

  it('renders label prop when no slot', () => {
    const wrapper = mount(BoiButton, {
      props: { label: 'Submit' },
    })
    expect(wrapper.text()).toBe('Submit')
  })

  it('applies primary variant class', () => {
    const wrapper = mount(BoiButton, {
      props: { variant: 'primary' },
    })
    expect(wrapper.classes()).toContain('boi-button--primary')
  })
})
