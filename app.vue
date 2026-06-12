<template>
  <div class="app">
    <header class="app__header">
      <div class="app__title">Kergit Admin</div>
      <div class="app__subtitle">Metrics Console</div>
    </header>
    <main class="app__main">
      <NuxtPage />
    </main>
  </div>
</template>

<style>
:root {
  color-scheme: light;
  font-family: "IBM Plex Sans", "Inter", system-ui, -apple-system, sans-serif;
  background: #0b1220;
  color: #e6edf3;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  background: linear-gradient(180deg, #0b1220 0%, #0f1b2d 100%);
}

.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.app__header {
  padding: 24px 32px 16px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.2);
}

.app__title {
  font-size: 22px;
  font-weight: 600;
  letter-spacing: 0.5px;
}

.app__subtitle {
  margin-top: 4px;
  font-size: 13px;
  color: rgba(226, 232, 240, 0.65);
}

.app__main {
  flex: 1;
  padding: 24px 32px 48px;
}
</style>
