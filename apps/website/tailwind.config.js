@tailwind base;
@tailwind components;
@tailwind utilities;

@layer components {
  .btn-primary {
    @apply px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-all;
  }

  .btn-secondary {
    @apply px-6 py-3 bg-gray-200 text-gray-900 rounded-lg font-semibold hover:bg-gray-300 transition-all;
  }

  .section-container {
    @apply max-w-7xl mx-auto px-4 py-16;
  }

  .heading-lg {
    @apply text-4xl md:text-5xl font-bold text-gray-900;
  }

  .heading-md {
    @apply text-3xl md:text-4xl font-bold text-gray-900;
  }

  .heading-sm {
    @apply text-2xl md:text-3xl font-bold text-gray-900;
  }
}
