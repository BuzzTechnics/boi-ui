<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '../../../lib/utils'
import { type ButtonVariants, buttonVariants } from '.'

interface Props {
  type?: 'button' | 'submit' | 'reset'
  variant?: ButtonVariants['variant']
  size?: ButtonVariants['size']
  class?: HTMLAttributes['class']
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  type: 'button',
  variant: 'default',
  size: 'default',
  disabled: false,
})
</script>

<template>
  <button
    :type="type"
    :disabled="disabled"
    data-slot="button"
    :class="cn(
      buttonVariants({ variant: props.variant, size: props.size }),
      props.class
    )"
  >
    <slot />
  </button>
</template>
