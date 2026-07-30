<!-- layouts/minimal.vue -->
<!-- Native: body is overflow:hidden (native-body.client.ts) — this layout must own the scroll. -->
<template>
  <div class="fixed inset-0 overflow-y-auto overscroll-y-contain bg-white">
    <slot />
  </div>
</template>
