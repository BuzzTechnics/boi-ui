<script setup lang="ts">
import { ref, reactive, computed } from 'vue'

/**
 * Floating "Contact support" widget (bottom-right) for intervention-fund apps.
 *
 * App-agnostic: it POSTs a multipart message (+ attachments) to the boi-api
 * support endpoint via the SAME proxy/axios mechanism the other boi-ui widgets
 * use (`boiApiBaseUrl` from resolveBoiApiBaseUrl + an axios-like `api`). boi-api
 * routes it to the fund's inbox using the X-Boi-App slug the proxy sends.
 *
 *   POST {base}/api/support   (multipart: subject, message, name, email, attachments[])
 *
 * Drop it in a layout, pass the api client + base URL, and (optionally) prefill
 * the signed-in user's name/email.
 */

interface SupportApiClient {
  post: (url: string, body?: unknown, config?: unknown) => Promise<unknown>
}

const props = withDefaults(
  defineProps<{
    /** Axios-like client { post } — pass apiNoReload (mirrors the other widgets). */
    api: SupportApiClient
    /** Base URL from resolveBoiApiBaseUrl({ boiProxy }). */
    boiApiBaseUrl?: string
    /** Prefill (and lock-ish) the signed-in user's identity. */
    name?: string
    email?: string
    /** Copy + theming. */
    title?: string
    subtitle?: string
    accentColor?: string
    /** Attachment limits (mirror config/support.php). */
    maxAttachments?: number
    maxAttachmentMb?: number
  }>(),
  {
    boiApiBaseUrl: '',
    name: '',
    email: '',
    title: 'Contact support',
    subtitle: "Send us a message and we'll get back to you by email.",
    accentColor: '#1B6B3A',
    maxAttachments: 5,
    maxAttachmentMb: 10,
  },
)

const open = ref(false)
const sending = ref(false)
const sent = ref(false)
const errorMsg = ref('')

const form = reactive({
  name: props.name || '',
  email: props.email || '',
  subject: '',
  message: '',
})
const files = ref<File[]>([])
const fileInput = ref<HTMLInputElement | null>(null)

const maxBytes = computed(() => props.maxAttachmentMb * 1024 * 1024)

function base(): string {
  return String(props.boiApiBaseUrl || '').replace(/\/+$/, '')
}

function toggle(): void {
  open.value = !open.value
  if (open.value) {
    sent.value = false
    errorMsg.value = ''
  }
}

function onPickFiles(e: Event): void {
  const picked = Array.from((e.target as HTMLInputElement).files || [])
  addFiles(picked)
  if (fileInput.value) fileInput.value.value = ''
}

function addFiles(picked: File[]): void {
  errorMsg.value = ''
  for (const f of picked) {
    if (files.value.length >= props.maxAttachments) {
      errorMsg.value = `You can attach up to ${props.maxAttachments} files.`
      break
    }
    if (f.size > maxBytes.value) {
      errorMsg.value = `"${f.name}" is larger than ${props.maxAttachmentMb} MB.`
      continue
    }
    files.value.push(f)
  }
}

function removeFile(i: number): void {
  files.value.splice(i, 1)
}

function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

const canSubmit = computed(
  () => !sending.value && form.subject.trim() !== '' && form.message.trim() !== '',
)

async function submit(): Promise<void> {
  if (!canSubmit.value) return
  errorMsg.value = ''
  sending.value = true

  try {
    const fd = new FormData()
    fd.append('subject', form.subject.trim())
    fd.append('message', form.message.trim())
    if (form.name.trim()) fd.append('name', form.name.trim())
    if (form.email.trim()) fd.append('email', form.email.trim())
    files.value.forEach((f) => fd.append('attachments[]', f, f.name))

    await props.api.post(`${base()}/api/support`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })

    sent.value = true
    form.subject = ''
    form.message = ''
    files.value = []
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string } }; message?: string }
    errorMsg.value =
      err?.response?.data?.message || err?.message || 'We could not send your message. Please try again.'
  } finally {
    sending.value = false
  }
}
</script>

<template>
  <div class="boi-support" :style="{ ['--boi-support-accent' as string]: accentColor }">
    <!-- Panel -->
    <transition name="boi-support-fade">
      <div
        v-if="open"
        class="boi-support-panel fixed bottom-24 right-5 z-[60] w-[calc(100vw-2.5rem)] max-w-sm rounded-2xl bg-white shadow-2xl ring-1 ring-black/10 overflow-hidden"
        role="dialog"
        aria-label="Contact support"
      >
        <!-- Header -->
        <div class="px-5 py-4 text-white" :style="{ backgroundColor: accentColor }">
          <div class="flex items-start justify-between gap-3">
            <div>
              <p class="text-sm font-semibold">{{ title }}</p>
              <p class="mt-0.5 text-xs text-white/85">{{ subtitle }}</p>
            </div>
            <button
              type="button"
              class="shrink-0 rounded-md p-1 text-white/80 hover:bg-white/15 hover:text-white"
              aria-label="Close"
              @click="open = false"
            >
              <svg class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <!-- Success -->
        <div v-if="sent" class="p-5">
          <div class="flex items-start gap-3 rounded-lg bg-green-50 border border-green-200 p-4">
            <svg class="mt-0.5 h-5 w-5 shrink-0 text-green-600" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
            <div>
              <p class="text-sm font-semibold text-green-800">Message sent</p>
              <p class="mt-0.5 text-xs text-green-700">Thanks — our team will reply to your email shortly.</p>
            </div>
          </div>
          <button
            type="button"
            class="mt-4 w-full rounded-lg px-4 py-2 text-sm font-semibold text-white"
            :style="{ backgroundColor: accentColor }"
            @click="open = false"
          >
            Done
          </button>
        </div>

        <!-- Form -->
        <form v-else class="p-5 space-y-3" @submit.prevent="submit">
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label class="mb-1 block text-xs font-medium text-gray-600">Name</label>
              <input
                v-model="form.name"
                type="text"
                class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-black/5"
                placeholder="Your name"
              />
            </div>
            <div>
              <label class="mb-1 block text-xs font-medium text-gray-600">Email</label>
              <input
                v-model="form.email"
                type="email"
                class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-black/5"
                placeholder="you@example.com"
              />
            </div>
          </div>

          <div>
            <label class="mb-1 block text-xs font-medium text-gray-600">Subject</label>
            <input
              v-model="form.subject"
              type="text"
              required
              maxlength="200"
              class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-black/5"
              placeholder="How can we help?"
            />
          </div>

          <div>
            <label class="mb-1 block text-xs font-medium text-gray-600">Message</label>
            <textarea
              v-model="form.message"
              rows="4"
              required
              maxlength="5000"
              class="w-full resize-y rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-black/5"
              placeholder="Describe your issue…"
            />
          </div>

          <!-- Attachments -->
          <div>
            <div class="flex items-center justify-between">
              <label class="text-xs font-medium text-gray-600">Attachments</label>
              <button
                type="button"
                class="text-xs font-semibold hover:underline"
                :style="{ color: accentColor }"
                @click="fileInput?.click()"
              >
                + Add file
              </button>
              <input ref="fileInput" type="file" multiple class="hidden" @change="onPickFiles" />
            </div>
            <ul v-if="files.length" class="mt-2 space-y-1">
              <li
                v-for="(f, i) in files"
                :key="i"
                class="flex items-center justify-between gap-2 rounded-md bg-gray-50 px-2.5 py-1.5 text-xs text-gray-700"
              >
                <span class="truncate">{{ f.name }} <span class="text-gray-400">({{ humanSize(f.size) }})</span></span>
                <button type="button" class="shrink-0 text-gray-400 hover:text-red-600" aria-label="Remove" @click="removeFile(i)">
                  <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                </button>
              </li>
            </ul>
            <p class="mt-1 text-[11px] text-gray-400">
              Up to {{ maxAttachments }} files, {{ maxAttachmentMb }} MB each.
            </p>
          </div>

          <p v-if="errorMsg" class="text-xs text-red-600">{{ errorMsg }}</p>

          <button
            type="submit"
            :disabled="!canSubmit"
            class="flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition disabled:opacity-60 disabled:cursor-not-allowed"
            :style="{ backgroundColor: accentColor }"
          >
            <svg v-if="sending" class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            {{ sending ? 'Sending…' : 'Send message' }}
          </button>
        </form>
      </div>
    </transition>

    <!-- Floating button -->
    <button
      type="button"
      class="boi-support-fab fixed bottom-5 right-5 z-[60] inline-flex h-14 w-14 items-center justify-center rounded-full text-white shadow-lg ring-1 ring-black/10 transition hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2"
      :style="{ backgroundColor: accentColor }"
      :aria-label="open ? 'Close support' : 'Contact support'"
      @click="toggle"
    >
      <svg v-if="!open" class="h-6 w-6" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" d="M8 10.5h8M8 14h5m-9 6 3.5-2.5H18a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v14Z" />
      </svg>
      <svg v-else class="h-6 w-6" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
      </svg>
    </button>
  </div>
</template>

<style scoped>
.boi-support-fade-enter-active,
.boi-support-fade-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.boi-support-fade-enter-from,
.boi-support-fade-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
</style>
