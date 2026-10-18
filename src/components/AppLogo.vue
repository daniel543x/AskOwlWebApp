<script setup lang="ts">
withDefaults(defineProps<{ size?: number }>(), { size: 40 });
</script>

<template>
    <svg
        :width="size"
        :height="size"
        viewBox="0 0 64 64"
        fill="none"
        stroke="currentColor"
        stroke-width="4"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
    >
        <path d="M14 14 L18 4 L26 12" />
        <path d="M50 14 L46 4 L38 12" />
        <path d="M32 10 C18 10 10 20 10 32 C10 46 18 58 32 58 C46 58 54 46 54 32 C54 20 46 10 32 10 Z" />
        <circle cx="23" cy="30" r="7" />
        <circle cx="41" cy="30" r="7" />
        <circle cx="23" cy="30" r="2.5" fill="currentColor" stroke="none" />
        <circle cx="41" cy="30" r="2.5" fill="currentColor" stroke="none" />
        <path d="M28 39 L36 39 L32 45 Z" fill="currentColor" stroke="none" />
        <path d="M14 34 C10 40 12 48 16 52" />
        <path d="M50 34 C54 40 52 48 48 52" />
    </svg>
</template>
