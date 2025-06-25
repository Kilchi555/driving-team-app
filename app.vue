<script setup lang="ts">

</script>


<template>
  <div>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
    <ClientOnly>
      <UNotifications />
    </ClientOnly>
  </div>
</template>