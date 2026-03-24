<template>
    <div>
        <div class="lg:hidden">
            <div class="bg-primary/5 border border-primary/20 rounded-lg p-3">
                <p class="text-xs font-bold text-primary mb-3">
                    {{ mobileTitle }}
                </p>
                <div ref="mobileScroller" class="stepper-scroll overflow-x-auto pb-1">
                    <div class="flex items-start gap-2 min-w-max pr-2">
                        <button
                            v-for="(section, index) in sections"
                            :key="section.key"
                            :data-step-key="section.key"
                            type="button"
                            @click="handleMobileStepClick(section.key)"
                            class="flex shrink-0 items-center gap-2 rounded-md px-2.5 py-1.5 transition-colors duration-150"
                            :class="modelValue === section.key ? 'bg-primary/15' : 'hover:bg-primary/10'"
                        >
                            <span
                                class="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-semibold"
                                :class="index <= activeSectionIndex ? 'bg-primary text-white' : 'bg-white text-primary border border-primary/30'"
                            >
                                {{ index + 1 }}
                            </span>
                            <span
                                class="text-xs whitespace-nowrap"
                                :class="modelValue === section.key ? 'text-primary font-semibold' : 'text-gray-700 font-medium'"
                            >
                                {{ section.label }}
                            </span>
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <aside class="hidden lg:block w-full lg:w-72 shrink-0">
            <div class="bg-primary/5 border border-primary/20 rounded-lg p-3 sticky top-6">
                <p class="text-xs font-bold text-primary mb-3">
                    {{ desktopTitle }}
                </p>
                <ul class="space-y-1.5">
                    <li v-for="section in sections" :key="section.key">
                        <button
                            type="button"
                            @click="$emit('update:modelValue', section.key)"
                            class="w-full text-left px-3 py-2 rounded-md text-sm transition-colors duration-150"
                            :class="modelValue === section.key
                                ? 'bg-primary text-white font-semibold shadow-sm'
                                : 'text-primary hover:bg-primary/10 font-medium'"
                        >
                            {{ section.label }}
                        </button>
                    </li>
                </ul>
            </div>
        </aside>
    </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';

type StepSection = {
    key: string;
    label: string;
};

const props = defineProps<{
    sections: StepSection[];
    modelValue: string;
    mobileTitle?: string;
    desktopTitle?: string;
}>();

const emit = defineEmits<{
    (e: 'update:modelValue', value: string): void;
}>();

const mobileScroller = ref<HTMLElement | null>(null);

const mobileTitle = computed(() => props.mobileTitle ?? 'Form Steps');
const desktopTitle = computed(() => props.desktopTitle ?? 'Form Navigation');

const activeSectionIndex = computed(() =>
    props.sections.findIndex((section) => section.key === props.modelValue)
);

const scrollActiveStepIntoLeft = async () => {
    await nextTick();

    const scroller = mobileScroller.value;
    if (!scroller) return;

    const activeButton = scroller.querySelector<HTMLElement>(
        `[data-step-key="${props.modelValue}"]`
    );
    if (!activeButton) return;

    const left = activeButton.offsetLeft - scroller.offsetLeft;
    scroller.scrollTo({
        left: Math.max(left, 0),
        behavior: 'smooth',
    });
};

const handleMobileStepClick = (sectionKey: string) => {
    emit('update:modelValue', sectionKey);
};

watch(
    () => props.modelValue,
    () => {
        scrollActiveStepIntoLeft();
    },
    { immediate: true }
);
</script>

<style scoped>
.stepper-scroll {
    scrollbar-color: var(--primary) transparent;
    scrollbar-width: thin;
}

.stepper-scroll::-webkit-scrollbar {
    height: 3px;
}

.stepper-scroll::-webkit-scrollbar-track {
    background: transparent;
}

.stepper-scroll::-webkit-scrollbar-thumb {
    background-color: var(--primary);
    border-radius: 9999px;
}
</style>
