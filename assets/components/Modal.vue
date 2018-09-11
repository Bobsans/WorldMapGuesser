<template>
    <transition name="modal">
        <div class="modal-overlay">
            <div class="modal">
                <div v-if="!noheader" class="header">
                    <slot name="header"/>
                </div>
                <div class="body">
                    <slot/>
                </div>
                <div v-if="!nofooter" class="footer">
                    <slot name="footer"/>
                </div>
            </div>
        </div>
    </transition>
</template>

<script>
    export default {
        name: 'Modal',
        props: {
            noheader: {type: Boolean, default: false},
            nofooter: {type: Boolean, default: false}
        }
    };
</script>

<style lang="less">
    @import '~$variables';

    .modal-overlay {
        position: fixed;
        width: 100%;
        height: 100%;
        top: 0;
        left: 0;
        background: fade(@black, 10%);
        overflow-x: hidden;
        overflow-y: auto;
        transition: @default-transition;
        z-index: 10;

        &.small {
            .modal {
                max-width: 600px;
            }
        }

        &.big {
            .modal {
                max-width: 1000px;
            }
        }
    }

    .modal {
        min-width: 300px;
        max-width: 800px;
        background: @white;
        padding: 10px;
        box-shadow: @default-shadow;
        border-radius: @default-border-radius;
        margin: 10% auto;
        transition: @default-transition;
    }

    .modal-enter, .modal-leave-active {
        opacity: 0;

        .modal {
            transform: scale(1.2);
        }
    }
</style>
