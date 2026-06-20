<script setup>
defineProps({
    value: String,
    required: {
        type: Boolean,
        default: true
    }
});
</script>

<template>
    <label class="block font-medium text-sm text-gray-700">
        <span v-if="value">{{ value }} <span v-if="required" class="text-red-500">*</span></span>
        <span v-else><slot /> <span v-if="required" class="text-red-500">*</span></span>
    </label>
</template>
