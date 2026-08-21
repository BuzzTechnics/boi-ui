import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import EmtsIntegration from '../../src/components/EmtsIntegration.vue'
import type { BankStatementRecord, EdocBank, BankOption } from '../../src/types/edoc'

const baseAccount = (over: Partial<BankStatementRecord> = {}): BankStatementRecord => ({
  id: 1,
  loan_application_id: 100,
  bank: '058',
  account_number: '1234567890',
  account_name: 'Acme Industries Ltd',
  account_type: 'Business',
  bvn: '',
  email: '[email protected]',
  bank_statement: '',
  csv_url: '',
  consent_id: '',
  edoc_status: 'pending',
  statement_generated: false,
  otp: '',
  showOtpInput: false,
  uploaded_statement_path: '',
  ...over,
})

const bankOption: BankOption = {
  value: '058',
  label: 'GTBank',
  shortName: 'GTBank',
  searchKeywords: ['GTBank'],
  edocBankId: 42,
}

const instructionBank: EdocBank = {
  bankId: 42,
  name: 'GTBank',
  bankCode: '058',
  enabled: true,
  bankInstructions: ['Open your GTB app', 'Approve the statement request'],
} as EdocBank

const otpBank: EdocBank = {
  bankId: 99,
  name: 'Standard Bank',
  bankCode: '058',
  enabled: true,
  // no bankInstructions: standard OTP flow
} as EdocBank

function makeApi() {
  const calls: { url: string; data?: unknown }[] = []
  const post = vi.fn(async (url: string, data?: unknown) => {
    calls.push({ url, data })
    if (url.includes('consent/initialize')) {
      return { data: { success: true, data: { data: { consentId: 'consent-xyz' } } } }
    }
    if (url.includes('consent/attach-account')) {
      return { data: { success: true, data: {} } }
    }
    if (url.includes('consent/transactions')) {
      return {
        data: {
          success: true,
          data: { statement: { ...baseAccount(), edoc_status: 'processing', statement_generated: false } },
        },
      }
    }
    return { data: { success: false } }
  })
  return { calls, api: { post } }
}

describe('EmtsIntegration — instruction-bank two-step flow', () => {
  it('Step 1: "Retrieve Statement" calls only init + attach (NOT transactions)', async () => {
    const { calls, api } = makeApi()
    const wrapper = mount(EmtsIntegration, {
      props: {
        account: baseAccount(),
        edocBanks: [instructionBank],
        bankOptions: [bankOption],
        api,
        applicationId: 100,
      },
    })

    const btn = wrapper.find('button[type="button"]')
    expect(btn.text()).toContain('Retrieve Statement')

    await btn.trigger('click')
    await flushPromises()

    const calledUrls = calls.map((c) => c.url)
    // exactly the two preparatory calls — fetch is deferred to step 2
    expect(calledUrls.some((u) => u.includes('consent/initialize'))).toBe(true)
    expect(calledUrls.some((u) => u.includes('consent/attach-account'))).toBe(true)
    expect(calledUrls.some((u) => u.includes('consent/transactions'))).toBe(false)

    // consentId is bubbled up so the parent persists it
    const events = wrapper.emitted('update:consentId')
    expect(events?.[0]?.[0]).toBe('consent-xyz')
  })

  it('Step 2: only after consent_id is set does the "I Have Authorized" button render and fetch transactions', async () => {
    const { calls, api } = makeApi()
    const wrapper = mount(EmtsIntegration, {
      props: {
        account: baseAccount({ consent_id: 'consent-xyz' }),
        edocBanks: [instructionBank],
        bankOptions: [bankOption],
        api,
        applicationId: 100,
      },
    })

    const btn = wrapper.find('button[type="button"]')
    expect(btn.text()).toContain('I Have Authorized')

    await btn.trigger('click')
    await flushPromises()

    const calledUrls = calls.map((c) => c.url)
    expect(calledUrls.some((u) => u.includes('consent/transactions'))).toBe(true)
    // step 2 must NOT re-run init/attach
    expect(calledUrls.some((u) => u.includes('consent/initialize'))).toBe(false)
    expect(calledUrls.some((u) => u.includes('consent/attach-account'))).toBe(false)

    // emits the updated statement to parent
    const retrieved = wrapper.emitted('statement-retrieved')
    expect(retrieved).toBeTruthy()
  })

  it('OTP-bank flow is unchanged: "Send OTP" runs init+attach (no transactions yet)', async () => {
    const { calls, api } = makeApi()
    const wrapper = mount(EmtsIntegration, {
      props: {
        account: baseAccount(),
        edocBanks: [otpBank],
        bankOptions: [bankOption],
        api,
        applicationId: 100,
      },
    })

    const btn = wrapper.find('button[type="button"]')
    expect(btn.text()).toContain('Send OTP')

    await btn.trigger('click')
    await flushPromises()

    const calledUrls = calls.map((c) => c.url)
    expect(calledUrls.some((u) => u.includes('consent/initialize'))).toBe(true)
    expect(calledUrls.some((u) => u.includes('consent/attach-account'))).toBe(true)
    expect(calledUrls.some((u) => u.includes('consent/transactions'))).toBe(false)
  })
})

describe('EmtsIntegration — registered-email banks (Fidelity)', () => {
  const fidelityBank: EdocBank = {
    bankId: 7,
    name: 'Fidelity Bank',
    bankCode: '058',
    enabled: true,
    bankInstructions: ['Log in to your account', 'Send Account Statement'],
    requiresBankRegisteredEmail: true,
  } as EdocBank

  const mountFidelity = (accountOver: Partial<BankStatementRecord> = {}, companyEmail = 'portal@company.com') => {
    const { calls, api } = makeApi()
    const wrapper = mount(EmtsIntegration, {
      props: {
        account: baseAccount({ email: companyEmail, ...accountOver }),
        edocBanks: [fidelityBank],
        bankOptions: [bankOption],
        api,
        companyEmail,
        applicationId: 100,
      },
    })
    return { calls, wrapper }
  }

  it('renders the registered-email input and starts empty when the row only holds the product email', () => {
    const { wrapper } = mountFidelity()
    const input = wrapper.find('input[type="email"]')
    expect(input.exists()).toBe(true)
    expect((input.element as HTMLInputElement).value).toBe('')
    expect(wrapper.text()).toContain('Email address registered with Fidelity Bank')
  })

  it('pre-fills a previously saved address that differs from the product email', () => {
    const { wrapper } = mountFidelity({ email: 'customer@fidelity-user.ng' })
    const input = wrapper.find('input[type="email"]')
    expect((input.element as HTMLInputElement).value).toBe('customer@fidelity-user.ng')
  })

  it('does not render the input for banks without the flag', () => {
    const { api } = makeApi()
    const wrapper = mount(EmtsIntegration, {
      props: {
        account: baseAccount(),
        edocBanks: [instructionBank],
        bankOptions: [bankOption],
        api,
        applicationId: 100,
      },
    })
    expect(wrapper.find('input[type="email"]').exists()).toBe(false)
  })

  it('blocks Retrieve Statement until a valid registered email is entered', async () => {
    const { calls, wrapper } = mountFidelity()
    const btn = wrapper.findAll('button[type="button"]').find((b) => b.text().includes('Retrieve Statement'))!
    expect(btn.attributes('disabled')).toBeDefined()

    await btn.trigger('click')
    await flushPromises()
    expect(calls.length).toBe(0)

    await wrapper.find('input[type="email"]').setValue('customer@fidelity-user.ng')
    expect(btn.attributes('disabled')).toBeUndefined()
  })

  it('sends the entered email on the consent — never the product email — and bubbles it up', async () => {
    const { calls, wrapper } = mountFidelity()
    await wrapper.find('input[type="email"]').setValue('customer@fidelity-user.ng')

    const btn = wrapper.findAll('button[type="button"]').find((b) => b.text().includes('Retrieve Statement'))!
    await btn.trigger('click')
    await flushPromises()

    const init = calls.find((c) => c.url.includes('consent/initialize'))
    expect((init?.data as { email?: string })?.email).toBe('customer@fidelity-user.ng')

    // parent persists it on the row so boi-api's auto-submit path reads it too
    const emailEvents = wrapper.emitted('update:email')
    expect(emailEvents?.some((e) => e[0] === 'customer@fidelity-user.ng')).toBe(true)
  })

  it('emits update:email on blur so the address is saved before any consent call', async () => {
    const { wrapper } = mountFidelity()
    const input = wrapper.find('input[type="email"]')
    await input.setValue('customer@fidelity-user.ng')
    await input.trigger('blur')

    expect(wrapper.emitted('update:email')?.[0]?.[0]).toBe('customer@fidelity-user.ng')
  })
})
