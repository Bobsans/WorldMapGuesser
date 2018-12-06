<template>
    <div class="welcome">
        <div class="logo"></div>
        <div class="body">
            <div class="start-form">
                <input ref="nickname" type="text" v-model="nickname" placeholder="Nickname" @keydown="onKeydown">
                <button :disabled="!nickname" @click="start">START</button>
            </div>
        </div>
        <div class="controls" data-title="Controls">
            <div class="pan">Pan</div>
            <div class="zoom">Zoom</div>
            <div class="change-country">Change country</div>
        </div>
        <div class="rules" data-title="Rules">
            You must find and click the current country on the map.<br><br>
            You have 3 lives.<br><br>
            If you click wrong, the correct country will turn red and you loose 1 live.<br><br>
            Good luck!
        </div>
        <score-table/>
    </div>
</template>

<script>
    import ScoreTable from '@/components/ScoreTable';

    export default {
        name: 'Welcome',
        components: {ScoreTable},
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
        },
        mounted() {
            this.$refs.nickname.focus();
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

        > .body {
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 180px 0 20px;

            .start-form {
                display: grid;
                grid-template-rows: 1fr 1fr;
                grid-gap: 10px;

                input {
                    text-align: center;
                    width: 260px;
                }
            }
        }

        .controls, .rules {
            position: absolute;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-wrap: wrap;
            top: 60px;
            padding: 15px 10px 10px;
            width: 200px;
            height: 220px;
            border-radius: @default-border-radius;
            background: @white;
            box-shadow: @default-shadow;
            font-size: 0.8em;
            color: lighten(@black, 50%);

            &:before {
                content: attr(data-title);
                position: absolute;
                top: -0.8em;
                background: @white;
                padding: 5px 8px;
                font-size: 1.2em;
                font-weight: bold;
                box-shadow: @default-shadow;
            }
        }

        .controls {
            right: -100px;

            > div {
                display: flex;
                align-items: center;
                width: 120px;
                padding: 0 0 0 60px;
                height: 50px;
                background-size: 50px;
                background-repeat: no-repeat;

                &.pan {
                    background-image: url('@{image-path}/controls/pan.png');
                }

                &.zoom {
                    background-image: url('@{image-path}/controls/zoom.png');
                }

                &.change-country {
                    background-image: url('@{image-path}/controls/change-country.png');
                }
            }
        }

        .rules {
            left: -100px;
            text-align: center;
        }
    }
</style>
