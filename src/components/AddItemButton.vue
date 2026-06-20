<template>
    <button
        type="button"
        :disabled="disabled || processing"
        @click="$emit('click')"
        :class="{
            'mt-4 text-primary hover:text-primary/80 font-semibold hover:cursor-pointer':
                !disabled && !processing,
            'mt-4 text-gray-400 font-semibold cursor-not-allowed':
                disabled || processing,
        }"
    >
        <i
            v-if="processing"
            class="fas fa-spinner fa-spin mr-1"
        ></i>
        <i
            v-else
            class="fas fa-plus mr-1"
        ></i>
        {{ text }}
    </button>
</template>

<script setup>
const props = defineProps({
    text: {
        type: String,
        required: true
    },
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
