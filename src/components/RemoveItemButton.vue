<template>
    <button
        type="button"
        :disabled="disabled || processing"
        @click="$emit('click')"
        :class="{
            'text-red-600 hover:text-red-800 font-semibold hover:cursor-pointer':
                !disabled && !processing,
            'text-gray-400 font-semibold cursor-not-allowed':
                disabled || processing,
        }"
    >
        <i
            v-if="processing"
            class="fas fa-spinner fa-spin mr-1"
        ></i>
        <i
            v-else
            class="fas fa-trash mr-1"
        ></i>
        Remove
    </button>
</template>

<script setup>
const props = defineProps({
    disabled: {
        type: Boolean,
        default: false
    },
    processing: {
        type: Boolean,
        default: false
    }
});

defineEmits(['click']);
</script>
