<template>
    <div class="welcome">
        <div class="logo"></div>
        <div class="body">
            <div class="start-form">
                <input type="text" v-model="nickname" placeholder="Nickname" @keydown="onKeydown">
                <button :disabled="!nickname" @click="start">START</button>
            </div>
        </div>
    </div>
</template>

<script>
    export default {
        name: 'Welcome',
        data() {
            return {
                nickname: ''
            };
        },
        methods: {
            start() {
                this.$bus.$emit('game-start', {nickname: this.nickname});
            },

            onKeydown(e) {
                if (e.key === 'Enter') {
                    this.start();
                }
            }
        }
    };
</script>

<style lang="less">
    @import "~$variables";

    .welcome {
        position: relative;

        .logo {
            position: absolute;
            width: 100%;
            height: 256px;
            top: -100px;
            background: url('@{image-path}/logo.png') no-repeat center;
            background-size: contain;
            margin: 0 auto;
        }

        .body {
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 180px 0 20px;

            .start-form {
                display: grid;
                grid-template-rows: 1fr 1fr;
                grid-gap: 10px;

                input {
                    text-align: center;
                }
            }
        }
    }
</style>
