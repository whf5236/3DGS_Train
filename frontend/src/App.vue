<script setup lang="ts" name="App">
import AppLayout from '@/conponents/AppLayout.vue'
import ParticleBackground from '@/conponents/ParticleBackground.vue'

</script>
<template>
    <div id="app">
        <ParticleBackground />
        <AppLayout />
    </div>
  
</template>
<style>
#app {
  position: relative;
  background-image: 
    linear-gradient(rgba(0, 0, 0, 0.3), rgba(0, 0, 0, 0.3)),  /* 半透明黑色叠加 */
    url('./asset/img/bg.png');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  background-attachment: fixed;
  min-height: 100vh;
  width: 100%;
}
</style>