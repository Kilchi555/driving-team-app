<template>
  <div class="admin-dashboard-page">
    <h1>Admin Dashboard</h1>

    <div class="dashboard-sections">
      <section class="dashboard-section">
        <UsersPaymentOverview />
      </section>
      </div>
  </div>
</template>

<script setup lang="ts">
import { definePageMeta } from '#imports';
import UsersPaymentOverview from '~/components/admin/UsersPaymentOverview.vue'; // Pfad anpassen, falls nötig

definePageMeta({
  middleware: ['auth'] 
})

</script>

<style scoped>
.admin-dashboard-page {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

h1 {
  font-size: 2.5rem;
  margin-bottom: 30px;
  color: #333;
  text-align: center;
}

.dashboard-sections {
  display: grid;
  gap: 30px;
  grid-template-columns: 1fr; /* Standard: Eine Spalte */
}

@media (min-width: 768px) {
  .dashboard-sections {
    grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); /* Zwei oder mehr Spalten auf größeren Bildschirmen */
  }
}

.dashboard-section {
  background-color: #ffffff;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  padding: 25px;
}

.dashboard-section h2 {
  font-size: 1.8rem;
  color: #555;
  margin-top: 0;
  margin-bottom: 15px;
  border-bottom: 1px solid #eee;
  padding-bottom: 10px;
}

.dashboard-section p {
  color: #666;
}
</style>