<script setup>
definePageMeta({
  middleware: 'admin',
  layout: 'admin'
})
await navigateTo('/admin/products', { replace: true })
</script>